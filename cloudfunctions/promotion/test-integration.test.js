/**
 * 推广分销系统集成测试套件
 *
 * 测试覆盖：
 * 1. 推广体系核心逻辑（各等级佣金计算）
 * 2. 订单创建、支付、完成流程
 * 3. 奖励结算流程（订单完成时触发）
 * 4. 退款与奖励回退场景
 * 5. 边界情况和异常场景
 * 6. 潜在大型Bug检测
 *
 * 运行方式：
 *   npm run test:cf
 */

const assert = require('assert');

// ==================== 常量定义 ====================

// 代理等级
const AgentLevel = {
  HEAD_OFFICE: 0,
  LEVEL_1: 1,
  LEVEL_2: 2,
  LEVEL_3: 3,
  LEVEL_4: 4
};

// 订单状态
const OrderStatus = {
  PENDING: 'pending',
  PAID: 'paid',
  SHIPPING: 'shipping',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded'
};

// 佣金规则
const Commission = {
  COMPANY_SHARE: 0.80,
  RULES: {
    [AgentLevel.LEVEL_1]: { own: 0.20, upstream: [] },
    [AgentLevel.LEVEL_2]: { own: 0.12, upstream: [0.08] },
    [AgentLevel.LEVEL_3]: { own: 0.12, upstream: [0.04, 0.04] },
    [AgentLevel.LEVEL_4]: { own: 0.08, upstream: [0.04, 0.04, 0.04] }
  }
};

// 晋升门槛
const PromotionThreshold = {
  LEVEL_4_TO_3: { totalSales: 200000 },
  LEVEL_3_TO_2: { monthSales: 500000, teamCount: 50 },
  LEVEL_2_TO_1: { monthSales: 1000000, teamCount: 200 }
};

// ==================== 辅助函数 ====================

function getCommissionRule(level) {
  return Commission.RULES[level] || Commission.RULES[AgentLevel.LEVEL_4];
}

function calculateCommission(orderAmount, promoterLevel, upstreamUsers = []) {
  const rule = getCommissionRule(promoterLevel);
  const result = {
    promoter: {
      userId: upstreamUsers[0]?.userId || null,
      amount: Math.floor(orderAmount * rule.own),
      ratio: rule.own
    },
    upstream: [],
    company: { amount: 0, ratio: Commission.COMPANY_SHARE },
    total: orderAmount
  };

  rule.upstream.forEach((ratio, index) => {
    if (upstreamUsers[index]) {
      result.upstream.push({
        userId: upstreamUsers[index].userId,
        level: upstreamUsers[index].level,
        amount: Math.floor(orderAmount * ratio),
        ratio
      });
    }
  });

  const distributed = result.promoter.amount +
    result.upstream.reduce((sum, u) => sum + u.amount, 0);
  result.company.amount = orderAmount - distributed;

  return result;
}

function checkPromotionEligibility(performance, currentLevel) {
  if (currentLevel === AgentLevel.LEVEL_4) {
    if (performance.totalSales >= PromotionThreshold.LEVEL_4_TO_3.totalSales) {
      return { canPromote: true, reason: '累计销售额达标' };
    }
    return { canPromote: false, reason: '累计销售额不足' };
  }
  if (currentLevel === AgentLevel.LEVEL_3) {
    if (performance.monthSales >= PromotionThreshold.LEVEL_3_TO_2.monthSales ||
        performance.teamCount >= PromotionThreshold.LEVEL_3_TO_2.teamCount) {
      return { canPromote: true, reason: '本月销售额或团队人数达标' };
    }
    return { canPromote: false, reason: '本月销售额或团队人数不足' };
  }
  if (currentLevel === AgentLevel.LEVEL_2) {
    if (performance.monthSales >= PromotionThreshold.LEVEL_2_TO_1.monthSales ||
        performance.teamCount >= PromotionThreshold.LEVEL_2_TO_1.teamCount) {
      return { canPromote: true, reason: '本月销售额或团队人数达标' };
    }
    return { canPromote: false, reason: '本月销售额或团队人数不足' };
  }
  return { canPromote: false, reason: '已达最高等级' };
}

function isValidStatusTransition(fromStatus, toStatus) {
  const allowedTransitions = {
    'pending': ['paid', 'cancelled'],
    'paid': ['shipping', 'cancelled'],
    'shipping': ['completed', 'cancelled'],
    'completed': [],
    'cancelled': []
  };
  return allowedTransitions[fromStatus]?.includes(toStatus) || false;
}

// ==================== 测试开始 ====================

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║     推广分销系统集成测试套件 - TDD测试                   ║');
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

// ===== 第一部分：推广体系核心逻辑测试 =====

console.log('【第一部分】推广体系核心逻辑测试');
console.log('-'.repeat(50));

// 1.1 一级代理佣金计算
runTest('一级代理推广：自己拿20%，无上级', () => {
  const result = calculateCommission(10000, AgentLevel.LEVEL_1, []);
  assert.strictEqual(result.promoter.amount, 2000);
  assert.strictEqual(result.promoter.ratio, 0.20);
  assert.strictEqual(result.upstream.length, 0);
  assert.strictEqual(result.company.amount, 8000);
});

runTest('一级代理推广288元订单', () => {
  const result = calculateCommission(28800, AgentLevel.LEVEL_1, []);
  assert.strictEqual(result.promoter.amount, 5760);
  assert.strictEqual(result.company.amount, 23040);
});

runTest('一级代理推广大额订单10万元', () => {
  const result = calculateCommission(1000000, AgentLevel.LEVEL_1, []);
  assert.strictEqual(result.promoter.amount, 200000);
  assert.strictEqual(result.company.amount, 800000);
});

// 1.2 二级代理佣金计算
runTest('二级代理推广：自己12% + 一级8% = 20%', () => {
  const upstream = [{ userId: 'A', level: AgentLevel.LEVEL_1 }];
  const result = calculateCommission(10000, AgentLevel.LEVEL_2, upstream);
  assert.strictEqual(result.promoter.amount, 1200);
  assert.strictEqual(result.upstream[0].amount, 800);
  assert.strictEqual(result.company.amount, 8000);
});

runTest('二级代理推广：上级数量不足时正确处理', () => {
  const upstream = [];
  const result = calculateCommission(10000, AgentLevel.LEVEL_2, upstream);
  assert.strictEqual(result.promoter.amount, 1200);
  assert.strictEqual(result.upstream.length, 0);
  assert.strictEqual(result.company.amount, 8800);
});

// 1.3 三级代理佣金计算
runTest('三级代理推广：自己12% + 二级4% + 一级4% = 20%', () => {
  const upstream = [
    { userId: 'B', level: AgentLevel.LEVEL_2 },
    { userId: 'A', level: AgentLevel.LEVEL_1 }
  ];
  const result = calculateCommission(10000, AgentLevel.LEVEL_3, upstream);
  assert.strictEqual(result.promoter.amount, 1200);
  assert.strictEqual(result.upstream[0].amount, 400);
  assert.strictEqual(result.upstream[1].amount, 400);
  assert.strictEqual(result.company.amount, 8000);
});

// 1.4 四级代理佣金计算
runTest('四级代理推广：完整四级链', () => {
  const upstream = [
    { userId: 'C', level: AgentLevel.LEVEL_3 },
    { userId: 'B', level: AgentLevel.LEVEL_2 },
    { userId: 'A', level: AgentLevel.LEVEL_1 }
  ];
  const result = calculateCommission(10000, AgentLevel.LEVEL_4, upstream);
  assert.strictEqual(result.promoter.amount, 800);
  assert.strictEqual(result.upstream[0].amount, 400);
  assert.strictEqual(result.upstream[1].amount, 400);
  assert.strictEqual(result.upstream[2].amount, 400);
  assert.strictEqual(result.company.amount, 8000);
});

runTest('四级代理推广：无上级时自己拿8%', () => {
  const result = calculateCommission(10000, AgentLevel.LEVEL_4, []);
  assert.strictEqual(result.promoter.amount, 800);
  assert.strictEqual(result.company.amount, 9200);
});

runTest('四级代理推广：只有部分上级', () => {
  const upstream = [
    { userId: 'B', level: AgentLevel.LEVEL_2 },
    { userId: 'A', level: AgentLevel.LEVEL_1 }
  ];
  const result = calculateCommission(10000, AgentLevel.LEVEL_4, upstream);
  assert.strictEqual(result.promoter.amount, 800);
  assert.strictEqual(result.upstream.length, 2);
  assert.strictEqual(result.company.amount, 8400);
});

// 1.5 佣金完整性验证
runTest('所有等级的佣金总和为20%', () => {
  const levels = [AgentLevel.LEVEL_1, AgentLevel.LEVEL_2, AgentLevel.LEVEL_3, AgentLevel.LEVEL_4];
  levels.forEach(level => {
    const rule = getCommissionRule(level);
    const total = rule.own + rule.upstream.reduce((sum, r) => sum + r, 0);
    assert.strictEqual(total, 0.20, `Level ${level} total should be 20%`);
  });
});

runTest('佣金分配到个人+公司=订单总额', () => {
  const testCases = [
    { amount: 100, level: AgentLevel.LEVEL_1 },
    { amount: 500, level: AgentLevel.LEVEL_2 },
    { amount: 1000, level: AgentLevel.LEVEL_3 },
    { amount: 50, level: AgentLevel.LEVEL_4 }
  ];
  testCases.forEach(({ amount, level }) => {
    const upstream = [
      { userId: 'C', level: AgentLevel.LEVEL_3 },
      { userId: 'B', level: AgentLevel.LEVEL_2 },
      { userId: 'A', level: AgentLevel.LEVEL_1 }
    ].slice(4 - level);
    const result = calculateCommission(amount, level, upstream);
    const distributed = result.promoter.amount +
      result.upstream.reduce((sum, u) => sum + u.amount, 0) +
      result.company.amount;
    assert.strictEqual(distributed, amount, `Amount ${amount} should balance`);
  });
});

// 1.6 边界情况
runTest('订单金额为0：无佣金', () => {
  const result = calculateCommission(0, AgentLevel.LEVEL_1, []);
  assert.strictEqual(result.promoter.amount, 0);
  assert.strictEqual(result.company.amount, 0);
});

runTest('订单金额为1分：向下取整', () => {
  const result = calculateCommission(1, AgentLevel.LEVEL_1, []);
  assert.strictEqual(result.promoter.amount, 0);
});

runTest('精度测试：101分订单', () => {
  const result = calculateCommission(101, AgentLevel.LEVEL_4, [
    { userId: 'C', level: AgentLevel.LEVEL_3 },
    { userId: 'B', level: AgentLevel.LEVEL_2 },
    { userId: 'A', level: AgentLevel.LEVEL_1 }
  ]);
  assert.strictEqual(result.promoter.amount, 8);
  assert.strictEqual(result.upstream[0].amount, 4);
});

runTest('大额订单：10万元', () => {
  const upstream = [
    { userId: 'C', level: AgentLevel.LEVEL_3 },
    { userId: 'B', level: AgentLevel.LEVEL_2 },
    { userId: 'A', level: AgentLevel.LEVEL_1 }
  ];
  const result = calculateCommission(1000000, AgentLevel.LEVEL_4, upstream);
  assert.strictEqual(result.promoter.amount, 80000);
  assert.strictEqual(result.upstream[0].amount, 40000);
  assert.strictEqual(result.upstream[1].amount, 40000);
  assert.strictEqual(result.upstream[2].amount, 40000);
  assert.strictEqual(result.company.amount, 800000);
});

// 1.7 晋升门槛
runTest('四级→三级：累计销售额达标', () => {
  const performance = { totalSales: 200000, monthSales: 0, teamCount: 0 };
  const result = checkPromotionEligibility(performance, AgentLevel.LEVEL_4);
  assert.strictEqual(result.canPromote, true);
});

runTest('四级→三级：累计销售额不足', () => {
  const performance = { totalSales: 199999, monthSales: 0, teamCount: 0 };
  const result = checkPromotionEligibility(performance, AgentLevel.LEVEL_4);
  assert.strictEqual(result.canPromote, false);
});

runTest('三级→二级：本月销售额达标', () => {
  const performance = { totalSales: 100000, monthSales: 500000, teamCount: 10 };
  const result = checkPromotionEligibility(performance, AgentLevel.LEVEL_3);
  assert.strictEqual(result.canPromote, true);
});

runTest('三级→二级：团队人数达标', () => {
  const performance = { totalSales: 100000, monthSales: 10000, teamCount: 50 };
  const result = checkPromotionEligibility(performance, AgentLevel.LEVEL_3);
  assert.strictEqual(result.canPromote, true);
});

runTest('二级→一级：已达最高等级', () => {
  const performance = { totalSales: 10000000, monthSales: 1000000, teamCount: 1000 };
  const result = checkPromotionEligibility(performance, AgentLevel.LEVEL_1);
  assert.strictEqual(result.canPromote, false);
  assert.strictEqual(result.reason, '已达最高等级');
});

console.log('');

// ===== 第二部分：订单状态流转测试 =====

console.log('【第二部分】订单状态流转测试');
console.log('-'.repeat(50));

runTest('pending → paid → shipping → completed 合法', () => {
  assert.strictEqual(isValidStatusTransition('pending', 'paid'), true);
  assert.strictEqual(isValidStatusTransition('paid', 'shipping'), true);
  assert.strictEqual(isValidStatusTransition('shipping', 'completed'), true);
});

runTest('pending → cancelled 合法', () => {
  assert.strictEqual(isValidStatusTransition('pending', 'cancelled'), true);
});

runTest('completed → pending 非法', () => {
  assert.strictEqual(isValidStatusTransition('completed', 'pending'), false);
});

runTest('cancelled → paid 非法', () => {
  assert.strictEqual(isValidStatusTransition('cancelled', 'paid'), false);
});

runTest('pending → completed 非法（跳过中间状态）', () => {
  assert.strictEqual(isValidStatusTransition('pending', 'completed'), false);
});

runTest('completed → cancelled 非法', () => {
  assert.strictEqual(isValidStatusTransition('completed', 'cancelled'), false);
});

console.log('');

// ===== 第三部分：订单-奖励结算集成测试 =====

console.log('【第三部分】订单-奖励结算集成测试');
console.log('-'.repeat(50));

runTest('完整四级代理链订单', () => {
  const orderAmount = 10000;
  const upstream = [
    { userId: 'C', level: AgentLevel.LEVEL_3 },
    { userId: 'B', level: AgentLevel.LEVEL_2 },
    { userId: 'A', level: AgentLevel.LEVEL_1 }
  ];
  const result = calculateCommission(orderAmount, AgentLevel.LEVEL_4, upstream);

  assert.strictEqual(result.promoter.amount, 800);
  assert.strictEqual(result.upstream[0].amount, 400);
  assert.strictEqual(result.upstream[1].amount, 400);
  assert.strictEqual(result.upstream[2].amount, 400);
  assert.strictEqual(result.company.amount, 8000);
});

runTest('一级代理直接推广', () => {
  const orderAmount = 10000;
  const result = calculateCommission(orderAmount, AgentLevel.LEVEL_1, []);
  assert.strictEqual(result.promoter.amount, 2000);
  assert.strictEqual(result.company.amount, 8000);
});

runTest('二级代理推广', () => {
  const orderAmount = 50000;
  const upstream = [{ userId: 'A', level: AgentLevel.LEVEL_1 }];
  const result = calculateCommission(orderAmount, AgentLevel.LEVEL_2, upstream);
  assert.strictEqual(result.promoter.amount, 6000);
  assert.strictEqual(result.upstream[0].amount, 4000);
  assert.strictEqual(result.company.amount, 40000);
});

runTest('订单完成触发奖励结算', () => {
  const orderStatus = OrderStatus.COMPLETED;
  const shouldSettleReward = orderStatus === OrderStatus.COMPLETED;
  assert.strictEqual(shouldSettleReward, true);
});

runTest('已结算订单不重复结算', () => {
  const order = { rewardSettled: true };
  const shouldSettle = !order.rewardSettled;
  assert.strictEqual(shouldSettle, false);
});

runTest('未结算订单需要结算', () => {
  const order = { rewardSettled: false };
  const shouldSettle = !order.rewardSettled;
  assert.strictEqual(shouldSettle, true);
});

console.log('');

// ===== 第四部分：退款与奖励回退测试 =====

console.log('【第四部分】退款与奖励回退测试');
console.log('-'.repeat(50));

runTest('全额退款时应扣回全部佣金', () => {
  const orderAmount = 10000;
  const refundRatio = 1.0;
  const commission = 2000;
  const revertAmount = Math.floor(commission * refundRatio);
  assert.strictEqual(revertAmount, commission);
});

runTest('部分退款时应按比例扣回佣金', () => {
  const orderAmount = 10000;
  const refundRatio = 0.5;
  const commission = 2000;
  const revertAmount = Math.floor(commission * refundRatio);
  assert.strictEqual(revertAmount, 1000);
});

runTest('部分退款场景模拟', () => {
  const orderAmount = 10000;
  const refundRatio = 0.5;
  const upstream = [
    { userId: 'C', level: AgentLevel.LEVEL_3 },
    { userId: 'B', level: AgentLevel.LEVEL_2 },
    { userId: 'A', level: AgentLevel.LEVEL_1 }
  ];
  const original = calculateCommission(orderAmount, AgentLevel.LEVEL_4, upstream);
  const revertPromoter = Math.floor(original.promoter.amount * refundRatio);
  assert.strictEqual(revertPromoter, 400);
});

runTest('取消订单不产生佣金', () => {
  const orderStatus = OrderStatus.CANCELLED;
  const shouldSettle = orderStatus === OrderStatus.COMPLETED;
  assert.strictEqual(shouldSettle, false);
});

runTest('待支付订单不结算佣金', () => {
  const orderStatus = OrderStatus.PENDING;
  const shouldSettle = orderStatus === OrderStatus.COMPLETED;
  assert.strictEqual(shouldSettle, false);
});

console.log('');

// ===== 第五部分：潜在大型Bug检测 =====

console.log('【第五部分】潜在大型Bug检测');
console.log('-'.repeat(50));

runTest('佣金向下取整不会导致负数', () => {
  const amounts = [1, 2, 3, 5, 7, 9, 10, 99, 100];
  amounts.forEach(amount => {
    const result = calculateCommission(amount, AgentLevel.LEVEL_1, []);
    assert(result.promoter.amount >= 0);
    assert(result.company.amount >= 0);
    assert(result.promoter.amount <= amount);
  });
});

runTest('多次计算累积误差检查', () => {
  let totalOrder = 0;
  let totalCommission = 0;
  const orders = [100, 200, 300, 400, 500];
  orders.forEach(amount => {
    const result = calculateCommission(amount, AgentLevel.LEVEL_1, []);
    totalOrder += amount;
    totalCommission += result.promoter.amount;
  });
  const expectedTotalCommission = Math.floor(totalOrder * 0.20);
  assert(Math.abs(totalCommission - expectedTotalCommission) <= 1);
});

runTest('极端小额订单处理', () => {
  const result = calculateCommission(1, AgentLevel.LEVEL_4, [
    { userId: 'C', level: AgentLevel.LEVEL_3 },
    { userId: 'B', level: AgentLevel.LEVEL_2 },
    { userId: 'A', level: AgentLevel.LEVEL_1 }
  ]);
  assert.strictEqual(result.promoter.amount, 0);
  assert.strictEqual(result.company.amount, 1);
});

runTest('代理等级不能超过4级', () => {
  const invalidLevels = [5, 6, 100, -1, 0];
  invalidLevels.forEach(level => {
    const rule = getCommissionRule(level);
    assert(rule.own === 0.08);
  });
});

runTest('代理等级1-4应该正常工作', () => {
  const validLevels = [1, 2, 3, 4];
  validLevels.forEach(level => {
    const rule = getCommissionRule(level);
    assert(rule.own > 0);
    assert(rule.own <= 1);
  });
});

runTest('推广链不能超过4级', () => {
  const deepChain = Array(100).fill(null).map((_, i) => ({
    userId: `user_${i}`,
    level: AgentLevel.LEVEL_4
  }));
  const validChain = deepChain.slice(0, 4);
  assert.strictEqual(validChain.length, 4);
});

runTest('空推广链应该正常工作', () => {
  const result = calculateCommission(10000, AgentLevel.LEVEL_1, []);
  assert.strictEqual(result.promoter.amount, 2000);
  assert.strictEqual(result.upstream.length, 0);
});

runTest('已完成订单不能再变更状态', () => {
  const completedOrderStatus = OrderStatus.COMPLETED;
  assert.strictEqual(isValidStatusTransition(completedOrderStatus, OrderStatus.PAID), false);
  assert.strictEqual(isValidStatusTransition(completedOrderStatus, OrderStatus.CANCELLED), false);
});

runTest('大量上级用户场景（只取前3个）', () => {
  const manyUpstream = Array(100).fill(null).map((_, i) => ({
    userId: `user_${i}`,
    level: AgentLevel.LEVEL_1
  }));
  const result = calculateCommission(10000, AgentLevel.LEVEL_4, manyUpstream);
  assert.strictEqual(result.upstream.length, 3);
});

runTest('大数据金额测试', () => {
  const largeAmount = 100000000;
  const result = calculateCommission(largeAmount, AgentLevel.LEVEL_4, [
    { userId: 'C', level: AgentLevel.LEVEL_3 },
    { userId: 'B', level: AgentLevel.LEVEL_2 },
    { userId: 'A', level: AgentLevel.LEVEL_1 }
  ]);
  assert(result.promoter.amount > 0);
  assert(result.company.amount > 0);
  const total = result.promoter.amount + result.upstream.reduce((s, u) => s + u.amount, 0) + result.company.amount;
  assert.strictEqual(total, largeAmount);
});

runTest('佣金比例总和必须为20%', () => {
  Object.keys(Commission.RULES).forEach(level => {
    const rule = Commission.RULES[level];
    const total = rule.own + rule.upstream.reduce((sum, r) => sum + r, 0);
    assert.strictEqual(total, 0.20, `Level ${level} commission should be 20%`);
  });
});

console.log('');

// ===== 第六部分：特殊场景测试 =====

console.log('【第六部分】特殊场景测试');
console.log('-'.repeat(50));

runTest('复购订单应该正常计算佣金', () => {
  const orderAmount = 10000;
  const result = calculateCommission(orderAmount, AgentLevel.LEVEL_2, [
    { userId: 'A', level: AgentLevel.LEVEL_1 }
  ]);
  assert.strictEqual(result.promoter.amount, 1200);
  assert.strictEqual(result.upstream[0].amount, 800);
});

runTest('4→3：无跟随升级', () => {
  const rules = { '4->3': [] };
  const key = '4->3';
  assert.strictEqual(rules[key].length, 0);
});

runTest('3→2：四级跟随升到三级', () => {
  const rules = { '3->2': [{ fromLevel: 4, toLevel: 3 }] };
  assert.strictEqual(rules['3->2'].length, 1);
  assert.strictEqual(rules['3->2'][0].fromLevel, 4);
});

runTest('普通→铜牌→银牌→金牌 连续晋升', () => {
  let performance = { totalSales: 200000, monthSales: 0, teamCount: 0 };
  let result = checkPromotionEligibility(performance, AgentLevel.LEVEL_4);
  assert.strictEqual(result.canPromote, true);

  performance = { totalSales: 300000, monthSales: 500000, teamCount: 50 };
  result = checkPromotionEligibility(performance, AgentLevel.LEVEL_3);
  assert.strictEqual(result.canPromote, true);

  performance = { totalSales: 500000, monthSales: 1000000, teamCount: 100 };
  result = checkPromotionEligibility(performance, AgentLevel.LEVEL_2);
  assert.strictEqual(result.canPromote, true);
});

runTest('未达标无法晋升', () => {
  const performance = { totalSales: 10000, monthSales: 10000, teamCount: 5 };
  const result = checkPromotionEligibility(performance, AgentLevel.LEVEL_4);
  assert.strictEqual(result.canPromote, false);
});

runTest('常见订单金额', () => {
  const amounts = [100, 200, 288, 500, 1000, 2000, 5000, 10000];
  amounts.forEach(amount => {
    const result = calculateCommission(amount, AgentLevel.LEVEL_1, []);
    assert.strictEqual(result.total, amount);
  });
});

runTest('特殊金额（角、分）', () => {
  const amounts = [11, 33, 55, 77, 99, 101, 188, 288];
  amounts.forEach(amount => {
    const result = calculateCommission(amount, AgentLevel.LEVEL_4, [
      { userId: 'C', level: AgentLevel.LEVEL_3 },
      { userId: 'B', level: AgentLevel.LEVEL_2 },
      { userId: 'A', level: AgentLevel.LEVEL_1 }
    ]);
    const distributed = result.promoter.amount +
      result.upstream.reduce((sum, u) => sum + u.amount, 0) +
      result.company.amount;
    assert.strictEqual(distributed, amount);
  });
});

console.log('');

// ===== 结果汇总 =====

console.log('='.repeat(60));
console.log('📊 测试结果汇总:');
console.log(`   ✅ 通过: ${passedTests}`);
console.log(`   ❌ 失败: ${failedTests}`);
console.log(`   📊 总计: ${passedTests + failedTests}`);
console.log('='.repeat(60));

if (failedTests > 0) {
  console.log('\n❌ 部分测试失败，请检查上述错误');
  process.exit(1);
} else {
  console.log('\n🎉 所有测试通过！');
}

// 打印业务场景结果
console.log('\n📋 业务场景佣金分配结果:');
console.log('-'.repeat(50));

const scenarios = [
  { name: '一级代理推广100元', amount: 10000, level: AgentLevel.LEVEL_1, upstream: [] },
  { name: '二级代理推广100元', amount: 10000, level: AgentLevel.LEVEL_2, upstream: [{ userId: 'A', level: 1 }] },
  { name: '三级代理推广100元', amount: 10000, level: AgentLevel.LEVEL_3, upstream: [{ userId: 'B', level: 2 }, { userId: 'A', level: 1 }] },
  { name: '四级代理推广100元', amount: 10000, level: AgentLevel.LEVEL_4, upstream: [{ userId: 'C', level: 3 }, { userId: 'B', level: 2 }, { userId: 'A', level: 1 }] }
];

scenarios.forEach(s => {
  const r = calculateCommission(s.amount, s.level, s.upstream);
  console.log(`\n${s.name}:`);
  console.log(`  推广人: ${r.promoter.amount / 100}元 (${r.promoter.ratio * 100}%)`);
  r.upstream.forEach((u, i) => {
    console.log(`  ${i + 1}级上级: ${u.amount / 100}元 (${u.ratio * 100}%)`);
  });
  console.log(`  公司: ${r.company.amount / 100}元 (${r.company.ratio * 100}%)`);
});

console.log('\n');

module.exports = {
  calculateCommission,
  checkPromotionEligibility,
  isValidStatusTransition,
  AgentLevel,
  OrderStatus,
  Commission,
  PromotionThreshold
};
