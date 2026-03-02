/**
 * 微信订阅消息通知模块
 *
 * 用于发送各类系统通知给用户
 *
 * 使用方法：
 * 1. 在微信公众平台申请对应的订阅消息模板
 * 2. 将模板ID配置到环境变量或配置文件中
 * 3. 用户需要先订阅消息（前端调用 wx.requestSubscribeMessage）
 * 4. 后端调用此模块发送消息
 */

const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

/**
 * 订阅消息模板ID配置
 * 需要在微信公众平台申请对应的模板
 */
const TEMPLATE_IDS = {
  // 晋升通知模板ID - 需要配置
  PROMOTION: process.env.WX_TEMPLATE_ID_PROMOTION || '',
  // 提现结果通知模板ID - 需要配置
  WITHDRAWAL: process.env.WX_TEMPLATE_ID_WITHDRAWAL || '',
  // 佣金到账通知模板ID - 需要配置
  COMMISSION: process.env.WX_TEMPLATE_ID_COMMISSION || ''
};

/**
 * 发送晋升成功通知
 *
 * 模板示例：
 * {{thing1.DATA}}
 * 晋升等级：{{phrase2.DATA}}
 * 晋升时间：{{time3.DATA}}
 * 备注：{{thing4.DATA}}
 *
 * @param {string} openid - 用户openid
 * @param {object} data - 通知数据
 * @param {string} data.oldLevel - 原等级名称
 * @param {string} data.newLevel - 新等级名称
 * @param {string} data.reason - 晋升原因
 * @returns {Promise<object>} 发送结果
 */
async function sendPromotionNotification(openid, data) {
  const { oldLevel, newLevel, reason } = data;

  if (!TEMPLATE_IDS.PROMOTION) {
    console.warn('[通知] 晋升通知模板ID未配置，跳过发送');
    return { success: false, reason: 'template_not_configured' };
  }

  try {
    const result = await cloud.openapi.subscribeMessage.send({
      touser: openid,
      template_id: TEMPLATE_IDS.PROMOTION,
      page: 'pages/promotion/center',  // 点击跳转页面
      data: {
        thing1: { value: '恭喜您晋升成功！' },           // 通知标题
        phrase2: { value: `${oldLevel} → ${newLevel}` },  // 晋升等级
        time3: { value: formatTime(new Date()) },         // 晋升时间
        thing4: { value: reason || '达到晋升条件' }       // 备注
      },
      miniprogram_state: 'formal',  // 跳转小程序类型：formal(正式版), developer(开发版), trial(体验版)
      lang: 'zh_CN'
    });

    console.log('[通知] 晋升通知发送成功:', result);
    return { success: true, msgId: result.msgId };
  } catch (error) {
    console.error('[通知] 晋升通知发送失败:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 发送提现结果通知
 *
 * 模板示例：
 * {{thing1.DATA}}
 * 提现金额：{{amount2.DATA}}
 * 提现状态：{{phrase3.DATA}}
 * 到账时间：{{time4.DATA}}
 *
 * @param {string} openid - 用户openid
 * @param {object} data - 通知数据
 * @param {number} data.amount - 提现金额（分）
 * @param {string} data.status - 提现状态
 * @param {string} data.time - 到账时间
 * @returns {Promise<object>} 发送结果
 */
async function sendWithdrawalNotification(openid, data) {
  const { amount, status, time } = data;

  if (!TEMPLATE_IDS.WITHDRAWAL) {
    console.warn('[通知] 提现通知模板ID未配置，跳过发送');
    return { success: false, reason: 'template_not_configured' };
  }

  try {
    const result = await cloud.openapi.subscribeMessage.send({
      touser: openid,
      template_id: TEMPLATE_IDS.WITHDRAWAL,
      page: 'pages/commission-wallet/index',
      data: {
        thing1: { value: '佣金提现通知' },
        amount2: { value: `¥${(amount / 100).toFixed(2)}元` },
        phrase3: { value: status },
        time4: { value: time || formatTime(new Date()) }
      },
      miniprogram_state: 'formal',
      lang: 'zh_CN'
    });

    console.log('[通知] 提现通知发送成功:', result);
    return { success: true, msgId: result.msgId };
  } catch (error) {
    console.error('[通知] 提现通知发送失败:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 发送佣金到账通知
 *
 * 模板示例：
 * {{thing1.DATA}}
 * 佣金金额：{{amount2.DATA}}
 * 来源：{{thing3.DATA}}
 * 时间：{{time4.DATA}}
 *
 * @param {string} openid - 用户openid
 * @param {object} data - 通知数据
 * @param {number} data.amount - 佣金金额（分）
 * @param {string} data.source - 佣金来源
 * @returns {Promise<object>} 发送结果
 */
async function sendCommissionNotification(openid, data) {
  const { amount, source } = data;

  if (!TEMPLATE_IDS.COMMISSION) {
    console.warn('[通知] 佣金通知模板ID未配置，跳过发送');
    return { success: false, reason: 'template_not_configured' };
  }

  try {
    const result = await cloud.openapi.subscribeMessage.send({
      touser: openid,
      template_id: TEMPLATE_IDS.COMMISSION,
      page: 'pages/promotion/center',
      data: {
        thing1: { value: '佣金到账通知' },
        amount2: { value: `¥${(amount / 100).toFixed(2)}元` },
        thing3: { value: source || '推广订单' },
        time4: { value: formatTime(new Date()) }
      },
      miniprogram_state: 'formal',
      lang: 'zh_CN'
    });

    console.log('[通知] 佣金通知发送成功:', result);
    return { success: true, msgId: result.msgId };
  } catch (error) {
    console.error('[通知] 佣金通知发送失败:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 格式化时间
 */
function formatTime(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hour}:${minute}`;
}

module.exports = {
  sendPromotionNotification,
  sendWithdrawalNotification,
  sendCommissionNotification,
  TEMPLATE_IDS
};
