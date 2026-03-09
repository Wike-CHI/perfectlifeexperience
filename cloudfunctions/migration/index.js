// 🔧 新增：统一推广分销体系配置迁移
async function migrateSystemConfig() {
  try {
    console.log('[迁移] 开始统一推广分销体系配置');

    const result = await db.collection('system_config')
      .where({ type: 'commission_config' })
      .limit(1)
      .get();

    if (result.data.length === 0) {
      console.log('[迁移] 未找到配置，创建默认配置');

      // 创建默认配置（金额单位：分）
      const defaultConfig = {
        type: 'commission_config',
        level1Commission: 20,
        level2Commission: 12,
        level3Commission: 8,
        level4Commission: 4,
        bronzeTotalSales: 2000000,      // 2万元 = 2000000分
        silverMonthSales: 5000000,      // 5万元 = 5000000分
        silverTeamCount: 50,
        goldMonthSales: 10000000,     // 10万元 = 10000000分
        goldTeamCount: 200,
        minWithdrawAmount: 10000,       // 100元 = 10000分
        withdrawFeeRate: 0,
        rechargeOptions: [],
        createTime: db.serverDate(),
        updateTime: db.serverDate()
      };

      await db.collection('system_config').add({ data: defaultConfig });

      return {
        code: 0,
        msg: '已创建默认配置',
        data: defaultConfig
      };
    }

    const oldConfig = result.data[0];
    const oldId = oldConfig._id;
    const oldData = oldConfig.config || oldConfig;

    console.log('[迁移] 旧配置:', JSON.stringify(oldData, null, 2));

    // 字段映射：旧字段名 → 新字段名
    const fieldMapping = {
      'bronzeThreshold': 'bronzeTotalSales',
      'silverSalesThreshold': 'silverMonthSales',
      'silverTeamThreshold': 'silverTeamCount',
      'goldSalesThreshold': 'goldMonthSales',
      'goldTeamThreshold': 'goldTeamCount',
      'withdrawalMinAmount': 'minWithdrawAmount',
      'withdrawalMaxAmount': 'maxWithdrawAmount',  // 保留
      'withdrawalFeeRate': 'withdrawFeeRate'
    };

    // 构建迁移后的数据
    const migratedData = {
      type: 'commission_config',
      // 佣金比例字段（直接复制）
      level1Commission: oldData.level1Commission ?? 20,
      level2Commission: oldData.level2Commission ?? 12,
      level3Commission: oldData.level3Commission ?? 8,
      level4Commission: oldData.level4Commission ?? 4,
      updateTime: db.serverDate()
    };

    // 处理金额字段（假设旧数据存的是元，需要转成分）
    const amountFields = ['bronzeTotalSales', 'silverMonthSales', 'goldMonthSales', 'minWithdrawAmount'];
    for (const [oldKey, newKey] of Object.entries(fieldMapping)) {
      let value = oldData[oldKey] ?? oldData[newKey];  // 尝试旧字段名或新字段名

      if (value !== undefined) {
        // 如果是金额字段且值较小（<10000），假设是元，需要*100转成分
        if (amountFields.includes(newKey) && value < 10000) {
          value = value * 100;
          console.log(`[迁移] ${oldKey} -> ${newKey}: ${oldData[oldKey]}元 -> ${value}分`);
        }
        migratedData[newKey] = value;
      }
    }

    // 设置默认值
    migratedData.bronzeTotalSales = migratedData.bronzeTotalSales ?? 2000000;
    migratedData.silverMonthSales = migratedData.silverMonthSales ?? 5000000;
    migratedData.silverTeamCount = migratedData.silverTeamCount ?? 50;
    migratedData.goldMonthSales = migratedData.goldMonthSales ?? 10000000;
    migratedData.goldTeamCount = migratedData.goldTeamCount ?? 200;
    migratedData.minWithdrawAmount = migratedData.minWithdrawAmount ?? 10000;
    migratedData.withdrawFeeRate = migratedData.withdrawFeeRate ?? 0;
    migratedData.rechargeOptions = oldData.rechargeOptions ?? [];

    console.log('[迁移] 新配置:', JSON.stringify(migratedData, null, 2));

    // 更新配置（扁平存储，移除 config 嵌套）
    // 使用 replace 操作完全替换旧数据
    await db.collection('system_config').doc(oldId).replace({
      data: migratedData
    });

    console.log('[迁移] 配置更新成功');

    return {
      code: 0,
      msg: '迁移成功',
      data: {
        oldConfig: oldData,
        newConfig: migratedData
      }
    };

  } catch (error) {
    console.error('[迁移] 统一推广配置失败:', error);
    return {
      code: -1,
      msg: error.message
    };
  }
}
