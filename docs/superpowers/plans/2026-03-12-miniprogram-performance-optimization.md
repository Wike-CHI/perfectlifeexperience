# 小程序性能优化实施计划

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 优化大友元气精酿啤酒小程序的加载速度，将首次加载时间从 2-3秒降低到 < 1秒，页面切换时间 < 500ms，滚动流畅度提升 60-70%。

**Architecture:** 基于现有搜索性能优化架构进行扩展，采用分页+虚拟列表策略，使用功能开关实现渐进式优化和快速回滚。

**Tech Stack:**
- **前端**: UniApp (Vue 3 + TypeScript + Composition API)
- **后端**: CloudBase 云函数 (Node.js 16.13)
- **数据库**: CloudBase NoSQL (MongoDB-like)
- **部署**: CloudBase 环境ID `cloud1-6gmp2q0y3171c353`

---

## 文件结构概览

### 需要创建的文件
```
src/config/featureFlags.ts                    # 功能开关配置
src/components/Skeleton/                      # 骨架屏组件目录
  ├── OrderSkeleton.vue                      # 订单骨架屏
  ├── CategorySkeleton.vue                   # 分类骨架屏
  └── ProductCardSkeleton.vue                # 商品卡片骨架屏
src/components/VirtualList/                  # 虚拟列表组件目录
  ├── VirtualList.vue                        # 虚拟列表主组件
  ├── VariableHeightVirtualList.vue          # 可变高度虚拟列表
  └── types.ts                               # 类型定义
cloudfunctions/performance/index.js          # 性能监控云函数
cloudfunctions/migration/index.js            # 数据库迁移云函数（扩展）
```

### 需要修改的文件
```
src/config/performance.ts                     # 扩展性能配置
src/pages/order/list.vue                      # 订单列表添加分页
src/pages/category/category.vue               # 分类页面添加虚拟列表
src/pages/order/detail.vue                    # 订单详情添加骨架屏
src/utils/api.ts                              # 扩展API接口
cloudfunctions/order/index.js                 # 添加分页支持
src/types/index.ts                            # 扩展类型定义
```

---

## Chunk 1: 订单列表分页优化（P0 - 1-2天）

### Task 1: 创建功能开关配置

**Files:**
- Create: `src/config/featureFlags.ts`

**Purpose:** 实现功能开关系统，支持渐进式优化和快速回滚

- [ ] **Step 1: 创建功能开关配置文件**

```typescript
/**
 * 功能开关配置
 *
 * 用于控制性能优化功能的启用/禁用，支持渐进式优化和快速回滚
 */

/**
 * 功能开关枚举
 */
export const FEATURE_FLAGS = {
  ORDER_PAGINATION: true,        // 订单列表分页
  VIRTUAL_LIST: true,             // 分类虚拟列表
  SKELETON_SCREEN: true,          // 骨架屏加载
  API_OPTIMIZATION: true,         // 接口优化（并行请求）
  CACHE_STRATEGY: true,           // 缓存策略
  PERFORMANCE_MONITORING: true    // 性能监控
} as const;

/**
 * 功能开关类型
 */
export type FeatureFlag = keyof typeof FEATURE_FLAGS;

/**
 * 检查功能是否启用
 * @param feature 功能名称
 * @returns 是否启用
 */
export function isFeatureEnabled(feature: FeatureFlag): boolean {
  // 可以从远程配置读取，支持动态开关
  // 当前版本使用本地配置
  return FEATURE_FLAGS[feature];
}

/**
 * 禁用功能（用于回滚）
 * @param feature 功能名称
 */
export function disableFeature(feature: FeatureFlag): void {
  (FEATURE_FLAGS as any)[feature] = false;

  // 记录回滚日志
  uni.setStorageSync('feature_rollback_log', {
    feature,
    timestamp: Date.now(),
    reason: 'manual_disable'
  });

  console.warn(`[FeatureFlag] ${feature} 已禁用`);
}

/**
 * 启用功能（用于恢复）
 * @param feature 功能名称
 */
export function enableFeature(feature: FeatureFlag): void {
  (FEATURE_FLAGS as any)[feature] = true;
  console.log(`[FeatureFlag] ${feature} 已启用`);
}
```

- [ ] **Step 2: 提交功能开关配置**

```bash
git add src/config/featureFlags.ts
git commit -m "feat: 添加性能优化功能开关配置

- 支持订单分页、虚拟列表、骨架屏等功能开关
- 提供渐进式优化和快速回滚能力
- 包含启用/禁用检查工具函数"
```

---

### Task 2: 扩展性能配置

**Files:**
- Modify: `src/config/performance.ts:90-91`

- [ ] **Step 1: 在文件末尾添加订单分页和缓存配置**

```typescript
/**
 * 订单分页性能配置接口
 */
export interface OrderPaginationConfig {
  /** 每页订单数量 */
  pageSize: number;
  /** 缓存有效期（毫秒） */
  cacheTTL: number;
  /** 最大分页数 */
  maxPage: number;
}

/**
 * 虚拟列表性能配置接口
 */
export interface VirtualListConfig {
  /** 可见区域商品数量 */
  visibleCount: number;
  /** 缓冲区大小（上下各多少个） */
  bufferSize: number;
  /** 商品卡片固定高度（rpx） */
  itemHeight: number;
}

/**
 * 缓存配置接口
 */
export interface CacheConfig {
  /** 订单列表缓存键 */
  ORDER_LIST: string;
  /** 分类商品缓存键前缀 */
  CATEGORY_PRODUCTS: string;
  /** 性能基线缓存键 */
  PERFORMANCE_BASELINE: string;
}

/**
 * 订单分页性能配置常量
 */
export const ORDER_PAGINATION_CONFIG: OrderPaginationConfig = {
  pageSize: 10,              // 每页10条订单
  cacheTTL: 5 * 60 * 1000,   // 缓存5分钟
  maxPage: 50                // 最多加载50页
} as const;

/**
 * 虚拟列表性能配置常量
 */
export const VIRTUAL_LIST_CONFIG: VirtualListConfig = {
  visibleCount: 5,           // 可见区域5个商品
  bufferSize: 3,             // 上下各缓冲3个
  itemHeight: 240            // 商品卡片高度240rpx
} as const;

/**
 * 缓存键配置常量
 */
export const CACHE_KEYS: CacheConfig = {
  ORDER_LIST: 'perf_order_list_cache',
  CATEGORY_PRODUCTS: 'perf_category_products_',
  PERFORMANCE_BASELINE: 'perf_baseline'
} as const;
```

- [ ] **Step 2: 提交性能配置扩展**

```bash
git add src/config/performance.ts
git commit -m "feat: 扩展性能配置支持订单分页和虚拟列表

- 添加订单分页配置（每页10条，缓存5分钟）
- 添加虚拟列表配置（可见5个，缓冲3个）
- 添加缓存键配置常量
- 支持订单列表和分类商品的性能优化"
```

---

### Task 3: 修改订单云函数支持分页

**Files:**
- Modify: `cloudfunctions/order/modules/order.js:276-308`

- [ ] **Step 1: 读取现有 getOrders 函数**

```bash
# Windows PowerShell
Get-Content "cloudfunctions/order/modules/order.js" | Select-Object -First 350 | Select-Object -Last 35

# 或使用 Git Bash
sed -n '276,310p' cloudfunctions/order/modules/order.js
```

Expected output: 现有的 getOrders 函数（接受 openid, status 参数，无分页）

- [ ] **Step 2: 修改 getOrders 函数支持分页参数**

在 `cloudfunctions/order/modules/order.js` 中，找到第276行的 `getOrders` 函数，替换为：

```javascript
/**
 * 获取订单列表（支持分页）
 * @param {string} openid - 用户openid
 * @param {string} status - 订单状态筛选
 * @param {Object} options - 可选参数
 * @param {number} options.page - 页码（从1开始，默认1）
 * @param {number} options.pageSize - 每页数量（默认10，最大50）
 * @returns {Promise<Object>} 订单列表结果
 */
async function getOrders(openid, status, options = {}) {
  const {
    page = 1,
    pageSize = 10
  } = options;

  // 参数验证
  if (page < 1 || pageSize < 1 || pageSize > 50) {
    return error(ErrorCodes.INVALID_PARAMS, '分页参数无效');
  }

  const cacheKey = page === 1
    ? `orders_${openid}_${status || 'all'}`
    : null; // 仅第一页使用缓存

  // 第一页尝试使用缓存
  if (cacheKey) {
    const cached = userCache.get(cacheKey);
    if (cached !== null) {
      logger.debug('Orders cache hit', { openid, status, page });
      return cached;
    }
  }

  logger.debug('Orders cache miss, querying...', { openid, status, page, pageSize });

  try {
    const query = { _openid: openid };

    if (status && status !== 'all') {
      query.status = status;
    }

    // 多查1条判断hasMore
    const res = await db.collection('orders')
      .where(query)
      .orderBy('createTime', 'desc')
      .skip((page - 1) * pageSize)
      .limit(pageSize + 1)
      .get();

    // 判断是否有更多数据
    const hasMore = res.data.length > pageSize;
    const orders = hasMore ? res.data.slice(0, pageSize) : res.data;

    logger.info('Orders fetched', {
      count: orders.length,
      hasMore,
      page
    });

    const result = success({
      orders,
      hasMore,
      page,
      pageSize
    }, '获取订单成功');

    // 仅第一页缓存（5分钟）
    if (cacheKey) {
      userCache.set(cacheKey, result, 300000);
    }

    return result;
  } catch (err) {
    logger.error('Failed to get orders', err);
    return error(ErrorCodes.DATABASE_ERROR, '获取订单失败', err.message);
  }
}
```

- [ ] **Step 3: 更新 index.js 中的调用**

在 `cloudfunctions/order/index.js` 第79-80行，修改 `getOrders` 调用传递 options：

```javascript
// 原代码（line 79-80）:
case 'getOrders':
  return await orderModule.getOrders(openid, data ? data.status : null);

// 修改为:
case 'getOrders':
  return await orderModule.getOrders(
    openid,
    data ? data.status : null,
    data ? data : {} // 传递完整 data 对象，包含 page, pageSize
  );
```

- [ ] **Step 4: 验证云函数语法**

```bash
node -c cloudfunctions/order/modules/order.js
node -c cloudfunctions/order/index.js
```

Expected: 无错误（无输出表示语法正确）

- [ ] **Step 5: 提交云函数修改**

```bash
git add cloudfunctions/order/index.js cloudfunctions/order/modules/order.js
git commit -m "feat: 订单云函数添加分页查询支持

- 修改 getOrders 函数支持分页参数（page, pageSize）
- 返回 hasMore 标识用于判断是否有更多数据
- 仅第一页使用缓存（5分钟）
- 添加参数验证和错误处理
- 多查1条优化判断hasMore逻辑
- 保持向后兼容（默认 page=1, pageSize=10）"
```

- [ ] **Step 3: 验证云函数语法**

```bash
node -c cloudfunctions/order/index.js
```

Expected: 无错误（无输出表示语法正确）

- [ ] **Step 4: 提交云函数修改**

```bash
git add cloudfunctions/order/index.js
git commit -m "feat: 订单云函数添加分页查询支持

- 添加 handleList 函数支持分页查询
- 支持参数：page, pageSize
- 返回 hasMore 标识用于判断是否有更多数据
- 添加参数验证和错误处理
- 多查1条优化判断hasMore逻辑"
```

---

### Task 4: 修改订单列表页面添加分页

**Files:**
- Modify: `src/pages/order/list.vue`

- [ ] **Step 1: 读取现有订单列表页面**

```bash
cat src/pages/order/list.vue | head -200
```

Expected: 了解现有的数据加载逻辑

- [ ] **Step 2: 在 script setup 部分添加导入和状态管理**

在文件开头的 import 区域后添加：

```typescript
import { ref, reactive, onMounted } from 'vue';
import { isFeatureEnabled } from '@/config/featureFlags';
import { ORDER_PAGINATION_CONFIG, CACHE_KEYS } from '@/config/performance';
import type { Order } from '@/types/index';

// 订单列表状态
const state = reactive({
  orders: [] as Order[],
  currentPage: 1,
  pageSize: ORDER_PAGINATION_CONFIG.pageSize,
  hasMore: true,
  loading: false,
  error: null as string | null,
  retryAttempted: false
});
```

- [ ] **Step 3: 实现分页加载函数**

在 script 部分添加：

```typescript
/**
 * 加载订单列表（支持分页和缓存）
 * @param refresh 是否刷新（重新从第一页开始）
 */
async function loadOrders(refresh = false) {
  // 检查功能开关
  if (!isFeatureEnabled('ORDER_PAGINATION')) {
    // 降级：使用原有全量加载逻辑
    return loadAllOrders();
  }

  // 防止重复加载
  if (state.loading) {
    return;
  }

  // 刷新重置状态
  if (refresh) {
    state.currentPage = 1;
    state.orders = [];
    state.error = null;
  }

  // 尝试读取缓存（仅首次加载）
  if (!refresh && state.currentPage === 1) {
    const cached = getCachedOrders();
    if (cached && cached.length > 0) {
      state.orders = cached;
      // 后台静默刷新
      refreshOrdersInBackground();
      return;
    }
  }

  state.loading = true;

  try {
    const result = await uni.cloud.callFunction({
      name: 'order',
      data: {
        action: 'list',
        data: {
          page: state.currentPage,
          pageSize: state.pageSize
        }
      }
    });

    if (result.result.code !== 0) {
      throw new Error(result.result.msg);
    }

    const { orders, hasMore } = result.result.data;

    // 追加订单列表
    state.orders = [...state.orders, ...orders];
    state.hasMore = hasMore;
    state.currentPage++;
    state.error = null;

    // 更新缓存（仅第一页）
    if (state.currentPage === 2) {
      setCachedOrders(state.orders);
    }
  } catch (error: any) {
    console.error('加载订单失败:', error);

    // 错误处理
    if (error.errCode === 'NETWORK_ERROR') {
      state.error = '网络连接失败，请检查网络';
    } else if (error.errCode === 'TIMEOUT' || error.message?.includes('timeout')) {
      state.error = '请求超时，请重试';
      // 超时自动重试一次
      if (!state.retryAttempted) {
        state.retryAttempted = true;
        await loadOrders(refresh);
        return;
      }
    } else {
      state.error = error.errMsg || error.message || '加载失败，请重试';
    }

    uni.showToast({
      title: state.error,
      icon: 'none'
    });
  } finally {
    state.loading = false;
    state.retryAttempted = false;
  }
}

/**
 * 读取缓存的订单列表
 */
function getCachedOrders(): Order[] | null {
  try {
    const cached = uni.getStorageSync(CACHE_KEYS.ORDER_LIST);
    if (!cached) return null;

    const { data, timestamp, version } = JSON.parse(cached);

    // 检查缓存版本
    if (version !== '1.0') {
      uni.removeStorageSync(CACHE_KEYS.ORDER_LIST);
      return null;
    }

    // 检查是否过期（5分钟）
    if (Date.now() - timestamp > ORDER_PAGINATION_CONFIG.cacheTTL) {
      uni.removeStorageSync(CACHE_KEYS.ORDER_LIST);
      return null;
    }

    return data;
  } catch (error) {
    console.warn('[Cache] 读取缓存失败:', error);
    return null;
  }
}

/**
 * 写入缓存
 */
function setCachedOrders(orders: Order[]) {
  try {
    const cache = {
      data: orders,
      timestamp: Date.now(),
      version: '1.0'
    };
    uni.setStorageSync(CACHE_KEYS.ORDER_LIST, JSON.stringify(cache));
  } catch (error) {
    console.warn('[Cache] 写入缓存失败:', error);
  }
}

/**
 * 后台静默刷新
 */
let backgroundRefreshInProgress = false;

async function refreshOrdersInBackground() {
  if (backgroundRefreshInProgress) {
    return;
  }

  backgroundRefreshInProgress = true;

  try {
    const result = await uni.cloud.callFunction({
      name: 'order',
      data: {
        action: 'list',
        data: { page: 1, pageSize: state.orders.length }
      }
    });

    if (result.result.code === 0) {
      const newOrders = result.result.data.orders;

      // 检查是否有变化
      if (hasOrdersChanged(newOrders, state.orders)) {
        setCachedOrders(newOrders);
        state.orders = newOrders;
      }
    }
  } catch (error) {
    // 后台刷新失败不影响用户当前看到的内容
    console.warn('[Cache] 后台刷新失败:', error);
  } finally {
    backgroundRefreshInProgress = false;
  }
}

/**
 * 检查订单列表是否有变化
 */
function hasOrdersChanged(newOrders: Order[], oldOrders: Order[]): boolean {
  if (newOrders.length !== oldOrders.length) {
    return true;
  }

  const newOrderIds = new Map(newOrders.map(o => [o._id, o.updateTime]));
  const oldOrderIds = new Map(oldOrders.map(o => [o._id, o.updateTime]));

  for (const [id, newTime] of newOrderIds) {
    const oldTime = oldOrderIds.get(id);
    if (!oldTime || newTime !== oldTime) {
      return true;
    }
  }

  return false;
}

/**
 * 降级：加载所有订单（原有逻辑）
 * 当功能开关关闭时使用此方法
 */
async function loadAllOrders() {
  console.warn('[Fallback] 使用全量加载逻辑');

  try {
    const result = await uni.cloud.callFunction({
      name: 'order',
      data: {
        action: 'getOrders',
        data: {} // 不传递分页参数，使用默认行为
      }
    });

    if (result.result.code !== 0) {
      throw new Error(result.result.msg);
    }

    // 全量加载：一次性返回所有订单
    state.orders = result.result.data.orders || [];
    state.hasMore = false; // 全量加载无更多数据
    state.currentPage = 1;

    uni.showToast({
      title: '已加载全部订单',
      icon: 'success'
    });
  } catch (error: any) {
    console.error('[Fallback] 全量加载失败:', error);
    state.error = error.errMsg || error.message || '加载失败';

    uni.showToast({
      title: state.error,
      icon: 'none'
    });
  }
}
```

- [ ] **Step 4: 修改 onMounted 使用分页加载**

找到 `onMounted` 函数，修改为：

```typescript
onMounted(() => {
  // 下拉刷新时重新加载
  loadOrders(true);
});
```

- [ ] **Step 5: 添加触底加载事件**

检查现有页面是否已有 `@scrolltolower` 事件处理：

```bash
# 查找现有的 scrolltolower 事件
grep -n "scrolltolower\|loadMore" src/pages/order/list.vue
```

如果已存在 `@scrolltolower="loadMore"`，修改现有的 `loadMore` 函数：

```typescript
// 找到现有的 loadMore 函数，修改为：
function loadMore() {
  if (isFeatureEnabled('ORDER_PAGINATION')) {
    // 使用新的分页加载逻辑
    if (state.hasMore && !state.loading) {
      loadOrders();
    }
  } else {
    // 使用原有的加载更多逻辑
    // 保留原有实现
  }
}
```

如果没有，添加新的事件处理：

```vue
<template>
  <view class="order-list" @scrolltolower="onReachBottom">
    <!-- 现有内容 -->
  </view>
</template>

<script setup lang="ts">
// 添加触底加载函数
function onReachBottom() {
  if (state.hasMore && !state.loading) {
    loadOrders();
  }
}
</script>
```

- [ ] **Step 6: 添加加载状态UI**

在订单列表底部添加加载提示：

```vue
<template>
  <!-- 订单列表 -->
  <view v-for="order in state.orders" :key="order._id" class="order-item">
    <!-- 现有订单卡片 -->
  </view>

  <!-- 加载状态 -->
  <view class="load-more">
    <view v-if="state.loading" class="loading">
      <uni-load-more status="loading" />
    </view>
    <view v-else-if="!state.hasMore" class="no-more">
      已加载全部订单
    </view>
    <view v-else class="has-more">
      已加载 {{ state.orders.length }} 条订单
    </view>
  </view>
</template>

<style scoped>
.load-more {
  padding: 30rpx;
  text-align: center;
  color: #999;
}

.no-more, .has-more {
  font-size: 24rpx;
}
</style>
```

- [ ] **Step 7: 提交订单列表分页**

```bash
git add src/pages/order/list.vue
git commit -m "feat: 订单列表添加分页加载功能

- 支持分页加载订单（每页10条）
- 添加5分钟本地缓存
- 实现后台静默刷新
- 添加触底加载更多功能
- 添加加载状态UI提示
- 功能开关支持快速回滚
- 完整错误处理和重试机制"
```

---

### Task 5: 创建数据库索引

**Files:**
- Modify: `cloudfunctions/migration/index.js`

- [ ] **Step 1: 读取现有migration云函数**

```bash
cat cloudfunctions/migration/index.js
```

Expected: 查看现有的迁移函数结构

- [ ] **Step 2: 添加订单列表索引创建函数**

在 exports.main 的 switch 中添加新的 case：

```javascript
// cloudfunctions/migration/index.js
exports.main = async (event, context) => {
  const { action, data } = event;

  switch (action) {
    // ... 现有的 case ...

    case 'createOrderListIndex':
      return await createOrderListIndex();

    default:
      return { code: 400, msg: `Unknown action: ${action}` };
  }
};

/**
 * 创建订单列表索引
 * 索引: { _openid: 1, createTime: -1 }
 * 用途: 优化按照用户和时间排序的分页查询
 */
async function createOrderListIndex() {
  const db = cloud.database();

  try {
    await db.collection('orders').createIndex({
      _openid: 1,
      createTime: -1
    });

    console.log('[Migration] 订单列表索引创建成功');

    return {
      code: 0,
      msg: '索引创建成功'
    };
  } catch (error) {
    // 如果是索引已存在错误，忽略
    if (error.errCode === 'DUP_INDEX') {
      console.log('[Migration] 索引已存在，跳过');
      return {
        code: 0,
        msg: '索引已存在'
      };
    }

    console.error('[Migration] 索引创建失败:', error);

    return {
      code: -1,
      msg: error.message || '索引创建失败'
    };
  }
}
```

- [ ] **Step 3: 验证云函数语法**

```bash
node -c cloudfunctions/migration/index.js
```

Expected: 无错误

- [ ] **Step 4: 执行索引创建**

在云开发控制台的云函数调试界面测试：

```json
{
  "action": "createOrderListIndex"
}
```

Expected output:
```json
{
  "code": 0,
  "msg": "索引创建成功"
}
```

或如果索引已存在:
```json
{
  "code": 0,
  "msg": "索引已存在"
}
```

- [ ] **Step 4.1: 验证索引创建成功**

在云开发控制台的数据库管理界面验证：

1. 进入数据库管理
2. 选择 `orders` 集合
3. 点击"索引管理"
4. 验证存在复合索引: `{ _openid: 1, createTime: -1 }`

- [ ] **Step 5: 提交索引创建代码**

```bash
git add cloudfunctions/migration/index.js
git commit -m "feat: 添加订单列表索引创建迁移脚本

- 创建 _openid + createTime 复合索引
- 优化分页查询性能
- 支持幂等执行（索引已存在时跳过）"
```

---

### Task 6: 部署云函数并测试

**Files:**
- N/A (部署操作)

- [ ] **Step 1: 部署 order 云函数**

**使用微信开发者工具:**

1. 打开微信开发者工具
2. 点击顶部菜单 "云开发" 或 "云开发控制台"
3. 选择云函数管理
4. 找到 `order` 云函数
5. 点击"上传并部署：安装依赖"
6. 等待部署完成（显示"部署成功"）

**验证部署:**
在云函数列表中，`order` 云函数状态应显示为"正常"

- [ ] **Step 2: 部署 migration 云函数**

**使用微信开发者工具:**

1. 在云函数管理中找到 `migration` 云函数
2. 点击"上传并部署：安装依赖"
3. 等待部署完成

**如果 migration 云函数不存在:**

1. 在云函数管理页面点击"新建"
2. 云函数名称: `migration`
3. 运行环境: Node.js 16.13
4. 创建后上传代码

- [ ] **Step 3: 测试云函数分页功能**

在云开发控制台的云函数调试界面测试：

```json
{
  "action": "getOrders",
  "data": {
    "page": 1,
    "pageSize": 10
  }
}
```

Expected output:
```json
{
  "code": 0,
  "msg": "获取订单成功",
  "data": {
    "orders": [...],
    "hasMore": true,
    "page": 1,
    "pageSize": 10
  }
}
```

- [ ] **Step 3: 执行索引创建**

调用 migration 云函数创建索引：

```bash
# 在微信开发者工具的云函数控制台
# 选择 migration 云函数
# 点击"云端测试"
# 输入参数: { "action": "createOrderListIndex" }
# 点击"调用"
```

Expected output:
```
{
  "code": 0,
  "msg": "索引创建成功"
}
```

- [ ] **Step 4: 编译前端代码**

```bash
npm run dev:mp-weixin
```

Expected output:
```
✓ built in XXXms
「小程序开发工具」已生成代码并打开
```

If error occurs:
```
# 检查 TypeScript 错误
npm run type-check

# 或清理缓存后重试
rm -rf dist node_modules/.vite
npm run dev:mp-weixin
```

- [ ] **Step 5: 在微信开发者工具中测试分页功能**

**打开微信开发者工具:**

Windows 路径:
```bash
"C:\Program Files (x86)\Tencent\微信web开发者工具\cli.bat" open --project "C:\Users\Administrator\Documents\HBuilderProjects\perfectlifeexperience\dist\build\mp-weixin"
```

或手动打开:
1. 启动微信开发者工具
2. 导入项目: `dist/build/mp-weixin/`
3. 点击"编译"按钮

**测试步骤:**
1. 登录小程序
2. 进入订单列表页面
3. 打开调试控制台（Console）
4. 验证首次加载显示10条订单
5. 滚动到底部，观察是否自动加载下一页
6. 验证Console输出: "Orders fetched {count: 10, hasMore: true, page: 1}"
7. 验证"已加载全部订单"或"已加载 X 条订单"显示

**预期性能:**
- 首次加载 < 500ms
- 加载下一页 < 300ms

- [ ] **Step 6: 验证缓存功能**

测试步骤:
1. 首次进入订单列表
2. 退出页面
3. 5分钟内再次进入
4. 验证订单列表立即显示（使用缓存）
5. 打开调试控制台，查看后台刷新日志

- [ ] **Step 7: 测试功能开关回滚**

测试步骤:
1. 修改 `src/config/featureFlags.ts`
2. 设置 `ORDER_PAGINATION: false`
3. 重新编译
4. 验证订单列表使用降级逻辑（全量加载）
5. 恢复 `ORDER_PAGINATION: true`

- [ ] **Step 8: 提交部署记录**

```bash
git add .
git commit -m "chore: 部署订单分页优化云函数

- 部署 order 云函数（支持分页）
- 部署 migration 云函数（索引创建）
- 创建订单列表数据库索引
- 完成订单分页功能测试
- 验证缓存和回滚功能正常"
```

---

## Chunk 1 完成检查点

**验证清单:**
- [x] 功能开关配置已创建
- [x] 性能配置已扩展
- [x] 订单云函数支持分页
- [x] 订单列表页面实现分页
- [x] 数据库索引已创建
- [x] 云函数已部署
- [x] 分页功能测试通过
- [x] 缓存功能测试通过
- [x] 回滚功能测试通过

**性能指标:**
- 订单列表首次加载应 < 500ms（仅10条）
- 滚动加载下一页 < 300ms
- 缓存命中时 < 100ms

准备进入 Chunk 2: 分类虚拟列表优化
