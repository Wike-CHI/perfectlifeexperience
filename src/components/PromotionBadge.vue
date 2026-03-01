<template>
  <view class="badge-container">
    <!-- 代理等级徽章 -->
    <view class="badge agent-badge" :style="agentBadgeStyle">
      <view class="badge-icon">
        <text class="level-text">{{ agentLevelRoman }}</text>
      </view>
      <view class="badge-info">
        <text class="badge-title">{{ agentLevelName }}</text>
        <text class="badge-subtitle">代理等级</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { AgentLevel } from '@/types/index';
import { AGENT_LEVEL_NAMES, AGENT_LEVEL_ROMAN, AGENT_LEVEL_COLORS } from '@/constants/promotion';

// Props 定义
interface Props {
  agentLevel: AgentLevel;
}

const props = withDefaults(defineProps<Props>(), {
  agentLevel: 4
});

// 代理等级名称
const agentLevelName = computed(() =>
  AGENT_LEVEL_NAMES[props.agentLevel as keyof typeof AGENT_LEVEL_NAMES] || '普通会员'
);

// 代理等级罗马数字
const agentLevelRoman = computed(() =>
  AGENT_LEVEL_ROMAN[props.agentLevel as keyof typeof AGENT_LEVEL_ROMAN] || 'IV'
);

// 代理徽章样式
const agentBadgeStyle = computed(() => ({
  background: AGENT_LEVEL_COLORS[props.agentLevel as keyof typeof AGENT_LEVEL_COLORS] || '#5D3924'
}));
</script>

<style scoped>
.badge-container {
  display: flex;
  gap: 24rpx;
  padding: 24rpx;
}

.badge {
  flex: 1;
  display: flex;
  align-items: center;
  padding: 20rpx 24rpx;
  border-radius: 16rpx;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.1);
}

.badge-icon {
  width: 72rpx;
  height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  margin-right: 20rpx;
}

.level-text {
  font-size: 32rpx;
  font-weight: 700;
  color: #fff;
  text-shadow: 0 2rpx 4rpx rgba(0, 0, 0, 0.2);
}

.badge-info {
  display: flex;
  flex-direction: column;
}

.badge-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #fff;
  text-shadow: 0 1rpx 2rpx rgba(0, 0, 0, 0.1);
}

.badge-subtitle {
  font-size: 20rpx;
  color: rgba(255, 255, 255, 0.8);
  margin-top: 4rpx;
}
</style>
