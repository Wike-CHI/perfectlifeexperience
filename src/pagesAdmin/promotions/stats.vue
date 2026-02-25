<template>
  <view class="promotion-stats-page">
    <!-- 页面头部 -->
    <view class="page-header">
      <text class="page-title">活动统计</text>
    </view>

    <!-- 时间范围选择 -->
    <view class="time-filter">
      <view
        v-for="tab in timeTabs"
        :key="tab.value"
        class="time-tab"
        :class="{ active: timeFilter === tab.value }"
        @click="changeTimeFilter(tab.value)"
      >
        <text class="tab-text">{{ tab.label }}</text>
      </view>
    </view>

    <!-- 统计卡片 -->
    <view class="stats-cards">
      <view class="stat-card">
        <text class="stat-value">{{ formatNumber(totals.views || 0) }}</text>
        <text class="stat-label">浏览量</text>
      </view>
      <view class="stat-card">
        <text class="stat-value">{{ formatNumber(totals.orders || 0) }}</text>
        <text class="stat-label">订单数</text>
      </view>
      <view class="stat-card">
        <text class="stat-value">¥{{ formatMoney(totals.sales || 0) }}</text>
        <text class="stat-label">销售额</text>
      </view>
    </view>

    <!-- 趋势图表 -->
    <view class="chart-section">
      <text class="section-title">销售趋势</text>
      <view class="chart-container">
        <admin-chart
          type="line"
          :data="chartData"
          :options="chartOptions"
        />
      </view>
    </view>

    <!-- 详细数据列表 -->
    <view class="detail-section">
      <text class="section-title">详细数据</text>
      <view class="detail-list">
        <view
          v-for="item in dailyStats"
          :key="item.date"
          class="detail-item"
        >
          <text class="detail-date">{{ formatDate(item.date) }}</text>
          <view class="detail-values">
            <text class="detail-value">{{ item.views || 0 }} 浏览</text>
            <text class="detail-value">{{ item.orders || 0 }} 订单</text>
            <text class="detail-value highlight">¥{{ formatMoney(item.sales || 0) }}</text>
          </view>
        </view>

        <view v-if="dailyStats.length === 0 && !loading" class="empty-state">
          <text class="empty-text">暂无数据</text>
        </view>

        <view v-if="loading" class="loading-wrapper">
          <view class="loading-spinner"></view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { onPullDownRefresh } from '@dcloudio/uni-app'
import AdminAuthManager from '@/utils/admin-auth'
import { callFunction } from '@/utils/cloudbase'
import AdminChart from '@/components/admin-chart.vue'

const promotionId = ref('')
const loading = ref(false)
const timeFilter = ref('week')

const dailyStats = ref<any[]>([])
const totals = ref({
  views: 0,
  orders: 0,
  sales: 0
})

const timeTabs = [
  { label: '近7天', value: 'week' },
  { label: '近30天', value: 'month' },
  { label: '全部', value: 'all' }
]

onMounted(() => {
  if (!AdminAuthManager.checkAuth()) return
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1] as any
  const options = currentPage.options || {}
  if (options.id) {
    promotionId.value = options.id
    loadStats()
  }
})

onPullDownRefresh(async () => {
  await loadStats()
  uni.stopPullDownRefresh()
})

const loadStats = async () => {
  try {
    loading.value = true

    const now = new Date()
    let startDate = null

    if (timeFilter.value === 'week') {
      startDate = new Date(now)
      startDate.setDate(now.getDate() - 7)
    } else if (timeFilter.value === 'month') {
      startDate = new Date(now)
      startDate.setDate(now.getDate() - 30)
    }

    const res = await callFunction('admin-api', {
      action: 'getPromotionActivityStats',
      adminToken: AdminAuthManager.getToken(),
      data: {
        promotionId: promotionId.value,
        startDate: startDate ? startDate.toISOString() : undefined,
        endDate: now.toISOString()
      }
    })

    if (res.code === 0) {
      dailyStats.value = res.data.daily || []
      totals.value = res.data.totals || { views: 0, orders: 0, sales: 0 }
    }
  } catch (error: any) {
    console.error('加载统计数据失败:', error)
  } finally {
    loading.value = false
  }
}

const changeTimeFilter = (filter: string) => {
  timeFilter.value = filter
  loadStats()
}

const chartData = computed(() => {
  return {
    labels: dailyStats.value.map(item => formatDate(item.date)),
    datasets: [
      {
        label: '销售额',
        data: dailyStats.value.map(item => (item.sales || 0) / 100),
        color: '#C9A962'
      },
      {
        label: '订单数',
        data: dailyStats.value.map(item => item.orders || 0),
        color: '#7A9A8E'
      }
    ]
  }
})

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  scales: {
    y: {
      beginAtZero: true
    }
  }
}

const formatNumber = (num: number): string => {
  if (num >= 10000) {
    return (num / 10000).toFixed(1) + 'w'
  }
  return num.toString()
}

const formatMoney = (cents: number): string => {
  return (cents / 100).toFixed(2)
}

const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr)
  return `${date.getMonth() + 1}/${date.getDate()}`
}
</script>

<style scoped>
.promotion-stats-page {
  min-height: 100vh;
  background: #0D0D0D;
  padding: 24rpx;
  padding-bottom: 120rpx;
}

.page-header {
  margin-bottom: 24rpx;
}

.page-title {
  font-size: 48rpx;
  font-weight: 700;
  color: #F5F5F0;
  letter-spacing: 2rpx;
}

/* 时间筛选 */
.time-filter {
  display: flex;
  gap: 16rpx;
  margin-bottom: 24rpx;
}

.time-tab {
  flex: 1;
  padding: 12rpx;
  text-align: center;
  background: rgba(255, 255, 255, 0.03);
  border: 1rpx solid rgba(201, 169, 98, 0.15);
  border-radius: 12rpx;
}

.time-tab.active {
  background: linear-gradient(145deg, #C8A464 0%, #A88B4A 100%);
  border-color: transparent;
}

.tab-text {
  font-size: 24rpx;
  color: rgba(245, 245, 240, 0.6);
}

.time-tab.active .tab-text {
  color: #0D0D0D;
  font-weight: 600;
}

/* 统计卡片 */
.stats-cards {
  display: flex;
  gap: 16rpx;
  margin-bottom: 32rpx;
}

.stat-card {
  flex: 1;
  padding: 24rpx 16rpx;
  background: rgba(255, 255, 255, 0.03);
  border: 1rpx solid rgba(201, 169, 98, 0.15);
  border-radius: 16rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
}

.stat-value {
  font-size: 32rpx;
  font-weight: 700;
  color: #C9A962;
}

.stat-label {
  font-size: 22rpx;
  color: rgba(245, 245, 240, 0.5);
}

/* 图表 */
.chart-section {
  margin-bottom: 32rpx;
}

.section-title {
  display: block;
  font-size: 28rpx;
  color: rgba(245, 245, 240, 0.8);
  margin-bottom: 16rpx;
}

.chart-container {
  height: 400rpx;
  background: rgba(255, 255, 255, 0.02);
  border: 1rpx solid rgba(201, 169, 98, 0.1);
  border-radius: 16rpx;
  padding: 16rpx;
}

/* 详细数据 */
.detail-section {
  margin-bottom: 32rpx;
}

.detail-list {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16rpx;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 12rpx;
}

.detail-date {
  font-size: 24rpx;
  color: rgba(245, 245, 240, 0.6);
  width: 120rpx;
}

.detail-values {
  display: flex;
  gap: 24rpx;
}

.detail-value {
  font-size: 24rpx;
  color: rgba(245, 245, 240, 0.5);
}

.detail-value.highlight {
  color: #C9A962;
  font-weight: 600;
}

/* 空状态 */
.empty-state {
  padding: 60rpx 40rpx;
  text-align: center;
}

.empty-text {
  font-size: 26rpx;
  color: rgba(245, 245, 240, 0.4);
}

/* 加载状态 */
.loading-wrapper {
  padding: 60rpx 0;
  display: flex;
  justify-content: center;
}

.loading-spinner {
  width: 60rpx;
  height: 60rpx;
  border: 4rpx solid rgba(201, 169, 98, 0.3);
  border-top-color: #C9A962;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
