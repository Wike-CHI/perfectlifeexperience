# 搜索系统性能优化设计文档

**日期**: 2026-03-12
**版本**: 1.0
**状态**: 已批准

---

## 1. 概述

### 1.1 优化目标

对大友元气精酿啤酒小程序的搜索系统进行全方位性能优化，提升用户体验。

**性能指标：**
- 搜索响应时间：从 2-3 秒降低到 1 秒以内
- 首批渲染时间：< 300ms
- 数据库查询减少：50%
- 用户体验：感知速度提升 30-50%

### 1.2 优化策略

采用**渐进优化**策略，在现有架构基础上进行增量改进：
- 保持向后兼容
- 每个优化点独立，可单独回滚
- 不改变业务逻辑，只优化执行路径

---

## 2. 架构设计

### 2.1 多层优化架构

```
┌─────────────────────────────────────┐
│         前端层优化                    │
│  - 防抖 500ms                       │
│  - 图片懒加载                        │
│  - 分批渲染 (每批5个)                │
└─────────────────────────────────────┘
           ↓
┌─────────────────────────────────────┐
│         API层优化                     │
│  - 减少数据传输                      │
│  - 只返回必要字段                    │
└─────────────────────────────────────┘
           ↓
┌─────────────────────────────────────┐
│         云函数层优化                  │
│  - 智能count (精确 vs 近似)          │
│  - 查询结果缓存 (1分钟)              │
└─────────────────────────────────────┘
           ↓
┌─────────────────────────────────────┐
│         数据层优化                    │
│  - 已创建索引                        │
│  - 预热常用搜索词缓存                │
└─────────────────────────────────────┘
```

### 2.2 核心原则

1. **降级优先**: 优化失败时自动降级到原始逻辑
2. **用户体验优先**: 感知速度优于技术指标
3. **渐进增强**: 每个优化都是增量，不破坏现有功能

---

## 3. 组件设计

### 3.1 搜索页面优化 (`src/pages/search/index.vue`)

#### 3.1.1 防抖搜索

**实现方式**: 自定义防抖函数，避免引入新依赖

```typescript
/**
 * 防抖函数
 */
function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timer: number | null = null;
  return function(this: any, ...args: Parameters<T>) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      fn.apply(this, args);
    }, delay);
  };
}

// 使用
const debouncedHandleSearch = debounce(handleSearch, 500);

// 输入事件
function onInputChange(e: any) {
  keyword.value = e.detail.value;
  debouncedHandleSearch();
}
```

#### 3.1.2 图片懒加载

**实现方式**: 使用微信小程序原生 `lazy-load` 属性

```vue
<image
  class="product-image"
  :src="product.images[0]"
  lazy-load
  mode="aspectFill"
  @error="handleImageError"
/>
```

**错误处理**:
```typescript
function handleImageError(e: any) {
  console.error('[图片加载失败]', e);
  // 可以设置占位图
  e.target.src = '/static/placeholder.png';
}
```

#### 3.1.3 分批渲染

**实现方式**: 使用 `setTimeout` 分批渲染商品

```typescript
const batchSize = 5;
const renderBatchDelay = 100;

async function renderProductsInBatches(products: Product[]) {
  products.value = []; // 先清空

  for (let i = 0; i < products.length; i += batchSize) {
    const batch = products.slice(i, i + batchSize);

    // 使用 setTimeout 异步渲染
    await new Promise<void>((resolve) => {
      setTimeout(() => {
        products.value.push(...batch);
        resolve();
      }, (i / batchSize) * renderBatchDelay);
    });
  }
}

// 在 doSearch 中使用
async function doSearch() {
  if (loading.value) return;

  loading.value = true;

  try {
    const result = await searchProducts({
      keyword: keyword.value.trim(),
      sortBy: sortBy.value,
      page: page.value,
      pageSize: pageSize.value
    });

    // 分批渲染
    await renderProductsInBatches(result.products);

    total.value = result.total;
    totalPages.value = result.totalPages;
    hasMore.value = page.value < result.totalPages;
  } catch (error: any) {
    console.error('搜索失败:', error);
    // 降级：直接渲染
    products.value = result.products;
  } finally {
    loading.value = false;
  }
}
```

### 3.2 云函数优化 (`cloudfunctions/search/index.js`)

#### 3.2.1 智能Count查询

**优化逻辑**:

```javascript
async function handleSearch(params, openid) {
  const { keyword, category, sortBy = 'default', page = 1, pageSize = 20 } = params;

  // 构建查询条件
  let whereCondition = {
    status: _.neq('deleted')
  };

  if (keyword && keyword.trim()) {
    const trimmedKeyword = keyword.trim();
    whereCondition.name = db.RegExp({
      regexp: trimmedKeyword,
      options: 'i'
    });
  }

  if (category && category !== 'all') {
    whereCondition.category = category;
  }

  // 排序逻辑
  let orderBy = 'createTime';
  let orderType = 'desc';

  switch (sortBy) {
    case 'price_asc':
      orderBy = 'price';
      orderType = 'asc';
      break;
    case 'price_desc':
      orderBy = 'price';
      orderType = 'desc';
      break;
    case 'sales_desc':
      orderBy = 'sales';
      orderType = 'desc';
      break;
  }

  try {
    // 智能count：只在前3页或估计总数<100时才精确count
    let total = 0;
    let totalApproximate = false;

    if (page <= 3) {
      // 前几页：精确count
      const countResult = await db.collection('products')
        .where(whereCondition)
        .count();
      total = countResult.total;
    } else {
      // 后续页面：使用近似总数
      // 假设至少有 (page-1)*pageSize 条数据
      total = (page - 1) * pageSize + 1;
      totalApproximate = true;
    }

    // 查询商品列表（多查1条用于判断是否有更多）
    const result = await db.collection('products')
      .where(whereCondition)
      .orderBy(orderBy, orderType)
      .skip((page - 1) * pageSize)
      .limit(pageSize + 1)
      .get();

    // 判断是否有更多
    const hasMore = result.data.length > pageSize;
    const products = hasMore ? result.data.slice(0, pageSize) : result.data;

    // 如果使用近似总数且有更多数据，更新总数
    if (totalApproximate && hasMore) {
      total = Math.min(total + pageSize, 1000); // 设置上限
    } else if (!totalApproximate && result.data.length <= pageSize) {
      // 精确查询且没有更多数据，使用准确总数
      total = (page - 1) * pageSize + result.data.length;
    }

    return success({
      products,
      total,
      totalApproximate,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    }, '搜索成功');
  } catch (err) {
    console.error('[Search] Query error:', err);
    throw err;
  }
}
```

### 3.3 新增性能配置文件

**文件**: `src/config/performance.ts`

```typescript
/**
 * 搜索性能配置
 */
export const SEARCH_PERFORMANCE_CONFIG = {
  // 防抖延迟（毫秒）
  debounceDelay: 500,

  // 初始每页大小（从20降到12）
  initialPageSize: 12,

  // 分批渲染配置
  renderBatchSize: 5,
  renderBatchDelay: 100,

  // 近似总数阈值
  approximateTotalThreshold: 100,

  // 缓存配置
  cache: {
    hotKeywordsTTL: 300000,      // 5分钟
    searchResultTTL: 60000,       // 1分钟
  },

  // 图片加载配置
  image: {
    lazy: true,
    errorPlaceholder: '/static/placeholder.png'
  }
};
```

---

## 4. 数据流设计

### 4.1 优化后的搜索流程

```
用户输入关键词
     ↓
防抖 500ms
     ↓
调用 searchProducts API
     ↓
云函数智能判断
     ↓
┌──────────────┬──────────────┐
│ page <= 3    │ page > 3     │
│ 精确count    │ 近似总数     │
└──────────────┴──────────────┘
     ↓
查询商品数据 (多查1条)
     ↓
返回结果 + totalApproximate标识
     ↓
前端分批渲染 (每批5个)
     ↓
图片懒加载
```

### 4.2 响应数据结构

```typescript
interface SearchResult {
  products: Product[];
  total: number;
  totalApproximate: boolean;  // 新增字段
  page: number;
  pageSize: number;
  totalPages: number;
}
```

### 4.3 缓存策略

**热门搜索缓存**:
- 缓存时间: 5分钟
- 页面加载时预取
- 后台刷新

**搜索历史**:
- 本地存储 (localStorage)
- 页面加载时立即显示
- 无需缓存过期时间

**搜索结果**:
- 不缓存（确保实时性）
- 使用分批加载代替

---

## 5. 错误处理

### 5.1 降级策略

**防抖失败**:
```typescript
try {
  debouncedHandleSearch();
} catch {
  // 降级：直接执行搜索
  handleSearch();
}
```

**分批渲染失败**:
```typescript
try {
  await renderProductsInBatches(products);
} catch {
  // 降级：一次性渲染所有商品
  products.value = products;
}
```

**近似总数失败**:
```typescript
try {
  // 尝试近似总数逻辑
} catch {
  // 降级：使用精确count
  const countResult = await db.collection('products').count();
  total = countResult.total;
  totalApproximate = false;
}
```

### 5.2 错误边界

所有优化逻辑都包裹在 try-catch 中：
- 记录错误但不阻塞用户操作
- 自动降级到原始实现
- 在控制台记录性能警告

### 5.3 日志监控

```javascript
// 云函数日志
console.log('[Performance]', {
  action: 'search',
  totalCountUsed: page <= 3,  // true/false
  queryTime: Date.now() - startTime,
  resultCount: products.length
});

// 前端日志
console.log('[Performance]', {
  debounced: true,
  renderBatch: 3,
  imagesLazy: true
});
```

---

## 6. 测试策略

### 6.1 性能基准测试

**优化前指标（基准）**:
- 搜索响应时间: 2-3秒
- 首屏渲染: 800ms
- 数据库查询: 2次（count + data）
- 图片加载: 全量加载

**优化后目标**:
- 搜索响应时间: < 1秒
- 首屏渲染: < 300ms
- 数据库查询: 1次（大部分情况）
- 图片加载: 懒加载

### 6.2 功能测试用例

```typescript
describe('搜索性能优化', () => {
  test('防抖应减少重复请求', async () => {
    const mockFn = jest.fn();
    const debouncedFn = debounce(mockFn, 500);

    // 快速调用3次
    debouncedFn();
    debouncedFn();
    debouncedFn();

    // 等待防抖完成
    await new Promise(resolve => setTimeout(resolve, 600));

    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  test('分批渲染应改善首屏时间', async () => {
    const startTime = Date.now();
    await renderProductsInBatches(mockProducts);
    const endTime = Date.now();

    // 首批5个应该在300ms内渲染
    expect(endTime - startTime).toBeLessThan(300);
  });

  test('近似总数应减少查询时间', async () => {
    const result = await searchProducts({
      keyword: '啤酒',
      page: 5  // 第5页，使用近似总数
    });

    expect(result.totalApproximate).toBe(true);
  });
});
```

### 6.3 兼容性测试

- 微信小程序基础库版本 >= 2.10.0
- iOS 12+, Android 8+
- 不同网络环境（WiFi/4G/弱网）

### 6.4 监控指标

- 云函数执行时间
- 数据库查询耗时
- 前端渲染帧率
- 防抖拦截率

---

## 7. 实施计划

### 7.1 实施顺序

**阶段1: 前端优化（优先级高）**
1. 添加防抖搜索
2. 实现图片懒加载
3. 调整初始pageSize为12

**阶段2: 云函数优化**
1. 实现智能count逻辑
2. 添加性能日志

**阶段3: 渲染优化**
1. 实现分批渲染
2. 添加性能配置文件

**阶段4: 测试验证**
1. 性能测试
2. 兼容性测试
3. 降级测试

### 7.2 风险评估

**风险**: 分批渲染可能导致页面闪烁
**缓解**: 使用骨架屏或加载占位符

**风险**: 近似总数可能不准确
**缓解**: 只在第4页以后使用，并标记为近似值

**风险**: 防抖可能影响用户体验
**缓解**: 添加加载状态提示

---

## 8. 成功标准

### 8.1 性能指标

- ✅ 搜索响应时间 < 1秒
- ✅ 首批商品渲染 < 300ms
- ✅ 数据库查询减少 ≥ 40%
- ✅ 快速输入时请求减少 ≥ 60%

### 8.2 用户体验

- ✅ 搜索输入流畅，无卡顿
- ✅ 商品列表滚动流畅
- ✅ 图片逐步加载，无白屏
- ✅ 降级时用户无感知

### 8.3 代码质量

- ✅ TypeScript类型完整
- ✅ 错误处理完善
- ✅ 代码注释清晰
- ✅ 性能日志记录

---

## 9. 后续优化方向

完成本次优化后，可考虑的进一步优化：

1. **虚拟列表**: 对于超长列表（100+商品）
2. **搜索建议**: 基于输入的实时建议
3. **本地索引**: 使用 IndexedDB 缓存商品数据
4. **CDN优化**: 图片CDN加速
5. **Service Worker**: 离线搜索支持

---

**文档版本**: 1.0
**最后更新**: 2026-03-12
**状态**: 已批准，等待实施
