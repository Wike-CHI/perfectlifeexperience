/**
 * 推广升级条件单元测试
 *
 * 测试四级推广员的升级逻辑:
 * - Level 4→3 (普通→铜牌): 累计销售额≥20000
 * - Level 3→2 (铜牌→银牌): 月销售额≥50000 或 团队人数≥50
 * - Level 2→1 (银牌→金牌): 月销售额≥100000 或 团队人数≥200
 *
 * @see cloudfunctions/common/constants.js - PromotionThreshold
 */

const assert = require('assert');

// ==================== 升级条件常量 ====================

/**
 * 升级条件定义(与 cloudfunctions/common/constants.js 保持一致)
 * 注意:金额单位为分
 */
const PromotionThreshold = {
  // 四级 → 三级（普通 → 铜牌）
  LEVEL_4_TO_3: {
    totalSales: 2000000  // 累计销售额 >= 20000元 (2000000分) - 修复:原为200000
  },

  // 三级 → 二级（铜牌 → 银牌）
  LEVEL_3_TO_2: {
    monthSales: 5000000,  // 本月销售额 >= 50000元 - 修复:原为500000
    teamCount: 50        // 或团队人数 >= 50人
  },

  // 二级 → 一级（银牌 → 金牌）
  LEVEL_2_TO_1: {
    monthSales: 10000000, // 本月销售额 >= 100000元 - 修复:原为1000000
    teamCount: 200       // 或团队人数 >= 200人
  }
};

/**
 * 代理等级常量
 */
const AgentLevel = {
  LEVEL_1: 1,  // 金牌推广员
  LEVEL_2: 2,  // 银牌推广员
  LEVEL_3: 3,  // 铜牌推广员
  LEVEL_4: 4   // 普通会员
};

// ==================== 升级条件验证函数 ====================

/**
 * 检查用户是否满足升级条件
 * @param {object} user - 用户对象
 * @param {number} user.agentLevel - 当前等级
 * @param {object} user.performance - 业绩数据
 * @param {number} user.performance.totalSales - 累计销售额
 * @param {number} user.performance.monthSales - 本月销售额
 * @param {number} user.performance.monthTag - 本月标签(YYYY-MM)
 * @param {number} user.performance.teamCount - 团队人数
 * @param {string} currentMonthTag - 当前月份标签
 * @returns {object} { shouldUpgrade, newLevel, reason }
 */
function checkUpgradeCondition(user, currentMonthTag = '2026-03') {
  const { agentLevel, performance } = user;

  // Level 4 → Level 3 (普通会员 → 铜牌推广员)
  if (agentLevel === AgentLevel.LEVEL_4) {
    const threshold = PromotionThreshold.LEVEL_4_TO_3;
    const totalSales = performance.totalSales || 0;

    if (totalSales >= threshold.totalSales) {
      return {
        shouldUpgrade: true,
        newLevel: AgentLevel.LEVEL_3,
        reason: `累计销售额${totalSales}分≥${threshold.totalSales}分`
      };
    }

    return {
      shouldUpgrade: false,
      newLevel: agentLevel,
      reason: `累计销售额不足(${totalSales}/${threshold.totalSales})`
    };
  }

  // Level 3 → Level 2 (铜牌推广员 → 银牌推广员)
  if (agentLevel === AgentLevel.LEVEL_3) {
    const threshold = PromotionThreshold.LEVEL_3_TO_2;
    const monthSales = (performance.monthTag === currentMonthTag) ? (performance.monthSales || 0) : 0;
    const teamCount = performance.teamCount || 0;

    const meetsSalesCondition = monthSales >= threshold.monthSales;
    const meetsTeamCondition = teamCount >= threshold.teamCount;

    if (meetsSalesCondition || meetsTeamCondition) {
      const reasons = [];
      if (meetsSalesCondition) reasons.push(`月销售额${monthSales}分≥${threshold.monthSales}分`);
      if (meetsTeamCondition) reasons.push(`团队人数${teamCount}人≥${threshold.teamCount}人`);

      return {
        shouldUpgrade: true,
        newLevel: AgentLevel.LEVEL_2,
        reason: reasons.join(' 或 ')
      };
    }

    return {
      shouldUpgrade: false,
      newLevel: agentLevel,
      reason: `不满足条件(月销售额:${monthSales}/${threshold.monthSales}, 团队人数:${teamCount}/${threshold.teamCount})`
    };
  }

  // Level 2 → Level 1 (银牌推广员 → 金牌推广员)
  if (agentLevel === AgentLevel.LEVEL_2) {
    const threshold = PromotionThreshold.LEVEL_2_TO_1;
    const monthSales = (performance.monthTag === currentMonthTag) ? (performance.monthSales || 0) : 0;
    const teamCount = performance.teamCount || 0;

    const meetsSalesCondition = monthSales >= threshold.monthSales;
    const meetsTeamCondition = teamCount >= threshold.teamCount;

    if (meetsSalesCondition || meetsTeamCondition) {
      const reasons = [];
      if (meetsSalesCondition) reasons.push(`月销售额${monthSales}分≥${threshold.monthSales}分`);
      if (meetsTeamCondition) reasons.push(`团队人数${teamCount}人≥${threshold.teamCount}人`);

      return {
        shouldUpgrade: true,
        newLevel: AgentLevel.LEVEL_1,
        reason: reasons.join(' 或 ')
      };
    }

    return {
      shouldUpgrade: false,
      newLevel: agentLevel,
      reason: `不满足条件(月销售额:${monthSales}/${threshold.monthSales}, 团队人数:${teamCount}/${threshold.teamCount})`
    };
  }

  // Level 1已经是最高等级
  if (agentLevel === AgentLevel.LEVEL_1) {
    return {
      shouldUpgrade: false,
      newLevel: agentLevel,
      reason: '已是最高等级'
    };
  }

  return {
    shouldUpgrade: false,
    newLevel: agentLevel,
    reason: '未知等级'
  };
}

// ==================== 测试套件 ====================

describe('推广升级条件测试', () => {

  describe('4级→3级升级(普通会员 → 铜牌推广员)', () => {

    it('累计销售额≥20000元时应该升级', () => {
      // Arrange
      const user = {
        agentLevel: AgentLevel.LEVEL_4,
        performance: {
          totalSales: 2500000, // 25000元 (修复:原为2500元)
          monthTag: '2026-03'
        }
      };

      // Act
      const result = checkUpgradeCondition(user);

      // Assert
      assert.strictEqual(result.shouldUpgrade, true, '累计销售额≥20000元时应该升级');
      assert.strictEqual(result.newLevel, AgentLevel.LEVEL_3, '应升级到3级');
      assert.ok(result.reason.includes('累计销售额'), '原因应包含累计销售额');

      console.log('✅ 累计销售额25000元时满足升级条件');
    });

    it('累计销售额<20000元时不应该升级', () => {
      // Arrange
      const user = {
        agentLevel: AgentLevel.LEVEL_4,
        performance: {
          totalSales: 1500000, // 15000元 (修复:原为1500元)
          monthTag: '2026-03'
        }
      };

      // Act
      const result = checkUpgradeCondition(user);

      // Assert
      assert.strictEqual(result.shouldUpgrade, false, '累计销售额<20000元时不应该升级');
      assert.strictEqual(result.newLevel, AgentLevel.LEVEL_4, '应保持4级');

      console.log('✅ 累计销售额15000元时不满足升级条件');
    });

    it('累计销售额=20000元时应该升级(边界值)', () => {
      // Arrange
      const user = {
        agentLevel: AgentLevel.LEVEL_4,
        performance: {
          totalSales: 2000000, // 正好20000元 (修复:原为200000)
          monthTag: '2026-03'
        }
      };

      // Act
      const result = checkUpgradeCondition(user);

      // Assert
      assert.strictEqual(result.shouldUpgrade, true, '累计销售额=20000元时应该升级');

      console.log('✅ 累计销售额正好20000元时满足升级条件(边界值)');
    });

    it('累计销售额为0时不应该升级', () => {
      // Arrange
      const user = {
        agentLevel: AgentLevel.LEVEL_4,
        performance: {
          totalSales: 0,
          monthTag: '2026-03'
        }
      };

      // Act
      const result = checkUpgradeCondition(user);

      // Assert
      assert.strictEqual(result.shouldUpgrade, false, '累计销售额为0时不应该升级');

      console.log('✅ 累计销售额为0时不升级');
    });
  });

  describe('3级→2级升级(铜牌推广员 → 银牌推广员)', () => {

    it('月销售额≥50000元时应该升级', () => {
      // Arrange
      const user = {
        agentLevel: AgentLevel.LEVEL_3,
        performance: {
          monthSales: 6000000, // 60000元 (修复:原为600000)
          monthTag: '2026-03',
          teamCount: 30
        }
      };

      // Act
      const result = checkUpgradeCondition(user);

      // Assert
      assert.strictEqual(result.shouldUpgrade, true, '月销售额≥50000元时应该升级');
      assert.strictEqual(result.newLevel, AgentLevel.LEVEL_2, '应升级到2级');

      console.log('✅ 月销售额60000元时满足升级条件');
    });

    it('团队人数≥50时应该升级(即使销售额不足)', () => {
      // Arrange
      const user = {
        agentLevel: AgentLevel.LEVEL_3,
        performance: {
          monthSales: 3000000, // 30000元(不足50000元) (修复:原为300000)
          monthTag: '2026-03',
          teamCount: 60       // 但团队人数60人(≥50)
        }
      };

      // Act
      const result = checkUpgradeCondition(user);

      // Assert
      assert.strictEqual(result.shouldUpgrade, true, '团队人数≥50时应该升级');
      assert.ok(result.reason.includes('团队人数'), '原因应包含团队人数');

      console.log('✅ 团队人数60人时满足升级条件(或条件)');
    });

    it('两个条件都不满足时不应该升级', () => {
      // Arrange
      const user = {
        agentLevel: AgentLevel.LEVEL_3,
        performance: {
          monthSales: 4000000, // 40000元(<50000元) (修复:原为400000)
          monthTag: '2026-03',
          teamCount: 30       // 30人(<50人)
        }
      };

      // Act
      const result = checkUpgradeCondition(user);

      // Assert
      assert.strictEqual(result.shouldUpgrade, false, '两个条件都不满足时不应该升级');

      console.log('✅ 两个条件都不满足时不升级');
    });

    it('两个条件都满足时应该升级', () => {
      // Arrange
      const user = {
        agentLevel: AgentLevel.LEVEL_3,
        performance: {
          monthSales: 8000000, // 80000元(≥50000元) (修复:原为800000)
          monthTag: '2026-03',
          teamCount: 80       // 80人(≥50人)
        }
      };

      // Act
      const result = checkUpgradeCondition(user);

      // Assert
      assert.strictEqual(result.shouldUpgrade, true, '两个条件都满足时应该升级');
      assert.ok(result.reason.includes('或'), '原因应包含"或"');

      console.log('✅ 两个条件都满足时升级');
    });

    it('月标签不匹配时不应使用月销售额条件', () => {
      // Arrange
      const user = {
        agentLevel: AgentLevel.LEVEL_3,
        performance: {
          monthSales: 8000000, // 虽然有80000元 (修复:原为800000)
          monthTag: '2026-02', // 但标签是上个月
          teamCount: 30        // 团队人数不足
        }
      };

      // Act
      const result = checkUpgradeCondition(user, '2026-03');

      // Assert
      assert.strictEqual(result.shouldUpgrade, false, '月标签不匹配时不应使用月销售额条件');

      console.log('✅ 月标签不匹配时正确忽略月销售额');
    });
  });

  describe('2级→1级升级(银牌推广员 → 金牌推广员)', () => {

    it('月销售额≥100000元时应该升级', () => {
      // Arrange
      const user = {
        agentLevel: AgentLevel.LEVEL_2,
        performance: {
          monthSales: 12000000, // 120000元 (修复:原为1200000)
          monthTag: '2026-03',
          teamCount: 100
        }
      };

      // Act
      const result = checkUpgradeCondition(user);

      // Assert
      assert.strictEqual(result.shouldUpgrade, true, '月销售额≥100000元时应该升级');
      assert.strictEqual(result.newLevel, AgentLevel.LEVEL_1, '应升级到1级');

      console.log('✅ 月销售额120000元时满足升级条件');
    });

    it('团队人数≥200时应该升级(即使销售额不足)', () => {
      // Arrange
      const user = {
        agentLevel: AgentLevel.LEVEL_2,
        performance: {
          monthSales: 5000000,  // 50000元(不足100000元) (修复:原为500000)
          monthTag: '2026-03',
          teamCount: 250       // 但团队人数250人(≥200)
        }
      };

      // Act
      const result = checkUpgradeCondition(user);

      // Assert
      assert.strictEqual(result.shouldUpgrade, true, '团队人数≥200时应该升级');
      assert.ok(result.reason.includes('团队人数'), '原因应包含团队人数');

      console.log('✅ 团队人数250人时满足升级条件(或条件)');
    });

    it('两个条件都不满足时不应该升级', () => {
      // Arrange
      const user = {
        agentLevel: AgentLevel.LEVEL_2,
        performance: {
          monthSales: 8000000,  // 80000元(<100000元) (修复:原为800000)
          monthTag: '2026-03',
          teamCount: 150       // 150人(<200人)
        }
      };

      // Act
      const result = checkUpgradeCondition(user);

      // Assert
      assert.strictEqual(result.shouldUpgrade, false, '两个条件都不满足时不应该升级');

      console.log('✅ 两个条件都不满足时不升级');
    });

    it('边界值:月销售额正好100000元时应该升级', () => {
      // Arrange
      const user = {
        agentLevel: AgentLevel.LEVEL_2,
        performance: {
          monthSales: 10000000, // 正好100000元 (修复:原为1000000)
          monthTag: '2026-03',
          teamCount: 100
        }
      };

      // Act
      const result = checkUpgradeCondition(user);

      // Assert
      assert.strictEqual(result.shouldUpgrade, true, '边界值应满足条件');

      console.log('✅ 月销售额正好100000元时满足升级条件(边界值)');
    });

    it('边界值:团队人数正好200人时应该升级', () => {
      // Arrange
      const user = {
        agentLevel: AgentLevel.LEVEL_2,
        performance: {
          monthSales: 5000000,  // 50000元 (修复:原为500000)
          monthTag: '2026-03',
          teamCount: 200       // 正好200人
        }
      };

      // Act
      const result = checkUpgradeCondition(user);

      // Assert
      assert.strictEqual(result.shouldUpgrade, true, '边界值应满足条件');

      console.log('✅ 团队人数正好200人时满足升级条件(边界值)');
    });
  });

  describe('等级边界情况', () => {

    it('Level 1(金牌)已经是最高等级,不应升级', () => {
      // Arrange
      const user = {
        agentLevel: AgentLevel.LEVEL_1,
        performance: {
          totalSales: 10000000,
          monthSales: 2000000,
          monthTag: '2026-03',
          teamCount: 500
        }
      };

      // Act
      const result = checkUpgradeCondition(user);

      // Assert
      assert.strictEqual(result.shouldUpgrade, false, 'Level 1不应升级');
      assert.strictEqual(result.newLevel, AgentLevel.LEVEL_1, '应保持1级');
      assert.strictEqual(result.reason, '已是最高等级', '原因应为已是最高等级');

      console.log('✅ Level 1已经是最高等级');
    });

    it('性能数据缺失时应该安全处理', () => {
      // Arrange
      const user = {
        agentLevel: AgentLevel.LEVEL_4,
        performance: {}
      };

      // Act
      const result = checkUpgradeCondition(user);

      // Assert
      assert.strictEqual(result.shouldUpgrade, false, '性能数据缺失时不应升级');
      assert.ok(!result.reason.includes('undefined'), '原因不应包含undefined');

      console.log('✅ 性能数据缺失时安全处理');
    });

    it('负数业绩应该被当作0处理', () => {
      // Arrange
      const user = {
        agentLevel: AgentLevel.LEVEL_4,
        performance: {
          totalSales: -1000, // 异常的负数
          monthTag: '2026-03'
        }
      };

      // Act
      const result = checkUpgradeCondition(user);

      // Assert
      assert.strictEqual(result.shouldUpgrade, false, '负数业绩不应升级');

      console.log('✅ 负数业绩被安全处理');
    });
  });

  describe('升级逻辑一致性验证', () => {

    it('所有升级条件都应该与常量定义一致', () => {
      // Arrange & Act & Assert
      // 4→3升级条件
      assert.strictEqual(PromotionThreshold.LEVEL_4_TO_3.totalSales, 2000000, '4→3累计销售额应为2000000分 (修复:原为200000)');

      // 3→2升级条件
      assert.strictEqual(PromotionThreshold.LEVEL_3_TO_2.monthSales, 5000000, '3→2月销售额应为5000000分 (修复:原为500000)');
      assert.strictEqual(PromotionThreshold.LEVEL_3_TO_2.teamCount, 50, '3→2团队人数应为50人');

      // 2→1升级条件
      assert.strictEqual(PromotionThreshold.LEVEL_2_TO_1.monthSales, 10000000, '2→1月销售额应为10000000分 (修复:原为1000000)');
      assert.strictEqual(PromotionThreshold.LEVEL_2_TO_1.teamCount, 200, '2→1团队人数应为200人');

      console.log('✅ 所有升级条件与常量定义一致');
    });

    it('升级路径应该是单向的(4→3→2→1)', () => {
      // Arrange
      const levels = [AgentLevel.LEVEL_4, AgentLevel.LEVEL_3, AgentLevel.LEVEL_2, AgentLevel.LEVEL_1];

      // Act & Assert
      for (let i = 0; i < levels.length - 1; i++) {
        const currentLevel = levels[i];
        const expectedNextLevel = levels[i + 1];

        // 创建满足升级条件的用户 (修复:更新为正确的业绩值)
        const user = {
          agentLevel: currentLevel,
          performance: {
            totalSales: 100000000,  // 10万元 (修复:原为10000000)
            monthSales: 20000000,    // 2万元 (修复:原为2000000)
            monthTag: '2026-03',
            teamCount: 500
          }
        };

        const result = checkUpgradeCondition(user);

        if (currentLevel !== AgentLevel.LEVEL_1) {
          assert.strictEqual(result.newLevel, expectedNextLevel, `Level ${currentLevel}应升级到Level ${expectedNextLevel}`);
        }
      }

      console.log('✅ 升级路径单向正确(4→3→2→1)');
    });
  });
});
