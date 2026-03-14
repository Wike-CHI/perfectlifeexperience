/**
 * 配置验证工具
 *
 * 检查system_config集合中的升级门槛配置是否正确
 * 验证配置值与硬编码默认值的一致性
 */

const assert = require('assert');

// ==================== 常量定义 ====================

/**
 * 硬编码默认值(来自 cloudfunctions/promotion/common/constants.js)
 * 单位:分
 */
const DEFAULT_THRESHOLDS = {
  LEVEL_4_TO_3: {
    totalSales: 2000000,  // 2万元
    description: '四级→三级(普通→铜牌): 累计销售额≥2万元'
  },
  LEVEL_3_TO_2: {
    monthSales: 5000000,  // 5万元
    teamCount: 50,
    description: '三级→二级(铜牌→银牌): 月销售额≥5万元 或 团队人数≥50人'
  },
  LEVEL_2_TO_1: {
    monthSales: 10000000,  // 10万元
    teamCount: 200,
    description: '二级→一级(银牌→金牌): 月销售额≥10万元 或 团队人数≥200人'
  }
};

/**
 * 配置合理性阈值
 * 用于检测明显错误的配置
 */
const VALIDATION_RULES = {
  MIN_TOTAL_SALES: 1000000,     // 最小累计销售额: 10000元 (1万元)
  MIN_MONTH_SALES: 1000000,     // 最小月销售额: 10000元 (1万元)
  MIN_TEAM_COUNT: 10,            // 最小团队人数: 10人

  // 配置值应该接近默认值(在合理范围内)
  // 小于默认值的50%视为可能错误
  MIN_ACCEPTABLE_RATIO: 0.5,

  // 配置值不应大于默认值的100倍
  MAX_RATIO_OF_DEFAULT: 100
};

// ==================== 验证函数 ====================

/**
 * 验证单个配置值是否合理
 * @param {object} dbConfig - 数据库配置
 * @param {object} defaultConfig - 硬编码默认值
 * @returns {object} 验证结果
 */
function validateThreshold(dbConfig, defaultConfig) {
  const issues = [];

  // 验证累计销售额
  if (dbConfig.totalSales !== undefined) {
    if (dbConfig.totalSales < VALIDATION_RULES.MIN_TOTAL_SALES) {
      issues.push({
        field: 'totalSales',
        value: dbConfig.totalSales,
        expected: `≥${VALIDATION_RULES.MIN_TOTAL_SALES}`,
        severity: 'error',
        message: `累计销售额${dbConfig.totalSales}分过小,应该≥${VALIDATION_RULES.MIN_TOTAL_SALES}分(${VALIDATION_RULES.MIN_TOTAL_SALES/100}元)`
      });
    }

    const ratio = dbConfig.totalSales / defaultConfig.totalSales;
    if (ratio < VALIDATION_RULES.MIN_ACCEPTABLE_RATIO) {
      issues.push({
        field: 'totalSales',
        value: dbConfig.totalSales,
        expected: `≥${defaultConfig.totalSales * VALIDATION_RULES.MIN_ACCEPTABLE_RATIO}`,
        severity: 'error',
        message: `累计销售额${dbConfig.totalSales}分(${dbConfig.totalSales/100}元)远小于默认值${defaultConfig.totalSales}分(${defaultConfig.totalSales/100}元),配置可能错误,请确认单位是否正确(应该是分,不是元)`
      });
    }

    if (ratio > VALIDATION_RULES.MAX_RATIO_OF_DEFAULT) {
      issues.push({
        field: 'totalSales',
        value: dbConfig.totalSales,
        expected: `≤${defaultConfig.totalSales * VALIDATION_RULES.MAX_RATIO_OF_DEFAULT}`,
        severity: 'warning',
        message: `累计销售额${dbConfig.totalSales}分(${dbConfig.totalSales/100}元)远大于默认值${defaultConfig.totalSales}分(${defaultConfig.totalSales/100}元),请确认是否正确`
      });
    }
  }

  // 验证月销售额
  if (dbConfig.monthSales !== undefined) {
    if (dbConfig.monthSales < VALIDATION_RULES.MIN_MONTH_SALES) {
      issues.push({
        field: 'monthSales',
        value: dbConfig.monthSales,
        expected: `≥${VALIDATION_RULES.MIN_MONTH_SALES}`,
        severity: 'error',
        message: `月销售额${dbConfig.monthSales}分过小,应该≥${VALIDATION_RULES.MIN_MONTH_SALES}分(${VALIDATION_RULES.MIN_MONTH_SALES/100}元)`
      });
    }

    const ratio = dbConfig.monthSales / defaultConfig.monthSales;
    if (ratio < VALIDATION_RULES.MIN_ACCEPTABLE_RATIO) {
      issues.push({
        field: 'monthSales',
        value: dbConfig.monthSales,
        expected: `≥${defaultConfig.monthSales * VALIDATION_RULES.MIN_ACCEPTABLE_RATIO}`,
        severity: 'error',
        message: `月销售额${dbConfig.monthSales}分(${dbConfig.monthSales/100}元)远小于默认值${defaultConfig.monthSales}分(${defaultConfig.monthSales/100}元),配置可能错误,请确认单位是否正确(应该是分,不是元)`
      });
    }

    if (ratio > VALIDATION_RULES.MAX_RATIO_OF_DEFAULT) {
      issues.push({
        field: 'monthSales',
        value: dbConfig.monthSales,
        expected: `≤${defaultConfig.monthSales * VALIDATION_RULES.MAX_RATIO_OF_DEFAULT}`,
        severity: 'warning',
        message: `月销售额${dbConfig.monthSales}分(${dbConfig.monthSales/100}元)远大于默认值${defaultConfig.monthSales}分(${defaultConfig.monthSales/100}元),请确认是否正确`
      });
    }
  }

  // 验证团队人数
  if (dbConfig.teamCount !== undefined) {
    if (dbConfig.teamCount < VALIDATION_RULES.MIN_TEAM_COUNT) {
      issues.push({
        field: 'teamCount',
        value: dbConfig.teamCount,
        expected: `≥${VALIDATION_RULES.MIN_TEAM_COUNT}`,
        severity: 'error',
        message: `团队人数${dbConfig.teamCount}过小,应该≥${VALIDATION_RULES.MIN_TEAM_COUNT}人`
      });
    }
  }

  return {
    valid: issues.filter(i => i.severity === 'error').length === 0,
    issues,
    config: dbConfig,
    defaultConfig
  };
}

/**
 * 模拟数据库配置验证
 * @param {object} systemConfig - system_config集合中的配置
 * @returns {object} 验证结果
 */
function validateSystemConfig(systemConfig) {
  const results = {
    valid: true,
    errors: [],
    warnings: [],
    details: {}
  };

  // 检查是否存在配置
  if (!systemConfig || Object.keys(systemConfig).length === 0) {
    return {
      valid: true,
      message: '数据库中无配置,将使用硬编码默认值',
      usingDefaults: true,
      defaults: DEFAULT_THRESHOLDS
    };
  }

  // 验证铜牌门槛 (4级→3级)
  if (systemConfig.bronzeTotalSales !== undefined) {
    const bronzeConfig = { totalSales: systemConfig.bronzeTotalSales };
    const validation = validateThreshold(bronzeConfig, DEFAULT_THRESHOLDS.LEVEL_4_TO_3);

    results.details.bronze = validation;

    if (!validation.valid) {
      results.valid = false;
      results.errors.push(...validation.issues.filter(i => i.severity === 'error'));
    }
    results.warnings.push(...validation.issues.filter(i => i.severity === 'warning'));
  }

  // 验证银牌门槛 (3级→2级)
  if (systemConfig.silverMonthSales !== undefined || systemConfig.silverTeamCount !== undefined) {
    const silverConfig = {
      monthSales: systemConfig.silverMonthSales,
      teamCount: systemConfig.silverTeamCount
    };
    const validation = validateThreshold(silverConfig, DEFAULT_THRESHOLDS.LEVEL_3_TO_2);

    results.details.silver = validation;

    if (!validation.valid) {
      results.valid = false;
      results.errors.push(...validation.issues.filter(i => i.severity === 'error'));
    }
    results.warnings.push(...validation.issues.filter(i => i.severity === 'warning'));
  }

  // 验证金牌门槛 (2级→1级)
  if (systemConfig.goldMonthSales !== undefined || systemConfig.goldTeamCount !== undefined) {
    const goldConfig = {
      monthSales: systemConfig.goldMonthSales,
      teamCount: systemConfig.goldTeamCount
    };
    const validation = validateThreshold(goldConfig, DEFAULT_THRESHOLDS.LEVEL_2_TO_1);

    results.details.gold = validation;

    if (!validation.valid) {
      results.valid = false;
      results.errors.push(...validation.issues.filter(i => i.severity === 'error'));
    }
    results.warnings.push(...validation.issues.filter(i => i.severity === 'warning'));
  }

  return results;
}

// ==================== 测试套件 ====================

describe('配置验证工具测试', () => {

  describe('配置合理性验证', () => {

    it('应该接受正确的配置值', () => {
      // Arrange
      const config = {
        bronzeTotalSales: 2000000,  // 2万元
        silverMonthSales: 5000000,   // 5万元
        silverTeamCount: 50,
        goldMonthSales: 10000000,    // 10万元
        goldTeamCount: 200
      };

      // Act
      const result = validateSystemConfig(config);

      // Assert
      assert.strictEqual(result.valid, true, '正确配置应该验证通过');
      assert.strictEqual(result.errors.length, 0, '不应该有错误');
      assert.strictEqual(result.warnings.length, 0, '不应该有警告');

      console.log('✅ 正确配置验证通过');
    });

    it('应该检测到过小的累计销售额配置', () => {
      // Arrange: 模拟修复前的错误配置
      const config = {
        bronzeTotalSales: 200000  // 2000元 (错误!应该是2000000)
      };

      // Act
      const result = validateSystemConfig(config);

      // Assert
      assert.strictEqual(result.valid, false, '错误配置应该验证失败');
      assert.ok(result.errors.length > 0 || result.warnings.length > 0, '应该有错误或警告');

      console.log('✅ 正确检测到过小的累计销售额配置');
      console.log(`   配置值: ${config.bronzeTotalSales}分 (${config.bronzeTotalSales/100}元)`);
      console.log(`   预期值: ${DEFAULT_THRESHOLDS.LEVEL_4_TO_3.totalSales}分 (${DEFAULT_THRESHOLDS.LEVEL_4_TO_3.totalSales/100}元)`);
    });

    it('应该检测到过小的月销售额配置', () => {
      // Arrange
      const config = {
        silverMonthSales: 500000  // 5000元 (错误!应该是5000000)
      };

      // Act
      const result = validateSystemConfig(config);

      // Assert
      assert.strictEqual(result.valid, false, '错误配置应该验证失败');

      console.log('✅ 正确检测到过小的月销售额配置');
    });

    it('应该检测到过小的团队人数配置', () => {
      // Arrange
      const config = {
        silverTeamCount: 5  // 错误!应该是50
      };

      // Act
      const result = validateSystemConfig(config);

      // Assert
      assert.strictEqual(result.valid, false, '错误配置应该验证失败');

      console.log('✅ 正确检测到过小的团队人数配置');
    });

    it('应该允许合理的自定义配置(更大的值)', () => {
      // Arrange: 管理员可能提高门槛
      const config = {
        bronzeTotalSales: 3000000,  // 3万元 (高于默认2万)
        silverMonthSales: 8000000,   // 8万元 (高于默认5万)
        goldMonthSales: 15000000     // 15万元 (高于默认10万)
      };

      // Act
      const result = validateSystemConfig(config);

      // Assert
      assert.strictEqual(result.valid, true, '合理的自定义配置应该通过');

      console.log('✅ 允许合理的自定义配置(更高的门槛)');
    });
  });

  describe('配置一致性验证', () => {

    it('空配置应该使用默认值', () => {
      // Arrange
      const config = {};

      // Act
      const result = validateSystemConfig(config);

      // Assert
      assert.strictEqual(result.valid, true, '空配置应该有效');
      assert.ok(result.usingDefaults, '应该标记为使用默认值');
      assert.ok(result.defaults, '应该返回默认配置');

      console.log('✅ 空配置正确处理为使用默认值');
    });

    it('部分配置应该与其他使用默认值', () => {
      // Arrange: 只配置了累计销售额,其他使用默认值
      const config = {
        bronzeTotalSales: 2000000,
        // silverMonthSales 未配置,使用默认值5000000
        // silverTeamCount 未配置,使用默认值50
        goldMonthSales: 12000000  // 自定义为12万元
        // goldTeamCount 未配置,使用默认值200
      };

      // Act
      const result = validateSystemConfig(config);

      // Assert
      assert.strictEqual(result.valid, true, '部分配置应该有效');

      console.log('✅ 部分配置正确处理');
    });
  });

  describe('边界值验证', () => {

    it('边界值:最小合理配置', () => {
      // Arrange: 使用默认值的50%作为最小合理值
      const config = {
        bronzeTotalSales: 1000000,    // 10000元 (默认值2万的50%)
        silverMonthSales: 2500000,    // 25000元 (默认值5万的50%)
        silverTeamCount: 25,          // 25人 (默认值50人的50%)
        goldMonthSales: 5000000,      // 50000元 (默认值10万的50%)
        goldTeamCount: 100             // 100人 (默认值200人的50%)
      };

      // Act
      const result = validateSystemConfig(config);

      // Assert
      assert.strictEqual(result.valid, true, '边界最小值应该接受');

      console.log('✅ 边界最小值配置验证通过');
    });

    it('应该拒绝过小的配置', () => {
      // Arrange
      const config = {
        bronzeTotalSales: 999999  // 小于最小值1000000
      };

      // Act
      const result = validateSystemConfig(config);

      // Assert
      assert.strictEqual(result.valid, false, '过小配置应该拒绝');
      assert.ok(result.errors.some(e => e.field === 'totalSales'), '应该有totalSales错误');

      console.log('✅ 正确拒绝过小的累计销售额配置');
    });

    it('应该警告远小于默认值的配置', () => {
      // Arrange: 只有默认值的5%
      const config = {
        bronzeTotalSales: 100000  // 2万的5% = 1000元 (小于MIN_ACCEPTABLE_RATIO=0.5)
      };

      // Act
      const result = validateSystemConfig(config);

      // Assert
      assert.strictEqual(result.valid, false, '远小于默认值应该拒绝(不是警告)');
      assert.ok(result.errors.some(e => e.severity === 'error'), '应该是error级别,不是warning');

      console.log('✅ 正确拒绝远小于默认值的配置');
    });
  });

  describe('实际应用场景', () => {

    it('场景1: 检测修复前的错误配置', () => {
      // Arrange: 模拟可能存在于数据库中的修复前错误配置
      const problematicConfig = {
        bronzeTotalSales: 200000,    // 2000元 (错误!)
        silverMonthSales: 500000,    // 5000元 (错误!)
        goldMonthSales: 1000000      // 10000元 (错误!)
      };

      // Act
      const result = validateSystemConfig(problematicConfig);

      // Assert
      assert.strictEqual(result.valid, false, '错误配置应该验证失败');

      console.log('✅ 场景1: 检测到修复前的错误配置');
      console.log(`   发现 ${result.errors.length + result.warnings.length} 个配置问题`);
      result.errors.forEach(err => console.log(`   - ${err.message}`));
      result.warnings.forEach(warn => console.log(`   - ${warn.message}`));
    });

    it('场景2: 验证当前正确的默认配置', () => {
      // Arrange: 当前系统的正确默认值
      const currentConfig = {
        bronzeTotalSales: DEFAULT_THRESHOLDS.LEVEL_4_TO_3.totalSales,
        silverMonthSales: DEFAULT_THRESHOLDS.LEVEL_3_TO_2.monthSales,
        silverTeamCount: DEFAULT_THRESHOLDS.LEVEL_3_TO_2.teamCount,
        goldMonthSales: DEFAULT_THRESHOLDS.LEVEL_2_TO_1.monthSales,
        goldTeamCount: DEFAULT_THRESHOLDS.LEVEL_2_TO_1.teamCount
      };

      // Act
      const result = validateSystemConfig(currentConfig);

      // Assert
      assert.strictEqual(result.valid, true, '当前默认配置应该完全通过验证');
      assert.strictEqual(result.warnings.length, 0, '不应该有任何警告');

      console.log('✅ 场景2: 当前默认配置验证通过');
    });

    it('场景3: 管理员自定义更高门槛', () => {
      // Arrange: 管理员将门槛提高50%
      const customConfig = {
        bronzeTotalSales: 3000000,   // 3万元 (提高50%)
        silverMonthSales: 7500000,   // 7.5万元 (提高50%)
        silverTeamCount: 75,         // 75人 (提高50%)
        goldMonthSales: 15000000,    // 15万元 (提高50%)
        goldTeamCount: 300           // 300人 (提高50%)
      };

      // Act
      const result = validateSystemConfig(customConfig);

      // Assert
      assert.strictEqual(result.valid, true, '合理的自定义配置应该通过');

      console.log('✅ 场景3: 管理员自定义更高门槛验证通过');
    });
  });
});

// ==================== 导出 ====================

module.exports = {
  DEFAULT_THRESHOLDS,
  VALIDATION_RULES,
  validateThreshold,
  validateSystemConfig
};
