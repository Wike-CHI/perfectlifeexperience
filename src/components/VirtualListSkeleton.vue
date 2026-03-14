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
/* ============================================
   虚拟列表骨架屏 - 深色奢华主题
   ============================================ */

.skeleton-wrapper {
  width: 100%;
  background-color: #0D0D0D;
}

.skeleton-item {
  display: flex;
  gap: 12rpx;
  padding: 0;
  background-color: #0D0D0D;
  border-bottom: 1rpx solid rgba(200, 164, 100, 0.08);
  box-sizing: border-box;
}

.skeleton-image {
  flex-shrink: 0;
  width: 120rpx;
  height: 120rpx;
  background: linear-gradient(
    90deg,
    #141414 0%,
    rgba(200, 164, 100, 0.15) 50%,
    #141414 100%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 8rpx;
}

.skeleton-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-width: 0;
  padding: 4rpx 0;
}

.skeleton-title {
  width: 70%;
  height: 28rpx;
  background: linear-gradient(
    90deg,
    #141414 0%,
    rgba(200, 164, 100, 0.15) 50%,
    #141414 100%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 4rpx;
}

.skeleton-desc {
  width: 50%;
  height: 22rpx;
  background: linear-gradient(
    90deg,
    #141414 0%,
    rgba(200, 164, 100, 0.15) 50%,
    #141414 100%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 4rpx;
  animation-delay: 0.2s;
}

.skeleton-meta {
  width: 30%;
  height: 20rpx;
  background: linear-gradient(
    90deg,
    #141414 0%,
    rgba(200, 164, 100, 0.15) 50%,
    #141414 100%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 4rpx;
  animation-delay: 0.4s;
}

.skeleton-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.skeleton-price {
  width: 100rpx;
  height: 32rpx;
  background: linear-gradient(
    90deg,
    #141414 0%,
    rgba(200, 164, 100, 0.15) 50%,
    #141414 100%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 4rpx;
  animation-delay: 0.6s;
}

.skeleton-btn {
  width: 48rpx;
  height: 48rpx;
  background: linear-gradient(
    90deg,
    #141414 0%,
    rgba(200, 164, 100, 0.15) 50%,
    #141414 100%
  );
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
