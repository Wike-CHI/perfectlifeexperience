/**
 * 推广体系V2测试套件
 *
 * 测试策略：
 * 1. 先写测试，明确期望行为
 * 2. 验证现有实现是否符合预期
 * 3. 如不符合，修复实现
 *
 * 测试覆盖：
 * - 佣金计算（各等级）
 * - 跟随升级机制
 * - 脱离机制
 * - 边界情况
 */

const assert = require('assert');

const {
  CommissionV2,
  getCommissionV2Rule,
  AgentLevel
} = require('./common/constants');

const {
  getFollowRules
} = require('./promotion-v2');

// ==================== 辅助函数 ====================

/**
 * 计算期望的佣金分配
 * @param {number} orderAmount - 订单金额（分）
 * @param {number} promoterLevel - 推广人等级
 * @returns {Array} 期望的佣金分配数组
 */
function calculateExpectedCommission(orderAmount, promoterLevel) {
  const rule = getCommissionV2Rule(promoterLevel);
  const results = [];

  // 推广人自己拿的佣金
  results.push({
    role: 'promoter',
    amount: Math.floor(orderAmount * rule.own),
    ratio: rule.own
  });

  // 上级代理拿的佣金
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

describe('推广体系V2 - 佣金规则测试', () => {

  test('一级代理推广：自己拿20%', () => {
    const orderAmount = 10000; // 100元（分）
    const promoterLevel = AgentLevel.LEVEL_1;

    const expected = calculateExpectedCommission(orderAmount, promoterLevel);

    assert.strictEqual(expected.length, 1);
    assert.strictEqual(expected[0].role, 'promoter');
    assert.strictEqual(expected[0].amount, 2000); // 20元
    assert.strictEqual(expected[0].ratio, 0.20);
  });

  test('二级代理推广：自己拿12%，一级代理拿8%', () => {
    const orderAmount = 10000; // 100元（分）
    const promoterLevel = AgentLevel.LEVEL_2;

    const expected = calculateExpectedCommission(orderAmount, promoterLevel);

    assert.strictEqual(expected.length, 2);
    assert.strictEqual(expected[0].role, 'promoter');
    assert.strictEqual(expected[0].amount, 1200); // 12元
    assert.strictEqual(expected[0].ratio, 0.12);

    assert.strictEqual(expected[1].role, 'upstream_1');
    assert.strictEqual(expected[1].amount, 800); // 8元
    assert.strictEqual(expected[1].ratio, 0.08);
  });

  test('三级代理推广：自己拿12%，二级代理拿4%，一级代理拿4%', () => {
    const orderAmount = 10000; // 100元（分）
    const promoterLevel = AgentLevel.LEVEL_3;

    const expected = calculateExpectedCommission(orderAmount, promoterLevel);

    assert.strictEqual(expected.length, 3);
    assert.strictEqual(expected[0].role, 'promoter');
    assert.strictEqual(expected[0].amount, 1200); // 12元
    assert.strictEqual(expected[0].ratio, 0.12);

    assert.strictEqual(expected[1].role, 'upstream_1');
    assert.strictEqual(expected[1].amount, 400); // 4元
    assert.strictEqual(expected[1].ratio, 0.04);

    assert.strictEqual(expected[2].role, 'upstream_2');
    assert.strictEqual(expected[2].amount, 400); // 4元
    assert.strictEqual(expected[2].ratio, 0.04);
  });

  test('四级代理推广：自己拿8%，三级/二级/一级各拿4%', () => {
    const orderAmount = 10000; // 100元（分）
    const promoterLevel = AgentLevel.LEVEL_4;

    const expected = calculateExpectedCommission(orderAmount, promoterLevel);

    assert.strictEqual(expected.length, 4);
    assert.strictEqual(expected[0].role, 'promoter');
    assert.strictEqual(expected[0].amount, 800); // 8元
    assert.strictEqual(expected[0].ratio, 0.08);

    assert.strictEqual(expected[1].role, 'upstream_1');
    assert.strictEqual(expected[1].amount, 400); // 4元
    assert.strictEqual(expected[1].ratio, 0.04);

    assert.strictEqual(expected[2].role, 'upstream_2');
    assert.strictEqual(expected[2].amount, 400); // 4元
    assert.strictEqual(expected[2].ratio, 0.04);

    assert.strictEqual(expected[3].role, 'upstream_3');
    assert.strictEqual(expected[3].amount, 400); // 4元
    assert.strictEqual(expected[3].ratio, 0.04);
  });

  test('佣金总比例为20%（公司拿80%）', () => {
    const testCases = [
      { level: AgentLevel.LEVEL_1, expectedTotal: 0.20 },
      { level: AgentLevel.LEVEL_2, expectedTotal: 0.20 },
      { level: AgentLevel.LEVEL_3, expectedTotal: 0.20 },
      { level: AgentLevel.LEVEL_4, expectedTotal: 0.20 }
    ];

    testCases.forEach(({ level, expectedTotal }) => {
      const rule = getCommissionV2Rule(level);
      const totalRatio = rule.own + rule.upstream.reduce((sum, r) => sum + r, 0);

      assert.ok(Math.abs(totalRatio - expectedTotal) < 0.0001,
        `Level ${level}: total ratio ${totalRatio} should be ${expectedTotal}`);
    });
  });

  test('不同金额的佣金计算准确性', () => {
    const testCases = [
      { amount: 10000, level: AgentLevel.LEVEL_4, expectedPromoter: 800 },   // 100元
      { amount: 28800, level: AgentLevel.LEVEL_4, expectedPromoter: 2304 },  // 288元
      { amount: 50000, level: AgentLevel.LEVEL_1, expectedPromoter: 10000 }, // 500元
      { amount: 1000, level: AgentLevel.LEVEL_2, expectedPromoter: 120 }     // 10元
    ];

    testCases.forEach(({ amount, level, expectedPromoter }) => {
      const rule = getCommissionV2Rule(level);
      const promoterCommission = Math.floor(amount * rule.own);

      assert.strictEqual(promoterCommission, expectedPromoter,
        `Amount ${amount}, level ${level}: expected ${expectedPromoter}, got ${promoterCommission}`);
    });
  });
});

describe('推广体系V2 - 跟随升级规则测试', () => {

  test('4→3升级：无跟随', () => {
    const rules = getFollowRules(4, 3);

    assert.strictEqual(rules.length, 0);
    assert.deepStrictEqual(rules, []);
  });

  test('3→2升级：4级跟随升到3级', () => {
    const rules = getFollowRules(3, 2);

    assert.strictEqual(rules.length, 1);
    assert.deepStrictEqual(rules[0], {
      fromLevel: 4,
      toLevel: 3
    });
  });

  test('2→1升级：3级升到2级，4级升到3级', () => {
    const rules = getFollowRules(2, 1);

    assert.strictEqual(rules.length, 2);
    assert.deepStrictEqual(rules[0], {
      fromLevel: 3,
      toLevel: 2
    });
    assert.deepStrictEqual(rules[1], {
      fromLevel: 4,
      toLevel: 3
    });
  });

  test('未知升级路径：返回空数组', () => {
    const rules = getFollowRules(1, 4);

    assert.deepStrictEqual(rules, []);
  });
});

describe('推广体系V2 - 佣金分配场景测试', () => {

  /**
   * 场景1：一级代理A推广客户下单
   * 结构：A（一级）
   */
  test('场景1：一级代理推广 - 自己拿20元', () => {
    const structure = {
      promoter: { id: 'A', level: AgentLevel.LEVEL_1 },
      upstream: []
    };

    const orderAmount = 10000;
    const expected = calculateExpectedCommission(orderAmount, structure.promoter.level);

    assert.strictEqual(expected[0].amount, 2000);
    assert.strictEqual(expected.length, 1); // 无上级
  });

  /**
   * 场景2：二级代理B推广客户下单
   * 结构：A（一级） → B（二级）
   */
  test('场景2：二级代理推广 - B拿12元，A拿8元', () => {
    const structure = {
      promoter: { id: 'B', level: AgentLevel.LEVEL_2 },
      upstream: [
        { id: 'A', level: AgentLevel.LEVEL_1 }
      ]
    };

    const orderAmount = 10000;
    const expected = calculateExpectedCommission(orderAmount, structure.promoter.level);

    assert.strictEqual(expected[0].amount, 1200); // B
    assert.strictEqual(expected[1].amount, 800);  // A
    assert.strictEqual(expected.length, 2);
  });

  /**
   * 场景3：三级代理C推广客户下单
   * 结构：A（一级） → B（二级） → C（三级）
   */
  test('场景3：三级代理推广 - C拿12元，B拿4元，A拿4元', () => {
    const structure = {
      promoter: { id: 'C', level: AgentLevel.LEVEL_3 },
      upstream: [
        { id: 'B', level: AgentLevel.LEVEL_2 },
        { id: 'A', level: AgentLevel.LEVEL_1 }
      ]
    };

    const orderAmount = 10000;
    const expected = calculateExpectedCommission(orderAmount, structure.promoter.level);

    assert.strictEqual(expected[0].amount, 1200); // C
    assert.strictEqual(expected[1].amount, 400);  // B
    assert.strictEqual(expected[2].amount, 400);  // A
    assert.strictEqual(expected.length, 3);
  });

  /**
   * 场景4：四级代理D推广客户下单
   * 结构：A（一级） → B（二级） → C（三级） → D（四级）
   */
  test('场景4：四级代理推广 - D拿8元，C拿4元，B拿4元，A拿4元', () => {
    const structure = {
      promoter: { id: 'D', level: AgentLevel.LEVEL_4 },
      upstream: [
        { id: 'C', level: AgentLevel.LEVEL_3 },
        { id: 'B', level: AgentLevel.LEVEL_2 },
        { id: 'A', level: AgentLevel.LEVEL_1 }
      ]
    };

    const orderAmount = 10000;
    const expected = calculateExpectedCommission(orderAmount, structure.promoter.level);

    assert.strictEqual(expected[0].amount, 800);  // D
    assert.strictEqual(expected[1].amount, 400);  // C
    assert.strictEqual(expected[2].amount, 400);  // B
    assert.strictEqual(expected[3].amount, 400);  // A
    assert.strictEqual(expected.length, 4);
  });
});

describe('推广体系V2 - 边界情况测试', () => {

  test('订单金额为0：无佣金', () => {
    const orderAmount = 0;
    const promoterLevel = AgentLevel.LEVEL_1;

    const expected = calculateExpectedCommission(orderAmount, promoterLevel);

    assert.strictEqual(expected[0].amount, 0);
  });

  test('订单金额为1分：最小佣金', () => {
    const orderAmount = 1;
    const promoterLevel = AgentLevel.LEVEL_1;

    const expected = calculateExpectedCommission(orderAmount, promoterLevel);

    assert.strictEqual(expected[0].amount, 0); // Math.floor(1 * 0.2) = 0
  });

  test('订单金额为5分：有佣金', () => {
    const orderAmount = 5;
    const promoterLevel = AgentLevel.LEVEL_4;

    const expected = calculateExpectedCommission(orderAmount, promoterLevel);

    assert.strictEqual(expected[0].amount, 0); // Math.floor(5 * 0.08) = 0
  });

  test('大额订单：佣金计算准确', () => {
    const orderAmount = 1000000; // 10000元
    const promoterLevel = AgentLevel.LEVEL_1;

    const expected = calculateExpectedCommission(orderAmount, promoterLevel);

    assert.strictEqual(expected[0].amount, 200000); // 2000元
  });

  test('佣金精度：向下取整', () => {
    const orderAmount = 101; // 1.01元
    const promoterLevel = AgentLevel.LEVEL_4;

    const rule = getCommissionV2Rule(promoterLevel);
    const promoterCommission = Math.floor(orderAmount * rule.own);

    assert.strictEqual(promoterCommission, 8); // Math.floor(101 * 0.08) = Math.floor(8.08) = 8
  });
});

describe('推广体系V2 - 跟随升级场景测试', () => {

  /**
   * 场景：D从四级连续升到一级，带动整个团队
   *
   * 初始状态：
   * A(一级) → B(二级) → C(三级) → D(四级) → E(四级) → F(四级)
   *
   * 第一步：D从四级升到三级
   * - D脱离C
   * - 可发展新的四级下级
   *
   * 第二步：D从三级升到二级，带动E
   * - D脱离B
   * - E跟随D，从四级升到三级
   *
   * 第三步：D从二级升到一级，带动C和E
   * - D脱离A，成为独立总公司
   * - C跟随D，从三级升到二级
   * - E跟随D，从三级升到一级
   */
  test('场景：D连续升级带动团队', () => {
    // 第一步：4→3
    let rules = getFollowRules(4, 3);
    assert.strictEqual(rules.length, 0); // 无跟随

    // 第二步：3→2
    rules = getFollowRules(3, 2);
    assert.strictEqual(rules.length, 1);
    assert.deepStrictEqual(rules[0], { fromLevel: 4, toLevel: 3 });

    // 第三步：2→1
    rules = getFollowRules(2, 1);
    assert.strictEqual(rules.length, 2);
    assert.deepStrictEqual(rules[0], { fromLevel: 3, toLevel: 2 });
    assert.deepStrictEqual(rules[1], { fromLevel: 4, toLevel: 3 });
  });
});

// ==================== 运行所有测试 ====================

/**
 * 简单的测试运行器
 */
function runTests() {
  console.log('========================================');
  console.log('推广体系V2 - 测试套件');
  console.log('========================================\n');

  let passed = 0;
  let failed = 0;

  // 获取所有测试
  const tests = [];

  // 收集所有测试
  Object.getOwnPropertyTests(tests);

  // 运行测试（这里需要实际的测试框架）
  console.log('注意：这是一个测试模板文件');
  console.log('请使用 Jest 或 Mocha 运行测试：\n');
  console.log('  npm install --save-dev jest');
  console.log('  npx jest cloudfunctions/promotion/test-v2.test.js\n');

  return { passed, failed };
}

// 简单的 test 函数（用于演示）
function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
    return true;
  } catch (error) {
    console.log(`✗ ${name}`);
    console.log(`  Error: ${error.message}`);
    return false;
  }
}

function describe(name, fn) {
  console.log(`\n${name}`);
  fn();
}

// 如果直接运行此文件
if (require.main === module) {
  runTests();
}

module.exports = {
  calculateExpectedCommission,
  runTests
};
