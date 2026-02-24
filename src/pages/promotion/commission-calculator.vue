<template>
  <view class="calculator-container">
    <!-- 页面标题 -->
    <view class="header">
      <text class="header-title">佣金计算器</text>
      <text class="header-desc">输入订单金额，快速计算佣金分配</text>
    </view>

    <!-- 输入区域 -->
    <view class="input-section">
      <view class="input-card">
        <view class="input-item">
          <text class="input-label">订单金额（元）</text>
          <input
            class="input-field"
            type="digit"
            v-model="orderAmount"
            @input="calculate"
            placeholder="请输入金额"
          />
        </view>

        <view class="input-item">
          <text class="input-label">推广人等级</text>
          <picker
            class="picker-field"
            :range="agentLevels"
            :value="selectedLevelIndex"
            @change="onLevelChange"
          >
            <view class="picker-value">
              {{ agentLevels[selectedLevelIndex] }}
            </view>
          </picker>
        </view>
      </view>
    </view>

    <!-- 计算结果 -->
    <view class="result-section" v-if="orderAmount > 0">
      <view class="result-header">
        <text class="result-title">佣金分配结果</text>
        <text class="result-subtitle">订单金额：¥{{ (orderAmount / 100).toFixed(2) }}</text>
      </view>

      <!-- 佣金列表 -->
      <view class="commission-list">
        <view
          v-for="(item, index) in commissionResult"
          :key="index"
          class="commission-item"
        >
          <view class="commission-info">
            <view :class="['commission-badge', 'level-' + (index + 1)]">
              {{ item.role }}
            </view>
            <view class="commission-detail">
              <text class="commission-amount">¥{{ item.amount }}</text>
              <text class="commission-ratio">({{ (item.ratio * 100).toFixed(1) }}%)</text>
            </view>
          </view>
          <!-- 进度条 -->
          <view class="commission-bar">
            <view
              class="bar-fill"
              :style="{ width: (item.ratio * 100) + '%' }"
            ></view>
          </view>
        </view>
      </view>

      <!-- 总计 -->
      <view class="summary-section">
        <view class="summary-item">
          <text class="summary-label">总佣金</text>
          <text class="summary-value highlight">¥{{ totalCommission }}</text>
        </view>
        <view class="summary-item">
          <text class="summary-label">公司利润</text>
          <text class="summary-value">¥{{ companyProfit }}</text>
        </view>
      </view>
    </view>

    <!-- 说明提示 -->
    <view class="tips-section">
      <view class="tips-title">💡 说明</view>
      <view class="tips-list">
        <text class="tip-item">• 佣金总额固定为订单金额的20%</text>
        <text class="tip-item">• 推广人等级越高，自己获得的佣金比例越高</text>
        <text class="tip-item">• 上级分配根据推广路径自动计算</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

// 佣金规则配置
const commissionRules = {
  1: { own: 0.20, upstream: [] },
  2: { own: 0.12, upstream: [0.08] },
  3: { own: 0.12, upstream: [0.04, 0.04] },
  4: { own: 0.08, upstream: [0.04, 0.04, 0.04] }
};

// 角色名称映射
const roleNames = ['推广人', '一级上级', '二级上级', '三级上级'];

// 数据
const orderAmount = ref(0);  // 单位：分
const selectedLevelIndex = ref(3);  // 默认四级代理

const agentLevels = ['一级代理', '二级代理', '三级代理', '四级代理'];

// 计算佣金结果
const commissionResult = computed(() => {
  if (orderAmount.value <= 0) return [];

  const level = selectedLevelIndex.value + 1;
  const rule = commissionRules[level as keyof typeof commissionRules];
  const results = [];

  // 推广人自己
  results.push({
    role: roleNames[0],
    amount: ((orderAmount.value * rule.own) / 100).toFixed(2),
    ratio: rule.own
  });

  // 上级代理
  rule.upstream.forEach((ratio, index) => {
    results.push({
      role: roleNames[index + 1],
      amount: ((orderAmount.value * ratio) / 100).toFixed(2),
      ratio: ratio
    });
  });

  return results;
});

// 总佣金
const totalCommission = computed(() => {
  return (orderAmount.value * 0.2 / 100).toFixed(2);
});

// 公司利润
const companyProfit = computed(() => {
  return (orderAmount.value * 0.8 / 100).toFixed(2);
});

// 选择等级
const onLevelChange = (e: any) => {
  selectedLevelIndex.value = e.detail.value;
};

// 计算方法（实际上由computed自动处理）
const calculate = () => {
  // 触发computed重新计算
};
</script>

<style lang="scss" scoped>
.calculator-container {
  min-height: 100vh;
  background: linear-gradient(180deg, #F5F0E8 0%, #FFFFFF 30%);
  padding: 40rpx 30rpx;
}

.header {
  text-align: center;
  margin-bottom: 40rpx;
}

.header-title {
  display: block;
  font-size: 48rpx;
  font-weight: 700;
  color: #3D2914;
  margin-bottom: 16rpx;
}

.header-desc {
  font-size: 28rpx;
  color: #6B5B4F;
}

/* 输入区域 */
.input-section {
  margin-bottom: 32rpx;
}

.input-card {
  background: #FFFFFF;
  border-radius: 24rpx;
  padding: 32rpx;
  box-shadow: 0 4rpx 20rpx rgba(61, 41, 20, 0.08);
}

.input-item {
  margin-bottom: 32rpx;
}

.input-item:last-child {
  margin-bottom: 0;
}

.input-label {
  display: block;
  font-size: 28rpx;
  font-weight: 600;
  color: #3D2914;
  margin-bottom: 16rpx;
}

.input-field {
  width: 100%;
  height: 88rpx;
  background: #FAFAFA;
  border: 2rpx solid #E0DDD8;
  border-radius: 12rpx;
  padding: 0 24rpx;
  font-size: 32rpx;
  color: #1A1A1A;
}

.picker-field {
  width: 100%;
  height: 88rpx;
  background: #FAFAFA;
  border: 2rpx solid #E0DDD8;
  border-radius: 12rpx;
  display: flex;
  align-items: center;
  padding: 0 24rpx;
}

.picker-value {
  font-size: 32rpx;
  color: #1A1A1A;
  font-weight: 500;
}

/* 结果区域 */
.result-section {
  background: #FFFFFF;
  border-radius: 24rpx;
  padding: 32rpx;
  box-shadow: 0 4rpx 20rpx rgba(61, 41, 20, 0.08);
  margin-bottom: 32rpx;
}

.result-header {
  margin-bottom: 24rpx;
}

.result-title {
  display: block;
  font-size: 34rpx;
  font-weight: 600;
  color: #3D2914;
  margin-bottom: 8rpx;
}

.result-subtitle {
  font-size: 26rpx;
  color: #6B5B4F;
}

/* 佣金列表 */
.commission-list {
  margin-bottom: 32rpx;
}

.commission-item {
  margin-bottom: 24rpx;
}

.commission-item:last-child {
  margin-bottom: 0;
}

.commission-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12rpx;
}

.commission-badge {
  padding: 8rpx 20rpx;
  border-radius: 8rpx;
  font-size: 24rpx;
  font-weight: 600;
  color: #FFFFFF;
}

.commission-badge.level-1 {
  background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);
}

.commission-badge.level-2 {
  background: linear-gradient(135deg, #C0C0C0 0%, #A8A8A8 100%);
}

.commission-badge.level-3 {
  background: linear-gradient(135deg, #CD7F32 0%, #B8860B 100%);
}

.commission-badge.level-4 {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.commission-detail {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.commission-amount {
  font-size: 32rpx;
  font-weight: 700;
  color: #C9A962;
  font-family: 'DM Mono', monospace;
}

.commission-ratio {
  font-size: 24rpx;
  color: #6B5B4F;
}

.commission-bar {
  height: 12rpx;
  background: #F5F0E8;
  border-radius: 6rpx;
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #C9A962 0%, #D4A574 100%);
  border-radius: 6rpx;
  transition: width 0.3s ease;
}

/* 总计 */
.summary-section {
  display: flex;
  justify-content: space-around;
  padding-top: 24rpx;
  border-top: 2rpx solid #F5F0E8;
}

.summary-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.summary-label {
  font-size: 26rpx;
  color: #6B5B4F;
  margin-bottom: 8rpx;
}

.summary-value {
  font-size: 36rpx;
  font-weight: 700;
  color: #3D2914;
  font-family: 'DM Mono', monospace;
}

.summary-value.highlight {
  color: #C9A962;
}

/* 说明 */
.tips-section {
  background: linear-gradient(135deg, #FFF8F0 0%, #FFFFFF 100%);
  border-radius: 24rpx;
  padding: 32rpx;
}

.tips-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #3D2914;
  margin-bottom: 16rpx;
}

.tips-list {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.tip-item {
  font-size: 26rpx;
  color: #6B5B4F;
  line-height: 1.6;
}
</style>
