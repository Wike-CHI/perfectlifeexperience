const cloud = require('wx-server-sdk');

// 初始化云开发
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

// 引入安全日志工具
const { createLogger } = require('./common/logger');
const logger = createLogger('promotion');

// 引入统一响应格式
const { success, error, ErrorCodes } = require('./common/response');

// 引入通知模块
const { sendPromotionNotification } = require('./common/notification');

// 引入常量配置
const {
  Time,
  AgentLevel,
  AgentLevelInternalNames,
  AgentLevelDisplayNames,
  Amount,
  AntiFraud,
  PromotionThreshold,
  Collections,
  RewardType,
  RewardTypeNames,
  getCommissionRule,
  getAgentLevelInternalName,
  getAgentLevelDisplayName,
  getPromotionThreshold,
  getIpLimitWindow,
  getFollowPromotionRule
} = require('./common/constants');

// 引入缓存模块
const {
  teamStatsCache,
  userCache,
  withCache
} = require('./common/cache');

// 常量引用
const MAX_LEVEL = AgentLevel.MAX_LEVEL;
const MIN_REWARD_AMOUNT = Amount.MIN_REWARD;
const MAX_REGISTRATIONS_PER_IP = AntiFraud.MAX_REGISTRATIONS_PER_IP;
const IP_LIMIT_WINDOW = getIpLimitWindow();
const INVITE_CODE_MAX_RETRY = AntiFraud.INVITE_CODE_MAX_RETRY;
const INVITE_CODE_LENGTH = AntiFraud.INVITE_CODE_LENGTH;
const REGISTRATION_ATTEMPT_TTL = AntiFraud.REGISTRATION_ATTEMPT_TTL_DAYS * Time.DAY_MS;

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
 * 精确计算金额，避免浮点数精度问题
 * @param {number} amount - 订单金额（分）
 * @param {number} ratio - 比例（如 0.04 表示 4%）
 * @returns {number} 计算后的金额（分）
 */
function calculateAmount(amount, ratio) {
  const result = Math.max(0, Math.round(amount * ratio));
  return result;
}

/**
 * 验证并解析推广路径
 * @param {string} promotionPath - 推广路径字符串 (格式: "parentId1/parentId2/...")
 * @returns {Array<string>} 解析后的父级 ID 数组
 */
function validateAndParsePromotionPath(promotionPath) {
  if (!promotionPath || typeof promotionPath !== 'string') {
    return [];
  }

  const parts = promotionPath.split('/').filter(id => id);
  const openIdPattern = /^[oO][0-9a-zA-Z_-]{20,}$/;

  for (const id of parts) {
    if (!openIdPattern.test(id)) {
      logger.warn('Invalid promotion path format detected', {
        invalidId: id.substring(0, 10) + '***'
      });
      return [];
    }
  }

  if (parts.length > AgentLevel.MAX_LEVEL) {
    logger.warn('Promotion path too deep, truncating', {
      depth: parts.length,
      maxDepth: AgentLevel.MAX_LEVEL
    });
    return parts.slice(0, AgentLevel.MAX_LEVEL);
  }

  return parts;
}

// ==================== 工具函数 ====================

/**
 * 生成唯一邀请码
 */
function generateInviteCode() {
  const chars = AntiFraud.INVITE_CODE_CHARS;
  let code = '';
  for (let i = 0; i < INVITE_CODE_LENGTH; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * 获取当前月份标识
 */
function getCurrentMonthTag() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * 获取设备指纹（用于防刷）
 */
function getDeviceFingerprint(event) {
  const OPENID = event.OPENID || cloud.getWXContext().OPENID;
  const clientIP = event.clientIP || '';
  return {
    openid: OPENID,
    ip: clientIP,
    timestamp: Date.now()
  };
}

/**
 * 检查是否为重复注册（增强版防刷）
 */
async function checkDuplicateRegistration(openid, deviceInfo) {
  try {
    const recentTime = new Date(Date.now() - IP_LIMIT_WINDOW);

    logger.debug('Anti-fraud check initiated', { ip: deviceInfo.ip });

    // 1. 检查OPENID是否已注册
    const userExists = await db.collection('users')
      .where({ _openid: openid })
      .count();

    if (userExists.total > 0) {
      logger.warn('Duplicate registration attempt - user exists');
      return { valid: false, reason: '用户已存在' };
    }

    // 2. 检查IP注册频率
    const ipCount = await db.collection('users')
      .where({
        registerIP: deviceInfo.ip,
        createTime: _.gte(recentTime)
      })
      .count();

    logger.debug('IP registration count', {
      ip: deviceInfo.ip,
      count: ipCount.total,
      window: '24h'
    });

    if (ipCount.total >= MAX_REGISTRATIONS_PER_IP) {
      logger.warn('IP rate limit exceeded', {
        ip: deviceInfo.ip,
        count: ipCount.total
      });
      return { valid: false, reason: '操作频繁，请稍后再试' };
    }

    // 3. 检查设备注册频率
    const deviceIdPattern = /^[a-zA-Z0-9_-]{10,}$/;

    if (deviceInfo.deviceId && typeof deviceInfo.deviceId === 'string' && deviceIdPattern.test(deviceInfo.deviceId)) {
      const deviceCount = await db.collection('users')
        .where({
          registerDeviceId: deviceInfo.deviceId,
          createTime: _.gte(recentTime)
        })
        .count();

      logger.debug('Device registration count', {
        deviceId: deviceInfo.deviceId.substring(0, 8) + '***',
        count: deviceCount.total
      });

      if (deviceCount.total >= AntiFraud.MAX_REGISTRATIONS_PER_DEVICE) {
        logger.warn('Device rate limit exceeded', {
          deviceId: deviceInfo.deviceId.substring(0, 8) + '***',
          count: deviceCount.total
        });
        return { valid: false, reason: '该设备注册过于频繁，请稍后再试' };
      }
    }

    // 4. 记录注册尝试
    try {
      const anonymizedId = openid.substring(0, 8) + '***';
      const attemptData = {
        anonymizedId,
        ip: deviceInfo.ip,
        deviceId: deviceInfo.deviceId ? deviceInfo.deviceId.substring(0, 8) + '***' : null,
        userAgent: deviceInfo.userAgent || '',
        timestamp: db.serverDate(),
        expiredAt: new Date(Date.now() + REGISTRATION_ATTEMPT_TTL)
      };

      const expirationDate = new Date(Date.now() - REGISTRATION_ATTEMPT_TTL);
      await db.collection('registration_attempts')
        .where({ expiredAt: _.lt(expirationDate) })
        .remove();

      await db.collection('registration_attempts').add({ data: attemptData });

      logger.debug('Registration attempt recorded', {
        anonymizedId,
        ip: deviceInfo.ip
      });
    } catch (recordError) {
      logger.error('Failed to record registration attempt', recordError);
    }

    logger.debug('Anti-fraud check passed');
    return { valid: true };
  } catch (error) {
    logger.error('Anti-fraud check failed', error);
    return { valid: false, reason: '系统繁忙' };
  }
}

/**
 * 获取用户业绩对象（带跨月重置）
 */
function getDefaultPerformance() {
  return {
    totalSales: 0,
    monthSales: 0,
    monthTag: getCurrentMonthTag(),
    teamCount: 0
  };
}

/**
 * 检查并重置跨月数据
 */
async function checkAndResetMonthlyPerformance(user) {
  const currentMonthTag = getCurrentMonthTag();
  const performance = user.performance || getDefaultPerformance();

  if (performance.monthTag !== currentMonthTag) {
    logger.info('Month reset detected', {
      from: performance.monthTag,
      to: currentMonthTag
    });

    await db.collection('users')
      .where({ _openid: user._openid })
      .update({
        data: {
          'performance.monthSales': 0,
          'performance.monthTag': currentMonthTag,
          updateTime: db.serverDate()
        }
      });
    performance.monthSales = 0;
    performance.monthTag = currentMonthTag;
  }

  return performance;
}

// ==================== 晋升检查引擎 ====================

/**
 * 检查代理等级晋升条件
 * 晋升规则：
 * - 四级→三级：累计销售额 >= 1,000元
 * - 三级→二级：本月销售额 >= 5,000元 或 团队人数 >= 30人
 * - 二级→一级：本月销售额 >= 20,000元 或 团队人数 >= 100人
 */
async function checkAgentLevelPromotion(openid) {
  try {
    const userRes = await db.collection('users')
      .where({ _openid: openid })
      .get();

    if (userRes.data.length === 0) {
      return { promoted: false, reason: '用户不存在' };
    }

    const user = userRes.data[0];
    const currentLevel = user.agentLevel || AgentLevel.LEVEL_4;

    // 已是最高等级（一级）
    if (currentLevel <= AgentLevel.LEVEL_1) {
      return { promoted: false, reason: '已是最高等级' };
    }

    // 检查并重置跨月数据
    const performance = await checkAndResetMonthlyPerformance(user);

    // 获取晋升门槛
    const threshold = getPromotionThreshold(currentLevel);
    if (!threshold) {
      return { promoted: false, reason: '无法晋升' };
    }

    let newLevel = currentLevel;
    let promotionReason = '';

    // 检查晋升条件
    if (currentLevel === AgentLevel.LEVEL_4) {
      // 四级→三级：累计销售额
      if (performance.totalSales >= threshold.totalSales) {
        newLevel = AgentLevel.LEVEL_3;
        promotionReason = `累计销售额达到${threshold.totalSales / 100}元`;
      }
    } else if (currentLevel === AgentLevel.LEVEL_3) {
      // 三级→二级：本月销售额 或 团队人数
      if (performance.monthSales >= threshold.monthSales) {
        newLevel = AgentLevel.LEVEL_2;
        promotionReason = `本月销售额达到${threshold.monthSales / 100}元`;
      } else if (performance.teamCount >= threshold.teamCount) {
        newLevel = AgentLevel.LEVEL_2;
        promotionReason = `团队人数达到${threshold.teamCount}人`;
      }
    } else if (currentLevel === AgentLevel.LEVEL_2) {
      // 二级→一级：本月销售额 或 团队人数
      if (performance.monthSales >= threshold.monthSales) {
        newLevel = AgentLevel.LEVEL_1;
        promotionReason = `本月销售额达到${threshold.monthSales / 100}元`;
      } else if (performance.teamCount >= threshold.teamCount) {
        newLevel = AgentLevel.LEVEL_1;
        promotionReason = `团队人数达到${threshold.teamCount}人`;
      }
    }

    // 执行晋升
    if (newLevel < currentLevel) {
      await db.collection('users')
        .where({ _openid: openid })
        .update({
          data: {
            agentLevel: newLevel,
            updateTime: db.serverDate()
          }
        });

      logger.info('User promoted', {
        from: currentLevel,
        to: newLevel,
        reason: promotionReason
      });

      // 发送晋升通知（异步，不阻塞主流程）
      const oldLevelName = getAgentLevelDisplayName(currentLevel);
      const newLevelName = getAgentLevelDisplayName(newLevel);

      sendPromotionNotification(openid, {
        oldLevel: oldLevelName,
        newLevel: newLevelName,
        reason: promotionReason
      }).then(notifyResult => {
        if (notifyResult.success) {
          logger.info('Promotion notification sent', { openid });
        } else {
          logger.warn('Promotion notification failed', { openid, reason: notifyResult.reason || notifyResult.error });
        }
      }).catch(notifyError => {
        logger.error('Promotion notification error', notifyError);
      });

      return {
        promoted: true,
        oldLevel: currentLevel,
        newLevel: newLevel,
        reason: promotionReason
      };
    }

    return { promoted: false, reason: '未满足晋升条件' };
  } catch (error) {
    logger.error('Promotion check failed', error);
    return { promoted: false, reason: '检查失败' };
  }
}

/**
 * 计算晋升进度
 */
function calculatePromotionProgress(user) {
  const performance = user.performance || getDefaultPerformance();
  const currentLevel = user.agentLevel || AgentLevel.LEVEL_4;

  // 已是最高等级（一级）
  if (currentLevel <= AgentLevel.LEVEL_1) {
    return {
      currentLevel: AgentLevel.LEVEL_1,
      currentLevelName: getAgentLevelDisplayName(AgentLevel.LEVEL_1),
      nextLevel: null,
      nextLevelName: null,
      salesProgress: { current: 0, target: 0, percent: 100 },
      teamProgress: { current: 0, target: 0, percent: 100 }
    };
  }

  // 获取下一级的门槛
  const threshold = getPromotionThreshold(currentLevel);
  if (!threshold) {
    return null;
  }

  // 计算下一等级
  const nextLevel = currentLevel - 1;
  const nextLevelName = getAgentLevelDisplayName(nextLevel);

  // 计算金额进度
  let salesCurrent = 0;
  let salesTarget = 0;
  let salesPercent = 0;

  if (currentLevel === AgentLevel.LEVEL_4) {
    // 四级→三级：看累计销售额
    salesCurrent = performance.totalSales;
    salesTarget = threshold.totalSales;
  } else {
    // 三级→二级、二级→一级：看本月销售额
    salesCurrent = performance.monthSales;
    salesTarget = threshold.monthSales;
  }

  if (salesTarget > 0) {
    salesPercent = Math.min(100, Math.floor((salesCurrent / salesTarget) * 100));
  }

  // 计算团队进度
  let teamCurrent = 0;
  let teamTarget = 0;
  let teamPercent = 0;

  if (threshold.teamCount) {
    teamCurrent = performance.teamCount;
    teamTarget = threshold.teamCount;
    teamPercent = Math.min(100, Math.floor((teamCurrent / teamTarget) * 100));
  }

  return {
    currentLevel,
    currentLevelName: getAgentLevelDisplayName(currentLevel),
    nextLevel,
    nextLevelName,
    salesProgress: {
      current: salesCurrent,
      target: salesTarget,
      percent: salesPercent
    },
    teamProgress: {
      current: teamCurrent,
      target: teamTarget,
      percent: teamPercent
    }
  };
}

// ==================== 佣金计算 ====================

/**
 * 计算订单推广奖励
 *
 * 核心逻辑：
 * 1. 佣金分配取决于推广人的代理等级（agentLevel）
 * 2. 一级代理推广：自己拿20%
 * 3. 二级代理推广：自己拿12%，一级代理拿8%
 * 4. 三级代理推广：自己拿12%，二级代理拿4%，一级代理拿4%
 * 5. 四级代理推广：自己拿8%，三级代理拿4%，二级代理拿4%，一级代理拿4%
 */
async function calculatePromotionReward(event, context) {
  const { orderId, buyerId, orderAmount } = event;

  logger.info('Reward calculation started', {
    orderId,
    buyerId,
    amount: orderAmount
  });

  // 边界情况：金额为0
  if (!orderAmount || orderAmount <= 0) {
    logger.warn('Invalid order amount', { amount: orderAmount });
    return { code: 0, msg: '订单金额无效', data: { rewards: [] } };
  }

  // 开启事务
  const transaction = await db.startTransaction();

  try {
    // 1. 获取买家信息，找到推广人
    const buyerRes = await transaction.collection('users')
      .where({ _openid: buyerId })
      .get();

    if (buyerRes.data.length === 0) {
      await transaction.rollback();
      logger.error('Buyer not found', { buyerId });
      return error(ErrorCodes.USER_NOT_FOUND, '买家信息不存在');
    }

    const buyer = buyerRes.data[0];

    // 2. 找到推广人（通过parentId）
    const promoterId = buyer.parentId;
    if (!promoterId) {
      await transaction.rollback();
      logger.info('No promotion relationship', { buyerId });
      return { code: 0, msg: '无推广关系', data: { rewards: [] } };
    }

    // 3. 获取推广人信息
    const promoterRes = await transaction.collection('users')
      .where({ _openid: promoterId })
      .get();

    if (promoterRes.data.length === 0) {
      await transaction.rollback();
      logger.error('Promoter not found', { promoterId });
      return error(ErrorCodes.USER_NOT_FOUND, '推广人信息不存在');
    }

    const promoter = promoterRes.data[0];
    const promoterAgentLevel = promoter.agentLevel || AgentLevel.LEVEL_4;

    logger.info('Promoter info', {
      promoterId,
      agentLevel: promoterAgentLevel,
      agentLevelName: getAgentLevelDisplayName(promoterAgentLevel)
    });

    // 4. 根据推广人的等级，获取佣金分配规则
    const commissionRule = getCommissionRule(promoterAgentLevel);

    logger.info('Commission rule applied', {
      promoterLevel: promoterAgentLevel,
      ownRatio: (commissionRule.own * 100).toFixed(1) + '%',
      upstreamCount: commissionRule.upstream.length
    });

    // 5. 解析推广路径，获取上级链
    const promotionPath = promoter.promotionPath || '';
    const parentChain = validateAndParsePromotionPath(promotionPath).reverse();

    logger.debug('Promoter upstream chain', {
      length: parentChain.length,
      chain: parentChain.map(id => id.substring(0, 8) + '***')
    });

    // 6. 批量获取上级用户信息
    const upstreamUsers = [];
    if (parentChain.length > 0) {
      const usersRes = await transaction.collection('users')
        .where({ _openid: _.in(parentChain) })
        .get();

      const userMap = {};
      usersRes.data.forEach(u => {
        userMap[u._openid] = u;
      });

      // 按照链条顺序获取上级
      for (const parentId of parentChain) {
        if (userMap[parentId]) {
          upstreamUsers.push(userMap[parentId]);
        }
      }
    }

    // 7. 分配佣金
    const rewards = [];

    // 7.1 推广人自己拿的佣金
    const ownCommissionAmount = Math.floor(orderAmount * commissionRule.own);

    if (ownCommissionAmount >= MIN_REWARD_AMOUNT) {
      await createRewardRecord({
        orderId,
        beneficiaryId: promoterId,
        sourceUserId: buyerId,
        orderAmount,
        ratio: commissionRule.own,
        amount: ownCommissionAmount,
        rewardType: RewardType.COMMISSION,
        position: 0
      }, transaction);

      rewards.push({
        beneficiaryId: promoterId,
        beneficiaryName: promoter.nickName || promoter._openid,
        type: RewardType.COMMISSION,
        typeName: RewardTypeNames[RewardType.COMMISSION],
        amount: ownCommissionAmount,
        ratio: commissionRule.own,
        role: '推广人',
        agentLevel: promoterAgentLevel,
        agentLevelName: getAgentLevelDisplayName(promoterAgentLevel)
      });

      logger.info('Promoter commission calculated', {
        amount: ownCommissionAmount,
        ratio: (commissionRule.own * 100).toFixed(1) + '%'
      });
    }

    // 7.2 上级代理拿的佣金
    for (let i = 0; i < commissionRule.upstream.length; i++) {
      const ratio = commissionRule.upstream[i];

      if (i >= upstreamUsers.length) {
        logger.warn('Not enough upstream users', {
          required: i + 1,
          available: upstreamUsers.length
        });
        break;
      }

      const upstreamUser = upstreamUsers[i];
      const commissionAmount = Math.floor(orderAmount * ratio);

      if (commissionAmount >= MIN_REWARD_AMOUNT) {
        await createRewardRecord({
          orderId,
          beneficiaryId: upstreamUser._openid,
          sourceUserId: buyerId,
          orderAmount,
          ratio: ratio,
          amount: commissionAmount,
          rewardType: RewardType.COMMISSION,
          position: i + 1
        }, transaction);

        rewards.push({
          beneficiaryId: upstreamUser._openid,
          beneficiaryName: upstreamUser.nickName || upstreamUser._openid,
          type: RewardType.COMMISSION,
          typeName: RewardTypeNames[RewardType.COMMISSION],
          amount: commissionAmount,
          ratio: ratio,
          role: `${i + 1}级上级`,
          agentLevel: upstreamUser.agentLevel || AgentLevel.LEVEL_4,
          agentLevelName: getAgentLevelDisplayName(upstreamUser.agentLevel || AgentLevel.LEVEL_4)
        });

        logger.info('Upstream commission calculated', {
          upstreamLevel: i + 1,
          amount: commissionAmount,
          ratio: (ratio * 100).toFixed(1) + '%'
        });
      }
    }

    // 8. 记录推广订单
    await transaction.collection('promotion_orders').add({
      data: {
        orderId,
        buyerId,
        promoterId,
        promoterLevel: promoterAgentLevel,
        orderAmount,
        status: 'pending',
        createTime: db.serverDate(),
        settleTime: null
      }
    });

    // 9. 更新买家订单计数
    await updateBuyerOrderCount(buyerId, transaction);

    // 10. 提交事务
    await transaction.commit();

    logger.info('Reward calculation completed', {
      rewardsCount: rewards.length,
      totalAmount: rewards.reduce((sum, r) => sum + r.amount, 0)
    });

    return {
      code: 0,
      msg: '奖励计算成功',
      data: {
        rewards,
        promoterLevel: promoterAgentLevel,
        promoterLevelName: getAgentLevelDisplayName(promoterAgentLevel),
        commissionRule: {
          own: commissionRule.own,
          upstream: commissionRule.upstream
        }
      }
    };
  } catch (err) {
    if (transaction) {
      try {
        await transaction.rollback();
        logger.error('Reward calculation transaction rolled back', err);
      } catch (rollbackError) {
        logger.error('Failed to rollback transaction', rollbackError);
      }
    } else {
      logger.error('Reward calculation failed', err);
    }
    return { code: -1, msg: '计算失败', error: err.message };
  }
}

/**
 * 创建奖励记录（支持事务）
 */
async function createRewardRecord({
  orderId,
  beneficiaryId,
  sourceUserId,
  orderAmount,
  ratio,
  amount,
  rewardType,
  position
}, transaction = null) {
  const collection = transaction
    ? transaction.collection('reward_records')
    : db.collection('reward_records');
  const usersCollection = transaction
    ? transaction.collection('users')
    : db.collection('users');

  await collection.add({
    data: {
      orderId,
      beneficiaryId,
      sourceUserId,
      level: position,
      orderAmount,
      ratio,
      amount,
      rewardType,
      rewardTypeName: RewardTypeNames[rewardType] || '推广佣金',
      status: 'pending',
      createTime: db.serverDate(),
      settleTime: null
    }
  });

  // 更新用户的待结算奖励
  await usersCollection
    .where({ _openid: beneficiaryId })
    .update({
      data: {
        pendingReward: _.inc(amount),
        totalReward: _.inc(amount),
        updateTime: db.serverDate()
      }
    });
}

/**
 * 更新买家订单计数（支持事务）
 */
async function updateBuyerOrderCount(buyerId, transaction = null) {
  try {
    const dbConn = transaction || db;

    const orderCount = await dbConn.collection('orders')
      .where({
        _openid: buyerId,
        status: _.in(['paid', 'shipping', 'completed'])
      })
      .count();

    await dbConn.collection('users')
      .where({ _openid: buyerId })
      .update({
        data: {
          orderCount: orderCount.total,
          updateTime: db.serverDate()
        }
      });
  } catch (err) {
    logger.error('Failed to update buyer order count', err);
  }
}

/**
 * 退款后扣回推广奖励
 */
async function revertPromotionReward(event, context) {
  const { orderId, refundAmount, totalAmount } = event;

  logger.info('Reward revert started', {
    orderId,
    refundAmount,
    totalAmount
  });

  if (!orderId || !refundAmount || !totalAmount) {
    logger.error('Missing required parameters', { orderId, refundAmount, totalAmount });
    return { code: -2, msg: '缺少必要参数: orderId, refundAmount, totalAmount' };
  }

  if (refundAmount > totalAmount) {
    logger.error('Refund amount exceeds total amount', { refundAmount, totalAmount });
    return { code: -2, msg: '退款金额不能超过订单金额' };
  }

  let transaction = null;

  try {
    transaction = await db.startTransaction();

    const rewardRecordsRes = await transaction
      .collection('reward_records')
      .where({ orderId })
      .get();

    if (rewardRecordsRes.data.length === 0) {
      logger.warn('No reward records found for order', { orderId });
      await transaction.commit();
      return {
        code: 0,
        msg: '该订单无推广奖励',
        data: { revertedCount: 0, revertedAmount: 0 }
      };
    }

    const rewardRecords = rewardRecordsRes.data;
    let revertedCount = 0;
    let totalRevertedAmount = 0;

    const revertRatio = refundAmount / totalAmount;

    logger.info('Revert ratio calculated', {
      refundAmount,
      totalAmount,
      ratio: (revertRatio * 100).toFixed(2) + '%'
    });

    for (const record of rewardRecords) {
      const { _id, beneficiaryId, amount, status } = record;

      if (status === 'revoked') {
        logger.debug('Reward already revoked', { recordId: _id });
        continue;
      }

      const revertAmount = Math.floor(amount * revertRatio);

      if (revertAmount < 1) {
        logger.debug('Revert amount too small, skipping', {
          recordId: _id,
          amount,
          revertAmount
        });
        continue;
      }

      await transaction
        .collection('reward_records')
        .doc(_id)
        .update({
          data: {
            status: 'revoked',
            revokeAmount: revertAmount,
            revokeRatio: revertRatio,
            revokeTime: db.serverDate(),
            revokeReason: '订单退款'
          }
        });

      const userRes = await transaction
        .collection('users')
        .where({ _openid: beneficiaryId })
        .get();

      if (userRes.data.length > 0) {
        const user = userRes.data[0];
        const updateData = {
          updateTime: db.serverDate()
        };

        if (status === 'pending') {
          const currentPending = user.pendingReward || 0;
          const actualRevert = Math.min(revertAmount, currentPending);
          updateData.pendingReward = _.inc(-actualRevert);
          updateData.totalReward = _.inc(-actualRevert);

          if (actualRevert < revertAmount) {
            logger.warn('Insufficient pending reward for full revert', {
              beneficiaryId,
              requested: revertAmount,
              actual: actualRevert,
              currentPending
            });
          }
        } else if (status === 'settled') {
          const currentWithdrawable = user.withdrawableReward || 0;
          const actualRevert = Math.min(revertAmount, currentWithdrawable);
          updateData.withdrawableReward = _.inc(-actualRevert);
          updateData.totalReward = _.inc(-actualRevert);

          if (actualRevert < revertAmount) {
            const debtAmount = revertAmount - actualRevert;
            updateData.debt = _.inc(debtAmount);
            logger.warn('Insufficient withdrawable reward, recording debt', {
              beneficiaryId,
              requested: revertAmount,
              actual: actualRevert,
              debtAmount
            });
          }
        }

        await transaction
          .collection('users')
          .doc(user._id)
          .update({ data: updateData });

        logger.info('User reward reverted', {
          beneficiaryId,
          revertAmount,
          originalStatus: status
        });
      }

      revertedCount++;
      totalRevertedAmount += revertAmount;
    }

    const promotionOrdersRes = await transaction
      .collection('promotion_orders')
      .where({ orderId })
      .get();

    if (promotionOrdersRes.data.length > 0) {
      const promoOrder = promotionOrdersRes.data[0];
      await transaction
        .collection('promotion_orders')
        .doc(promoOrder._id)
        .update({
          data: {
            status: 'refunded',
            refundAmount: _.inc(refundAmount),
            refundTime: db.serverDate(),
            settleTime: db.serverDate()
          }
        });
    }

    await transaction.commit();

    logger.info('Reward revert completed', {
      orderId,
      revertedCount,
      totalRevertedAmount
    });

    return {
      code: 0,
      msg: '奖励扣回成功',
      data: {
        revertedCount,
        revertedAmount: totalRevertedAmount,
        refundAmount,
        revertRatio
      }
    };

  } catch (err) {
    if (transaction) {
      try {
        await transaction.rollback();
        logger.error('Reward revert transaction rolled back', err);
      } catch (rollbackError) {
        logger.error('Failed to rollback transaction', rollbackError);
      }
    } else {
      logger.error('Reward revert failed', err);
    }

    return {
      code: -1,
      msg: '奖励扣回失败',
      error: err.message
    };
  }
}

// ==================== 核心业务函数 ====================

/**
 * 绑定推广关系
 */
async function bindPromotionRelation(event, context) {
  const OPENID = event.OPENID || cloud.getWXContext().OPENID;
  const { parentInviteCode, userInfo, deviceInfo } = event;

  logger.info('Binding promotion relation', {
    inviteCode: parentInviteCode
  });

  try {
    // 防刷检查
    const checkResult = await checkDuplicateRegistration(OPENID, deviceInfo);
    if (!checkResult.valid) {
      logger.warn('Anti-fraud check failed', {
        reason: checkResult.reason
      });
      return { code: -1, msg: checkResult.reason };
    }

    // 查找上级用户
    let parentId = null;
    let parentAgentLevel = AgentLevel.LEVEL_4;
    let parentPath = '';

    if (parentInviteCode) {
      logger.debug('Searching for parent user', { inviteCode: parentInviteCode });

      const parentRes = await db.collection('users')
        .where({ inviteCode: parentInviteCode })
        .get();

      if (parentRes.data.length === 0) {
        logger.warn('Invalid invite code', { inviteCode: parentInviteCode });
        return { code: -1, msg: '邀请码无效' };
      }

      const parent = parentRes.data[0];
      parentId = parent._openid;
      parentAgentLevel = parent.agentLevel || AgentLevel.LEVEL_4;
      parentPath = parent.promotionPath || '';

      logger.debug('Parent user found', {
        parentId,
        agentLevel: parentAgentLevel
      });

      // 不能绑定自己
      if (parentId === OPENID) {
        logger.warn('Self-binding attempted');
        return { code: -1, msg: '不能绑定自己' };
      }

      // 检测循环引用
      if (parentId && parentPath) {
        const currentPath = `${parentPath}/${OPENID}`;
        const ancestors = currentPath.split('/').filter(id => id);

        if (ancestors.includes(parentId)) {
          logger.warn('Circular reference detected in promotion path', {
            attemptingParent: parentId,
            existingPath: currentPath
          });
          return { code: -1, msg: '不能绑定下级用户作为上级' };
        }
      }
    }

    // 生成邀请码
    let inviteCode = generateInviteCode();
    let codeExists = true;
    let retryCount = 0;

    logger.debug('Generating invite code', { maxRetries: INVITE_CODE_MAX_RETRY });

    while (codeExists && retryCount < INVITE_CODE_MAX_RETRY) {
      const existRes = await db.collection('users')
        .where({ inviteCode })
        .count();
      if (existRes.total === 0) {
        codeExists = false;
        logger.debug('Invite code generated', {
          code: inviteCode,
          retries: retryCount
        });
      } else {
        inviteCode = generateInviteCode();
        retryCount++;
      }
    }

    if (codeExists) {
      logger.error('Failed to generate unique invite code');
      return { code: -1, msg: '邀请码生成失败，请重试' };
    }

    // 计算当前用户的代理层级
    // 子代理的层级 = 父代理层级 + 1，最大为4
    const currentAgentLevel = parentId ? Math.min(MAX_LEVEL, parentAgentLevel + 1) : MAX_LEVEL;
    const currentPath = parentPath ? `${parentPath}/${parentId}` : (parentId || '');

    logger.debug('User promotion config', {
      agentLevel: currentAgentLevel,
      agentLevelName: getAgentLevelDisplayName(currentAgentLevel),
      path: currentPath
    });

    // 创建用户记录
    const userData = {
      _openid: OPENID,
      ...userInfo,
      inviteCode,
      parentId,
      promotionPath: currentPath,
      agentLevel: currentAgentLevel,
      performance: getDefaultPerformance(),
      totalReward: 0,
      pendingReward: 0,
      registerIP: deviceInfo.ip,
      orderCount: 0,
      isSuspicious: false,
      createTime: db.serverDate(),
      updateTime: db.serverDate()
    };

    await db.collection('users').add({ data: userData });

    logger.info('User record created');

    // 更新上级的团队数量
    if (parentId) {
      await db.collection('users')
        .where({ _openid: parentId })
        .update({
          data: {
            'performance.teamCount': _.inc(1),
            teamCount: _.inc(1),
            updateTime: db.serverDate()
          }
        });

      logger.info('Parent team stats updated', { parentId });

      // 清除缓存
      teamStatsCache.delete(`teamStats_${parentId}`);
      userCache.delete(`promotionInfo_${parentId}`);
      logger.debug('Team stats cache cleared for parent', { parentId });

      if (parentPath) {
        const parentChain = parentPath.split('/').filter(id => id);
        parentChain.forEach(ancestorId => {
          teamStatsCache.delete(`teamStats_${ancestorId}`);
          userCache.delete(`promotionInfo_${ancestorId}`);
        });
        logger.debug('All ancestor caches cleared', {
          count: parentChain.length
        });
      }

      // 记录推广关系
      await db.collection('promotion_relations').add({
        data: {
          userId: OPENID,
          parentId,
          level: 1,
          path: currentPath,
          createTime: db.serverDate()
        }
      });
    }

    return {
      code: 0,
      msg: '绑定成功',
      data: {
        inviteCode,
        agentLevel: currentAgentLevel,
        agentLevelName: getAgentLevelDisplayName(currentAgentLevel)
      }
    };
  } catch (err) {
    logger.error('Failed to bind promotion relation', err);
    return { code: -1, msg: '绑定失败，请重试' };
  }
}

/**
 * 获取推广信息（带缓存优化）
 */
async function getPromotionInfo(event, context) {
  const OPENID = event.OPENID || cloud.getWXContext().OPENID;
  const cacheKey = `promotionInfo_${OPENID}`;

  // 尝试从缓存获取
  const cached = userCache.get(cacheKey);
  if (cached !== null) {
    logger.debug('Promotion info cache hit', { OPENID });
    return cached;
  }

  logger.debug('Promotion info cache miss, fetching...', { OPENID });

  try {
    const userRes = await db.collection('users')
      .where({ _openid: OPENID })
      .get();

    if (userRes.data.length === 0) {
      const notFoundResult = { code: -1, msg: '用户不存在', cached: true };
      userCache.set(cacheKey, notFoundResult, 60000);
      logger.debug('User not found, cached negative result', { OPENID });
      return notFoundResult;
    }

    const user = userRes.data[0];

    // 检查并补全邀请码
    if (!user.inviteCode) {
      let inviteCode = generateInviteCode();
      let codeExists = true;
      let retryCount = 0;

      while (codeExists && retryCount < 10) {
        const existRes = await db.collection('users')
          .where({ inviteCode })
          .count();
        if (existRes.total === 0) {
          codeExists = false;
        } else {
          inviteCode = generateInviteCode();
          retryCount++;
        }
      }

      await db.collection('users').doc(user._id).update({
        data: {
          inviteCode,
          updateTime: db.serverDate()
        }
      });
      user.inviteCode = inviteCode;
    }

    // 检查并重置跨月数据
    const performance = await checkAndResetMonthlyPerformance(user);

    // 获取团队统计
    const teamStats = await getTeamStats(OPENID);

    // 更新团队人数到业绩
    if (performance.teamCount !== teamStats.total) {
      await db.collection('users')
        .where({ _openid: OPENID })
        .update({
          data: {
            'performance.teamCount': teamStats.total,
            updateTime: db.serverDate()
          }
        });
      performance.teamCount = teamStats.total;
    }

    // 获取今日收益
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayRewardRes = await db.collection('reward_records')
      .where({
        beneficiaryId: OPENID,
        status: 'settled',
        settleTime: _.gte(today)
      })
      .get();

    const todayReward = todayRewardRes.data.reduce((sum, r) => sum + r.amount, 0);

    // 获取本月收益
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const monthRewardRes = await db.collection('reward_records')
      .where({
        beneficiaryId: OPENID,
        status: 'settled',
        settleTime: _.gte(monthStart)
      })
      .get();

    const monthReward = monthRewardRes.data.reduce((sum, r) => sum + r.amount, 0);

    // 计算晋升进度
    const promotionProgress = calculatePromotionProgress({
      ...user,
      performance
    });

    const agentLevel = user.agentLevel || AgentLevel.LEVEL_4;

    // 获取上级信息（如果有）
    let parentInfo = null;
    const promotionPath = user.promotionPath || '';
    const parentIds = promotionPath.split('/').filter(id => id);
    const directParentId = parentIds.length > 0 ? parentIds[parentIds.length - 1] : null;

    if (directParentId) {
      const parentRes = await db.collection('users')
        .where({ _openid: directParentId })
        .field({
          nickName: true,
          avatarUrl: true,
          agentLevel: true,
          inviteCode: true
        })
        .get();

      if (parentRes.data.length > 0) {
        const parent = parentRes.data[0];
        parentInfo = {
          nickName: parent.nickName || '用户' + parent.inviteCode,
          avatarUrl: parent.avatarUrl || '',
          agentLevel: parent.agentLevel || AgentLevel.LEVEL_4,
          agentLevelName: getAgentLevelDisplayName(parent.agentLevel || AgentLevel.LEVEL_4)
        };
      }
    }

    const result = {
      code: 0,
      msg: '获取成功',
      data: {
        inviteCode: user.inviteCode,
        agentLevel: agentLevel,
        agentLevelName: getAgentLevelDisplayName(agentLevel),
        agentLevelInternalName: getAgentLevelInternalName(agentLevel),
        totalReward: user.totalReward || 0,
        pendingReward: user.pendingReward || 0,
        withdrawableReward: user.withdrawableReward || 0,
        todayReward,
        monthReward,
        performance,
        promotionProgress,
        teamStats,
        promotionPath,
        hasParent: !!directParentId,
        parentInfo,
        bindTime: user.createTime || null
      }
    };

    // 缓存结果（5分钟TTL）
    userCache.set(cacheKey, result, 300000);

    return result;
  } catch (err) {
    logger.error('Failed to get promotion info', err);
    return { code: -1, msg: '获取失败' };
  }
}

/**
 * 获取团队统计（优化版）
 */
async function getTeamStats(userId) {
  const cacheKey = `teamStats_${userId}`;

  const cached = teamStatsCache.get(cacheKey);
  if (cached !== null) {
    logger.debug('Team stats cache hit', { userId });
    return cached;
  }

  logger.debug('Team stats cache miss, calculating...', { userId });

  const stats = {
    total: 0,
    level1: 0,
    level2: 0,
    level3: 0,
    level4: 0
  };

  try {
    // 获取一级团队成员
    const level1Res = await db.collection('users')
      .where({ parentId: userId })
      .count();
    stats.level1 = level1Res.total;

    logger.debug('Level 1 members counted', { count: stats.level1 });

    if (stats.level1 === 0) {
      teamStatsCache.set(cacheKey, stats, 3600000);
      return stats;
    }

    // 获取二级团队成员
    const level1Users = await db.collection('users')
      .where({ parentId: userId })
      .field({ _openid: true })
      .get();

    if (level1Users.data.length > 0) {
      const level1Ids = level1Users.data.map(u => u._openid);
      const level2Res = await db.collection('users')
        .where({ parentId: _.in(level1Ids) })
        .count();
      stats.level2 = level2Res.total;

      if (stats.level2 > 0) {
        const level2Users = await db.collection('users')
          .where({ parentId: _.in(level1Ids) })
          .field({ _openid: true })
          .get();

        if (level2Users.data.length > 0) {
          const level2Ids = level2Users.data.map(u => u._openid);
          const level3Res = await db.collection('users')
            .where({ parentId: _.in(level2Ids) })
            .count();
          stats.level3 = level3Res.total;

          if (stats.level3 > 0) {
            const level3Users = await db.collection('users')
              .where({ parentId: _.in(level2Ids) })
              .field({ _openid: true })
              .get();

            if (level3Users.data.length > 0) {
              const level3Ids = level3Users.data.map(u => u._openid);
              const level4Res = await db.collection('users')
                .where({ parentId: _.in(level3Ids) })
                .count();
              stats.level4 = level4Res.total;
            }
          }
        }
      }
    }

    stats.total = stats.level1 + stats.level2 + stats.level3 + stats.level4;
    logger.info('Team stats calculated', { total: stats.total });

    teamStatsCache.set(cacheKey, stats, 3600000);

    return stats;
  } catch (err) {
    logger.error('Team stats calculation failed', err);
    return stats;
  }
}

/**
 * 获取团队成员列表
 */
async function getTeamMembers(event, context) {
  const OPENID = event.OPENID || cloud.getWXContext().OPENID;
  const { level = 1, page = 1, limit = 20 } = event;

  try {
    let query = {};

    if (level === 1) {
      query = { parentId: OPENID };
    } else {
      const userRes = await db.collection('users')
        .where({ _openid: OPENID })
        .get();

      if (userRes.data.length === 0) {
        return { code: -1, msg: '用户不存在' };
      }

      const userPath = userRes.data[0].promotionPath || '';
      const fullPath = userPath ? `${userPath}/${OPENID}` : OPENID;

      query = {
        promotionPath: db.RegExp({
          regexp: fullPath,
          options: 'i'
        })
      };
    }

    const membersRes = await db.collection('users')
      .where(query)
      .orderBy('createTime', 'desc')
      .skip((page - 1) * limit)
      .limit(limit)
      .get();

    const members = membersRes.data.map(m => {
      const agentLevel = m.agentLevel || AgentLevel.LEVEL_4;
      return {
        id: m._openid,
        nickName: m.nickName,
        avatarUrl: m.avatarUrl,
        createTime: m.createTime,
        agentLevel: agentLevel,
        agentLevelName: getAgentLevelDisplayName(agentLevel),
        performance: m.performance || getDefaultPerformance()
      };
    });

    return {
      code: 0,
      msg: '获取成功',
      data: { members }
    };
  } catch (err) {
    logger.error('Failed to get team members', err);
    return { code: -1, msg: '获取失败' };
  }
}

/**
 * 获取奖励明细
 */
async function getRewardRecords(event, context) {
  const OPENID = event.OPENID || cloud.getWXContext().OPENID;
  const { status, page = 1, limit = 20 } = event;

  try {
    let query = { beneficiaryId: OPENID };

    if (status) {
      query.status = status;
    }

    const recordsRes = await db.collection('reward_records')
      .where(query)
      .orderBy('createTime', 'desc')
      .skip((page - 1) * limit)
      .limit(limit)
      .get();

    // 获取来源用户信息
    const sourceIds = [...new Set(recordsRes.data.map(r => r.sourceUserId))];
    const usersRes = await db.collection('users')
      .where({ _openid: _.in(sourceIds) })
      .get();

    const userMap = {};
    usersRes.data.forEach(u => {
      userMap[u._openid] = u;
    });

    const records = recordsRes.data.map(r => ({
      id: r._id,
      orderId: r.orderId,
      amount: r.amount,
      ratio: r.ratio,
      level: r.level,
      status: r.status,
      rewardType: r.rewardType,
      rewardTypeName: r.rewardTypeName || RewardTypeNames[r.rewardType] || '推广佣金',
      createTime: r.createTime,
      settleTime: r.settleTime,
      sourceUser: userMap[r.sourceUserId] ? {
        nickName: userMap[r.sourceUserId].nickName,
        avatarUrl: userMap[r.sourceUserId].avatarUrl
      } : null
    }));

    return {
      code: 0,
      msg: '获取成功',
      data: { records }
    };
  } catch (err) {
    logger.error('Failed to get reward records', err);
    return { code: -1, msg: '获取失败' };
  }
}

/**
 * 生成推广二维码
 */
async function generateQRCode(event, context) {
  const OPENID = event.OPENID || cloud.getWXContext().OPENID;
  const { page = 'pages/index/index' } = event;

  try {
    const userRes = await db.collection('users')
      .where({ _openid: OPENID })
      .get();

    if (userRes.data.length === 0) {
      return { code: -1, msg: '用户不存在' };
    }

    const user = userRes.data[0];
    const scene = `invite=${user.inviteCode}`;

    const result = await cloud.openapi.wxacode.getUnlimited({
      scene,
      page,
      width: 280,
      checkPath: false
    });

    const uploadRes = await cloud.uploadFile({
      cloudPath: `qrcodes/${OPENID}_${Date.now()}.png`,
      fileContent: result.buffer
    });

    const fileRes = await cloud.getTempFileURL({
      fileList: [uploadRes.fileID]
    });

    return {
      code: 0,
      msg: '生成成功',
      data: {
        qrCodeUrl: fileRes.fileList[0].tempFileURL,
        inviteCode: user.inviteCode
      }
    };
  } catch (err) {
    logger.error('Failed to generate QR code', err);
    return { code: -1, msg: '生成失败' };
  }
}

/**
 * 更新业绩并检查晋升
 */
async function updatePerformanceAndCheckPromotion(event, context) {
  const { userId, orderAmount } = event;

  try {
    const userRes = await db.collection('users')
      .where({ _openid: userId })
      .get();

    if (userRes.data.length === 0) {
      return { code: -1, msg: '用户不存在' };
    }

    const user = userRes.data[0];
    const currentMonthTag = getCurrentMonthTag();
    const performance = user.performance || getDefaultPerformance();

    const updateData = {
      'performance.totalSales': _.inc(orderAmount),
      updateTime: db.serverDate()
    };

    if (performance.monthTag === currentMonthTag) {
      updateData['performance.monthSales'] = _.inc(orderAmount);
    } else {
      updateData['performance.monthSales'] = orderAmount;
      updateData['performance.monthTag'] = currentMonthTag;
    }

    await db.collection('users')
      .where({ _openid: userId })
      .update({ data: updateData });

    userCache.delete(`promotionInfo_${userId}`);
    logger.debug('Promotion info cache cleared', { userId });

    const promotionResult = await checkAgentLevelPromotion(userId);

    if (promotionResult.promoted) {
      userCache.delete(`promotionInfo_${userId}`);
      logger.debug('Promotion info cache cleared after promotion', { userId });
    }

    return {
      code: 0,
      msg: '更新成功',
      data: {
        promotion: promotionResult
      }
    };
  } catch (err) {
    logger.error('Failed to update performance', err);
    return { code: -1, msg: '更新失败' };
  }
}

/**
 * 处理代理等级升级（带跟随升级机制）
 */
async function handlePromotionWithFollow(userId, newLevel, oldLevel) {
  try {
    const userRes = await db.collection('users')
      .where({ _openid: userId })
      .get();

    if (userRes.data.length === 0) {
      return { code: -1, msg: '用户不存在' };
    }

    const user = userRes.data[0];

    // 更新用户等级
    await db.collection('users')
      .where({ _openid: userId })
      .update({
        data: {
          agentLevel: newLevel,
          updateTime: db.serverDate()
        }
      });

    logger.info('User agent level updated', {
      userId,
      oldLevel,
      newLevel
    });

    // 检查跟随升级规则
    const followRule = getFollowPromotionRule(newLevel);
    const followedUsers = [];

    if (followRule && followRule.subordinateUpgrade) {
      // 获取直接下级
      const subordinatesRes = await db.collection('users')
        .where({ parentId: userId })
        .get();

      if (subordinatesRes.data.length > 0) {
        const upgradeRules = Array.isArray(followRule.subordinateUpgrade)
          ? followRule.subordinateUpgrade
          : [followRule.subordinateUpgrade];

        for (const subordinate of subordinatesRes.data) {
          const subordinateLevel = subordinate.agentLevel || AgentLevel.LEVEL_4;

          for (const rule of upgradeRules) {
            if (subordinateLevel === rule.fromLevel) {
              await db.collection('users')
                .where({ _openid: subordinate._openid })
                .update({
                  data: {
                    agentLevel: rule.toLevel,
                    updateTime: db.serverDate()
                  }
                });

              followedUsers.push({
                userId: subordinate._openid,
                fromLevel: rule.fromLevel,
                toLevel: rule.toLevel
              });

              logger.info('Subordinate followed upgrade', {
                userId: subordinate._openid,
                fromLevel: rule.fromLevel,
                toLevel: rule.toLevel,
                triggeredBy: userId
              });
            }
          }
        }
      }
    }

    // 清除缓存
    userCache.delete(`promotionInfo_${userId}`);
    followedUsers.forEach(u => {
      userCache.delete(`promotionInfo_${u.userId}`);
    });

    return {
      code: 0,
      msg: '升级成功',
      data: {
        oldLevel,
        newLevel,
        followedUsers
      }
    };
  } catch (err) {
    logger.error('Failed to handle promotion with follow', err);
    return { code: -1, msg: '升级失败' };
  }
}

// ==================== 数据看板 ====================

/**
 * 获取推广数据看板
 *
 * @param {Object} requestData - 请求数据
 * @param {string} requestData.timeRange - 时间范围: today/week/month/all
 */
async function getPromotionDashboard(requestData, context) {
  const { timeRange = 'month' } = requestData;
  const OPENID = requestData.OPENID;

  try {
    // 获取用户信息
    const userRes = await db.collection('users').where({ _openid: OPENID }).get();
    if (userRes.data.length === 0) {
      return { code: -1, msg: '用户不存在' };
    }
    const user = userRes.data[0];

    // 计算时间范围
    const { startTime, endTime } = getTimeRange(timeRange);

    // 并行查询各项数据
    const [rewardRecords, teamStats, recentOrders] = await Promise.all([
      // 查询奖励记录
      db.collection('reward_records')
        .where({
          _openid: OPENID,
          createTime: db.command.gte(startTime)
        })
        .orderBy('createTime', 'desc')
        .limit(100)
        .get(),

      // 查询团队统计
      getTeamStatsByLevel(OPENID),

      // 查询最近推广订单
      getRecentPromotionOrders(OPENID, 5)
    ]);

    // 计算汇总数据
    const records = rewardRecords.data || [];
    let totalCommission = 0;
    let orderCount = 0;
    let totalSales = 0;
    const commissionBreakdown = {
      basic: 0,
      repurchase: 0,
      team: 0,
      nurture: 0
    };

    records.forEach(record => {
      totalCommission += record.amount || 0;
      orderCount++;
      totalSales += record.orderAmount || 0;

      // 按类型统计佣金
      switch (record.rewardType) {
        case 'basic':
          commissionBreakdown.basic += record.amount || 0;
          break;
        case 'repurchase':
          commissionBreakdown.repurchase += record.amount || 0;
          break;
        case 'team':
          commissionBreakdown.team += record.amount || 0;
          break;
        case 'nurture':
          commissionBreakdown.nurture += record.amount || 0;
          break;
      }
    });

    // 计算趋势数据
    const trendData = calculateTrendData(records, timeRange);

    // 计算环比增长（与上一个周期比较）
    const prevPeriodStart = getPrevPeriodStart(timeRange);
    const prevRecords = await db.collection('reward_records')
      .where({
        _openid: OPENID,
        createTime: db.command.gte(prevPeriodStart).and(db.command.lt(startTime))
      })
      .get();

    let prevCommission = 0;
    (prevRecords.data || []).forEach(r => prevCommission += r.amount || 0);

    let commissionTrend = 0;
    if (prevCommission > 0) {
      commissionTrend = ((totalCommission - prevCommission) / prevCommission) * 100;
    }

    const performance = user.performance || getDefaultPerformance();

    return {
      code: 0,
      data: {
        summary: {
          totalCommission,
          orderCount,
          totalSales,
          teamSize: performance.teamCount || 0,
          directCount: performance.directCount || 0,
          commissionTrend: Math.round(commissionTrend * 10) / 10,
          commissionBreakdown,
          teamByLevel: teamStats
        },
        trend: trendData,
        recentOrders: recentOrders
      }
    };
  } catch (err) {
    logger.error('Failed to get dashboard data', err);
    return { code: -1, msg: '获取数据失败' };
  }
}

/**
 * 获取时间范围
 */
function getTimeRange(range) {
  const now = new Date();
  let startTime;

  switch (range) {
    case 'today':
      startTime = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case 'week':
      const dayOfWeek = now.getDay() || 7;
      startTime = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek + 1);
      break;
    case 'month':
      startTime = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'all':
    default:
      startTime = new Date(2020, 0, 1); // 很早的时间
      break;
  }

  return { startTime, endTime: now };
}

/**
 * 获取上一个周期的开始时间
 */
function getPrevPeriodStart(range) {
  const now = new Date();
  let startTime;

  switch (range) {
    case 'today':
      // 昨天
      startTime = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      break;
    case 'week':
      // 上周
      const dayOfWeek = now.getDay() || 7;
      startTime = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek + 1 - 7);
      break;
    case 'month':
      // 上月
      startTime = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      break;
    case 'all':
    default:
      startTime = new Date(2020, 0, 1);
      break;
  }

  return startTime;
}

/**
 * 获取各层级团队统计
 */
async function getTeamStatsByLevel(openid) {
  const userRes = await db.collection('users').where({ _openid: openid }).get();
  if (userRes.data.length === 0) return [0, 0, 0, 0];

  const user = userRes.data[0];
  const inviteCode = user.inviteCode;
  if (!inviteCode) return [0, 0, 0, 0];

  const stats = [0, 0, 0, 0];

  // 查询各级下级数量
  for (let level = 1; level <= 4; level++) {
    const pattern = level === 1
      ? `^${inviteCode}$`
      : `/${inviteCode}$`;

    const countRes = await db.collection('users')
      .where({
        promotionPath: db.command.RegExp({
          regexp: pattern,
          options: 'i'
        })
      })
      .count();

    stats[level - 1] = countRes.total;
  }

  return stats;
}

/**
 * 获取最近推广订单
 */
async function getRecentPromotionOrders(openid, limit = 5) {
  const records = await db.collection('reward_records')
    .where({
      _openid: openid,
      rewardType: 'basic'
    })
    .orderBy('createTime', 'desc')
    .limit(limit)
    .get();

  return (records.data || []).map(r => ({
    orderId: r.orderId,
    buyerPhone: r.buyerPhone || '',
    orderAmount: r.orderAmount || 0,
    commission: r.amount || 0,
    createTime: r.createTime
  }));
}

/**
 * 计算趋势数据
 */
function calculateTrendData(records, timeRange) {
  const trendMap = new Map();

  records.forEach(record => {
    const date = new Date(record.createTime);
    let key;

    switch (timeRange) {
      case 'today':
        // 按小时分组
        key = `${String(date.getHours()).padStart(2, '0')}:00`;
        break;
      case 'week':
        // 按天分组
        key = `${date.getMonth() + 1}/${date.getDate()}`;
        break;
      case 'month':
        // 按天分组
        key = `${date.getMonth() + 1}/${date.getDate()}`;
        break;
      case 'all':
        // 按月分组
        key = `${date.getFullYear()}/${date.getMonth() + 1}`;
        break;
      default:
        key = `${date.getMonth() + 1}/${date.getDate()}`;
    }

    const current = trendMap.get(key) || 0;
    trendMap.set(key, current + (record.amount || 0));
  });

  // 转换为数组
  return Array.from(trendMap.entries())
    .map(([label, value]) => ({ label, value }))
    .slice(-7); // 最多显示7个数据点
}

/**
 * 主入口函数
 */
exports.main = async (event, context) => {
  logger.debug('Promotion event received', { action: event.action });

  const requestData = parseEvent(event);
  logger.debug('Promotion parsed data', { action: requestData.action });

  const { action } = requestData;
  const OPENID = cloud.getWXContext().OPENID || requestData.OPENID;

  if (!OPENID) {
    logger.warn('Unauthorized access attempt - no OPENID found');
    return { code: -3, msg: '未登录或登录已过期' };
  }

  requestData.OPENID = OPENID;

  switch (action) {
    case 'bindRelation':
      return await bindPromotionRelation(requestData, context);
    case 'calculateReward':
      return await calculatePromotionReward(requestData, context);
    case 'getInfo':
      return await getPromotionInfo(requestData, context);
    case 'getTeamMembers':
      return await getTeamMembers(requestData, context);
    case 'getRewardRecords':
      return await getRewardRecords(requestData, context);
    case 'generateQRCode':
      return await generateQRCode(requestData, context);
    case 'checkPromotion':
      return await checkAgentLevelPromotion(OPENID);
    case 'updatePerformance':
      return await updatePerformanceAndCheckPromotion(requestData, context);
    case 'promoteAgentLevel':
      return await handlePromotionWithFollow(
        requestData.userId || OPENID,
        requestData.newLevel,
        requestData.oldLevel
      );
    case 'revertReward':
      return await revertPromotionReward(requestData, context);
    case 'getDashboard':
      return await getPromotionDashboard(requestData, context);
    default:
      return { code: -1, msg: '未知操作' };
  }
};
