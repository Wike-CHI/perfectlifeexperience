#!/usr/bin/env node

/**
 * 运行所有测试脚本
 * Run All Tests Script
 *
 * 用途: 一键运行所有测试并生成报告
 * Usage: Run all tests with a single command
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

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

function printBanner() {
  log('\n' + '█'.repeat(80), 'blue');
  log('分销系统测试套件', 'blue');
  log('Promotion System Test Suite', 'blue');
  log('█'.repeat(80) + '\n', 'blue');
}

function printSection(title) {
  log('═'.repeat(80), 'cyan');
  log(`\n  ${title}\n`, 'blue');
  log('═'.repeat(80), 'cyan');
}

function runTest(scriptPath, description) {
  log(`\n▶ 运行: ${description}`, 'magenta');
  log('─'.repeat(80), 'cyan');

  try {
    const output = execSync(`node ${scriptPath}`, {
      encoding: 'utf-8',
      stdio: 'inherit'
    });
    log(`\n✅ ${description} - 通过`, 'green');
    return { success: true, output };
  } catch (error) {
    log(`\n❌ ${description} - 失败`, 'red');
    return { success: false, error: error.message };
  }
}

function generateSummary(results) {
  printSection('测试总结');

  const total = results.length;
  const passed = results.filter(r => r.success).length;
  const failed = total - passed;
  const passRate = ((passed / total) * 100).toFixed(1);

  log(`\n总测试数: ${total}`, 'yellow');
  log(`通过: ${passed}`, 'green');
  log(`失败: ${failed}`, failed > 0 ? 'red' : 'green');
  log(`通过率: ${passRate}%\n`, 'yellow');

  results.forEach((result, index) => {
    const status = result.success ? '✅' : '❌';
    const color = result.success ? 'green' : 'red';
    log(`  ${status} ${result.description}`, color);
  });

  // 生成测试报告
  const reportPath = path.join(__dirname, 'TEST_RESULTS.md');
  const reportContent = `# 分销系统测试结果

## 测试时间
${new Date().toLocaleString('zh-CN')}

## 测试摘要

- **总测试数**: ${total}
- **通过**: ${passed}
- **失败**: ${failed}
- **通过率**: ${passRate}%

## 测试详情

${results.map((result, index) => `
### ${index + 1}. ${result.description}

**状态**: ${result.success ? '✅ 通过' : '❌ 失败'}

${result.error ? `**错误**: \`\`\`\n${result.error}\n\`\`\`` : ''}
`).join('')}

## 下一步行动

${failed > 0 ? `
⚠️ 有 ${failed} 个测试失败，建议：

1. 查看失败测试的详细日志
2. 修复相关问题
3. 重新运行测试验证
` : `
✅ 所有测试通过！建议：

1. 进行云函数集成测试
2. 在真实环境中验证
3. 持续监控和优化
`}

---

**生成时间**: ${new Date().toISOString()}
`;

  fs.writeFileSync(reportPath, reportContent);
  log(`\n📄 测试报告已生成: ${reportPath}\n`, 'cyan');
}

function main() {
  printBanner();

  log('🚀 开始运行所有测试...\n', 'yellow');

  const results = [];

  // 测试 1: 核心佣金计算测试
  results.push({
    description: '核心佣金计算测试 (test-promotion-core.js)',
    ...runTest(
      path.join(__dirname, 'test-promotion-core.js'),
      '核心佣金计算测试'
    )
  });

  // 测试 2: 端到端流程测试
  results.push({
    description: '端到端流程测试 (test-e2e-flow.js)',
    ...runTest(
      path.join(__dirname, 'test-e2e-flow.js'),
      '端到端流程测试'
    )
  });

  // 测试 3: 实现对比工具
  results.push({
    description: '云函数实现对比 (compare-implementation.js)',
    ...runTest(
      path.join(__dirname, 'compare-implementation.js'),
      '云函数实现对比'
    )
  });

  // 生成总结
  generateSummary(results);

  // 最终状态
  const allPassed = results.every(r => r.success);

  log('█'.repeat(80), 'blue');
  if (allPassed) {
    log('\n✅ 所有测试通过！\n', 'green');
  } else {
    log('\n⚠️ 部分测试失败，请查看详细日志\n', 'yellow');
  }
  log('█'.repeat(80) + '\n', 'blue');

  process.exit(allPassed ? 0 : 1);
}

// 运行主函数
if (require.main === module) {
  main();
}

module.exports = { main };
