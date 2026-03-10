/**
 * 安全测试套件主入口
 *
 * 运行所有安全测试：
 * - Layer 1: Mock测试（快速）
 * - Layer 2: 沙箱测试（集成）
 * - Layer 3: 生产扫描（只读）
 */

// 导入所有测试模块
require('./modules/payment-security.test');
require('./modules/privacy-protection.test');
require('./modules/business-logic.test');

// ==================== 测试配置 ====================

const config = require('./config/test-config');

// ==================== 全局设置 ====================

// 测试超时配置
jest.setTimeout(config.environment.sandbox.timeout);

// ==================== 辅助函数 ====================

/**
 * 清理测试数据
 */
async function cleanupTestData() {
  console.log('🧹 清理安全测试数据...');

  // 这里实现数据清理逻辑
  // 沙箱环境会自动清理
  if (config.environment.sandbox.autoCleanup) {
    console.log('✅ 沙箱环境自动清理已启用');
  }
}

/**
 * 生成安全测试报告
 */
function generateReport(results) {
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      total: results.total,
      passed: results.passed,
      failed: results.failed,
      passRate: `${(results.passed / results.total * 100).toFixed(2)}%`
    },
    details: results.details
  };

  return report;
}

// ==================== 导出 ====================

module.exports = {
  config,
  cleanupTestData,
  generateReport
};

console.log('✅ 安全测试套件加载完成');
console.log('📊 测试层级：');
console.log('  - Layer 1: Mock测试（快速验证）');
console.log('  - Layer 2: 沙箱测试（集成验证）');
console.log('  - Layer 3: 生产扫描（配置审计）');
console.log('');
console.log('🔒 测试领域：');
console.log('  - A: 支付与资金安全');
console.log('  - B: 用户隐私与数据保护');
console.log('  - C: 业务逻辑漏洞');
