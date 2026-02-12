<template>
  <view class="container">
    <!-- 顶部数据概览 -->
    <view class="header-section">
      <view class="header-bg"></view>

      <!-- 身份徽章 -->
      <PromotionBadge
        :starLevel="promotionInfo.starLevel"
        :agentLevel="promotionInfo.agentLevel"
      />

      <view class="stats-grid">
        <view class="stat-card">
          <text class="stat-value">{{ formatPrice(promotionInfo.todayReward) }}</text>
          <text class="stat-label">今日收益</text>
        </view>
        <view class="stat-card">
          <text class="stat-value">{{ formatPrice(promotionInfo.monthReward) }}</text>
          <text class="stat-label">本月收益</text>
        </view>
        <view class="stat-card">
          <text class="stat-value">{{ formatPrice(promotionInfo.totalReward) }}</text>
          <text class="stat-label">累计收益</text>
        </view>
        <view class="stat-card">
          <text class="stat-value">{{ formatPrice(promotionInfo.pendingReward) }}</text>
          <text class="stat-label">待结算</text>
        </view>
      </view>
    </view>

    <!-- 晋升进度 -->
    <PromotionProgress :progress="promotionInfo.promotionProgress" />

    <!-- 收益分类统计 -->
    <view class="reward-category-section">
      <view class="section-title">
        <text>收益明细</text>
      </view>
      <view class="category-grid">
        <view class="category-item">
          <view class="category-icon commission">
            <text>佣</text>
          </view>
          <view class="category-info">
            <text class="category-label">基础佣金</text>
            <text class="category-value">{{ formatPrice(promotionInfo.commissionReward) }}</text>
          </view>
        </view>
        <view class="category-item">
          <view class="category-icon repurchase">
            <text>复</text>
          </view>
          <view class="category-info">
            <text class="category-label">复购奖励</text>
            <text class="category-value">{{ formatPrice(promotionInfo.repurchaseReward) }}</text>
          </view>
        </view>
        <view class="category-item">
          <view class="category-icon management">
            <text>管</text>
          </view>
          <view class="category-info">
            <text class="category-label">团队管理奖</text>
            <text class="category-value">{{ formatPrice(promotionInfo.managementReward) }}</text>
          </view>
        </view>
        <view class="category-item">
          <view class="category-icon nurture">
            <text>育</text>
          </view>
          <view class="category-info">
            <text class="category-label">育成津贴</text>
            <text class="category-value">{{ formatPrice(promotionInfo.nurtureReward) }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 邀请码卡片 -->
    <view class="invite-card">
      <view class="invite-header">
        <text class="invite-title">我的邀请码</text>
      </view>
      <view class="invite-code" @click="copyInviteCode">
        <text class="code-text">{{ promotionInfo.inviteCode || '------' }}</text>
        <text class="copy-hint">点击复制</text>
      </view>
      <view class="invite-desc">
        <text>好友使用你的邀请码注册，即可建立推广关系</text>
      </view>
    </view>

    <!-- 快捷入口 -->
    <view class="menu-section">
      <view class="menu-item" @click="goToTeam">
        <view class="menu-left">
          <view class="menu-icon team">
            <image class="icon-svg" src="/static/icons/icon-team.svg" mode="aspectFit"/>
          </view>
          <view class="menu-info">
            <text class="menu-title">我的团队</text>
            <text class="menu-subtitle">{{ teamTotal }} 位成员</text>
          </view>
        </view>
        <view class="menu-right">
          <view class="team-stats">
            <text class="stat-item" v-if="teamStats.level1">一级 {{ teamStats.level1 }}</text>
            <text class="stat-item" v-if="teamStats.level2">二级 {{ teamStats.level2 }}</text>
          </view>
          <uni-icons type="right" size="16" color="#9B8B7F"></uni-icons>
        </view>
      </view>

      <view class="menu-item" @click="goToRewards">
        <view class="menu-left">
          <view class="menu-icon reward">
            <image class="icon-svg" src="/static/icons/icon-reward.svg" mode="aspectFit"/>
          </view>
          <view class="menu-info">
            <text class="menu-title">奖励明细</text>
            <text class="menu-subtitle">查看收益记录</text>
          </view>
        </view>
        <uni-icons type="right" size="16" color="#9B8B7F"></uni-icons>
      </view>

      <view class="menu-item" @click="goToQRCode">
        <view class="menu-left">
          <view class="menu-icon qrcode">
            <image class="icon-svg" src="/static/icons/icon-qrcode.svg" mode="aspectFit"/>
          </view>
          <view class="menu-info">
            <text class="menu-title">推广二维码</text>
            <text class="menu-subtitle">分享给好友</text>
          </view>
        </view>
        <uni-icons type="right" size="16" color="#9B8B7F"></uni-icons>
      </view>

      <view class="menu-item" @click="goToRewardRules">
        <view class="menu-left">
          <view class="menu-icon rules">
            <image class="icon-svg" src="/static/icons/icon-mechanism.svg" mode="aspectFit"/>
          </view>
          <view class="menu-info">
            <text class="menu-title">分销机制</text>
            <text class="menu-subtitle">四重分润详解</text>
          </view>
        </view>
        <uni-icons type="right" size="16" color="#9B8B7F"></uni-icons>
      </view>

      <view class="menu-item" @click="goToStarRules">
        <view class="menu-left">
          <view class="menu-icon star">
            <image class="icon-svg" src="/static/icons/icon-level-star.svg" mode="aspectFit"/>
          </view>
          <view class="menu-info">
            <text class="menu-title">晋升机制</text>
            <text class="menu-subtitle">升级条件与权益</text>
          </view>
        </view>
        <uni-icons type="right" size="16" color="#9B8B7F"></uni-icons>
      </view>
    </view>

    <!-- 规则说明 -->
    <view class="rules-section">
      <view class="rules-title">
        <text>推广说明</text>
      </view>
      <view class="rule-item">
        <text class="rule-num">1</text>
        <text class="rule-text">通过分享邀请码或二维码邀请好友注册，建立推广关系</text>
      </view>
      <view class="rule-item">
        <text class="rule-num">2</text>
        <text class="rule-text">好友下单后，你可获得相应比例的推广奖励</text>
      </view>
      <view class="rule-item">
        <text class="rule-num">3</text>
        <text class="rule-text">基础佣金按代理等级：一级20%，二级15%，三级10%，四级5%</text>
      </view>
      <view class="rule-item">
        <text class="rule-num">4</text>
        <text class="rule-text">铜牌享3%复购奖，银牌享2%管理奖，导师享2%育成津贴</text>
      </view>
      <view class="rule-item">
        <text class="rule-num">5</text>
        <text class="rule-text">订单完成后 {{ SETTLEMENT_DAYS }} 天自动结算到钱包</text>
      </view>
    </view>

    <!-- 安全区域 -->
    <view class="safe-area"></view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { getPromotionInfo } from '@/utils/api';
import type { PromotionInfo, TeamStats, PromotionProgress as PromotionProgressType } from '@/types';
import PromotionBadge from '@/components/PromotionBadge.vue';
import PromotionProgress from '@/components/PromotionProgress.vue';

const SETTLEMENT_DAYS = 7;

// 默认晋升进度
const defaultPromotionProgress: PromotionProgressType = {
  currentLevel: 0,
  nextLevel: 1,
  salesProgress: { current: 0, target: 2000000, percent: 0 },
  countProgress: { current: 0, target: 30, percent: 0 }
};

const promotionInfo = ref<PromotionInfo>({
  inviteCode: '',
  starLevel: 0,
  agentLevel: 4,
  starLevelName: '普通会员',
  agentLevelName: '四级代理',
  totalReward: 0,
  pendingReward: 0,
  todayReward: 0,
  monthReward: 0,
  commissionReward: 0,
  repurchaseReward: 0,
  managementReward: 0,
  nurtureReward: 0,
  performance: {
    totalSales: 0,
    monthSales: 0,
    monthTag: '',
    directCount: 0,
    teamCount: 0
  },
  promotionProgress: defaultPromotionProgress,
  teamStats: {
    total: 0,
    level1: 0,
    level2: 0,
    level3: 0,
    level4: 0
  }
});

const loading = ref(false);

const teamStats = computed(() => promotionInfo.value.teamStats);
const teamTotal = computed(() => teamStats.value.total);

const loadData = async () => {
  loading.value = true;
  try {
    const data = await getPromotionInfo();
    promotionInfo.value = {
      ...promotionInfo.value,
      ...data,
      promotionProgress: data.promotionProgress || defaultPromotionProgress
    };
  } catch (error) {
    console.error('加载推广信息失败:', error);
    uni.showToast({
      title: '加载失败',
      icon: 'none'
    });
  } finally {
    loading.value = false;
  }
};

const formatPrice = (price: number) => {
  return ((price || 0) / 100).toFixed(2);
};

const copyInviteCode = () => {
  if (!promotionInfo.value.inviteCode) return;
  
  uni.setClipboardData({
    data: promotionInfo.value.inviteCode,
    success: () => {
      uni.showToast({
        title: '邀请码已复制',
        icon: 'success'
      });
    }
  });
};

const goToTeam = () => {
  uni.navigateTo({
    url: '/pages/promotion/team'
  });
};

const goToRewards = () => {
  uni.navigateTo({
    url: '/pages/promotion/rewards'
  });
};

const goToQRCode = () => {
  uni.navigateTo({
    url: '/pages/promotion/qrcode'
  });
};

const goToRewardRules = () => {
  uni.navigateTo({
    url: '/pages/promotion/reward-rules'
  });
};

const goToStarRules = () => {
  uni.navigateTo({
    url: '/pages/promotion/star-rules'
  });
};

onShow(() => {
  loadData();
});
</script>

<style scoped>
.container {
  min-height: 100vh;
  background-color: #FDF8F3;
  padding-bottom: 40rpx;
}

/* 顶部数据概览 */
.header-section {
  position: relative;
  padding: 40rpx 30rpx;
  overflow: hidden;
}

.header-bg {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 400rpx;
  background: linear-gradient(180deg, #3D2914 0%, #5D3924 100%);
  border-radius: 0 0 40rpx 40rpx;
}

.stats-grid {
  position: relative;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16rpx;
  z-index: 1;
  margin-top: 24rpx;
}

.stat-card {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10rpx);
  border-radius: 20rpx;
  padding: 24rpx 12rpx;
  text-align: center;
  border: 1rpx solid rgba(255, 255, 255, 0.1);
}

.stat-value {
  display: block;
  font-size: 32rpx;
  font-weight: bold;
  color: #D4A574;
  margin-bottom: 8rpx;
}

.stat-label {
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.7);
}

/* 收益分类统计 */
.reward-category-section {
  background: #FFFFFF;
  margin: 0 30rpx 30rpx;
  padding: 32rpx;
  border-radius: 24rpx;
  box-shadow: 0 8rpx 32rpx rgba(61, 41, 20, 0.08);
}

.section-title {
  margin-bottom: 24rpx;
}

.section-title text {
  font-size: 30rpx;
  font-weight: 600;
  color: #3D2914;
}

.category-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20rpx;
}

.category-item {
  display: flex;
  align-items: center;
  padding: 20rpx;
  background: #FDF8F3;
  border-radius: 16rpx;
}

.category-icon {
  width: 56rpx;
  height: 56rpx;
  border-radius: 12rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16rpx;
  font-size: 26rpx;
  font-weight: 600;
  color: #FFFFFF;
}

.category-icon.commission {
  background: linear-gradient(135deg, #0052D9 0%, #00A1FF 100%);
}

.category-icon.repurchase {
  background: linear-gradient(135deg, #00A870 0%, #4CD964 100%);
}

.category-icon.management {
  background: linear-gradient(135deg, #7C3AED 0%, #A855F7 100%);
}

.category-icon.nurture {
  background: linear-gradient(135deg, #FF6B00 0%, #FFB800 100%);
}

.category-info {
  display: flex;
  flex-direction: column;
}

.category-label {
  font-size: 24rpx;
  color: #6B5B4F;
  margin-bottom: 4rpx;
}

.category-value {
  font-size: 28rpx;
  font-weight: 600;
  color: #3D2914;
}

/* 邀请码卡片 */
.invite-card {
  background: #FFFFFF;
  margin: 0 30rpx 30rpx;
  padding: 40rpx;
  border-radius: 24rpx;
  box-shadow: 0 8rpx 32rpx rgba(61, 41, 20, 0.08);
}

.invite-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30rpx;
}

.invite-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #3D2914;
}

.invite-code {
  background: linear-gradient(135deg, #FDF8F3 0%, #F5F0E8 100%);
  border: 2rpx dashed #D4A574;
  border-radius: 16rpx;
  padding: 40rpx;
  text-align: center;
  margin-bottom: 20rpx;
}

.code-text {
  display: block;
  font-size: 56rpx;
  font-weight: bold;
  color: #3D2914;
  letter-spacing: 8rpx;
  margin-bottom: 12rpx;
  font-family: 'DIN Alternate', monospace;
}

.copy-hint {
  font-size: 24rpx;
  color: #9B8B7F;
}

.invite-desc {
  text-align: center;
}

.invite-desc text {
  font-size: 26rpx;
  color: #6B5B4F;
}

/* 快捷入口 */
.menu-section {
  background: #FFFFFF;
  margin: 0 30rpx 30rpx;
  border-radius: 24rpx;
  box-shadow: 0 8rpx 32rpx rgba(61, 41, 20, 0.08);
  overflow: hidden;
}

.menu-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 32rpx;
  border-bottom: 1rpx solid #F5F0E8;
}

.menu-item:last-child {
  border-bottom: none;
}

.menu-left {
  display: flex;
  align-items: center;
}

.menu-icon {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 24rpx;
}

.menu-icon.team {
  background: rgba(212, 165, 116, 0.15);
}

.menu-icon.reward {
  background: rgba(6, 214, 160, 0.15);
}

.menu-icon.qrcode {
  background: rgba(255, 176, 133, 0.15);
}

.menu-icon.rules {
  background: rgba(0, 82, 217, 0.1);
}

.menu-icon.star {
  background: rgba(255, 193, 7, 0.1);
}

.icon-svg {
  width: 44rpx;
  height: 44rpx;
}

.menu-info {
  display: flex;
  flex-direction: column;
}

.menu-title {
  font-size: 30rpx;
  font-weight: 500;
  color: #3D2914;
  margin-bottom: 8rpx;
}

.menu-subtitle {
  font-size: 24rpx;
  color: #9B8B7F;
}

.menu-right {
  display: flex;
  align-items: center;
}

.team-stats {
  display: flex;
  gap: 16rpx;
  margin-right: 16rpx;
}

.stat-item {
  font-size: 22rpx;
  color: #9B8B7F;
  background: #F5F0E8;
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
}

/* 规则说明 */
.rules-section {
  background: #FFFFFF;
  margin: 0 30rpx;
  padding: 40rpx;
  border-radius: 24rpx;
  box-shadow: 0 8rpx 32rpx rgba(61, 41, 20, 0.08);
}

.rules-title {
  margin-bottom: 30rpx;
}

.rules-title text {
  font-size: 32rpx;
  font-weight: 600;
  color: #3D2914;
}

.rule-item {
  display: flex;
  align-items: flex-start;
  margin-bottom: 24rpx;
}

.rule-item:last-child {
  margin-bottom: 0;
}

.rule-num {
  width: 36rpx;
  height: 36rpx;
  background: linear-gradient(135deg, #D4A574 0%, #B8935F 100%);
  color: #FFFFFF;
  font-size: 22rpx;
  font-weight: 600;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 20rpx;
  flex-shrink: 0;
}

.rule-text {
  flex: 1;
  font-size: 26rpx;
  color: #6B5B4F;
  line-height: 1.6;
}

/* 安全区域 */
.safe-area {
  height: constant(safe-area-inset-bottom);
  height: env(safe-area-inset-bottom);
}
</style>
