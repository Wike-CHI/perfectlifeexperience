/**
 * 工具函数
 */

function getCurrentMonthTag() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function getDefaultPerformance() {
  return { totalSales: 0, monthSales: 0, monthTag: getCurrentMonthTag(), teamCount: 0 };
}

function shouldResetMonthly(userMonthTag) {
  if (!userMonthTag) return true;
  return userMonthTag !== getCurrentMonthTag();
}

function generateInviteCode() {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}

function safeParseJSON(str, defaultValue = null) {
  try {
    return JSON.parse(str);
  } catch (e) {
    return defaultValue;
  }
}

function safeGet(obj, path, defaultValue = null) {
  return path.split('.').reduce((acc, key) => (acc && acc[key] !== undefined) ? acc[key] : defaultValue, obj);
}

module.exports = {
  getCurrentMonthTag,
  getDefaultPerformance,
  shouldResetMonthly,
  generateInviteCode,
  safeParseJSON,
  safeGet
};
