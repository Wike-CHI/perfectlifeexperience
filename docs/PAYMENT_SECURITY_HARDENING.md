# 支付安全加固实施指南

**日期**: 2026-02-13
**目的**: 防止重复支付、金额篡改等支付安全问题

---

## 🔒️ 安全问题分析

### 原有风险点

**1. 缺少金额验证**
```javascript
// ❌ 问题代码
amount: {
  total: order.totalAmount,  // 直接使用，未验证范围
  currency: 'CNY'
}
```
**风险**:
- 恶意用户可能通过抓包修改订单金额
- 可能导致超出范围的异常订单
- 商户资金损失风险

**2. 缺少幂等性保护**
```javascript
// ❌ 问题代码
// 支付回调直接处理，无重复检查
await handlePaymentSuccess(result.transaction, db);
return buildSuccessResponse();
```
**风险**:
- 同一订单可能被多次支付成功
- 回调重放攻击
- 库存扣减异常

**3. 缺少状态机验证**
```javascript
// ❌ 问题代码
if (order.status !== 'pending') {
  return { success: false, code: 'INVALID_ORDER_STATUS' };
}
```
**风险**:
- 非法状态转换（如 PAID → CANCELLED）
- 业务逻辑混乱
- 数据不一致

---

## ✅ 实施的安全加固

### 1. 订单支付状态机

**状态定义** (`cloudfunctions/wechatpay/index.js:23-42`):

```javascript
const PAYMENT_STATUS = {
  PENDING: 'pending',        // 待支付
  PROCESSING: 'processing',  // 处理中（支付接口已调用）
  PAID: 'paid',            // 已支付
  FAILED: 'failed',          // 支付失败
  CANCELLED: 'cancelled',    // 已取消
  REFUNDED: 'refunded'       // 已退款
};
```

**状态转换规则** (`cloudfunctions/wechatpay/index.js:45-63`):

```javascript
const VALID_TRANSITIONS = {
  [PAYMENT_STATUS.PENDING]: [PROCESSING, CANCELLED],
  [PAYMENT_STATUS.PROCESSING]: [PAID, FAILED],
  [PAYMENT_STATUS.PAID]: [],              // 终态
  [PAYMENT_STATUS.FAILED]: [PENDING],  // 可重试
  [PAYMENT_STATUS.CANCELLED]: [],        // 终态
  [PAYMENT_STATUS.REFUNDED]: []         // 终态
};
```

### 2. 订单状态验证函数

**功能** (`cloudfunctions/wechatpay/index.js:66-145`):

```javascript
async function validateAndUpdateOrderStatus(orderId, currentStatus, newStatus)
```

**验证内容**:
1. 订单存在性检查
2. 幂等性检查（是否已是目标状态）
3. 状态转换合法性验证
4. 防重复支付检查（PAID 状态不可变）
5. 乐观锁（使用 where 条件确保原子更新）

**使用示例**:

```javascript
// 验证并转换为 processing
const statusUpdate = await validateAndUpdateOrderStatus(
  orderId,
  PAYMENT_STATUS.PROCESSING
);

if (!statusUpdate.success) {
  return statusUpdate;  // 阻止继续处理
}
```

### 3. 金额范围验证

**配置** (`cloudfunctions/wechatpay/index.js:65-72`):

```javascript
const AMOUNT_LIMITS = {
  MIN: 100,              // 1元（100分）
  MAX: 5000000            // 50000元（5000000分）
};
```

**验证逻辑** (`createPayment` 函数):

```javascript
// ✅ 检查金额范围
if (order.totalAmount < AMOUNT_LIMITS.MIN ||
    order.totalAmount > AMOUNT_LIMITS.MAX) {
  return {
    success: false,
    code: 'INVALID_AMOUNT',
    message: `订单金额异常: ${order.totalAmount} 分`
  };
}
```

### 4. 支付创建增强

**新功能** (`createPayment` 函数):

1. **参数验证** - 订单ID 和 openid 必填
2. **金额范围验证** - 拒绝异常金额订单
3. **状态管理** - 支付前锁定为 processing
4. **回滚机制** - 支付失败自动回滚为 pending

```javascript
try {
  // 支付前：pending → processing
  await validateAndUpdateOrderStatus(orderId, PAYMENT_STATUS.PROCESSING);

  // 调用微信支付
  const orderResult = await jsapiOrder({...});

  return { success: true, data: { prepayId, payParams } };

} catch (error) {
  // 失败：processing → pending
  await validateAndUpdateOrderStatus(orderId, PAYMENT_STATUS.PENDING);
  throw error;
}
```

### 5. 支付回调增强

**新增安全检查** (`handleNotify` 函数):

1. **幂等性检查** - 已支付订单直接返回成功
2. **金额一致性验证** - 回调金额必须等于订单金额
3. **状态同步更新** - 使用统一的状态验证函数

```javascript
// 1. 幂等性检查
if (currentStatus === PAYMENT_STATUS.PAID) {
  console.log(`订单 ${out_trade_no} 已处理，忽略重复回调`);
  return buildSuccessResponse();  // 避免微信重复通知
}

// 2. 金额一致性验证
if (order.totalAmount !== result.transaction.amount.total) {
  console.error(`金额不匹配: 订单=${order.totalAmount}, 回调=${result.transaction.amount.total}`);
  return buildFailResponse('金额验证失败');
}

// 3. 状态同步更新
await validateAndUpdateOrderStatus(orderId, PAYMENT_STATUS.PAID);
```

---

## 🧪 测试场景

### 测试 1: 正常支付流程

**步骤**:
1. 创建订单（状态: pending）
2. 调用 createPayment（状态: pending → processing）
3. 用户完成支付
4. 微信回调（状态: processing → paid）

**预期**: ✅ 支付成功

---

### 测试 2: 重复支付防护

**步骤**:
1. 创建订单（状态: pending）
2. 第一次调用 createPayment（状态: pending → processing）
3. 第二次立即调用 createPayment

**预期**: ❌ 第二次调用失败（状态已是 processing）

---

### 测试 3: 金额验证

**步骤**:
1. 创建订单，金额为 100000 分（1000元）
2. 调用 createPayment

**预期**: ❌ 失败（超过 MAX 限额 500000 分）

---

### 测试 4: 回调幂等性

**步骤**:
1. 订单支付成功（状态: paid）
2. 模拟微信重复发送回调通知

**预期**: ✅ 第二次回调直接返回成功，不重复处理

---

### 测试 5: 回调金额验证

**步骤**:
1. 创建订单，金额 10000 分
2. 用户支付 10000 分
3. 恶意回调，金额改为 50000 分

**预期**: ❌ 回调被拒绝（金额不匹配）

---

## 📋 部署检查清单

### 代码部署

- [ ] 上传更新后的 wechatpay 云函数
- [ ] 验证云函数部署成功
- [ ] 检查云函数日志无错误

### 功能验证

- [ ] 测试正常支付流程成功
- [ ] 测试重复支付被拒绝
- [ ] 测试异常金额订单被拒绝
- [ ] 测试并发支付只有一个成功
- [ ] 测试回调幂等性有效
- [ ] 测试回调金额验证有效

### 数据库验证

- [ ] 订单 paymentStatus 字段存在
- [ ] 状态转换符合状态机规则
- [ ] 无重复支付的订单记录

---

## 🔙 回滚方案

如果新代码导致问题：

### 方案 1: 禁用状态验证

在云函数配置中添加环境变量：
```bash
DISABLE_STATUS_VALIDATION=true
```

修改代码：
```javascript
const shouldValidateStatus = process.env.DISABLE_STATUS_VALIDATION !== 'true';

if (shouldValidateStatus) {
  const statusUpdate = await validateAndUpdateOrderStatus(...);
  // ...
}
```

### 方案 2: 完全回滚

```bash
# 恢复到之前的提交
git revert <commit-hash>

# 重新部署旧版本
```

---

## 📊 安全改进效果

### 修复前
- ❌ 可重复支付同一订单
- ❌ 可篡改订单金额
- ❌ 非法状态转换
- ❌ 回调可被重复处理

### 修复后
- ✅ 防重复支付（状态机 + 乐观锁）
- ✅ 金额范围验证（MIN/MAX 限制）
- ✅ 状态转换合法性验证
- ✅ 回调幂等性（已支付订单直接返回成功）
- ✅ 回调金额一致性验证
- ✅ 支付失败自动回滚

---

## 📝 后续优化建议

### 短期（1-2周）

1. **添加支付日志**
   - 记录所有支付操作（创建、查询、关闭）
   - 包含订单号、金额、状态、时间戳
   - 便于审计和问题排查

2. **实现支付监控**
   - 监控支付成功率
   - 异常金额告警
   - 重复支付告警
   - 回调失败告警

3. **添加数据库索引**
   ```javascript
   // orders 集合索引
   db.collection('orders').createIndex({
     indexes: [
       { field: 'orderNo', unique: true },    // 订单号唯一
       { field: 'paymentStatus' },
       { field: '_openid' },
       { field: 'createTime' }
     ]
   });
   ```

### 中期（1个月）

1. **实现支付限流**
   - 同一用户 1 分钟最多 3 次支付尝试
   - 同一订单 1 分钟最多 5 次回调处理

2. **优化订单状态查询**
   - 添加状态更新时间索引
   - 减少数据库查询压力

3. **实现支付对账功能**
   - 每日对账微信支付数据
   - 发现异常及时告警

---

**相关文档**:
- 代码质量审查报告: `docs/CODE_QUALITY_AUDIT.md`
- 实施计划: `/Users/johnny/.claude/plans/security-fixes-keen-ling-aho.md`
- 管理员密码迁移: `docs/ADMIN_PASSWORD_MIGRATION.md`
