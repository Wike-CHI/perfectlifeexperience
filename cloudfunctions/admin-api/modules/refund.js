/**
 * 退款管理模块
 */
const { calcPagination } = require('./common/pagination');

const WALLETS_COLLECTION = 'user_wallets';
const TRANSACTIONS_COLLECTION = 'wallet_transactions';

/**
 * 退款到用户钱包（余额支付）
 */
async function refundToWallet(db, openid, amount, orderNo, refundId) {
  try {
    // 查询用户钱包
    const walletRes = await db.collection(WALLETS_COLLECTION).where({
      _openid: openid
    }).get();

    let wallet;
    let newBalance;
    if (walletRes.data.length === 0) {
      // 如果没有钱包记录，创建一个
      const addRes = await db.collection(WALLETS_COLLECTION).add({
        data: {
          _openid: openid,
          balance: amount,
          totalRecharge: 0,
          totalGift: 0,
          updateTime: db.serverDate()
        }
      });
      newBalance = amount;
      wallet = { _id: addRes._id, balance: 0 };
    } else {
      wallet = walletRes.data[0];
      newBalance = wallet.balance + amount;
      // 增加余额
      await db.collection(WALLETS_COLLECTION).doc(wallet._id).update({
        data: {
          balance: newBalance,
          updateTime: db.serverDate()
        }
      });
    }

    // 记录交易明细
    await db.collection(TRANSACTIONS_COLLECTION).add({
      data: {
        _openid: openid,
        type: 'refund',
        amount: amount,
        balance: newBalance,
        orderNo: orderNo,
        refundId: refundId,
        remark: `退款-订单${orderNo}`,
        createTime: db.serverDate()
      }
    });

    return { success: true };
  } catch (error) {
    console.error('退款到钱包失败:', error);
    return { success: false, error: error.message };
  }
}

async function getRefundList(db, data) {
  try {
    const { page = 1, limit = 20, status } = data || {};
    const { skip, limit: validLimit } = calcPagination(page, limit);
    let query = {};
    if (status && status !== 'all') query.refundStatus = status;

    const [result, count] = await Promise.all([
      db.collection('refunds').where(query).orderBy('createTime', 'desc').skip(skip).limit(validLimit).get(),
      db.collection('refunds').where(query).count()
    ]);

    const refunds = result.data;

    // 批量获取用户信息
    if (refunds.length > 0) {
      const openids = [...new Set(refunds.map(r => r._openid).filter(Boolean))];
      let usersMap = {};

      if (openids.length > 0) {
        // 分批查询用户信息（每次最多查询20个）
        for (let i = 0; i < openids.length; i += 20) {
          const batchOpenids = openids.slice(i, i + 20);
          const userResult = await db.collection('users').where({
            _openid: db.command.in(batchOpenids)
          }).get();

          userResult.data.forEach(user => {
            usersMap[user._openid] = user;
          });
        }
      }

      // 为每条退款记录关联用户信息
      refunds.forEach(refund => {
        refund.user = usersMap[refund._openid] || null;
      });
    }

    return { code: 0, data: { list: refunds, total: count.total, page, limit: validLimit } };
  } catch (error) {
    return { code: 500, msg: error.message };
  }
}

async function getRefundDetail(db, data) {
  try {
    const { id } = data || {};
    const result = await db.collection('refunds').doc(id).get();
    if (!result.data) return { code: 404, msg: '退款记录不存在' };
    return { code: 0, data: result.data };
  } catch (error) {
    return { code: 500, msg: error.message };
  }
}

async function approveRefund(db, logOperation, data, wxContext, cloudcall) {
  try {
    const { id, refundId } = data || {};
    // 同时支持 id 和 refundId 参数
    const refundDocId = id || refundId;

    // 获取退款记录以获取订单ID
    const refundRes = await db.collection('refunds').doc(refundDocId).get();
    if (!refundRes.data) {
      return { code: 404, msg: '退款记录不存在' };
    }

    const refund = refundRes.data;
    const orderId = refund.orderId;

    // 获取订单信息（包含支付方式和金额）
    const orderRes = await db.collection('orders').doc(orderId).get();
    if (!orderRes.data) {
      return { code: 404, msg: '订单不存在' };
    }

    const order = orderRes.data;
    const paymentMethod = order.paymentMethod || 'balance'; // 支付方式：balance-余额, wechat-微信支付
    const refundAmount = refund.refundAmount || order.totalAmount; // 退款金额，优先使用退款申请中指定的金额

    // 执行实际退款
    let refundResult = { success: true };

    if (paymentMethod === 'balance') {
      // 余额支付，退款到用户钱包
      const userOpenid = order._openid;
      refundResult = await refundToWallet(db, userOpenid, refundAmount, order.orderNo, refundDocId);
    } else if (paymentMethod === 'wechat') {
      // 微信支付，调用微信支付退款接口
      if (cloudcall) {
        try {
          // 生成退款单号
          const refundNo = `R${Date.now()}${Math.random().toString(36).substr(2, 9)}`;
          const wechatRefundRes = await cloudcall({
            name: 'wechatpay',
            data: {
              action: 'createRefund',
              data: {
                orderNo: order.orderNo,
                refundNo: refundNo,
                refundAmount: Math.round(refundAmount), // 退款金额单位已是分，无需转换
                reason: '用户申请退款'
              }
            }
          });
          if (wechatRefundRes.result && wechatRefundRes.result.code !== 0) {
            refundResult = { success: false, error: wechatRefundRes.result.msg || '微信支付退款失败' };
          }
        } catch (wechatError) {
          console.error('微信支付退款调用失败:', wechatError);
          refundResult = { success: false, error: wechatError.message };
        }
      }
    }

    if (!refundResult.success) {
      return { code: 500, msg: `退款失败: ${refundResult.error}` };
    }

    // 更新退款记录状态
    await db.collection('refunds').doc(refundDocId).update({
      data: {
        refundStatus: 'approved',
        status: 'approved',
        refundAmount: refundAmount,
        refundTime: db.serverDate(),
        updateTime: db.serverDate()
      }
    });

    // 更新订单状态为"已退款"
    await db.collection('orders').doc(orderId).update({
      data: {
        status: 'refunded',
        paymentStatus: 'refunded',
        updateTime: db.serverDate()
      }
    });

    // 记录操作日志
    await logOperation('approveRefund', {
      refundId: refundDocId,
      orderId: orderId,
      refundAmount: refundAmount,
      paymentMethod: paymentMethod
    });

    return { code: 0, msg: '退款已批准，资金已退回' };
  } catch (error) {
    return { code: 500, msg: error.message };
  }
}

async function confirmReceipt(db, logOperation, data, wxContext, cloudcall) {
  try {
    const { id, refundId } = data || {};
    const refundDocId = id || refundId;

    // 获取退款记录以获取订单ID
    const refundRes = await db.collection('refunds').doc(refundDocId).get();
    if (!refundRes.data) {
      return { code: 404, msg: '退款记录不存在' };
    }

    const refund = refundRes.data;
    const orderId = refund.orderId;

    // 获取订单信息
    const orderRes = await db.collection('orders').doc(orderId).get();
    if (!orderRes.data) {
      return { code: 404, msg: '订单不存在' };
    }

    const order = orderRes.data;
    const paymentMethod = order.paymentMethod || 'balance';
    const refundAmount = refund.refundAmount || order.totalAmount;

    // 执行实际退款
    let refundResult = { success: true };

    if (paymentMethod === 'balance') {
      // 余额支付，退款到用户钱包
      const userOpenid = order._openid;
      refundResult = await refundToWallet(db, userOpenid, refundAmount, order.orderNo, refundDocId);
    } else if (paymentMethod === 'wechat') {
      // 微信支付，调用微信支付退款接口
      if (cloudcall) {
        try {
          // 生成退款单号
          const refundNo = `R${Date.now()}${Math.random().toString(36).substr(2, 9)}`;
          const wechatRefundRes = await cloudcall({
            name: 'wechatpay',
            data: {
              action: 'createRefund',
              data: {
                orderNo: order.orderNo,
                refundNo: refundNo,
                refundAmount: Math.round(refundAmount), // 退款金额单位已是分，无需转换
                reason: '退货退款'
              }
            }
          });
          if (wechatRefundRes.result && wechatRefundRes.result.code !== 0) {
            refundResult = { success: false, error: wechatRefundRes.result.msg || '微信支付退款失败' };
          }
        } catch (wechatError) {
          console.error('微信支付退款调用失败:', wechatError);
          refundResult = { success: false, error: wechatError.message };
        }
      }
    }

    if (!refundResult.success) {
      return { code: 500, msg: `退款失败: ${refundResult.error}` };
    }

    // 更新退款记录状态
    await db.collection('refunds').doc(refundDocId).update({
      data: {
        refundStatus: 'completed',
        status: 'completed',
        refundAmount: refundAmount,
        refundTime: db.serverDate(),
        updateTime: db.serverDate()
      }
    });

    // 更新订单状态为"已退款"
    await db.collection('orders').doc(orderId).update({
      data: {
        status: 'refunded',
        paymentStatus: 'refunded',
        updateTime: db.serverDate()
      }
    });

    // 记录操作日志
    await logOperation('confirmReceipt', {
      refundId: refundDocId,
      orderId: orderId,
      refundAmount: refundAmount,
      paymentMethod: paymentMethod
    });

    return { code: 0, msg: '已确认收货，退款已完成' };
  } catch (error) {
    return { code: 500, msg: error.message };
  }
}

async function rejectRefund(db, logOperation, data, wxContext) {
  try {
    const { id, refundId, reason } = data || {};
    const refundDocId = id || refundId;

    // 获取退款记录以获取订单ID和原订单状态
    const refundRes = await db.collection('refunds').doc(refundDocId).get();
    if (!refundRes.data) {
      return { code: 404, msg: '退款记录不存在' };
    }

    const refund = refundRes.data;
    const orderId = refund.orderId;
    const originalStatus = refund.originalStatus || 'paid'; // 恢复原订单状态

    // 更新退款记录状态
    await db.collection('refunds').doc(refundDocId).update({
      data: { refundStatus: 'rejected', status: 'rejected', rejectReason: reason, updateTime: db.serverDate() }
    });

    // 恢复订单状态为原状态
    await db.collection('orders').doc(orderId).update({
      data: {
        status: originalStatus,
        updateTime: db.serverDate()
      }
    });

    return { code: 0, msg: '退款已拒绝' };
  } catch (error) {
    return { code: 500, msg: error.message };
  }
}

async function retryRefund(db, logOperation, data, wxContext) {
  try {
    const { id, refundId } = data || {};
    const refundDocId = id || refundId;
    await db.collection('refunds').doc(refundDocId).update({ data: { status: 'processing', updateTime: db.serverDate() } });
    return { code: 0, msg: '正在重试退款' };
  } catch (error) {
    return { code: 500, msg: error.message };
  }
}

module.exports = { getRefundList, getRefundDetail, approveRefund, confirmReceipt, rejectRefund, retryRefund };
