<template>
  <view class="skeleton-container">
    <!-- 骨架屏类型 -->
    <view v-if="type === 'product-list'" class="skeleton-product-list">
      <view v-for="i in count" :key="i" class="skeleton-product-item">
        <view class="skeleton-image"></view>
        <view class="skeleton-text" style="width: 60%"></view>
        <view class="skeleton-text" style="width: 40%"></view>
      </view>
    </view>

    <view v-else-if="type === 'order-list'" class="skeleton-order-list">
      <view v-for="i in count" :key="i" class="skeleton-order-item">
        <view class="skeleton-order-header">
          <view class="skeleton-text" style="width: 30%"></view>
          <view class="skeleton-text" style="width: 20%"></view>
        </view>
        <view class="skeleton-order-content">
          <view class="skeleton-image" style="width: 120rpx; height: 120rpx"></view>
          <view class="skeleton-order-info">
            <view class="skeleton-text" style="width: 70%"></view>
            <view class="skeleton-text" style="width: 50%"></view>
          </view>
        </view>
      </view>
    </view>

    <view v-else-if="type === 'user-info'" class="skeleton-user-info">
      <view class="skeleton-avatar"></view>
      <view class="skeleton-user-text">
        <view class="skeleton-text" style="width: 40%"></view>
        <view class="skeleton-text" style="width: 60%"></view>
      </view>
    </view>

    <view v-else class="skeleton-default">
      <view v-for="i in count" :key="i" class="skeleton-line">
        <view class="skeleton-text" :style="{ width: randomWidth() }"></view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
interface Props {
  /** 骨架屏类型 */
  type?: 'default' | 'product-list' | 'order-list' | 'user-info'
  /** 显示数量 */
  count?: number
}

const props = withDefaults(defineProps<Props>(), {
  type: 'default',
  count: 5
})

/** 随机宽度 */
const randomWidth = () => {
  const widths = ['30%', '40%', '50%', '60%', '70%', '80%']
  return widths[Math.floor(Math.random() * widths.length)]
}
</script>

<style scoped>
.skeleton-container {
  width: 100%;
}

.skeleton-product-list {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20rpx;
  padding: 20rpx;
}

.skeleton-product-item {
  background: #f5f5f5;
  border-radius: 12rpx;
  padding: 20rpx;
}

.skeleton-image {
  width: 100%;
  height: 200rpx;
  background: #e0e0e0;
  border-radius: 8rpx;
  margin-bottom: 16rpx;
}

.skeleton-text {
  height: 24rpx;
  background: #e0e0e0;
  border-radius: 4rpx;
  margin-bottom: 12rpx;
}

.skeleton-order-list {
  padding: 20rpx;
}

.skeleton-order-item {
  background: #f5f5f5;
  border-radius: 12rpx;
  padding: 20rpx;
  margin-bottom: 20rpx;
}

.skeleton-order-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 16rpx;
}

.skeleton-order-content {
  display: flex;
  gap: 16rpx;
}

.skeleton-order-info {
  flex: 1;
  padding-top: 10rpx;
}

.skeleton-user-info {
  display: flex;
  align-items: center;
  padding: 30rpx;
  gap: 20rpx;
}

.skeleton-avatar {
  width: 100rpx;
  height: 100rpx;
  border-radius: 50%;
  background: #e0e0e0;
}

.skeleton-user-text {
  flex: 1;
}

.skeleton-default {
  padding: 20rpx;
}

.skeleton-line {
  margin-bottom: 16rpx;
}

/* 闪烁动画 */
.skeleton-container view {
  animation: skeleton-fade 1.5s ease-in-out infinite;
}

@keyframes skeleton-fade {
  0% {
    opacity: 0.4;
  }
  50% {
    opacity: 0.7;
  }
  100% {
    opacity: 0.4;
  }
}
</style>
