<template>
  <view class="container">
    <!-- 页面标题 -->
    <view class="page-header">
      <text class="page-title">退款管理</text>
    </view>

    <!-- 筛选栏 -->
    <view class="filter-bar">
      <view class="filter-item">
        <picker mode="selector" :range="statusOptions" @change="onStatusChange">
          <view class="picker">
            <text class="picker-text">{{ selectedStatusText }}</text>
            <text class="picker-arrow">▼</text>
          </view>
        </picker>
      </view>
      <view class="search-box">
        <input class="search-input" v-model="keyword" placeholder="搜索退款单号/订单号" @confirm="handleSearch" />
        <text class="search-btn" @click="handleSearch">搜索</text>
      </view>
    </view>

    <!-- 退款列表 -->
    <view class="refund-list">
      <view
        class="refund-card"
        v-for="item in refundList"
        :key="item._id"
        @click="goToDetail(item._id!)"
      >
        <!-- 状态和金额 -->
        <view class="card-header">
          <view class="status-badge" :class="`status-${item.refundStatus}`">
            {{ getStatusText(item.refundStatus) }}
          </view>
          <view class="amount">¥{{ formatPrice(item.refundAmount) }}</view>
        </view>

        <!-- 订单和退款信息 -->
        <view class="card-body">
          <view class="info-row">
            <text class="label">退款单号：</text>
            <text class="value">{{ item.refundNo }}</text>
          </view>
          <view class="info-row">
            <text class="label">订单号：</text>
            <text class="value">{{ item.orderNo }}</text>
          </view>
          <view class="info-row">
            <text class="label">退款类型：</text>
            <text class="value">{{ RefundTypeNames[item.refundType!] }}</text>
          </view>
          <view class="info-row">
            <text class="label">申请人：</text>
            <text class="value">{{ item.user?.nickName || '未知用户' }}</text>
          </view>
          <view class="info-row">
            <text class="label">退款原因：</text>
            <text class="value">{{ item.refundReason }}</text>
          </view>
          <view class="info-row">
            <text class="label">申请时间：</text>
            <text class="value">{{ formatDateTime(item.createTime) }}</text>
          </view>
        </view>

        <!-- 操作按钮 -->
        <view class="card-actions" @click.stop>
          <view
            class="action-btn approve"
            v-if="item.refundStatus === 'pending'"
            @click="quickApprove(item)"
          >
            同意
          </view>
          <view
            class="action-btn reject"
            v-if="item.refundStatus === 'pending'"
            @click="quickReject(item)"
          >
            拒绝
          </view>
          <view
            class="action-btn confirm"
            v-if="item.refundStatus === 'waiting_receive'"
            @click="quickConfirm(item)"
          >
            确认收货
          </view>
          <view
            class="action-btn retry"
            v-if="item.refundStatus === 'failed'"
            @click="quickRetry(item)"
          >
            重试
          </view>
        </view>
      </view>
    </view>

    <!-- 空状态 -->
    <view class="empty-state" v-if="refundList.length === 0 && !loading">
      <text class="empty-text">暂无退款记录</text>
    </view>

    <!-- 加载更多 -->
    <view class="load-more" v-if="hasMore && refundList.length > 0">
      <text class="load-more-text">{{ loading ? '加载中...' : '加载更多' }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { adminGetRefundList, adminApproveRefund, adminRejectRefund, adminConfirmReceipt, adminRetryRefund, formatPrice } from '@/utils/api';
import AdminAuthManager from '@/utils/admin-auth';

// 类型定义（内联，避免分包导入问题）
const RefundStatusNames: Record<string, string> = {
  pending: '待审核',
  approved: '已同意',
  waiting_receive: '待收货',
  processing: '退款中',
  success: '退款成功',
  failed: '退款失败',
  rejected: '已拒绝',
  cancelled: '已取消'
}

const RefundTypeNames: Record<string, string> = {
  only_refund: '仅退款',
  return_refund: '退货退款'
}

interface Refund {
  _id: string
  orderId: string
  refundNo: string
  refundType: 'only_refund' | 'return_refund'
  refundStatus: 'pending' | 'approved' | 'waiting_receive' | 'processing' | 'success' | 'failed' | 'rejected' | 'cancelled'
  refundAmount: number
  refundReason: string
  products?: Array<{
    productName: string
    productImage: string
    quantity: number
    price: number
  }>
  createTime: Date
}

// 状态选项
const statusOptions = [
  { label: '全部', value: 'all' },
  { label: '待审核', value: 'pending' },
  { label: '已同意', value: 'approved' },
  { label: '待收货', value: 'waiting_receive' },
  { label: '退款中', value: 'processing' },
  { label: '退款成功', value: 'success' },
  { label: '已拒绝', value: 'rejected' },
  { label: '退款失败', value: 'failed' }
];

const selectedStatus = ref('all');
const keyword = ref('');

// 退款列表
const refundList = ref<any[]>([]);

// 分页
const page = ref(1);
const pageSize = 20;
const hasMore = ref(true);
const loading = ref(false);

// 当前选中的状态文本
const selectedStatusText = computed(() => {
  return statusOptions.find(s => s.value === selectedStatus.value)?.label || '全部';
});

// 获取状态文本
const getStatusText = (status?: string) => {
  return RefundStatusNames[status as keyof typeof RefundStatusNames] || '未知状态';
};

// 格式化时间
const formatDateTime = (time?: Date) => {
  if (!time) return '';
  const date = new Date(time);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
};

// 状态改变
const onStatusChange = (e: any) => {
  selectedStatus.value = statusOptions[e.detail.value].value;
  page.value = 1;
  refundList.value = [];
  hasMore.value = true;
  loadRefundList();
};

// 搜索
const handleSearch = () => {
  page.value = 1;
  refundList.value = [];
  hasMore.value = true;
  loadRefundList();
};

// 加载退款列表
const loadRefundList = async () => {
  if (loading.value) return;

  try {
    loading.value = true;

    const status = selectedStatus.value === 'all' ? undefined : selectedStatus.value;

    const res = await adminGetRefundList({
      page: page.value,
      limit: pageSize,
      status,
      keyword: keyword.value || undefined,
      adminToken: AdminAuthManager.getToken()
    });

    if (res.list) {
      if (page.value === 1) {
        refundList.value = res.list;
      } else {
        refundList.value = [...refundList.value, ...res.list];
      }

      hasMore.value = res.list.length >= pageSize;
    }
  } catch (error: any) {
    console.error('加载退款列表失败:', error);
  } finally {
    loading.value = false;
  }
};

// 跳转详情
const goToDetail = (refundId: string) => {
  uni.navigateTo({
    url: `/pagesAdmin/refunds/detail?refundId=${refundId}`
  });
};

// 快速同意
const quickApprove = async (item: any) => {
  uni.showModal({
    title: '同意退款',
    content: `确认同意退款单号 ${item.refundNo}？`,
    success: async (res) => {
      if (res.confirm) {
        try {
          uni.showLoading({ title: '处理中...' });
          await adminApproveRefund({
            refundId: item._id,
            adminToken: AdminAuthManager.getToken()
          });
          uni.hideLoading();
          uni.showToast({
            title: '已同意',
            icon: 'success'
          });
          // 刷新列表
          page.value = 1;
          refundList.value = [];
          loadRefundList();
        } catch (error: any) {
          uni.hideLoading();
          uni.showToast({
            title: error.message || '操作失败',
            icon: 'none'
          });
        }
      }
    }
  });
};

// 快速拒绝
const quickReject = async (item: any) => {
  uni.showModal({
    title: '输入拒绝原因',
    editable: true,
    placeholderText: '请输入拒绝原因',
    success: async (res) => {
      if (res.confirm && res.content) {
        try {
          uni.showLoading({ title: '处理中...' });
          await adminRejectRefund({
            refundId: item._id,
            reason: res.content,
            adminToken: AdminAuthManager.getToken()
          });
          uni.hideLoading();
          uni.showToast({
            title: '已拒绝',
            icon: 'success'
          });
          // 刷新列表
          page.value = 1;
          refundList.value = [];
          loadRefundList();
        } catch (error: any) {
          uni.hideLoading();
          uni.showToast({
            title: error.message || '操作失败',
            icon: 'none'
          });
        }
      }
    }
  });
};

// 快速确认收货
const quickConfirm = async (item: any) => {
  uni.showModal({
    title: '确认收货',
    content: `确认已收到用户寄回的商品？退款单号：${item.refundNo}`,
    success: async (res) => {
      if (res.confirm) {
        try {
          uni.showLoading({ title: '处理中...' });
          await adminConfirmReceipt({
            refundId: item._id,
            adminToken: AdminAuthManager.getToken()
          });
          uni.hideLoading();
          uni.showToast({
            title: '已确认',
            icon: 'success'
          });
          // 刷新列表
          page.value = 1;
          refundList.value = [];
          loadRefundList();
        } catch (error: any) {
          uni.hideLoading();
          uni.showToast({
            title: error.message || '操作失败',
            icon: 'none'
          });
        }
      }
    }
  });
};

// 重试
const quickRetry = async (item: any) => {
  uni.showModal({
    title: '重试退款',
    content: `确认重新执行退款？退款单号：${item.refundNo}`,
    success: async (res) => {
      if (res.confirm) {
        try {
          uni.showLoading({ title: '处理中...' });
          await adminRetryRefund({
            refundId: item._id,
            adminToken: AdminAuthManager.getToken()
          });
          uni.hideLoading();
          uni.showToast({
            title: '已重试',
            icon: 'success'
          });
          // 刷新列表
          page.value = 1;
          refundList.value = [];
          loadRefundList();
        } catch (error: any) {
          uni.hideLoading();
          uni.showToast({
            title: error.message || '操作失败',
            icon: 'none'
          });
        }
      }
    }
  });
};

// 加载更多
const loadMore = () => {
  if (!hasMore.value || loading.value) return;
  page.value++;
  loadRefundList();
};

onMounted(() => {
  if (!AdminAuthManager.checkAuth()) return;
  loadRefundList();
});

// 触底加载
uni.onReachBottom(() => {
  loadMore();
});
</script>

<style scoped>
.container {
  min-height: 100vh;
  background-color: #1A1A1A;
}

.page-header {
  background: rgba(255, 255, 255, 0.03);
  padding: 40rpx 32rpx 20rpx;
  border-bottom: 1rpx solid rgba(201, 169, 98, 0.1);
}

.page-title {
  font-size: 36rpx;
  font-weight: 700;
  color: #F5F5F0;
}

.filter-bar {
  background: rgba(255, 255, 255, 0.03);
  padding: 20rpx 32rpx;
  display: flex;
  gap: 20rpx;
  border-bottom: 1rpx solid rgba(201, 169, 98, 0.1);
}

.filter-item {
  flex-shrink: 0;
}

.picker {
  padding: 16rpx 24rpx;
  border: 1rpx solid rgba(201, 169, 98, 0.2);
  border-radius: 8rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-width: 180rpx;
  background: rgba(255, 255, 255, 0.03);
}

.picker-text {
  font-size: 28rpx;
  color: #F5F5F0;
}

.picker-arrow {
  font-size: 20rpx;
  color: rgba(245, 245, 240, 0.4);
}

.search-box {
  flex: 1;
  display: flex;
  gap: 12rpx;
}

.search-input {
  flex: 1;
  padding: 16rpx 20rpx;
  border: 1rpx solid rgba(201, 169, 98, 0.2);
  border-radius: 8rpx;
  font-size: 28rpx;
  background: rgba(255, 255, 255, 0.03);
  color: #F5F5F0;
}

.search-btn {
  padding: 16rpx 24rpx;
  background: #C9A962;
  color: #0D0D0D;
  border-radius: 8rpx;
  font-size: 28rpx;
  font-weight: 600;
}

.refund-list {
  padding: 20rpx 32rpx;
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.refund-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1rpx solid rgba(201, 169, 98, 0.1);
  border-radius: 12rpx;
  overflow: hidden;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx;
  border-bottom: 1rpx solid rgba(201, 169, 98, 0.1);
}

.status-badge {
  padding: 6rpx 16rpx;
  border-radius: 6rpx;
  font-size: 24rpx;
  font-weight: 500;
}

.status-pending, .status-processing, .status-waiting_receive {
  background: #FFF8E1;
  color: #F57C00;
}

.status-approved {
  background: #E3F2FD;
  color: #1976D2;
}

.status-success {
  background: #E8F5E9;
  color: #4CAF50;
}

.status-rejected, .status-failed {
  background: #FFEBEE;
  color: #F44336;
}

.amount {
  font-size: 32rpx;
  font-weight: 700;
  color: #C9A962;
}

.card-body {
  padding: 24rpx;
}

.info-row {
  display: flex;
  padding: 8rpx 0;
  font-size: 26rpx;
}

.label {
  color: rgba(245, 245, 240, 0.5);
  min-width: 160rpx;
}

.value {
  color: #F5F5F0;
  flex: 1;
  word-break: break-all;
}

.card-actions {
  display: flex;
  gap: 12rpx;
  padding: 0 24rpx 24rpx;
  border-top: 1rpx solid rgba(201, 169, 98, 0.1);
}

.action-btn {
  flex: 1;
  height: 60rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6rpx;
  font-size: 26rpx;
  font-weight: 500;
}

.action-btn.approve {
  background: #4CAF50;
  color: #fff;
}

.action-btn.reject {
  background: #F44336;
  color: #fff;
}

.action-btn.confirm {
  background: #2196F3;
  color: #fff;
}

.action-btn.retry {
  background: #FF9800;
  color: #fff;
}

.empty-state {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 100rpx 0;
}

.empty-text {
  font-size: 28rpx;
  color: rgba(245, 245, 240, 0.4);
}

.load-more {
  padding: 30rpx;
  text-align: center;
}

.load-more-text {
  font-size: 26rpx;
  color: #C9A962;
}
</style>
