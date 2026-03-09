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
        <AdminIcon name="search" size="small" variant="default" />
        <input
          class="search-input"
          type="text"
          placeholder="搜索订单号"
          v-model="searchKeyword"
          placeholder-class="search-placeholder"
          @confirm="handleSearch"
        />
        <AdminIcon v-if="searchKeyword" name="close" size="small" class="clear-icon" @click="clearSearch" />
      </view>
      <button class="scan-btn" @click="handleScan">
        <AdminIcon name="search" size="small" variant="gold" />
      </button>
    </view>

    <!-- 订单列表 -->
    <view class="orders-list">
      <order-card
        v-for="order in list"
        :key="order.id"
        :order="order"
        @click="goToDetail"
        @scan="handleScanOrder"
        @update-status="handleUpdateStatus"
        @delete="handleDeleteOrder"
      />

      <!-- 空状态 -->
      <view v-if="list.length === 0 && !loading" class="empty-state">
        <AdminIcon name="box" size="large" />
        <text class="empty-text">暂无订单</text>
      </view>

      <!-- 加载状态 -->
      <view v-if="loading" class="loading-state">
        <text class="loading-text">加载中...</text>
      </view>
    </view>

    <!-- 加载更多 -->
    <view v-if="hasMore && !loading" class="load-more" @click="loadMore">
      <text class="load-more-text">加载更多</text>
    </view>

    <!-- 安全区域 -->
    <view class="safe-area"></view>
  </view>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { onPullDownRefresh, onReachBottom } from '@dcloudio/uni-app'
import AdminAuthManager from '@/utils/admin-auth'
import { callFunction } from '@/utils/cloudbase'
import { useAdminList } from '@/composables/useAdmin'
import OrderCard from './components/OrderCard.vue'
import AdminIcon from '@/components/admin-icon.vue'

/**
 * 订单管理列表页面
 * 使用 useAdminList composable 简化代码
 */

// 状态标签
const statusTabs = ref([
  { label: '全部', value: 'all', count: 0 },
  { label: '待付款', value: 'pending', count: 0 },
  { label: '待发货', value: 'paid', count: 0 },
  { label: '待收货', value: 'shipping', count: 0 },
  { label: '已完成', value: 'completed', count: 0 },
  { label: '退款中', value: 'refunding', count: 0 },
  { label: '已退款', value: 'refunded', count: 0 },
  { label: '已取消', value: 'cancelled', count: 0 }
])

const currentStatus = ref('all')
const searchKeyword = ref('')

// 使用 composable
const {
  list,
  loading,
  hasMore,
  currentPage,
  pageSize,
  search,
  clearSearch,
  loadMore,
  refresh
} = useAdminList({
  action: 'getOrders',
  cachePrefix: 'orders',
  pageSize: 20,
  extraParams: {},
  onLoaded: (data) => {
    console.log('订单列表加载完成', data.length)
  },
  onError: (error) => {
    console.error('加载订单失败', error)
  }
})

// 监听状态变化
watch(currentStatus, () => {
  // 状态改变时刷新列表
  refresh()
})

// 切换状态标签
const handleTabChange = (status: string) => {
  currentStatus.value = status
}

// 搜索
const handleSearch = () => {
  search(searchKeyword.value)
}

// 清除搜索
const clearSearchHandle = () => {
  searchKeyword.value = ''
  clearSearch()
}

// 扫码查找订单
const handleScan = () => {
  uni.scanCode({
    success: async (res) => {
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
      data: { expressNo: code }
    })

    uni.hideLoading()

    if (res.code === 0 && res.data) {
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

// 跳转到订单详情
const goToDetail = (order: any) => {
  const orderId = order.id || order._id
  uni.navigateTo({
    url: `/pagesAdmin/orders/detail?id=${orderId}`
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
          adminToken: AdminAuthManager.getToken(),
          data: {
            orderId: order.id || order._id,
            expressNo: res.result
          }
        })

        uni.hideLoading()
        uni.showToast({
          title: '更新成功',
          icon: 'success'
        })

        // 刷新列表
        refresh()
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

// 处理更新订单状态
const handleUpdateStatus = async (order: any, status: string) => {
  try {
    uni.showLoading({ title: '更新中...' })

    await callFunction('admin-api', {
      action: 'updateOrderStatus',
      adminToken: AdminAuthManager.getToken(),
      data: {
        orderId: order.id || order._id,
        status
      }
    })

    uni.hideLoading()
    uni.showToast({
      title: '更新成功',
      icon: 'success'
    })

    // 刷新列表
    refresh()
  } catch (error: any) {
    uni.hideLoading()
    uni.showToast({
      title: error.message || '更新失败',
      icon: 'none'
    })
  }
}

// 处理删除订单
const handleDeleteOrder = async (order: any) => {
  uni.showModal({
    title: '确认删除',
    content: '确定要删除该订单吗？',
    success: async (res) => {
      if (res.confirm) {
        try {
          uni.showLoading({ title: '删除中...' })

          await callFunction('admin-api', {
            action: 'deleteOrder',
            adminToken: AdminAuthManager.getToken(),
            data: {
              orderId: order.id || order._id
            }
          })

          uni.hideLoading()
          uni.showToast({
            title: '删除成功',
            icon: 'success'
          })

          // 刷新列表
          refresh()
        } catch (error: any) {
          uni.hideLoading()
          uni.showToast({
            title: error.message || '删除失败',
            icon: 'none'
          })
        }
      }
    }
  })
}

// 下拉刷新
onPullDownRefresh(async () => {
  await refresh()
  uni.stopPullDownRefresh()
})

// 上拉加载更多
onReachBottom(() => {
  loadMore()
})
</script>

<style scoped>
.orders-container {
  min-height: 100vh;
  background-color: #f5f5f5;
  padding-bottom: 120rpx;
}

.filter-tabs {
  display: flex;
  flex-wrap: wrap;
  padding: 20rpx;
  background: #fff;
  gap: 16rpx;
}

.tab-item {
  padding: 12rpx 24rpx;
  border-radius: 32rpx;
  background: #f5f5f5;
  display: flex;
  align-items: center;
}

.tab-item.active {
  background: linear-gradient(135deg, #3D2914 0%, #5a4225 100%);
}

.tab-label {
  font-size: 24rpx;
  color: #666;
}

.tab-item.active .tab-label {
  color: #fff;
}

.tab-count {
  font-size: 20rpx;
  color: #999;
  margin-left: 4rpx;
}

.tab-item.active .tab-count {
  color: rgba(255, 255, 255, 0.7);
}

.search-bar {
  display: flex;
  align-items: center;
  padding: 20rpx;
  background: #fff;
  gap: 16rpx;
}

.search-input-wrapper {
  flex: 1;
  display: flex;
  align-items: center;
  background: #f5f5f5;
  border-radius: 40rpx;
  padding: 16rpx 24rpx;
  gap: 12rpx;
}

.search-input {
  flex: 1;
  font-size: 28rpx;
}

.search-placeholder {
  color: #999;
}

.clear-icon {
  padding: 8rpx;
}

.scan-btn {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #C9A962 0%, #a8863d 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
}

.orders-list {
  padding: 20rpx;
}

.empty-state,
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 120rpx 0;
  gap: 24rpx;
}

.empty-text,
.loading-text {
  font-size: 28rpx;
  color: #999;
}

.load-more {
  text-align: center;
  padding: 32rpx;
}

.load-more-text {
  font-size: 24rpx;
  color: #999;
}

.safe-area {
  height: env(safe-area-inset-bottom);
}
</style>
