/**
 * 通知服务模块
 * 用于发送各种业务通知（订阅消息、模板消息等）
 */

const cloud = require('wx-server-sdk');

/**
 * 发送提现状态通知
 * @param {string} openid - 用户 openid
 * @param {object} data - 通知数据
 * @param {number} data.amount - 提现金额（分）
 * @param {string} data.status - 提现状态
 * @param {string} data.time - 处理时间
 * @returns {Promise<{success: boolean, message?: string}>}
 */
async function sendWithdrawalNotification(openid, data) {
  try {
    // 这里可以实现发送订阅消息或模板消息的逻辑
    // 目前先记录日志，后续可以接入微信订阅消息
    console.log(`[提现通知] 用户: ${openid}, 金额: ${data.amount}分, 状态: ${data.status}, 时间: ${data.time}`);

    // TODO: 接入微信订阅消息发送
    // const result = await cloud.openapi.subscribeMessage.send({
    //   touser: openid,
    //   templateId: 'YOUR_TEMPLATE_ID',
    //   data: {
    //     amount: { value: (data.amount / 100).toFixed(2) + '元' },
    //     status: { value: data.status },
    //     time: { value: data.time }
    //   }
    // });

    return {
      success: true,
      message: '通知已记录'
    };
  } catch (error) {
    console.error('[提现通知] 发送失败:', error);
    return {
      success: false,
      message: error.message
    };
  }
}

/**
 * 发送订单状态通知
 * @param {string} openid - 用户 openid
 * @param {object} data - 通知数据
 * @returns {Promise<{success: boolean, message?: string}>}
 */
async function sendOrderNotification(openid, data) {
  try {
    console.log(`[订单通知] 用户: ${openid}, 订单: ${data.orderNo}, 状态: ${data.status}`);
    return { success: true };
  } catch (error) {
    console.error('[订单通知] 发送失败:', error);
    return { success: false, message: error.message };
  }
}

module.exports = {
  sendWithdrawalNotification,
  sendOrderNotification
};
