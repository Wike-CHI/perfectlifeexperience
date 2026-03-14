/**
 * 佣金计算单元测试
 *
 * 测试四层推广佣金分配规则（佣金池为订单金额的20%）：
 * - Level 1 (金牌): 自己拿20%
 * - Level 2 (银牌): 自己拿12%，直接上级拿8%
 * - Level 3 (铜牌): 自己拿12%，两级上级各拿4%
 * - Level 4 (普通): 自己拿8%，三级上级各拿4%
 *
 * @see cloudfunctions/common/constants.js - Commission.RULES
 */

const assert = require('assert');

// ==================== 佣金规则常量 ====================

/**
 * 佣金规则（与 cloudfunctions/common/constants.js 保持一致）
 */
const Commission = {
  COMMISSION_POOL: 0.20,  // 佣金池20%

  RULES: {
    1: { own: 0.20, upstream: [] },              // Level 1: 自己拿20%
    2: { own: 0.12, upstream: [0.08] },         // Level 2: 自己12%，上级8%
    3: { own: 0.12, upstream: [0.04, 0.04] },   // Level 3: 自己12%，两级上级各4%
    4: { own: 0.08, upstream: [0.04, 0.04, 0.04] } // Level 4: 自己8%，三级上级各4%
  }
};

/**
 * 计算佣金奖励
 * @param {number} orderAmount - 订单金额（分）
 * @param {number} agentLevel - 推广人等级 (1-4)
 * @returns {object} 佣金计算结果
 */
function calculateCommissionRewards(orderAmount, agentLevel) {
  const rule = Commission.RULES[agentLevel] || Commission.RULES[4];
  const totalCommission = Math.round(orderAmount * Commission.COMMISSION_POOL);
  const selfCommission = Math.round(orderAmount * rule.own);
  const upstreamCommissions = rule.upstream.map(ratio => Math.round(orderAmount * ratio));

  return {
    totalCommission,
    selfCommission,
    upstreamCommissions,
    agentLevel
  };
}

// ==================== 测试套件 ====================

describe('佣金计算测试', () => {

  describe('Level 1 推广员佣金计算', () => {

    it('应该正确计算Level 1推广员的佣金（自己拿20%）', () => {
      // Arrange
      const orderAmount = 10000; // 100元
      const agentLevel = 1; // Level 1

      // Act
      const result = calculateCommissionRewards(orderAmount, agentLevel);

      // Assert
      assert.strictEqual(result.totalCommission, 2000, '佣金总额应为20元');
      assert.strictEqual(result.selfCommission, 2000, '自己应拿20元');
      assert.strictEqual(result.upstreamCommissions.length, 0, '无上级佣金');
      assert.deepStrictEqual(result.upstreamCommissions, [], '上级佣金数组应为空');

      console.log('✅ Level 1推广员佣金计算正确：20元（100元×20%）');
    });

    it('应该正确处理大额订单', () => {
      // Arrange
      const orderAmount = 100000; // 1000元
      const agentLevel = 1;

      // Act
      const result = calculateCommissionRewards(orderAmount, agentLevel);

      // Assert
      assert.strictEqual(result.totalCommission, 20000, '佣金总额应为200元');
      assert.strictEqual(result.selfCommission, 20000, '自己应拿200元');

      console.log('✅ Level 1推广员大额订单佣金计算正确：200元（1000元×20%）');
    });

    it('应该正确处理小额订单', () => {
      // Arrange
      const orderAmount = 1000; // 10元
      const agentLevel = 1;

      // Act
      const result = calculateCommissionRewards(orderAmount, agentLevel);

      // Assert
      assert.strictEqual(result.totalCommission, 200, '佣金总额应为2元');
      assert.strictEqual(result.selfCommission, 200, '自己应拿2元');

      console.log('✅ Level 1推广员小额订单佣金计算正确：2元（10元×20%）');
    });

    it('佣金总额应等于订单金额的20%', () => {
      // Arrange
      const testAmounts = [1000, 5000, 10000, 25000, 50000, 100000];

      // Act & Assert
      testAmounts.forEach(amount => {
        const result = calculateCommissionRewards(amount, 1);
        const expectedTotal = Math.round(amount * 0.20);
        assert.strictEqual(result.totalCommission, expectedTotal,
          `订单${amount/100}元时佣金应为${expectedTotal/100}元`
        );
      });

      console.log('✅ Level 1推广员佣金总额始终为订单金额的20%');
    });
  });

  describe('Level 2 推广员佣金计算', () => {

    it('应该正确计算Level 2推广员的佣金（自己12%，上级8%）', () => {
      // Arrange
      const orderAmount = 10000; // 100元
      const agentLevel = 2; // Level 2

      // Act
      const result = calculateCommissionRewards(orderAmount, agentLevel);

      // Assert
      assert.strictEqual(result.totalCommission, 2000, '佣金总额应为20元');
      assert.strictEqual(result.selfCommission, 1200, '自己应拿12元');
      assert.strictEqual(result.upstreamCommissions.length, 1, '应有1个上级');
      assert.strictEqual(result.upstreamCommissions[0], 800, '直接上级应拿8元');

      console.log('✅ Level 2推广员佣金计算正确：自己12元 + 上级8元 = 20元');
    });

    it('应该正确分配佣金给直接上级', () => {
      // Arrange
      const orderAmount = 50000; // 500元
      const agentLevel = 2;

      // Act
      const result = calculateCommissionRewards(orderAmount, agentLevel);

      // Assert
      assert.strictEqual(result.selfCommission, 6000, '自己应拿60元');
      assert.strictEqual(result.upstreamCommissions[0], 4000, '直接上级应拿40元');
      assert.strictEqual(
        result.selfCommission + result.upstreamCommissions[0],
        10000,
        '佣金总额应为100元'
      );

      console.log('✅ Level 2推广员大额订单佣金分配正确');
    });

    it('佣金分配比例应为12%:8%', () => {
      // Arrange
      const orderAmount = 10000; // 100元

      // Act
      const result = calculateCommissionRewards(orderAmount, 2);

      // Assert
      const selfRatio = result.selfCommission / orderAmount;
      const upstreamRatio = result.upstreamCommissions[0] / orderAmount;

      assert.strictEqual(selfRatio, 0.12, '自己比例应为12%');
      assert.strictEqual(upstreamRatio, 0.08, '上级比例应为8%');

      console.log('✅ Level 2推广员佣金分配比例正确（12%:8%）');
    });
  });

  describe('Level 3 推广员佣金计算', () => {

    it('应该正确计算Level 3推广员的佣金（自己12%，两级上级各4%）', () => {
      // Arrange
      const orderAmount = 10000; // 100元
      const agentLevel = 3; // Level 3

      // Act
      const result = calculateCommissionRewards(orderAmount, agentLevel);

      // Assert
      assert.strictEqual(result.totalCommission, 2000, '佣金总额应为20元');
      assert.strictEqual(result.selfCommission, 1200, '自己应拿12元');
      assert.strictEqual(result.upstreamCommissions.length, 2, '应有2个上级');
      assert.strictEqual(result.upstreamCommissions[0], 400, '直接上级应拿4元');
      assert.strictEqual(result.upstreamCommissions[1], 400, '再上级应拿4元');
      assert.strictEqual(
        result.selfCommission + result.upstreamCommissions[0] + result.upstreamCommissions[1],
        2000,
        '佣金总额应为20元'
      );

      console.log('✅ Level 3推广员佣金计算正确：自己12元 + 两级上级各4元 = 20元');
    });

    it('应该正确分配佣金给两级上级', () => {
      // Arrange
      const orderAmount = 25000; // 250元
      const agentLevel = 3;

      // Act
      const result = calculateCommissionRewards(orderAmount, agentLevel);

      // Assert
      assert.strictEqual(result.selfCommission, 3000, '自己应拿30元');
      assert.strictEqual(result.upstreamCommissions[0], 1000, '直接上级应拿10元');
      assert.strictEqual(result.upstreamCommissions[1], 1000, '再上级应拿10元');

      console.log('✅ Level 3推广员大额订单佣金分配正确');
    });

    it('佣金分配比例应为12%:4%:4%', () => {
      // Arrange
      const orderAmount = 10000; // 100元

      // Act
      const result = calculateCommissionRewards(orderAmount, 3);

      // Assert
      const selfRatio = result.selfCommission / orderAmount;
      const upstream1Ratio = result.upstreamCommissions[0] / orderAmount;
      const upstream2Ratio = result.upstreamCommissions[1] / orderAmount;

      assert.strictEqual(selfRatio, 0.12, '自己比例应为12%');
      assert.strictEqual(upstream1Ratio, 0.04, '第一级上级比例应为4%');
      assert.strictEqual(upstream2Ratio, 0.04, '第二级上级比例应为4%');

      console.log('✅ Level 3推广员佣金分配比例正确（12%:4%:4%）');
    });
  });

  describe('Level 4 推广员佣金计算', () => {

    it('应该正确计算Level 4推广员的佣金（自己8%，三级上级各4%）', () => {
      // Arrange
      const orderAmount = 10000; // 100元
      const agentLevel = 4; // Level 4

      // Act
      const result = calculateCommissionRewards(orderAmount, agentLevel);

      // Assert
      assert.strictEqual(result.totalCommission, 2000, '佣金总额应为20元');
      assert.strictEqual(result.selfCommission, 800, '自己应拿8元');
      assert.strictEqual(result.upstreamCommissions.length, 3, '应有3个上级');
      assert.strictEqual(result.upstreamCommissions[0], 400, '直接上级应拿4元');
      assert.strictEqual(result.upstreamCommissions[1], 400, '再上级应拿4元');
      assert.strictEqual(result.upstreamCommissions[2], 400, '更上级应拿4元');
      assert.strictEqual(
        result.selfCommission +
          result.upstreamCommissions[0] +
          result.upstreamCommissions[1] +
          result.upstreamCommissions[2],
        2000,
        '佣金总额应为20元'
      );

      console.log('✅ Level 4推广员佣金计算正确：自己8元 + 三级上级各4元 = 20元');
    });

    it('应该正确分配佣金给三级上级', () => {
      // Arrange
      const orderAmount = 50000; // 500元
      const agentLevel = 4;

      // Act
      const result = calculateCommissionRewards(orderAmount, agentLevel);

      // Assert
      assert.strictEqual(result.selfCommission, 4000, '自己应拿40元');
      assert.strictEqual(result.upstreamCommissions[0], 2000, '直接上级应拿20元');
      assert.strictEqual(result.upstreamCommissions[1], 2000, '再上级应拿20元');
      assert.strictEqual(result.upstreamCommissions[2], 2000, '更上级应拿20元');

      console.log('✅ Level 4推广员大额订单佣金分配正确');
    });

    it('佣金分配比例应为8%:4%:4%:4%', () => {
      // Arrange
      const orderAmount = 10000; // 100元

      // Act
      const result = calculateCommissionRewards(orderAmount, 4);

      // Assert
      const selfRatio = result.selfCommission / orderAmount;
      const upstream1Ratio = result.upstreamCommissions[0] / orderAmount;
      const upstream2Ratio = result.upstreamCommissions[1] / orderAmount;
      const upstream3Ratio = result.upstreamCommissions[2] / orderAmount;

      assert.strictEqual(selfRatio, 0.08, '自己比例应为8%');
      assert.strictEqual(upstream1Ratio, 0.04, '第一级上级比例应为4%');
      assert.strictEqual(upstream2Ratio, 0.04, '第二级上级比例应为4%');
      assert.strictEqual(upstream3Ratio, 0.04, '第三级上级比例应为4%');

      console.log('✅ Level 4推广员佣金分配比例正确（8%:4%:4%:4%）');
    });
  });

  describe('边界情况和异常处理', () => {

    it('应该正确处理最小金额订单', () => {
      // Arrange
      const orderAmount = 100; // 1元
      const agentLevel = 4;

      // Act
      const result = calculateCommissionRewards(orderAmount, agentLevel);

      // Assert
      assert.strictEqual(result.totalCommission, 20, '佣金总额应为0.2元');
      assert.strictEqual(result.selfCommission, 8, '自己应拿0.08元');

      console.log('✅ 最小金额订单佣金计算正确');
    });

    it('应该正确处理零金额订单', () => {
      // Arrange
      const orderAmount = 0;
      const agentLevel = 1;

      // Act
      const result = calculateCommissionRewards(orderAmount, agentLevel);

      // Assert
      assert.strictEqual(result.totalCommission, 0, '佣金总额应为0');
      assert.strictEqual(result.selfCommission, 0, '自己佣金应为0');
      assert.deepStrictEqual(result.upstreamCommissions, [], '上级佣金应为空数组');

      console.log('✅ 零金额订单处理正确');
    });

    it('应该正确处理无效等级（降级为Level 4）', () => {
      // Arrange
      const orderAmount = 10000;
      const agentLevel = 999; // 无效等级

      // Act
      const result = calculateCommissionRewards(orderAmount, agentLevel);

      // Assert
      assert.strictEqual(result.selfCommission, 800, '应使用Level 4规则（自己拿8%）');
      assert.strictEqual(result.upstreamCommissions.length, 3, '应有3个上级');

      console.log('✅ 无效等级降级处理正确');
    });

    it('应该确保所有佣金金额为整数（分）', () => {
      // Arrange
      const testAmounts = [1234, 5678, 9999, 11111];

      // Act & Assert
      testAmounts.forEach(amount => {
        [1, 2, 3, 4].forEach(level => {
          const result = calculateCommissionRewards(amount, level);

          // 验证所有佣金金额都是整数
          assert.strictEqual(
            result.totalCommission,
            Math.round(result.totalCommission),
            '总佣金应为整数'
          );
          assert.strictEqual(
            result.selfCommission,
            Math.round(result.selfCommission),
            '自己佣金应为整数'
          );
          result.upstreamCommissions.forEach((commission, index) => {
            assert.strictEqual(
              commission,
              Math.round(commission),
              `第${index + 1}级上级佣金应为整数`
            );
          });
        });
      });

      console.log('✅ 所有佣金金额都正确转换为整数（分）');
    });

    it('佣金总额应始终等于订单金额的20%', () => {
      // Arrange
      const testCases = [
        { amount: 1000, level: 1 },
        { amount: 5000, level: 2 },
        { amount: 10000, level: 3 },
        { amount: 25000, level: 4 },
        { amount: 99999, level: 1 }
      ];

      // Act & Assert
      testCases.forEach(({ amount, level }) => {
        const result = calculateCommissionRewards(amount, level);
        const expectedTotal = Math.round(amount * 0.20);

        assert.strictEqual(
          result.totalCommission,
          expectedTotal,
          `订单${amount}分，等级${level}：佣金应为${expectedTotal}分`
        );

        // 验证总佣金 = 自己佣金 + 所有上级佣金
        const sumOfParts = result.selfCommission +
          result.upstreamCommissions.reduce((sum, val) => sum + val, 0);

        assert.strictEqual(
          sumOfParts,
          result.totalCommission,
          '总佣金应等于所有分配的佣金之和'
        );
      });

      console.log('✅ 佣金总额始终等于订单金额的20%，且分配完整');
    });
  });

  describe('佣金规则一致性验证', () => {

    it('所有等级的佣金总和都应等于20%', () => {
      // Arrange
      const orderAmount = 10000; // 100元

      // Act & Assert
      [1, 2, 3, 4].forEach(level => {
        const result = calculateCommissionRewards(orderAmount, level);
        const sumOfAllCommissions = result.selfCommission +
          result.upstreamCommissions.reduce((sum, val) => sum + val, 0);

        assert.strictEqual(
          sumOfAllCommissions,
          result.totalCommission,
          `等级${level}的佣金总和应等于佣金总额`
        );

        assert.strictEqual(
          result.totalCommission,
          2000,
          '所有等级的佣金总额都应为20元'
        );
      });

      console.log('✅ 所有等级的佣金总和都等于订单金额的20%');
    });

    it('应该符合业务规则（推广体系商业说明.md）', () => {
      // Arrange & Act & Assert
      const level100 = calculateCommissionRewards(10000, 1);
      assert.strictEqual(level100.selfCommission, 2000, 'Level 1: 自己拿20%');

      const level200 = calculateCommissionRewards(10000, 2);
      assert.strictEqual(level200.selfCommission, 1200, 'Level 2: 自己拿12%');
      assert.strictEqual(level200.upstreamCommissions[0], 800, 'Level 2: 上级拿8%');

      const level300 = calculateCommissionRewards(10000, 3);
      assert.strictEqual(level300.selfCommission, 1200, 'Level 3: 自己拿12%');
      assert.strictEqual(level300.upstreamCommissions[0], 400, 'Level 3: 上级1拿4%');
      assert.strictEqual(level300.upstreamCommissions[1], 400, 'Level 3: 上级2拿4%');

      const level400 = calculateCommissionRewards(10000, 4);
      assert.strictEqual(level400.selfCommission, 800, 'Level 4: 自己拿8%');
      assert.strictEqual(level400.upstreamCommissions[0], 400, 'Level 4: 上级1拿4%');
      assert.strictEqual(level400.upstreamCommissions[1], 400, 'Level 4: 上级2拿4%');
      assert.strictEqual(level400.upstreamCommissions[2], 400, 'Level 4: 上级3拿4%');

      console.log('✅ 所有佣金规则符合业务规范');
    });
  });
});
