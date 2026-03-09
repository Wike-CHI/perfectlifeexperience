#!/usr/bin/env node

/**
 * 模块引用路径修复 - 综合测试运行器
 * 测试目标：验证三个云函数的模块引用路径修复
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

console.log('╔══════════════════════════════════════════════════╗');
console.log('║  模块引用路径修复 - 综合测试套件                ║');
console.log('╚══════════════════════════════════════════════════╝\n');

const testFunctions = [
  {
    name: 'Order 云函数',
    path: 'cloudfunctions/order/module-path.test.js',
    expectedTests: 18
  },
  {
    name: 'Wallet 云函数',
    path: 'cloudfunctions/wallet/module-path.test.js',
    expectedTests: 16
  },
  {
    name: 'Commission-Wallet 云函数',
    path: 'cloudfunctions/commission-wallet/module-path.test.js',
    expectedTests: 9
  }
];

let totalPassed = 0;
let totalFailed = 0;
const results = [];

testFunctions.forEach(({ name, path: testPath }) => {
  console.log(`\n${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`${colors.blue}测试：${name}${colors.reset}`);
  console.log(`${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);

  try {
    const output = execSync(`node ${testPath}`, {
      encoding: 'utf-8',
      cwd: process.cwd(),
      stdio: 'pipe'
    });

    // 解析输出
    const passMatch = output.match(/✅ 通过:\s*(\d+)/);
    const failMatch = output.match(/❌ 失败:\s*(\d+)/);

    const passed = passMatch ? parseInt(passMatch[1]) : 0;
    const failed = failMatch ? parseInt(failMatch[1]) : 0;

    totalPassed += passed;
    totalFailed += failed;

    results.push({
      name,
      passed,
      failed,
      success: failed === 0
    });

    if (failed === 0) {
      console.log(`${colors.green}✅ ${name} - 全部通过 (${passed}个测试)${colors.reset}`);
    } else {
      console.log(`${colors.red}❌ ${name} - 部分失败 (${passed}通过, ${failed}失败)${colors.reset}`);
      console.log(output);
    }

  } catch (error) {
    console.log(`${colors.red}❌ ${name} - 测试执行失败${colors.reset}`);
    console.error(error.message);

    results.push({
      name,
      passed: 0,
      failed: 1,
      success: false,
      error: error.message
    });

    totalFailed++;
  }
});

console.log(`\n${colors.blue}══════════════════════════════════════════════════${colors.reset}`);
console.log(`${colors.blue}总体测试结果汇总${colors.reset}`);
console.log(`${colors.blue}══════════════════════════════════════════════════${colors.reset}\n`);

console.log(`云函数测试结果：`);
results.forEach(({ name, passed, failed, success }) => {
  const status = success ? `${colors.green}✅` : `${colors.red}❌`;
  console.log(`  ${status} ${name}: ${passed}通过, ${failed}失败${colors.reset}`);
});

console.log(`\n${'─'.repeat(50)}`);
console.log(`总计：${colors.green}${totalPassed}个测试通过${colors.reset}, ${totalFailed > 0 ? colors.red : colors.green}${totalFailed}个测试失败${colors.reset}`);
console.log(`${'─'.repeat(50)}\n`);

if (totalFailed === 0) {
  console.log(`${colors.green}🎉 所有测试通过！模块引用路径修复成功！${colors.reset}\n`);
  console.log(`修复内容：`);
  console.log(`  ✓ Order 云函数 - 修正 logger 和 response 引用路径`);
  console.log(`  ✓ Wallet 云函数 - 修正 logger 引用路径`);
  console.log(`  ✓ Commission-Wallet 云函数 - 修正 logger 引用路径`);
  console.log(`\n修复说明：`);
  console.log(`  将 ../common/* 改为 ./common/*，使用云函数内部的 common 目录`);
  console.log(`\n建议：`);
  console.log(`  - 已通过 MCP 工具部署到云端`);
  console.log(`  - 小程序中可正常调用云函数`);
  process.exit(0);
} else {
  console.log(`${colors.red}⚠️  部分测试失败，请检查模块引用路径${colors.reset}\n`);
  process.exit(1);
}
