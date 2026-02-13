# Product 云函数

商品管理云函数，提供商品查询和数据初始化功能。

## 功能

### Actions

1. **initData** - 初始化商品数据到云数据库
   - 读取 `data.json` 文件
   - 创建分类和商品记录
   - 用于首次部署或数据重置

2. **getProducts** - 获取商品列表
   - 支持分类筛选
   - 支持关键词搜索（防 ReDoS）
   - 支持分页
   - 支持排序（price/sales/createTime）

3. **getProductDetail** - 获取商品详情
   - 根据 ID 获取单个商品

4. **getHotProducts** - 获取热门商品
   - 返回 isHot=true 的商品

5. **getNewProducts** - 获取新品
   - 返回 isNew=true 的商品

6. **getCategories** - 获取分类列表
   - 返回所有活跃分类

## 数据结构

### categories 集合
```javascript
{
  _id: "cat_0",
  name: "鲜啤外带",
  icon: "DR",
  sort: 0,
  isActive: true,
  createTime: Date
}
```

### products 集合
```javascript
{
  _id: "prod_0_0",
  name: "飞云江小麦",
  enName: "Feiyunjiang wheat",
  description: "Feiyunjiang wheat - 酒精含量≥5% / 麦芽浓度12°P",
  specs: "酒精含量≥5% / 麦芽浓度12°P",
  price: 1400,  // 单位：分
  priceList: [
    { volume: "500ml", price: 1400 },
    { volume: "1L", price: 2600 }
  ],
  images: ["https://..."],
  category: "鲜啤外带",
  tags: ["鲜啤", "推荐"],
  stock: 999,
  sales: 123,
  rating: 4.8,
  brewery: "大友精酿",
  alcoholContent: 5.0,
  volume: 500,
  isHot: true,
  isNew: false,
  createTime: Date
}
```

## 部署步骤

### 1. 上传云函数
```bash
# 通过 CloudBase 控制台上传
# 或者使用 tcb CLI
tcb functions deploy product
```

### 2. 初始化商品数据
在 CloudBase 控制台或通过调用云函数：

```javascript
// 调用 initData action
wx.cloud.callFunction({
  name: 'product',
  data: {
    action: 'initData',
    data: require('./data.json')
  }
}).then(res => {
  console.log('初始化结果:', res);
});
```

### 3. 验证数据
- 检查 categories 集合是否创建了 2 个分类
- 检查 products 集合是否创建了 15 个商品

## 安全说明

- 关键词搜索已实现 ReDoS 防护
  - 长度限制：100 字符
  - 特殊字符过滤
  - 使用数据库正则查询

## 测试

### 本地测试
```bash
node index.js
```

### 云端测试
通过小程序或 H5 调用各种 actions
