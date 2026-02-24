<template>
  <view class="users-page">
    <view class="page-header">
      <text class="page-title">用户管理</text>
    </view>

    <view class="search-bar">
      <input class="search-input" v-model="keyword" placeholder="搜索昵称或手机号" @confirm="handleSearch" />
    </view>

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
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { callFunction } from '@/utils/cloudbase'

const users = ref<any[]>([])
const keyword = ref('')

onMounted(() => {
  loadUsers()
})

const loadUsers = async () => {
  try {
    const res = await callFunction('admin-api', {
      action: 'getUsers',
      data: { page: 1, pageSize: 50 }
    })
    if (res.code === 0) {
      users.value = res.data.list || []
    } else {
      uni.showToast({ title: res.msg || '加载失败', icon: 'none' })
    }
  } catch (e) {
    console.error('加载用户失败', e)
    uni.showToast({ title: '网络错误', icon: 'none' })
  }
}

const handleSearch = () => {
  // TODO: 实现搜索
}

const goToDetail = (id: string) => {
  uni.navigateTo({ url: `/pagesAdmin/users/detail?id=${id}` })
}
</script>

<style lang="scss" scoped>
.users-page {
  padding: 20rpx;
}

.page-header {
  margin-bottom: 30rpx;
}

.page-title {
  font-size: 36rpx;
  font-weight: bold;
}

.search-bar {
  margin-bottom: 20rpx;
}

.search-input {
  width: 100%;
  height: 70rpx;
  padding: 0 20rpx;
  background: #f5f5f5;
  border-radius: 8rpx;
}

.user-item {
  display: flex;
  align-items: center;
  padding: 25rpx;
  background: #fff;
  border-radius: 12rpx;
  margin-bottom: 15rpx;
}

.avatar {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  margin-right: 20rpx;
}

.user-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.nickname {
  font-size: 28rpx;
  font-weight: bold;
}

.openid {
  font-size: 22rpx;
  color: #999;
}

.user-badges {
  display: flex;
  gap: 10rpx;
}

.badge {
  padding: 5rpx 12rpx;
  border-radius: 8rpx;
  font-size: 22rpx;
  background: #f0f0f0;

  &.star {
    background: #FFD700;
  }
}
</style>
