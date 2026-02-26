<template>
  <view class="promotion-page">
    <!-- 页面头部 -->
    <view class="page-header">
      <view class="header-content">
        <promotion-icon name="growth" size="large" />
        <view class="header-text">
          <text class="page-title">推广管理</text>
          <text class="page-subtitle">查看推广数据与团队概况</text>
        </view>
      </view>
    </view>

    <!-- 推广概况卡片 -->
    <view class="overview-section">
      <view class="section-header">
        <promotion-icon name="chart" size="small" />
        <text class="section-title">推广概况</text>
      </view>

      <view class="stats-grid">
        <view class="stat-card promoters" @click="goToPromoters">
          <view class="stat-icon-wrapper">
            <promotion-icon name="promoters" />
          </view>
          <view class="stat-content">
            <text class="stat-value">{{ stats.totalPromoters }}</text>
            <text class="stat-label">推广员</text>
          </view>
        </view>

        <view class="stat-card teams">
          <view class="stat-icon-wrapper">
            <promotion-icon name="team" />
          </view>
          <view class="stat-content">
            <text class="stat-value">{{ stats.totalTeams }}</text>
            <text class="stat-label">团队数</text>
          </view>
        </view>

        <view class="stat-card commission">
          <view class="stat-icon-wrapper">
            <promotion-icon name="commission" />
          </view>
          <view class="stat-content">
            <text class="stat-value">¥{{ formatMoney(stats.totalRewards) }}</text>
            <text class="stat-label">总佣金</text>
          </view>
        </view>

        <view class="stat-card records">
          <view class="stat-icon-wrapper">
            <promotion-icon name="rank" />
          </view>
          <view class="stat-content">
            <text class="stat-value">{{ stats.totalRewards }}</text>
            <text class="stat-label">奖励记录</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 推广员列表 -->
    <view class="list-section">
      <view class="section-header">
        <promotion-icon name="users" size="small" />
        <text class="section-title">顶级推广员</text>
        <view class="more-link" @click="goToPromoters">
          <text class="more-text">查看全部</text>
          <text class="more-arrow">›</text>
        </view>
      </view>

      <view class="promoter-list">
        <view
          v-for="(promoter, index) in topPromoters"
          :key="promoter._id"
          class="promoter-item"
          @click="goToPromoterDetail(promoter._id)"
        >
          <view class="promoter-rank">{{ index + 1 }}</view>
          <view class="promoter-avatar">
            <image v-if="promoter.avatarUrl" :src="promoter.avatarUrl" class="avatar-image" />
            <view v-else class="avatar-placeholder">{{ promoter.nickName?.[0] || '?' }}</view>
          </view>
          <view class="promoter-info">
            <text class="promoter-name">{{ promoter.nickName || '未知用户' }}</text>
            <view class="promoter-meta">
              <view :class="['level-badge', 'star']">
                <promotion-icon name="level" size="small" />
                <text class="level-text">{{ getStarLevelName(promoter.starLevel) }}</text>
              </view>
              <view :class="['level-badge', 'agent']">
                <promotion-icon name="trophy" size="small" />
                <text class="level-text">{{ getAgentLevelName(promoter.agentLevel) }}</text>
              </view>
            </view>
          </view>
          <view class="promoter-stats">
            <promotion-icon name="sales" size="small" />
            <text class="stat-value">¥{{ formatMoney(promoter.performance?.totalSales || 0) }}</text>
          </view>
        </view>

        <view v-if="topPromoters.length === 0 && !loading" class="empty-state">
          <promotion-icon name="users" size="large" :color="'rgba(245, 245, 240, 0.2)'" />
          <text class="empty-text">暂无推广员数据</text>
        </view>
      </view>
    </view>

    <!-- 佣金明细 -->
    <view class="commission-section">
      <view class="section-header">
        <promotion-icon name="commission" size="small" />
        <text class="section-title">最近佣金</text>
        <view class="more-link" @click="goToCommissions">
          <text class="more-text">查看全部</text>
          <text class="more-arrow">›</text>
        </view>
      </view>

      <view class="commission-list">
        <view
          v-for="commission in recentCommissions"
          :key="commission._id"
          class="commission-item"
        >
          <view class="commission-main">
            <view class="commission-icon">
              <promotion-icon name="commission" size="small" />
            </view>
            <view class="commission-info">
              <text class="commission-type">{{ commission.rewardTypeName }}</text>
              <text class="commission-time">{{ formatTime(commission.createTime) }}</text>
            </view>
          </view>
          <view class="commission-amount">
            <text class="amount-value">+¥{{ formatMoney(commission.amount) }}</text>
            <view :class="['status-badge', commission.status]">
              <text class="status-text">{{ getStatusName(commission.status) }}</text>
            </view>
          </view>
        </view>

        <view v-if="recentCommissions.length === 0 && !loading" class="empty-state">
          <promotion-icon name="chart" size="large" :color="'rgba(245, 245, 240, 0.2)'" />
          <text class="empty-text">暂无佣金记录</text>
        </view>
      </view>
    </view>

    <!-- 加载状态 -->
    <view v-if="loading" class="loading-wrapper">
      <view class="loading-spinner"></view>
      <text class="loading-text">加载中...</text>
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
 * 推广管理页面 - 完整实现
 * 功能：展示推广概况、推广员列表、佣金明细
 */

// ==================== 数据状态 ====================

const stats = ref({
  totalPromoters: 0,
  totalTeams: 0,
  totalRewards: 0
})

const topPromoters = ref<any[]>([])
const recentCommissions = ref<any[]>([])
const loading = ref(false)
const hasMore = ref(true)
const page = ref(1)

// ==================== 生命周期 ====================

onMounted(() => {
  if (!AdminAuthManager.checkAuth()) return
  loadData(true)
})

onPullDownRefresh(async () => {
  await loadData(true)
  uni.stopPullDownRefresh()
})

onReachBottom(() => {
  if (hasMore.value && !loading.value) {
    page.value++
    loadCommissions()
  }
})

// ==================== 数据加载 ====================

/**
 * 加载所有数据
 */
const loadData = async (forceRefresh: boolean = false) => {
  try {
    loading.value = true

    // 尝试从缓存获取
    if (!forceRefresh) {
      const cached = AdminCacheManager.get('promotion-stats')
      if (cached) {
        updateStats(cached)
      }
    }

    // 并行加载数据
    const [statsResult, promotersResult, commissionsResult] = await Promise.allSettled([
      loadStats(),
      loadTopPromoters(),
      loadCommissions()
    ])

    // 缓存数据
    if (statsResult.status === 'fulfilled') {
      AdminCacheManager.set('promotion-stats', statsResult.value, CACHE_CONFIG.promotion.expire)
    }
  } catch (error: any) {
    console.error('加载推广数据失败:', error)
    uni.showToast({
      title: error.message || '加载失败',
      icon: 'none'
    })
  } finally {
    loading.value = false
  }
}

/**
 * 加载推广统计数据
 */
const loadStats = async () => {
  const res = await callFunction('admin-api', {
    action: 'getPromotionStats',
    adminToken: AdminAuthManager.getToken()
  })

  if (res.code === 0 && res.data) {
    updateStats(res.data)
    return res.data
  }
  throw new Error(res.msg || '加载统计失败')
}

/**
 * 加载顶级推广员
 */
const loadTopPromoters = async () => {
  const res = await callFunction('admin-api', {
    action: 'getPromoters',
    adminToken: AdminAuthManager.getToken(),
    data: {
      page: 1,
      pageSize: 5,
      sortBy: 'performance.totalSales',
      sortOrder: 'desc'
    }
  })

  if (res.code === 0 && res.data) {
    topPromoters.value = res.data.list || []
  }
}

/**
 * 加载佣金明细
 */
const loadCommissions = async () => {
  const res = await callFunction('admin-api', {
    action: 'getCommissions',
    adminToken: AdminAuthManager.getToken(),
    data: {
      page: page.value,
      limit: 10,
      dateRange: 'month'
    }
  })

  if (res.code === 0 && res.data) {
    if (page.value === 1) {
      recentCommissions.value = res.data.list || []
    } else {
      recentCommissions.value.push(...(res.data.list || []))
    }
    hasMore.value = (res.data.list || []).length >= 10
  }
}

/**
 * 更新统计数据
 */
const updateStats = (data: any) => {
  stats.value = {
    totalPromoters: data.totalPromoters || 0,
    totalTeams: data.totalTeams || 0,
    totalRewards: data.totalRewards || 0
  }
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
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (days === 0) return '今天'
  if (days === 1) return '昨天'
  if (days < 7) return `${days}天前`
  return date.toLocaleDateString('zh-CN')
}

/**
 * 获取星级名称
 */
const getStarLevelName = (level: number): string => {
  const names = ['普通会员', '铜牌推广员', '银牌推广员', '金牌推广员']
  return names[level] || '未知'
}

/**
 * 获取代理等级名称
 */
const getAgentLevelName = (level: number): string => {
  const names = ['非代理', '一级代理', '二级代理', '三级代理', '四级代理']
  return names[level] || '未知'
}

/**
 * 获取状态名称
 */
const getStatusName = (status: string): string => {
  const names = {
    pending: '待结算',
    settled: '已结算',
    cancelled: '已取消',
    deducted: '已扣除'
  }
  return names[status] || status
}

// ==================== 导航操作 ====================

/**
 * 跳转到推广员列表
 */
const goToPromoters = () => {
  uni.navigateTo({
    url: '/pagesAdmin/users/list?starLevel=1'
  })
}

/**
 * 跳转到推广员详情
 */
const goToPromoterDetail = (userId: string) => {
  uni.navigateTo({
    url: `/pagesAdmin/users/detail?id=${userId}`
  })
}

/**
 * 跳转到佣金列表
 */
const goToCommissions = () => {
  uni.navigateTo({
    url: '/pagesAdmin/commissions/list'
  })
}
</script>

<style scoped>
/* ==================== 页面容器 ==================== */
.promotion-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #1A1A1A 0%, #0D0D0D 100%);
  padding: 24rpx;
  padding-bottom: 120rpx;
}

/* ==================== 页面头部 ==================== */
.page-header {
  margin-bottom: 40rpx;
}

.header-content {
  display: flex;
  align-items: center;
  gap: 24rpx;
}

.header-text {
  flex: 1;
}

.page-title {
  display: block;
  font-size: 44rpx;
  font-weight: 700;
  color: #F5F5F0;
  letter-spacing: 2rpx;
  line-height: 1.3;
}

.page-subtitle {
  display: block;
  font-size: 24rpx;
  color: rgba(245, 245, 240, 0.5);
  margin-top: 8rpx;
}

/* ==================== 区块通用样式 ==================== */
.overview-section,
.list-section,
.commission-section {
  margin-bottom: 32rpx;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 20rpx;
}

.section-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #F5F5F0;
  letter-spacing: 1rpx;
}

.more-link {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 4rpx;
}

.more-text {
  font-size: 24rpx;
  color: #C9A962;
}

.more-arrow {
  font-size: 32rpx;
  color: #C9A962;
}

/* ==================== 统计卡片 ==================== */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16rpx;
}

.stat-card {
  display: flex;
  flex-direction: column;
  padding: 24rpx;
  background: rgba(255, 255, 255, 0.03);
  border: 1rpx solid rgba(201, 169, 98, 0.15);
  border-radius: 16rpx;
  transition: all 0.3s;
  position: relative;
  overflow: hidden;
}

.stat-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4rpx;
  background: linear-gradient(90deg, #C9A962 0%, #B8984A 100%);
  opacity: 0;
  transition: opacity 0.3s;
}

.stat-card:active {
  background: rgba(255, 255, 255, 0.05);
  transform: translateY(-2rpx);
}

.stat-card:active::before {
  opacity: 1;
}

.stat-icon-wrapper {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(201, 169, 98, 0.1);
  border-radius: 12rpx;
  margin-bottom: 16rpx;
}

.stat-content {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.stat-value {
  font-size: 40rpx;
  font-weight: 700;
  color: #F5F5F0;
  line-height: 1;
}

.stat-label {
  font-size: 24rpx;
  color: rgba(245, 245, 240, 0.5);
}

/* 特定卡片样式 */
.stat-card.promoters {
  border-color: rgba(201, 169, 98, 0.25);
}

.stat-card.promoters .stat-icon-wrapper {
  background: rgba(201, 169, 98, 0.15);
}

.stat-card.teams {
  border-color: rgba(122, 154, 142, 0.25);
}

.stat-card.teams .stat-icon-wrapper {
  background: rgba(122, 154, 142, 0.15);
}

.stat-card.commission {
  border-color: rgba(212, 165, 116, 0.25);
}

.stat-card.commission .stat-icon-wrapper {
  background: rgba(212, 165, 116, 0.15);
}

.stat-card.records {
  border-color: rgba(184, 140, 92, 0.25);
}

.stat-card.records .stat-icon-wrapper {
  background: rgba(184, 140, 92, 0.15);
}

/* ==================== 推广员列表 ==================== */
.promoter-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.promoter-item {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 20rpx;
  background: rgba(255, 255, 255, 0.03);
  border: 1rpx solid rgba(255, 255, 255, 0.05);
  border-radius: 16rpx;
  transition: all 0.3s;
}

.promoter-item:active {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(201, 169, 98, 0.3);
  transform: scale(0.98);
}

.promoter-rank {
  width: 48rpx;
  height: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #C9A962 0%, #B8984A 100%);
  border-radius: 12rpx;
  font-size: 24rpx;
  font-weight: 700;
  color: #1A1A1A;
  flex-shrink: 0;
}

.promoter-avatar {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
  background: rgba(201, 169, 98, 0.15);
  border: 2rpx solid rgba(201, 169, 98, 0.3);
}

.avatar-image {
  width: 100%;
  height: 100%;
}

.avatar-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32rpx;
  color: #C9A962;
  font-weight: 600;
  background: rgba(201, 169, 98, 0.1);
}

.promoter-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.promoter-name {
  font-size: 28rpx;
  color: #F5F5F0;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.promoter-meta {
  display: flex;
  gap: 8rpx;
}

.level-badge {
  display: flex;
  align-items: center;
  gap: 6rpx;
  padding: 4rpx 10rpx;
  border-radius: 6rpx;
}

.level-badge.star {
  background: rgba(201, 169, 98, 0.15);
  border: 1rpx solid rgba(201, 169, 98, 0.3);
}

.level-badge.star .level-text {
  font-size: 20rpx;
  color: #C9A962;
}

.level-badge.agent {
  background: rgba(122, 154, 142, 0.15);
  border: 1rpx solid rgba(122, 154, 142, 0.3);
}

.level-badge.agent .level-text {
  font-size: 20rpx;
  color: #7A9A8E;
}

.promoter-stats {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8rpx;
  flex-shrink: 0;
}

.promoter-stats .stat-value {
  font-size: 28rpx;
  font-weight: 700;
  color: #C9A962;
}

/* ==================== 佣金列表 ==================== */
.commission-list {
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

.commission-time {
  font-size: 22rpx;
  color: rgba(245, 245, 240, 0.4);
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
}

.status-badge.pending {
  background: rgba(212, 165, 116, 0.2);
  border: 1rpx solid rgba(212, 165, 116, 0.3);
}

.status-badge.pending .status-text {
  font-size: 20rpx;
  color: #D4A574;
}

.status-badge.settled {
  background: rgba(122, 154, 142, 0.2);
  border: 1rpx solid rgba(122, 154, 142, 0.3);
}

.status-badge.settled .status-text {
  font-size: 20rpx;
  color: #7A9A8E;
}

.status-badge.cancelled,
.status-badge.deducted {
  background: rgba(184, 92, 92, 0.2);
  border: 1rpx solid rgba(184, 92, 92, 0.3);
}

.status-badge.cancelled .status-text,
.status-badge.deducted .status-text {
  font-size: 20rpx;
  color: #B85C5C;
}

/* ==================== 空状态 ==================== */
.empty-state {
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

/* ==================== 加载状态 ==================== */
.loading-wrapper {
  padding: 100rpx 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24rpx;
}

.loading-spinner {
  width: 64rpx;
  height: 64rpx;
  border: 4rpx solid rgba(201, 169, 98, 0.2);
  border-top-color: #C9A962;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.loading-text {
  font-size: 26rpx;
  color: rgba(245, 245, 240, 0.5);
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
