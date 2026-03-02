/**
 * 云函数共享模块入口
 * 统一导出所有共享模块，方便云函数引用
 *
 * 使用方式：
 * const { success, error, createLogger } = require('/opt/shared')
 */

// 日志模块
const { createLogger, LOG_LEVELS, sanitize } = require('./logger');

// 响应格式
const { success, error, secureError, ErrorCodes, ErrorMessages, getErrorMessage, sanitizeData } = require('./response');

// 常量配置
const {
  Time,
  AgentLevel,
  AgentLevelInternalNames,
  AgentLevelDisplayNames,
  Amount,
  AntiFraud,
  PromotionThreshold,
  Collections,
  RewardType,
  RewardTypeNames,
  getCommissionRule,
  getAgentLevelInternalName,
  getAgentLevelDisplayName,
  getPromotionThreshold,
  getIpLimitWindow,
  getFollowPromotionRule
} = require('./constants');

// 缓存模块
const { userCache, productCache, teamStatsCache, withCache } = require('./cache');

// 验证工具
const {
  isValidObjectId,
  validateOrderStatus,
  validatePaginationParams,
  validateWithdrawalAction,
  validateProductData,
  sanitizeUpdateData,
  validateAmount,
  validateObject
} = require('./validator');

// 频率限制
const { checkRateLimit } = require('./rateLimiter');

// 通知模块
const { sendPromotionNotification, sendWithdrawalNotification } = require('./notification');

// 奖励结算模块
const {
  settleWithRetry,
  recordSettlementFailure,
  sendSettlementAlert,
  getPendingFailures,
  getAllPendingFailures,
  markFailureResolved,
  updateFailureRetry,
  getSettlementStats,
  RETRY_CONFIG
} = require('./reward-settlement');

module.exports = {
  // 日志
  createLogger,
  LOG_LEVELS,
  sanitize,

  // 响应
  success,
  error,
  secureError,
  ErrorCodes,
  ErrorMessages,
  getErrorMessage,
  sanitizeData,

  // 常量
  Time,
  AgentLevel,
  AgentLevelInternalNames,
  AgentLevelDisplayNames,
  Amount,
  AntiFraud,
  PromotionThreshold,
  Collections,
  RewardType,
  RewardTypeNames,
  getCommissionRule,
  getAgentLevelInternalName,
  getAgentLevelDisplayName,
  getPromotionThreshold,
  getIpLimitWindow,
  getFollowPromotionRule,

  // 缓存
  userCache,
  productCache,
  teamStatsCache,
  withCache,

  // 验证
  isValidObjectId,
  validateOrderStatus,
  validatePaginationParams,
  validateWithdrawalAction,
  validateProductData,
  sanitizeUpdateData,
  validateAmount,
  validateObject,

  // 频率限制
  checkRateLimit,

  // 通知
  sendPromotionNotification,
  sendWithdrawalNotification,

  // 奖励结算
  settleWithRetry,
  recordSettlementFailure,
  sendSettlementAlert,
  getPendingFailures,
  getAllPendingFailures,
  markFailureResolved,
  updateFailureRetry,
  getSettlementStats,
  RETRY_CONFIG
};
