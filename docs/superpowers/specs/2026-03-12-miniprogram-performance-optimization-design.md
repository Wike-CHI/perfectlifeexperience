# 小程序性能优化设计文档

**日期**: 2026-03-12
**版本**: 1.0
**状态**: 待批准

---

## 1. 概述

### 1.1 优化目标

对大友元气精酿啤酒小程序进行全方位性能优化，解决用户反馈的加载速度慢问题。

**当前问题：**
- 订单详情页面切换需要等待 2-3 秒
- 分类页面加载慢
- 数据请求响应慢
- 存在白屏、长时间加载动画、滚动卡顿

**优化目标：**
- 首次加载时间：从 2-3秒降低到 < 1秒
- 页面切换时间：< 500ms
- 滚动流畅度：提升 60-70%
- 用户感知：整体响应速度提升 60-70%

### 1.2 优化策略

采用**分页 + 虚拟列表**策略，从数据加载和页面渲染两个层面优化：
- 减少单次数据传输量
- 减少渲染压力
- 改善用户感知体验
- 保持业务逻辑不变

---

## 2. 订单列表分页优化

### 2.1 当前实现

订单列表页面一次性加载所有订单数据：
- 前端请求订单列表，无分页参数
- 后端返回全部订单数据
- 前端一次性渲染所有订单

**问题：**
- 数据量大时，接口响应慢
- 一次性渲染大量订单，主线程阻塞
- 用户等待时间长

### 2.2 优化方案

#### 分页加载机制

**前端实现：**
```typescript
interface OrderListState {
  orders: Order[];
  currentPage: number;
  pageSize: number;
  hasMore: boolean;
  loading: boolean;
}

const state = reactive<OrderListState>({
  orders: [],
  currentPage: 1,
  pageSize: 10,
  hasMore: true,
  loading: false
});

// 加载订单列表
async function loadOrders(refresh = false) {
  if (state.loading) return;

  if (refresh) {
    state.currentPage = 1;
    state.orders = [];
  }

  state.loading = true;

  try {
    const result = await callFunction('order', {
      action: 'list',
      data: {
        page: state.currentPage,
        pageSize: state.pageSize
      }
    });

    state.orders = [...state.orders, ...result.orders];
    state.hasMore = result.orders.length === state.pageSize;
    state.currentPage++;
  } catch (error) {
    console.error('加载订单失败:', error);
  } finally {
    state.loading = false;
  }
}

// 触底加载
function onReachBottom() {
  if (state.hasMore && !state.loading) {
    loadOrders();
  }
}
```

**后端实现：**
```javascript
// cloudfunctions/order/index.js
async function handleList(params, openid) {
  const { page = 1, pageSize = 10 } = params;

  const result = await db.collection('orders')
    .where({ _openid: openid })
    .orderBy('createTime', 'desc')
    .skip((page - 1) * pageSize)
    .limit(pageSize + 1) // 多查1条判断hasMore
    .get();

  const hasMore = result.data.length > pageSize;
  const orders = hasMore ? result.data.slice(0, pageSize) : result.data;

  return success({
    orders,
    hasMore,
    page,
    pageSize
  });
}
```

#### 缓存策略

**本地缓存实现：**
```typescript
const CACHE_KEY = 'order_list_cache';
const CACHE_DURATION = 5 * 60 * 1000; // 5分钟

// 读取缓存
function getCachedOrders(): Order[] | null {
  const cached = uni.getStorageSync(CACHE_KEY);
  if (!cached) return null;

  const { data, timestamp } = JSON.parse(cached);
  if (Date.now() - timestamp > CACHE_DURATION) {
    uni.removeStorageSync(CACHE_KEY);
    return null;
  }

  return data;
}

// 写入缓存
function setCachedOrders(orders: Order[]) {
  const cache = {
    data: orders,
    timestamp: Date.now()
  };
  uni.setStorageSync(CACHE_KEY, JSON.stringify(cache));
}
```

**使用缓存：**
```typescript
async function loadOrders(refresh = false) {
  // 如果不是刷新，先尝试读取缓存
  if (!refresh) {
    const cached = getCachedOrders();
    if (cached && cached.length > 0) {
      state.orders = cached;
      return; // 直接使用缓存
    }
  }

  // 从服务器加载
  state.loading = true;
  const result = await callFunction('order', { action: 'list', ... });

  // 更新缓存
  setCachedOrders(result.orders);
  state.orders = result.orders;
}
```

### 2.3 分页信息显示

**UI实现：**
```vue
<view class="load-more">
  <view v-if="loading" class="loading">
    <uni-load-more status="loading" />
  </view>
  <view v-else-if="!hasMore" class="no-more">
    已加载全部订单
  </view>
  <view v-else class="has-more">
    已加载 {{ orders.length }} 条订单
  </view>
</view>
```

---

## 3. 分类商品虚拟列表

### 3.1 当前实现

分类页面一次性加载所有商品并渲染：
- 可能包含几十个商品
- 所有商品都渲染到 DOM 中
- 滚动时卡顿

**问题：**
- 初始渲染慢
- 内存占用高
- 滚动性能差

### 3.2 虚拟列表方案

#### 技术原理

**核心思想：** 只渲染可见区域的商品 + 缓冲区

```
┌─────────────────────────────┐
│  可见区域（用户看到的）      │
├─────────────────────────────┤
│  缓冲区（预渲染）            │
├─────────────────────────────┤
│  不可见区域（不渲染）        │
└─────────────────────────────┘
```

**参数配置：**
- 可见区域商品数：5 个
- 缓冲区大小：上下各 3 个
- 实际渲染：11 个商品
- 商品固定高度：240rpx

#### 组件实现

**虚拟列表组件：**
```vue
<template>
  <view
    class="virtual-list"
    :style="{ height: `${totalHeight}px` }"
    @scroll="onScroll"
    scroll-y
  >
    <view
      v-for="item in visibleItems"
      :key="item._id"
      class="virtual-item"
      :style="{ transform: `translateY(${item.offset}px)` }"
    >
      <ProductCard :product="item.data" />
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';

interface Props {
  items: Product[];
  itemHeight: number; // 如 240rpx
  visibleCount: number; // 如 5
  bufferSize?: number; // 如 3
}

const props = withDefaults(defineProps<Props>(), {
  itemHeight: 240,
  visibleCount: 5,
  bufferSize: 3
});

const scrollTop = ref(0);

// 总高度
const totalHeight = computed(() =>
  props.items.length * props.itemHeight
);

// 可见区域商品索引
const startIndex = computed(() => {
  const index = Math.floor(scrollTop.value / props.itemHeight);
  return Math.max(0, index - props.bufferSize);
});

// 结束索引
const endIndex = computed(() => {
  return Math.min(
    props.items.length - 1,
    startIndex.value + props.visibleCount + props.bufferSize
  );
});

// 可见商品
const visibleItems = computed(() => {
  const items = [];
  for (let i = startIndex.value; i <= endIndex.value; i++) {
    const product = props.items[i];
    items.push({
      _id: product._id,
      data: product,
      offset: i * props.itemHeight
    });
  }
  return items;
});

// 滚动处理
function onScroll(e: any) {
  scrollTop.value = e.detail.scrollTop;
}
</script>

<style scoped>
.virtual-list {
  width: 100%;
  overflow-y: auto;
}

.virtual-item {
  position: absolute;
  left: 0;
  right: 0;
  will-change: transform;
}
</style>
```

#### 数据分页

**分页加载：**
```typescript
const categoryState = reactive({
  products: [] as Product[],
  currentPage: 1,
  pageSize: 20,
  hasMore: true,
  loading: false
});

// 加载分类商品
async function loadCategoryProducts(categoryId: string, refresh = false) {
  if (refresh) {
    categoryState.currentPage = 1;
    categoryState.products = [];
  }

  categoryState.loading = true;

  try {
    const result = await callFunction('product', {
      action: 'list',
      data: {
        category: categoryId,
        page: categoryState.currentPage,
        pageSize: categoryState.pageSize
      }
    });

    categoryState.products = [
      ...categoryState.products,
      ...result.products
    ];
    categoryState.hasMore = result.products.length === categoryState.pageSize;
    categoryState.currentPage++;
  } finally {
    categoryState.loading = false;
  }
}
```

**触底加载：**
```typescript
function onReachBottom() {
  if (categoryState.hasMore && !categoryState.loading) {
    loadCategoryProducts(currentCategoryId);
  }
}
```

### 3.3 固定高度配置

**商品卡片样式：**
```vue
<template>
  <view class="product-card" :style="{ height: `${itemHeight}rpx` }">
    <image class="product-image" :src="product.images[0]" lazy-load />
    <view class="product-info">
      <text class="product-name">{{ product.name }}</text>
      <text class="product-price">¥{{ product.price }}</text>
    </view>
  </view>
</template>

<style scoped>
.product-card {
  width: 100%;
  box-sizing: border-box;
  padding: 20rpx;
  /* 关键：固定高度 */
  min-height: 240rpx;
  height: 240rpx;
}
</style>
```

---

## 4. 骨架屏加载优化

### 4.1 订单详情骨架屏

**骨架屏组件：**
```vue
<template>
  <view v-if="loading" class="skeleton">
    <!-- 订单基本信息 -->
    <view class="skeleton-header">
      <view class="skeleton-line long"></view>
      <view class="skeleton-line medium"></view>
    </view>

    <!-- 商品列表骨架 -->
    <view class="skeleton-items">
      <view
        v-for="i in 3"
        :key="i"
        class="skeleton-item"
      >
        <view class="skeleton-img"></view>
        <view class="skeleton-content">
          <view class="skeleton-line long"></view>
          <view class="skeleton-line short"></view>
        </view>
      </view>
    </view>
  </view>

  <view v-else class="content">
    <!-- 实际订单内容 -->
  </view>
</template>

<style scoped>
.skeleton {
  padding: 30rpx;
}

.skeleton-line {
  height: 30rpx;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: loading 1.5s infinite;
  border-radius: 4rpx;
  margin-bottom: 20rpx;
}

.skeleton-line.long { width: 100%; }
.skeleton-line.medium { width: 70%; }
.skeleton-line.short { width: 40%; }

.skeleton-img {
  width: 120rpx;
  height: 120rpx;
  background: #f0f0f0;
  border-radius: 8rpx;
}

@keyframes loading {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
</style>
```

**使用示例：**
```vue
<template>
  <view class="order-detail">
    <OrderSkeleton v-if="loading" />
    <OrderContent v-else :order="order" />
  </view>
</template>

<script setup lang="ts">
const loading = ref(true);
const order = ref(null);

onMounted(async () => {
  const result = await loadOrderDetail(orderId);
  order.value = result;
  loading.value = false;
});
</script>
```

### 4.2 分类页面骨架屏

**分类导航骨架：**
```vue
<template>
  <view v-if="loading" class="category-skeleton">
    <scroll-view scroll-x class="skeleton-nav">
      <view
        v-for="i in 6"
        :key="i"
        class="skeleton-nav-item"
      >
        <view class="skeleton-dot"></view>
      </view>
    </scroll-view>
  </view>
</template>
```

**商品网格骨架：**
```vue
<template>
  <view class="skeleton-grid">
    <view
      v-for="i in 8"
      :key="i"
      class="skeleton-grid-item"
    >
      <view class="skeleton-img"></view>
      <view class="skeleton-title"></view>
      <view class="skeleton-price"></view>
    </view>
  </view>
</template>

<style scoped>
.skeleton-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20rpx;
  padding: 20rpx;
}

.skeleton-grid-item {
  background: #fff;
  border-radius: 16rpx;
  padding: 20rpx;
}

.skeleton-img {
  width: 100%;
  height: 240rpx;
  background: #f0f0f0;
  border-radius: 8rpx;
  margin-bottom: 20rpx;
}

.skeleton-title {
  height: 30rpx;
  background: #f0f0f0;
  border-radius: 4rpx;
  margin-bottom: 10rpx;
}

.skeleton-price {
  height: 24rpx;
  width: 40%;
  background: #f0f0f0;
  border-radius: 4rpx;
}
</style>
```

---

## 5. 接口优化与并行请求

### 5.1 订单详情接口合并

**当前问题：**
订单详情页需要多次请求：
1. 获取订单基本信息
2. 获取订单商品列表
3. 获取物流信息

**优化方案：**
合并为单次请求，后端一次性返回所有数据。

**前端实现：**
```typescript
// 优化前：串行请求
const orderInfo = await getOrderInfo(orderId);
const orderItems = await getOrderItems(orderId);
const logistics = await getLogistics(orderId);

// 优化后：单次请求
const orderDetail = await callFunction('order', {
  action: 'getDetail',
  data: { orderId }
});
// orderDetail 包含：info, items, logistics
```

**后端实现：**
```javascript
// cloudfunctions/order/index.js
async function handleGetDetail(params, openid) {
  const { orderId } = params;

  // 并行查询订单信息、商品列表、物流信息
  const [infoResult, itemsResult, logisticsResult] = await Promise.all([
    db.collection('orders').doc(orderId).get(),
    db.collection('order_items').where({ orderId }).get(),
    db.collection('logistics').where({ orderId }).get()
  ]);

  return success({
    info: infoResult.data,
    items: itemsResult.data,
    logistics: logisticsResult.data
  });
}
```

### 5.2 分类数据预加载

**预加载时机：**
- 首页加载完成后
- 用户在首页浏览时

**实现：**
```typescript
// 在首页 onMounted 中
onMounted(async () => {
  // 加载首页数据
  await loadHomeData();

  // 后台预加载热门分类数据
  preloadCategories();
});

// 预加载函数
async function preloadCategories() {
  const hotCategories = ['精酿啤酒', '进口啤酒', ' Saison'];

  for (const category of hotCategories) {
    // 不等待，后台静默加载
    callFunction('product', {
      action: 'list',
      data: { category, page: 1, pageSize: 10 }
    }).then(result => {
      // 缓存到本地
      uni.setStorageSync(
        `category_${category}`,
        JSON.stringify({ data: result, timestamp: Date.now() })
      );
    });
  }
}
```

**使用预加载数据：**
```typescript
async function openCategory(categoryName: string) {
  // 先尝试读取缓存
  const cached = uni.getStorageSync(`category_${categoryName}`);
  if (cached) {
    const { data, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp < 5 * 60 * 1000) {
      // 使用缓存数据立即显示
      categoryProducts = data.products;
      showPage();
      return;
    }
  }

  // 缓存失效，重新加载
  await loadCategoryProducts(categoryName);
}
```

### 5.3 并行请求独立数据

**场景：** 订单列表页需要同时加载订单列表和优惠券列表

**实现：**
```typescript
async function loadOrderListData() {
  loading.value = true;

  try {
    // 并行请求独立数据
    const [ordersResult, couponsResult] = await Promise.all([
      callFunction('order', { action: 'list', data: { page: 1, pageSize: 10 } }),
      callFunction('coupon', { action: 'list', data: { type: 'order' } })
    ]);

    orders.value = ordersResult.orders;
    coupons.value = couponsResult.coupons;
  } finally {
    loading.value = false;
  }
}
```

---

## 6. 渲染性能优化

### 6.1 组件懒加载

**延迟加载非关键组件：**
```vue
<script setup lang="ts">
import { defineAsyncComponent } from 'vue';

// 关键组件：立即加载
import OrderHeader from './components/OrderHeader.vue';
import OrderItems from './components/OrderItems.vue';

// 非关键组件：延迟加载
const RecommendProducts = defineAsyncComponent(() =>
  import('./components/RecommendProducts.vue')
);

const CouponList = defineAsyncComponent(() =>
  import('./components/CouponList.vue')
);
</script>

<template>
  <view class="order-detail">
    <OrderHeader :order="order" />
    <OrderItems :items="order.items" />

    <!-- 延迟加载组件 -->
    <RecommendProducts v-if="showRecommend" :products="recommendProducts" />
    <CouponList v-if="showCoupons" :coupons="coupons" />
  </view>
</template>
```

### 6.2 避免不必要的响应式更新

**优化 v-for：**
```vue
<!-- 优化前：复杂表达式 -->
<view v-for="product in products" :key="product._id">
  {{ formatPrice(product.price) }}
  {{ calculateDiscount(product) }}
</view>

<!-- 优化后：使用计算属性 -->
<script setup>
const formattedProducts = computed(() =>
  products.map(p => ({
    ...p,
    formattedPrice: formatPrice(p.price),
    discount: calculateDiscount(p)
  }))
);
</script>

<template>
  <view v-for="product in formattedProducts" :key="product._id">
    {{ product.formattedPrice }}
    {{ product.discount }}
  </view>
</template>
```

**使用 v-show 替代 v-if：**
```vue
<!-- 频繁切换的 Tab -->
<view v-show="activeTab === 'orders'" class="tab-orders">
  <!-- 订单列表 -->
</view>

<view v-show="activeTab === 'coupons'" class="tab-coupons">
  <!-- 优惠券列表 -->
</view>
```

### 6.3 页面预加载配置

**pages.json 配置：**
```json
{
  "pages": [
    {
      "path": "pages/index/index",
      "style": {
        "navigationBarTitleText": "首页"
      }
    },
    {
      "path": "pages/order/list",
      "style": {
        "navigationBarTitleText": "我的订单"
      }
    },
    {
      "path": "pages/category/index",
      "style": {
        "navigationBarTitleText": "分类"
      }
    }
  ],
  "preloadRule": {
    "pages/index/index": {
      "network": "all",
      "packages": ["pages/order", "pages/category"]
    }
  },
  "subPackages": [
    {
      "root": "pages/order",
      "pages": [
        {
          "path": "list",
          "style": {
            "navigationBarTitleText": "我的订单"
          }
        },
        {
          "path": "detail",
          "style": {
            "navigationBarTitleText": "订单详情"
          }
        }
      ]
    },
    {
      "root": "pages/category",
      "pages": [
        {
          "path": "index",
          "style": {
            "navigationBarTitleText": "分类"
          }
        }
      ]
    }
  ]
}
```

**配置说明：**
- 用户打开首页时，自动预加载订单和分类分包
- 下次进入订单/分类页面时，打开速度更快

---

## 7. 技术实现细节

### 7.1 文件结构

**新增组件：**
```
src/components/
  ├── VirtualList/
  │   ├── VirtualList.vue          # 虚拟列表组件
  │   └── types.ts                 # 类型定义
  ├── Skeleton/
  │   ├── OrderSkeleton.vue        # 订单骨架屏
  │   ├── CategorySkeleton.vue     # 分类骨架屏
  │   └── ProductCardSkeleton.vue  # 商品骨架屏
  └── ProductCard/
      ├── ProductCard.vue          # 商品卡片（固定高度）
      └── types.ts
```

**修改页面：**
```
src/pages/
  ├── order/
  │   ├── list.vue                  # 订单列表（分页）
  │   └── detail.vue                # 订单详情（骨架屏 + 接口合并）
  └── category/
      └── index.vue                 # 分类（虚拟列表）
```

**云函数修改：**
```
cloudfunctions/
  ├── order/
  │   └── index.js                  # 添加 list, getDetail actions
  └── product/
      └── index.js                  # 添加分页支持
```

### 7.2 性能监控

**性能日志：**
```typescript
// 页面加载性能监控
function trackPagePerformance(pageName: string) {
  const startTime = Date.now();

  return () => {
    const duration = Date.now() - startTime;
    console.log(`[Performance] ${pageName} loaded in ${duration}ms`);

    // 上报性能数据
    if (duration > 2000) {
      // 慢请求告警
      reportSlowPage(pageName, duration);
    }
  };
}

// 使用
onMounted(() => {
  const track = trackPagePerformance('OrderDetail');

  loadOrderData().finally(() => {
    track(); // 记录性能
  });
});
```

---

## 8. 实施计划概要

### 8.1 实施阶段

**阶段 1：订单列表分页（1-2天）**
- 修改订单列表页面，添加分页加载
- 修改 order 云函数，支持分页
- 添加本地缓存
- 测试验证

**阶段 2：分类虚拟列表（2-3天）**
- 实现虚拟列表组件
- 修改分类页面，使用虚拟列表
- 添加数据分页
- 测试验证

**阶段 3：骨架屏优化（1天）**
- 实现订单详情骨架屏
- 实现分类页面骨架屏
- 集成到各页面
- 测试验证

**阶段 4：接口优化（1-2天）**
- 合并订单详情接口
- 添加数据预加载
- 并行请求优化
- 测试验证

**阶段 5：渲染优化（1天）**
- 组件懒加载
- 页面预加载配置
- 性能监控添加
- 全面测试

**总工期：** 6-9 天

### 8.2 优先级

**P0（必须）：**
- 订单列表分页
- 订单详情骨架屏
- 接口合并

**P1（重要）：**
- 分类虚拟列表
- 数据预加载
- 并行请求

**P2（可选）：**
- 组件懒加载
- 页面预加载
- 性能监控

---

## 9. 风险与降级策略

### 9.1 风险

**技术风险：**
- 虚拟列表实现复杂，可能有兼容性问题
- 分页可能导致业务逻辑变更
- 缓存失效可能导致数据不一致

**性能风险：**
- 缓存策略不当可能增加维护成本
- 虚拟列表滚动性能不如预期

### 9.2 降级策略

**虚拟列表降级：**
```typescript
// 检测虚拟列表是否可用
const supportsVirtualList = checkVirtualListSupport();

if (!supportsVirtualList) {
  // 降级到普通列表
  useNormalList();
}
```

**缓存降级：**
```typescript
try {
  const cached = getCachedData();
  if (cached) {
    displayData(cached);
    // 后台刷新
    refreshData();
  }
} catch (error) {
  // 缓存失败，直接从服务器加载
  loadFromServer();
}
```

---

## 10. 测试计划

### 10.1 功能测试

**订单列表分页：**
- [ ] 首次加载显示10条订单
- [ ] 滚动到底部自动加载下一页
- [ ] 到达最后一页显示"已加载全部"
- [ ] 下拉刷新重新加载第一页
- [ ] 缓存5分钟内有效

**分类虚拟列表：**
- [ ] 滚动流畅，无卡顿
- [ ] 只渲染可见区域商品
- [ ] 滚动时商品正确显示
- [ ] 到达底部自动加载更多

**骨架屏：**
- [ ] 数据加载时显示骨架屏
- [ ] 数据加载完成后骨架屏消失
- [ ] 骨架屏动画流畅

### 10.2 性能测试

**加载时间：**
- [ ] 首次加载 < 1秒
- [ ] 页面切换 < 500ms
- [ ] 订单详情 < 1秒
- [ ] 分类页面 < 1秒

**渲染性能：**
- [ ] 滚动帧率 > 50fps
- [ ] 无明显卡顿
- [ ] 白屏时间 < 300ms

---

## 11. 验收标准

### 11.1 性能指标

- 订单列表首次加载：< 1秒
- 页面切换时间：< 500ms
- 滚动帧率：> 50fps
- 白屏时间：< 300ms

### 11.2 功能完整性

- 所有现有功能正常工作
- 无新增bug
- 缓存机制正确工作
- 降级策略有效

### 11.3 用户体验

- 用户感知速度明显提升
- 骨架屏改善等待体验
- 无数据丢失或显示错误

---

**状态：** 待用户批准
