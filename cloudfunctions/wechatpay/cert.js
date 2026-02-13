/**
 * 微信支付平台证书管理
 * 下载、缓存微信支付平台证书用于验签
 */

const https = require('https');
const { generateSignature, generateNonceStr, generateTimestamp } = require('./sign');

// 微信支付平台证书下载地址
const CERT_URL = 'https://api.mch.weixin.qq.com/v3/certificates';

// 内存缓存平台证书
let cachedCertificates = null;
let lastDownloadTime = 0;
const CACHE_DURATION = 12 * 60 * 60 * 1000; // 12小时缓存

/**
 * 获取微信支付平台证书
 * @param {object} config - 配置 { mchid, serialNo, privateKey }
 * @param {boolean} forceRefresh - 是否强制刷新
 * @returns {Promise<object[]>} 证书数组 [{ serial_no, effective_time, expire_time, public_key }]
 */
async function getPlatformCertificates(config, forceRefresh = false) {
  // 检查缓存
  if (!forceRefresh && cachedCertificates && (Date.now() - lastDownloadTime) < CACHE_DURATION) {
    return cachedCertificates;
  }
  
  try {
    const certificates = await downloadCertificates(config);
    cachedCertificates = certificates;
    lastDownloadTime = Date.now();
    return certificates;
  } catch (error) {
    console.error('下载平台证书失败:', error);
    // 如果有缓存，降级使用缓存
    if (cachedCertificates) {
      console.log('使用缓存的证书');
      return cachedCertificates;
    }
    throw error;
  }
}

/**
 * 从微信支付服务器下载平台证书
 */
async function downloadCertificates(config) {
  const { mchid, serialNo, privateKey, apiV3Key } = config;
  
  const method = 'GET';
  const url = '/v3/certificates';
  const timestamp = generateTimestamp();
  const nonceStr = generateNonceStr();
  
  // 构建签名
  const signatureStr = `${method}\n${url}\n${timestamp}\n${nonceStr}\n\n`;
  const signature = generateSignature(signatureStr, privateKey);
  
  const authorization = `WECHATPAY2-SHA256-RSA2048 mchid="${mchid}",nonce_str="${nonceStr}",signature="${signature}",timestamp="${timestamp}",serial_no="${serialNo}"`;
  
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.mch.weixin.qq.com',
      port: 443,
      path: url,
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
          
          if (result.data && Array.isArray(result.data)) {
            // 解密证书
            const decrypt = require('./decrypt').decrypt;
            const certificates = result.data.map(cert => {
              const decryptedCert = decrypt(
                cert.encrypt_certificate.ciphertext,
                cert.encrypt_certificate.associated_data,
                cert.encrypt_certificate.nonce,
                apiV3Key
              );
              
              return {
                serial_no: cert.serial_no,
                effective_time: cert.effective_time,
                expire_time: cert.expire_time,
                public_key: decryptedCert.certificate
              };
            });
            
            resolve(certificates);
          } else if (result.code) {
            reject(new Error(`微信支付错误: ${result.code} - ${result.message}`));
          } else {
            reject(new Error('下载证书响应格式错误'));
          }
        } catch (error) {
          reject(error);
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.setTimeout(15000, () => {
      req.destroy();
      reject(new Error('请求超时'));
    });
    
    req.end();
  });
}

/**
 * 根据序列号获取公钥
 * @param {string} serialNo - 证书序列号
 * @param {object} config - 配置
 * @returns {Promise<string>} 公钥
 */
async function getPublicKeyBySerialNo(serialNo, config) {
  const certificates = await getPlatformCertificates(config);
  const cert = certificates.find(c => c.serial_no === serialNo);
  
  if (!cert) {
    // 如果找不到，尝试强制刷新
    const freshCerts = await getPlatformCertificates(config, true);
    const freshCert = freshCerts.find(c => c.serial_no === serialNo);
    
    if (!freshCert) {
      throw new Error(`找不到序列号为 ${serialNo} 的平台证书`);
    }
    
    return freshCert.public_key;
  }
  
  return cert.public_key;
}

/**
 * 验证证书是否过期
 */
function isCertificateExpired(cert) {
  const expireTime = new Date(cert.expire_time);
  return expireTime < new Date();
}

/**
 * 清除证书缓存
 */
function clearCache() {
  cachedCertificates = null;
  lastDownloadTime = 0;
}

module.exports = {
  getPlatformCertificates,
  getPublicKeyBySerialNo,
  downloadCertificates,
  isCertificateExpired,
  clearCache
};
