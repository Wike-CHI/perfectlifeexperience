<template>
  <view class="page-container">
    <!-- 顶部标题 -->
    <view class="header">
      <text class="header-title">分销机制详解</text>
      <text class="header-desc">了解四重分润，开启财富增长之旅</text>
    </view>

    <!-- 四重分润概览 -->
    <view class="section">
      <view class="section-header">
        <view class="section-icon">💰</view>
        <text class="section-title">四重分润体系</text>
      </view>
      <view class="reward-cards">
        <view class="reward-card" v-for="(item, index) in rewardTypes" :key="index">
          <view class="reward-icon" :style="{ background: item.color }">
            <text>{{ item.icon }}</text>
          </view>
          <view class="reward-info">
            <text class="reward-name">{{ item.name }}</text>
            <text class="reward-ratio">{{ item.ratio }}</text>
            <text class="reward-desc">{{ item.desc }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 代理等级权益 -->
    <view class="section">
      <view class="section-header">
        <view class="section-icon">🎖️</view>
        <text class="section-title">代理等级权益</text>
      </view>
      <view class="level-table">
        <view class="table-header">
          <text class="col col-level">等级</text>
          <text class="col col-ratio">基础佣金</text>
          <text class="col col-condition">条件</text>
        </view>
        <view class="table-row" v-for="(item, index) in agentLevels" :key="index">
          <view class="col col-level">
            <view :class="['level-badge', 'level-' + item.level]">
              <text>{{ item.name }}</text>
            </view>
          </view>
          <text class="col col-ratio">{{ item.ratio }}</text>
          <text class="col col-condition">{{ item.condition }}</text>
        </view>
      </view>
    </view>

    <!-- 星级权益 -->
    <view class="section">
      <view class="section-header">
        <view class="section-icon">⭐</view>
        <text class="section-title">星级身份权益</text>
      </view>
      <view class="star-cards">
        <view class="star-card" v-for="(item, index) in starLevels" :key="index">
          <view class="star-header" :style="{ background: item.bgColor }">
            <text class="star-name">{{ item.name }}</text>
            <text class="star-icon">{{ item.icon }}</text>
          </view>
          <view class="star-benefits">
            <view class="benefit-item" v-for="(benefit, bIndex) in item.benefits" :key="bIndex">
              <text class="benefit-dot">•</text>
              <text class="benefit-text">{{ benefit }}</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 分润示例 -->
    <view class="section">
      <view class="section-header">
        <view class="section-icon">📊</view>
        <text class="section-title">分润示例</text>
      </view>
      <view class="example-box">
        <view class="example-title">
          <text>假设订单金额：<text class="highlight">¥1000</text></text>
        </view>
        <view class="example-scenario">
          <text class="scenario-title">场景：银牌会员 + 二级代理</text>
          <view class="breakdown">
            <view class="breakdown-item">
              <text class="breakdown-label">基础佣金</text>
              <text class="breakdown-value">¥100 (10%)</text>
            </view>
            <view class="breakdown-item">
              <text class="breakdown-label">复购奖励</text>
              <text class="breakdown-value">¥30 (3%)</text>
            </view>
            <view class="breakdown-item">
              <text class="breakdown-label">团队管理奖</text>
              <text class="breakdown-value">¥20 (2%)</text>
            </view>
            <view class="breakdown-item highlight-row">
              <text class="breakdown-label">合计收益</text>
              <text class="breakdown-value">¥150</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 注意事项 -->
    <view class="section tips-section">
      <view class="section-header">
        <view class="section-icon">💡</view>
        <text class="section-title">温馨提示</text>
      </view>
      <view class="tips-list">
        <text class="tip-item">• 基础佣金根据您的代理等级确定</text>
        <text class="tip-item">• 复购奖励需要达到铜牌以上星级</text>
        <text class="tip-item">• 团队管理奖需要达到银牌以上星级</text>
        <text class="tip-item">• 育成津贴需要绑定导师关系</text>
        <text class="tip-item">• 奖励在订单完成后自动结算到账户</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
// 四重分润类型
const rewardTypes = [
  {
    name: '基础佣金',
    icon: '佣',
    ratio: '5% - 20%',
    desc: '根据代理等级确定',
    color: 'linear-gradient(135deg, #0052D9 0%, #00A1FF 100%)'
  },
  {
    name: '复购奖励',
    icon: '复',
    ratio: '+3%',
    desc: '铜牌以上星级专属',
    color: 'linear-gradient(135deg, #00A870 0%, #4CD964 100%)'
  },
  {
    name: '团队管理奖',
    icon: '管',
    ratio: '+2%',
    desc: '银牌以上星级专属',
    color: 'linear-gradient(135deg, #7C3AED 0%, #A855F7 100%)'
  },
  {
    name: '育成津贴',
    icon: '育',
    ratio: '+2%',
    desc: '绑定导师关系后',
    color: 'linear-gradient(135deg, #FF6B00 0%, #FFB800 100%)'
  }
];

// 代理等级权益
const agentLevels = [
  { level: 0, name: 'HQ', ratio: '20%', condition: '总部直推' },
  { level: 1, name: 'I级', ratio: '15%', condition: '一级代理' },
  { level: 2, name: 'II级', ratio: '12%', condition: '二级代理' },
  { level: 3, name: 'III级', ratio: '8%', condition: '三级代理' },
  { level: 4, name: 'IV级', ratio: '5%', condition: '四级代理' }
];

// 星级权益
const starLevels = [
  {
    name: '普通会员',
    icon: '普',
    bgColor: '#9E9E9E',
    benefits: ['享受基础佣金', '可参与推广活动']
  },
  {
    name: '铜牌会员',
    icon: '铜',
    bgColor: 'linear-gradient(135deg, #CD7F32 0%, #B8860B 100%)',
    benefits: ['享受基础佣金', '复购奖励 +3%', '专属铜牌标识']
  },
  {
    name: '银牌会员',
    icon: '银',
    bgColor: 'linear-gradient(135deg, #C0C0C0 0%, #A8A8A8 100%)',
    benefits: ['享受基础佣金', '复购奖励 +3%', '团队管理奖 +2%', '专属银牌标识']
  },
  {
    name: '金牌会员',
    icon: '金',
    bgColor: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
    benefits: ['享受基础佣金', '复购奖励 +3%', '团队管理奖 +2%', '专属金牌标识', '优先客服支持']
  }
];
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
  font-size: 36rpx;
  margin-right: 16rpx;
}

.section-title {
  font-size: 34rpx;
  font-weight: 600;
  color: #3D2914;
}

/* 四重分润卡片 */
.reward-cards {
  display: flex;
  flex-wrap: wrap;
  gap: 20rpx;
}

.reward-card {
  width: calc(50% - 10rpx);
  display: flex;
  align-items: flex-start;
  padding: 24rpx;
  background: #FAFAFA;
  border-radius: 16rpx;
}

.reward-icon {
  width: 64rpx;
  height: 64rpx;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16rpx;
}

.reward-icon text {
  font-size: 28rpx;
  color: #FFFFFF;
  font-weight: 700;
}

.reward-info {
  flex: 1;
}

.reward-name {
  display: block;
  font-size: 28rpx;
  font-weight: 600;
  color: #3D2914;
  margin-bottom: 8rpx;
}

.reward-ratio {
  display: block;
  font-size: 32rpx;
  font-weight: 700;
  color: #D4A574;
  margin-bottom: 4rpx;
}

.reward-desc {
  font-size: 22rpx;
  color: #9B8B7F;
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
  width: 160rpx;
}

.col-ratio {
  width: 160rpx;
  font-size: 28rpx;
  font-weight: 600;
  color: #D4A574;
}

.col-condition {
  flex: 1;
  font-size: 26rpx;
  color: #6B5B4F;
}

.level-badge {
  padding: 8rpx 20rpx;
  border-radius: 8rpx;
}

.level-badge text {
  font-size: 24rpx;
  color: #FFFFFF;
  font-weight: 600;
}

.level-badge.level-0 { background: linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%); }
.level-badge.level-1 { background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%); }
.level-badge.level-2 { background: linear-gradient(135deg, #C0C0C0 0%, #A8A8A8 100%); }
.level-badge.level-3 { background: linear-gradient(135deg, #CD7F32 0%, #B8860B 100%); }
.level-badge.level-4 { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }

/* 星级卡片 */
.star-cards {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.star-card {
  background: #FAFAFA;
  border-radius: 16rpx;
  overflow: hidden;
}

.star-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20rpx 24rpx;
}

.star-name {
  font-size: 28rpx;
  font-weight: 600;
  color: #FFFFFF;
}

.star-icon {
  font-size: 32rpx;
  color: #FFFFFF;
}

.star-benefits {
  padding: 20rpx 24rpx;
}

.benefit-item {
  display: flex;
  align-items: center;
  margin-bottom: 12rpx;
}

.benefit-item:last-child {
  margin-bottom: 0;
}

.benefit-dot {
  color: #D4A574;
  margin-right: 12rpx;
}

.benefit-text {
  font-size: 26rpx;
  color: #6B5B4F;
}

/* 分润示例 */
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
