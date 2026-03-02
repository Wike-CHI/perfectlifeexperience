/**
 * 奖励结算模块
 * 提供重试、告警、补偿机制
 */

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const _ = db.command;

// 重试配置
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelayMs: 1000,  // 基础延迟1秒
  maxDelayMs: 10000   // 最大延迟10秒
};

/**
 * 指数退避延迟计算
 * @param {number} retryCount - 重试次数
 * @returns {number} 延迟毫秒数
 */
function calculateDelay(retryCount) {
  const delay = Math.min(
    RETRY_CONFIG.baseDelayMs * Math.pow(2, retryCount),
    RETRY_CONFIG.maxDelayMs
  );
  return delay + Math.random() * 1000; // 添加随机抖动防止惊群效应
}

/**
 * 记录结算失败
 * @param {Object} params - 失败信息
 * @param {string} params.orderId - 订单ID
 * @param {string} params.buyerId - 买家ID
 * @param {number} params.orderAmount - 订单金额
 * @param {string} params.error - 错误信息
 * @param {number} params.retryCount - 已重试次数
 * @returns {Promise<void>}
 */
async function recordSettlementFailure(params) {
  const { orderId, buyerId, orderAmount, error, retryCount = 0 } = params;

  try {
    // 检查是否已有失败记录
    const existingRes = await db.collection('reward_settlement_failures')
      .where({ orderId })
      .get();

    if (existingRes.data.length > 0) {
      // 更新现有记录
      await db.collection('reward_settlement_failures')
        .doc(existingRes.data[0]._id)
        .update({
          data: {
            retryCount: retryCount,
            lastError: error,
            lastRetryTime: db.serverDate(),
            status: retryCount >= RETRY_CONFIG.maxRetries ? 'exhausted' : 'pending',
            updateTime: db.serverDate()
          }
        });
    } else {
      // 创建新记录
      await db.collection('reward_settlement_failures').add({
        data: {
          orderId,
          buyerId,
          orderAmount,
          error,
          retryCount,
          status: 'pending',
          createTime: db.serverDate(),
          lastRetryTime: db.serverDate(),
          updateTime: db.serverDate()
        }
      });
    }

    console.log('[奖励结算] 失败记录已保存', { orderId, retryCount });
  } catch (err) {
    console.error('[奖励结算] 保存失败记录异常', err);
  }
}

/**
 * 发送管理员告警
 * @param {Object} params - 告警参数
 * @param {string} params.orderId - 订单ID
 * @param {string} params.error - 错误信息
 * @param {number} params.retryCount - 重试次数
 * @returns {Promise<void>}
 */
async function sendSettlementAlert(params) {
  const { orderId, error, retryCount } = params;

  try {
    // 存储告警记录到 admin_alerts 集合
    await db.collection('admin_alerts').add({
      data: {
        type: 'reward_settlement_failure',
        severity: retryCount >= RETRY_CONFIG.maxRetries ? 'high' : 'medium',
        title: '推广奖励结算失败',
        message: `订单 ${orderId} 奖励结算失败，已重试 ${retryCount} 次`,
        details: {
          orderId,
          error,
          retryCount,
          timestamp: new Date().toISOString()
        },
        isRead: false,
        isHandled: false,
        createTime: db.serverDate()
      }
    });

    console.log('[奖励结算] 管理员告警已发送', { orderId });

    // TODO: 可选 - 发送微信订阅消息给超级管理员
    // await sendAdminWechatAlert(params);

  } catch (err) {
    console.error('[奖励结算] 发送告警失败', err);
  }
}

/**
 * 带重试的奖励结算
 * @param {string} buyerId - 买家ID
 * @param {string} orderId - 订单ID
 * @param {number} orderAmount - 订单金额
 * @param {Function} settleFn - 结算函数
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function settleWithRetry(buyerId, orderId, orderAmount, settleFn) {
  let lastError = null;

  for (let retryCount = 0; retryCount <= RETRY_CONFIG.maxRetries; retryCount++) {
    try {
      if (retryCount > 0) {
        // 等待退避时间
        const delay = calculateDelay(retryCount - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
        console.log(`[奖励结算] 第 ${retryCount} 次重试`, { orderId });
      }

      // 执行结算
      const result = await settleFn(buyerId, orderId, orderAmount);

      if (result.success) {
        console.log('[奖励结算] 结算成功', { orderId, retryCount });
        return { success: true };
      }

      lastError = result.error || 'Unknown error';

    } catch (err) {
      lastError = err.message;
      console.error(`[奖励结算] 第 ${retryCount} 次尝试失败`, { orderId, error: err.message });
    }
  }

  // 所有重试都失败
  console.error('[奖励结算] 所有重试均失败', { orderId, lastError });

  // 记录失败
  await recordSettlementFailure({
    orderId,
    buyerId,
    orderAmount,
    error: lastError,
    retryCount: RETRY_CONFIG.maxRetries
  });

  // 发送告警
  await sendSettlementAlert({
    orderId,
    error: lastError,
    retryCount: RETRY_CONFIG.maxRetries
  });

  return { success: false, error: lastError };
}

/**
 * 获取待补偿的失败记录
 * @param {number} limit - 获取数量
 * @returns {Promise<Array>}
 */
async function getPendingFailures(limit = 50) {
  try {
    const res = await db.collection('reward_settlement_failures')
      .where({
        status: 'pending',
        retryCount: _.lt(RETRY_CONFIG.maxRetries)
      })
      .orderBy('createTime', 'asc')
      .limit(limit)
      .get();

    return res.data;
  } catch (err) {
    console.error('[奖励结算] 获取待补偿记录失败', err);
    return [];
  }
}

/**
 * 获取所有待处理的失败记录（包括已耗尽重试的）
 * @param {number} limit - 获取数量
 * @returns {Promise<Array>}
 */
async function getAllPendingFailures(limit = 100) {
  try {
    const res = await db.collection('reward_settlement_failures')
      .where({
        status: _.in(['pending', 'exhausted'])
      })
      .orderBy('createTime', 'asc')
      .limit(limit)
      .get();

    return res.data;
  } catch (err) {
    console.error('[奖励结算] 获取所有待处理记录失败', err);
    return [];
  }
}

/**
 * 标记失败记录为已处理
 * @param {string} recordId - 记录ID
 * @returns {Promise<void>}
 */
async function markFailureResolved(recordId) {
  try {
    await db.collection('reward_settlement_failures')
      .doc(recordId)
      .update({
        data: {
          status: 'resolved',
          resolvedTime: db.serverDate(),
          updateTime: db.serverDate()
        }
      });
  } catch (err) {
    console.error('[奖励结算] 标记记录失败', err);
  }
}

/**
 * 更新失败记录的重试状态
 * @param {string} recordId - 记录ID
 * @param {number} retryCount - 新的重试次数
 * @param {string} error - 错误信息
 * @returns {Promise<void>}
 */
async function updateFailureRetry(recordId, retryCount, error) {
  try {
    await db.collection('reward_settlement_failures')
      .doc(recordId)
      .update({
        data: {
          retryCount: retryCount,
          lastError: error,
          lastRetryTime: db.serverDate(),
          status: retryCount >= RETRY_CONFIG.maxRetries ? 'exhausted' : 'pending',
          updateTime: db.serverDate()
        }
      });
  } catch (err) {
    console.error('[奖励结算] 更新重试状态失败', err);
  }
}

/**
 * 获取结算失败统计
 * @returns {Promise<Object>}
 */
async function getSettlementStats() {
  try {
    const [pendingRes, exhaustedRes, resolvedRes] = await Promise.all([
      db.collection('reward_settlement_failures').where({ status: 'pending' }).count(),
      db.collection('reward_settlement_failures').where({ status: 'exhausted' }).count(),
      db.collection('reward_settlement_failures').where({ status: 'resolved' }).count()
    ]);

    return {
      pending: pendingRes.total,
      exhausted: exhaustedRes.total,
      resolved: resolvedRes.total
    };
  } catch (err) {
    console.error('[奖励结算] 获取统计失败', err);
    return { pending: 0, exhausted: 0, resolved: 0 };
  }
}

module.exports = {
  settleWithRetry,
  recordSettlementFailure,
  sendSettlementAlert,
  getPendingFailures,
  getAllPendingFailures,
  markFailureResolved,
  updateFailureRetry,
  getSettlementStats,
  RETRY_CONFIG
};
