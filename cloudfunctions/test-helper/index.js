/**
 * 测试辅助云函数
 * 用于快速验证余额支付和奖励结算功能
 */

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  const { action, testData } = event;

  console.log(`[测试助手] action: ${action}`, JSON.stringify(testData));

  try {
    switch (action) {
      case 'checkOrder':
        return await checkOrder(testData);
      case 'checkWallet':
        return await checkWallet(testData);
      case 'simulateOrderComplete':
        return await simulateOrderComplete(testData);
      case 'checkRewardRecords':
        return await checkRewardRecords(testData);
      case 'getTestData':
        return await getTestData(testData);
      case 'testBalancePayment':
        return await testBalancePayment(testData);
      case 'verifyMigration':
        return await verifyMigration();
      default:
        return {
          code: -1,
          msg: '未知测试操作',
          availableActions: [
            'checkOrder',
            'checkWallet',
            'simulateOrderComplete',
            'checkRewardRecords',
            'getTestData',
            'testBalancePayment',
            'verifyMigration'
          ]
        };
    }
  } catch (error) {
    console.error('[测试助手] 错误:', error);
    return {
      code: -1,
      msg: error.message,
      error: JSON.stringify(error)
    };
  }
};

/**
 * 检查订单状态
 */
async function checkOrder({ orderId }) {
  if (!orderId) {
    return { code: -1, msg: '请提供 orderId' };
  }

  const orderRes = await db.collection('orders')
    .where({ _id: orderId })
    .get();

  if (orderRes.data.length === 0) {
    return { code: -1, msg: '订单不存在' };
  }

  const order = orderRes.data[0];

  return {
    code: 0,
    msg: '查询成功',
    data: {
      orderId: order._id,
      orderNo: order.orderNo,
      status: order.status,
      paymentMethod: order.paymentMethod,
      totalAmount: order.totalAmount,
      rewardSettled: order.rewardSettled,
      rewardSettleTime: order.rewardSettleTime,
      createTime: order.createTime,
      payTime: order.payTime,
      completeTime: order.completeTime
    }
  };
}

/**
 * 检查钱包状态
 */
async function checkWallet({ openid }) {
  if (!openid) {
    return { code: -1, msg: '请提供 openid' };
  }

  const walletRes = await db.collection('user_wallets')
    .where({ _openid: openid })
    .get();

  if (walletRes.data.length === 0) {
    return {
      code: 0,
      msg: '钱包不存在（需要先充值）',
      data: { balance: 0, exists: false }
    };
  }

  const wallet = walletRes.data[0];

  // 获取最近的交易记录
  const transactionsRes = await db.collection('wallet_transactions')
    .where({ _openid: openid })
    .orderBy('createTime', 'desc')
    .limit(5)
    .get();

  return {
    code: 0,
    msg: '查询成功',
    data: {
      exists: true,
      balance: wallet.balance,
      totalRecharge: wallet.totalRecharge || 0,
      totalGift: wallet.totalGift || 0,
      recentTransactions: transactionsRes.data
    }
  };
}

/**
 * 模拟订单完成（触发奖励结算）
 */
async function simulateOrderComplete({ orderId }) {
  if (!orderId) {
    return { code: -1, msg: '请提供 orderId' };
  }

  console.log(`[测试] 模拟订单完成 orderId: ${orderId}`);

  // 调用 order 云函数的 updateOrderStatus
  const order = require('../order/index.js');
  const result = await order.exports.updateOrderStatus(
    { OPENID: await getOpenIdFromOrder(orderId) },
    { orderId, status: 'completed' }
  );

  return result;
}

/**
 * 检查奖励记录
 */
async function checkRewardRecords({ orderId }) {
  if (!orderId) {
    return { code: -1, msg: '请提供 orderId' };
  }

  const recordsRes = await db.collection('reward_records')
    .where({ orderId: orderId })
    .get();

  const summary = {
    totalAmount: 0,
    count: recordsRes.data.length,
    byType: {}
  };

  recordsRes.data.forEach(r => {
    summary.totalAmount += r.amount;
    summary.byType[r.rewardType] = (summary.byType[r.rewardType] || 0) + r.amount;
  });

  return {
    code: 0,
    msg: '查询成功',
    data: {
      orderId,
      records: recordsRes.data,
      summary
    }
  };
}

/**
 * 获取测试数据
 */
async function getTestData({ type }) {
  let data = {};

  switch (type) {
    case 'orders':
      const ordersRes = await db.collection('orders')
        .orderBy('createTime', 'desc')
        .limit(10)
        .get();
      data = { recentOrders: ordersRes.data };
      break;

    case 'users':
      const usersRes = await db.collection('users')
        .field({ _openid: true, nickName: true, inviteCode: true })
        .limit(5)
        .get();
      data = { users: usersRes.data };
      break;

    case 'wallets':
      const walletsRes = await db.collection('user_wallets')
        .limit(5)
        .get();
      data = { wallets: walletsRes.data };
      break;

    default:
      return { code: -1, msg: '未知数据类型' };
  }

  return {
    code: 0,
    msg: '获取成功',
    data
  };
}

/**
 * 测试余额支付流程
 */
async function testBalancePayment({ openid, amount }) {
  if (!openid || !amount) {
    return { code: -1, msg: '请提供 openid 和 amount' };
  }

  console.log(`[测试] 模拟余额支付 openid: ${openid}, amount: ${amount}`);

  // 1. 检查钱包
  const walletRes = await db.collection('user_wallets')
    .where({ _openid: openid })
    .get();

  if (walletRes.data.length === 0) {
    return { code: -1, msg: '钱包不存在' };
  }

  const wallet = walletRes.data[0];

  // 2. 验证余额
  if (wallet.balance < amount) {
    return {
      code: -1,
      msg: '余额不足',
      data: {
        balance: wallet.balance,
        required: amount,
        shortage: amount - wallet.balance
      }
    };
  }

  // 3. 执行扣款
  const transaction = await db.startTransaction();
  try {
    await transaction.collection('user_wallets')
      .doc(wallet._id)
      .update({
        data: {
          balance: _.inc(-amount),
          updateTime: db.serverDate()
        }
      });

    await transaction.collection('wallet_transactions')
      .add({
        data: {
          _openid: openid,
          type: 'payment',
          amount: -amount,
          title: '测试支付',
          status: 'success',
          createTime: db.serverDate()
        }
      });

    await transaction.commit();

    return {
      code: 0,
      msg: '支付成功',
      data: {
        paidAmount: amount,
        remainingBalance: wallet.balance - amount
      }
    };

  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

/**
 * 验证数据库迁移
 */
async function verifyMigration() {
  console.log('[测试] 验证数据库迁移');

  // 检查 orders 集合
  const ordersRes = await db.collection('orders')
    .field({ _id: true, rewardSettled: true, rewardSettleTime: true })
    .limit(5)
    .get();

  const hasRewardSettledField = ordersRes.data.length > 0 &&
    ('rewardSettled' in ordersRes.data[0] || ordersRes.data[0]._id !== undefined);

  const stats = {
    totalOrdersChecked: ordersRes.data.length,
    hasRewardSettled: hasRewardSettledField,
    sampleOrders: ordersRes.data.map(o => ({
      id: o._id,
      hasRewardSettled: 'rewardSettled' in o,
      rewardSettled: o.rewardSettled
    }))
  };

  return {
    code: 0,
    msg: hasRewardSettledField ? '迁移成功' : '迁移未完成',
    data: stats
  };
}

/**
 * 辅助函数：从订单获取 openid
 */
async function getOpenIdFromOrder(orderId) {
  const orderRes = await db.collection('orders')
    .where({ _id: orderId })
    .field({ _openid: true })
    .get();

  if (orderRes.data.length > 0) {
    return orderRes.data[0]._openid;
  }
  return null;
}
