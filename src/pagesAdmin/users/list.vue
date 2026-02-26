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
      <view v-for="user in users" :key="user._id" class="user-item" @click="goToDetail(user._id)">
        <image class="avatar" :src="user.avatarUrl" mode="aspectFill" />
        <view class="user-info">
          <text class="nickname">{{ user.nickName || '未设置' }}</text>
          <text class="openid">{{ user._openid }}</text>
        </view>
        <view class="user-badges">
          <text class="badge">Lv{{ user.agentLevel }}</text>
          <text class="badge star">{{ user.starLevel }}星</text>
        </view>
      </view>

      <!-- 空状态 -->
      <view v-if="users.length === 0 && !loading" class="empty-state">
        <text class="empty-text">暂无用户</text>
      </view>

      <!-- 加载状态 -->
      <view v-if="loading" class="loading-state">
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
import { callFunction } from '@/utils/cloudbase'
import AdminAuthManager from '@/utils/admin-auth'
import AdminSearch from '@/components/admin-search.vue'

/**
 * 用户管理页面
 * 功能：用户列表、搜索、分页
 */

const users = ref<any[]>([])
const keyword = ref('')
const loading = ref(false)
const hasMore = ref(true)
const page = ref(1)
const pageSize = 20

// 权限检查
onMounted(() => {
  if (!AdminAuthManager.checkAuth()) return
  loadUsers()
})

// 下拉刷新
onPullDownRefresh(async () => {
  page.value = 1
  hasMore.value = true
  await loadUsers()
  uni.stopPullDownRefresh()
})

// 上拉加载更多
onReachBottom(() => {
  if (hasMore.value && !loading.value) {
    loadMore()
  }
})

const loadUsers = async () => {
  if (loading.value) return

  try {
    loading.value = true

    const res = await callFunction('admin-api', {
      action: 'getUsers',
      adminToken: AdminAuthManager.getToken(),
      data: {
        page: page.value,
        pageSize: pageSize,
        keyword: keyword.value || undefined
      }
    })

    if (res.code === 0) {
      const newList = res.data.list || []
      if (page.value === 1) {
        users.value = newList
      } else {
        users.value.push(...newList)
      }
      hasMore.value = newList.length >= pageSize
    } else {
      uni.showToast({ title: res.msg || '加载失败', icon: 'none' })
    }
  } catch (e) {
    console.error('加载用户失败', e)
    uni.showToast({ title: '网络错误', icon: 'none' })
  } finally {
    loading.value = false
  }
}

const loadMore = () => {
  page.value++
  loadUsers()
}

const handleSearch = (searchKeyword: string) => {
  keyword.value = searchKeyword
  page.value = 1
  users.value = []
  loadUsers()
}

const goToDetail = (id: string) => {
  uni.navigateTo({ url: `/pagesAdmin/users/detail?id=${id}` })
}
</script>

<style lang="scss" scoped>
.users-page {
  min-height: 100vh;
  background: #1A1A1A;
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

.users-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.user-item {
  display: flex;
  align-items: center;
  padding: 24rpx;
  background: rgba(255, 255, 255, 0.03);
  border: 1rpx solid rgba(201, 169, 98, 0.1);
  border-radius: 16rpx;
  transition: all 0.3s;
}

.user-item:active {
  background: rgba(255, 255, 255, 0.05);
  transform: scale(0.98);
}

.avatar {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  margin-right: 20rpx;
  background: rgba(201, 169, 98, 0.1);
}

.user-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.nickname {
  font-size: 28rpx;
  font-weight: 600;
  color: #F5F5F0;
}

.openid {
  font-size: 22rpx;
  color: rgba(245, 245, 240, 0.4);
}

.user-badges {
  display: flex;
  gap: 10rpx;
}

.badge {
  padding: 5rpx 12rpx;
  border-radius: 8rpx;
  font-size: 22rpx;
  background: rgba(201, 169, 98, 0.15);
  color: #C9A962;

  &.star {
    background: rgba(212, 165, 116, 0.2);
    color: #D4A574;
  }
}

/* 空状态 */
.empty-state {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 120rpx 0;
}

.empty-text {
  font-size: 26rpx;
  color: rgba(245, 245, 240, 0.4);
}

/* 加载状态 */
.loading-state {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 60rpx 0;
}

.loading-text {
  font-size: 26rpx;
  color: rgba(245, 245, 240, 0.4);
}

/* 加载更多 */
.load-more {
  display: flex;
  justify-content: center;
  padding: 32rpx;
}

.load-more-text {
  font-size: 26rpx;
  color: #C9A962;
}
</style>
