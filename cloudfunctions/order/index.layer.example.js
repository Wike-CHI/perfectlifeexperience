/**
 * 订单管理云函数 - 使用 Layer 版本
 *
 * 这个文件展示如何使用 CloudBase Layer 来引用共享代码
 * 部署 Layer 后，将此文件重命名为 index.js 即可使用
 */

const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

// ============================================================
// 🔄 使用 Layer 引入共享模块（部署后使用此方式）
// ============================================================
// Layer 部署后，共享代码位于 /opt/shared 目录
// const {
//   createLogger,
//   LOG_LEVELS,
//   success,
//   error,
//   ErrorCodes,
//   Amount,
//   Collections,
//   Time,
//   OrderStatus,
//   userCache,
//   productCache,
//   checkRateLimit,
//   validateAmount,
//   validateObject,
//   settleWithRetry
// } = require('/opt/shared');

// const logger = createLogger('order');

// ============================================================
// ⚠️ 本地开发时使用此方式（兼容现有代码）
// ============================================================
const { createLogger } = require('./common/logger');
const logger = createLogger('order');

const { validateAmount, validateObject } = require('./common/validator');
const { success, error, ErrorCodes } = require('./common/response');
const {
  Amount,
  Collections,
  Time,
  OrderStatus
} = require('./common/constants');
const { userCache, productCache } = require('./common/cache');
const { checkRateLimit } = require('./common/rateLimiter');
const { settleWithRetry } = require('./common/reward-settlement');

// ============================================================
// 业务逻辑保持不变
// ============================================================

/**
 * 生成库存流水号
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
 * 解析事件参数
 */
function parseEvent(event) {
  if (event.body) {
    try {
      return typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    } catch (e) {
      logger.error('Failed to parse event body', e);
    }
  }
  return event;
}

/**
 * 主入口函数
 */
exports.main = async (event, context) => {
  logger.debug('Order event received', { action: event.action });

  const requestData = parseEvent(event);
  const { action, data } = requestData;

  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  const clientIP = wxContext.CLIENTIP;

  if (!openid) {
    logger.warn('Unauthorized access attempt');
    return error(ErrorCodes.NOT_LOGIN, '未登录或登录已过期');
  }

  // 频率限制检查
  const rateLimitActions = ['createOrder', 'cancelOrder', 'applyRefund'];
  if (rateLimitActions.includes(action)) {
    const rateLimitResult = await checkRateLimit(db, action, openid, clientIP);
    if (!rateLimitResult.allowed) {
      return error(ErrorCodes.RATE_LIMIT_EXCEEDED, rateLimitResult.message);
    }
  }

  try {
    switch (action) {
      case 'createOrder':
        return await handleCreateOrder(data, openid, clientIP);
      case 'getOrders':
        return await handleGetOrders(data, openid);
      case 'getOrderDetail':
        return await handleGetOrderDetail(data, openid);
      case 'updateOrderStatus':
        return await handleUpdateOrderStatus(data, openid);
      case 'cancelOrder':
        return await handleCancelOrder(data, openid);
      case 'payWithBalance':
        return await handlePayWithBalance(data, openid);
      case 'applyRefund':
        return await handleApplyRefund(data, openid);
      default:
        return error(ErrorCodes.INVALID_PARAMS, `Unknown action: ${action}`);
    }
  } catch (err) {
    logger.error('Order function error', err);
    return error(ErrorCodes.UNKNOWN_ERROR, err.message);
  }
};

// 业务处理函数...
// （保持原有业务逻辑不变）

async function handleCreateOrder(data, openid, clientIP) {
  // 原有逻辑...
  return success({ orderId: 'example' }, '订单创建成功');
}

async function handleGetOrders(data, openid) {
  // 原有逻辑...
  return success({ list: [], total: 0 });
}

async function handleGetOrderDetail(data, openid) {
  // 原有逻辑...
  return success({});
}

async function handleUpdateOrderStatus(data, openid) {
  // 原有逻辑...
  return success(null, '状态更新成功');
}

async function handleCancelOrder(data, openid) {
  // 原有逻辑...
  return success(null, '取消成功');
}

async function handlePayWithBalance(data, openid) {
  // 原有逻辑...
  return success(null, '支付成功');
}

async function handleApplyRefund(data, openid) {
  // 原有逻辑...
  return success(null, '申请成功');
}
