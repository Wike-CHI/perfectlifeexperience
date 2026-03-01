/**
 * 微信支付回调处理模块
 * 处理支付结果通知
 */

const { verifySignature, buildNotifySignatureString } = require('./sign');
const { decrypt } = require('./decrypt');
const { getPublicKeyBySerialNo } = require('./cert');
const { createLogger } = require('./logger');
const logger = createLogger('wechatpay-notify');

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
  } catch (err) {
    logger.error('解析回调通知失败', err);
    throw err;
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
 * 判断订单类型
 * @param {string} outTradeNo - 商户订单号
 * @returns {'order'|'recharge'} 订单类型
 */
function getOrderType(outTradeNo) {
  // DY 开头为商品订单，RC 开头为充值订单
  if (outTradeNo.startsWith('RC')) {
    return 'recharge';
  }
  return 'order';
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
    // 根据订单号前缀判断订单类型
    const orderType = getOrderType(out_trade_no);
    
    if (orderType === 'recharge') {
      // 充值订单处理
      return await handleRechargeSuccess(transaction, db);
    }
    
    // 商品订单处理
    // 查询订单
    const orderRes = await db.collection('orders')
      .where({
        orderNo: out_trade_no
      })
      .get();

    if (orderRes.data.length === 0) {
      logger.warn('订单不存在', { out_trade_no });
      return { success: false, message: '订单不存在' };
    }

    const order = orderRes.data[0];

    // 检查订单状态，避免重复处理
    if (order.status !== 'pending') {
      logger.info('订单已处理', { out_trade_no, status: order.status });
      return { success: true, message: '订单已处理' };
    }

    // 验证金额
    if (order.totalAmount !== amount.total) {
      logger.error('金额不匹配', { orderAmount: order.totalAmount, payAmount: amount.total });
      return { success: false, message: '金额不匹配' };
    }

    // 更新订单状态（同时更新 status 和 paymentStatus）
    await db.collection('orders')
      .doc(order._id)
      .update({
        data: {
          status: 'paid',
          paymentStatus: 'paid',  // 修复：同时更新支付状态
          paymentMethod: 'wechat',
          payTime: new Date(),
          transactionId: transaction_id,
          openid: payer.openid,
          updateTime: new Date()
        }
      });

    logger.info('订单支付成功', { out_trade_no });

    // 扣减商品库存（安全修复：防止超卖）
    await deductProductStock(order.items, db);

    return { success: true, message: '订单状态更新成功' };
  } catch (err) {
    logger.error('处理支付成功回调失败', err);
    return { success: false, message: err.message };
  }
}

/**
 * 处理充值支付成功回调
 * 更新充值订单状态并增加钱包余额
 */
async function handleRechargeSuccess(transaction, db) {
  const {
    out_trade_no,      // 商户订单号
    transaction_id,    // 微信支付订单号
    amount,            // 支付金额
    payer              // 支付者信息
  } = transaction;
  
  const _ = db.command;
  
  try {
    // 1. 查询充值订单
    const orderRes = await db.collection('recharge_orders')
      .where({
        orderNo: out_trade_no
      })
      .get();

    if (orderRes.data.length === 0) {
      logger.warn('充值订单不存在', { out_trade_no });
      return { success: false, message: '充值订单不存在' };
    }

    const rechargeOrder = orderRes.data[0];

    // 2. 检查订单状态，避免重复处理
    if (rechargeOrder.status === 'paid') {
      logger.info('充值订单已处理', { out_trade_no });
      return { success: true, message: '充值订单已处理' };
    }

    // 3. 验证金额
    if (rechargeOrder.amount !== amount.total) {
      logger.error('充值金额不匹配', { orderAmount: rechargeOrder.amount, payAmount: amount.total });
      return { success: false, message: '充值金额不匹配' };
    }
    
    // 4. 开启事务处理
    const transactionDb = await db.startTransaction();
    
    try {
      // 4.1 更新充值订单状态
      await transactionDb.collection('recharge_orders')
        .doc(rechargeOrder._id)
        .update({
          data: {
            status: 'paid',
            payTime: new Date(),
            transactionId: transaction_id,
            updateTime: new Date()
          }
        });
      
      // 4.2 计算总到账金额（本金 + 赠送）
      const totalAmount = rechargeOrder.amount + (rechargeOrder.giftAmount || 0);
      
      // 4.3 更新钱包余额
      const walletRes = await transactionDb.collection('user_wallets')
        .where({
          _openid: rechargeOrder._openid
        })
        .get();
      
      if (walletRes.data.length === 0) {
        // 创建钱包
        await transactionDb.collection('user_wallets').add({
          data: {
            _openid: rechargeOrder._openid,
            balance: totalAmount,
            totalRecharge: rechargeOrder.amount,
            totalGift: rechargeOrder.giftAmount || 0,
            updateTime: new Date()
          }
        });
      } else {
        // 更新钱包余额
        await transactionDb.collection('user_wallets')
          .doc(walletRes.data[0]._id)
          .update({
            data: {
              balance: _.inc(totalAmount),
              totalRecharge: _.inc(rechargeOrder.amount),
              totalGift: _.inc(rechargeOrder.giftAmount || 0),
              updateTime: new Date()
            }
          });
      }
      
      // 4.4 记录交易流水
      const title = rechargeOrder.giftAmount > 0 
        ? `充值¥${(rechargeOrder.amount / 100).toFixed(0)}（赠¥${(rechargeOrder.giftAmount / 100).toFixed(0)}）`
        : `钱包充值`;
      
      await transactionDb.collection('wallet_transactions').add({
        data: {
          _openid: rechargeOrder._openid,
          type: 'recharge',
          amount: rechargeOrder.amount,
          giftAmount: rechargeOrder.giftAmount || 0,
          totalAmount: totalAmount,
          title: title,
          status: 'success',
          createTime: new Date(),
          orderNo: out_trade_no
        }
      });

      // 提交事务
      await transactionDb.commit();

      logger.info('充值支付成功', { out_trade_no, totalAmount });

      return { success: true, message: '充值成功' };
    } catch (txError) {
      // 回滚事务
      await transactionDb.rollback();
      throw txError;
    }
  } catch (err) {
    logger.error('处理充值支付成功回调失败', err);
    return { success: false, message: err.message };
  }
}

/**
 * 扣减商品库存
 * @param {Array} items - 订单商品列表
 * @param {object} db - 数据库实例
 *
 * 安全修复：使用原子操作扣减库存，防止超卖
 */
async function deductProductStock(items, db) {
  const _ = db.command;

  for (const item of items) {
    try {
      // 判断是否是 SKU 商品
      if (item.skuId && item.skuId !== '') {
        // SKU 商品：扣减 SKU 库存
        const updateResult = await db.collection('products')
          .where({
            _id: item.productId,
            'skus._id': item.skuId,
            'skus.stock': _.gte(item.quantity)  // 确保库存足够
          })
          .update({
            data: {
              'skus.$[elem].stock': _.inc(-item.quantity)
            }
          });

        if (updateResult.stats.updated === 0) {
          logger.warn('SKU库存扣减失败', { productId: item.productId, skuId: item.skuId, quantity: item.quantity });
          // 库存扣减失败，记录日志但不影响支付流程
          // 可以考虑后续人工处理或发送告警
        } else {
          logger.debug('SKU库存扣减成功', { productId: item.productId, skuId: item.skuId, quantity: item.quantity });
        }
      } else {
        // 普通 SKU 商品：扣减商品总库存
        const updateResult = await db.collection('products')
          .where({
            _id: item.productId,
            stock: _.gte(item.quantity)  // 确保库存足够
          })
          .update({
            data: {
              stock: _.inc(-item.quantity)
            }
          });

        if (updateResult.stats.updated === 0) {
          logger.warn('商品库存扣减失败', { productId: item.productId, quantity: item.quantity });
          // 库存扣减失败，记录日志但不影响支付流程
        } else {
          logger.debug('商品库存扣减成功', { productId: item.productId, quantity: item.quantity });
        }
      }
    } catch (err) {
      logger.error('扣减库存异常', err, { productId: item.productId });
      // 库存扣减异常，记录日志但不影响支付流程
    }
  }
}

module.exports = {
  parseNotify,
  buildSuccessResponse,
  buildFailResponse,
  isTimestampValid,
  handlePaymentSuccess,
  handleRechargeSuccess,
  getOrderType,
  deductProductStock
};
