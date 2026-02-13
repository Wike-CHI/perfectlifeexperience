<template>
  <view class="container">
    <!-- 顶部状态栏 -->
    <view class="status-header">
      <view class="status-content">
        <text class="status-title">{{ getStatusText(order.status) }}</text>
        <text class="status-subtitle">{{ getStatusDesc(order.status) }}</text>
      </view>
      <image class="status-image" :src="getStatusIcon(order.status)" mode="aspectFit" />
    </view>

    <!-- 核心内容区 -->
    <view class="content-body">
      <!-- 物流追踪 (仅在相关状态显示) -->
      <view class="section-card logistics-card" v-if="order.status === 'shipping' || order.status === 'completed'">
        <view class="card-header">
          <text class="card-title">物流动态</text>
          <text class="card-action">查看详情</text>
        </view>
        <view class="logistics-latest">
          <view class="logistics-dot"></view>
          <view class="logistics-info">
            <text class="logistics-status">运输中</text>
            <text class="logistics-desc">包裹正在派送中，请保持电话畅通</text>
            <text class="logistics-time">2024-01-15 14:30</text>
          </view>
        </view>
      </view>

      <!-- 收货地址 -->
      <view class="section-card address-card" v-if="order.address">
        <view class="card-header">
          <text class="card-title">配送信息</text>
        </view>
        <view class="address-details">
          <view class="user-info">
            <text class="user-name">{{ order.address.name }}</text>
            <text class="user-phone">{{ order.address.phone }}</text>
          </view>
          <text class="address-text">{{ order.address.province }} {{ order.address.city }} {{ order.address.district }} {{ order.address.detail }}</text>
        </view>
      </view>

      <!-- 商品清单 -->
      <view class="section-card goods-card">
        <view class="card-header">
          <text class="card-title">购物清单</text>
          <text class="goods-count">共 {{ order.products?.length || 0 }} 件</text>
        </view>
        <view class="goods-list">
          <view class="goods-item" v-for="(item, index) in order.products" :key="index">
            <image class="goods-img" :src="item.image" mode="aspectFill" />
            <view class="goods-meta">
              <text class="goods-name">{{ item.name }}</text>
              <view class="goods-price-row">
                <text class="goods-quantity">x{{ item.quantity }}</text>
                <text class="goods-price">¥{{ formatPrice(item.price) }}</text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 订单概览 -->
      <view class="section-card summary-card">
        <view class="summary-row">
          <text class="summary-label">订单编号</text>
          <text class="summary-value copyable">{{ order.orderNo }}</text>
        </view>
        <view class="summary-row">
          <text class="summary-label">下单时间</text>
          <text class="summary-value">{{ formatTime(order.createTime) }}</text>
        </view>
        <view class="summary-row" v-if="order.payTime">
          <text class="summary-label">支付时间</text>
          <text class="summary-value">{{ formatTime(order.payTime) }}</text>
        </view>
        <view class="divider"></view>
        <view class="summary-row">
          <text class="summary-label">商品总额</text>
          <text class="summary-value">¥{{ formatPrice(order.totalAmount || 0) }}</text>
        </view>
        <view class="summary-row">
          <text class="summary-label">运费</text>
          <text class="summary-value">¥0.00</text>
        </view>
        <view class="summary-row total-row">
          <text class="total-label">实付金额</text>
          <text class="total-value">¥{{ formatPrice(order.totalAmount || 0) }}</text>
        </view>
      </view>
    </view>

    <!-- 底部操作栏 -->
    <view class="action-bar-placeholder"></view>
    <view class="action-bar" v-if="order.status !== 'cancelled'">
      <view class="action-btn secondary" v-if="order.status === 'pending'" @click="cancelOrder">取消订单</view>
      <view class="action-btn primary" v-if="order.status === 'pending'" @click="payOrder">立即支付</view>
      <view class="action-btn primary" v-if="order.status === 'shipping'" @click="confirmReceive">确认收货</view>
      <view class="action-btn secondary" v-if="order.status === 'completed'" @click="buyAgain">再次购买</view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { getOrderDetail, updateOrderStatus, cancelOrder as apiCancelOrder, formatPrice, callFunction } from '@/utils/api';
import type { Order } from '@/types';

// 数据
const order = ref<Partial<Order>>({
  orderNo: '',
  products: [],
  totalAmount: 0,
  status: 'pending',
  createTime: new Date()
});

// 获取状态图标 (使用 SVG 资源)
const getStatusIcon = (status?: string) => {
  const iconMap: Record<string, string> = {
    pending: '/static/icons/order-pay.svg',
    paid: '/static/icons/order-ship.svg',
    shipping: '/static/icons/order-receive.svg',
    completed: '/static/icons/order-done.svg',
    cancelled: '/static/icons/order-done.svg'
  };
  return iconMap[status || 'pending'];
};

// 获取状态文本
const getStatusText = (status?: string) => {
  const statusMap: Record<string, string> = {
    pending: '等待付款',
    paid: '等待发货',
    shipping: '运输途中',
    completed: '订单完成',
    cancelled: '已取消'
  };
  return statusMap[status || 'pending'];
};

// 获取状态描述
const getStatusDesc = (status?: string) => {
  const descMap: Record<string, string> = {
    pending: '剩23分59秒自动关闭',
    paid: '商家正在打包您的商品',
    shipping: '您的包裹正在飞奔向您',
    completed: '感谢您的信任与支持',
    cancelled: '期待下次为您服务'
  };
  return descMap[status || 'pending'];
};

// 格式化时间
const formatTime = (time?: Date) => {
  if (!time) return '';
  const date = new Date(time);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
};

// 加载订单详情
const loadOrderDetail = async (id: string) => {
  try {
    uni.showLoading({ title: '加载中' });
    const res = await getOrderDetail(id);
    order.value = res;
    uni.hideLoading();
  } catch (error) {
    uni.hideLoading();
    uni.showToast({
      title: '加载失败',
      icon: 'none'
    });
  }
};

// 取消订单
const cancelOrder = () => {
  uni.showModal({
    title: '提示',
    content: '确定要取消这个订单吗？',
    success: async (res) => {
      if (res.confirm) {
        try {
          await apiCancelOrder(order.value._id!);
          uni.showToast({
            title: '已取消',
            icon: 'success'
          });
          loadOrderDetail(order.value._id!);
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

// 支付订单 - 接入真实微信支付
const payOrder = async () => {
  try {
    uni.showLoading({ title: '正在创建支付...' });

    // 调用微信支付云函数
    const result = await callFunction('wechatpay', {
      action: 'createPayment',
      data: {
        orderId: order.value._id,
        openid: order.value._openid || uni.getStorageSync('openid')
      }
    });

    uni.hideLoading();

    if (result.code === 0 && result.data?.payParams) {
      // 调起微信支付
      const payParams = result.data.payParams;
      uni.requestPayment({
        provider: 'wxpay',
        orderInfo: '', // UniApp requires this field but WeChat Pay doesn't use it
        timeStamp: payParams.timeStamp,
        nonceStr: payParams.nonceStr,
        package: payParams.package,
        signType: payParams.signType as 'MD5' | 'RSA',
        paySign: payParams.paySign,
        success: () => {
          uni.showToast({
            title: '支付成功',
            icon: 'success'
          });
          // 刷新订单详情
          loadOrderDetail(order.value._id!);
        },
        fail: (err: any) => {
          if (err.errMsg?.includes('cancel')) {
            uni.showToast({
              title: '已取消支付',
              icon: 'none'
            });
          } else {
            uni.showToast({
              title: '支付失败',
              icon: 'none'
            });
          }
        }
      } as any);
    } else {
      // 微信支付创建失败，显示错误信息
      const errorMsg = result.msg || '创建支付失败';
      uni.showModal({
        title: '支付失败',
        content: errorMsg,
        showCancel: false
      });
    }
  } catch (error: any) {
    uni.hideLoading();
    console.error('支付失败:', error);
    uni.showModal({
      title: '支付失败',
      content: error.message || '请稍后重试',
      showCancel: false
    });
  }
};

// 确认收货
const confirmReceive = () => {
  uni.showModal({
    title: '提示',
    content: '确认已收到商品？',
    success: async (res) => {
      if (res.confirm) {
        try {
          await updateOrderStatus(order.value._id!, 'completed');
          uni.showToast({
            title: '确认成功',
            icon: 'success'
          });
          loadOrderDetail(order.value._id!);
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
const buyAgain = () => {
  uni.switchTab({
    url: '/pages/index/index'
  });
};

// 生命周期
onLoad((options) => {
  if (options?.id) {
    loadOrderDetail(options.id);
  }
});
</script>

<style scoped>
/* Design System Variables */
.container {
  --color-bg: #FAFAFA;
  --color-text-primary: #1A1A1A;
  --color-text-secondary: #666666;
  --color-text-tertiary: #999999;
  --color-accent: #D9480F;
  --color-white: #FFFFFF;
  --spacing-base: 32rpx;
  --radius-base: 0; /* Sharp corners for Magazine style, or minimal radius */
  
  min-height: 100vh;
  background-color: var(--color-bg);
  padding-bottom: calc(120rpx + constant(safe-area-inset-bottom));
  padding-bottom: calc(120rpx + env(safe-area-inset-bottom));
}

/* Status Header */
.status-header {
  padding: 80rpx var(--spacing-base) 60rpx;
  background-color: var(--color-white);
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: relative;
  overflow: hidden;
}

.status-content {
  z-index: 1;
}

.status-title {
  display: block;
  font-size: 56rpx;
  font-weight: 800;
  color: var(--color-text-primary);
  margin-bottom: 16rpx;
  letter-spacing: -1rpx;
}

.status-subtitle {
  font-size: 28rpx;
  color: var(--color-text-secondary);
  font-weight: 500;
}

.status-image {
  width: 160rpx;
  height: 160rpx;
  opacity: 0.9;
}

/* Content Body */
.content-body {
  padding: var(--spacing-base);
  display: flex;
  flex-direction: column;
  gap: 40rpx;
}

/* Cards General */
.section-card {
  background: transparent;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24rpx;
  padding-bottom: 16rpx;
  border-bottom: 2rpx solid #EAEAEA;
}

.card-title {
  font-size: 28rpx;
  font-weight: 700;
  color: var(--color-text-primary);
  text-transform: uppercase;
  letter-spacing: 2rpx;
}

.card-action {
  font-size: 24rpx;
  color: var(--color-accent);
}

/* Logistics */
.logistics-latest {
  display: flex;
  gap: 24rpx;
  padding: 24rpx 0;
}

.logistics-dot {
  width: 16rpx;
  height: 16rpx;
  background-color: var(--color-accent);
  border-radius: 50%;
  margin-top: 12rpx;
  position: relative;
}

.logistics-dot::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 32rpx;
  height: 32rpx;
  border: 1px solid var(--color-accent);
  border-radius: 50%;
  opacity: 0.3;
}

.logistics-info {
  flex: 1;
}

.logistics-status {
  display: block;
  font-size: 30rpx;
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: 8rpx;
}

.logistics-desc {
  display: block;
  font-size: 26rpx;
  color: var(--color-text-secondary);
  line-height: 1.5;
  margin-bottom: 12rpx;
}

.logistics-time {
  font-size: 24rpx;
  color: var(--color-text-tertiary);
  font-family: monospace;
}

/* Address */
.address-details {
  padding: 10rpx 0;
}

.user-info {
  margin-bottom: 12rpx;
}

.user-name {
  font-size: 34rpx;
  font-weight: 700;
  color: var(--color-text-primary);
  margin-right: 20rpx;
}

.user-phone {
  font-size: 30rpx;
  color: var(--color-text-secondary);
  font-family: monospace;
}

.address-text {
  font-size: 28rpx;
  color: var(--color-text-secondary);
  line-height: 1.6;
}

/* Goods */
.goods-count {
  font-size: 24rpx;
  color: var(--color-text-tertiary);
}

.goods-list {
  display: flex;
  flex-direction: column;
  gap: 32rpx;
}

.goods-item {
  display: flex;
  gap: 24rpx;
}

.goods-img {
  width: 160rpx;
  height: 160rpx;
  background-color: #F0F0F0;
  border-radius: 4rpx;
}

.goods-meta {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 4rpx 0;
}

.goods-name {
  font-size: 30rpx;
  color: var(--color-text-primary);
  line-height: 1.4;
  font-weight: 500;
}

.goods-price-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}

.goods-quantity {
  font-size: 26rpx;
  color: var(--color-text-tertiary);
}

.goods-price {
  font-size: 32rpx;
  font-weight: 600;
  color: var(--color-text-primary);
}

/* Summary */
.summary-card {
  margin-top: 20rpx;
  padding-top: 20rpx;
  border-top: 2rpx solid #EAEAEA;
}

.summary-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 20rpx;
}

.summary-label {
  font-size: 26rpx;
  color: var(--color-text-secondary);
}

.summary-value {
  font-size: 26rpx;
  color: var(--color-text-primary);
  font-family: monospace;
}

.divider {
  height: 2rpx;
  background-color: #EAEAEA;
  margin: 20rpx 0;
}

.total-row {
  margin-top: 10rpx;
  align-items: baseline;
}

.total-label {
  font-size: 30rpx;
  font-weight: 700;
  color: var(--color-text-primary);
}

.total-value {
  font-size: 44rpx;
  font-weight: 800;
  color: var(--color-accent);
}

/* Action Bar */
.action-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  padding: 24rpx 32rpx;
  padding-bottom: calc(24rpx + constant(safe-area-inset-bottom));
  padding-bottom: calc(24rpx + env(safe-area-inset-bottom));
  display: flex;
  justify-content: flex-end;
  gap: 24rpx;
  border-top: 1rpx solid rgba(0,0,0,0.05);
  z-index: 100;
}

.action-btn {
  padding: 0 48rpx;
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28rpx;
  font-weight: 600;
  border-radius: 4rpx;
  transition: all 0.2s;
}

.action-btn.secondary {
  background: transparent;
  color: var(--color-text-primary);
  border: 2rpx solid #E0E0E0;
}

.action-btn.primary {
  background: var(--color-text-primary);
  color: var(--color-white);
  border: 2rpx solid var(--color-text-primary);
}

.action-btn:active {
  opacity: 0.8;
  transform: scale(0.98);
}
</style>
