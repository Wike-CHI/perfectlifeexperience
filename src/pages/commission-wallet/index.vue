<template>
  <view class="commission-wallet-page">
    <!-- 余额卡片 -->
    <view class="balance-card">
      <view class="card-header">
        <text class="title">佣金钱包</text>
        <view class="badge">可提现到微信</view>
      </view>
      <view class="balance-amount">
        <text class="symbol">¥</text>
        <text class="amount">{{ (balance / 100).toFixed(2) }}</text>
      </view>
      <view class="balance-info">
        <view class="info-item">
          <text class="label">累计佣金</text>
          <text class="value">¥{{ (totalCommission / 100).toFixed(2) }}</text>
        </view>
        <view class="info-item">
          <text class="label">已提现</text>
          <text class="value">¥{{ (totalWithdrawn / 100).toFixed(2) }}</text>
        </view>
      </view>
      <!-- 冻结金额提示 -->
      <view class="frozen-info" v-if="frozenAmount > 0">
        <text class="frozen-label">审核中</text>
        <text class="frozen-amount">¥{{ (frozenAmount / 100).toFixed(2) }}</text>
      </view>
    </view>

    <!-- 操作按钮 -->
    <view class="action-buttons">
      <button class="btn btn-primary" @click="showWithdrawModal = true">
        <text>申请提现</text>
      </button>
      <button class="btn btn-secondary" @click="refresh">
        <text>刷新</text>
      </button>
    </view>

    <!-- Tab切换 -->
    <view class="tabs">
      <view
        v-for="tab in tabs"
        :key="tab.key"
        class="tab-item"
        :class="{ active: currentTab === tab.key }"
        @click="currentTab = tab.key"
      >
        {{ tab.label }}
      </view>
    </view>

    <!-- 交易记录列表 -->
    <view class="record-list" v-if="currentTab === 'transactions'">
      <view
        v-for="item in transactions"
        :key="item._id"
        class="record-item"
      >
        <view class="record-icon" :class="'icon-' + item.type">
          <text v-if="item.type === 'reward_settlement'" class="icon-text">+</text>
          <text v-else-if="item.type === 'withdraw_apply'" class="icon-text">-</text>
          <text v-else-if="item.type === 'withdraw_success'" class="icon-text check">&#10003;</text>
          <text v-else-if="item.type === 'reward_deduct'" class="icon-text return">&#8634;</text>
          <text v-else class="icon-text">$</text>
        </view>
        <view class="record-content">
          <view class="record-title">{{ item.title }}</view>
          <view class="record-desc">{{ item.description }}</view>
          <view class="record-time">{{ formatTime(item.createTime) }}</view>
        </view>
        <view class="record-amount" :class="{ positive: item.amount > 0, negative: item.amount < 0 }">
          <text>{{ item.amount > 0 ? '+' : '' }}{{ (item.amount / 100).toFixed(2) }}</text>
        </view>
      </view>
      <view v-if="transactions.length === 0" class="empty-state">
        <text>暂无交易记录</text>
      </view>
    </view>

    <!-- 提现记录列表 -->
    <view class="record-list" v-if="currentTab === 'withdrawals'">
      <view
        v-for="item in withdrawals"
        :key="item._id"
        class="record-item"
      >
        <view class="record-icon" :class="'status-icon-' + item.status">
          <text v-if="item.status === 'pending'" class="icon-text pending">&#8987;</text>
          <text v-else-if="item.status === 'approved'" class="icon-text check">&#10003;</text>
          <text v-else-if="item.status === 'rejected'" class="icon-text cross">&#10005;</text>
          <text v-else class="icon-text">$</text>
        </view>
        <view class="record-content">
          <view class="record-title">提现申请</view>
          <view class="record-desc">提现 ¥{{ (item.amount / 100).toFixed(2) }} 元</view>
          <view class="record-time">{{ formatTime(item.applyTime) }}</view>
        </view>
        <view class="record-status">
          <text :class="'status-' + item.status">
            {{ statusMap[item.status] }}
          </text>
        </view>
      </view>
      <view v-if="withdrawals.length === 0" class="empty-state">
        <text>暂无提现记录</text>
      </view>
    </view>

    <!-- 提现弹窗 -->
    <view class="modal-mask" v-if="showWithdrawModal" @click="showWithdrawModal = false">
      <view class="modal-content" @click.stop>
        <view class="modal-header">
          <text class="modal-title">申请提现</text>
          <text class="modal-close" @click="showWithdrawModal = false">✕</text>
        </view>
        <view class="modal-body">
          <view class="form-item">
            <text class="label">可提现余额</text>
            <text class="value highlight">¥{{ (balance / 100).toFixed(2) }}</text>
          </view>
          <view class="form-item">
            <text class="label">提现金额</text>
            <input
              v-model="withdrawAmount"
              type="digit"
              placeholder="请输入提现金额（元）"
              class="input"
            />
          </view>
          <view class="tips">
            <text>• 最小提现金额：¥1.00</text>
            <text>• 提现将到微信余额</text>
            <text>• 审核通过后自动打款</text>
          </view>
        </view>
        <view class="modal-footer">
          <button class="btn btn-cancel" @click="showWithdrawModal = false">取消</button>
          <button class="btn btn-confirm" @click="handleWithdraw">确认提现</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { getCommissionWalletBalance, applyCommissionWithdraw, getCommissionTransactions, getCommissionWithdrawals } from '@/utils/api';

const balance = ref(0);
const frozenAmount = ref(0);
const totalCommission = ref(0);
const totalWithdrawn = ref(0);
const currentTab = ref('transactions');
const showWithdrawModal = ref(false);
const withdrawAmount = ref('');

const tabs = [
  { key: 'transactions', label: '交易记录' },
  { key: 'withdrawals', label: '提现记录' }
];

const statusMap: Record<string, string> = {
  pending: '审核中',
  approved: '已批准',
  rejected: '已拒绝',
  success: '已完成'
};

const transactions = ref<any[]>([]);
const withdrawals = ref<any[]>([]);

// 加载余额
const loadBalance = async () => {
  try {
    const data = await getCommissionWalletBalance();
    balance.value = data.balance;
    frozenAmount.value = data.frozenAmount || 0;
    totalCommission.value = data.totalCommission;
    totalWithdrawn.value = data.totalWithdrawn;
  } catch (error) {
    console.error('加载余额失败:', error);
    uni.showToast({ title: '加载失败', icon: 'none' });
  }
};

// 加载交易记录
const loadTransactions = async () => {
  try {
    const data = await getCommissionTransactions({ page: 1, limit: 20 });
    transactions.value = data.list || [];
  } catch (error) {
    console.error('加载交易记录失败:', error);
  }
};

// 加载提现记录
const loadWithdrawals = async () => {
  try {
    const data = await getCommissionWithdrawals({ page: 1, limit: 20 });
    withdrawals.value = data.list || [];
  } catch (error) {
    console.error('加载提现记录失败:', error);
  }
};

// 刷新
const refresh = async () => {
  uni.showLoading({ title: '加载中...' });
  await loadBalance();
  await loadTransactions();
  await loadWithdrawals();
  uni.hideLoading();
  uni.showToast({ title: '刷新成功', icon: 'success' });
};

// 处理提现
const handleWithdraw = async () => {
  const amount = parseFloat(withdrawAmount.value);

  if (!amount || amount <= 0) {
    uni.showToast({ title: '请输入有效金额', icon: 'none' });
    return;
  }

  const amountInCents = Math.round(amount * 100);

  if (amountInCents > balance.value) {
    uni.showToast({ title: '余额不足', icon: 'none' });
    return;
  }

  if (amountInCents < 100) {
    uni.showToast({ title: '最小提现¥1.00', icon: 'none' });
    return;
  }

  try {
    uni.showLoading({ title: '提交中...' });
    await applyCommissionWithdraw(amountInCents);
    uni.hideLoading();

    showWithdrawModal.value = false;
    withdrawAmount.value = '';

    uni.showToast({ title: '提现申请已提交', icon: 'success' });

    // 刷新数据
    await refresh();
  } catch (error: any) {
    uni.hideLoading();
    uni.showToast({ title: error.message || '提现失败', icon: 'none' });
  }
};

// 格式化时间
const formatTime = (time: any) => {
  if (!time) return '';
  const date = new Date(time);
  return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
};

onMounted(() => {
  refresh();
});
</script>

<style lang="scss" scoped>
.commission-wallet-page {
  min-height: 100vh;
  background: #f5f5f5;
  padding: 20rpx;
}

// 余额卡片
.balance-card {
  background: linear-gradient(135deg, #3D2914 0%, #5C3D1E 100%);
  border-radius: 24rpx;
  padding: 40rpx;
  color: #fff;
  box-shadow: 0 8rpx 24rpx rgba(61, 41, 20, 0.15);

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 30rpx;

    .title {
      font-size: 32rpx;
      font-weight: bold;
    }

    .badge {
      background: rgba(201, 169, 98, 0.2);
      color: #C9A962;
      padding: 8rpx 16rpx;
      border-radius: 20rpx;
      font-size: 24rpx;
    }
  }

  .balance-amount {
    display: flex;
    align-items: baseline;
    margin-bottom: 30rpx;

    .symbol {
      font-size: 48rpx;
      margin-right: 8rpx;
    }

    .amount {
      font-size: 80rpx;
      font-weight: bold;
    }
  }

  .balance-info {
    display: flex;
    gap: 60rpx;

    .info-item {
      display: flex;
      flex-direction: column;
      gap: 8rpx;

      .label {
        font-size: 24rpx;
        opacity: 0.7;
      }

      .value {
        font-size: 28rpx;
        font-weight: 500;
      }
    }
  }

  // 冻结金额提示
  .frozen-info {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: rgba(255, 255, 255, 0.15);
    border-radius: 12rpx;
    padding: 20rpx 30rpx;
    margin-top: 20rpx;

    .frozen-label {
      font-size: 26rpx;
      color: rgba(255, 255, 255, 0.9);
    }

    .frozen-amount {
      font-size: 28rpx;
      font-weight: bold;
      color: #C9A962;
    }
  }
}

// 操作按钮
.action-buttons {
  display: flex;
  gap: 20rpx;
  margin: 30rpx 0;

  .btn {
    flex: 1;
    height: 88rpx;
    border-radius: 16rpx;
    font-size: 28rpx;
    border: none;

    &.btn-primary {
      background: linear-gradient(135deg, #C9A962 0%, #B8944D 100%);
      color: #3D2914;
      font-weight: bold;
    }

    &.btn-secondary {
      background: #fff;
      color: #3D2914;
      border: 2rpx solid #E5E5E5;
    }
  }
}

// Tab切换
.tabs {
  display: flex;
  background: #fff;
  border-radius: 16rpx;
  padding: 8rpx;
  margin-bottom: 20rpx;

  .tab-item {
    flex: 1;
    text-align: center;
    padding: 20rpx;
    font-size: 28rpx;
    color: #999;
    border-radius: 12rpx;
    transition: all 0.3s;

    &.active {
      background: #3D2914;
      color: #C9A962;
      font-weight: bold;
    }
  }
}

// 记录列表
.record-list {
  .record-item {
    display: flex;
    align-items: center;
    background: #fff;
    border-radius: 16rpx;
    padding: 30rpx;
    margin-bottom: 20rpx;

    .record-icon {
      width: 64rpx;
      height: 64rpx;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      margin-right: 20rpx;
      background: rgba(201, 169, 98, 0.1);

      .icon-text {
        font-size: 32rpx;
        font-weight: bold;
        color: #C9A962;
      }

      &.icon-reward_settlement {
        background: rgba(122, 154, 142, 0.15);
        .icon-text { color: #7A9A8E; }
      }

      &.icon-withdraw_apply {
        background: rgba(212, 165, 116, 0.15);
        .icon-text { color: #D4A574; }
      }

      &.icon-withdraw_success {
        background: rgba(122, 154, 142, 0.15);
        .icon-text.check { color: #7A9A8E; }
      }

      &.icon-reward_deduct {
        background: rgba(184, 92, 92, 0.15);
        .icon-text.return { color: #B85C5C; }
      }

      &.status-icon-pending {
        background: rgba(201, 169, 98, 0.15);
        .icon-text.pending { color: #C9A962; font-size: 28rpx; }
      }

      &.status-icon-approved {
        background: rgba(122, 154, 142, 0.15);
        .icon-text.check { color: #7A9A8E; }
      }

      &.status-icon-rejected {
        background: rgba(184, 92, 92, 0.15);
        .icon-text.cross { color: #B85C5C; }
      }
    }

    .record-content {
      flex: 1;

      .record-title {
        font-size: 28rpx;
        font-weight: 500;
        color: #1A1A1A;
        margin-bottom: 8rpx;
      }

      .record-desc {
        font-size: 24rpx;
        color: #999;
        margin-bottom: 8rpx;
      }

      .record-time {
        font-size: 24rpx;
        color: #CCC;
      }
    }

    .record-amount {
      font-size: 32rpx;
      font-weight: bold;

      &.positive {
        color: #7A9A8E;
      }

      &.negative {
        color: #1A1A1A;
      }
    }

    .record-status {
      font-size: 24rpx;
      padding: 8rpx 16rpx;
      border-radius: 8rpx;

      .status-pending {
        color: #C9A962;
        background: rgba(201, 169, 98, 0.1);
      }

      .status-approved {
        color: #7A9A8E;
        background: rgba(122, 154, 142, 0.1);
      }

      .status-rejected {
        color: #D4A574;
        background: rgba(212, 165, 116, 0.1);
      }
    }
  }

  .empty-state {
    text-align: center;
    padding: 100rpx 0;
    color: #999;
    font-size: 28rpx;
  }
}

// 提现弹窗
.modal-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  width: 600rpx;
  background: #fff;
  border-radius: 24rpx;
  overflow: hidden;

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 30rpx;
    border-bottom: 2rpx solid #F5F5F5;

    .modal-title {
      font-size: 32rpx;
      font-weight: bold;
      color: #1A1A1A;
    }

    .modal-close {
      font-size: 40rpx;
      color: #999;
    }
  }

  .modal-body {
    padding: 30rpx;

    .form-item {
      margin-bottom: 30rpx;

      .label {
        display: block;
        font-size: 28rpx;
        color: #666;
        margin-bottom: 16rpx;
      }

      .value {
        font-size: 32rpx;
        color: #1A1A1A;
        font-weight: bold;

        &.highlight {
          color: #C9A962;
        }
      }

      .input {
        width: 100%;
        height: 88rpx;
        border: 2rpx solid #E5E5E5;
        border-radius: 12rpx;
        padding: 0 20rpx;
        font-size: 28rpx;
      }
    }

    .tips {
      text {
        display: block;
        font-size: 24rpx;
        color: #999;
        line-height: 1.8;
      }
    }
  }

  .modal-footer {
    display: flex;
    gap: 20rpx;
    padding: 30rpx;
    border-top: 2rpx solid #F5F5F5;

    .btn {
      flex: 1;
      height: 88rpx;
      border-radius: 12rpx;
      font-size: 28rpx;
      border: none;

      &.btn-cancel {
        background: #F5F5F5;
        color: #666;
      }

      &.btn-confirm {
        background: linear-gradient(135deg, #C9A962 0%, #B8944D 100%);
        color: #3D2914;
        font-weight: bold;
      }
    }
  }
}
</style>
