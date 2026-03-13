# 订单列表性能优化 - 索引手动创建指南

## 背景

为了优化订单列表分页查询性能，需要在 `orders` 集合上创建复合索引。

## 索引定义

**集合名称**: `orders`

**索引字段**:
- `_openid`: 升序 (1)
- `createTime`: 降序 (-1)

**索引名称**: `openid_createTime_idx`（推荐命名）

## 创建步骤

### 方法一：云开发控制台（推荐）

1. **访问控制台**
   - 打开浏览器，访问：https://tcb.cloud.tencent.com/dev?envId=cloud1-6gmp2q0y3171c353#/db/doc

2. **选择集合**
   - 在左侧集合列表中找到并点击 `orders` 集合

3. **打开索引管理**
   - 点击集合页面顶部的"索引管理"或"Indexes"标签页

4. **添加索引**
   - 点击"添加索引"按钮
   - 索引名称填写：`openid_createTime_idx`
   - 添加索引字段：
     - 第一个字段：选择 `_openid`，排序选择 `升序(1)`
     - 第二个字段：选择 `createTime`，排序选择 `降序(-1)`
   - 索引类型选择：普通索引（不勾选"唯一索引"）

5. **保存**
   - 点击"确定"或"保存"按钮
   - 等待索引创建完成（通常几秒钟）

### 方法二：通过 MongoDB 客户端（高级用户）

如果你有 MongoDB 客户端权限，可以直接执行：

```javascript
db.orders.createIndex(
  { _openid: 1, createTime: -1 },
  { name: 'openid_createTime_idx' }
)
```

## 验证索引

### 方法一：控制台验证

1. 在 `orders` 集合的索引管理页面，查看是否显示新创建的索引

### 方法二：通过迁移云函数验证

```javascript
wx.cloud.callFunction({
  name: 'migration',
  data: {
    action: 'createOrderListIndex'
  }
}).then(res => {
  console.log('索引指引:', res.result);
});
```

返回结果中会包含索引定义和手动创建步骤。

## 性能对比

### 创建索引前
- 分页查询时间：2-3 秒
- 全表扫描，性能随数据量增长线性下降

### 创建索引后
- 分页查询时间：< 500 毫秒
- 索引扫描，性能稳定

## 常见问题

### Q: 索引已存在错误？
**A**: 这是正常的，说明索引已经被创建。可以继续使用，无需重复创建。

### Q: 索引创建失败？
**A**: 检查以下事项：
1. 确认字段名称正确（`_openid` 和 `createTime`）
2. 确认排序方向正确（_openid 升序，createTime 降序）
3. 确认有足够的权限创建索引

### Q: 创建索引会影响线上服务吗？
**A**: 不会。CloudBase 索引创建是后台操作，不会阻塞现有查询。

## 相关文档

- [CloudBase 数据库索引管理](https://docs.cloudbase.net/database/intro)
- [性能优化实施计划](./PERFORMANCE_OPTIMIZATION_PLAN.md)
- [Chunk 1 实施记录](./chunk1-pagination-implementation.md)

## 更新日志

- 2026-03-13: 创建文档，添加索引手动创建步骤
