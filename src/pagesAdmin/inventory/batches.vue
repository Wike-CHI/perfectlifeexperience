<template>
  <view class="batches-page">
    <!-- 页面头部 -->
    <view class="page-header">
      <text class="page-title">批次管理</text>
    </view>

    <!-- 状态统计 -->
    <view class="stats-cards">
      <view class="stat-card normal">
        <text class="stat-value">{{ stats.normal }}</text>
        <text class="stat-label">正常</text>
      </view>
      <view class="stat-card expiring">
        <text class="stat-value">{{ stats.expiring }}</text>
        <text class="stat-label">临期</text>
      </view>
      <view class="stat-card expired">
        <text class="stat-value">{{ stats.expired }}</text>
        <text class="stat-label">过期</text>
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
        </view>
      </view>
    </scroll-view>

    <!-- 批次列表 -->
    <view class="batch-list">
      <view v-for="batch in batches" :key="batch._id" class="batch-item">
        <view class="batch-header">
          <text class="batch-no">{{ batch.batchNo }}</text>
          <view :class="['batch-status', batch.status]">
            {{ getStatusText(batch.status) }}
          </view>
        </view>

        <view class="batch-info">
          <view class="info-row">
            <text class="info-label">商品</text>
            <text class="info-value">{{ batch.productName }}</text>
          </view>
          <view class="info-row">
            <text class="info-label">剩余/总数</text>
            <text class="info-value">{{ batch.remainingQuantity }} / {{ batch.quantity }}</text>
          </view>
          <view class="info-row">
            <text class="info-label">成本</text>
            <text class="info-value price">¥{{ ((batch.unitCost || 0) / 100).toFixed(2) }}</text>
          </view>
          <view class="info-row" v-if="batch.expiryDate">
            <text class="info-label">过期日期</text>
            <text class="info-value" :class="{ warning: isExpiring(batch) }">
              {{ formatDate(batch.expiryDate) }}
            </text>
          </view>
          <view class="info-row" v-if="batch.productionDate">
            <text class="info-label">生产日期</text>
            <text class="info-value">{{ formatDate(batch.productionDate) }}</text>
          </view>
        </view>
      </view>

      <!-- 空状态 -->
      <view v-if="batches.length === 0 && !loading" class="empty-state">
        <AdminIcon name="box" size="large" />
        <text class="empty-text">暂无批次数据</text>
      </view>

      <!-- 加载状态 -->
      <view v-if="loading" class="loading-wrapper">
        <view class="loading-spinner"></view>
        <text class="loading-text">加载中...</text>
      </view>

      <!-- 加载更多 -->
      <view v-if="hasMore && !loading && batches.length > 0" class="load-more" @click="loadMore">
        <text class="load-more-text">加载更多</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { onPullDownRefresh, onReachBottom } from '@dcloudio/uni-app'
import { callFunction } from '@/utils/cloudbase'
import AdminAuthManager from '@/utils/admin-auth'
import AdminIcon from '@/components/admin-icon.vue'

// 状态标签
const statusTabs = [
  { label: '全部', value: '' },
  { label: '正常', value: 'normal' },
  { label: '临期', value: 'expiring_soon' },
  { label: '过期', value: 'expired' }
]

const currentStatus = ref('')
const batches = ref<any[]>([])
const loading = ref(false)
const page = ref(1)
const limit = 20
const hasMore = ref(true)

// 统计数据
const stats = reactive({
  normal: 0,
  expiring: 0,
  expired: 0
})

// 状态文本
const statusTextMap: Record<string, string> = {
  normal: '正常',
  expiring_soon: '临期',
  expired: '过期'
}

const getStatusText = (status: string) => statusTextMap[status] || status

// 日期格式化
const formatDate = (date: string | Date) => {
  if (!date) return '-'
  const d = new Date(date)
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`
}

// 判断是否临期
const isExpiring = (batch: any) => {
  return batch.status === 'expiring_soon' || batch.status === 'expired'
}

// 生命周期
onMounted(() => {
  if (!AdminAuthManager.checkAuth()) return
  loadBatches()
  loadStats()
})

// 下拉刷新
onPullDownRefresh(async () => {
  page.value = 1
  hasMore.value = true
  await Promise.all([loadBatches(), loadStats()])
  uni.stopPullDownRefresh()
})

// 触底加载
onReachBottom(() => {
  if (hasMore.value && !loading.value) {
    loadMore()
  }
})

// 加载批次列表
const loadBatches = async () => {
  if (loading.value) return
  loading.value = true

  try {
    const res = await callFunction('admin-api', {
      action: 'getInventoryBatches',
      adminToken: AdminAuthManager.getToken(),
      data: {
        status: currentStatus.value || undefined,
        page: page.value,
        limit
      }
    })

    if (res.code === 0) {
      if (page.value === 1) {
        batches.value = res.data.list || []
      } else {
        batches.value = [...batches.value, ...(res.data.list || [])]
      }
      hasMore.value = res.data.hasMore
    } else {
      uni.showToast({ title: res.msg || '加载失败', icon: 'none' })
    }
  } catch (e) {
    console.error('加载批次失败', e)
    uni.showToast({ title: '网络错误', icon: 'none' })
  } finally {
    loading.value = false
  }
}

// 加载统计数据
const loadStats = async () => {
  try {
    const res = await callFunction('admin-api', {
      action: 'getInventoryOverview',
      adminToken: AdminAuthManager.getToken(),
      data: {}
    })

    if (res.code === 0) {
      // 这里需要额外查询各状态的数量
      // 暂时用库存总览的数据
    }
  } catch (e) {
    console.error('加载统计失败', e)
  }
}

// 切换状态
const changeStatus = (status: string) => {
  currentStatus.value = status
  page.value = 1
  hasMore.value = true
  loadBatches()
}

// 加载更多
const loadMore = () => {
  page.value++
  loadBatches()
}
</script>

<style lang="scss" scoped>
.batches-page {
  min-height: 100vh;
  background: #0D0D0D;
  padding: 24rpx;
  padding-bottom: 120rpx;
}

.page-header {
  margin-bottom: 24rpx;
}

.page-title {
  font-size: 36rpx;
  font-weight: bold;
  color: #F5F5F0;
}

.stats-cards {
  display: flex;
  gap: 16rpx;
  margin-bottom: 24rpx;
}

.stat-card {
  flex: 1;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 12rpx;
  padding: 24rpx;
  text-align: center;
  border: 1rpx solid rgba(201, 169, 98, 0.1);

  &.normal {
    border-color: rgba(122, 154, 142, 0.3);
  }

  &.expiring {
    border-color: rgba(201, 169, 98, 0.3);
  }

  &.expired {
    border-color: rgba(184, 92, 92, 0.3);
  }
}

.stat-value {
  font-size: 36rpx;
  font-weight: bold;
  color: #F5F5F0;
  display: block;
}

.stat-label {
  font-size: 22rpx;
  color: rgba(245, 245, 240, 0.5);
  margin-top: 8rpx;
  display: block;
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

.batch-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.batch-item {
  background: rgba(255, 255, 255, 0.03);
  border-radius: 16rpx;
  border: 1rpx solid rgba(201, 169, 98, 0.1);
  padding: 24rpx;
}

.batch-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
  padding-bottom: 16rpx;
  border-bottom: 1rpx solid rgba(255, 255, 255, 0.05);
}

.batch-no {
  font-size: 24rpx;
  color: rgba(245, 245, 240, 0.6);
}

.batch-status {
  padding: 6rpx 16rpx;
  border-radius: 6rpx;
  font-size: 22rpx;

  &.normal {
    background: rgba(122, 154, 142, 0.2);
    color: #7A9A8E;
  }

  &.expiring_soon {
    background: rgba(201, 169, 98, 0.2);
    color: #C9A962;
  }

  &.expired {
    background: rgba(184, 92, 92, 0.2);
    color: #B85C5C;
  }
}

.batch-info {
  display: flex;
  flex-direction: column;
  gap: 10rpx;
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
  }

  &.warning {
    color: #B85C5C;
  }
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
