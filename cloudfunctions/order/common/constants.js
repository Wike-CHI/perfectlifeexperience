/**
 * 业务常量配置
 *
 * 功能：
 * - 集中管理所有硬编码的数字和字符串
 * - 提供语义化的常量名称
 * - 便于维护和修改
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

// ==================== 代理等级常量 ====================

const AgentLevel = {
  HEAD_OFFICE: 0,    // 总公司
  LEVEL_1: 1,         // 一级代理
  LEVEL_2: 2,         // 二级代理
  LEVEL_3: 3,         // 三级代理
  LEVEL_4: 4,         // 四级代理

  MAX_LEVEL: 4         // 最大代理层级
};

// ==================== 星级常量 ====================

const StarLevel = {
  NORMAL: 0,          // 普通会员
  BRONZE: 1,          // 铜牌推广员
  SILVER: 2,          // 银牌推广员
  GOLD: 3,             // 金牌推广员

  MAX_LEVEL: 3         // 最高星级
};

// ==================== 订单状态常量 ====================

const OrderStatus = {
  PENDING: 'pending',           // 待支付
  PAID: 'paid',               // 已支付
  SHIPPING: 'shipping',         // 配送中
  COMPLETED: 'completed',       // 已完成
  CANCELLED: 'cancelled'       // 已取消
  REFUNDED: 'refunded'         // 已退款
};

// ==================== 金额精度常量 ====================

const Amount = {
  PRECISION: 100,              // 金额精度（分）
  MIN_REWARD: 1,              // 最小奖励金额（分）
  MAX_CART_QUANTITY: 999,       // 购物车最大数量
  MIN_CART_QUANTITY: 1,         // 购物车最小数量

  // 金额容忍度（分）
  PRICE_TOLERANCE: 100,         // 1元
};

// ==================== 推广比例常量 ====================

const PromotionRatio = {
  // 基础佣金（按代理层级）
  COMMISSION: {
    HEAD_OFFICE: 0.25,    // 25%
    LEVEL_1: 0.20,        // 20%
    LEVEL_2: 0.15,        // 15%
    LEVEL_3: 0.10,        // 10%
    LEVEL_4: 0.05         // 5%
  },

  // 其他奖励
  REPURCHASE: 0.03,        // 3% 复购奖励
  MANAGEMENT: 0.02,       // 2% 团队管理奖
  NURTURE: 0.02           // 2% 育成津贴
};

// ==================== 防刷限制常量 ====================

const AntiFraud = {
  // IP 限制
  MAX_REGISTRATIONS_PER_IP: 3,           // 同IP 24小时内最多注册数
  IP_LIMIT_WINDOW_HOURS: 24,            // IP限制时间窗口（小时）
  REGISTRATION_ATTEMPT_TTL_DAYS: 7,    // 注册尝试记录保留时间（天）

  // 邀请码
  INVITE_CODE_LENGTH: 8,               // 邀请码长度
  INVITE_CODE_MAX_RETRY: 10,            // 邀请码生成最大重试次数
  INVITE_CODE_CHARS: 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', // 排除易混淆字符
};

// ==================== 晋升门槛常量 ====================

const PromotionThreshold = {
  // 晋升铜牌 (Star 0 -> 1)
  BRONZE: {
    TOTAL_SALES: 2000000,      // 累计销售额 >= 20,000元（分）
    DIRECT_COUNT: 30             // 或直推有效人数 >= 30人
  },

  // 晋升银牌 (Star 1 -> 2)
  SILVER: {
    MONTH_SALES: 5000000,     // 本月销售额 >= 50,000元（分）
    TEAM_COUNT: 50              // 或团队人数 >= 50人
  },

  // 晋升金牌 (Star 2 -> 3)
  GOLD: {
    MONTH_SALES: 10000000,    // 本月销售额 >= 100,000元（分）
    TEAM_COUNT: 200             // 或团队人数 >= 200人
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

// ==================== 辅助函数 ====================

/**
 * 计算IP限制时间窗口（毫秒）
 * @returns {number} 时间窗口
 */
function getIpLimitWindow() {
  return AntiFraud.IP_LIMIT_WINDOW_HOURS * Time.HOUR_MS;
}

/**
 * 获取代理层级佣金比例
 * @param {number} level - 代理层级
 * @returns {number} 佣金比例
 */
function getCommissionRatio(level) {
  const ratioMap = {
    [AgentLevel.HEAD_OFFICE]: PromotionRatio.COMMISSION.HEAD_OFFICE,
    [AgentLevel.LEVEL_1]: PromotionRatio.COMMISSION.LEVEL_1,
    [AgentLevel.LEVEL_2]: PromotionRatio.COMMISSION.LEVEL_2,
    [AgentLevel.LEVEL_3]: PromotionRatio.COMMISSION.LEVEL_3,
    [AgentLevel.LEVEL_4]: PromotionRatio.COMMISSION.LEVEL_4
  };
  return ratioMap[level] || PromotionRatio.COMMISSION.LEVEL_4;
}

/**
 * 获取星级名称
 * @param {number} level - 星级
 * @returns {string} 星级名称
 */
function getStarLevelName(level) {
  const nameMap = {
    [StarLevel.NORMAL]: '普通会员',
    [StarLevel.BRONZE]: '铜牌推广员',
    [StarLevel.SILVER]: '银牌推广员',
    [StarLevel.GOLD]: '金牌推广员'
  };
  return nameMap[level] || '普通会员';
}

/**
 * 获取代理层级名称
 * @param {number} level - 代理层级
 * @returns {string} 层级名称
 */
function getAgentLevelName(level) {
  const nameMap = {
    [AgentLevel.HEAD_OFFICE]: '总公司',
    [AgentLevel.LEVEL_1]: '一级代理',
    [AgentLevel.LEVEL_2]: '二级代理',
    [AgentLevel.LEVEL_3]: '三级代理',
    [AgentLevel.LEVEL_4]: '四级代理'
  };
  return nameMap[level] || '四级代理';
}

module.exports = {
  Time,
  AgentLevel,
  StarLevel,
  OrderStatus,
  Amount,
  PromotionRatio,
  AntiFraud,
  PromotionThreshold,
  Collections,
  LogLevel,
  getIpLimitWindow,
  getCommissionRatio,
  getStarLevelName,
  getAgentLevelName
};
