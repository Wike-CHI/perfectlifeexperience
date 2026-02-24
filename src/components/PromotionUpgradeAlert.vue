<template>
  <view class="promotion-upgrade-alert" v-if="show">
    <view class="alert-backdrop" @click="close"></view>
    <view class="alert-content">
      <view class="alert-icon">🎉</view>
      <view class="alert-title">恭喜升级！</view>
      <view class="alert-message">
        您已从{{ levelNames[oldLevel] }}升级到{{ levelNames[newLevel] }}
      </view>

      <!-- 跟随升级提示 -->
      <view v-if="followUpdates.length > 0" class="follow-upgrade">
        <view class="follow-title">下级跟随升级：</view>
        <view class="follow-list">
          <view v-for="item in followUpdates" :key="item.childId" class="follow-item">
            {{ item.childName }} 已从{{ levelNames[item.from] }}升到{{ levelNames[item.to] }}
          </view>
        </view>
      </view>

      <!-- 佣金变化对比 -->
      <view class="commission-compare">
        <view class="compare-title">佣金变化：</view>
        <view class="compare-item">
          之前：{{ oldCommission }}元/百元
          <text class="arrow">→</text>
          现在：{{ newCommission }}元/百元
        </view>
        <view class="compare-increase" v-if="commissionDiff > 0">
          提升 +{{ commissionDiff }}元！
        </view>
      </view>

      <button class="alert-close" @click="close">知道了</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  show: boolean;
  oldLevel: number;
  newLevel: number;
  followUpdates: Array<{
    childId: string;
    childName: string;
    from: number;
    to: number;
  }>;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  (e: 'close'): void;
}>();

const levelNames: Record<number, string> = {
  1: '一级代理',
  2: '二级代理',
  3: '三级代理',
  4: '四级代理'
};

// 计算佣金变化
const oldCommission = computed(() => {
  const commissions = { 1: 20, 2: 12, 3: 12, 4: 8 };
  return commissions[props.oldLevel as keyof typeof commissions] || 8;
});

const newCommission = computed(() => {
  const commissions = { 1: 20, 2: 12, 3: 12, 4: 8 };
  return commissions[props.newLevel as keyof typeof commissions] || 8;
});

const commissionDiff = computed(() => newCommission.value - oldCommission.value);

const close = () => {
  emit('close');
};
</script>

<style lang="scss" scoped>
.promotion-upgrade-alert {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
}

.alert-backdrop {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
}

.alert-content {
  position: relative;
  width: 80%;
  max-width: 400px;
  background: #fff;
  border-radius: 16rpx;
  padding: 40rpx;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.1);
}

.alert-icon {
  font-size: 80rpx;
  text-align: center;
  margin-bottom: 20rpx;
}

.alert-title {
  font-size: 36rpx;
  font-weight: bold;
  text-align: center;
  margin-bottom: 20rpx;
  color: #3D2914;
}

.alert-message {
  font-size: 28rpx;
  text-align: center;
  margin-bottom: 30rpx;
  color: #666;
}

.follow-upgrade {
  background: #f5f5f5;
  border-radius: 12rpx;
  padding: 20rpx;
  margin-bottom: 30rpx;
}

.follow-title {
  font-size: 26rpx;
  font-weight: bold;
  margin-bottom: 10rpx;
  color: #3D2914;
}

.follow-item {
  font-size: 24rpx;
  color: #666;
  margin-bottom: 8rpx;
  padding-left: 20rpx;
}

.commission-compare {
  margin-bottom: 30rpx;
}

.compare-title {
  font-size: 26rpx;
  font-weight: bold;
  margin-bottom: 10rpx;
  color: #3D2914;
}

.compare-item {
  font-size: 26rpx;
  color: #666;
  margin-bottom: 10rpx;
}

.arrow {
  margin: 0 10rpx;
}

.compare-increase {
  font-size: 28rpx;
  font-weight: bold;
  color: #C9A962;
}

.alert-close {
  width: 100%;
  background: #3D2914;
  color: #fff;
  border: none;
  border-radius: 12rpx;
  padding: 24rpx;
  font-size: 32rpx;
}
</style>
