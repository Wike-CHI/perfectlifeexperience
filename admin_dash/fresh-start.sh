#!/bin/bash

echo "🔧 完全重置项目并重新启动"
echo "=========================================="
echo ""

# 进入项目目录
cd /Users/johnny/Desktop/小程序/perfectlifeexperience/admin_dash

echo "📋 步骤 1/5: 清理旧的依赖..."
rm -rf node_modules package-lock.json .vite
echo "✓ 清理完成"
echo ""

echo "📋 步骤 2/5: 修复 package.json（添加缺失的 vue-router 依赖）..."
# 虽然我们不用 vue-router，但 uni-app 可能需要它来避免解析错误
if ! grep -q '"vue-router"' package.json; then
  # 添加 vue-router 到 dependencies
  sed -i '' 's/"vue": "3.4.21",/"vue": "3.4.21",\n    "vue-router": "4.3.0",/' package.json
  echo "✓ 添加 vue-router"
else
  echo "✓ vue-router 已存在"
fi
echo ""

echo "📋 步骤 3/5: 重新安装依赖..."
npm install --legacy-peer-deps
if [ $? -eq 0 ]; then
  echo "✓ 依赖安装成功"
else
  echo "❌ 依赖安装失败"
  echo "请尝试手动运行: npm install"
  exit 1
fi
echo ""

echo "📋 步骤 4/5: 修复 uni-popup 组件 bug..."
# 修复 uni-popup 组件中的重复变量声明问题
PATCH_FILE="node_modules/@dcloudio/uni-ui/lib/uni-popup/uni-popup.vue"
if [ -f "$PATCH_FILE" ]; then
  # 检查是否已修复（搜索特征）
  if grep -q "= uni.getSystemInfoSync()" "$PATCH_FILE" 2>/dev/null; then
    # 将 const { ... } = uni.getSystemInfoSync() 替换为 ({ ... } = uni.getSystemInfoSync())
    sed -i '' 's/const {$/({/' "$PATCH_FILE"
    sed -i '' 's/\t\t\t\t} = uni\.getSystemInfoSync()$/} = uni.getSystemInfoSync())/' "$PATCH_FILE"
    echo "✓ uni-popup 组件已修复"
  else
    echo "✓ uni-popup 组件已是最新的"
  fi
else
  echo "⚠️  警告: uni-popup 文件不存在，跳过修复"
fi
echo ""

echo "📋 步骤 5/7: 修复 Sass 弃用警告..."
# 将 @import 替换为 @use（Sass 新语法）
LC_ALL=C find src -name "*.vue" -type f -exec sed -i '' 's/@import "\@\/styles\/variables\.scss";/@use "\@\/styles\/variables.scss" as *;/g' {} \;
LC_ALL=C find src -name "*.vue" -type f -exec sed -i '' 's/@import "\@\/styles\/variables\.scss" as \*;/@use "\@\/styles\/variables.scss" as *;/g' {} \;
echo "✓ Sass 语法已更新"
echo ""

echo "📋 步骤 6/7: 清理编译缓存..."
rm -rf node_modules/.vite dist unpackage
echo "✓ 缓存已清理"
echo ""

echo "=========================================="

echo "=========================================="
echo "🚀 启动开发服务器..."
echo ""
echo "访问地址: http://localhost:9000/pages/admin/login/index"
echo ""
echo "登录信息:"
echo "  用户名: admin"
echo "  密码: admin123"
echo ""
echo "按 Ctrl+C 停止服务器"
echo "=========================================="
echo ""

# 启动服务器
npm run dev:h5
