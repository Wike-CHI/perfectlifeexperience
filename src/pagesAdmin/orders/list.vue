<template>
  <view class="orders-container">
    <!-- 筛选标签 -->
    <view class="filter-tabs">
      <view
        v-for="tab in statusTabs"
        :key="tab.value"
        :class="['tab-item', { active: currentStatus === tab.value }]"
        @click="handleTabChange(tab.value)"
      >
        <text class="tab-label">{{ tab.label }}</text>
        <text v-if="tab.count > 0" class="tab-count">({{ tab.count }})</text>
      </view>
    </view>

    <!-- 搜索栏 -->
    <view class="search-bar">
      <view class="search-input-wrapper">
        <text class="search-icon">🔍</text>
        <input
          class="search-input"
          type="text"
          placeholder="搜索订单号"
          v-model="searchKeyword"
          placeholder-class="search-placeholder"
          @confirm="handleSearch"
        />
        <text v-if="searchKeyword" class="clear-icon" @click="clearSearch">✕</text>
      </view>
      <button class="scan-btn" @click="handleScan">
        <text>📷</text>
      </button>
    </view>

    <!-- 订单列表 -->
    <view class="orders-list">
      <order-card
        v-for="order in orders"
        :key="order.id"
        :order="order"
        @click="goToDetail"
        @scan="handleScanOrder"
        @update-status="handleUpdateStatus"
      />

      <!-- 空状态 -->
      <view v-if="orders.length === 0 && !isLoading" class="empty-state">
        <text class="empty-icon">📦</text>
        <text class="empty-text">暂无订单</text>
      </view>

      <!-- 加载状态 -->
      <view v-if="isLoading" class="loading-state">
        <text class="loading-text">加载中...</text>
      </view>
    </view>

    <!-- 加载更多 -->
    <view v-if="hasMore && !isLoading" class="load-more" @click="loadMore">
      <text class="load-more-text">加载更多</text>
    </view>

    <!-- 安全区域 -->
    <view class="safe-area"></view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { onPullDownRefresh, onReachBottom } from '@dcloudio/uni-app'
import AdminAuthManager from '@/utils/admin-auth'
import AdminCacheManager from '@/utils/admin-cache'
import { CACHE_CONFIG } from '@/utils/cache-config'
import { callFunction } from '@/utils/cloudbase'
import OrderCard from './components/OrderCard.vue'

/**
 * 订单管理列表页面
 */

// 权限检查
onMounted(() => {
  if (!AdminAuthManager.checkAuth()) return
  loadOrders()
})

// 下拉刷新
onPullDownRefresh(async () => {
  await loadOrders(true)
  uni.stopPullDownRefresh()
})

// 上拉加载更多
onReachBottom(() => {
  if (hasMore.value && !isLoading.value) {
    loadMore()
  }
})

// 状态标签
const statusTabs = ref([
  { label: '全部', value: 'all', count: 0 },
  { label: '待付款', value: 'pending', count: 0 },
  { label: '待发货', value: 'paid', count: 0 },
  { label: '待收货', value: 'shipping', count: 0 },
  { label: '已完成', value: 'completed', count: 0 }
])

// 数据状态
const currentStatus = ref('all')
const searchKeyword = ref('')
const orders = ref<any[]>([])
const isLoading = ref(false)
const hasMore = ref(false)
const currentPage = ref(1)
const pageSize = 20

// 状态映射
const statusMap: Record<string, string> = {
  pending: 'pending',
  paid: 'paid',
  shipping: 'shipping',
  completed: 'completed',
  cancelled: 'cancelled'
}

// 切换状态标签
const handleTabChange = (status: string) => {
  currentStatus.value = status
  currentPage.value = 1
  orders.value = []
  loadOrders()
}

// 搜索
const handleSearch = () => {
  currentPage.value = 1
  orders.value = []
  loadOrders()
}

// 清除搜索
const clearSearch = () => {
  searchKeyword.value = ''
  handleSearch()
}

// 扫码查找订单
const handleScan = () => {
  uni.scanCode({
    success: async (res) => {
      console.log('扫码结果:', res.result)
      // TODO: 根据扫码结果查找订单
      await searchOrderByCode(res.result)
    },
    fail: () => {
      uni.showToast({
        title: '扫码失败',
        icon: 'none'
      })
    }
  })
}

// 根据快递单号搜索订单
const searchOrderByCode = async (code: string) => {
  try {
    uni.showLoading({ title: '搜索中...' })

    const res = await callFunction('admin-api', {
      action: 'searchOrderByExpress',
      adminToken: AdminAuthManager.getToken(),
      data: { expressCode: code }
    })

    uni.hideLoading()

    if (res.code === 0 && res.data) {
      // 跳转到订单详情
      uni.navigateTo({
        url: `/pagesAdmin/orders/detail?id=${res.data.id}`
      })
    } else {
      uni.showToast({
        title: res.msg || '未找到该订单',
        icon: 'none',
        duration: 2000
      })
    }
  } catch (error: any) {
    uni.hideLoading()
    uni.showToast({
      title: error.message || '搜索失败',
      icon: 'none'
    })
  }
}

// 加载订单列表
const loadOrders = async (forceRefresh: boolean = false) => {
  if (isLoading.value) return

  try {
    isLoading.value = true

    const cacheKey = AdminCacheManager.getConfigKey('orders', {
      status: currentStatus.value,
      keyword: searchKeyword.value
    })

    if (!forceRefresh && currentPage.value === 1) {
      const cached = AdminCacheManager.get(cacheKey)
      if (cached) {
        orders.value = cached.list
        hasMore.value = cached.hasMore
        return
      }
    }

    const res = await callFunction('admin-api', {
      action: 'getOrders',
      data: {
        page: currentPage.value,
        limit: pageSize,
        status: currentStatus.value === 'all' ? undefined : currentStatus.value,
        keyword: searchKeyword.value || undefined
      }
    })

    if (res.code === 0 && res.data) {
      const newOrders = currentPage.value === 1 ? [] : orders.value
      newOrders.push(...res.data.list)
      orders.value = newOrders

      hasMore.value = currentPage.value < res.data.totalPages

      // 缓存第一页数据
      if (currentPage.value === 1) {
        AdminCacheManager.set(cacheKey, {
          list: orders.value,
          hasMore: hasMore.value
        }, CACHE_CONFIG.orders.expire)
      }
    } else {
      throw new Error(res.msg || '加载失败')
    }
  } catch (error: any) {
    console.error('加载订单失败:', error)
    uni.showToast({
      title: error.message || '加载失败',
      icon: 'none'
    })
  } finally {
    isLoading.value = false
  }
}

// 加载更多
const loadMore = () => {
  currentPage.value++
  loadOrders()
}

// 跳转到订单详情
const goToDetail = (order: any) => {
  uni.navigateTo({
    url: `/pagesAdmin/orders/detail?id=${order.id}`
  })
}

// 处理扫码更新快递单
const handleScanOrder = async (order: any) => {
  uni.scanCode({
    success: async (res) => {
      try {
        uni.showLoading({ title: '更新中...' })

        await callFunction('admin-api', {
          action: 'updateOrderExpress',
          data: {
            orderId: order.id,
            expressCode: res.result
          }
        })

        uni.hideLoading()
        uni.showToast({
          title: '更新成功',
          icon: 'success'
        })

        // 刷新列表
        loadOrders(true)
      } catch (error: any) {
        uni.hideLoading()
        uni.showToast({
          title: error.message || '更新失败',
          icon: 'none'
        })
      }
    },
    fail: () => {
      uni.showToast({
        title: '扫码失败',
        icon: 'none'
      })
    }
  })
}

// 更新订单状态
const handleUpdateStatus = (order: any) => {
  const statusOptions = [
    { label: '待付款', value: 'pending' },
    { label: '待发货', value: 'paid' },
    { label: '待收货', value: 'shipping' },
    { label: '已完成', value: 'completed' },
    { label: '已取消', value: 'cancelled' }
  ]

  const currentIndex = statusOptions.findIndex(s => s.value === order.status)

  uni.showActionSheet({
    itemList: statusOptions.map(s => s.label),
    success: async (res) => {
      if (res.tapIndex === currentIndex) return

      const newStatus = statusOptions[res.tapIndex].value

      try {
        uni.showLoading({ title: '更新中...' })

        await callFunction('admin-api', {
          action: 'updateOrderStatus',
          data: {
            orderId: order.id,
            status: newStatus
          }
        })

        uni.hideLoading()
        uni.showToast({
          title: '更新成功',
          icon: 'success'
        })

        // 清除缓存并刷新列表
        AdminCacheManager.clearByType('orders')
        loadOrders(true)
      } catch (error: any) {
        uni.hideLoading()
        uni.showToast({
          title: error.message || '更新失败',
          icon: 'none'
        })
      }
    }
  })
}
</script>

<style scoped>
.orders-container {
  min-height: 100vh;
  background: #1A1A1A;
  padding-bottom: 120rpx;
}

/* 筛选标签 */
.filter-tabs {
  display: flex;
  padding: 24rpx;
  gap: 16rpx;
  overflow-x: auto;
  white-space: nowrap;
  background: #1A1A1A;
  position: sticky;
  top: 0;
  z-index: 10;
}

.tab-item {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 16rpx 32rpx;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 24rpx;
  border: 2rpx solid transparent;
  transition: all 0.3s;
  flex-shrink: 0;
}

.tab-item.active {
  background: rgba(201, 169, 98, 0.2);
  border-color: #C9A962;
}

.tab-label {
  font-size: 26rpx;
  color: rgba(245, 245, 240, 0.6);
}

.tab-item.active .tab-label {
  color: #C9A962;
  font-weight: 600;
}

.tab-count {
  font-size: 22rpx;
  color: rgba(245, 245, 240, 0.4);
}

/* 搜索栏 */
.search-bar {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 0 24rpx 24rpx;
}

.search-input-wrapper {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 16rpx;
  background: rgba(255, 255, 255, 0.05);
  border: 2rpx solid rgba(201, 169, 98, 0.2);
  border-radius: 12rpx;
  padding: 16rpx 24rpx;
}

.search-icon {
  font-size: 32rpx;
}

.search-input {
  flex: 1;
  font-size: 28rpx;
  color: #F5F5F0;
}

.search-placeholder {
  color: rgba(245, 245, 240, 0.3);
}

.clear-icon {
  font-size: 32rpx;
  color: rgba(245, 245, 240, 0.3);
}

.scan-btn {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(201, 169, 98, 0.1);
  border-radius: 12rpx;
  font-size: 32rpx;
  border: none;
}

/* 订单列表 */
.orders-list {
  padding: 0 24rpx;
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 120rpx 0;
  gap: 24rpx;
}

.empty-icon {
  font-size: 120rpx;
  opacity: 0.3;
}

.empty-text {
  font-size: 26rpx;
  color: rgba(245, 245, 240, 0.4);
}

/* 加载状态 */
.loading-state {
  display: flex;
  justify-content: center;
  padding: 60rpx 0;
}

.loading-text {
  font-size: 26rpx;
  color: rgba(245, 245, 240, 0.4);
}

/* 加载更多 */
.load-more {
  display: flex;
  justify-content: center;
  padding: 32rpx;
}

.load-more-text {
  font-size: 26rpx;
  color: #C9A962;
}

/* 安全区域 */
.safe-area {
  height: constant(safe-area-inset-bottom);
  height: env(safe-area-inset-bottom);
}
</style>
