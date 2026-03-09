<template>
  <view class="coupons-page">
    <!-- 页面头部 -->
    <view class="page-header">
      <text class="page-title">优惠券管理</text>
      <view class="header-actions">
        <view class="action-btn" @click="goToCreate">
          <text class="action-icon">+</text>
          <text class="action-text">新建优惠券</text>
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

    <!-- 优惠券列表 -->
    <view class="coupon-list">
      <view
        v-for="coupon in list"
        :key="coupon._id"
        class="coupon-item"
        @click="goToEdit(coupon._id)"
      >
        <!-- 优惠券卡片 -->
        <view class="coupon-card">
          <!-- 左侧面值 -->
          <view class="coupon-left">
            <text class="coupon-value">{{ getCouponValue(coupon) }}</text>
            <text class="coupon-unit">{{ getCouponUnit(coupon) }}</text>
          </view>

          <!-- 右侧信息 -->
          <view class="coupon-right">
            <text class="coupon-name">{{ coupon.name }}</text>
            <text class="coupon-type">{{ getTypeName(coupon.type) }}</text>
            <view class="coupon-meta">
              <text class="meta-text">满{{ coupon.minAmount }}可用</text>
            </view>
            <view class="coupon-status">
              <text class="count-text">{{ coupon.receivedCount || 0 }}/{{ coupon.totalCount }}</text>
              <view :class="['status-badge', coupon.isActive ? 'active' : 'inactive']">
                <text class="status-text">{{ coupon.isActive ? '启用' : '禁用' }}</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 操作按钮 -->
        <view class="coupon-actions" @click.stop>
          <view
            class="action-btn-small"
            :class="{ active: coupon.isActive }"
            @click="toggleStatus(coupon)"
          >
            <text class="btn-text">{{ coupon.isActive ? '禁用' : '启用' }}</text>
          </view>
          <view class="action-btn-small delete" @click="deleteCoupon(coupon)">
            <text class="btn-text">删除</text>
          </view>
        </view>
      </view>

      <!-- 空状态 -->
      <view v-if="list.length === 0 && !loading" class="empty-state">
        <AdminIcon name="coupon" size="large" />
        <text class="empty-text">暂无优惠券</text>
        <view class="empty-action" @click="goToCreate">
          <text class="empty-action-text">创建第一个优惠券</text>
        </view>
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
import { ref, computed, onMounted, watch } from 'vue'
import { onPullDownRefresh, onReachBottom } from '@dcloudio/uni-app'
import { callFunction } from '@/utils/cloudbase'
import { useAdminList, useAdminAction } from '@/composables/useAdmin'
import AdminIcon from '@/components/admin-icon.vue'

/**
 * 优惠券管理列表页
 * 使用 useAdminList composable 简化代码
 */

// 状态筛选选项
const statusTabs = [
  { label: '全部', value: 'all' },
  { label: '启用', value: 'active' },
  { label: '禁用', value: 'inactive' }
]

const statusFilter = ref('all')

// 使用 useAdminList
const {
  list,
  loading,
  hasMore,
  loadMore,
  refresh
} = useAdminList({
  action: 'getCoupons',
  cachePrefix: 'coupons',
  pageSize: 20,
  extraParams: computed(() => ({
    status: statusFilter.value === 'all' ? undefined : statusFilter.value
  })),
  onLoaded: (data) => {
    console.log('优惠券列表加载完成', data.length)
  },
  onError: (error) => {
    console.error('加载优惠券失败', error)
  }
})

// 操作 Actions
const { execute: updateCoupon } = useAdminAction({
  action: 'updateCoupon',
  successMsg: '状态更新成功'
})

const { execute: deleteCouponAction } = useAdminAction({
  action: 'deleteCoupon',
  successMsg: '删除成功'
})

// 切换状态筛选
const changeStatusFilter = (status: string) => {
  statusFilter.value = status
}

// 监听状态变化
watch(statusFilter, () => {
  refresh()
})

// 切换优惠券状态
const toggleStatus = async (coupon: any) => {
  try {
    await updateCoupon({
      id: coupon._id,
      isActive: !coupon.isActive
    })
    // 更新本地状态
    coupon.isActive = !coupon.isActive
  } catch (error) {
    // 错误已由 useAdminAction 处理
  }
}

// 删除优惠券
const deleteCoupon = async (coupon: any) => {
  uni.showModal({
    title: '确认删除',
    content: `确定要删除优惠券 "${coupon.name}" 吗？`,
    success: async (res) => {
      if (res.confirm) {
        try {
          await deleteCouponAction({ id: coupon._id })
          refresh()
        } catch (error) {
          // 错误已由 useAdminAction 处理
        }
      }
    }
  })
}

// 工具函数
const getCouponValue = (coupon: any): string => {
  if (coupon.type === 'discount') {
    return coupon.value
  }
  return (coupon.value / 100).toFixed(0)
}

const getCouponUnit = (coupon: any): string => {
  if (coupon.type === 'amount' || coupon.type === 'no_threshold') {
    return '元'
  }
  if (coupon.type === 'discount') {
    return '折'
  }
  return ''
}

const getTypeName = (type: string): string => {
  const names: Record<string, string> = {
    amount: '满减券',
    discount: '折扣券',
    no_threshold: '无门槛券'
  }
  return names[type] || type
}

// 跳转到创建页面
const goToCreate = () => {
  uni.navigateTo({
    url: '/pagesAdmin/coupons/edit'
  })
}

// 跳转到编辑页面
const goToEdit = (id: string) => {
  uni.navigateTo({
    url: `/pagesAdmin/coupons/edit?id=${id}`
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
.coupons-page {
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

/* 优惠券列表 */
.coupon-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.coupon-item {
  background: rgba(255, 255, 255, 0.03);
  border-radius: 16rpx;
  overflow: hidden;
}

.coupon-card {
  display: flex;
  padding: 24rpx;
  background: linear-gradient(135deg, rgba(201, 169, 98, 0.1) 0%, rgba(201, 169, 98, 0.05) 100%);
  border-left: 4rpx solid #C9A962;
}

.coupon-left {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 0 24rpx;
  border-right: 1rpx dashed rgba(201, 169, 98, 0.3);
}

.coupon-value {
  font-size: 48rpx;
  font-weight: 700;
  color: #C9A962;
  line-height: 1;
}

.coupon-unit {
  font-size: 24rpx;
  color: #C9A962;
  margin-top: 4rpx;
}

.coupon-right {
  flex: 1;
  padding-left: 24rpx;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.coupon-name {
  font-size: 28rpx;
  color: #F5F5F0;
  font-weight: 600;
}

.coupon-type {
  font-size: 22rpx;
  color: rgba(245, 245, 240, 0.5);
  padding: 4rpx 12rpx;
  background: rgba(201, 169, 98, 0.1);
  border-radius: 8rpx;
  width: fit-content;
}

.coupon-meta {
  display: flex;
  gap: 12rpx;
}

.meta-text {
  font-size: 22rpx;
  color: rgba(245, 245, 240, 0.4);
}

.coupon-status {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.count-text {
  font-size: 22rpx;
  color: rgba(245, 245, 240, 0.5);
}

.status-badge {
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
  font-size: 20rpx;
}

.status-badge.active {
  background: rgba(122, 154, 142, 0.2);
}

.status-badge.active .status-text {
  color: #7A9A8E;
}

.status-badge.inactive {
  background: rgba(184, 92, 92, 0.2);
}

.status-badge.inactive .status-text {
  color: #B85C5C;
}

/* 操作按钮 */
.coupon-actions {
  display: flex;
  gap: 12rpx;
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

.action-btn-small.active {
  background: rgba(122, 154, 142, 0.2);
  border-color: rgba(122, 154, 142, 0.3);
}

.action-btn-small.delete {
  background: rgba(184, 92, 92, 0.1);
  border-color: rgba(184, 92, 92, 0.2);
}

.btn-text {
  font-size: 24rpx;
  color: rgba(245, 245, 240, 0.6);
}

.action-btn-small.active .btn-text {
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

.empty-icon {
  font-size: 80rpx;
  margin-bottom: 24rpx;
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

/* 加载更多 */
.load-more {
  text-align: center;
  padding: 32rpx;
}

.load-more-text {
  font-size: 26rpx;
  color: #C9A962;
}
</style>
