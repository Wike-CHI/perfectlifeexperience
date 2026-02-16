/**
 * 腾讯云开发云函数部署脚本
 *
 * 使用方法：
 * 1. 安装依赖: npm install @cloudbase/cli
 * 2. 配置环境变量或创建 .env 文件
 * 3. 运行: node deploy-cloud-function.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 配置
const CONFIG = {
  envId: 'cloud1-6gmp2q0y3171c353',
  functionName: 'promotion',
  functionRoot: path.resolve(__dirname, 'cloudfunctions')
};

console.log('==========================================');
console.log('  大友元气精酿 - 云函数部署 (Node.js 版)');
console.log('==========================================\n');

// 步骤 1: 检查 CLI 工具
console.log('📋 步骤 1: 检查腾讯云开发 CLI...');
try {
  const version = execSync('tcb --version', { encoding: 'utf-8' });
  console.log(`✅ 已安装 CLI，版本: ${version.trim()}\n`);
} catch (error) {
  console.log('❌ 未检测到腾讯云开发 CLI\n');
  console.log('请运行以下命令安装：');
  console.log('  npm install -g @cloudbase/cli\n');
  console.log('然后运行：');
  console.log('  tcb login\n');
  process.exit(1);
}

// 步骤 2: 检查登录状态
console.log('📋 步骤 2: 检查登录状态...');
try {
  execSync('tcb auth list', { encoding: 'utf-8', stdio: 'pipe' });
  console.log('✅ 已登录\n');
} catch (error) {
  console.log('❌ 未登录\n');
  console.log('请运行: tcb login\n');
  process.exit(1);
}

// 步骤 3: 验证云函数代码
console.log('📋 步骤 3: 验证云函数代码...');
const funcDir = path.join(CONFIG.functionRoot, CONFIG.functionName);

if (!fs.existsSync(funcDir)) {
  console.log(`❌ 云函数目录不存在: ${funcDir}\n`);
  process.exit(1);
}

const indexJs = path.join(funcDir, 'index.js');
const constantsJs = path.join(funcDir, 'common/constants.js');

if (!fs.existsSync(indexJs) || !fs.existsSync(constantsJs)) {
  console.log('❌ 缺少必要的文件\n');
  process.exit(1);
}

// 验证佣金配置
const constantsContent = fs.readFileSync(constantsJs, 'utf-8');
if (constantsContent.includes('HEAD_OFFICE_SHARE: 0.80')) {
  console.log('✅ 发现新的总公司分成配置 (80%)');
}
if (constantsContent.includes('LEVEL_1: 0.10')) {
  console.log('✅ 发现新的一级代理佣金配置 (10%)');
}
console.log('');

// 步骤 4: 部署云函数
console.log('📋 步骤 4: 部署云函数...');
console.log(`   环境 ID: ${CONFIG.envId}`);
console.log(`   函数名: ${CONFIG.functionName}`);
console.log(`   路径: ${funcDir}\n`);

console.log('🚀 开始部署...\n');

try {
  const deployCommand = `cd "${funcDir}" && tcb functions:deploy ${CONFIG.functionName} --envId ${CONFIG.envId}`;
  console.log(`执行命令: ${deployCommand}\n`);

  execSync(deployCommand, {
    encoding: 'utf-8',
    stdio: 'inherit'
  });

  console.log('\n==========================================');
  console.log('✅ 部署成功！');
  console.log('==========================================\n');
  console.log('📊 验证部署：');
  console.log('   1. 访问云开发控制台');
  console.log(`      https://tcb.cloud.tencent.com/dev?envId=${CONFIG.envId}#/function`);
  console.log('');
  console.log('   2. 查找 promotion 云函数');
  console.log('   3. 点击 "函数代码" 验证佣金配置已更新');
  console.log('');
  console.log('   4. 创建测试订单验证佣金计算');
  console.log('      - 订单金额: ¥100');
  console.log('      - 预期总公司收益: ¥80 (80%)');
  console.log('      - 预期代理总收益: ¥20 (20%)\n');

} catch (error) {
  console.log('\n==========================================');
  console.log('❌ 部署失败');
  console.log('==========================================\n');
  console.log('请检查：');
  console.log('   1. 网络连接是否正常');
  console.log('   2. 是否已登录腾讯云开发 (tcb login)');
  console.log('   3. 环境 ID 是否正确');
  console.log('   4. 云函数代码是否完整\n');
  console.log(`错误信息: ${error.message}\n`);
  process.exit(1);
}
