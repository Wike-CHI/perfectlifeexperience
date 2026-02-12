const cloud = require('@cloudbase/node-sdk');

// 初始化云开发环境
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

// 结算周期（天）
const SETTLEMENT_DAYS = 7;

// 奖励类型名称映射
const REWARD_TYPE_NAMES = {
  commission: '基础佣金',
  repurchase: '复购奖励',
  management: '团队管理奖',
  nurture: '育成津贴'
};

// 星级名称映射
const STAR_LEVEL_NAMES = {
  0: '普通会员',
  1: '铜牌推广员',
  2: '银牌推广员',
  3: '金牌推广员'
};

// 晋升门槛配置
const PROMOTION_THRESHOLDS = {
  BRONZE: { totalSales: 2000000, directCount: 30 },
  SILVER: { monthSales: 5000000, teamCount: 50 },
  GOLD: { monthSales: 10000000, teamCount: 200 }
};

/**
 * 获取当前月份标识
 */
function getCurrentMonthTag() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * 获取默认业绩对象
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
 * 执行奖励结算
 * 定时触发：每天凌晨2点执行
 */
async function settlementRewards(event, context) {
  console.log('开始执行奖励结算任务', new Date());

  try {
    const settleDeadline = new Date();
    settleDeadline.setDate(settleDeadline.getDate() - SETTLEMENT_DAYS);

    const pendingOrdersRes = await db.collection('promotion_orders')
      .where({
        status: 'pending',
        createTime: _.lte(settleDeadline)
      })
      .limit(100)
      .get();

    console.log(`找到 ${pendingOrdersRes.data.length} 个待结算订单`);

    let settledCount = 0;
    let failedCount = 0;

    for (const order of pendingOrdersRes.data) {
      try {
        const orderValid = await checkOrderValid(order.orderId);
        
        if (!orderValid) {
          await db.collection('promotion_orders')
            .doc(order._id)
            .update({
              data: {
                status: 'invalid',
                updateTime: db.serverDate()
              }
            });
          await cancelRewards(order.orderId);
          continue;
        }

        await settleOrderRewards(order);
        settledCount++;
      } catch (error) {
        console.error(`结算订单 ${order.orderId} 失败:`, error);
        failedCount++;
      }
    }

    console.log(`结算完成：成功 ${settledCount} 个，失败 ${failedCount} 个`);

    await cleanAbnormalData();

    return {
      code: 0,
      msg: '结算完成',
      data: { settledCount, failedCount }
    };
  } catch (error) {
    console.error('结算任务执行失败:', error);
    return { code: -1, msg: '结算失败' };
  }
}

/**
 * 检查订单是否有效
 */
async function checkOrderValid(orderId) {
  try {
    const orderRes = await db.collection('orders')
      .where({ orderNo: orderId })
      .get();
    
    if (orderRes.data.length === 0) return false;

    const order = orderRes.data[0];
    return order.status === 'completed' && !order.refundAmount;
  } catch (error) {
    console.error('检查订单状态失败:', error);
    return false;
  }
}

/**
 * 结算单个订单的奖励
 */
async function settleOrderRewards(promotionOrder) {
  const transaction = await db.startTransaction();

  try {
    const rewardsRes = await transaction.collection('reward_records')
      .where({
        orderId: promotionOrder.orderId,
        status: 'pending'
      })
      .get();

    // 收集所有受益人ID，用于后续晋升检查
    const beneficiaryIds = new Set();

    for (const reward of rewardsRes.data) {
      beneficiaryIds.add(reward.beneficiaryId);

      await transaction.collection('reward_records')
        .doc(reward._id)
        .update({
          data: {
            status: 'settled',
            settleTime: db.serverDate()
          }
        });

      // 获取奖励类型名称
      const rewardTypeName = reward.rewardTypeName || REWARD_TYPE_NAMES[reward.rewardType] || '推广奖励';

      await transaction.collection('users')
        .where({ _openid: reward.beneficiaryId })
        .update({
          data: {
            pendingReward: _.inc(-reward.amount),
            totalReward: _.inc(reward.amount),
            updateTime: db.serverDate()
          }
        });

      await transaction.collection('wallet_transactions').add({
        data: {
          _openid: reward.beneficiaryId,
          type: 'reward',
          amount: reward.amount,
          title: `${rewardTypeName}`,
          description: `订单 ${promotionOrder.orderId} 的${rewardTypeName}`,
          orderId: promotionOrder.orderId,
          status: 'success',
          createTime: db.serverDate()
        }
      });
    }

    await transaction.collection('promotion_orders')
      .doc(promotionOrder._id)
      .update({
        data: {
          status: 'settled',
          settleTime: db.serverDate(),
          updateTime: db.serverDate()
        }
      });

    await transaction.commit();
    console.log(`订单 ${promotionOrder.orderId} 结算成功`);

    // === 结算后触发晋升检查 ===
    for (const beneficiaryId of beneficiaryIds) {
      await updatePerformanceAndCheckPromotion(beneficiaryId, promotionOrder.orderAmount);
    }
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

/**
 * 更新业绩并检查晋升
 */
async function updatePerformanceAndCheckPromotion(userId, orderAmount) {
  try {
    const userRes = await db.collection('users')
      .where({ _openid: userId })
      .get();
    
    if (userRes.data.length === 0) return;

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
    await checkStarLevelPromotion(userId);
  } catch (error) {
    console.error('更新业绩并检查晋升失败:', error);
  }
}

/**
 * 检查星级晋升条件
 */
async function checkStarLevelPromotion(openid) {
  try {
    const userRes = await db.collection('users')
      .where({ _openid: openid })
      .get();
    
    if (userRes.data.length === 0) return { promoted: false };

    const user = userRes.data[0];
    const currentStarLevel = user.starLevel || 0;
    
    if (currentStarLevel >= 3) return { promoted: false };

    const currentMonthTag = getCurrentMonthTag();
    const performance = user.performance || getDefaultPerformance();

    // 如果月份变更，需要重置
    if (performance.monthTag !== currentMonthTag) {
      await db.collection('users')
        .where({ _openid: openid })
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

    let newStarLevel = currentStarLevel;
    let promotionReason = '';

    // 检查晋升条件
    if (currentStarLevel === 0) {
      if (performance.totalSales >= PROMOTION_THRESHOLDS.BRONZE.totalSales) {
        newStarLevel = 1;
        promotionReason = `累计销售额达到${PROMOTION_THRESHOLDS.BRONZE.totalSales / 100}元`;
      } else if (performance.directCount >= PROMOTION_THRESHOLDS.BRONZE.directCount) {
        newStarLevel = 1;
        promotionReason = `直推人数达到${PROMOTION_THRESHOLDS.BRONZE.directCount}人`;
      }
    } else if (currentStarLevel === 1) {
      if (performance.monthSales >= PROMOTION_THRESHOLDS.SILVER.monthSales) {
        newStarLevel = 2;
        promotionReason = `本月销售额达到${PROMOTION_THRESHOLDS.SILVER.monthSales / 100}元`;
      } else if (performance.teamCount >= PROMOTION_THRESHOLDS.SILVER.teamCount) {
        newStarLevel = 2;
        promotionReason = `团队人数达到${PROMOTION_THRESHOLDS.SILVER.teamCount}人`;
      }
    } else if (currentStarLevel === 2) {
      if (performance.monthSales >= PROMOTION_THRESHOLDS.GOLD.monthSales) {
        newStarLevel = 3;
        promotionReason = `本月销售额达到${PROMOTION_THRESHOLDS.GOLD.monthSales / 100}元`;
      } else if (performance.teamCount >= PROMOTION_THRESHOLDS.GOLD.teamCount) {
        newStarLevel = 3;
        promotionReason = `团队人数达到${PROMOTION_THRESHOLDS.GOLD.teamCount}人`;
      }
    }

    if (newStarLevel > currentStarLevel) {
      await db.collection('users')
        .where({ _openid: openid })
        .update({
          data: {
            starLevel: newStarLevel,
            updateTime: db.serverDate()
          }
        });

      console.log(`🎉 用户 ${openid} 晋升成功: ${STAR_LEVEL_NAMES[currentStarLevel]} -> ${STAR_LEVEL_NAMES[newStarLevel]}，原因: ${promotionReason}`);

      // 可选：发送晋升通知
      await sendPromotionNotification(openid, currentStarLevel, newStarLevel, promotionReason);

      return { promoted: true, oldLevel: currentStarLevel, newLevel: newStarLevel, reason: promotionReason };
    }

    return { promoted: false };
  } catch (error) {
    console.error('晋升检查失败:', error);
    return { promoted: false };
  }
}

/**
 * 发送晋升通知（可选实现）
 */
async function sendPromotionNotification(openid, oldLevel, newLevel, reason) {
  try {
    // 这里可以调用微信订阅消息或站内通知
    console.log(`发送晋升通知给用户 ${openid}: ${STAR_LEVEL_NAMES[oldLevel]} -> ${STAR_LEVEL_NAMES[newLevel]}`);
  } catch (error) {
    console.error('发送晋升通知失败:', error);
  }
}

/**
 * 取消订单奖励（退款时）
 */
async function cancelRewards(orderId) {
  try {
    const rewardsRes = await db.collection('reward_records')
      .where({ orderId })
      .get();

    for (const reward of rewardsRes.data) {
      if (reward.status === 'pending') {
        await db.collection('reward_records')
          .doc(reward._id)
          .update({
            data: {
              status: 'cancelled',
              updateTime: db.serverDate()
            }
          });
      } else if (reward.status === 'settled') {
        await db.collection('users')
          .where({ _openid: reward.beneficiaryId })
          .update({
            data: {
              totalReward: _.inc(-reward.amount),
              updateTime: db.serverDate()
            }
          });

        const rewardTypeName = reward.rewardTypeName || REWARD_TYPE_NAMES[reward.rewardType] || '推广奖励';

        await db.collection('wallet_transactions').add({
          data: {
            _openid: reward.beneficiaryId,
            type: 'reward_deduct',
            amount: -reward.amount,
            title: '奖励扣回',
            description: `订单 ${orderId} 退款，扣回${rewardTypeName}`,
            orderId,
            status: 'success',
            createTime: db.serverDate()
          }
        });

        await db.collection('reward_records')
          .doc(reward._id)
          .update({
            data: {
              status: 'deducted',
              updateTime: db.serverDate()
            }
          });
      }
    }
  } catch (error) {
    console.error('取消奖励失败:', error);
  }
}

/**
 * 清理异常数据（防刷机制）
 */
async function cleanAbnormalData() {
  console.log('开始清理异常数据');

  try {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const recentUsersRes = await db.collection('users')
      .where({ createTime: _.gte(oneDayAgo) })
      .get();

    const ipGroups = {};
    recentUsersRes.data.forEach(user => {
      const ip = user.registerIP || 'unknown';
      if (!ipGroups[ip]) ipGroups[ip] = [];
      ipGroups[ip].push(user);
    });

    for (const [ip, users] of Object.entries(ipGroups)) {
      if (users.length > 5 && ip !== 'unknown') {
        console.log(`IP ${ip} 异常注册：${users.length} 个账号`);
        for (const user of users) {
          await db.collection('users')
            .doc(user._id)
            .update({
              data: {
                isSuspicious: true,
                suspiciousReason: '同一IP大量注册',
                updateTime: db.serverDate()
              }
            });
        }
      }
    }

    const recentRewardsRes = await db.collection('reward_records')
      .where({
        createTime: _.gte(oneDayAgo),
        status: 'pending'
      })
      .get();

    for (const reward of recentRewardsRes.data) {
      if (reward.beneficiaryId === reward.sourceUserId) {
        console.log(`检测到自购行为：用户 ${reward.beneficiaryId}`);
        await db.collection('reward_records')
          .doc(reward._id)
          .update({
            data: {
              status: 'cancelled',
              cancelReason: '自购行为',
              updateTime: db.serverDate()
            }
          });

        await db.collection('users')
          .where({ _openid: reward.beneficiaryId })
          .update({
            data: {
              isSuspicious: true,
              suspiciousReason: '自购刷单',
              updateTime: db.serverDate()
            }
          });
      }
    }

    const abnormalOrdersRes = await db.collection('promotion_orders')
      .where({
        status: 'pending',
        orderAmount: _.lt(1000)
      })
      .get();

    for (const order of abnormalOrdersRes.data) {
      console.log(`检测到异常订单：${order.orderId}，金额：${order.orderAmount}`);
      await db.collection('promotion_orders')
        .doc(order._id)
        .update({
          data: {
            needReview: true,
            updateTime: db.serverDate()
          }
        });
    }

    console.log('异常数据清理完成');
  } catch (error) {
    console.error('清理异常数据失败:', error);
  }
}

/**
 * 手动触发结算（管理员接口）
 */
async function manualSettlement(event, context) {
  const { orderId } = event;

  try {
    if (orderId) {
      const orderRes = await db.collection('promotion_orders')
        .where({ orderId })
        .get();
      
      if (orderRes.data.length === 0) {
        return { code: -1, msg: '订单不存在' };
      }

      await settleOrderRewards(orderRes.data[0]);
      return { code: 0, msg: '结算成功' };
    } else {
      return await settlementRewards(event, context);
    }
  } catch (error) {
    console.error('手动结算失败:', error);
    return { code: -1, msg: '结算失败' };
  }
}

/**
 * 获取结算统计
 */
async function getSettlementStats(event, context) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayRes = await db.collection('reward_records')
      .where({ status: 'settled', settleTime: _.gte(today) })
      .get();
    
    const todayAmount = todayRes.data.reduce((sum, r) => sum + r.amount, 0);

    const pendingRes = await db.collection('reward_records')
      .where({ status: 'pending' })
      .get();
    
    const pendingAmount = pendingRes.data.reduce((sum, r) => sum + r.amount, 0);

    const totalRes = await db.collection('reward_records')
      .where({ status: 'settled' })
      .get();
    
    const totalAmount = totalRes.data.reduce((sum, r) => sum + r.amount, 0);

    return {
      code: 0,
      msg: '获取成功',
      data: {
        todayAmount,
        pendingAmount,
        totalAmount,
        todayCount: todayRes.data.length,
        pendingCount: pendingRes.data.length,
        totalCount: totalRes.data.length
      }
    };
  } catch (error) {
    console.error('获取统计失败:', error);
    return { code: -1, msg: '获取失败' };
  }
}

/**
 * 主入口函数
 */
exports.main = async (event, context) => {
  const { action } = event;

  // 定时触发器调用
  if (!action) {
    return await settlementRewards(event, context);
  }

  switch (action) {
    case 'manualSettlement':
      return await manualSettlement(event, context);
    case 'getStats':
      return await getSettlementStats(event, context);
    case 'settlement':
      return await settlementRewards(event, context);
    default:
      return { code: -1, msg: '未知操作' };
  }
};
