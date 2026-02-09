const cloud = require('@cloudbase/node-sdk');

// 初始化云开发环境
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

// 结算周期（天）
const SETTLEMENT_DAYS = 7;

/**
 * 执行奖励结算
 * 定时触发：每天凌晨2点执行
 */
async function settlementRewards(event, context) {
  console.log('开始执行奖励结算任务', new Date());

  try {
    // 计算结算截止时间（T+7）
    const settleDeadline = new Date();
    settleDeadline.setDate(settleDeadline.getDate() - SETTLEMENT_DAYS);

    // 1. 查询待结算的推广订单
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
        // 检查订单是否有效（未退款）
        const orderValid = await checkOrderValid(order.orderId);
        
        if (!orderValid) {
          // 订单已退款或取消，标记为无效
          await db.collection('promotion_orders')
            .doc(order._id)
            .update({
              data: {
                status: 'invalid',
                updateTime: db.serverDate()
              }
            });
          
          // 取消相关奖励
          await cancelRewards(order.orderId);
          continue;
        }

        // 执行结算
        await settleOrderRewards(order);
        settledCount++;
      } catch (error) {
        console.error(`结算订单 ${order.orderId} 失败:`, error);
        failedCount++;
      }
    }

    console.log(`结算完成：成功 ${settledCount} 个，失败 ${failedCount} 个`);

    // 2. 清理异常数据（防刷）
    await cleanAbnormalData();

    return {
      code: 0,
      msg: '结算完成',
      data: {
        settledCount,
        failedCount
      }
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
    // 从订单集合查询订单状态
    const orderRes = await db.collection('orders')
      .where({ orderNo: orderId })
      .get();
    
    if (orderRes.data.length === 0) {
      return false;
    }

    const order = orderRes.data[0];
    // 订单已完成且未退款视为有效
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
    // 1. 获取该订单的所有待结算奖励记录
    const rewardsRes = await transaction.collection('reward_records')
      .where({
        orderId: promotionOrder.orderId,
        status: 'pending'
      })
      .get();

    for (const reward of rewardsRes.data) {
      // 2. 更新奖励记录状态
      await transaction.collection('reward_records')
        .doc(reward._id)
        .update({
          data: {
            status: 'settled',
            settleTime: db.serverDate()
          }
        });

      // 3. 更新用户余额和累计收益
      await transaction.collection('users')
        .where({ _openid: reward.beneficiaryId })
        .update({
          data: {
            pendingReward: _.inc(-reward.amount),
            totalReward: _.inc(reward.amount),
            updateTime: db.serverDate()
          }
        });

      // 4. 创建钱包交易记录
      await transaction.collection('wallet_transactions').add({
        data: {
          _openid: reward.beneficiaryId,
          type: 'reward',
          amount: reward.amount,
          title: `推广奖励 - ${getLevelText(reward.level)}`,
          description: `订单 ${promotionOrder.orderId} 的推广奖励`,
          orderId: promotionOrder.orderId,
          status: 'success',
          createTime: db.serverDate()
        }
      });
    }

    // 5. 更新推广订单状态
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
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

/**
 * 获取层级文本
 */
function getLevelText(level) {
  const texts = {
    1: '直接推广',
    2: '二级推广',
    3: '三级推广',
    4: '四级推广'
  };
  return texts[level] || '推广奖励';
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
        // 待结算的直接取消
        await db.collection('reward_records')
          .doc(reward._id)
          .update({
            data: {
              status: 'cancelled',
              updateTime: db.serverDate()
            }
          });
      } else if (reward.status === 'settled') {
        // 已结算的需要扣回
        await db.collection('users')
          .where({ _openid: reward.beneficiaryId })
          .update({
            data: {
              totalReward: _.inc(-reward.amount),
              updateTime: db.serverDate()
            }
          });

        // 创建扣回记录
        await db.collection('wallet_transactions').add({
          data: {
            _openid: reward.beneficiaryId,
            type: 'reward_deduct',
            amount: -reward.amount,
            title: '奖励扣回',
            description: `订单 ${orderId} 退款，扣回已发放奖励`,
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
    // 1. 检测同一IP大量注册
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    // 获取近期注册用户
    const recentUsersRes = await db.collection('users')
      .where({
        createTime: _.gte(oneDayAgo)
      })
      .get();

    // 按IP分组统计
    const ipGroups = {};
    recentUsersRes.data.forEach(user => {
      const ip = user.registerIP || 'unknown';
      if (!ipGroups[ip]) {
        ipGroups[ip] = [];
      }
      ipGroups[ip].push(user);
    });

    // 标记异常账号
    for (const [ip, users] of Object.entries(ipGroups)) {
      if (users.length > 5 && ip !== 'unknown') {
        console.log(`IP ${ip} 异常注册：${users.length} 个账号`);
        
        // 标记为可疑账号
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

    // 2. 检测自购行为（买家与推广人为同一人）
    const recentRewardsRes = await db.collection('reward_records')
      .where({
        createTime: _.gte(oneDayAgo),
        status: 'pending'
      })
      .get();

    for (const reward of recentRewardsRes.data) {
      if (reward.beneficiaryId === reward.sourceUserId) {
        console.log(`检测到自购行为：用户 ${reward.beneficiaryId}`);
        
        // 取消奖励
        await db.collection('reward_records')
          .doc(reward._id)
          .update({
            data: {
              status: 'cancelled',
              cancelReason: '自购行为',
              updateTime: db.serverDate()
            }
          });

        // 标记用户
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

    // 3. 检测异常订单（金额过低）
    const abnormalOrdersRes = await db.collection('promotion_orders')
      .where({
        status: 'pending',
        orderAmount: _.lt(1000) // 小于10元的订单
      })
      .get();

    for (const order of abnormalOrdersRes.data) {
      console.log(`检测到异常订单：${order.orderId}，金额：${order.orderAmount}`);
      
      // 标记为需审核
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
      // 结算指定订单
      const orderRes = await db.collection('promotion_orders')
        .where({ orderId })
        .get();
      
      if (orderRes.data.length === 0) {
        return { code: -1, msg: '订单不存在' };
      }

      await settleOrderRewards(orderRes.data[0]);
      return { code: 0, msg: '结算成功' };
    } else {
      // 执行批量结算
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

    // 今日结算金额
    const todayRes = await db.collection('reward_records')
      .where({
        status: 'settled',
        settleTime: _.gte(today)
      })
      .get();
    
    const todayAmount = todayRes.data.reduce((sum, r) => sum + r.amount, 0);

    // 待结算金额
    const pendingRes = await db.collection('reward_records')
      .where({ status: 'pending' })
      .get();
    
    const pendingAmount = pendingRes.data.reduce((sum, r) => sum + r.amount, 0);

    // 累计结算金额
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
