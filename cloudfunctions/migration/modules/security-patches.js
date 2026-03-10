/**
 * 数据库迁移：添加安全补丁字段
 *
 * 为订单和钱包表添加安全相关字段：
 * - orders表：idempotencyKey, version, securityFlags
 * - commission_wallets表：version
 * - 分布式锁表：distributed_locks
 */

const cloud = require('wx-server-sdk');
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

/**
 * 迁移1：为订单表添加幂等键和版本号
 */
async function migrateOrdersSecurity() {
  console.log('📋 迁移订单表安全字段...');

  try {
    // 添加幂等键索引（如果不存在）
    // 注意：云开发不支持直接addIndex，需要在控制台手动创建
    console.log('  ⚠️ 请在云开发控制台手动添加索引：');
    console.log('     集合: orders');
    console.log('     字段: idempotencyKey');
    console.log('     类型: 索引');
    console.log('     属性: 唯一索引');

    // 添加版本号字段（批量更新现有订单）
    const updateResult = await db.collection('orders')
      .where({
        version: _.exists(false)
      })
      .update({
        data: {
          version: 1,
          updateTime: db.serverDate()
        }
      });

    console.log(`  ✅ 更新了${updateResult.stats.updated}个订单的版本号`);

    return {
      success: true,
      message: '订单表安全字段迁移完成'
    };

  } catch (error) {
    console.error('  ❌ 迁移失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 迁移2：为佣金钱包表添加版本号
 */
async function migrateWalletsSecurity() {
  console.log('📋 迁移佣金钱包表安全字段...');

  try {
    // 添加版本号字段
    const updateResult = await db.collection('commission_wallets')
      .where({
        version: _.exists(false)
      })
      .update({
        data: {
          version: 1,
          updateTime: db.serverDate()
        }
      });

    console.log(`  ✅ 更新了${updateResult.stats.updated}个钱包的版本号`);

    return {
      success: true,
      message: '佣金钱包表安全字段迁移完成'
    };

  } catch (error) {
    console.error('  ❌ 迁移失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 迁移3：创建分布式锁表
 */
async function createDistributedLocksTable() {
  console.log('📋 创建分布式锁表...');

  try {
    // 创建测试记录（如果表不存在会自动创建）
    await db.collection('distributed_locks').add({
      data: {
        key: '_init_',
        expireTime: new Date(Date.now() + 60000), // 1分钟后过期
        createTime: new Date()
      }
    });

    // 删除测试记录
    await db.collection('distributed_locks')
      .where({ key: '_init_' })
      .remove();

    console.log('  ✅ 分布式锁表创建成功');

    // 添加索引建议
    console.log('  ⚠️ 请在云开发控制台添加索引：');
    console.log('     集合: distributed_locks');
    console.log('     字段: key');
    console.log('     类型: 唯一索引');

    return {
      success: true,
      message: '分布式锁表创建成功'
    };

  } catch (error) {
    console.error('  ❌ 创建失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 迁移4：创建安全事件日志表
 */
async function createSecurityEventsTable() {
  console.log('📋 创建安全事件日志表...');

  try {
    // 创建测试记录
    await db.collection('security_events').add({
      data: {
        type: 'TEST',
        severity: 'low',
        timestamp: db.serverDate(),
        description: '初始化安全事件表'
      }
    });

    console.log('  ✅ 安全事件表创建成功');

    console.log('  ⚠️ 建议索引：');
    console.log('     字段: timestamp (降序)');
    console.log('     字段: type');
    console.log('     字段: severity');

    return {
      success: true,
      message: '安全事件表创建成功'
    };

  } catch (error) {
    console.error('  ❌ 创建失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 执行所有迁移
 */
async function runAllMigrations() {
  console.log('🚀 开始安全补丁迁移...\n');

  const results = [];

  results.push(await migrateOrdersSecurity());
  console.log('');
  results.push(await migrateWalletsSecurity());
  console.log('');
  results.push(await createDistributedLocksTable());
  console.log('');
  results.push(await createSecurityEventsTable());
  console.log('');

  const failed = results.filter(r => !r.success);

  if (failed.length === 0) {
    console.log('✅ 所有迁移完成！');
    return {
      success: true,
      results
    };
  } else {
    console.log('❌ 部分迁移失败:');
    failed.forEach(r => {
      console.log(`  - ${r.message}: ${r.error}`);
    });
    return {
      success: false,
      results,
      failed
    };
  }
}

// 导出迁移函数
module.exports = {
  migrateOrdersSecurity,
  migrateWalletsSecurity,
  createDistributedLocksTable,
  createSecurityEventsTable,
  runAllMigrations
};

// 如果直接运行此文件
if (require.main === module) {
  runAllMigrations().then(result => {
    if (result.success) {
      console.log('\n🎉 迁移成功完成！');
      process.exit(0);
    } else {
      console.log('\n⚠️ 迁移完成但存在错误');
      process.exit(1);
    }
  }).catch(error => {
    console.error('\n❌ 迁移失败:', error);
    process.exit(1);
  });
}
