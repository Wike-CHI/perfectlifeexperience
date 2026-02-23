/**
 * 推广体系V2 - 跟随升级机制
 *
 * 功能：
 * - 处理用户升级及下级跟随
 * - 实现自动脱离机制
 * - 记录升级历史
 */

const cloud = require('wx-server-sdk');

// 初始化云开发
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

const { createLogger } = require('./common/logger');
const logger = createLogger('promotion-v2');

const {
  AgentLevel
} = require('./common/constants');

/**
 * 获取跟随升级规则
 *
 * 规则：
 * - 4->3: 无跟随（但可发展新的四级）
 * - 3->2: 4级跟随升到3级
 * - 2->1: 3级升到2级，4级升到3级
 *
 * @param {number} fromLevel - 原等级
 * @param {number} toLevel - 新等级
 * @returns {Array} 跟随升级规则数组
 */
function getFollowRules(fromLevel, toLevel) {
  const rules = {
    '4->3': [],  // 无跟随
    '3->2': [
      { fromLevel: 4, toLevel: 3 }
    ],
    '2->1': [
      { fromLevel: 3, toLevel: 2 },
      { fromLevel: 4, toLevel: 3 }
    ]
  };

  const key = `${fromLevel}->${toLevel}`;
  return rules[key] || [];
}

/**
 * 获取用户的新推广路径（脱离机制）
 *
 * 逻辑：
 * - 当用户升级时，需要脱离原推荐链
 * - 根据新等级，跳级对接上上级
 *
 * @param {string} userId - 用户ID
 * @param {number} newLevel - 新等级
 * @param {object} transaction - 事务对象
 * @returns {Promise<string>} 新的推广路径
 */
async function getNewPromotionPath(userId, newLevel, transaction) {
  try {
    // 获取用户当前的推广路径
    const userRes = await transaction.collection('users')
      .where({ _openid: userId })
      .field({ promotionPath: true })
      .get();

    if (userRes.data.length === 0) {
      logger.error('User not found', { userId });
      return '';
    }

    const user = userRes.data[0];
    const currentPath = user.promotionPath || '';

    // 如果没有推广路径，返回空
    if (!currentPath) {
      return '';
    }

    // 解析当前推广路径
    const pathArray = currentPath.split('/').filter(id => id);

    // 根据新等级，确定需要跳过的层级
    // 新等级1：跳到根节点（清空路径）
    // 新等级2：跳过1级，保留上上级
    // 新等级3：跳过2级，保留上上级
    // 新等级4：跳过3级，保留上上级
    const skipLevels = newLevel - 1;

    if (skipLevels >= pathArray.length) {
      // 如果跳过的层级超过当前路径长度，清空路径
      return '';
    }

    // 保留跳过层级之后的部分
    const newPath = pathArray.slice(skipLevels).join('/');

    logger.info('New promotion path calculated', {
      userId,
      oldPath: currentPath,
      newPath,
      skipLevels
    });

    return newPath;
  } catch (error) {
    logger.error('Failed to calculate new promotion path', error);
    throw error;
  }
}

/**
 * 获取指定等级的直接下级
 *
 * @param {string} parentId - 父级ID
 * @param {number} childLevel - 子级等级
 * @param {object} transaction - 事务对象
 * @returns {Promise<Array>} 下级用户列表
 */
async function getChildrenByLevel(parentId, childLevel, transaction) {
  try {
    const childrenRes = await transaction.collection('users')
      .where({
        parentId: parentId,
        agentLevel: childLevel
      })
      .get();

    logger.info('Children found', {
      parentId,
      childLevel,
      count: childrenRes.data.length
    });

    return childrenRes.data;
  } catch (error) {
    logger.error('Failed to get children by level', error);
    throw error;
  }
}

/**
 * 处理用户升级及下级跟随
 *
 * @param {string} userId - 升级用户OPENID
 * @param {number} newLevel - 新等级
 * @param {number} oldLevel - 原等级
 * @returns {Promise<object>} 升级结果
 */
async function handlePromotionWithFollow(userId, newLevel, oldLevel) {
  logger.info('Handling promotion with follow', {
    userId,
    from: oldLevel,
    to: newLevel
  });

  const transaction = await db.startTransaction();

  try {
    // 1. 获取跟随升级规则
    const followRules = getFollowRules(oldLevel, newLevel);

    logger.info('Follow rules', {
      from: oldLevel,
      to: newLevel,
      rules: followRules
    });

    // 2. 计算新的推广路径（脱离机制）
    const newPromotionPath = await getNewPromotionPath(userId, newLevel, transaction);

    // 3. 更新用户等级（自己升级）
    await transaction.collection('users')
      .where({ _openid: userId })
      .update({
        data: {
          agentLevel: newLevel,
          promotionPath: newPromotionPath,
          updateTime: db.serverDate(),
          // 记录升级历史
          promotionHistory: _.push({
            from: oldLevel,
            to: newLevel,
            type: 'self',
            timestamp: new Date(),
            oldPath: _.extract('promotionPath'), // 保存旧路径用于审计
            newPath: newPromotionPath
          })
        }
      });

    logger.info('User promoted', {
      userId,
      from: oldLevel,
      to: newLevel,
      newPath: newPromotionPath
    });

    // 4. 处理下级跟随升级
    const followUpdates = [];

    for (const rule of followRules) {
      const affectedChildren = await getChildrenByLevel(userId, rule.fromLevel, transaction);

      logger.info('Processing follow rule', {
        rule,
        affectedCount: affectedChildren.length
      });

      for (const child of affectedChildren) {
        // 计算下级的新推广路径
        const childNewPath = await getNewPromotionPath(child._openid, rule.toLevel, transaction);

        await transaction.collection('users')
          .where({ _openid: child._openid })
          .update({
            data: {
              agentLevel: rule.toLevel,
              promotionPath: childNewPath,
              updateTime: db.serverDate(),
              // 记录跟随升级历史
              promotionHistory: _.push({
                from: rule.fromLevel,
                to: rule.toLevel,
                type: 'follow',
                triggeredBy: userId,
                timestamp: new Date(),
                oldPath: child.promotionPath,
                newPath: childNewPath
              })
            }
          });

        followUpdates.push({
          childId: child._openid,
          childName: child.nickName || child._openid,
          from: rule.fromLevel,
          to: rule.toLevel,
          oldPath: child.promotionPath,
          newPath: childNewPath
        });

        logger.info('Child promoted', {
          childId: child._openid,
          from: rule.fromLevel,
          to: rule.toLevel,
          triggeredBy: userId
        });
      }
    }

    // 5. 更新推广关系状态（标记已脱离的关系）
    // 这一步可选，用于审计和分析

    // 提交事务
    await transaction.commit();

    logger.info('Promotion with follow completed', {
      promoted: { userId, from: oldLevel, to: newLevel },
      followUpdatesCount: followUpdates.length
    });

    return {
      success: true,
      promoted: {
        userId,
        from: oldLevel,
        to: newLevel,
        newPath: newPromotionPath
      },
      followUpdates,
      totalAffected: 1 + followUpdates.length
    };
  } catch (error) {
    // 回滚事务
    await transaction.rollback();
    logger.error('Promotion with follow failed', error);
    throw error;
  }
}

/**
 * 检查并处理星级升级
 *
 * @param {string} userId - 用户ID
 * @param {number} newStarLevel - 新星级
 * @param {number} oldStarLevel - 旧星级
 * @returns {Promise<object>} 升级结果
 */
async function handleStarLevelPromotion(userId, newStarLevel, oldStarLevel) {
  logger.info('Handling star level promotion', {
    userId,
    from: oldStarLevel,
    to: newStarLevel
  });

  try {
    // 星级升级不会触发跟随升级，只更新用户自己的星级
    const result = await db.collection('users')
      .where({ _openid: userId })
      .update({
        data: {
          starLevel: newStarLevel,
          updateTime: db.serverDate(),
          // 记录星级升级历史
          promotionHistory: _.push({
            type: 'star_promotion',
            from: oldStarLevel,
            to: newStarLevel,
            timestamp: new Date()
          })
        }
      });

    logger.info('Star level promotion completed', {
      userId,
      from: oldStarLevel,
      to: newStarLevel
    });

    return {
      success: true,
      promoted: {
        userId,
        from: oldStarLevel,
        to: newStarLevel
      }
    };
  } catch (error) {
    logger.error('Star level promotion failed', error);
    throw error;
  }
}

module.exports = {
  handlePromotionWithFollow,
  handleStarLevelPromotion,
  getFollowRules,
  getNewPromotionPath
};
