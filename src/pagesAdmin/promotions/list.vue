<template>
  <view class="promotions-page">
    <!-- 页面头部 -->
    <view class="page-header">
      <text class="page-title">活动管理</text>
      <view class="header-actions">
        <view class="action-btn" @click="goToCreate">
          <text class="action-icon">+</text>
          <text class="action-text">新建活动</text>
        </view>
      </view>
    </view>

    <!-- 筛选标签 -->
    <view class="filter-tabs">
      <view
        v-for="tab in statusTabs"
        :key="tab.value"
        class="filter-tab"
        :class="{ active: statusFilter === tab.value }"
        @click="changeStatusFilter(tab.value)"
      >
        <text class="tab-text">{{ tab.label }}</text>
      </view>
    </view>

    <!-- 活动列表 -->
    <view class="promotion-list">
      <view
        v-for="promotion in promotions"
        :key="promotion._id"
        class="promotion-item"
        @click="goToDetail(promotion._id)"
      >
        <!-- 活动卡片 -->
        <view class="promotion-card">
          <view class="promotion-header">
            <text class="promotion-name">{{ promotion.name }}</text>
            <view :class="['status-badge', getStatusClass(promotion)]">
              <text class="status-text">{{ getStatusText(promotion) }}</text>
            </view>
          </view>

          <text class="promotion-type">{{ getTypeName(promotion.type) }}</text>

          <view class="promotion-time">
            <text class="time-label">活动时间:</text>
            <text class="time-text">{{ formatTime(promotion.startTime) }} - {{ formatTime(promotion.endTime) }}</text>
          </view>

          <view class="promotion-meta">
            <text class="meta-text">{{ promotion.description || '暂无描述' }}</text>
          </view>

          <view class="promotion-stats">
            <view class="stat-item">
              <text class="stat-value">{{ promotion.productCount || 0 }}</text>
              <text class="stat-label">商品数</text>
            </view>
            <view class="stat-item">
              <text class="stat-value">{{ formatBudget(promotion.budget) }}</text>
              <text class="stat-label">预算</text>
            </view>
          </view>
        </view>

        <!-- 操作按钮 -->
        <view class="promotion-actions" @click.stop>
          <view
            class="action-btn-small"
            :class="{ active: promotion.status === 'active' }"
            @click="toggleStatus(promotion)"
          >
            <text class="btn-text">{{ promotion.status === 'active' ? '停用' : '启用' }}</text>
          </view>
          <view class="action-btn-small manage" @click="goToProducts(promotion._id)">
            <text class="btn-text">商品</text>
          </view>
          <view class="action-btn-small stats" @click="goToStats(promotion._id)">
            <text class="btn-text">统计</text>
          </view>
          <view class="action-btn-small delete" @click="deletePromotion(promotion)">
            <text class="btn-text">删除</text>
          </view>
        </view>
      </view>

      <!-- 空状态 -->
      <view v-if="promotions.length === 0 && !loading" class="empty-state">
        <AdminIcon name="celebration" size="large" variant="gold" />
        <text class="empty-text">暂无活动</text>
        <view class="empty-action" @click="goToCreate">
          <text class="empty-action-text">创建第一个活动</text>
        </view>
      </view>

      <!-- 加载状态 -->
      <view v-if="loading" class="loading-wrapper">
        <view class="loading-spinner"></view>
        <text class="loading-text">加载中...</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { onPullDownRefresh, onReachBottom } from '@dcloudio/uni-app'
import AdminAuthManager from '@/utils/admin-auth'
import AdminIcon from '@/components/admin-icon.vue'
import { callFunction } from '@/utils/cloudbase'

/**
 * 活动管理列表页
 */

// ==================== 数据状态 ====================

const promotions = ref<any[]>([])
const loading = ref(false)
const statusFilter = ref('all')
const page = ref(1)
const hasMore = ref(true)

// 状态筛选选项
const statusTabs = [
  { label: '全部', value: 'all' },
  { label: '草稿', value: 'draft' },
  { label: '进行中', value: 'active' },
  { label: '已结束', value: 'ended' }
]

// ==================== 生命周期 ====================

onMounted(() => {
  if (!AdminAuthManager.checkAuth()) return
  loadPromotions()
})

onPullDownRefresh(async () => {
  page.value = 1
  hasMore.value = true
  await loadPromotions()
  uni.stopPullDownRefresh()
})

onReachBottom(() => {
  if (hasMore.value && !loading.value) {
    page.value++
    loadPromotions()
  }
})

// ==================== 数据加载 ====================

/**
 * 加载活动列表
 */
const loadPromotions = async () => {
  try {
    loading.value = true

    const res = await callFunction('admin-api', {
      action: 'getPromotions',
      adminToken: AdminAuthManager.getToken(),
      data: {
        page: page.value,
        limit: 20,
        status: statusFilter.value === 'all' ? undefined : statusFilter.value
      }
    })

    if (res.code === 0 && res.data) {
      if (page.value === 1) {
        promotions.value = res.data.list || []
      } else {
        promotions.value.push(...(res.data.list || []))
      }
      hasMore.value = (res.data.list || []).length >= 20
    } else {
      throw new Error(res.msg || '加载失败')
    }
  } catch (error: any) {
    console.error('加载活动列表失败:', error)
    uni.showToast({
      title: error.message || '加载失败',
      icon: 'none'
    })
  } finally {
    loading.value = false
  }
}

// ==================== 操作函数 ====================

/**
 * 切换状态筛选
 */
const changeStatusFilter = (status: string) => {
  statusFilter.value = status
  page.value = 1
  hasMore.value = true
  loadPromotions()
}

/**
 * 切换活动状态
 */
const toggleStatus = async (promotion: any) => {
  const newStatus = promotion.status === 'active' ? 'ended' : 'active'

  try {
    const res = await callFunction('admin-api', {
      action: 'updatePromotion',
      adminToken: AdminAuthManager.getToken(),
      data: {
        id: promotion._id,
        status: newStatus
      }
    })

    if (res.code === 0) {
      promotion.status = newStatus
      uni.showToast({
        title: newStatus === 'active' ? '已启用' : '已停用',
        icon: 'success'
      })
    } else {
      throw new Error(res.msg || '操作失败')
    }
  } catch (error: any) {
    console.error('切换状态失败:', error)
    uni.showToast({
      title: error.message || '操作失败',
      icon: 'none'
    })
  }
}

/**
 * 删除活动
 */
const deletePromotion = async (promotion: any) => {
  uni.showModal({
    title: '确认删除',
    content: `确定要删除活动 "${promotion.name}" 吗？`,
    success: async (res) => {
      if (res.confirm) {
        try {
          const result = await callFunction('admin-api', {
            action: 'deletePromotion',
            adminToken: AdminAuthManager.getToken(),
            data: { id: promotion._id }
          })

          if (result.code === 0) {
            promotions.value = promotions.value.filter(p => p._id !== promotion._id)
            uni.showToast({
              title: '删除成功',
              icon: 'success'
            })
          } else {
            throw new Error(result.msg || '删除失败')
          }
        } catch (error: any) {
          console.error('删除活动失败:', error)
          uni.showToast({
            title: error.message || '删除失败',
            icon: 'none'
          })
        }
      }
    }
  })
}

// ==================== 导航函数 ====================

/**
 * 跳转到创建页面
 */
const goToCreate = () => {
  uni.navigateTo({
    url: '/pagesAdmin/promotions/edit'
  })
}

/**
 * 跳转到编辑页面
 */
const goToDetail = (id: string) => {
  uni.navigateTo({
    url: `/pagesAdmin/promotions/edit?id=${id}`
  })
}

/**
 * 跳转到商品管理
 */
const goToProducts = (id: string) => {
  uni.navigateTo({
    url: `/pagesAdmin/promotions/products?id=${id}`
  })
}

/**
 * 跳转到统计页面
 */
const goToStats = (id: string) => {
  uni.navigateTo({
    url: `/pagesAdmin/promotions/stats?id=${id}`
  })
}

// ==================== 工具函数 ====================

/**
 * 获取状态样式类
 */
const getStatusClass = (promotion: any): string => {
  if (promotion.status === 'active') return 'active'
  if (promotion.status === 'ended') return 'ended'
  return 'draft'
}

/**
 * 获取状态文本
 */
const getStatusText = (promotion: any): string => {
  const statusMap = {
    draft: '草稿',
    active: '进行中',
    ended: '已结束'
  }
  return statusMap[promotion.status] || promotion.status
}

/**
 * 获取类型名称
 */
const getTypeName = (type: string): string => {
  const typeMap = {
    discount: '折扣活动',
    flash_sale: '限时特惠',
    bundle: '组合优惠'
  }
  return typeMap[type] || type
}

/**
 * 格式化时间
 */
const formatTime = (date: Date | string): string => {
  const d = new Date(date)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

/**
 * 格式化预算
 */
const formatBudget = (budget: number): string => {
  if (!budget) return '未设置'
  return `¥${(budget / 100).toFixed(0)}`
}
</script>

<style scoped>
.promotions-page {
  min-height: 100vh;
  background: #0D0D0D;
  padding: 24rpx;
  padding-bottom: 120rpx;
}

/* 页面头部 */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24rpx;
}

.page-title {
  font-size: 48rpx;
  font-weight: 700;
  color: #F5F5F0;
  letter-spacing: 2rpx;
}

.header-actions {
  display: flex;
  gap: 16rpx;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 12rpx 24rpx;
  background: linear-gradient(145deg, #C8A464 0%, #A88B4A 100%);
  border-radius: 28rpx;
}

.action-icon {
  font-size: 32rpx;
  color: #0D0D0D;
  font-weight: 700;
}

.action-text {
  font-size: 26rpx;
  color: #0D0D0D;
  font-weight: 600;
}

/* 筛选标签 */
.filter-tabs {
  display: flex;
  gap: 16rpx;
  margin-bottom: 24rpx;
}

.filter-tab {
  padding: 12rpx 28rpx;
  background: rgba(255, 255, 255, 0.03);
  border: 1rpx solid rgba(201, 169, 98, 0.15);
  border-radius: 28rpx;
}

.filter-tab.active {
  background: linear-gradient(145deg, #C8A464 0%, #A88B4A 100%);
  border-color: transparent;
}

.tab-text {
  font-size: 26rpx;
  color: rgba(245, 245, 240, 0.6);
}

.filter-tab.active .tab-text {
  color: #0D0D0D;
  font-weight: 600;
}

/* 活动列表 */
.promotion-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.promotion-item {
  background: rgba(255, 255, 255, 0.03);
  border-radius: 16rpx;
  overflow: hidden;
}

.promotion-card {
  padding: 24rpx;
  background: linear-gradient(135deg, rgba(201, 169, 98, 0.1) 0%, rgba(201, 169, 98, 0.05) 100%);
  border-left: 4rpx solid #C9A962;
}

.promotion-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12rpx;
}

.promotion-name {
  font-size: 32rpx;
  color: #F5F5F0;
  font-weight: 600;
  flex: 1;
}

.status-badge {
  padding: 6rpx 16rpx;
  border-radius: 8rpx;
  font-size: 22rpx;
}

.status-badge.draft {
  background: rgba(201, 169, 98, 0.2);
}

.status-badge.draft .status-text {
  color: #C9A962;
}

.status-badge.active {
  background: rgba(122, 154, 142, 0.2);
}

.status-badge.active .status-text {
  color: #7A9A8E;
}

.status-badge.ended {
  background: rgba(245, 245, 240, 0.1);
}

.status-badge.ended .status-text {
  color: rgba(245, 245, 240, 0.5);
}

.promotion-type {
  font-size: 22rpx;
  color: rgba(245, 245, 240, 0.5);
  padding: 4rpx 12rpx;
  background: rgba(201, 169, 98, 0.1);
  border-radius: 8rpx;
  width: fit-content;
  margin-bottom: 12rpx;
}

.promotion-time {
  display: flex;
  gap: 8rpx;
  margin-bottom: 8rpx;
}

.time-label {
  font-size: 22rpx;
  color: rgba(245, 245, 240, 0.5);
}

.time-text {
  font-size: 22rpx;
  color: rgba(245, 245, 240, 0.7);
}

.promotion-meta {
  margin-bottom: 16rpx;
}

.meta-text {
  font-size: 24rpx;
  color: rgba(245, 245, 240, 0.5);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.promotion-stats {
  display: flex;
  gap: 24rpx;
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.stat-value {
  font-size: 28rpx;
  font-weight: 700;
  color: #C9A962;
}

.stat-label {
  font-size: 20rpx;
  color: rgba(245, 245, 240, 0.4);
}

/* 操作按钮 */
.promotion-actions {
  display: flex;
  gap: 8rpx;
  padding: 16rpx;
  border-top: 1rpx solid rgba(201, 169, 98, 0.1);
}

.action-btn-small {
  flex: 1;
  padding: 12rpx;
  text-align: center;
  background: rgba(201, 169, 98, 0.1);
  border: 1rpx solid rgba(201, 169, 98, 0.2);
  border-radius: 8rpx;
}

.action-btn-small.manage {
  background: rgba(201, 169, 98, 0.15);
}

.action-btn-small.stats {
  background: rgba(122, 154, 142, 0.15);
  border-color: rgba(122, 154, 142, 0.2);
}

.action-btn-small.delete {
  background: rgba(184, 92, 92, 0.1);
  border-color: rgba(184, 92, 92, 0.2);
}

.btn-text {
  font-size: 24rpx;
  color: rgba(245, 245, 240, 0.6);
}

.action-btn-small.manage .btn-text {
  color: #C9A962;
}

.action-btn-small.stats .btn-text {
  color: #7A9A8E;
}

.action-btn-small.delete .btn-text {
  color: #B85C5C;
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 120rpx 40rpx;
}

.empty-text {
  font-size: 26rpx;
  color: rgba(245, 245, 240, 0.4);
  margin-bottom: 32rpx;
}

.empty-action {
  padding: 12rpx 32rpx;
  background: linear-gradient(145deg, #C8A464 0%, #A88B4A 100%);
  border-radius: 28rpx;
}

.empty-action-text {
  font-size: 26rpx;
  color: #0D0D0D;
  font-weight: 600;
}

/* 加载状态 */
.loading-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 120rpx 0;
}

.loading-spinner {
  width: 60rpx;
  height: 60rpx;
  border: 4rpx solid rgba(201, 169, 98, 0.3);
  border-top-color: #C9A962;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-bottom: 24rpx;
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
