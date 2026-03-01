<template>
  <view class="container">
    <!-- 顶部数据概览 -->
    <view class="header-section">
      <view class="header-bg"></view>

      <!-- 身份徽章 -->
      <PromotionBadge :agentLevel="promotionInfo.agentLevel" />

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
    <PromotionProgress v-if="promotionInfo.promotionProgress" :progress="promotionInfo.promotionProgress" />

    <!-- 绑定状态卡片 -->
    <view class="bind-status-card" v-if="!promotionInfo.hasParent">
      <view class="bind-header">
        <view class="bind-icon">
          <text>🎁</text>
        </view>
        <view class="bind-info">
          <text class="bind-title">绑定推广人</text>
          <text class="bind-desc">绑定后您的推广人可获得佣金收益</text>
        </view>
      </view>
      <button class="bind-btn-small" @click="goToBind">立即绑定</button>
    </view>

    <view class="parent-card" v-else-if="promotionInfo.parentInfo">
      <view class="parent-header">
        <text class="parent-label">我的推广人</text>
        <text class="parent-badge">{{ promotionInfo.parentInfo.agentLevelName }}</text>
      </view>
      <view class="parent-content">
        <image class="parent-avatar-small" :src="promotionInfo.parentInfo.avatarUrl || '/static/images/default-avatar.png'" mode="aspectFill" />
        <text class="parent-name">{{ promotionInfo.parentInfo.nickName || '推广人' }}</text>
      </view>
    </view>

    <!-- 佣金比例卡片 -->
    <view class="commission-section">
      <view class="section-title">
        <text>我的佣金比例</text>
      </view>
      <view class="commission-grid">
        <view class="commission-item main">
          <view class="commission-header">
            <text class="commission-label">我的佣金</text>
            <text class="commission-value">{{ myCommissionRatio }}%</text>
          </view>
          <view class="commission-desc">
            <text>{{ promotionInfo.agentLevelName }}</text>
          </view>
        </view>
        <view class="commission-item upstream" v-if="upstreamRatios.length > 0">
          <view class="commission-header">
            <text class="commission-label">上级分成</text>
          </view>
          <view class="upstream-list">
            <view class="upstream-item" v-for="(ratio, index) in upstreamRatios" :key="index">
              <text class="upstream-level">{{ index + 1 }}级上级</text>
              <text class="upstream-value">{{ (ratio * 100).toFixed(0) }}%</text>
            </view>
          </view>
        </view>
      </view>
      <view class="commission-tip">
        <text>推广好友下单，您获得{{ myCommissionRatio }}%佣金，上级获得相应比例分成</text>
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
          <uni-icons type="right" size="16" color="#D4A574"></uni-icons>
        </view>
      </view>

      <view class="menu-item" @click="goToDashboard">
        <view class="menu-left">
          <view class="menu-icon dashboard">
            <image class="icon-svg" src="/static/icons/icon-chart.svg" mode="aspectFit"/>
          </view>
          <view class="menu-info">
            <text class="menu-title">数据看板</text>
            <text class="menu-subtitle">查看推广数据分析</text>
          </view>
        </view>
        <uni-icons type="right" size="16" color="#D4A574"></uni-icons>
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
        <uni-icons type="right" size="16" color="#D4A574"></uni-icons>
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
        <uni-icons type="right" size="16" color="#D4A574"></uni-icons>
      </view>

      <view class="menu-item" @click="goToRewardRules">
        <view class="menu-left">
          <view class="menu-icon rules">
            <image class="icon-svg" src="/static/icons/icon-mechanism.svg" mode="aspectFit"/>
          </view>
          <view class="menu-info">
            <text class="menu-title">佣金规则</text>
            <text class="menu-subtitle">查看佣金分配详情</text>
          </view>
        </view>
        <uni-icons type="right" size="16" color="#D4A574"></uni-icons>
      </view>

      <view class="menu-item" @click="goToPromotionRules">
        <view class="menu-left">
          <view class="menu-icon star">
            <image class="icon-svg" src="/static/icons/icon-level-star.svg" mode="aspectFit"/>
          </view>
          <view class="menu-info">
            <text class="menu-title">晋升机制</text>
            <text class="menu-subtitle">升级条件与权益</text>
          </view>
        </view>
        <uni-icons type="right" size="16" color="#D4A574"></uni-icons>
      </view>

      <view class="menu-item" @click="goToCommissionCalculator">
        <view class="menu-left">
          <view class="menu-icon calculator">
            <image class="icon-svg" src="/static/icons/icon-mechanism.svg" mode="aspectFit"/>
          </view>
          <view class="menu-info">
            <text class="menu-title">佣金计算器</text>
            <text class="menu-subtitle">计算佣金分配</text>
          </view>
        </view>
        <uni-icons type="right" size="16" color="#D4A574"></uni-icons>
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
        <text class="rule-text">好友下单后，你可获得相应比例的推广佣金</text>
      </view>
      <view class="rule-item">
        <text class="rule-num">3</text>
        <text class="rule-text">佣金按推广人等级：金牌20%，银牌12%，铜牌12%，普通8%</text>
      </view>
      <view class="rule-item">
        <text class="rule-num">4</text>
        <text class="rule-text">总佣金固定为订单金额的20%，剩余80%为公司利润</text>
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
import { usePromotion } from '@/composables/usePromotion';
import PromotionBadge from '@/components/PromotionBadge.vue';
import PromotionProgress from '@/components/PromotionProgress.vue';
import type { PromotionProgress as PromotionProgressType, TeamStats, AgentLevel } from '@/types';

const SETTLEMENT_DAYS = 7;

// 使用 usePromotion composable
const { myCommissionRatio, upstreamRatios } = usePromotion();

// 默认晋升进度
const defaultPromotionProgress: PromotionProgressType = {
  currentLevel: 4,
  currentLevelName: '普通会员',
  nextLevel: 3,
  nextLevelName: '铜牌推广员',
  salesProgress: { current: 0, target: 2000000, percent: 0 },
  teamProgress: { current: 0, target: 0, percent: 0 }
};

interface PromotionInfoLocal {
  inviteCode: string;
  agentLevel: AgentLevel;
  agentLevelName: string;
  totalReward: number;
  pendingReward: number;
  withdrawableReward: number;
  todayReward: number;
  monthReward: number;
  promotionProgress: PromotionProgressType | null;
  teamStats: TeamStats;
  hasParent: boolean;
  parentInfo: {
    nickName: string;
    avatarUrl: string;
    agentLevel: number;
    agentLevelName: string;
  } | null;
}

const promotionInfo = ref<PromotionInfoLocal>({
  inviteCode: '',
  agentLevel: 4,
  agentLevelName: '普通会员',
  totalReward: 0,
  pendingReward: 0,
  withdrawableReward: 0,
  todayReward: 0,
  monthReward: 0,
  promotionProgress: defaultPromotionProgress,
  teamStats: {
    total: 0,
    level1: 0,
    level2: 0,
    level3: 0,
    level4: 0
  },
  hasParent: false,
  parentInfo: null
});

const loading = ref(false);

const teamStats = computed(() => promotionInfo.value.teamStats);
const teamTotal = computed(() => teamStats.value.total);

const loadData = async () => {
  loading.value = true;
  try {
    const data = await getPromotionInfo();
    promotionInfo.value = {
      inviteCode: data.inviteCode || '',
      agentLevel: data.agentLevel,
      agentLevelName: data.agentLevelName || '普通会员',
      totalReward: data.totalReward || 0,
      pendingReward: data.pendingReward || 0,
      withdrawableReward: data.withdrawableReward || 0,
      todayReward: data.todayReward || 0,
      monthReward: data.monthReward || 0,
      promotionProgress: data.promotionProgress || defaultPromotionProgress,
      teamStats: data.teamStats || { total: 0, level1: 0, level2: 0, level3: 0, level4: 0 },
      hasParent: data.hasParent || false,
      parentInfo: data.parentInfo || null
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

const goToDashboard = () => {
  uni.navigateTo({
    url: '/pages/promotion/dashboard'
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

const goToPromotionRules = () => {
  uni.navigateTo({
    url: '/pages/promotion/promotion-rules'
  });
};

const goToCommissionCalculator = () => {
  uni.navigateTo({
    url: '/pages/promotion/commission-calculator'
  });
};

const goToBind = () => {
  uni.navigateTo({
    url: '/pages/promotion/bind'
  });
};

onShow(() => {
  loadData();
});
</script>

<style scoped>
:root {
  --color-primary: #3D2914;
  --color-gold: #C9A962;
  --color-bronze: #D4A574;
  --color-obsidian: #1A1A1A;
  --color-charcoal: #4A4A4A;
  --color-cream: #FAF9F7;
  --font-display: 'Playfair Display', serif;
  --font-body: 'Manrope', sans-serif;
  --font-mono: 'DM Mono', monospace;
}

.container {
  min-height: 100vh;
  background-color: #FAF9F7;
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
  background: linear-gradient(180deg, #3D2914 0%, #5D3924 60%, #C9A962 100%);
  border-radius: 0 0 40rpx 40rpx;
  opacity: 0.95;
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
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(10rpx);
  border-radius: 20rpx;
  padding: 24rpx 12rpx;
  text-align: center;
  border: 1rpx solid rgba(201, 169, 98, 0.2);
  box-shadow: 0 4rpx 16rpx rgba(61, 41, 20, 0.25);
  transition: all 0.3s ease;
}

.stat-value {
  display: block;
  font-size: 36rpx;
  font-weight: 700;
  color: #FFD700;
  margin-bottom: 8rpx;
  font-family: var(--font-mono);
  text-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.3);
}

.stat-label {
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.85);
  font-weight: 500;
  letter-spacing: 0.3rpx;
}

/* 佣金比例卡片 */
.commission-section {
  background: #FFFFFF;
  margin: 0 30rpx 30rpx;
  padding: 32rpx;
  border-radius: 24rpx;
  box-shadow: 0 8rpx 32rpx rgba(61, 41, 20, 0.12);
  border: 1rpx solid rgba(201, 169, 98, 0.1);
}

.commission-section .section-title {
  margin-bottom: 24rpx;
}

.commission-section .section-title text {
  font-size: 32rpx;
  font-weight: 600;
  color: #1A1A1A;
  letter-spacing: 0.5rpx;
}

.commission-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20rpx;
}

.commission-item {
  padding: 24rpx;
  border-radius: 16rpx;
  display: flex;
  flex-direction: column;
}

.commission-item.main {
  background: linear-gradient(135deg, #3D2914 0%, #C9A962 100%);
}

.commission-item.upstream {
  background: linear-gradient(135deg, #FAF9F7 0%, #F5F0E8 100%);
  border: 1rpx solid rgba(201, 169, 98, 0.15);
}

.commission-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12rpx;
}

.commission-item.main .commission-label {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.85);
  font-weight: 500;
}

.commission-item.upstream .commission-label {
  font-size: 24rpx;
  color: #4A4A4A;
  font-weight: 500;
}

.commission-value {
  font-size: 40rpx;
  font-weight: 700;
  color: #FFFFFF;
  font-family: 'DM Mono', monospace;
  text-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.2);
}

.commission-desc {
  margin-top: 8rpx;
}

.commission-desc text {
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.75);
  font-weight: 500;
}

.upstream-list {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.upstream-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12rpx 16rpx;
  background: rgba(255, 255, 255, 0.6);
  border-radius: 12rpx;
}

.upstream-level {
  font-size: 22rpx;
  color: #4A4A4A;
  font-weight: 500;
}

.upstream-value {
  font-size: 24rpx;
  font-weight: 700;
  color: #C9A962;
  font-family: 'DM Mono', monospace;
}

.commission-tip {
  margin-top: 20rpx;
  padding: 16rpx 20rpx;
  background: linear-gradient(135deg, rgba(201, 169, 98, 0.08) 0%, rgba(212, 165, 116, 0.05) 100%);
  border-radius: 12rpx;
  border: 1rpx solid rgba(201, 169, 98, 0.15);
}

.commission-tip text {
  font-size: 24rpx;
  color: #6B5B4F;
  line-height: 1.6;
  font-weight: 500;
}

/* 绑定状态卡片 */
.bind-status-card {
  background: linear-gradient(135deg, #C9A962 0%, #B8944D 100%);
  margin: 0 30rpx 30rpx;
  padding: 30rpx;
  border-radius: 20rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 8rpx 24rpx rgba(201, 169, 98, 0.25);
}

.bind-header {
  display: flex;
  align-items: center;
}

.bind-icon {
  width: 72rpx;
  height: 72rpx;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 20rpx;
}

.bind-icon text {
  font-size: 36rpx;
}

.bind-info {
  display: flex;
  flex-direction: column;
}

.bind-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #3D2914;
  margin-bottom: 8rpx;
}

.bind-desc {
  font-size: 24rpx;
  color: rgba(61, 41, 20, 0.7);
}

.bind-btn-small {
  background: #3D2914;
  color: #C9A962;
  font-size: 26rpx;
  font-weight: 600;
  padding: 16rpx 32rpx;
  border-radius: 30rpx;
  border: none;
}

/* 上级信息卡片 */
.parent-card {
  background: #FFFFFF;
  margin: 0 30rpx 30rpx;
  padding: 30rpx;
  border-radius: 20rpx;
  box-shadow: 0 8rpx 32rpx rgba(61, 41, 20, 0.1);
}

.parent-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20rpx;
}

.parent-label {
  font-size: 28rpx;
  font-weight: 600;
  color: #1A1A1A;
}

.parent-badge {
  background: linear-gradient(135deg, rgba(201, 169, 98, 0.15) 0%, rgba(184, 148, 77, 0.1) 100%);
  color: #C9A962;
  font-size: 22rpx;
  font-weight: 500;
  padding: 8rpx 16rpx;
  border-radius: 20rpx;
}

.parent-content {
  display: flex;
  align-items: center;
}

.parent-avatar-small {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  margin-right: 20rpx;
  border: 3rpx solid #C9A962;
}

.parent-name {
  font-size: 30rpx;
  font-weight: 500;
  color: #1A1A1A;
}

/* 邀请码卡片 */
.invite-card {
  background: #FFFFFF;
  margin: 0 30rpx 30rpx;
  padding: 40rpx;
  border-radius: 24rpx;
  box-shadow: 0 8rpx 32rpx rgba(61, 41, 20, 0.12);
  border: 1rpx solid rgba(201, 169, 98, 0.15);
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
  color: #1A1A1A;
  letter-spacing: 0.5rpx;
}

.invite-code {
  background: linear-gradient(135deg, #FAF9F7 0%, #F5F0E8 100%);
  border: 2rpx dashed #C9A962;
  border-radius: 16rpx;
  padding: 40rpx;
  text-align: center;
  margin-bottom: 20rpx;
  position: relative;
  box-shadow: inset 0 2rpx 8rpx rgba(201, 169, 98, 0.1);
  transition: all 0.3s ease;
}

.invite-code:active {
  transform: scale(0.98);
  box-shadow: inset 0 2rpx 12rpx rgba(201, 169, 98, 0.15);
}

.code-text {
  display: block;
  font-size: 56rpx;
  font-weight: 700;
  color: #1A1A1A;
  letter-spacing: 8rpx;
  margin-bottom: 12rpx;
  font-family: 'Manrope', monospace;
  text-shadow: 0 2rpx 4rpx rgba(201, 169, 98, 0.2);
}

.copy-hint {
  font-size: 24rpx;
  color: #C9A962;
  font-weight: 500;
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
  box-shadow: 0 8rpx 32rpx rgba(61, 41, 20, 0.12);
  overflow: hidden;
  border: 1rpx solid rgba(201, 169, 98, 0.1);
}

.menu-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 32rpx;
  border-bottom: 1rpx solid #F5F0E8;
  transition: background-color 0.2s ease, transform 0.2s ease;
}

.menu-item:active {
  background-color: #FAF9F7;
  transform: scale(0.99);
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
  background: linear-gradient(135deg, rgba(212, 165, 116, 0.2) 0%, rgba(201, 169, 98, 0.15) 100%);
}

.menu-icon.reward {
  background: linear-gradient(135deg, rgba(91, 122, 110, 0.2) 0%, rgba(122, 154, 142, 0.15) 100%);
}

.menu-icon.qrcode {
  background: linear-gradient(135deg, rgba(184, 134, 11, 0.2) 0%, rgba(212, 165, 116, 0.15) 100%);
}

.menu-icon.rules {
  background: linear-gradient(135deg, rgba(61, 41, 20, 0.15) 0%, rgba(201, 169, 98, 0.12) 100%);
}

.menu-icon.star {
  background: linear-gradient(135deg, rgba(201, 169, 98, 0.2) 0%, rgba(184, 134, 11, 0.15) 100%);
}

.menu-icon.calculator {
  background: linear-gradient(135deg, rgba(122, 154, 142, 0.2) 0%, rgba(91, 122, 110, 0.15) 100%);
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
  font-weight: 600;
  color: #1A1A1A;
  margin-bottom: 8rpx;
  letter-spacing: 0.3rpx;
}

.menu-subtitle {
  font-size: 24rpx;
  color: #6B5B4F;
  font-weight: 400;
  letter-spacing: 0.2rpx;
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
  color: #6B5B4F;
  background: linear-gradient(135deg, #FAF9F7 0%, #F5F0E8 100%);
  padding: 6rpx 14rpx;
  border-radius: 12rpx;
  border: 1rpx solid rgba(201, 169, 98, 0.15);
  font-weight: 500;
}

/* 规则说明 */
.rules-section {
  background: #FFFFFF;
  margin: 0 30rpx;
  padding: 40rpx;
  border-radius: 24rpx;
  box-shadow: 0 8rpx 32rpx rgba(61, 41, 20, 0.12);
  border: 1rpx solid rgba(201, 169, 98, 0.1);
}

.rules-title {
  margin-bottom: 30rpx;
}

.rules-title text {
  font-size: 32rpx;
  font-weight: 600;
  color: #1A1A1A;
  letter-spacing: 0.5rpx;
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
  background: linear-gradient(135deg, #C9A962 0%, #B8860B 100%);
  color: #FFFFFF;
  font-size: 22rpx;
  font-weight: 700;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 20rpx;
  flex-shrink: 0;
  box-shadow: 0 2rpx 8rpx rgba(201, 169, 98, 0.3);
}

.rule-text {
  flex: 1;
  font-size: 26rpx;
  color: #4A4A4A;
  line-height: 1.7;
  letter-spacing: 0.2rpx;
}

/* 安全区域 */
.safe-area {
  height: constant(safe-area-inset-bottom);
  height: env(safe-area-inset-bottom);
}
</style>
