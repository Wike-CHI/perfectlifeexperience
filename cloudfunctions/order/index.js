// 订单管理云函数
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

// ✅ 引入安全日志工具
const { createLogger } = require('../common/logger');
const logger = createLogger('order');

// ✅ 引入验证工具
const { validateAmount, validateObject } = require('../common/validator');

// ✅ 引入统一响应工具
const { success, error, ErrorCodes } = require('../common/response');

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

// ==================== 配置常量 ====================

// 最小/最大购买数量
const MIN_QUANTITY = 1;
const MAX_QUANTITY = 999;

// 金额容忍误差（分）- 容忍服务器价格更新后的微小差异
const PRICE_TOLERANCE = 100; // 1元

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
    if (product.status !== 'active') {
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

    // 5. SKU 验证（如果有 SKU）
    let validSku = true;
    let serverSku = null;
    let serverPrice = product.price;

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

    // 输入验证
    const validation = validateObject(orderData.items, '购物车数据');
    if (!validation.result) {
      logger.warn('Invalid cart data', validation.error);
      return error(ErrorCodes.INVALID_PARAMS, validation.error);
    }

    // 购物车数据完整性验证
    const cartValidation = await validateCartItems(orderData.items || []);

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

    return success({ orders: res.data }, '获取订单成功');
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

    const promotion = require('../promotion/index.js');

    // 调用推广系统计算奖励
    const result = await promotion.exports.main(
      {
        action: 'calculateReward',
        orderId,
        buyerId,
        orderAmount,
        isRepurchase: await checkIsRepurchase(buyerId)
      },
      {}
    );

    if (result.code === 0) {
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
        rewardsCount: result.data.rewards.length
      });
    } else {
      logger.error('Reward settlement failed', {
        orderId,
        reason: result.msg
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
  const openid = requestData._token || wxContext.OPENID;

  if (!openid) {
    logger.warn('Unauthorized access attempt');
    return error(ErrorCodes.NOT_LOGIN, '未登录');
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
      default:
        logger.warn('Unknown action', { action });
        return error(ErrorCodes.UNKNOWN_ERROR, '未知操作');
    }
  } catch (err) {
    logger.error('Order function failed', err);
    return error(ErrorCodes.UNKNOWN_ERROR, '订单操作失败', err.message);
  }
};
