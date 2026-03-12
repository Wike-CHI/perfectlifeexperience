# 搜索系统性能优化实施计划

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 优化大友元气精酿啤酒小程序的搜索系统加载速度，将搜索响应时间从2-3秒降低到1秒以内，提升用户体验。

**Architecture:** 基于现有搜索架构进行渐进式优化，采用多层优化策略（前端防抖+懒加载、云函数智能count、分批渲染），保持向后兼容，每个优化点独立可降级。

**Tech Stack:**
- **前端**: UniApp (Vue 3 + TypeScript)
- **后端**: CloudBase 云函数 (Node.js 16.13)
- **数据库**: CloudBase NoSQL (已有索引)

---

## 文件结构

### 新建文件
- `src/config/performance.ts` - 性能配置常量
- `src/utils/debounce.ts` - 防抖工具函数

### 修改文件
- `src/pages/search/index.vue` - 搜索页面（添加防抖、懒加载、分批渲染）
- `cloudfunctions/search/index.js` - 搜索云函数（智能count逻辑）

---

## Chunk 1: 前端基础优化

### Task 1: 创建性能配置文件

**Files:**
- Create: `src/config/performance.ts`

- [ ] **Step 1: 创建性能配置文件**

```typescript
/**
 * 搜索性能配置
 *
 * 集中管理搜索系统相关的性能优化参数
 */

/**
 * 搜索性能配置
 */
export const SEARCH_PERFORMANCE_CONFIG = {
  // 防抖延迟（毫秒）
  debounceDelay: 500,

  // 初始每页大小（从20降到12，减少初始加载量）
  initialPageSize: 12,

  // 分批渲染配置
  renderBatchSize: 5,
  renderBatchDelay: 100,

  // 近似总数阈值（超过此值使用近似总数）
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

- [ ] **Step 2: 验证 TypeScript 类型正确性**

```bash
npm run type-check
```

预期输出: TypeScript 编译无错误（可能存在其他文件的已有错误，但新文件无错误）

- [ ] **Step 3: 提交配置文件**

```bash
git add src/config/performance.ts
git commit -m "feat: 添加搜索性能配置文件

- 防抖延迟: 500ms
- 初始pageSize: 12（从20降低）
- 分批渲染: 每批5个，延迟100ms
- 近似总数阈值: 100
- 缓存和图片加载配置"
```

---

### Task 2: 创建防抖工具函数

**Files:**
- Create: `src/utils/debounce.ts`

- [ ] **Step 1: 编写防抖函数**

```typescript
/**
 * 防抖函数
 *
 * 在指定延迟时间内只执行最后一次调用
 * 用于优化搜索输入，减少不必要的请求
 *
 * @param fn 要防抖的函数
 * @param delay 延迟时间（毫秒）
 * @returns 防抖后的函数
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timer: number | null = null;

  return function(this: any, ...args: Parameters<T>) {
    // 清除之前的定时器
    if (timer !== null) {
      clearTimeout(timer);
    }

    // 设置新的定时器
    timer = setTimeout(() => {
      fn.apply(this, args);
      timer = null;
    }, delay);
  };
}
```

- [ ] **Step 2: 验证 TypeScript 类型正确性**

```bash
npm run type-check
```

预期输出: TypeScript 编译无错误

- [ ] **Step 3: 提交防抖工具**

```bash
git add src/utils/debounce.ts
git commit -m "feat: 添加防抖工具函数

- 通用防抖实现，支持TypeScript类型推断
- 用于搜索输入优化，减少不必要的API请求
- 可复用于其他需要防抖的场景"
```

---

### Task 3: 添加防抖搜索

**Files:**
- Modify: `src/pages/search/index.vue:300-310`

- [ ] **Step 1: 在 script setup 中导入防抖函数和配置**

在文件开头的 import 区域添加：

```typescript
import { debounce } from '@/utils/debounce';
import { SEARCH_PERFORMANCE_CONFIG } from '@/config/performance';
```

- [ ] **Step 2: 修改 onInputChange 函数使用防抖**

找到 `onInputChange` 函数（约第300-310行），将其修改为：

```typescript
/**
 * 输入变化（带防抖）
 */
function onInputChange(e: any) {
  keyword.value = e.detail.value;

  // 使用防抖延迟搜索
  if (keyword.value.trim()) {
    debouncedHandleSearch();
  }
}

// 创建防抖版本的搜索函数
const debouncedHandleSearch = debounce(handleSearch, SEARCH_PERFORMANCE_CONFIG.debounceDelay);
```

- [ ] **Step 3: 同时修改 @confirm 事件直接调用搜索**

在 input 组件的 @confirm 事件中，确保直接调用 handleSearch（不使用防抖）：

```vue
<input
  v-model="keyword"
  class="search-input"
  placeholder="搜索精酿啤酒"
  :focus="isFocused"
  @confirm="handleSearch"
  @input="onInputChange"
  @focus="isFocused = true"
  @blur="isFocused = false"
/>
```

- [ ] **Step 4: 验证 TypeScript 类型正确性**

```bash
npm run type-check
```

预期输出: TypeScript 编译无错误

- [ ] **Step 5: 提交防抖搜索**

```bash
git add src/pages/search/index.vue
git commit -m "feat: 添加搜索输入防抖优化

- 使用500ms防抖延迟
- 用户输入时延迟执行搜索
- 减少不必要的API请求
- @confirm 事件直接触发（不防抖）
- 导入 debounce 工具和性能配置"
```

---

### Task 4: 实现图片懒加载

**Files:**
- Modify: `src/pages/search/index.vue:680-690`

- [ ] **Step 1: 修改商品图片组件添加懒加载**

找到 product-image 的 image 组件（约第680行），添加 lazy-load 属性：

```vue
<image
  class="product-image"
  :src="product.images[0]"
  lazy-load
  mode="aspectFill"
  @error="handleImageError"
/>
```

- [ ] **Step 2: 添加图片加载错误处理**

在 script setup 部分添加错误处理函数：

```typescript
/**
 * 图片加载错误处理
 */
function handleImageError(e: any) {
  console.error('[图片加载失败]', e);
  // 可以设置占位图（如果有的话）
  // e.target.src = SEARCH_PERFORMANCE_CONFIG.image.errorPlaceholder;
}
```

- [ ] **Step 3: 验证 TypeScript 类型正确性**

```bash
npm run type-check
```

预期输出: TypeScript 编译无错误

- [ ] **Step 4: 提交图片懒加载**

```bash
git add src/pages/search/index.vue
git commit -m "feat: 添加商品图片懒加载

- 使用微信小程序原生 lazy-load 属性
- 图片进入视口时才加载
- 添加图片加载错误处理
- 减少初始加载时间，提升感知速度"
```

---

### Task 5: 调整初始页面大小

**Files:**
- Modify: `src/pages/search/index.vue:100-110`

- [ ] **Step 1: 修改 pageSize 初始值**

找到 `pageSize` 的 ref 定义（约第100-110行），将初始值改为12：

```typescript
// 搜索结果
const products = ref<Product[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(SEARCH_PERFORMANCE_CONFIG.initialPageSize);  // 使用配置的12
const totalPages = ref(0);
```

- [ ] **Step 2: 确保导入了性能配置**

验证文件开头已导入：

```typescript
import { SEARCH_PERFORMANCE_CONFIG } from '@/config/performance';
```

- [ ] **Step 3: 验证 TypeScript 类型正确性**

```bash
npm run type-check
```

预期输出: TypeScript 编译无错误

- [ ] **Step 4: 提交页面大小调整**

```bash
git add src/pages/search/index.vue
git commit -m "feat: 调整搜索初始页面大小

- pageSize 从 20 降低到 12
- 减少初始数据加载量
- 使用性能配置常量管理
- 配合分批渲染优化首屏速度"
```

---

## Chunk 2: 云函数优化

### Task 6: 实现智能Count查询

**Files:**
- Modify: `cloudfunctions/search/index.js:100-130`

- [ ] **Step 1: 修改 handleSearch 函数的count逻辑**

找到 `handleSearch` 函数中的 count 查询部分（约第100-130行），替换为智能count逻辑：

```javascript
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

  console.log('[Search] Found products:', products.length, 'Total:', total, 'Approximate:', totalApproximate);

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
```

- [ ] **Step 2: 验证代码语法**

```bash
node -c cloudfunctions/search/index.js
```

预期输出: 无错误（无输出表示语法正确）

- [ ] **Step 3: 提交智能count优化**

```bash
git add cloudfunctions/search/index.js
git commit -m "feat: 实现智能count查询优化

- 前3页使用精确count
- 第4页起使用近似总数（减少查询）
- 多查1条用于判断hasMore
- 减少约50%的数据库查询次数
- 添加 totalApproximate 标识字段"
```

---

### Task 7: 添加性能日志

**Files:**
- Modify: `cloudfunctions/search/index.js:50-60`

- [ ] **Step 1: 在 handleSearch 开头添加性能计时**

在 `handleSearch` 函数开头添加：

```javascript
async function handleSearch(params, openid) {
  const startTime = Date.now();
  const { keyword, category, sortBy = 'default', page = 1, pageSize = 20 } = params;

  console.log('[Search] Search params:', { keyword, category, sortBy, page, pageSize });

  // ... 构建查询条件的代码保持不变
```

- [ ] **Step 2: 在返回结果前添加性能日志**

在 `return success` 之前添加：

```javascript
  const queryTime = Date.now() - startTime;
  console.log('[Performance]', {
    action: 'search',
    page,
    totalCountUsed: page <= 3,
    queryTime,
    resultCount: products.length,
    totalApproximate
  });

  return success({
    // ... 返回数据
  }, '搜索成功');
```

- [ ] **Step 3: 验证代码语法**

```bash
node -c cloudfunctions/search/index.js
```

预期输出: 无错误

- [ ] **Step 4: 提交性能日志**

```bash
git add cloudfunctions/search/index.js
git commit -m "feat: 添加搜索性能日志

- 记录查询耗时
- 记录是否使用精确count
- 记录返回结果数量
- 用于监控和诊断性能问题"
```

---

## Chunk 3: 分批渲染优化

### Task 8: 实现分批渲染

**Files:**
- Modify: `src/pages/search/index.vue:280-310`

- [ ] **Step 1: 添加分批渲染函数**

在 script setup 部分添加分批渲染函数（在 `doSearch` 函数之前）：

```typescript
/**
 * 分批渲染商品列表
 * @param products 要渲染的商品列表
 */
async function renderProductsInBatches(products: Product[]) {
  const batchSize = SEARCH_PERFORMANCE_CONFIG.renderBatchSize;
  const delay = SEARCH_PERFORMANCE_CONFIG.renderBatchDelay;

  // 清空现有列表
  products.value = [];

  // 分批渲染
  for (let i = 0; i < products.length; i += batchSize) {
    const batch = products.slice(i, i + batchSize);

    // 使用 setTimeout 异步添加每一批
    await new Promise<void>((resolve) => {
      setTimeout(() => {
        products.value.push(...batch);
        resolve();
      }, (i / batchSize) * delay);
    });
  }
}
```

- [ ] **Step 2: 修改 doSearch 函数使用分批渲染**

找到 `doSearch` 函数（约第280-310行），修改结果处理部分：

```typescript
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

    // 使用分批渲染
    try {
      await renderProductsInBatches(result.products);
    } catch (renderError) {
      console.error('[分批渲染失败，降级到一次性渲染]', renderError);
      // 降级：一次性渲染所有商品
      products.value = result.products;
    }

    total.value = result.total;
    totalPages.value = result.totalPages;
    hasMore.value = page.value < result.totalPages;
  } catch (error: any) {
    console.error('搜索失败:', error);
    uni.showToast({
      title: error.message || '搜索失败',
      icon: 'none'
    });
  } finally {
    loading.value = false;
  }
}
```

- [ ] **Step 3: 验证 TypeScript 类型正确性**

```bash
npm run type-check
```

预期输出: TypeScript 编译无错误

- [ ] **Step 4: 提交分批渲染**

```bash
git add src/pages/search/index.vue
git commit -m "feat: 实现商品列表分批渲染

- 每批渲染5个商品，间隔100ms
- 减少首屏渲染时间
- 降级策略：分批失败时一次性渲染
- 改善用户感知的加载速度"
```

---

## Chunk 4: 类型定义更新

### Task 9: 扩展搜索结果类型

**Files:**
- Modify: `src/types/index.ts:575-580`

- [ ] **Step 1: 修改 SearchResult 接口**

找到 `SearchResult` 接口定义（约第575-580行），添加 `totalApproximate` 字段：

```typescript
/**
 * 搜索结果
 */
export interface SearchResult {
  products: Product[];
  total: number;
  totalApproximate?: boolean;  // 新增：标识是否为近似总数
  page: number;
  pageSize: number;
  totalPages: number;
}
```

- [ ] **Step 2: 验证 TypeScript 类型正确性**

```bash
npm run type-check
```

预期输出: TypeScript 编译无错误

- [ ] **Step 3: 提交类型定义更新**

```bash
git add src/types/index.ts
git commit -m "feat: 扩展 SearchResult 类型

- 添加 totalApproximate 字段
- 标识总数是否为近似值
- 配合云函数智能count优化"
```

---

## Chunk 5: 部署和测试

### Task 10: 重新部署云函数

- [ ] **Step 1: 更新 search 云函数**

使用 CloudBase MCP 工具重新部署 search 云函数：

```bash
# 使用 MCP 工具部署
# 确保已登录并绑定环境
```

或者使用 CloudBase 控制台：
1. 登录腾讯云 CloudBase 控制台
2. 选择环境: `cloud1-6gmp2q0y3171c353`
3. 进入云函数管理
4. 选择 `search` 云函数
5. 点击"保存并安装"
6. 等待部署完成

- [ ] **Step 2: 验证云函数部署**

在 CloudBase 控制台查看云函数列表，确认 `search` 云函数状态为"正常"

- [ ] **Step 3: 提交部署记录**

```bash
git add .
git commit -m "chore: 部署搜索性能优化后的云函数

- 重新部署 search 云函数
- 包含智能count和性能日志"
```

---

### Task 11: 编译和测试

- [ ] **Step 1: 编译前端代码**

```bash
npm run build:mp-weixin
```

预期输出: 编译成功，无错误

- [ ] **Step 2: 在微信开发者工具中测试**

1. 打开微信开发者工具
2. 导入项目: `dist/build/mp-weixin/`
3. 测试防抖功能：
   - 快速输入搜索关键词
   - 观察是否延迟500ms后才搜索
   - 确认不会产生多次请求

4. 测试图片懒加载：
   - 执行搜索
   - 观察商品图片是否逐步加载
   - 滚动页面确认图片懒加载生效

5. 测试分批渲染：
   - 执行搜索
   - 观察商品是否分批显示（每批5个）
   - 确认首批商品快速显示

6. 测试智能count：
   - 搜索关键词（如"小麦"）
   - 查看云函数日志
   - 确认前3页使用精确count，后续页使用近似总数

- [ ] **Step 3: 性能验证**

使用微信开发者工具的性能监控：
- 搜索响应时间应 < 1秒
- 首批商品渲染时间应 < 300ms
- 快速输入时API请求减少 ≥ 60%

- [ ] **Step 4: 降级测试**

测试优化失败时的降级策略：
1. 关闭图片懒加载支持（如果可能）
2. 模拟分批渲染失败
3. 确认系统能正常降级到原始行为

- [ ] **Step 5: 提交最终代码**

```bash
git add .
git commit -m "test: 完成搜索性能优化测试

- 防抖搜索正常工作
- 图片懒加载正常工作
- 分批渲染正常工作
- 智能count正常工作
- 降级策略正常工作
- 性能指标达标
- 用户感知速度显著提升"
```

---

## 验收标准

### 性能指标
- ✅ 搜索响应时间 < 1秒
- ✅ 首批商品渲染 < 300ms
- ✅ 数据库查询减少 ≥ 40%
- ✅ 快速输入时请求减少 ≥ 60%

### 功能完整性
- ✅ 防抖不影响正常搜索
- ✅ 图片懒加载不影响显示
- ✅ 分批渲染保持数据完整性
- ✅ 近似总数不影响分页逻辑

### 用户体验
- ✅ 搜索输入流畅，无卡顿
- ✅ 商品列表平滑显示
- ✅ 图片逐步加载，无白屏
- ✅ 降级时用户无感知

### 代码质量
- ✅ TypeScript 类型完整
- ✅ 错误处理完善
- ✅ 性能日志记录
- ✅ 代码注释清晰

---

## 风险与注意事项

### 已知风险
1. **分批渲染可能导致页面闪烁**
   - **缓解**: 批次间延迟控制在100ms内
   - **降级**: 失败时一次性渲染

2. **近似总数可能不准确**
   - **缓解**: 只在第4页后使用
   - **标记**: totalApproximate 字段标识

3. **防抖可能影响用户体验**
   - **缓解**: 显示加载状态提示
   - **保留**: @confirm 直接触发

### 测试重点
- 测试快速连续输入
- 测试大量商品（100+）渲染
- 测试网络慢速环境
- 测试降级场景

---

## 下一步

完成性能优化后，可考虑：
1. 监控生产环境性能指标
2. 收集用户反馈
3. 根据实际情况调整参数
4. 规划下一轮优化（虚拟列表、本地缓存等）
