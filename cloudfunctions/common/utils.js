/**
 * 云函数共享工具函数
 *
 * 功能：
 * - 交易号生成
 * - 业绩对象管理
 * - 其他共享工具
 */

/**
 * 生成交易流水号
 * 格式：IT + 年月日时分秒 + 6位随机数
 * @returns {string} 交易流水号
 */
function generateTransactionNo() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hour = String(now.getHours()).padStart(2, '0');
  const minute = String(now.getMinutes()).padStart(2, '0');
  const second = String(now.getSeconds()).padStart(2, '0');
  const random = String(Math.floor(Math.random() * 1000000)).padStart(6, '0');

  return `IT${year}${month}${day}${hour}${minute}${second}${random}`;
}

/**
 * 获取当前月份标签
 * 格式：YYYY-MM
 * @returns {string} 月份标签
 */
function getCurrentMonthTag() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * 获取默认业绩对象
 * 用于新用户或数据初始化
 * @returns {Object} 业绩对象
 */
function getDefaultPerformance() {
  return {
    totalSales: 0,
    monthSales: 0,
    monthTag: getCurrentMonthTag(),
    teamCount: 0
  };
}

/**
 * 检查是否需要跨月重置
 * @param {string} userMonthTag - 用户记录的月份标签
 * @returns {boolean} 是否需要重置
 */
function shouldResetMonthly(userMonthTag) {
  if (!userMonthTag) return true;
  return userMonthTag !== getCurrentMonthTag();
}

/**
 * 生成邀请码
 * 格式：6位字母数字组合
 * @returns {string} 邀请码
 */
function generateInviteCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * 安全地解析 JSON
 * @param {string} jsonString - JSON 字符串
 * @param {*} defaultValue - 解析失败时的默认值
 * @returns {*} 解析结果或默认值
 */
function safeParseJSON(jsonString, defaultValue = null) {
  try {
    return JSON.parse(jsonString);
  } catch (e) {
    return defaultValue;
  }
}

/**
 * 安全地获取对象属性
 * @param {Object} obj - 目标对象
 * @param {string} path - 属性路径，如 'a.b.c'
 * @param {*} defaultValue - 默认值
 * @returns {*} 属性值或默认值
 */
function safeGet(obj, path, defaultValue = undefined) {
  const keys = path.split('.');
  let current = obj;

  for (const key of keys) {
    if (current === null || current === undefined) {
      return defaultValue;
    }
    current = current[key];
  }

  return current !== undefined ? current : defaultValue;
}

module.exports = {
  generateTransactionNo,
  getCurrentMonthTag,
  getDefaultPerformance,
  shouldResetMonthly,
  generateInviteCode,
  safeParseJSON,
  safeGet
};
