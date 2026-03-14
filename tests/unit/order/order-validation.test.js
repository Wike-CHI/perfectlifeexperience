/**
 * 订单验证单元测试
 *
 * 测试订单创建时的各种验证逻辑:
 * - 购物车数据完整性
 * - 商品状态验证
 * - 库存充足性验证
 * - 订单金额计算
 * - 优惠券应用
 *
 * @see cloudfunctions/order/modules/order.js - validateCartItems函数
 */

const assert = require('assert');

// ==================== 常量定义 ====================

/**
 * 金额精度常量
 */
const Amount = {
  MIN_CART_QUANTITY: 1,
  MAX_CART_QUANTITY: 999,
  PRICE_TOLERANCE: 100,  // 1元容差(分)
  PRECISION: 100         // 金额精度(分)
};

/**
 * 订单状态常量
 */
const OrderStatus = {
  PENDING: 'pending',
  PAID: 'paid',
  SHIPPING: 'shipping',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded'
};

// ==================== 验证函数 ====================

/**
 * 验证购物车数据(简化版本,用于单元测试)
 * @param {Array} cartItems - 购物车商品列表
 * @param {object} options - 验证选项 { stock, status }
 * @returns {object} 验证结果 { valid, errors, totalAmount, validatedItems }
 */
function validateCartItems(cartItems, options = {}) {
  const { stock = {}, status = {} } = options;

  const validatedItems = [];
  let totalAmount = 0;
  const errors = [];

  // 验证购物车不为空
  if (!cartItems || cartItems.length === 0) {
    return { valid: false, errors: ['购物车为空'], totalAmount: 0, validatedItems: [] };
  }

  // 验证每个商品
  for (let i = 0; i < cartItems.length; i++) {
    const item = cartItems[i];
    const productId = item.productId;

    // 验证商品ID存在
    if (!productId) {
      errors.push(`第${i + 1}项商品ID缺失`);
      continue;
    }

    // 验证商品状态(如果提供)
    const productStatus = status[productId];
    if (productStatus && productStatus.isActive === false) {
      errors.push(`商品"${item.name || productId}"已下架`);
      continue;
    }

    // 验证库存(如果提供)
    const availableStock = stock[productId];
    if (availableStock !== undefined && item.quantity > availableStock) {
      errors.push(`商品"${item.name || productId}"库存不足(库存:${availableStock},需要:${item.quantity})`);
      continue;
    }

    // 验证数量范围
    const quantity = parseInt(item.quantity) || 0;
    if (quantity < Amount.MIN_CART_QUANTITY || quantity > Amount.MAX_CART_QUANTITY) {
      errors.push(`商品"${item.name || productId}"数量异常(${quantity})`);
      continue;
    }

    // 验证价格
    const price = parseInt(item.price) || 0;
    if (price <= 0) {
      errors.push(`商品"${item.name || productId}"价格异常`);
      continue;
    }

    // 计算商品小计
    const itemTotal = price * quantity;
    totalAmount += itemTotal;

    validatedItems.push({
      ...item,
      itemTotal,
      serverPrice: price
    });
  }

  // 如果有错误,返回失败
  if (errors.length > 0) {
    return { valid: false, errors, totalAmount, validatedItems };
  }

  return { valid: true, errors: [], totalAmount, validatedItems };
}

/**
 * 应用优惠券折扣
 * @param {number} orderAmount - 订单金额(分)
 * @param {object} coupon - 优惠券对象
 * @returns {object} 折扣结果 { discount, finalAmount, applied }
 */
function applyCoupon(orderAmount, coupon) {
  if (!coupon) {
    return { discount: 0, finalAmount: orderAmount, applied: false };
  }

  let discount = 0;
  let applied = false;

  switch (coupon.type) {
    case 'full_reduction': // 满减券
      if (orderAmount >= coupon.threshold) {
        discount = coupon.discount;
        applied = true;
      }
      break;

    case 'percentage': // 百分比折扣
      if (orderAmount >= coupon.threshold) {
        discount = Math.round(orderAmount * coupon.discountRate);
        applied = true;
      }
      break;

    case 'fixed': // 固定金额
      discount = coupon.discount;
      applied = true;
      break;

    default:
      break;
  }

  const finalAmount = Math.max(0, orderAmount - discount);

  return { discount, finalAmount, applied };
}

// ==================== 测试套件 ====================

describe('订单验证测试', () => {

  describe('订单总金额计算', () => {

    it('应该正确计算单个商品的订单金额', () => {
      // Arrange
      const items = [{
        productId: 'product_001',
        name: '精酿啤酒A',
        quantity: 2,
        price: 2800 // 28元
      }];

      // Act
      const result = validateCartItems(items);

      // Assert
      assert.strictEqual(result.valid, true, '验证应该通过');
      assert.strictEqual(result.totalAmount, 5600, '订单金额应为56元');
      assert.strictEqual(result.validatedItems.length, 1, '应有1个验证通过的商品');

      console.log('✅ 单个商品订单金额计算正确：56元');
    });

    it('应该正确计算多个商品的订单金额', () => {
      // Arrange
      const items = [
        { productId: 'product_001', name: '精酿啤酒A', quantity: 2, price: 2800 },
        { productId: 'product_002', name: '精酿啤酒B', quantity: 1, price: 3200 },
        { productId: 'product_003', name: '精酿啤酒C', quantity: 3, price: 1500 }
      ];

      // Act
      const result = validateCartItems(items);

      // Assert
      assert.strictEqual(result.valid, true, '验证应该通过');
      assert.strictEqual(result.totalAmount, 13300, '订单金额应为133元');
      assert.strictEqual(result.validatedItems.length, 3, '应有3个验证通过的商品');

      console.log('✅ 多个商品订单金额计算正确：133元');
    });

    it('应该正确处理大额订单', () => {
      // Arrange
      const items = [{
        productId: 'product_001',
        name: '精酿啤酒A',
        quantity: 100,
        price: 2800
      }];

      // Act
      const result = validateCartItems(items);

      // Assert
      assert.strictEqual(result.valid, true, '验证应该通过');
      assert.strictEqual(result.totalAmount, 280000, '订单金额应为2800元');

      console.log('✅ 大额订单金额计算正确：2800元');
    });

    it('应该正确计算零元订单', () => {
      // Arrange
      const items = [{
        productId: 'product_001',
        name: '精酿啤酒A',
        quantity: 0,
        price: 2800
      }];

      // Act
      const result = validateCartItems(items);

      // Assert
      assert.strictEqual(result.valid, false, '数量为0应该验证失败');
      assert.ok(result.errors.some(e => e.includes('数量异常')), '应该有数量异常的错误');

      console.log('✅ 零元订单正确拒绝');
    });
  });

  describe('库存充足性验证', () => {

    it('库存充足时应该允许下单', () => {
      // Arrange
      const items = [{
        productId: 'product_001',
        name: '精酿啤酒A',
        quantity: 5,
        price: 2800
      }];
      const stock = { 'product_001': 100 };

      // Act
      const result = validateCartItems(items, { stock });

      // Assert
      assert.strictEqual(result.valid, true, '库存充足时应该验证通过');
      assert.strictEqual(result.errors.length, 0, '不应该有错误');

      console.log('✅ 库存充足时允许下单');
    });

    it('库存不足时应该拒绝下单', () => {
      // Arrange
      const items = [{
        productId: 'product_001',
        name: '精酿啤酒A',
        quantity: 150,
        price: 2800
      }];
      const stock = { 'product_001': 100 };

      // Act
      const result = validateCartItems(items, { stock });

      // Assert
      assert.strictEqual(result.valid, false, '库存不足时应该验证失败');
      assert.ok(result.errors.some(e => e.includes('库存不足')), '应该有库存不足的错误');
      assert.ok(result.errors[0].includes('库存:100'), '错误信息应包含当前库存量');

      console.log('✅ 库存不足时正确拒绝下单');
    });

    it('库存为0时应该拒绝下单', () => {
      // Arrange
      const items = [{
        productId: 'product_001',
        name: '精酿啤酒A',
        quantity: 1,
        price: 2800
      }];
      const stock = { 'product_001': 0 };

      // Act
      const result = validateCartItems(items, { stock });

      // Assert
      assert.strictEqual(result.valid, false, '库存为0时应该验证失败');
      assert.ok(result.errors.some(e => e.includes('库存不足')), '应该有库存不足的错误');

      console.log('✅ 库存为0时正确拒绝下单');
    });

    it('多个商品时有任一库存不足应拒绝整个订单', () => {
      // Arrange
      const items = [
        { productId: 'product_001', name: '精酿啤酒A', quantity: 5, price: 2800 },
        { productId: 'product_002', name: '精酿啤酒B', quantity: 200, price: 3200 }
      ];
      const stock = {
        'product_001': 100, // 库存充足
        'product_002': 50   // 库存不足
      };

      // Act
      const result = validateCartItems(items, { stock });

      // Assert
      assert.strictEqual(result.valid, false, '应该验证失败');
      assert.ok(result.errors.some(e => e.includes('精酿啤酒B') && e.includes('库存不足')), '应指出库存不足的商品');

      console.log('✅ 多个商品时有任一库存不足正确拒绝整个订单');
    });
  });

  describe('商品状态验证', () => {

    it('上架商品应该允许下单', () => {
      // Arrange
      const items = [{
        productId: 'product_001',
        name: '精酿啤酒A',
        quantity: 1,
        price: 2800
      }];
      const status = { 'product_001': { isActive: true } };

      // Act
      const result = validateCartItems(items, { status });

      // Assert
      assert.strictEqual(result.valid, true, '上架商品应该验证通过');

      console.log('✅ 上架商品允许下单');
    });

    it('下架商品应该拒绝下单', () => {
      // Arrange
      const items = [{
        productId: 'product_002',
        name: '精酿啤酒B',
        quantity: 1,
        price: 3200
      }];
      const status = { 'product_002': { isActive: false } };

      // Act
      const result = validateCartItems(items, { status });

      // Assert
      assert.strictEqual(result.valid, false, '下架商品应该验证失败');
      assert.ok(result.errors.some(e => e.includes('已下架')), '应该有商品已下架的错误');

      console.log('✅ 下架商品正确拒绝下单');
    });

    it('购物车中有下架商品时应该拒绝整个订单', () => {
      // Arrange
      const items = [
        { productId: 'product_001', name: '精酿啤酒A', quantity: 1, price: 2800 },
        { productId: 'product_002', name: '精酿啤酒B', quantity: 1, price: 3200 }
      ];
      const status = {
        'product_001': { isActive: true },
        'product_002': { isActive: false }
      };

      // Act
      const result = validateCartItems(items, { status });

      // Assert
      assert.strictEqual(result.valid, false, '应该验证失败');
      assert.ok(result.errors.some(e => e.includes('精酿啤酒B') && e.includes('已下架')), '应指出下架的商品');

      console.log('✅ 购物车中有下架商品时正确拒绝整个订单');
    });

    it('未提供状态信息时应默认允许下单', () => {
      // Arrange
      const items = [{
        productId: 'product_001',
        name: '精酿啤酒A',
        quantity: 1,
        price: 2800
      }];

      // Act
      const result = validateCartItems(items, {}); // 不提供status

      // Assert
      assert.strictEqual(result.valid, true, '未提供状态信息时应默认允许');

      console.log('✅ 未提供状态信息时默认允许下单');
    });
  });

  describe('优惠券应用逻辑', () => {

    it('应该正确应用满减券', () => {
      // Arrange
      const orderAmount = 10000; // 100元
      const coupon = {
        type: 'full_reduction',
        threshold: 5000, // 满50元
        discount: 1000   // 减10元
      };

      // Act
      const result = applyCoupon(orderAmount, coupon);

      // Assert
      assert.strictEqual(result.discount, 1000, '应该减10元');
      assert.strictEqual(result.finalAmount, 9000, '最终金额应为90元');
      assert.strictEqual(result.applied, true, '优惠券应该已应用');

      console.log('✅ 满减券应用正确：100元订单减10元 = 90元');
    });

    it('未达到满减门槛时不应应用优惠券', () => {
      // Arrange
      const orderAmount = 3000; // 30元
      const coupon = {
        type: 'full_reduction',
        threshold: 5000, // 满50元
        discount: 1000   // 减10元
      };

      // Act
      const result = applyCoupon(orderAmount, coupon);

      // Assert
      assert.strictEqual(result.discount, 0, '不应该有折扣');
      assert.strictEqual(result.finalAmount, 3000, '最终金额应为30元');
      assert.strictEqual(result.applied, false, '优惠券不应应用');

      console.log('✅ 未达满减门槛时正确不应用优惠券');
    });

    it('应该正确应用百分比折扣券', () => {
      // Arrange
      const orderAmount = 10000; // 100元
      const coupon = {
        type: 'percentage',
        threshold: 0,      // 无门槛
        discountRate: 0.15 // 85折(15%off)
      };

      // Act
      const result = applyCoupon(orderAmount, coupon);

      // Assert
      assert.strictEqual(result.discount, 1500, '应该减15元');
      assert.strictEqual(result.finalAmount, 8500, '最终金额应为85元');
      assert.strictEqual(result.applied, true, '优惠券应该已应用');

      console.log('✅ 百分比折扣券应用正确：100元订单85折 = 85元');
    });

    it('应该正确应用固定金额券', () => {
      // Arrange
      const orderAmount = 10000; // 100元
      const coupon = {
        type: 'fixed',
        discount: 2000 // 减20元
      };

      // Act
      const result = applyCoupon(orderAmount, coupon);

      // Assert
      assert.strictEqual(result.discount, 2000, '应该减20元');
      assert.strictEqual(result.finalAmount, 8000, '最终金额应为80元');
      assert.strictEqual(result.applied, true, '优惠券应该已应用');

      console.log('✅ 固定金额券应用正确：100元订单减20元 = 80元');
    });

    it('折扣后金额不应为负数', () => {
      // Arrange
      const orderAmount = 1000; // 10元
      const coupon = {
        type: 'fixed',
        discount: 2000 // 减20元(超过订单金额)
      };

      // Act
      const result = applyCoupon(orderAmount, coupon);

      // Assert
      assert.strictEqual(result.finalAmount, 0, '最终金额不应为负数,最小应为0');
      assert.strictEqual(result.discount, 2000, '折扣金额仍为20元');

      console.log('✅ 折扣后金额正确处理为0,不为负数');
    });
  });

  describe('购物车数据完整性验证', () => {

    it('空购物车应该拒绝', () => {
      // Arrange
      const items = [];

      // Act
      const result = validateCartItems(items);

      // Assert
      assert.strictEqual(result.valid, false, '空购物车应该验证失败');
      assert.ok(result.errors.includes('购物车为空'), '应该有"购物车为空"错误');
      assert.strictEqual(result.totalAmount, 0, '总金额应为0');

      console.log('✅ 空购物车正确拒绝');
    });

    it('null购物车应该拒绝', () => {
      // Arrange
      const items = null;

      // Act
      const result = validateCartItems(items);

      // Assert
      assert.strictEqual(result.valid, false, 'null购物车应该验证失败');
      assert.ok(result.errors.includes('购物车为空'), '应该有"购物车为空"错误');

      console.log('✅ null购物车正确拒绝');
    });

    it('商品ID缺失应该拒绝', () => {
      // Arrange
      const items = [{
        name: '精酿啤酒A',
        quantity: 1,
        price: 2800
        // 缺少productId
      }];

      // Act
      const result = validateCartItems(items);

      // Assert
      assert.strictEqual(result.valid, false, '商品ID缺失应该验证失败');
      assert.ok(result.errors.some(e => e.includes('ID缺失')), '应该有ID缺失错误');

      console.log('✅ 商品ID缺失正确拒绝');
    });

    it('价格为0或负数应该拒绝', () => {
      // Arrange
      const items = [{
        productId: 'product_001',
        name: '精酿啤酒A',
        quantity: 1,
        price: 0
      }];

      // Act
      const result = validateCartItems(items);

      // Assert
      assert.strictEqual(result.valid, false, '价格为0应该验证失败');
      assert.ok(result.errors.some(e => e.includes('价格异常')), '应该有价格异常错误');

      console.log('✅ 价格为0正确拒绝');
    });

    it('数量超过最大值应该拒绝', () => {
      // Arrange
      const items = [{
        productId: 'product_001',
        name: '精酿啤酒A',
        quantity: 1000, // 超过MAX_CART_QUANTITY(999)
        price: 2800
      }];

      // Act
      const result = validateCartItems(items);

      // Assert
      assert.strictEqual(result.valid, false, '数量超过最大值应该验证失败');
      assert.ok(result.errors.some(e => e.includes('数量异常')), '应该有数量异常错误');

      console.log('✅ 数量超过最大值正确拒绝');
    });
  });

  describe('综合场景测试', () => {

    it('正常订单应该完全通过验证', () => {
      // Arrange
      const items = [
        { productId: 'product_001', name: '精酿啤酒A', quantity: 2, price: 2800 },
        { productId: 'product_002', name: '精酿啤酒B', quantity: 1, price: 3200 }
      ];
      const stock = {
        'product_001': 100,
        'product_002': 50
      };
      const status = {
        'product_001': { isActive: true },
        'product_002': { isActive: true }
      };

      // Act
      const result = validateCartItems(items, { stock, status });

      // Assert
      assert.strictEqual(result.valid, true, '正常订单应该完全通过');
      assert.strictEqual(result.errors.length, 0, '不应该有任何错误');
      assert.strictEqual(result.validatedItems.length, 2, '所有商品都应验证通过');
      assert.strictEqual(result.totalAmount, 8800, '总金额应为88元');

      console.log('✅ 正常订单完全通过验证');
    });

    it('多种错误应该全部返回', () => {
      // Arrange
      const items = [
        { productId: 'product_001', name: '精酿啤酒A', quantity: 2, price: 2800 },
        { productId: 'product_002', name: '精酿啤酒B', quantity: 150, price: 3200 }, // 库存不足
        { productId: 'product_003', name: '精酿啤酒C', quantity: 1, price: 0 },      // 价格异常
      ];
      const stock = {
        'product_001': 100,
        'product_002': 50  // 库存不足
      };
      const status = {
        'product_001': { isActive: true },
        'product_002': { isActive: true },
        'product_003': { isActive: true }
      };

      // Act
      const result = validateCartItems(items, { stock, status });

      // Assert
      assert.strictEqual(result.valid, false, '应该验证失败');
      assert.ok(result.errors.length >= 2, '应该有多个错误');
      assert.ok(result.errors.some(e => e.includes('库存不足')), '应有库存不足错误');
      assert.ok(result.errors.some(e => e.includes('价格异常')), '应有价格异常错误');

      console.log('✅ 多种错误全部正确返回');
    });
  });
});
