/**
 * 微信商家转账到零钱功能
 *
 * 官方文档: https://pay.weixin.qq.com/wiki/doc/apiv3/open/pay/chapter2_8_1.shtml
 *
 * 前置条件:
 * 1. 已在微信支付商家平台开通"商家转账到零钱"权限
 * 2. 已配置商家证书和API密钥
 */

const crypto = require('crypto');
const axios = require('axios');

// 微信支付配置 (从环境变量或配置文件读取)
const config = {
  mchId: process.env.WX_PAY_MCH_ID,                    // 商户号
  apiV3Key: process.env.WX_PAY_API_V3_KEY,              // API v3 密钥
  serialNo: process.env.WX_PAY_SERIAL_NO,               // 证书序列号
  privateKeyPath: process.env.WX_PAY_PRIVATE_KEY_PATH,   // 商户私钥路径
};

/**
 * 微信支付V3签名
 */
function wechatPaySign(url, method, timestamp, nonceStr, body) {
  const message = `${method}\n${url}\n${timestamp}\n${nonceStr}\n${body}\n`;

  // 读取商户私钥
  const privateKey = fs.readFileSync(config.privateKeyPath);

  const sign = crypto.sign('RSA-SHA256', message, privateKey);
  return sign.toString('base64');
}

/**
 * 获取商户证书
 */
function getMerchantCert() {
  return fs.readFileSync(config.privateKeyPath);
}

/**
 * 发起商家转账到零钱
 *
 * @param {Object} params - 转账参数
 * @param {string} params.outBatchNo - 商家批次单号 (需唯一)
 * @param {string} params.openid - 用户openid
 * @param {number} params.amount - 转账金额 (单位: 分)
 * @param {string} params.transferRemark - 转账备注
 * @param {string} params.userName - 用户真实姓名 (可选, >0.5元需填写)
 * @returns {Promise<Object>} 转账结果
 */
async function transferToWechatBalance(params) {
  const {
    outBatchNo,
    openid,
    amount,
    transferRemark = '佣金提现',
    userName
  } = params;

  // 构建请求体
  const requestBody = {
    appid: process.env.WX_PAY_APPID,           // 小程序AppID
    out_batch_no: outBatchNo,                  // 商家批次单号
    batch_name: '佣金提现',                     // 批次名称
    batch_remark: '佣金钱包提现',               // 批次备注
    total_amount: amount,                      // 转账总金额 (分)
    total_num: 1,                              // 转账总笔数
    transfer_detail_list: [
      {
        out_detail_no: `${outBatchNo}_1`,      // 商家明细单号
        transfer_amount: amount,               // 转账金额 (分)
        transfer_remark: transferRemark,       // 转账备注
        openid: openid,                        // 用户openid
        // 用户真实姓名 (需加密, >0.5元必填)
        ...(userName && {
          user_name: encryptUserName(userName)
        })
      }
    ],
    // 通知URL (接收转账结果回调)
    notify_url: process.env.WX_PAY_TRANSFER_NOTIFY_URL
  };

  const url = 'https://api.mch.weixin.qq.com/v3/transfer/batches';
  const method = 'POST';
  const timestamp = Math.floor(Date.now() / 1000);
  const nonceStr = crypto.randomBytes(16).toString('hex');
  const body = JSON.stringify(requestBody);

  // 生成签名
  const signature = wechatPaySign(url, method, timestamp, nonceStr, body);

  // 构建请求头
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `WECHATPAY2-SHA256-RSA2048 mchid="${config.mchId}",nonce_str="${nonceStr}",timestamp="${timestamp}",serial_no="${config.serialNo}",signature="${signature}"`,
    'Accept': 'application/json'
  };

  try {
    const response = await axios.post(url, body, { headers });

    if (response.data.status === 'PROCESSING') {
      return {
        success: true,
        batchId: response.data.batch_id,
        outBatchNo: response.data.out_batch_no,
        message: '转账已提交,处理中'
      };
    } else {
      return {
        success: false,
        message: `转账失败: ${JSON.stringify(response.data)}`
      };
    }
  } catch (error) {
    console.error('微信转账失败:', error.response?.data || error.message);
    return {
      success: false,
      message: error.response?.data?.message || '转账请求失败'
    };
  }
}

/**
 * 加密用户姓名 (微信要求使用AES-256-GCM加密)
 */
function encryptUserName(userName) {
  const apiKey = Buffer.from(config.apiV3Key + '=', 'base64');
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', apiKey, iv);

  let encrypted = cipher.update(userName, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  const authTag = cipher.getAuthTag();

  // 组合 iv + ciphertext + authTag 并base64编码
  const combined = Buffer.concat([iv, Buffer.from(encrypted, 'base64'), authTag]);
  return combined.toString('base64');
}

/**
 * 查询转账批次
 *
 * @param {string} outBatchNo - 商家批次单号
 * @returns {Promise<Object>} 转账状态
 */
async function queryTransferBatch(outBatchNo) {
  const url = `https://api.mch.weixin.qq.com/v3/transfer/batches/out-batch-no/${outBatchNo}`;
  const method = 'GET';
  const timestamp = Math.floor(Date.now() / 1000);
  const nonceStr = crypto.randomBytes(16).toString('hex');

  const signature = wechatPaySign(url, method, timestamp, nonceStr, '');

  const headers = {
    'Authorization': `WECHATPAY2-SHA256-RSA2048 mchid="${config.mchId}",nonce_str="${nonceStr}",timestamp="${timestamp}",serial_no="${config.serialNo}",signature="${signature}"`
  };

  try {
    const response = await axios.get(url, { headers });
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error('查询转账状态失败:', error.response?.data || error.message);
    return {
      success: false,
      message: error.response?.data?.message || '查询失败'
    };
  }
}

module.exports = {
  transferToWechatBalance,
  queryTransferBatch
};
