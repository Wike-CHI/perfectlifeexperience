const assert = require('assert');

function assertError(actual, expectedCode, expectedMessage) {
  assert.ok(actual, '应该返回错误对象');
  assert.strictEqual(actual.code, expectedCode);
  assert.ok(actual.message?.includes(expectedMessage) || actual.msg?.includes(expectedMessage));
}

function logError(testName, error) {
  console.error(`❌ [${testName}] Error:`, {
    message: error.message,
    stack: error.stack,
    code: error.code
  });
}

function generateErrorReport(failedTests) {
  let report = '\n❌ 失败测试详情:\n';
  failedTests.forEach((test, index) => {
    report += `\n${index + 1}. ${test.name}\n`;
    report += `   位置: ${test.file}:${test.line}\n`;
    report += `   错误: ${test.error}\n`;
  });
  return report;
}

function getTestStatistics(results) {
  const total = results.passed + results.failed + results.skipped;
  const passRate = total > 0 ? ((results.passed / total) * 100).toFixed(2) : 0;
  return {
    total,
    passed: results.passed,
    failed: results.failed,
    skipped: results.skipped,
    passRate: `${passRate}%`,
    duration: results.duration || 0
  };
}

module.exports = {
  assertError,
  logError,
  generateErrorReport,
  getTestStatistics
};
