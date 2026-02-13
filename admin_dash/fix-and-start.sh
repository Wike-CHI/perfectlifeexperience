#!/bin/bash

echo "🔧 修复依赖问题并启动管理后台"
echo "======================================"
echo ""

# 进入项目目录
cd /Users/johnny/Desktop/小程序/perfectlifeexperience/admin_dash

echo "✓ 进入项目目录"
echo ""

# 修复 node_modules 权限
echo "🔑 修复 node_modules 权限..."
sudo chown -R $(whoami):staff node_modules 2>/dev/null
if [ $? -eq 0 ]; then
    echo "✓ 权限修复成功"
else
    echo "⚠️  需要手动输入密码"
    sudo chown -R $(whoami):staff node_modules
fi

echo ""

# 删除 node_modules 和 lock 文件
echo "🗑️  删除旧的依赖和锁文件..."
rm -rf node_modules package-lock.json
echo "✓ 删除完成"
echo ""

# 重新安装依赖
echo "📦 重新安装依赖（这可能需要几分钟）..."
npm install

if [ $? -eq 0 ]; then
    echo "✓ 依赖安装成功"
else
    echo "❌ 依赖安装失败"
    exit 1
fi

echo ""

# 清理 vite 缓存
echo "🧹 清理 vite 缓存..."
rm -rf node_modules/.vite
echo "✓ 缓存已清理"
echo ""

echo "======================================"
echo "🚀 启动开发服务器..."
echo ""
echo "访问地址: http://localhost:9000/pages/admin/login/index"
echo ""
echo "登录信息:"
echo "  用户名: admin"
echo "  密码: admin123"
echo ""
echo "按 Ctrl+C 可以停止服务器"
echo "======================================"
echo ""

# 启动开发服务器
npm run dev:h5
