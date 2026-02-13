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
    
    <!-- 星级徽章 -->
    <view class="badge star-badge" :style="starBadgeStyle">
      <view class="badge-icon">
        <text class="star-icon" v-for="i in starLevel" :key="i">★</text>
        <text class="star-icon empty" v-for="i in (3 - starLevel)" :key="'empty-' + i">☆</text>
      </view>
      <view class="badge-info">
        <text class="badge-title">{{ starLevelName }}</text>
        <text class="badge-subtitle">星级身份</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { StarLevel, AgentLevel } from '@/types/index';

// Props 定义
interface Props {
  starLevel: StarLevel;
  agentLevel: AgentLevel;
}

const props = withDefaults(defineProps<Props>(), {
  starLevel: 0,
  agentLevel: 4
});

// 代理等级名称映射
const agentLevelNames: Record<AgentLevel, string> = {
  0: '总公司',
  1: '一级代理',
  2: '二级代理',
  3: '三级代理',
  4: '四级代理'
};

// 星级名称映射
const starLevelNames: Record<StarLevel, string> = {
  0: '普通会员',
  1: '铜牌推广员',
  2: '银牌推广员',
  3: '金牌推广员'
};

// 代理等级罗马数字
const agentLevelRoman = computed(() => {
  const romans: Record<AgentLevel, string> = {
    0: 'HQ',
    1: 'I',
    2: 'II',
    3: 'III',
    4: 'IV'
  };
  return romans[props.agentLevel];
});

// 代理等级名称
const agentLevelName = computed(() => agentLevelNames[props.agentLevel]);

// 星级名称
const starLevelName = computed(() => starLevelNames[props.starLevel]);

// 代理徽章样式
const agentBadgeStyle = computed(() => {
  const gradients: Record<AgentLevel, string> = {
    0: 'linear-gradient(135deg, #3D2914 0%, #C9A962 100%)', // HQ: 深棕色到琥珀金
    1: 'linear-gradient(135deg, #C9A962 0%, #B8860B 100%)', // 一级: 琥珀金到铜色
    2: 'linear-gradient(135deg, #D4A574 0%, #A8A8A8 100%)', // 二级: 青铜到暖银
    3: 'linear-gradient(135deg, #CD7F32 0%, #8B7355 100%)', // 三级: 青铜加深棕
    4: 'linear-gradient(135deg, #6B5B4F 0%, #4A4A4A 100%)' // 四级: 暖炭灰
  };
  return {
    background: gradients[props.agentLevel]
  };
});

// 星级徽章样式
const starBadgeStyle = computed(() => {
  const gradients: Record<StarLevel, string> = {
    0: 'linear-gradient(135deg, #D4D4D4 0%, #BDBDBD 100%)', // 普通: 中性灰
    1: 'linear-gradient(135deg, #CD7F32 0%, #B8860B 100%)', // 铜牌: 青铜色
    2: 'linear-gradient(135deg, #E8E8E8 0%, #C0C0C0 100%)', // 银牌: 暖银色
    3: 'linear-gradient(135deg, #FFD700 0%, #C9A962 100%)' // 金牌: 黄金到琥珀金
  };
  return {
    background: gradients[props.starLevel]
  };
});
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

.star-icon {
  font-size: 20rpx;
  color: #fff;
  text-shadow: 0 1rpx 2rpx rgba(0, 0, 0, 0.2);
}

.star-icon.empty {
  opacity: 0.5;
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
