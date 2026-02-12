const cloud = require('wx-server-sdk');

// 初始化云开发
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

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
 * 数据迁移 - 为现有用户添加新字段
 * 执行方式：在云开发控制台手动调用此云函数
 */
async function migrateUserData(event, context) {
  console.log('开始数据迁移...');
  const startTime = Date.now();

  try {
    const { batchSize = 100, dryRun = false } = event;
    
    // 查询所有用户
    const usersRes = await db.collection('users')
      .limit(batchSize)
      .get();

    console.log(`查询到 ${usersRes.data.length} 个用户`);

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    for (const user of usersRes.data) {
      try {
        // 检查是否已迁移（已有新字段）
        if (user.starLevel !== undefined && user.agentLevel !== undefined && user.performance !== undefined) {
          skipCount++;
          continue;
        }

        if (dryRun) {
          console.log(`[DRY-RUN] 将迁移用户: ${user._openid}`);
          successCount++;
          continue;
        }

        // 准备迁移数据
        const migrateData = {
          // === 双轨制身份（默认初始值）===
          starLevel: 0,
          agentLevel: 4, // 默认四级代理
          performance: getDefaultPerformance(),
          // === 奖励分类统计 ===
          commissionReward: user.commissionReward || user.totalReward || 0,
          repurchaseReward: user.repurchaseReward || 0,
          managementReward: user.managementReward || 0,
          nurtureReward: user.nurtureReward || 0,
          // === 订单计数 ===
          orderCount: user.orderCount || 0,
          updateTime: db.serverDate()
        };

        // 根据现有的 promotionLevel 计算初始 agentLevel
        if (user.promotionLevel !== undefined) {
          // promotionLevel 1-4 对应 agentLevel
          // 注意：promotionLevel 是距离总公司的层级，值越小越高级
          // agentLevel 是代理等级，1级最高，4级最低
          migrateData.agentLevel = Math.min(4, Math.max(1, user.promotionLevel));
        }

        // 执行更新
        await db.collection('users')
          .doc(user._id)
          .update({
            data: migrateData
          });

        successCount++;
        console.log(`✅ 迁移成功: ${user._openid}`);
      } catch (error) {
        errorCount++;
        console.error(`❌ 迁移失败: ${user._openid}`, error);
      }
    }

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    console.log(`迁移完成: 成功 ${successCount}, 跳过 ${skipCount}, 失败 ${errorCount}, 耗时 ${duration}s`);

    return {
      code: 0,
      msg: '迁移完成',
      data: {
        successCount,
        skipCount,
        errorCount,
        duration: `${duration}s`,
        dryRun
      }
    };
  } catch (error) {
    console.error('数据迁移失败:', error);
    return { code: -1, msg: '迁移失败', error: error.message };
  }
}

/**
 * 迁移奖励记录 - 添加奖励类型字段
 */
async function migrateRewardRecords(event, context) {
  console.log('开始奖励记录迁移...');
  const startTime = Date.now();

  try {
    const { batchSize = 100, dryRun = false } = event;
    
    const recordsRes = await db.collection('reward_records')
      .limit(batchSize)
      .get();

    console.log(`查询到 ${recordsRes.data.length} 条奖励记录`);

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    for (const record of recordsRes.data) {
      try {
        // 检查是否已迁移
        if (record.rewardType !== undefined) {
          skipCount++;
          continue;
        }

        if (dryRun) {
          successCount++;
          continue;
        }

        // 根据层级推断奖励类型（旧数据统一为基础佣金）
        const migrateData = {
          rewardType: 'commission',
          rewardTypeName: '基础佣金',
          updateTime: db.serverDate()
        };

        await db.collection('reward_records')
          .doc(record._id)
          .update({
            data: migrateData
          });

        successCount++;
      } catch (error) {
        errorCount++;
        console.error(`迁移奖励记录失败: ${record._id}`, error);
      }
    }

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    return {
      code: 0,
      msg: '奖励记录迁移完成',
      data: {
        successCount,
        skipCount,
        errorCount,
        duration: `${duration}s`
      }
    };
  } catch (error) {
    console.error('奖励记录迁移失败:', error);
    return { code: -1, msg: '迁移失败', error: error.message };
  }
}

/**
 * 验证迁移结果
 */
async function verifyMigration(event, context) {
  try {
    // 检查用户数据
    const usersRes = await db.collection('users').limit(10).get();
    
    const userStats = {
      total: usersRes.data.length,
      withStarLevel: 0,
      withAgentLevel: 0,
      withPerformance: 0,
      sampleData: []
    };

    usersRes.data.forEach(user => {
      if (user.starLevel !== undefined) userStats.withStarLevel++;
      if (user.agentLevel !== undefined) userStats.withAgentLevel++;
      if (user.performance !== undefined) userStats.withPerformance++;
      
      if (userStats.sampleData.length < 3) {
        userStats.sampleData.push({
          _openid: user._openid,
          starLevel: user.starLevel,
          agentLevel: user.agentLevel,
          performance: user.performance
        });
      }
    });

    // 检查奖励记录
    const rewardsRes = await db.collection('reward_records').limit(10).get();
    
    const rewardStats = {
      total: rewardsRes.data.length,
      withRewardType: 0,
      sampleData: []
    };

    rewardsRes.data.forEach(record => {
      if (record.rewardType !== undefined) rewardStats.withRewardType++;
      
      if (rewardStats.sampleData.length < 3) {
        rewardStats.sampleData.push({
          _id: record._id,
          rewardType: record.rewardType,
          rewardTypeName: record.rewardTypeName
        });
      }
    });

    return {
      code: 0,
      msg: '验证完成',
      data: {
        userStats,
        rewardStats
      }
    };
  } catch (error) {
    console.error('验证失败:', error);
    return { code: -1, msg: '验证失败', error: error.message };
  }
}

/**
 * 批量迁移所有数据
 */
async function migrateAll(event, context) {
  console.log('开始批量迁移所有数据...');
  
  const results = {
    users: null,
    rewards: null
  };

  // 迁移用户数据
  results.users = await migrateUserData({ batchSize: 1000, dryRun: event.dryRun }, context);
  
  // 迁移奖励记录
  results.rewards = await migrateRewardRecords({ batchSize: 1000, dryRun: event.dryRun }, context);

  return {
    code: 0,
    msg: '批量迁移完成',
    data: results
  };
}

/**
 * 主入口函数
 */
exports.main = async (event, context) => {
  const { action = 'migrateUsers' } = event;

  switch (action) {
    case 'migrateUsers':
      return await migrateUserData(event, context);
    case 'migrateRewards':
      return await migrateRewardRecords(event, context);
    case 'migrateAll':
      return await migrateAll(event, context);
    case 'verify':
      return await verifyMigration(event, context);
    default:
      return { code: -1, msg: '未知操作' };
  }
};
