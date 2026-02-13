# 推广奖励计算事务保护文档

## 概述

推广奖励计算已实施完整的事务保护机制，确保奖励记录的原子性和数据一致性。

## 问题分析

### 原有实现的问题

**配置**: 原有 `calculatePromotionReward()` 函数（Task 7 之前）

```javascript
// 问题：无事务保护，可能导致数据不一致
await db.collection('promotion_orders').add({ ... });  // 操作1
await createRewardRecord({ ... });                    // 操作2
await createRewardRecord({ ... });                    // 操作3
await createRewardRecord({ ... });                    // 操作4
await updateBuyerOrderCount(buyerId);              // 操作5
```

**潜在问题**:
1. **部分失败**: 操作3失败时，操作1-2已执行，数据不一致
2. **孤儿记录**: 奖励记录已创建，但 `updateBuyerOrderCount` 未执行
3. **无法回滚**: 无法撤销已执行的数据库操作
4. **难以调试**: 无法追踪失败点

### 解决方案

**实施完整事务保护**:

```javascript
// 开启事务
const transaction = await db.startTransaction();

try {
  // 所有数据库操作在事务内执行
  await transaction.collection('promotion_orders').add({ ... });
  await createRewardRecord({ ... }, transaction);
  await createRewardRecord({ ... }, transaction);
  await createRewardRecord({ ... }, transaction);
  await createRewardRecord({ ... }, transaction);
  await updateBuyerOrderCount(buyerId, transaction);

  // 全部成功，提交事务
  await transaction.commit();
} catch (error) {
  // 任何失败，回滚事务
  await transaction.rollback();
}
```

## 事务保护层级

### 1. 事务启动

**配置**: `cloudfunctions/promotion/index.js:448-450`

```javascript
// 开启事务（确保奖励记录原子性）
const transaction = await db.startTransaction();
```

**时机**: 在任何数据库操作之前

### 2. 事务内数据库操作

**配置**: `cloudfunctions/promotion/index.js:451-500`

所有数据库操作都通过事务连接执行：

```javascript
// 推广订单记录
await transaction.collection('promotion_orders').add({ data });

// 用户信息查询
const usersRes = await transaction.collection('users').where({ ... }).get();
```

### 3. 奖励记录创建（事务内）

**配置**: `cloudfunctions/promotion/index.js:691-742`

```javascript
async function createRewardRecord({ ... }, transaction = null) {
  // 使用事务或普通数据库连接
  const dbConn = transaction || db;
  const collection = transaction
    ? transaction.collection('reward_records')
    : db.collection('reward_records');
  const usersCollection = transaction
    ? transaction.collection('users')
    : db.collection('users');

  // 创建奖励记录
  await collection.add({ data });

  // 更新用户待结算奖励
  await usersCollection.where({ ... }).update({ data });
}
```

**调用方式**: 所有调用都传入 `transaction` 参数

```javascript
await createRewardRecord({ ... }, transaction);
```

### 4. 买家订单计数更新（事务内）

**配置**: `cloudfunctions/promotion/index.js:738-760`

```javascript
async function updateBuyerOrderCount(buyerId, transaction = null) {
  const dbConn = transaction || db;
  const orderCount = await dbConn.collection('orders').where({ ... }).count();
  await dbConn.collection('users').where({ ... }).update({ data });
}
```

### 5. 事务提交

**配置**: `cloudfunctions/promotion/index.js:676`

```javascript
// 所有操作成功后提交
await transaction.commit();

logger.info('Reward calculation completed', {
  rewardsCount: rewards.length
});
```

**提交条件**:
- 所有奖励记录创建成功
- 买家订单计数更新成功
- 无任何异常抛出

### 6. 事务回滚

**配置**: `cloudfunctions/promotion/index.js:686-696`

```javascript
} catch (error) {
  // 回滚事务
  if (transaction) {
    try {
      await transaction.rollback();
      logger.error('Reward calculation transaction rolled back', error);
    } catch (rollbackError) {
      logger.error('Failed to rollback transaction', rollbackError);
    }
  } else {
    logger.error('Reward calculation failed', error);
  }
  return { code: -1, msg: '计算失败' };
}
```

**回滚触发**:
- 任何数据库操作失败
- 网络错误
- 数据验证失败
- 超时错误

## 数据一致性保证

### ACID 属性

| 属性 | 说明 | 实现方式 |
|-------|------|----------|
| **A**tomicity (原子性) | 所有操作全部成功或全部失败 | 事务 commit/rollback |
| **C**onsistency (一致性) | 数据状态始终保持有效 | 完整性验证 + 事务 |
| **I**solation (隔离性) | 并发事务互不干扰 | 数据库事务隔离 |
| **D**urability (持久性) | 提交后永久生效 | 数据库持久化 |

### 数据一致性场景

**场景1: 正常完成**
```
开始事务 → 创建订单记录 → 创建4条奖励 → 更新计数 → 提交事务
结果: 所有数据一致，奖励生效
```

**场景2: 中途失败**
```
开始事务 → 创建订单记录 → 创建奖励1 → 创建奖励2 → 失败 → 回滚事务
结果: 所有操作撤销，无任何奖励记录
```

**场景3: 提交失败**
```
开始事务 → ...所有操作... → commit时失败 → 自动回滚
结果: 事务超时或连接断开时自动回滚
```

## 部署指南

### 1. 部署云函数

```bash
# 在微信开发者工具中
# 右键 cloudfunctions/promotion 文件夹
# 选择 "上传并部署：云端安装依赖"
```

### 2. 验证

测试事务保护：

```javascript
// 测试1: 正常订单（应提交）
const normalOrder = {
  orderId: 'test_order_001',
  buyerId: 'test_buyer_001',
  orderAmount: 9900,  // 99元
  isRepurchase: false
};

const result1 = await callFunction('promotion', {
  action: 'calculateReward',
  ...normalOrder
});
// 预期: code: 0, rewards: [...] (4条奖励)

// 测试2: 模拟失败（应回滚）
// 需要临时修改代码制造失败场景
// 或观察生产环境日志中的 rollback 记录
```

## 监控指标

### 关键指标

在 CloudBase 控制台监控：

1. **事务提交率**: `transaction.commit()` 成功次数 / 总尝试次数
2. **事务回滚率**: `transaction.rollback()` 触发次数 / 总尝试次数
3. **回滚原因分析**: 错误类型分布（数据库/网络/验证）

### 日志关键字

搜索以下关键字监控事务状态：

```javascript
// 成功日志
logger.info('Reward calculation completed', { rewardsCount });

// 回滚日志
logger.error('Reward calculation transaction rolled back', error);

// 回滚失败日志（严重）
logger.error('Failed to rollback transaction', rollbackError);
```

### 告警规则

- **事务回滚率 > 5%**: 系统异常，需要检查
- **回滚失败**: 数据库连接问题，需要立即处理
- **事务超时**: 性能问题，需要优化

## 常见问题

### Q1: 事务超时怎么办？

**A**: 腾讯云数据库事务默认超时时间较短，建议：

1. **减少单次事务操作数量**: 限制推广层级（MAX_LEVEL = 4）
2. **优化查询**: 使用 `.field()` 只查询必要字段
3. **批量操作**: 合并多个小操作为批量操作
4. **监控超时**: 记录超时日志，分析原因

### Q2: 如何验证事务生效？

**A**: 检查方法：

1. **查看日志**: 确认有 "transaction rolled back" 或 "calculation completed"
2. **数据库检查**: 失败后应无孤儿 `reward_records`
3. **测试回滚**: 制造失败场景，验证数据回滚

### Q3: 事务失败后用户怎么办？

**A**: 当前实现：

1. **返回错误**: `{ code: -1, msg: '计算失败' }`
2. **自动重试**: 前端可实现指数退避重试
3. **人工介入**: 失败订单标记为异常，人工处理

**建议优化**:
- 添加失败订单队列
- 定时任务自动重试
- 通知管理员处理失败订单

## 安全最佳实践

1. **所有写操作使用事务**: 任何多步操作都必须用事务保护
2. **详细错误日志**: 记录失败原因，便于调试
3. **回滚失败也要日志**: 回滚失败是严重问题
4. **定期一致性检查**: 定时任务检查孤儿记录
5. **测试失败场景**: 验证回滚机制有效

## 相关文件

- `cloudfunctions/promotion/index.js` - 推广奖励计算（事务保护）
- `cloudfunctions/order/index.js` - 订单支付（已有事务）
- `cloudfunctions/wallet/index.js` - 钱包支付（已有事务）

## 更新日志

| 版本 | 日期 | 变更 |
|-------|------|------|
| 1.0.0 | 2026-02-13 | 初始版本 - 完整事务保护 |
