/**
 * 微信支付统一下单模块
 * 实现 JSAPI 下单和支付参数生成
 */

const https = require('https');
const {
  generateSignature,
  generateNonceStr,
  generateTimestamp,
  getCertificateSerialNo
} = require('./sign');

// 微信支付 API 基础地址
const API_BASE = 'api.mch.weixin.qq.com';

/**
 * 统一下单 - JSAPI 支付
 * @param {object} params - 订单参数
 * @param {object} config - 商户配置
 * @returns {Promise<object>} 预支付交易会话标识
 */
async function jsapiOrder(params, config) {
  const { appid, mchid, description, out_trade_no, notify_url, amount, payer } = params;
  
  const body = JSON.stringify({
    appid,
    mchid,
    description,
    out_trade_no,
    notify_url,
    amount,
    payer
  });
  
  const result = await requestApi('POST', '/v3/pay/transactions/jsapi', body, config);
  
  return result;
}

/**
 * 查询订单 - 根据商户订单号
 * @param {string} outTradeNo - 商户订单号
 * @param {object} config - 商户配置
 */
async function queryOrderByOutTradeNo(outTradeNo, config) {
  const { mchid } = config;
  const result = await requestApi('GET', `/v3/pay/transactions/out-trade-no/${outTradeNo}?mchid=${mchid}`, '', config);
  return result;
}

/**
 * 查询订单 - 根据微信支付订单号
 * @param {string} transactionId - 微信支付订单号
 * @param {object} config - 商户配置
 */
async function queryOrderByTransactionId(transactionId, config) {
  const { mchid } = config;
  const result = await requestApi('GET', `/v3/pay/transactions/id/${transactionId}?mchid=${mchid}`, '', config);
  return result;
}

/**
 * 关闭订单
 * @param {string} outTradeNo - 商户订单号
 * @param {object} config - 商户配置
 */
async function closeOrder(outTradeNo, config) {
  const { mchid } = config;
  const body = JSON.stringify({ mchid });
  
  const result = await requestApi('POST', `/v3/pay/transactions/out-trade-no/${outTradeNo}/close`, body, config);
  return result;
}

/**
 * 申请退款
 * @param {object} params - 退款参数
 * @param {object} config - 商户配置
 */
async function refund(params, config) {
  const body = JSON.stringify(params);
  const result = await requestApi('POST', '/v3/refund/domestic/refunds', body, config);
  return result;
}

/**
 * 查询退款
 * @param {string} outRefundNo - 商户退款单号
 * @param {object} config - 商户配置
 */
async function queryRefund(outRefundNo, config) {
  const result = await requestApi('GET', `/v3/refund/domestic/refunds/${outRefundNo}`, '', config);
  return result;
}

/**
 * 生成小程序支付参数
 * 用于 wx.requestPayment 调用
 * @param {string} prepayId - 预支付交易会话标识
 * @param {object} config - 商户配置
 * @returns {object} 支付参数
 */
function generateMiniProgramPayParams(prepayId, config) {
  const { appid, privateKey } = config;
  const timeStamp = generateTimestamp();
  const nonceStr = generateNonceStr();
  const packageStr = `prepay_id=${prepayId}`;
  
  // 签名串：应用ID\n时间戳\n随机串\n预支付交易会话标识\n
  const message = `${appid}\n${timeStamp}\n${nonceStr}\n${packageStr}\n`;
  const paySign = generateSignature(message, privateKey);
  
  return {
    appId: appid,
    timeStamp,
    nonceStr,
    package: packageStr,
    signType: 'RSA',
    paySign
  };
}

/**
 * 通用 API 请求方法
 */
async function requestApi(method, path, body, config) {
  const { mchid, serialNo, privateKey } = config;
  
  const timestamp = generateTimestamp();
  const nonceStr = generateNonceStr();
  
  // 构建签名串
  const signatureStr = `${method}\n${path}\n${timestamp}\n${nonceStr}\n${body || ''}\n`;
  const signature = generateSignature(signatureStr, privateKey);
  
  const authorization = `WECHATPAY2-SHA256-RSA2048 mchid="${mchid}",nonce_str="${nonceStr}",signature="${signature}",timestamp="${timestamp}",serial_no="${serialNo}"`;
  
  return new Promise((resolve, reject) => {
    const options = {
      hostname: API_BASE,
      port: 443,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': authorization
      }
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(result);
          } else {
            reject({
              statusCode: res.statusCode,
              code: result.code,
              message: result.message
            });
          }
        } catch (error) {
          reject({
            statusCode: res.statusCode,
            message: '响应解析失败',
            raw: data
          });
        }
      });
    });
    
    req.on('error', (error) => {
      reject({
        code: 'NETWORK_ERROR',
        message: error.message
      });
    });
    
    req.setTimeout(15000, () => {
      req.destroy();
      reject({
        code: 'TIMEOUT',
        message: '请求超时'
      });
    });
    
    if (body && method !== 'GET') {
      req.write(body);
    }
    
    req.end();
  });
}

/**
 * 生成商户订单号
 * 格式：年月日时分秒 + 6位随机数
 */
function generateOutTradeNo() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hour = String(now.getHours()).padStart(2, '0');
  const minute = String(now.getMinutes()).padStart(2, '0');
  const second = String(now.getSeconds()).padStart(2, '0');
  const random = String(Math.floor(Math.random() * 1000000)).padStart(6, '0');
  
  return `${year}${month}${day}${hour}${minute}${second}${random}`;
}

module.exports = {
  jsapiOrder,
  queryOrderByOutTradeNo,
  queryOrderByTransactionId,
  closeOrder,
  refund,
  queryRefund,
  generateMiniProgramPayParams,
  generateOutTradeNo
};
