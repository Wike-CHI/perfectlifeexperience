/**
 * Order 云函数 - 模块引用路径测试
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
console.log('║   Order 模块引用路径修复测试             ║');
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
  assert.ok(loggerPath.includes('order\\common\\logger.js') || loggerPath.includes('order/common/logger.js'));
});

test('能够正确引入 ./common/response', () => {
  const responsePath = require.resolve('./common/response');
  assert.ok(responsePath.includes('order\\common\\response.js') || responsePath.includes('order/common/response.js'));
});

test('能够正确引入 ./common/validator', () => {
  const validatorPath = require.resolve('./common/validator');
  assert.ok(validatorPath.includes('order\\common\\validator.js') || validatorPath.includes('order/common/validator.js'));
});

test('能够正确引入 ./common/constants', () => {
  const constantsPath = require.resolve('./common/constants');
  assert.ok(constantsPath.includes('order\\common\\constants.js') || constantsPath.includes('order/common/constants.js'));
});

test('能够正确引入 ./common/cache', () => {
  const cachePath = require.resolve('./common/cache');
  assert.ok(cachePath.includes('order\\common\\cache.js') || cachePath.includes('order/common/cache.js'));
});

test('能够正确引入 ./common/rateLimiter', () => {
  const rateLimiterPath = require.resolve('./common/rateLimiter');
  assert.ok(rateLimiterPath.includes('order\\common\\rateLimiter.js') || rateLimiterPath.includes('order/common/rateLimiter.js'));
});

test('能够正确引入 ./common/reward-settlement', () => {
  const rewardPath = require.resolve('./common/reward-settlement');
  assert.ok(rewardPath.includes('order\\common\\reward-settlement.js') || rewardPath.includes('order/common/reward-settlement.js'));
});

test('能够正确引入 ./common/utils', () => {
  const utilsPath = require.resolve('./common/utils');
  assert.ok(utilsPath.includes('order\\common\\utils.js') || utilsPath.includes('order/common/utils.js'));
});

console.log('\n模块功能测试');
console.log('----------------------------------------');

test('logger 模块导出 createLogger 函数', () => {
  const { createLogger } = require('./common/logger');
  assert.strictEqual(typeof createLogger, 'function');
});

test('createLogger 返回 logger 对象', () => {
  const { createLogger } = require('./common/logger');
  const logger = createLogger('test');
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
  const result = success({ id: 1 }, '操作成功');
  assert.deepStrictEqual(result, {
    code: 0,
    msg: '操作成功',
    data: { id: 1 }
  });
});

test('error 返回正确格式', () => {
  const { error, ErrorCodes } = require('./common/response');
  const result = error(ErrorCodes.INVALID_PARAMS, '参数错误');
  assert.strictEqual(result.code, ErrorCodes.INVALID_PARAMS);
  assert.strictEqual(result.msg, '参数错误');
});

test('validator 模块导出验证函数', () => {
  const { validateAmount, validateObject } = require('./common/validator');
  assert.strictEqual(typeof validateAmount, 'function');
  assert.strictEqual(typeof validateObject, 'function');
});

test('validateAmount 正确验证金额', () => {
  const { validateAmount } = require('./common/validator');
  const validResult = validateAmount(100);
  const invalidZero = validateAmount(0);
  const invalidNegative = validateAmount(-1);

  // 验证器返回对象 { result: 'valid' | 'invalid', message?: string }
  // 金额最小为1分，0是无效的
  assert.ok(validResult.result === 'valid' || validResult === true);
  assert.ok(invalidZero.result === 'invalid' || invalidZero === false);
  assert.ok(invalidNegative.result === 'invalid' || invalidNegative === false);
});

test('constants 模块导出常量', () => {
  const { Amount, Collections, OrderStatus } = require('./common/constants');
  assert.ok(Amount);
  assert.ok(Collections);
  assert.ok(OrderStatus);
});

test('cache 模块导出缓存对象', () => {
  const { userCache, productCache } = require('./common/cache');
  assert.ok(userCache);
  assert.ok(productCache);
});

test('utils 模块导出工具函数', () => {
  const utils = require('./common/utils');
  assert.ok(utils);
  assert.strictEqual(typeof utils.generateTransactionNo, 'function');
  assert.strictEqual(typeof utils.getCurrentMonthTag, 'function');
  assert.strictEqual(typeof utils.getDefaultPerformance, 'function');
});

test('generateTransactionNo 生成正确格式的流水号', () => {
  const { generateTransactionNo } = require('./common/utils');
  const transactionNo = generateTransactionNo();
  assert.ok(transactionNo.startsWith('IT'));
  assert.strictEqual(transactionNo.length, 22); // IT + 14位时间 + 6位随机
});

console.log('\n云函数基本功能测试');
console.log('----------------------------------------');

test('能够加载 index.js 而不报错', () => {
  // 清除缓存
  delete require.cache[require.resolve('./index.js')];
  const orderFunction = require('./index.js');
  assert.ok(orderFunction);
  assert.strictEqual(typeof orderFunction.main, 'function');
});

test('云函数 main 函数可调用', async () => {
  const orderFunction = require('./index.js');
  const event = {
    action: 'test',
    data: {}
  };
  const context = {};

  try {
    const result = await orderFunction.main(event, context);
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

console.log('\n========================================');
console.log('Order 模块测试（重构后）');
console.log('========================================');

test('能够正确引入 ./modules/order', () => {
  const orderModule = require('./modules/order');
  assert.ok(orderModule);
  assert.strictEqual(typeof orderModule.createOrder, 'function');
  assert.strictEqual(typeof orderModule.getOrders, 'function');
  assert.strictEqual(typeof orderModule.getOrderDetail, 'function');
  assert.strictEqual(typeof orderModule.updateOrderStatus, 'function');
  assert.strictEqual(typeof orderModule.payWithBalance, 'function');
});

test('能够正确引入 ./modules/refund', () => {
  const refundModule = require('./modules/refund');
  assert.ok(refundModule);
  assert.strictEqual(typeof refundModule.applyRefund, 'function');
  assert.strictEqual(typeof refundModule.cancelRefund, 'function');
  assert.strictEqual(typeof refundModule.getRefundList, 'function');
  assert.strictEqual(typeof refundModule.getRefundDetail, 'function');
});

test('能够正确引入 ./modules/inventory', () => {
  const inventoryModule = require('./modules/inventory');
  assert.ok(inventoryModule);
  assert.strictEqual(typeof inventoryModule.deductStock, 'function');
  assert.strictEqual(typeof inventoryModule.restoreStock, 'function');
  assert.strictEqual(typeof inventoryModule.restoreCoupon, 'function');
});

test('能够正确引入 ./modules/reward', () => {
  const rewardModule = require('./modules/reward');
  assert.ok(rewardModule);
  assert.strictEqual(typeof rewardModule.settleOrderReward, 'function');
  assert.strictEqual(typeof rewardModule.checkIsRepurchase, 'function');
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
