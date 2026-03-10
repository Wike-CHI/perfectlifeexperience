/**
 * 订单云函数 - 安全漏洞修复补丁
 *
 * 修复内容：
 * 1. 添加幂等键防止订单重复创建
 * 2. 改进金额验证逻辑
 * 3. 添加安全日志记录
 */

const response = require('../common/response');

/**
 * 修复#1 & #5: 订单金额验证 + 防重复提交
 *
 * @param {Object} db - 数据库实例
 * @param {Object} data - 订单数据
 * @returns {Object} 验证结果
 */
async function validateOrderSecurity(db, data) {
  const { cartItems, declaredTotal, idempotencyKey } = data;

  // ========== 修复#1: 幂等键检查 ==========
  if (idempotencyKey) {
    const existingOrder = await db.collection('orders')
      .where({ idempotencyKey })
      .get();

    if (existingOrder.data.length > 0) {
      return {
        valid: false,
        error: 'IDEMPOTENT_KEY_USED',
        message: '请勿重复提交订单',
        existingOrderId: existingOrder.data[0]._id
      };
    }
  }

  // ========== 修复#5: 服务端金额计算 ==========
  // 从数据库重新查询产品价格
  const productIds = cartItems.map(item => item.productId);
  const productsResult = await db.collection('products')
    .where({
      _id: db.command.in(productIds),
      status: 'active'
    })
    .get();

  if (productsResult.data.length !== productIds.length) {
    return {
      valid: false,
      error: 'PRODUCT_NOT_AVAILABLE',
      message: '部分商品不可用'
    };
  }

  const productsMap = {};
  productsResult.data.forEach(p => {
    productsMap[p._id] = p;
  });

  // 服务端重新计算金额
  let serverTotal = 0;
  const validatedItems = [];

  for (const item of cartItems) {
    const product = productsMap[item.productId];
    if (!product) {
      return {
        valid: false,
        error: 'PRODUCT_NOT_FOUND',
        message: `商品不存在: ${item.productId}`
      };
    }

    // 使用数据库中的价格
    const itemPrice = product.price;
    const itemTotal = itemPrice * item.quantity;

    serverTotal += itemTotal;

    validatedItems.push({
      productId: item.productId,
      productName: product.name,
      quantity: item.quantity,
      price: itemPrice,
      total: itemTotal
    });
  }

  // ========== 修复#5: 检测金额篡改 ==========
  if (declaredTotal && declaredTotal !== serverTotal) {
    const discrepancy = Math.abs(declaredTotal - serverTotal);
    const discrepancyThreshold = 100; // 1分误差

    if (discrepancy > discrepancyThreshold) {
      // 记录安全事件
      await logSecurityEvent(db, {
        type: 'PRICE_TAMPERING',
        severity: discrepancy > serverTotal * 0.5 ? 'critical' : 'high',
        userId: data._openid,
        clientAmount: declaredTotal,
        serverAmount: serverTotal,
        discrepancy: discrepancy,
        cartItems: cartItems
      });

      console.warn(`⚠️ 检测到订单金额篡改: 客户端${declaredTotal}分, 服务端${serverTotal}分, 差异${discrepancy}分`);
    }

    // 使用服务端计算的金额（忽略客户端声明）
    return {
      valid: true,
      serverTotal,
      validatedItems,
      amountTampering: discrepancy > discrepancyThreshold,
      warning: '金额已按服务端计算重新核定'
    };
  }

  return {
    valid: true,
    serverTotal,
    validatedItems
  };
}

/**
 * 记录安全事件
 */
async function logSecurityEvent(db, event) {
  try {
    await db.collection('security_events').add({
      data: {
        ...event,
        timestamp: db.serverDate(),
        userAgent: db.serverDate()
      }
    });
  } catch (error) {
    console.error('记录安全事件失败:', error);
  }
}

module.exports = {
  validateOrderSecurity,
  logSecurityEvent
};
