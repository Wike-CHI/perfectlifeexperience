const cloud = require('wx-server-sdk');

// 初始化云开发
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

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

// ==================== 奖励比例配置 ====================

// 基础佣金比例（按代理层级）
const AGENT_COMMISSION_RATIOS = {
  0: 0.25, // 总公司：25%
  1: 0.20, // 一级代理：20%
  2: 0.15, // 二级代理：15%
  3: 0.10, // 三级代理：10%
  4: 0.05  // 四级代理：5%
};

// 复购奖励比例
const REPURCHASE_RATIO = 0.03; // 3%

// 团队管理奖比例
const MANAGEMENT_RATIO = 0.02; // 2%

// 育成津贴比例
const NURTURE_RATIO = 0.02; // 2%

// 最大推广层级
const MAX_LEVEL = 4;

// ==================== 晋升门槛配置 ====================

// 晋升条件（金额单位：分）
const PROMOTION_THRESHOLDS = {
  // 晋升铜牌 (Star 0 -> 1)
  BRONZE: {
    totalSales: 2000000,    // 累计销售额 >= 20,000元
    directCount: 30         // 或直推有效人数 >= 30人
  },
  // 晋升银牌 (Star 1 -> 2)
  SILVER: {
    monthSales: 5000000,    // 本月销售额 >= 50,000元
    teamCount: 50           // 或团队人数 >= 50人
  },
  // 晋升金牌 (Star 2 -> 3) - 预留
  GOLD: {
    monthSales: 10000000,   // 本月销售额 >= 100,000元
    teamCount: 200          // 或团队人数 >= 200人
  }
};

// 星级名称映射
const STAR_LEVEL_NAMES = {
  0: '普通会员',
  1: '铜牌推广员',
  2: '银牌推广员',
  3: '金牌推广员'
};

// 代理层级名称映射
const AGENT_LEVEL_NAMES = {
  0: '总公司',
  1: '一级代理',
  2: '二级代理',
  3: '三级代理',
  4: '四级代理'
};

// 奖励类型映射
const REWARD_TYPE_NAMES = {
  commission: '基础佣金',
  repurchase: '复购奖励',
  management: '团队管理奖',
  nurture: '育成津贴'
};

// ==================== 工具函数 ====================

/**
 * 生成唯一邀请码
 */
function generateInviteCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
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
 * 检查是否为重复注册（防刷）
 */
async function checkDuplicateRegistration(openid, deviceInfo) {
  try {
    const recentTime = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const ipCount = await db.collection('users')
      .where({
        registerIP: deviceInfo.ip,
        createTime: _.gte(recentTime)
      })
      .count();
    
    if (ipCount.total >= 3) {
      return { valid: false, reason: '操作频繁，请稍后再试' };
    }

    const userExists = await db.collection('users')
      .where({ _openid: openid })
      .count();
    
    if (userExists.total > 0) {
      return { valid: false, reason: '用户已存在' };
    }

    return { valid: true };
  } catch (error) {
    console.error('防刷检查失败:', error);
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
    directCount: 0,
    teamCount: 0
  };
}

/**
 * 检查并重置跨月数据
 */
async function checkAndResetMonthlyPerformance(user) {
  const currentMonthTag = getCurrentMonthTag();
  const performance = user.performance || getDefaultPerformance();
  
  // 如果月份变更，重置月度数据
  if (performance.monthTag !== currentMonthTag) {
    console.log(`月份变更: ${performance.monthTag} -> ${currentMonthTag}，重置月度数据`);
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
 * 检查星级晋升条件
 */
async function checkStarLevelPromotion(openid) {
  try {
    // 获取用户信息
    const userRes = await db.collection('users')
      .where({ _openid: openid })
      .get();
    
    if (userRes.data.length === 0) {
      return { promoted: false, reason: '用户不存在' };
    }

    const user = userRes.data[0];
    const currentStarLevel = user.starLevel || 0;
    
    // 已是最高等级
    if (currentStarLevel >= 3) {
      return { promoted: false, reason: '已是最高等级' };
    }

    // 检查并重置跨月数据
    const performance = await checkAndResetMonthlyPerformance(user);

    let newStarLevel = currentStarLevel;
    let promotionReason = '';

    // 检查晋升条件
    if (currentStarLevel === 0) {
      // 晋升铜牌条件
      if (performance.totalSales >= PROMOTION_THRESHOLDS.BRONZE.totalSales) {
        newStarLevel = 1;
        promotionReason = `累计销售额达到${PROMOTION_THRESHOLDS.BRONZE.totalSales / 100}元`;
      } else if (performance.directCount >= PROMOTION_THRESHOLDS.BRONZE.directCount) {
        newStarLevel = 1;
        promotionReason = `直推人数达到${PROMOTION_THRESHOLDS.BRONZE.directCount}人`;
      }
    } else if (currentStarLevel === 1) {
      // 晋升银牌条件
      if (performance.monthSales >= PROMOTION_THRESHOLDS.SILVER.monthSales) {
        newStarLevel = 2;
        promotionReason = `本月销售额达到${PROMOTION_THRESHOLDS.SILVER.monthSales / 100}元`;
      } else if (performance.teamCount >= PROMOTION_THRESHOLDS.SILVER.teamCount) {
        newStarLevel = 2;
        promotionReason = `团队人数达到${PROMOTION_THRESHOLDS.SILVER.teamCount}人`;
      }
    } else if (currentStarLevel === 2) {
      // 晋升金牌条件
      if (performance.monthSales >= PROMOTION_THRESHOLDS.GOLD.monthSales) {
        newStarLevel = 3;
        promotionReason = `本月销售额达到${PROMOTION_THRESHOLDS.GOLD.monthSales / 100}元`;
      } else if (performance.teamCount >= PROMOTION_THRESHOLDS.GOLD.teamCount) {
        newStarLevel = 3;
        promotionReason = `团队人数达到${PROMOTION_THRESHOLDS.GOLD.teamCount}人`;
      }
    }

    // 执行晋升
    if (newStarLevel > currentStarLevel) {
      await db.collection('users')
        .where({ _openid: openid })
        .update({
          data: {
            starLevel: newStarLevel,
            updateTime: db.serverDate()
          }
        });

      console.log(`用户 ${openid} 晋升成功: ${currentStarLevel} -> ${newStarLevel}，原因: ${promotionReason}`);

      return {
        promoted: true,
        oldLevel: currentStarLevel,
        newLevel: newStarLevel,
        reason: promotionReason
      };
    }

    return { promoted: false, reason: '未满足晋升条件' };
  } catch (error) {
    console.error('晋升检查失败:', error);
    return { promoted: false, reason: '检查失败' };
  }
}

/**
 * 计算晋升进度
 */
function calculatePromotionProgress(user) {
  const performance = user.performance || getDefaultPerformance();
  const currentLevel = user.starLevel || 0;

  // 已是最高等级
  if (currentLevel >= 3) {
    return {
      currentLevel: 3,
      nextLevel: null,
      salesProgress: { current: 0, target: 0, percent: 100 },
      countProgress: { current: 0, target: 0, percent: 100 }
    };
  }

  // 获取下一级的门槛
  let thresholds;
  if (currentLevel === 0) {
    thresholds = PROMOTION_THRESHOLDS.BRONZE;
  } else if (currentLevel === 1) {
    thresholds = PROMOTION_THRESHOLDS.SILVER;
  } else {
    thresholds = PROMOTION_THRESHOLDS.GOLD;
  }

  // 计算金额进度
  const salesCurrent = currentLevel === 0 ? performance.totalSales : performance.monthSales;
  const salesTarget = currentLevel === 0 ? thresholds.totalSales : thresholds.monthSales;
  const salesPercent = Math.min(100, Math.floor((salesCurrent / salesTarget) * 100));

  // 计算人数进度
  const countCurrent = currentLevel === 0 ? performance.directCount : performance.teamCount;
  const countTarget = currentLevel === 0 ? thresholds.directCount : thresholds.teamCount;
  const countPercent = Math.min(100, Math.floor((countCurrent / countTarget) * 100));

  return {
    currentLevel,
    nextLevel: currentLevel + 1,
    salesProgress: {
      current: salesCurrent,
      target: salesTarget,
      percent: salesPercent
    },
    countProgress: {
      current: countCurrent,
      target: countTarget,
      percent: countPercent
    }
  };
}

// ==================== 四重分润算法 ====================

/**
 * 计算订单推广奖励（四重分润）
 */
async function calculatePromotionReward(event, context) {
  const { orderId, buyerId, orderAmount, isRepurchase = false } = event;

  try {
    // 获取买家信息
    const buyerRes = await db.collection('users')
      .where({ _openid: buyerId })
      .get();
    
    if (buyerRes.data.length === 0) {
      return { code: -1, msg: '买家信息不存在' };
    }

    const buyer = buyerRes.data[0];
    const promotionPath = buyer.promotionPath || '';

    // 如果没有推广路径，直接返回
    if (!promotionPath) {
      return { code: 0, msg: '无推广关系', data: { rewards: [] } };
    }

    // 解析推广路径，获取上级链（从近到远）
    const parentChain = promotionPath.split('/').filter(id => id).reverse();
    
    // 记录推广订单
    await db.collection('promotion_orders').add({
      data: {
        orderId,
        buyerId,
        orderAmount,
        isRepurchase,
        status: 'pending',
        createTime: db.serverDate(),
        settleTime: null
      }
    });

    // 批量获取上级链用户信息
    const usersRes = await db.collection('users')
      .where({ _openid: _.in(parentChain) })
      .get();
    
    const userMap = {};
    usersRes.data.forEach(u => {
      userMap[u._openid] = u;
    });

    const rewards = [];
    const managementRatios = {}; // 记录已分配的管理奖比例

    for (let i = 0; i < Math.min(parentChain.length, MAX_LEVEL); i++) {
      const beneficiaryId = parentChain[i];
      const beneficiary = userMap[beneficiaryId];

      if (!beneficiary) continue;

      const position = i + 1; // 层级位置（1-4）
      const agentLevel = beneficiary.agentLevel || 4; // 默认四级代理
      const starLevel = beneficiary.starLevel || 0;
      const mentorId = beneficiary.mentorId;

      // ========== 1. 基础佣金 ==========
      const commissionRatio = AGENT_COMMISSION_RATIOS[agentLevel] || 0.05;
      const commissionAmount = Math.floor(orderAmount * commissionRatio);

      if (commissionAmount > 0) {
        await createRewardRecord({
          orderId,
          beneficiaryId,
          sourceUserId: buyerId,
          orderAmount,
          ratio: commissionRatio,
          amount: commissionAmount,
          rewardType: 'commission',
          position
        });
        rewards.push({
          beneficiaryId,
          type: 'commission',
          amount: commissionAmount,
          ratio: commissionRatio
        });
      }

      // ========== 2. 复购奖励 ==========
      if (isRepurchase && starLevel >= 1) {
        const repurchaseAmount = Math.floor(orderAmount * REPURCHASE_RATIO);
        
        if (repurchaseAmount > 0) {
          await createRewardRecord({
            orderId,
            beneficiaryId,
            sourceUserId: buyerId,
            orderAmount,
            ratio: REPURCHASE_RATIO,
            amount: repurchaseAmount,
            rewardType: 'repurchase',
            position
          });
          rewards.push({
            beneficiaryId,
            type: 'repurchase',
            amount: repurchaseAmount,
            ratio: REPURCHASE_RATIO
          });
        }
      }

      // ========== 3. 团队管理奖（级差制） ==========
      if (starLevel >= 2) {
        // 计算已分配给下级的管理奖比例
        let alreadyDistributed = 0;
        for (let j = 0; j < i; j++) {
          const prevUserId = parentChain[j];
          if (managementRatios[prevUserId]) {
            alreadyDistributed += managementRatios[prevUserId];
          }
        }

        // 当前用户可获得的管理奖 = 总比例 - 已分配比例
        const availableRatio = Math.max(0, MANAGEMENT_RATIO - alreadyDistributed);
        
        if (availableRatio > 0) {
          const managementAmount = Math.floor(orderAmount * availableRatio);
          
          if (managementAmount > 0) {
            await createRewardRecord({
              orderId,
              beneficiaryId,
              sourceUserId: buyerId,
              orderAmount,
              ratio: availableRatio,
              amount: managementAmount,
              rewardType: 'management',
              position
            });
            rewards.push({
              beneficiaryId,
              type: 'management',
              amount: managementAmount,
              ratio: availableRatio
            });
            managementRatios[beneficiaryId] = availableRatio;
          }
        }
      }

      // ========== 4. 育成津贴 ==========
      if (mentorId && userMap[mentorId]) {
        const nurtureAmount = Math.floor(orderAmount * NURTURE_RATIO);
        
        if (nurtureAmount > 0) {
          await createRewardRecord({
            orderId,
            beneficiaryId: mentorId,
            sourceUserId: buyerId,
            orderAmount,
            ratio: NURTURE_RATIO,
            amount: nurtureAmount,
            rewardType: 'nurture',
            position: 0, // 导师不计入层级
            relatedBeneficiaryId: beneficiaryId // 关联的实际受益人
          });
          rewards.push({
            beneficiaryId: mentorId,
            type: 'nurture',
            amount: nurtureAmount,
            ratio: NURTURE_RATIO,
            relatedBeneficiary: beneficiaryId
          });
        }
      }
    }

    // 更新买家订单计数（用于判断复购）
    await updateBuyerOrderCount(buyerId);

    return {
      code: 0,
      msg: '奖励计算成功',
      data: { rewards }
    };
  } catch (error) {
    console.error('计算奖励失败:', error);
    return { code: -1, msg: '计算失败' };
  }
}

/**
 * 创建奖励记录
 */
async function createRewardRecord({
  orderId,
  beneficiaryId,
  sourceUserId,
  orderAmount,
  ratio,
  amount,
  rewardType,
  position,
  relatedBeneficiaryId
}) {
  await db.collection('reward_records').add({
    data: {
      orderId,
      beneficiaryId,
      sourceUserId,
      level: position,
      orderAmount,
      ratio,
      amount,
      rewardType,
      rewardTypeName: REWARD_TYPE_NAMES[rewardType],
      status: 'pending',
      relatedBeneficiaryId,
      createTime: db.serverDate(),
      settleTime: null
    }
  });

  // 更新用户的待结算奖励
  await db.collection('users')
    .where({ _openid: beneficiaryId })
    .update({
      data: {
        pendingReward: _.inc(amount),
        [`${rewardType}Reward`]: _.inc(amount), // 分类奖励统计
        updateTime: db.serverDate()
      }
    });
}

/**
 * 更新买家订单计数
 */
async function updateBuyerOrderCount(buyerId) {
  try {
    // 统计买家历史订单数
    const orderCount = await db.collection('orders')
      .where({
        _openid: buyerId,
        status: _.in(['paid', 'shipping', 'completed'])
      })
      .count();

    // 更新用户表中的订单计数
    await db.collection('users')
      .where({ _openid: buyerId })
      .update({
        data: {
          orderCount: orderCount.total,
          updateTime: db.serverDate()
        }
      });
  } catch (error) {
    console.error('更新买家订单计数失败:', error);
  }
}

// ==================== 核心业务函数 ====================

/**
 * 绑定推广关系
 */
async function bindPromotionRelation(event, context) {
  const OPENID = event.OPENID || cloud.getWXContext().OPENID;
  const { parentInviteCode, mentorCode, userInfo, deviceInfo } = event;

  try {
    // 防刷检查
    const checkResult = await checkDuplicateRegistration(OPENID, deviceInfo);
    if (!checkResult.valid) {
      return { code: -1, msg: checkResult.reason };
    }

    // 查找上级用户
    let parentId = null;
    let parentAgentLevel = 4;
    let parentPath = '';

    if (parentInviteCode) {
      const parentRes = await db.collection('users')
        .where({ inviteCode: parentInviteCode })
        .get();
      
      if (parentRes.data.length === 0) {
        return { code: -1, msg: '邀请码无效' };
      }

      const parent = parentRes.data[0];
      parentId = parent._openid;
      parentAgentLevel = parent.agentLevel || 4;
      parentPath = parent.promotionPath || '';

      // 不能绑定自己
      if (parentId === OPENID) {
        return { code: -1, msg: '不能绑定自己' };
      }
    }

    // 查找导师（可选）
    let mentorId = null;
    if (mentorCode) {
      const mentorRes = await db.collection('users')
        .where({ inviteCode: mentorCode })
        .get();
      
      if (mentorRes.data.length > 0) {
        const mentor = mentorRes.data[0];
        // 导师不能是自己
        if (mentor._openid !== OPENID) {
          mentorId = mentor._openid;
        }
      }
    }

    // 生成邀请码
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

    // 计算当前用户的代理层级
    // 子代理的层级 = 父代理层级 + 1，最大为4
    const currentAgentLevel = parentId ? Math.min(4, parentAgentLevel + 1) : 4;
    const currentPath = parentPath ? `${parentPath}/${parentId}` : (parentId || '');

    // 创建用户记录
    const userData = {
      _openid: OPENID,
      ...userInfo,
      inviteCode,
      parentId,
      promotionPath: currentPath,
      // === 双轨制身份 ===
      starLevel: 0,
      agentLevel: currentAgentLevel,
      performance: getDefaultPerformance(),
      mentorId,
      // === 奖励统计 ===
      totalReward: 0,
      pendingReward: 0,
      commissionReward: 0,
      repurchaseReward: 0,
      managementReward: 0,
      nurtureReward: 0,
      // === 其他 ===
      registerIP: deviceInfo.ip,
      orderCount: 0,
      isSuspicious: false,
      createTime: db.serverDate(),
      updateTime: db.serverDate()
    };

    await db.collection('users').add({ data: userData });

    // 更新上级的团队数量和直推人数
    if (parentId) {
      await db.collection('users')
        .where({ _openid: parentId })
        .update({
          data: {
            'performance.directCount': _.inc(1),
            'performance.teamCount': _.inc(1),
            teamCount: _.inc(1),
            updateTime: db.serverDate()
          }
        });

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
        starLevel: 0,
        agentLevel: currentAgentLevel,
        mentorId
      }
    };
  } catch (error) {
    console.error('绑定推广关系失败:', error);
    return { code: -1, msg: '绑定失败，请重试' };
  }
}

/**
 * 获取推广信息
 */
async function getPromotionInfo(event, context) {
  const OPENID = event.OPENID || cloud.getWXContext().OPENID;

  try {
    const userRes = await db.collection('users')
      .where({ _openid: OPENID })
      .get();
    
    if (userRes.data.length === 0) {
      return { code: -1, msg: '用户不存在' };
    }

    const user = userRes.data[0];

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

    return {
      code: 0,
      msg: '获取成功',
      data: {
        inviteCode: user.inviteCode,
        // === 双轨制身份 ===
        starLevel: user.starLevel || 0,
        agentLevel: user.agentLevel || 4,
        starLevelName: STAR_LEVEL_NAMES[user.starLevel || 0],
        agentLevelName: AGENT_LEVEL_NAMES[user.agentLevel || 4],
        // === 奖励统计 ===
        totalReward: user.totalReward || 0,
        pendingReward: user.pendingReward || 0,
        todayReward,
        monthReward,
        // === 分类奖励 ===
        commissionReward: user.commissionReward || 0,
        repurchaseReward: user.repurchaseReward || 0,
        managementReward: user.managementReward || 0,
        nurtureReward: user.nurtureReward || 0,
        // === 业绩数据 ===
        performance,
        // === 晋升进度 ===
        promotionProgress,
        // === 团队统计 ===
        teamStats
      }
    };
  } catch (error) {
    console.error('获取推广信息失败:', error);
    return { code: -1, msg: '获取失败' };
  }
}

/**
 * 获取团队统计
 */
async function getTeamStats(userId) {
  const stats = {
    total: 0,
    level1: 0,
    level2: 0,
    level3: 0,
    level4: 0
  };

  try {
    // 获取直接团队成员（一级）
    const level1Res = await db.collection('users')
      .where({ parentId: userId })
      .count();
    stats.level1 = level1Res.total;

    // 获取二级团队成员
    const level1Users = await db.collection('users')
      .where({ parentId: userId })
      .get();
    
    if (level1Users.data.length > 0) {
      const level1Ids = level1Users.data.map(u => u._openid);
      const level2Res = await db.collection('users')
        .where({ parentId: _.in(level1Ids) })
        .count();
      stats.level2 = level2Res.total;

      // 获取三级
      const level2Users = await db.collection('users')
        .where({ parentId: _.in(level1Ids) })
        .get();
      
      if (level2Users.data.length > 0) {
        const level2Ids = level2Users.data.map(u => u._openid);
        const level3Res = await db.collection('users')
          .where({ parentId: _.in(level2Ids) })
          .count();
        stats.level3 = level3Res.total;

        // 获取四级
        const level3Users = await db.collection('users')
          .where({ parentId: _.in(level2Ids) })
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

    stats.total = stats.level1 + stats.level2 + stats.level3 + stats.level4;
    return stats;
  } catch (error) {
    console.error('获取团队统计失败:', error);
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

    const members = membersRes.data.map(m => ({
      id: m._openid,
      nickName: m.nickName,
      avatarUrl: m.avatarUrl,
      createTime: m.createTime,
      starLevel: m.starLevel || 0,
      agentLevel: m.agentLevel || 4,
      starLevelName: STAR_LEVEL_NAMES[m.starLevel || 0],
      agentLevelName: AGENT_LEVEL_NAMES[m.agentLevel || 4],
      performance: m.performance || getDefaultPerformance()
    }));

    return {
      code: 0,
      msg: '获取成功',
      data: { members }
    };
  } catch (error) {
    console.error('获取团队成员失败:', error);
    return { code: -1, msg: '获取失败' };
  }
}

/**
 * 获取奖励明细
 */
async function getRewardRecords(event, context) {
  const OPENID = event.OPENID || cloud.getWXContext().OPENID;
  const { status, rewardType, page = 1, limit = 20 } = event;

  try {
    let query = { beneficiaryId: OPENID };
    
    if (status) {
      query.status = status;
    }
    
    if (rewardType) {
      query.rewardType = rewardType;
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
      rewardTypeName: r.rewardTypeName || REWARD_TYPE_NAMES[r.rewardType] || '基础佣金',
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
  } catch (error) {
    console.error('获取奖励明细失败:', error);
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
  } catch (error) {
    console.error('生成二维码失败:', error);
    return { code: -1, msg: '生成失败' };
  }
}

/**
 * 更新业绩并检查晋升
 */
async function updatePerformanceAndCheckPromotion(event, context) {
  const { userId, orderAmount } = event;

  try {
    // 获取用户信息
    const userRes = await db.collection('users')
      .where({ _openid: userId })
      .get();
    
    if (userRes.data.length === 0) {
      return { code: -1, msg: '用户不存在' };
    }

    const user = userRes.data[0];
    const currentMonthTag = getCurrentMonthTag();
    const performance = user.performance || getDefaultPerformance();

    // 准备更新数据
    const updateData = {
      'performance.totalSales': _.inc(orderAmount),
      updateTime: db.serverDate()
    };

    // 如果月份相同，累加月度销售额
    if (performance.monthTag === currentMonthTag) {
      updateData['performance.monthSales'] = _.inc(orderAmount);
    } else {
      // 月份变更，重置月度销售额
      updateData['performance.monthSales'] = orderAmount;
      updateData['performance.monthTag'] = currentMonthTag;
    }

    // 更新业绩
    await db.collection('users')
      .where({ _openid: userId })
      .update({ data: updateData });

    // 检查晋升
    const promotionResult = await checkStarLevelPromotion(userId);

    return {
      code: 0,
      msg: '更新成功',
      data: {
        promotion: promotionResult
      }
    };
  } catch (error) {
    console.error('更新业绩失败:', error);
    return { code: -1, msg: '更新失败' };
  }
}

/**
 * 主入口函数
 */
exports.main = async (event, context) => {
  console.log('Promotion raw event:', JSON.stringify(event));
  
  const requestData = parseEvent(event);
  console.log('Promotion parsed data:', JSON.stringify(requestData));
  
  const { action } = requestData;
  const OPENID = requestData._token || cloud.getWXContext().OPENID;
  
  console.log('Promotion openid:', OPENID, 'action:', action);

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
      return await checkStarLevelPromotion(OPENID);
    case 'updatePerformance':
      return await updatePerformanceAndCheckPromotion(requestData, context);
    default:
      return { code: -1, msg: '未知操作' };
  }
};
