/**
 * 分销系统测试配置
 * Promotion System Test Configuration
 */

module.exports = {
  // 佣金比例配置 (单位: %)
  commission: {
    // 基础佣金比例（按代理层级）
    basic: {
      level1: 10,  // 一级代理
      level2: 6,   // 二级代理
      level3: 3,   // 三级代理
      level4: 1,   // 四级代理
      total: 20    // 总佣金比例
    },

    // 复购奖励（星级≥1的上级）
    repurchase: {
      rate: 3,     // 3% 复购奖励
      minStarLevel: 1
    },

    // 团队管理奖（星级≥2的上级）
    management: {
      rate: 2,     // 2% 管理奖
      minStarLevel: 2,
      type: 'level-difference'  // 级差分配
    },

    // 育成津贴（给导师）
    nurture: {
      rate: 2,     // 2% 育成津贴
      minStarLevel: 2
    }
  },

  // 晋升门槛配置
  promotion: {
    // 普通会员 → 铜牌推广员
    bronze: {
      starLevel: 1,
      totalSales: 2000000,  // 20,000元 (单位: 分)
      directCount: 30       // 30人
    },

    // 铜牌 → 银牌推广员
    silver: {
      starLevel: 2,
      monthSales: 5000000,  // 50,000元 (本月销售)
      teamCount: 100        // 100人 (团队人数)
    },

    // 银牌 → 金牌推广员
    gold: {
      starLevel: 3,
      monthSales: 20000000, // 200,000元 (本月销售)
      teamCount: 500        // 500人 (团队人数)
    }
  },

  // 测试配置
  test: {
    // 是否使用真实云函数
    useCloudFunction: false,

    // 测试环境标识
    testEnv: 'test',

    // 测试数据前缀
    testDataPrefix: 'TEST_',

    // 是否清理测试数据
    cleanupAfterTest: true
  },

  // 数据库集合名称
  collections: {
    users: 'users',
    promotionRelations: 'promotion_relations',
    promotionOrders: 'promotion_orders',
    rewardRecords: 'reward_records',
    orders: 'orders'
  }
};
