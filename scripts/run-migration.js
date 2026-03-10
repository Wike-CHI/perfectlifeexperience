/**
 * 数据库迁移执行脚本
 *
 * 执行方法：
 * node scripts/run-migration.js
 *
 * 环境要求：
 * 需要先在云开发控制台创建临时密钥或配置环境变量
 */

const cloud = require('wx-server-sdk');

// 初始化CloudBase
cloud.init({
  env: 'cloud1-6gmp2q0y3171c353'
});

const db = cloud.database();
const _ = db.command;

async function runMigration() {
  console.log('🚀 开始数据库迁移...\n');

  const results = {
    orders: { updated: 0, error: null },
    wallets: { updated: 0, error: null }
  };

  try {
    // 1. 为orders集合添加version字段
    console.log('📋 步骤1: 更新orders集合...');

    const ordersResult = await db.collection('orders')
      .where({
        version: _.exists(false)
      })
      .update({
        data: {
          version: 1,
          updateTime: db.serverDate()
        }
      });

    results.orders.updated = ordersResult.stats.updated;
    console.log(`  ✅ orders集合更新完成，共更新 ${ordersResult.stats.updated} 条记录`);

  } catch (error) {
    console.error('  ❌ 更新orders集合失败:', error.message);
    results.orders.error = error.message;
  }

  console.log('');

  try {
    // 2. 为commission_wallets集合添加version字段
    console.log('📋 步骤2: 更新commission_wallets集合...');

    const walletsResult = await db.collection('commission_wallets')
      .where({
        version: _.exists(false)
      })
      .update({
        data: {
          version: 1,
          updateTime: db.serverDate()
        }
      });

    results.wallets.updated = walletsResult.stats.updated;
    console.log(`  ✅ commission_wallets集合更新完成，共更新 ${walletsResult.stats.updated} 条记录`);

  } catch (error) {
    console.error('  ❌ 更新commission_wallets集合失败:', error.message);
    results.wallets.error = error.message;
  }

  console.log('\n' + '='.repeat(60));
  console.log('迁移结果汇总:');
  console.log(`  - orders集合: ${results.orders.updated} 条记录更新 ${results.orders.error ? '❌ ' + results.orders.error : '✅'}`);
  console.log(`  - commission_wallets集合: ${results.wallets.updated} 条记录更新 ${results.wallets.error ? '❌ ' + results.wallets.error : '✅'}`);
  console.log('='.repeat(60));

  if (results.orders.error || results.wallets.error) {
    console.log('\n⚠️ 迁移完成但存在错误');
    process.exit(1);
  } else {
    console.log('\n🎉 所有迁移成功完成！');
    process.exit(0);
  }
}

// 执行迁移
runMigration().catch(error => {
  console.error('\n❌ 迁移失败:', error);
  process.exit(1);
});
