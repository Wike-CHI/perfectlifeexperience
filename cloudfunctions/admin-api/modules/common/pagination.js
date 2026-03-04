/**
 * 分页工具模块 - 纯函数版本
 * 可独立测试，不依赖数据库
 */

/**
 * 构建查询条件
 * @param {Object} data - 请求数据
 * @returns {Object} 查询条件
 */
function buildQuery(data) {
  const query = {};

  if (data.status && data.status !== 'all') {
    query.status = data.status;
  }

  if (data.keyword) {
    query.orderNo = { $regex: data.keyword, $options: 'i' };
  }

  if (data.startDate || data.endDate) {
    query.createTime = {};
    if (data.startDate) query.createTime.$gte = new Date(data.startDate);
    if (data.endDate) query.createTime.$lte = new Date(data.endDate);
  }

  return query;
}

/**
 * 计算分页参数
 * @param {number} page - 页码
 * @param {number} limit - 每页数量
 * @returns {Object} 分页参数
 */
function calcPagination(page = 1, limit = 20) {
  const validPage = Math.max(1, parseInt(page) || 1);
  const validLimit = Math.min(100, Math.max(1, parseInt(limit) || 20));

  return {
    page: validPage,
    limit: validLimit,
    skip: (validPage - 1) * validLimit
  };
}

/**
 * 计算分页信息
 * @param {number} total - 总记录数
 * @param {number} page - 当前页
 * @param {number} limit - 每页数量
 * @returns {Object} 分页信息
 */
function calcPageInfo(total, page, limit) {
  return {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit)
  };
}

/**
 * 验证分页参数
 * @param {number} page - 页码
 * @param {number} limit - 每页数量
 * @returns {Object} 验证结果 { valid: boolean, errors: string[] }
 */
function validatePagination(page, limit) {
  const errors = [];

  if (!page || page < 1) {
    errors.push('页码必须大于0');
  }

  if (!limit || limit < 1) {
    errors.push('每页数量必须大于0');
  }

  if (limit > 100) {
    errors.push('每页数量不能超过100');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

module.exports = {
  buildQuery,
  calcPagination,
  calcPageInfo,
  validatePagination
};
