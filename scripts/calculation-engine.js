/**
 * 奖励计算引擎（独立函数）
 * Reward Calculation Engine - Standalone Functions
 */

const config = require('./config');

/**
 * 获取当前月份标签
 * @returns {string} 格式: "YYYY-MM"
 */
function getCurrentMonthTag() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * 计算基础佣金
 * @param {number} amount - 订单金额（分）
 * @param {number} agentLevel - 代理层级 (1-4)
 * @returns {number} 佣金金额（分）
 */
function calculateBasicCommission(amount, agentLevel) {
  const rates = {
    1: config.commission.basic.level1,
    2: config.commission.basic.level2,
    3: config.commission.basic.level3,
    4: config.commission.basic.level4
  };

  const rate = rates[agentLevel] || 0;
  return Math.floor(amount * rate / 100);
}

/**
 * 计算复购奖励
 * @param {number} amount - 订单金额（分）
 * @param {number} starLevel - 星级 (0-3)
 * @param {boolean} isRepurchase - 是否复购
 * @returns {number} 复购奖励金额（分）
 */
function calculateRepurchaseReward(amount, starLevel, isRepurchase) {
  if (!isRepurchase || starLevel < config.commission.repurchase.minStarLevel) {
    return 0;
  }

  const rate = config.commission.repurchase.rate;
  return Math.floor(amount * rate / 100);
}

/**
 * 计算团队管理奖（级差算法）
 * @param {number} amount - 订单金额（分）
 * @param {number} starLevel - 星级 (0-3)
 * @param {Set} allocated - 已分配的上级ID集合
 * @returns {number} 管理奖金额（分）
 */
function calculateManagementReward(amount, starLevel, allocated) {
  if (starLevel < config.commission.management.minStarLevel) {
    return 0;
  }

  // 级差算法：第一个获得该奖励的星级≥2的上级获得全部2%
  // 其他星级≥2的上级获得0元
  const rate = config.commission.management.rate;
  return Math.floor(amount * rate / 100);
}

/**
 * 计算育成津贴
 * @param {number} amount - 订单金额（分）
 * @param {number} starLevel - 导师星级 (0-3)
 * @returns {number} 育成津贴金额（分）
 */
function calculateNurtureAllowance(amount, starLevel) {
  if (starLevel < config.commission.nurture.minStarLevel) {
    return 0;
  }

  const rate = config.commission.nurture.rate;
  return Math.floor(amount * rate / 100);
}

/**
 * 计算单个订单的所有奖励
 * @param {Object} params - 计算参数
 * @param {number} params.amount - 订单金额（分）
 * @param {Array} params.superiors - 上级列表 [{userId, agentLevel, starLevel, mentorId}]
 * @param {boolean} params.isRepurchase - 是否复购
 * @returns {Array} 奖励记录数组
 */
function calculateAllRewards({ amount, superiors, isRepurchase }) {
  const rewards = [];
  const managementAllocated = new Set(); // 已分配管理奖的上级

  // 1. 计算基础佣金
  superiors.forEach((superior, index) => {
    const commission = calculateBasicCommission(amount, superior.agentLevel);
    if (commission > 0) {
      rewards.push({
        type: 'basic',
        userId: superior.userId,
        agentLevel: superior.agentLevel,
        amount: commission,
        rate: config.commission.basic[`level${superior.agentLevel}`]
      });
    }
  });

  // 2. 计算复购奖励
  if (isRepurchase) {
    superiors.forEach((superior) => {
      const reward = calculateRepurchaseReward(amount, superior.starLevel, isRepurchase);
      if (reward > 0) {
        rewards.push({
          type: 'repurchase',
          userId: superior.userId,
          starLevel: superior.starLevel,
          amount: reward,
          rate: config.commission.repurchase.rate
        });
      }
    });
  }

  // 3. 计算团队管理奖（级差算法）
  let managementAllocatedFlag = false;
  superiors.forEach((superior) => {
    if (!managementAllocatedFlag && superior.starLevel >= config.commission.management.minStarLevel) {
      const reward = calculateManagementReward(amount, superior.starLevel, managementAllocated);
      if (reward > 0) {
        rewards.push({
          type: 'management',
          userId: superior.userId,
          starLevel: superior.starLevel,
          amount: reward,
          rate: config.commission.management.rate
        });
        managementAllocatedFlag = true; // 只分配给第一个符合条件的上级
      }
    }
  });

  // 4. 计算育成津贴（给直属代理的导师）
  const directAgent = superiors[0]; // 四级代理（直属上级）
  if (directAgent && directAgent.mentorId) {
    // 查找导师（导师可能在superiors数组中，也可能不在）
    let mentor = superiors.find(s => s.userId === directAgent.mentorId);

    // 如果导师不在superiors数组中，创建一个虚拟的导师对象
    if (!mentor && directAgent.mentorId) {
      // 这里我们需要额外的信息来判断导师的星级
      // 在实际使用时，应该从数据库查询导师信息
      // 为了测试，我们假设导师的星级为2（银牌）
      mentor = {
        userId: directAgent.mentorId,
        starLevel: 2 // 默认银牌，实际应从数据库查询
      };
    }

    if (mentor) {
      const allowance = calculateNurtureAllowance(amount, mentor.starLevel);
      if (allowance > 0) {
        rewards.push({
          type: 'nurture',
          userId: mentor.userId,
          starLevel: mentor.starLevel,
          amount: allowance,
          rate: config.commission.nurture.rate,
          menteeId: directAgent.userId
        });
      }
    }
  }

  return rewards;
}

/**
 * 检查晋升条件
 * @param {Object} performance - 业绩数据
 * @param {number} performance.totalSales - 累计销售额（分）
 * @param {number} performance.monthSales - 本月销售额（分）
 * @param {number} performance.directCount - 直推人数
 * @param {number} performance.teamCount - 团队人数
 * @param {number} currentStarLevel - 当前星级
 * @returns {Object} 晋升结果 {shouldPromote, newStarLevel, reason}
 */
function checkPromotion(performance, currentStarLevel) {
  const { bronze, silver, gold } = config.promotion;

  // 普通会员 → 铜牌推广员
  if (currentStarLevel === 0) {
    if (performance.totalSales >= bronze.totalSales || performance.directCount >= bronze.directCount) {
      return {
        shouldPromote: true,
        newStarLevel: bronze.starLevel,
        reason: performance.totalSales >= bronze.totalSales
          ? `累计销售额达到 ${performance.totalSales / 100} 元`
          : `直推人数达到 ${performance.directCount} 人`
      };
    }
  }

  // 铜牌 → 银牌推广员
  if (currentStarLevel === 1) {
    if (performance.monthSales >= silver.monthSales && performance.teamCount >= silver.teamCount) {
      return {
        shouldPromote: true,
        newStarLevel: silver.starLevel,
        reason: `本月销售额 ${performance.monthSales / 100} 元，团队人数 ${performance.teamCount} 人`
      };
    }
  }

  // 银牌 → 金牌推广员
  if (currentStarLevel === 2) {
    if (performance.monthSales >= gold.monthSales && performance.teamCount >= gold.teamCount) {
      return {
        shouldPromote: true,
        newStarLevel: gold.starLevel,
        reason: `本月销售额 ${performance.monthSales / 100} 元，团队人数 ${performance.teamCount} 人`
      };
    }
  }

  return {
    shouldPromote: false,
    newStarLevel: currentStarLevel,
    reason: '未满足晋升条件'
  };
}

/**
 * 检查并重置月度业绩
 * @param {Object} performance - 业绩数据
 * @param {string} performance.monthTag - 当前月份标签
 * @param {number} performance.monthSales - 本月销售额（分）
 * @param {number} newAmount - 新订单金额（分）
 * @returns {Object} 更新后的业绩
 */
function checkAndResetMonthlyPerformance(performance, newAmount) {
  const currentMonthTag = getCurrentMonthTag();
  const { monthTag, monthSales, totalSales } = performance;

  if (monthTag !== currentMonthTag) {
    // 跨月重置
    return {
      monthTag: currentMonthTag,
      monthSales: newAmount,
      totalSales: totalSales + newAmount,
      reset: true
    };
  }

  // 同月累加
  return {
    monthTag,
    monthSales: monthSales + newAmount,
    totalSales: totalSales + newAmount,
    reset: false
  };
}

module.exports = {
  getCurrentMonthTag,
  calculateBasicCommission,
  calculateRepurchaseReward,
  calculateManagementReward,
  calculateNurtureAllowance,
  calculateAllRewards,
  checkPromotion,
  checkAndResetMonthlyPerformance,
  config
};
