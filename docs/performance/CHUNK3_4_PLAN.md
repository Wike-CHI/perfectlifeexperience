# Chunk 3 & 4: API 并行请求与加载优化 - 实施计划

## 🎯 双 Chunk 联合优化

### Chunk 3: API 并行请求优化
**目标**: 减少串行请求等待时间，通过并行请求提升首页加载速度

### Chunk 4: 骨架屏和加载优化
**目标**: 优化加载体验，添加全局骨架屏和加载状态管理

---

## 📋 当前问题分析

### 问题 1: 串行请求导致等待时间过长

**示例流程（首页加载）**:
```
用户打开小程序
    ↓
等待 800ms: 获取用户信息
    ↓
等待 600ms: 获取轮播图
    ↓
等待 900ms: 获取分类列表
    ↓
等待 1200ms: 获取推荐商品
    ↓
总耗时: 3500ms ❌
```

### 问题 2: 缺少统一的加载状态管理

**现状**:
- 各页面独立实现加载状态
- 加载提示不统一
- 缺少全局骨架屏
- 无统一错误处理

---

## 🏗️ Chunk 3: API 并行请求优化

### 技术方案

#### 方案 1: Promise.all 并行请求（推荐）

**优点**:
- 实现简单，代码清晰
- 任意失败即停止
- 适合关联性强的请求

**示例**:
```typescript
const [user, banners, categories, products] = await Promise.all([
  getUserInfo(),
  getBanners(),
  getCategories(),
  getRecommendProducts()
]);
// 总耗时 = max(800ms, 600ms, 900ms, 1200ms) = 1200ms ✅
```

#### 方案 2: Promise.allSettled 容错并行

**优点**:
- 部分失败不影响其他请求
- 可获取每个请求的成功/失败状态
- 适合独立性强的请求

**示例**:
```typescript
const results = await Promise.allSettled([
  getBanners().catch(() => ({ data: [] })),
  getCategories().catch(() => ({ data: [] })),
  getRecommendProducts().catch(() => ({ data: [] }))
]);

const banners = results[0].status === 'fulfilled' ? results[0].value.data : [];
const categories = results[1].status === 'fulfilled' ? results[1].value.data : [];
const products = results[2].status === 'fulfilled' ? results[2].value.data : [];
```

### 实施任务

#### Task 3.1: 创建并行请求工具函数

**文件**: `src/utils/parallel-request.ts`

**功能**:
- 封装 Promise.all 和 Promise.allSettled
- 统一错误处理
- 请求超时控制
- 性能日志记录

**接口**:
```typescript
interface ParallelRequestOptions {
  timeout?: number;           // 超时时间（ms）
  fallback?: any;             // 降级数据
  logPerformance?: boolean;    // 是否记录性能日志
}

// 并行请求（全部成功）
export function parallelRequest<T extends any[]>(
  requests: T,
  options?: ParallelRequestOptions
): Promise<{ [K in keyof T]: Awaited<T[K]> }>;

// 容错并行请求（部分成功）
export function parallelRequestSettled<T extends any[]>(
  requests: T,
  options?: ParallelRequestOptions
): Promise<Array<{ status: 'fulfilled' | 'rejected'; value?: any; reason?: any }>>;
```

---

#### Task 3.2: 修改首页 API 调用

**文件**: `src/pages/index/index.vue`

**修改前（串行）**:
```typescript
const loadUser = async () => {
  const user = await getUserInfo();  // 800ms
  userInfo.value = user;
};

const loadBanners = async () => {
  const banners = await getBanners();  // 600ms
  bannerList.value = banners;
};

const loadCategories = async () => {
  const categories = await getCategories();  // 900ms
  categoryList.value = categories;
};

const loadProducts = async () => {
  const products = await getRecommendProducts();  // 1200ms
  recommendProducts.value = products;
};

// onMounted 中依次调用，总耗时 3500ms
```

**修改后（并行）**:
```typescript
import { parallelRequest } from '@/utils/parallel-request';

const loadHomePageData = async () => {
  loading.value = true;
  const startTime = Date.now();

  try {
    const [banners, categories, products] = await parallelRequest([
      getBanners(),        // 600ms
      getCategories(),     // 900ms
      getRecommendProducts()  // 1200ms
    ], {
      timeout: 5000,
      logPerformance: true
    });

    bannerList.value = banners;
    categoryList.value = categories;
    recommendProducts.value = products;

    console.log(`首页加载完成，耗时: ${Date.now() - startTime}ms`);
  } catch (error) {
    console.error('首页加载失败:', error);
    // 错误处理
  } finally {
    loading.value = false;
  }
};

// 总耗时 = max(600ms, 900ms, 1200ms) = 1200ms ✅
// 性能提升: 65% (从 3500ms → 1200ms)
```

---

#### Task 3.3: 优化商品详情页 API 调用

**文件**: `src/pages/product/detail.vue`

**场景**: 商品详情需要同时获取：
- 商品信息
- 商品评价统计
- 推荐商品列表

**优化前**: 串行加载，总耗时 2000ms
**优化后**: 并行加载，总耗时 800ms

---

## 🎨 Chunk 4: 骨架屏和加载优化

### 技术方案

#### 全局加载状态管理

**文件**: `src/composables/useLoading.ts`

**功能**:
- 统一管理全局加载状态
- 支持多个独立加载场景
- 提供加载超时自动关闭

**接口**:
```typescript
export function useLoading() {
  const loading = ref(false);
  const timeout = ref<NodeJS.Timeout>();

  const startLoading = (autoClose = 10000) => {
    loading.value = true;
    timeout.value = setTimeout(() => {
      loading.value = false;
    }, autoClose);
  };

  const stopLoading = () => {
    loading.value = false;
    if (timeout.value) clearTimeout(timeout.value);
  };

  return { loading, startLoading, stopLoading };
}
```

---

#### 骨架屏组件库

##### 1. 全局页面骨架屏

**文件**: `src/components/PageSkeleton.vue`

**用途**: 首页、分类页等页面级骨架屏

**布局**:
```
┌─────────────────────┐
│  ▱▱▱ 骨架屏导航      │
├─────────────────────┤
│  ▱▱▱ 轮播图骨架      │
├─────────────────────┤
│  ▱▱▱ ▱▱▱ 分类骨架    │
│  ▱▱▱ ▱▱▱ 分类骨架    │
├─────────────────────┤
│  ▱▱▱ ▱▱▱ 商品骨架    │
│  ▱▱▱ ▱▱▱ 商品骨架    │
└─────────────────────┘
```

##### 2. 商品卡片骨架屏

**文件**: `src/components/ProductCardSkeleton.vue`

**用途**: 列表中的单个商品骨架

##### 3. 订单卡片骨架屏

**文件**: `src/components/OrderCardSkeleton.vue`

**用途**: 订单列表中的单个订单骨架

---

#### 全局加载指示器

**文件**: `src/components/GlobalLoading.vue`

**功能**:
- 居中显示加载动画
- 支持自定义加载文案
- 全局遮罩层

**使用**:
```vue
<GlobalLoading v-if="globalLoading" text="加载中..." />
```

---

### 实施任务

#### Task 4.1: 创建全局加载管理

**文件**: `src/composables/useLoading.ts`

**功能**:
- 统一加载状态
- 自动超时关闭
- 多场景支持

---

#### Task 4.2: 创建骨架屏组件

**文件**:
- `src/components/PageSkeleton.vue` - 页面骨架屏
- `src/components/ProductCardSkeleton.vue` - 商品卡片骨架屏
- `src/components/OrderCardSkeleton.vue` - 订单卡片骨架屏

---

#### Task 4.3: 集成到关键页面

**页面**:
1. 首页（`index.vue`）
2. 分类页（`category.vue`）
3. 商品详情页（`product/detail.vue`）
4. 订单列表页（`order/list.vue`）

**集成方案**:
```vue
<template>
  <view class="page">
    <!-- 首次加载显示骨架屏 -->
    <PageSkeleton v-if="isFirstLoading" />

    <!-- 数据加载完成显示内容 -->
    <view v-else class="content">
      <!-- 页面内容 -->
    </view>

    <!-- 全局加载指示器 -->
    <GlobalLoading v-if="loading" />
  </view>
</template>
```

---

#### Task 4.4: 优化加载动画

**文件**: `src/styles/loading.scss`

**内容**:
- 统一加载动画样式
- shimmer 动画定义
- 旋转动画定义
- 弹跳动画定义

---

## 📊 性能提升预期

### Chunk 3: API 并行请求

| 场景 | 优化前 | 优化后 | 提升 |
|------|--------|--------|------|
| 首页加载 | 3500ms | 1200ms | **66%↑** |
| 商品详情 | 2000ms | 800ms | **60%↑** |
| 分类页面 | 1800ms | 900ms | **50%↑** |

### Chunk 4: 加载体验优化

| 指标 | 优化前 | 优化后 |
|------|--------|--------|
| 加载提示 | 无统一标准 | 全局统一 |
| 首次体验 | 白屏等待 | 骨架屏动画 |
| 错误处理 | 分散处理 | 统一处理 |
| 超时保护 | 无 | 10秒自动关闭 |

---

## 🔧 实施步骤

### Chunk 3 实施顺序

1. ✅ 创建并行请求工具（`parallel-request.ts`）
2. ✅ 修改首页 API 调用
3. ✅ 修改商品详情页 API 调用
4. ✅ 修改分类页 API 调用
5. ✅ 测试并行请求性能

### Chunk 4 实施顺序

1. ✅ 创建全局加载管理（`useLoading.ts`）
2. ✅ 创建骨架屏组件库
3. ✅ 创建全局加载指示器
4. ✅ 集成到关键页面
5. ✅ 测试加载体验

---

## ⚠️ 技术风险与应对

### 风险1: 并行请求依赖关系

**问题**: 某些请求依赖其他请求的结果

**应对**:
- 识别依赖关系，分批次并行
- 第一批并行 → 等待 → 第二批并行
- 使用 async/await 控制执行顺序

### 风险2: 并行请求失败处理

**问题**: 某个请求失败影响整体

**应对**:
- 使用 `Promise.allSettled` 容错
- 提供降级数据（空数组、默认值）
- 记录失败请求，后续重试

### 风险3: 骨架屏与真实内容布局差异

**问题**: 骨架屏与真实内容布局不一致，导致闪烁

**应对**:
- 骨架屏严格按照真实内容布局
- 使用相同的高度、间距、圆角
- 统一 CSS 变量控制

---

## 📝 验收标准

### Chunk 3 验收标准

- [ ] 并行请求工具功能完整
- [ ] 首页加载时间 < 1500ms
- [ ] 商品详情加载时间 < 1000ms
- [ ] 错误处理正常工作
- [ ] 性能日志记录正常

### Chunk 4 验收标准

- [ ] 全局加载状态管理正常
- [ ] 骨架屏组件库完整
- [ ] 关键页面集成骨架屏
- [ ] 全局加载指示器正常
- [ ] 加载体验流畅自然

---

## 📅 工作量估算

- Chunk 3: API 并行请求优化 - 2-3 小时
- Chunk 4: 骨架屏和加载优化 - 2-3 小时

**总计**: 4-6 小时

---

## 🚀 立即开始

1. ✅ 创建并行请求工具
2. ✅ 创建全局加载管理
3. ✅ 创建骨架屏组件库
4. ✅ 修改关键页面集成
5. ✅ 测试和验证

---

## 📚 相关文档

- [Chunk 1 进度](./CHUNK1_PROGRESS.md)
- [Chunk 2 进度](./CHUNK2_PROGRESS.md)
- [性能配置](../../src/config/performance.ts)
- [功能开关](../../src/config/featureFlags.ts)
