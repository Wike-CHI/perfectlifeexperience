  #!/bin/bash

# CloudBase 项目一键配置脚本
# 使用方法: bash setup-cloudbase.sh

set -e

ENV_ID="cloud1-6gmp2q0y3171c353"

echo "========================================"
echo "  CloudBase 项目一键配置脚本"
echo "  环境: $ENV_ID"
echo "========================================"
echo ""

# 检查 CLI 是否安装
if ! command -v cloudbase &> /dev/null && ! command -v tcb &> /dev/null; then
    echo "❌ CloudBase CLI 未安装"
    echo "请先安装: npm install -g @cloudbase/cli"
    exit 1
fi

echo "✅ CloudBase CLI 已安装"
echo ""

# 步骤 1: 登录
echo "========================================"
echo "📝 步骤 1/4: 登录 CloudBase"
echo "========================================"
echo "正在打开浏览器进行微信扫码登录..."
cloudbase login
echo "✅ 登录成功"
echo ""

# 步骤 2: 部署云函数
echo "========================================"
echo "📦 步骤 2/4: 部署云函数"
echo "========================================"
echo "正在部署 wechatpay..."
cloudbase functions:deploy cloudfunctions/wechatpay
echo "✅ wechatpay 部署完成"

echo "正在部署 promotion..."
cloudbase functions:deploy cloudfunctions/promotion
echo "✅ promotion 部署完成"

echo "正在部署 migration..."
cloudbase functions:deploy cloudfunctions/migration
echo "✅ migration 部署完成"
echo ""

# 步骤 3: 环境变量配置提示
echo "========================================"
echo "⚠️  步骤 3/4: 配置环境变量"
echo "========================================"
echo "wechatpay 云函数需要配置以下环境变量："
echo ""
echo "cloudbase functions:config update wechatpay \\"
echo "  WX_PAY_MCH_ID='你的商户号' \\"
echo "  WX_PAY_SERIAL_NO='证书序列号' \\"
echo "  WX_PAY_PRIVATE_KEY='商户私钥' \\"
echo "  WX_PAY_API_V3_KEY='APIv3密钥' \\"
echo "  WX_PAY_NOTIFY_URL='支付回调URL'"
echo ""
echo "⚠️ 注意: 敏感信息建议通过控制台配置"
echo "控制台链接: https://tcb.cloud.tencent.com/dev?envId=$ENV_ID#/scf"
echo ""

# 步骤 4: 数据库安全规则
echo "========================================"
echo "🔒 步骤 4/4: 配置数据库安全规则"
echo "========================================"
echo "⚠️ 数据库安全规则现在是按集合单独配置的"
echo ""
echo "1. 访问文档型数据库页面:"
echo "   https://tcb.cloud.tencent.com/dev?envId=$ENV_ID#/db/doc"
echo ""
echo "2. 点击集合名称进入详情页，配置该集合的安全规则"
echo ""
echo "重要集合配置链接:"
echo "   users:     https://tcb.cloud.tencent.com/dev?envId=$ENV_ID#/db/doc/collection/users"
echo "   orders:    https://tcb.cloud.tencent.com/dev?envId=$ENV_ID#/db/doc/collection/orders"
echo "   products:  https://tcb.cloud.tencent.com/dev?envId=$ENV_ID#/db/doc/collection/products"
echo ""
echo "参考文件: database.rules.json"
echo "每个集合需要单独粘贴对应的安全规则"
echo ""

# 完成
echo "========================================"
echo "✅ 配置完成！"
echo "========================================"
echo ""
echo "📋 后续步骤:"
echo "1. 在控制台配置数据库安全规则"
echo "2. 配置 wechatpay 环境变量"
echo "3. 重新编译小程序: npm run dev:mp-weixin"
echo ""
echo "📖 详细指南: CLOUDBASE_CLI_GUIDE.md"
echo ""
