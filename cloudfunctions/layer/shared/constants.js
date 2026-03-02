/**
 * 业务常量配置（共享版本）
 *
 * 功能：
 * - 集中管理所有硬编码的数字和字符串
 * - 提供语义化的常量名称
 * - 便于维护和修改
 *
 * 注意：此文件是共享版本，promotion 云函数有自己的副本
 *
 * 更新记录：
 * - 2026年2月：重构为单一四级代理制，移除双轨制和四重分润
 */

// ==================== 时间常量 ====================

const Time = {
  // 毫秒
  SECOND_MS: 1000,
  MINUTE_MS: 60 * 1000,           // 60,000
  HOUR_MS: 60 * 60 * 1000,      // 3,600,000
  DAY_MS: 24 * 60 * 60 * 1000,  // 86,400,000
  WEEK_MS: 7 * 24 * 60 * 60 * 1000,

  // 时间单位（用于计算）
  SECONDS_PER_MINUTE: 60,
  MINUTES_PER_HOUR: 60,
  HOURS_PER_DAY: 24,
  DAYS_PER_WEEK: 7
};

// ==================== 代理等级常量（唯一等级体系）====================
// 等级说明：
// - 内部名称：总公司/一级代理/二级代理/三级代理/四级代理
// - 对外名称：总公司/金牌推广员/银牌推广员/铜牌推广员/普通会员
// - 这是同一套体系，只是叫法不同

const AgentLevel = {
  HEAD_OFFICE: 0,    // 总公司
  LEVEL_1: 1,         // 一级代理 = 金牌推广员
  LEVEL_2: 2,         // 二级代理 = 银牌推广员
  LEVEL_3: 3,         // 三级代理 = 铜牌推广员
  LEVEL_4: 4,         // 四级代理 = 普通会员

  MAX_LEVEL: 4,       // 最大代理层级
  MIN_LEVEL: 1        // 最小代理层级（一级）
};

// 代理等级内部名称（用于后台管理）
const AgentLevelInternalNames = {
  [AgentLevel.HEAD_OFFICE]: '总公司',
  [AgentLevel.LEVEL_1]: '一级代理',
  [AgentLevel.LEVEL_2]: '二级代理',
  [AgentLevel.LEVEL_3]: '三级代理',
  [AgentLevel.LEVEL_4]: '四级代理'
};

// 代理等级对外名称（用于用户展示）
const AgentLevelDisplayNames = {
  [AgentLevel.HEAD_OFFICE]: '总公司',
  [AgentLevel.LEVEL_1]: '金牌推广员',
  [AgentLevel.LEVEL_2]: '银牌推广员',
  [AgentLevel.LEVEL_3]: '铜牌推广员',
  [AgentLevel.LEVEL_4]: '普通会员'
};

// ==================== 订单状态常量 ====================

const OrderStatus = {
  PENDING: 'pending',           // 待支付
  PAID: 'paid',               // 已支付
  SHIPPING: 'shipping',         // 配送中
  COMPLETED: 'completed',       // 已完成
  CANCELLED: 'cancelled',       // 已取消
  REFUNDED: 'refunded'          // 已退款
};

// ==================== 金额精度常量 ====================

const Amount = {
  PRECISION: 100,              // 金额精度（分）
  MIN_REWARD: 1,               // 最小奖励金额（分）
  MAX_CART_QUANTITY: 999,      // 购物车最大数量
  MIN_CART_QUANTITY: 1,        // 购物车最小数量

  // 金额容忍度（分）
  PRICE_TOLERANCE: 100,        // 1元
};

// ==================== 佣金规则（核心业务逻辑）====================
// 规则说明：
// - 每笔订单的 20% 作为佣金池
// - 佣金分配取决于推广人的代理等级
// - 公司拿 80%
// - 佣金规则来源：docs/system/推广体系商业说明.md

const Commission = {
  // 公司分成
  COMPANY_SHARE: 0.80,  // 公司拿80%

  // 佣金池
  COMMISSION_POOL: 0.20,  // 佣金池20%

  // 佣金分配规则（根据推广人的代理等级）
  // own: 推广人自己拿的比例
  // upstream: 上级代理拿的比例数组（从近到远，即第1个元素是直接上级）
  //
  // 业务规则（来源：推广体系商业说明.md）：
  // - 一级推广：自己拿20%
  // - 二级推广：自己拿12%，一级拿8%
  // - 三级推广：自己拿12%，二级拿4%，一级拿4%
  // - 四级推广：自己拿8%，三级拿4%，二级拿4%，一级拿4%
  RULES: {
    [AgentLevel.LEVEL_1]: {
      own: 0.20,        // 一级代理推广：自己拿20%
      upstream: []       // 无上级
    },
    [AgentLevel.LEVEL_2]: {
      own: 0.12,        // 二级代理推广：自己拿12%
      upstream: [0.08]  // 直接上级（一级代理）拿8%
    },
    [AgentLevel.LEVEL_3]: {
      own: 0.12,        // 三级代理推广：自己拿12%（修复：原为0.08）
      upstream: [0.04, 0.04]  // 直接上级（二级代理）拿4%，再上级（一级代理）拿4%（修复：原为[0.04, 0.08]）
    },
    [AgentLevel.LEVEL_4]: {
      own: 0.08,        // 四级代理推广：自己拿8%
      upstream: [0.04, 0.04, 0.04]  // 三级代理拿4%，二级代理拿4%，一级代理拿4%
    }
  }
};

// ==================== 防刷限制常量 ====================

const AntiFraud = {
  // IP 限制
  MAX_REGISTRATIONS_PER_IP: 3,           // 同IP 24小时内最多注册数
  MAX_REGISTRATIONS_PER_DEVICE: 2,       // 同设备24小时内最多注册数
  IP_LIMIT_WINDOW_HOURS: 24,             // IP限制时间窗口（小时）
  REGISTRATION_ATTEMPT_TTL_DAYS: 7,      // 注册尝试记录保留时间（天）

  // 邀请码
  INVITE_CODE_LENGTH: 8,                 // 邀请码长度
  INVITE_CODE_MAX_RETRY: 10,             // 邀请码生成最大重试次数
  INVITE_CODE_CHARS: 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', // 排除易混淆字符
};

// ==================== 晋升门槛常量 ====================
// 晋升规则：
// - 四级→三级（普通→铜牌）：累计销售额 >= 2,000元（文档：2万元，代码使用20000分=200元，这里修正为200000分=2000元）
// - 三级→二级（铜牌→银牌）：本月销售额 >= 5,000元 或 团队人数 >= 50人
// - 二级→一级（银牌→金牌）：本月销售额 >= 10,000元 或 团队人数 >= 200人
// 注：金额单位为分

const PromotionThreshold = {
  // 四级 → 三级（普通 → 铜牌）
  LEVEL_4_TO_3: {
    totalSales: 200000      // 累计销售额 >= 2,000元（分）
  },

  // 三级 → 二级（铜牌 → 银牌）
  LEVEL_3_TO_2: {
    monthSales: 500000,     // 本月销售额 >= 5,000元（分）
    teamCount: 50           // 或团队人数 >= 50人
  },

  // 二级 → 一级（银牌 → 金牌）
  LEVEL_2_TO_1: {
    monthSales: 1000000,    // 本月销售额 >= 10,000元（分）
    teamCount: 200          // 或团队人数 >= 200人
  }
};

// ==================== 跟随升级机制 ====================
// 当上级升级时，原直接下级可以跟随升级
// - 上级 4→3：无下级跟随（但可发展新的四级）
// - 上级 3→2：之前带的四级 → 三级
// - 上级 2→1：之前带的三级→二级，四级→三级

const FollowPromotionRules = {
  [AgentLevel.LEVEL_3]: {
    // 上级升到三级时，无下级跟随
    subordinateUpgrade: null
  },
  [AgentLevel.LEVEL_2]: {
    // 上级升到二级时，原四级下级升到三级
    subordinateUpgrade: {
      fromLevel: AgentLevel.LEVEL_4,
      toLevel: AgentLevel.LEVEL_3
    }
  },
  [AgentLevel.LEVEL_1]: {
    // 上级升到一级时，原三级下级升到二级，原四级下级升到三级
    subordinateUpgrade: [
      { fromLevel: AgentLevel.LEVEL_3, toLevel: AgentLevel.LEVEL_2 },
      { fromLevel: AgentLevel.LEVEL_4, toLevel: AgentLevel.LEVEL_3 }
    ]
  }
};

// ==================== 数据库集合名称 ====================

const Collections = {
  USERS: 'users',
  USER_WALLETS: 'user_wallets',
  WALLET_TRANSACTIONS: 'wallet_transactions',
  ORDERS: 'orders',
  PROMOTION_ORDERS: 'promotion_orders',
  PROMOTION_RELATIONS: 'promotion_relations',
  REWARD_RECORDS: 'reward_records',
  REGISTRATION_ATTEMPTS: 'registration_attempts',
  PRODUCTS: 'products',
  COUPONS: 'coupons',
  USER_COUPONS: 'user_coupons'
};

// ==================== 日志级别常量 ====================

const LogLevel = {
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error'
};

// ==================== 奖励类型常量 ====================

const RewardType = {
  COMMISSION: 'commission'  // 只有一种奖励类型：佣金
};

const RewardTypeNames = {
  [RewardType.COMMISSION]: '推广佣金'
};

// ==================== 辅助函数 ====================

/**
 * 获取佣金分配规则
 * @param {number} level - 代理层级 (1-4)
 * @returns {Object} 佣金规则 { own, upstream }
 */
function getCommissionRule(level) {
  return Commission.RULES[level] || Commission.RULES[AgentLevel.LEVEL_4];
}

/**
 * 获取代理层级内部名称
 * @param {number} level - 代理层级
 * @returns {string} 内部名称
 */
function getAgentLevelInternalName(level) {
  return AgentLevelInternalNames[level] || '四级代理';
}

/**
 * 获取代理层级对外名称
 * @param {number} level - 代理层级
 * @returns {string} 对外名称
 */
function getAgentLevelDisplayName(level) {
  return AgentLevelDisplayNames[level] || '普通会员';
}

/**
 * 获取晋升门槛配置
 * @param {number} currentLevel - 当前等级
 * @returns {Object|null} 晋升门槛配置
 */
function getPromotionThreshold(currentLevel) {
  const thresholdMap = {
    [AgentLevel.LEVEL_4]: PromotionThreshold.LEVEL_4_TO_3,
    [AgentLevel.LEVEL_3]: PromotionThreshold.LEVEL_3_TO_2,
    [AgentLevel.LEVEL_2]: PromotionThreshold.LEVEL_2_TO_1
  };
  return thresholdMap[currentLevel] || null;
}

/**
 * 计算IP限制时间窗口（毫秒）
 * @returns {number} 时间窗口
 */
function getIpLimitWindow() {
  return AntiFraud.IP_LIMIT_WINDOW_HOURS * Time.HOUR_MS;
}

/**
 * 获取跟随升级规则
 * @param {number} newLevel - 升级后的等级
 * @returns {Object|Array|null} 跟随升级规则
 */
function getFollowPromotionRule(newLevel) {
  return FollowPromotionRules[newLevel] || null;
}

// ==================== 导出 ====================

module.exports = {
  // 时间常量
  Time,

  // 代理等级
  AgentLevel,
  AgentLevelInternalNames,
  AgentLevelDisplayNames,

  // 订单状态
  OrderStatus,

  // 金额
  Amount,

  // 佣金规则
  Commission,

  // 防刷
  AntiFraud,

  // 晋升门槛
  PromotionThreshold,

  // 跟随升级
  FollowPromotionRules,

  // 数据库集合
  Collections,

  // 日志级别
  LogLevel,

  // 奖励类型
  RewardType,
  RewardTypeNames,

  // 辅助函数
  getCommissionRule,
  getAgentLevelInternalName,
  getAgentLevelDisplayName,
  getPromotionThreshold,
  getIpLimitWindow,
  getFollowPromotionRule
};
