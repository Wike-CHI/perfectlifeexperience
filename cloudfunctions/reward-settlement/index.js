/**
 * 奖励结算补偿任务云函数
 * 定时扫描并处理失败的奖励结算
 */

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const _ = db.command;

const { createLogger } = require('../common/logger');
const logger = createLogger('reward-settlement');

// 引入共享模块
const rewardSettlement = require('../common/reward-settlement');

/**
 * 处理单条失败记录
 * @param {Object} record - 失败记录
 * @returns {Promise<Object>}
 */
async function processFailureRecord(record) {
  const { _id, orderId, buyerId, orderAmount } = record;

  try {
    logger.info('Processing failure record', { orderId });

    // 检查订单是否已结算
    const orderRes = await db.collection('orders').doc(orderId).get();

    if (!orderRes.data) {
      logger.warn('Order not found', { orderId });
      await rewardSettlement.markFailureResolved(_id);
      return { success: false, reason: 'order_not_found' };
    }

    if (orderRes.data.rewardSettled) {
      logger.info('Order already settled', { orderId });
      await rewardSettlement.markFailureResolved(_id);
      return { success: true, reason: 'already_settled' };
    }

    // 重新尝试结算
    const result = await cloud.callFunction({
      name: 'promotion',
      data: {
        action: 'calculateReward',
        orderId,
        buyerId,
        orderAmount
      }
    });

    const promotionResult = result.result;

    if (promotionResult && promotionResult.code === 0) {
      // 标记订单奖励已结算
      await db.collection('orders')
        .doc(orderId)
        .update({
          data: {
            rewardSettled: true,
            rewardSettleTime: db.serverDate()
          }
        });

      // 标记失败记录已解决
      await rewardSettlement.markFailureResolved(_id);

      logger.info('Compensation settlement succeeded', { orderId });
      return { success: true };
    } else {
      // 更新重试计数
      await db.collection('reward_settlement_failures')
        .doc(_id)
        .update({
          data: {
            retryCount: _.inc(1),
            lastRetryTime: db.serverDate(),
            status: record.retryCount + 1 >= rewardSettlement.RETRY_CONFIG.maxRetries
              ? 'exhausted'
              : 'pending',
            lastError: promotionResult?.msg || 'Unknown error',
            updateTime: db.serverDate()
          }
        });

      logger.warn('Compensation settlement failed', {
        orderId,
        reason: promotionResult?.msg
      });
      return { success: false, reason: promotionResult?.msg };
    }
  } catch (err) {
    logger.error('Compensation processing error', { orderId, error: err.message });
    return { success: false, error: err.message };
  }
}

/**
 * 扫描未结算的已完成订单
 * @returns {Promise<Object>}
 */
async function scanUnsettledOrders() {
  try {
    // 查找已完成但未结算的订单（24小时内）
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const res = await db.collection('orders')
      .where({
        status: 'completed',
        rewardSettled: _.neq(true),
        completeTime: _.gte(oneDayAgo)
      })
      .limit(100)
      .get();

    logger.info('Found unsettled orders', { count: res.data.length });

    const results = [];
    for (const order of res.data) {
      // 检查是否已有失败记录
      const existingRes = await db.collection('reward_settlement_failures')
        .where({ orderId: order._id })
        .count();

      if (existingRes.total === 0) {
        // 创建失败记录以便处理
        await db.collection('reward_settlement_failures').add({
          data: {
            orderId: order._id,
            buyerId: order._openid,
            orderAmount: order.totalAmount,
            error: 'Found unsettled order during scan',
            retryCount: 0,
            status: 'pending',
            source: 'scan',
            createTime: db.serverDate(),
            updateTime: db.serverDate()
          }
        });
        results.push(order._id);
      }
    }

    return { success: true, newRecords: results.length };
  } catch (err) {
    logger.error('Scan unsettled orders failed', err);
    return { success: false, error: err.message };
  }
}

/**
 * 主入口
 */
exports.main = async (event, context) => {
  const { action, data } = event;

  logger.info('Reward settlement task started', { action });

  switch (action) {
    case 'processFailures': {
      // 处理待重试的失败记录
      const failures = await rewardSettlement.getAllPendingFailures(data?.limit || 50);
      const results = [];

      for (const record of failures) {
        const result = await processFailureRecord(record);
        results.push({ orderId: record.orderId, ...result });
      }

      return {
        code: 0,
        msg: '处理完成',
        data: {
          processed: results.length,
          results
        }
      };
    }

    case 'scanUnsettled': {
      // 扫描未结算订单
      const result = await scanUnsettledOrders();
      return {
        code: 0,
        msg: '扫描完成',
        data: result
      };
    }

    case 'getStats': {
      // 获取统计信息
      const stats = await rewardSettlement.getSettlementStats();
      return {
        code: 0,
        data: stats
      };
    }

    case 'healthCheck': {
      // 健康检查
      return {
        code: 0,
        msg: 'ok',
        data: {
          service: 'reward-settlement',
          timestamp: new Date().toISOString()
        }
      };
    }

    default:
      return { code: 400, msg: 'Unknown action' };
  }
};
