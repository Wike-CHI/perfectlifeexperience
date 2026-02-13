#!/bin/bash

echo "🚀 管理后台系统启动脚本"
echo "============================"
echo ""

# 检查是否在正确的目录
if [ ! -f "package.json" ]; then
    echo "❌ 错误: 请先 cd 到 admin_dash 目录"
    echo "   cd /Users/johnny/Desktop/小程序/perfectlifeexperience/admin_dash"
    exit 1
fi

echo "✓ 目录检查通过"
echo ""

# 修复 node_modules 权限
echo "🔧 修复 node_modules 权限..."
sudo chown -R $(whoami):staff node_modules 2>/dev/null
if [ $? -eq 0 ]; then
    echo "✓ 权限修复成功"
else
    echo "⚠️  需要手动修复权限，请输入密码"
    sudo chown -R $(whoami):staff node_modules
fi

echo ""

# 清理缓存
echo "🧹 清理缓存..."
rm -rf node_modules/.vite
echo "✓ 缓存已清理"
echo ""

# 检查依赖
if [ ! -d "node_modules/@cloudbase" ]; then
    echo "📦 安装依赖..."
    npm install
else
    echo "✓ 依赖已安装"
fi

echo ""
echo "🚀 启动开发服务器..."
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "服务器将在 http://localhost:9000 启动"
echo ""
echo "登录信息:"
echo "  用户名: admin"
echo "  密码: admin123"
echo ""
echo "按 Ctrl+C 可以停止服务器"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 启动服务器
npm run dev:h5
