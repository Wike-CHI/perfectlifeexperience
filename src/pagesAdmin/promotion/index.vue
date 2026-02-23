<template>
  <view class="promotion-page">
    <view class="page-title">推广管理</view>

    <view class="section">
      <text class="section-title">推广概况</text>
      <view class="stats">
        <view class="stat-item">
          <text class="stat-value">0</text>
          <text class="stat-label">推广员总数</text>
        </view>
        <view class="stat-item">
          <text class="stat-value">¥0</text>
          <text class="stat-label">佣金总额</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

onMounted(() => {
  // TODO: 加载推广数据
})
</script>

<style lang="scss" scoped>
.promotion-page {
  padding: 20rpx;
}

.page-title {
  font-size: 36rpx;
  font-weight: bold;
  text-align: center;
  margin-bottom: 40rpx;
}

.section {
  background: #fff;
  border-radius: 12rpx;
  padding: 30rpx;
  margin-bottom: 20rpx;
}

.section-title {
  font-size: 30rpx;
  font-weight: bold;
  margin-bottom: 20rpx;
}

.stats {
  display: flex;
  gap: 20rpx;
}

.stat-item {
  flex: 1;
  text-align: center;
}

.stat-value {
  display: block;
  font-size: 36rpx;
  font-weight: bold;
  color: #C9A962;
  margin-bottom: 10rpx;
}

.stat-label {
  font-size: 24rpx;
  color: #666;
}
</style>
