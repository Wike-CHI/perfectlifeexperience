# 推广系统数据库索引优化指南

## 概述

本文档提供了推广系统云函数的数据库索引优化建议，以提升查询性能并减少开发成本消耗。

## 索引优化建议

### 1. users 集合

#### 必需索引

```javascript
// 复合索引：推广关系查询
db.users.createIndex({
  parentId: 1,
  createTime: -1
});
// 用途：getTeamStats, getTeamMembers
// 查询：where({ parentId: userId }).orderBy('createTime', 'desc')

// 复合索引：注册IP防刷
db.users.createIndex({
  registerIP: 1,
  createTime: -1
});
// 用途：checkDuplicateRegistration
// 查询：where({ registerIP: ip, createTime: _.gte(recentTime) })

// 唯一索引：邀请码唯一性
db.users.createIndex({
  inviteCode: 1
}, { unique: true });
// 用途：bindPromotionRelation, getPromotionInfo
// 查询：where({ inviteCode: code })

// 唯一索引：OpenID唯一性
db.users.createIndex({
  _openid: 1
}, { unique: true });
// 用途：所有用户查询
// 查询：where({ _openid: openid })

// 复合索引：推广路径搜索
db.users.createIndex({
  promotionPath: 1
});
// 用途：getTeamMembers (多层级查询)
// 查询：where({ promotionPath: RegExp(...) })

// 复合索引：星级晋升
db.users.createIndex({
  starLevel: 1,
  'performance.totalSales': -1,
  'performance.monthSales': -1
});
// 用途：checkStarLevelPromotion (可选优化)
// 查询：按星级和业绩排序

// 复合索引：业绩统计
db.users.createIndex({
  parentId: 1,
  'performance.monthTag': 1
});
// 用途：月度业绩重置检测
// 查询：where({ parentId: userId, 'performance.monthTag': tag })
```

### 2. promotion_orders 集合

#### 必需索引

```javascript
// 复合索引：订单查询
db.promotion_orders.createIndex({
  orderId: 1
}, { unique: true });
// 用途：防止重复计算订单奖励
// 查询：where({ orderId: orderId })

// 复合索引：买家订单统计
db.promotion_orders.createIndex({
  buyerId: 1,
  createTime: -1
});
// 用途：统计买家订单数
// 查询：where({ buyerId: openid }).orderBy('createTime', 'desc')

// 复合索引：状态查询
db.promotion_orders.createIndex({
  status: 1,
  createTime: -1
});
// 用途：奖励结算查询
// 查询：where({ status: 'pending' })
```

### 3. reward_records 集合

#### 必需索引

```javascript
// 复合索引：受益人奖励查询
db.reward_records.createIndex({
  beneficiaryId: 1,
  createTime: -1
});
// 用途：getRewardRecords
// 查询：where({ beneficiaryId: openid }).orderBy('createTime', 'desc')

// 复合索引：订单关联
db.reward_records.createIndex({
  orderId: 1,
  rewardType: 1
});
// 用途：订单奖励明细
// 查询：where({ orderId: orderId, rewardType: type })

// 复合索引：奖励类型查询
db.reward_records.createIndex({
  beneficiaryId: 1,
  rewardType: 1,
  status: 1,
  createTime: -1
});
// 用途：getRewardRecords (带筛选)
// 查询：where({ beneficiaryId: openid, rewardType: type, status: status })

// 复合索引：结算时间查询
db.reward_records.createIndex({
  beneficiaryId: 1,
  status: 1,
  settleTime: -1
});
// 用途：getPromotionInfo (今日/本月收益)
// 查询：where({ beneficiaryId: openid, status: 'settled', settleTime: _.gte(date) })
```

### 4. promotion_relations 集合

#### 必需索引

```javascript
// 唯一索引：用户唯一性
db.promotion_relations.createIndex({
  userId: 1
}, { unique: true });
// 用途：防止重复绑定
// 查询：where({ userId: openid })

// 复合索引：上级查询
db.promotion_relations.createIndex({
  parentId: 1,
  createTime: -1
});
// 用途：查询某个用户的所有下级关系
// 查询：where({ parentId: parentId })

// 复合索引：路径查询
db.promotion_relations.createIndex({
  path: 1
});
// 用途：路径搜索（可选）
// 查询：where({ path: RegExp(...) })
```

### 5. orders 集合（已有，需补充）

#### 建议补充索引

```javascript
// 复合索引：用户订单统计
db.orders.createIndex({
  _openid: 1,
  status: 1,
  createTime: -1
});
// 用途：updateBuyerOrderCount
// 查询：where({ _openid: buyerId, status: _.in(['paid', 'shipping', 'completed']) })
```

## 性能优化建议

### 1. 查询优化

#### 使用 field() 限制返回字段

```javascript
// ❌ 不推荐：查询所有字段
const users = await db.collection('users')
  .where({ parentId: userId })
  .get();

// ✅ 推荐：只查询需要的字段
const users = await db.collection('users')
  .where({ parentId: userId })
  .field({ _openid: true, inviteCode: true }) // 只返回需要的字段
  .get();
```

#### 使用 limit() 分页

```javascript
// ❌ 不推荐：一次查询大量数据
const records = await db.collection('reward_records')
  .where({ beneficiaryId: openid })
  .get();

// ✅ 推荐：使用分页
const records = await db.collection('reward_records')
  .where({ beneficiaryId: openid })
  .skip((page - 1) * limit)
  .limit(limit)
  .get();
```

#### 批量查询代替循环查询

```javascript
// ❌ 不推荐：循环查询
const parentChain = ['id1', 'id2', 'id3'];
for (const id of parentChain) {
  const user = await db.collection('users').where({ _openid: id }).get();
}

// ✅ 推荐：批量查询
const users = await db.collection('users')
  .where({ _openid: _.in(parentChain) })
  .get();
```

### 2. 提前终止查询

```javascript
// 在 getTeamStats 中，如果某层级人数为0，则终止后续查询
if (level1Count === 0) {
  return stats; // 直接返回，不查询level2/3/4
}
```

### 3. 缓存策略

#### 对不常变化的数据使用缓存

```javascript
// 用户基础信息缓存（1小时）
const cacheKey = `user_info_${openid}`;
let userInfo = await cache.get(cacheKey);

if (!userInfo) {
  userInfo = await db.collection('users').where({ _openid: openid }).get();
  await cache.set(cacheKey, userInfo, 3600); // 缓存1小时
}
```

### 4. 异步处理

#### 非关键路径异步化

```javascript
// 奖励计算可以异步执行
async function onOrderPaid(orderId) {
  // 同步：创建订单
  await createOrder(orderData);

  // 异步：计算推广奖励（不阻塞主流程）
  calculatePromotionReward(orderData).catch(err => {
    console.error('奖励计算失败:', err);
  });

  return { success: true };
}
```

## 监控建议

### 1. 慢查询监控

```javascript
// 在云函数中添加查询时间日志
const startTime = Date.now();
const result = await db.collection('users').where({ ... }).get();
const duration = Date.now() - startTime;

if (duration > 1000) {
  console.warn(`[慢查询] 耗时${duration}ms 查询:users 条件:...`);
}
```

### 2. 查询频率统计

```javascript
// 统计高频查询
const queryStats = {
  'users.where.parentId': 0,
  'reward_records.where.beneficiaryId': 0
};

// 在每次查询后递增
queryStats['users.where.parentId']++;

// 定期输出日志
console.log('[查询统计]', queryStats);
```

## 实施步骤

1. **评估当前索引**
   ```bash
   # 在云开发控制台查看现有索引
   ```

2. **创建索引**
   ```javascript
   // 在云开发控制台或通过云函数创建
   db.collection('users').createIndex({ ... });
   ```

3. **验证索引效果**
   - 查看慢查询日志
   - 对比索引前后的查询时间
   - 监控开发成本消耗

4. **定期维护**
   - 删除不再使用的索引
   - 监控索引大小
   - 优化复合索引顺序

## 预期效果

- **查询性能提升**: 50-80%
- **开发成本降低**: 30-50%
- **响应时间优化**: 从500-1000ms降至100-200ms
- **并发能力提升**: 支持更多用户同时操作

---

**最后更新**: 2026-02-13
**维护者**: Claude Code
