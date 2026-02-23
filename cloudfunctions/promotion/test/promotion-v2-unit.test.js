/**
 * 推广体系V2单元测试
 *
 * 测试核心逻辑，不依赖云函数环境
 */

const assert = require('assert');

// 直接导入常量和逻辑，不依赖 wx-server-sdk
const AgentLevel = {
  HEAD_OFFICE: 0,
  LEVEL_1: 1,
  LEVEL_2: 2,
  LEVEL_3: 3,
  LEVEL_4: 4,
  MAX_LEVEL: 4
};

const CommissionV2 = {
  HEAD_OFFICE_SHARE: 0.80,
  LEVEL_1: {
    own: 0.20,
    upstream: []
  },
  LEVEL_2: {
    own: 0.12,
    upstream: [0.08]
  },
  LEVEL_3: {
    own: 0.12,
    upstream: [0.04, 0.04]
  },
  LEVEL_4: {
    own: 0.08,
    upstream: [0.04, 0.04, 0.04]
  }
};

function getCommissionV2Rule(level) {
  const ruleMap = {
    [AgentLevel.LEVEL_1]: CommissionV2.LEVEL_1,
    [AgentLevel.LEVEL_2]: CommissionV2.LEVEL_2,
    [AgentLevel.LEVEL_3]: CommissionV2.LEVEL_3,
    [AgentLevel.LEVEL_4]: CommissionV2.LEVEL_4
  };
  return ruleMap[level] || CommissionV2.LEVEL_4;
}

function getFollowRules(fromLevel, toLevel) {
  const rules = {
    '4->3': [],
    '3->2': [{ fromLevel: 4, toLevel: 3 }],
    '2->1': [{ fromLevel: 3, toLevel: 2 }, { fromLevel: 4, toLevel: 3 }]
  };

  const key = `${fromLevel}->${toLevel}`;
  return rules[key] || [];
}

function calculateExpectedCommission(orderAmount, promoterLevel) {
  const rule = getCommissionV2Rule(promoterLevel);
  const results = [];

  results.push({
    role: 'promoter',
    amount: Math.floor(orderAmount * rule.own),
    ratio: rule.own
  });

  rule.upstream.forEach((ratio, index) => {
    results.push({
      role: `upstream_${index + 1}`,
      amount: Math.floor(orderAmount * ratio),
      ratio: ratio
    });
  });

  return results;
}

// ==================== 测试套件 ====================

let testsPassed = 0;
let testsFailed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    testsPassed++;
  } catch (error) {
    console.log(`  ✗ ${name}`);
    console.log(`    Error: ${error.message}`);
    testsFailed++;
  }
}

function describe(name, fn) {
  console.log(`\n${name}`);
  fn();
}

// ==================== 佣金规则测试 ====================

describe('佣金规则测试', () => {

  test('一级代理推广：自己拿20%', () => {
    const orderAmount = 10000;
    const promoterLevel = AgentLevel.LEVEL_1;
    const expected = calculateExpectedCommission(orderAmount, promoterLevel);

    assert.strictEqual(expected.length, 1, '应该只有1个受益人');
    assert.strictEqual(expected[0].role, 'promoter');
    assert.strictEqual(expected[0].amount, 2000, '推广人应该拿20元');
    assert.strictEqual(expected[0].ratio, 0.20);
  });

  test('二级代理推广：自己拿12%，一级代理拿8%', () => {
    const orderAmount = 10000;
    const promoterLevel = AgentLevel.LEVEL_2;
    const expected = calculateExpectedCommission(orderAmount, promoterLevel);

    assert.strictEqual(expected.length, 2, '应该有2个受益人');
    assert.strictEqual(expected[0].amount, 1200, '推广人应该拿12元');
    assert.strictEqual(expected[1].amount, 800, '上级应该拿8元');
  });

  test('三级代理推广：自己拿12%，二级代理拿4%，一级代理拿4%', () => {
    const orderAmount = 10000;
    const promoterLevel = AgentLevel.LEVEL_3;
    const expected = calculateExpectedCommission(orderAmount, promoterLevel);

    assert.strictEqual(expected.length, 3, '应该有3个受益人');
    assert.strictEqual(expected[0].amount, 1200, '推广人应该拿12元');
    assert.strictEqual(expected[1].amount, 400, '二级上级应该拿4元');
    assert.strictEqual(expected[2].amount, 400, '一级上级应该拿4元');
  });

  test('四级代理推广：自己拿8%，三级/二级/一级各拿4%', () => {
    const orderAmount = 10000;
    const promoterLevel = AgentLevel.LEVEL_4;
    const expected = calculateExpectedCommission(orderAmount, promoterLevel);

    assert.strictEqual(expected.length, 4, '应该有4个受益人');
    assert.strictEqual(expected[0].amount, 800, '推广人应该拿8元');
    assert.strictEqual(expected[1].amount, 400, '三级上级应该拿4元');
    assert.strictEqual(expected[2].amount, 400, '二级上级应该拿4元');
    assert.strictEqual(expected[3].amount, 400, '一级上级应该拿4元');
  });

  test('佣金总比例为20%', () => {
    const levels = [1, 2, 3, 4];
    levels.forEach(level => {
      const rule = getCommissionV2Rule(level);
      const totalRatio = rule.own + rule.upstream.reduce((sum, r) => sum + r, 0);
      assert.ok(Math.abs(totalRatio - 0.20) < 0.0001,
        `等级${level}的佣金总比例应该是20%，实际是${(totalRatio * 100).toFixed(1)}%`);
    });
  });
});

// ==================== 跟随升级规则测试 ====================

describe('跟随升级规则测试', () => {

  test('4→3升级：无跟随', () => {
    const rules = getFollowRules(4, 3);
    assert.strictEqual(rules.length, 0, '4→3升级不应该有跟随');
  });

  test('3→2升级：4级跟随升到3级', () => {
    const rules = getFollowRules(3, 2);
    assert.strictEqual(rules.length, 1, '3→2升级应该有1个跟随规则');
    assert.deepStrictEqual(rules[0], { fromLevel: 4, toLevel: 3 });
  });

  test('2→1升级：3级升到2级，4级升到3级', () => {
    const rules = getFollowRules(2, 1);
    assert.strictEqual(rules.length, 2, '2→1升级应该有2个跟随规则');
    assert.deepStrictEqual(rules[0], { fromLevel: 3, toLevel: 2 });
    assert.deepStrictEqual(rules[1], { fromLevel: 4, toLevel: 3 });
  });

  test('未知升级路径：返回空数组', () => {
    const rules = getFollowRules(1, 4);
    assert.deepStrictEqual(rules, [], '未知升级路径应该返回空数组');
  });
});

// ==================== 场景测试 ====================

describe('佣金分配场景测试', () => {

  test('场景1：一级代理A推广100元订单 - A拿20元', () => {
    const orderAmount = 10000;
    const expected = calculateExpectedCommission(orderAmount, AgentLevel.LEVEL_1);

    assert.strictEqual(expected[0].amount, 2000);
    assert.strictEqual(expected.length, 1);
  });

  test('场景2：二级代理B推广100元订单 - B拿12元，A拿8元', () => {
    const orderAmount = 10000;
    const expected = calculateExpectedCommission(orderAmount, AgentLevel.LEVEL_2);

    assert.strictEqual(expected[0].amount, 1200);
    assert.strictEqual(expected[1].amount, 800);
    assert.strictEqual(expected.length, 2);
  });

  test('场景3：三级代理C推广100元订单 - C拿12元，B拿4元，A拿4元', () => {
    const orderAmount = 10000;
    const expected = calculateExpectedCommission(orderAmount, AgentLevel.LEVEL_3);

    assert.strictEqual(expected[0].amount, 1200);
    assert.strictEqual(expected[1].amount, 400);
    assert.strictEqual(expected[2].amount, 400);
    assert.strictEqual(expected.length, 3);
  });

  test('场景4：四级代理D推广100元订单 - D拿8元，C/B/A各拿4元', () => {
    const orderAmount = 10000;
    const expected = calculateExpectedCommission(orderAmount, AgentLevel.LEVEL_4);

    assert.strictEqual(expected[0].amount, 800);
    assert.strictEqual(expected[1].amount, 400);
    assert.strictEqual(expected[2].amount, 400);
    assert.strictEqual(expected[3].amount, 400);
    assert.strictEqual(expected.length, 4);
  });

  test('场景：288元订单，四级代理推广', () => {
    const orderAmount = 28800;
    const expected = calculateExpectedCommission(orderAmount, AgentLevel.LEVEL_4);

    assert.strictEqual(expected[0].amount, 2304, '推广人应该拿23.04元');
    assert.strictEqual(expected[1].amount, 1152);
    assert.strictEqual(expected[2].amount, 1152);
    assert.strictEqual(expected[3].amount, 1152);
  });
});

// ==================== 边界情况测试 ====================

describe('边界情况测试', () => {

  test('订单金额为0：无佣金', () => {
    const expected = calculateExpectedCommission(0, AgentLevel.LEVEL_1);
    assert.strictEqual(expected[0].amount, 0);
  });

  test('订单金额为1分：最小佣金', () => {
    const expected = calculateExpectedCommission(1, AgentLevel.LEVEL_1);
    assert.strictEqual(expected[0].amount, 0, '1分订单的20%应该是0分（向下取整）');
  });

  test('订单金额为5分：四级代理', () => {
    const expected = calculateExpectedCommission(5, AgentLevel.LEVEL_4);
    assert.strictEqual(expected[0].amount, 0, '5分订单的8%应该是0分（向下取整）');
  });

  test('大额订单：10000元', () => {
    const expected = calculateExpectedCommission(1000000, AgentLevel.LEVEL_1);
    assert.strictEqual(expected[0].amount, 200000, '10000元的20%应该是2000元');
  });

  test('佣金精度：向下取整', () => {
    const rule = getCommissionV2Rule(AgentLevel.LEVEL_4);
    const commission = Math.floor(101 * rule.own);
    assert.strictEqual(commission, 8, '1.01元的8%应该是0.08元（向下取整）');
  });
});

// ==================== 运行测试 ====================

console.log('========================================');
console.log('推广体系V2 - 单元测试');
console.log('========================================');

// 运行所有测试
console.log('\n开始测试...\n');

// 测试完成
console.log('\n========================================');
console.log('测试结果');
console.log('========================================');
console.log(`通过: ${testsPassed}`);
console.log(`失败: ${testsFailed}`);
console.log(`总计: ${testsPassed + testsFailed}`);
console.log('========================================\n');

if (testsFailed > 0) {
  console.log('❌ 测试失败！');
  process.exit(1);
} else {
  console.log('✅ 所有测试通过！');
  process.exit(0);
}
