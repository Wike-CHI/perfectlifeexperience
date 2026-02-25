<template>
  <view :class="['promotion-icon', size]" :style="customStyle">
    <svg :width="svgWidth" :height="svgHeight" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <!-- 推广员图标 -->
      <template v-if="name === 'promoters'">
        <circle cx="12" cy="7" r="4" stroke="currentColor" stroke-width="1.5"/>
        <path d="M4 21V19C4 17.3431 5.73186 16 12 16C18.2681 16 20 17.3431 20 19V21" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        <circle cx="18" cy="5" r="2" stroke="currentColor" stroke-width="1.5"/>
        <path d="M15 8C15 6.34315 16.3431 5 18 5" stroke="currentColor" stroke-width="1.5"/>
      </template>

      <!-- 团队图标 -->
      <template v-else-if="name === 'team'">
        <circle cx="9" cy="7" r="4" stroke="currentColor" stroke-width="1.5"/>
        <path d="M3 21V19C3 17.3431 5.73186 16 12 16" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        <circle cx="17" cy="7" r="3" stroke="currentColor" stroke-width="1.5"/>
        <path d="M21 21V19C21 17.134 18.7614 16 17 16" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      </template>

      <!-- 佣金图标 -->
      <template v-else-if="name === 'commission'">
        <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.5"/>
        <path d="M12 8V12L15 15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M12 16C14.2091 16 16 14.2091 16 12C16 9.79086 14.2091 8 12 8C9.79086 8 8 9.79086 8 12C8 14.2091 9.79086 16 12 16Z" stroke="currentColor" stroke-width="1.5" opacity="0.2"/>
      </template>

      <!-- 数据图标 -->
      <template v-else-if="name === 'chart'">
        <rect x="3" y="3" width="7" height="11" rx="1" stroke="currentColor" stroke-width="1.5"/>
        <rect x="14" y="3" width="7" height="7" rx="1" stroke="currentColor" stroke-width="1.5"/>
        <rect x="14" y="14" width="7" height="7" rx="1" stroke="currentColor" stroke-width="1.5"/>
        <rect x="3" y="18" width="7" height="3" rx="1" stroke="currentColor" stroke-width="1.5"/>
      </template>

      <!-- 销售图标 -->
      <template v-else-if="name === 'sales'">
        <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </template>

      <!-- 排名图标 -->
      <template v-else-if="name === 'rank'">
        <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="currentColor" fill-opacity="0.2"/>
        <circle cx="12" cy="12" r="2" fill="currentColor"/>
        <path d="M12 8V12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      </template>

      <!-- 增长图标 -->
      <template v-else-if="name === 'growth'">
        <path d="M22 12H18L15 21L9 13L2 17L4 12L9 9L15 17L17 12H22Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </template>

      <!-- 用户图标 -->
      <template v-else-if="name === 'users'">
        <circle cx="9" cy="7" r="4" stroke="currentColor" stroke-width="1.5"/>
        <path d="M3 21V20C3 17.2386 5.73186 15 9 15C12.2681 15 15 17.2386 15 20V21" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        <path d="M16 3.13C16.59 3.52 17.3 4 17.3 5C17.3 6 16.59 6.48 16 6.87C16.41 6.48 16 6 16 5C16 4 17 3 18 3C18.69 3 19.33 3.16 19.88 3.46" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      </template>

      <!-- 等级图标 -->
      <template v-else-if="name === 'level'">
        <path d="M12 15L15.5 17L14.5 13L17.5 11L13.5 11L12.5 7L8.5 11L4.5 11L7.5 13L6.5 17L12 15Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M12 2L14 8H20L13 12L16 20H8L11 12L4 8H10L12 2Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="currentColor" fill-opacity="0.1"/>
      </template>

      <!-- 奖杯图标 -->
      <template v-else-if="name === 'trophy'">
        <path d="M8 21H8.8C9.70879 21 10.3817 20.4046 10.7241 19.6493C11.0666 18.894 11.0462 18.0264 10.6687 17.2575C10.2911 16.4886 9.58089 16 8.8 16H8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        <path d="M16 21H15.2C14.3912 21 13.7183 20.4046 13.3759 19.6493C13.0334 18.894 13.0538 18.0264 13.4313 17.2575C13.8089 16.4886 14.5191 16 15.3 16H16" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        <path d="M7 9C7 6.23858 9.23858 4 12 4C14.7614 4 17 6.23858 17 9V11H7V9Z" fill="currentColor" fill-opacity="0.2" stroke="currentColor" stroke-width="1.5"/>
        <path d="M17 11V16C17 18.7614 14.7614 21 12 21C9.23858 21 7 18.7614 7 16V11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        <path d="M12 4V7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      </template>
    </svg>
  </view>
</template>

<script setup lang="ts">
/**
 * 推广管理专用图标组件
 * 使用自定义SVG，无emoji依赖
 */

interface Props {
  name: 'promoters' | 'team' | 'commission' | 'chart' | 'sales' | 'rank' | 'growth' | 'users' | 'level' | 'trophy'
  size?: 'small' | 'medium' | 'large'
  color?: string
}

const props = withDefaults(defineProps<Props>(), {
  size: 'medium',
  color: '#C9A962'
})

// 根据尺寸设置SVG大小
const svgWidth = computed(() => {
  const sizes = { small: 16, medium: 20, large: 24 }
  return sizes[props.size]
})

const svgHeight = computed(() => {
  const sizes = { small: 16, medium: 20, large: 24 }
  return sizes[props.size]
})

// 自定义样式
const customStyle = computed(() => {
  if (props.color && props.color !== '#C9A962') {
    return { color: props.color }
  }
  return {}
})
</script>

<style scoped>
.promotion-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.promotion-icon.small {
  width: 32rpx;
  height: 32rpx;
}

.promotion-icon.medium {
  width: 40rpx;
  height: 40rpx;
}

.promotion-icon.large {
  width: 48rpx;
  height: 48rpx;
}
</style>
