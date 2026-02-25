<template>
  <view class="container">
    <!-- 加载状态 -->
    <view class="loading" v-if="loading">
      <text class="loading-text">加载中...</text>
    </view>

    <!-- 退款详情 -->
    <view class="content" v-else-if="refund">
      <!-- 状态头部 -->
      <view class="status-header" :class="`status-${refund.refundStatus}`">
        <text class="status-icon">{{ getStatusIcon(refund.refundStatus) }}</text>
        <text class="status-text">{{ getStatusText(refund.refundStatus) }}</text>
      </view>

      <!-- 进度时间线 -->
      <view class="timeline-card">
        <view class="card-title">退款进度</view>
        <view class="timeline">
          <view
            class="timeline-item"
            v-for="(step, index) in currentTimeline"
            :key="index"
            :class="{ active: step.active, completed: step.completed }"
          >
            <view class="timeline-dot"></view>
            <view class="timeline-content">
              <text class="timeline-title">{{ step.title }}</text>
              <text class="timeline-desc" v-if="step.desc">{{ step.desc }}</text>
            </view>
          </view>
          <view class="timeline-line" v-if="index < currentTimeline.length - 1"></view>
        </view>
      </view>

      <!-- 退款信息 -->
      <view class="info-card">
        <view class="card-title">退款信息</view>
        <view class="info-row">
          <text class="label">退款单号</text>
          <text class="value">{{ refund.refundNo }}</text>
        </view>
        <view class="info-row">
          <text class="label">退款金额</text>
          <text class="value amount">¥{{ formatPrice(refund.refundAmount) }}</text>
        </view>
        <view class="info-row">
          <text class="label">退款类型</text>
          <text class="value">{{ RefundTypeNames[refund.refundType!] }}</text>
        </view>
        <view class="info-row">
          <text class="label">退款原因</text>
          <text class="value">{{ refund.refundReason }}</text>
        </view>
        <view class="info-row" v-if="refund.rejectReason">
          <text class="label">拒绝原因</text>
          <text class="value error">{{ refund.rejectReason }}</text>
        </view>
      </view>

      <!-- 商品信息 -->
      <view class="product-card" v-if="refund.products && refund.products.length > 0">
        <view class="card-title">退款商品</view>
        <view class="product-item" v-for="(product, index) in refund.products" :key="index">
          <image class="product-img" :src="product.productImage || ''" mode="aspectFill" />
          <view class="product-info">
            <text class="product-name">{{ product.productName }}</text>
            <text class="product-quantity">购买数量：{{ product.quantity }}</text>
            <text class="product-refund">退款数量：{{ product.refundQuantity }}</text>
          </view>
          <text class="product-price">¥{{ formatPrice(product.price * product.refundQuantity) }}</text>
        </view>
      </view>

      <!-- 退货物流信息（退货退款） -->
      <view class="logistics-card" v-if="refund.refundType === 'return_refund'">
        <view class="card-title">退货物流</view>

        <!-- 已填写物流 -->
        <template v-if="refund.returnLogistics">
          <view class="logistics-info">
            <view class="logistics-row">
              <text class="label">物流公司</text>
              <text class="value">{{ refund.returnLogistics.company }}</text>
            </view>
            <view class="logistics-row">
              <text class="label">运单号</text>
              <text class="value">{{ refund.returnLogistics.trackingNo }}</text>
            </view>
            <view class="logistics-row">
              <text class="label">寄出时间</text>
              <text class="value">{{ formatDateTime(refund.returnLogistics.shipTime) }}</text>
            </view>
          </view>
        </template>

        <!-- 未填写物流（approved状态） -->
        <template v-else-if="refund.refundStatus === 'approved'">
          <button class="fill-logistics-btn" @click="goToFillLogistics">填写退货物流</button>
        </template>

        <!-- 等待填写物流 -->
        <template v-else>
          <view class="logistics-pending">等待卖家同意后填写退货物流</view>
        </template>
      </view>

      <!-- 操作按钮 -->
      <view class="actions" v-if="refund.refundStatus === 'pending'">
        <button class="action-btn cancel" @click="handleCancel">取消退款</button>
      </view>
    </view>

    <!-- 错误状态 -->
    <view class="error" v-else>
      <text class="error-text">{{ error || '退款记录不存在' }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { getRefundDetail, cancelRefund, formatPrice } from '@/utils/api';

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
  auditBy?: string
  auditTime?: Date
  auditRemark?: string
  successTime?: Date
  failedReason?: string
  createTime: Date
  updateTime: Date
  returnLogistics?: {
    company: string
    trackingNo: string
    shipTime?: Date
  }
}

// 退款ID
const refundId = ref('');
const refund = ref<Partial<Refund> | null>(null);
const loading = ref(true);
const error = ref('');

// 时间线配置
const timelineConfig = {
  only_refund: [
    { title: '提交申请', key: 'pending' },
    { title: '商家审核', key: 'approved' },
    { title: '退款中', key: 'processing' },
    { title: '退款完成', key: 'success' }
  ],
  return_refund: [
    { title: '提交申请', key: 'pending' },
    { title: '商家同意', key: 'approved' },
    { title: '填写物流', key: 'waiting_logistics' },
    { title: '商家收货', key: 'waiting_receive' },
    { title: '退款中', key: 'processing' },
    { title: '退款完成', key: 'success' }
  ]
};

// 当前时间线
const currentTimeline = computed(() => {
  if (!refund.value) return [];

  const config = timelineConfig[refund.value.refundType!] || timelineConfig.only_refund;
  const currentStatus = refund.value.refundStatus;

  // 确定当前步骤索引
  let currentIndex = -1;
  if (currentStatus === 'pending') currentIndex = 0;
  else if (currentStatus === 'approved') currentIndex = 1;
  else if (currentStatus === 'waiting_logistics') currentIndex = 2;
  else if (currentStatus === 'waiting_receive') currentIndex = 3;
  else if (currentStatus === 'processing') currentIndex = 4;
  else if (currentStatus === 'success') currentIndex = config.length - 1;
  else if (['rejected', 'failed', 'cancelled'].includes(currentStatus || '')) currentIndex = 1;

  return config.map((step, index) => ({
    ...step,
    completed: index < currentIndex,
    active: index === currentIndex
  }));
});

// 获取状态文本
const getStatusText = (status?: string) => {
  return RefundStatusNames[status as keyof typeof RefundStatusNames] || '未知状态';
};

// 获取状态图标
const getStatusIcon = (status?: string) => {
  const icons = {
    pending: '⏳',
    approved: '✅',
    rejected: '❌',
    waiting_receive: '📦',
    processing: '💰',
    success: '✅',
    failed: '⚠️',
    cancelled: '🚫'
  };
  return icons[status as keyof typeof icons] || '⏳';
};

// 格式化时间
const formatDateTime = (time?: Date) => {
  if (!time) return '';
  const date = new Date(time);
  return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
};

// 加载退款详情
const loadRefundDetail = async () => {
  loading.value = true;
  error.value = '';

  try {
    const res = await getRefundDetail(refundId.value);
    refund.value = res.refund || null;
  } catch (err: any) {
    error.value = err.message || '加载失败';
  } finally {
    loading.value = false;
  }
};

// 填写物流
const goToFillLogistics = () => {
  // 跳转到填写物流页面（可以使用modal或新页面）
  uni.showModal({
    title: '填写退货物流',
    editable: true,
    placeholderText: '请输入物流公司和运单号，格式：顺丰速运 SF1234567890',
    success: async (res) => {
      if (res.confirm && res.content) {
        const [company, trackingNo] = res.content.split(' ');
        if (company && trackingNo) {
          try {
            uni.showLoading({ title: '提交中...' });
            // 调用更新物流API
            await updateReturnLogistics({
              refundId: refundId.value,
              company: company,
              trackingNo: trackingNo
            });
            uni.hideLoading();
            uni.showToast({ title: '提交成功', icon: 'success' });
            loadRefundDetail();
          } catch (err: any) {
            uni.hideLoading();
            uni.showToast({ title: err.message || '提交失败', icon: 'none' });
          }
        } else {
          uni.showToast({ title: '格式错误，请重新输入', icon: 'none' });
        }
      }
    }
  });
};

// 取消退款
const handleCancel = () => {
  uni.showModal({
    title: '取消退款',
    content: '确认要取消退款申请吗？',
    success: async (res) => {
      if (res.confirm) {
        try {
          uni.showLoading({ title: '处理中...' });
          await cancelRefund(refundId.value);
          uni.hideLoading();
          uni.showToast({ title: '已取消', icon: 'success' });
          loadRefundDetail();
        } catch (err: any) {
          uni.hideLoading();
          uni.showToast({ title: err.message || '取消失败', icon: 'none' });
        }
      }
    }
  });
};

// 更新物流API（需要从api.ts导入）
const updateReturnLogistics = async (params: any) => {
  // 这里应该调用api.ts中的updateReturnLogistics函数
  // 由于模板中没有导入，这里直接使用callFunction
  const res = await wx.cloud.callFunction({
    name: 'order',
    data: {
      action: 'updateReturnLogistics',
      ...params
    }
  });
  if (res.result.code !== 0) {
    throw new Error(res.result.msg);
  }
};

onMounted(() => {
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
  background-color: #FAFAFA;
  padding-bottom: 40rpx;
}

.loading, .error {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 200rpx 0;
}

.loading-text, .error-text {
  font-size: 28rpx;
  color: #999;
}

.content {
  padding: 20rpx 32rpx;
}

.status-header {
  background: #fff;
  border-radius: 16rpx;
  padding: 60rpx 32rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 20rpx;
}

.status-header.status-pending,
.status-header.status-processing,
.status-header.status-waiting_receive {
  background: linear-gradient(135deg, #FFF8E1 0%, #FFECB3 100%);
}

.status-header.status-success {
  background: linear-gradient(135deg, #E8F5E9 0%, #C8E6C9 100%);
}

.status-header.status-rejected,
.status-header.status-failed,
.status-header.status-cancelled {
  background: linear-gradient(135deg, #FFEBEE 0%, #FFCDD2 100%);
}

.status-icon {
  font-size: 80rpx;
  margin-bottom: 20rpx;
}

.status-text {
  font-size: 32rpx;
  font-weight: 600;
  color: #1A1A1A;
}

.timeline-card,
.info-card,
.product-card,
.logistics-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
}

.card-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #1A1A1A;
  margin-bottom: 20rpx;
}

.timeline {
  display: flex;
  align-items: flex-start;
}

.timeline-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex-shrink: 0;
}

.timeline-dot {
  width: 24rpx;
  height: 24rpx;
  border-radius: 50%;
  background: #E0E0E0;
  border: 4rpx solid #FAFAFA;
}

.timeline-item.completed .timeline-dot {
  background: #4CAF50;
}

.timeline-item.active .timeline-dot {
  background: #D4A574;
  transform: scale(1.2);
}

.timeline-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 8rpx;
  max-width: 100rpx;
}

.timeline-title {
  font-size: 24rpx;
  color: #999;
}

.timeline-item.active .timeline-title {
  color: #1A1A1A;
  font-weight: 500;
}

.timeline-desc {
  font-size: 20rpx;
  color: #999;
  margin-top: 4rpx;
}

.timeline-line {
  flex: 1;
  height: 2rpx;
  background: #E0E0E0;
  min-width: 40rpx;
  margin-top: -60rpx;
}

.timeline-item.completed + .timeline-line {
  background: #4CAF50;
}

.info-row {
  display: flex;
  justify-content: space-between;
  padding: 12rpx 0;
  border-bottom: 1rpx solid #F5F5F5;
}

.info-row:last-child {
  border-bottom: none;
}

.label {
  font-size: 26rpx;
  color: #666;
}

.value {
  font-size: 26rpx;
  color: #1A1A1A;
  text-align: right;
  max-width: 400rpx;
  word-break: break-all;
}

.value.amount {
  font-size: 32rpx;
  font-weight: 700;
  color: #D4A574;
}

.value.error {
  color: #F44336;
}

.product-item {
  display: flex;
  gap: 20rpx;
  padding: 16rpx 0;
  border-bottom: 1rpx solid #F5F5F5;
}

.product-item:last-child {
  border-bottom: none;
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

.product-quantity,
.product-refund {
  font-size: 24rpx;
  color: #999;
}

.product-price {
  font-size: 28rpx;
  color: #D4A574;
  font-weight: 600;
  align-self: flex-start;
}

.logistics-info {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.logistics-row {
  display: flex;
  justify-content: space-between;
}

.fill-logistics-btn {
  width: 100%;
  height: 80rpx;
  background: #D4A574;
  color: #fff;
  border-radius: 8rpx;
  font-size: 28rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
}

.logistics-pending {
  text-align: center;
  color: #999;
  font-size: 26rpx;
  padding: 40rpx 0;
}

.actions {
  margin-top: 20rpx;
}

.action-btn {
  width: 100%;
  height: 88rpx;
  border-radius: 12rpx;
  font-size: 28rpx;
  font-weight: 500;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
}

.action-btn.cancel {
  background: #fff;
  color: #F44336;
  border: 1rpx solid #F44336;
}
</style>
