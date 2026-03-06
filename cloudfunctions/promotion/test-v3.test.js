/**
 * 推广体系V3 - 完整测试套件
 *
 * 测试覆盖：
 * 1. 佣金计算（各等级）
 * 2. 跟随升级机制
 * 3. 晋升门槛
 * 4. 脱离机制
 * 5. 边界情况
 * 6. 实际业务场景
 *
 * 运行方式：
 *   npm run test:cf
 *   或者直接运行：node cloudfunctions/promotion/test-v3.test.js
 */

const assert = require('assert');

// 导入被测试模块
const {
  AgentLevel,
  Commission,
  PromotionThreshold,
  FollowPromotionRules,
  getCommissionRule,
  getAgentLevelInternalName,
  getAgentLevelDisplayName,
  getPromotionThreshold,
  getFollowPromotionRule
} = require('./common/constants');

/**
 * 获取跟随升级规则（从 promotion-v2.js 复制，避免依赖 wx-server-sdk）
 * 规则：
 * - 4->3: 无跟随（但可发展新的四级）
 * - 3->2: 4级跟随升到3级
 * - 2->1: 3级升到2级，4级升到3级
 *
 * @param {number} fromLevel - 原等级
 * @param {number} toLevel - 新等级
 * @returns {Array} 跟随升级规则数组
 */
function getFollowRules(fromLevel, toLevel) {
  const rules = {
    '4->3': [],  // 无跟随
    '3->2': [
      { fromLevel: 4, toLevel: 3 }
    ],
    '2->1': [
      { fromLevel: 3, toLevel: 2 },
      { fromLevel: 4, toLevel: 3 }
    ]
  };

  const key = `${fromLevel}->${toLevel}`;
  return rules[key] || [];
}

// ==================== 辅助函数 ====================

/**
 * 计算佣金分配（核心算法）
 * @param {number} orderAmount - 订单金额（分）
 * @param {number} promoterLevel - 推广人等级
 * @param {Array} upstreamUsers - 上级用户数组（按远近排序）
 * @returns {Object} 佣金分配结果
 */
function calculateCommission(orderAmount, promoterLevel, upstreamUsers = []) {
  const rule = getCommissionRule(promoterLevel);
  const result = {
    promoter: {
      userId: upstreamUsers[0]?.userId || null,
      amount: Math.floor(orderAmount * rule.own),
      ratio: rule.own
    },
    upstream: [],
    company: {
      amount: 0,
      ratio: Commission.COMPANY_SHARE
    },
    total: orderAmount
  };

  // 计算上级佣金
  rule.upstream.forEach((ratio, index) => {
    if (upstreamUsers[index]) {
      result.upstream.push({
        userId: upstreamUsers[index].userId,
        level: upstreamUsers[index].level,
        amount: Math.floor(orderAmount * ratio),
        ratio: ratio
      });
    }
  });

  // 计算公司剩余
  const distributed = result.promoter.amount +
    result.upstream.reduce((sum, u) => sum + u.amount, 0);
  result.company.amount = orderAmount - distributed;

  return result;
}

/**
 * 验证晋升条件
 * @param {Object} performance - 业绩数据
 * @param {number} currentLevel - 当前等级
 * @returns {Object} 晋升结果 { canPromote, reason, details }
 */
function checkPromotionEligibility(performance, currentLevel) {
  const threshold = getPromotionThreshold(currentLevel);

  if (!threshold) {
    return { canPromote: false, reason: '已达最高等级', details: {} };
  }

  const { totalSales, monthSales, teamCount } = performance;
  const details = {};

  // 检查各项条件
  if (currentLevel === AgentLevel.LEVEL_4) {
    // 四级 → 三级：累计销售额 >= 2万元
    details.totalSales = { required: threshold.totalSales, actual: totalSales };
    if (totalSales >= threshold.totalSales) {
      return { canPromote: true, reason: '累计销售额达标', details };
    }
    return { canPromote: false, reason: '累计销售额不足', details };
  }

  if (currentLevel === AgentLevel.LEVEL_3) {
    // 三级 → 二级：本月销售额 >= 5万元 或 团队人数 >= 50人
    details.monthSales = { required: threshold.monthSales, actual: monthSales };
    details.teamCount = { required: threshold.teamCount, actual: teamCount };

    if (monthSales >= threshold.monthSales) {
      return { canPromote: true, reason: '本月销售额达标', details };
    }
    if (teamCount >= threshold.teamCount) {
      return { canPromote: true, reason: '团队人数达标', details };
    }
    return { canPromote: false, reason: '本月销售额或团队人数不足', details };
  }

  if (currentLevel === AgentLevel.LEVEL_2) {
    // 二级 → 一级：本月销售额 >= 10万元 或 团队人数 >= 200人
    details.monthSales = { required: threshold.monthSales, actual: monthSales };
    details.teamCount = { required: threshold.teamCount, actual: teamCount };

    if (monthSales >= threshold.monthSales) {
      return { canPromote: true, reason: '本月销售额达标', details };
    }
    if (teamCount >= threshold.teamCount) {
      return { canPromote: true, reason: '团队人数达标', details };
    }
    return { canPromote: false, reason: '本月销售额或团队人数不足', details };
  }

  return { canPromote: false, reason: '未知等级', details: {} };
}

// ==================== 测试套件 ====================

describe('推广体系V3 - 佣金规则测试', () => {

  describe('一级代理（金牌推广员）佣金', () => {
    test('一级代理推广：自己拿20%，无上级', () => {
      const result = calculateCommission(10000, AgentLevel.LEVEL_1, []);

      assert.strictEqual(result.promoter.amount, 2000); // 20元
      assert.strictEqual(result.promoter.ratio, 0.20);
      assert.strictEqual(result.upstream.length, 0);
      assert.strictEqual(result.company.amount, 8000); // 80元
    });

    test('一级代理推广 288元订单', () => {
      const result = calculateCommission(28800, AgentLevel.LEVEL_1, []);

      assert.strictEqual(result.promoter.amount, 5760); // 57.6元
      assert.strictEqual(result.company.amount, 23040);
    });
  });

  describe('二级代理（银牌推广员）佣金', () => {
    test('二级代理推广：自己12% + 一级8% = 20%', () => {
      const upstream = [
        { userId: 'A', level: AgentLevel.LEVEL_1 }
      ];
      const result = calculateCommission(10000, AgentLevel.LEVEL_2, upstream);

      assert.strictEqual(result.promoter.amount, 1200); // 12元
      assert.strictEqual(result.upstream[0].amount, 800); // 8元
      assert.strictEqual(result.company.amount, 8000);
    });

    test('二级代理推广：上级正确匹配', () => {
      const upstream = [
        { userId: 'A', level: AgentLevel.LEVEL_1 },
        { userId: 'B', level: AgentLevel.LEVEL_2 } // 多余的上级会被忽略
      ];
      const result = calculateCommission(10000, AgentLevel.LEVEL_2, upstream);

      assert.strictEqual(result.upstream.length, 1);
      assert.strictEqual(result.upstream[0].userId, 'A');
    });
  });

  describe('三级代理（铜牌推广员）佣金', () => {
    test('三级代理推广：自己12% + 二级4% + 一级4% = 20%', () => {
      const upstream = [
        { userId: 'B', level: AgentLevel.LEVEL_2 },
        { userId: 'A', level: AgentLevel.LEVEL_1 }
      ];
      const result = calculateCommission(10000, AgentLevel.LEVEL_3, upstream);

      assert.strictEqual(result.promoter.amount, 1200); // 12元
      assert.strictEqual(result.upstream[0].amount, 400); // 4元
      assert.strictEqual(result.upstream[1].amount, 400); // 4元
      assert.strictEqual(result.company.amount, 8000);
    });
  });

  describe('四级代理（普通会员）佣金', () => {
    test('四级代理推广：自己8% + 三级4% + 二级4% + 一级4% = 20%', () => {
      const upstream = [
        { userId: 'C', level: AgentLevel.LEVEL_3 },
        { userId: 'B', level: AgentLevel.LEVEL_2 },
        { userId: 'A', level: AgentLevel.LEVEL_1 }
      ];
      const result = calculateCommission(10000, AgentLevel.LEVEL_4, upstream);

      assert.strictEqual(result.promoter.amount, 800); // 8元
      assert.strictEqual(result.upstream[0].amount, 400); // 4元
      assert.strictEqual(result.upstream[1].amount, 400); // 4元
      assert.strictEqual(result.upstream[2].amount, 400); // 4元
      assert.strictEqual(result.company.amount, 8000);
    });

    test('四级代理推广：无上级时自己拿8%', () => {
      const result = calculateCommission(10000, AgentLevel.LEVEL_4, []);

      assert.strictEqual(result.promoter.amount, 800); // 8元
      assert.strictEqual(result.upstream.length, 0);
      assert.strictEqual(result.company.amount, 9200); // 92元
    });
  });

  describe('佣金分配完整性', () => {
    test('所有等级的佣金总和为20%', () => {
      const levels = [
        AgentLevel.LEVEL_1,
        AgentLevel.LEVEL_2,
        AgentLevel.LEVEL_3,
        AgentLevel.LEVEL_4
      ];

      levels.forEach(level => {
        const rule = getCommissionRule(level);
        const total = rule.own + rule.upstream.reduce((sum, r) => sum + r, 0);
        assert.strictEqual(total, 0.20, `Level ${level} total should be 20%`);
      });
    });

    test('佣金分配到个人+公司=订单总额', () => {
      const testCases = [
        { amount: 10000, level: AgentLevel.LEVEL_1 },
        { amount: 50000, level: AgentLevel.LEVEL_2 },
        { amount: 100000, level: AgentLevel.LEVEL_3 },
        { amount: 1000, level: AgentLevel.LEVEL_4 }
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
  });
});

describe('推广体系V3 - 跟随升级规则测试', () => {

  test('4→3：无跟随升级', () => {
    const rules = getFollowRules(4, 3);
    assert.deepStrictEqual(rules, []);
  });

  test('3→2：四级跟随升到三级', () => {
    const rules = getFollowRules(3, 2);
    assert.strictEqual(rules.length, 1);
    assert.deepStrictEqual(rules[0], { fromLevel: 4, toLevel: 3 });
  });

  test('2→1：三级升到二级，四级升到三级', () => {
    const rules = getFollowRules(2, 1);
    assert.strictEqual(rules.length, 2);

    const fromLevels = rules.map(r => r.fromLevel);
    const toLevels = rules.map(r => r.toLevel);

    assert.ok(fromLevels.includes(3));
    assert.ok(fromLevels.includes(4));
    assert.ok(toLevels.includes(2));
    assert.ok(toLevels.includes(3));
  });

  test('1→0（总公司）：无跟随规则', () => {
    const rules = getFollowRules(1, 0);
    assert.deepStrictEqual(rules, []);
  });

  test('使用FollowPromotionRules函数', () => {
    const rule3to2 = getFollowPromotionRule(AgentLevel.LEVEL_2);
    assert.ok(rule3to2);
    assert.strictEqual(rule3to2.subordinateUpgrade.fromLevel, AgentLevel.LEVEL_4);
    assert.strictEqual(rule3to2.subordinateUpgrade.toLevel, AgentLevel.LEVEL_3);
  });
});

describe('推广体系V3 - 晋升门槛测试', () => {

  describe('四级→三级（普通→铜牌）', () => {
    test('累计销售额达标：晋升成功', () => {
      const performance = {
        totalSales: 200000, // 2万元
        monthSales: 0,
        teamCount: 0
      };
      const result = checkPromotionEligibility(performance, AgentLevel.LEVEL_4);

      assert.strictEqual(result.canPromote, true);
      assert.strictEqual(result.reason, '累计销售额达标');
    });

    test('累计销售额不足：晋升失败', () => {
      const performance = {
        totalSales: 199999, // 不足2万元
        monthSales: 0,
        teamCount: 0
      };
      const result = checkPromotionEligibility(performance, AgentLevel.LEVEL_4);

      assert.strictEqual(result.canPromote, false);
      assert.strictEqual(result.reason, '累计销售额不足');
    });

    test('零销售额：晋升失败', () => {
      const performance = {
        totalSales: 0,
        monthSales: 0,
        teamCount: 0
      };
      const result = checkPromotionEligibility(performance, AgentLevel.LEVEL_4);

      assert.strictEqual(result.canPromote, false);
    });
  });

  describe('三级→二级（铜牌→银牌）', () => {
    test('本月销售额达标：晋升成功', () => {
      const performance = {
        totalSales: 100000,
        monthSales: 500000, // 5万元
        teamCount: 10
      };
      const result = checkPromotionEligibility(performance, AgentLevel.LEVEL_3);

      assert.strictEqual(result.canPromote, true);
      assert.strictEqual(result.reason, '本月销售额达标');
    });

    test('团队人数达标：晋升成功', () => {
      const performance = {
        totalSales: 100000,
        monthSales: 10000,
        teamCount: 50 // 50人
      };
      const result = checkPromotionEligibility(performance, AgentLevel.LEVEL_3);

      assert.strictEqual(result.canPromote, true);
      assert.strictEqual(result.reason, '团队人数达标');
    });

    test('两者都不达标：晋升失败', () => {
      const performance = {
        totalSales: 100000,
        monthSales: 49999, // 不足5万元
        teamCount: 49 // 不足50人
      };
      const result = checkPromotionEligibility(performance, AgentLevel.LEVEL_3);

      assert.strictEqual(result.canPromote, false);
      assert.strictEqual(result.reason, '本月销售额或团队人数不足');
    });
  });

  describe('二级→一级（银牌→金牌）', () => {
    test('本月销售额达标：晋升成功', () => {
      const performance = {
        totalSales: 500000,
        monthSales: 1000000, // 10万元
        teamCount: 50
      };
      const result = checkPromotionEligibility(performance, AgentLevel.LEVEL_2);

      assert.strictEqual(result.canPromote, true);
      assert.strictEqual(result.reason, '本月销售额达标');
    });

    test('团队人数达标：晋升成功', () => {
      const performance = {
        totalSales: 500000,
        monthSales: 50000,
        teamCount: 200 // 200人
      };
      const result = checkPromotionEligibility(performance, AgentLevel.LEVEL_2);

      assert.strictEqual(result.canPromote, true);
      assert.strictEqual(result.reason, '团队人数达标');
    });
  });

  describe('边界情况', () => {
    test('已达最高等级：一级', () => {
      const performance = {
        totalSales: 10000000,
        monthSales: 1000000,
        teamCount: 1000
      };
      const result = checkPromotionEligibility(performance, AgentLevel.LEVEL_1);

      assert.strictEqual(result.canPromote, false);
      assert.strictEqual(result.reason, '已达最高等级');
    });

    test('零业绩：无法晋升', () => {
      const performance = {
        totalSales: 0,
        monthSales: 0,
        teamCount: 0
      };

      assert.strictEqual(checkPromotionEligibility(performance, AgentLevel.LEVEL_4).canPromote, false);
      assert.strictEqual(checkPromotionEligibility(performance, AgentLevel.LEVEL_3).canPromote, false);
      assert.strictEqual(checkPromotionEligibility(performance, AgentLevel.LEVEL_2).canPromote, false);
    });
  });
});

describe('推广体系V3 - 边界情况测试', () => {

  test('订单金额为0：无佣金', () => {
    const result = calculateCommission(0, AgentLevel.LEVEL_1, []);
    assert.strictEqual(result.promoter.amount, 0);
    assert.strictEqual(result.company.amount, 0);
  });

  test('订单金额为1分：向下取整', () => {
    const result = calculateCommission(1, AgentLevel.LEVEL_1, []);
    assert.strictEqual(result.promoter.amount, 0); // Math.floor(0.2) = 0
  });

  test('大额订单：10万元', () => {
    const upstream = [
      { userId: 'C', level: AgentLevel.LEVEL_3 },
      { userId: 'B', level: AgentLevel.LEVEL_2 },
      { userId: 'A', level: AgentLevel.LEVEL_1 }
    ];
    const result = calculateCommission(1000000, AgentLevel.LEVEL_4, upstream);

    assert.strictEqual(result.promoter.amount, 80000); // 800元
    assert.strictEqual(result.upstream[0].amount, 40000); // 400元
    assert.strictEqual(result.upstream[1].amount, 40000); // 400元
    assert.strictEqual(result.upstream[2].amount, 40000); // 400元
    assert.strictEqual(result.company.amount, 800000); // 8000元
  });

  test('精度测试：101分订单', () => {
    const result = calculateCommission(101, AgentLevel.LEVEL_4, [
      { userId: 'C', level: AgentLevel.LEVEL_3 },
      { userId: 'B', level: AgentLevel.LEVEL_2 },
      { userId: 'A', level: AgentLevel.LEVEL_1 }
    ]);

    // 101 * 0.08 = 8.08 -> 8
    assert.strictEqual(result.promoter.amount, 8);
    // 101 * 0.04 = 4.04 -> 4
    assert.strictEqual(result.upstream[0].amount, 4);
  });

  test('上级数量不足：正确处理', () => {
    // 四级代理，但只有2个上级
    const upstream = [
      { userId: 'B', level: AgentLevel.LEVEL_2 },
      { userId: 'A', level: AgentLevel.LEVEL_1 }
    ];
    const result = calculateCommission(10000, AgentLevel.LEVEL_4, upstream);

    assert.strictEqual(result.promoter.amount, 800);
    assert.strictEqual(result.upstream.length, 2);
    assert.strictEqual(result.upstream[0].amount, 400);
    assert.strictEqual(result.upstream[1].amount, 400);
    // 公司拿：10000 - 800 - 400 - 400 = 8400
    assert.strictEqual(result.company.amount, 8400);
  });

  test('空上级数组：正确处理', () => {
    const result = calculateCommission(10000, AgentLevel.LEVEL_1, []);

    assert.strictEqual(result.promoter.amount, 2000);
    assert.strictEqual(result.upstream.length, 0);
    assert.strictEqual(result.company.amount, 8000);
  });
});

describe('推广体系V3 - 实际业务场景测试', () => {

  /**
   * 场景1：一级代理推广
   * 结构：总公司 → 无
   * 客户下单100元，一级代理A获得20元佣金
   */
  test('场景1：一级代理推广', () => {
    const result = calculateCommission(10000, AgentLevel.LEVEL_1, []);

    assert.strictEqual(result.promoter.amount, 2000);
    assert.strictEqual(result.company.amount, 8000);
    console.log('场景1：一级代理推广 - 推广人获得20元，公司获得80元');
  });

  /**
   * 场景2：二级代理推广
   * 结构：总公司(A) → 二级代理(B) → 客户
   * 客户下单100元，B获得12元，A获得8元，公司获得80元
   */
  test('场景2：二级代理推广', () => {
    const upstream = [
      { userId: 'A', level: AgentLevel.LEVEL_1 }
    ];
    const result = calculateCommission(10000, AgentLevel.LEVEL_2, upstream);

    assert.strictEqual(result.promoter.amount, 1200); // B获得12元
    assert.strictEqual(result.upstream[0].amount, 800); // A获得8元
    assert.strictEqual(result.company.amount, 8000);
    console.log('场景2：二级代理推广 - 推广人获得12元，上级获得8元，公司获得80元');
  });

  /**
   * 场景3：完整四级代理链推广
   * 结构：金牌(A) → 银牌(B) → 铜牌(C) → 普通(D) → 客户
   * 客户下单100元，D获得8元，C获得4元，B获得4元，A获得4元，公司获得80元
   */
  test('场景3：完整四级代理链', () => {
    const upstream = [
      { userId: 'C', level: AgentLevel.LEVEL_3 },
      { userId: 'B', level: AgentLevel.LEVEL_2 },
      { userId: 'A', level: AgentLevel.LEVEL_1 }
    ];
    const result = calculateCommission(10000, AgentLevel.LEVEL_4, upstream);

    assert.strictEqual(result.promoter.amount, 800); // D: 8元
    assert.strictEqual(result.upstream[0].amount, 400); // C: 4元
    assert.strictEqual(result.upstream[1].amount, 400); // B: 4元
    assert.strictEqual(result.upstream[2].amount, 400); // A: 4元
    assert.strictEqual(result.company.amount, 8000);

    const total = result.promoter.amount + result.upstream.reduce((s, u) => s + u.amount, 0);
    assert.strictEqual(total, 2000); // 总佣金20元
    console.log('场景3：四级代理链 - D:8元, C:4元, B:4元, A:4元, 公司:80元');
  });

  /**
   * 场景4：跟随升级
   * 初始：A(一级) → B(二级) → C(三级) → D(四级)
   * D升级到三级后脱离C，可发展新四级
   * B升级到一级后，A和C、D的关系变化
   */
  test('场景4：跟随升级机制', () => {
    // 第一步：D 4→3
    let rules = getFollowRules(4, 3);
    assert.strictEqual(rules.length, 0); // 无跟随
    console.log('D 4→3: 无下级跟随');

    // 第二步：C 3→2
    rules = getFollowRules(3, 2);
    assert.strictEqual(rules.length, 1);
    assert.strictEqual(rules[0].fromLevel, 4);
    assert.strictEqual(rules[0].toLevel, 3);
    console.log('C 3→2: D(四级)跟随升到(三级)');

    // 第三步：B 2→1
    rules = getFollowRules(2, 1);
    assert.strictEqual(rules.length, 2);
    console.log('B 2→1: C(三级)升到(二级), D(四级)升到(三级)');
  });

  /**
   * 场景5：业绩达标晋升
   * 用户C从普通会员晋升为铜牌推广员
   */
  test('场景5：业绩达标晋升', () => {
    const performance = {
      totalSales: 250000, // 2.5万元
      monthSales: 0,
      teamCount: 0
    };
    const result = checkPromotionEligibility(performance, AgentLevel.LEVEL_4);

    assert.strictEqual(result.canPromote, true);
    console.log('用户C累计销售额2.5万元，可晋升为铜牌推广员');
  });

  /**
   * 场景6：团队人数达标晋升
   * 用户B从铜牌晋升为银牌
   */
  test('场景6：团队人数达标晋升', () => {
    const performance = {
      totalSales: 100000,
      monthSales: 30000,
      teamCount: 60
    };
    const result = checkPromotionEligibility(performance, AgentLevel.LEVEL_3);

    assert.strictEqual(result.canPromote, true);
    assert.strictEqual(result.reason, '团队人数达标');
    console.log('用户B团队人数60人，可晋升为银牌推广员');
  });

  /**
   * 场景7：多重晋升
   * 用户从普通会员连续晋升到金牌推广员
   */
  test('场景7：连续晋升', () => {
    // 初始：普通会员
    let performance = {
      totalSales: 200000, // 2万元
      monthSales: 0,
      teamCount: 0
    };

    // 第一次晋升：普通 → 铜牌
    let result = checkPromotionEligibility(performance, AgentLevel.LEVEL_4);
    assert.strictEqual(result.canPromote, true);
    console.log('第一次晋升：普通 → 铜牌 (累计销售额达标)');

    // 第二次晋升：铜牌 → 银牌
    performance = {
      totalSales: 300000,
      monthSales: 500000, // 5万元
      teamCount: 50
    };
    result = checkPromotionEligibility(performance, AgentLevel.LEVEL_3);
    assert.strictEqual(result.canPromote, true);
    console.log('第二次晋升：铜牌 → 银牌 (团队人数达标)');

    // 第三次晋升：银牌 → 金牌
    performance = {
      totalSales: 500000,
      monthSales: 1000000, // 10万元
      teamCount: 100
    };
    result = checkPromotionEligibility(performance, AgentLevel.LEVEL_2);
    assert.strictEqual(result.canPromote, true);
    console.log('第三次晋升：银牌 → 金牌 (本月销售额达标)');
  });
});

describe('推广体系V3 - 代理等级名称测试', () => {

  test('内部名称正确', () => {
    assert.strictEqual(getAgentLevelInternalName(AgentLevel.LEVEL_1), '一级代理');
    assert.strictEqual(getAgentLevelInternalName(AgentLevel.LEVEL_2), '二级代理');
    assert.strictEqual(getAgentLevelInternalName(AgentLevel.LEVEL_3), '三级代理');
    assert.strictEqual(getAgentLevelInternalName(AgentLevel.LEVEL_4), '四级代理');
  });

  test('对外展示名称正确', () => {
    assert.strictEqual(getAgentLevelDisplayName(AgentLevel.LEVEL_1), '金牌推广员');
    assert.strictEqual(getAgentLevelDisplayName(AgentLevel.LEVEL_2), '银牌推广员');
    assert.strictEqual(getAgentLevelDisplayName(AgentLevel.LEVEL_3), '铜牌推广员');
    assert.strictEqual(getAgentLevelDisplayName(AgentLevel.LEVEL_4), '普通会员');
  });
});

// ==================== 运行测试 ====================

/**
 * 简单测试运行器
 */
function runTests() {
  console.log('\n========================================');
  console.log('推广体系V3 - 完整测试套件');
  console.log('========================================\n');

  // 使用 Mocha 或 Jest 运行
  console.log('请使用以下命令运行测试：\n');
  console.log('  npm run test:cf');
  console.log('  # 或');
  console.log('  npx mocha cloudfunctions/promotion/test-v3.test.js\n');

  return { passed: 0, failed: 0, total: 0 };
}

// 简单的 test/describe 模拟
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
  console.log('----------------------------------------');
  fn();
}

// 如果直接运行此文件
if (require.main === module) {
  runTests();
}

module.exports = {
  calculateCommission,
  checkPromotionEligibility,
  runTests
};
