<template>
  <view class="page-container">
    <!-- 顶部标题 -->
    <view class="header">
      <text class="header-title">佣金分配规则</text>
      <text class="header-desc">公平透明，奖励丰厚</text>
    </view>

    <!-- 佣金分配表 -->
    <view class="section">
      <view class="section-header">
        <view class="section-icon"></view>
        <text class="section-title">佣金分配表</text>
      </view>
      <view class="level-table">
        <view class="table-header">
          <text class="col col-level">推广人等级</text>
          <text class="col col-own">推广人拿</text>
          <text class="col col-up">上级推广人分配</text>
          <text class="col col-total">总计</text>
        </view>
        <view class="table-row" v-for="(item, index) in agentLevels" :key="index">
          <view class="col col-level">
            <view :class="['level-badge', 'level-' + item.level]">
              <text>{{ item.name }}</text>
            </view>
          </view>
          <text class="col col-own">{{ item.own }}</text>
          <text class="col col-up">{{ item.up }}</text>
          <text class="col col-total">{{ item.total }}</text>
        </view>
      </view>
    </view>

    

    <!-- 注意事项 -->
    <view class="section tips-section">
      <view class="section-header">
        <view class="section-icon"></view>
        <text class="section-title">温馨提示</text>
      </view>
      <view class="tips-list">
        <text class="tip-item">每笔订单的佣金总额固定为订单金额的20%</text>
        <text class="tip-item">佣金根据推广人的等级和上级推广人关系自动分配</text>
        <text class="tip-item">所有推广人的佣金总计不超过订单金额的20%</text>
        <text class="tip-item">佣金在订单完成后自动结算到各推广人账户</text>
        <text class="tip-item">升级更高级别可获得更高的推广佣金比例</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { usePromotionConfig } from '@/composables/usePromotionConfig';
import { AGENT_LEVEL_NAMES } from '@/constants/promotion';

const { config, loading, loadConfig, getCommissionRule } = usePromotionConfig();

// 佣金分配表 - 从配置生成
const agentLevels = computed(() => {
  const levels = [
    { level: 1, name: '金牌推广员', key: 1 },
    { level: 2, name: '银牌', key: 2 },
    { level: 3, name: '铜牌', key: 3 },
    { level: 4, name: '普通会员', key: 4 }
  ];

  return levels.map(l => {
    const rule = getCommissionRule(l.key);
    const ownPercent = rule ? (rule.own * 100).toFixed(0) : '0';

    let upText = '无';
    if (rule && rule.upstream && rule.upstream.length > 0) {
      const upPercent = rule.upstream.map((u: number) => (u * 100).toFixed(0)).join(' + ');
      upText = upPercent + '%';
    }

    return {
      level: l.level,
      name: l.name,
      own: ownPercent + '%',
      up: upText,
      total: '20%'
    };
  });
});

// 计算示例数据 - 从配置生成
const exampleData = computed(() => {
  const rule = getCommissionRule(4); // 普通会员
  const ownAmount = 100 * rule.own;
  const upstreamTotal = rule.upstream.reduce((sum, u) => sum + u, 0) * 100;
  const commissionTotal = 20;
  const companyTotal = 100 - commissionTotal;

  // 计算各上级金额
  const upstreamAmounts = rule.upstream.map((u: number) => ({
    name: `铜牌/银牌/金牌`,
    amount: (u * 100).toFixed(0),
    percent: (u * 100).toFixed(0)
  }));

  return {
    ownAmount: ownAmount.toFixed(0),
    upstreamAmounts,
    upstreamTotal: upstreamTotal.toFixed(0),
    commissionTotal: commissionTotal.toString(),
    companyTotal: companyTotal.toString()
  };
});

// 加载配置
onMounted(() => {
  loadConfig();
});
</script>

<style lang="scss" scoped>
.page-container {
  min-height: 100vh;
  background: linear-gradient(180deg, #F5F0E8 0%, #FFFFFF 30%);
  padding-bottom: 60rpx;
}

.header {
  padding: 60rpx 40rpx 40rpx;
  text-align: center;
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

.section {
  margin: 0 24rpx 32rpx;
  background: #FFFFFF;
  border-radius: 24rpx;
  padding: 32rpx;
  box-shadow: 0 4rpx 20rpx rgba(61, 41, 20, 0.06);
}

.section-header {
  display: flex;
  align-items: center;
  margin-bottom: 28rpx;
}

.section-icon {
  width: 12rpx;
  height: 12rpx;
  background: #C9A962;
  border-radius: 50%;
  margin-right: 16rpx;
}

.section-title {
  font-size: 34rpx;
  font-weight: 600;
  color: #3D2914;
}

/* 等级表格 */
.level-table {
  background: #FAFAFA;
  border-radius: 16rpx;
  overflow: hidden;
}

.table-header {
  display: flex;
  padding: 20rpx 24rpx;
  background: #F5F0E8;
}

.table-header text {
  font-size: 26rpx;
  font-weight: 600;
  color: #6B5B4F;
}

.table-row {
  display: flex;
  padding: 24rpx;
  border-bottom: 1rpx solid #F0EBE3;
}

.table-row:last-child {
  border-bottom: none;
}

.col {
  display: flex;
  align-items: center;
}

.col-level {
  width: 180rpx;
}

.col-own, .col-up, .col-total {
  flex: 1;
  font-size: 26rpx;
  color: #3D2914;
}

.level-badge {
  padding: 8rpx 16rpx;
  border-radius: 8rpx;
}

.level-badge text {
  font-size: 22rpx;
  color: #FFFFFF;
  font-weight: 600;
}

.level-badge.level-1 { background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%); }
.level-badge.level-2 { background: linear-gradient(135deg, #C0C0C0 0%, #A8A8A8 100%); }
.level-badge.level-3 { background: linear-gradient(135deg, #CD7F32 0%, #B8860B 100%); }
.level-badge.level-4 { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }

/* 计算示例 */
.example-box {
  background: #FAFAFA;
  border-radius: 16rpx;
  padding: 28rpx;
}

.example-title {
  font-size: 28rpx;
  color: #3D2914;
  margin-bottom: 24rpx;
}

.highlight {
  color: #D4A574;
  font-weight: 700;
}

.example-scenario {
  background: #FFFFFF;
  border-radius: 12rpx;
  padding: 24rpx;
}

.scenario-title {
  display: block;
  font-size: 26rpx;
  color: #6B5B4F;
  margin-bottom: 20rpx;
}

.breakdown {
  border-top: 1rpx dashed #E0DDD8;
  padding-top: 16rpx;
}

.breakdown-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12rpx 0;
}

.breakdown-label {
  font-size: 26rpx;
  color: #6B5B4F;
}

.breakdown-value {
  font-size: 28rpx;
  font-weight: 600;
  color: #3D2914;
}

.highlight-row {
  margin-top: 12rpx;
  padding-top: 20rpx;
  border-top: 2rpx solid #D4A574;
}

.highlight-row .breakdown-value {
  color: #D4A574;
  font-size: 32rpx;
}

/* 温馨提示 */
.tips-section {
  background: linear-gradient(135deg, #FFF8F0 0%, #FFFFFF 100%);
}

.tips-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.tip-item {
  font-size: 26rpx;
  color: #6B5B4F;
  line-height: 1.6;
}
</style>
