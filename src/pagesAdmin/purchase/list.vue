<template>
  <view class="purchase-page">
    <!-- 页面头部 -->
    <view class="page-header">
      <text class="page-title">采购管理</text>
      <view class="add-btn" @click="goToCreate">
        <text class="add-icon">+</text>
        <text class="add-text">新建采购单</text>
      </view>
    </view>

    <!-- 状态筛选 -->
    <scroll-view class="status-scroll" scroll-x enhanced show-scrollbar="false">
      <view class="status-tabs">
        <view
          v-for="tab in statusTabs"
          :key="tab.value"
          :class="['status-tab', { active: currentStatus === tab.value }]"
          @click="changeStatus(tab.value)"
        >
          {{ tab.label }}
          <text v-if="tab.count > 0" class="tab-count">{{ tab.count }}</text>
        </view>
      </view>
    </scroll-view>

    <!-- 采购单列表 -->
    <view class="purchase-list">
      <view
        v-for="order in orders"
        :key="order._id"
        class="order-item"
        @click="goToDetail(order._id)"
      >
        <view class="order-header">
          <text class="order-no">{{ order.purchaseNo }}</text>
          <view :class="['order-status', order.status]">
            {{ getStatusText(order.status) }}
          </view>
        </view>

        <view class="order-info">
          <view class="info-row">
            <text class="info-label">供应商</text>
            <text class="info-value">{{ order.supplierName }}</text>
          </view>
          <view class="info-row">
            <text class="info-label">商品数量</text>
            <text class="info-value">{{ order.items?.length || 0 }} 种</text>
          </view>
          <view class="info-row">
            <text class="info-label">采购金额</text>
            <text class="info-value price">¥{{ (order.totalAmount / 100).toFixed(2) }}</text>
          </view>
          <view class="info-row">
            <text class="info-label">创建时间</text>
            <text class="info-value">{{ formatDate(order.createTime) }}</text>
          </view>
        </view>

        <view class="order-footer">
          <text class="footer-arrow">›</text>
        </view>
      </view>

      <!-- 空状态 -->
      <view v-if="orders.length === 0 && !loading" class="empty-state">
        <AdminIcon name="document" size="large" />
        <text class="empty-text">暂无采购单</text>
        <text class="empty-hint">点击右上角新建采购单</text>
      </view>

      <!-- 加载状态 -->
      <view v-if="loading" class="loading-wrapper">
        <view class="loading-spinner"></view>
        <text class="loading-text">加载中...</text>
      </view>

      <!-- 加载更多 -->
      <view v-if="hasMore && !loading && orders.length > 0" class="load-more" @click="loadMore">
        <text class="load-more-text">加载更多</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { onPullDownRefresh, onReachBottom } from '@dcloudio/uni-app'
import { callFunction } from '@/utils/cloudbase'
import AdminAuthManager from '@/utils/admin-auth'
import AdminIcon from '@/components/admin-icon.vue'

// 状态标签
const statusTabs = ref([
  { label: '全部', value: '', count: 0 },
  { label: '草稿', value: 'draft', count: 0 },
  { label: '待收货', value: 'pending', count: 0 },
  { label: '部分收货', value: 'partial', count: 0 },
  { label: '已完成', value: 'completed', count: 0 }
])

const currentStatus = ref('')
const orders = ref<any[]>([])
const loading = ref(false)
const page = ref(1)
const limit = 20
const hasMore = ref(true)

// 状态文本
const statusTextMap: Record<string, string> = {
  draft: '草稿',
  pending: '待收货',
  partial: '部分收货',
  received: '已收货',
  completed: '已完成',
  cancelled: '已取消'
}

const getStatusText = (status: string) => statusTextMap[status] || status

// 日期格式化
const formatDate = (date: string | Date) => {
  if (!date) return '-'
  const d = new Date(date)
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
}

// 生命周期
onMounted(() => {
  if (!AdminAuthManager.checkAuth()) return
  loadOrders()
})

// 下拉刷新
onPullDownRefresh(async () => {
  page.value = 1
  hasMore.value = true
  await loadOrders()
  uni.stopPullDownRefresh()
})

// 触底加载
onReachBottom(() => {
  if (hasMore.value && !loading.value) {
    loadMore()
  }
})

// 加载采购单列表
const loadOrders = async () => {
  if (loading.value) return
  loading.value = true

  try {
    const res = await callFunction('admin-api', {
      action: 'getPurchaseOrders',
      adminToken: AdminAuthManager.getToken(),
      data: {
        status: currentStatus.value || undefined,
        page: page.value,
        limit
      }
    })

    if (res.code === 0) {
      if (page.value === 1) {
        orders.value = res.data.list || []
      } else {
        orders.value = [...orders.value, ...(res.data.list || [])]
      }
      hasMore.value = res.data.hasMore
    } else {
      uni.showToast({ title: res.msg || '加载失败', icon: 'none' })
    }
  } catch (e) {
    console.error('加载采购单失败', e)
    uni.showToast({ title: '网络错误', icon: 'none' })
  } finally {
    loading.value = false
  }
}

// 切换状态
const changeStatus = (status: string) => {
  currentStatus.value = status
  page.value = 1
  hasMore.value = true
  loadOrders()
}

// 加载更多
const loadMore = () => {
  page.value++
  loadOrders()
}

// 跳转创建页面
const goToCreate = () => {
  uni.navigateTo({
    url: '/pagesAdmin/purchase/create'
  })
}

// 跳转详情页面
const goToDetail = (id: string) => {
  uni.navigateTo({
    url: `/pagesAdmin/purchase/detail?id=${id}`
  })
}
</script>

<style lang="scss" scoped>
.purchase-page {
  min-height: 100vh;
  background: #0D0D0D;
  padding: 24rpx;
  padding-bottom: 120rpx;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30rpx;
}

.page-title {
  font-size: 36rpx;
  font-weight: bold;
  color: #F5F5F0;
}

.add-btn {
  display: flex;
  align-items: center;
  gap: 8rpx;
  background: linear-gradient(145deg, #C8A464 0%, #A88B4A 100%);
  padding: 16rpx 24rpx;
  border-radius: 8rpx;
}

.add-icon {
  font-size: 28rpx;
  color: #1A1A1A;
  font-weight: bold;
}

.add-text {
  font-size: 24rpx;
  color: #1A1A1A;
}

.status-scroll {
  margin-bottom: 20rpx;
  white-space: nowrap;
}

.status-tabs {
  display: inline-flex;
  gap: 16rpx;
}

.status-tab {
  display: inline-flex;
  align-items: center;
  gap: 8rpx;
  padding: 16rpx 28rpx;
  background: rgba(255, 255, 255, 0.05);
  border: 1rpx solid rgba(201, 169, 98, 0.2);
  border-radius: 8rpx;
  font-size: 26rpx;
  color: rgba(245, 245, 240, 0.5);

  &.active {
    background: rgba(201, 169, 98, 0.2);
    border-color: #C9A962;
    color: #C9A962;
  }
}

.tab-count {
  font-size: 20rpx;
  background: rgba(201, 169, 98, 0.3);
  padding: 2rpx 10rpx;
  border-radius: 10rpx;
}

.purchase-list {
  margin-top: 10rpx;
}

.order-item {
  background: rgba(255, 255, 255, 0.03);
  border-radius: 16rpx;
  border: 1rpx solid rgba(201, 169, 98, 0.1);
  padding: 24rpx;
  margin-bottom: 20rpx;
}

.order-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20rpx;
  padding-bottom: 16rpx;
  border-bottom: 1rpx solid rgba(255, 255, 255, 0.05);
}

.order-no {
  font-size: 26rpx;
  font-weight: bold;
  color: #F5F5F0;
}

.order-status {
  padding: 6rpx 16rpx;
  border-radius: 6rpx;
  font-size: 22rpx;

  &.draft {
    background: rgba(150, 150, 150, 0.2);
    color: #999;
  }

  &.pending {
    background: rgba(201, 169, 98, 0.2);
    color: #C9A962;
  }

  &.partial {
    background: rgba(180, 140, 80, 0.2);
    color: #B48C50;
  }

  &.completed {
    background: rgba(122, 154, 142, 0.2);
    color: #7A9A8E;
  }

  &.cancelled {
    background: rgba(184, 92, 92, 0.2);
    color: #B85C5C;
  }
}

.order-info {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.info-label {
  font-size: 24rpx;
  color: rgba(245, 245, 240, 0.5);
}

.info-value {
  font-size: 24rpx;
  color: #F5F5F0;

  &.price {
    color: #C9A962;
    font-weight: bold;
  }
}

.order-footer {
  display: flex;
  justify-content: flex-end;
  margin-top: 16rpx;
  padding-top: 16rpx;
  border-top: 1rpx solid rgba(255, 255, 255, 0.05);
}

.footer-arrow {
  font-size: 32rpx;
  color: rgba(245, 245, 240, 0.3);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 100rpx 0;
}

.empty-text {
  font-size: 28rpx;
  color: rgba(245, 245, 240, 0.5);
  margin-top: 20rpx;
}

.empty-hint {
  font-size: 24rpx;
  color: rgba(245, 245, 240, 0.3);
  margin-top: 10rpx;
}

.loading-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40rpx 0;
}

.loading-spinner {
  width: 40rpx;
  height: 40rpx;
  border: 3rpx solid rgba(201, 169, 98, 0.3);
  border-top-color: #C9A962;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-text {
  font-size: 24rpx;
  color: rgba(245, 245, 240, 0.5);
  margin-top: 16rpx;
}

.load-more {
  display: flex;
  justify-content: center;
  padding: 30rpx 0;
}

.load-more-text {
  font-size: 24rpx;
  color: #C9A962;
}
</style>
