<template>
  <view class="progress-container">
    <view class="progress-header">
      <text class="progress-title">晋升进度</text>
      <text class="progress-level">{{ currentLevelName }} → {{ nextLevelName }}</text>
    </view>
    
    <!-- 已是最高等级提示 -->
    <view v-if="!hasNextLevel" class="max-level-tip">
      <image class="tip-icon" src="/static/icons/icon-crown.svg" mode="aspectFit"/>
      <text class="tip-text">恭喜您已达到最高等级！</text>
    </view>
    
    <!-- 晋升进度条 -->
    <view v-else class="progress-content">
      <!-- 金额进度 -->
      <view class="progress-item">
        <view class="progress-label">
          <text class="label-text">累计销售额</text>
          <text class="label-value">¥{{ formatAmount(progress.salesProgress.current) }} / ¥{{ formatAmount(progress.salesProgress.target) }}</text>
        </view>
        <view class="progress-bar-wrapper">
          <view class="progress-bar">
            <view class="progress-fill sales-fill" :style="{ width: progress.salesProgress.percent + '%' }"></view>
          </view>
          <text class="progress-percent">{{ progress.salesProgress.percent }}%</text>
        </view>
      </view>
      
      <!-- 人数进度 -->
      <view class="progress-item">
        <view class="progress-label">
          <text class="label-text">直推人数</text>
          <text class="label-value">{{ progress.countProgress.current }} / {{ progress.countProgress.target }} 人</text>
        </view>
        <view class="progress-bar-wrapper">
          <view class="progress-bar">
            <view class="progress-fill count-fill" :style="{ width: progress.countProgress.percent + '%' }"></view>
          </view>
          <text class="progress-percent">{{ progress.countProgress.percent }}%</text>
        </view>
      </view>
      
      <!-- 晋升提示 -->
      <view class="promotion-tip">
        <text class="tip-text">满足任意一项即可晋升</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { PromotionProgress, StarLevel } from '@/types/index';

// Props 定义
interface Props {
  progress: PromotionProgress;
}

const props = withDefaults(defineProps<Props>(), {
  progress: () => ({
    currentLevel: 0,
    nextLevel: 1,
    salesProgress: { current: 0, target: 2000000, percent: 0 },
    countProgress: { current: 0, target: 30, percent: 0 }
  })
});

// 星级名称映射
const starLevelNames: Record<StarLevel, string> = {
  0: '普通会员',
  1: '铜牌推广员',
  2: '银牌推广员',
  3: '金牌推广员'
};

// 当前等级名称
const currentLevelName = computed(() => starLevelNames[props.progress.currentLevel]);

// 下一等级名称
const nextLevelName = computed(() => {
  if (props.progress.nextLevel !== null) {
    return starLevelNames[props.progress.nextLevel];
  }
  return '最高等级';
});

// 是否有下一级
const hasNextLevel = computed(() => props.progress.nextLevel !== null);

// 格式化金额（分转元）
const formatAmount = (amount: number): string => {
  return (amount / 100).toFixed(0);
};
</script>

<style scoped>
.progress-container {
  background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
  border-radius: 20rpx;
  padding: 28rpx 32rpx;
  margin: 24rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.06);
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24rpx;
}

.progress-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #333;
}

.progress-level {
  font-size: 24rpx;
  color: #0052D9;
  font-weight: 500;
}

.max-level-tip {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40rpx 0;
}

.tip-icon {
  width: 80rpx;
  height: 80rpx;
  margin-bottom: 16rpx;
}

.tip-icon .icon-svg {
  width: 64rpx;
  height: 64rpx;
}

.tip-text {
  font-size: 28rpx;
  color: #FFB800;
  font-weight: 500;
}

.progress-content {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.progress-item {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.progress-label {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.label-text {
  font-size: 24rpx;
  color: #666;
}

.label-value {
  font-size: 24rpx;
  color: #333;
  font-weight: 500;
}

.progress-bar-wrapper {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.progress-bar {
  flex: 1;
  height: 16rpx;
  background: #e8e8e8;
  border-radius: 8rpx;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  border-radius: 8rpx;
  transition: width 0.3s ease;
}

.sales-fill {
  background: linear-gradient(90deg, #0052D9 0%, #00A870 100%);
}

.count-fill {
  background: linear-gradient(90deg, #FFB800 0%, #FF6B00 100%);
}

.progress-percent {
  font-size: 22rpx;
  color: #999;
  min-width: 60rpx;
  text-align: right;
}

.promotion-tip {
  display: flex;
  justify-content: center;
  padding-top: 8rpx;
}

.promotion-tip .tip-text {
  font-size: 22rpx;
  color: #0052D9;
  background: rgba(0, 82, 217, 0.08);
  padding: 8rpx 20rpx;
  border-radius: 20rpx;
}
</style>
