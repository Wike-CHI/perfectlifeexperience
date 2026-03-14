/**
 * 系统默认配置
 *
 * 用途：
 * 1. 首次初始化时写入数据库
 * 2. 数据库查询失败时的降级值
 * 3. 统一管理所有默认值，避免分散硬编码
 */

/**
 * 佣金配置默认值
 */
const DEFAULT_COMMISSION_CONFIG = {
  type: 'commission_config',

  // 佣金比例（百分比）
  level1Commission: 20,  // 一级代理（金牌）
  level2Commission: 12,  // 二级代理（银牌）
  level3Commission: 12,  // 三级代理（铜牌）
  level4Commission: 8,   // 四级代理（普通）

  // 晋升阈值（单位：分）
  bronzeTotalSales: 2000000,   // 普通→铜牌：20000元 = 2000000分
  silverMonthSales: 5000000,   // 铜牌→银牌：50000元 = 5000000分
  silverTeamCount: 50,         // 铜牌→银牌：50人
  goldMonthSales: 10000000,    // 银牌→金牌：100000元 = 10000000分
  goldTeamCount: 200,          // 银牌→金牌：200人

  // 提现配置（单位：分）
  minWithdrawAmount: 100,      // 最低提现：1元 = 100分
  maxWithdrawAmount: 50000,    // 最大提现：500元 = 50000分
  maxDailyWithdraws: 3,        // 每日提现次数：3次
  withdrawFeeRate: 0,          // 手续费率：0%

  // 充值配置（无赠送）
  rechargeOptions: [
    { amount: 100, gift: 0 },
    { amount: 200, gift: 0 },
    { amount: 500, gift: 0 },
    { amount: 1000, gift: 0 },
    { amount: 2000, gift: 0 }
  ],

  // upgradeConditions（新字段结构）
  upgradeConditions: {
    '4to3': { totalSales: 2000000 },      // 普通→铜牌
    '3to2': {                            // 铜牌→银牌
      monthSales: 5000000,
      teamCount: 50
    },
    '2to1': {                            // 银牌→金牌
      monthSales: 10000000,
      teamCount: 200
    }
  }
};

/**
 * 确保系统配置已初始化
 *
 * 用法：在云函数启动时调用，确保数据库中有配置
 *
 * @param {Database} db - 数据库实例
 * @returns {Promise<Object>} 配置对象
 */
async function ensureSystemConfig(db) {
  try {
    // 查询现有配置
    const result = await db.collection('system_config')
      .where({ type: 'commission_config' })
      .limit(1)
      .get();

    if (result.data && result.data.length > 0) {
      // 配置已存在，直接返回
      return result.data[0];
    }

    // 配置不存在，初始化默认配置
    console.log('Initializing default commission config...');

    const newConfig = {
      ...DEFAULT_COMMISSION_CONFIG,
      createTime: db.serverDate(),
      updateTime: db.serverDate()
    };

    await db.collection('system_config').add({ data: newConfig });

    console.log('Default commission config initialized successfully');

    return newConfig;
  } catch (error) {
    console.error('Failed to ensure system config:', error);
    throw error;
  }
}

/**
 * 获取系统配置（带降级处理）
 *
 * 用法：在需要读取配置时调用，如果数据库查询失败则返回默认值
 *
 * @param {Database} db - 数据库实例
 * @returns {Promise<Object>} 配置对象
 */
async function getSystemConfigWithFallback(db) {
  try {
    const result = await db.collection('system_config')
      .where({ type: 'commission_config' })
      .limit(1)
      .get();

    if (result.data && result.data.length > 0) {
      return result.data[0];
    }

    // 数据库中没有配置，返回默认值（不写入数据库）
    console.warn('No config found in database, using default values');
    return DEFAULT_COMMISSION_CONFIG;
  } catch (error) {
    console.error('Failed to read config from database, using default values:', error);
    // 数据库查询失败，返回默认值
    return DEFAULT_COMMISSION_CONFIG;
  }
}

module.exports = {
  DEFAULT_COMMISSION_CONFIG,
  ensureSystemConfig,
  getSystemConfigWithFallback
};
