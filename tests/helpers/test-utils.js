const assert = require('assert');

/**
 * 佣金池比例（订单金额的20%用于佣金分配）
 * @constant
 * @type {number}
 */
const COMMISSION_RATE = 0.20;

/**
 * 创建模拟的微信云开发上下文对象
 * @param {string} [openid] - 可选的OpenID，默认使用基于时间戳生成的ID
 * @returns {object} 模拟的上下文对象，包含OPENID、APPID、UNIONID、CLIENTIP
 *
 * @example
 * const ctx = createMockContext('user123');
 * console.log(ctx.OPENID); // 'user123'
 */
function createMockContext(openid) {
  return {
    OPENID: openid || 'test_openid_' + Date.now(),
    APPID: 'test_appid',
    UNIONID: 'test_unionid',
    CLIENTIP: '127.0.0.1'
  };
}

/**
 * 创建模拟的CloudBase数据库对象
 *
 * **注意：** 这是一个基础存根实现，仅返回空数据。完整的模拟数据库实现待定。
 * 当前版本仅用于提供API兼容性，实际测试需要配合真实的云函数测试环境。
 *
 * @returns {object} 模拟的数据库对象，包含collection()、doc()、command方法
 *
 * @example
 * const db = createMockDatabase();
 * const users = db.collection('users');
 * const result = await users.where({ _openid: 'xxx' }).get();
 * // result.data === []
 */
function createMockDatabase() {
  const mockData = new Map();
  return {
    collection: (name) => ({
      where: (query) => ({
        get: async () => ({ data: [] }),
        update: async (data) => ({ stats: { updated: 0 } }),
        remove: async () => ({ stats: { removed: 0 } })
      }),
      doc: (id) => ({
        get: async () => ({ data: null }),
        update: async (data) => ({ stats: { updated: 0 } }),
        remove: async () => ({ stats: { removed: 0 } })
      }),
      add: async (data) => ({ _id: 'test_id_' + Date.now() })
    }),
    command: {
      eq: (val) => ({ $eq: val }),
      gte: (val) => ({ $gte: val }),
      lte: (val) => ({ $lte: val }),
      in: (arr) => ({ $in: arr }),
      and: (conds) => ({ $and: conds }),
      or: (conds) => ({ $or: conds }),
      inc: (val) => ({ $inc: val })
    }
  };
}

/**
 * 断言佣金分配结果是否符合预期
 * 验证总佣金为订单金额的20%，且各层级分配正确
 *
 * @param {object} actual - 实际的佣金分配结果，格式：{ level1: amount, level2: amount, ... }
 * @param {object} expected - 预期的佣金分配结果
 * @param {number} orderAmount - 订单总金额
 * @throws {AssertionError} 当佣金总额不为20%或各层级分配不正确时抛出
 *
 * @example
 * const actual = { level1: 12, level2: 8 };
 * const expected = { level1: 12, level2: 8 };
 * assertCommissionEqual(actual, expected, 100); // 通过：总佣金20元
 */
function assertCommissionEqual(actual, expected, orderAmount) {
  const actualTotal = Object.values(actual).reduce((sum, val) => sum + val, 0);
  const expectedTotal = orderAmount * COMMISSION_RATE;
  assert.strictEqual(actualTotal.toFixed(2), expectedTotal.toFixed(2));
  Object.keys(expected).forEach(level => {
    assert.strictEqual(actual[level].toFixed(2), expected[level].toFixed(2));
  });
}

/**
 * 异步等待指定时间
 * @param {number} ms - 等待的毫秒数
 * @returns {Promise<void>} 在指定时间后解析的Promise
 *
 * @example
 * await waitAsync(1000); // 等待1秒
 */
async function waitAsync(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 设置测试环境
 * 在测试套件开始前调用，初始化测试所需的资源
 * @returns {Promise<void>}
 *
 * @example
 * beforeAll(async () => {
 *   await setupTestEnv();
 * });
 */
async function setupTestEnv() {
  console.log('🧪 测试环境初始化...');
}

/**
 * 清理测试环境
 * 在测试套件结束后调用，释放测试资源
 * @returns {Promise<void>}
 *
 * @example
 * afterAll(async () => {
 *   await cleanupTestEnv();
 * });
 */
async function cleanupTestEnv() {
  console.log('🧹 测试环境清理...');
}

module.exports = {
  createMockContext,
  createMockDatabase,
  assertCommissionEqual,
  waitAsync,
  setupTestEnv,
  cleanupTestEnv
};
