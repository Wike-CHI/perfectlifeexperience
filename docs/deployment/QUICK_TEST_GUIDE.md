# 快速测试命令指南

本文档提供快速验证余额支付和延迟结算功能的命令和步骤。

## 一、通过云开发控制台快速验证

### 1. 验证数据库迁移

**步骤：**
1. 打开云开发控制台：https://tcb.cloud.tencent.com/dev?envId=cloud1-6gmp2qy3171c353#/db
2. 进入"数据库"
3. 选择 `orders` 集合
4. 点击任意一条记录
5. 检查是否显示 `rewardSettled` 和 `rewardSettleTime` 字段

**预期结果：**
- ✅ 两个字段都存在 → 迁移成功
- ❌ 字段不存在 → 需要执行迁移

---

### 2. 验证用户钱包余额

**数据库查询（在控制台执行）：**
```javascript
db.collection('user_wallets').where({
  _openid: '你的测试openid'
}).get()
```

**或者使用 test-helper 云函数：**
```json
{
  "action": "checkWallet",
  "testData": {
    "openid": "你的测试openid"
  }
}
```

**预期结果：**
```json
{
  "code": 0,
  "data": {
    "balance": 10000,  // 100元（单位：分）
    "exists": true
  }
}
```

---

### 3. 测试余额支付

**使用 test-helper 云函数：**
```json
{
  "action": "testBalancePayment",
  "testData": {
    "openid": "你的测试openid",
    "amount": 5000  // 50元
  }
}
```

**预期结果：**
- ✅ 余额充足：扣款成功，返回剩余余额
- ❌ 余额不足：返回错误和差额

**验证扣款：**
```javascript
// 查询钱包余额是否减少
db.collection('user_wallets').where({
  _openid: "你的openid"
}).get()

// 查询交易记录
db.collection('wallet_transactions').where({
  _openid: "你的openid",
  type: "payment"
}).orderBy('createTime', 'desc').limit(1).get()
```

---

### 4. 测试订单完成触发奖励结算

**步骤：**
1. 先查询一个已支付但未完成的订单：
```javascript
db.collection('orders').where({
  status: 'paid'
}).limit(1).get()
```

2. 记录订单ID，例如：`abc123`

3. 在 order 云函数中测试：
```json
{
  "action": "updateOrderStatus",
  "data": {
    "orderId": "abc123",
    "status": "completed"
  }
}
```

4. 查看云函数日志，应该看到：
```
[订单完成] 触发推广奖励结算 订单:abc123 支付方式:balance
[奖励结算] 成功 订单:abc123 奖励数:4
```

5. 验证订单已标记为已结算：
```javascript
db.collection('orders').doc('abc123').get()
```
预期：`rewardSettled: true`, `rewardSettleTime: Date`

6. 验证奖励记录生成：
```javascript
db.collection('reward_records').where({
  orderId: 'abc123'
}).get()
```
预期：多条奖励记录（基础佣金、复购奖励、管理奖、育成津贴等）

---

## 二、通过小程序前端测试

### 测试场景 1：完整购物流程（余额支付）

**步骤：**

1. **准备测试账号**
   - 打开微信开发者工具
   - 使用测试账号登录

2. **检查钱包余额**
   - 进入"我的" → "钱包"
   - 查看当前余额
   - 如余额不足，先充值（使用测试充值功能）

3. **下单测试**
   - 选择商品加入购物车
   - 进入结算页面
   - 选择"余额支付"
   - **检查点**：应显示"可用余额: ¥XXX.XX"
   - 点击"提交订单"
   - **检查点**：支付成功，跳转到订单详情

4. **验证数据**
   - 在云开发控制台查询订单
   - 验证 `paymentMethod: 'balance'`
   - 验证 `rewardSettled: false`
   - 查询钱包，余额已减少
   - 查询交易记录，新增一条支付记录

---

### 测试场景 2：余额不足提示

**步骤：**

1. 确保钱包余额 < 50元
2. 选择金额 > 余额的商品
3. 进入结算页面
4. 查看支付方式区域
5. **检查点**：
   - 余额支付选项显示为灰色（禁用）
   - 点击时提示"余额不足，还差 ¥XX.XX"

---

### 测试场景 3：订单完成触发结算

**步骤：**

1. 完成一个订单的支付（余额或微信支付）
2. 记录订单号
3. 在云开发控制台手动修改订单状态：
```javascript
db.collection('orders').doc('订单ID').update({
  data: {
    status: 'completed',
    completeTime: new Date()
  }
})
```

4. **检查云函数日志**（order 云函数）：
   - 应有 `[订单完成] 触发推广奖励结算` 日志
   - 应有 `[奖励结算] 成功` 日志

5. **验证订单记录**：
   - `rewardSettled: true`
   - `rewardSettleTime` 有值

6. **验证推广奖励**：
   - `reward_records` 集合新增记录
   - 推广员的 `pendingReward` 增加

---

## 三、验证清单

### 部署验证
- [ ] order 云函数已更新
- [ ] 云函数状态为"正常"
- [ ] 云函数测试通过

### 数据库验证
- [ ] orders 集合有 rewardSettled 字段
- [ ] orders 集合有 rewardSettleTime 字段
- [ ] 现有订单数据正常

### 功能验证
- [ ] 余额充足可以支付
- [ ] 余额不足时禁用并提示
- [ ] 余额正确扣除
- [ ] 交易记录正确生成
- [ ] 订单完成时触发结算
- [ ] rewardSettled 字段正确更新
- [ ] 推广奖励记录生成
- [ ] 推广员余额增加

### 日志验证
- [ ] 关键操作有日志
- [ ] 没有异常错误
- [ ] 事务提交成功

---

## 四、常见问题排查

### 问题 1：支付失败

**可能原因：**
- 云函数未部署
- 数据库字段未添加

**排查步骤：**
1. 检查云函数部署状态
2. 查看云函数日志
3. 验证数据库字段

### 问题 2：奖励未结算

**可能原因：**
- 订单状态未更新为 completed
- promotion 云函数调用失败

**排查步骤：**
1. 检查订单 status 字段
2. 查看 order 云函数日志
3. 查看 promotion 云函数日志

### 问题 3：余额未扣除

**可能原因：**
- 事务失败
- 钱包不存在

**排查步骤：**
1. 检查事务是否提交
2. 验证钱包记录存在
3. 查看详细的错误日志

---

## 五、快速测试命令（复制粘贴）

### 查询最近订单
```javascript
db.collection('orders').orderBy('createTime', 'desc').limit(5).get()
```

### 查询用户钱包
```javascript
db.collection('user_wallets').where({ _openid: "你的openid" }).get()
```

### 查询交易记录
```javascript
db.collection('wallet_transactions').where({ _openid: "你的openid" }).orderBy('createTime', 'desc').limit(10).get()
```

### 查询奖励记录
```javascript
db.collection('reward_records').where({ orderId: "订单ID" }).get()
```

### 更新订单状态
```javascript
db.collection('orders').doc("订单ID").update({
  data: {
    status: 'completed',
    completeTime: new Date()
  }
})
```

---

**文档版本**: v1.0
**创建日期**: 2026-02-13
