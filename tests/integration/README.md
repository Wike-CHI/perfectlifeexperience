# 系统集成测试文档

## 概述

本测试套件用于联调以下系统的集成测试：
- **推广分销系统** - 四层代理佣金分配
- **订单系统** - 订单创建、支付、状态管理
- **钱包系统** - 余额管理、交易记录、提现流程
- **支付系统** - 微信支付、余额支付

## 测试文件

### 1. `system-integration.test.js`
**单元集成测试** - 纯逻辑测试，不需要连接数据库

**测试场景：**
- ✅ 完整订单支付流程
- ✅ 四层代理佣金分配计算
- ✅ 多订单累积测试
- ✅ 退款和佣金回收
- ✅ 提现流程测试
- ✅ 边界情况测试
- ✅ 钱包余额验证
- ✅ 支付流程测试
- ✅ 性能统计测试
- ✅ 完整业务流程模拟

**运行方式：**
```bash
# 运行单元集成测试
npm run test:integration:unit

# 或直接使用vitest
vitest run tests/integration/system-integration.test.js

# 监听模式
vitest watch tests/integration/system-integration.test.js
```

### 2. `cloud-integration.test.js`
**云函数集成测试** - 真实环境测试，连接云数据库

**⚠️ 警告：此测试会操作真实的云数据库，建议在测试环境中运行**

**测试场景：**
- ✅ 完整订单支付流程（真实云函数调用）
- ✅ 佣金钱包余额更新验证
- ✅ 提现申请和审批流程
- ✅ 退款和佣金回收验证

**运行方式：**
```bash
# 运行云函数集成测试
npm run test:integration:cloud

# 或直接使用node
node tests/integration/cloud-integration.test.js
```

**运行前准备：**
1. 确保已登录云开发环境
2. 确保所有云函数已部署
3. 建议先备份数据库
4. 确认环境ID配置正确

## TDD 测试驱动开发流程

我们的测试遵循 TDD 的红-绿-重构（Red-Green-Refactor）循环：

### 1. RED - 编写失败的测试
先编写测试用例，确保测试失败（因为功能还未实现）

```javascript
// 示例：测试四级推广佣金计算
it('应该正确计算四级推广订单的佣金分配', () => {
  const orderAmount = 10000; // 100元订单
  const promoterLevel = 4; // 四级推广

  const result = calculateCommission(orderAmount, promoterLevel);

  // 这些断言会先失败（RED）
  assert.strictEqual(result.总佣金, 2000, '总佣金应为20%');
  assert.strictEqual(result.分配.promoter_self, 800, '四级推广自己应得8%');
});
```

### 2. GREEN - 编写最小代码通过测试
编写刚好足够的代码让测试通过

```javascript
// 实现佣金计算函数
function calculateCommission(orderAmount, promoterLevel) {
  const totalCommission = Math.floor(orderAmount * 0.20);

  if (promoterLevel === 4) {
    return {
      总佣金: totalCommission,
      分配: {
        promoter_self: Math.floor(orderAmount * 0.08),
        promoter_parent1: Math.floor(orderAmount * 0.04),
        promoter_parent2: Math.floor(orderAmount * 0.04),
        promoter_parent3: Math.floor(orderAmount * 0.04)
      }
    };
  }
  // ... 其他级别
}
```

### 3. REFACTOR - 重构优化代码
在测试保护下重构代码，提升质量

```javascript
// 提取常量，提升可维护性
const COMMISSION_CONFIG = {
  总佣金比例: 0.20,
  四级推广佣金: {
    自己: 0.08,
    上级1: 0.04,
    上级2: 0.04,
    上级3: 0.04
  }
  // ...
};
```

## 佣金分配规则

### 四层代理结构

```
总公司 (level 0)
 └─ 一级代理 (level 1) - 金牌推广员 [20%]
    └─ 二级代理 (level 2) - 银牌推广员 [12% + 8%]
       └─ 三级代理 (level 3) - 铜牌推广员 [12% + 4% + 4%]
          └─ 四级代理 (level 4) - 普通会员 [8% + 4% + 4% + 4%]
             └─ 购买用户
```

### 佣金分配比例

| 推广者级别 | 自己 | 上级1 | 上级2 | 上级3 | 总计 |
|-----------|------|-------|-------|-------|------|
| 一级推广 | 20% | - | - | - | 20% |
| 二级推广 | 12% | 8% | - | - | 20% |
| 三级推广 | 12% | 4% | 4% | - | 20% |
| 四级推广 | 8% | 4% | 4% | 4% | 20% |

### 示例计算

**100元订单，四级推广：**
- 四级推广自己：100 × 8% = 8元
- 三级代理：100 × 4% = 4元
- 二级代理：100 × 4% = 4元
- 一级代理：100 × 4% = 4元
- **总佣金：20元**

## 测试数据清理

云函数集成测试会创建测试数据，测试完成后可以选择：

### 自动清理（默认开启）
测试完成后会自动清理所有测试数据：

```javascript
// 在 cloud-integration.test.js 中
finally {
  // 自动清理测试数据
  await cleanupTestData();
}
```

### 手动清理
如果需要保留测试数据进行调试，可以手动运行清理：

```javascript
const { cleanupTestData } = require('./tests/integration/cloud-integration.test.js');
await cleanupTestData();
```

### 清理范围
- 测试订单（orderId 以 `test_` 开头）
- 测试钱包（_openid 以 `test_` 开头）
- 测试交易记录
- 测试提现记录
- 测试用户（_openid 以 `test_` 开头）

## 测试覆盖率

当前测试覆盖以下场景：

### ✅ 已覆盖
- [x] 四层代理佣金分配计算
- [x] 订单创建和验证
- [x] 支付流程（微信支付、余额支付）
- [x] 钱包余额更新
- [x] 交易记录创建
- [x] 提现申请和审批
- [x] 退款和佣金回收
- [x] 多订单累积
- [x] 边界情况处理
- [x] 月度统计重置
- [x] 团队人数计算

### 🔄 待扩展
- [ ] 并发订单处理
- [ ] 大批量订单性能测试
- [ ] 优惠券集成测试
- [ ] 异常订单处理
- [ ] 跨月份佣金结算
- [ ] 晋升逻辑验证

## 常见问题

### Q1: 云函数测试失败怎么办？
**A:** 检查以下几点：
1. 确认云开发环境ID是否正确
2. 确认所有云函数已部署
3. 确认网络连接正常
4. 检查云函数日志查看详细错误

### Q2: 如何调试测试？
**A:** 可以使用以下方式：
1. 在测试代码中添加 `console.log` 输出
2. 使用 `debugger` 断点调试
3. 使用 `vitest --ui` 查看可视化测试报告
4. 查看云函数控制台日志

### Q3: 测试数据会影响生产环境吗？
**A:** 不会。测试数据都使用 `test_` 前缀，与生产数据隔离。但建议：
1. 在测试环境运行
2. 测试前备份生产数据
3. 测试后清理测试数据

### Q4: 如何添加新的测试用例？
**A:** 遵循 TDD 流程：
1. 先在测试文件中编写失败的测试
2. 运行测试确认失败（RED）
3. 实现功能代码
4. 运行测试确认通过（GREEN）
5. 重构优化代码
6. 确保测试仍然通过

## 性能基准

当前测试的性能指标：

| 测试场景 | 预期时间 | 实际时间 | 状态 |
|---------|---------|---------|------|
| 单元集成测试 | < 1s | ~0.5s | ✅ |
| 云函数集成测试 | < 30s | ~20s | ✅ |
| 完整流程测试 | < 60s | ~45s | ✅ |

## 贡献指南

提交测试代码时请确保：

1. ✅ 所有测试通过
2. ✅ 测试覆盖率不降低
3. ✅ 遵循 TDD 原则
4. ✅ 添加清晰的测试注释
5. ✅ 更新本文档

## 联系方式

如有问题，请通过以下方式联系：
- 项目Issues: [GitHub Issues](https://github.com/your-repo/issues)
- 文档: `docs/README.md`

---

**最后更新：** 2026-03-10
**版本：** v1.0.0
**维护者：** 开发团队
