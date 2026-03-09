<template>
  <view class="users-page">
    <view class="page-header">
      <text class="page-title">用户管理</text>
    </view>

    <admin-search
      placeholder="搜索昵称或手机号"
      :debounce="500"
      @search="handleSearch"
    />

    <view class="users-list">
      <view v-for="user in list" :key="user._id" class="user-item" @click="goToDetail(user._id)">
        <image class="avatar" :src="user.avatarUrl" mode="aspectFill" />
        <view class="user-info">
          <text class="nickname">{{ user.nickName || '未设置' }}</text>
          <text class="openid">{{ user._openid }}</text>
        </view>
        <view class="user-badges">
          <text :class="['badge', 'level-' + user.agentLevel]">{{ getAgentLevelName(user.agentLevel) }}</text>
        </view>
      </view>
    </view>

    <!-- 空状态 -->
    <view v-if="list.length === 0 && !loading" class="empty-state">
      <text class="empty-text">暂无用户</text>
    </view>

    <!-- 加载状态 -->
    <view v-if="loading" class="loading-state">
      <text class="loading-text">加载中...</text>
    </view>

    <!-- 加载更多 -->
    <view v-if="hasMore && !loading" class="load-more" @click="loadMore">
      <text class="load-more-text">加载更多</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import AdminSearch from '@/components/admin-search.vue'
import { batchConvertCloudUrls } from '@/utils/image'
import { useAdminList } from '@/composables/useAdmin'

/**
 * 用户管理页面
 * 使用 useAdminList composable 简化代码
 */

// 代理等级名称映射
const AGENT_LEVEL_NAMES: Record<number, string> = {
  0: '总公司',
  1: '金牌',
  2: '银牌',
  3: '铜牌',
  4: '普通'
}

const getAgentLevelName = (level: number): string => {
  return AGENT_LEVEL_NAMES[level] || '普通'
}

// 使用 composable
const {
  list,
  loading,
  hasMore,
  search,
  loadMore,
  refresh,
  init
} = useAdminList({
  action: 'getUsers',
  cachePrefix: 'users',
  pageSize: 20,
  transform: async (data) => {
    // 转换云存储URL
    if (data.list?.length) {
      const users = await batchConvertCloudUrls(
        data.list,
        'avatarUrl',
        'avatar'
      )
      return { ...data, list: users }
    }
    return data
  },
  onLoaded: (users) => {
    console.log('用户列表加载完成', users.length)
  }
})

// 跳转到用户详情
const goToDetail = (userId: string) => {
  uni.navigateTo({
    url: `/pagesAdmin/users/detail?id=${userId}`
  })
}

// 搜索
const handleSearch = (keyword: string) => {
  search(keyword)
}

// 初始化
onMounted(() => {
  init()
})
</script>

<style scoped>
.users-page {
  min-height: 100vh;
  background: #f5f5f5;
}

.page-header {
  padding: 32rpx;
  background: linear-gradient(135deg, #3D2914 0%, #5a4225 100%);
}

.page-title {
  font-size: 36rpx;
  font-weight: 600;
  color: #fff;
}

.users-list {
  padding: 20rpx;
}

.user-item {
  display: flex;
  align-items: center;
  padding: 24rpx;
  background: #fff;
  border-radius: 16rpx;
  margin-bottom: 16rpx;
  gap: 24rpx;
}

.avatar {
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
  background: #f5f5f5;
}

.user-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.nickname {
  font-size: 30rpx;
  color: #333;
}

.openid {
  font-size: 24rpx;
  color: #999;
  font-family: monospace;
}

.user-badges {
  display: flex;
  gap: 8rpx;
}

.badge {
  padding: 8rpx 16rpx;
  border-radius: 8rpx;
  font-size: 22rpx;
}

.badge.level-0 {
  background: linear-gradient(135deg, #C9A962 0%, #a8863d 100%);
  color: #fff;
}

.badge.level-1 {
  background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);
  color: #333;
}

.badge.level-2 {
  background: linear-gradient(135deg, #C0C0C0 0%, #A9A9A9 100%);
  color: #333;
}

.badge.level-3 {
  background: linear-gradient(135deg, #CD7F32 0%, #B87333 100%);
  color: #fff;
}

.badge.level-4 {
  background: #f5f5f5;
  color: #666;
}

.empty-state,
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 120rpx 0;
  gap: 24rpx;
}

.empty-text,
.loading-text {
  font-size: 28rpx;
  color: #999;
}

.load-more {
  text-align: center;
  padding: 32rpx;
}

.load-more-text {
  font-size: 24rpx;
  color: #999;
}
</style>
