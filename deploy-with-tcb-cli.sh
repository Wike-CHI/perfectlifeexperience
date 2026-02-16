#!/bin/bash

# 腾讯云开发 CLI 部署脚本
# 用于部署 promotion 云函数

set -e

echo "=========================================="
echo "  大友元气精酿 - 云函数部署 (CLI 版)"
echo "=========================================="
echo ""

PROJECT_DIR="/Users/johnny/Desktop/小程序/perfectlifeexperience"
PROMOTION_FUNC_DIR="$PROJECT_DIR/cloudfunctions/promotion"

# 检查是否安装了 cloudbase CLI
if ! command -v tcb &> /dev/null; then
    echo "❌ 未检测到腾讯云开发 CLI 工具"
    echo ""
    echo "请按以下步骤安装："
    echo "1. 安装 Node.js (如果尚未安装)"
    echo "2. 运行: npm install -g @cloudbase/cli"
    echo "3. 运行: tcb login (扫描二维码登录)"
    echo ""
    echo "安装完成后重新运行此脚本"
    exit 1
fi

echo "✅ 检测到腾讯云开发 CLI"
echo ""

# 检查登录状态
echo "📋 检查登录状态..."
if tcb auth list &> /dev/null; then
    echo "✅ 已登录腾讯云开发"
else
    echo "❌ 未登录，正在打开登录页面..."
    tcb login
fi

echo ""
echo "📦 准备部署云函数..."
echo "   环境 ID: cloud1-6gmp2q0y3171c353"
echo "   函数名: promotion"
echo "   路径: $PROMOTION_FUNC_DIR"
echo ""

# 确认部署
read -p "确认部署? (y/n): " confirm
if [ "$confirm" != "y" ]; then
    echo "❌ 取消部署"
    exit 0
fi

echo ""
echo "🚀 开始部署..."
echo ""

# 进入云函数目录
cd "$PROMOTION_FUNC_DIR"

# 部署云函数
tcb functions:deploy promotion \
    --envId cloud1-6gmp2q0y3171c353

echo ""
echo "=========================================="
if [ $? -eq 0 ]; then
    echo "✅ 部署成功！"
    echo ""
    echo "📊 验证部署："
    echo "   1. 访问云开发控制台"
    echo "   https://tcb.cloud.tencent.com/dev?envId=cloud1-6gmp2q0y3171c353#/function"
    echo ""
    echo "   2. 查找 promotion 云函数"
    echo "   3. 点击 '函数代码' 验证佣金配置已更新"
    echo ""
    echo "   4. 创建测试订单验证佣金计算"
else
    echo "❌ 部署失败"
    echo ""
    echo "请检查："
    echo "   1. 网络连接是否正常"
    echo "   2. 是否已登录腾讯云开发 (tcb login)"
    echo "   3. 环境 ID 是否正确"
fi
echo "=========================================="
echo ""
