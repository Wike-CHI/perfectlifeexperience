/**
 * 安全日志工具
 *
 * 特性：
 * - 结构化日志输出
 * - 自动脱敏敏感信息
 * - 日志分级（debug, info, warn, error）
 */

const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};

// 当前日志级别（可通过环境变量配置）
const CURRENT_LOG_LEVEL = LOG_LEVELS[process.env.LOG_LEVEL] || LOG_LEVELS.info;

/**
 * 创建日志记录器
 */
function createLogger(module) {
  return {
    debug: (message, data = {}) => {
      if (CURRENT_LOG_LEVEL <= LOG_LEVELS.debug) {
        console.log(`[${module}] [DEBUG] ${message}`, formatData(data));
      }
    },
    info: (message, data = {}) => {
      if (CURRENT_LOG_LEVEL <= LOG_LEVELS.info) {
        console.log(`[${module}] [INFO] ${message}`, formatData(data));
      }
    },
    warn: (message, data = {}) => {
      if (CURRENT_LOG_LEVEL <= LOG_LEVELS.warn) {
        console.warn(`[${module}] [WARN] ${message}`, formatData(data));
      }
    },
    error: (message, error = null) => {
      if (CURRENT_LOG_LEVEL <= LOG_LEVELS.error) {
        console.error(`[${module}] [ERROR] ${message}`, error ? formatError(error) : '');
      }
    }
  };
}

/**
 * 格式化日志数据（脱敏）
 */
function formatData(data) {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const formatted = { ...data };

  // 脱敏敏感字段
  const sensitiveFields = ['openid', '_openid', 'phone', 'mobile', 'idCard'];

  sensitiveFields.forEach(field => {
    if (formatted[field]) {
      const value = String(formatted[field]);
      if (value.length > 8) {
        formatted[field] = value.substring(0, 4) + '***' + value.substring(value.length - 4);
      } else {
        formatted[field] = '***';
      }
    }
  });

  return formatted;
}

/**
 * 格式化错误信息
 */
function formatError(error) {
  if (!error) return '';

  if (error instanceof Error) {
    return {
      message: error.message,
      stack: error.stack
    };
  }

  if (typeof error === 'string') {
    return { message: error };
  }

  return error;
}

module.exports = { createLogger };
