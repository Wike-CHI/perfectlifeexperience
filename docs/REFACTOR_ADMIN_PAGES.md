# 管理端页面重构指南

## 概述

使用 `useAdmin` composable 可以简化管理端页面的代码，实现：
- 分页加载
- 搜索功能
- 缓存管理
- 下拉刷新
- 上拉加载更多

## 使用方法

### 1. 列表页面

```vue
<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAdminList } from '@/composables/useAdmin'

// 状态筛选示例
const currentStatus = ref('all')

// 使用 composable
const {
  list,
  loading,
  hasMore,
  search,
  clearSearch,
  loadMore,
  refresh
} = useAdminList({
  action: 'getOrders',        // API action 名称
  cachePrefix: 'orders',      // 缓存键前缀
  pageSize: 20,               // 每页数量
  // 额外参数可以是普通对象或 ComputedRef（响应式）
  extraParams: computed(() => ({
    status: currentStatus.value === 'all' ? undefined : currentStatus.value
  })),
  transform: async (data) => { // 数据转换
    // 自定义转换逻辑
    return data
  },
  onLoaded: (list) => {       // 加载完成回调
    console.log('加载完成', list.length)
  },
  onError: (error) => {       // 错误回调
    console.error('加载失败', error)
  }
})

// 监听状态变化 - 自动触发刷新
import { watch } from 'vue'
watch(currentStatus, () => {
  refresh()
})

// 搜索
const handleSearch = () => {
  search(keyword)
}
</script>
```

### 2. 详情页面

```vue
<script setup lang="ts">
import { useAdminDetail } from '@/composables/useAdmin'

const { detail, loading, loadDetail } = useAdminDetail({
  action: 'getOrderDetail',
  idParam: 'orderId',  // ID 参数名
  onLoaded: (data) => {
    console.log('详情加载完成', data)
  }
})

// 加载详情
onMounted(() => {
  loadDetail(id)
})
</script>
```

### 3. 操作（增删改）

```vue
<script setup lang="ts">
import { useAdminAction } from '@/composables/useAdmin'

const { loading, execute } = useAdminAction({
  action: 'updateOrderStatus',
  successMsg: '状态更新成功',
  onSuccess: () => {
    // 刷新列表
  }
})

// 执行操作
const handleUpdate = async () => {
  await execute({
    orderId: 'xxx',
    status: 'completed'
  })
}
</script>
```

## 缓存配置

缓存配置在 `src/utils/cache-config.ts` 中定义：

```typescript
export const CACHE_CONFIG = {
  orders: {
    key: 'admin_orders_list',
    expire: 5  // 分钟
  },
  users: {
    key: 'admin_users_list',
    expire: 20
  },
  // ...
}
```

## 页面重构状态

### Phase 1: 核心页面重构 (订单、用户) ✅ 已完成

| 页面 | 文件 | 状态 |
|------|------|------|
| 订单列表 | `src/pagesAdmin/orders/list.vue` | ✅ 已重构 |
| 订单详情 | `src/pagesAdmin/orders/detail.vue` | ✅ 已重构 |
| 用户列表 | `src/pagesAdmin/users/list.vue` | ✅ 已重构 |
| 用户详情 | `src/pagesAdmin/users/detail.vue` | ✅ 已重构 |

### Phase 2: 业务页面重构 (部分完成)

| 页面 | 文件 | 状态 |
|------|------|------|
| 商品列表 | `src/pagesAdmin/products/list.vue` | ✅ 已重构 |
| 商品编辑 | `src/pagesAdmin/products/edit.vue` | 保持不变（复杂表单） |
| 退款列表 | `src/pagesAdmin/refunds/index.vue` | ✅ 已重构 |
| 退款详情 | `src/pagesAdmin/refunds/detail.vue` | 待处理 |
| 佣金列表 | `src/pagesAdmin/commissions/list.vue` | 保持不变（有统计摘要） |

### Phase 3: 运营页面重构 (已完成)

| 页面 | 文件 | 状态 |
|------|------|------|
| 优惠券列表 | `src/pagesAdmin/coupons/list.vue` | ✅ 已重构 |
| 优惠券编辑 | `src/pagesAdmin/coupons/edit.vue` | 保持不变（复杂表单） |
| Banner列表 | `src/pagesAdmin/banners/list.vue` | ✅ 已重构 |
| Banner编辑 | `src/pagesAdmin/banners/edit.vue` | 保持不变（复杂表单） |
| 公告列表 | `src/pagesAdmin/announcements/list.vue` | ✅ 已重构 |
| 公告编辑 | `src/pagesAdmin/announcements/edit.vue` | 保持不变（复杂表单） |
| 推广活动列表 | `src/pagesAdmin/promotions/list.vue` | ✅ 已重构 |
| 推广活动编辑 | `src/pagesAdmin/promotions/edit.vue` | 保持不变（复杂表单） |

### Phase 4: 辅助页面重构 (部分完成)

| 页面 | 文件 | 状态 |
|------|------|------|
| 分类列表 | `src/pagesAdmin/categories/list.vue` | ✅ 已重构 |
| 分类编辑 | `src/pagesAdmin/categories/edit.vue` | 保持不变（复杂表单） |
| 门店列表 | `src/pagesAdmin/stores/list.vue` | ✅ 已重构 |
| 门店编辑 | `src/pagesAdmin/stores/edit.vue` | 保持不变（复杂表单） |
| 仪表盘 | `src/pagesAdmin/dashboard/index.vue` | 保持不变（统计展示） |
| 钱包列表 | `src/pagesAdmin/wallets/list.vue` | 保持不变（复杂统计） |
| 佣金钱包 | `src/pagesAdmin/commission-wallets/list.vue` | 保持不变（复杂统计） |
| 库存列表 | `src/pagesAdmin/inventory/list.vue` | 保持不变（有特殊操作） |
| 财务概览 | `src/pagesAdmin/finance/index.vue` | 保持不变（复杂统计） |
| 推广管理 | `src/pagesAdmin/promotion/index.vue` | 待处理 |
| 统计报表 | `src/pagesAdmin/statistics/index.vue` | 待处理 |
| 系统配置 | `src/pagesAdmin/settings/config.vue` | 待处理 |
| 地址列表 | `src/pagesAdmin/addresses/list.vue` | 待处理 |

## 重构前后对比

### 重构前（约 300 行）

```vue
<script setup>
// 手动导入
import { ref, onMounted } from 'vue'
import { onPullDownRefresh, onReachBottom } from '@dcloudio/uni-app'
import AdminAuthManager from '@/utils/admin-auth'
import AdminCacheManager from '@/utils/admin-cache'
import { CACHE_CONFIG } from '@/utils/cache-config'
import { callFunction } from '@/utils/cloudbase'

// 手动定义状态
const list = ref([])
const loading = ref(false)
const hasMore = ref(false)
const currentPage = ref(1)
const keyword = ref('')

// 手动实现加载
const loadData = async () => {
  // ... 200 行重复代码
}

// 手动实现刷新
onPullDownRefresh(async () => {
  // ... 50 行重复代码
})
</script>
```

### 重构后（约 100 行）

```vue
<script setup>
// 简洁导入
import { useAdminList } from '@/composables/useAdmin'

// 一行代码搞定
const { list, loading, hasMore, search, refresh, loadMore } = useAdminList({
  action: 'getOrders',
  cachePrefix: 'orders'
})
</script>
```

## 可复用的页面类型

以下页面类型可以使用此 composable：

| 页面类型 | action 示例 | cachePrefix |
|---------|-------------|-------------|
| 订单列表 | getOrders | orders |
| 用户列表 | getUsers | users |
| 商品列表 | getProducts | products |
| 退款列表 | getRefundList | refunds |
| 优惠券列表 | getCoupons | coupons |
| Banner列表 | getBanners | banners |
| 公告列表 | getAnnouncements | announcements |
