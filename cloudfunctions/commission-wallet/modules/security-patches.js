/**
 * 佣金钱包云函数 - 安全漏洞修复补丁
 *
 * 修复内容：
 * 2. 添加乐观锁防止并发提现余额透支
 * 3. 添加分布式锁支持
 */

const response = require('../common/response');

/**
 * 修复#2: 乐观锁提现
 *
 * @param {Object} db - 数据库实例
 * @param {Object} data - 提现数据
 * @returns {Object} 操作结果
 */
async function withdrawWithOptimisticLock(db, data) {
  const { _openid, amount } = data;
  const _ = db.command;

  try {
    // ========== 乐观锁实现 ==========
    // 1. 读取当前钱包（包含版本号）
    const walletResult = await db.collection('commission_wallets')
      .where({ _openid })
      .get();

    if (walletResult.data.length === 0) {
      return response.error('WALLET_NOT_FOUND', '钱包不存在');
    }

    const wallet = walletResult.data[0];
    const currentVersion = wallet.version || 0;

    // 2. 验证余额
    if (wallet.balance < amount) {
      return response.error('INSUFFICIENT_BALANCE', '余额不足');
    }

    // 3. 尝试更新（带版本检查）
    const updateResult = await db.collection('commission_wallets')
      .where({
        _openid,
        version: currentVersion  // 乐观锁：只有版本号匹配才更新
      })
      .update({
        data: {
          balance: _.inc(-amount),
          frozenAmount: _.inc(amount),
          version: _.inc(1),  // 版本号递增
          updateTime: db.serverDate()
        }
      });

    // 4. 检查更新结果
    if (updateResult.stats.updated === 0) {
      // 版本号不匹配，说明有并发修改
      return response.error('VERSION_CONFLICT',
        '操作频繁，请稍后重试');
    }

    // 5. 创建提现记录
    const withdrawalResult = await db.collection('withdrawals').add({
      data: {
        _openid,
        amount,
        status: 'pending',
        applyTime: db.serverDate(),
        version: currentVersion + 1
      }
    });

    return response.success({
      withdrawalId: withdrawalResult._id,
      newBalance: wallet.balance - amount
    });

  } catch (error) {
    console.error('提现失败:', error);
    return response.error('WITHDRAWAL_FAILED', error.message);
  }
}

/**
 * 修复#2: 分布式锁提现（Redis实现）
 *
 * 注意：需要云开发环境支持Redis或使用数据库模拟锁
 */
async function withdrawWithDistributedLock(db, data) {
  const { _openid, amount } = data;
  const lockKey = `lock:withdrawal:${_openid}`;
  const lockTTL = 30; // 30秒

  try {
    // ========== 尝试获取锁 ==========
    const lockAcquired = await acquireLock(lockKey, lockTTL);

    if (!lockAcquired) {
      return response.error('LOCK_ACQUISITION_FAILED',
        '操作正在进行中，请稍后重试');
    }

    try {
      // 执行提现逻辑
      const result = await performWithdrawal(db, _openid, amount);
      return result;
    } finally {
      // ========== 释放锁 ==========
      await releaseLock(lockKey);
    }

  } catch (error) {
    console.error('提现失败:', error);
    return response.error('WITHDRAWAL_FAILED', error.message);
  }
}

/**
 * 模拟获取锁（云开发环境可用）
 * 实际生产应使用云开发的Redis或云锁服务
 */
async function acquireLock(key, ttl) {
  // 使用数据库模拟分布式锁
  const db = require('../../index').db;

  try {
    // 尝试创建锁记录
    await db.collection('distributed_locks').add({
      data: {
        key,
        expireTime: new Date(Date.now() + ttl * 1000),
        createTime: new Date()
      }
    });

    return true;  // 成功获取锁
  } catch (error) {
    if (error.errCode === 'DATABASE_RECORD_EXISTS') {
      return false;  // 锁已被占用
    }
    throw error;
  }
}

/**
 * 释放锁
 */
async function releaseLock(key) {
  const db = require('../../index').db;

  try {
    await db.collection('distributed_locks')
      .where({ key })
      .remove();
    return true;
  } catch (error) {
    console.error('释放锁失败:', error);
    return false;
  }
}

/**
 * 执行提现操作（获取锁后执行）
 */
async function performWithdrawal(db, _openid, amount) {
  const _ = db.command;

  // 读取钱包
  const walletResult = await db.collection('commission_wallets')
    .where({ _openid })
    .get();

  if (walletResult.data.length === 0) {
    return response.error('WALLET_NOT_FOUND', '钱包不存在');
  }

  const wallet = walletResult.data[0];

  // 验证余额
  if (wallet.balance < amount) {
    return response.error('INSUFFICIENT_BALANCE', '余额不足');
  }

  // 更新钱包
  await db.collection('commission_wallets')
    .where({ _openid })
    .update({
      data: {
        balance: _.inc(-amount),
        frozenAmount: _.inc(amount),
        updateTime: db.serverDate()
      }
    });

  // 创建提现记录
  const withdrawalResult = await db.collection('withdrawals').add({
    data: {
      _openid,
      amount,
      status: 'pending',
      applyTime: db.serverDate()
    }
  });

  return response.success({
    withdrawalId: withdrawalResult._id,
    newBalance: wallet.balance - amount
  });
}

module.exports = {
  withdrawWithOptimisticLock,
  withdrawWithDistributedLock,
  acquireLock,
  releaseLock
};
