<template>
  <view class="page-container">
    <!-- 顶部标题 -->
    <view class="header">
      <text class="header-title">晋升机制详解</text>
      <text class="header-desc">从普通到金牌，开启您的晋升之路</text>
    </view>

    <!-- 晋升路径图 -->
    <view class="section">
      <view class="section-header">
        <view class="section-icon">
          <image class="icon-svg" src="/static/icons/icon-path.svg" mode="aspectFit"/>
        </view>
        <text class="section-title">晋升路径</text>
      </view>
      <view class="path-flow">
        <view class="path-node" v-for="(item, index) in pathNodes" :key="index">
          <view class="node-circle" :style="{ background: item.bgColor }">
            <text class="node-icon">{{ item.icon }}</text>
          </view>
          <text class="node-name">{{ item.name }}</text>
          <view class="node-arrow" v-if="index < pathNodes.length - 1">
            <text class="arrow-text">→</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 晋升条件详情 -->
    <view class="section">
      <view class="section-header">
        <view class="section-icon">
          <image class="icon-svg" src="/static/icons/icon-condition.svg" mode="aspectFit"/>
        </view>
        <text class="section-title">晋升条件</text>
      </view>
      <view class="condition-cards">
        <view class="condition-card" v-for="(item, index) in conditions" :key="index">
          <view class="condition-header" :style="{ background: item.bgColor }">
            <text class="condition-level">{{ item.name }}</text>
            <text class="condition-icon">{{ item.icon }}</text>
          </view>
          <view class="condition-body">
            <view class="condition-row">
              <view class="condition-label">
                <image class="label-icon" src="/static/icons/icon-sales.svg" mode="aspectFit"/>
                <text class="label-text">销售额要求</text>
              </view>
              <text class="condition-value">{{ item.salesReq }}</text>
            </view>
            <view class="condition-divider"></view>
            <view class="condition-row">
              <view class="condition-label">
                <image class="label-icon" src="/static/icons/icon-users.svg" mode="aspectFit"/>
                <text class="label-text">人数要求</text>
              </view>
              <text class="condition-value">{{ item.countReq }}</text>
            </view>
            <view class="condition-tip" v-if="item.tip">
              <text>{{ item.tip }}</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 权益对比 -->
    <view class="section">
      <view class="section-header">
        <view class="section-icon">
          <image class="icon-svg" src="/static/icons/icon-benefit.svg" mode="aspectFit"/>
        </view>
        <text class="section-title">权益对比</text>
      </view>
      <view class="compare-table">
        <view class="compare-header">
          <text class="compare-col col-name">权益项目</text>
          <text class="compare-col col-level">普通</text>
          <text class="compare-col col-level">铜牌</text>
          <text class="compare-col col-level">银牌</text>
          <text class="compare-col col-level">金牌</text>
        </view>
        <view class="compare-row" v-for="(item, index) in compareItems" :key="index">
          <text class="compare-col col-name">{{ item.name }}</text>
          <text class="compare-col col-level" v-for="(val, vIndex) in item.values" :key="vIndex">
            <text :class="['val-' + val.type]">{{ val.text }}</text>
          </text>
        </view>
      </view>
    </view>

    <!-- 晋升FAQ -->
    <view class="section">
      <view class="section-header">
        <view class="section-icon">
          <image class="icon-svg" src="/static/icons/icon-faq.svg" mode="aspectFit"/>
        </view>
        <text class="section-title">常见问题</text>
      </view>
      <view class="faq-list">
        <view class="faq-item" v-for="(item, index) in faqList" :key="index">
          <view class="faq-question" @click="toggleFaq(index)">
            <text class="faq-q">{{ item.question }}</text>
            <text class="faq-arrow" :class="{ expanded: item.expanded }">▼</text>
          </view>
          <view class="faq-answer" v-if="item.expanded">
            <text>{{ item.answer }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 底部提示 -->
    <view class="bottom-tips">
      <text class="tips-text">晋升后权益立即生效，祝您早日晋升金牌！</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';

// 晋升路径节点
const pathNodes = [
  { name: '普通', icon: '普', bgColor: '#9E9E9E' },
  { name: '铜牌', icon: '铜', bgColor: 'linear-gradient(135deg, #CD7F32 0%, #B8860B 100%)' },
  { name: '银牌', icon: '银', bgColor: 'linear-gradient(135deg, #C0C0C0 0%, #A8A8A8 100%)' },
  { name: '金牌', icon: '金', bgColor: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)' }
];

// 晋升条件
const conditions = [
  {
    name: '铜牌会员',
    icon: '铜',
    bgColor: 'linear-gradient(135deg, #CD7F32 0%, #B8860B 100%)',
    salesReq: '累计 ≥ ¥20,000',
    countReq: '或直推 ≥ 30人',
    tip: '满足任一条件即可晋升'
  },
  {
    name: '银牌会员',
    icon: '银',
    bgColor: 'linear-gradient(135deg, #C0C0C0 0%, #A8A8A8 100%)',
    salesReq: '本月 ≥ ¥50,000',
    countReq: '或团队 ≥ 50人',
    tip: '销售额按月统计，需保持活跃'
  },
  {
    name: '金牌会员',
    icon: '金',
    bgColor: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
    salesReq: '本月 ≥ ¥200,000',
    countReq: '或团队 ≥ 200人',
    tip: '最高等级，享受全部权益'
  }
];

// 权益对比
const compareItems = [
  {
    name: '基础佣金',
    values: [
      { text: '✓', type: 'yes' },
      { text: '✓', type: 'yes' },
      { text: '✓', type: 'yes' },
      { text: '✓', type: 'yes' }
    ]
  },
  {
    name: '复购奖励',
    values: [
      { text: '✗', type: 'no' },
      { text: '+3%', type: 'highlight' },
      { text: '+3%', type: 'highlight' },
      { text: '+3%', type: 'highlight' }
    ]
  },
  {
    name: '团队管理奖',
    values: [
      { text: '✗', type: 'no' },
      { text: '✗', type: 'no' },
      { text: '+2%', type: 'highlight' },
      { text: '+2%', type: 'highlight' }
    ]
  },
  {
    name: '专属标识',
    values: [
      { text: '普通', type: 'normal' },
      { text: '铜牌', type: 'normal' },
      { text: '银牌', type: 'normal' },
      { text: '金牌', type: 'normal' }
    ]
  },
  {
    name: '优先客服',
    values: [
      { text: '✗', type: 'no' },
      { text: '✗', type: 'no' },
      { text: '✗', type: 'no' },
      { text: '✓', type: 'yes' }
    ]
  }
];

// FAQ列表
const faqList = ref([
  {
    question: '晋升条件是累计还是按月？',
    answer: '铜牌晋升为累计条件（累计销售额或累计直推人数）；银牌和金牌为月度条件（本月销售额或当前团队人数），每月销售额会重置。',
    expanded: false
  },
  {
    question: '晋升后等级会降级吗？',
    answer: '星级身份是永久性的，一旦晋升不会降级。但月度销售额会影响您当前的晋升进度显示。',
    expanded: false
  },
  {
    question: '团队人数如何计算？',
    answer: '团队人数包括您的所有下级成员（一级至四级），只要是通过您的推广链接注册的用户都计入团队。',
    expanded: false
  },
  {
    question: '如何查看当前晋升进度？',
    answer: '在推广中心首页可以看到当前的晋升进度条，显示距离下一等级的完成百分比。',
    expanded: false
  },
  {
    question: '晋升后奖励何时生效？',
    answer: '晋升立即生效，下次订单结算时即可享受新的权益比例。',
    expanded: false
  }
]);

const toggleFaq = (index: number) => {
  faqList.value[index].expanded = !faqList.value[index].expanded;
};
</script>

<style lang="scss" scoped>
.page-container {
  min-height: 100vh;
  background: linear-gradient(180deg, #F5F0E8 0%, #FFFFFF 30%);
  padding-bottom: 100rpx;
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
  width: 40rpx;
  height: 40rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16rpx;
}

.section-icon .icon-svg {
  width: 36rpx;
  height: 36rpx;
}

.section-title {
  font-size: 34rpx;
  font-weight: 600;
  color: #3D2914;
}

/* 晋升路径图 */
.path-flow {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx 0;
}

.path-node {
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
}

.node-circle {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12rpx;
}

.node-icon {
  font-size: 32rpx;
  color: #FFFFFF;
  font-weight: 700;
}

.node-name {
  font-size: 24rpx;
  color: #6B5B4F;
}

.node-arrow {
  position: absolute;
  right: -60rpx;
  top: 30rpx;
}

.arrow-text {
  font-size: 28rpx;
  color: #D4A574;
}

/* 晋升条件卡片 */
.condition-cards {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.condition-card {
  background: #FAFAFA;
  border-radius: 16rpx;
  overflow: hidden;
}

.condition-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20rpx 28rpx;
}

.condition-level {
  font-size: 30rpx;
  font-weight: 600;
  color: #FFFFFF;
}

.condition-icon {
  font-size: 36rpx;
  color: #FFFFFF;
}

.condition-body {
  padding: 24rpx 28rpx;
}

.condition-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.condition-label {
  display: flex;
  align-items: center;
}

.label-icon {
  width: 32rpx;
  height: 32rpx;
  margin-right: 12rpx;
}

.label-icon .icon-svg {
  width: 28rpx;
  height: 28rpx;
}

.label-text {
  font-size: 26rpx;
  color: #6B5B4F;
}

.condition-value {
  font-size: 28rpx;
  font-weight: 600;
  color: #3D2914;
}

.condition-divider {
  height: 1rpx;
  background: #E8E4DD;
  margin: 16rpx 0;
}

.condition-tip {
  margin-top: 16rpx;
  padding: 16rpx 20rpx;
  background: #FFF8F0;
  border-radius: 8rpx;
}

.condition-tip text {
  font-size: 24rpx;
  color: #D4A574;
}

/* 权益对比表格 */
.compare-table {
  background: #FAFAFA;
  border-radius: 16rpx;
  overflow: hidden;
}

.compare-header {
  display: flex;
  background: #F5F0E8;
  padding: 20rpx 0;
}

.compare-row {
  display: flex;
  padding: 20rpx 0;
  border-bottom: 1rpx solid #F0EBE3;
}

.compare-row:last-child {
  border-bottom: none;
}

.compare-col {
  text-align: center;
}

.col-name {
  width: 200rpx;
  font-size: 26rpx;
  color: #3D2914;
  text-align: left;
  padding-left: 24rpx;
}

.col-level {
  flex: 1;
  font-size: 26rpx;
}

.val-yes {
  color: #00A870;
  font-weight: 600;
}

.val-no {
  color: #9B8B7F;
}

.val-highlight {
  color: #D4A574;
  font-weight: 600;
}

.val-normal {
  color: #6B5B4F;
}

/* FAQ列表 */
.faq-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.faq-item {
  background: #FAFAFA;
  border-radius: 12rpx;
  overflow: hidden;
}

.faq-question {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx;
  cursor: pointer;
}

.faq-q {
  font-size: 28rpx;
  font-weight: 500;
  color: #3D2914;
  flex: 1;
}

.faq-arrow {
  font-size: 20rpx;
  color: #9B8B7F;
  transition: transform 0.3s;
}

.faq-arrow.expanded {
  transform: rotate(180deg);
}

.faq-answer {
  padding: 0 24rpx 24rpx;
}

.faq-answer text {
  font-size: 26rpx;
  color: #6B5B4F;
  line-height: 1.6;
}

/* 底部提示 */
.bottom-tips {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 24rpx 40rpx;
  background: linear-gradient(180deg, transparent 0%, #FFFFFF 30%);
}

.tips-text {
  display: block;
  text-align: center;
  font-size: 26rpx;
  color: #D4A574;
}
</style>
