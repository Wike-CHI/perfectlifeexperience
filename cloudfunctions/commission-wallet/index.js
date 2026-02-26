/**
 * 佣金钱包管理云函数
 *
 * 功能：
 * 1. 获取佣金钱包余额
 * 2. 申请提现到微信余额
 * 3. 获取提现记录
 * 4. 查询提现状态
 *
 * 安全设计：
 * - 佣金钱包与充值钱包分离
 * - 只有佣金可以提现
 * - 充值赠送的钱不能提现（防止刷钱）
 */

const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

// 引入安全日志工具
const { createLogger } = require('./common/logger');
const logger = createLogger('commission-wallet');

// 集合名称
const COMMISSION_WALLETS_COLLECTION = 'commission_wallets';
const COMMISSION_TRANSACTIONS_COLLECTION = 'commission_transactions';
const WITHDRAWALS_COLLECTION = 'withdrawals';

// 解析 HTTP 触发器的请求体
function parseEvent(event) {
  if (event.body) {
    try {
      return typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    } catch (e) {
      logger.error('Failed to parse event body', e);
    }
  }
  return event;
}

/**
 * 主入口函数
 */
exports.main = async (event, context) => {
  logger.debug('Commission wallet event received', { action: event.action });

  const requestData = parseEvent(event);
  const { action, data } = requestData;

  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  if (!openid) {
    logger.warn('Unauthorized access attempt');
    return {
      code: 401,
      msg: '未登录或登录已过期'
    };
  }

  logger.info('Commission wallet action', { action });

  try {
    switch (action) {
      case 'getBalance':
        return await getBalance(openid);
      case 'applyWithdraw':
        return await applyWithdraw(openid, data);
      case 'getWithdrawals':
        return await getWithdrawals(openid, data);
      case 'getTransactions':
        return await getTransactions(openid, data);
      default:
        return {
          code: 400,
          msg: '未知操作'
        };
    }
  } catch (err) {
    logger.error('Commission wallet operation failed', err);
    return {
      code: 500,
      msg: err.message || '服务器内部错误'
    };
  }
};

/**
 * 获取佣金钱包余额
 */
async function getBalance(openid) {
  try {
    const res = await db.collection(COMMISSION_WALLETS_COLLECTION)
      .where({ _openid: openid })
      .get();

    let result;

    if (res.data.length === 0) {
      // 如果没有佣金钱包，初始化一个
      const initData = {
        _openid: openid,
        balance: 0,
        totalCommission: 0,     // 累计佣金
        totalWithdrawn: 0,       // 累计提现
        updateTime: db.serverDate()
      };
      await db.collection(COMMISSION_WALLETS_COLLECTION).add({
        data: initData
      });
      result = {
        code: 0,
        msg: '获取成功',
        data: {
          balance: 0,
          totalCommission: 0,
          totalWithdrawn: 0
        }
      };
    } else {
      result = {
        code: 0,
        msg: '获取成功',
        data: {
          balance: res.data[0].balance || 0,
          totalCommission: res.data[0].totalCommission || 0,
          totalWithdrawn: res.data[0].totalWithdrawn || 0
        }
      };
    }

    return result;
  } catch (error) {
    logger.error('Failed to get balance', error);
    throw error;
  }
}

/**
 * 申请提现到微信余额
 */
async function applyWithdraw(openid, data) {
  const { amount } = data;

  // 1. 参数验证
  if (!amount || amount <= 0) {
    return {
      code: 400,
      msg: '提现金额无效'
    };
  }

  // 最小提现金额（1元）
  const MIN_WITHDRAW = 100;
  if (amount < MIN_WITHDRAW) {
    return {
      code: 400,
      msg: `最小提现金额为${MIN_WITHDRAW / 100}元`
    };
  }

  const transaction = await db.startTransaction();

  try {
    // 2. 获取佣金钱包
    const walletRes = await transaction.collection(COMMISSION_WALLETS_COLLECTION)
      .where({ _openid: openid })
      .get();

    if (walletRes.data.length === 0) {
      await transaction.rollback();
      return {
        code: 400,
        msg: '佣金钱包不存在'
      };
    }

    const wallet = walletRes.data[0];

    // 3. 检查余额
    if (wallet.balance < amount) {
      await transaction.rollback();
      return {
        code: 400,
        msg: '佣金余额不足'
      };
    }

    // 4. 冻结提现金额（从余额中扣除）
    await transaction.collection(COMMISSION_WALLETS_COLLECTION)
      .doc(wallet._id)
      .update({
        data: {
          balance: _.inc(-amount),
          frozenAmount: _.inc(amount), // 冻结金额
          updateTime: db.serverDate()
        }
      });

    // 5. 创建提现记录
    const withdrawNo = generateWithdrawNo();

    await transaction.collection(WITHDRAWALS_COLLECTION).add({
      data: {
        _openid: openid,
        withdrawNo,
        amount: amount,
        status: 'pending', // 待审核
        applyTime: db.serverDate(),
        updateTime: db.serverDate()
      }
    });

    // 6. 记录交易流水
    await transaction.collection(COMMISSION_TRANSACTIONS_COLLECTION).add({
      data: {
        _openid: openid,
        type: 'withdraw_apply',
        amount: -amount,
        title: '提现申请',
        description: `提现申请 ¥${(amount / 100).toFixed(2)} 元`,
        withdrawNo: withdrawNo,
        status: 'pending',
        createTime: db.serverDate()
      }
    });

    await transaction.commit();

    logger.info('Withdraw application created', {
      openid,
      withdrawNo,
      amount
    });

    return {
      code: 0,
      msg: '提现申请已提交，等待审核',
      data: {
        withdrawNo,
        amount
      }
    };

  } catch (e) {
    await transaction.rollback();
    logger.error('Withdraw application failed', e);
    throw e;
  }
}

/**
 * 获取提现记录列表
 */
async function getWithdrawals(openid, data) {
  const { page = 1, limit = 20, status } = data;

  try {
    const query = { _openid: openid };

    if (status) {
      query.status = status;
    }

    const skip = (page - 1) * limit;

    const countResult = await db.collection(WITHDRAWALS_COLLECTION)
      .where(query)
      .count();

    const total = countResult.total;

    const res = await db.collection(WITHDRAWALS_COLLECTION)
      .where(query)
      .orderBy('applyTime', 'desc')
      .skip(skip)
      .limit(limit)
      .get();

    return {
      code: 0,
      msg: '获取成功',
      data: {
        list: res.data,
        total,
        page,
        limit
      }
    };
  } catch (error) {
    logger.error('Failed to get withdrawals', error);
    throw error;
  }
}

/**
 * 获取交易记录列表
 */
async function getTransactions(openid, data) {
  const { page = 1, limit = 20, type } = data;

  try {
    const query = { _openid: openid };

    if (type) {
      query.type = type;
    }

    const skip = (page - 1) * limit;

    const countResult = await db.collection(COMMISSION_TRANSACTIONS_COLLECTION)
      .where(query)
      .count();

    const total = countResult.total;

    const res = await db.collection(COMMISSION_TRANSACTIONS_COLLECTION)
      .where(query)
      .orderBy('createTime', 'desc')
      .skip(skip)
      .limit(limit)
      .get();

    return {
      code: 0,
      msg: '获取成功',
      data: {
        list: res.data,
        total,
        page,
        limit
      }
    };
  } catch (error) {
    logger.error('Failed to get transactions', error);
    throw error;
  }
}

/**
 * 生成提现单号
 */
function generateWithdrawNo() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hour = String(now.getHours()).padStart(2, '0');
  const minute = String(now.getMinutes()).padStart(2, '0');
  const second = String(now.getSeconds()).padStart(2, '0');
  const random = String(Math.floor(Math.random() * 1000000)).padStart(6, '0');

  return `WD${year}${month}${day}${hour}${minute}${second}${random}`;
}
