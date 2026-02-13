#!/bin/bash

echo "🚀 更新并部署 admin-api 云函数"
echo "=========================================="
echo ""

cd /Users/johnny/Desktop/小程序/perfectlifeexperience

echo "📋 步骤 1: 云函数上传提示"
echo "1. 打开腾讯云 CloudBase 控制台"
echo "2. 导航到：云开发 → 云函数"
echo "3. 找到 admin-api 云函数"
echo "4. 点击"上传并部署：安装依赖（云端）" → 上传并部署"
echo "5. 等待部署完成"
echo ""
echo "📋 步骤 2: 初始化管理员数据"
echo "1. 在云函数列表找到 initAdminData"
echo "2. 点击"管理" → "运行" → "运行""
echo "3. 确认返回默认账号："
echo "   用户名: admin"
echo "   密码: admin123"
echo ""

echo "=========================================="
echo ""

echo "✨ 部署完成后，刷新浏览器即可看到效果！"
echo ""

echo "🌐 访问地址:"
echo "   http://localhost:5173/pages/admin/login/index"
echo ""
echo "🔑 登录账号:"
echo "   admin / admin123"
echo ""

echo "=========================================="
echo ""

read -p "按回车继续..."
