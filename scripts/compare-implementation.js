/**
 * 云函数实现对比工具
 * Cloud Function Implementation Comparison Tool
 *
 * 用途: 对比计算引擎与实际云函数的实现差异
 * Usage: Compare calculation engine with actual cloud function implementation
 */

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

function printDivider() {
  log('═'.repeat(80), 'cyan');
}

function printSection(title) {
  printDivider();
  log(`\n  ${title}\n`, 'blue');
  printDivider();
}

/**
 * 读取云函数代码
 */
function readCloudFunctionCode() {
  const promotionPath = path.join(__dirname, '../cloudfunctions/promotion/index.js');

  if (!fs.existsSync(promotionPath)) {
    log('⚠️ 云函数文件不存在', 'yellow');
    return null;
  }

  return fs.readFileSync(promotionPath, 'utf-8');
}

/**
 * 提取关键配置
 */
function extractConfigurations() {
  const config = require('./config');
  const cloudFunctionCode = readCloudFunctionCode();

  printSection('1. 佣金比例对比');

  log('\n📋 计算引擎配置 (config.js):', 'cyan');
  log(JSON.stringify(config.commission, null, 2), 'cyan');

  if (cloudFunctionCode) {
    // 尝试从云函数代码中提取佣金比例
    const basicMatch = cloudFunctionCode.match(/level1[\s:=]+(\d+)/);
    const level2Match = cloudFunctionCode.match(/level2[\s:=]+(\d+)/);
    const level3Match = cloudFunctionCode.match(/level3[\s:=]+(\d+)/);
    const level4Match = cloudFunctionCode.match(/level4[\s:=]+(\d+)/);

    if (basicMatch || level2Match || level3Match || level4Match) {
      log('\n📋 云函数配置 (promotion/index.js):', 'yellow');
      log(`  level1: ${basicMatch ? basicMatch[1] : '未找到'}`, 'yellow');
      log(`  level2: ${level2Match ? level2Match[1] : '未找到'}`, 'yellow');
      log(`  level3: ${level3Match ? level3Match[1] : '未找到'}`, 'yellow');
      log(`  level4: ${level4Match ? level4Match[1] : '未找到'}`, 'yellow');
    } else {
      log('\n⚠️ 无法从云函数代码中提取佣金比例', 'yellow');
      log('  提示: 云函数可能使用不同的变量名或配置文件', 'yellow');
    }
  }

  log('\n✅ 验证建议:', 'green');
  log('  1. 确认云函数中的佣金比例与 config.js 一致', 'white');
  log('  2. 检查云函数是否使用 constants.js 或其他配置文件', 'white');
  log('  3. 验证所有百分比是否正确（注意单位转换）', 'white');
}

/**
 * 检查关键函数实现
 */
function checkKeyFunctions() {
  const cloudFunctionCode = readCloudFunctionCode();

  printSection('2. 关键函数实现检查');

  if (!cloudFunctionCode) {
    log('⚠️ 无法读取云函数代码', 'yellow');
    return;
  }

  const functions = [
    {
      name: '基础佣金计算',
      keywords: ['basic', 'commission', 'level1', 'level2', 'level3', 'level4'],
      required: true
    },
    {
      name: '复购奖励',
      keywords: ['repurchase', '复购', 'starLevel'],
      required: true
    },
    {
      name: '团队管理奖',
      keywords: ['management', '管理奖', 'level-difference'],
      required: true
    },
    {
      name: '育成津贴',
      keywords: ['nurture', '育成', 'mentor'],
      required: true
    },
    {
      name: '晋升检查',
      keywords: ['promotion', '晋升', 'starLevel', 'checkPromotion'],
      required: true
    },
    {
      name: '月度业绩重置',
      keywords: ['monthSales', 'monthTag', 'reset', '重置'],
      required: true
    }
  ];

  functions.forEach(func => {
    const found = func.keywords.some(keyword =>
      cloudFunctionCode.toLowerCase().includes(keyword.toLowerCase())
    );

    const status = found ? '✅' : '❌';
    const color = found ? 'green' : 'red';
    const requirement = func.required ? '(必需)' : '(可选)';

    log(`  ${status} ${func.name} ${requirement}`, color);
  });

  log('\n✅ 验证建议:', 'green');
  log('  1. 确保所有关键功能都已实现', 'white');
  log('  2. 检查函数名称和变量名的一致性', 'white');
  log('  3. 验证逻辑是否与计算引擎一致', 'white');
}

/**
 * 检查潜在问题
 */
function checkPotentialIssues() {
  const cloudFunctionCode = readCloudFunctionCode();

  printSection('3. 潜在问题检查');

  if (!cloudFunctionCode) {
    log('⚠️ 无法读取云函数代码', 'yellow');
    return;
  }

  const issues = [];

  // 检查1: 并发订单的业绩更新
  if (cloudFunctionCode.includes('monthSales') && cloudFunctionCode.includes('update')) {
    if (!cloudFunctionCode.includes('atomic') || !cloudFunctionCode.includes('transaction')) {
      issues.push({
        severity: '高',
        title: '并发订单的业绩更新竞争条件',
        description: '月度业绩更新可能存在竞争条件，多笔订单同时完成时可能导致数据覆盖',
        recommendation: '使用数据库原子操作或事务处理'
      });
    }
  }

  // 检查2: 输入验证
  if (!cloudFunctionCode.includes('validate') && !cloudFunctionCode.includes('check')) {
    issues.push({
      severity: '中',
      title: '缺少输入验证',
      description: '云函数可能没有验证输入参数（订单金额、用户ID等）',
      recommendation: '添加输入验证逻辑'
    });
  }

  // 检查3: 错误处理
  const tryCatchCount = (cloudFunctionCode.match(/try\s*{/g) || []).length;
  if (tryCatchCount === 0) {
    issues.push({
      severity: '高',
      title: '缺少错误处理',
      description: '云函数可能没有 try-catch 错误处理',
      recommendation: '添加完整的错误处理逻辑'
    });
  }

  // 检查4: 数据库索引
  if (!cloudFunctionCode.includes('index') && !cloudFunctionCode.includes('createIndex')) {
    issues.push({
      severity: '中',
      title: '数据库索引可能缺失',
      description: '推广关系查询可能需要数据库索引优化',
      recommendation: '在 promotionPath、_openid 等字段上创建索引'
    });
  }

  // 检查5: 重复计算
  if (cloudFunctionCode.includes('rewardSettled')) {
    if (!cloudFunctionCode.includes('rewardSettled') || !cloudFunctionCode.includes('if')) {
      issues.push({
        severity: '高',
        title: '可能重复计算奖励',
        description: '订单可能被重复结算奖励',
        recommendation: '确保有幂等性检查（rewardSettled 标志）'
      });
    }
  }

  if (issues.length === 0) {
    log('\n✅ 未发现明显的潜在问题', 'green');
  } else {
    log(`\n⚠️ 发现 ${issues.length} 个潜在问题:\n`, 'yellow');

    issues.forEach((issue, index) => {
      const severityColor = issue.severity === '高' ? 'red' : 'yellow';
      log(`${index + 1}. [${issue.severity}] ${issue.title}`, severityColor);
      log(`   问题: ${issue.description}`, 'white');
      log(`   建议: ${issue.recommendation}`, 'white');
      log('');
    });
  }

  log('✅ 验证建议:', 'green');
  log('  1. 逐个检查上述潜在问题', 'white');
  log('  2. 根据严重程度优先修复', 'white');
  log('  3. 修复后重新运行测试验证', 'white');
}

/**
 * 生成对比报告
 */
function generateComparisonReport() {
  log('\n' + '█'.repeat(80), 'blue');
  log('云函数实现对比工具', 'blue');
  log('Cloud Function Implementation Comparison Tool', 'blue');
  log('█'.repeat(80) + '\n', 'blue');

  extractConfigurations();
  checkKeyFunctions();
  checkPotentialIssues();

  printSection('总结');

  log('\n📋 下一步行动:', 'cyan');
  log('  1. 仔细审查上述发现的问题', 'white');
  log('  2. 修复高优先级问题', 'white');
  log('  3. 运行完整测试套件验证修复', 'white');
  log('  4. 在真实环境中进行集成测试', 'white');

  log('\n' + '█'.repeat(80) + '\n', 'blue');
}

// 运行对比工具
if (require.main === module) {
  generateComparisonReport();
}

module.exports = { generateComparisonReport };
