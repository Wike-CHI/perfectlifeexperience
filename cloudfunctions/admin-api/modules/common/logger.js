/**
 * 日志记录模块
 */

const LOG_LEVELS = {
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error'
};

/**
 * 创建日志条目
 * @param {string} adminId - 管理员ID
 * @param {string} operation - 操作类型
 * @param {Object} details - 操作详情
 * @returns {Object} 日志条目
 */
function createLogEntry(adminId, operation, details = {}) {
  return {
    adminId,
    operation,
    details,
    timestamp: new Date().toISOString()
  };
}

/**
 * 记录操作日志（供云函数调用）
 * @param {Object} db - 数据库实例
 * @param {string} adminId - 管理员ID
 * @param {string} operation - 操作类型
 * @param {Object} details - 操作详情
 * @returns {Promise<void>}
 */
async function logOperation(db, adminId, operation, details = {}) {
  const logEntry = createLogEntry(adminId, operation, details);

  try {
    await db.collection('operation_logs').add({
      data: logEntry
    });
  } catch (error) {
    // 日志记录失败不应影响主业务
    console.error('Failed to log operation:', error);
  }
}

/**
 * 创建结构化日志
 * @param {string} level - 日志级别
 * @param {string} message - 日志消息
 * @param {Object} context - 上下文信息
 * @returns {Object} 结构化日志
 */
function createStructuredLog(level, message, context = {}) {
  return {
    level: LOG_LEVELS[level.toUpperCase()] || LOG_LEVELS.INFO,
    message,
    ...context,
    timestamp: new Date().toISOString()
  };
}

/**
 * 格式化日志为字符串
 * @param {Object} log - 日志对象
 * @returns {string} 格式化后的日志字符串
 */
function formatLog(log) {
  const { level, message, timestamp, ...rest } = log;
  const extra = Object.keys(rest).length > 0 ? JSON.stringify(rest) : '';
  return `[${timestamp}] ${level.toUpperCase()}: ${message} ${extra}`;
}

module.exports = {
  LOG_LEVELS,
  createLogEntry,
  logOperation,
  createStructuredLog,
  formatLog
};
