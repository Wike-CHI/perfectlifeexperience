<template>
  <view class="wallets-page">
    <!-- 页面头部 -->
    <view class="page-header">
      <text class="page-title">钱包管理</text>
    </view>

    <!-- 筛选标签 -->
    <view class="filter-tabs">
      <view
        v-for="tab in typeTabs"
        :key="tab.value"
        class="filter-tab"
        :class="{ active: currentType === tab.value }"
        @click="handleTypeChange(tab.value)"
      >
        <text class="tab-label">{{ tab.label }}</text>
      </view>
    </view>

    <!-- 统计摘要 -->
    <view class="summary-cards">
      <view class="summary-card">
        <text class="summary-value">¥{{ formatMoney(totalBalance) }}</text>
        <text class="summary-label">总余额</text>
      </view>
      <view class="summary-card">
        <text class="summary-value">¥{{ formatMoney(totalRecharge) }}</text>
        <text class="summary-label">总充值</text>
      </view>
      <view class="summary-card">
        <text class="summary-value">¥{{ formatMoney(totalConsume) }}</text>
        <text class="summary-label">总消费</text>
      </view>
    </view>

    <!-- 交易列表 -->
    <view class="transactions-list">
      <view
        v-for="item in transactions"
        :key="item._id"
        class="transaction-item"
        @click="showTransactionDetail(item)"
      >
        <view class="transaction-main">
          <view class="transaction-icon" :class="getTypeClass(item.type)">
            <text class="icon-text">{{ getTransactionIcon(item.type) }}</text>
          </view>
          <view class="transaction-info">
            <text class="transaction-type">{{ getTypeName(item.type) }}</text>
            <text class="transaction-user">{{ item.user?.nickName || '未知用户' }}</text>
            <text class="transaction-time">{{ formatTime(item.createTime) }}</text>
          </view>
        </view>
        <view class="transaction-amount">
          <text class="amount-value" :class="item.amount > 0 ? 'income' : 'expense'">
            {{ item.amount > 0 ? '+' : '' }}¥{{ formatMoney(Math.abs(item.amount)) }}
          </text>
          <view :class="['status-badge', item.status]">
            {{ getStatusName(item.status) }}
          </view>
        </view>
      </view>

      <!-- 空状态 -->
      <view v-if="transactions.length === 0 && !loading" class="empty-state">
        <text class="empty-icon">💳</text>
        <text class="empty-text">暂无交易记录</text>
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
import { ref, onMounted } from 'vue'
import { onPullDownRefresh, onReachBottom } from '@dcloudio/uni-app'
import AdminAuthManager from '@/utils/admin-auth'
import AdminCacheManager from '@/utils/admin-cache'
import { CACHE_CONFIG } from '@/utils/cache-config'
import { callFunction } from '@/utils/cloudbase'

/**
 * 钱包管理页面
 * 功能：查看所有用户的钱包交易记录、充值记录、余额统计
 */

// ==================== 数据状态 ====================

const transactions = ref<any[]>([])
const loading = ref(false)
const hasMore = ref(true)
const page = ref(1)
const currentType = ref('all')

// 统计数据
const totalBalance = ref(0)
const totalRecharge = ref(0)
const totalConsume = ref(0)

// 类型筛选选项
const typeTabs = [
  { label: '全部', value: 'all' },
  { label: '充值', value: 'recharge' },
  { label: '消费', value: 'consume' },
  { label: '退款', value: 'refund' },
  { label: '提现', value: 'withdraw' }
]

// ==================== 生命周期 ====================

onMounted(() => {
  if (!AdminAuthManager.checkAuth()) return
  loadTransactions()
})

onPullDownRefresh(async () => {
  page.value = 1
  hasMore.value = true
  await loadTransactions(true)
  uni.stopPullDownRefresh()
})

onReachBottom(() => {
  if (hasMore.value && !loading.value) {
    loadMore()
  }
})

// ==================== 数据加载 ====================

/**
 * 加载交易列表
 */
const loadTransactions = async (forceRefresh: boolean = false) => {
  if (loading.value) return

  try {
    loading.value = true

    const cacheKey = AdminCacheManager.getConfigKey('wallets', {
      type: currentType.value
    })

    if (!forceRefresh && page.value === 1) {
      const cached = AdminCacheManager.get(cacheKey)
      if (cached) {
        transactions.value = cached.list
        totalBalance.value = cached.totalBalance || 0
        totalRecharge.value = cached.totalRecharge || 0
        totalConsume.value = cached.totalConsume || 0
        return
      }
    }

    const res = await callFunction('admin-api', {
      action: 'getWalletTransactions',
      adminToken: AdminAuthManager.getToken(),
      data: {
        page: page.value,
        limit: 20,
        type: currentType.value === 'all' ? undefined : currentType.value
      }
    })

    if (res.code === 0 && res.data) {
      const newList = res.data.list || []
      if (page.value === 1) {
        transactions.value = newList
      } else {
        transactions.value.push(...newList)
      }
      hasMore.value = newList.length >= 20

      // 更新统计
      totalBalance.value = res.data.totalBalance || 0
      totalRecharge.value = res.data.totalRecharge || 0
      totalConsume.value = res.data.totalConsume || 0

      // 缓存第一页
      if (page.value === 1) {
        AdminCacheManager.set(cacheKey, {
          list: transactions.value,
          totalBalance: totalBalance.value,
          totalRecharge: totalRecharge.value,
          totalConsume: totalConsume.value
        }, CACHE_CONFIG.wallets?.expire || 300)
      }
    } else {
      throw new Error(res.msg || '加载失败')
    }
  } catch (error: any) {
    console.error('加载交易列表失败:', error)
    uni.showToast({
      title: error.message || '加载失败',
      icon: 'none'
    })
  } finally {
    loading.value = false
  }
}

/**
 * 加载更多
 */
const loadMore = () => {
  page.value++
  loadTransactions()
}

/**
 * 切换类型筛选
 */
const handleTypeChange = (type: string) => {
  currentType.value = type
  page.value = 1
  hasMore.value = true
  transactions.value = []
  loadTransactions(true)
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
 * 获取交易类型名称
 */
const getTypeName = (type: string): string => {
  const names = {
    recharge: '账户充值',
    consume: '订单支付',
    refund: '退款到账',
    withdraw: '提现'
  }
  return names[type] || '未知类型'
}

/**
 * 获取交易图标
 */
const getTransactionIcon = (type: string): string => {
  const icons = {
    recharge: '💰',
    consume: '🛒',
    refund: '↩️',
    withdraw: '💸'
  }
  return icons[type] || '💳'
}

/**
 * 获取类型样式类
 */
const getTypeClass = (type: string): string => {
  const classes = {
    recharge: 'income',
    consume: 'expense',
    refund: 'refund',
    withdraw: 'withdraw'
  }
  return classes[type] || 'default'
}

/**
 * 获取状态名称
 */
const getStatusName = (status: string): string => {
  const names = {
    pending: '待处理',
    success: '成功',
    failed: '失败',
    cancelled: '已取消'
  }
  return names[status] || status
}

/**
 * 显示交易详情
 */
const showTransactionDetail = (item: any) => {
  const content = `
交易类型：${getTypeName(item.type)}
交易金额：¥${formatMoney(item.amount)}
交易前余额：¥${formatMoney(item.balanceBefore || 0)}
交易后余额：¥${formatMoney(item.balanceAfter || 0)}
交易时间：${formatTime(item.createTime)}
交易状态：${getStatusName(item.status)}
${item.remark ? `备注：${item.remark}` : ''}
  `.trim()

  uni.showModal({
    title: '交易详情',
    content,
    showCancel: false
  })
}
</script>

<style scoped>
.wallets-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #1A1A1A 0%, #0D0D0D 100%);
  padding: 24rpx;
  padding-bottom: 120rpx;
}

/* 页面头部 */
.page-header {
  margin-bottom: 24rpx;
}

.page-title {
  font-size: 48rpx;
  font-weight: 700;
  color: #F5F5F0;
  letter-spacing: 2rpx;
}

/* 筛选标签 */
.filter-tabs {
  display: flex;
  gap: 12rpx;
  margin-bottom: 24rpx;
  overflow-x: auto;
}

.filter-tab {
  padding: 12rpx 24rpx;
  background: rgba(255, 255, 255, 0.05);
  border: 1rpx solid rgba(201, 169, 98, 0.15);
  border-radius: 24rpx;
  flex-shrink: 0;
  transition: all 0.3s;
}

.filter-tab.active {
  background: linear-gradient(145deg, #C8A464 0%, #A88B4A 100%);
  border-color: transparent;
}

.tab-label {
  font-size: 24rpx;
  color: rgba(245, 245, 240, 0.6);
}

.filter-tab.active .tab-label {
  color: #0D0D0D;
  font-weight: 600;
}

/* 统计卡片 */
.summary-cards {
  display: flex;
  gap: 16rpx;
  margin-bottom: 24rpx;
}

.summary-card {
  flex: 1;
  padding: 24rpx;
  background: rgba(201, 169, 98, 0.1);
  border: 1rpx solid rgba(201, 169, 98, 0.2);
  border-radius: 16rpx;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  align-items: center;
}

.summary-value {
  font-size: 32rpx;
  font-weight: 700;
  color: #C9A962;
}

.summary-label {
  font-size: 22rpx;
  color: rgba(245, 245, 240, 0.5);
}

/* 交易列表 */
.transactions-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.transaction-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20rpx;
  background: rgba(255, 255, 255, 0.03);
  border: 1rpx solid rgba(255, 255, 255, 0.05);
  border-radius: 16rpx;
  transition: all 0.3s;
}

.transaction-item:active {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(201, 169, 98, 0.3);
}

.transaction-main {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 16rpx;
  min-width: 0;
}

.transaction-icon {
  width: 56rpx;
  height: 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12rpx;
  flex-shrink: 0;
}

.transaction-icon.income {
  background: rgba(122, 154, 142, 0.15);
}

.transaction-icon.expense {
  background: rgba(212, 165, 116, 0.15);
}

.transaction-icon.refund {
  background: rgba(201, 169, 98, 0.15);
}

.transaction-icon.withdraw {
  background: rgba(184, 92, 92, 0.15);
}

.icon-text {
  font-size: 32rpx;
}

.transaction-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
  min-width: 0;
}

.transaction-type {
  font-size: 28rpx;
  color: #F5F5F0;
  font-weight: 500;
}

.transaction-user {
  font-size: 22rpx;
  color: rgba(245, 245, 240, 0.4);
}

.transaction-time {
  font-size: 20rpx;
  color: rgba(245, 245, 240, 0.3);
}

.transaction-amount {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8rpx;
  flex-shrink: 0;
}

.amount-value {
  font-size: 32rpx;
  font-weight: 700;
}

.amount-value.income {
  color: #7A9A8E;
}

.amount-value.expense {
  color: #F5F5F0;
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

.status-badge.success {
  background: rgba(122, 154, 142, 0.2);
  color: #7A9A8E;
}

.status-badge.failed,
.status-badge.cancelled {
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

.empty-icon {
  font-size: 80rpx;
  opacity: 0.3;
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
