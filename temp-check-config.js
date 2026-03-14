const cloud = require('wx-server-sdk');
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});
const db = cloud.database();

(async () => {
  try {
    const res = await db.collection('system_config')
      .where({ type: 'commission_config' })
      .get();

    if (res.data && res.data.length > 0) {
      const config = res.data[0];
      console.log('✅ 找到系统配置');
      console.log('\n当前充值档位配置:');
      console.log('====================');

      if (config.rechargeOptions && Array.isArray(config.rechargeOptions)) {
        config.rechargeOptions.forEach((opt, idx) => {
          const amount = opt.amount || 0;
          const gift = opt.gift || 0;
          console.log(`${idx + 1}. 充¥${amount} 赠¥${gift}`);
        });

        // 检查是否有赠送金额
        const hasGift = config.rechargeOptions.some(opt => opt.gift > 0);
        console.log('\n状态:', hasGift ? '⚠️ 存在赠送金额配置' : '✅ 无赠送金额配置');
      } else {
        console.log('❌ 未配置充值档位');
      }

      console.log('\n配置ID:', config._id);
      console.log('更新时间:', config.updateTime);
    } else {
      console.log('❌ 数据库中未找到系统配置');
      console.log('需要初始化配置,请运行 initAdminData 云函数');
    }
  } catch (error) {
    console.error('查询失败:', error.message);
  }
})();
