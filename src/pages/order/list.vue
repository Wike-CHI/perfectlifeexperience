<template>
  <view class="container">
    <!-- 状态标签栏 -->
    <view class="status-tabs">
      <scroll-view scroll-x class="tabs-scroll">
        <view class="tabs-list">
          <view
            class="tab-item"
            :class="{ active: currentStatus === 'all' }"
            @click="switchStatus('all')"
          >
            <text class="tab-text">全部</text>
          </view>
          <view
            class="tab-item"
            :class="{ active: currentStatus === 'pending' }"
            @click="switchStatus('pending')"
          >
            <text class="tab-text">待付款</text>
            <text v-if="statusCount.pending > 0" class="badge">{{ statusCount.pending }}</text>
          </view>
          <view
            class="tab-item"
            :class="{ active: currentStatus === 'paid' }"
            @click="switchStatus('paid')"
          >
            <text class="tab-text">待发货</text>
            <text v-if="statusCount.paid > 0" class="badge">{{ statusCount.paid }}</text>
          </view>
          <view
            class="tab-item"
            :class="{ active: currentStatus === 'shipping' }"
            @click="switchStatus('shipping')"
          >
            <text class="tab-text">待收货</text>
            <text v-if="statusCount.shipping > 0" class="badge">{{ statusCount.shipping }}</text>
          </view>
          <view
            class="tab-item"
            :class="{ active: currentStatus === 'completed' }"
            @click="switchStatus('completed')"
          >
            <text class="tab-text">已完成</text>
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- 订单列表 -->
    <scroll-view class="order-list" scroll-y @scrolltolower="loadMore" v-if="orders.length > 0">
      <view class="order-card" v-for="(order, index) in orders" :key="order._id">
        <!-- 订单头部 -->
        <view class="order-header">
          <text class="order-no">订单号: {{ order.orderNo }}</text>
          <text
            class="order-status"
            :style="{ color: getStatusColor(order.status) }"
          >
            {{ getStatusText(order.status) }}
          </text>
        </view>

        <!-- 商品列表 -->
        <view class="order-goods" @click="goToDetail(order)">
          <view class="goods-item" v-for="(item, idx) in order.products" :key="idx">
            <image class="goods-image" :src="item.image" mode="aspectFill" />
            <view class="goods-info">
              <text class="goods-name">{{ item.name }}</text>
              <view class="goods-bottom">
                <text class="goods-price">¥{{ fp(item.price) }}</text>
                <text class="goods-quantity">x{{ item.quantity }}</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 订单金额 -->
        <view class="order-amount">
          <text class="amount-label">共{{ getTotalQuantity(order) }}件商品</text>
          <text class="amount-total">合计: ¥{{ fp(order.totalAmount) }}</text>
        </view>

        <!-- 订单操作 -->
        <view class="order-actions">
          <view class="btn-default" v-if="order.status === 'pending'" @click="cancelOrder(order)">
            <text class="btn-text">取消订单</text>
          </view>
          <view class="btn-primary" v-if="order.status === 'pending'" @click="payOrder(order)">
            <text class="btn-text">立即支付</text>
          </view>
          <view class="btn-primary" v-if="order.status === 'shipping'" @click="confirmReceive(order)">
            <text class="btn-text">确认收货</text>
          </view>
          <view class="btn-default" v-if="order.status === 'completed'" @click="buyAgain(order)">
            <text class="btn-text">再次购买</text>
          </view>
        </view>
      </view>

      <!-- 加载状态 -->
      <view class="load-more" v-if="loading">
        <text class="load-text">加载中...</text>
      </view>
      <view class="no-more" v-else-if="!hasMore">
        <text class="no-more-text">没有更多了</text>
      </view>
    </scroll-view>

    <!-- 空状态 -->
    <view class="empty-state" v-else>
      <view class="empty-icon">&#xe6af;</view>
      <text class="empty-title">暂无订单</text>
      <text class="empty-desc">快去选购心仪的精酿啤酒吧</text>
      <view class="go-shopping" @click="goToHome">
        <text class="btn-text">去逛逛</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { getOrders, updateOrderStatus, cancelOrder as apiCancelOrder, formatPrice } from '@/utils/api';
import { formatPrice as fp } from '@/utils/format';
import { ORDER_STATUS_TEXTS, ORDER_STATUS_COLORS, PAGINATION_CONFIG } from '@/constants/order';
import type { OrderDB, OrderStatus } from '@/types/database';

// 使用数据库类型定义
type Order = OrderDB;

// 数据
const orders = ref<Order[]>([]);
const currentStatus = ref('all');
const loading = ref(false);
const hasMore = ref(true);
const page = ref(1);
const pageSize = PAGINATION_CONFIG.DEFAULT_PAGE_SIZE;

// 状态计数
const statusCount = ref({
  pending: 0,
  paid: 0,
  shipping: 0,
  completed: 0
});

// 获取状态文本（使用常量）
const getStatusText = (status: OrderStatus | string) => {
  return ORDER_STATUS_TEXTS[status as keyof typeof ORDER_STATUS_TEXTS] || status;
};

// 获取状态颜色（使用常量）
const getStatusColor = (status: OrderStatus | string) => {
  return ORDER_STATUS_COLORS[status as keyof typeof ORDER_STATUS_COLORS] || '#6B5B4F';
};

// 获取商品总数
const getTotalQuantity = (order: Order) => {
  return order.products.reduce((total, item) => total + item.quantity, 0);
};

// 加载订单列表
const loadOrders = async (isRefresh = false) => {
  if (loading.value) return;

  try {
    loading.value = true;

    if (isRefresh) {
      page.value = 1;
      orders.value = [];
      hasMore.value = true;
    }

    const res = await getOrders(currentStatus.value === 'all' ? undefined : currentStatus.value);

    // 计算各状态数量
    statusCount.value = {
      pending: res.filter(o => o.status === 'pending').length,
      paid: res.filter(o => o.status === 'paid').length,
      shipping: res.filter(o => o.status === 'shipping').length,
      completed: res.filter(o => o.status === 'completed').length
    };

    if (isRefresh) {
      orders.value = res;
    } else {
      orders.value.push(...res);
    }

    if (res.length < pageSize) {
      hasMore.value = false;
    }
  } catch (error) {
    console.error('加载订单失败:', error);
    uni.showToast({
      title: '加载失败',
      icon: 'none'
    });
  } finally {
    loading.value = false;
  }
};

// 加载更多
const loadMore = () => {
  if (!hasMore.value || loading.value) return;
  page.value++;
  loadOrders();
};

// 切换状态
const switchStatus = (status: string) => {
  currentStatus.value = status;
  loadOrders(true);
};

// 取消订单
const cancelOrder = (order: Order) => {
  uni.showModal({
    title: '提示',
    content: '确定要取消这个订单吗？',
    success: async (res) => {
      if (res.confirm) {
        try {
          await apiCancelOrder(order._id!);
          uni.showToast({
            title: '已取消',
            icon: 'success'
          });
          loadOrders(true);
        } catch (error) {
          uni.showToast({
            title: '取消失败',
            icon: 'none'
          });
        }
      }
    }
  });
};

// 支付订单
const payOrder = (order: Order) => {
  uni.showModal({
    title: '模拟支付',
    content: `支付金额: ¥${fp(order.totalAmount)}`,
    success: async (res) => {
      if (res.confirm) {
        try {
          await updateOrderStatus(order._id!, 'paid');
          uni.showToast({
            title: '支付成功',
            icon: 'success'
          });
          loadOrders(true);
        } catch (error) {
          uni.showToast({
            title: '支付失败',
            icon: 'none'
          });
        }
      }
    }
  });
};

// 确认收货
const confirmReceive = (order: Order) => {
  uni.showModal({
    title: '提示',
    content: '确认已收到商品？',
    success: async (res) => {
      if (res.confirm) {
        try {
          await updateOrderStatus(order._id!, 'completed');
          uni.showToast({
            title: '确认成功',
            icon: 'success'
          });
          loadOrders(true);
        } catch (error) {
          uni.showToast({
            title: '操作失败',
            icon: 'none'
          });
        }
      }
    }
  });
};

// 再次购买
const buyAgain = (order: Order) => {
  // 将商品加入购物车
  uni.showToast({
    title: '已加入购物车',
    icon: 'success'
  });
};

// 页面跳转
const goToDetail = (order: Order) => {
  uni.navigateTo({
    url: `/pages/order/detail?id=${order._id}`
  });
};

const goToHome = () => {
  uni.switchTab({
    url: '/pages/index/index'
  });
};

// 生命周期
onShow(() => {
  loadOrders(true);
});
</script>

<style scoped>
.container {
  min-height: 100vh;
  background-color: #FDF8F3;
}

/* 状态标签栏 */
.status-tabs {
  background: #FFFFFF;
  padding: 0 20rpx;
  border-bottom: 1rpx solid #F5F0E8;
}

.tabs-scroll {
  white-space: nowrap;
}

.tabs-list {
  display: flex;
  height: 88rpx;
}

.tab-item {
  position: relative;
  display: flex;
  align-items: center;
  padding: 0 32rpx;
  height: 100%;
}

.tab-item.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 48rpx;
  height: 4rpx;
  background: #D4A574;
  border-radius: 2rpx;
}

.tab-text {
  font-size: 28rpx;
  color: #6B5B4F;
}

.tab-item.active .tab-text {
  color: #3D2914;
  font-weight: 600;
}

.badge {
  position: absolute;
  top: 16rpx;
  right: 8rpx;
  min-width: 32rpx;
  height: 32rpx;
  background: #C44536;
  color: #FFFFFF;
  font-size: 20rpx;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 8rpx;
}

/* 订单列表 */
.order-list {
  padding: 20rpx;
}

.order-card {
  background: #FFFFFF;
  border-radius: 16rpx;
  padding: 30rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 2rpx 12rpx rgba(61, 41, 20, 0.06);
}

.order-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24rpx;
  padding-bottom: 20rpx;
  border-bottom: 1rpx solid #F5F0E8;
}

.order-no {
  font-size: 26rpx;
  color: #9B8B7F;
}

.order-status {
  font-size: 26rpx;
  font-weight: 500;
}

/* 商品列表 */
.order-goods {
  margin-bottom: 20rpx;
}

.goods-item {
  display: flex;
  align-items: center;
  margin-bottom: 20rpx;
}

.goods-item:last-child {
  margin-bottom: 0;
}

.goods-image {
  width: 140rpx;
  height: 140rpx;
  border-radius: 12rpx;
  margin-right: 24rpx;
}

.goods-info {
  flex: 1;
}

.goods-name {
  font-size: 28rpx;
  color: #3D2914;
  display: block;
  margin-bottom: 16rpx;
}

.goods-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.goods-price {
  font-size: 28rpx;
  font-weight: 600;
  color: #C44536;
}

.goods-quantity {
  font-size: 26rpx;
  color: #9B8B7F;
}

/* 订单金额 */
.order-amount {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 24rpx;
  padding-top: 20rpx;
  border-top: 1rpx solid #F5F0E8;
}

.amount-label {
  font-size: 26rpx;
  color: #9B8B7F;
}

.amount-total {
  font-size: 30rpx;
  color: #3D2914;
  font-weight: 600;
}

/* 订单操作 */
.order-actions {
  display: flex;
  justify-content: flex-end;
  gap: 20rpx;
}

.btn-default, .btn-primary {
  padding: 16rpx 32rpx;
  border-radius: 28rpx;
}

.btn-default {
  border: 2rpx solid #D4A574;
}

.btn-primary {
  background: #D4A574;
}

.btn-text {
  font-size: 26rpx;
}

.btn-default .btn-text {
  color: #D4A574;
}

.btn-primary .btn-text {
  color: #FFFFFF;
}

/* 加载状态 */
.load-more, .no-more {
  text-align: center;
  padding: 40rpx;
}

.load-text, .no-more-text {
  font-size: 26rpx;
  color: #9B8B7F;
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 200rpx 40rpx;
}

.empty-icon {
  font-family: "iconfont";
  font-size: 120rpx;
  color: #D4A574;
  margin-bottom: 40rpx;
}

.empty-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #3D2914;
  margin-bottom: 16rpx;
}

.empty-desc {
  font-size: 28rpx;
  color: #9B8B7F;
  margin-bottom: 40rpx;
}

.go-shopping {
  padding: 24rpx 80rpx;
  background: #D4A574;
  border-radius: 40rpx;
}

.go-shopping .btn-text {
  font-size: 30rpx;
  color: #FFFFFF;
  font-weight: 500;
}
</style>
