/**
 * 前端代码字段使用分析脚本
 * 用于检查前端代码中的字段使用情况
 */

const fs = require('fs');
const path = require('path');

console.log('╔══════════════════════════════════════════════╗');
console.log('║   前端代码字段使用分析工具                    ║');
console.log('╚══════════════════════════════════════════════╝');
console.log('');

// 项目根目录
const projectRoot = path.resolve(__dirname, '..');

// 需要检查的目录
const checkDirs = [
  'src/pages/order',
  'src/pagesAdmin/orders',
  'src/pagesAdmin/orders/components',
  'src/pagesAdmin/refunds',
  'src/pagesAdmin/statistics'
];

// 检查模式
const patterns = {
  productsUsage: /(\||\|\|)\s*\.\s*products/g,
  productNameUsage: /product[Name|Image]/g,
  compatibilityCode: /\|\|\s*\.\s*(products|productName|productImage)/g
};

// 分析结果
const results = {
  files: [],
  productsUsage: [],
  compatibilityCode: [],
  summary: {}
};

function analyzeFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const relativePath = path.relative(projectRoot, filePath);
    const lines = content.split('\n');

    const fileResult = {
      file: relativePath,
      productsUsage: [],
      compatibilityCode: []
    };

    lines.forEach((line, index) => {
      const lineNumber = index + 1;

      // 检查 || products 使用
      if (/\|\|.*products/.test(line)) {
        fileResult.productsUsage.push({
          line: lineNumber,
          code: line.trim()
        });
        results.productsUsage.push({
          file: relativePath,
          line: lineNumber,
          code: line.trim()
        });
      }

      // 检查 || productName 或 || productImage 使用
      if (/\|\|.*(productName|productImage)/.test(line)) {
        fileResult.compatibilityCode.push({
          line: lineNumber,
          code: line.trim()
        });
        results.compatibilityCode.push({
          file: relativePath,
          line: lineNumber,
          code: line.trim()
        });
      }
    });

    if (fileResult.productsUsage.length > 0 || fileResult.compatibilityCode.length > 0) {
      results.files.push(fileResult);
    }

  } catch (error) {
    console.error('无法读取文件:', filePath);
    console.error('错误:', error.message);
  }
}

function analyzeDirectory(dir) {
  const fullPath = path.join(projectRoot, dir);

  if (!fs.existsSync(fullPath)) {
    console.log('⚠️  目录不存在:', dir);
    return;
  }

  const files = fs.readdirSync(fullPath);

  files.forEach(file => {
    const filePath = path.join(fullPath, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      // 递归检查子目录
      analyzeDirectory(path.join(dir, file));
    } else if (file.endsWith('.vue') || file.endsWith('.js') || file.endsWith('.ts')) {
      // 分析文件
      analyzeFile(filePath);
    }
  });
}

console.log('🔍 开始分析前端代码...');
console.log('');

// 执行分析
checkDirs.forEach(dir => {
  console.log('检查目录:', dir);
  analyzeDirectory(dir);
});

// 输出结果
console.log('');
console.log('╔══════════════════════════════════════════════╗');
console.log('║   分析结果                                     ║');
console.log('╚══════════════════════════════════════════════╝');
console.log('');

console.log('【总体统计】');
console.log('发现问题的文件数:', results.files.length);
console.log('|| products 使用次数:', results.productsUsage.length);
console.log('|| productName/productImage 使用次数:', results.compatibilityCode.length);
console.log('');

if (results.files.length === 0) {
  console.log('═══════════════════════════════════════════════');
  console.log('🎉 太好了！没有发现兼容代码，代码很干净！');
  console.log('═══════════════════════════════════════════════');
} else {
  console.log('═══════════════════════════════════════════════');
  console.log('⚠️  发现 ' + results.files.length + ' 个文件需要修复');
  console.log('═══════════════════════════════════════════════');
  console.log('');

  // 按文件分组显示
  results.files.forEach(fileResult => {
    console.log('📄 文件: ' + fileResult.file);
    console.log('─────────────────────────────────────────────');

    if (fileResult.productsUsage.length > 0) {
      console.log('  || products 使用 (' + fileResult.productsUsage.length + ' 处):');
      fileResult.productsUsage.slice(0, 3).forEach(usage => {
        console.log('    Line ' + usage.line + ': ' + usage.code.substring(0, 60));
      });
      if (fileResult.productsUsage.length > 3) {
        console.log('    ... 还有 ' + (fileResult.productsUsage.length - 3) + ' 处');
      }
    }

    if (fileResult.compatibilityCode.length > 0) {
      console.log('  || productName/productImage 使用 (' + fileResult.compatibilityCode.length + ' 处):');
      fileResult.compatibilityCode.slice(0, 3).forEach(usage => {
        console.log('    Line ' + usage.line + ': ' + usage.code.substring(0, 60));
      });
      if (fileResult.compatibilityCode.length > 3) {
        console.log('    ... 还有 ' + (fileResult.compatibilityCode.length - 3) + ' 处');
      }
    }

    console.log('');
  });

  // 统计汇总
  console.log('【详细统计】');
  const fileCounts = {};
  results.files.forEach(f => {
    const dir = path.dirname(f.file).split(path.sep).pop();
    fileCounts[dir] = (fileCounts[dir] || 0) + 1;
  });

  Object.entries(fileCounts).forEach(([dir, count]) => {
    console.log(dir + ': ' + count + ' 个文件');
  });
  console.log('');

  console.log('【修复建议】');
  console.log('1. 优先修复用户端订单页面（高优先级）');
  console.log('2. 修复管理员端订单页面（中优先级）');
  console.log('3. 修复统计和退款页面（低优先级）');
  console.log('');
  console.log('具体修复步骤请参考: docs/code-review/QUICK_START.md');
}

console.log('');
console.log('✅ 分析完成！');
console.log('');
console.log('提示: 将验证脚本复制到云开发控制台执行，验证数据库实际存储');
