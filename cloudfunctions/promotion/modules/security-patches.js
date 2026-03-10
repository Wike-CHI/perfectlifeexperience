/**
 * 推广系统云函数 - 安全漏洞修复补丁
 *
 * 修复内容：
 * 3. 改进推广路径验证逻辑
 * 4. 完善路径遍历检测
 */

const response = require('../common/response');

/**
 * 修复#3 & #4: 推广路径安全验证
 *
 * @param {string} promotionPath - 推广路径
 * @returns {Object} 验证结果
 */
function validatePromotionPath(promotionPath) {
  if (!promotionPath) {
    return {
      valid: false,
      error: 'EMPTY_PATH',
      message: '推广路径不能为空'
    };
  }

  // ========== 修复#3: 改进的路径格式验证 ==========
  const validPathRegex = /^[a-zA-Z0-9_]+(\/[a-zA-Z0-9_]+)*$/;

  if (!validPathRegex.test(promotionPath)) {
    return {
      valid: false,
      error: 'INVALID_PATH_FORMAT',
      message: '推广路径格式无效'
    };
  }

  // ========== 额外检查：拒绝JavaScript关键字 ==========
  const pathParts = promotionPath.split('/');
  const jsKeywords = [
    'undefined', 'null', 'NaN', 'Infinity',
    'function', 'return', 'this', 'prototype',
    'constructor', '__proto__', 'eval'
  ];

  for (const part of pathParts) {
    if (jsKeywords.includes(part)) {
      return {
        valid: false,
        error: 'JS_KEYWORD_IN_PATH',
        message: `路径包含非法关键字: ${part}`
      };
    }
  }

  // ========== 修复#4: 路径遍历检测 ==========
  if (hasPathTraversal(promotionPath)) {
    return {
      valid: false,
      error: 'PATH_TRAVERSAL_DETECTED',
      message: '检测到路径遍历攻击'
    };
  }

  // 验证路径深度
  const depth = promotionPath.split('/').length;
  const MAX_DEPTH = 4;

  if (depth > MAX_DEPTH) {
    return {
      valid: false,
      error: 'PATH_TOO_DEEP',
      message: `推广路径过深（最大${MAX_DEPTH}层）`
    };
  }

  return {
    valid: true,
    path: promotionPath,
    depth
  };
}

/**
 * 修复#4: 改进的路径遍历检测
 *
 * @param {string} path - 待检测路径
 * @returns {boolean} 是否包含路径遍历
 */
function hasPathTraversal(path) {
  if (typeof path !== 'string') {
    return false;
  }

  const traversalPatterns = [
    /\.\.\//,        // ../
    /\.\.\\/,        // ..\
    /^\.\//,          // ./
    /^~\//,           // ~/
    /^\/(etc|usr|bin|home|root)/i,  // Unix绝对路径
    /[a-zA-Z]:\\/,   // Windows绝对路径
    /%2e%2e/i,       // URL编码的..
    /\.\.%252f/i,     // 混合编码
    /\.\.\./,         // ...或变体
    /\/\.\./,         // /..
    /\/\/+/           // 多个斜杠（可能绕过检测）
  ];

  return traversalPatterns.some(pattern => pattern.test(path));
}

/**
 * 路径规范化（先规范化再验证）
 *
 * @param {string} path - 原始路径
 * @returns {string} 规范化后的路径
 */
function normalizePath(path) {
  if (typeof path !== 'string') {
    return '';
  }

  let normalized = path;

  // 移除开头的 ./
  normalized = normalized.replace(/^\.\//g, '');

  // 解析 ../ （最多处理10次）
  let iterations = 0;
  while (normalized.includes('../') && iterations < 10) {
    normalized = normalized.replace(/[^/]+\/\.\.\//g, '');
    iterations++;
  }

  // 解析 ..\
  iterations = 0;
  while (normalized.includes('..\\') && iterations < 10) {
    normalized = normalized.replace(/[^\\]+\\\.\.\\/g, '');
    iterations++;
  }

  // 移除多余的斜杠
  normalized = normalized.replace(/\/+/g, '/');
  normalized = normalized.replace(/\\+/g, '\\');

  return normalized;
}

/**
 * 验证用户ID格式
 *
 * @param {string} userId - 用户ID
 * @returns {boolean} 是否有效
 */
function validateUserId(userId) {
  if (!userId || typeof userId !== 'string') {
    return false;
  }

  // 拒绝特殊值
  const invalidValues = [
    'undefined', 'null', 'NaN', 'Infinity',
    '[object Object]', '[object Array]'
  ];

  if (invalidValues.includes(userId)) {
    return false;
  }

  // 验证格式：字母开头，包含字母、数字、下划线
  const validUserIdRegex = /^[a-zA-Z][a-zA-Z0-9_]{3,31}$/;

  return validUserIdRegex.test(userId);
}

/**
 * 验证邀请码格式
 *
 * @param {string} code - 邀请码
 * @returns {boolean} 是否有效
 */
function validateInviteCode(code) {
  if (!code || typeof code !== 'string') {
    return false;
  }

  // 邀请码：4-10位大写字母和数字
  const validCodeRegex = /^[A-Z0-9]{4,10}$/;

  return validCodeRegex.test(code);
}

module.exports = {
  validatePromotionPath,
  hasPathTraversal,
  normalizePath,
  validateUserId,
  validateInviteCode
};
