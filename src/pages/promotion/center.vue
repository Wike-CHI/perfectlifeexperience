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
          <uni-icons type="right" size="16" color="#D4A574"></uni-icons>
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
            <text class="menu-title">分销机制</text>
            <text class="menu-subtitle">四重分润详解</text>
          </view>
        </view>
        <uni-icons type="right" size="16" color="#D4A574"></uni-icons>
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

      <view class="menu-item upgrade-item" @click="handleUpgrade" v-if="promotionInfo.agentLevel > 1">
        <view class="menu-left">
          <view class="menu-icon upgrade">
            <text class="upgrade-icon">⬆️</text>
          </view>
          <view class="menu-info">
            <text class="menu-title">申请升级</text>
            <text class="menu-subtitle">升级到更高代理等级</text>
          </view>
        </view>
        <view class="upgrade-badge">
          <text class="badge-text">升级</text>
        </view>
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

    <!-- 升级提示组件 -->
    <PromotionUpgradeAlert
      :show="showUpgradeAlert"
      :oldLevel="upgradeInfo.oldLevel"
      :newLevel="upgradeInfo.newLevel"
      :followUpdates="upgradeInfo.followUpdates"
      @close="closeUpgradeAlert"
    />
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { getPromotionInfo, promoteAgentLevel } from '@/utils/api';
import { usePromotion } from '@/composables/usePromotion';
import type { PromotionInfo, TeamStats, PromotionProgress as PromotionProgressType } from '@/types';
import PromotionBadge from '@/components/PromotionBadge.vue';
import PromotionProgress from '@/components/PromotionProgress.vue';
import PromotionUpgradeAlert from '@/components/PromotionUpgradeAlert.vue';

const SETTLEMENT_DAYS = 7;

// 使用 usePromotion composable
const { myCommissionRatio, upstreamRatios } = usePromotion();

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

// 升级提示状态
const showUpgradeAlert = ref(false);
const upgradeInfo = ref({
  oldLevel: 4,
  newLevel: 3,
  followUpdates: [] as Array<{
    childId: string;
    childName: string;
    from: number;
    to: number;
  }>
});

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

const goToCommissionCalculator = () => {
  uni.navigateTo({
    url: '/pages/promotion/commission-calculator'
  });
};

// 模拟升级功能（演示用）
const handleUpgrade = async () => {
  const currentLevel = promotionInfo.value.agentLevel;
  const targetLevel = currentLevel > 1 ? (currentLevel - 1) as 1 | 2 | 3 | 4 : 1;

  if (currentLevel === 1) {
    uni.showToast({
      title: '已是一级代理',
      icon: 'none'
    });
    return;
  }

  try {
    uni.showLoading({ title: '升级中...' });

    // 使用模拟的 OPENID（实际应从 wxContext 获取）
    const mockOpenId = 'mock_openid_for_demo';

    const result = await promoteAgentLevel(
      mockOpenId,
      currentLevel,
      targetLevel
    );

    uni.hideLoading();

    if (result.success) {
      // 显示升级提示
      upgradeInfo.value = {
        oldLevel: currentLevel,
        newLevel: targetLevel,
        followUpdates: result.followUpdates
      };
      showUpgradeAlert.value = true;

      // 更新本地数据
      promotionInfo.value.agentLevel = targetLevel;
      const levelNames: Record<number, string> = {
        1: '一级代理',
        2: '二级代理',
        3: '三级代理',
        4: '四级代理'
      };
      promotionInfo.value.agentLevelName = levelNames[targetLevel];
    }
  } catch (error) {
    uni.hideLoading();
    uni.showToast({
      title: '升级失败',
      icon: 'none'
    });
  }
};

// 关闭升级提示
const closeUpgradeAlert = () => {
  showUpgradeAlert.value = false;
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

/* 收益分类统计 */
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

/* 收益分类统计 */
.reward-category-section {
  background: #FFFFFF;
  margin: 0 30rpx 30rpx;
  padding: 32rpx;
  border-radius: 24rpx;
  box-shadow: 0 8rpx 32rpx rgba(61, 41, 20, 0.12);
  border: 1rpx solid rgba(201, 169, 98, 0.1);
}

.section-title {
  margin-bottom: 24rpx;
}

.section-title text {
  font-size: 32rpx;
  font-weight: 600;
  color: #1A1A1A;
  letter-spacing: 0.5rpx;
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
  background: linear-gradient(135deg, #FAF9F7 0%, #F5F0E8 100%);
  border-radius: 16rpx;
  border: 1rpx solid rgba(201, 169, 98, 0.1);
  transition: all 0.3s ease;
}

.category-item:active {
  transform: translateY(-2rpx);
  box-shadow: 0 4rpx 12rpx rgba(61, 41, 20, 0.1);
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
  background: linear-gradient(135deg, #3D2914 0%, #C9A962 100%);
}

.category-icon.repurchase {
  background: linear-gradient(135deg, #5B7A6E 0%, #7A9A8E 100%);
}

.category-icon.management {
  background: linear-gradient(135deg, #B8860B 0%, #D4A574 100%);
}

.category-icon.nurture {
  background: linear-gradient(135deg, #B8860B 0%, #C9A962 100%);
}

.category-info {
  display: flex;
  flex-direction: column;
}

.category-label {
  font-size: 24rpx;
  color: #4A4A4A;
  margin-bottom: 6rpx;
  font-weight: 500;
  letter-spacing: 0.2rpx;
}

.category-value {
  font-size: 28rpx;
  font-weight: 700;
  color: #1A1A1A;
  font-family: var(--font-mono);
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

.menu-item.upgrade-item {
  background: linear-gradient(135deg, rgba(201, 169, 98, 0.1) 0%, rgba(184, 134, 11, 0.05) 100%);
}

.menu-item.upgrade-item:active {
  background: linear-gradient(135deg, rgba(201, 169, 98, 0.15) 0%, rgba(184, 134, 11, 0.1) 100%);
}

.upgrade-badge {
  padding: 8rpx 20rpx;
  background: linear-gradient(135deg, #C9A962 0%, #B8860B 100%);
  border-radius: 20rpx;
  box-shadow: 0 2rpx 8rpx rgba(201, 169, 98, 0.3);
}

.badge-text {
  font-size: 22rpx;
  color: #FFFFFF;
  font-weight: 600;
  letter-spacing: 0.5rpx;
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

.menu-icon.upgrade {
  background: linear-gradient(135deg, #C9A962 0%, #B8860B 100%);
}

.upgrade-icon {
  font-size: 32rpx;
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
