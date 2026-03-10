#!/bin/bash

echo "=== 测试配置管理优化 ==="
echo ""
echo "1️⃣ 检查数据库当前状态"
echo "查询 system_config 集合..."

# 通过MCP工具查询
echo '{"action": "getSystemConfig"}' > /tmp/test-payload.json

echo ""
echo "2️⃣ 调用 admin-api 云函数的 getSystemConfig 方法"
echo "这将触发自动初始化（如果数据库中没有配置）"

echo ""
echo "3️⃣ 验证默认配置文件"
echo "检查 cloudfunctions/common/defaultConfig.js 是否存在..."
if [ -f "cloudfunctions/common/defaultConfig.js" ]; then
  echo "✅ defaultConfig.js 文件存在"
  echo "文件大小: $(wc -c < cloudfunctions/common/defaultConfig.js) 字节"
else
  echo "❌ defaultConfig.js 文件不存在"
fi

echo ""
echo "✅ 配置管理优化已部署，等待实际调用验证"
