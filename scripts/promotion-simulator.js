/**
 * 推广体系场景模拟器
 * 用于验证佣金分配逻辑和升级机制
 *
 * 运行方式: node scripts/promotion-simulator.js
 */

// ==================== 配置常量 ====================

const CONFIG = {
  COMPANY_RATIO: 0.8,  // 公司拿80%
  AGENT_RATIO: 0.2,    // 代理分20%

  // 基础佣金分配规则（以100元订单为例）
  COMMISSION_RULES: {
    level1: { self: 20, total: 20 },  // 一级推广：独拿20元
    level2: { self: 12, up1: 8, total: 20 },   // 二级推广：自己12，上级8
    level3: { self: 12, up1: 4, up2: 4, total: 20 },  // 三级推广：自己12，上级各4
    level4: { self: 8, up1: 4, up2: 4, up3: 4, total: 20 }  // 四级推广：自己8，上级各4
  },

  // 升级条件
  UPGRADE_CONDITIONS: {
    bronze: {  // 普通 → 铜牌（三级）
      totalSales: 20000  // 累计卖货2万元
    },
    silver: {  // 铜牌 → 银牌（二级）
      monthSales: 50000,  // 本月卖货5万元
      teamCount: 50       // 或团队50人
    },
    gold: {    // 银牌 → 金牌（一级）
      monthSales: 100000, // 本月卖货10万元
      teamCount: 200      // 或团队200人
    }
  }
};

// ==================== 核心计算函数 ====================

/**
 * 计算佣金分配
 * @param {number} orderAmount - 订单金额（元）
 * @param {number} promoterLevel - 推广人等级 (1-4)
 * @returns {Object} 佣金分配结果
 */
function calculateCommission(orderAmount, promoterLevel) {
  const commissionPool = orderAmount * CONFIG.AGENT_RATIO; // 20元（100元订单）

  const rules = CONFIG.COMMISSION_RULES[`level${promoterLevel}`];
  if (!rules) {
    throw new Error(`Invalid promoter level: ${promoterLevel}`);
  }

  // 按比例缩放（如果订单不是100元）
  const scale = orderAmount / 100;

  const result = {
    orderAmount,
    commissionPool,
    companyProfit: orderAmount * CONFIG.COMPANY_RATIO,
    distribution: []
  };

  // 构建分配明细
  if (promoterLevel === 1) {
    result.distribution.push({ level: 1, name: '一级代理', amount: rules.self * scale });
  } else if (promoterLevel === 2) {
    result.distribution.push({ level: 2, name: '推广人(二级)', amount: rules.self * scale });
    result.distribution.push({ level: 1, name: '一级代理', amount: rules.up1 * scale });
  } else if (promoterLevel === 3) {
    result.distribution.push({ level: 3, name: '推广人(三级)', amount: rules.self * scale });
    result.distribution.push({ level: 2, name: '二级代理', amount: rules.up1 * scale });
    result.distribution.push({ level: 1, name: '一级代理', amount: rules.up2 * scale });
  } else if (promoterLevel === 4) {
    result.distribution.push({ level: 4, name: '推广人(四级)', amount: rules.self * scale });
    result.distribution.push({ level: 3, name: '三级代理', amount: rules.up1 * scale });
    result.distribution.push({ level: 2, name: '二级代理', amount: rules.up2 * scale });
    result.distribution.push({ level: 1, name: '一级代理', amount: rules.up3 * scale });
  }

  return result;
}

/**
 * 模拟下级升级场景
 * @param {number} orderAmount - 订单金额
 * @returns {Object} 升级前后对比
 */
function simulateUpgrade(orderAmount) {
  const beforeUpgrade = calculateCommission(orderAmount, 4);
  const afterUpgrade = calculateCommission(orderAmount, 3);

  return {
    scenario: 'D(四级)升级到三级',
    orderAmount,
    before: {
      description: 'A(金牌) → B(银牌) → C(铜牌) → D(普通) → 客户',
      distribution: beforeUpgrade.distribution,
      summary: {
        D: beforeUpgrade.distribution[0].amount,
        C: beforeUpgrade.distribution[1].amount,
        B: beforeUpgrade.distribution[2].amount,
        A: beforeUpgrade.distribution[3].amount
      }
    },
    after: {
      description: 'A(金牌) → B(银牌) → D(铜牌) → 客户',
      distribution: afterUpgrade.distribution,
      summary: {
        D: afterUpgrade.distribution[0].amount,
        B: afterUpgrade.distribution[1].amount,
        A: afterUpgrade.distribution[2].amount,
        C: 0  // C失去了D
      }
    },
    impact: {
      D: {
        before: beforeUpgrade.distribution[0].amount,
        after: afterUpgrade.distribution[0].amount,
        change: afterUpgrade.distribution[0].amount - beforeUpgrade.distribution[0].amount,
        percent: ((afterUpgrade.distribution[0].amount - beforeUpgrade.distribution[0].amount) / beforeUpgrade.distribution[0].amount * 100).toFixed(1)
      },
      C: {
        before: beforeUpgrade.distribution[1].amount,
        after: 0,
        change: -beforeUpgrade.distribution[1].amount,
        note: 'C失去了D的佣金'
      }
    }
  };
}

/**
 * 检查是否可以升级
 * @param {Object} user - 用户信息
 * @returns {Object} 升级检查结果
 */
function checkUpgrade(user) {
  const results = [];

  // 检查普通 → 铜牌
  if (user.level === 4) {
    const canUpgrade = user.performance.totalSales >= CONFIG.UPGRADE_CONDITIONS.bronze.totalSales;
    results.push({
      from: '普通(四级)',
      to: '铜牌(三级)',
      condition: `累计销售额达到${CONFIG.UPGRADE_CONDITIONS.bronze.totalSales}元`,
      current: user.performance.totalSales,
      canUpgrade,
      gap: canUpgrade ? 0 : CONFIG.UPGRADE_CONDITIONS.bronze.totalSales - user.performance.totalSales
    });
  }

  // 检查铜牌 → 银牌
  if (user.level === 3) {
    const salesReached = user.performance.monthSales >= CONFIG.UPGRADE_CONDITIONS.silver.monthSales;
    const teamReached = user.performance.teamCount >= CONFIG.UPGRADE_CONDITIONS.silver.teamCount;
    const canUpgrade = salesReached || teamReached;

    results.push({
      from: '铜牌(三级)',
      to: '银牌(二级)',
      conditions: [
        { name: '本月销售额', target: CONFIG.UPGRADE_CONDITIONS.silver.monthSales, current: user.performance.monthSales, reached: salesReached },
        { name: '团队人数', target: CONFIG.UPGRADE_CONDITIONS.silver.teamCount, current: user.performance.teamCount, reached: teamReached }
      ],
      canUpgrade,
      note: '满足任一条件即可升级'
    });
  }

  // 检查银牌 → 金牌
  if (user.level === 2) {
    const salesReached = user.performance.monthSales >= CONFIG.UPGRADE_CONDITIONS.gold.monthSales;
    const teamReached = user.performance.teamCount >= CONFIG.UPGRADE_CONDITIONS.gold.teamCount;
    const canUpgrade = salesReached || teamReached;

    results.push({
      from: '银牌(二级)',
      to: '金牌(一级)',
      conditions: [
        { name: '本月销售额', target: CONFIG.UPGRADE_CONDITIONS.gold.monthSales, current: user.performance.monthSales, reached: salesReached },
        { name: '团队人数', target: CONFIG.UPGRADE_CONDITIONS.gold.teamCount, current: user.performance.teamCount, reached: teamReached }
      ],
      canUpgrade,
      note: '满足任一条件即可升级'
    });
  }

  return results;
}

// ==================== 场景模拟函数 ====================

/**
 * 场景1：一级推广（金牌独拿）
 */
function scenario1() {
  console.log('\n========== 场景1：一级推广（金牌独拿） ==========');
  const result = calculateCommission(100, 1);
  console.log(`订单金额: ${result.orderAmount}元`);
  console.log(`公司利润: ${result.companyProfit}元 (80%)`);
  console.log(`佣金池: ${result.commissionPool}元 (20%)`);
  console.log('\n佣金分配:');
  result.distribution.forEach(d => {
    console.log(`  ${d.name}: ${d.amount}元`);
  });
  console.log(`总计: ${result.distribution.reduce((sum, d) => sum + d.amount, 0)}元`);
}

/**
 * 场景2：二级推广（2人分）
 */
function scenario2() {
  console.log('\n========== 场景2：二级推广（2人分） ==========');
  const result = calculateCommission(100, 2);
  console.log(`订单金额: ${result.orderAmount}元`);
  console.log(`公司利润: ${result.companyProfit}元 (80%)`);
  console.log(`佣金池: ${result.commissionPool}元 (20%)`);
  console.log('\n佣金分配:');
  result.distribution.forEach(d => {
    console.log(`  ${d.name}: ${d.amount}元`);
  });
  console.log(`总计: ${result.distribution.reduce((sum, d) => sum + d.amount, 0)}元`);
}

/**
 * 场景3：三级推广（3人分）
 */
function scenario3() {
  console.log('\n========== 场景3：三级推广（3人分） ==========');
  const result = calculateCommission(100, 3);
  console.log(`订单金额: ${result.orderAmount}元`);
  console.log(`公司利润: ${result.companyProfit}元 (80%)`);
  console.log(`佣金池: ${result.commissionPool}元 (20%)`);
  console.log('\n佣金分配:');
  result.distribution.forEach(d => {
    console.log(`  ${d.name}: ${d.amount}元`);
  });
  console.log(`总计: ${result.distribution.reduce((sum, d) => sum + d.amount, 0)}元`);
}

/**
 * 场景4：四级推广（4人分）
 */
function scenario4() {
  console.log('\n========== 场景4：四级推广（4人分） ==========');
  const result = calculateCommission(100, 4);
  console.log(`订单金额: ${result.orderAmount}元`);
  console.log(`公司利润: ${result.companyProfit}元 (80%)`);
  console.log(`佣金池: ${result.commissionPool}元 (20%)`);
  console.log('\n佣金分配:');
  result.distribution.forEach(d => {
    console.log(`  ${d.name}: ${d.amount}元`);
  });
  console.log(`总计: ${result.distribution.reduce((sum, d) => sum + d.amount, 0)}元`);
}

/**
 * 场景5：下级升级
 */
function scenario5() {
  console.log('\n========== 场景5：下级升级（四级→三级） ==========');
  const result = simulateUpgrade(100);

  console.log('\n【升级前】');
  console.log(result.before.description);
  console.log('佣金分配:');
  Object.entries(result.before.summary).forEach(([name, amount]) => {
    console.log(`  ${name}: ${amount}元`);
  });

  console.log('\n【升级后】');
  console.log(result.after.description);
  console.log('佣金分配:');
  Object.entries(result.after.summary).forEach(([name, amount]) => {
    console.log(`  ${name}: ${amount}元`);
  });

  console.log('\n【影响分析】');
  console.log(`D的佣金: ${result.impact.D.before}元 → ${result.impact.D.after}元 (+${result.impact.D.change}元, +${result.impact.D.percent}%)`);
  console.log(`C的佣金: ${result.impact.C.before}元 → ${result.impact.C.after}元 (${result.impact.C.note})`);
}

/**
 * 场景6：升级检查
 */
function scenario6() {
  console.log('\n========== 场景6：升级条件检查 ==========');

  const users = [
    { name: '用户A', level: 4, performance: { totalSales: 15000, monthSales: 0, teamCount: 0 } },
    { name: '用户B', level: 4, performance: { totalSales: 25000, monthSales: 0, teamCount: 0 } },
    { name: '用户C', level: 3, performance: { totalSales: 50000, monthSales: 30000, teamCount: 30 } },
    { name: '用户D', level: 3, performance: { totalSales: 80000, monthSales: 60000, teamCount: 60 } },
    { name: '用户E', level: 2, performance: { totalSales: 150000, monthSales: 80000, teamCount: 150 } },
    { name: '用户F', level: 2, performance: { totalSales: 200000, monthSales: 120000, teamCount: 250 } }
  ];

  users.forEach(user => {
    console.log(`\n【${user.name}】当前等级: ${user.level}级`);
    console.log('业绩:', user.performance);
    const results = checkUpgrade(user);
    results.forEach(r => {
      if (r.conditions) {
        console.log(`升级检查: ${r.from} → ${r.to}`);
        r.conditions.forEach(c => {
          console.log(`  ${c.name}: ${c.current}/${c.target} ${c.reached ? '✓' : '✗'}`);
        });
        console.log(`结果: ${r.canUpgrade ? '✓ 可以升级' : '✗ 暂不能升级'} (${r.note})`);
      } else {
        console.log(`升级检查: ${r.from} → ${r.to}`);
        console.log(`条件: ${r.condition}`);
        console.log(`当前: ${r.current}元`);
        console.log(`结果: ${r.canUpgrade ? '✓ 可以升级' : `✗ 还差${r.gap}元`}`);
      }
    });
  });
}

/**
 * 场景7：自定义订单金额
 */
function scenario7(orderAmount) {
  console.log(`\n========== 场景7：自定义订单金额 ${orderAmount}元 ==========`);

  [1, 2, 3, 4].forEach(level => {
    const result = calculateCommission(orderAmount, level);
    console.log(`\n${level}级推广:`);
    result.distribution.forEach(d => {
      console.log(`  ${d.name}: ${d.amount.toFixed(2)}元`);
    });
  });
}

/**
 * 场景8：连续升级 + 下级跟随升级机制
 *
 * 核心规则：
 * - 4升3：可发展下线（可以招新的四级）
 * - 3升2：之前带的四级可以升级到三级
 * - 2升1：之前带的三级可以升到二级，四级可以升到三级
 */
function scenario8() {
  console.log('\n========== 场景8：连续升级 + 下级跟随升级 ==========');

  console.log('\n【初始状态】');
  console.log('A(一级) → B(二级) → C(三级) → D(四级) → E(四级) → F(四级)');
  console.log('  │         │         │         │         │         │');
  console.log('  └─直接推荐  └─直接推荐  └─直接推荐  └─直接推荐  └─直接推荐');

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('第一步：D从四级升级到三级');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  console.log('\n【D升级后】');
  console.log('A(一级) → B(二级) → C(三级) → D(三级) → E(四级) → F(四级)');
  console.log('                      │         │');
  console.log('                      └─脱离C   └─D现在可以发展下线了！');
  console.log('D的推荐关系：从 C的下级 变成 B的直接下级');
  console.log('C失去了D，但D可以发展新的四级下级');

  console.log('\n✓ D升级到三级后获得的新权益：');
  console.log('  1. 自己推广时拿12元（之前8元，提升50%）');
  console.log('  2. 可以发展新的四级下级');

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('第二步：D从三级升级到二级，C带动E升级');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  console.log('\n【D和C同时升级后】');
  console.log('A(一级) → B(二级) → D(二级) → 新四级');
  console.log('         │         │');
  console.log('         │         └─C(二级) → E(三级) → F(四级)');
  console.log('         │');
  console.log('         └─其他三级下级');

  console.log('\n✓ D升级到二级后获得的新权益：');
  console.log('  1. 自己推广时拿12元，上级A拿8元');
  console.log('  2. 可以发展三级、四级下级');

  console.log('\n✓ C升级到二级（被D带动）：');
  console.log('  - 因为D升级到二级，D之前带的三级（C）可以升级到二级');
  console.log('  - C脱离B，直接成为A的下级');
  console.log('  - C的佣金：从"自己12+B拿4"变成"自己12+A拿8"');
  console.log('  - C可以发展自己的下线：E从四级升到三级');

  console.log('\n✓ E升级到三级（被C带动）：');
  console.log('  - C升级到二级后，C带的四级（E）可以升级到三级');
  console.log('  - E脱离D，成为C的下级');

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('第三步：D从二级升级到一级，带动C和E升级');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  console.log('\n【D升级到一级后】');
  console.log('D(一级) → 新二级 → 新三级 → 新四级');
  console.log('');
  console.log('A(一级) → B(二级) → C(二级) → E(三级) → F(四级)');
  console.log('         │');
  console.log('         └─其他下级');

  console.log('\n✓ D升级到一级后获得的新权益：');
  console.log('  1. 自己推广时独拿20元（之前12元，提升67%）');
  console.log('  2. 可以发展二级、三级、四级下级');
  console.log('  3. 成为总公司，脱离原推荐链');

  console.log('\n✓ C升级到一级（被D带动）：');
  console.log('  - D升级到一级，D之前带的二级（C）可以升级到一级');
  console.log('  - C脱离A，成为独立的总公司');

  console.log('\n✓ E升级到二级（被C带动）：');
  console.log('  - C升级到一级，C之前带的三级（E）可以升级到二级');

  console.log('\n✓ F升级到三级（被E带动）：');
  console.log('  - E升级到二级，E之前带的四级（F）可以升级到三级');

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('【总结：跟随升级机制】');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  console.log('\n┌─────────┬─────────────────────────────────────┐');
  console.log('│ 上级升级 │ 下级跟随升级规则                  │');
  console.log('├─────────┼─────────────────────────────────────┤');
  console.log('│ 4→3     │ 无下级跟随                        │');
  console.log('│ 3→2     │ 之前带的4级 → 3级                 │');
  console.log('│ 2→1     │ 之前带的3级 → 2级，4级 → 3级       │');
  console.log('└─────────┴─────────────────────────────────────┘');

  console.log('\n💡 核心逻辑：');
  console.log('  上级升级后，他原来的直接下级可以跟随升级，');
  console.log('  但升级后会脱离原推荐链，成为上级的上级或平级。');
  console.log('  这就是"下级升级脱离上级"的例外情况——跟随升级。');

  // 模拟佣金变化
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('【佣金变化对比】(以100元订单为例)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const users = {
    D: {
      level4: calculateCommission(100, 4).distribution[0].amount,
      level3: calculateCommission(100, 3).distribution[0].amount,
      level2: calculateCommission(100, 2).distribution[0].amount,
      level1: calculateCommission(100, 1).distribution[0].amount
    },
    E: {
      level4: calculateCommission(100, 4).distribution[0].amount,
      level3: calculateCommission(100, 3).distribution[0].amount,
      level2: calculateCommission(100, 2).distribution[0].amount
    },
    F: {
      level4: calculateCommission(100, 4).distribution[0].amount,
      level3: calculateCommission(100, 3).distribution[0].amount
    }
  };

  console.log('\n【D的佣金变化】');
  console.log(`  四级: ${users.D.level4}元`);
  console.log(`  三级: ${users.D.level3}元 (+${users.D.level3 - users.D.level4}元, +${((users.D.level3 - users.D.level4) / users.D.level4 * 100).toFixed(1)}%)`);
  console.log(`  二级: ${users.D.level2}元 (保持${users.D.level2}元，但上级从多人变成一人)`);
  console.log(`  一级: ${users.D.level1}元 (+${users.D.level1 - users.D.level2}元, +${((users.D.level1 - users.D.level2) / users.D.level2 * 100).toFixed(1)}%)`);

  console.log('\n【E的佣金变化】（被C带动升级）');
  console.log(`  四级: ${users.E.level4}元`);
  console.log(`  三级: ${users.E.level3}元 (+${users.E.level3 - users.E.level4}元, +${((users.E.level3 - users.E.level4) / users.E.level4 * 100).toFixed(1)}%)`);
  console.log(`  二级: ${users.E.level2}元 (被C带动后)`);

  console.log('\n【F的佣金变化】（被E带动升级）');
  console.log(`  四级: ${users.F.level4}元`);
  console.log(`  三级: ${users.F.level3}元 (+${users.F.level3 - users.F.level4}元, +${((users.F.level3 - users.F.level4) / users.F.level4 * 100).toFixed(1)}%)`);
}

// ==================== 主函数 ====================

function main() {
  console.log('========================================');
  console.log('   大友元气推广体系 - 场景模拟器');
  console.log('========================================');

  const args = process.argv.slice(2);
  const scenario = args[0];

  if (scenario === '8' || scenario === 'upgrade') {
    // 运行连续升级场景
    scenario8();
  } else if (scenario && !isNaN(scenario)) {
    // 运行自定义金额场景
    scenario7(parseFloat(scenario));
  } else {
    // 运行所有预设场景
    scenario1();
    scenario2();
    scenario3();
    scenario4();
    scenario5();
    scenario6();
    scenario7(288);
    scenario8();
  }

  console.log('\n========================================');
  console.log('  模拟完成');
  console.log('========================================\n');

  // 输出总结表格
  console.log('\n【佣金分配速查表】(以100元订单为例)');
  console.log('┌──────────┬────┬────┬────┬────┬──────┐');
  console.log('│ 推广人等级│自己│一级│二级│三级│ 总计 │');
  console.log('├──────────┼────┼────┼────┼────┼──────┤');
  console.log('│ 一级推广  │20元│ -  │ -  │ -  │ 20元 │');
  console.log('│ 二级推广  │12元│8元 │ -  │ -  │ 20元 │');
  console.log('│ 三级推广  │12元│4元 │4元 │ -  │ 20元 │');
  console.log('│ 四级推广  │8元 │4元 │4元 │4元 │ 20元 │');
  console.log('└──────────┴────┴────┴────┴────┴──────┘');

  console.log('\n【运行方式】');
  console.log('  node scripts/promotion-simulator.js          # 运行所有场景');
  console.log('  node scripts/promotion-simulator.js 8        # 只运行连续升级场景');
  console.log('  node scripts/promotion-simulator.js 288      # 自定义订单金额');
}

// 运行
if (require.main === module) {
  main();
}

module.exports = {
  calculateCommission,
  simulateUpgrade,
  checkUpgrade,
  CONFIG
};
