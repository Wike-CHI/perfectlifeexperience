<template>
  <view class="container">
    <!-- 加载状态 -->
    <view class="loading" v-if="loading">
      <text class="loading-text">加载中...</text>
    </view>

    <!-- 错误状态 -->
    <view class="error" v-else-if="error">
      <text class="error-text">{{ error }}</text>
      <text class="retry-btn" @click="loadRefundDetail">重试</text>
    </view>

    <!-- 详情内容 -->
    <view class="content" v-else-if="refund">
      <!-- 页面标题 -->
      <view class="page-header">
        <text class="page-title">退款详情</text>
        <view class="status-badge" :class="`status-${refund.refundStatus}`">
          {{ getStatusText(refund.refundStatus) }}
        </view>
      </view>

      <!-- 状态进度条 -->
      <view class="status-timeline">
        <view class="timeline-item" :class="{ active: isStatusActive('pending') }">
          <view class="timeline-dot"></view>
          <text class="timeline-text">待审核</text>
        </view>
        <view class="timeline-line" v-if="refund.refundType === 'return_refund'"></view>
        <view class="timeline-item" :class="{ active: isStatusActive('approved') }" v-if="refund.refundType === 'return_refund'">
          <view class="timeline-dot"></view>
          <text class="timeline-text">已同意</text>
        </view>
        <view class="timeline-line" v-if="refund.refundType === 'return_refund'"></view>
        <view class="timeline-item" :class="{ active: isStatusActive('waiting_receive') }" v-if="refund.refundType === 'return_refund'">
          <view class="timeline-dot"></view>
          <text class="timeline-text">待收货</text>
        </view>
        <view class="timeline-line"></view>
        <view class="timeline-item" :class="{ active: isStatusActive('processing') }">
          <view class="timeline-dot"></view>
          <text class="timeline-text">退款中</text>
        </view>
        <view class="timeline-line"></view>
        <view class="timeline-item" :class="{ active: isStatusActive('success') }">
          <view class="timeline-dot"></view>
          <text class="timeline-text">已完成</text>
        </view>
      </view>

      <!-- 退款信息卡片 -->
      <view class="card">
        <view class="card-title">退款信息</view>
        <view class="card-body">
          <view class="info-row">
            <text class="label">退款单号：</text>
            <text class="value">{{ refund.refundNo }}</text>
          </view>
          <view class="info-row">
            <text class="label">订单号：</text>
            <text class="value">{{ refund.orderNo }}</text>
          </view>
          <view class="info-row">
            <text class="label">退款类型：</text>
            <text class="value">{{ RefundTypeNames[refund.refundType!] }}</text>
          </view>
          <view class="info-row">
            <text class="label">退款金额：</text>
            <text class="value amount">¥{{ formatPrice(refund.refundAmount) }}</text>
          </view>
          <view class="info-row">
            <text class="label">退款原因：</text>
            <text class="value">{{ refund.refundReason }}</text>
          </view>
          <view class="info-row">
            <text class="label">申请时间：</text>
            <text class="value">{{ formatDateTime(refund.createTime) }}</text>
          </view>
          <view class="info-row" v-if="refund.rejectReason">
            <text class="label">拒绝原因：</text>
            <text class="value reject">{{ refund.rejectReason }}</text>
          </view>
          <view class="info-row" v-if="refund.failedReason">
            <text class="label">失败原因：</text>
            <text class="value error">{{ refund.failedReason }}</text>
          </view>
        </view>
      </view>

      <!-- 商品信息卡片 -->
      <view class="card" v-if="refund.products && refund.products.length > 0">
        <view class="card-title">退款商品</view>
        <view class="card-body">
          <view class="product-item" v-for="(product, index) in refund.products" :key="index">
            <image class="product-img" :src="product.productImage || ''" mode="aspectFill" />
            <view class="product-info">
              <text class="product-name">{{ product.productName }}</text>
              <text class="product-quantity">购买数量：{{ product.quantity }}</text>
              <text class="product-refund-quantity">退款数量：{{ product.refundQuantity }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 退货物流信息卡片 -->
      <view class="card" v-if="refund.returnLogistics">
        <view class="card-title">退货物流</view>
        <view class="card-body">
          <view class="info-row">
            <text class="label">物流公司：</text>
            <text class="value">{{ refund.returnLogistics.company }}</text>
          </view>
          <view class="info-row">
            <text class="label">运单号：</text>
            <text class="value">{{ refund.returnLogistics.trackingNo }}</text>
          </view>
          <view class="info-row">
            <text class="label">寄出时间：</text>
            <text class="value">{{ formatDateTime(refund.returnLogistics.shipTime) }}</text>
          </view>
        </view>
      </view>

      <!-- 订单信息卡片 -->
      <view class="card" v-if="order">
        <view class="card-title">订单信息</view>
        <view class="card-body">
          <view class="info-row">
            <text class="label">订单状态：</text>
            <text class="value">{{ order.status }}</text>
          </view>
          <view class="info-row">
            <text class="label">支付方式：</text>
            <text class="value">{{ order.paymentMethod === 'wechat' ? '微信支付' : '余额支付' }}</text>
          </view>
          <view class="info-row">
            <text class="label">订单金额：</text>
            <text class="value">¥{{ formatPrice(order.totalAmount) }}</text>
          </view>
          <view class="info-row" v-if="order.address">
            <text class="label">收货地址：</text>
            <text class="value">{{ formatAddress(order.address) }}</text>
          </view>
        </view>
      </view>

      <!-- 用户信息卡片 -->
      <view class="card" v-if="user">
        <view class="card-title">用户信息</view>
        <view class="card-body">
          <view class="info-row">
            <text class="label">用户昵称：</text>
            <text class="value">{{ user.nickName || '未设置' }}</text>
          </view>
          <view class="info-row">
            <text class="label">手机号：</text>
            <text class="value">{{ user.phoneNumber || '未绑定' }}</text>
          </view>
        </view>
      </view>

      <!-- 操作区域 -->
      <view class="actions">
        <!-- 待审核状态 -->
        <template v-if="refund.refundStatus === 'pending'">
          <view class="action-section">
            <view class="action-title">
              <text class="title-text">审核退款</text>
              <text class="title-desc">请仔细核对退款信息后操作</text>
            </view>
            <view class="form-group" v-if="refund.refundType === 'only_refund'">
              <text class="form-label">退款金额（分）</text>
              <input class="form-input" v-model="auditForm.refundAmount" type="digit" placeholder="可修改退款金额" />
            </view>
            <view class="form-group">
              <text class="form-label">备注</text>
              <textarea class="form-textarea" v-model="auditForm.remark" placeholder="选填，审核备注" />
            </view>
            <view class="action-buttons">
              <button class="action-btn reject" @click="handleReject">拒绝</button>
              <button class="action-btn approve" @click="handleApprove">同意</button>
            </view>
          </view>
        </template>

        <!-- 待收货状态（退货退款） -->
        <template v-if="refund.refundStatus === 'waiting_receive' && refund.returnLogistics">
          <view class="action-section">
            <view class="action-title">
              <text class="title-text">确认收货</text>
              <text class="title-desc">用户已寄回商品，请确认收到后再退款</text>
            </view>
            <view class="logistics-info">
              <text class="logistics-label">物流信息：</text>
              <text class="logistics-value">{{ refund.returnLogistics.company }} - {{ refund.returnLogistics.trackingNo }}</text>
            </view>
            <view class="action-buttons">
              <button class="action-btn confirm" @click="handleConfirmReceipt">确认收货并退款</button>
            </view>
          </view>
        </template>

        <!-- 退款失败状态 -->
        <template v-if="refund.refundStatus === 'failed'">
          <view class="action-section">
            <view class="action-title">
              <text class="title-text">重试退款</text>
              <text class="title-desc">退款失败，可重试退款操作</text>
            </view>
            <view class="action-buttons">
              <button class="action-btn retry" @click="handleRetry">重试退款</button>
            </view>
          </view>
        </template>

        <!-- 已完成/已拒绝状态 -->
        <template v-if="['success', 'rejected'].includes(refund.refundStatus || '')">
          <view class="action-section">
            <view class="action-info">
              <text class="info-text">{{ refund.refundStatus === 'success' ? '退款已完成' : '退款已拒绝' }}</text>
              <text class="info-time">{{ formatDateTime(refund.updateTime) }}</text>
            </view>
          </view>
        </template>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { adminGetRefundDetail, adminApproveRefund, adminConfirmReceipt, adminRejectRefund, adminRetryRefund, formatPrice } from '@/utils/api';
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
  refundEvidence: string[]
  rejectReason?: string
  createTime: Date
  updateTime: Date
  products?: Array<{
    productName: string
    productImage: string
    quantity: number
    price: number
  }>
  returnLogistics?: {
    company: string
    trackingNo: string
    shipTime?: Date
  }
}

interface Order {
  _id: string
  orderNo: string
  totalAmount: number
}

// 获取URL参数
const refundId = ref('');
const refund = ref<Partial<Refund> | null>(null);
const order = ref<Partial<Order> | null>(null);
const user = ref<any>(null);

const loading = ref(true);
const error = ref('');

// 审核表单
const auditForm = ref({
  refundAmount: 0,
  remark: ''
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

// 格式化地址
const formatAddress = (address: any) => {
  if (!address) return '';
  return `${address.province || ''}${address.city || ''}${address.district || ''}${address.detail || ''}`;
};

// 判断状态是否激活
const isStatusActive = (status: string) => {
  if (!refund.value) return false;
  const currentStatus = refund.value.refundStatus;

  const statusOrder = {
    only_refund: ['pending', 'processing', 'success', 'rejected', 'failed'],
    return_refund: ['pending', 'approved', 'waiting_receive', 'processing', 'success', 'rejected', 'failed']
  };

  const orderList = refund.value.refundType === 'return_refund' ? statusOrder.return_refund : statusOrder.only_refund;
  const currentIndex = orderList.indexOf(currentStatus);
  const checkIndex = orderList.indexOf(status);

  return currentIndex >= checkIndex;
};

// 加载退款详情
const loadRefundDetail = async () => {
  loading.value = true;
  error.value = '';

  try {
    const res = await adminGetRefundDetail({
      refundId: refundId.value,
      adminToken: AdminAuthManager.getToken()
    });

    if (res.refund) {
      refund.value = res.refund;
      order.value = res.order || null;
      user.value = res.user || null;
      auditForm.value.refundAmount = res.refund.refundAmount;
    } else {
      error.value = '退款记录不存在';
    }
  } catch (err: any) {
    error.value = err.message || '加载失败';
  } finally {
    loading.value = false;
  }
};

// 同意退款
const handleApprove = async () => {
  if (!refund.value) return;

  uni.showModal({
    title: '同意退款',
    content: `确认同意退款单号 ${refund.value.refundNo}？`,
    success: async (res) => {
      if (res.confirm) {
        try {
          uni.showLoading({ title: '处理中...' });
          await adminApproveRefund({
            refundId: refundId.value,
            refundAmount: auditForm.value.refundAmount,
            remark: auditForm.value.remark,
            adminToken: AdminAuthManager.getToken()
          });
          uni.hideLoading();
          uni.showToast({
            title: '已同意',
            icon: 'success'
          });
          // 刷新详情
          loadRefundDetail();
        } catch (err: any) {
          uni.hideLoading();
          uni.showToast({
            title: err.message || '操作失败',
            icon: 'none'
          });
        }
      }
    }
  });
};

// 拒绝退款
const handleReject = () => {
  uni.showModal({
    title: '输入拒绝原因',
    editable: true,
    placeholderText: '请输入拒绝原因',
    success: async (res) => {
      if (res.confirm && res.content) {
        try {
          uni.showLoading({ title: '处理中...' });
          await adminRejectRefund({
            refundId: refundId.value,
            reason: res.content,
            adminToken: AdminAuthManager.getToken()
          });
          uni.hideLoading();
          uni.showToast({
            title: '已拒绝',
            icon: 'success'
          });
          // 刷新详情
          loadRefundDetail();
        } catch (err: any) {
          uni.hideLoading();
          uni.showToast({
            title: err.message || '操作失败',
            icon: 'none'
          });
        }
      }
    }
  });
};

// 确认收货
const handleConfirmReceipt = async () => {
  if (!refund.value) return;

  uni.showModal({
    title: '确认收货',
    content: `确认已收到用户寄回的商品？确认后将执行退款操作。`,
    success: async (res) => {
      if (res.confirm) {
        try {
          uni.showLoading({ title: '处理中...' });
          await adminConfirmReceipt({
            refundId: refundId.value,
            adminToken: AdminAuthManager.getToken()
          });
          uni.hideLoading();
          uni.showToast({
            title: '已确认',
            icon: 'success'
          });
          // 刷新详情
          loadRefundDetail();
        } catch (err: any) {
          uni.hideLoading();
          uni.showToast({
            title: err.message || '操作失败',
            icon: 'none'
          });
        }
      }
    }
  });
};

// 重试退款
const handleRetry = async () => {
  if (!refund.value) return;

  uni.showModal({
    title: '重试退款',
    content: `确认重新执行退款？退款单号：${refund.value.refundNo}`,
    success: async (res) => {
      if (res.confirm) {
        try {
          uni.showLoading({ title: '处理中...' });
          await adminRetryRefund({
            refundId: refundId.value,
            adminToken: AdminAuthManager.getToken()
          });
          uni.hideLoading();
          uni.showToast({
            title: '已重试',
            icon: 'success'
          });
          // 刷新详情
          loadRefundDetail();
        } catch (err: any) {
          uni.hideLoading();
          uni.showToast({
            title: err.message || '操作失败',
            icon: 'none'
          });
        }
      }
    }
  });
};

onMounted(() => {
  // 检查登录状态
  if (!AdminAuthManager.checkAuth()) return;

  // 获取页面参数
  const pages = getCurrentPages();
  const currentPage = pages[pages.length - 1];
  const options = currentPage.options as any;
  refundId.value = options.refundId || '';

  if (!refundId.value) {
    error.value = '缺少退款ID';
    loading.value = false;
  } else {
    loadRefundDetail();
  }
});
</script>

<style scoped>
.container {
  min-height: 100vh;
  background-color: #F5F5F5;
  padding-bottom: 40rpx;
}

.loading, .error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 200rpx 0;
}

.loading-text, .error-text {
  font-size: 28rpx;
  color: #999;
  margin-bottom: 20rpx;
}

.retry-btn {
  font-size: 28rpx;
  color: #1A1A1A;
  padding: 16rpx 32rpx;
  background: #fff;
  border-radius: 8rpx;
}

.content {
  padding: 20rpx 32rpx;
}

.page-header {
  background: #fff;
  padding: 32rpx;
  border-radius: 12rpx;
  margin-bottom: 20rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.page-title {
  font-size: 36rpx;
  font-weight: 700;
  color: #1A1A1A;
}

.status-badge {
  padding: 8rpx 20rpx;
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

.status-timeline {
  background: #fff;
  padding: 40rpx 32rpx;
  border-radius: 12rpx;
  margin-bottom: 20rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.timeline-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
}

.timeline-dot {
  width: 16rpx;
  height: 16rpx;
  border-radius: 50%;
  background: #E0E0E0;
  margin-bottom: 12rpx;
  transition: all 0.3s;
}

.timeline-item.active .timeline-dot {
  background: #D4A574;
  transform: scale(1.2);
}

.timeline-text {
  font-size: 24rpx;
  color: #999;
}

.timeline-item.active .timeline-text {
  color: #1A1A1A;
  font-weight: 500;
}

.timeline-line {
  flex: 1;
  height: 2rpx;
  background: #E0E0E0;
  min-width: 40rpx;
}

.card {
  background: #fff;
  border-radius: 12rpx;
  margin-bottom: 20rpx;
  overflow: hidden;
}

.card-title {
  padding: 24rpx 32rpx;
  font-size: 28rpx;
  font-weight: 600;
  color: #1A1A1A;
  border-bottom: 1rpx solid #F5F5F5;
}

.card-body {
  padding: 24rpx 32rpx;
}

.info-row {
  display: flex;
  padding: 8rpx 0;
  font-size: 26rpx;
}

.label {
  color: #666;
  min-width: 160rpx;
  flex-shrink: 0;
}

.value {
  color: #1A1A1A;
  flex: 1;
  word-break: break-all;
}

.value.amount {
  font-size: 32rpx;
  font-weight: 700;
  color: #D4A574;
}

.value.reject {
  color: #F44336;
}

.value.error {
  color: #F44336;
}

.product-item {
  display: flex;
  gap: 20rpx;
  padding: 16rpx 0;
}

.product-img {
  width: 120rpx;
  height: 120rpx;
  border-radius: 8rpx;
  background: #F0F0F0;
  flex-shrink: 0;
}

.product-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.product-name {
  font-size: 28rpx;
  color: #1A1A1A;
  font-weight: 500;
}

.product-quantity, .product-refund-quantity {
  font-size: 24rpx;
  color: #666;
}

.actions {
  margin-top: 20rpx;
}

.action-section {
  background: #fff;
  border-radius: 12rpx;
  padding: 32rpx;
}

.action-title {
  margin-bottom: 24rpx;
}

.title-text {
  display: block;
  font-size: 28rpx;
  font-weight: 600;
  color: #1A1A1A;
  margin-bottom: 8rpx;
}

.title-desc {
  display: block;
  font-size: 24rpx;
  color: #999;
}

.form-group {
  margin-bottom: 20rpx;
}

.form-label {
  display: block;
  font-size: 26rpx;
  color: #666;
  margin-bottom: 12rpx;
}

.form-input, .form-textarea {
  width: 100%;
  padding: 20rpx;
  border: 1rpx solid #E0E0E0;
  border-radius: 8rpx;
  font-size: 28rpx;
  background: #FAFAFA;
}

.form-textarea {
  min-height: 120rpx;
  resize: none;
}

.logistics-info {
  padding: 20rpx;
  background: #F5F5F5;
  border-radius: 8rpx;
  margin-bottom: 20rpx;
}

.logistics-label {
  display: block;
  font-size: 24rpx;
  color: #666;
  margin-bottom: 8rpx;
}

.logistics-value {
  display: block;
  font-size: 26rpx;
  color: #1A1A1A;
  font-family: monospace;
}

.action-buttons {
  display: flex;
  gap: 20rpx;
}

.action-btn {
  flex: 1;
  height: 80rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8rpx;
  font-size: 28rpx;
  font-weight: 500;
  border: none;
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

.action-info {
  text-align: center;
  padding: 40rpx 0;
}

.info-text {
  display: block;
  font-size: 28rpx;
  color: #1A1A1A;
  margin-bottom: 12rpx;
}

.info-time {
  display: block;
  font-size: 24rpx;
  color: #999;
}
</style>
