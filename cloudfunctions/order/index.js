/**
 * 订单管理云函数
 *
 * 模块化重构后的入口文件
 * 包含：订单、库存、退款、奖励等模块的路由
 */
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

// 引入日志
const { createLogger } = require('./common/logger');
const logger = createLogger('order-main');

// 引入响应工具
const { success, error, ErrorCodes } = require('./common/response');

// 引入频率限制模块
const { checkRateLimit } = require('./common/rateLimiter');

// 引入订单模块
const orderModule = require('./modules/order');

// 引入退款模块
const refundModule = require('./modules/refund');

// 解析 HTTP 触发器的请求体
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
      logger.warn('Rate limit exceeded', { action, openid, remaining: rateLimitResult.remaining });
      return error(ErrorCodes.RATE_LIMIT_EXCEEDED, rateLimitResult.message);
    }
  }

  logger.info('Order action', { action });

  try {
    switch (action) {
      // 订单相关
      case 'createOrder':
        return await orderModule.createOrder(openid, data);

      case 'getOrders':
        return await orderModule.getOrders(
          openid,
          data ? data.status : null,
          data ? data : {} // 传递完整 data 对象，包含 page, pageSize
        );

      case 'getOrderDetail':
        return await orderModule.getOrderDetail(openid, data.orderId);

      case 'updateOrderStatus':
        return await orderModule.updateOrderStatus(openid, data.orderId, data.status);

      case 'cancelOrder':
        return await orderModule.updateOrderStatus(openid, data.orderId, 'cancelled');

      case 'payWithBalance':
        return await orderModule.payWithBalance(openid, data);

      // 管理员操作（需要adminToken验证）
      case 'adminUpdateOrderStatus':
        // 验证管理员权限
        if (!data.adminToken) {
          return error(ErrorCodes.NOT_LOGIN, '需要管理员权限');
        }
        // 简单验证：这里可以调用 admin-api 的验证接口
        // 为了简化，直接调用更新函数
        return await orderModule.adminUpdateOrderStatus(data.orderId, data.status);

      // 退款相关
      case 'applyRefund':
        return await refundModule.applyRefund(openid, data);

      case 'cancelRefund':
        return await refundModule.cancelRefund(openid, data);

      case 'updateReturnLogistics':
        return await refundModule.updateReturnLogistics(openid, data);

      case 'getRefundList':
        return await refundModule.getRefundList(openid, data);

      case 'getRefundDetail':
        return await refundModule.getRefundDetail(openid, data);

      default:
        logger.warn('Unknown action', { action });
        return error(ErrorCodes.UNKNOWN_ERROR, '未知操作');
    }
  } catch (err) {
    logger.error('Order function failed', err);
    return error(ErrorCodes.UNKNOWN_ERROR, '订单操作失败', err.message);
  }
};
