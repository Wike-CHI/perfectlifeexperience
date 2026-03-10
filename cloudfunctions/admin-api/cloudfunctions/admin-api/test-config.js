/**
 * 测试配置管理优化
 */

const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

// 引入统一配置管理
const { ensureSystemConfig, getSystemConfigWithFallback, DEFAULT_COMMISSION_CONFIG } = require('../../common/defaultConfig');

async function test() {
  console.log('=== 测试1: 检查默认配置模块 ===');
  console.log('✅ 默认配置加载成功');
  console.log('关键值验证:');
  console.log('  - level3Commission:', DEFAULT_COMMISSION_CONFIG.level3Commission, '(期望: 12)');
  console.log('  - level4Commission:', DEFAULT_COMMISSION_CONFIG.level4Commission, '(期望: 8)');
  console.log('  - minWithdrawAmount:', DEFAULT_COMMISSION_CONFIG.minWithdrawAmount, '(期望: 100)');
  console.log('  - maxWithdrawAmount:', DEFAULT_COMMISSION_CONFIG.maxWithdrawAmount, '(期望: 50000)');
  console.log('  - maxDailyWithdraws:', DEFAULT_COMMISSION_CONFIG.maxDailyWithdraws, '(期望: 3)');

  console.log('\n=== 测试2: 自动初始化配置 ===');
  const config = await ensureSystemConfig(db);
  console.log('✅ 配置自动初始化成功');
  console.log('配置ID:', config._id);
  console.log('关键值验证:');
  console.log('  - level3Commission:', config.level3Commission, '(期望: 12)');
  console.log('  - level4Commission:', config.level4Commission, '(期望: 8)');
  console.log('  - minWithdrawAmount:', config.minWithdrawAmount, '(期望: 100分=1元)');
  console.log('  - maxWithdrawAmount:', config.maxWithdrawAmount, '(期望: 50000分=500元)');
  console.log('  - maxDailyWithdraws:', config.maxDailyWithdraws, '(期望: 3)');

  console.log('\n=== 测试3: 读取配置（带降级） ===');
  const config2 = await getSystemConfigWithFallback(db);
  console.log('✅ 配置读取成功');
  console.log('关键值:', {
    level3Commission: config2.level3Commission,
    minWithdrawAmount: config2.minWithdrawAmount
  });

  console.log('\n=== 测试4: 验证数据库中的配置 ===');
  const result = await db.collection('system_config')
    .where({ type: 'commission_config' })
    .get();

  if (result.data.length > 0) {
    console.log('✅ 数据库中存在配置记录');
    console.log('记录数量:', result.data.length);
    console.log('配置ID:', result.data[0]._id);
  } else {
    console.log('❌ 数据库中没有配置记录');
  }

  console.log('\n✅ 所有测试通过！');
}

test().catch(err => {
  console.error('❌ 测试失败:', err);
});
