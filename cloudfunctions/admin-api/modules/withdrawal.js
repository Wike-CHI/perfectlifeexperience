/**
 * 提现管理模块
 */

const { calcPagination } = require('./common/pagination');
const { checkRequired } = require('./common/validator');

// 有效的提现状态
const VALID_WITHDRAWAL_STATUSES = ['pending', 'approved', 'rejected', 'failed'];

/**
 * 获取提现列表
 * @param {Object} db - 数据库实例
 * @param {Object} data - 请求数据
 * @returns {Promise<Object>} 查询结果
 */
async function getWithdrawalsAdmin(db, data) {
  try {
    const { page = 1, limit = 20, status } = data || {};
    const { skip, limit: validLimit } = calcPagination(page, limit);

    let query = {};

    if (status && status !== 'all') {
      query.status = status;
    }

    const [withdrawalsResult, countResult] = await Promise.all([
      db.collection('withdrawals')
        .where(query)
        .orderBy('applyTime', 'desc')
        .skip(skip)
        .limit(validLimit)
        .get(),
      db.collection('withdrawals').where(query).count()
    ]);

    // Get user info for each withdrawal
    const withdrawalsWithUsers = await Promise.all(
      withdrawalsResult.data.map(async (withdrawal) => {
        const userResult = await db.collection('users')
          .where({ _openid: withdrawal._openid })
          .limit(1)
          .get();

        return {
          ...withdrawal,
          user: userResult.data[0] || null
        };
      })
    );

    return {
      code: 0,
      data: {
        list: withdrawalsWithUsers,
        total: countResult.total,
        page,
        limit: validLimit,
        totalPages: Math.ceil(countResult.total / validLimit)
      }
    };
  } catch (error) {
    console.error('Get withdrawals error:', error);
    return { code: 500, msg: error.message };
  }
}

/**
 * 批准提现
 * @param {Object} db - 数据库实例
 * @param {Object} logOperation - 日志函数
 * @param {Object} data - 请求数据
 * @param {Object} wxContext - 微信上下文
 * @returns {Promise<Object>} 操作结果
 */
async function approveWithdrawalAdmin(db, logOperation, data, wxContext) {
  try {
    const adminInfo = wxContext.ADMIN_INFO || { id: 'system' };
    const _ = db.command;

    const { withdrawalId } = data || {};

    if (!withdrawalId) {
      return { code: -2, msg: '缺少提现记录ID' };
    }

    const withdrawalResult = await db.collection('withdrawals').doc(withdrawalId).get();

    if (!withdrawalResult.data) {
      return { code: 404, msg: '提现记录不存在' };
    }

    if (withdrawalResult.data.status !== 'pending') {
      return { code: 400, msg: '该提现记录已处理' };
    }

    const withdrawal = withdrawalResult.data;

    // 更新提现记录状态
    await db.collection('withdrawals').doc(withdrawalId).update({
      data: {
        status: 'approved',
        approvedBy: adminInfo.id,
        approvedTime: db.serverDate()
      }
    });

    // 更新用户佣金钱包 - 扣减冻结金额
    await db.collection('commission_wallets')
      .where({ _openid: withdrawal._openid })
      .update({
        data: {
          frozenAmount: _.inc(-withdrawal.amount),
          withdrawn: db.command.inc(withdrawal.amount),
          updateTime: db.serverDate()
        }
      });

    // 创建交易记录
    await db.collection('commission_transactions').add({
      data: {
        _openid: withdrawal._openid,
        type: 'withdrawal',
        amount: withdrawal.amount,
        status: 'success',
        withdrawalId: withdrawalId,
        description: '提现成功',
        createTime: db.serverDate()
      }
    });

    await logOperation(adminInfo.id, 'approveWithdrawal', { withdrawalId, amount: withdrawal.amount });

    return {
      code: 0,
      msg: '提现已批准'
    };
  } catch (error) {
    console.error('Approve withdrawal error:', error);
    return { code: 500, msg: error.message };
  }
}

/**
 * 拒绝提现
 * @param {Object} db - 数据库实例
 * @param {Object} logOperation - 日志函数
 * @param {Object} data - 请求数据
 * @param {Object} wxContext - 微信上下文
 * @returns {Promise<Object>} 操作结果
 */
async function rejectWithdrawalAdmin(db, logOperation, data, wxContext) {
  try {
    const adminInfo = wxContext.ADMIN_INFO || { id: 'system' };
    const _ = db.command;

    const { withdrawalId, reason } = data || {};

    if (!withdrawalId) {
      return { code: -2, msg: '缺少提现记录ID' };
    }

    const withdrawalResult = await db.collection('withdrawals').doc(withdrawalId).get();

    if (!withdrawalResult.data) {
      return { code: 404, msg: '提现记录不存在' };
    }

    if (withdrawalResult.data.status !== 'pending') {
      return { code: 400, msg: '该提现记录已处理' };
    }

    const withdrawal = withdrawalResult.data;

    // 更新提现记录状态
    await db.collection('withdrawals').doc(withdrawalId).update({
      data: {
        status: 'rejected',
        rejectedBy: adminInfo.id,
        rejectedTime: db.serverDate(),
        rejectReason: reason || ''
      }
    });

    // 更新用户佣金钱包 - 释放冻结金额回余额
    await db.collection('commission_wallets')
      .where({ _openid: withdrawal._openid })
      .update({
        data: {
          balance: _.inc(withdrawal.amount),
          frozenAmount: _.inc(-withdrawal.amount),
          updateTime: db.serverDate()
        }
      });

    // 创建交易记录
    await db.collection('commission_transactions').add({
      data: {
        _openid: withdrawal._openid,
        type: 'withdraw_rejected',
        amount: withdrawal.amount,
        status: 'failed',
        withdrawalId: withdrawalId,
        description: `提现被拒绝: ${reason || '无原因'}`,
        createTime: db.serverDate()
      }
    });

    await logOperation(adminInfo.id, 'rejectWithdrawal', { withdrawalId, reason });

    return {
      code: 0,
      msg: '提现已拒绝'
    };
  } catch (error) {
    console.error('Reject withdrawal error:', error);
    return { code: 500, msg: error.message };
  }
}

module.exports = {
  getWithdrawalsAdmin,
  approveWithdrawalAdmin,
  rejectWithdrawalAdmin
};
