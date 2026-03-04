/**
 * 云函数共享工具函数
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

function getCurrentMonthTag() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function getDefaultPerformance() {
  return { totalSales: 0, monthSales: 0, monthTag: getCurrentMonthTag(), teamCount: 0 };
}

function shouldResetMonthly(userMonthTag) {
  if (!userMonthTag) return true;
  return userMonthTag !== getCurrentMonthTag();
}

function generateInviteCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

module.exports = { generateTransactionNo, getCurrentMonthTag, getDefaultPerformance, shouldResetMonthly, generateInviteCode };
