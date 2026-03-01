/**
 * 统一、安全的云函数日志工具
 *
 * 功能：
 * - 结构化日志记录（JSON 格式）
 * - 敏感信息自动脱敏
 * - 环境感知的日志级别
 * - 模块化日志管理
 */

// ==================== 配置 ====================

/**
 * 敏感字段列表（自动脱敏处理）
 */
const SENSITIVE_FIELDS = [
  'openid',
  '_openid',
  'OPENID',
  'password',
  'passwd',
  'pwd',
  'phone',
  'mobile',
  'telephone',
  'idCard',
  'id_card',
  'token',
  'access_token',
  'secret',
  'secret_key',
  'private_key',
  'privateKey',
  'balance',
  'wallet_balance',
  'id_card',
  'idCard'
];

/**
 * 获取当前环境
 */
function getEnvironment() {
  return process.env.TCB_ENV || process.env.NODE_ENV || 'dev';
}

/**
 * 日志级别
 */
const LOG_LEVELS = {
  ERROR: 'ERROR',
  WARN: 'WARN',
  INFO: 'INFO',
  DEBUG: 'DEBUG'
};

/**
 * 环境配置
 */
const ENV_CONFIG = {
  dev: {
    enableDebug: true,
    enableInfo: true,
    enableWarn: true,
    enableError: true
  },
  test: {
    enableDebug: true,
    enableInfo: true,
    enableWarn: true,
    enableError: true
  },
  production: {
    enableDebug: false,  // 生产环境关闭 DEBUG
    enableInfo: false,
    enableWarn: true,
    enableError: true
  }
};

// ==================== 工具函数 ====================

/**
 * 脱敏处理对象
 * @param {*} obj - 需要脱敏的对象
 * @returns {*} 脱敏后的对象
 */
function sanitize(obj) {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  const sanitized = Array.isArray(obj) ? [] : {};

  for (const key of Object.keys(obj)) {
    const lowerKey = key.toLowerCase();
    const isSensitive = SENSITIVE_FIELDS.some(field =>
      lowerKey.includes(field) || key.includes(field)
    );

    if (isSensitive) {
      // 敏感信息完全替换为 [REDACTED]
      sanitized[key] = '[REDACTED]';
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      // 递归处理嵌套对象
      sanitized[key] = sanitize(obj[key]);
    } else if (Array.isArray(obj[key])) {
      // 递归处理数组
      sanitized[key] = obj[key].map(item => sanitize(item));
    } else {
      // 其他类型直接保留
      sanitized[key] = obj[key];
    }
  }

  return sanitized;
}

/**
 * 格式化日志条目
 */
function formatLogEntry(level, module, message, meta) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    module,
    message
  };

  // 只在非生产环境或 ERROR/WARN 级别包含详细信息
  const env = getEnvironment();
  if (env !== 'production' || level === LOG_LEVELS.ERROR || level === LOG_LEVELS.WARN) {
    logEntry.meta = meta ? sanitize(meta) : {};
  }

  return logEntry;
}

/**
 * 输出日志到控制台
 */
function outputLog(level, module, message, meta) {
  const env = getEnvironment();
  const config = ENV_CONFIG[env] || ENV_CONFIG.production;
  const enableKey = `enable${level.charAt(0).toUpperCase() + level.slice(1).toLowerCase()}`;

  // 检查该日志级别在当前环境是否启用
  if (!config[enableKey]) {
    return;  // 禁用的日志级别不输出
  }

  const logEntry = formatLogEntry(level, module, message, meta);

  // 输出格式化的日志
  const logString = JSON.stringify(logEntry);

  if (level === LOG_LEVELS.ERROR) {
    console.error(`[${logEntry.level}] [${logEntry.module}] ${message}`, logEntry.meta || '');
  } else if (level === LOG_LEVELS.WARN) {
    console.warn(`[${logEntry.level}] [${logEntry.module}] ${message}`, logEntry.meta || '');
  } else if (level === LOG_LEVELS.INFO && config.enableInfo) {
    console.log(`[${logEntry.level}] [${logEntry.module}] ${message}`, logEntry.meta || '');
  } else if (level === LOG_LEVELS.DEBUG && config.enableDebug) {
    console.log(`[${logEntry.level}] [${logEntry.module}] ${message}`, logEntry.meta || '');
  }
}

// ==================== Logger 类 ====================

/**
 * 主日志类
 */
class Logger {
  constructor(module) {
    this.module = module;
  }

  /**
   * DEBUG 级别日志
   */
  debug(message, meta) {
    outputLog(LOG_LEVELS.DEBUG, this.module, message, meta);
  }

  /**
   * INFO 级别日志
   */
  info(message, meta) {
    outputLog(LOG_LEVELS.INFO, this.module, message, meta);
  }

  /**
   * WARN 级别日志
   */
  warn(message, meta) {
    outputLog(LOG_LEVELS.WARN, this.module, message, meta);
  }

  /**
   * ERROR 级别日志
   */
  error(message, error, meta) {
    const errorMeta = {
      ...(meta || {}),
      error: error ? {
        message: error.message,
        stack: error.stack,
        code: error.code
      } : null
    };
    outputLog(LOG_LEVELS.ERROR, this.module, message, errorMeta);
  }
}

/**
 * 创建模块日志实例
 * @param {string} module - 模块名称（通常为云函数名）
 * @returns {Logger} 日志实例
 */
function createLogger(module) {
  return new Logger(module);
}

// ==================== 导出 ====================

module.exports = {
  createLogger,
  LOG_LEVELS,
  SENSITIVE_FIELDS,
  sanitize
};
