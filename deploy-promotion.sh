#!/bin/bash

# 分销系统云函数部署脚本
# 用于部署 promotion 云函数到腾讯云开发环境

set -e  # 遇到错误立即退出

echo "================================================"
echo "  大友元气精酿 - 分销系统云函数部署"
echo "================================================"
echo ""

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 项目路径
PROJECT_DIR="/Users/johnny/Desktop/小程序/perfectlifeexperience"
CLOUD_FUNC_DIR="$PROJECT_DIR/cloudfunctions/promotion"

echo -e "${YELLOW}步骤 1: 检查云函数代码...${NC}"
cd "$CLOUD_FUNC_DIR"

# 检查关键文件
if [ ! -f "index.js" ]; then
  echo -e "${RED}错误: index.js 文件不存在${NC}"
  exit 1
fi

if [ ! -f "common/constants.js" ]; then
  echo -e "${RED}错误: common/constants.js 文件不存在${NC}"
  exit 1
fi

echo -e "${GREEN}✓ 云函数代码文件检查通过${NC}"
echo ""

echo -e "${YELLOW}步骤 2: 验证佣金配置修改...${NC}"
# 检查 constants.js 中是否包含新的佣金配置
if grep -q "HEAD_OFFICE_SHARE: 0.80" common/constants.js; then
  echo -e "${GREEN}✓ 发现新的总公司分成配置 (80%)${NC}"
else
  echo -e "${RED}✗ 未找到新的总公司分成配置${NC}"
  echo "请确认 common/constants.js 已更新"
  exit 1
fi

if grep -q "LEVEL_1: 0.10" common/constants.js; then
  echo -e "${GREEN}✓ 发现新的一级代理佣金配置 (10%)${NC}"
else
  echo -e "${RED}✗ 未找到新的一级代理佣金配置${NC}"
  exit 1
fi

echo ""
echo -e "${YELLOW}步骤 3: 创建部署包...${NC}"
# 创建临时部署目录
DEPLOY_DIR="/tmp/promotion-deploy-$(date +%s)"
mkdir -p "$DEPLOY_DIR"

# 复制必要文件
cp index.js "$DEPLOY_DIR/"
cp package.json "$DEPLOY_DIR/"
cp config.json "$DEPLOY_DIR/"
cp -r common "$DEPLOY_DIR/"

echo -e "${GREEN}✓ 部署包创建完成: $DEPLOY_DIR${NC}"
echo ""

echo -e "${YELLOW}步骤 4: 安装云函数依赖...${NC}"
cd "$DEPLOY_DIR"
npm install --production

echo -e "${GREEN}✓ 依赖安装完成${NC}"
echo ""

echo -e "${YELLOW}步骤 5: 部署方式选择...${NC}"
echo ""
echo "请选择部署方式："
echo "1) 微信开发者工具 (推荐)"
echo "2) 腾讯云开发 CLI (tcb commands)"
echo "3) 腾讯云控制台手动上传"
echo ""
read -p "请输入选项 (1-3): " deploy_method

case $deploy_method in
  1)
    echo ""
    echo -e "${GREEN}=== 微信开发者工具部署指引 ===${NC}"
    echo ""
    echo "请按照以下步骤操作："
    echo ""
    echo "1. 打开微信开发者工具"
    echo "2. 导入项目: $PROJECT_DIR"
    echo "3. 在左侧文件目录中找到 cloudfunctions/promotion"
    echo "4. 右键点击 promotion 文件夹"
    echo "5. 选择 '上传并部署：云端安装依赖'"
    echo "6. 等待部署完成"
    echo ""
    echo "部署完成后，云函数将自动使用新的佣金配置。"
    echo ""
    ;;
  2)
    echo ""
    echo -e "${GREEN}=== 腾讯云开发 CLI 部署 ===${NC}"
    echo ""
    echo "首先安装 CLI 工具："
    echo "  npm install -g @cloudbase/cli"
    echo ""
    echo "然后登录云开发："
    echo "  tcb login"
    echo ""
    echo "最后部署云函数："
    echo "  tcb functions:deploy promotion"
    echo ""
    echo "或者使用完整路径："
    echo "  cd $CLOUD_FUNC_DIR"
    echo "  tcb functions:deploy"
    echo ""
    ;;
  3)
    echo ""
    echo -e "${GREEN}=== 腾讯云控制台手动部署 ===${NC}"
    echo ""
    echo "请按照以下步骤操作："
    echo ""
    echo "1. 访问云开发控制台:"
    echo "   https://tcb.cloud.tencent.com/dev?envId=cloud1-6gmp2q0y3171c353#/function"
    echo ""
    echo "2. 找到 'promotion' 云函数"
    echo ""
    echo "3. 点击 '函数配置' 标签"
    echo ""
    echo "4. 在线编辑代码，将以下文件内容复制到对应位置："
    echo "   - index.js"
    echo "   - common/constants.js"
    echo "   - common/logger.js"
    echo "   - common/cache.js"
    echo ""
    echo "5. 点击 '保存' 并 '部署'"
    echo ""
    echo "或者上传部署包："
    echo "   1. 将 $DEPLOY_DIR 目录打包为 zip"
    echo "   2. 在控制台选择 '上传部署包'"
    echo "   3. 上传 zip 文件并部署"
    echo ""
    ;;
  *)
    echo -e "${RED}无效选项${NC}"
    exit 1
    ;;
esac

echo ""
echo -e "${YELLOW}步骤 6: 验证部署...${NC}"
echo ""
echo "部署完成后，请执行以下验证："
echo ""
echo "1. 在云开发控制台查看云函数日志"
echo "   https://tcb.cloud.tencent.com/dev?envId=cloud1-6gmp2q0y3171c353#/function/promotion/log"
echo ""
echo "2. 创建测试订单，验证佣金计算："
echo "   - 订单金额: ¥100"
echo "   - 预期总公司收益: ¥80 (80%)"
echo "   - 预期代理总收益: ¥20 (20%)"
echo ""
echo "3. 检查 reward_records 集合中的佣金记录"
echo ""
echo -e "${GREEN}================================================"
echo "  部署脚本执行完成！"
echo "================================================${NC}"
echo ""

# 清理临时文件
read -p "是否删除临时部署目录? (y/n): " clean_temp
if [ "$clean_temp" = "y" ]; then
  rm -rf "$DEPLOY_DIR"
  echo -e "${GREEN}✓ 临时文件已清理${NC}"
fi

echo ""
echo "如有问题，请参考文档: docs/system/COMMISSION_RESTRUCTURE_2026.md"
echo ""
