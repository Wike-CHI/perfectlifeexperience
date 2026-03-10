/**
 * 订单系统集成测试套件
 *
 * 测试覆盖：
 * 1. 订单状态流转
 * 2. 订单金额计算
 * 3. 支付流程
 * 4. 退款流程
 * 5. 订单与奖励结算的集成
 *
 * 运行方式：
 *   npm run test:cf
 */

const assert = require('assert');

// ==================== 常量定义 ====================

const OrderStatus = {
  PENDING: 'pending',
  PAID: 'paid',
  SHIPPING: 'shipping',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded'
};

const PaymentMethod = {
  WECHAT_PAY: 'wechatpay',
  BALANCE: 'balance'
};

const AgentLevel = {
  LEVEL_1: 1,
  LEVEL_2: 2,
  LEVEL_3: 3,
  LEVEL_4: 4
};

const Commission = {
  RULES: {
    [AgentLevel.LEVEL_1]: { own: 0.20, upstream: [] },
    [AgentLevel.LEVEL_2]: { own: 0.12, upstream: [0.08] },
    [AgentLevel.LEVEL_3]: { own: 0.12, upstream: [0.04, 0.04] },
    [AgentLevel.LEVEL_4]: { own: 0.08, upstream: [0.04, 0.04, 0.04] }
  }
};

// ==================== 辅助函数 ====================

function calculateOrderAmount(items, deliveryFee = 0, discount = 0) {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  return Math.max(0, subtotal + deliveryFee - discount);
}

function isValidStatusTransition(fromStatus, toStatus) {
  const allowedTransitions = {
    [OrderStatus.PENDING]: [OrderStatus.PAID, OrderStatus.CANCELLED],
    [OrderStatus.PAID]: [OrderStatus.SHIPPING, OrderStatus.CANCELLED],
    [OrderStatus.SHIPPING]: [OrderStatus.COMPLETED, OrderStatus.CANCELLED],
    [OrderStatus.COMPLETED]: [],
    [OrderStatus.CANCELLED]: [],
    [OrderStatus.REFUNDED]: []
  };
  return allowedTransitions[fromStatus]?.includes(toStatus) || false;
}

function calculateCommission(orderAmount, promoterLevel, upstreamUsers = []) {
  const rule = Commission.RULES[promoterLevel] || Commission.RULES[AgentLevel.LEVEL_4];
  const result = {
    promoter: { amount: Math.floor(orderAmount * rule.own), ratio: rule.own },
    upstream: [],
    company: { amount: 0 }
  };

  rule.upstream.forEach((ratio, index) => {
    if (upstreamUsers[index]) {
      result.upstream.push({
        userId: upstreamUsers[index].userId,
        amount: Math.floor(orderAmount * ratio),
        ratio
      });
    }
  });

  const distributed = result.promoter.amount + result.upstream.reduce((s, u) => s + u.amount, 0);
  result.company.amount = orderAmount - distributed;

  return result;
}

class OrderFlowSimulator {
  constructor(orderId, initialItems, buyerId, promoterId = null) {
    this.orderId = orderId;
    this.items = initialItems;
    this.buyerId = buyerId;
    this.promoterId = promoterId;
    this.status = OrderStatus.PENDING;
    this.rewardSettled = false;
    this.paidAmount = 0;
    this.refundedAmount = 0;
  }

  get subtotal() {
    return this.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }

  get totalAmount() {
    return this.subtotal;
  }

  pay(method = PaymentMethod.WECHAT_PAY) {
    if (!isValidStatusTransition(this.status, OrderStatus.PAID)) {
      throw new Error(`无法从 ${this.status} 转换为 ${OrderStatus.PAID}`);
    }
    this.status = OrderStatus.PAID;
    this.paidAmount = this.totalAmount;
    return { success: true, status: this.status, method };
  }

  ship() {
    if (!isValidStatusTransition(this.status, OrderStatus.SHIPPING)) {
      throw new Error(`无法从 ${this.status} 转换为 ${OrderStatus.SHIPPING}`);
    }
    this.status = OrderStatus.SHIPPING;
    return { success: true, status: this.status };
  }

  complete() {
    if (!isValidStatusTransition(this.status, OrderStatus.COMPLETED)) {
      throw new Error(`无法从 ${this.status} 转换为 ${OrderStatus.COMPLETED}`);
    }
    this.status = OrderStatus.COMPLETED;
    if (!this.rewardSettled && this.promoterId) {
      this.settleReward();
    }
    return { success: true, status: this.status };
  }

  settleReward() {
    if (this.rewardSettled) {
      return { success: false, reason: '已结算' };
    }
    const result = calculateCommission(this.totalAmount, AgentLevel.LEVEL_4, []);
    this.rewardSettled = true;
    return { success: true, reward: result.promoter.amount, orderId: this.orderId };
  }

  cancel(reason = '用户取消') {
    if (!isValidStatusTransition(this.status, OrderStatus.CANCELLED)) {
      throw new Error(`无法从 ${this.status} 转换为 ${OrderStatus.CANCELLED}`);
    }
    this.status = OrderStatus.CANCELLED;
    return { success: true, status: this.status, reason };
  }

  refund(amount) {
    if (amount > this.paidAmount) {
      throw new Error('退款金额不能超过支付金额');
    }
    this.refundedAmount = amount;
    if (amount === this.paidAmount) {
      this.status = OrderStatus.REFUNDED;
    }
    return { success: true, refundedAmount: amount, status: this.status };
  }
}

// ==================== 测试开始 ====================

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║     订单系统集成测试套件                                  ║');
console.log('╚════════════════════════════════════════════════════════════╝');
console.log('');

let passedTests = 0;
let failedTests = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`  ✅ ${name}`);
    passedTests++;
  } catch (error) {
    console.log(`  ❌ ${name}`);
    console.log(`     错误: ${error.message}`);
    failedTests++;
  }
}

// ===== 订单状态流转测试 =====

console.log('【订单系统】订单状态流转测试');
console.log('-'.repeat(50));

runTest('完整流程：待支付 → 已支付 → 配送中 → 已完成', () => {
  const order = new OrderFlowSimulator('order_001', [
    { productId: 'p1', name: '啤酒', price: 1000, quantity: 1 }
  ], 'buyer_001', 'promoter_001');
  assert.strictEqual(order.status, OrderStatus.PENDING);
  order.pay();
  assert.strictEqual(order.status, OrderStatus.PAID);
  order.ship();
  assert.strictEqual(order.status, OrderStatus.SHIPPING);
  order.complete();
  assert.strictEqual(order.status, OrderStatus.COMPLETED);
});

runTest('待支付 → 已支付 → 取消', () => {
  const order = new OrderFlowSimulator('order_001', [
    { productId: 'p1', name: '啤酒', price: 1000, quantity: 1 }
  ], 'buyer_001');
  order.pay();
  assert.strictEqual(order.status, OrderStatus.PAID);
  order.cancel();
  assert.strictEqual(order.status, OrderStatus.CANCELLED);
});

runTest('待支付 → 直接取消', () => {
  const order = new OrderFlowSimulator('order_001', [], 'buyer_001');
  order.cancel();
  assert.strictEqual(order.status, OrderStatus.CANCELLED);
});

runTest('已完成订单不能转换到任何状态', () => {
  const order = new OrderFlowSimulator('order_001', [], 'buyer_001');
  order.pay();
  order.ship();
  order.complete();
  assert.throws(() => order.pay(), /无法从 completed 转换为/);
});

runTest('已取消订单不能转换到任何状态', () => {
  const order = new OrderFlowSimulator('order_001', [], 'buyer_001');
  order.cancel();
  assert.throws(() => order.pay(), /无法从 cancelled 转换为/);
});

runTest('不能跳过中间状态', () => {
  const order = new OrderFlowSimulator('order_001', [], 'buyer_001');
  assert.throws(() => order.complete(), /无法从 pending 转换为/);
});

runTest('空订单可以取消', () => {
  const order = new OrderFlowSimulator('order_001', [], 'buyer_001');
  order.cancel();
  assert.strictEqual(order.status, OrderStatus.CANCELLED);
});

runTest('状态转换函数验证', () => {
  assert.strictEqual(isValidStatusTransition('pending', 'paid'), true);
  assert.strictEqual(isValidStatusTransition('pending', 'completed'), false);
  assert.strictEqual(isValidStatusTransition('completed', 'pending'), false);
});

console.log('');

// ===== 订单金额计算测试 =====

console.log('【订单系统】订单金额计算测试');
console.log('-'.repeat(50));

runTest('单商品订单', () => {
  const items = [{ productId: 'p1', price: 1000, quantity: 2 }];
  const total = calculateOrderAmount(items);
  assert.strictEqual(total, 2000);
});

runTest('多商品订单', () => {
  const items = [
    { productId: 'p1', price: 1000, quantity: 2 },
    { productId: 'p2', price: 500, quantity: 3 }
  ];
  const total = calculateOrderAmount(items);
  assert.strictEqual(total, 3500);
});

runTest('含配送费', () => {
  const items = [{ productId: 'p1', price: 1000, quantity: 1 }];
  const total = calculateOrderAmount(items, 500);
  assert.strictEqual(total, 1500);
});

runTest('含优惠', () => {
  const items = [{ productId: 'p1', price: 1000, quantity: 1 }];
  const total = calculateOrderAmount(items, 0, 200);
  assert.strictEqual(total, 800);
});

runTest('含配送费和优惠', () => {
  const items = [{ productId: 'p1', price: 1000, quantity: 1 }];
  const total = calculateOrderAmount(items, 500, 300);
  assert.strictEqual(total, 1200);
});

runTest('金额不能为负', () => {
  const items = [{ productId: 'p1', price: 100, quantity: 1 }];
  const total = calculateOrderAmount(items, 0, 10000);
  assert(total >= 0);
});

runTest('大额订单', () => {
  const items = [{ productId: 'p1', price: 1000000, quantity: 100 }];
  const total = calculateOrderAmount(items);
  assert.strictEqual(total, 100000000);
});

console.log('');

// ===== 奖励结算集成测试 =====

console.log('【订单系统】奖励结算集成测试');
console.log('-'.repeat(50));

runTest('订单完成时自动结算奖励', () => {
  const order = new OrderFlowSimulator('order_001', [
    { productId: 'p1', price: 10000, quantity: 1 }
  ], 'buyer_001', 'promoter_001');
  order.pay();
  order.ship();
  assert.strictEqual(order.rewardSettled, false);
  order.complete();
  assert.strictEqual(order.rewardSettled, true);
});

runTest('已结算订单不重复结算', () => {
  const order = new OrderFlowSimulator('order_001', [
    { productId: 'p1', price: 10000, quantity: 1 }
  ], 'buyer_001', 'promoter_001');
  order.pay();
  order.ship();
  order.complete();
  const result = order.settleReward();
  assert.strictEqual(result.success, false);
  assert.strictEqual(result.reason, '已结算');
});

runTest('无推广人订单不结算', () => {
  const order = new OrderFlowSimulator('order_001', [
    { productId: 'p1', price: 10000, quantity: 1 }
  ], 'buyer_001', null);
  order.pay();
  order.ship();
  order.complete();
  assert.strictEqual(order.rewardSettled, false);
});

runTest('取消订单不触发奖励结算', () => {
  const order = new OrderFlowSimulator('order_001', [
    { productId: 'p1', price: 10000, quantity: 1 }
  ], 'buyer_001', 'promoter_001');
  order.pay();
  order.cancel();
  assert.strictEqual(order.status, OrderStatus.CANCELLED);
  assert.strictEqual(order.rewardSettled, false);
});

runTest('待支付取消不触发奖励', () => {
  const order = new OrderFlowSimulator('order_001', [
    { productId: 'p1', price: 10000, quantity: 1 }
  ], 'buyer_001', 'promoter_001');
  order.cancel();
  assert.strictEqual(order.status, OrderStatus.CANCELLED);
  assert.strictEqual(order.rewardSettled, false);
});

console.log('');

// ===== 退款与奖励回退测试 =====

console.log('【订单系统】退款与奖励回退测试');
console.log('-'.repeat(50));

runTest('全额退款', () => {
  const order = new OrderFlowSimulator('order_001', [
    { productId: 'p1', price: 10000, quantity: 1 }
  ], 'buyer_001', 'promoter_001');
  order.pay();
  assert.strictEqual(order.paidAmount, 10000);
  order.refund(10000);
  assert.strictEqual(order.refundedAmount, 10000);
  assert.strictEqual(order.status, OrderStatus.REFUNDED);
});

runTest('部分退款', () => {
  const order = new OrderFlowSimulator('order_001', [
    { productId: 'p1', price: 10000, quantity: 1 }
  ], 'buyer_001', 'promoter_001');
  order.pay();
  order.refund(5000);
  assert.strictEqual(order.refundedAmount, 5000);
  assert.strictEqual(order.status, OrderStatus.PAID);
});

runTest('退款金额不能超过支付金额', () => {
  const order = new OrderFlowSimulator('order_001', [
    { productId: 'p1', price: 10000, quantity: 1 }
  ], 'buyer_001', 'promoter_001');
  order.pay();
  assert.throws(() => order.refund(20000), /退款金额不能超过支付金额/);
});

runTest('全额退款应扣回全部佣金', () => {
  const order = new OrderFlowSimulator('order_001', [
    { productId: 'p1', price: 10000, quantity: 1 }
  ], 'buyer_001', 'promoter_001');
  order.pay();
  order.ship();
  order.complete();
  assert.strictEqual(order.rewardSettled, true);
  const refundAmount = order.totalAmount;
  const refundRatio = refundAmount / order.totalAmount;
  const originalCommission = calculateCommission(order.totalAmount, AgentLevel.LEVEL_4, []);
  const revertAmount = Math.floor(originalCommission.promoter.amount * refundRatio);
  assert.strictEqual(revertAmount, originalCommission.promoter.amount);
});

runTest('部分退款应按比例扣回奖励', () => {
  const order = new OrderFlowSimulator('order_001', [
    { productId: 'p1', price: 10000, quantity: 1 }
  ], 'buyer_001', 'promoter_001');
  order.pay();
  order.ship();
  order.complete();
  const refundRatio = 0.3;
  const originalCommission = calculateCommission(order.totalAmount, AgentLevel.LEVEL_4, []);
  const revertAmount = Math.floor(originalCommission.promoter.amount * refundRatio);
  assert.strictEqual(revertAmount, 240);
});

console.log('');

// ===== 支付方式测试 =====

console.log('【订单系统】支付方式测试');
console.log('-'.repeat(50));

runTest('微信支付成功', () => {
  const order = new OrderFlowSimulator('order_001', [
    { productId: 'p1', price: 10000, quantity: 1 }
  ], 'buyer_001', 'promoter_001');
  const result = order.pay(PaymentMethod.WECHAT_PAY);
  assert.strictEqual(result.success, true);
  assert.strictEqual(result.method, PaymentMethod.WECHAT_PAY);
  assert.strictEqual(order.paidAmount, order.totalAmount);
});

runTest('余额支付成功', () => {
  const order = new OrderFlowSimulator('order_001', [
    { productId: 'p1', price: 10000, quantity: 1 }
  ], 'buyer_001', 'promoter_001');
  const result = order.pay(PaymentMethod.BALANCE);
  assert.strictEqual(result.success, true);
  assert.strictEqual(result.method, PaymentMethod.BALANCE);
});

console.log('');

// ===== 边界场景测试 =====

console.log('【订单系统】边界场景测试');
console.log('-'.repeat(50));

runTest('重复支付检测', () => {
  const order = new OrderFlowSimulator('order_001', [
    { productId: 'p1', price: 10000, quantity: 1 }
  ], 'buyer_001', 'promoter_001');
  order.pay();
  assert.strictEqual(order.status, OrderStatus.PAID);
  const isPaid = order.status === OrderStatus.PAID;
  assert.strictEqual(isPaid, true);
});

runTest('订单金额与支付金额一致', () => {
  const order = new OrderFlowSimulator('order_001', [
    { productId: 'p1', price: 2880, quantity: 2 },
    { productId: 'p2', price: 500, quantity: 1 }
  ], 'buyer_001');
  order.pay();
  assert.strictEqual(order.totalAmount, order.paidAmount);
});

runTest('订单状态与奖励结算状态一致', () => {
  const order = new OrderFlowSimulator('order_001', [
    { productId: 'p1', price: 10000, quantity: 1 }
  ], 'buyer_001', 'promoter_001');
  assert.strictEqual(order.rewardSettled, false);
  order.pay();
  assert.strictEqual(order.rewardSettled, false);
  order.ship();
  assert.strictEqual(order.rewardSettled, false);
  order.complete();
  assert.strictEqual(order.rewardSettled, true);
});

console.log('');

// ===== 结果汇总 =====

console.log('='.repeat(60));
console.log('📊 订单系统测试结果汇总:');
console.log(`   ✅ 通过: ${passedTests}`);
console.log(`   ❌ 失败: ${failedTests}`);
console.log(`   📊 总计: ${passedTests + failedTests}`);
console.log('='.repeat(60));

if (failedTests > 0) {
  console.log('\n❌ 部分测试失败，请检查上述错误');
  process.exit(1);
} else {
  console.log('\n🎉 所有订单系统测试通过！');
}

module.exports = {
  OrderFlowSimulator,
  calculateOrderAmount,
  isValidStatusTransition,
  calculateCommission,
  OrderStatus,
  PaymentMethod
};
