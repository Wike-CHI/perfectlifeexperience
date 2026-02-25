/**
 * 统一响应格式工具
 *
 * 功能：
 * - 标准化云函数响应格式
 * - 提供 success() 和 error() 辅助函数
 * - 确保所有返回格式一致
 * - 生产环境下隐藏敏感错误详情
 */

// 检测是否为生产环境
const isProduction = process.env.TENCENTCLOUD_RUNENV === 'scf' ||
                     process.env.NODE_ENV === 'production';

/**
 * 成功响应
 * @param {*} data - 返回数据
 * @param {string} message - 成功消息
 * @returns {object} 标准响应对象
 */
function success(data = null, message = 'Success') {
  return {
    code: 0,
    msg: message,
    data
  };
}

/**
 * 错误响应
 * @param {number} code - 错误码（非 0）
 * @param {string} message - 错误消息
 * @param {*} details - 错误详情（可选，生产环境会隐藏）
 * @returns {object} 标准响应对象
 */
function error(code = -1, message = '操作失败', details = null) {
  const response = {
    code,
    msg: message
  };

  // 仅在非生产环境返回错误详情
  if (details !== null && !isProduction) {
    response.data = details;
  }

  // 记录详细错误到日志（所有环境）
  if (details !== null) {
    console.error(`[Error ${code}]`, { message, details });
  }

  return response;
}

/**
 * 常见错误码
 */
const ErrorCodes = {
  // 通用错误 (1-99)
  SUCCESS: 0,
  UNKNOWN_ERROR: -1,
  INVALID_PARAMS: -2,
  NOT_LOGIN: -3,

  // 用户相关 (100-199)
  USER_NOT_FOUND: 100,
  USER_ALREADY_EXISTS: 101,
  INVALID_INVITE_CODE: 102,

  // 权限相关 (200-299)
  NO_PERMISSION: 200,
  NOT_ADMIN: 201,

  // 业务相关 (300-399)
  INSUFFICIENT_BALANCE: 300,
  ORDER_NOT_FOUND: 301,
  ORDER_STATUS_INVALID: 302,
  CART_INVALID: 303,

  // 系统相关 (500-599)
  DATABASE_ERROR: 500,
  TRANSACTION_FAILED: 501
};

/**
 * 常用错误消息
 */
const ErrorMessages = {
  [ErrorCodes.INVALID_PARAMS]: '参数错误',
  [ErrorCodes.NOT_LOGIN]: '未登录',
  [ErrorCodes.USER_NOT_FOUND]: '用户不存在',
  [ErrorCodes.USER_ALREADY_EXISTS]: '用户已存在',
  [ErrorCodes.INVALID_INVITE_CODE]: '邀请码无效',
  [ErrorCodes.NO_PERMISSION]: '无权限',
  [ErrorCodes.NOT_ADMIN]: '非管理员',
  [ErrorCodes.INSUFFICIENT_BALANCE]: '余额不足',
  [ErrorCodes.ORDER_NOT_FOUND]: '订单不存在',
  [ErrorCodes.ORDER_STATUS_INVALID]: '订单状态异常',
  [ErrorCodes.CART_INVALID]: '购物车数据异常',
  [ErrorCodes.DATABASE_ERROR]: '数据库错误',
  [ErrorCodes.TRANSACTION_FAILED]: '事务失败'
};

/**
 * 获取错误消息
 * @param {number} code - 错误码
 * @param {string} customMessage - 自定义消息
 * @returns {string} 错误消息
 */
function getErrorMessage(code, customMessage = null) {
  return customMessage || ErrorMessages[code] || '操作失败';
}

/**
 * 安全错误响应（始终隐藏详情）
 * 用于处理包含敏感信息的错误（如数据库错误、文件路径等）
 * @param {number} code - 错误码
 * @param {string} userMessage - 用户友好的错误消息
 * @param {string} internalError - 内部错误详情（仅记录到日志）
 * @returns {object} 标准响应对象
 */
function secureError(code = -1, userMessage = '操作失败', internalError = null) {
  // 记录完整错误到日志
  if (internalError) {
    console.error(`[Secure Error ${code}]`, { userMessage, internalError });
  }

  // 始终返回用户友好的消息，不包含内部详情
  return {
    code,
    msg: userMessage
  };
}

/**
 * 清理敏感信息（用于调试数据）
 * @param {any} data - 需要清理的数据
 * @returns {any} 清理后的数据
 */
function sanitizeData(data) {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const sensitiveKeys = ['password', 'privateKey', 'secret', 'token', 'openid', 'sessionKey'];
  const cleaned = Array.isArray(data) ? [...data] : { ...data };

  for (const key in cleaned) {
    // 检查是否为敏感键
    const lowerKey = key.toLowerCase();
    if (sensitiveKeys.some(sk => lowerKey.includes(sk.toLowerCase()))) {
      cleaned[key] = '***REDACTED***';
    } else if (typeof cleaned[key] === 'object' && cleaned[key] !== null) {
      cleaned[key] = sanitizeData(cleaned[key]);
    }
  }

  return cleaned;
}

module.exports = {
  success,
  error,
  secureError,
  ErrorCodes,
  ErrorMessages,
  getErrorMessage,
  sanitizeData,
  isProduction
};
