<template>
  <view
    class="data-card"
    :class="{
      clickable,
      [trendType]: trendType
    }"
    @click="handleClick"
  >
    <!-- 左侧图标 -->
    <view v-if="icon" class="card-icon">
      <image v-if="isImageUrl(icon)" :src="icon" mode="aspectFit" class="icon-image" />
      <AdminIcon v-else-if="isIconName(icon)" :name="icon" size="large" variant="gold" />
      <text v-else class="icon-emoji">{{ icon }}</text>
    </view>

    <!-- 右侧内容 -->
    <view class="card-content">
      <text class="data-label">{{ label }}</text>
      <view class="data-value-wrapper">
        <text class="data-value">{{ displayValue }}</text>
        <text v-if="unit" class="data-unit">{{ unit }}</text>
      </view>

      <!-- 趋势标识 -->
      <view v-if="trend" class="data-trend" :class="trendType">
        <text class="trend-icon">{{ trendIcon }}</text>
        <text class="trend-text">{{ trend }}</text>
      </view>
    </view>

    <!-- 右箭头（可点击时显示） -->
    <view v-if="clickable" class="card-arrow">
      <text class="arrow-icon">›</text>
    </view>
  </view>
</template>

<script setup lang="ts">
/**
 * AdminDataCard - 数据展示卡片组件
 * 用于展示仪表盘数据指标，支持趋势显示
 */

import { computed } from 'vue'
import AdminIcon from './admin-icon.vue'

interface Props {
  label: string           // 数据标签
  value: string | number  // 数据值
  unit?: string           // 单位
  icon?: string           // 图标（emoji 或图片 URL）
  trend?: string          // 趋势文本（如 "12%"）
  trendType?: 'up' | 'down' | 'neutral'  // 趋势类型
  clickable?: boolean     // 是否可点击
}

const props = withDefaults(defineProps<Props>(), {
  clickable: false,
  trendType: 'neutral'
})

const emit = defineEmits<{
  click: []
}>()

const displayValue = computed(() => {
  if (typeof props.value === 'number') {
    return props.value.toLocaleString()
  }
  return props.value
})

const trendIcon = computed(() => {
  switch (props.trendType) {
    case 'up':
      return '↑'
    case 'down':
      return '↓'
    default:
      return ''
  }
})

const isImageUrl = (url: string): boolean => {
  return url.startsWith('/') || url.startsWith('http')
}

// 有效的 AdminIcon 名称列表
const validIconNames = [
  'user', 'search', 'eye', 'eye-off', 'location', 'package', 'money', 'cart',
  'users', 'chart', 'plus', 'list', 'refund', 'refresh', 'check', 'close',
  'alert', 'bulb', 'trophy', 'image', 'coupon', 'lock', 'box', 'card', 'truck', 'clock'
]

const isIconName = (name: string): boolean => {
  return validIconNames.includes(name)
}

const handleClick = () => {
  if (props.clickable) {
    emit('click')
  }
}
</script>

<style scoped>
.data-card {
  display: flex;
  align-items: center;
  padding: 32rpx;
  background: #252525;
  border-radius: 16rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.3);
  border: 2rpx solid rgba(201, 169, 98, 0.2);
  gap: 24rpx;
  transition: all 0.3s;
}

.clickable {
  cursor: pointer;
}

.clickable:active {
  transform: scale(0.98);
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.3);
}

/* 图标 */
.card-icon {
  width: 88rpx;
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(201, 169, 98, 0.1);
  border-radius: 16rpx;
  flex-shrink: 0;
}

.icon-image {
  width: 56rpx;
  height: 56rpx;
}

.icon-emoji {
  font-size: 48rpx;
}

/* 内容区 */
.card-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  min-width: 0;
}

.data-label {
  font-size: 24rpx;
  color: rgba(245, 245, 240, 0.6);
}

.data-value-wrapper {
  display: flex;
  align-items: baseline;
  gap: 8rpx;
}

.data-value {
  font-size: 44rpx;
  font-weight: 700;
  color: #F5F5F0;
  font-family: 'Manrope', sans-serif;
}

.data-unit {
  font-size: 24rpx;
  color: rgba(245, 245, 240, 0.5);
}

/* 趋势 */
.data-trend {
  display: flex;
  align-items: center;
  gap: 8rpx;
  font-size: 22rpx;
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
  width: fit-content;
}

.data-trend.up {
  background: rgba(122, 154, 142, 0.2);
  color: #7A9A8E;
}

.data-trend.down {
  background: rgba(184, 92, 92, 0.2);
  color: #B85C5C;
}

.data-trend.neutral {
  background: rgba(212, 165, 116, 0.2);
  color: #D4A574;
}

.trend-icon {
  font-size: 20rpx;
  font-weight: bold;
}

.trend-text {
  font-weight: 600;
}

/* 箭头 */
.card-arrow {
  flex-shrink: 0;
  margin-left: 8rpx;
}

.arrow-icon {
  font-size: 40rpx;
  color: rgba(245, 245, 240, 0.3);
}
</style>
