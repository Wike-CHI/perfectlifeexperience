/**
 * 云函数测试运行脚本
 * 由于云函数运行在Node.js环境，需要独立运行测试
 */

const { execSync } = require('child_process')
const path = require('path')
const fs = require('fs')

// 云函数目录
const cloudFunctionsDir = path.join(__dirname, '..', 'cloudfunctions')

// 获取所有云函数目录
const cloudFunctions = fs.readdirSync(cloudFunctionsDir, { withFileTypes: true })
  .filter(dirent => dirent.isDirectory())
  .map(dirent => dirent.name)
  .filter(name => !name.startsWith('.'))

console.log('🚀 开始运行云函数测试...\n')

let totalPassed = 0
let totalFailed = 0
const failedFunctions = []

for (const funcName of cloudFunctions) {
  const funcDir = path.join(cloudFunctionsDir, funcName)

  // 查找测试文件
  const testFiles = fs.readdirSync(funcDir)
    .filter(file => file.endsWith('.test.js') || file.endsWith('.test.ts'))

  if (testFiles.length === 0) {
    console.log(`⏭️  ${funcName}: 无测试文件`)
    continue
  }

  console.log(`\n📦 测试云函数: ${funcName}`)
  console.log('-'.repeat(40))

  for (const testFile of testFiles) {
    const testPath = path.join(funcDir, testFile)
    console.log(`  运行: ${testFile}`)

    try {
      // 运行测试文件
      execSync(`node "${testPath}"`, {
        cwd: funcDir,
        stdio: 'inherit',
        timeout: 30000,
      })
      console.log(`  ✅ 通过`)
      totalPassed++
    } catch (error) {
      console.log(`  ❌ 失败`)
      totalFailed++
      failedFunctions.push(`${funcName}/${testFile}`)
    }
  }
}

console.log('\n' + '='.repeat(50))
console.log('📊 测试结果汇总:')
console.log(`   ✅ 通过: ${totalPassed}`)
console.log(`   ❌ 失败: ${totalFailed}`)

if (failedFunctions.length > 0) {
  console.log('\n失败的测试:')
  failedFunctions.forEach(f => console.log(`   - ${f}`))
  process.exit(1)
} else {
  console.log('\n🎉 所有测试通过!')
  process.exit(0)
}
