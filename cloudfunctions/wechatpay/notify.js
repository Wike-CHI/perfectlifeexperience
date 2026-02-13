/**
 * 微信支付回调处理模块
 * 处理支付结果通知
 */

const { verifySignature, buildNotifySignatureString } = require('./sign');
const { decrypt } = require('./decrypt');
const { getPublicKeyBySerialNo } = require('./cert');

/**
 * 解析并验证回调通知
 * @param {object} headers - HTTP 请求头
 * @param {string} body - HTTP 请求体
 * @param {object} config - 商户配置
 * @returns {Promise<object>} 解密后的支付结果
 */
async function parseNotify(headers, body, config) {
  try {
    // 1. 获取签名相关信息
    const signature = headers['wechatpay-signature'];
    const timestamp = headers['wechatpay-timestamp'];
    const nonce = headers['wechatpay-nonce'];
    const serial = headers['wechatpay-serial'];
    
    if (!signature || !timestamp || !nonce || !serial) {
      throw new Error('缺少必要的签名验证头');
    }
    
    // 2. 验证签名
    const message = buildNotifySignatureString(timestamp, nonce, body);
    
    // 获取对应序列号的平台证书公钥
    const publicKey = await getPublicKeyBySerialNo(serial, config);
    
    const isValid = verifySignature(message, signature, publicKey);
    
    if (!isValid) {
      throw new Error('签名验证失败');
    }
    
    // 3. 解析通知内容
    const notification = JSON.parse(body);
    
    if (notification.event_type !== 'TRANSACTION.SUCCESS') {
      return {
        success: false,
        eventType: notification.event_type,
        summary: notification.summary
      };
    }
    
    // 4. 解密资源数据
    const { resource } = notification;
    const paymentResult = decrypt(
      resource.ciphertext,
      resource.associated_data,
      resource.nonce,
      config.apiV3Key
    );
    
    return {
      success: true,
      eventType: notification.event_type,
      transaction: paymentResult
    };
  } catch (error) {
    console.error('解析回调通知失败:', error);
    throw error;
  }
}

/**
 * 构建成功响应
 * 微信支付要求的成功响应格式
 */
function buildSuccessResponse() {
  return {
    code: 'SUCCESS',
    message: '成功'
  };
}

/**
 * 构建失败响应
 * 微信支付会重试
 */
function buildFailResponse(message) {
  return {
    code: 'FAIL',
    message: message || '处理失败'
  };
}

/**
 * 验证时间戳是否在合理范围内（5分钟）
 * 防止重放攻击
 */
function isTimestampValid(timestamp) {
  const now = Math.floor(Date.now() / 1000);
  const diff = Math.abs(now - parseInt(timestamp, 10));
  return diff <= 300; // 5分钟
}

/**
 * 处理支付成功回调
 * 更新订单状态等业务逻辑
 */
async function handlePaymentSuccess(transaction, db) {
  const {
    out_trade_no,      // 商户订单号
    transaction_id,    // 微信支付订单号
    amount,            // 支付金额
    payer              // 支付者信息
  } = transaction;
  
  try {
    // 查询订单
    const orderRes = await db.collection('orders')
      .where({
        orderNo: out_trade_no
      })
      .get();
    
    if (orderRes.data.length === 0) {
      console.error(`订单不存在: ${out_trade_no}`);
      return { success: false, message: '订单不存在' };
    }
    
    const order = orderRes.data[0];
    
    // 检查订单状态，避免重复处理
    if (order.status !== 'pending') {
      console.log(`订单已处理: ${out_trade_no}, 当前状态: ${order.status}`);
      return { success: true, message: '订单已处理' };
    }
    
    // 验证金额
    if (order.totalAmount !== amount.total) {
      console.error(`金额不匹配: 订单${order.totalAmount}分, 支付${amount.total}分`);
      return { success: false, message: '金额不匹配' };
    }
    
    // 更新订单状态
    await db.collection('orders')
      .doc(order._id)
      .update({
        data: {
          status: 'paid',
          paymentMethod: 'wechat',
          payTime: new Date(),
          transactionId: transaction_id,
          openid: payer.openid,
          updateTime: new Date()
        }
      });
    
    console.log(`订单支付成功: ${out_trade_no}`);
    
    return { success: true, message: '订单状态更新成功' };
  } catch (error) {
    console.error('处理支付成功回调失败:', error);
    return { success: false, message: error.message };
  }
}

module.exports = {
  parseNotify,
  buildSuccessResponse,
  buildFailResponse,
  isTimestampValid,
  handlePaymentSuccess
};
