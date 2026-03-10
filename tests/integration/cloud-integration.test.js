/**
 * 云函数集成测试套件 - 真实环境测试
 *
 * ⚠️ 警告：此测试会操作真实的云数据库
 * 建议在测试环境中运行
 *
 * 测试前准备：
 * 1. 确保已登录云开发环境
 * 2. 确保所有云函数已部署
 * 3. 建议先备份数据库
 *
 * 运行方式：
 * node tests/integration/cloud-integration.test.js
 */

const tcb = require('@cloudbase/js-sdk');
const assert = require('assert');

// ==================== 配置 ====================

const CONFIG = {
  envId: 'cloud1-6gmp2q0y3171c353', // 云开发环境ID
  timeout: 10000 // 超时时间
};

// 初始化CloudBase
const app = tcb.init({
  env: CONFIG.envId
});

const db = app.database();

// ==================== 测试数据清理 ====================

/**
 * 清理测试数据
 */
async function cleanupTestData() {
  console.log('🧹 开始清理测试数据...');

  try {
    // 删除测试订单
    const orderResult = await db.collection('orders')
      .where({
        orderId: db.command.regex(/^test_/)
      })
      .remove();

    console.log(`✅ 删除测试订单: ${orderResult.removed} 条`);

    // 删除测试佣金钱包记录
    const walletResult = await db.collection('commission_wallets')
      .where({
        _openid: db.command.regex(/^test_/)
      })
      .remove();

    console.log(`✅ 删除测试钱包: ${walletResult.removed} 条`);

    // 删除测试交易记录
    const transactionResult = await db.collection('commission_transactions')
      .where({
        orderId: db.command.regex(/^test_/)
      })
      .remove();

    console.log(`✅ 删除测试交易: ${transactionResult.removed} 条`);

    // 删除测试提现记录
    const withdrawalResult = await db.collection('withdrawals')
      .where({
        _openid: db.command.regex(/^test_/)
      })
      .remove();

    console.log(`✅ 删除测试提现: ${withdrawalResult.removed} 条`);

    // 删除测试用户
    const userResult = await db.collection('users')
      .where({
        _openid: db.command.regex(/^test_/)
      })
      .remove();

    console.log(`✅ 删除测试用户: ${userResult.removed} 条`);

    console.log('✅ 测试数据清理完成\n');
  } catch (error) {
    console.error('❌ 清理测试数据失败:', error);
  }
}

// ==================== 测试辅助函数 ====================

/**
 * 创建测试用户
 */
async function createTestUser(userData) {
  try {
    const result = await db.collection('users').add({
      data: {
        ...userData,
        createTime: new Date()
      }
    });

    // 创建用户钱包
    await db.collection('commission_wallets').add({
      data: {
        _openid: userData._openid,
        balance: 0,
        frozenAmount: 0,
        withdrawn: 0,
        createTime: new Date(),
        updateTime: new Date()
      }
    });

    console.log(`✅ 创建测试用户: ${userData.nickName} (${userData._openid})`);
    return result;
  } catch (error) {
    console.error(`❌ 创建测试用户失败:`, error);
    throw error;
  }
}

/**
 * 调用云函数
 */
async function callCloudFunction(name, data) {
  try {
    const result = await app.callFunction({
      name,
      data
    });

    return result.result;
  } catch (error) {
    console.error(`❌ 调用云函数失败 [${name}]:`, error);
    throw error;
  }
}

/**
 * 创建测试产品
 */
async function createTestProduct(productData) {
  try {
    const result = await db.collection('products').add({
      data: {
        ...productData,
        createTime: new Date()
      }
    });

    console.log(`✅ 创建测试产品: ${productData.name}`);
    return result;
  } catch (error) {
    console.error(`❌ 创建测试产品失败:`, error);
    throw error;
  }
}

// ==================== 测试用例 ====================

/**
 * 测试1: 完整订单支付流程
 */
async function testCompleteOrderFlow() {
  console.log('\n📋 测试1: 完整订单支付流程');
  console.log('=' .repeat(60));

  try {
    // 1. 创建测试产品
    const productData = {
      _id: 'prod_test_integration_001',
      name: '集成测试产品-精酿啤酒',
      price: 10000, // 100元
      stock: 100,
      status: 'active',
      category: 'beer'
    };

    await createTestProduct(productData);

    // 2. 创建四级代理结构
    const users = [
      {
        _openid: 'test_hq_integration',
        inviteCode: 'HQINT',
        nickName: '测试总公司',
        agentLevel: 0,
        promotionPath: '',
        performance: {
          totalSales: 0,
          monthSales: 0,
          monthTag: '2026-03',
          teamCount: 5
        }
      },
      {
        _openid: 'test_agent_1_integration',
        inviteCode: 'AG1INT',
        nickName: '金牌推广员-集成测试1',
        phone: '13900000001',
        agentLevel: 1,
        promotionPath: 'test_hq_integration',
        performance: {
          totalSales: 200000,
          monthSales: 150000,
          monthTag: '2026-03',
          teamCount: 50
        }
      },
      {
        _openid: 'test_agent_2_integration',
        inviteCode: 'AG2INT',
        nickName: '银牌推广员-集成测试2',
        phone: '13900000002',
        agentLevel: 2,
        promotionPath: 'test_hq_integration/test_agent_1_integration',
        performance: {
          totalSales: 50000,
          monthSales: 40000,
          monthTag: '2026-03',
          teamCount: 10
        }
      },
      {
        _openid: 'test_agent_3_integration',
        inviteCode: 'AG3INT',
        nickName: '铜牌推广员-集成测试3',
        phone: '13900000003',
        agentLevel: 3,
        promotionPath: 'test_hq_integration/test_agent_1_integration/test_agent_2_integration',
        performance: {
          totalSales: 25000,
          monthSales: 8000,
          monthTag: '2026-03',
          teamCount: 3
        }
      },
      {
        _openid: 'test_agent_4_integration',
        inviteCode: 'AG4INT',
        nickName: '普通会员-集成测试4',
        phone: '13900000004',
        agentLevel: 4,
        promotionPath: 'test_hq_integration/test_agent_1_integration/test_agent_2_integration/test_agent_3_integration',
        performance: {
          totalSales: 5000,
          monthSales: 2000,
          monthTag: '2026-03',
          teamCount: 0
        }
      },
      {
        _openid: 'test_buyer_integration',
        inviteCode: 'BUYINT',
        nickName: '购买用户-集成测试',
        phone: '13900000000',
        agentLevel: 4,
        promotionPath: 'test_hq_integration/test_agent_1_integration/test_agent_2_integration/test_agent_3_integration/test_agent_4_integration',
        performance: {
          totalSales: 0,
          monthSales: 0,
          monthTag: '2026-03',
          teamCount: 0
        }
      }
    ];

    for (const user of users) {
      await createTestUser(user);
    }

    // 等待数据库写入
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 3. 调用订单云函数创建订单
    console.log('\n🛒 创建订单...');

    const orderResult = await callCloudFunction('order', {
      action: 'create',
      data: {
        cartItems: [
          {
            productId: productData._id,
            quantity: 1,
            price: productData.price
          }
        ],
        addressId: 'test_address_integration',
        remark: '集成测试订单'
      }
    });

    console.log('订单创建结果:', JSON.stringify(orderResult, null, 2));

    assert.strictEqual(orderResult.code, 0, '订单创建应成功');
    const orderId = orderResult.data.orderId;

    // 4. 调用支付云函数模拟支付
    console.log('\n💳 模拟支付...');

    const paymentResult = await callCloudFunction('wechatpay', {
      action: 'mockPayment', // 模拟支付动作
      data: {
        orderId: orderId,
        totalFee: productData.price
      }
    });

    console.log('支付结果:', JSON.stringify(paymentResult, null, 2));

    // 5. 验证佣金钱包余额
    console.log('\n💰 验证佣金钱包...');

    const wallets = await db.collection('commission_wallets')
      .where({
        _openid: db.command.in([
          'test_agent_4_integration',
          'test_agent_3_integration',
          'test_agent_2_integration',
          'test_agent_1_integration'
        ])
      })
      .get();

    console.log('\n各级代理钱包余额:');
    for (const wallet of wallets.data) {
      const user = users.find(u => u._openid === wallet._openid);
      console.log(`  ${user.nickName}: ${wallet.balance}分 (冻结: ${wallet.frozenAmount}分)`);
    }

    // 验证佣金分配
    const expectedCommission = {
      test_agent_4_integration: 800,  // 8%
      test_agent_3_integration: 400,  // 4%
      test_agent_2_integration: 400,  // 4%
      test_agent_1_integration: 400   // 4%
    };

    for (const wallet of wallets.data) {
      const expected = expectedCommission[wallet._openid];
      assert.strictEqual(wallet.balance, expected,
        `${wallet._openid} 的余额应为 ${expected}`);
    }

    // 6. 验证交易记录
    console.log('\n📊 验证交易记录...');

    const transactions = await db.collection('commission_transactions')
      .where({
        orderId: orderId
      })
      .get();

    console.log(`交易记录数量: ${transactions.data.length}`);
    assert.strictEqual(transactions.data.length, 4, '应创建4条交易记录');

    console.log('\n✅ 测试1通过: 完整订单支付流程\n');
  } catch (error) {
    console.error('\n❌ 测试1失败:', error.message);
    throw error;
  }
}

/**
 * 测试2: 提现流程
 */
async function testWithdrawalFlow() {
  console.log('\n📋 测试2: 提现流程');
  console.log('=' .repeat(60));

  try {
    // 1. 查询三级代理的佣金钱包
    const walletResult = await db.collection('commission_wallets')
      .where({
        _openid: 'test_agent_3_integration'
      })
      .get();

    const wallet = walletResult.data[0];
    console.log(`当前钱包余额: ${wallet.balance}分`);

    // 2. 申请提现
    const withdrawalAmount = 200; // 2元
    console.log(`\n申请提现: ${withdrawalAmount}分`);

    const withdrawalResult = await callCloudFunction('commission-wallet', {
      action: 'withdraw',
      data: {
        amount: withdrawalAmount,
        withdrawalType: 'wechat'
      }
    });

    console.log('提现申请结果:', JSON.stringify(withdrawalResult, null, 2));

    assert.strictEqual(withdrawalResult.code, 0, '提现申请应成功');

    // 3. 验证钱包余额更新
    const updatedWalletResult = await db.collection('commission_wallets')
      .where({
        _openid: 'test_agent_3_integration'
      })
      .get();

    const updatedWallet = updatedWalletResult.data[0];
    console.log(`\n提现后余额: ${updatedWallet.balance}分`);
    console.log(`冻结金额: ${updatedWallet.frozenAmount}分`);

    assert.strictEqual(updatedWallet.frozenAmount, withdrawalAmount,
      '冻结金额应等于提现金额');

    // 4. 管理员批准提现
    console.log('\n👮 管理员批准提现...');

    // 获取提现记录
    const withdrawalRecordResult = await db.collection('withdrawals')
      .where({
        _openid: 'test_agent_3_integration',
        status: 'pending'
      })
      .get();

    const withdrawalRecord = withdrawalRecordResult.data[0];
    console.log(`提现记录ID: ${withdrawalRecord._id}`);

    const approveResult = await callCloudFunction('admin-api', {
      action: 'approveWithdrawal',
      adminToken: 'test_admin_token', // 需要有效的管理员token
      data: {
        withdrawalId: withdrawalRecord._id
      }
    });

    console.log('批准结果:', JSON.stringify(approveResult, null, 2));

    // 5. 验证提现完成
    const finalWalletResult = await db.collection('commission_wallets')
      .where({
        _openid: 'test_agent_3_integration'
      })
      .get();

    const finalWallet = finalWalletResult.data[0];
    console.log(`\n最终余额: ${finalWallet.balance}分`);
    console.log(`已提现: ${finalWallet.withdrawn}分`);

    assert.strictEqual(finalWallet.frozenAmount, 0, '冻结金额应为0');
    assert.strictEqual(finalWallet.withdrawn, withdrawalAmount, '已提现金额应正确');

    console.log('\n✅ 测试2通过: 提现流程\n');
  } catch (error) {
    console.error('\n❌ 测试2失败:', error.message);
    throw error;
  }
}

/**
 * 测试3: 退款和佣金回收
 */
async function testRefundAndCommissionRecovery() {
  console.log('\n📋 测试3: 退款和佣金回收');
  console.log('=' .repeat(60));

  try {
    // 1. 查询测试订单
    const orderResult = await db.collection('orders')
      .where({
        orderId: db.command.regex(/^test_/)
      })
      .get();

    if (orderResult.data.length === 0) {
      console.log('⚠️ 没有找到测试订单，跳过退款测试');
      return;
    }

    const order = orderResult.data[0];
    console.log(`订单ID: ${order.orderId}`);
    console.log(`订单金额: ${order.totalAmount}分`);

    // 2. 记录退款前的钱包余额
    const walletsBefore = await db.collection('commission_wallets')
      .where({
        _openid: db.command.in([
          'test_agent_4_integration',
          'test_agent_3_integration',
          'test_agent_2_integration',
          'test_agent_1_integration'
        ])
      })
      .get();

    console.log('\n退款前钱包余额:');
    const balancesBefore = {};
    for (const wallet of walletsBefore.data) {
      balancesBefore[wallet._openid] = wallet.balance;
      const user = await db.collection('users')
        .where({ _openid: wallet._openid })
        .get();
      console.log(`  ${user.data[0].nickName}: ${wallet.balance}分`);
    }

    // 3. 申请退款
    console.log('\n🔄 申请退款...');

    const refundResult = await callCloudFunction('order', {
      action: 'applyRefund',
      data: {
        orderId: order.orderId,
        reason: '集成测试退款'
      }
    });

    console.log('退款申请结果:', JSON.stringify(refundResult, null, 2));

    // 4. 等待退款处理
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 5. 验证佣金已回收
    const walletsAfter = await db.collection('commission_wallets')
      .where({
        _openid: db.command.in([
          'test_agent_4_integration',
          'test_agent_3_integration',
          'test_agent_2_integration',
          'test_agent_1_integration'
        ])
      })
      .get();

    console.log('\n退款后钱包余额:');
    for (const wallet of walletsAfter.data) {
      const user = await db.collection('users')
        .where({ _openid: wallet._openid })
        .get();
      console.log(`  ${user.data[0].nickName}: ${wallet.balance}分`);
    }

    // 验证余额已扣减
    for (const wallet of walletsAfter.data) {
      const before = balancesBefore[wallet._openid];
      const after = wallet.balance;
      const diff = before - after;

      console.log(`  ${wallet._openid} 回收佣金: ${diff}分`);

      assert.ok(after < before, '余额应被扣减');
    }

    console.log('\n✅ 测试3通过: 退款和佣金回收\n');
  } catch (error) {
    console.error('\n❌ 测试3失败:', error.message);
    throw error;
  }
}

// ==================== 主测试运行器 ====================

async function runTests() {
  console.log('🚀 云函数集成测试开始');
  console.log('=' .repeat(60));
  console.log(`环境ID: ${CONFIG.envId}`);
  console.log(`开始时间: ${new Date().toLocaleString()}`);
  console.log('');

  try {
    // 清理旧的测试数据
    await cleanupTestData();

    // 运行测试
    await testCompleteOrderFlow();
    await testWithdrawalFlow();
    await testRefundAndCommissionRecovery();

    console.log('=' .repeat(60));
    console.log('✅ 所有测试通过');
    console.log(`结束时间: ${new Date().toLocaleString()}`);

  } catch (error) {
    console.error('=' .repeat(60));
    console.error('❌ 测试失败:', error);
    process.exit(1);
  } finally {
    // 可选：清理测试数据
    // await cleanupTestData();
  }
}

// 运行测试
if (require.main === module) {
  runTests().catch(error => {
    console.error('测试运行失败:', error);
    process.exit(1);
  });
}

module.exports = {
  runTests,
  cleanupTestData,
  callCloudFunction
};
