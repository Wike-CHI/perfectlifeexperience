<template>
  <MainLayout>
    <view class="withdrawals-page">
      <!-- Filter Section -->
      <view class="filter-section">
        <view class="filter-row">
          <view class="filter-group">
            <text class="filter-label">状态:</text>
            <picker
              mode="selector"
              :range="statusOptions"
              :value="statusIndex"
              @change="onStatusChange"
            >
              <view class="picker-value">{{ statusOptions[statusIndex] }}</view>
            </picker>
          </view>
        </view>

        <view class="action-row">
          <button class="search-btn" @click="handleSearch">刷新</button>
        </view>
      </view>

      <!-- Withdrawals Table -->
      <view class="table-container">
        <view class="table-header">
          <text class="col-user">用户</text>
          <text class="col-amount">金额</text>
          <text class="col-fee">手续费</text>
          <text class="col-actual">实际到账</text>
          <text class="col-status">状态</text>
          <text class="col-time">申请时间</text>
          <text class="col-actions">操作</text>
        </view>

        <view class="table-body">
          <view
            v-for="withdrawal in withdrawals"
            :key="withdrawal._id"
            class="table-row"
          >
            <view class="col-user">
              <image v-if="withdrawal.user?.avatarUrl" :src="withdrawal.user.avatarUrl" class="user-avatar" />
              <text class="user-name">{{ withdrawal.user?.nickName || '未知用户' }}</text>
            </view>
            <text class="col-amount">¥{{ formatMoney(withdrawal.amount) }}</text>
            <text class="col-fee">¥{{ formatMoney(withdrawal.fee || 0) }}</text>
            <text class="col-actual">¥{{ formatMoney(withdrawal.amount - (withdrawal.fee || 0)) }}</text>
            <view class="col-status">
              <text :class="'status-' + withdrawal.status">
                {{ getStatusText(withdrawal.status) }}
              </text>
            </view>
            <text class="col-time">{{ formatDate(withdrawal.createTime) }}</text>
            <view class="col-actions">
              <button
                v-if="withdrawal.status === 'pending'"
                class="approve-btn"
                size="mini"
                @click="handleApprove(withdrawal)"
              >批准</button>
              <button
                v-if="withdrawal.status === 'pending'"
                class="reject-btn"
                size="mini"
                @click="handleReject(withdrawal)"
              >拒绝</button>
              <text v-else class="no-action">-</text>
            </view>
          </view>

          <view v-if="withdrawals.length === 0" class="empty-state">
            <text>暂无数据</text>
          </view>
        </view>
      </view>

      <!-- Pagination -->
      <view class="pagination" v-if="totalPages > 1">
        <button
          :disabled="currentPage === 1"
          @click="changePage(currentPage - 1)"
        >上一页</button>
        <text class="page-info">{{ currentPage }} / {{ totalPages }}</text>
        <button
          :disabled="currentPage === totalPages"
          @click="changePage(currentPage + 1)"
        >下一页</button>
      </view>

      <!-- Reject Modal -->
      <view v-if="showRejectModal" class="modal-overlay" @click="closeRejectModal">
        <view class="modal-content" @click.stop>
          <view class="modal-header">
            <text class="modal-title">拒绝提现</text>
            <text class="modal-close" @click="closeRejectModal">×</text>
          </view>
          <view class="modal-body">
            <text class="modal-label">拒绝原因:</text>
            <textarea
              v-model="rejectReason"
              class="modal-textarea"
              placeholder="请输入拒绝原因"
              maxlength="200"
            />
          </view>
          <view class="modal-footer">
            <button class="modal-btn modal-btn-cancel" @click="closeRejectModal">取消</button>
            <button class="modal-btn modal-btn-confirm" @click="confirmReject">确认拒绝</button>
          </view>
        </view>
      </view>
    </view>
  </MainLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { app } from '@/utils/cloudbase';
import MainLayout from '@/components/MainLayout.vue';

interface Withdrawal {
  _id: string;
  _openid: string;
  amount: number;
  fee: number;
  status: string;
  createTime: Date;
  user?: {
    nickName?: string;
    avatarUrl?: string;
  };
}

const withdrawals = ref<Withdrawal[]>([]);
const statusOptions = ref(['全部', '待处理', '已批准', '已拒绝']);
const statusValues = ['all', 'pending', 'approved', 'rejected'];
const statusIndex = ref(0);
const currentPage = ref(1);
const totalPages = ref(1);
const pageSize = 20;

const showRejectModal = ref(false);
const rejectReason = ref('');
const selectedWithdrawal = ref<Withdrawal | null>(null);

const fetchWithdrawals = async () => {
  try {
    const res = await app.callFunction({
      name: 'admin-api',
      data: {
        action: 'getWithdrawals',
        data: {
          status: statusValues[statusIndex.value],
          page: currentPage.value,
          limit: pageSize
        }
      }
    });

    if (res.result?.code === 0) {
      withdrawals.value = res.result.data.list || [];
      totalPages.value = Math.ceil((res.result.data.total || 0) / pageSize);
    } else {
      uni.showToast({
        title: res.result?.msg || '获取提现列表失败',
        icon: 'none'
      });
    }
  } catch (error) {
    console.error('获取提现列表失败:', error);
    uni.showToast({
      title: '获取提现列表失败',
      icon: 'none'
    });
  }
};

const onStatusChange = (e: any) => {
  statusIndex.value = e.detail.value;
  currentPage.value = 1;
  fetchWithdrawals();
};

const handleSearch = () => {
  currentPage.value = 1;
  fetchWithdrawals();
};

const changePage = (page: number) => {
  if (page < 1 || page > totalPages.value) return;
  currentPage.value = page;
  fetchWithdrawals();
};

const handleApprove = async (withdrawal: Withdrawal) => {
  try {
    uni.showLoading({ title: '处理中...' });

    const res = await app.callFunction({
      name: 'admin-api',
      data: {
        action: 'approveWithdrawal',
        data: { withdrawalId: withdrawal._id }
      }
    });

    uni.hideLoading();

    if (res.result?.code === 0) {
      uni.showToast({
        title: '已批准',
        icon: 'success'
      });
      fetchWithdrawals();
    } else {
      uni.showToast({
        title: res.result?.msg || '操作失败',
        icon: 'none'
      });
    }
  } catch (error) {
    uni.hideLoading();
    console.error('批准失败:', error);
    uni.showToast({
      title: '操作失败',
      icon: 'none'
    });
  }
};

const handleReject = (withdrawal: Withdrawal) => {
  selectedWithdrawal.value = withdrawal;
  showRejectModal.value = true;
};

const closeRejectModal = () => {
  showRejectModal.value = false;
  rejectReason.value = '';
  selectedWithdrawal.value = null;
};

const confirmReject = async () => {
  if (!rejectReason.value.trim()) {
    uni.showToast({
      title: '请输入拒绝原因',
      icon: 'none'
    });
    return;
  }

  try {
    uni.showLoading({ title: '处理中...' });

    const res = await app.callFunction({
      name: 'admin-api',
      data: {
        action: 'rejectWithdrawal',
        data: {
          withdrawalId: selectedWithdrawal.value?._id,
          reason: rejectReason.value
        }
      }
    });

    uni.hideLoading();

    if (res.result?.code === 0) {
      uni.showToast({
        title: '已拒绝',
        icon: 'success'
      });
      closeRejectModal();
      fetchWithdrawals();
    } else {
      uni.showToast({
        title: res.result?.msg || '操作失败',
        icon: 'none'
      });
    }
  } catch (error) {
    uni.hideLoading();
    console.error('拒绝失败:', error);
    uni.showToast({
      title: '操作失败',
      icon: 'none'
    });
  }
};

const formatMoney = (amount: number) => {
  return (amount / 100).toFixed(2);
};

const getStatusText = (status: string) => {
  const statusMap: Record<string, string> = {
    pending: '待处理',
    approved: '已批准',
    rejected: '已拒绝'
  };
  return statusMap[status] || status;
};

const formatDate = (date: Date) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

onMounted(() => {
  fetchWithdrawals();
});
</script>

<style lang="scss" scoped>
@import '@/styles/variables.scss';

.withdrawals-page {
  padding: 20rpx;
}

.filter-section {
  background: $card-bg;
  border-radius: $border-radius;
  padding: 30rpx;
  margin-bottom: 20rpx;
  box-shadow: $box-shadow;
}

.filter-row {
  display: flex;
  flex-wrap: wrap;
  gap: 20rpx;
  margin-bottom: 20rpx;
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 10rpx;
  flex: 1;
  min-width: 200rpx;
}

.filter-label {
  font-size: 28rpx;
  color: $text-secondary;
  white-space: nowrap;
}

.picker-value {
  flex: 1;
  height: 60rpx;
  padding: 0 20rpx;
  background: $input-bg;
  border: 1rpx solid $border-color;
  border-radius: $border-radius-sm;
  font-size: 28rpx;
  color: $text-primary;
}

.action-row {
  display: flex;
  gap: 20rpx;
  justify-content: flex-end;
}

.search-btn {
  padding: 15rpx 40rpx;
  border-radius: $border-radius-sm;
  font-size: 28rpx;
  background: $primary-color;
  color: $white;
  border: none;
}

.table-container {
  background: $card-bg;
  border-radius: $border-radius;
  overflow: hidden;
  box-shadow: $box-shadow;
}

.table-header {
  display: flex;
  background: $bg-secondary;
  padding: 25rpx 20rpx;
  font-size: 26rpx;
  color: $text-secondary;
  font-weight: 600;
  border-bottom: 1rpx solid $border-color;
}

.table-body {
  max-height: 1000rpx;
  overflow-y: auto;
}

.table-row {
  display: flex;
  padding: 25rpx 20rpx;
  border-bottom: 1rpx solid $border-color;
  align-items: center;
  font-size: 26rpx;

  &:last-child {
    border-bottom: none;
  }
}

.col-user {
  flex: 1.5;
  display: flex;
  align-items: center;
  gap: 15rpx;
}

.user-avatar {
  width: 60rpx;
  height: 60rpx;
  border-radius: 50%;
}

.user-name {
  color: $text-primary;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 150rpx;
}

.col-amount,
.col-fee,
.col-actual,
.col-time {
  flex: 1;
  color: $text-primary;
}

.col-amount {
  color: $primary-color;
  font-weight: 600;
}

.col-status {
  flex: 0.8;

  text {
    padding: 5rpx 15rpx;
    border-radius: $border-radius-sm;
    font-size: 22rpx;
    color: $white;

    &.status-pending { background: #FFA500; }
    &.status-approved { background: #4CAF50; }
    &.status-rejected { background: #F44336; }
  }
}

.col-actions {
  flex: 1.2;
  display: flex;
  gap: 10rpx;
  justify-content: flex-end;
}

.approve-btn,
.reject-btn {
  border: none;
  padding: 8rpx 20rpx;
  border-radius: $border-radius-sm;
  font-size: 24rpx;
  color: $white;
}

.approve-btn {
  background: #4CAF50;
}

.reject-btn {
  background: #F44336;
}

.no-action {
  color: $text-secondary;
}

.empty-state {
  padding: 100rpx;
  text-align: center;
  color: $text-secondary;
  font-size: 28rpx;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 30rpx;
  margin-top: 30rpx;
  padding: 20rpx;

  button {
    padding: 15rpx 30rpx;
    background: $card-bg;
    border: 1rpx solid $border-color;
    border-radius: $border-radius-sm;
    font-size: 26rpx;
    color: $text-primary;

    &:disabled {
      opacity: 0.5;
    }
  }

  .page-info {
    font-size: 28rpx;
    color: $text-primary;
  }
}

.modal-overlay {
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
  background: $card-bg;
  border-radius: $border-radius;
  width: 600rpx;
  max-height: 80vh;
  overflow: hidden;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 30rpx;
  border-bottom: 1rpx solid $border-color;
}

.modal-title {
  font-size: 32rpx;
  font-weight: 600;
  color: $text-primary;
}

.modal-close {
  font-size: 48rpx;
  color: $text-secondary;
  cursor: pointer;
}

.modal-body {
  padding: 30rpx;
}

.modal-label {
  display: block;
  font-size: 28rpx;
  color: $text-primary;
  margin-bottom: 15rpx;
}

.modal-textarea {
  width: 100%;
  min-height: 200rpx;
  padding: 20rpx;
  background: $input-bg;
  border: 1rpx solid $border-color;
  border-radius: $border-radius-sm;
  font-size: 28rpx;
  color: $text-primary;
  box-sizing: border-box;
}

.modal-footer {
  display: flex;
  gap: 20rpx;
  padding: 20rpx 30rpx;
  border-top: 1rpx solid $border-color;
}

.modal-btn {
  flex: 1;
  padding: 20rpx;
  border-radius: $border-radius-sm;
  font-size: 28rpx;
  border: none;
}

.modal-btn-cancel {
  background: $bg-secondary;
  color: $text-primary;
}

.modal-btn-confirm {
  background: #F44336;
  color: $white;
}
</style>
