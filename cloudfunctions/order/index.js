// 订单管理云函数
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

// ✅ 引入安全日志工具
const { createLogger } = require('./common/logger');
const logger = createLogger('order');

// ✅ 引入验证工具
const { validateAmount, validateObject } = require('./common/validator');

// ✅ 引入统一响应工具
const { success, error, ErrorCodes } = require('./common/response');

// ✅ 引入常量配置
const {
  Amount,
  Collections,
  Time,
  OrderStatus
} = require('./common/constants');

// ✅ 引入缓存模块
const {
  userCache,
  productCache
} = require('./common/cache');

// 解析 HTTP 触发器的请求体
function parseEvent(event) {
  if (event.body) {
    try {
      return typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    } catch (e) {
      logger.error('Failed to parse event body', e);
    }
  }
  return event;
}

// ==================== 配置常量（别名）====================

// 最小/最大购买数量
const MIN_QUANTITY = Amount.MIN_CART_QUANTITY;
const MAX_QUANTITY = Amount.MAX_CART_QUANTITY;

// 金额容忍误差（分）- 容忍服务器价格更新后的微小差异
const PRICE_TOLERANCE = Amount.PRICE_TOLERANCE;

// ==================== 购物车验证 ====================

/**
 * 验证购物车数据完整性
 *
 * 安全检查：
 * - 产品存在性验证
 * - SKU 组合有效性
 * - 价格重新计算（防止客户端篡改）
 * - 数量范围验证
 * - 总金额一致性
 */
async function validateCartItems(cartItems) {
  logger.debug('Cart validation started', { itemsCount: cartItems.length });

  const validatedItems = [];
  let serverTotalAmount = 0;
  const errors = [];

  // 批量获取产品信息
  const productIds = [...new Set(cartItems.map(item => item.productId))];

  if (productIds.length === 0) {
    logger.warn('Empty cart detected');
    return { valid: false, errors: ['购物车为空'] };
  }

  let productsRes;
  try {
    productsRes = await db.collection('products')
      .where({ _id: _.in(productIds) })
      .get();
  } catch (error) {
    logger.error('Failed to fetch products', error);
    return { valid: false, errors: ['产品查询失败'] };
  }

  if (productsRes.data.length === 0) {
    logger.warn('No products found', { ids: productIds });
    return { valid: false, errors: ['产品不存在'] };
  }

  const productMap = {};
  productsRes.data.forEach(p => {
    productMap[p._id] = p;
  });

  logger.debug('Products fetched', {
    requested: productIds.length,
    found: productsRes.data.length
  });

  // 验证每个购物车项
  for (let i = 0; i < cartItems.length; i++) {
    const cartItem = cartItems[i];
    const product = productMap[cartItem.productId];

    // 1. 检查产品是否存在
    if (!product) {
      logger.warn('Product not found', {
        index: i,
        productId: cartItem.productId
      });
      errors.push(`第${i + 1}项产品不存在`);
      continue;
    }

    // 2. 检查产品状态
    // 检查产品状态（只有明确设置为非active才认为是下架）
    if (product.status && product.status !== 'active') {
      logger.warn('Product not available', {
        productId: product._id,
        status: product.status
      });
      errors.push(`"${product.name}"已下架`);
      continue;
    }

    // 3. 检查库存
    if (product.stock < cartItem.quantity) {
      logger.warn('Insufficient stock', {
        productId: product._id,
        requested: cartItem.quantity,
        available: product.stock
      });
      errors.push(`"${product.name}"库存不足`);
      continue;
    }

    // 4. 验证数量范围
    if (cartItem.quantity < MIN_QUANTITY || cartItem.quantity > MAX_QUANTITY) {
      logger.warn('Invalid quantity', {
        productId: product._id,
        quantity: cartItem.quantity
      });
      errors.push(`"${product.name}"数量异常`);
      continue;
    }

    // 5. SKU/规格验证（支持两种方式）
    let validSku = true;
    let serverSku = null;
    let serverPrice = product.price;

    // 方式1：通过 skuId 匹配 skus 数组
    if (cartItem.skuId && product.skus && product.skus.length > 0) {
      const sku = product.skus.find(s => s._id === cartItem.skuId);
      if (!sku) {
        logger.warn('SKU not found', {
          productId: product._id,
          skuId: cartItem.skuId
        });
        validSku = false;
        errors.push(`"${product.name}"规格不存在`);
        continue;
      }

      // 检查 SKU 库存
      if (sku.stock < cartItem.quantity) {
        logger.warn('SKU insufficient stock', {
          productId: product._id,
          skuId: cartItem.skuId,
          requested: cartItem.quantity,
          available: sku.stock
        });
        errors.push(`"${product.name}"该规格库存不足`);
        continue;
      }

      serverSku = sku;
      serverPrice = sku.price;
    }
    // 方式2：通过 specs 匹配 priceList 数组
    else if (cartItem.specs && product.priceList && product.priceList.length > 0) {
      const specsStr = cartItem.specs.toString().trim();
      const matchedPrice = product.priceList.find(p => {
        const volumeStr = (p.volume || '').toString().trim();
        // 完全匹配或包含匹配
        return volumeStr === specsStr || volumeStr.includes(specsStr) || specsStr.includes(volumeStr);
      });

      if (matchedPrice) {
        serverPrice = matchedPrice.price;
        logger.debug('Matched price from priceList', {
          productId: product._id,
          specs: specsStr,
          matchedVolume: matchedPrice.volume,
          price: matchedPrice.price
        });
      } else {
        // 没有匹配到规格价格，使用默认价格
        logger.warn('No matching priceList entry found', {
          productId: product._id,
          specs: specsStr,
          priceList: product.priceList
        });
      }
    }

    // 6. 价格验证（使用服务器价格，防止客户端篡改）
    const clientPrice = cartItem.price || 0;
    const priceDiff = Math.abs(clientPrice - serverPrice);

    if (priceDiff > PRICE_TOLERANCE) {
      logger.warn('Price mismatch detected', {
        productId: product._id,
        clientPrice,
        serverPrice,
        diff: priceDiff
      });
      errors.push(`"${product.name}"价格已更新，请重新下单`);
      continue;
    }

    // 7. 计算服务器端总金额
    const itemTotal = serverPrice * cartItem.quantity;
    serverTotalAmount += itemTotal;

    // 验证通过的项目
    validatedItems.push({
      productId: product._id,
      productName: product.name,
      productImage: product.image,
      skuId: serverSku ? serverSku._id : null,
      skuName: serverSku ? serverSku.name : null,
      skuSpec: serverSku ? serverSku.spec : null,
      quantity: cartItem.quantity,
      price: serverPrice, // 使用服务器价格
      total: itemTotal
    });

    logger.debug('Item validated', {
      index: i,
      productId: product._id,
      price: serverPrice,
      quantity: cartItem.quantity
    });
  }

  // 8. 验证总金额
  const clientTotal = cartItems.reduce((sum, item) =>
    sum + (item.price || 0) * item.quantity, 0
  );

  const totalDiff = Math.abs(clientTotal - serverTotalAmount);

  if (totalDiff > PRICE_TOLERANCE) {
    logger.warn('Total amount mismatch', {
      clientTotal,
      serverTotalAmount,
      diff: totalDiff
    });
    errors.push('订单总金额异常，请重新确认');
  }

  logger.info('Cart validation completed', {
    totalItems: cartItems.length,
    validItems: validatedItems.length,
    errors: errors.length,
    serverTotalAmount
  });

  return {
    valid: errors.length === 0,
    validatedItems,
    serverTotalAmount,
    errors
  };
}

// Create order
async function createOrder(openid, orderData) {
  try {
    logger.info('Creating order', {
      itemCount: orderData.items?.length
    });

    // 兼容前端传递的 products 或 items 字段
    const orderItems = orderData.items || orderData.products || [];

    // 输入验证
    const validation = validateObject(orderItems, '购物车数据');
    if (!validation.result) {
      logger.warn('Invalid cart data', validation.error);
      return error(ErrorCodes.INVALID_PARAMS, validation.error);
    }

    // 购物车数据完整性验证
    const cartValidation = await validateCartItems(orderItems);

    if (!cartValidation.valid) {
      logger.warn('Cart validation failed', {
        errors: cartValidation.errors
      });
      return error(
        ErrorCodes.CART_INVALID,
        cartValidation.errors[0] || '购物车数据异常',
        {
          errors: cartValidation.errors,
          validatedItems: cartValidation.validatedItems
        }
      );
    }

    // 使用验证后的数据创建订单
    const order = {
      ...orderData,
      items: cartValidation.validatedItems,
      totalAmount: cartValidation.serverTotalAmount,
      _openid: openid,
      createTime: new Date(),
      status: 'pending',
      updateTime: new Date(),
      clientSubmittedAmount: orderData.totalAmount,
      amountValidationPassed: true
    };

    const res = await db.collection('orders').add({
      data: order
    });

    logger.info('Order created successfully', {
      orderId: res._id,
      amount: cartValidation.serverTotalAmount
    });

    // 清除订单列表缓存（新订单会出现在 pending 列表）
    userCache.delete(`orders_${openid}_all`);
    userCache.delete(`orders_${openid}_pending`);
    logger.debug('Order list cache cleared after creation', { openid });

    return success(
      {
        orderId: res._id,
        validatedItems: cartValidation.validatedItems,
        serverTotalAmount: cartValidation.serverTotalAmount
      },
      '订单创建成功'
    );
  } catch (err) {
    logger.error('Failed to create order', err);
    return error(ErrorCodes.DATABASE_ERROR, '订单创建失败', err.message);
  }
}

// Get orders
async function getOrders(openid, status) {
  // 构建缓存键（包含 openid 和 status）
  const cacheKey = `orders_${openid}_${status || 'all'}`;

  // 1. 尝试从缓存获取
  const cached = userCache.get(cacheKey);
  if (cached !== null) {
    logger.debug('Orders cache hit', { openid, status });
    return cached;
  }

  logger.debug('Orders cache miss, querying...', { openid, status });

  try {
    const query = {
      _openid: openid
    };

    if (status && status !== 'all') {
      query.status = status;
    }

    const res = await db.collection('orders')
      .where(query)
      .orderBy('createTime', 'desc')
      .get();

    const result = success({ orders: res.data }, '获取订单成功');

    // 2. 缓存结果（5分钟TTL - 订单状态可能变化）
    userCache.set(cacheKey, result, 300000);

    return result;
  } catch (err) {
    logger.error('Failed to get orders', err);
    return error(ErrorCodes.DATABASE_ERROR, '获取订单失败', err.message);
  }
}

// Update order status
async function updateOrderStatus(openid, orderId, status) {
  try {
    logger.info('Updating order status', { orderId, status });

    const updateData = {
      status,
      updateTime: new Date()
    };

    if (status === 'paid') updateData.payTime = new Date();
    else if (status === 'shipping') updateData.shipTime = new Date();
    else if (status === 'completed') updateData.completeTime = new Date();

    // 只能更新自己的订单
    const updateResult = await db.collection('orders').where({
      _id: orderId,
      _openid: openid
    }).update({
      data: updateData
    });

    if (updateResult.stats.updated === 0) {
      logger.warn('Order not found for update', { orderId });
      return error(ErrorCodes.ORDER_NOT_FOUND, '订单不存在');
    }

    logger.info('Order status updated', { orderId, status });

    // 如果订单完成，触发推广奖励结算（统一在完成时结算）
    if (status === 'completed') {
      const orderRes = await db.collection('orders')
        .where({ _id: orderId })
        .get();

      if (orderRes.data.length > 0) {
        const order = orderRes.data[0];

        // 只处理未结算的订单（无论支付方式）
        if (!order.rewardSettled) {
          logger.info('Triggering reward settlement', { orderId });
          await settleOrderReward(order._openid, orderId, order.totalAmount);
        }
      }
    }

    // 清除该用户的所有订单列表缓存（订单状态变更后列表会变化）
    const orderStatuses = ['all', 'pending', 'paid', 'shipping', 'completed', 'cancelled'];
    orderStatuses.forEach(status => {
      const cacheKey = `orders_${openid}_${status}`;
      userCache.delete(cacheKey);
    });
    logger.debug('Order list cache cleared', { openid });

    return success(null, '订单状态更新成功');
  } catch (err) {
    logger.error('Failed to update order status', err);
    return error(ErrorCodes.DATABASE_ERROR, '订单状态更新失败', err.message);
  }
}

// 余额支付订单
async function payWithBalance(openid, { orderId }) {
  const transaction = await db.startTransaction();

  try {
    logger.info('Balance payment started', { orderId });

    // 1. 获取订单信息
    const orderRes = await transaction.collection('orders')
      .where({ _id: orderId, _openid: openid })
      .get();

    if (orderRes.data.length === 0) {
      await transaction.rollback();
      logger.warn('Order not found for payment', { orderId });
      return { success: false, message: '订单不存在' };
    }

    const order = orderRes.data[0];

    if (order.status !== 'pending') {
      await transaction.rollback();
      logger.warn('Invalid order status for payment', {
        orderId,
        status: order.status
      });
      return { success: false, message: '订单状态异常' };
    }

    const orderAmount = order.totalAmount;

    // 金额验证
    const amountValidation = validateAmount(orderAmount, '订单金额');
    if (!amountValidation.result) {
      await transaction.rollback();
      logger.warn('Invalid order amount', { orderId, amount: orderAmount });
      return { success: false, message: amountValidation.error };
    }

    // 2. 获取钱包余额
    const walletRes = await transaction.collection('user_wallets')
      .where({ _openid: openid })
      .get();

    if (walletRes.data.length === 0) {
      await transaction.rollback();
      logger.warn('Wallet not found', { openid });
      return { success: false, message: '钱包不存在' };
    }

    const wallet = walletRes.data[0];

    logger.debug('Balance check', {
      current: wallet.balance,
      required: orderAmount
    });

    if (wallet.balance < orderAmount) {
      await transaction.rollback();
      logger.warn('Insufficient balance', {
        current: wallet.balance,
        required: orderAmount
      });
      return {
        success: false,
        message: '余额不足',
        data: {
          currentBalance: wallet.balance,
          requiredAmount: orderAmount,
          shortage: orderAmount - wallet.balance
        }
      };
    }

    // 3. 扣除钱包余额
    await transaction.collection('user_wallets')
      .doc(wallet._id)
      .update({
        data: {
          balance: _.inc(-orderAmount),
          updateTime: db.serverDate()
        }
      });

    logger.debug('Balance deducted', { amount: orderAmount });

    // 4. 记录交易日志
    await transaction.collection('wallet_transactions')
      .add({
        data: {
          _openid: openid,
          type: 'payment',
          amount: -orderAmount,
          title: `订单支付 - ${order.orderNo}`,
          orderId: order._id,
          status: 'success',
          createTime: db.serverDate()
        }
      });

    // 5. 更新订单状态
    // 注意：统一在订单完成时结算推广奖励，支付成功时不结算
    await transaction.collection('orders')
      .doc(order._id)
      .update({
        data: {
          status: 'paid',
          paymentMethod: 'balance',
          payTime: db.serverDate(),
          rewardSettled: false, // 标记奖励未结算，等订单完成时结算
          updateTime: db.serverDate()
        }
      });

    logger.info('Balance payment completed', { orderId });

    await transaction.commit();

    return {
      success: true,
      message: '支付成功',
      data: {
        orderId: order._id,
        orderNo: order.orderNo,
        paidAmount: orderAmount,
        remainingBalance: wallet.balance - orderAmount
      }
    };

  } catch (error) {
    await transaction.rollback();
    logger.error('Balance payment failed', error);
    return { success: false, message: '支付失败，请重试' };
  }
}

// 结算订单推广奖励
async function settleOrderReward(buyerId, orderId, orderAmount) {
  try {
    logger.info('Reward settlement started', { buyerId, orderId, amount: orderAmount });

    // 通过云函数调用推广系统计算奖励
    const result = await cloud.callFunction({
      name: 'promotion',
      data: {
        action: 'calculateReward',
        orderId,
        buyerId,
        orderAmount,
        isRepurchase: await checkIsRepurchase(buyerId)
      }
    });

    // cloud.callFunction 返回 { result: {...} }
    const promotionResult = result.result;

    if (promotionResult && promotionResult.code === 0) {
      // 标记订单奖励已结算
      await db.collection('orders')
        .doc(orderId)
        .update({
          data: {
            rewardSettled: true,
            rewardSettleTime: db.serverDate()
          }
        });

      logger.info('Reward settlement completed', {
        orderId,
        rewardsCount: promotionResult.data?.rewards?.length || 0
      });
    } else {
      logger.error('Reward settlement failed', {
        orderId,
        reason: promotionResult?.msg || 'Unknown error'
      });
    }

  } catch (err) {
    logger.error('Reward settlement error', err);
  }
}

// 检查是否为复购
async function checkIsRepurchase(buyerId) {
  try {
    const count = await db.collection('orders')
      .where({
        _openid: buyerId,
        status: _.in(['paid', 'shipping', 'completed'])
      })
      .count();

    const isRepurchase = count.total > 1; // 大于1单表示复购

    logger.debug('Repurchase check', {
      buyerId,
      orderCount: count.total,
      isRepurchase
    });

    return isRepurchase;
  } catch (error) {
    logger.error('Repurchase check failed', error);
    return false;
  }
}

/**
 * 主入口函数
 */
exports.main = async (event, context) => {
  logger.debug('Order event received', { action: event.action });

  const requestData = parseEvent(event);
  const { action, data } = requestData;

  const wxContext = cloud.getWXContext();
  // 🔒 安全：只使用 wxContext.OPENID，不信任前端传递的 _token
  const openid = wxContext.OPENID;

  if (!openid) {
    logger.warn('Unauthorized access attempt');
    return error(ErrorCodes.NOT_LOGIN, '未登录或登录已过期');
  }

  logger.info('Order action', { action });

  try {
    switch (action) {
      case 'createOrder':
        return await createOrder(openid, data);
      case 'getOrders':
        return await getOrders(openid, data ? data.status : null);
      case 'updateOrderStatus':
        return await updateOrderStatus(openid, data.orderId, data.status);
      case 'cancelOrder':
        return await updateOrderStatus(openid, data.orderId, 'cancelled');
      case 'payWithBalance':
        return await payWithBalance(openid, data);
      case 'applyRefund':
        return await applyRefund(openid, data);
      case 'cancelRefund':
        return await cancelRefund(openid, data);
      case 'updateReturnLogistics':
        return await updateReturnLogistics(openid, data);
      case 'getRefundList':
        return await getRefundList(openid, data);
      case 'getRefundDetail':
        return await getRefundDetail(openid, data);
      default:
        logger.warn('Unknown action', { action });
        return error(ErrorCodes.UNKNOWN_ERROR, '未知操作');
    }
  } catch (err) {
    logger.error('Order function failed', err);
    return error(ErrorCodes.UNKNOWN_ERROR, '订单操作失败', err.message);
  }
};

// ==================== 退款功能 ====================

/**
 * 生成退款单号
 * 格式：RF + 年月日时分秒 + 6位随机数
 */
function generateRefundNo() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hour = String(now.getHours()).padStart(2, '0');
  const minute = String(now.getMinutes()).padStart(2, '0');
  const second = String(now.getSeconds()).padStart(2, '0');
  const random = String(Math.floor(Math.random() * 1000000)).padStart(6, '0');

  return `RF${year}${month}${day}${hour}${minute}${second}${random}`;
}

/**
 * 申请退款
 */
async function applyRefund(openid, data) {
  try {
    logger.info('Apply refund', { openid, orderId: data.orderId });

    const { orderId, refundType, refundReason, products } = data;

    // 参数验证
    if (!orderId) {
      return error(ErrorCodes.INVALID_PARAMS, '缺少订单ID');
    }
    if (!refundType || !['only_refund', 'return_refund'].includes(refundType)) {
      return error(ErrorCodes.INVALID_PARAMS, '退款类型无效');
    }
    if (!refundReason) {
      return error(ErrorCodes.INVALID_PARAMS, '缺少退款原因');
    }

    // 查询订单
    const orderRes = await db.collection('orders')
      .where({ _id: orderId, _openid: openid })
      .get();

    if (orderRes.data.length === 0) {
      return error(ErrorCodes.NOT_FOUND, '订单不存在');
    }

    const order = orderRes.data[0];

    // 验证订单状态（只有已支付订单可退款）
    if (!['paid', 'shipping', 'completed'].includes(order.status)) {
      return error(ErrorCodes.INVALID_STATUS, '订单状态不支持退款');
    }

    // 检查是否已有进行中的退款
    const existingRefundRes = await db.collection('refunds')
      .where({
        orderId: orderId,
        refundStatus: _.in(['pending', 'approved', 'waiting_receive', 'processing'])
      })
      .get();

    if (existingRefundRes.data.length > 0) {
      return error(ErrorCodes.DUPLICATE_REQUEST, '订单已有进行中的退款申请');
    }

    // 计算退款金额
    let refundAmount = 0;
    const refundProducts = [];

    if (products && products.length > 0) {
      // 部分退款
      for (const item of order.items) {
        const refundItem = products.find(p => p.productId === item.productId);
        if (refundItem) {
          const itemRefundAmount = item.price * refundItem.refundQuantity;
          refundAmount += itemRefundAmount;
          refundProducts.push({
            productId: item.productId,
            productName: item.productName,
            productImage: item.productImage,
            quantity: item.quantity,
            refundQuantity: refundItem.refundQuantity,
            price: item.price
          });
        }
      }
    } else {
      // 全额退款
      refundAmount = order.totalAmount;
      refundProducts.push(...order.items.map(item => ({
        productId: item.productId,
        productName: item.productName,
        productImage: item.productImage,
        quantity: item.quantity,
        refundQuantity: item.quantity,
        price: item.price
      })));
    }

    // 创建退款记录
    const refundNo = generateRefundNo();
    const refund = {
      _openid: openid,
      orderId: orderId,
      orderNo: order.orderNo,
      refundNo: refundNo,
      refundAmount: refundAmount,
      refundReason: refundReason,
      refundType: refundType,
      refundStatus: 'pending',
      products: refundProducts,
      createTime: new Date(),
      updateTime: new Date()
    };

    const result = await db.collection('refunds').add({ data: refund });

    logger.info('Refund applied successfully', {
      refundId: result._id,
      refundNo: refundNo,
      amount: refundAmount
    });

    return success({
      refundId: result._id,
      refundNo: refundNo,
      refundAmount: refundAmount
    }, '退款申请成功');
  } catch (err) {
    logger.error('Apply refund failed', err);
    return error(ErrorCodes.DATABASE_ERROR, '申请退款失败', err.message);
  }
}

/**
 * 取消退款申请
 */
async function cancelRefund(openid, data) {
  try {
    const { refundId } = data;

    if (!refundId) {
      return error(ErrorCodes.INVALID_PARAMS, '缺少退款ID');
    }

    // 查询退款记录
    const refundRes = await db.collection('refunds')
      .where({ _id: refundId, _openid: openid })
      .get();

    if (refundRes.data.length === 0) {
      return error(ErrorCodes.NOT_FOUND, '退款记录不存在');
    }

    const refund = refundRes.data[0];

    // 只有pending状态可以取消
    if (refund.refundStatus !== 'pending') {
      return error(ErrorCodes.INVALID_STATUS, '当前状态不允许取消');
    }

    // 更新状态为cancelled
    await db.collection('refunds')
      .doc(refundId)
      .update({
        data: {
          refundStatus: 'cancelled',
          updateTime: new Date()
        }
      });

    logger.info('Refund cancelled', { refundId });

    return success(null, '取消退款成功');
  } catch (err) {
    logger.error('Cancel refund failed', err);
    return error(ErrorCodes.DATABASE_ERROR, '取消退款失败', err.message);
  }
}

/**
 * 更新退货物流
 */
async function updateReturnLogistics(openid, data) {
  try {
    const { refundId, company, trackingNo } = data;

    if (!refundId || !company || !trackingNo) {
      return error(ErrorCodes.INVALID_PARAMS, '缺少必需参数');
    }

    // 查询退款记录
    const refundRes = await db.collection('refunds')
      .where({ _id: refundId, _openid: openid })
      .get();

    if (refundRes.data.length === 0) {
      return error(ErrorCodes.NOT_FOUND, '退款记录不存在');
    }

    const refund = refundRes.data[0];

    // 只有approved状态可以填写物流
    if (refund.refundStatus !== 'approved') {
      return error(ErrorCodes.INVALID_STATUS, '当前状态不允许填写物流');
    }

    // 更新物流信息
    await db.collection('refunds')
      .doc(refundId)
      .update({
        data: {
          returnLogistics: {
            company: company,
            trackingNo: trackingNo,
            shipTime: new Date()
          },
          refundStatus: 'waiting_receive',
          updateTime: new Date()
        }
      });

    logger.info('Return logistics updated', { refundId });

    return success(null, '物流信息更新成功');
  } catch (err) {
    logger.error('Update return logistics failed', err);
    return error(ErrorCodes.DATABASE_ERROR, '更新物流失败', err.message);
  }
}

/**
 * 获取退款列表
 */
async function getRefundList(openid, data) {
  try {
    const { status } = data || {};

    const query = {
      _openid: openid
    };

    if (status) {
      // 支持多个状态用逗号分隔
      const statuses = status.split(',').map(s => s.trim());
      query.refundStatus = _.in(statuses);
    }

    const res = await db.collection('refunds')
      .where(query)
      .orderBy('createTime', 'desc')
      .get();

    return success({ refunds: res.data }, '获取退款列表成功');
  } catch (err) {
    logger.error('Get refund list failed', err);
    return error(ErrorCodes.DATABASE_ERROR, '获取退款列表失败', err.message);
  }
}

/**
 * 获取退款详情
 */
async function getRefundDetail(openid, data) {
  try {
    const { refundId } = data;

    if (!refundId) {
      return error(ErrorCodes.INVALID_PARAMS, '缺少退款ID');
    }

    const refundRes = await db.collection('refunds')
      .where({ _id: refundId, _openid: openid })
      .get();

    if (refundRes.data.length === 0) {
      return error(ErrorCodes.NOT_FOUND, '退款记录不存在');
    }

    const refund = refundRes.data[0];

    // 获取关联订单信息
    const orderRes = await db.collection('orders')
      .where({ _id: refund.orderId })
      .get();

    const order = orderRes.data[0] || null;

    return success({
      refund: refund,
      order: order
    }, '获取退款详情成功');
  } catch (err) {
    logger.error('Get refund detail failed', err);
    return error(ErrorCodes.DATABASE_ERROR, '获取退款详情失败', err.message);
  }
}
