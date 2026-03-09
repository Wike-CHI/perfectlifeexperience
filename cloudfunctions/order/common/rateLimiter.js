/**
 * 请求频率限制模块
 *
 * 用于防止恶意请求和DoS攻击
 * 支持基于IP和用户openid的频率限制
 *
 * 使用方法：
 * const { checkRateLimit } = require('./common/rateLimiter');
 * const result = await checkRateLimit(db, 'createOrder', openid, clientIP);
 * if (!result.allowed) {
 *   return error(ErrorCodes.RATE_LIMIT_EXCEEDED, result.message);
 * }
 */

const { Time } = require('./constants');

// ==================== 频率限制配置 ====================

/**
 * 不同操作的频率限制配置
 * windowMs: 时间窗口（毫秒）
 * maxRequests: 最大请求次数
 */
const RateLimitConfig = {
  // 订单相关
  createOrder: {
    windowMs: Time.MINUTE_MS,        // 1分钟
    maxRequests: 10,                  // 最多10次
    message: '订单创建过于频繁，请稍后再试'
  },
  cancelOrder: {
    windowMs: Time.MINUTE_MS,
    maxRequests: 20,
    message: '订单取消操作过于频繁'
  },

  // 退款相关
  applyRefund: {
    windowMs: Time.MINUTE_MS * 5,    // 5分钟
    maxRequests: 5,
    message: '退款申请过于频繁，请稍后再试'
  },

  // 提现相关
  applyWithdraw: {
    windowMs: Time.HOUR_MS,          // 1小时
    maxRequests: 3,
    message: '提现申请过于频繁，每小时最多3次'
  },

  // 支付相关
  createPayment: {
    windowMs: Time.MINUTE_MS,
    maxRequests: 15,
    message: '支付请求过于频繁，请稍后再试'
  },
  createRechargePayment: {
    windowMs: Time.MINUTE_MS,
    maxRequests: 10,
    message: '充值请求过于频繁，请稍后再试'
  },

  // 推广相关
  bindPromotion: {
    windowMs: Time.HOUR_MS,
    maxRequests: 10,
    message: '推广关系绑定过于频繁'
  },

  // 用户相关
  updateUserInfo: {
    windowMs: Time.MINUTE_MS,
    maxRequests: 30,
    message: '用户信息更新过于频繁'
  },

  // 通用（默认配置）
  default: {
    windowMs: Time.MINUTE_MS,
    maxRequests: 60,
    message: '请求过于频繁，请稍后再试'
  }
};

// 集合名称
const RATE_LIMIT_COLLECTION = 'rate_limits';

/**
 * 检查请求频率限制
 *
 * @param {object} db - 数据库实例
 * @param {string} action - 操作类型
 * @param {string} openid - 用户openid
 * @param {string} clientIP - 客户端IP地址
 * @param {object} options - 可选配置
 * @param {number} options.customMaxRequests - 自定义最大请求次数
 * @param {number} options.customWindowMs - 自定义时间窗口
 * @returns {Promise<{allowed: boolean, message: string, remaining: number, resetTime: Date}>}
 */
async function checkRateLimit(db, action, openid, clientIP, options = {}) {
  const config = RateLimitConfig[action] || RateLimitConfig.default;
  const maxRequests = options.customMaxRequests || config.maxRequests;
  const windowMs = options.customWindowMs || config.windowMs;

  const now = new Date();
  const windowStart = new Date(now.getTime() - windowMs);

  // 生成唯一标识符（用户+操作+IP的组合）
  const identifier = `${action}:${openid}:${clientIP || 'unknown'}`;

  try {
    // 查询时间窗口内的请求次数
    const collection = db.collection(RATE_LIMIT_COLLECTION);
    const result = await collection
      .where({
        identifier: identifier,
        timestamp: db.command.gte(windowStart)
      })
      .count();

    const currentCount = result.total;

    // 检查是否超过限制
    if (currentCount >= maxRequests) {
      return {
        allowed: false,
        message: config.message,
        remaining: 0,
        resetTime: new Date(windowStart.getTime() + windowMs)
      };
    }

    // 记录本次请求
    await collection.add({
      data: {
        identifier: identifier,
        action: action,
        openid: openid,
        clientIP: clientIP || 'unknown',
        timestamp: now,
        expireAt: new Date(now.getTime() + windowMs * 2) // 过期时间，用于清理
      }
    });

    return {
      allowed: true,
      message: 'OK',
      remaining: maxRequests - currentCount - 1,
      resetTime: new Date(windowStart.getTime() + windowMs)
    };
  } catch (error) {
    console.error('[RateLimiter] 检查频率限制失败:', error);
    // 降级处理：数据库错误时允许请求通过，避免影响正常业务
    // 记录错误但不阻塞用户操作
    return {
      allowed: true,
      message: 'OK (rate limit check failed, allowed by fallback)',
      remaining: 999,
      resetTime: null,
      error: error.message
    };
  }
}

/**
 * 清理过期的频率限制记录
 * 建议定期调用（如每天一次）
 *
 * @param {object} db - 数据库实例
 * @returns {Promise<{success: boolean, deletedCount: number}>}
 */
async function cleanupExpiredRecords(db) {
  try {
    const now = new Date();
    const collection = db.collection(RATE_LIMIT_COLLECTION);

    const result = await collection
      .where({
        expireAt: db.command.lt(now)
      })
      .remove();

    console.log(`[RateLimiter] 清理了 ${result.removed} 条过期记录`);
    return {
      success: true,
      deletedCount: result.removed
    };
  } catch (error) {
    console.error('[RateLimiter] 清理过期记录失败:', error);
    return {
      success: false,
      deletedCount: 0
    };
  }
}

/**
 * 获取用户的频率限制状态
 *
 * @param {object} db - 数据库实例
 * @param {string} action - 操作类型
 * @param {string} openid - 用户openid
 * @param {string} clientIP - 客户端IP地址
 * @returns {Promise<{current: number, max: number, resetTime: Date}>}
 */
async function getRateLimitStatus(db, action, openid, clientIP) {
  const config = RateLimitConfig[action] || RateLimitConfig.default;
  const now = new Date();
  const windowStart = new Date(now.getTime() - config.windowMs);
  const identifier = `${action}:${openid}:${clientIP || 'unknown'}`;

  try {
    const collection = db.collection(RATE_LIMIT_COLLECTION);
    const result = await collection
      .where({
        identifier: identifier,
        timestamp: db.command.gte(windowStart)
      })
      .count();

    return {
      current: result.total,
      max: config.maxRequests,
      resetTime: new Date(windowStart.getTime() + config.windowMs)
    };
  } catch (error) {
    console.error('[RateLimiter] 获取频率限制状态失败:', error);
    return {
      current: 0,
      max: config.maxRequests,
      resetTime: new Date(now.getTime() + config.windowMs)
    };
  }
}

module.exports = {
  checkRateLimit,
  cleanupExpiredRecords,
  getRateLimitStatus,
  RateLimitConfig
};
