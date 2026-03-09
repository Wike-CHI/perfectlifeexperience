<template>
  <view class="init-container">
    <view class="init-card">
      <text class="init-title">数据库初始化</text>
      <text class="init-desc">创建活动管理所需的数据库集合</text>

      <view class="init-actions">
        <button class="init-btn" @click="initPromotions" :disabled="loading">
          {{ loading ? '初始化中...' : '初始化活动表' }}
        </button>
      </view>

      <view v-if="result" class="init-result">
        <text class="result-title">执行结果：</text>
        <text class="result-text">{{ JSON.stringify(result, null, 2) }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { callFunction } from '@/utils/cloudbase'

const loading = ref(false)
const result = ref<any>(null)

const initPromotions = async () => {
  loading.value = true
  result.value = null

  try {
    const res = await callFunction('migration', {
      action: 'createActivityTables'
    })

    console.log('初始化结果:', res)
    result.value = res

    if (res.code === 0) {
      uni.showToast({
        title: '初始化成功',
        icon: 'success'
      })
    } else {
      uni.showToast({
        title: res.msg || '初始化失败',
        icon: 'none'
      })
    }
  } catch (error: any) {
    console.error('初始化失败:', error)
    result.value = { error: error.message }
    uni.showToast({
      title: '初始化失败',
      icon: 'none'
    })
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.init-container {
  min-height: 100vh;
  background: #0D0D0D;
  padding: 32rpx;
}

.init-card {
  background: #1A1A1A;
  border-radius: 16rpx;
  padding: 40rpx;
  border: 1rpx solid rgba(200, 164, 100, 0.1);
}

.init-title {
  display: block;
  font-size: 36rpx;
  font-weight: 600;
  color: #C8A464;
  margin-bottom: 16rpx;
}

.init-desc {
  display: block;
  font-size: 26rpx;
  color: rgba(245, 245, 240, 0.5);
  margin-bottom: 40rpx;
}

.init-actions {
  margin-bottom: 32rpx;
}

.init-btn {
  width: 100%;
  height: 88rpx;
  background: linear-gradient(145deg, #C8A464 0%, #A88B4A 100%);
  border-radius: 12rpx;
  font-size: 30rpx;
  font-weight: 600;
  color: #0D0D0D;
  border: none;
}

.init-btn[disabled] {
  opacity: 0.6;
}

.init-result {
  background: rgba(0, 0, 0, 0.3);
  border-radius: 8rpx;
  padding: 24rpx;
}

.result-title {
  display: block;
  font-size: 24rpx;
  color: rgba(245, 245, 240, 0.6);
  margin-bottom: 12rpx;
}

.result-text {
  display: block;
  font-size: 24rpx;
  color: #C8A464;
  font-family: monospace;
  white-space: pre-wrap;
  word-break: break-all;
}
</style>
