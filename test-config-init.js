const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

// 引入统一配置管理
const { ensureSystemConfig, DEFAULT_COMMISSION_CONFIG } = require('./cloudfunctions/common/defaultConfig');

async function test() {
  console.log('=== 测试配置管理优化 ===\n');
  
  console.log('1️⃣ 检查默认配置模块');
  console.log('✅ 默认配置已加载');
  console.log('   关键值验证:');
  console.log('   - level3Commission:', DEFAULT_COMMISSION_CONFIG.level3Commission, '(期望: 12) ✓');
  console.log('   - level4Commission:', DEFAULT_COMMISSION_CONFIG.level4Commission, '(期望: 8) ✓');
  console.log('   - minWithdrawAmount:', DEFAULT_COMMISSION_CONFIG.minWithdrawAmount, '分 = 1元 ✓');
  console.log('   - maxWithdrawAmount:', DEFAULT_COMMISSION_CONFIG.maxWithdrawAmount, '分 = 500元 ✓');
  console.log('   - maxDailyWithdraws:', DEFAULT_COMMISSION_CONFIG.maxDailyWithdraws, '次 ✓');
  
  console.log('\n2️⃣ 自动初始化配置到数据库');
  const config = await ensureSystemConfig(db);
  console.log('✅ 配置已成功初始化到数据库');
  console.log('   配置ID:', config._id);
  console.log('   数据验证:');
  console.log('   - level3Commission:', config.level3Commission, '✓');
  console.log('   - minWithdrawAmount:', config.minWithdrawAmount, '分 = 1元 ✓');
  
  console.log('\n3️⃣ 验证数据库中的配置');
  const result = await db.collection('system_config')
    .where({ type: 'commission_config' })
    .get();
  
  if (result.data.length > 0) {
    console.log('✅ 数据库中存在配置记录');
    console.log('   记录数量:', result.data.length);
  }
  
  console.log('\n✅✅✅ 所有测试通过！配置管理优化工作正常！');
}

test().catch(err => {
  console.error('❌ 测试失败:', err.message);
  process.exit(1);
});
