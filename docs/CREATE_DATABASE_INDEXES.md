# 商品数据库索引创建指南

**日期**: 2026-02-26
**环境**: cloud1-6gmp2q0y3171c353
**集合**: products (商品集合)

---

## 📋 需要创建的索引列表

| 索引名 | 字段 | 类型 | 说明 |
|--------|------|------|------|
| idx_category_createTime | category:asc, createTime:desc | 普通索引 | 分类商品查询（支持分类筛选和时间倒序） |
| idx_isHot_createTime | isHot:asc, createTime:desc | 普通索引 | 热门商品查询 |
| idx_isNew_createTime | isNew:asc, createTime:desc | 普通索引 | 新品查询 |
| idx_sales | sales:desc | 普通索引 | 销量排序 |
| idx_price | price:asc | 普通索引 | 价格排序 |
| idx_category_isHot_isNew | category:asc, isHot:asc, isNew:asc | 普通索引 | 组合查询（分类+状态筛选） |

---

## 🔧 创建索引步骤

### 方法一：通过 CloudBase 控制台创建（推荐）

1. **登录 CloudBase 控制台**
   - 访问: https://tcb.cloud.tencent.com/dev?envId=cloud1-6gmp2q0y3171c353#/db/doc

2. **进入 products 集合**
   - 点击左侧导航 "数据库"
   - 找到并点击 "products" 集合
   - 点击 "索引管理" 标签

3. **逐个创建索引**

   **索引 1: idx_category_createTime**
   - 点击 "添加索引"
   - 索引名称: `idx_category_createTime`
   - 索引字段:
     - 字段1: `category` (升序)
     - 字段2: `createTime` (降序)
   - 点击 "保存"

   **索引 2: idx_isHot_createTime**
   - 索引名称: `idx_isHot_createTime`
   - 索引字段:
     - 字段1: `isHot` (升序)
     - 字段2: `createTime` (降序)
   - 点击 "保存"

   **索引 3: idx_isNew_createTime**
   - 索引名称: `idx_isNew_createTime`
   - 索引字段:
     - 字段1: `isNew` (升序)
     - 字段2: `createTime` (降序)
   - 点击 "保存"

   **索引 4: idx_sales**
   - 索引名称: `idx_sales`
   - 索引字段:
     - 字段1: `sales` (降序)
   - 点击 "保存"

   **索引 5: idx_price**
   - 索引名称: `idx_price`
   - 索引字段:
     - 字段1: `price` (升序)
   - 点击 "保存"

   **索引 6: idx_category_isHot_isNew**
   - 索引名称: `idx_category_isHot_isNew`
   - 索引字段:
     - 字段1: `category` (升序)
     - 字段2: `isHot` (升序)
     - 字段3: `isNew` (升序)
   - 点击 "保存"

### 方法二：使用 Migration 云函数生成配置

如果您想查看索引配置，可以调用 `migration` 云函数：

```javascript
// 在小程序中调用
wx.cloud.callFunction({
  name: 'migration',
  data: {
    action: 'createProductIndexes'
  }
}).then(res => {
  console.log('索引配置:', res.result.data);
});
```

---

## ✅ 验证索引创建成功

创建完成后，在控制台的 "索引管理" 页面应该能看到所有 6 个索引。

---

## 📊 性能提升预期

创建索引后，以下查询速度将显著提升：

| 查询类型 | 优化前 | 优化后 | 提升 |
|---------|--------|--------|------|
| 按分类筛选商品 | 全表扫描 | 索引查找 | **50-80%** ↑ |
| 热门商品查询 | 全表扫描 | 索引查找 | **60-80%** ↑ |
| 销量排序 | 前端排序 | 数据库排序 | **40-60%** ↑ |
| 价格排序 | 前端排序 | 数据库排序 | **40-60%** ↑ |

---

## ⚠️ 注意事项

1. **索引创建时间**: 每个索引创建可能需要几分钟（取决于数据量）
2. **索引占用空间**: 索引会占用额外的存储空间
3. **写入性能**: 索引会增加写入时的开销，但对读多写少场景影响很小
4. **索引管理**: 建议定期检查索引使用情况，删除不再使用的索引

---

## 🚀 部署完成后

1. 重新编译小程序: `npm run build:mp-weixin`
2. 在微信开发者工具中预览测试
3. 观察首页加载速度和分类切换速度

**预期效果**:
- 首页加载时间: ~2000ms → ~600ms
- 分类切换时间: ~1500ms → ~500ms
- 滚动加载更流畅

---

**创建完成后，请返回此页面标记为已完成！** ✅
