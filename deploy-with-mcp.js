/**
 * 使用 CloudBase MCP 部署云函数
 * 
 * 使用方法:
 * node deploy-with-mcp.js <functionName>
 * 
 * 示例:
 * node deploy-with-mcp.js initAdminData
 */

const { execSync } = require('child_process');
const path = require('path');

// 配置
const ENV_ID = 'cloud1-6gmp2q0y3171c353';
const FUNCTION_ROOT = path.resolve(__dirname, 'cloudfunctions');

// 获取命令行参数
const functionName = process.argv[2];

if (!functionName) {
  console.error('❌ 请指定云函数名称');
  console.error('用法: node deploy-with-mcp.js <functionName>');
  process.exit(1);
}

console.log(`🚀 开始部署云函数: ${functionName}`);
console.log(`📁 函数根目录: ${FUNCTION_ROOT}`);
console.log(`☁️  环境ID: ${ENV_ID}`);

// 检查函数目录是否存在
const functionPath = path.join(FUNCTION_ROOT, functionName);
const fs = require('fs');

if (!fs.existsSync(functionPath)) {
  console.error(`❌ 云函数目录不存在: ${functionPath}`);
  process.exit(1);
}

// 检查 index.js 是否存在
const indexPath = path.join(functionPath, 'index.js');
if (!fs.existsSync(indexPath)) {
  console.error(`❌ 入口文件不存在: ${indexPath}`);
  process.exit(1);
}

console.log('✅ 云函数目录检查通过');

// 输出 MCP 调用参数
console.log('\n📋 MCP 调用参数:');
console.log(JSON.stringify({
  tool: 'cloudbase.updateFunctionCode',
  params: {
    envId: ENV_ID,
    functionRootPath: FUNCTION_ROOT,
    func: {
      name: functionName,
      runtime: 'Nodejs16.13'
    }
  }
}, null, 2));

console.log('\n⚠️  请手动执行以下操作之一:');
console.log('\n方式1 - 使用微信开发者工具:');
console.log('  1. 打开微信开发者工具');
console.log(`  2. 右键 cloudfunctions/${functionName}`);
console.log('  3. 选择 "创建并部署：云端安装依赖"');

console.log('\n方式2 - 使用 CloudBase CLI:');
console.log(`  tcb functions:deploy ${functionName} --env ${ENV_ID}`);

console.log('\n方式3 - 使用 CloudBase 控制台:');
console.log(`  https://tcb.cloud.tencent.com/dev?envId=${ENV_ID}#/scf`);

console.log('\n✅ 准备就绪，请手动部署！');
