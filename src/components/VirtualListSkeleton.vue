<template>
  <view class="skeleton-wrapper">
    <view
      v-for="n in count"
      :key="n"
      class="skeleton-item"
      :style="{ height: itemHeight + 'rpx' }"
    >
      <view class="skeleton-image"></view>
      <view class="skeleton-content">
        <view class="skeleton-title"></view>
        <view class="skeleton-desc"></view>
        <view class="skeleton-meta"></view>
        <view class="skeleton-bottom">
          <view class="skeleton-price"></view>
          <view class="skeleton-btn"></view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { VIRTUAL_LIST_CONFIG } from '@/config/performance';

interface Props {
  count?: number;
  itemHeight?: number;
}

const props = withDefaults(defineProps<Props>(), {
  count: VIRTUAL_LIST_CONFIG.visibleCount,
  itemHeight: VIRTUAL_LIST_CONFIG.itemHeight
});
</script>

<style scoped>
.skeleton-wrapper {
  width: 100%;
  background-color: #f5f5f5;
}

.skeleton-item {
  display: flex;
  padding: 20rpx;
  background-color: #fff;
  margin-bottom: 20rpx;
  box-sizing: border-box;
}

.skeleton-image {
  flex-shrink: 0;
  width: 200rpx;
  height: 200rpx;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 8rpx;
}

.skeleton-content {
  flex: 1;
  margin-left: 20rpx;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.skeleton-title {
  width: 70%;
  height: 36rpx;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 4rpx;
}

.skeleton-desc {
  width: 50%;
  height: 28rpx;
  margin-top: 12rpx;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 4rpx;
  animation-delay: 0.2s;
}

.skeleton-meta {
  width: 30%;
  height: 24rpx;
  margin-top: 12rpx;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 4rpx;
  animation-delay: 0.4s;
}

.skeleton-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 16rpx;
}

.skeleton-price {
  width: 120rpx;
  height: 40rpx;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 4rpx;
  animation-delay: 0.6s;
}

.skeleton-btn {
  width: 60rpx;
  height: 60rpx;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 50%;
  animation-delay: 0.8s;
}

@keyframes shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}
</style>
