const cloud = require('@cloudbase/node-sdk');

// 初始化云开发环境
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

// 引入共享工具函数
const { getDefaultPerformance, getCurrentMonthTag } = require('../common/utils');

// 结算周期（天）
const SETTLEMENT_DAYS = 7;

// 奖励类型名称映射（仅推广佣金）
const REWARD_TYPE_NAMES = {
  commission: '推广佣金'
};

// 代理等级名称映射
const AGENT_LEVEL_NAMES = {
  1: '金牌推广员',
  2: '银牌推广员',
  3: '铜牌推广员',
  4: '普通会员'
};

// 晋升门槛配置（无直推人数要求）
const PROMOTION_THRESHOLDS = {
  BRONZE: { totalSales: 100000 },              // 累计销售额 >= 1,000元
  SILVER: { monthSales: 500000, teamCount: 30 }, // 月销售额 >= 5,000元 或 团队 >= 30人
  GOLD: { monthSales: 2000000, teamCount: 100 }  // 月销售额 >= 20,000元 或 团队 >= 100人
};

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

    // 批量获取佣金钱包信息
    const commissionWalletRes = await transaction.collection('commission_wallets')
      .where({ _openid: _.in([...new Set(rewardsRes.data.map(r => r.beneficiaryId))]) })
      .get();

    const walletMap = {};
    commissionWalletRes.data.forEach(w => {
      walletMap[w._openid] = w;
    });

    for (const reward of rewardsRes.data) {
      beneficiaryIds.add(reward.beneficiaryId);

      // 获取奖励类型名称
      const rewardTypeName = reward.rewardTypeName || REWARD_TYPE_NAMES[reward.rewardType] || '推广佣金';

      // 1. 更新奖励记录状态
      await transaction.collection('reward_records')
        .doc(reward._id)
        .update({
          data: {
            status: 'settled',
            settleTime: db.serverDate()
          }
        });

      // 2. 更新用户奖励统计
      await transaction.collection('users')
        .where({ _openid: reward.beneficiaryId })
        .update({
          data: {
            pendingReward: _.inc(-reward.amount),
            totalReward: _.inc(reward.amount),
            updateTime: db.serverDate()
          }
        });

      // 3. 更新或创建佣金钱包余额
      const existingWallet = walletMap[reward.beneficiaryId];
      if (existingWallet) {
        await transaction.collection('commission_wallets')
          .doc(existingWallet._id)
          .update({
            data: {
              balance: _.inc(reward.amount),
              totalCommission: _.inc(reward.amount),
              updateTime: db.serverDate()
            }
          });
      } else {
        await transaction.collection('commission_wallets')
          .add({
            data: {
              _openid: reward.beneficiaryId,
              balance: reward.amount,
              frozenAmount: 0,
              totalCommission: reward.amount,
              totalWithdrawn: 0,
              createTime: db.serverDate(),
              updateTime: db.serverDate()
            }
          });
      }

      // 4. 记录佣金钱包交易流水
      await transaction.collection('commission_transactions').add({
        data: {
          _openid: reward.beneficiaryId,
          type: 'reward_settlement',
          amount: reward.amount,
          title: rewardTypeName,
          description: `订单 ${promotionOrder.orderId} 的${rewardTypeName}`,
          orderId: promotionOrder.orderId,
          rewardId: reward._id,
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
    await checkAgentLevelPromotion(userId);
  } catch (error) {
    console.error('更新业绩并检查晋升失败:', error);
  }
}

/**
 * 检查代理等级晋升条件（简化版，无直推人数要求）
 */
async function checkAgentLevelPromotion(openid) {
  try {
    const userRes = await db.collection('users')
      .where({ _openid: openid })
      .get();

    if (userRes.data.length === 0) return { promoted: false };

    const user = userRes.data[0];
    const currentLevel = user.agentLevel || 4;

    // 已是最高等级（金牌），无需晋升
    if (currentLevel <= 1) return { promoted: false };

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

    let newLevel = currentLevel;
    let promotionReason = '';

    // 检查晋升条件（只看销售额和团队人数，不看直推人数）
    if (currentLevel === 4) {
      // 四级 → 三级（普通 → 铜牌）
      if (performance.totalSales >= PROMOTION_THRESHOLDS.BRONZE.totalSales) {
        newLevel = 3;
        promotionReason = `累计销售额达到${PROMOTION_THRESHOLDS.BRONZE.totalSales / 100}元`;
      }
    } else if (currentLevel === 3) {
      // 三级 → 二级（铜牌 → 银牌）
      if (performance.monthSales >= PROMOTION_THRESHOLDS.SILVER.monthSales) {
        newLevel = 2;
        promotionReason = `本月销售额达到${PROMOTION_THRESHOLDS.SILVER.monthSales / 100}元`;
      } else if (performance.teamCount >= PROMOTION_THRESHOLDS.SILVER.teamCount) {
        newLevel = 2;
        promotionReason = `团队人数达到${PROMOTION_THRESHOLDS.SILVER.teamCount}人`;
      }
    } else if (currentLevel === 2) {
      // 二级 → 一级（银牌 → 金牌）
      if (performance.monthSales >= PROMOTION_THRESHOLDS.GOLD.monthSales) {
        newLevel = 1;
        promotionReason = `本月销售额达到${PROMOTION_THRESHOLDS.GOLD.monthSales / 100}元`;
      } else if (performance.teamCount >= PROMOTION_THRESHOLDS.GOLD.teamCount) {
        newLevel = 1;
        promotionReason = `团队人数达到${PROMOTION_THRESHOLDS.GOLD.teamCount}人`;
      }
    }

    if (newLevel < currentLevel) {
      await db.collection('users')
        .where({ _openid: openid })
        .update({
          data: {
            agentLevel: newLevel,
            updateTime: db.serverDate()
          }
        });

      console.log(`🎉 用户 ${openid} 晋升成功: ${AGENT_LEVEL_NAMES[currentLevel]} -> ${AGENT_LEVEL_NAMES[newLevel]}，原因: ${promotionReason}`);

      // 发送晋升通知
      await sendPromotionNotification(openid, currentLevel, newLevel, promotionReason);

      return { promoted: true, oldLevel: currentLevel, newLevel: newLevel, reason: promotionReason };
    }

    return { promoted: false };
  } catch (error) {
    console.error('晋升检查失败:', error);
    return { promoted: false };
  }
}

/**
 * 发送晋升通知
 */
async function sendPromotionNotification(openid, oldLevel, newLevel, reason) {
  try {
    console.log(`发送晋升通知给用户 ${openid}: ${AGENT_LEVEL_NAMES[oldLevel]} -> ${AGENT_LEVEL_NAMES[newLevel]}`);
  } catch (error) {
    console.error('发送晋升通知失败:', error);
  }
}

/**
 * 取消订单奖励（退款时）- 支持部分退款按比例扣回
 */
async function cancelRewards(orderId, refundRatio = 1) {
  try {
    console.log(`[取消奖励] 订单: ${orderId}, 扣回比例: ${refundRatio}`);

    const rewardsRes = await db.collection('reward_records')
      .where({ orderId })
      .get();

    let cancelledCount = 0;
    let deductedCount = 0;
    let deductedAmount = 0;

    for (const reward of rewardsRes.data) {
      const rewardTypeName = reward.rewardTypeName || REWARD_TYPE_NAMES[reward.rewardType] || '推广佣金';

      if (reward.status === 'pending') {
        // pending状态的奖励直接取消
        await db.collection('reward_records')
          .doc(reward._id)
          .update({
            data: {
              status: 'cancelled',
              cancelReason: `订单退款（扣回比例: ${(refundRatio * 100).toFixed(0)}%）`,
              updateTime: db.serverDate()
            }
          });

        // 从用户的待结算奖励中扣除
        await db.collection('users')
          .where({ _openid: reward.beneficiaryId })
          .update({
            data: {
              pendingReward: _.inc(-reward.amount),
              updateTime: db.serverDate()
            }
          });

        cancelledCount++;
        console.log(`[取消奖励] pending奖励已取消: ${reward._id}, 金额: ${reward.amount}`);
      } else if (reward.status === 'settled') {
        // 已结算的奖励按比例扣回
        const deductAmount = Math.floor(reward.amount * refundRatio);

        if (deductAmount > 0) {
          // 1. 从用户总奖励扣回
          await db.collection('users')
            .where({ _openid: reward.beneficiaryId })
            .update({
              data: {
                totalReward: _.inc(-deductAmount),
                updateTime: db.serverDate()
              }
            });

          // 2. 从佣金钱包扣减余额
          await db.collection('commission_wallets')
            .where({ _openid: reward.beneficiaryId })
            .update({
              data: {
                balance: _.inc(-deductAmount),
                totalCommission: _.inc(-deductAmount),
                updateTime: db.serverDate()
              }
            });

          // 3. 记录佣金钱包交易流水
          await db.collection('commission_transactions').add({
            data: {
              _openid: reward.beneficiaryId,
              type: 'reward_deduct',
              amount: -deductAmount,
              title: '奖励扣回',
              description: `订单 ${orderId} 退款，扣回${rewardTypeName}`,
              orderId: orderId,
              rewardId: reward._id,
              status: 'success',
              createTime: db.serverDate()
            }
          });

          // 如果全额扣回，更新奖励状态为deducted
          if (deductAmount === reward.amount) {
            await db.collection('reward_records')
              .doc(reward._id)
              .update({
                data: {
                  status: 'deducted',
                  cancelReason: `订单全额退款`,
                  updateTime: db.serverDate()
                }
              });
          } else {
            // 部分扣回，记录扣回金额
            await db.collection('reward_records')
              .doc(reward._id)
              .update({
                data: {
                  deductedAmount: _.inc(deductAmount),
                  updateTime: db.serverDate()
                }
              });
          }

          deductedCount++;
          deductedAmount += deductAmount;
          console.log(`[取消奖励] settled奖励已扣回: ${reward._id}, 扣回金额: ${deductAmount}`);
        }
      }
    }

    console.log(`[取消奖励] 完成: ${orderId}, 取消: ${cancelledCount}, 扣回: ${deductedCount}, 总金额: ${deductedAmount}`);

    return {
      success: true,
      cancelledCount,
      deductedCount,
      deductedAmount
    };
  } catch (error) {
    console.error('取消奖励失败:', error);
    throw error;
  }
}

/**
 * 取消订单奖励 - 独立action入口
 */
async function cancelOrderRewards(event, context) {
  const { orderId, refundRatio } = event;

  if (!orderId) {
    return { code: -1, msg: '缺少订单ID' };
  }

  try {
    const result = await cancelRewards(orderId, refundRatio);
    return {
      code: 0,
      msg: '奖励扣回成功',
      data: result
    };
  } catch (error) {
    console.error('取消订单奖励失败:', error);
    return { code: -1, msg: '奖励扣回失败' };
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
    case 'cancelOrderRewards':
      return await cancelOrderRewards(event, context);
    default:
      return { code: -1, msg: '未知操作' };
  }
};
