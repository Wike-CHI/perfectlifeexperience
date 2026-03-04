/**
 * 验证工具模块
 */

// 手机号正则
const PHONE_REGEX = /^1[3-9]\d{9}$/;
// 邮箱正则
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * 检查必填字段
 * @param {Object} data - 数据对象
 * @param {string[]} required - 必填字段数组
 * @returns {Object} 验证结果 { valid: boolean, missing: string[] }
 */
function checkRequired(data, required) {
  const missing = required.filter(field => {
    const value = data[field];
    return value === undefined || value === null || value === '';
  });

  return {
    valid: missing.length === 0,
    missing
  };
}

/**
 * 验证数据类型
 * @param {*} value - 值
 * @param {string} type - 期望类型
 * @returns {boolean} 是否符合类型
 */
function validateType(value, type) {
  switch (type) {
    case 'string':
      return typeof value === 'string';
    case 'number':
      return typeof value === 'number' && !isNaN(value);
    case 'boolean':
      return typeof value === 'boolean';
    case 'array':
      return Array.isArray(value);
    case 'object':
      return typeof value === 'object' && !Array.isArray(value);
    default:
      return false;
  }
}

/**
 * 验证数值范围
 * @param {number} value - 数值
 * @param {number} min - 最小值
 * @param {number} max - 最大值
 * @returns {boolean} 是否在范围内
 */
function validateRange(value, min, max) {
  if (typeof value !== 'number' || isNaN(value)) return false;
  return value >= min && value <= max;
}

/**
 * 验证正整数
 * @param {*} value - 值
 * @returns {boolean} 是否为正整数
 */
function isPositiveInteger(value) {
  return Number.isInteger(value) && value > 0;
}

/**
 * 验证字符串长度
 * @param {string} value - 字符串
 * @param {number} minLen - 最小长度
 * @param {number} maxLen - 最大长度
 * @returns {boolean} 长度是否有效
 */
function validateLength(value, minLen, maxLen) {
  if (typeof value !== 'string') return false;
  const len = value.trim().length;
  return len >= minLen && len <= maxLen;
}

/**
 * 验证手机号
 * @param {string} phone - 手机号
 * @returns {boolean} 是否为有效手机号
 */
function validatePhone(phone) {
  return PHONE_REGEX.test(phone);
}

/**
 * 验证邮箱
 * @param {string} email - 邮箱
 * @returns {boolean} 是否为有效邮箱
 */
function validateEmail(email) {
  return EMAIL_REGEX.test(email);
}

/**
 * 验证ID格式
 * @param {string} id - ID
 * @returns {boolean} 是否为有效ID
 */
function validateId(id) {
  return typeof id === 'string' && id.length > 0;
}

/**
 * 综合验证器
 * @param {Object} data - 数据
 * @param {Object} rules - 验证规则
 * @returns {Object} 验证结果 { valid: boolean, errors: Object }
 */
function validate(data, rules) {
  const errors = {};

  for (const field in rules) {
    const rule = rules[field];
    const value = data[field];

    // 必填验证
    if (rule.required && (value === undefined || value === null || value === '')) {
      errors[field] = `${field}不能为空`;
      continue;
    }

    // 如果值为空且不是必填，跳过其他验证
    if (value === undefined || value === null || value === '') {
      continue;
    }

    // 类型验证
    if (rule.type && !validateType(value, rule.type)) {
      errors[field] = `${field}类型错误`;
      continue;
    }

    // 范围验证
    if (rule.type === 'number' && (rule.min !== undefined || rule.max !== undefined)) {
      if (!validateRange(value, rule.min ?? -Infinity, rule.max ?? Infinity)) {
        errors[field] = `${field}必须在${rule.min}到${rule.max}之间`;
      }
    }

    // 长度验证
    if (rule.type === 'string' && (rule.minLen || rule.maxLen)) {
      if (!validateLength(value, rule.minLen ?? 0, rule.maxLen ?? Infinity)) {
        errors[field] = `${field}长度必须在${rule.minLen}到${rule.maxLen}之间`;
      }
    }

    // 手机号验证
    if (rule.phone && !validatePhone(value)) {
      errors[field] = `${field}不是有效的手机号`;
    }

    // 邮箱验证
    if (rule.email && !validateEmail(value)) {
      errors[field] = `${field}不是有效的邮箱`;
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors
  };
}

module.exports = {
  checkRequired,
  validateType,
  validateRange,
  isPositiveInteger,
  validateLength,
  validatePhone,
  validateEmail,
  validateId,
  validate
};
