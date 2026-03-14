# 小程序核心业务功能全量测试设计文档

**项目**: 大友元气精酿啤酒在线点单小程序
**设计日期**: 2026-03-14
**设计者**: Claude Code
**状态**: 待审查

## 1. 概述

### 1.0 与现有测试体系的关系

**现有测试资源**:
- `tests/integration/system-integration.test.js` - 系统集成测试（27个测试）
- `tests/integration/product-status-filtering.test.js` - 商品状态过滤测试（10个测试）
- `tests/security/` - 安全测试套件
- `cloudfunctions/*/test*.js` - 各云函数的独立测试

**整合策略**:
1. **保留现有测试** - 继续使用现有的集成测试和安全测试
2. **补充缺失部分** - 本设计专注于当前缺失的核心业务逻辑测试
3. **避免重复** - 不重复实现已有的测试场景
4. **统一管理** - 最终通过统一的测试脚本运行所有测试

**测试执行优先级**:
```
P0: 新单元测试 → 现有集成测试 → 场景测试
P1: Admin测试 → 优惠券测试 → 退款流程测试
P2: 性能测试 → 安全测试（已有）
```

### 1.1 目标

### 1.1 目标

设计并实现一套完整的小程序核心业务功能测试套件，覆盖所有关键业务场景，确保系统质量和稳定性。

### 1.2 范围

**测试范围**:
- 核心业务功能：商品浏览、下单支付、推广佣金、用户管理
- 完整用户流程：从注册登录到售后的完整生命周期
- 推广佣金系统：四层代理的推荐关系和佣金分配
- 订单状态流转：待支付→已支付→待发货→已完成→退款
- 边界情况和异常处理：网络异常、并发、数据一致性
- 性能基准和安全防护

**测试环境**:
- 本地开发环境（优先）
- 使用 Vitest 测试框架
- 手动 Mock 数据和模拟服务

## 2. 测试架构

### 2.1 三层测试架构

```
┌─────────────────────────────────────────────┐
│  场景测试层 (Scenario Tests)                 │
│  - 端到端用户旅程                             │
│  - 跨模块业务流程                             │
│  - 边界情况和异常处理                          │
└─────────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────────┐
│  模块集成层 (Integration Tests)              │
│  - 云函数级别功能测试                         │
│  - 数据库操作验证                             │
│  - 业务流程测试                               │
└─────────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────────┐
│  单元测试层 (Unit Tests)                     │
│  - 核心算法逻辑                               │
│  - 独立函数测试                               │
│  - 快速反馈                                   │
└─────────────────────────────────────────────┘
```

### 2.2 目录结构

```
tests/
├── unit/                          # 单元测试
│   ├── commission/               # 佣金计算测试
│   │   └── commission-calculation.test.js
│   ├── order/                    # 订单逻辑测试
│   │   ├── order-validation.test.js
│   │   └── order-status.test.js
│   ├── promotion/                # 推广系统测试
│   │   ├── upgrade-conditions.test.js
│   │   └── promotion-path.test.js
│   ├── product/                  # 商品逻辑测试
│   │   └── product-validation.test.js
│   ├── admin/                    # 管理后台测试（新增）
│   │   ├── permission.test.js    # 权限验证
│   │   ├── finance-approval.test.js # 财务审批
│   │   └── data-export.test.js   # 数据导出
│   ├── coupon/                   # 优惠券测试（新增）
│   │   └── coupon-validation.test.js
│   └── database/                 # 数据库测试（新增）
│       └── schema-validation.test.js
│
├── integration/                   # 集成测试（已有）
│   ├── system-integration.test.js
│   ├── product-status-filtering.test.js
│   └── business-flows/           # 业务流程测试（新增）
│       ├── user-registration.test.js
│       ├── complete-order.test.js
│       └── payment-process.test.js
│
├── scenarios/                     # 场景测试（新增）
│   ├── user-journey/             # 用户旅程测试
│   │   ├── complete-user-lifecycle.test.js
│   │   ├── promoter-journey.test.js
│   │   └── upgrade-journey.test.js
│   ├── edge-cases/               # 边界情况测试
│   │   ├── concurrency.test.js
│   │   ├── network-errors.test.js
│   │   └── data-consistency.test.js
│   ├── performance/              # 性能测试
│   │   └── benchmarks.test.js
│   └── security/                 # 安全测试
│       └── security-checks.test.js
│
└── helpers/                      # 测试辅助工具
    ├── mock-data/                # Mock数据
    │   ├── users.js
    │   ├── products.js
    │   ├── orders.js
    │   └── promotion-relations.js
    ├── test-utils.js             # 测试工具函数
    ├── test-priority.js          # 测试优先级配置
    └── error-handler.js          # 错误处理
```

## 3. 测试用例设计

### 3.1 单元测试（Unit Tests）

#### 3.1.1 佣金计算测试

**文件**: `tests/unit/commission/commission-calculation.test.js`

**测试用例**:
1. 一级推广佣金计算
   - 输入：订单金额100元，一级推广员
   - 预期：推广员获得20元佣金（20%）
   - 验证：佣金分配准确性

2. 二级推广佣金计算
   - 输入：订单金额100元，二级推广员（自拿12%，直接上级8%）
   - 预期：自己12元 + 直接上级8元 = 20元
   - 验证：两层分配正确性

3. 三级推广佣金计算
   - 输入：订单金额100元，三级推广员（自拿12%，上级各4%）
   - 预期：自己12元 + 直接上级4元 + 再上级4元 = 20元
   - 验证：三层分配正确性

4. 四级推广佣金计算
   - 输入：订单金额100元，四级推广员（自拿8%，上级各4%）
   - 预期：自己8元 + 直接上级4元 + 再上级4元 + 更上级4元 = 20元
   - 验证：四层分配正确性

5. 边界情况：佣金总额验证
   - 验证：所有级别的佣金总额都是订单金额的20%

6. 异常情况：推广层级超过4层
   - 输入：5层或更深的推广关系
   - 预期：只计算前4层，第5层及以后无佣金

#### 3.1.2 订单逻辑测试

**文件**: `tests/unit/order/order-validation.test.js`

**测试用例**:
1. 订单总金额计算
   - 输入：多个商品，不同数量和价格
   - 预期：正确计算总和

2. 库存充足性验证
   - 输入：商品数量 vs 当前库存
   - 预期：充足时允许，不足时拒绝

3. 商品状态验证
   - 输入：上架商品、下架商品
   - 预期：只允许上架商品

4. 优惠券应用逻辑
   - 输入：满减券、折扣券、免邮券
   - 预期：正确计算优惠金额

5. 运费计算规则
   - 输入：不同订单金额、地区
   - 预期：满足满额免邮等规则

#### 3.1.3 优惠券验证测试

**文件**: `tests/unit/coupon/coupon-validation.test.js`

**测试用例**:
1. 满减券验证
   - 输入：订单金额 vs 满减门槛
   - 预期：满足门槛时可用，计算减免金额

2. 折扣券验证
   - 输入：原价、折扣比例
   - 预期：正确计算折后价格

3. 优惠券使用条件
   - 验证：每人限用、有效期、适用商品
   - 验证：不可叠加使用规则

4. 优惠券状态管理
   - 验证：未领取、已领取、已使用、已过期状态

#### 3.1.4 数据库Schema验证测试

**文件**: `tests/unit/database/schema-validation.test.js`

**测试用例**:
1. 集合结构验证
   - 验证：users、orders、products等集合必需字段

2. 字段类型验证
   - 验证：字段类型、必填项、默认值

3. 索引验证
   - 验证：关键查询字段的索引存在性

#### 3.1.5 升级条件测试

**文件**: `tests/unit/promotion/upgrade-conditions.test.js`

**测试用例**:
1. 4级→3级升级（铜牌推广员）
   - 条件：累计销售额 ≥ 20000元
   - 验证：达到条件时自动升级

2. 3级→2级升级（银牌推广员）
   - 条件A：月销售额 ≥ 50000元
   - 条件B：团队人数 ≥ 50人
   - 验证：满足任一条件即可升级

3. 2级→1级升级（金牌推广员）
   - 条件A：月销售额 ≥ 100000元
   - 条件B：团队人数 ≥ 200人
   - 验证：满足任一条件即可升级

4. 月度重置逻辑
   - 验证：每月1号重置月销售额
   - 验证：累计销售额不受影响

5. 跟随升级规则
   - 场景：上级从2级升到1级
   - 验证：下级原3级跟随升到2级

### 3.2 业务流程测试（Integration Tests）

#### 3.2.0 Admin管理后台测试

**文件**: `tests/integration/admin/admin-workflow.test.js`

**测试场景**:
1. 管理员权限验证
   - 验证：super_admin、operator、finance角色权限
   - 验证：无权限访问时的拒绝逻辑

2. 财务审批流程
   - 步骤：
     1. 用户申请提现
     2. 管理员查看提现申请
     3. 财务审核批准/拒绝
     4. 更新提现状态
   - 验证点：
     - 审批权限检查
     - 状态流转正确性

3. 数据导出功能
   - 验证：订单数据导出
   - 验证：用户数据导出
   - 验证：财务报表生成

4. 商品管理操作
   - 验证：商品上架/下架
   - 验证：库存调整
   - 验证：价格修改

#### 3.2.1 用户注册流程

#### 3.2.1 用户注册流程

**文件**: `tests/integration/business-flows/user-registration.test.js`

**测试场景**:
1. 新用户通过邀请码注册
   - 步骤：
     1. 提供邀请码
     2. 验证邀请码有效性
     3. 创建用户记录
     4. 建立推广关系（promotion_path）
     5. 初始化用户钱包
   - 验证点：
     - 用户创建成功
     - 推广关系正确
     - 钱包余额为0

#### 3.2.2 完整下单流程

**文件**: `tests/integration/business-flows/complete-order.test.js`

**测试场景**:
1. 标准购买流程
   - 步骤：
     1. 用户浏览商品列表
     2. 选择商品加入购物车
     3. 创建订单
     4. 选择支付方式
     5. 完成支付
     6. 库存扣减
     7. 销量更新
     8. 佣金分配
   - 验证点：
     - 每个步骤的状态变化
     - 数据一致性
     - 佣金计算准确

#### 3.2.3 支付处理流程

**文件**: `tests/integration/business-flows/payment-process.test.js`

**测试场景**:
1. 余额支付流程
   - 验证：余额充足时支付成功
   - 验证：余额不足时支付失败

2. 微信支付流程
   - 验证：支付参数生成
   - 验证：支付回调处理

3. 支付后处理
   - 验证：订单状态更新
   - 验证：库存销量更新
   - 验证：佣金分配

#### 3.2.4 退款处理流程

**文件**: `tests/integration/business-flows/refund-process.test.js`

**测试场景**:
1. 标准退款流程
   - 步骤：
     1. 用户申请退款
     2. 管理员审核
     3. 退款批准
     4. 佣金回收
     5. 钱包退款
     6. 订单状态更新
   - 验证点：
     - 每个步骤的状态变化
     - 佣金回收的准确性
     - 钱包余额的正确性

2. 部分退款流程
   - 场景：订单中部分商品退款
   - 验证：部分佣金回收，部分库存恢复

3. 佣金回收逻辑
   - 验证：从各级推广员回收佣金
   - 验证：回收金额与退款金额匹配

#### 3.2.5 优惠券使用流程

**文件**: `tests/integration/business-flows/coupon-usage.test.js`

**测试场景**:
1. 优惠券领取和使用
   - 步骤：
     1. 用户领取优惠券
     2. 选择商品加入购物车
     3. 应用优惠券
     4. 创建订单（优惠后价格）
     5. 完成支付
   - 验证点：
     - 优惠券状态更新
     - 优惠金额计算正确
     - 订单金额准确

2. 优惠券限制条件
   - 验证：每人限用逻辑
   - 验证：有效期检查
   - 验证：适用商品限制

**文件**: `tests/integration/business-flows/payment-process.test.js`

**测试场景**:
1. 余额支付流程
   - 验证：余额充足时支付成功
   - 验证：余额不足时支付失败

2. 微信支付流程
   - 验证：支付参数生成
   - 验证：支付回调处理

3. 支付后处理
   - 验证：订单状态更新
   - 验证：库存销量更新
   - 验证：佣金分配

### 3.3 场景测试（Scenario Tests）

#### 3.3.1 用户旅程测试

**文件**: `tests/scenarios/user-journey/complete-user-lifecycle.test.js`

**场景A：新用户首次购买旅程**
```
新用户 → 注册 → 浏览商品 → 选择商品 → 加入购物车 → 创建订单 → 支付 → 查看订单
```
验证点：
- 每个步骤的用户体验
- 数据流转正确性
- 状态变化及时性

**场景B：推广员推广旅程**
```
推广员 → 生成邀请码 → 分享给朋友 → 新用户注册并下单 → 获得佣金 → 查看佣金 → 申请提现
```
验证点：
- 邀请码生成和验证
- 推广关系建立
- 佣金计算和分配
- 提现流程

**场景C：升级旅程**
```
普通推广员 → 达到销售目标 → 自动升级 → 跟随升级生效 → 提高佣金比例 → 后续订单获得更高佣金
```
验证点：
- 升级条件检测
- 自动升级触发
- 跟随升级执行
- 新佣金比例生效

**场景D：售后旅程**
```
用户 → 申请退款 → 商家审核 → 退款批准 → 佣金回收 → 钱包退款 → 订单关闭
```
验证点：
- 退款申请流程
- 佣金回收逻辑
- 钱包退款处理
- 订单状态流转

#### 3.3.2 边界情况测试

**文件**: `tests/scenarios/edge-cases/edge-cases.test.js`

**测试场景**:
1. 并发下单时的库存扣减
   - 场景：多个用户同时购买最后一件商品
   - 验证：只有一个订单成功，其他失败

2. 支付超时后的订单处理
   - 场景：订单创建后30分钟未支付
   - 验证：订单自动取消，库存恢复

3. 网络异常时的重试机制
   - 场景：支付过程中网络中断
   - 验证：重试机制正常工作

4. 商品下架后的已有订单处理
   - 场景：用户下单后商品被下架
   - 验证：已有订单可以正常支付，记录警告

5. 推广关系循环检测
   - 场景：尝试形成循环推荐关系
   - 验证：系统拒绝循环关系

6. 负数金额和溢出处理
   - 场景：输入负数价格、超大数量
   - 验证：系统验证并拒绝异常输入

#### 3.3.3 性能基准测试

**文件**: `tests/scenarios/performance/benchmarks.test.js`

**测试项目**:
1. 云函数响应时间
   - 目标：<500ms (P95)
   - 测试：product、order、promotion等云函数

2. 数据库查询性能
   - 目标：<100ms (P95)
   - 测试：商品列表查询、订单查询等

3. 列表渲染性能
   - 目标：滚动流畅，无卡顿
   - 测试：虚拟列表效果

4. 图片加载优化
   - 目标：首屏<2秒
   - 测试：CDN加速效果

#### 3.3.4 安全防护测试

**文件**: `tests/scenarios/security/security-checks.test.js`

**测试项目**:
1. 支付金额篡改检测
   - 尝试：修改订单金额
   - 验证：后端验证并拒绝

2. 重复提交防护
   - 尝试：重复提交同一订单
   - 验证：幂等性保证

3. SQL注入防护
   - 尝试：输入恶意SQL语句
   - 验证：参数化查询防护

4. XSS攻击防护
   - 尝试：输入恶意脚本
   - 验证：输出转义

5. 敏感数据加密
   - 验证：用户密码加密存储
   - 验证：支付信息加密传输

## 4. Mock数据和工具函数

### 4.1 Mock数据结构

**文件**: `tests/helpers/mock-data/index.js`

```javascript
module.exports = {
  // 用户数据
  mockUsers: {
    level1: { /* 金牌推广员 */ },
    level2: { /* 银牌推广员 */ },
    level3: { /* 铜牌推广员 */ },
    level4: { /* 普通会员 */ }
  },

  // 商品数据
  mockProducts: {
    active: { /* 上架商品 */ },
    inactive: { /* 下架商品 */ },
    outOfStock: { /* 无库存商品 */ }
  },

  // 订单数据
  mockOrders: {
    pending: { /* 待支付 */ },
    paid: { /* 已支付 */ },
    completed: { /* 已完成 */ },
    refunded: { /* 已退款 */ }
  },

  // 推广关系数据
  mockPromotionRelations: {
    simple: { /* 简单推荐关系 */ },
    complex: { /* 复杂多层关系 */ },
    edge: { /* 边界情况 */ }
  },

  // 钱包数据
  mockWallets: {
    withBalance: { /* 有余额钱包 */ },
    empty: { /* 空钱包 */ }
  }
};
```

### 4.2 测试工具函数

**文件**: `tests/helpers/test-utils.js`

```javascript
module.exports = {
  // 模拟云函数context
  createMockContext(openid) {
    return {
      OPENID: openid || 'test_openid',
      APPID: 'test_appid',
      UNIONID: 'test_unionid'
    };
  },

  // 模拟数据库操作
  mockDatabase() {
    // 返回模拟的db对象
  },

  // 佣金断言
  assertCommissionEqual(actual, expected, orderAmount) {
    // 验证佣金分配的准确性
  },

  // 异步等待工具
  async waitAsync(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  },

  // 测试环境初始化
  async setupTestEnv() {
    // 初始化测试数据和环境
  },

  // 测试环境清理
  async cleanupTestEnv() {
    // 清理测试数据
  }
};
```

### 4.3 测试优先级配置

**文件**: `tests/helpers/test-priority.js`

```javascript
module.exports = {
  P0_CRITICAL: {
    description: '核心业务逻辑',
    tests: ['commission-calculation', 'payment-process', 'order-creation']
  },
  P1_HIGH: {
    description: '重要功能',
    tests: ['user-registration', 'inventory-management', 'refund-process']
  },
  P2_MEDIUM: {
    description: '辅助功能',
    tests: ['coupon-system', 'address-management', 'user-profile']
  },
  P3_LOW: {
    description: '锦上添花功能',
    tests: ['ui-interactions', 'animation-effects']
  }
};
```

### 4.4 错误处理

**文件**: `tests/helpers/error-handler.js`

```javascript
module.exports = {
  // 标准化错误断言
  assertError(actual, expectedCode, expectedMessage) {
    assert.strictEqual(actual.code, expectedCode);
    assert.ok(actual.message.includes(expectedMessage));
  },

  // 错误日志记录
  logError(testName, error) {
    console.error(`[${testName}] Error:`, error);
  },

  // 失败截图保存（未来扩展）
  async saveFailureScreenshot(testName) {
    // 可选：保存UI截图
  },

  // 详细错误报告生成
  generateErrorReport(failedTests) {
    // 生成详细的错误报告
  }
};
```

## 5. 测试运行策略

### 5.1 分层运行脚本

**package.json** 中的测试脚本：

```json
{
  "scripts": {
    "test:unit": "vitest run tests/unit --reporter=verbose",
    "test:flows": "vitest run tests/integration/business-flows",
    "test:scenarios": "vitest run tests/scenarios",
    "test:business": "npm run test:unit && npm run test:flows && npm run test:scenarios",
    "test:business:watch": "vitest watch tests/unit tests/integration/business-flows tests/scenarios",
    "test:business:coverage": "vitest run --coverage tests/unit tests/integration/business-flows tests/scenarios"
  }
}
```

### 5.2 测试执行顺序

1. **快速反馈**：单元测试（<5秒）
2. **功能验证**：业务流程测试（<15秒）
3. **全面覆盖**：场景测试（<30秒）

### 5.3 测试覆盖率目标

| 模块 | 目标覆盖率 | 优先级 |
|------|-----------|--------|
| 佣金计算 | 100% | P0 |
| 订单管理 | 95% | P0 |
| 用户管理 | 95% | P1 |
| 支付流程 | 90% | P0 |
| 推广系统 | 100% | P0 |
| 商品管理 | 85% | P1 |
| 钱包系统 | 90% | P1 |

## 6. 测试报告格式

### 6.1 控制台输出

```
=== 核心业务功能测试报告 ===

📊 测试概览：
  总计：150个测试用例
  通过：145个 ✅
  失败：5个 ❌
  跳过：0个 ⚠️
  耗时：28.5秒

🎯 核心功能覆盖率：
  - 佣金计算：100% (30/30) ✅
  - 订单管理：95% (38/40) ⚠️
  - 用户管理：100% (25/25) ✅
  - 支付流程：93% (28/30) ⚠️
  - 推广系统：100% (25/25) ✅

⏱️ 性能指标：
  - 平均执行时间：2.3秒
  - 最慢测试：支付流程 (0.8秒)
  - 最快测试：佣金计算 (0.01秒)

❌ 失败测试：
  1. 订单管理 - 库存并发测试
     期望：库存扣减原子性
     实际：发现并发问题
     位置：tests/unit/order/inventory.test.js:42

  2. 支付流程 - 余额不足测试
     期望：支付失败，返回错误
     实际：支付成功（余额应为负）
     位置：tests/integration/business-flows/payment.test.js:78

💡 建议：
  - 修复订单库存并发问题
  - 加强支付余额验证逻辑
  - 增加并发测试覆盖率
```

### 6.2 HTML报告（可选）

使用 Vitest 的 HTML 报告器生成可视化报告。

## 7. 实施计划

### 7.1 第一阶段：单元测试（1周）
- 佣金计算测试
- 订单逻辑测试
- 升级条件测试
- 商品验证测试

### 7.2 第二阶段：业务流程测试（1周）
- 用户注册流程
- 完整下单流程
- 支付处理流程

### 7.3 第三阶段：场景测试（1周）
- 用户旅程测试
- 边界情况测试
- 性能和安全测试

### 7.4 第四阶段：优化和完善（3天）
- 提高测试覆盖率
- 优化测试性能
- 完善文档和工具

## 8. 成功标准

### 8.1 分级成功标准

**P0级测试（核心业务逻辑）**:
- ✅ 测试用例通过率 100%
- ✅ 覆盖率：佣金计算、订单创建、支付流程 100%
- ✅ 所有测试执行时间 <10秒

**P1级测试（重要功能）**:
- ✅ 测试用例通过率 ≥95%
- ✅ 覆盖率：用户管理、商品管理、推广系统 ≥95%
- ✅ 所有测试执行时间 <20秒

**P2-P3级测试（辅助功能）**:
- ✅ 测试用例通过率 ≥90%
- ✅ 可在后续迭代中补充完善

### 8.2 关键业务逻辑覆盖率

**必须100%覆盖的模块**:
- ✅ 佣金计算逻辑（commission calculation）
- ✅ 订单创建和状态流转（order lifecycle）
- ✅ 支付处理（payment processing）
- ✅ 推广关系建立（promotion relationship）
- ✅ 库存扣减（inventory deduction）
- ✅ 权限验证（permission check）

**优先覆盖的模块**:
- ✅ 用户注册和登录
- ✅ 商品上下架
- ✅ 优惠券使用
- ✅ 退款处理

### 8.3 质量标准
- ✅ 所有核心业务流程有完整测试覆盖
- ✅ 关键边界情况有测试保护
- ✅ 测试代码清晰易维护
- ✅ 测试失败时有明确的错误信息
- ✅ Mock数据与真实数据结构一致

## 9. 维护和扩展

### 9.1 测试维护
- 定期更新Mock数据
- 及时修复失败的测试
- 保持测试与代码同步

### 9.2 扩展方向
- 增加更多边界情况测试
- 添加压力测试
- 集成到CI/CD流程
- 添加E2E测试（可选）

## 10. 风险和挑战

### 10.1 技术风险
- **Mock数据准确性**：需要定期与真实数据对比
- **测试环境隔离**：避免影响生产数据
- **异步测试稳定性**：合理使用等待和超时

### 10.2 业务风险
- **需求变更**：测试用例需要及时更新
- **复杂场景**：某些边界情况难以完全模拟

### 10.3 缓解措施
- 建立测试数据版本管理
- 使用独立的测试环境
- 增加测试重试机制
- 定期review测试覆盖度

---

**文档版本**: 1.0
**最后更新**: 2026-03-14
