<template>
  <view
    class="admin-card"
    :class="{
      clickable,
      loading
    }"
    @click="handleClick"
  >
    <!-- 卡片头部 -->
    <view v-if="title || $slots.header || extra" class="card-header">
      <slot name="header">
        <view class="header-left">
          <text v-if="title" class="card-title">{{ title }}</text>
          <text v-if="subtitle" class="card-subtitle">{{ subtitle }}</text>
        </view>
      </slot>
      <view v-if="extra || $slots.extra" class="header-right">
        <slot name="extra">
          <text class="extra-text">{{ extra }}</text>
        </slot>
      </view>
    </view>

    <!-- 卡片内容 -->
    <view class="card-body">
      <slot />
    </view>

    <!-- 卡片底部 -->
    <view v-if="$slots.footer" class="card-footer">
      <slot name="footer" />
    </view>

    <!-- 加载状态 -->
    <view v-if="loading" class="card-loading">
      <view class="loading-spinner"></view>
    </view>
  </view>
</template>

<script setup lang="ts">
/**
 * AdminCard - 管理后台基础卡片组件
 * 通用的卡片容器，支持头部、内容、底部插槽
 */

interface Props {
  title?: string        // 卡片标题
  subtitle?: string     // 副标题
  extra?: string        // 右侧额外文本
  clickable?: boolean   // 是否可点击
  loading?: boolean     // 是否加载中
}

withDefaults(defineProps<Props>(), {
  clickable: false,
  loading: false
})

const emit = defineEmits<{
  click: []
}>()

const handleClick = () => {
  emit('click')
}
</script>

<style scoped>
.admin-card {
  background: #252525;
  border-radius: 16rpx;
  padding: 32rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.3);
  border: 2rpx solid rgba(201, 169, 98, 0.2);
  position: relative;
  overflow: hidden;
}

.clickable {
  transition: all 0.3s;
}

.clickable:active {
  transform: scale(0.98);
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.3);
}

/* 卡片头部 */
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24rpx;
  padding-bottom: 16rpx;
  border-bottom: 1rpx solid rgba(201, 169, 98, 0.1);
}

.header-left {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.card-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #F5F5F0;
}

.card-subtitle {
  font-size: 24rpx;
  color: rgba(245, 245, 240, 0.5);
}

.header-right {
  display: flex;
  align-items: center;
}

.extra-text {
  font-size: 26rpx;
  color: #C9A962;
}

/* 卡片内容 */
.card-body {
  position: relative;
}

/* 卡片底部 */
.card-footer {
  margin-top: 24rpx;
  padding-top: 16rpx;
  border-top: 1rpx solid rgba(201, 169, 98, 0.1);
}

/* 加载状态 */
.loading {
  pointer-events: none;
  opacity: 0.6;
}

.card-loading {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.5);
  z-index: 10;
}

.loading-spinner {
  width: 60rpx;
  height: 60rpx;
  border: 4rpx solid rgba(201, 169, 98, 0.3);
  border-top-color: #C9A962;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
