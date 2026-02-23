<template>
  <MainLayout>
    <view class="user-detail-page" v-if="userInfo">
      <!-- Header Section -->
      <view class="header-section">
        <view class="user-info-card">
          <image v-if="userInfo.avatarUrl" :src="userInfo.avatarUrl" class="avatar" />
          <view v-else class="avatar-placeholder">{{ (userInfo.nickName || '用户')[0] }}</view>
          <view class="info">
            <text class="name">{{ userInfo.nickName || '未设置昵称' }}</text>
            <text class="openid">OPENID: {{ userInfo._openid }}</text>
            <view class="badges">
              <text class="badge badge-agent">{{ getAgentLevelText(userInfo.agentLevel) }}</text>
              <text class="badge badge-star">{{ getStarLevelText(userInfo.starLevel) }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- Stats Section -->
      <view class="stats-section">
        <view class="stat-card">
          <text class="stat-value">¥{{ formatMoney(userInfo.performance?.totalSales || 0) }}</text>
          <text class="stat-label">累计销售额</text>
        </view>
        <view class="stat-card">
          <text class="stat-value">¥{{ formatMoney(userInfo.performance?.monthSales || 0) }}</text>
          <text class="stat-label">本月销售额</text>
        </view>
        <view class="stat-card">
          <text class="stat-value">{{ userInfo.performance?.teamCount || 0 }}</text>
          <text class="stat-label">团队人数</text>
        </view>
        <view class="stat-card">
          <text class="stat-value">{{ userInfo.performance?.directCount || 0 }}</text>
          <text class="stat-label">直推人数</text>
        </view>
      </view>

      <!-- Wallet Section -->
      <view class="wallet-section">
        <view class="section-header">
          <text class="section-title">钱包信息</text>
        </view>
        <view class="wallet-info">
          <view class="wallet-item">
            <text class="wallet-label">余额:</text>
            <text class="wallet-value">¥{{ formatMoney(walletInfo.balance || 0) }}</text>
          </view>
          <view class="wallet-item">
            <text class="wallet-label">累计佣金:</text>
            <text class="wallet-value">¥{{ formatMoney(walletInfo.totalReward || 0) }}</text>
          </view>
          <view class="wallet-item">
            <text class="wallet-label">已提现:</text>
            <text class="wallet-value">¥{{ formatMoney(walletInfo.withdrawn || 0) }}</text>
          </view>
        </view>
      </view>

      <!-- Promotion Path Section -->
      <view class="promotion-section" v-if="promotionPath.length > 0">
        <view class="section-header">
          <text class="section-title">推广路径</text>
        </view>
        <view class="path-list">
          <view v-for="(parent, index) in promotionPath" :key="parent._id" class="path-item">
            <text class="path-level">{{ index + 1 }}级推荐人:</text>
            <text class="path-name">{{ parent.nickName || '未知用户' }}</text>
            <text class="path-level-badge">{{ getAgentLevelText(parent.agentLevel) }}</text>
          </view>
        </view>
      </view>

      <!-- Orders Section -->
      <view class="orders-section">
        <view class="section-header">
          <text class="section-title">订单记录 (最近{{ userOrders.length }}条)</text>
          <button class="view-all-btn" size="mini" @click="viewAllOrders">查看全部</button>
        </view>
        <view class="order-list" v-if="userOrders.length > 0">
          <view v-for="order in userOrders" :key="order._id" class="order-item">
            <view class="order-header">
              <text class="order-no">{{ order.orderNo }}</text>
              <text :class="'order-status status-' + order.status">
                {{ getOrderStatusText(order.status) }}
              </text>
            </view>
            <view class="order-info">
              <text class="order-amount">¥{{ formatMoney(order.totalAmount) }}</text>
              <text class="order-time">{{ formatDate(order.createTime) }}</text>
            </view>
          </view>
        </view>
        <view v-else class="empty-state">
          <text>暂无订单记录</text>
        </view>
      </view>

      <!-- Reward Records Section -->
      <view class="rewards-section">
        <view class="section-header">
          <text class="section-title">佣金记录 (最近{{ rewardRecords.length }}条)</text>
          <button class="view-all-btn" size="mini" @click="viewAllRewards">查看全部</button>
        </view>
        <view class="reward-list" v-if="rewardRecords.length > 0">
          <view v-for="reward in rewardRecords" :key="reward._id" class="reward-item">
            <view class="reward-header">
              <text class="reward-type">{{ getRewardTypeText(reward.rewardType) }}</text>
              <text class="reward-amount">+¥{{ formatMoney(reward.amount) }}</text>
            </view>
            <view class="reward-info">
              <text class="reward-order">订单: {{ reward.orderNo }}</text>
              <text class="reward-time">{{ formatDate(reward.createTime) }}</text>
            </view>
          </view>
        </view>
        <view v-else class="empty-state">
          <text>暂无佣金记录</text>
        </view>
      </view>
    </view>

    <view v-else class="loading-state">
      <text>加载中...</text>
    </view>
  </MainLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { app } from '@/utils/cloudbase';
import MainLayout from '@/components/MainLayout.vue';

interface UserInfo {
  _id: string;
  _openid: string;
  nickName?: string;
  avatarUrl?: string;
  agentLevel: number;
  starLevel: number;
  performance?: {
    totalSales: number;
    monthSales: number;
    teamCount: number;
    directCount: number;
  };
}

interface WalletInfo {
  balance: number;
  totalReward: number;
  withdrawn: number;
}

interface Order {
  _id: string;
  orderNo: string;
  status: string;
  totalAmount: number;
  createTime: Date;
}

interface Reward {
  _id: string;
  rewardType: string;
  amount: number;
  orderNo: string;
  createTime: Date;
}

const userInfo = ref<UserInfo | null>(null);
const walletInfo = ref<WalletInfo>({ balance: 0, totalReward: 0, withdrawn: 0 });
const promotionPath = ref<UserInfo[]>([]);
const userOrders = ref<Order[]>([]);
const rewardRecords = ref<Reward[]>([]);

onMounted(async () => {
  const pages = getCurrentPages();
  const currentPage = pages[pages.length - 1];
  const options = currentPage.options as any;
  const userId = options.id;

  if (userId) {
    await Promise.all([
      fetchUserInfo(userId),
      fetchWalletInfo(userId),
      fetchPromotionPath(userId),
      fetchUserOrders(userId),
      fetchRewardRecords(userId)
    ]);
  }
});

const fetchUserInfo = async (userId: string) => {
  try {
    const res = await app.callFunction({
      name: 'admin-api',
      data: {
        action: 'getUserDetail',
        data: { userId }
      }
    });

    if (res.result?.code === 0) {
      userInfo.value = res.result.data;
    }
  } catch (error) {
    console.error('获取用户信息失败:', error);
  }
};

const fetchWalletInfo = async (userId: string) => {
  try {
    const res = await app.callFunction({
      name: 'admin-api',
      data: {
        action: 'getUserWallet',
        data: { userId }
      }
    });

    if (res.result?.code === 0) {
      walletInfo.value = res.result.data;
    }
  } catch (error) {
    console.error('获取钱包信息失败:', error);
  }
};

const fetchPromotionPath = async (userId: string) => {
  try {
    const res = await app.callFunction({
      name: 'admin-api',
      data: {
        action: 'getPromotionPath',
        data: { userId }
      }
    });

    if (res.result?.code === 0) {
      promotionPath.value = res.result.data;
    }
  } catch (error) {
    console.error('获取推广路径失败:', error);
  }
};

const fetchUserOrders = async (userId: string) => {
  try {
    const res = await app.callFunction({
      name: 'admin-api',
      data: {
        action: 'getUserOrders',
        data: { userId, limit: 5 }
      }
    });

    if (res.result?.code === 0) {
      userOrders.value = res.result.data;
    }
  } catch (error) {
    console.error('获取订单记录失败:', error);
  }
};

const fetchRewardRecords = async (userId: string) => {
  try {
    const res = await app.callFunction({
      name: 'admin-api',
      data: {
        action: 'getUserRewards',
        data: { userId, limit: 5 }
      }
    });

    if (res.result?.code === 0) {
      rewardRecords.value = res.result.data;
    }
  } catch (error) {
    console.error('获取佣金记录失败:', error);
  }
};

const formatMoney = (amount: number) => {
  return (amount / 100).toFixed(2);
};

const getAgentLevelText = (level: number) => {
  const texts = ['总公司', '一级代理', '二级代理', '三级代理', '四级代理'];
  return texts[level] || '普通用户';
};

const getStarLevelText = (level: number) => {
  const texts = ['普通会员', '铜牌推广员', '银牌推广员', '金牌推广员'];
  return texts[level] || '普通会员';
};

const getOrderStatusText = (status: string) => {
  const statusMap: Record<string, string> = {
    pending: '待付款',
    paid: '已付款',
    shipping: '发货中',
    completed: '已完成',
    cancelled: '已取消'
  };
  return statusMap[status] || status;
};

const getRewardTypeText = (type: string) => {
  const typeMap: Record<string, string> = {
    basic: '基础佣金',
    repurchase: '复购奖励',
    team: '团队管理奖',
    nurture: '育成津贴'
  };
  return typeMap[type] || type;
};

const formatDate = (date: Date) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

const viewAllOrders = () => {
  uni.navigateTo({
    url: `/pages/orders/list/index?userId=${userInfo.value?._id}`
  });
};

const viewAllRewards = () => {
  uni.navigateTo({
    url: `/pages/rewards/list/index?userId=${userInfo.value?._id}`
  });
};
</script>

<style lang="scss" scoped>
@import '@/styles/variables.scss';

.user-detail-page {
  padding: 20rpx;
}

.header-section {
  margin-bottom: 20rpx;
}

.user-info-card {
  background: $card-bg;
  border-radius: $border-radius;
  padding: 40rpx;
  display: flex;
  align-items: center;
  gap: 30rpx;
  box-shadow: $box-shadow;
}

.avatar,
.avatar-placeholder {
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
  border: 4rpx solid $primary-color;
}

.avatar-placeholder {
  background: linear-gradient(135deg, #C9A962, #D4A574);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 48rpx;
  color: $white;
  font-weight: bold;
}

.info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 10rpx;
}

.name {
  font-size: 36rpx;
  font-weight: 600;
  color: $text-primary;
}

.openid {
  font-size: 24rpx;
  color: $text-secondary;
  font-family: $font-mono;
}

.badges {
  display: flex;
  gap: 15rpx;
  margin-top: 10rpx;
}

.badge {
  padding: 8rpx 20rpx;
  border-radius: $border-radius-sm;
  font-size: 24rpx;
  color: $white;
}

.badge-agent {
  background: linear-gradient(135deg, #3D2914, #5D4037);
}

.badge-star {
  background: linear-gradient(135deg, #C9A962, #FFD700);
}

.stats-section {
  display: flex;
  gap: 20rpx;
  margin-bottom: 20rpx;
}

.stat-card {
  flex: 1;
  background: $card-bg;
  border-radius: $border-radius;
  padding: 30rpx 20rpx;
  text-align: center;
  box-shadow: $box-shadow;
}

.stat-value {
  display: block;
  font-size: 36rpx;
  font-weight: 600;
  color: $primary-color;
  margin-bottom: 10rpx;
}

.stat-label {
  font-size: 24rpx;
  color: $text-secondary;
}

.wallet-section,
.promotion-section,
.orders-section,
.rewards-section {
  background: $card-bg;
  border-radius: $border-radius;
  padding: 30rpx;
  margin-bottom: 20rpx;
  box-shadow: $box-shadow;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20rpx;
  padding-bottom: 15rpx;
  border-bottom: 1rpx solid $border-color;
}

.section-title {
  font-size: 32rpx;
  font-weight: 600;
  color: $text-primary;
}

.view-all-btn {
  background: $bg-secondary;
  color: $primary-color;
  border: none;
  padding: 10rpx 25rpx;
  border-radius: $border-radius-sm;
  font-size: 24rpx;
}

.wallet-info {
  display: flex;
  flex-direction: column;
  gap: 15rpx;
}

.wallet-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.wallet-label {
  font-size: 28rpx;
  color: $text-secondary;
}

.wallet-value {
  font-size: 32rpx;
  font-weight: 600;
  color: $primary-color;
}

.path-list {
  display: flex;
  flex-direction: column;
  gap: 15rpx;
}

.path-item {
  display: flex;
  align-items: center;
  gap: 15rpx;
  padding: 20rpx;
  background: $bg-secondary;
  border-radius: $border-radius-sm;
}

.path-level {
  font-size: 26rpx;
  color: $text-secondary;
}

.path-name {
  flex: 1;
  font-size: 28rpx;
  color: $text-primary;
}

.path-level-badge {
  padding: 5rpx 15rpx;
  background: $primary-color;
  color: $white;
  border-radius: $border-radius-sm;
  font-size: 22rpx;
}

.order-list,
.reward-list {
  display: flex;
  flex-direction: column;
  gap: 15rpx;
}

.order-item,
.reward-item {
  padding: 20rpx;
  background: $bg-secondary;
  border-radius: $border-radius-sm;
}

.order-header,
.reward-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10rpx;
}

.order-no {
  font-size: 28rpx;
  color: $text-primary;
  font-weight: 500;
}

.order-status {
  padding: 5rpx 15rpx;
  border-radius: $border-radius-sm;
  font-size: 22rpx;
  color: $white;

  &.status-pending { background: #FFA500; }
  &.status-paid { background: #4CAF50; }
  &.status-shipping { background: #2196F3; }
  &.status-completed { background: #9E9E9E; }
  &.status-cancelled { background: #F44336; }
}

.order-info,
.reward-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.order-amount,
.reward-amount {
  font-size: 32rpx;
  font-weight: 600;
  color: $primary-color;
}

.order-time,
.reward-time {
  font-size: 24rpx;
  color: $text-secondary;
}

.reward-type {
  font-size: 26rpx;
  color: $text-primary;
}

.reward-order {
  font-size: 24rpx;
  color: $text-secondary;
}

.empty-state,
.loading-state {
  padding: 100rpx;
  text-align: center;
  color: $text-secondary;
  font-size: 28rpx;
}
</style>
