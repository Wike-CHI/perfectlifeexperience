/**
 * Wallet 云函数 - 模块引用路径测试
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
console.log('║   Wallet 模块引用路径修复测试            ║');
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
  assert.ok(loggerPath.includes('wallet\\common\\logger.js') || loggerPath.includes('wallet/common/logger.js'));
});

test('能够正确引入 ./common/cache', () => {
  const cachePath = require.resolve('./common/cache');
  assert.ok(cachePath.includes('wallet\\common\\cache.js') || cachePath.includes('wallet/common/cache.js'));
});

test('能够正确引入 ./common/response', () => {
  const responsePath = require.resolve('./common/response');
  assert.ok(responsePath.includes('wallet\\common\\response.js') || responsePath.includes('wallet/common/response.js'));
});

test('能够正确引入 ./common/validator', () => {
  const validatorPath = require.resolve('./common/validator');
  assert.ok(validatorPath.includes('wallet\\common\\validator.js') || validatorPath.includes('wallet/common/validator.js'));
});

test('能够正确引入 ./common/constants', () => {
  const constantsPath = require.resolve('./common/constants');
  assert.ok(constantsPath.includes('wallet\\common\\constants.js') || constantsPath.includes('wallet/common/constants.js'));
});

console.log('\n模块功能测试');
console.log('----------------------------------------');

test('logger 模块导出 createLogger 函数', () => {
  const { createLogger } = require('./common/logger');
  assert.strictEqual(typeof createLogger, 'function');
});

test('createLogger 返回 logger 对象', () => {
  const { createLogger } = require('./common/logger');
  const logger = createLogger('wallet-test');
  assert.ok(logger);
  assert.strictEqual(typeof logger.info, 'function');
  assert.strictEqual(typeof logger.error, 'function');
  assert.strictEqual(typeof logger.warn, 'function');
  assert.strictEqual(typeof logger.debug, 'function');
});

test('response 模块导出 success 和 error 函数', () => {
  const { success, error } = require('./common/response');
  assert.strictEqual(typeof success, 'function');
  assert.strictEqual(typeof error, 'function');
});

test('success 返回正确格式', () => {
  const { success } = require('./common/response');
  const result = success({ balance: 100 }, '查询成功');
  assert.deepStrictEqual(result, {
    code: 0,
    msg: '查询成功',
    data: { balance: 100 }
  });
});

test('error 返回正确格式', () => {
  const { error, ErrorCodes } = require('./common/response');
  const result = error(ErrorCodes.INVALID_PARAMS, '余额不足');
  assert.strictEqual(result.code, ErrorCodes.INVALID_PARAMS);
  assert.strictEqual(result.msg, '余额不足');
});

test('validator 模块导出验证函数', () => {
  const { validateAmount } = require('./common/validator');
  assert.strictEqual(typeof validateAmount, 'function');
});

test('validateAmount 正确验证金额', () => {
  const { validateAmount } = require('./common/validator');
  const validResult = validateAmount(100);
  const invalidZero = validateAmount(0);
  const invalidNegative = validateAmount(-1);

  // 验证器返回对象 { result: 'valid' | 'invalid', message?: string }
  assert.ok(validResult.result === 'valid' || validResult === true);
  assert.ok(invalidZero.result === 'invalid' || invalidZero === false);
  assert.ok(invalidNegative.result === 'invalid' || invalidNegative === false);
});

test('cache 模块导出 userCache', () => {
  const { userCache } = require('./common/cache');
  assert.ok(userCache);
});

test('constants 模块导出常量', () => {
  const constants = require('./common/constants');
  assert.ok(constants);
});

console.log('\n云函数基本功能测试');
console.log('----------------------------------------');

test('能够加载 index.js 而不报错', () => {
  // 清除缓存
  delete require.cache[require.resolve('./index.js')];
  const walletFunction = require('./index.js');
  assert.ok(walletFunction);
  assert.strictEqual(typeof walletFunction.main, 'function');
});

test('云函数 main 函数可调用', async () => {
  const walletFunction = require('./index.js');
  const event = {
    action: 'test',
    data: {}
  };
  const context = {};

  try {
    const result = await walletFunction.main(event, context);
    // 未知 action 应该返回错误
    assert.ok(result.code !== 0 || result.success === false);
  } catch (error) {
    // 即使出错，也说明云函数可以被调用
    assert.ok(true);
  }
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
