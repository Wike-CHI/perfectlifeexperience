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

        <!-- 等级选择卡片 -->
        <view class="level-selector">
          <text class="input-label">选择推广人等级</text>
          <view class="level-cards">
            <view
              v-for="(level, index) in agentLevelDetails"
              :key="index"
              :class="['level-card', { active: selectedLevelIndex === index }]"
              @click="selectLevel(index)"
            >
              <view :class="['level-icon', 'level-' + (index + 1)]">
                {{ level.icon }}
              </view>
              <text class="level-name">{{ level.name }}</text>
              <text class="level-ratio">自得{{ (commissionRules[index + 1]?.own * 100 || 0).toFixed(0) }}%</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 计算结果 -->
    <view class="result-section" v-if="parseFloat(orderAmount) > 0">
      <view class="result-header">
        <text class="result-title">佣金分配结果</text>
        <text class="result-subtitle">订单金额：¥{{ parseFloat(orderAmount || 0).toFixed(2) }}</text>
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
      </view>
    </view>

    <!-- 等级对比表 -->
    <view class="compare-section" v-if="parseFloat(orderAmount) > 0">
      <view class="compare-header">
        <text class="compare-title">各等级佣金对比</text>
        <text class="compare-desc">看看不同等级能赚多少</text>
      </view>
      <view class="compare-table">
        <view
          v-for="(level, index) in agentLevelDetails"
          :key="index"
          :class="['compare-row', { highlight: selectedLevelIndex === index }]"
        >
          <view class="compare-level">
            <view :class="['level-badge-mini', 'level-' + (index + 1)]">
              {{ level.icon }}
            </view>
            <text class="compare-level-name">{{ level.name }}</text>
          </view>
          <view class="compare-own">
            <text class="compare-label">自己得</text>
            <text class="compare-value">¥{{ getOwnCommission(index + 1) }}</text>
          </view>
          <view class="compare-total">
            <text class="compare-label">总分配</text>
            <text class="compare-value">¥{{ totalCommission }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 说明提示 -->
    <view class="tips-section">
      <view class="tips-title">💡 说明</view>
      <view class="tips-list">
        <text class="tip-item">• 佣金总额固定为订单金额的20%</text>
        <text class="tip-item">• 推广人等级越高，自己获得的佣金比例越高</text>
        <text class="tip-item">• 上级推广人分配根据推广路径自动计算</text>
        <text class="tip-item">• 金牌推广员独享全部20%佣金，无上级分配</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { usePromotionConfig } from '@/composables/usePromotionConfig';

const { config, loadConfig, getCommissionRule } = usePromotionConfig();

// 角色名称映射
const roleNames = ['推广人', '一级上级推广人', '二级上级推广人', '三级上级推广人'];

// 等级详情
const agentLevelDetails = [
  { name: '金牌推广员', icon: '🥇', desc: '一级推广' },
  { name: '银牌推广员', icon: '🥈', desc: '二级推广' },
  { name: '铜牌推广员', icon: '🥉', desc: '三级推广' },
  { name: '普通会员', icon: '🏅', desc: '四级推广' }
];

// 数据
const orderAmount = ref<string>('');  // 单位：元
const selectedLevelIndex = ref(3);  // 默认普通会员

// 选择等级
const selectLevel = (index: number) => {
  selectedLevelIndex.value = index;
};

// 加载配置
onMounted(() => {
  loadConfig();
});

// 获取当前配置的佣金规则
const commissionRules = computed(() => {
  return {
    1: getCommissionRule(1),
    2: getCommissionRule(2),
    3: getCommissionRule(3),
    4: getCommissionRule(4)
  };
});

// 计算佣金结果
const commissionResult = computed(() => {
  const amount = parseFloat(orderAmount.value) || 0;
  if (amount <= 0) return [];

  const level = selectedLevelIndex.value + 1;
  const rule = commissionRules.value[level];
  const results = [];

  // 推广人自己
  results.push({
    role: roleNames[0],
    amount: (amount * rule.own).toFixed(2),
    ratio: rule.own
  });

  // 上级推广人
  rule.upstream.forEach((ratio: number, index: number) => {
    results.push({
      role: roleNames[index + 1],
      amount: (amount * ratio).toFixed(2),
      ratio: ratio
    });
  });

  return results;
});

// 总佣金
const totalCommission = computed(() => {
  const amount = parseFloat(orderAmount.value) || 0;
  return (amount * 0.2).toFixed(2);
});

// 获取某等级自己能拿的佣金
const getOwnCommission = (level: number) => {
  const amount = parseFloat(orderAmount.value) || 0;
  const rule = commissionRules.value[level];
  return (amount * rule.own).toFixed(2);
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
  padding-bottom: 80rpx;
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

/* 等级选择卡片 */
.level-selector {
  margin-top: 32rpx;
}

.level-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16rpx;
  margin-top: 16rpx;
}

.level-card {
  background: #FAFAFA;
  border: 2rpx solid #E0DDD8;
  border-radius: 16rpx;
  padding: 20rpx 12rpx;
  text-align: center;
  transition: all 0.3s ease;
  cursor: pointer;
}

.level-card.active {
  background: linear-gradient(135deg, #FFF8F0 0%, #FFFFFF 100%);
  border-color: #C9A962;
  box-shadow: 0 4rpx 16rpx rgba(201, 169, 98, 0.3);
  transform: translateY(-4rpx);
}

.level-icon {
  font-size: 40rpx;
  margin-bottom: 8rpx;
}

.level-icon.level-1 {
  filter: drop-shadow(0 2rpx 4rpx rgba(255, 215, 0, 0.5));
}

.level-icon.level-2 {
  filter: drop-shadow(0 2rpx 4rpx rgba(192, 192, 192, 0.5));
}

.level-icon.level-3 {
  filter: drop-shadow(0 2rpx 4rpx rgba(205, 127, 50, 0.5));
}

.level-icon.level-4 {
  filter: drop-shadow(0 2rpx 4rpx rgba(102, 126, 234, 0.3));
}

.level-name {
  display: block;
  font-size: 22rpx;
  font-weight: 600;
  color: #3D2914;
  margin-bottom: 4rpx;
}

.level-card.active .level-name {
  color: #C9A962;
}

.level-ratio {
  display: block;
  font-size: 20rpx;
  color: #6B5B4F;
}

.level-card.active .level-ratio {
  color: #8B7355;
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

/* 对比表 */
.compare-section {
  background: #FFFFFF;
  border-radius: 24rpx;
  padding: 32rpx;
  box-shadow: 0 4rpx 20rpx rgba(61, 41, 20, 0.08);
  margin-bottom: 32rpx;
}

.compare-header {
  margin-bottom: 24rpx;
  text-align: center;
}

.compare-title {
  display: block;
  font-size: 34rpx;
  font-weight: 600;
  color: #3D2914;
  margin-bottom: 8rpx;
}

.compare-desc {
  font-size: 26rpx;
  color: #6B5B4F;
}

.compare-table {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.compare-row {
  display: flex;
  align-items: center;
  background: #FAFAFA;
  border: 2rpx solid #E0DDD8;
  border-radius: 16rpx;
  padding: 20rpx 24rpx;
  transition: all 0.3s ease;
}

.compare-row.highlight {
  background: linear-gradient(135deg, #FFF8F0 0%, #FFFFFF 100%);
  border-color: #C9A962;
  box-shadow: 0 4rpx 12rpx rgba(201, 169, 98, 0.2);
}

.compare-level {
  display: flex;
  align-items: center;
  gap: 12rpx;
  flex: 1;
}

.level-badge-mini {
  width: 48rpx;
  height: 48rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24rpx;
}

.level-badge-mini.level-1 {
  background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);
}

.level-badge-mini.level-2 {
  background: linear-gradient(135deg, #C0C0C0 0%, #A8A8A8 100%);
}

.level-badge-mini.level-3 {
  background: linear-gradient(135deg, #CD7F32 0%, #B8860B 100%);
}

.level-badge-mini.level-4 {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.compare-level-name {
  font-size: 26rpx;
  font-weight: 600;
  color: #3D2914;
}

.compare-row.highlight .compare-level-name {
  color: #C9A962;
}

.compare-own,
.compare-total {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 100rpx;
}

.compare-label {
  font-size: 20rpx;
  color: #6B5B4F;
  margin-bottom: 4rpx;
}

.compare-value {
  font-size: 26rpx;
  font-weight: 700;
  color: #3D2914;
  font-family: 'DM Mono', monospace;
}

.compare-row.highlight .compare-own .compare-value {
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
