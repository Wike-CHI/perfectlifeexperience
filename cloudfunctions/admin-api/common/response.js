/**
 * 统一响应格式模块
 * 用于规范化 admin-api 的响应结构
 */

/**
 * 错误代码枚举
 */
const ErrorCodes = {
  // 通用错误
  SUCCESS: 0,
  UNKNOWN_ERROR: -1,
  INVALID_PARAMS: -2,
  NOT_LOGGED_IN: -3,

  // 用户相关错误 (100-199)
  USER_NOT_FOUND: 100,
  USER_ALREADY_EXISTS: 101,
  INVALID_PASSWORD: 102,

  // 权限错误 (200-299)
  PERMISSION_DENIED: 200,
  INVALID_TOKEN: 201,
  TOKEN_EXPIRED: 202,

  // 业务逻辑错误 (300-399)
  RESOURCE_NOT_FOUND: 300,
  RESOURCE_ALREADY_EXISTS: 301,
  INVALID_OPERATION: 302,
  VALIDATION_ERROR: 303,

  // 系统错误 (500-599)
  DATABASE_ERROR: 500,
  UPLOAD_ERROR: 501,
  EXTERNAL_API_ERROR: 502
};

/**
 * 成功响应
 * @param {*} data - 返回数据
 * @param {string} message - 成功消息
 * @returns {Object} 标准响应对象
 */
function success(data, message = '操作成功') {
  return {
    code: ErrorCodes.SUCCESS,
    msg: message,
    data: data
  };
}

/**
 * 错误响应
 * @param {number} code - 错误代码
 * @param {string} message - 错误消息
 * @param {*} details - 错误详情（可选）
 * @returns {Object} 标准响应对象
 */
function error(code, message, details = null) {
  const response = {
    code: code,
    msg: message
  };

  if (details !== null) {
    response.data = details;
  }

  return response;
}

/**
 * 分页响应辅助函数
 * @param {Array} list - 数据列表
 * @param {number} total - 总数
 * @param {number} page - 当前页
 * @param {number} limit - 每页数量
 * @returns {Object} 分页数据对象
 */
function paginate(list, total, page, limit) {
  return {
    list: list,
    total: total,
    page: page,
    limit: limit,
    totalPages: Math.ceil(total / limit)
  };
}

module.exports = {
  success,
  error,
  ErrorCodes,
  paginate
};
