<template>
  <view class="container">
    <!-- 余额卡片 -->
    <view class="balance-card">
      <view class="balance-header">
        <text class="label">当前余额 (元)</text>
        <view class="card-bg-circle"></view>
      </view>
      <view class="balance-amount">{{ formattedBalance }}</view>
      <view class="card-actions">
        <button class="action-btn recharge" @click="goToRecharge">充值</button>
      </view>
    </view>

    <!-- 交易记录 -->
    <view class="transactions-section">
      <view class="section-header">
        <text class="title">最近交易</text>
        <text class="subtitle">仅展示最近20条记录</text>
      </view>
      
      <view v-if="loading" class="loading-state">
        <text>加载中...</text>
      </view>
      
      <view v-else-if="transactions.length === 0" class="empty-state">
        <view class="empty-icon-wrapper">
          <svg class="empty-icon-svg" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="9" stroke="#DDD" stroke-width="1.5"/>
            <path d="M12 8V12" stroke="#DDD" stroke-width="1.5" stroke-linecap="round"/>
            <path d="M12 16H12.01" stroke="#DDD" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
        </view>
        <text>暂无交易记录</text>
      </view>
      
      <view v-else class="transaction-list">
        <view
          v-for="item in transactions"
          :key="item._id"
          class="transaction-item"
        >
          <view class="item-left">
            <view :class="['icon-box', item.amount > 0 ? 'recharge' : 'payment']">
              <!-- 充值图标 -->
              <svg v-if="item.amount > 0" class="transaction-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 5V19" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                <path d="M5 12H19" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.5"/>
              </svg>
              <!-- 支付图标 -->
              <svg v-else class="transaction-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="2" y="5" width="20" height="14" rx="2" stroke="currentColor" stroke-width="1.5"/>
                <path d="M2 10H22" stroke="currentColor" stroke-width="1.5"/>
                <circle cx="6" cy="15" r="1" fill="currentColor"/>
                <circle cx="9" cy="15" r="1" fill="currentColor"/>
              </svg>
            </view>
            <view class="item-info">
              <text class="item-title">{{ getTransactionTitle(item.type, item.description) }}</text>
              <text class="item-time">{{ formatDate(item.createTime) }}</text>
            </view>
          </view>
          <view class="item-amount" :style="{ color: getTransactionColor(item.type, item.amount) }">
            {{ item.amount > 0 ? '+' : '' }}{{ formatPrice(item.amount) }}
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { getWalletBalance, getWalletTransactions } from '@/utils/api';
import { formatPrice, formatTime } from '@/utils/format';
import { TRANSACTION_TYPE_TEXTS, TRANSACTION_TYPE_COLORS } from '@/constants/wallet';
import type { WalletTransactionDB } from '@/types/database';

// 使用数据库类型定义
type Transaction = WalletTransactionDB;

const balance = ref(0);
const transactions = ref<Transaction[]>([]);
const loading = ref(false);

const formattedBalance = computed(() => {
  return formatPrice(balance.value);
});

const loadData = async () => {
  loading.value = true;
  try {
    const balanceRes = await getWalletBalance();
    balance.value = balanceRes.balance || 0;
    
    const transRes = await getWalletTransactions();
    transactions.value = transRes.list || [];
  } catch (error) {
    uni.showToast({
      title: '加载失败',
      icon: 'none'
    });
  } finally {
    loading.value = false;
  }
};

const goToRecharge = () => {
  uni.navigateTo({
    url: '/pages/wallet/recharge'
  });
};

const formatDate = (date: Date | string) => {
  return formatTime(date, 'MM月DD日 HH:mm');
};

const getTransactionTitle = (type: string, description?: string) => {
  if (description) return description;
  return TRANSACTION_TYPE_TEXTS[type as keyof typeof TRANSACTION_TYPE_TEXTS] || '交易';
};

const getTransactionColor = (type: string, amount: number) => {
  if (amount > 0) return TRANSACTION_TYPE_COLORS.recharge;  // 收入绿色
  return '#3D2914';  // 支出深棕色
};

onShow(() => {
  loadData();
});
</script>

<style scoped>
.container {
  min-height: 100vh;
  background-color: #FDF8F5;
  padding: 30rpx;
}

/* 余额卡片 */
.balance-card {
  position: relative;
  background: linear-gradient(135deg, #FFB085 0%, #FF9F6D 100%);
  border-radius: 32rpx;
  padding: 40rpx;
  color: #FFFFFF;
  box-shadow: 0 16rpx 32rpx rgba(255, 176, 133, 0.3);
  margin-bottom: 40rpx;
  overflow: hidden;
}

.card-bg-circle {
  position: absolute;
  top: -40rpx;
  right: -40rpx;
  width: 200rpx;
  height: 200rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
}

.balance-header {
  margin-bottom: 20rpx;
}

.label {
  font-size: 28rpx;
  opacity: 0.9;
}

.balance-amount {
  font-size: 80rpx;
  font-weight: bold;
  margin-bottom: 40rpx;
}

.card-actions {
  display: flex;
}

.action-btn {
  background: #FFFFFF;
  color: #FF9F6D;
  font-size: 30rpx;
  font-weight: 600;
  padding: 0 48rpx;
  height: 80rpx;
  line-height: 80rpx;
  border-radius: 40rpx;
  border: none;
  box-shadow: 0 8rpx 16rpx rgba(0, 0, 0, 0.1);
}

.action-btn::after {
  border: none;
}

/* 交易记录 */
.transactions-section {
  background: #FFFFFF;
  border-radius: 32rpx;
  padding: 30rpx;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.02);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30rpx;
  padding-bottom: 20rpx;
  border-bottom: 1rpx solid #F5F5F5;
}

.title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
}

.subtitle {
  font-size: 24rpx;
  color: #999;
}

.loading-state, .empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60rpx 0;
  color: #999;
  font-size: 28rpx;
}

.empty-icon-wrapper {
  margin-bottom: 20rpx;
}

.empty-icon-svg {
  width: 128rpx;
  height: 128rpx;
}

.transaction-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx 0;
  border-bottom: 1rpx solid #F9F9F9;
}

.transaction-item:last-child {
  border-bottom: none;
}

.item-left {
  display: flex;
  align-items: center;
}

.icon-box {
  width: 80rpx;
  height: 80rpx;
  border-radius: 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 24rpx;
}

.icon-box.recharge {
  background: rgba(6, 214, 160, 0.1);
  color: #06D6A0;
}

.icon-box.payment {
  background: rgba(255, 176, 133, 0.1);
  color: #FFB085;
}

.transaction-icon {
  width: 40rpx;
  height: 40rpx;
}

.item-info {
  display: flex;
  flex-direction: column;
}

.item-title {
  font-size: 30rpx;
  color: #333;
  margin-bottom: 8rpx;
}

.item-time {
  font-size: 24rpx;
  color: #999;
}

.item-amount {
  font-size: 32rpx;
  font-weight: bold;
}

.item-amount.income {
  color: #06D6A0;
}

.item-amount.expense {
  color: #333;
}
</style>
