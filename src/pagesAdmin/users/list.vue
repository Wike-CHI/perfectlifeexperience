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
          <text :class="['badge', 'level-' + user.agentLevel]">{{ getAgentLevelShortName(user.agentLevel) }}</text>
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
import { onPullDownRefresh, onReachBottom } from '@dcloudio/uni-app'
import { callFunction } from '@/utils/cloudbase'
import { useAdminList } from '@/composables/useAdmin'
import AdminSearch from '@/components/admin-search.vue'

/**
 * 用户管理页面
 * 使用 useAdminList composable 简化代码
 */

// 代理等级短名称映射
const AGENT_LEVEL_SHORT_NAMES: Record<number, string> = {
  0: '总公司',
  1: '金牌',
  2: '银牌',
  3: '铜牌',
  4: '普通'
}

const getAgentLevelShortName = (level: number): string => {
  return AGENT_LEVEL_SHORT_NAMES[level] || '普通'
}

// 跳转到用户详情
const goToDetail = (userId: string) => {
  uni.navigateTo({
    url: `/pagesAdmin/users/detail?id=${userId}`
  })
}

// 搜索处理
const handleSearch = (searchKeyword: string) => {
  search(searchKeyword)
}

// 使用 useAdminList
const {
  list,
  loading,
  hasMore,
  search,
  clearSearch,
  loadMore,
  refresh
} = useAdminList({
  action: 'getUsers',
  cachePrefix: 'users',
  pageSize: 20,
  transform: (data: any) => data,
  onLoaded: async (users: any[]) => {
    // 批量转换云存储格式的头像URL
    if (users.length > 0) {
      const avatarUrls = users
        .map((user: any) => user.avatarUrl)
        .filter((url: string) => url && url.startsWith('cloud://'))

      if (avatarUrls.length > 0) {
        try {
          const { batchConvertCloudUrls } = await import('@/utils/image')
          const convertedUrls = await batchConvertCloudUrls(avatarUrls)
          // 将转换后的URL更新回用户对象
          users.forEach((user: any) => {
            const convertedUrl = convertedUrls.find((item: any) => item.originalUrl === user.avatarUrl)
            if (convertedUrl) {
              user.avatarUrl = convertedUrl.convertedUrl
            }
          })
        } catch (error) {
          console.error('批量转换头像URL失败:', error)
        }
      }
    }
    console.log('用户列表加载完成', users.length)
  },
  onError: (error) => {
    console.error('加载用户失败', error)
  }
})

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

<style lang="scss" scoped>
.users-page {
  min-height: 100vh;
  background: #f5f5f5;
}

.page-header {
  background: linear-gradient(135deg, #3D2914 0%, #5a3d1e 100%);
  padding: 40rpx 30rpx;
  padding-top: 60rpx;
}

.page-title {
  font-size: 48rpx;
  font-weight: bold;
  color: #FAF9F7;
  font-family: 'Playfair Display', serif;
}

.users-list {
  padding: 20rpx;
}

.user-item {
  display: flex;
  align-items: center;
  background: #fff;
  border-radius: 16rpx;
  padding: 30rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 2rpx 12rpx rgba(61, 41, 20, 0.08);
  transition: all 0.3s ease;

  &:active {
    transform: scale(0.98);
    box-shadow: 0 1rpx 6rpx rgba(61, 41, 20, 0.12);
  }
}

.avatar {
  width: 100rpx;
  height: 100rpx;
  border-radius: 50%;
  margin-right: 24rpx;
  flex-shrink: 0;
}

.user-info {
  flex: 1;
  min-width: 0;
}

.nickname {
  display: block;
  font-size: 32rpx;
  font-weight: 500;
  color: #1A1A1A;
  margin-bottom: 8rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.openid {
  display: block;
  font-size: 24rpx;
  color: #999;
  font-family: 'DM Mono', monospace;
}

.user-badges {
  margin-left: 20rpx;
}

.badge {
  display: inline-block;
  padding: 8rpx 20rpx;
  border-radius: 20rpx;
  font-size: 24rpx;
  font-weight: 500;

  &.level-0 {
    background: linear-gradient(135deg, #C9A962 0%, #D4A574 100%);
    color: #fff;
  }

  &.level-1 {
    background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);
    color: #fff;
  }

  &.level-2 {
    background: linear-gradient(135deg, #C0C0C0 0%, #A8A8A8 100%);
    color: #fff;
  }

  &.level-3 {
    background: linear-gradient(135deg, #CD7F32 0%, #B87333 100%);
    color: #fff;
  }

  &.level-4 {
    background: #f5f5f5;
    color: #666;
  }
}

.empty-state,
.loading-state {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 120rpx 0;
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
