#!/bin/bash

echo "=================================================="
echo "    配置管理优化验证测试"
echo "=================================================="
echo ""

PASS=0
FAIL=0

# 测试1: 检查defaultConfig.js文件
echo "📁 测试1: 检查默认配置模块"
if [ -f "cloudfunctions/common/defaultConfig.js" ]; then
  echo "✅ defaultConfig.js 存在"
  SIZE=$(wc -c < cloudfunctions/common/defaultConfig.js)
  echo "   文件大小: $SIZE 字节"
  
  # 检查关键值
  if grep -q "level3Commission: 12" cloudfunctions/common/defaultConfig.js; then
    echo "   ✅ level3Commission = 12 (正确)"
    ((PASS++))
  else
    echo "   ❌ level3Commission 值不正确"
    ((FAIL++))
  fi
  
  if grep -q "level4Commission: 8" cloudfunctions/common/defaultConfig.js; then
    echo "   ✅ level4Commission = 8 (正确)"
    ((PASS++))
  else
    echo "   ❌ level4Commission 值不正确"
    ((FAIL++))
  fi
  
  if grep -q "maxWithdrawAmount: 50000" cloudfunctions/common/defaultConfig.js; then
    echo "   ✅ maxWithdrawAmount = 50000 (正确)"
    ((PASS++))
  else
    echo "   ❌ maxWithdrawAmount 值不正确"
    ((FAIL++))
  fi
  
  if grep -q "maxDailyWithdraws: 3" cloudfunctions/common/defaultConfig.js; then
    echo "   ✅ maxDailyWithdraws = 3 (正确)"
    ((PASS++))
  else
    echo "   ❌ maxDailyWithdraws 值不正确"
    ((FAIL++))
  fi
else
  echo "❌ defaultConfig.js 不存在"
  ((FAIL++))
fi

echo ""
echo "📁 测试2: 检查admin-api misc.js"
if [ -f "cloudfunctions/admin-api/modules/misc.js" ]; then
  echo "✅ misc.js 存在"
  
  if grep -q "ensureSystemConfig\|getSystemConfigWithFallback" cloudfunctions/admin-api/modules/misc.js; then
    echo "   ✅ 已引用统一配置模块"
    ((PASS++))
  else
    echo "   ❌ 未引用统一配置模块"
    ((FAIL++))
  fi
else
  echo "❌ misc.js 不存在"
  ((FAIL++))
fi

echo ""
echo "📁 测试3: 检查commission-wallet"
if [ -f "cloudfunctions/commission-wallet/index.js" ]; then
  echo "✅ commission-wallet/index.js 存在"
  
  if grep -q "getSystemConfigWithFallback" cloudfunctions/commission-wallet/index.js; then
    echo "   ✅ 已引用统一配置模块"
    ((PASS++))
  else
    echo "   ❌ 未引用统一配置模块"
    ((FAIL++))
  fi
else
  echo "❌ commission-wallet/index.js 不存在"
  ((FAIL++))
fi

echo ""
echo "📁 测试4: 检查前端管理端界面"
if [ -f "src/pagesAdmin/settings/config.vue" ]; then
  echo "✅ config.vue 存在"
  
  if grep -q "maxWithdrawAmount.*'500'" src/pagesAdmin/settings/config.vue; then
    echo "   ✅ 前端已添加maxWithdrawAmount字段"
    ((PASS++))
  else
    echo "   ❌ 前端未添加maxWithdrawAmount字段"
    ((FAIL++))
  fi
  
  if grep -q "maxDailyWithdraws.*'3'" src/pagesAdmin/settings/config.vue; then
    echo "   ✅ 前端已添加maxDailyWithdraws字段"
    ((PASS++))
  else
    echo "   ❌ 前端未添加maxDailyWithdraws字段"
    ((FAIL++))
  fi
else
  echo "❌ config.vue 不存在"
  ((FAIL++))
fi

echo ""
echo "📁 测试5: 检查文档"
if [ -f "docs/optimization/CONFIG_MANAGEMENT_IMPROVEMENT.md" ]; then
  echo "✅ CONFIG_MANAGEMENT_IMPROVEMENT.md 存在"
  ((PASS++))
else
  echo "❌ CONFIG_MANAGEMENT_IMPROVEMENT.md 不存在"
  ((FAIL++))
fi

if [ -f "docs/optimization/CONFIG_TEST_GUIDE.md" ]; then
  echo "✅ CONFIG_TEST_GUIDE.md 存在"
  ((PASS++))
else
  echo "❌ CONFIG_TEST_GUIDE.md 不存在"
  ((FAIL++))
fi

echo ""
echo "=================================================="
echo "    测试结果汇总"
echo "=================================================="
echo "✅ 通过: $PASS"
echo "❌ 失败: $FAIL"
echo ""

if [ $FAIL -eq 0 ]; then
  echo "🎉 所有验证测试通过！配置管理优化部署成功！"
  echo ""
  echo "📝 下一步："
  echo "1. 在微信开发者工具中测试管理端配置页面"
  echo "2. 测试用户端提现功能"
  echo "3. 验证数据库配置正确性"
  exit 0
else
  echo "⚠️  存在 $FAIL 个问题，请检查上述失败项"
  exit 1
fi
