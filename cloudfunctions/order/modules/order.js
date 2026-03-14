/**
 * 订单模块 - 核心订单管理
 *
 * 包含：创建订单、获取订单列表、获取订单详情、更新订单状态、余额支付
 */
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

// 引入日志
const { createLogger } = require('../common/logger');
const logger = createLogger('order');

// 引入验证工具
const { validateAmount, validateObject } = require('../common/validator');

// 引入响应工具
const { success, error, ErrorCodes } = require('../common/response');

// 引入常量
const { Amount } = require('../common/constants');

// 引入缓存
const { userCache } = require('../common/cache');

// 引入库存模块
const { deductStock, restoreStock, restoreCoupon } = require('./inventory');

// 引入奖励模块
const { settleOrderReward } = require('./reward');

// 最小/最大购买数量
const MIN_QUANTITY = Amount.MIN_CART_QUANTITY;
const MAX_QUANTITY = Amount.MAX_CART_QUANTITY;

/**
 * 更新商品销量
 * @param {Array} items - 订单商品列表
 * @param {string} orderId - 订单ID（用于日志）
 */
async function updateProductSales(items, orderId) {
  if (!items || items.length === 0) {
    logger.warn('No items to update sales', { orderId });
    return;
  }

  try {
    logger.info('Updating product sales', { orderId, itemCount: items.length });

    // 按商品ID分组统计数量
    const salesMap = {};
    items.forEach(item => {
      const productId = item.productId;
      const quantity = parseInt(item.quantity) || 1;
      salesMap[productId] = (salesMap[productId] || 0) + quantity;
    });

    // 批量更新商品销量
    const updatePromises = Object.keys(salesMap).map(productId => {
      return db.collection('products').doc(productId).update({
        data: {
          sales: _.inc(salesMap[productId])
        }
      });
    });

    await Promise.all(updatePromises);
    logger.info('Product sales updated successfully', {
      orderId,
      productCount: Object.keys(salesMap).length,
      sales: salesMap
    });
  } catch (error) {
    logger.error('Failed to update product sales', {
      orderId,
      error: error.message
    });
    // 销量更新失败不影响订单流程，只记录错误
  }
}

/**
 * 解析购物车数据
 * 统一处理 items/products 字段命名
 */
function parseCartItems(orderData) {
  return orderData.items || orderData.products || [];
}

/**
 * 验证购物车数据完整性
 * @param {Array} cartItems - 购物车项
 */
async function validateCartItems(cartItems) {
  logger.debug('Cart validation started', { itemsCount: cartItems.length });

  const validatedItems = [];
  let serverTotalAmount = 0;
  const errors = [];

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

  for (let i = 0; i < cartItems.length; i++) {
    const cartItem = cartItems[i];
    const product = productMap[cartItem.productId];

    if (!product) {
      errors.push(`第${i + 1}项产品不存在`);
      continue;
    }

    if (product.isActive === false) {
      errors.push(`"${product.name}"已下架`);
      continue;
    }

    if (product.stock < cartItem.quantity) {
      errors.push(`"${product.name}"库存不足`);
      continue;
    }

    if (cartItem.quantity < MIN_QUANTITY || cartItem.quantity > MAX_QUANTITY) {
      errors.push(`"${product.name}"数量异常`);
      continue;
    }

    let validSku = true;
    let serverSku = null;
    let serverPrice = product.price;

    if (cartItem.skuId && product.skus && product.skus.length > 0) {
      const sku = product.skus.find(s => s._id === cartItem.skuId);
      if (!sku) {
        errors.push(`"${product.name}"规格不存在`);
        continue;
      }

      if (sku.stock < cartItem.quantity) {
        errors.push(`"${product.name}"该规格库存不足`);
        continue;
      }

      serverSku = sku;
      serverPrice = sku.price;
    } else if (cartItem.specs && product.priceList && product.priceList.length > 0) {
      const specsStr = cartItem.specs.toString().trim();
      const priceItem = product.priceList.find(p => {
        if (!p.volume) return false;
        return p.volume.toString().trim() === specsStr;
      });

      if (!priceItem) {
        errors.push(`"${product.name}"规格组合不存在`);
        continue;
      }

      serverPrice = priceItem.price;
    }

    // 客户端提交的价格（带容差比较）
    const clientPrice = parseFloat(cartItem.price) || 0;
    const serverPriceValue = parseFloat(serverPrice) || 0;
    const tolerance = Amount.PRICE_TOLERANCE || 0.01;

    if (Math.abs(clientPrice - serverPriceValue) > tolerance) {
      logger.warn('Price mismatch', {
        productId: product._id,
        client: clientPrice,
        server: serverPriceValue
      });
      errors.push(`"${product.name}"价格异常`);
      continue;
    }

    const itemTotal = serverPriceValue * cartItem.quantity;
    serverTotalAmount += itemTotal;

    validatedItems.push({
      productId: product._id,
      productName: product.name,
      image: cartItem.image || product.image || '',
      price: serverPriceValue,
      quantity: cartItem.quantity,
      skuId: serverSku ? serverSku._id : null,
      skuName: serverSku ? serverSku.name : null,
      specs: cartItem.specs || []
    });
  }

  return {
    valid: errors.length === 0,
    validatedItems,
    serverTotalAmount,
    errors
  };
}

/**
 * 创建订单
 * @param {string} openid - 用户openid
 * @param {Object} orderData - 订单数据
 */
async function createOrder(openid, orderData) {
  try {
    logger.info('Creating order', { itemCount: orderData.items?.length });

    const orderItems = parseCartItems(orderData);

    const validation = validateObject(orderItems, '购物车数据');
    if (!validation.result) {
      logger.warn('Invalid cart data', validation.error);
      return error(ErrorCodes.INVALID_PARAMS, validation.error);
    }

    const cartValidation = await validateCartItems(orderItems);

    if (!cartValidation.valid) {
      logger.warn('Cart validation failed', { errors: cartValidation.errors });
      return error(
        ErrorCodes.CART_INVALID,
        cartValidation.errors[0] || '购物车数据异常',
        { errors: cartValidation.errors, validatedItems: cartValidation.validatedItems }
      );
    }

    const orderNo = `ORD${Date.now()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    const orderInfoForStock = { orderNo, openid };

    const stockResult = await deductStock(cartValidation.validatedItems, orderInfoForStock);
    if (!stockResult.success) {
      logger.warn('Stock deduction failed', { errors: stockResult.errors });
      return error(
        ErrorCodes.INSUFFICIENT_STOCK,
        stockResult.errors[0] || '库存不足',
        { errors: stockResult.errors }
      );
    }

    logger.info('Stock deducted successfully, proceeding to create order');

    const order = {
      ...orderData,
      orderNo: orderNo,
      items: cartValidation.validatedItems,
      totalAmount: cartValidation.serverTotalAmount,
      _openid: openid,
      createTime: new Date(),
      status: 'pending',
      paymentStatus: 'pending',
      updateTime: new Date(),
      clientSubmittedAmount: orderData.totalAmount,
      amountValidationPassed: true
    };

    try {
      const res = await db.collection('orders').add({ data: order });

      logger.info('Order created successfully', {
        orderId: res._id,
        orderNo: orderNo,
        amount: cartValidation.serverTotalAmount
      });

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
    } catch (orderError) {
      logger.error('Order creation failed, rolling back stock', orderError);
      await restoreStock(stockResult.deductedItems, { isRollback: true });
      return error(ErrorCodes.DATABASE_ERROR, '订单创建失败', orderError.message);
    }
  } catch (err) {
    logger.error('Failed to create order', err);
    return error(ErrorCodes.DATABASE_ERROR, '订单创建失败', err.message);
  }
}

/**
 * 获取订单列表
 * @param {string} openid - 用户openid
 * @param {string} status - 订单状态
 */
async function getOrders(openid, status, options = {}) {
  const {
    page = 1,
    pageSize = 10
  } = options;

  // 参数验证
  if (page < 1 || pageSize < 1 || pageSize > 50) {
    return error(ErrorCodes.INVALID_PARAMS, '分页参数无效');
  }

  const cacheKey = page === 1
    ? `orders_${openid}_${status || 'all'}`
    : null; // 仅第一页使用缓存

  // 第一页尝试使用缓存
  if (cacheKey) {
    const cached = userCache.get(cacheKey);
    if (cached !== null) {
      logger.debug('Orders cache hit', { openid, status, page });
      return cached;
    }
  }

  logger.debug('Orders cache miss, querying...', { openid, status, page, pageSize });

  try {
    const query = { _openid: openid };

    if (status && status !== 'all') {
      query.status = status;
    }

    // 多查1条判断hasMore
    const res = await db.collection('orders')
      .where(query)
      .orderBy('createTime', 'desc')
      .skip((page - 1) * pageSize)
      .limit(pageSize + 1)
      .get();

    // 判断是否有更多数据
    const hasMore = res.data.length > pageSize;
    const orders = hasMore ? res.data.slice(0, pageSize) : res.data;

    logger.info('Orders fetched', {
      count: orders.length,
      hasMore,
      page
    });

    const result = success({
      orders,
      hasMore,
      page,
      pageSize
    }, '获取订单成功');

    // 仅第一页缓存（5分钟）
    if (cacheKey) {
      userCache.set(cacheKey, result, 300000);
    }

    return result;
  } catch (err) {
    logger.error('Failed to get orders', err);
    return error(ErrorCodes.DATABASE_ERROR, '获取订单失败', err.message);
  }
}

/**
 * 获取订单详情
 * @param {string} openid - 用户openid
 * @param {string} orderId - 订单ID
 */
async function getOrderDetail(openid, orderId) {
  try {
    if (!orderId) {
      return error(ErrorCodes.INVALID_PARAMS, '缺少订单ID');
    }

    const orderRes = await db.collection('orders')
      .where({ _id: orderId, _openid: openid })
      .get();

    if (orderRes.data.length === 0) {
      logger.warn('Order not found', { orderId, openid });
      return error(ErrorCodes.ORDER_NOT_FOUND, '订单不存在');
    }

    const order = orderRes.data[0];

    logger.debug('Order detail fetched', { orderId, status: order.status });

    return success({ order }, '获取订单详情成功');
  } catch (err) {
    logger.error('Failed to get order detail', err);
    return error(ErrorCodes.DATABASE_ERROR, '获取订单详情失败', err.message);
  }
}

/**
 * 更新订单状态
 * @param {string} openid - 用户openid
 * @param {string} orderId - 订单ID
 * @param {string} status - 目标状态
 */
async function updateOrderStatus(openid, orderId, status) {
  try {
    logger.info('Updating order status', { orderId, status });

    const orderRes = await db.collection('orders')
      .where({ _id: orderId, _openid: openid })
      .get();

    if (orderRes.data.length === 0) {
      logger.warn('Order not found for update', { orderId });
      return error(ErrorCodes.ORDER_NOT_FOUND, '订单不存在');
    }

    const order = orderRes.data[0];

    const allowedTransitions = {
      'pending': ['paid', 'cancelled'],
      'paid': ['shipping', 'cancelled'],
      'shipping': ['completed', 'cancelled'],
      'completed': [],
      'cancelled': []
    };

    if (!allowedTransitions[order.status]?.includes(status)) {
      logger.warn('Invalid status transition', {
        orderId, from: order.status, to: status
      });
      return error(ErrorCodes.INVALID_STATUS, `订单状态不允许从"${order.status}"变更为"${status}"`);
    }

    const updateData = { status, updateTime: new Date() };

    if (status === 'paid') updateData.payTime = new Date();
    else if (status === 'shipping') updateData.shipTime = new Date();
    else if (status === 'completed') updateData.completeTime = new Date();
    else if (status === 'cancelled') {
      updateData.cancelTime = new Date();
      updateData.cancelReason = '用户取消';
    }

    const updateResult = await db.collection('orders')
      .where({ _id: orderId, _openid: openid })
      .update({ data: updateData });

    if (updateResult.stats.updated === 0) {
      logger.warn('Order update failed - concurrent modification', { orderId });
      return error(ErrorCodes.ORDER_NOT_FOUND, '订单状态更新失败，请重试');
    }

    logger.info('Order status updated', { orderId, status });

    // 订单支付成功时更新商品销量
    if (status === 'paid' && !order.salesUpdated) {
      logger.info('Updating sales for paid order', { orderId });
      await updateProductSales(order.items, orderId);

      // 标记销量已更新，避免重复更新
      await db.collection('orders').doc(orderId).update({
        data: { salesUpdated: true }
      });
    }

    if (status === 'cancelled') {
      if (order.items && order.items.length > 0) {
        logger.info('Restoring stock for cancelled order', { orderId });
        const orderInfoForStock = {
          orderId: order._id,
          orderNo: order.orderNo,
          openid: openid
        };
        await restoreStock(order.items, { orderInfo: orderInfoForStock });
      }

      if (order.couponId) {
        logger.info('Restoring coupon for cancelled order', { orderId, couponId: order.couponId });
        await restoreCoupon(openid, order.couponId, order.orderNo);
      }

      if (['paid', 'shipping'].includes(order.status)) {
        logger.warn('Cancelled order was already paid', {
          orderId, originalStatus: order.status, paidAmount: order.totalAmount
        });
      }
    }

    if (status === 'completed') {
      if (!order.rewardSettled) {
        logger.info('Triggering reward settlement', { orderId });
        await settleOrderReward(order._openid, orderId, order.totalAmount);
      }
    }

    const orderStatuses = ['all', 'pending', 'paid', 'shipping', 'completed', 'cancelled'];
    orderStatuses.forEach(s => {
      const cacheKey = `orders_${openid}_${s}`;
      userCache.delete(cacheKey);
    });
    logger.debug('Order list cache cleared', { openid });

    return success(null, '订单状态更新成功');
  } catch (err) {
    logger.error('Failed to update order status', err);
    return error(ErrorCodes.DATABASE_ERROR, '订单状态更新失败', err.message);
  }
}

/**
 * 管理员更新订单状态（绕过openid验证，但保留业务逻辑）
 * @param {string} orderId - 订单ID
 * @param {string} status - 目标状态
 */
async function adminUpdateOrderStatus(orderId, status) {
  try {
    logger.info('Admin updating order status', { orderId, status });

    // 查询订单（不需要openid验证）
    const orderRes = await db.collection('orders')
      .where({ _id: orderId })
      .get();

    if (orderRes.data.length === 0) {
      logger.warn('Order not found for admin update', { orderId });
      return error(ErrorCodes.ORDER_NOT_FOUND, '订单不存在');
    }

    const order = orderRes.data[0];
    const openid = order._openid;

    // 管理员可以自由转换状态（不限制状态转换规则）
    const updateData = { status, updateTime: new Date() };

    if (status === 'paid') updateData.payTime = new Date();
    else if (status === 'shipping') updateData.shipTime = new Date();
    else if (status === 'completed') updateData.completeTime = new Date();
    else if (status === 'cancelled') {
      updateData.cancelTime = new Date();
      updateData.cancelReason = '管理员取消';
    }

    const updateResult = await db.collection('orders')
      .where({ _id: orderId })
      .update({ data: updateData });

    if (updateResult.stats.updated === 0) {
      logger.warn('Order update failed - concurrent modification', { orderId });
      return error(ErrorCodes.ORDER_NOT_FOUND, '订单状态更新失败，请重试');
    }

    logger.info('Order status updated by admin', { orderId, status });

    // 订单支付成功时更新商品销量
    if (status === 'paid' && !order.salesUpdated) {
      logger.info('Updating sales for paid order (admin)', { orderId });
      await updateProductSales(order.items, orderId);

      // 标记销量已更新，避免重复更新
      await db.collection('orders').doc(orderId).update({
        data: { salesUpdated: true }
      });
    }

    // 处理取消订单逻辑
    if (status === 'cancelled') {
      if (order.items && order.items.length > 0) {
        logger.info('Restoring stock for cancelled order (admin)', { orderId });
        const orderInfoForStock = {
          orderId: order._id,
          orderNo: order.orderNo,
          openid: openid
        };
        await restoreStock(order.items, { orderInfo: orderInfoForStock });
      }

      if (order.couponId) {
        logger.info('Restoring coupon for cancelled order (admin)', { orderId, couponId: order.couponId });
        await restoreCoupon(openid, order.couponId, order.orderNo);
      }
    }

    // 处理完成订单奖励结算
    if (status === 'completed') {
      if (!order.rewardSettled) {
        logger.info('Triggering reward settlement (admin)', { orderId });
        await settleOrderReward(order._openid, orderId, order.totalAmount);
      }
    }

    // 清除用户端订单缓存（所有状态）
    const orderStatuses = ['all', 'pending', 'paid', 'shipping', 'completed', 'cancelled'];
    orderStatuses.forEach(s => {
      const cacheKey = `orders_${openid}_${s}`;
      userCache.delete(cacheKey);
    });
    logger.debug('User order cache cleared after admin update', { openid });

    return success(null, '订单状态更新成功');
  } catch (err) {
    logger.error('Failed to admin update order status', err);
    return error(ErrorCodes.DATABASE_ERROR, '订单状态更新失败', err.message);
  }
}

/**
 * 余额支付订单
 * @param {string} openid - 用户openid
 * @param {Object} data - 支付数据
 */
async function payWithBalance(openid, data) {
  const { orderId } = data;
  const transaction = await db.startTransaction();

  try {
    logger.info('Balance payment started', { orderId });

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
      logger.warn('Invalid order status for payment', { orderId, status: order.status });
      return { success: false, message: '订单状态异常' };
    }

    // 🔥 验证订单中商品的状态（但不阻止支付）
    if (order.items && order.items.length > 0) {
      const productIds = order.items.map(item => item.productId);
      const productsCheck = await transaction.collection('products')
        .where({
          _id: _.in(productIds)
        })
        .field({
          _id: true,
          name: true,
          isActive: true
        })
        .get();

      const inactiveProducts = productsCheck.data.filter(p => p.isActive === false);

      if (inactiveProducts.length > 0) {
        // ⚠️ 有商品已下架，记录警告但允许支付
        logger.warn('Payment for order with inactive products', {
          orderId,
          inactiveProducts: inactiveProducts.map(p => ({ id: p._id, name: p.name, status: p.status })),
          message: '订单包含已下架商品，但允许支付（订单已创建时商品正常）'
        });
        // TODO: 可以在这里添加通知逻辑，告知管理员
      }
    }

    const orderAmount = order.totalAmount;

    const amountValidation = validateAmount(orderAmount, '订单金额');
    if (!amountValidation.result) {
      await transaction.rollback();
      logger.warn('Invalid order amount', { orderId, amount: orderAmount });
      return { success: false, message: amountValidation.error };
    }

    const walletRes = await transaction.collection('user_wallets')
      .where({ _openid: openid })
      .get();

    if (walletRes.data.length === 0) {
      await transaction.rollback();
      logger.warn('Wallet not found', { openid });
      return { success: false, message: '钱包不存在' };
    }

    const wallet = walletRes.data[0];

    logger.debug('Balance check', { current: wallet.balance, required: orderAmount });

    if (wallet.balance < orderAmount) {
      await transaction.rollback();
      logger.warn('Insufficient balance', { current: wallet.balance, required: orderAmount });
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

    const balanceDeductionResult = await transaction.collection('user_wallets')
      .where({
        _id: wallet._id,
        balance: _.gte(orderAmount)
      })
      .update({
        data: {
          balance: _.inc(-orderAmount),
          updateTime: db.serverDate()
        }
      });

    if (balanceDeductionResult.stats.updated === 0) {
      await transaction.rollback();
      logger.warn('Concurrent balance modification detected', {
        orderId, currentBalance: wallet.balance, requiredAmount: orderAmount
      });
      return { success: false, message: '余额已被其他操作修改，请重试' };
    }

    logger.debug('Balance deducted with optimistic lock', { amount: orderAmount });

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

    await transaction.collection('orders')
      .doc(order._id)
      .update({
        data: {
          status: 'paid',
          paymentStatus: 'paid',
          paymentMethod: 'balance',
          payTime: db.serverDate(),
          rewardSettled: false,
          salesUpdated: false,
          updateTime: db.serverDate()
        }
      });

    logger.info('Balance payment completed', { orderId });

    await transaction.commit();

    // 支付成功后更新商品销量（在事务外执行，避免事务失败影响销量）
    if (!order.salesUpdated) {
      logger.info('Updating sales after balance payment', { orderId });
      await updateProductSales(order.items, orderId);

      // 标记销量已更新
      try {
        await db.collection('orders').doc(order._id).update({
          data: { salesUpdated: true }
        });
      } catch (error) {
        logger.warn('Failed to mark sales as updated', { orderId, error: error.message });
      }
    }

    // 支付成功后清除钱包缓存
    try {
      await cloud.callFunction({
        name: 'wallet',
        data: {
          action: 'clearCache',
          openid: openid
        }
      });
      logger.debug('Wallet cache cleared after payment', { openid });
    } catch (cacheError) {
      logger.warn('Failed to clear wallet cache', { error: cacheError.message });
    }

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

module.exports = {
  createOrder,
  getOrders,
  getOrderDetail,
  updateOrderStatus,
  adminUpdateOrderStatus,
  payWithBalance,
  validateCartItems,
  parseCartItems
};
