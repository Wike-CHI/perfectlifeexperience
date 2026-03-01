<template>
  <view class="page-container">
    <!-- 顶部标题 -->
    <view class="header">
      <text class="header-title">佣金分配规则 V2</text>
      <text class="header-desc">简化佣金制度，公平透明，奖励丰厚</text>
    </view>

    <!-- 佣金分配表 -->
    <view class="section">
      <view class="section-header">
        <view class="section-icon">💰</view>
        <text class="section-title">佣金分配表</text>
      </view>
      <view class="level-table">
        <view class="table-header">
          <text class="col col-level">推广人等级</text>
          <text class="col col-own">推广人拿</text>
          <text class="col col-up">上级分配</text>
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

    <!-- 计算示例 -->
    <view class="section">
      <view class="section-header">
        <view class="section-icon">📊</view>
        <text class="section-title">计算示例</text>
      </view>
      <view class="example-box">
        <view class="example-title">
          <text>假设订单金额：<text class="highlight">¥100</text></text>
        </view>
        <view class="example-scenario">
          <text class="scenario-title">场景：四级代理推广订单</text>
          <view class="breakdown">
            <view class="breakdown-item">
              <text class="breakdown-label">四级代理（推广人）</text>
              <text class="breakdown-value">¥8 (8%)</text>
            </view>
            <view class="breakdown-item">
              <text class="breakdown-label">三级代理（上级1）</text>
              <text class="breakdown-value">¥4 (4%)</text>
            </view>
            <view class="breakdown-item">
              <text class="breakdown-label">二级代理（上级2）</text>
              <text class="breakdown-value">¥4 (4%)</text>
            </view>
            <view class="breakdown-item">
              <text class="breakdown-label">一级代理（上级3）</text>
              <text class="breakdown-value">¥4 (4%)</text>
            </view>
            <view class="breakdown-item highlight-row">
              <text class="breakdown-label">佣金总计</text>
              <text class="breakdown-value">¥20 (20%)</text>
            </view>
            <view class="breakdown-item">
              <text class="breakdown-label">公司收益</text>
              <text class="breakdown-value">¥80 (80%)</text>
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
        <text class="tip-item">• 每笔订单的佣金总额固定为订单金额的20%</text>
        <text class="tip-item">• 佣金根据推广人的代理等级和上级关系自动分配</text>
        <text class="tip-item">• 所有代理的佣金总计不超过订单金额的20%</text>
        <text class="tip-item">• 佣金在订单完成后自动结算到各代理账户</text>
        <text class="tip-item">• 晋升更高级别代理可获得更高的推广佣金比例</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
// V2佣金分配规则
const agentLevels = [
  { level: 1, name: '一级代理', own: '20%', up: '无', total: '20%' },
  { level: 2, name: '二级代理', own: '12%', up: '一级8%', total: '20%' },
  { level: 3, name: '三级代理', own: '12%', up: '二级4% + 一级4%', total: '20%' },
  { level: 4, name: '四级代理', own: '8%', up: '三级4% + 二级4% + 一级4%', total: '20%' }
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

/* 星级卡片样式已删除（当前系统无星级概念） */

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
