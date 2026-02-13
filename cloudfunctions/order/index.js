// 订单管理云函数
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

// Create order
async function createOrder(openid, orderData) {
  try {
    const order = {
      ...orderData,
      _openid: openid,
      createTime: new Date(),
      status: 'pending', // pending, paid, shipping, completed, cancelled
      updateTime: new Date()
    };
    
    const res = await db.collection('orders').add({
      data: order
    });
    
    return {
      success: true,
      orderId: res._id,
      message: '订单创建成功'
    };
  } catch (error) {
    console.error('创建订单失败:', error);
    throw error;
  }
}

// Get orders
async function getOrders(openid, status) {
  try {
    const query = {
      _openid: openid
    };
    
    if (status && status !== 'all') {
      query.status = status;
    }
    
    const res = await db.collection('orders')
      .where(query)
      .orderBy('createTime', 'desc')
      .get();
      
    return {
      success: true,
      orders: res.data,
      message: '获取订单成功'
    };
  } catch (error) {
    console.error('获取订单失败:', error);
    throw error;
  }
}

// Update order status
async function updateOrderStatus(openid, orderId, status) {
  try {
    const updateData = {
      status,
      updateTime: new Date()
    };

    if (status === 'paid') updateData.payTime = new Date();
    else if (status === 'shipping') updateData.shipTime = new Date();
    else if (status === 'completed') updateData.completeTime = new Date();

    // 只能更新自己的订单
    const updateResult = await db.collection('orders').where({
      _id: orderId,
      _openid: openid
    }).update({
      data: updateData
    });

    if (updateResult.stats.updated === 0) {
      return { success: false, message: '订单不存在' };
    }

    // 如果订单完成，触发推广奖励结算（统一在完成时结算）
    if (status === 'completed') {
      const orderRes = await db.collection('orders')
        .where({ _id: orderId })
        .get();

      if (orderRes.data.length > 0) {
        const order = orderRes.data[0];

        // 只处理未结算的订单（无论支付方式）
        if (!order.rewardSettled) {
          console.log(`[订单完成] 触发推广奖励结算 订单:${orderId} 支付方式:${order.paymentMethod}`);
          await settleOrderReward(order._openid, orderId, order.totalAmount);
        }
      }
    }

    return {
      success: true,
      message: '订单状态更新成功'
    };
  } catch (error) {
    console.error('更新订单状态失败:', error);
    throw error;
  }
}

// 余额支付订单
async function payWithBalance(openid, { orderId }) {
  const transaction = await db.startTransaction();

  try {
    console.log(`[余额支付] 开始 订单:${orderId} 用户:${openid}`);

    // 1. 获取订单信息
    const orderRes = await transaction.collection('orders')
      .where({ _id: orderId, _openid: openid })
      .get();

    if (orderRes.data.length === 0) {
      await transaction.rollback();
      console.warn('[余额支付] 订单不存在');
      return { success: false, message: '订单不存在' };
    }

    const order = orderRes.data[0];

    if (order.status !== 'pending') {
      await transaction.rollback();
      console.warn('[余额支付] 订单状态异常:', order.status);
      return { success: false, message: '订单状态异常' };
    }

    const orderAmount = order.totalAmount;

    // 2. 获取钱包余额
    const walletRes = await transaction.collection('user_wallets')
      .where({ _openid: openid })
      .get();

    if (walletRes.data.length === 0) {
      await transaction.rollback();
      console.warn('[余额支付] 钱包不存在');
      return { success: false, message: '钱包不存在' };
    }

    const wallet = walletRes.data[0];

    console.log(`[余额支付] 当前余额:${wallet.balance}分 需支付:${orderAmount}分`);

    if (wallet.balance < orderAmount) {
      await transaction.rollback();
      console.warn('[余额支付] 余额不足');
      return {
        success: false,
        message: '余额不足',
        data: {
          currentBalance: wallet.balance,
          requiredAmount: orderAmount,
          shortage: orderAmount - wallet.balance
        }
      };
    }

    // 3. 扣除钱包余额
    await transaction.collection('user_wallets')
      .doc(wallet._id)
      .update({
        data: {
          balance: _.inc(-orderAmount),
          updateTime: db.serverDate()
        }
      });

    console.log(`[余额支付] 扣除余额:${orderAmount}分 剩余:${wallet.balance - orderAmount}分`);

    // 4. 记录交易日志
    await transaction.collection('wallet_transactions')
      .add({
        data: {
          _openid: openid,
          type: 'payment',
          amount: -orderAmount,
          title: `订单支付 - ${order.orderNo}`,
          orderId: order._id,
          status: 'success',
          createTime: db.serverDate()
        }
      });

    console.log('[余额支付] 交易记录已创建');

    // 5. 更新订单状态
    // 注意：统一在订单完成时结算推广奖励，支付成功时不结算
    await transaction.collection('orders')
      .doc(order._id)
      .update({
        data: {
          status: 'paid',
          paymentMethod: 'balance',
          payTime: db.serverDate(),
          rewardSettled: false, // 标记奖励未结算，等订单完成时结算
          updateTime: db.serverDate()
        }
      });

    console.log('[余额支付] 订单状态已更新');

    await transaction.commit();

    console.log('[余额支付] 事务提交成功');

    return {
      success: true,
      message: '支付成功',
      data: {
        orderId: order._id,
        orderNo: order.orderNo,
        paidAmount: orderAmount,
        remainingBalance: wallet.balance - orderAmount
      }
    };

  } catch (error) {
    await transaction.rollback();
    console.error('[余额支付] 失败:', error);
    return { success: false, message: '支付失败，请重试' };
  }
}

// 结算订单推广奖励
async function settleOrderReward(buyerId, orderId, orderAmount) {
  try {
    console.log(`[奖励结算] 开始 买家:${buyerId} 订单:${orderId} 金额:${orderAmount}`);

    const promotion = require('../promotion/index.js');

    // 调用推广系统计算奖励
    const result = await promotion.exports.main(
      {
        action: 'calculateReward',
        orderId,
        buyerId,
        orderAmount,
        isRepurchase: await checkIsRepurchase(buyerId)
      },
      {}
    );

    if (result.code === 0) {
      // 标记订单奖励已结算
      await db.collection('orders')
        .doc(orderId)
        .update({
          data: {
            rewardSettled: true,
            rewardSettleTime: db.serverDate()
          }
        });

      console.log(`[奖励结算] 成功 订单:${orderId} 奖励数:${result.data.rewards.length}`);
    } else {
      console.error(`[奖励结算] 失败 订单:${orderId} 原因:${result.msg}`);
    }

  } catch (error) {
    console.error('[奖励结算] 异常:', error);
  }
}

// 检查是否为复购
async function checkIsRepurchase(buyerId) {
  try {
    const count = await db.collection('orders')
      .where({
        _openid: buyerId,
        status: _.in(['paid', 'shipping', 'completed'])
      })
      .count();

    const isRepurchase = count.total > 1; // 大于1单表示复购
    console.log(`[复购检查] 买家:${buyerId} 订单数:${count.total} 是否复购:${isRepurchase}`);
    return isRepurchase;
  } catch (error) {
    console.error('[复购检查] 失败:', error);
    return false;
  }
}

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  const { action, data } = event;
  
  if (!openid) {
      return { success: false, message: '未登录' };
  }

  try {
    switch (action) {
      case 'createOrder':
        return await createOrder(openid, data);
      case 'getOrders':
        return await getOrders(openid, data ? data.status : null);
      case 'updateOrderStatus':
        return await updateOrderStatus(openid, data.orderId, data.status);
      case 'cancelOrder':
        return await updateOrderStatus(openid, data.orderId, 'cancelled');
      case 'payWithBalance':
        return await payWithBalance(openid, data);
      default:
        return { success: false, message: '未知操作' };
    }
  } catch (error) {
    console.error('云函数执行失败:', error);
    return { success: false, error: error.message };
  }
};
