<template>
  <view class="statistics-page">
    <view class="page-title">数据统计</view>

    <view class="stats-grid">
      <view class="stat-card">
        <text class="stat-value">{{ stats.todaySales }}</text>
        <text class="stat-label">今日销售额</text>
      </view>
      <view class="stat-card">
        <text class="stat-value">{{ stats.todayOrders }}</text>
        <text class="stat-label">今日订单</text>
      </view>
      <view class="stat-card">
        <text class="stat-value">{{ stats.totalUsers }}</text>
        <text class="stat-label">总用户数</text>
      </view>
      <view class="stat-card">
        <text class="stat-value">{{ stats.totalPromoters }}</text>
        <text class="stat-label">推广员数</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const stats = ref({
  todaySales: '¥0',
  todayOrders: 0,
  totalUsers: 0,
  totalPromoters: 0
})

onMounted(() => {
  // TODO: 加载统计数据
})
</script>

<style lang="scss" scoped>
.statistics-page {
  padding: 20rpx;
}

.page-title {
  font-size: 36rpx;
  font-weight: bold;
  text-align: center;
  margin-bottom: 40rpx;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20rpx;
}

.stat-card {
  background: #fff;
  border-radius: 12rpx;
  padding: 30rpx;
  text-align: center;
}

.stat-value {
  display: block;
  font-size: 40rpx;
  font-weight: bold;
  color: #C9A962;
  margin-bottom: 15rpx;
}

.stat-label {
  font-size: 26rpx;
  color: #666;
}
</style>
