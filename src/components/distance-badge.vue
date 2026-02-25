/**
 * 距离显示组件
 * 用于在各个页面显示用户到门店的距离
 */
<template>
  <view class="distance-badge" :class="levelClass" @click="goToStoreLocation">
    <text class="distance-icon">{{ icon }}</text>
    <text class="distance-text">{{ displayText }}</text>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  getDistanceToStore,
  formatDistance,
  getDistanceLevel,
  clearLocationCache
} from '@/utils/distance'

const props = defineProps<{
  icon?: string
  showIcon?: boolean
  loadingText?: string
}>()

const distance = ref<number | null>(null)
const loading = ref(true)

const displayText = computed(() => {
  if (loading.value) {
    return props.loadingText || '获取中...'
  }
  if (distance.value === null) {
    return '点击获取位置'
  }
  return formatDistance(distance.value)
})

const levelClass = computed(() => {
  if (distance.value === null) return ''
  const level = getDistanceLevel(distance.value)
  return `distance-${level.level}`
})

const loadDistance = async () => {
  try {
    loading.value = true
    distance.value = await getDistanceToStore()
  } catch (error) {
    console.error('获取距离失败:', error)
    distance.value = null
    uni.showToast({
      title: '无法获取位置，请检查权限',
      icon: 'none',
      duration: 2000
    })
  } finally {
    loading.value = false
  }
}

const refresh = async () => {
  clearLocationCache()
  await loadDistance()
}

const goToStoreLocation = () => {
  uni.navigateTo({
    url: '/pages/store/location'
  })
}

onMounted(() => {
  // 自动加载距离
  loadDistance()
})

// 暴露刷新方法给父组件
defineExpose({
  loadDistance,
  refresh,
  clearLocationCache,
  distance
})
</script>

<style scoped>
.distance-badge {
  display: inline-flex;
  align-items: center;
  gap: 4rpx;
  padding: 6rpx 12rpx;
  background: rgba(245, 245, 240, 0.1);
  border-radius: 20rpx;
  transition: all 0.3s ease;
}

.distance-badge:active {
  transform: scale(0.95);
}

.distance-badge.distance-near {
  background: rgba(82, 196, 26, 0.15);
}

.distance-badge.distance-medium {
  background: rgba(212, 165, 116, 0.15);
}

.distance-badge.distance-far {
  background: rgba(155, 139, 127, 0.15);
}

.distance-icon {
  font-size: 20rpx;
}

.distance-text {
  font-size: 22rpx;
  color: rgba(245, 245, 240, 0.8);
}

.distance-badge.distance-near .distance-text {
  color: #52C41A;
}

.distance-badge.distance-medium .distance-text {
  color: #D4A574;
}

.distance-badge.distance-far .distance-text {
  color: #9B8B7F;
}
</style>
