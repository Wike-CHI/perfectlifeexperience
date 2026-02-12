/**
 * 解析云函数事件参数
 * 兼容直接调用和 HTTP 触发器调用
 */
function parseEvent(event) {
  if (!event) return {};
  
  // 如果是 HTTP 调用，参数通常在 body 中
  if (event.body) {
    try {
      // 尝试解析 JSON 字符串
      const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
      // 合并 query 参数（如果有）
      return { ...body, ...(event.queryStringParameters || {}) };
    } catch (e) {
      console.warn('解析 event.body 失败:', e);
      return event.body || {};
    }
  }
  
  // 如果是直接调用，event 本身就是参数对象
  return event;
}

/**
 * 获取用户身份 (占位符，index.js 中暂未使用)
 */
function getUserIdentity(context, event) {
  return {};
}

/**
 * 鉴权中间件 (占位符，index.js 中暂未使用)
 */
function withAuth(handler) {
  return handler;
}

/**
 * 检查是否为废弃的鉴权方式 (占位符，index.js 中暂未使用)
 */
function isDeprecatedAuth() {
  return false;
}

module.exports = {
  parseEvent,
  getUserIdentity,
  withAuth,
  isDeprecatedAuth
};
