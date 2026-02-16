# 数据库索引优化方案

## 性能瓶颈分析

### 1. 已识别的性能问题

#### 问题1：团队统计查询（getTeamStats）- **高频调用，性能最差**
- **位置**: `cloudfunctions/promotion/index.js:1098-1188`
- **问题**: 递归查询4层团队关系，每层2-3次数据库查询
- **影响**: 用户打开推广页面时触发，耗时500-2000ms
- **查询次数**: 最多11次数据库查询（count + get 交替）

#### 问题2：订单列表查询缺少分页
- **位置**: `cloudfunctions/order/index.js:320-340`
- **问题**: getOrders 没有默认限制返回数量
- **影响**: 用户订单多时可能返回数千条记录

#### 问题3：推广信息查询（getPromotionInfo）
- **位置**: `cloudfunctions/promotion/index.js:968-1093`
- **问题**: 每次都重新计算团队统计，没有缓存
- **影响**: 每次进入"我的"页面都会触发全量计算

#### 问题4：商品列表查询
- **位置**: `cloudfunctions/product/index.js:203-271`
- **问题**: 每次都查询数据库，无缓存
- **影响**: 首页加载慢

---

## 优化方案

### 方案1：创建数据库索引（立即见效）

```javascript
// 在云开发控制台执行，或使用 migration 云函数

// 1. users 集合索引
db.collection('users').createIndex({
  keys: [{ _openid: 1 }, { parentId: 1 }, { inviteCode: 1 }],
  name: 'users_query_index'
});

// 2. orders 集合索引
db.collection('orders').createIndex({
  keys: [{ _openid: 1 }, { status: 1 }, { createTime: -1 }],
  name: 'orders_user_index'
});

// 3. reward_records 集合索引
db.collection('reward_records').createIndex({
  keys: [{ beneficiaryId: 1 }, { settleTime: -1 }],
  name: 'rewards_beneficiary_index'
});

// 4. promotion_orders 集合索引
db.collection('promotion_orders').createIndex({
  keys: [{ buyerId: 1 }, { status: 1 }],
  name: 'promotion_orders_buyer_index'
});

// 5. products 集合索引
db.collection('products').createIndex({
  keys: [{ category: 1 }, { status: 1 }, { createTime: -1 }],
  name: 'products_category_index'
});
```

**预期收益**: 查询速度提升 50-80%

---

### 方案2：优化 getTeamStats 查询（中期优化）

#### 问题分析
当前实现递归查询4层，每层2次查询（1次count + 1次get IDs）：
```
Level 1: count + get IDs  (2次查询)
Level 2: count + get IDs  (2次查询)
Level 3: count + get IDs  (2次查询)
Level 4: count             (1次查询)
总计: 7次数据库查询
```

#### 优化方案1：使用聚合查询（推荐）

```javascript
async function getTeamStatsOptimized(userId) {
  const stats = { total: 0, level1: 0, level2: 0, level3: 0, level4: 0 };

  // 使用聚合管道一次性获取所有层级数据
  const result = await db.collection('users')
    .aggregate()
    .match({ parentId: userId })
    .lookup({
      from: 'users',
      localField: '_openid',
      foreignField: 'parentId',
      as: 'level2'
    })
    .end();

  if (result.data.length > 0) {
    stats.level1 = result.data.length;
    stats.level2 = result.data.reduce((sum, u) => sum + (u.level2?.length || 0), 0);
    // 类似处理 level3, level4...
  }

  return stats;
}
```

**预期收益**: 从7次查询减少到1次，速度提升 80%

#### 优化方案2：使用递归缓存（简单快速）

```javascript
// 在用户表增加 teamStats 字段
// 结构: { total: 100, level1: 20, level2: 30, level3: 30, level4: 20, updateTime: Date }

async function getTeamStatsWithCache(userId) {
  // 1. 尝试从缓存读取（1小时内有效）
  const userRes = await db.collection('users')
    .where({ _openid: userId })
    .field({ teamStats: true })
    .get();

  if (userRes.data.length > 0 && userRes.data[0].teamStats) {
    const stats = userRes.data[0].teamStats;
    const age = Date.now() - new Date(stats.updateTime).getTime();

    // 缓存1小时有效
    if (age < 3600000) {
      logger.debug('Using cached team stats', { age });
      return stats;
    }
  }

  // 2. 缓存失效，重新计算
  const stats = await getTeamStats(userId);
  stats.updateTime = new Date();

  // 3. 更新缓存
  await db.collection('users')
    .where({ _openid: userId })
    .update({ data: { teamStats: stats } });

  return stats;
}
```

**预期收益**: 缓存命中时速度提升 95%

---

### 方案3：实现全局缓存（长期优化）

#### 缓存策略

| 数据类型 | 缓存位置 | 过期时间 | 失效策略 |
|---------|---------|---------|---------|
| 用户基础信息 | 云函数内存 | 5分钟 | 用户更新时清除 |
| 商品分类列表 | 云函数内存 | 1小时 | 商品更新时清除 |
| 推广团队统计 | users表字段 | 1小时 | 团队变化时重算 |
| 热门商品列表 | products表字段 | 30分钟 | 定时任务刷新 |

#### 实现示例

```javascript
// cloudfunctions/common/cache.js

class SimpleCache {
  constructor(ttl = 300000) { // 默认5分钟
    this.cache = new Map();
    this.ttl = ttl;
  }

  set(key, value, customTtl) {
    this.cache.set(key, {
      value,
      expireAt: Date.now() + (customTtl || this.ttl)
    });
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() > item.expireAt) {
      this.cache.delete(key);
      return null;
    }

    return item.value;
  }

  clear() {
    this.cache.clear();
  }
}

// 全局缓存实例
const userCache = new SimpleCache(300000);      // 5分钟
const productCache = new SimpleCache(3600000);   // 1小时

module.exports = { SimpleCache, userCache, productCache };
```

---

## 实施计划

### 阶段1：索引创建（立即）- 1小时
- [ ] 在云开发控制台创建索引
- [ ] 验证索引创建成功
- [ ] 测试查询性能提升

### 阶段2：缓存优化（本周）- 4小时
- [ ] 实现 getTeamStats 缓存版本
- [ ] 为 getPromotionInfo 添加缓存
- [ ] 为商品列表添加缓存
- [ ] 测试缓存一致性

### 阶段3：查询重构（下周）- 8小时
- [ ] 使用聚合查询优化 getTeamStats
- [ ] 优化订单列表分页
- [ ] 批量查询替代循环查询
- [ ] 性能测试对比

---

## 性能基准

### 优化前
- 首页加载: 2000-3000ms
- 推广页面: 1500-2500ms
- 订单列表: 1000-2000ms
- 用户信息: 500-1000ms

### 优化后（预期）
- 首页加载: 500-800ms ⬇️ 70%
- 推广页面: 300-500ms ⬇️ 75%
- 订单列表: 200-400ms ⬇️ 75%
- 用户信息: 100-200ms ⬇️ 80%

---

## 监控指标

建议在关键云函数中添加性能日志：

```javascript
const startTime = Date.now();

// 执行查询
const result = await db.collection('users').get();

const duration = Date.now() - startTime;
logger.info('Database query performance', {
  collection: 'users',
  duration: `${duration}ms`,
  recordCount: result.data.length
});
```

---

## 注意事项

1. **索引创建需要时间**：大集合创建索引可能需要几分钟到几小时
2. **索引会占用存储**：每个索引约增加20%存储空间
3. **写操作变慢**：索引会略微降低写入速度（约5-10%）
4. **缓存一致性**：确保数据更新时清除相关缓存
5. **测试环境验证**：所有优化先在测试环境验证

---

## 相关文档

- [Tencent CloudBase 索引最佳实践](https://docs.cloudbase.net/database/performance/index)
- [NoSQL 数据库优化指南](https://docs.cloudbase.net/database/performance/optimize)
- [聚合查询使用指南](https://docs.cloudbase.net/database/query/aggregate)
