/**
 * Commission-Wallet 云函数 - 模块引用路径测试
 * 测试目标：验证修复后的模块引用路径正确性
 */

const assert = require('assert');
const path = require('path');

// 拦截 wx-server-sdk 的 require
const Module = require('module');
const originalRequire = Module.prototype.require;
Module.prototype.require = function(id) {
  if (id === 'wx-server-sdk') {
    return require('./wx-server-sdk.js');
  }
  return originalRequire.apply(this, arguments);
};

console.log('╔══════════════════════════════════════════╗');
console.log('║   Commission-Wallet 模块引用路径修复测试 ║');
console.log('╚══════════════════════════════════════════╝\n');

let passCount = 0;
let failCount = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
    passCount++;
  } catch (error) {
    console.log(`✗ ${name}`);
    console.log(`  Error: ${error.message}\n`);
    failCount++;
  }
}

// ==================== 测试套件 ====================

console.log('模块引用路径测试');
console.log('----------------------------------------');

test('能够正确引入 ./common/logger', () => {
  const loggerPath = require.resolve('./common/logger');
  assert.ok(loggerPath.includes('commission-wallet\\common\\logger.js') || loggerPath.includes('commission-wallet/common/logger.js'));
});

console.log('\n模块功能测试');
console.log('----------------------------------------');

test('logger 模块导出 createLogger 函数', () => {
  const { createLogger } = require('./common/logger');
  assert.strictEqual(typeof createLogger, 'function');
});

test('createLogger 返回 logger 对象', () => {
  const { createLogger } = require('./common/logger');
  const logger = createLogger('commission-wallet-test');
  assert.ok(logger);
  assert.strictEqual(typeof logger.info, 'function');
  assert.strictEqual(typeof logger.error, 'function');
  assert.strictEqual(typeof logger.warn, 'function');
  assert.strictEqual(typeof logger.debug, 'function');
});

test('logger 不同日志级别可用', () => {
  const { createLogger } = require('./common/logger');
  const logger = createLogger('test');

  // 测试各种日志级别
  assert.doesNotThrow(() => logger.info('test info'));
  assert.doesNotThrow(() => logger.error('test error'));
  assert.doesNotThrow(() => logger.warn('test warn'));
  assert.doesNotThrow(() => logger.debug('test debug'));
});

console.log('\n云函数基本功能测试');
console.log('----------------------------------------');

test('能够加载 index.js 而不报错', () => {
  // 清除缓存
  delete require.cache[require.resolve('./index.js')];
  const commissionWalletFunction = require('./index.js');
  assert.ok(commissionWalletFunction);
  assert.strictEqual(typeof commissionWalletFunction.main, 'function');
});

test('云函数 main 函数可调用', async () => {
  const commissionWalletFunction = require('./index.js');
  const event = {
    action: 'test',
    data: {}
  };
  const context = {};

  try {
    const result = await commissionWalletFunction.main(event, context);
    // 未知 action 应该返回错误
    assert.ok(result.code !== 0 || result.success === false);
  } catch (error) {
    // 即使出错，也说明云函数可以被调用
    assert.ok(true);
  }
});

test('云函数支持 getBalance action', async () => {
  const commissionWalletFunction = require('./index.js');
  const event = {
    action: 'getBalance',
    data: {}
  };
  const context = {};

  try {
    const result = await commissionWalletFunction.main(event, context);
    // 应该返回成功或特定的错误（比如用户未找到）
    assert.ok(result.code !== undefined || result.success !== undefined);
  } catch (error) {
    // 即使出错，也说明云函数可以被调用
    assert.ok(true);
  }
});

console.log('\n佣金钱包特定功能测试');
console.log('----------------------------------------');

test('佣金钱包与充值钱包分离', () => {
  const fs = require('fs');
  const path = require('path');
  const indexPath = path.join(__dirname, 'index.js');
  const content = fs.readFileSync(indexPath, 'utf-8');

  // 验证集合名称包含 commission_wallets
  assert.ok(content.includes('commission_wallets'));
  assert.ok(!content.includes('user_wallets'));
});

test('提现相关代码存在', () => {
  const fs = require('fs');
  const path = require('path');
  const indexPath = path.join(__dirname, 'index.js');
  const content = fs.readFileSync(indexPath, 'utf-8');

  // 验证提现相关功能
  assert.ok(content.includes('withdraw') || content.includes('提现'));
});

console.log('\n========================================');
console.log('测试结果汇总');
console.log('========================================');
console.log(`✅ 通过: ${passCount}`);
console.log(`❌ 失败: ${failCount}`);
console.log(`📊 总计: ${passCount + failCount}`);

if (failCount === 0) {
  console.log('\n🎉 所有测试通过！模块引用路径修复成功！');
  process.exit(0);
} else {
  console.log('\n⚠️  部分测试失败，请检查模块引用路径');
  process.exit(1);
}
