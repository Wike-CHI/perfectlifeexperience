# 价格显示为0问题调试

## 问题描述

用户反馈: "点击加号 弹出的框是0，根本没有读取到该产品的价格 导致可以免费下单"

## 数据流分析

### 1. 数据库数据

产品ID: `3474fddf69ad3bf200a26ef66d1ff29c`
```json
{
  "_id": "3474fddf69ad3bf200a26ef66d1ff29c",
  "name": "1",
  "price": 200,  // ✅ 正确 (单位:分)
  "stock": 98,
  "images": ["https://636c-cloud1-6gmp2q0y3171c353.tcb.qcloud.la/products/..."],
  "priceList": []  // 空数组 - 无多规格价格
}
```

### 2. 云函数返回 (product云函数)

**getHomePageData 接口**:
```javascript
// cloudfunctions/product/index.js:484-571
return {
  code: 0,
  msg: 'success',
  data: {
    hotProducts: [...],
    newProducts: [...],
    topSalesProducts: [...],  // ← 产品在这里
    banners: [...]
  }
}
```

**字段投影** (第520-523行):
```javascript
db.collection('products')
  .field({
    _id: true,
    name: true,
    images: true,
    price: true,        // ✅ 包含价格字段
    priceList: true,    // ✅ 包含价格列表
    volume: true,
    sales: true
  })
```

### 3. API数据提取 (src/utils/api.ts)

**extractData 函数** (第17-25行):
```typescript
function extractData(res: any): any {
  if (!res || !res.data) return null;

  // 检查 res.data.code 是否存在
  if (res.data.code !== undefined) {
    return res.data.data;  // 嵌套格式
  }

  // 直接返回 res.data
  return res.data;  // ← 应该走这个分支
}
```

**实际数据结构**:
```
云函数返回: {code: 0, data: {topSalesProducts: [...], ...}}
    ↓
callFunction 直接返回
    ↓
res = {code: 0, data: {topSalesProducts: [...], ...}}
    ↓
extractData:
  res.data.code = undefined
  返回 res.data = {topSalesProducts: [...], ...}
    ↓
homeData.topSalesProducts = [{_id: "...", price: 200, ...}]
```

### 4. 首页数据赋值 (src/pages/index/index.vue)

**第391-394行**:
```typescript
hotProducts.value = (homeData.topSalesProducts || []).slice(0, 6).map((p: any) => ({
  ...p,  // ✅ 展开所有属性，包括 price
  spec: p.volume ? `${p.volume}ml` : ''
}));
```

### 5. ProductSkuPopup组件

**价格初始化逻辑** (src/components/ProductSkuPopup.vue):
```typescript
watch(() => props.visible, (newVal) => {
  if (newVal && props.product) {
    if (props.product.priceList && props.product.priceList.length > 0) {
      // 使用第一个规格价格
      const defaultSpec = props.product.priceList[0];
      currentPrice.value = defaultSpec.price;
    } else {
      // 使用基础价格 ← 应该走这个分支
      currentPrice.value = props.product.price;  // ← 应该是 200
      currentSpec.value = props.product.specs || '';
    }
  }
});
```

**价格显示**:
```vue
<view class="price">¥{{ formatPrice(currentPrice) }}</view>
```

**formatPrice 函数**:
```typescript
const formatPrice = (price: number) => {
  if (!price) return '0.00';
  return (price / 100).toFixed(2);  // 200 / 100 = "2.00" ✅
};
```

## 可能的问题点

### 问题1: props.product 可能是响应式代理对象

Vue 3的响应式对象可能在传递过程中丢失某些属性。

**验证方法**: 在ProductSkuPopup中添加调试日志
```typescript
watch(() => props.visible, (newVal) => {
  if (newVal && props.product) {
    console.log('[ProductSkuPopup] 接收到的product:', JSON.stringify(props.product));
    console.log('[ProductSkuPopup] price:', props.product.price);
    console.log('[ProductSkuPopup] priceList:', props.product.priceList);
    // ...
  }
});
```

### 问题2: price字段在某个环节被过滤

可能在以下环节被过滤:
1. 云函数字段投影 (已验证:包含price字段)
2. API数据提取 (已验证:正确提取)
3. 首页map处理 (已验证:使用展开运算符)
4. 组件prop传递 (需要验证)

### 问题3: 数据类型问题

price可能是:
- `undefined`
- `null`
- `0`
- `"0"` (字符串)
- `NaN`

**验证方法**: 添加类型检查
```typescript
console.log('[ProductSkuPopup] price类型:', typeof props.product.price);
console.log('[ProductSkuPopup] price值:', props.product.price);
console.log('[ProductSkuPopup] price == 200:', props.product.price == 200);
```

### 问题4: 缓存数据过期

product云函数使用了缓存 (15分钟TTL):
```javascript
productCache.set(cacheKey, response, 900000);
```

如果缓存中的数据是旧的(没有price字段或price为0),会导致问题。

**验证方法**: 清除缓存后重新加载
```javascript
// 在云函数控制台执行
// 清除product云函数的所有缓存
// 然后重新加载首页数据
```

## 下一步调试计划

### 步骤1: 添加调试日志

在ProductSkuPopup组件中添加详细的调试日志:
```typescript
watch(() => props.visible, (newVal) => {
  if (newVal && props.product) {
    console.log('=== ProductSkuPopup 调试信息 ===');
    console.log('完整product对象:', JSON.stringify(props.product));
    console.log('price值:', props.product.price);
    console.log('price类型:', typeof props.product.price);
    console.log('priceList:', props.product.priceList);
    console.log('spec:', props.product.spec);
    console.log('specs:', props.product.specs);
    console.log('volume:', props.product.volume);
    console.log('==========================');
  }
});
```

### 步骤2: 检查首页数据

在首页loadData函数中添加日志:
```typescript
const loadData = async () => {
  // ...
  hotProducts.value = (homeData.topSalesProducts || []).slice(0, 6).map((p: any) => ({
    ...p,
    spec: p.volume ? `${p.volume}ml` : ''
  }));

  console.log('[首页调试] hotProducts[0]:', JSON.stringify(hotProducts.value[0]));
  // ...
};
```

### 步骤3: 检查API返回

在api.ts的getHomePageData中添加日志:
```typescript
export const getHomePageData = async () => {
  const res = await callFunction('product', {
    action: 'getHomePageData',
    data: {}
  });

  console.log('[API调试] getHomePageData返回:', JSON.stringify(res));

  if (res.code === 0 && res.data) {
    const data = extractData(res);
    console.log('[API调试] 提取的data:', JSON.stringify(data));
    if (data.topSalesProducts && data.topSalesProducts.length > 0) {
      console.log('[API调试] topSalesProducts[0]:', JSON.stringify(data.topSalesProducts[0]));
    }
    return data;
  }
};
```

### 步骤4: 直接查询数据库

使用MCP工具直接查询数据库,确认price字段确实存在:
```javascript
db.collection('products').doc('3474fddf69ad3bf200a26ef66d1ff29c').get()
```

## 临时解决方案

如果确认是数据传递问题,可以添加防御性代码:

**方案1: 在ProductSkuPopup中添加默认值**
```typescript
watch(() => props.visible, (newVal) => {
  if (newVal && props.product) {
    if (props.product.priceList && props.product.priceList.length > 0) {
      currentPrice.value = props.product.priceList[0].price || props.product.price || 0;
    } else {
      currentPrice.value = props.product.price || 0;
    }
  }
});
```

**方案2: 在首页确保price字段存在**
```typescript
hotProducts.value = (homeData.topSalesProducts || []).slice(0, 6).map((p: any) => ({
  ...p,
  price: p.price || 0,  // 确保price字段存在
  spec: p.volume ? `${p.volume}ml` : ''
}));
```

## 预期结果

添加调试日志后,用户重新编译小程序,应该能在控制台看到:
1. 云函数返回的数据包含price: 200
2. API提取的数据包含price: 200
3. 首页hotProducts包含price: 200
4. ProductSkuPopup接收到的product包含price: 200

如果任何环节显示price为undefined/null/0,就能定位到问题所在。

---

**调试日期**: 2026-03-09
**调试人**: Claude Code
**相关文件**:
- `cloudfunctions/product/index.js`
- `src/utils/api.ts`
- `src/pages/index/index.vue`
- `src/components/ProductSkuPopup.vue`
