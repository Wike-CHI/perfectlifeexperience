/**
 * 订单模块 - 奖励结算
 *
 * 包含：订单奖励结算、复购检查
 */
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

// 引入日志
const { createLogger } = require('../common/logger');
const logger = createLogger('reward');

// 引入奖励结算工具
const { settleWithRetry } = require('../common/reward-settlement');

/**
 * 结算订单推广奖励（带重试和告警机制）
 * @param {string} buyerId - 购买者ID
 * @param {string} orderId - 订单ID
 * @param {number} orderAmount - 订单金额
 */
async function settleOrderReward(buyerId, orderId, orderAmount) {
  const doSettle = async (buyerId, orderId, orderAmount) => {
    try {
      logger.info('Reward settlement started', { buyerId, orderId, amount: orderAmount });

      const result = await cloud.callFunction({
        name: 'promotion',
        data: {
          action: 'calculateReward',
          orderId,
          buyerId,
          orderAmount,
          isRepurchase: await checkIsRepurchase(buyerId)
        }
      });

      const promotionResult = result.result;

      if (promotionResult && promotionResult.code === 0) {
        await db.collection('orders')
          .doc(orderId)
          .update({
            data: {
              rewardSettled: true,
              rewardSettleTime: db.serverDate()
            }
          });

        logger.info('Reward settlement completed', {
          orderId,
          rewardsCount: promotionResult.data?.rewards?.length || 0
        });

        return { success: true };
      } else {
        return {
          success: false,
          error: promotionResult?.msg || 'Promotion calculation failed'
        };
      }
    } catch (err) {
      logger.error('Reward settlement error', err);
      return { success: false, error: err.message };
    }
  };

  return await settleWithRetry(buyerId, orderId, orderAmount, doSettle);
}

/**
 * 检查是否为复购
 * @param {string} buyerId - 购买者ID
 */
async function checkIsRepurchase(buyerId) {
  try {
    const count = await db.collection('orders')
      .where({
        _openid: buyerId,
        status: _.in(['paid', 'shipping', 'completed'])
      })
      .count();

    const isRepurchase = count.total >= 2;

    logger.debug('Repurchase check', {
      buyerId,
      orderCount: count.total,
      isRepurchase
    });

    return isRepurchase;
  } catch (error) {
    logger.error('Repurchase check failed', error);
    return false;
  }
}

module.exports = {
  settleOrderReward,
  checkIsRepurchase
};
