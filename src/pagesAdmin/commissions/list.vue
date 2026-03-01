<template>
  <view class="commissions-page">
    <!-- 页面头部 -->
    <view class="page-header">
      <promotion-icon name="commission" size="large" />
      <view class="header-text">
        <text class="page-title">佣金明细</text>
        <text class="page-subtitle">查看所有佣金记录</text>
      </view>
    </view>

    <!-- 筛选栏 -->
    <view class="filter-bar">
      <view class="filter-tabs">
        <view
          v-for="tab in dateTabs"
          :key="tab.value"
          :class="['tab-item', { active: currentDateRange === tab.value }]"
          @click="handleDateRangeChange(tab.value)"
        >
          <text class="tab-label">{{ tab.label }}</text>
        </view>
      </view>

      <view class="type-selector" @click="showTypePicker">
        <text class="selector-text">{{ currentTypeLabel }}</text>
        <text class="selector-arrow">▼</text>
      </view>
    </view>

    <!-- 统计摘要 -->
    <view class="summary-card">
      <view class="summary-item">
        <text class="summary-label">总佣金</text>
        <text class="summary-value">¥{{ formatMoney(summary.totalCommission) }}</text>
      </view>
      <view class="summary-item">
        <text class="summary-label">待结算</text>
        <text class="summary-value">¥{{ formatMoney(summary.pendingCommission) }}</text>
      </view>
      <view class="summary-item">
        <text class="summary-label">已结算</text>
        <text class="summary-value">¥{{ formatMoney(summary.settledCommission) }}</text>
      </view>
    </view>

    <!-- 佣金列表 -->
    <view class="commissions-list">
      <view
        v-for="commission in commissions"
        :key="commission._id"
        class="commission-item"
        @click="goToCommissionDetail(commission)"
      >
        <view class="commission-main">
          <view class="commission-icon">
            <promotion-icon :name="getCommissionIcon(commission.rewardType)" />
          </view>
          <view class="commission-info">
            <text class="commission-type">{{ getCommissionTypeName(commission.rewardType) }}</text>
            <text class="commission-user">{{ commission.user?.nickName || '未知用户' }}</text>
            <text class="commission-time">{{ formatTime(commission.createTime) }}</text>
          </view>
        </view>
        <view class="commission-amount">
          <text class="amount-value">+¥{{ formatMoney(commission.amount) }}</text>
          <view :class="['status-badge', commission.status]">
            {{ getStatusName(commission.status) }}
          </view>
        </view>
      </view>

      <view v-if="commissions.length === 0 && !loading" class="empty-state">
        <promotion-icon name="commission" size="large" />
        <text class="empty-text">暂无佣金记录</text>
      </view>

      <view v-if="loading" class="loading-state">
        <text>加载中...</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { onPullDownRefresh, onReachBottom } from '@dcloudio/uni-app'
import AdminAuthManager from '@/utils/admin-auth'
import AdminCacheManager from '@/utils/admin-cache'
import { CACHE_CONFIG } from '@/utils/cache-config'
import { callFunction } from '@/utils/cloudbase'
import PromotionIcon from '@/components/promotion-icon.vue'

// 数据状态
const commissions = ref<any[]>([])
const summary = ref({
  totalCommission: 0,
  pendingCommission: 0,
  settledCommission: 0
})

const currentDateRange = ref('month')
const currentType = ref('all')
const loading = ref(false)
const hasMore = ref(true)
const page = ref(1)

// 时间范围选项
const dateTabs = [
  { label: '今日', value: 'today' },
  { label: '本周', value: 'week' },
  { label: '本月', value: 'month' },
  { label: '上月', value: 'lastMonth' },
  { label: '全部', value: 'all' }
]

// 类型选项
const typeOptions = [
  { label: '全部类型', value: 'all' },
  { label: '推广佣金', value: 'commission' }
]

const currentTypeLabel = computed(() => {
  return typeOptions.find(t => t.value === currentType.value)?.label || '全部类型'
})

// 生命周期
onMounted(() => {
  if (!AdminAuthManager.checkAuth()) return
  loadCommissions()
})

onPullDownRefresh(async () => {
  await loadCommissions(true)
  uni.stopPullDownRefresh()
})

onReachBottom(() => {
  if (hasMore.value && !loading.value) {
    page.value++
    loadCommissions()
  }
})

// 加载佣金数据
const loadCommissions = async (forceRefresh: boolean = false) => {
  try {
    loading.value = true

    const cacheKey = AdminCacheManager.getConfigKey('commissions', {
      dateRange: currentDateRange.value,
      type: currentType.value
    })

    if (!forceRefresh && page.value === 1) {
      const cached = AdminCacheManager.get(cacheKey)
      if (cached) {
        commissions.value = cached.list
        summary.value = cached.summary
        loading.value = false
        return
      }
    }

    const res = await callFunction('admin-api', {
      action: 'getCommissions',
      adminToken: AdminAuthManager.getToken(),
      data: {
        page: page.value,
        limit: 20,
        type: currentType.value === 'all' ? undefined : currentType.value,
        dateRange: currentDateRange.value === 'all' ? undefined : currentDateRange.value
      }
    })

    if (res.code === 0 && res.data) {
      if (page.value === 1) {
        commissions.value = res.data.list || []
        summary.value = res.data.summary || {}
      } else {
        commissions.value.push(...(res.data.list || []))
      }
      hasMore.value = (res.data.list || []).length >= 20

      // 缓存第一页
      if (page.value === 1) {
        AdminCacheManager.set(cacheKey, {
          list: commissions.value,
          summary: summary.value
        }, CACHE_CONFIG.promotion.expire)
      }
    } else {
      uni.showToast({
        title: res.msg || '加载失败',
        icon: 'none'
      })
    }
  } catch (error: any) {
    console.error('加载佣金失败:', error)
    uni.showToast({
      title: error.message || '加载失败',
      icon: 'none'
    })
  } finally {
    loading.value = false
  }
}

// 切换时间范围
const handleDateRangeChange = (range: string) => {
  currentDateRange.value = range
  page.value = 1
  commissions.value = []
  loadCommissions()
}

// 显示类型选择器
const showTypePicker = () => {
  // 使用uni.showActionSheet替代原生picker
  uni.showActionSheet({
    itemList: typeOptions.map(t => t.label),
    success: (res) => {
      currentType.value = typeOptions[res.tapIndex].value
      page.value = 1
      commissions.value = []
      loadCommissions()
    }
  })
}

// 工具函数
const formatMoney = (amount: number): string => {
  return (amount / 100).toFixed(2)
}

const formatTime = (time: string | Date): string => {
  const date = new Date(time)
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const getCommissionIcon = (type: string): string => {
  return 'commission'
}

const getCommissionTypeName = (type: string): string => {
  return '推广佣金'
}

const getStatusName = (status: string): string => {
  const names = {
    pending: '待结算',
    settled: '已结算',
    cancelled: '已取消',
    deducted: '已扣除'
  }
  return names[status] || status
}

// 跳转到详情
const goToCommissionDetail = (commission: any) => {
  if (commission.orderId) {
    uni.navigateTo({
      url: `/pagesAdmin/orders/detail?id=${commission.orderId}`
    })
  }
}
</script>

<style scoped>
.commissions-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #1A1A1A 0%, #0D0D0D 100%);
  padding: 24rpx;
  padding-bottom: 120rpx;
}

.page-header {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 24rpx;
}

.header-text {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.page-title {
  font-size: 44rpx;
  font-weight: 700;
  color: #F5F5F0;
}

.page-subtitle {
  font-size: 24rpx;
  color: rgba(245, 245, 240, 0.5);
}

.filter-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24rpx;
  gap: 16rpx;
}

.filter-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  flex: 1;
}

.tab-item {
  padding: 12rpx 20rpx;
  background: rgba(255, 255, 255, 0.05);
  border: 1rpx solid rgba(201, 169, 98, 0.2);
  border-radius: 20rpx;
  transition: all 0.3s;
}

.tab-item.active {
  background: rgba(201, 169, 98, 0.2);
  border-color: #C9A962;
}

.tab-label {
  font-size: 24rpx;
  color: rgba(245, 245, 240, 0.6);
}

.tab-item.active .tab-label {
  color: #C9A962;
  font-weight: 600;
}

.type-selector {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 12rpx 20rpx;
  background: rgba(201, 169, 98, 0.1);
  border: 1rpx solid rgba(201, 169, 98, 0.3);
  border-radius: 20rpx;
  flex-shrink: 0;
}

.selector-text {
  font-size: 24rpx;
  color: #C9A962;
}

.selector-arrow {
  font-size: 16rpx;
  color: #C9A962;
}

.summary-card {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
  padding: 24rpx;
  background: rgba(201, 169, 98, 0.1);
  border: 1rpx solid rgba(201, 169, 98, 0.2);
  border-radius: 16rpx;
  margin-bottom: 24rpx;
}

.summary-item {
  flex: 1;
  min-width: 45%;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.summary-label {
  font-size: 22rpx;
  color: rgba(245, 245, 240, 0.5);
}

.summary-value {
  font-size: 32rpx;
  font-weight: 700;
  color: #C9A962;
}

.commissions-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.commission-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20rpx;
  background: rgba(255, 255, 255, 0.03);
  border: 1rpx solid rgba(255, 255, 255, 0.05);
  border-radius: 16rpx;
  transition: all 0.3s;
}

.commission-item:active {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(201, 169, 98, 0.3);
}

.commission-main {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 16rpx;
  min-width: 0;
}

.commission-icon {
  width: 48rpx;
  height: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(212, 165, 116, 0.15);
  border-radius: 12rpx;
  flex-shrink: 0;
}

.commission-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
  min-width: 0;
}

.commission-type {
  font-size: 28rpx;
  color: #F5F5F0;
  font-weight: 500;
}

.commission-user {
  font-size: 22rpx;
  color: rgba(245, 245, 240, 0.4);
}

.commission-time {
  font-size: 20rpx;
  color: rgba(245, 245, 240, 0.3);
}

.commission-amount {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8rpx;
  flex-shrink: 0;
}

.amount-value {
  font-size: 32rpx;
  font-weight: 700;
  color: #7A9A8E;
}

.status-badge {
  padding: 6rpx 12rpx;
  border-radius: 8rpx;
  font-size: 20rpx;
}

.status-badge.pending {
  background: rgba(212, 165, 116, 0.2);
  color: #D4A574;
}

.status-badge.settled {
  background: rgba(122, 154, 142, 0.2);
  color: #7A9A8E;
}

.status-badge.cancelled,
.status-badge.deducted {
  background: rgba(184, 92, 92, 0.2);
  color: #B85C5C;
}

.empty-state,
.loading-state {
  padding: 100rpx 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24rpx;
}

.empty-text {
  font-size: 26rpx;
  color: rgba(245, 245, 240, 0.4);
}
</style>
