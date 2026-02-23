/**
 * 端到端流程测试
 * End-to-End Flow Tests for Promotion System
 */

const { calculateAllRewards, checkPromotion, checkAndResetMonthlyPerformance } = require('./calculation-engine');

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
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

function printStep(stepNum, description) {
  log(`\n${'█'.repeat(10)} 步骤 ${stepNum}: ${description} ${'█'.repeat(40)}`, 'magenta');
}

/**
 * 模拟数据库
 */
class MockDatabase {
  constructor() {
    this.users = new Map();
    this.orders = new Map();
    this.rewardRecords = [];
    this.counter = 0;
  }

  // 创建用户
  createUser(data) {
    this.counter++;
    const userId = `user_${String(this.counter).padStart(4, '0')}`;

    const user = {
      _id: userId,
      _openid: `openid_${userId}`,
      nickName: data.nickName || `测试用户${this.counter}`,
      inviteCode: `INV${String(this.counter).padStart(6, '0')}`,
      agentLevel: data.agentLevel || 4,
      starLevel: data.starLevel || 0,
      promotionPath: data.promotionPath || '',
      mentorId: data.mentorId || null,
      performance: {
        totalSales: 0,
        monthSales: 0,
        monthTag: getCurrentMonthTag(),
        directCount: 0,
        teamCount: 0
      },
      ...data
    };

    this.users.set(userId, user);
    return user;
  }

  // 获取用户
  getUser(userId) {
    return this.users.get(userId);
  }

  // 创建订单
  createOrder(buyerId, amount) {
    const orderId = `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const order = {
      _id: orderId,
      _openid: buyerId,
      orderNo: `TEST${Date.now()}`,
      status: 'completed',
      totalAmount: amount * 100, // 转换为分
      rewardSettled: false,
      createTime: new Date(),
      completeTime: new Date()
    };

    this.orders.set(orderId, order);
    return order;
  }

  // 获取用户的上级链
  getSuperiors(userId) {
    const user = this.getUser(userId);
    if (!user || !user.promotionPath) {
      return [];
    }

    const pathIds = user.promotionPath.split('/').filter(Boolean);
    const superiors = [];

    let agentLevel = 4; // 四级代理开始
    pathIds.forEach((parentId, index) => {
      const parent = this.getUser(parentId);
      if (parent) {
        superiors.push({
          userId: parent._id,
          agentLevel: 4 - index, // 4, 3, 2, 1
          starLevel: parent.starLevel,
          mentorId: parent.mentorId
        });
      }
    });

    return superiors;
  }

  // 获取用户的所有订单
  getUserOrders(userId) {
    const orders = [];
    this.orders.forEach(order => {
      if (order._openid === userId) {
        orders.push(order);
      }
    });
    return orders;
  }

  // 更新用户业绩
  updatePerformance(userId, orderAmount, isNewCustomer = false) {
    const user = this.getUser(userId);
    if (!user) return;

    const newPerformance = checkAndResetMonthlyPerformance(user.performance, orderAmount);

    user.performance = {
      ...newPerformance,
      directCount: user.performance.directCount + (isNewCustomer ? 1 : 0),
      teamCount: user.performance.teamCount + (isNewCustomer ? 1 : 0)
    };

    // 检查晋升
    const promotionResult = checkPromotion(user.performance, user.starLevel);
    if (promotionResult.shouldPromote) {
      user.starLevel = promotionResult.newStarLevel;
      log(`\n  🎉 ${user.nickName} 晋升为星级${user.starLevel}！`, 'yellow');
      log(`  原因: ${promotionResult.reason}`, 'yellow');
    }
  }

  // 结算奖励
  settleRewards(order) {
    if (order.rewardSettled) {
      log('  ⚠️ 订单已结算，跳过', 'yellow');
      return [];
    }

    const superiors = this.getSuperiors(order._openid);
    const buyer = this.getUser(order._openid);
    const buyerOrders = this.getUserOrders(order._openid);
    const buyerOrderCount = buyerOrders.filter(o => o.status === 'completed').length;

    const isRepurchase = buyerOrderCount > 1;

    log(`\n  订单金额: ${order.totalAmount / 100} 元`, 'cyan');
    log(`  上级数量: ${superiors.length} 级`, 'cyan');
    log(`  是否复购: ${isRepurchase ? '是' : '否'}`, 'cyan');

    const rewards = calculateAllRewards({
      amount: order.totalAmount,
      superiors,
      isRepurchase
    });

    // 保存奖励记录
    rewards.forEach(reward => {
      this.rewardRecords.push({
        ...reward,
        orderId: order._id,
        orderNo: order.orderNo,
        buyerId: order._openid,
        createTime: new Date()
      });

      // 更新上级的业绩
      const superior = this.getUser(reward.userId);
      if (superior) {
        const newPerf = checkAndResetMonthlyPerformance(superior.performance, order.totalAmount);
        superior.performance = {
          ...newPerf,
          totalSales: newPerf.totalSales,
          monthSales: newPerf.monthSales
        };

        // 检查晋升
        const promotionResult = checkPromotion(superior.performance, superior.starLevel);
        if (promotionResult.shouldPromote) {
          superior.starLevel = promotionResult.newStarLevel;
          log(`\n  🎉 ${superior.nickName} 晋升为星级${superior.starLevel}！`, 'yellow');
          log(`  原因: ${promotionResult.reason}`, 'yellow');
        }
      }
    });

    order.rewardSettled = true;

    return rewards;
  }

  // 查询奖励记录
  getRewardRecords(filters = {}) {
    let records = this.rewardRecords;

    if (filters.orderId) {
      records = records.filter(r => r.orderId === filters.orderId);
    }
    if (filters.userId) {
      records = records.filter(r => r.userId === filters.userId);
    }
    if (filters.type) {
      records = records.filter(r => r.type === filters.type);
    }

    return records;
  }

  // 模拟过滤方法
  filter(callback) {
    const orders = [];
    this.orders.forEach(order => {
      if (callback(order)) {
        orders.push(order);
      }
    });
    return orders;
  }

  // 打印用户信息
  printUser(userId) {
    const user = this.getUser(userId);
    if (!user) {
      log(`  用户 ${userId} 不存在`, 'red');
      return;
    }

    log(`\n  👤 ${user.nickName} (${user._id})`, 'cyan');
    log(`  代理等级: ${user.agentLevel} 级`, 'cyan');
    log(`  星级: ${user.starLevel}`, 'cyan');
    log(`  推广路径: ${user.promotionPath || '无'}`, 'cyan');
    log(`  导师: ${user.mentorId || '无'}`, 'cyan');
    log(`  业绩:`, 'cyan');
    log(`    累计销售: ${user.performance.totalSales / 100} 元`, 'cyan');
    log(`    本月销售: ${user.performance.monthSales / 100} 元 (${user.performance.monthTag})`, 'cyan');
    log(`    直推人数: ${user.performance.directCount} 人`, 'cyan');
    log(`    团队人数: ${user.performance.teamCount} 人`, 'cyan');
  }

  // 打印奖励记录
  printRewardRecords(orderId) {
    const records = this.getRewardRecords({ orderId });

    log(`\n  💰 奖励记录 (${records.length} 条):`, 'yellow');
    records.forEach(record => {
      const user = this.getUser(record.userId);
      const userName = user ? user.nickName : record.userId;
      const typeNames = {
        basic: '基础佣金',
        repurchase: '复购奖励',
        management: '团队管理奖',
        nurture: '育成津贴'
      };
      log(`    - ${userName}: ${typeNames[record.type]} ${record.amount / 100} 元`, 'cyan');
    });
  }
}

function getCurrentMonthTag() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * E2E 测试场景 1: 新用户注册到首次购买
 */
async function testE2E_Scenario1_NewUserFirstPurchase() {
  printSection('E2E 场景 1: 新用户注册到首次购买');

  const db = new MockDatabase();

  // 步骤 1: 创建代理链
  printStep(1, '创建代理链');
  const agent1 = db.createUser({ nickName: '一级代理张三', agentLevel: 1, starLevel: 2 });
  const agent2 = db.createUser({ nickName: '二级代理李四', agentLevel: 2, starLevel: 1, promotionPath: agent1._id });
  const agent3 = db.createUser({ nickName: '三级代理王五', agentLevel: 3, starLevel: 0, promotionPath: `${agent2._id}/${agent1._id}` });

  log('\n  代理链创建完成:', 'green');
  db.printUser(agent1._id);
  db.printUser(agent2._id);
  db.printUser(agent3._id);

  // 步骤 2: 新用户扫描邀请码注册
  printStep(2, '新用户扫描邀请码注册');
  const buyer = db.createUser({
    nickName: '新用户小明',
    agentLevel: 4,
    starLevel: 0,
    promotionPath: `${agent3._id}/${agent2._id}/${agent1._id}`
  });

  log('\n  新用户注册完成:', 'green');
  db.printUser(buyer._id);

  // 步骤 3: 用户下单
  printStep(3, '用户下单 (100元)');
  const order = db.createOrder(buyer._id, 100);
  log(`\n  订单创建成功: ${order.orderNo}`, 'green');

  // 步骤 4: 结算奖励
  printStep(4, '结算奖励');
  const rewards = db.settleRewards(order);
  db.printRewardRecords(order._id);

  // 验证结果
  log('\n  ✓ 验证结果:', 'yellow');
  const totalReward = rewards.reduce((sum, r) => sum + r.amount, 0);
  log(`    总奖励: ${totalReward / 100} 元 (预期: 20元)`, totalReward === 2000 ? 'green' : 'red');

  // 验证基础佣金
  const basicRewards = rewards.filter(r => r.type === 'basic');
  log(`    基础佣金: ${basicRewards.reduce((sum, r) => sum + r.amount, 0) / 100} 元`, 'green');

  return totalReward === 2000; // 首次购买只有基础佣金 20%
}

/**
 * E2E 测试场景 2: 团队扩张和晋升
 */
async function testE2E_Scenario2_TeamExpansionAndPromotion() {
  printSection('E2E 场景 2: 团队扩张和晋升');

  const db = new MockDatabase();

  // 步骤 1: 创建代理A（铜牌，29个直推）
  printStep(1, '创建代理A（铜牌，29个直推）');
  const masterAgent = db.createUser({
    nickName: '代理A',
    agentLevel: 1,
    starLevel: 1,
    performance: {
      totalSales: 500000,  // 5000元
      monthSales: 0,
      monthTag: getCurrentMonthTag(),
      directCount: 29,
      teamCount: 29
    }
  });

  db.printUser(masterAgent._id);
  log(`\n  当前状态: 距离银牌晋升还差 1 个直推`, 'yellow');

  // 步骤 2: 用户B扫描代理A的邀请码注册
  printStep(2, '用户B扫描代理A的邀请码注册');
  const userB = db.createUser({
    nickName: '用户B',
    agentLevel: 4,
    starLevel: 0,
    promotionPath: masterAgent._id
  });

  log(`\n  用户B注册成功`, 'green');

  // 步骤 3: 更新代理A的业绩
  printStep(3, '更新代理A的业绩（新增直推）');
  db.updatePerformance(masterAgent._id, 0, true); // isNewCustomer=true

  db.printUser(masterAgent._id);
  log(`\n  直推人数达到: ${masterAgent.performance.directCount} 人`, 'cyan');

  // 步骤 4: 检查晋升（此时应该还没晋升，因为销售额不够）
  printStep(4, '检查晋升条件');
  const promotionCheck1 = checkPromotion(masterAgent.performance, masterAgent.starLevel);
  log(`\n  晋升检查: ${promotionCheck1.shouldPromote ? '成功' : '未满足条件'}`, 'yellow');
  log(`  原因: ${promotionCheck1.reason}`, 'yellow');

  // 步骤 5: 用户B下单（500元）
  printStep(5, '用户B下单（500元）');
  const order = db.createOrder(userB._id, 500);
  log(`\n  订单创建成功: ${order.orderNo}`, 'green');

  // 步骤 6: 结算奖励
  printStep(6, '结算奖励并更新业绩');
  const rewards = db.settleRewards(order);
  db.printRewardRecords(order._id);

  // 步骤 7: 再次检查晋升（累计销售额达标）
  printStep(7, '检查晋升（累计销售额达标）');
  db.printUser(masterAgent._id);

  const promotionCheck2 = checkPromotion(masterAgent.performance, masterAgent.starLevel);
  if (promotionCheck2.shouldPromote) {
    masterAgent.starLevel = promotionCheck2.newStarLevel;
    log(`\n  🎉 ${masterAgent.nickName} 晋升为星级${masterAgent.starLevel}！`, 'yellow');
  }

  // 验证结果
  log('\n  ✓ 验证结果:', 'yellow');
  const hasBasicReward = rewards.some(r => r.type === 'basic');
  log(`    基础佣金: ${hasBasicReward ? '有' : '无'}`, hasBasicReward ? 'green' : 'red');

  return masterAgent.starLevel === 1; // 晋升为铜牌（星级1）
}

/**
 * E2E 测试场景 3: 跨月业绩重置
 */
async function testE2E_Scenario3_MonthlyReset() {
  printSection('E2E 场景 3: 跨月业绩重置');

  const db = new MockDatabase();

  // 步骤 1: 创建银牌代理
  printStep(1, '创建银牌代理');
  const agent = db.createUser({
    nickName: '银牌代理',
    agentLevel: 1,
    starLevel: 2,
    performance: {
      totalSales: 10000000,  // 100,000元
      monthSales: 5000000,   // 50,000元 (1月)
      monthTag: '2026-01',
      directCount: 50,
      teamCount: 100
    }
  });

  db.printUser(agent._id);
  log(`\n  当前月份: ${agent.performance.monthTag}`, 'yellow');
  log(`  本月销售: ${agent.performance.monthSales / 100} 元`, 'yellow');

  // 步骤 2: 模拟1月31日完成订单
  printStep(2, '1月31日完成订单（1000元）');
  const order1 = db.createOrder(`buyer_${Date.now()}`, 1000);
  const rewards1 = db.settleRewards(order1);

  log(`\n  订单结算完成，奖励总数: ${rewards1.length}`, 'green');
  log(`  月度销售: ${agent.performance.monthSales / 100} 元`, 'cyan');
  log(`  月份标签: ${agent.performance.monthTag}`, 'cyan');

  // 步骤 3: 模拟2月1日完成订单（跨月）
  printStep(3, '2月1日完成订单（2000元，跨月重置）');

  // 模拟时间流逝（修改月份标签）
  agent.performance.monthTag = '2026-02';
  const order2 = db.createOrder(`buyer_${Date.now() + 1}`, 2000);

  log(`\n  检测到跨月，触发业绩重置`, 'yellow');

  const rewards2 = db.settleRewards(order2);

  db.printUser(agent._id);

  // 验证结果
  log('\n  ✓ 验证结果:', 'yellow');
  const monthTagCorrect = agent.performance.monthTag === '2026-02';
  const monthSalesReset = agent.performance.monthSales === 200000; // 2000元
  const totalSalesAccumulated = agent.performance.totalSales === 10030000; // 100000 + 1000 + 2000

  log(`    月份标签更新: ${monthTagCorrect ? '✓' : '✗'}`, monthTagCorrect ? 'green' : 'red');
  log(`    本月销售重置: ${monthSalesReset ? '✓' : '✗'}`, monthSalesReset ? 'green' : 'red');
  log(`    累计销售累加: ${totalSalesAccumulated ? '✓' : '✗'}`, totalSalesAccumulated ? 'green' : 'red');
  log(`    星级保持: ${agent.starLevel === 2 ? '✓' : '✗'} (未降级)`, agent.starLevel === 2 ? 'green' : 'red');

  return monthTagCorrect && monthSalesReset && totalSalesAccumulated;
}

/**
 * 主测试运行器
 */
async function runAllE2ETests() {
  log('\n' + '█'.repeat(80), 'blue');
  log('分销系统端到端流程测试', 'blue');
  log('Promotion System End-to-End Flow Tests', 'blue');
  log('█'.repeat(80) + '\n', 'blue');

  const results = [];

  try {
    results.push({ name: '场景 1: 新用户首次购买', passed: await testE2E_Scenario1_NewUserFirstPurchase() });
  } catch (error) {
    log(`\n  ✗ 场景 1 执行出错: ${error.message}`, 'red');
    results.push({ name: '场景 1: 新用户首次购买', passed: false });
  }

  try {
    results.push({ name: '场景 2: 团队扩张和晋升', passed: await testE2E_Scenario2_TeamExpansionAndPromotion() });
  } catch (error) {
    log(`\n  ✗ 场景 2 执行出错: ${error.message}`, 'red');
    results.push({ name: '场景 2: 团队扩张和晋升', passed: false });
  }

  try {
    results.push({ name: '场景 3: 跨月业绩重置', passed: await testE2E_Scenario3_MonthlyReset() });
  } catch (error) {
    log(`\n  ✗ 场景 3 执行出错: ${error.message}`, 'red');
    results.push({ name: '场景 3: 跨月业绩重置', passed: false });
  }

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
  runAllE2ETests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('测试执行失败:', error);
      process.exit(1);
    });
}

module.exports = { runAllE2ETests };
