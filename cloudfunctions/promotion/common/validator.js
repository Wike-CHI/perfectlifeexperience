/**
 * 统一输入验证工具
 *
 * 功能：
 * - 验证各种输入类型（字符串、数字、金额等）
 * - 防止 ReDoS 攻击
 * - 防止注入攻击
 * - 清理和转义特殊字符
 */

// ==================== 验证规则 ====================

/**
 * 验证规则配置
 */
const RULES = {
  // 字符串验证
  string: {
    minLength: 1,
    maxLength: 1000,
    pattern: /^[a-zA-Z0-9\u4e00-\u9fa5\s\-_.,!?@#$%^&*()]+$/
  },

  // 数字验证
  number: {
    min: -Number.MAX_SAFE_INTEGER,
    max: Number.MAX_SAFE_INTEGER
  },

  // 金额验证（单位：分）
  amount: {
    min: 1,        // 0.01元
    max: 500000000,  // 50000元
    precision: 'integer'  // 必须是整数
  },

  // OpenID 验证
  openid: {
    pattern: /^[oO][0-9a-zA-Z_-]{20,}$/
  },

  // 邀请码验证
  inviteCode: {
    pattern: /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$/
  },

  // 手机号验证
  phone: {
    pattern: /^1[3-9]\d{9}$/,
    minLength: 11,
    maxLength: 11
  }
};

/**
 * 验证结果类型
 */
const VALIDATION_RESULT = {
  VALID: 'valid',
  INVALID: 'invalid',
  ERROR: 'error'
};

// ==================== 字符串验证 ====================

/**
 * 验证字符串
 * @param {*} value - 待验证值
 * @param {string} fieldName - 字段名称
 * @param {object} options - 验证选项
 * @returns {object} 验证结果
 */
function validateString(value, fieldName, options = {}) {
  const {
    minLength = RULES.string.minLength,
    maxLength = RULES.string.maxLength,
    required = true,
    pattern = RULES.string.pattern
  } = options;

  // 必填检查
  if (value === null || value === undefined || value === '') {
    if (required) {
      return {
        result: VALIDATION_RESULT.INVALID,
        error: `${fieldName}不能为空`
      };
    }
    return { result: VALIDATION_RESULT.VALID };  // 空值允许通过
  }

  // 类型检查
  if (typeof value !== 'string') {
    return {
      result: VALIDATION_RESULT.INVALID,
      error: `${fieldName}必须是字符串`
    };
  }

  // 长度检查
  if (value.length < minLength) {
    return {
      result: VALIDATION_RESULT.INVALID,
      error: `${fieldName}长度不能少于${minLength}`
    };
  }

  if (value.length > maxLength) {
    return {
      result: VALIDATION_RESULT.INVALID,
      error: `${fieldName}长度不能超过${maxLength}`
    };
  }

  // 模式验证
  if (pattern && !pattern.test(value)) {
    return {
      result: VALIDATION_RESULT.INVALID,
      error: `${fieldName}包含非法字符`
    };
  }

  return { result: VALIDATION_RESULT.VALID };
}

/**
 * 验证并清理搜索关键词（防 ReDoS）
 * @param {string} keyword - 搜索关键词
 * @returns {object} 验证结果和清理后的关键词
 */
function validateAndCleanKeyword(keyword) {
  if (!keyword) {
    return { result: VALIDATION_RESULT.VALID, sanitized: '' };
  }

  // 1. 长度限制
  const lengthCheck = validateString(keyword, '搜索关键词', { maxLength: 100 });
  if (!lengthCheck.result) {
    return lengthCheck;
  }

  // 2. 移除正则特殊字符（防止 ReDoS 攻击）
  // 移除: . * + ? ^ $ { } ( ) [ ] \
  const specialChars = /[.*+?^${}()|[\]\\]/g;
  const sanitized = keyword.replace(specialChars, '');

  if (sanitized !== keyword) {
    return {
      result: VALIDATION_RESULT.VALID,
      warning: '搜索关键词已清理特殊字符',
      sanitized
    };
  }

  return { result: VALIDATION_RESULT.VALID, sanitized: sanitized || keyword };
}

// ==================== 数字验证 ====================

/**
 * 验证数字
 * @param {number} value - 待验证数字
 * @param {string} fieldName - 字段名称
 * @returns {object} 验证结果
 */
function validateNumber(value, fieldName) {
  if (typeof value !== 'number') {
    return {
      result: VALIDATION_RESULT.INVALID,
      error: `${fieldName}必须是数字`
    };
  }

  if (!Number.isFinite(value)) {
    return {
      result: VALIDATION_RESULT.INVALID,
      error: `${fieldName}必须是有效数字`
    };
  }

  if (value < RULES.number.min || value > RULES.number.max) {
    return {
      result: VALIDATION_RESULT.INVALID,
      error: `${fieldName}超出允许范围`
    };
  }

  return { result: VALIDATION_RESULT.VALID };
}

// ==================== 金额验证 ====================

/**
 * 验证金额（单位：分）
 * @param {number} amount - 待验证金额
 * @param {string} fieldName - 字段名称
 * @returns {object} 验证结果
 */
function validateAmount(amount, fieldName = '金额') {
  if (typeof amount !== 'number') {
    return {
      result: VALIDATION_RESULT.INVALID,
      error: `${fieldName}必须是数字`
    };
  }

  if (!Number.isInteger(amount)) {
    return {
      result: VALIDATION_RESULT.INVALID,
      error: `${fieldName}必须是整数`
    };
  }

  if (amount < RULES.amount.min || amount > RULES.amount.max) {
    return {
      result: VALIDATION_RESULT.INVALID,
      error: `${fieldName}必须在${RULES.amount.min}-${RULES.amount.max}之间`
    };
  }

  return { result: VALIDATION_RESULT.VALID };
}

// ==================== OpenID 验证 ====================

/**
 * 验证 OpenID
 * @param {string} openid - OpenID 值
 * @returns {object} 验证结果
 */
function validateOpenid(openid) {
  if (!openid || typeof openid !== 'string') {
    return {
      result: VALIDATION_RESULT.INVALID,
      error: 'OpenID不能为空'
    };
  }

  if (!RULES.openid.pattern.test(openid)) {
    return {
      result: VALIDATION_RESULT.INVALID,
      error: 'OpenID格式不正确'
    };
  }

  if (openid.length > 28) {  // 微信 OpenID 最大 28 字符
    return {
      result: VALIDATION_RESULT.INVALID,
      error: 'OpenID长度不能超过28'
    };
  }

  return { result: VALIDATION_RESULT.VALID };
}

// ==================== 对象验证 ====================

/**
 * 验证对象不为空
 * @param {*} obj - 待验证对象
 * @param {string} fieldName - 字段名称
 * @returns {object} 验证结果
 */
function validateObject(obj, fieldName) {
  if (!obj || typeof obj !== 'object') {
    return {
      result: VALIDATION_RESULT.INVALID,
      error: `${fieldName}必须是对象`
    };
  }
  return { result: VALIDATION_RESULT.VALID };
}

// ==================== 导出工具 ====================

module.exports = {
  // 验证函数
  validateString,
  validateNumber,
  validateAmount,
  validateOpenid,
  validateObject,
  validateAndCleanKeyword,

  // 验证结果常量
  VALIDATION_RESULT,
  RULES
};
