/**
 * AES-256-GCM 解密工具
 * 用于解密微信支付回调通知中的敏感数据
 */

const crypto = require('crypto');

/**
 * 使用 AEAD_AES_256_GCM 算法解密数据
 * @param {string} ciphertext - Base64 编码的密文
 * @param {string} associatedData - 附加数据
 * @param {string} nonce - 加密使用的随机串
 * @param {string} apiV3Key - API V3 密钥
 * @returns {object} 解密后的 JSON 对象
 */
function decrypt(ciphertext, associatedData, nonce, apiV3Key) {
  try {
    // 创建解密器
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      Buffer.from(apiV3Key, 'utf8'),
      Buffer.from(nonce, 'utf8'),
      { authTagLength: 16 }
    );
    
    // 设置附加数据
    if (associatedData) {
      decipher.setAAD(Buffer.from(associatedData, 'utf8'));
    }
    
    // 解密
    const ciphertextBuffer = Buffer.from(ciphertext, 'base64');
    const authTag = ciphertextBuffer.slice(-16); // 最后16字节是认证标签
    const encryptedData = ciphertextBuffer.slice(0, -16);
    
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedData, undefined, 'utf8');
    decrypted += decipher.final('utf8');
    
    return JSON.parse(decrypted);
  } catch (error) {
    console.error('解密失败:', error);
    throw new Error('解密失败: ' + error.message);
  }
}

/**
 * 加密数据（用于测试）
 */
function encrypt(plaintext, associatedData, nonce, apiV3Key) {
  const cipher = crypto.createCipheriv(
    'aes-256-gcm',
    Buffer.from(apiV3Key, 'utf8'),
    Buffer.from(nonce, 'utf8'),
    { authTagLength: 16 }
  );
  
  if (associatedData) {
    cipher.setAAD(Buffer.from(associatedData, 'utf8'));
  }
  
  let encrypted = cipher.update(plaintext, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  
  const authTag = cipher.getAuthTag();
  return Buffer.concat([
    Buffer.from(encrypted, 'base64'),
    authTag
  ]).toString('base64');
}

module.exports = {
  decrypt,
  encrypt
};
