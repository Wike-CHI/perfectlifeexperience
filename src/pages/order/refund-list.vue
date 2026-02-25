<template>
  <view class="container">
    <!-- 顶部Tab切换 -->
    <view class="tab-bar">
      <view
        class="tab-item"
        :class="{ active: currentTab === 'all' }"
        @click="switchTab('all')"
      >
        <text class="tab-text">全部</text>
        <view class="tab-indicator" v-if="currentTab === 'all'"></view>
      </view>
      <view
        class="tab-item"
        :class="{ active: currentTab === 'processing' }"
        @click="switchTab('processing')"
      >
        <text class="tab-text">处理中</text>
        <view class="tab-indicator" v-if="currentTab === 'processing'"></view>
      </view>
      <view
        class="tab-item"
        :class="{ active: currentTab === 'completed' }"
        @click="switchTab('completed')"
      >
        <text class="tab-text">已完成</text>
        <view class="tab-indicator" v-if="currentTab === 'completed'"></view>
      </view>
    </view>

    <!-- 退款列表 -->
    <view class="refund-list" v-if="refundList.length > 0">
      <view
        class="refund-item"
        v-for="item in refundList"
        :key="item._id"
        @click="goToDetail(item._id!)"
      >
        <!-- 状态标签 -->
        <view class="refund-status" :class="`status-${item.refundStatus}`">
          {{ getStatusText(item.refundStatus) }}
        </view>

        <!-- 退款类型 -->
        <view class="refund-type-badge">
          {{ RefundTypeNames[item.refundType!] }}
        </view>

        <!-- 退款金额 -->
        <view class="refund-amount">
          -¥{{ formatPrice(item.refundAmount) }}
        </view>

        <!-- 商品信息 -->
        <view class="product-preview" v-if="item.products && item.products.length > 0">
          <image
            class="product-img"
            :src="item.products[0].productImage || ''"
            mode="aspectFill"
          />
          <view class="product-info">
            <text class="product-name">{{ item.products[0].productName }}</text>
            <text class="product-count" v-if="item.products.length > 1">
              等{{ item.products.length }}件商品
            </text>
          </view>
        </view>

        <!-- 退款单号和时间 -->
        <view class="refund-footer">
          <text class="refund-no">退款单号：{{ item.refundNo }}</text>
          <text class="refund-time">{{ formatTime(item.createTime) }}</text>
        </view>
      </view>
    </view>

    <!-- 空状态 -->
    <view class="empty-state" v-else>
      <image class="empty-icon" src="/static/icons/empty-refund.png" mode="aspectFit" />
      <text class="empty-text">暂无退款记录</text>
    </view>

    <!-- 加载更多 -->
    <view class="load-more" v-if="hasMore && refundList.length > 0">
      <text class="load-more-text">{{ loading ? '加载中...' : '加载更多' }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { getRefundList, formatPrice } from '@/utils/api';

// 类型定义（内联，避免分包导入问题）
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
}

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

// 当前tab
const currentTab = ref<'all' | 'processing' | 'completed'>('all');

// 退款列表
const refundList = ref<Partial<Refund>[]>([]);

// 分页
const page = ref(1);
const pageSize = 20;
const hasMore = ref(true);
const loading = ref(false);

// 切换tab
const switchTab = (tab: 'all' | 'processing' | 'completed') => {
  currentTab.value = tab;
  page.value = 1;
  refundList.value = [];
  hasMore.value = true;
  loadRefundList();
};

// 获取状态文本
const getStatusText = (status?: string) => {
  return RefundStatusNames[status as keyof typeof RefundStatusNames] || '未知状态';
};

// 格式化时间
const formatTime = (time?: Date) => {
  if (!time) return '';
  const date = new Date(time);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  const oneDay = 24 * 60 * 60 * 1000;
  const oneYear = 365 * oneDay;

  if (diff < oneDay) {
    const hours = Math.floor(diff / (60 * 60 * 1000));
    if (hours > 0) {
      return `${hours}小时前`;
    }
    const minutes = Math.floor(diff / (60 * 1000));
    return `${minutes}分钟前`;
  } else if (diff < oneYear) {
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${month}月${day}日`;
  } else {
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
  }
};

// 加载退款列表
const loadRefundList = async () => {
  if (loading.value) return;

  try {
    loading.value = true;

    let status = undefined;
    if (currentTab.value === 'processing') {
      status = 'pending,approved,waiting_receive,processing';
    } else if (currentTab.value === 'completed') {
      status = 'success,rejected,failed';
    }

    const res = await getRefundList(status);

    if (res.refunds) {
      if (page.value === 1) {
        refundList.value = res.refunds;
      } else {
        refundList.value = [...refundList.value, ...res.refunds];
      }

      // 判断是否还有更多
      hasMore.value = res.refunds.length >= pageSize;
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
    url: `/pages/order/refund-detail?refundId=${refundId}`
  });
};

// 加载更多
const loadMore = () => {
  if (!hasMore.value || loading.value) return;
  page.value++;
  loadRefundList();
};

onMounted(() => {
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
  background-color: #FAFAFA;
}

.tab-bar {
  display: flex;
  background: #fff;
  padding: 20rpx 32rpx;
  border-bottom: 1rpx solid #EAEAEA;
}

.tab-item {
  flex: 1;
  text-align: center;
  padding: 16rpx 0;
  position: relative;
}

.tab-text {
  font-size: 28rpx;
  color: #666;
  font-weight: 500;
}

.tab-item.active .tab-text {
  color: #1A1A1A;
  font-weight: 600;
}

.tab-indicator {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 40rpx;
  height: 4rpx;
  background: #D4A574;
  border-radius: 2rpx;
}

.refund-list {
  padding: 20rpx 32rpx;
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.refund-item {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  position: relative;
}

.refund-status {
  display: inline-block;
  padding: 4rpx 12rpx;
  border-radius: 4rpx;
  font-size: 22rpx;
  font-weight: 500;
  margin-bottom: 16rpx;
}

.status-pending, .status-processing, .status-waiting_receive {
  background: #FFF8E1;
  color: #F57C00;
}

.status-success {
  background: #E8F5E9;
  color: #4CAF50;
}

.status-rejected, .status-failed {
  background: #FFEBEE;
  color: #F44336;
}

.refund-type-badge {
  display: inline-block;
  padding: 4rpx 12rpx;
  background: #F5F5F5;
  color: #666;
  font-size: 22rpx;
  border-radius: 4rpx;
  margin-left: 12rpx;
}

.refund-amount {
  font-size: 32rpx;
  font-weight: 700;
  color: #D4A574;
  margin-bottom: 16rpx;
}

.product-preview {
  display: flex;
  gap: 20rpx;
  padding: 16rpx 0;
  border-top: 1rpx solid #F5F5F5;
  border-bottom: 1rpx solid #F5F5F5;
}

.product-img {
  width: 100rpx;
  height: 100rpx;
  border-radius: 8rpx;
  background: #F0F0F0;
}

.product-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.product-name {
  font-size: 26rpx;
  color: #1A1A1A;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.product-count {
  font-size: 24rpx;
  color: #999;
}

.refund-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 16rpx;
}

.refund-no {
  font-size: 24rpx;
  color: #999;
  font-family: monospace;
}

.refund-time {
  font-size: 24rpx;
  color: #999;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding-top: 200rpx;
}

.empty-icon {
  width: 200rpx;
  height: 200rpx;
  margin-bottom: 40rpx;
  opacity: 0.5;
}

.empty-text {
  font-size: 28rpx;
  color: #999;
}

.load-more {
  padding: 30rpx;
  text-align: center;
}

.load-more-text {
  font-size: 26rpx;
  color: #999;
}
</style>
