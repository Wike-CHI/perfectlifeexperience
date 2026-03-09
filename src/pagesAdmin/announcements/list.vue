<template>
  <view class="announcements-page">
    <view class="page-header">
      <text class="page-title">公告管理</text>
      <view class="add-btn" @click="goToAdd">
        <text class="add-icon">+</text>
        <text class="add-text">添加公告</text>
      </view>
    </view>

    <!-- 公告列表 -->
    <view class="announcement-list">
      <view v-for="item in list" :key="item._id" class="list-item" @click="goToEdit(item._id)">
        <view class="item-header">
          <text class="item-title">{{ item.title }}</text>
          <text :class="['item-status', item.isActive ? 'active' : 'inactive']">
            {{ item.isActive ? '已发布' : '草稿' }}
          </text>
        </view>
        <text class="item-time">{{ formatDate(item.createTime) }}</text>
      </view>
    </view>

    <!-- 空状态 -->
    <view v-if="list.length === 0 && !loading" class="empty-state">
      <text class="empty-text">暂无公告</text>
      <view class="empty-action" @click="goToAdd">
        <text class="empty-action-text">创建第一个公告</text>
      </view>
    </view>

    <!-- 加载状态 -->
    <view v-if="loading" class="loading-wrapper">
      <view class="loading-spinner"></view>
      <text class="loading-text">加载中...</text>
    </view>

    <!-- 加载更多 -->
    <view v-if="hasMore && !loading" class="load-more" @click="loadMore">
      <text class="load-more-text">加载更多</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { onPullDownRefresh, onReachBottom } from '@dcloudio/uni-app'
import { useAdminList } from '@/composables/useAdmin'

/**
 * 公告管理列表页
 * 使用 useAdminList composable 简化代码
 */

// 使用 useAdminList
const {
  list,
  loading,
  hasMore,
  loadMore,
  refresh
} = useAdminList({
  action: 'getAnnouncements',
  cachePrefix: 'announcements',
  pageSize: 20,
  onLoaded: (data) => {
    console.log('公告列表加载完成', data.length)
  },
  onError: (error) => {
    console.error('加载公告失败', error)
  }
})

// 格式化日期
const formatDate = (date: string) => {
  if (!date) return ''
  return new Date(date).toLocaleDateString()
}

// 跳转到添加页面
const goToAdd = () => {
  uni.navigateTo({ url: '/pagesAdmin/announcements/edit' })
}

// 跳转到编辑页面
const goToEdit = (id: string) => {
  uni.navigateTo({ url: `/pagesAdmin/announcements/edit?id=${id}` })
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
.announcements-page {
  min-height: 100vh;
  background: #0D0D0D;
  padding: 24rpx;
  padding-bottom: 120rpx;
}

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

.add-btn {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 12rpx 24rpx;
  background: linear-gradient(145deg, #C8A464 0%, #A88B4A 100%);
  border-radius: 28rpx;
}

.add-icon {
  font-size: 32rpx;
  color: #0D0D0D;
  font-weight: 700;
}

.add-text {
  font-size: 26rpx;
  color: #0D0D0D;
  font-weight: 600;
}

/* 公告列表 */
.announcement-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.list-item {
  background: rgba(255, 255, 255, 0.03);
  border-radius: 16rpx;
  padding: 24rpx;
  border: 1rpx solid rgba(201, 169, 98, 0.1);
}

.item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12rpx;
}

.item-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #F5F5F0;
  flex: 1;
}

.item-status {
  padding: 6rpx 16rpx;
  border-radius: 8rpx;
  font-size: 22rpx;
}

.item-status.active {
  background: rgba(122, 154, 142, 0.2);
  color: #7A9A8E;
}

.item-status.inactive {
  background: rgba(201, 169, 98, 0.2);
  color: #C9A962;
}

.item-time {
  font-size: 22rpx;
  color: rgba(245, 245, 240, 0.4);
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

/* 加载更多 */
.load-more {
  text-align: center;
  padding: 32rpx;
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
