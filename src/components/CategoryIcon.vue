<template>
  <view class="svg-icon" :style="{ width: size, height: size }">
    <!-- 鲜啤图标 - 啤酒杯 -->
    <svg v-if="type === 'beer'" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <!-- 杯身 -->
      <path d="M16 18C16 16 18 14 20 14H36C38 14 40 16 40 18V34C40 36.2 38.2 38 36 38H20C17.8 38 16 36.2 16 34V18Z" fill="#C9A962" stroke="#3D2914" stroke-width="2"/>
      <!-- 杯底 -->
      <ellipse cx="28" cy="42" rx="12" ry="3" fill="#D4A574" stroke="#3D2914" stroke-width="2"/>
      <!-- 泡沫 -->
      <circle cx="20" cy="12" r="4" fill="white" opacity="0.8"/>
      <circle cx="28" cy="8" r="5" fill="white" opacity="0.8"/>
      <circle cx="36" cy="12" r="4" fill="white" opacity="0.8"/>
      <!-- 高光 -->
      <path d="M22 24C22 24 26 22 26 24" stroke="white" stroke-width="2" stroke-linecap="round" opacity="0.3"/>
    </svg>

    <!-- 增味啤图标 - 鸡尾酒杯 -->
    <svg v-else-if="type === 'cocktail'" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <!-- 杯身 -->
      <path d="M18 20C18 18 20 16 22 16H34C36 16 38 18 38 20V36C38 37.1 37.1 38 36 38H20C18.9 38 18 37.1 18 36V20Z" fill="#7A9A8E" stroke="#3D2914" stroke-width="2"/>
      <!-- 杯脚 -->
      <path d="M20 38V44M36 38V44" stroke="#3D2914" stroke-width="2" stroke-linecap="round"/>
      <!-- 杯底 -->
      <ellipse cx="28" cy="44" rx="10" ry="2" fill="#C9A962" stroke="#3D2914" stroke-width="2"/>
      <!-- 装饰物 -->
      <circle cx="28" cy="12" r="3" fill="#C9A962"/>
      <!-- 水果切片 -->
      <circle cx="24" cy="30" r="2" fill="#FF6B6B" opacity="0.8"/>
      <circle cx="32" cy="32" r="2" fill="#4ECDC4" opacity="0.8"/>
      <!-- 吸管 -->
      <line x1="34" y1="12" x2="34" y2="4" stroke="#C9A962" stroke-width="2" stroke-linecap="round"/>
    </svg>

    <!-- 默认图标 -->
    <svg v-else viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="24" r="20" fill="#C9A962" stroke="#3D2914" stroke-width="2"/>
      <path d="M24 16V32M16 24H32" stroke="white" stroke-width="2" stroke-linecap="round"/>
    </svg>
  </view>
</template>

<script setup lang="ts">
interface Props {
  type?: 'beer' | 'cocktail';
  size?: string;
}

withDefaults(defineProps<Props>(), {
  type: 'beer',
  size: '48rpx'
});
</script>

<style scoped>
.svg-icon {
  display: block;
  margin-bottom: 8rpx;
}

.svg-icon svg {
  width: 100%;
  height: 100%;
  display: block;
}
</style>
