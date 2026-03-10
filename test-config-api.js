/**
 * 测试配置管理优化
 */

const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

// 引入统一配置管理
const { ensureSystemConfig, getSystemConfigWithFallback, DEFAULT_COMMISSION_CONFIG } = require('./cloudfunctions/common/defaultConfig');

async function test() {
  console.log('=== 测试1: 检查默认配置模块 ===');
  console.log('DEFAULT_COMMISSION_CONFIG:', JSON.stringify(DEFAULT_COMMISSION_CONFIG, null, 2));
  
  console.log('\n=== 测试2: 自动初始化配置 ===');
  const config = await ensureSystemConfig(db);
  console.log('配置已初始化:', {
    _id: config._id,
    type: config.type,
    level3Commission: config.level3Commission,
    level4Commission: config.level4Commission,
    minWithdrawAmount: config.minWithdrawAmount,
    maxWithdrawAmount: config.maxWithdrawAmount,
    maxDailyWithdraws: config.maxDailyWithdraws
  });
  
  console.log('\n=== 测试3: 读取配置（带降级） ===');
  const config2 = await getSystemConfigWithFallback(db);
  console.log('配置读取成功:', {
    level3Commission: config2.level3Commission,
    minWithdrawAmount: config2.minWithdrawAmount
  });
  
  console.log('\n✅ 所有测试通过！');
}

test().catch(err => {
  console.error('❌ 测试失败:', err);
});
