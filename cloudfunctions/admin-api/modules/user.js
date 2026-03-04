/**
 * 用户管理模块
 */

const { calcPagination } = require('./common/pagination');
const { checkRequired, validateRange } = require('./common/validator');

// 有效的代理等级
const VALID_AGENT_LEVELS = [0, 1, 2, 3, 4];

/**
 * 获取用户列表
 * @param {Object} db - 数据库实例
 * @param {Object} data - 请求数据
 * @returns {Promise<Object>} 查询结果
 */
async function getUsersAdmin(db, data) {
  try {
    const { page = 1, pageSize = 20, agentLevel, keyword } = data || {};
    const { skip, limit: validLimit } = calcPagination(page, pageSize);

    let query = {};

    if (agentLevel !== undefined && agentLevel >= 0) {
      query.agentLevel = agentLevel;
    }

    if (keyword) {
      query.$or = [
        { nickName: db.RegExp({ regexp: keyword, options: 'i' }) },
        { phoneNumber: db.RegExp({ regexp: keyword, options: 'i' }) },
        { _openid: db.RegExp({ regexp: keyword, options: 'i' }) }
      ];
    }

    const [usersResult, countResult] = await Promise.all([
      db.collection('users')
        .where(query)
        .orderBy('createTime', 'desc')
        .skip(skip)
        .limit(validLimit)
        .field({
          _id: true,
          _openid: true,
          nickName: true,
          avatarUrl: true,
          agentLevel: true,
          performance: true
        })
        .get(),
      db.collection('users').where(query).count()
    ]);

    return {
      code: 0,
      data: {
        list: usersResult.data,
        total: countResult.total,
        page,
        pageSize: validLimit,
        totalPages: Math.ceil(countResult.total / validLimit)
      }
    };
  } catch (error) {
    console.error('Get users error:', error);
    return { code: 500, msg: error.message };
  }
}

/**
 * 获取用户详情
 * @param {Object} db - 数据库实例
 * @param {Object} data - 请求数据
 * @returns {Promise<Object>} 查询结果
 */
async function getUserDetailAdmin(db, data) {
  try {
    const { userId } = data || {};

    if (!userId) {
      return { code: -2, msg: '缺少用户ID' };
    }

    const userResult = await db.collection('users').doc(userId).get();

    if (!userResult.data) {
      return { code: 404, msg: '用户不存在' };
    }

    return {
      code: 0,
      data: userResult.data
    };
  } catch (error) {
    console.error('Get user detail error:', error);
    return { code: 500, msg: error.message };
  }
}

/**
 * 获取用户钱包信息
 * @param {Object} db - 数据库实例
 * @param {Object} data - 请求数据
 * @returns {Promise<Object>} 查询结果
 */
async function getUserWalletAdmin(db, data) {
  try {
    const { userId } = data || {};

    if (!userId) {
      return { code: -2, msg: '缺少用户ID' };
    }

    const walletResult = await db.collection('wallets')
      .where({ _openid: data.openid || userId })
      .limit(1)
      .get();

    if (walletResult.data.length === 0) {
      return {
        code: 0,
        data: { balance: 0, totalReward: 0, withdrawn: 0 }
      };
    }

    return {
      code: 0,
      data: walletResult.data[0]
    };
  } catch (error) {
    console.error('Get user wallet error:', error);
    return { code: 500, msg: error.message };
  }
}

/**
 * 获取用户推广路径
 * @param {Object} db - 数据库实例
 * @param {Object} data - 请求数据
 * @returns {Promise<Object>} 查询结果
 */
async function getPromotionPathAdmin(db, data) {
  try {
    const { userId } = data || {};

    if (!userId) {
      return { code: -2, msg: '缺少用户ID' };
    }

    const userResult = await db.collection('users').doc(userId).get();

    if (!userResult.data) {
      return { code: 404, msg: '用户不存在' };
    }

    const promotionPath = userResult.data.promotionPath || '';

    if (!promotionPath) {
      return {
        code: 0,
        data: []
      };
    }

    const parentIds = promotionPath.split('/').filter(id => id);
    const parents = [];

    for (const parentId of parentIds) {
      const parentResult = await db.collection('users')
        .doc(parentId)
        .field({
          _id: true,
          nickName: true,
          agentLevel: true
        })
        .get();

      if (parentResult.data) {
        parents.push(parentResult.data);
      }
    }

    return {
      code: 0,
      data: parents
    };
  } catch (error) {
    console.error('Get promotion path error:', error);
    return { code: 500, msg: error.message };
  }
}

/**
 * 获取用户订单列表
 * @param {Object} db - 数据库实例
 * @param {Object} data - 请求数据
 * @returns {Promise<Object>} 查询结果
 */
async function getUserOrdersAdmin(db, data) {
  try {
    const { userId, limit = 5 } = data || {};

    if (!userId) {
      return { code: -2, msg: '缺少用户ID' };
    }

    const userResult = await db.collection('users').doc(userId).get();

    if (!userResult.data) {
      return { code: 404, msg: '用户不存在' };
    }

    const ordersResult = await db.collection('orders')
      .where({ _openid: userResult.data._openid })
      .orderBy('createTime', 'desc')
      .limit(limit)
      .get();

    return {
      code: 0,
      data: ordersResult.data
    };
  } catch (error) {
    console.error('Get user orders error:', error);
    return { code: 500, msg: error.message };
  }
}

/**
 * 获取用户奖励列表
 * @param {Object} db - 数据库实例
 * @param {Object} data - 请求数据
 * @returns {Promise<Object>} 查询结果
 */
async function getUserRewardsAdmin(db, data) {
  try {
    const { userId, limit = 5 } = data || {};

    if (!userId) {
      return { code: -2, msg: '缺少用户ID' };
    }

    const userResult = await db.collection('users').doc(userId).get();

    if (!userResult.data) {
      return { code: 404, msg: '用户不存在' };
    }

    const rewardsResult = await db.collection('reward_records')
      .where({ _openid: userResult.data._openid })
      .orderBy('createTime', 'desc')
      .limit(limit)
      .get();

    return {
      code: 0,
      data: rewardsResult.data
    };
  } catch (error) {
    console.error('Get user rewards error:', error);
    return { code: 500, msg: error.message };
  }
}

module.exports = {
  getUsersAdmin,
  getUserDetailAdmin,
  getUserWalletAdmin,
  getPromotionPathAdmin,
  getUserOrdersAdmin,
  getUserRewardsAdmin
};
