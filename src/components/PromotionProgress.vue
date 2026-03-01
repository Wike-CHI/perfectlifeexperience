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
      <!-- 销售额进度 -->
      <view class="progress-item">
        <view class="progress-label">
          <text class="label-text">{{ salesLabel }}</text>
          <text class="label-value">¥{{ formatAmount(progress.salesProgress.current) }} / ¥{{ formatAmount(progress.salesProgress.target) }}</text>
        </view>
        <view class="progress-bar-wrapper">
          <view class="progress-bar">
            <view class="progress-fill sales-fill" :style="{ width: progress.salesProgress.percent + '%' }"></view>
          </view>
          <text class="progress-percent">{{ progress.salesProgress.percent }}%</text>
        </view>
      </view>

      <!-- 团队人数进度（仅三级和二级显示） -->
      <view v-if="showTeamProgress" class="progress-item">
        <view class="progress-label">
          <text class="label-text">团队人数</text>
          <text class="label-value">{{ progress.teamProgress.current }} / {{ progress.teamProgress.target }} 人</text>
        </view>
        <view class="progress-bar-wrapper">
          <view class="progress-bar">
            <view class="progress-fill team-fill" :style="{ width: progress.teamProgress.percent + '%' }"></view>
          </view>
          <text class="progress-percent">{{ progress.teamProgress.percent }}%</text>
        </view>
      </view>

      <!-- 晋升提示 -->
      <view class="promotion-tip">
        <text class="tip-text">{{ promotionTip }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { PromotionProgress, AgentLevel } from '@/types/index';
import { AGENT_LEVEL_NAMES } from '@/constants/promotion';

// Props 定义
interface Props {
  progress: PromotionProgress;
}

const props = withDefaults(defineProps<Props>(), {
  progress: () => ({
    currentLevel: 4,
    currentLevelName: '普通会员',
    nextLevel: 3,
    nextLevelName: '铜牌推广员',
    salesProgress: { current: 0, target: 2000000, percent: 0 },
    teamProgress: { current: 0, target: 0, percent: 0 }
  })
});

// 当前等级名称
const currentLevelName = computed(() => props.progress.currentLevelName);

// 下一等级名称
const nextLevelName = computed(() => {
  if (props.progress.nextLevelName) {
    return props.progress.nextLevelName;
  }
  return '最高等级';
});

// 是否有下一级
const hasNextLevel = computed(() => props.progress.nextLevel !== null);

// 是否显示团队进度（三级→二级、二级→一级才需要）
const showTeamProgress = computed(() => {
  return props.progress.currentLevel === 3 || props.progress.currentLevel === 2;
});

// 销售额标签
const salesLabel = computed(() => {
  if (props.progress.currentLevel === 4) {
    return '累计销售额';
  }
  return '本月销售额';
});

// 晋升提示
const promotionTip = computed(() => {
  if (props.progress.currentLevel === 4) {
    return '累计销售额达标即可晋升';
  }
  return '满足任意一项即可晋升';
});

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
  color: #3D2914;
  font-weight: 600;
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
  color: #C9A962;
  font-weight: 600;
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
  background: linear-gradient(90deg, #C9A962 0%, #D4A574 100%);
}

.team-fill {
  background: linear-gradient(90deg, #7A9A8E 0%, #5D8A6B 100%);
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
  color: #3D2914;
  background: rgba(201, 169, 98, 0.12);
  padding: 8rpx 20rpx;
  border-radius: 20rpx;
  font-weight: 500;
}
</style>
