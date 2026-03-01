/**
 * 业务常量配置（订单模块）
 *
 * 简化版推广分销系统：
 * - 单轨四级代理制（无星级）
 * - 仅推广佣金（无复购奖励、团队管理奖、育成津贴）
 * - 晋升条件：团队人数 + 销售额（无直推人数要求）
 */

// ==================== 时间常量 ====================

const Time = {
  SECOND_MS: 1000,
  MINUTE_MS: 60 * 1000,
  HOUR_MS: 60 * 60 * 1000,
  DAY_MS: 24 * 60 * 60 * 1000,
  WEEK_MS: 7 * 24 * 60 * 60 * 1000,

  SECONDS_PER_MINUTE: 60,
  MINUTES_PER_HOUR: 60,
  HOURS_PER_DAY: 24,
  DAYS_PER_WEEK: 7
};

// ==================== 代理等级常量 ====================

const AgentLevel = {
  LEVEL_1: 1,    // 金牌推广员
  LEVEL_2: 2,    // 银牌推广员
  LEVEL_3: 3,    // 铜牌推广员
  LEVEL_4: 4,    // 普通会员

  MIN_LEVEL: 1,
  MAX_LEVEL: 4
};

// 代理等级名称
const AgentLevelNames = {
  [AgentLevel.LEVEL_1]: '金牌推广员',
  [AgentLevel.LEVEL_2]: '银牌推广员',
  [AgentLevel.LEVEL_3]: '铜牌推广员',
  [AgentLevel.LEVEL_4]: '普通会员'
};

// ==================== 订单状态常量 ====================

const OrderStatus = {
  PENDING: 'pending',
  PAID: 'paid',
  SHIPPING: 'shipping',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded'
};

// ==================== 金额精度常量 ====================

const Amount = {
  PRECISION: 100,
  MIN_REWARD: 1,
  MAX_CART_QUANTITY: 999,
  MIN_CART_QUANTITY: 1,
  PRICE_TOLERANCE: 100
};

// ==================== 佣金规则 ====================
// 规则来源：docs/system/推广体系商业说明.md
// - 一级推广：自己拿20%
// - 二级推广：自己拿12%，一级拿8%
// - 三级推广：自己拿12%，二级拿4%，一级拿4%
// - 四级推广：自己拿8%，三级拿4%，二级拿4%，一级拿4%

const Commission = {
  // 佣金分配规则（按推广人等级）
  // own: 推广人自己获得的佣金比例
  // upstream: 各级上级获得的佣金比例（按距离推广人的远近排序）
  RULES: {
    [AgentLevel.LEVEL_1]: { own: 0.20, upstream: [] },
    [AgentLevel.LEVEL_2]: { own: 0.12, upstream: [0.08] },
    [AgentLevel.LEVEL_3]: { own: 0.12, upstream: [0.04, 0.04] },  // 修复：原为0.08和[0.04, 0.08]
    [AgentLevel.LEVEL_4]: { own: 0.08, upstream: [0.04, 0.04, 0.04] }
  }
};

// ==================== 晋升门槛常量 ====================

const PromotionThreshold = {
  // 晋升铜牌 (4级 → 3级)
  BRONZE: {
    TOTAL_SALES: 100000    // 累计销售额 >= 1,000元（分）
  },

  // 晋升银牌 (3级 → 2级)
  SILVER: {
    MONTH_SALES: 500000,   // 本月销售额 >= 5,000元（分）
    TEAM_COUNT: 30         // 或团队人数 >= 30人
  },

  // 晋升金牌 (2级 → 1级)
  GOLD: {
    MONTH_SALES: 2000000,  // 本月销售额 >= 20,000元（分）
    TEAM_COUNT: 100        // 或团队人数 >= 100人
  }
};

// ==================== 防刷限制常量 ====================

const AntiFraud = {
  MAX_REGISTRATIONS_PER_IP: 3,
  IP_LIMIT_WINDOW_HOURS: 24,
  REGISTRATION_ATTEMPT_TTL_DAYS: 7,
  INVITE_CODE_LENGTH: 8,
  INVITE_CODE_MAX_RETRY: 10,
  INVITE_CODE_CHARS: 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
};

// ==================== 数据库集合名称 ====================

const Collections = {
  USERS: 'users',
  USER_WALLETS: 'user_wallets',
  WALLET_TRANSACTIONS: 'wallet_transactions',
  COMMISSION_WALLETS: 'commission_wallets',
  COMMISSION_TRANSACTIONS: 'commission_transactions',
  ORDERS: 'orders',
  PROMOTION_ORDERS: 'promotion_orders',
  PROMOTION_RELATIONS: 'promotion_relations',
  REWARD_RECORDS: 'reward_records',
  REGISTRATION_ATTEMPTS: 'registration_attempts',
  PRODUCTS: 'products',
  COUPONS: 'coupons',
  USER_COUPONS: 'user_coupons'
};

// ==================== 奖励类型 ====================

const RewardType = {
  COMMISSION: 'commission'  // 推广佣金
};

const RewardTypeNames = {
  [RewardType.COMMISSION]: '推广佣金'
};

// ==================== 日志级别常量 ====================

const LogLevel = {
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error'
};

// ==================== 辅助函数 ====================

function getIpLimitWindow() {
  return AntiFraud.IP_LIMIT_WINDOW_HOURS * Time.HOUR_MS;
}

function getAgentLevelName(level) {
  return AgentLevelNames[level] || '普通会员';
}

function getCommissionRule(level) {
  return Commission.RULES[level] || Commission.RULES[AgentLevel.LEVEL_4];
}

module.exports = {
  Time,
  AgentLevel,
  AgentLevelNames,
  OrderStatus,
  Amount,
  Commission,
  PromotionThreshold,
  AntiFraud,
  Collections,
  RewardType,
  RewardTypeNames,
  LogLevel,
  getIpLimitWindow,
  getAgentLevelName,
  getCommissionRule
};
