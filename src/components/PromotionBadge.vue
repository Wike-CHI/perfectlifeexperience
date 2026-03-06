<template>
  <view class="badge-container">
    <view class="badge-main" :class="'level-' + agentLevel">
      <view class="badge-icon">
        <text class="icon-emoji">{{ levelEmoji }}</text>
      </view>
      <view class="badge-info">
        <view class="badge-top">
          <text class="badge-title">{{ agentLevelName }}</text>
          <text class="level-tag">{{ agentLevelRoman }}</text>
        </view>
        <text class="badge-desc">自得 {{ commissionRate }}% 佣金</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { AgentLevel } from '@/types/index';
import { AGENT_LEVEL_NAMES, AGENT_LEVEL_ROMAN, COMMISSION_RULES } from '@/constants/promotion';

interface Props {
  agentLevel: AgentLevel;
}

const props = withDefaults(defineProps<Props>(), {
  agentLevel: 4
});

const agentLevelName = computed(() =>
  AGENT_LEVEL_NAMES[props.agentLevel as keyof typeof AGENT_LEVEL_NAMES] || '普通会员'
);

const agentLevelRoman = computed(() =>
  AGENT_LEVEL_ROMAN[props.agentLevel as keyof typeof AGENT_LEVEL_ROMAN] || 'IV'
);

const levelEmoji = computed(() => {
  const emojis: Record<number, string> = {
    1: '🥇',
    2: '🥈',
    3: '🥉',
    4: '🏅'
  };
  return emojis[props.agentLevel] || '🏅';
});

const commissionRate = computed(() => {
  const rule = COMMISSION_RULES[props.agentLevel as keyof typeof COMMISSION_RULES];
  return rule ? (rule.own * 100).toFixed(0) : '8';
});
</script>

<style scoped>
.badge-container {
  padding: 20rpx 30rpx;
  position: relative;
  z-index: 2;
}

.badge-main {
  display: flex;
  align-items: center;
  padding: 24rpx 28rpx;
  border-radius: 20rpx;
  background: rgba(255, 255, 255, 0.12);
  border: 1rpx solid rgba(255, 255, 255, 0.18);
}

.badge-main.level-1 {
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.15) 0%, rgba(255, 165, 0, 0.1) 100%);
  border-color: rgba(255, 215, 0, 0.3);
}

.badge-main.level-2 {
  background: linear-gradient(135deg, rgba(192, 192, 192, 0.15) 0%, rgba(169, 169, 169, 0.1) 100%);
  border-color: rgba(192, 192, 192, 0.3);
}

.badge-main.level-3 {
  background: linear-gradient(135deg, rgba(205, 127, 50, 0.15) 0%, rgba(184, 134, 11, 0.1) 100%);
  border-color: rgba(205, 127, 50, 0.3);
}

.badge-main.level-4 {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.15);
}

.badge-icon {
  width: 80rpx;
  height: 80rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 20rpx;
}

.icon-emoji {
  font-size: 48rpx;
}

.badge-info {
  flex: 1;
}

.badge-top {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 6rpx;
}

.badge-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #FFFFFF;
}

.level-tag {
  font-size: 20rpx;
  color: rgba(255, 255, 255, 0.7);
  background: rgba(255, 255, 255, 0.15);
  padding: 2rpx 12rpx;
  border-radius: 8rpx;
}

.badge-desc {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.65);
}
</style>
