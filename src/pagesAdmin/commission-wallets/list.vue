<template>
  <view class="commission-wallets-page">
    <!-- 页面头部 -->
    <view class="page-header">
      <promotion-icon name="commission" size="large" />
      <view class="header-text">
        <text class="page-title">佣金钱包</text>
        <text class="page-subtitle">管理佣金结算与提现</text>
      </view>
    </view>

    <!-- 统计摘要 -->
    <view class="summary-cards">
      <view class="summary-card total">
        <text class="summary-value">¥{{ formatMoney(totalCommission) }}</text>
        <text class="summary-label">总佣金</text>
      </view>
      <view class="summary-card settled">
        <text class="summary-value">¥{{ formatMoney(settledCommission) }}</text>
        <text class="summary-label">已结算</text>
      </view>
      <view class="summary-card pending">
        <text class="summary-value">¥{{ formatMoney(pendingCommission) }}</text>
        <text class="summary-label">待结算</text>
      </view>
      <view class="summary-card withdrawn">
        <text class="summary-value">¥{{ formatMoney(withdrawnAmount) }}</text>
        <text class="summary-label">已提现</text>
      </view>
    </view>

    <!-- 筛选栏 -->
    <view class="filter-bar">
      <view class="filter-tabs">
        <view
          v-for="tab in statusTabs"
          :key="tab.value"
          class="filter-tab"
          :class="{ active: currentStatus === tab.value }"
          @click="handleStatusChange(tab.value)"
        >
          <text class="tab-label">{{ tab.label }}</text>
        </view>
      </view>

      <view class="type-selector" @click="showTypePicker">
        <text class="selector-text">{{ currentTypeLabel }}</text>
        <text class="selector-arrow">▼</text>
      </view>
    </view>

    <!-- 提现待审核提示 -->
    <view v-if="pendingWithdrawals > 0" class="pending-alert" @click="goToWithdrawals">
      <view class="alert-icon">
        <promotion-icon name="alert" />
      </view>
      <view class="alert-content">
        <text class="alert-title">{{ pendingWithdrawals }} 笔提现待审核</text>
        <text class="alert-desc">点击前往处理</text>
      </view>
      <text class="alert-arrow">›</text>
    </view>

    <!-- 佣金列表 -->
    <view class="commissions-list">
      <view
        v-for="item in commissions"
        :key="item._id"
        class="commission-item"
        @click="showCommissionDetail(item)"
      >
        <view class="commission-main">
          <view class="commission-icon">
            <promotion-icon :name="getCommissionIcon(item.rewardType)" />
          </view>
          <view class="commission-info">
            <text class="commission-type">{{ getCommissionTypeName(item.rewardType) }}</text>
            <text class="commission-user">{{ item.user?.nickName || '未知用户' }}</text>
            <text class="commission-time">{{ formatTime(item.createTime) }}</text>
            <text v-if="item.orderNo" class="commission-order">订单号: {{ item.orderNo }}</text>
          </view>
        </view>
        <view class="commission-amount">
          <text class="amount-value">+¥{{ formatMoney(item.amount) }}</text>
          <view :class="['status-badge', item.status]">
            {{ getStatusName(item.status) }}
          </view>
        </view>
      </view>

      <!-- 空状态 -->
      <view v-if="commissions.length === 0 && !loading" class="empty-state">
        <promotion-icon name="commission" size="large" />
        <text class="empty-text">暂无佣金记录</text>
      </view>

      <!-- 加载状态 -->
      <view v-if="loading" class="loading-wrapper">
        <view class="loading-spinner"></view>
        <text class="loading-text">加载中...</text>
      </view>
    </view>

    <!-- 加载更多 -->
    <view v-if="hasMore && !loading" class="load-more" @click="loadMore">
      <text class="load-more-text">加载更多</text>
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

/**
 * 佣金钱包管理页面
 * 功能：佣金统计、结算管理、提现审核
 */

// ==================== 数据状态 ====================

const commissions = ref<any[]>([])
const loading = ref(false)
const hasMore = ref(true)
const page = ref(1)
const currentStatus = ref('all')
const currentType = ref('all')

// 统计数据
const totalCommission = ref(0)
const settledCommission = ref(0)
const pendingCommission = ref(0)
const withdrawnAmount = ref(0)
const pendingWithdrawals = ref(0)

// 状态筛选选项 (reward_records 的有效状态)
const statusTabs = [
  { label: '全部', value: 'all' },
  { label: '待结算', value: 'pending' },
  { label: '已结算', value: 'settled' },
  { label: '已取消', value: 'cancelled' },
  { label: '已扣除', value: 'deducted' }
]

// 类型选项
const typeOptions = [
  { label: '全部类型', value: 'all' },
  { label: '基础佣金', value: 'basic' },
  { label: '复购奖励', value: 'repurchase' },
  { label: '团队管理奖', value: 'team' },
  { label: '育成津贴', value: 'nurture' }
]

const currentTypeLabel = computed(() => {
  return typeOptions.find(t => t.value === currentType.value)?.label || '全部类型'
})

// ==================== 生命周期 ====================

onMounted(() => {
  if (!AdminAuthManager.checkAuth()) return
  loadCommissions()
})

onPullDownRefresh(async () => {
  page.value = 1
  hasMore.value = true
  await loadCommissions(true)
  uni.stopPullDownRefresh()
})

onReachBottom(() => {
  if (hasMore.value && !loading.value) {
    loadMore()
  }
})

// ==================== 数据加载 ====================

/**
 * 加载佣金数据
 */
const loadCommissions = async (forceRefresh: boolean = false) => {
  if (loading.value) return

  try {
    loading.value = true

    const cacheKey = AdminCacheManager.getConfigKey('commission-wallets', {
      status: currentStatus.value,
      type: currentType.value
    })

    if (!forceRefresh && page.value === 1) {
      const cached = AdminCacheManager.get(cacheKey)
      if (cached) {
        commissions.value = cached.list
        updateStatistics(cached.stats)
        loading.value = false
        return
      }
    }

    const res = await callFunction('admin-api', {
      action: 'getCommissionWallets',
      adminToken: AdminAuthManager.getToken(),
      data: {
        page: page.value,
        limit: 20,
        status: currentStatus.value === 'all' ? undefined : currentStatus.value,
        type: currentType.value === 'all' ? undefined : currentType.value
      }
    })

    if (res.code === 0 && res.data) {
      const newList = res.data.list || []
      if (page.value === 1) {
        commissions.value = newList
      } else {
        commissions.value.push(...newList)
      }
      hasMore.value = newList.length >= 20

      // 更新统计
      const stats = {
        totalCommission: res.data.totalCommission || 0,
        settledCommission: res.data.settledCommission || 0,
        pendingCommission: res.data.pendingCommission || 0,
        withdrawnAmount: res.data.withdrawnAmount || 0,
        pendingWithdrawals: res.data.pendingWithdrawals || 0
      }
      updateStatistics(stats)

      // 缓存第一页
      if (page.value === 1) {
        AdminCacheManager.set(cacheKey, {
          list: commissions.value,
          stats
        }, CACHE_CONFIG.commission?.expire || 300)
      }
    } else {
      throw new Error(res.msg || '加载失败')
    }
  } catch (error: any) {
    console.error('加载佣金数据失败:', error)
    uni.showToast({
      title: error.message || '加载失败',
      icon: 'none'
    })
  } finally {
    loading.value = false
  }
}

/**
 * 更新统计数据
 */
const updateStatistics = (stats: any) => {
  totalCommission.value = stats.totalCommission || 0
  settledCommission.value = stats.settledCommission || 0
  pendingCommission.value = stats.pendingCommission || 0
  withdrawnAmount.value = stats.withdrawnAmount || 0
  pendingWithdrawals.value = stats.pendingWithdrawals || 0
}

/**
 * 加载更多
 */
const loadMore = () => {
  page.value++
  loadCommissions()
}

/**
 * 切换状态筛选
 */
const handleStatusChange = (status: string) => {
  currentStatus.value = status
  page.value = 1
  hasMore.value = true
  commissions.value = []
  loadCommissions(true)
}

/**
 * 显示类型选择器
 */
const showTypePicker = () => {
  uni.showActionSheet({
    itemList: typeOptions.map(t => t.label),
    success: (res) => {
      currentType.value = typeOptions[res.tapIndex].value
      page.value = 1
      commissions.value = []
      loadCommissions(true)
    }
  })
}

// ==================== 工具函数 ====================

/**
 * 格式化金额
 */
const formatMoney = (amount: number): string => {
  return (amount / 100).toFixed(2)
}

/**
 * 格式化时间
 */
const formatTime = (time: string | Date): string => {
  const date = new Date(time)
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

/**
 * 获取佣金类型名称
 */
const getCommissionTypeName = (type: string): string => {
  const names = {
    basic: '基础佣金',
    repurchase: '复购奖励',
    team: '团队管理奖',
    nurture: '育成津贴'
  }
  return names[type] || '未知类型'
}

/**
 * 获取佣金图标
 */
const getCommissionIcon = (type: string): string => {
  const icons = {
    basic: 'commission',
    repurchase: 'reward',
    team: 'team',
    nurture: 'growth'
  }
  return icons[type] || 'commission'
}

/**
 * 获取状态名称
 */
const getStatusName = (status: string): string => {
  const names = {
    pending: '待结算',
    settled: '已结算',
    cancelled: '已取消',
    deducted: '已扣除',
    success: '成功'
  }
  return names[status] || status
}

/**
 * 显示佣金详情
 */
const showCommissionDetail = (item: any) => {
  const content = `
佣金类型：${getCommissionTypeName(item.rewardType)}
佣金金额：¥${formatMoney(item.amount)}
所属用户：${item.user?.nickName || '未知'}
${item.orderNo ? `订单号：${item.orderNo}` : ''}
结算时间：${item.settleTime ? formatTime(item.settleTime) : '未结算'}
当前状态：${getStatusName(item.status)}
  `.trim()

  uni.showModal({
    title: '佣金详情',
    content,
    showCancel: false
  })
}

/**
 * 跳转到提现审核
 */
const goToWithdrawals = () => {
  uni.navigateTo({
    url: '/pagesAdmin/finance/index'
  })
}
</script>

<style scoped>
.commission-wallets-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #1A1A1A 0%, #0D0D0D 100%);
  padding: 24rpx;
  padding-bottom: 120rpx;
}

/* 页面头部 */
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

/* 统计卡片 */
.summary-cards {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
  margin-bottom: 24rpx;
}

.summary-card {
  flex: 1;
  min-width: 45%;
  padding: 24rpx;
  border-radius: 16rpx;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  align-items: center;
}

.summary-card.total {
  background: rgba(201, 169, 98, 0.1);
  border: 1rpx solid rgba(201, 169, 98, 0.2);
}

.summary-card.settled {
  background: rgba(122, 154, 142, 0.1);
  border: 1rpx solid rgba(122, 154, 142, 0.2);
}

.summary-card.pending {
  background: rgba(212, 165, 116, 0.1);
  border: 1rpx solid rgba(212, 165, 116, 0.2);
}

.summary-card.withdrawn {
  background: rgba(184, 140, 92, 0.1);
  border: 1rpx solid rgba(184, 140, 92, 0.2);
}

.summary-value {
  font-size: 36rpx;
  font-weight: 700;
  color: #C9A962;
}

.summary-label {
  font-size: 22rpx;
  color: rgba(245, 245, 240, 0.5);
}

/* 筛选栏 */
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

.filter-tab {
  padding: 12rpx 20rpx;
  background: rgba(255, 255, 255, 0.05);
  border: 1rpx solid rgba(201, 169, 98, 0.15);
  border-radius: 20rpx;
  transition: all 0.3s;
}

.filter-tab.active {
  background: rgba(201, 169, 98, 0.2);
  border-color: #C9A962;
}

.tab-label {
  font-size: 24rpx;
  color: rgba(245, 245, 240, 0.6);
}

.filter-tab.active .tab-label {
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

/* 提现待审核提示 */
.pending-alert {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 20rpx;
  background: rgba(212, 165, 116, 0.1);
  border: 1rpx solid rgba(212, 165, 116, 0.3);
  border-radius: 16rpx;
  margin-bottom: 24rpx;
}

.alert-icon {
  width: 48rpx;
  height: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(212, 165, 116, 0.2);
  border-radius: 12rpx;
  flex-shrink: 0;
}

.alert-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.alert-title {
  font-size: 28rpx;
  color: #F5F5F0;
  font-weight: 500;
}

.alert-desc {
  font-size: 22rpx;
  color: rgba(245, 245, 240, 0.5);
}

.alert-arrow {
  font-size: 32rpx;
  color: #C9A962;
}

/* 佣金列表 */
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

.commission-order {
  font-size: 20rpx;
  color: rgba(245, 245, 240, 0.35);
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

.status-badge.settled,
.status-badge.success {
  background: rgba(122, 154, 142, 0.2);
  color: #7A9A8E;
}

.status-badge.cancelled,
.status-badge.deducted {
  background: rgba(184, 92, 92, 0.2);
  color: #B85C5C;
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 120rpx 0;
  gap: 24rpx;
}

.empty-text {
  font-size: 26rpx;
  color: rgba(245, 245, 240, 0.4);
}

/* 加载状态 */
.loading-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 120rpx 0;
  gap: 24rpx;
}

.loading-spinner {
  width: 60rpx;
  height: 60rpx;
  border: 4rpx solid rgba(201, 169, 98, 0.3);
  border-top-color: #C9A962;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.loading-text {
  font-size: 26rpx;
  color: rgba(245, 245, 240, 0.5);
}

/* 加载更多 */
.load-more {
  padding: 32rpx;
  text-align: center;
}

.load-more-text {
  font-size: 26rpx;
  color: #C9A962;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
