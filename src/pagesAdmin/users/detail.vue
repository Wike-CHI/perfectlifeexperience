<template>
  <view class="user-detail-page">
    <view class="page-title">用户详情</view>

    <view class="user-card">
      <image class="avatar" :src="userInfo.avatarUrl" />
      <text class="nickname">{{ userInfo.nickName || '未设置' }}</text>
      <view class="stats">
        <view class="stat-item">
          <text class="stat-value">{{ userInfo.performance?.totalSales || 0 }}</text>
          <text class="stat-label">销售额</text>
        </view>
        <view class="stat-item">
          <text class="stat-value">{{ userInfo.performance?.teamCount || 0 }}</text>
          <text class="stat-label">团队人数</text>
        </view>
      </view>
    </view>

    <view class="info-section">
      <text class="section-title">基本信息</text>
      <view class="info-item">
        <text class="label">OPENID</text>
        <text class="value">{{ userInfo._openid }}</text>
      </view>
      <view class="info-item">
        <text class="label">代理等级</text>
        <text class="value">Lv{{ userInfo.agentLevel }}</text>
      </view>
      <view class="info-item">
        <text class="label">星级</text>
        <text class="value">{{ userInfo.starLevel }}星</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { callFunction } from '@/utils/cloudbase'

const userInfo = ref<any>({})

onMounted(() => {
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1] as any
  const options = currentPage.options || {}

  if (options.id) {
    loadUser(options.id)
  }
})

const loadUser = async (id: string) => {
  try {
    const res = await callFunction('admin-api', {
      action: 'getUserDetail',
      data: { userId: id }
    })
    if (res.result?.code === 0) {
      userInfo.value = res.result.data
    }
  } catch (e) {
    console.error('加载用户失败', e)
  }
}
</script>

<style lang="scss" scoped>
.user-detail-page {
  padding: 20rpx;
}

.page-title {
  font-size: 36rpx;
  font-weight: bold;
  text-align: center;
  margin-bottom: 40rpx;
}

.user-card {
  background: #fff;
  border-radius: 12rpx;
  padding: 40rpx;
  text-align: center;
  margin-bottom: 20rpx;
}

.avatar {
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
  margin-bottom: 20rpx;
}

.nickname {
  display: block;
  font-size: 32rpx;
  font-weight: bold;
  margin-bottom: 30rpx;
}

.stats {
  display: flex;
  justify-content: center;
  gap: 60rpx;
}

.stat-item {
  text-align: center;
}

.stat-value {
  display: block;
  font-size: 32rpx;
  font-weight: bold;
  color: #C9A962;
  margin-bottom: 10rpx;
}

.stat-label {
  font-size: 24rpx;
  color: #666;
}

.info-section {
  background: #fff;
  border-radius: 12rpx;
  padding: 30rpx;
}

.section-title {
  font-size: 30rpx;
  font-weight: bold;
  margin-bottom: 25rpx;
}

.info-item {
  display: flex;
  justify-content: space-between;
  padding: 20rpx 0;
  border-bottom: 1rpx solid #f0f0f0;

  &:last-child {
    border-bottom: none;
  }
}

.label {
  font-size: 26rpx;
  color: #666;
}

.value {
  font-size: 26rpx;
  color: #333;
}
</style>
