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

/**
 * 更新用户代理等级（管理员手动设置）
 * @param {Object} db - 数据库实例
 * @param {Object} data - 请求数据 { userId, agentLevel }
 * @returns {Promise<Object>} 更新结果
 */
async function updateUserAgentLevel(db, data) {
  try {
    const { userId, agentLevel } = data || {};

    // 参数验证
    if (!userId) {
      return { code: 400, msg: '用户ID不能为空' };
    }

    if (agentLevel === undefined || agentLevel === null) {
      return { code: 400, msg: '代理等级不能为空' };
    }

    // 验证代理等级范围 (0-4)
    if (typeof agentLevel !== 'number' || agentLevel < 0 || agentLevel > 4) {
      return { code: 400, msg: '代理等级必须是0-4之间的数字' };
    }

    // 检查用户是否存在
    const userResult = await db.collection('users').doc(userId).get();
    if (!userResult.data) {
      return { code: 404, msg: '用户不存在' };
    }

    const oldLevel = userResult.data.agentLevel || 4;

    // 更新用户代理等级
    await db.collection('users').doc(userId).update({
      data: {
        agentLevel: agentLevel,
        updateTime: db.serverDate()
      }
    });

    return {
      code: 0,
      msg: '代理等级更新成功',
      data: {
        userId,
        oldLevel,
        newLevel: agentLevel
      }
    };
  } catch (error) {
    console.error('Update user agent level error:', error);
    return { code: 500, msg: error.message };
  }
}

/**
 * 绑定用户的上级推广人
 * @param {Object} db - 数据库实例
 * @param {Object} logOperation - 日志记录函数
 * @param {Object} data - 请求数据
 * @returns {Promise<Object>} 操作结果
 */
async function bindUserRelation(db, logOperation, data) {
  try {
    const { userId, parentInviteCode } = data || {};

    if (!userId) {
      return { code: -2, msg: '缺少用户ID' };
    }

    if (!parentInviteCode) {
      return { code: -2, msg: '缺少上级邀请码' };
    }

    // 获取用户信息
    const userRes = await db.collection('users').doc(userId).get();
    if (!userRes.data) {
      return { code: 404, msg: '用户不存在' };
    }

    const user = userRes.data;

    // 查找上级用户
    const parentRes = await db.collection('users')
      .where({ inviteCode: parentInviteCode })
      .get();

    if (parentRes.data.length === 0) {
      return { code: -1, msg: '上级邀请码无效' };
    }

    const parent = parentRes.data[0];
    const parentId = parent._openid;
    const parentAgentLevel = parent.agentLevel || 4;
    const parentPath = parent.promotionPath || '';

    // 不能绑定自己
    if (parentId === user._openid) {
      return { code: -1, msg: '不能绑定自己' };
    }

    // 检查循环引用
    if (parentId && parentPath) {
      const currentPath = `${parentPath}/${parentId}`;
      const ancestors = currentPath.split('/').filter(id => id);
      if (ancestors.includes(parentId)) {
        return { code: -1, msg: '不能绑定下级用户作为上级' };
      }
    }

    // 计算当前用户的代理层级
    const MAX_LEVEL = 4;
    const currentAgentLevel = Math.min(MAX_LEVEL, parentAgentLevel + 1);
    const currentPath = parentPath ? `${parentPath}/${parentId}` : parentId;

    // 更新用户推广关系
    await db.collection('users').doc(userId).update({
      data: {
        parentId: parentId,
        promotionPath: currentPath,
        agentLevel: currentAgentLevel,
        updateTime: db.serverDate()
      }
    });

    // 记录日志
    await logOperation(userId, 'bindUserRelation', {
      parentId,
      parentInviteCode,
      previousPath: user.promotionPath || ''
    });

    return {
      code: 0,
      msg: '绑定成功',
      data: {
        parentId,
        promotionPath: currentPath,
        agentLevel: currentAgentLevel
      }
    };
  } catch (error) {
    console.error('Bind user relation error:', error);
    return { code: 500, msg: error.message };
  }
}

/**
 * 解绑用户的推广关系
 * @param {Object} db - 数据库实例
 * @param {Object} logOperation - 日志记录函数
 * @param {Object} data - 请求数据
 * @returns {Promise<Object>} 操作结果
 */
async function unbindUserRelation(db, logOperation, data) {
  try {
    const { userId } = data || {};

    if (!userId) {
      return { code: -2, msg: '缺少用户ID' };
    }

    // 获取用户信息
    const userRes = await db.collection('users').doc(userId).get();
    if (!userRes.data) {
      return { code: 404, msg: '用户不存在' };
    }

    const user = userRes.data;
    const previousPath = user.promotionPath || '';

    // 如果没有推广关系，直接返回
    if (!user.parentId && !previousPath) {
      return { code: 0, msg: '用户暂无推广关系' };
    }

    // 清除推广关系
    await db.collection('users').doc(userId).update({
      data: {
        parentId: db.command.remove(),
        promotionPath: db.command.remove(),
        agentLevel: 4, // 重置为普通会员
        updateTime: db.serverDate()
      }
    });

    // 记录日志
    await logOperation(userId, 'unbindUserRelation', {
      previousPath,
      previousParentId: user.parentId || ''
    });

    return {
      code: 0,
      msg: '解绑成功'
    };
  } catch (error) {
    console.error('Unbind user relation error:', error);
    return { code: 500, msg: error.message };
  }
}

module.exports = {
  getUsersAdmin,
  getUserDetailAdmin,
  getUserWalletAdmin,
  getPromotionPathAdmin,
  getUserOrdersAdmin,
  getUserRewardsAdmin,
  updateUserAgentLevel,
  bindUserRelation,
  unbindUserRelation
};
