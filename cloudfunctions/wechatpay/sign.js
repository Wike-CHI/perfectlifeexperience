/**
 * RSA-SHA256 签名工具
 * 用于微信支付 V3 API 签名生成和验证
 */

const crypto = require('crypto');

/**
 * 生成 RSA-SHA256 签名
 * @param {string} message - 待签名字符串
 * @param {string} privateKey - PEM 格式私钥
 * @returns {string} Base64 编码的签名
 */
function generateSignature(message, privateKey) {
  // 确保私钥格式正确
  const formattedKey = formatPrivateKey(privateKey);
  
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(message);
  
  return sign.sign(formattedKey, 'base64');
}

/**
 * 验证签名
 * @param {string} message - 原始消息
 * @param {string} signature - Base64 编码的签名
 * @param {string} publicKey - PEM 格式公钥
 * @returns {boolean}
 */
function verifySignature(message, signature, publicKey) {
  try {
    const formattedKey = formatPublicKey(publicKey);
    const verify = crypto.createVerify('RSA-SHA256');
    verify.update(message);
    return verify.verify(formattedKey, signature, 'base64');
  } catch (error) {
    console.error('签名验证失败:', error);
    return false;
  }
}

/**
 * 构建签名串
 * HTTP请求方法\nURL\n请求时间戳\n请求随机串\n请求报文主体\n
 */
function buildSignatureString(method, url, timestamp, nonceStr, body = '') {
  return `${method}\n${url}\n${timestamp}\n${nonceStr}\n${body}\n`;
}

/**
 * 构建回调验证签名串
 * 时间戳\n随机串\n报文主体\n
 */
function buildNotifySignatureString(timestamp, nonce, body) {
  return `${timestamp}\n${nonce}\n${body}\n`;
}

/**
 * 生成 Authorization 头
 */
function buildAuthorization(mchid, serialNo, nonceStr, timestamp, signature) {
  return `WECHATPAY2-SHA256-RSA2048 mchid="${mchid}",nonce_str="${nonceStr}",signature="${signature}",timestamp="${timestamp}",serial_no="${serialNo}"`;
}

/**
 * 格式化私钥（确保 PEM 格式正确）
 */
function formatPrivateKey(key) {
  if (key.includes('-----BEGIN PRIVATE KEY-----')) {
    return key;
  }
  // 如果是 Base64 编码的原始私钥，添加 PEM 头尾
  return `-----BEGIN PRIVATE KEY-----\n${key}\n-----END PRIVATE KEY-----`;
}

/**
 * 格式化公钥（确保 PEM 格式正确）
 */
function formatPublicKey(key) {
  if (key.includes('-----BEGIN CERTIFICATE-----')) {
    return key;
  }
  if (key.includes('-----BEGIN PUBLIC KEY-----')) {
    return key;
  }
  return `-----BEGIN PUBLIC KEY-----\n${key}\n-----END PUBLIC KEY-----`;
}

/**
 * 生成随机字符串
 */
function generateNonceStr(length = 32) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * 生成时间戳（秒）
 */
function generateTimestamp() {
  return Math.floor(Date.now() / 1000).toString();
}

/**
 * 解析证书中的公钥
 */
function extractPublicKeyFromCert(certPem) {
  const cert = new crypto.X509Certificate(certPem);
  return cert.publicKey;
}

/**
 * 获取证书序列号
 */
function getCertificateSerialNo(certPem) {
  const cert = new crypto.X509Certificate(certPem);
  // 获取序列号并转为大写
  return cert.serialNumber.toUpperCase().replace(/:/g, '');
}

module.exports = {
  generateSignature,
  verifySignature,
  buildSignatureString,
  buildNotifySignatureString,
  buildAuthorization,
  generateNonceStr,
  generateTimestamp,
  formatPrivateKey,
  formatPublicKey,
  extractPublicKeyFromCert,
  getCertificateSerialNo
};
