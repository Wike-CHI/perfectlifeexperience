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
  const requestData = parseEvent(event);
  const { action, data } = requestData;

  logger.debug('Commission wallet event received', { action });

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
 *
 * 并发保护：
 * - 使用 try-catch 处理并发创建钱包的情况
 * - 如果创建失败（可能是因为并发导致的重复键），重新查询已存在的钱包
 */
async function getBalance(openid) {
  try {
    const res = await db.collection(COMMISSION_WALLETS_COLLECTION)
      .where({ _openid: openid })
      .get();

    if (res.data.length > 0) {
      // 钱包已存在，直接返回
      const wallet = res.data[0];
      return {
        code: 0,
        msg: '获取成功',
        data: {
          balance: wallet.balance || 0,
          frozenAmount: wallet.frozenAmount || 0,
          totalCommission: wallet.totalCommission || 0,
          totalWithdrawn: wallet.totalWithdrawn || 0
        }
      };
    }

    // 钱包不存在，尝试创建（使用 try-catch 处理并发创建）
    const initData = {
      _openid: openid,
      balance: 0,
      frozenAmount: 0,
      totalCommission: 0,     // 累计佣金
      totalWithdrawn: 0,       // 累计提现
      createTime: db.serverDate(),
      updateTime: db.serverDate()
    };

    try {
      await db.collection(COMMISSION_WALLETS_COLLECTION).add({
        data: initData
      });

      logger.info('Commission wallet created', { openid });

      return {
        code: 0,
        msg: '获取成功',
        data: {
          balance: 0,
          frozenAmount: 0,
          totalCommission: 0,
          totalWithdrawn: 0
        }
      };
    } catch (createError) {
      // 并发创建可能失败（如果有唯一索引），重新查询已存在的钱包
      logger.warn('Concurrent wallet creation detected, re-fetching', { openid });

      const retryRes = await db.collection(COMMISSION_WALLETS_COLLECTION)
        .where({ _openid: openid })
        .get();

      if (retryRes.data.length > 0) {
        const wallet = retryRes.data[0];
        return {
          code: 0,
          msg: '获取成功',
          data: {
            balance: wallet.balance || 0,
            frozenAmount: wallet.frozenAmount || 0,
            totalCommission: wallet.totalCommission || 0,
            totalWithdrawn: wallet.totalWithdrawn || 0
          }
        };
      }

      // 如果重试也失败，抛出原始错误
      throw createError;
    }
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

  // 提现限制配置
  const MIN_WITHDRAW = 100;        // 最小提现金额（1元）
  const MAX_WITHDRAW = 50000;      // 最大提现金额（500元）
  const MAX_DAILY_WITHDRAWS = 3;   // 每天最多提现次数

  // 最小提现金额验证
  if (amount < MIN_WITHDRAW) {
    return {
      code: 400,
      msg: `最小提现金额为${MIN_WITHDRAW / 100}元`
    };
  }

  // 最大提现金额验证
  if (amount > MAX_WITHDRAW) {
    return {
      code: 400,
      msg: `单次最大提现金额为${MAX_WITHDRAW / 100}元`
    };
  }

  // 2. 提现频率限制 - 检查今日提现次数
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString();

  const todayWithdraws = await db.collection(WITHDRAWALS_COLLECTION)
    .where({
      _openid: openid,
      applyTime: _.gte(new Date(todayStr))
    })
    .count();

  if (todayWithdraws.total >= MAX_DAILY_WITHDRAWS) {
    return {
      code: 400,
      msg: `每天最多提现${MAX_DAILY_WITHDRAWS}次，请明天再试`
    };
  }

  const transaction = await db.startTransaction();

  try {
    // 3. 获取佣金钱包
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

    // 4. 检查余额
    if (wallet.balance < amount) {
      await transaction.rollback();
      return {
        code: 400,
        msg: '佣金余额不足'
      };
    }

    // 5. 冻结提现金额（从余额中扣除）
    await transaction.collection(COMMISSION_WALLETS_COLLECTION)
      .doc(wallet._id)
      .update({
        data: {
          balance: _.inc(-amount),
          frozenAmount: _.inc(amount), // 冻结金额
          updateTime: db.serverDate()
        }
      });

    // 6. 创建提现记录
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

    // 7. 记录交易流水
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
