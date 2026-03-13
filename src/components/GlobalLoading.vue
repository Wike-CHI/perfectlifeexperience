<template>
  <view v-if="visible" class="global-loading" @touchmove.stop.prevent>
    <view class="loading-mask"></view>
    <view class="loading-content">
      <!-- 加载动画 -->
      <view class="loading-spinner">
        <view class="spinner-dot" v-for="n in 3" :key="n"></view>
      </view>

      <!-- 加载文案 -->
      <text v-if="text" class="loading-text">{{ text }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
interface Props {
  visible?: boolean;
  text?: string;
}

const props = withDefaults(defineProps<Props>(), {
  visible: false,
  text: '加载中...'
});
</script>

<style scoped>
.global-loading {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
}

.loading-mask {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.3);
}

.loading-content {
  position: relative;
  background-color: rgba(0, 0, 0, 0.8);
  border-radius: 16rpx;
  padding: 60rpx 80rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.loading-spinner {
  display: flex;
  gap: 16rpx;
  margin-bottom: 30rpx;
}

.spinner-dot {
  width: 16rpx;
  height: 16rpx;
  background-color: #fff;
  border-radius: 50%;
  animation: bounce 1.4s infinite ease-in-out both;
}

.spinner-dot:nth-child(1) {
  animation-delay: -0.32s;
}

.spinner-dot:nth-child(2) {
  animation-delay: -0.16s;
}

.spinner-dot:nth-child(3) {
  animation-delay: 0s;
}

.loading-text {
  color: #fff;
  font-size: 28rpx;
  text-align: center;
}

@keyframes bounce {
  0%, 80%, 100% {
    transform: scale(0);
    opacity: 0.5;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}
</style>
