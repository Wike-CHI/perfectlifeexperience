/**
 * 核心佣金计算测试
 * Core Commission Calculation Tests
 */

const { calculateAllRewards, checkPromotion, checkAndResetMonthlyPerformance, config } = require('./calculation-engine');

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function printDivider() {
  log('═'.repeat(80), 'cyan');
}

function printSection(title) {
  printDivider();
  log(`\n  ${title}\n`, 'blue');
  printDivider();
}

/**
 * 断言函数
 */
function assertEqual(actual, expected, description) {
  // 如果两者都是字符串，直接比较
  if (typeof actual === 'string' && typeof expected === 'string') {
    if (actual === expected) {
      log(`  ✓ ${description}: ${actual}`, 'green');
      return true;
    } else {
      log(`  ✗ ${description}: 期望 ${expected}, 实际 ${actual}`, 'red');
      return false;
    }
  }

  // 否则转为数字比较
  const actualNum = Number(actual);
  const expectedNum = Number(expected);

  if (actualNum === expectedNum && !isNaN(actualNum) && !isNaN(expectedNum)) {
    log(`  ✓ ${description}: ${actualNum}`, 'green');
    return true;
  } else {
    log(`  ✗ ${description}: 期望 ${expectedNum}, 实际 ${actualNum}`, 'red');
    return false;
  }
}

/**
 * 测试场景 1: 完整的4级代理链 - 基础佣金
 */
function testScenario1_FourLevelChain() {
  printSection('场景 1: 完整的4级代理链 - 基础佣金分配');

  const amount = 10000; // 100元（分）
  const isRepurchase = false;

  const superiors = [
    { userId: 'agent1', agentLevel: 4, starLevel: 0, mentorId: null },  // 四级代理
    { userId: 'agent2', agentLevel: 3, starLevel: 0, mentorId: null },  // 三级代理
    { userId: 'agent3', agentLevel: 2, starLevel: 0, mentorId: null },  // 二级代理
    { userId: 'agent4', agentLevel: 1, starLevel: 0, mentorId: null }   // 一级代理
  ];

  const rewards = calculateAllRewards({ amount, superiors, isRepurchase });

  log(`\n订单金额: ${amount / 100} 元`, 'yellow');
  log(`上级数量: ${superiors.length} 级\n`, 'yellow');

  // 预期结果
  const expected = {
    agent4: 1000,  // 一级代理: 10% = 10元 = 1000分
    agent3: 600,   // 二级代理: 6% = 6元 = 600分
    agent2: 300,   // 三级代理: 3% = 3元 = 300分
    agent1: 100    // 四级代理: 1% = 1元 = 100分
  };

  let allPassed = true;

  // 验证基础佣金
  superiors.forEach(superior => {
    const agentRewards = rewards.filter(r => r.userId === superior.userId && r.type === 'basic');
    const actual = agentRewards.reduce((sum, r) => sum + r.amount, 0);
    const expectedAmount = expected[superior.userId];

    allPassed &= assertEqual(actual, expectedAmount,
      `${superior.userId} (${superior.agentLevel}级代理) 基础佣金`);
  });

  const totalActual = rewards.reduce((sum, r) => sum + r.amount, 0);
  const totalExpected = 2000; // 总佣金 20元 = 2000分

  log('', 'yellow');
  allPassed &= assertEqual(totalActual, totalExpected, '总佣金金额');

  log(`\n奖励明细:`, 'yellow');
  rewards.forEach(reward => {
    log(`  - ${reward.userId}: ${reward.type} ${reward.amount / 100} 元 (${reward.rate}%)`, 'cyan');
  });

  return allPassed;
}

/**
 * 测试场景 2: 复购奖励
 */
function testScenario2_RepurchaseReward() {
  printSection('场景 2: 复购奖励 - 铜牌/银牌推广员');

  const amount = 10000; // 100元
  const isRepurchase = true;

  const superiors = [
    { userId: 'agent1', agentLevel: 4, starLevel: 1, mentorId: null },  // 四级代理(铜牌)
    { userId: 'agent2', agentLevel: 3, starLevel: 2, mentorId: null },  // 三级代理(银牌)
    { userId: 'agent3', agentLevel: 2, starLevel: 0, mentorId: null },  // 二级代理(普通)
    { userId: 'agent4', agentLevel: 1, starLevel: 2, mentorId: null }   // 一级代理(银牌)
  ];

  const rewards = calculateAllRewards({ amount, superiors, isRepurchase });

  log(`\n订单金额: ${amount / 100} 元`, 'yellow');
  log(`是否复购: ${isRepurchase ? '是' : '否'}\n`, 'yellow');

  let allPassed = true;

  // 验证复购奖励（只奖励星级≥1的上级）
  const expectedRepurchase = {
    agent1: 300,  // 铜牌: 3% = 3元
    agent2: 300,  // 银牌: 3% = 3元
    agent3: 0,    // 普通: 0元
    agent4: 300   // 银牌: 3% = 3元
  };

  superiors.forEach(superior => {
    const repurchaseRewards = rewards.filter(r => r.userId === superior.userId && r.type === 'repurchase');
    const actual = repurchaseRewards.reduce((sum, r) => sum + r.amount, 0);
    const expectedAmount = expectedRepurchase[superior.userId];

    allPassed &= assertEqual(actual, expectedAmount,
      `${superior.userId} (星级${superior.starLevel}) 复购奖励`);
  });

  log(`\n复购奖励明细:`, 'yellow');
  rewards.filter(r => r.type === 'repurchase').forEach(reward => {
    log(`  - ${reward.userId}: ${reward.amount / 100} 元`, 'cyan');
  });

  return allPassed;
}

/**
 * 测试场景 3: 团队管理奖 - 级差算法
 */
function testScenario3_ManagementReward() {
  printSection('场景 3: 团队管理奖 - 级差算法验证');

  const amount = 10000; // 100元
  const isRepurchase = false;

  const superiors = [
    { userId: 'agent1', agentLevel: 4, starLevel: 2, mentorId: null },  // 四级代理(银牌)
    { userId: 'agent2', agentLevel: 3, starLevel: 2, mentorId: null },  // 三级代理(银牌)
    { userId: 'agent3', agentLevel: 2, starLevel: 1, mentorId: null },  // 二级代理(铜牌)
    { userId: 'agent4', agentLevel: 1, starLevel: 2, mentorId: null }   // 一级代理(银牌)
  ];

  const rewards = calculateAllRewards({ amount, superiors, isRepurchase });

  log(`\n订单金额: ${amount / 100} 元`, 'yellow');
  log(`管理奖规则: 星级≥2的上级中，第一个获得全部2%\n`, 'yellow');

  let allPassed = true;

  // 验证管理奖（只奖励第一个星级≥2的上级）
  const managementRewards = rewards.filter(r => r.type === 'management');

  if (managementRewards.length === 1) {
    const reward = managementRewards[0];
    log(`\n✓ 管理奖分配给: ${reward.userId} (星级${reward.starLevel})`, 'green');
    allPassed &= assertEqual(reward.amount, 200, '管理奖金额 (2% = 2元)');
  } else {
    log(`\n✗ 管理奖分配错误: 期望1个，实际${managementRewards.length}个`, 'red');
    allPassed = false;
  }

  log(`\n管理奖明细:`, 'yellow');
  if (managementRewards.length > 0) {
    managementRewards.forEach(reward => {
      log(`  - ${reward.userId}: ${reward.amount / 100} 元 (星级${reward.starLevel})`, 'cyan');
    });
  } else {
    log(`  - 无管理奖`, 'yellow');
  }

  return allPassed;
}

/**
 * 测试场景 4: 综合场景 - 四重分润同时计算
 */
function testScenario4_Comprehensive() {
  printSection('场景 4: 综合场景 - 四重分润同时计算');

  const amount = 10000; // 100元
  const isRepurchase = true;

  const superiors = [
    { userId: 'agent1', agentLevel: 4, starLevel: 1, mentorId: 'agent4' },  // 四级代理(铜牌, 导师=agent4)
    { userId: 'agent2', agentLevel: 3, starLevel: 2, mentorId: null },  // 三级代理(银牌)
    { userId: 'agent3', agentLevel: 2, starLevel: 0, mentorId: null },  // 二级代理(普通)
    { userId: 'agent4', agentLevel: 1, starLevel: 2, mentorId: null }   // 一级代理(银牌, 是agent1的导师)
  ];

  const rewards = calculateAllRewards({ amount, superiors, isRepurchase });

  log(`\n订单金额: ${amount / 100} 元`, 'yellow');
  log(`是否复购: ${isRepurchase ? '是' : '否'}`, 'yellow');
  log(`agent1 的导师: agent4 (直属下级是agent1)\n`, 'yellow');

  let allPassed = true;

  // 预期结果 (agent1是直属代理, agent4是agent1的导师)
  const expected = {
    agent1: { basic: 100, repurchase: 300, management: 0, nurture: 0, total: 400 },   // 4级, 星1
    agent2: { basic: 300, repurchase: 300, management: 200, nurture: 0, total: 800 },  // 3级, 星2 (第一个星级≥2, 获得管理奖)
    agent3: { basic: 600, repurchase: 0, management: 0, nurture: 0, total: 600 },     // 2级, 星0
    agent4: { basic: 1000, repurchase: 300, management: 0, nurture: 200, total: 1500 } // 1级, 星2, 导师(获得育成津贴)
  };

  log(`\n预期总奖励: ${Object.values(expected).reduce((sum, e) => sum + e.total, 0) / 100} 元 (33%)\n`, 'yellow');

  superiors.forEach(superior => {
    const agentRewards = rewards.filter(r => r.userId === superior.userId);
    const actual = {
      basic: agentRewards.filter(r => r.type === 'basic').reduce((sum, r) => sum + r.amount, 0),
      repurchase: agentRewards.filter(r => r.type === 'repurchase').reduce((sum, r) => sum + r.amount, 0),
      management: agentRewards.filter(r => r.type === 'management').reduce((sum, r) => sum + r.amount, 0),
      nurture: agentRewards.filter(r => r.type === 'nurture').reduce((sum, r) => sum + r.amount, 0),
      total: 0
    };
    actual.total = actual.basic + actual.repurchase + actual.management + actual.nurture;

    const exp = expected[superior.userId];

    log(`${superior.userId} (代理${superior.agentLevel}级, 星${superior.starLevel}):`, 'cyan');
    allPassed &= assertEqual(actual.basic, exp.basic, `    基础佣金`);
    allPassed &= assertEqual(actual.repurchase, exp.repurchase, `    复购奖励`);
    allPassed &= assertEqual(actual.management, exp.management, `    管理奖`);
    allPassed &= assertEqual(actual.nurture, exp.nurture, `    育成津贴`);
    allPassed &= assertEqual(actual.total, exp.total, `    总计`);
    log('');
  });

  const totalActual = rewards.reduce((sum, r) => sum + r.amount, 0);
  const totalExpected = 3300; // 33元 = 3300分

  log(`总奖励:`, 'yellow');
  allPassed &= assertEqual(totalActual, totalExpected, '  四重分润总计');

  return allPassed;
}

/**
 * 测试场景 5: 晋升逻辑 - 铜牌晋升
 */
function testScenario5_Promotion_Bronze() {
  printSection('场景 5: 晋升逻辑 - 铜牌晋升条件');

  let allPassed = true;

  // 场景 5.1: 销售额达标
  log('\n场景 5.1: 累计销售额达标', 'yellow');
  const performance1 = {
    totalSales: 1900000,  // 19,000元
    monthSales: 0,
    monthTag: '2026-02',
    directCount: 10,
    teamCount: 10
  };

  const result1 = checkPromotion(performance1, 0);
  log(`  当前累计销售: ${performance1.totalSales / 100} 元`, 'cyan');
  log(`  晋升结果: ${result1.shouldPromote ? '成功' : '失败'}`, 'cyan');

  allPassed &= assertEqual(result1.shouldPromote, false, '  晋升前 (未达标)');

  // 完成一笔1000元订单
  const newPerformance1 = checkAndResetMonthlyPerformance(performance1, 100000);
  const result2 = checkPromotion(newPerformance1, 0);
  log(`  完成订单后累计销售: ${newPerformance1.totalSales / 100} 元`, 'cyan');
  allPassed &= assertEqual(result2.shouldPromote, true, '  晋升后 (达标)');
  log(`  晋升原因: ${result2.reason}\n`, 'cyan');

  // 场景 5.2: 人数达标
  log('场景 5.2: 直推人数达标', 'yellow');
  const performance2 = {
    totalSales: 500000,  // 5,000元
    monthSales: 0,
    monthTag: '2026-02',
    directCount: 29,
    teamCount: 29
  };

  const result3 = checkPromotion(performance2, 0);
  log(`  当前直推人数: ${performance2.directCount} 人`, 'cyan');
  allPassed &= assertEqual(result3.shouldPromote, false, '  晋升前 (未达标)');

  // 推荐第30个用户
  const newPerformance2 = { ...performance2, directCount: 30, teamCount: 30 };
  const result4 = checkPromotion(newPerformance2, 0);
  log(`  推荐后直推人数: ${newPerformance2.directCount} 人`, 'cyan');
  allPassed &= assertEqual(result4.shouldPromote, true, '  晋升后 (达标)');
  log(`  晋升原因: ${result4.reason}\n`, 'cyan');

  return allPassed;
}

/**
 * 测试场景 6: 跨月业绩重置
 */
function testScenario6_MonthlyReset() {
  printSection('场景 6: 跨月业绩重置');

  let allPassed = true;

  const performance = {
    monthTag: '2026-01',
    monthSales: 5000000,  // 50,000元 (1月)
    totalSales: 10000000, // 100,000元
    directCount: 50,
    teamCount: 100
  };

  log(`\n1月业绩:`, 'yellow');
  log(`  本月销售: ${performance.monthSales / 100} 元`, 'cyan');
  log(`  累计销售: ${performance.totalSales / 100} 元`, 'cyan');
  log(`  月份标签: ${performance.monthTag}\n`, 'cyan');

  // 2月完成一笔2000元订单
  const newPerformance = checkAndResetMonthlyPerformance(performance, 200000);

  log(`2月完成订单后:`, 'yellow');
  log(`  新订单金额: 2,000 元`, 'cyan');
  log(`  本月销售: ${newPerformance.monthSales / 100} 元`, 'cyan');
  log(`  累计销售: ${newPerformance.totalSales / 100} 元`, 'cyan');
  log(`  月份标签: ${newPerformance.monthTag}`, 'cyan');
  log(`  是否重置: ${newPerformance.reset ? '是' : '否'}\n`, 'cyan');

  allPassed &= assertEqual(String(newPerformance.monthTag), '2026-02', '月份标签更新');
  allPassed &= assertEqual(newPerformance.monthSales, 200000, '本月销售额重置');
  allPassed &= assertEqual(newPerformance.totalSales, 10200000, '累计销售额累加');
  allPassed &= assertEqual(newPerformance.reset, true, '触发重置标志');

  return allPassed;
}

/**
 * 主测试运行器
 */
function runAllTests() {
  log('\n' + '█'.repeat(80), 'blue');
  log('分销系统核心佣金计算测试', 'blue');
  log('Promotion System Core Commission Calculation Tests', 'blue');
  log('█'.repeat(80) + '\n', 'blue');

  const results = [];

  results.push({ name: '场景 1: 4级代理链基础佣金', passed: testScenario1_FourLevelChain() });
  results.push({ name: '场景 2: 复购奖励', passed: testScenario2_RepurchaseReward() });
  results.push({ name: '场景 3: 团队管理奖', passed: testScenario3_ManagementReward() });
  results.push({ name: '场景 4: 综合分润', passed: testScenario4_Comprehensive() });
  results.push({ name: '场景 5: 晋升逻辑', passed: testScenario5_Promotion_Bronze() });
  results.push({ name: '场景 6: 跨月重置', passed: testScenario6_MonthlyReset() });

  // 测试总结
  printSection('测试总结');

  const passed = results.filter(r => r.passed).length;
  const total = results.length;

  log(`\n总测试数: ${total}`, 'yellow');
  log(`通过: ${passed}`, 'green');
  log(`失败: ${total - passed}`, total === passed ? 'green' : 'red');
  log(`通过率: ${((passed / total) * 100).toFixed(1)}%\n`, 'yellow');

  results.forEach(result => {
    const status = result.passed ? '✓' : '✗';
    const color = result.passed ? 'green' : 'red';
    log(`  ${status} ${result.name}`, color);
  });

  log('\n' + '█'.repeat(80) + '\n', 'blue');

  return passed === total;
}

// 运行测试
if (require.main === module) {
  const success = runAllTests();
  process.exit(success ? 0 : 1);
}

module.exports = { runAllTests };
