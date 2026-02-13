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

echo "📋 步骤 4/5: 清理编译缓存..."
rm -rf node_modules/.vite dist unpackage
echo "✓ 缓存已清理"
echo ""

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
