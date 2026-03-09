const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;
const $ = db.command.aggregate;

// ✅ 引入安全日志工具
const { createLogger } = require('./common/logger');
const logger = createLogger('wallet');

// ✅ 引入缓存模块
const { userCache } = require('./common/cache');

// 集合名称
const WALLETS_COLLECTION = 'user_wallets';
const TRANSACTIONS_COLLECTION = 'wallet_transactions';

// 解析 HTTP 触发器的请求体
function parseEvent(event) {
  if (event.body) {
    try {
      return typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    } catch (e) {
      console.error('解析 body 失败:', e);
    }
  }
  return event;
}

exports.main = async (event, context) => {
  // ✅ 使用结构化日志（已脱敏）
  logger.debug('Wallet event received', { action: event.action });

  const requestData = parseEvent(event);
  logger.debug('Wallet parsed data', { action: requestData.action });

  const wxContext = cloud.getWXContext();
  // 🔒 安全：只使用 wxContext.OPENID，不信任前端传递的 _token
  const openid = wxContext.OPENID;
  const { action, data } = requestData;

  // ✅ 敏感信息不记录到日志
  logger.info('Wallet action', { action });

  if (!openid) {
    return {
      code: 401,
      msg: '未登录'
    };
  }

  try {
    switch (action) {
      case 'getBalance':
        return await getBalance(openid);
      case 'recharge':
        return await recharge(openid, data);
      case 'getTransactions':
        return await getTransactions(openid, data);
      default:
        return {
          code: 400,
          msg: '未知操作'
        };
    }
  } catch (err) {
    // ✅ 使用结构化日志
    logger.error('Wallet operation failed', err);
    return {
      code: 500,
      msg: err.message || '服务器内部错误'
    };
  }
};

// 获取余额
async function getBalance(openid) {
  const cacheKey = `wallet_balance_${openid}`;

  // 1. 尝试从缓存获取
  const cached = userCache.get(cacheKey);
  if (cached !== null) {
    logger.debug('Wallet balance cache hit', { openid });
    return cached;
  }

  logger.debug('Wallet balance cache miss, querying...', { openid });

  const res = await db.collection(WALLETS_COLLECTION).where({
    _openid: openid
  }).get();

  let result;

  if (res.data.length === 0) {
    // 如果没有钱包记录，初始化一个
    const initData = {
      _openid: openid,
      balance: 0,
      totalRecharge: 0,      // 累计充值本金
      totalGift: 0,          // 累计赠送金额
      updateTime: db.serverDate()
    };
    await db.collection(WALLETS_COLLECTION).add({
      data: initData
    });
    result = {
      code: 0,
      data: {
        balance: 0,
        totalRecharge: 0,
        totalGift: 0
      }
    };
  } else {
    result = {
      code: 0,
      data: {
        balance: res.data[0].balance,
        totalRecharge: res.data[0].totalRecharge || 0,
        totalGift: res.data[0].totalGift || 0
      }
    };
  }

  // 2. 缓存结果（3分钟TTL - 余额可能变化）
  userCache.set(cacheKey, result, 180000);

  return result;
}

// 充值 (支持赠送金额)
async function recharge(openid, { amount, giftAmount = 0 }) {
  if (!amount || amount <= 0) {
    return {
      code: 400,
      msg: '充值金额无效'
    };
  }

  // 确保赠送金额非负
  const gift = Math.max(0, giftAmount || 0);
  const totalAmount = amount + gift;

  // 模拟支付过程...
  // 在真实场景中，这里会调用微信支付统一下单接口
  // 然后前端拉起支付，支付成功后回调云函数
  
  // 这里我们直接开启事务，模拟支付成功后的处理
  const transaction = await db.startTransaction();

  try {
    // 1. 获取或创建钱包
    const walletRes = await transaction.collection(WALLETS_COLLECTION).where({
      _openid: openid
    }).get();

    if (walletRes.data.length === 0) {
      await transaction.collection(WALLETS_COLLECTION).add({
        data: {
          _openid: openid,
          balance: totalAmount,
          totalRecharge: amount,
          totalGift: gift,
          updateTime: db.serverDate()
        }
      });
    } else {
      const wallet = walletRes.data[0];
      await transaction.collection(WALLETS_COLLECTION).doc(wallet._id).update({
        data: {
          balance: _.inc(totalAmount),
          totalRecharge: _.inc(amount),
          totalGift: _.inc(gift),
          updateTime: db.serverDate()
        }
      });
    }

    // 2. 记录交易日志
    const title = gift > 0 
      ? `充值¥${(amount / 100).toFixed(0)}（赠¥${(gift / 100).toFixed(0)}）`
      : `钱包充值`;

    await transaction.collection(TRANSACTIONS_COLLECTION).add({
      data: {
        _openid: openid,
        type: 'recharge',
        amount: amount,           // 充值本金（分）
        giftAmount: gift,         // 赠送金额（分）
        totalAmount: totalAmount, // 总到账金额（分）
        title: title,
        status: 'success',
        createTime: db.serverDate()
      }
    });

    await transaction.commit();

    // 清除余额缓存（充值后余额变化）
    userCache.delete(`wallet_balance_${openid}`);
    logger.debug('Wallet balance cache cleared after recharge', { openid });

    return {
      code: 0,
      msg: '充值成功',
      data: {
        amount: amount,
        giftAmount: gift,
        totalAmount: totalAmount
      }
    };

  } catch (e) {
    await transaction.rollback();
    throw e;
  }
}

// 获取交易记录
async function getTransactions(openid, { page = 1, limit = 20 }) {
  const cacheKey = `wallet_transactions_${openid}_page${page}_limit${limit}`;

  // 1. 尝试从缓存获取
  const cached = userCache.get(cacheKey);
  if (cached !== null) {
    logger.debug('Wallet transactions cache hit', { openid, page });
    return cached;
  }

  logger.debug('Wallet transactions cache miss, querying...', { openid, page });

  const skip = (page - 1) * limit;

  const countResult = await db.collection(TRANSACTIONS_COLLECTION).where({
    _openid: openid
  }).count();

  const total = countResult.total;

  const res = await db.collection(TRANSACTIONS_COLLECTION).where({
    _openid: openid
  }).orderBy('createTime', 'desc')
    .skip(skip)
    .limit(limit)
    .get();

  const result = {
    code: 0,
    data: {
      list: res.data,
      total,
      page,
      limit
    }
  };

  // 2. 缓存结果（5分钟TTL - 交易记录历史变化较少）
  userCache.set(cacheKey, result, 300000);

  return result;
}
