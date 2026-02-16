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

    <!-- 支付方式选择弹窗 -->
    <view class="payment-popup" v-if="showPaymentPicker" @click="showPaymentPicker = false">
      <view class="popup-mask"></view>
      <view class="popup-content" @click.stop>
        <view class="popup-header">
          <text class="popup-title">选择支付方式</text>
          <text class="popup-close" @click="showPaymentPicker = false">&#xe6b1;</text>
        </view>
        <view class="popup-body">
          <view class="payment-item" @click="selectPaymentMethod('wechat')" :class="{ active: paymentMethod === 'wechat' }">
            <view class="payment-left">
              <text class="payment-icon wechat">&#xe6cb;</text>
              <text class="payment-name">微信支付</text>
            </view>
            <text class="check-icon" v-if="paymentMethod === 'wechat'">&#xe6ad;</text>
            <text class="uncheck-circle" v-else></text>
          </view>
          <view class="payment-item" @click="selectPaymentMethod('balance')" :class="{ active: paymentMethod === 'balance', disabled: !isBalanceSufficient }">
            <view class="payment-left">
              <text class="payment-icon balance">&#xe6b8;</text>
              <view class="payment-info">
                <text class="payment-name">余额支付</text>
                <text class="balance-amount" v-if="!balanceLoading">
                  可用余额: ¥{{ formatPrice(walletBalance) }}
                </text>
                <text class="balance-tip" v-if="!isBalanceSufficient">
                  余额不足（还差 ¥{{ formatPrice((order.totalAmount || 0) - walletBalance) }}）
                </text>
              </view>
            </view>
            <text class="check-icon" v-if="paymentMethod === 'balance'">&#xe6ad;</text>
            <text class="uncheck-circle" v-else></text>
          </view>
        </view>
        <view class="popup-footer">
          <view class="confirm-btn" @click="confirmPay">
            <text class="confirm-text">确认支付 ¥{{ formatPrice(order.totalAmount || 0) }}</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { getOrderDetail, updateOrderStatus, cancelOrder as apiCancelOrder, formatPrice, callFunction, getWalletBalance } from '@/utils/api';
import { getCachedOpenid } from '@/utils/cloudbase';
import type { Order } from '@/types';

// 数据
const order = ref<Partial<Order>>({
  orderNo: '',
  products: [],
  totalAmount: 0,
  status: 'pending',
  createTime: new Date()
});

// 支付方式选择
const showPaymentPicker = ref(false);
const paymentMethod = ref<'wechat' | 'balance'>('wechat');
const walletBalance = ref(0);
const balanceLoading = ref(false);

// 检查余额是否充足
const isBalanceSufficient = computed(() => {
  return walletBalance.value >= (order.value.totalAmount || 0);
});

// 获取钱包余额
const loadWalletBalance = async () => {
  try {
    balanceLoading.value = true;
    const res = await getWalletBalance();
    walletBalance.value = res.balance || 0;
  } catch (error) {
    console.error('获取钱包余额失败:', error);
  } finally {
    balanceLoading.value = false;
  }
};

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

// 打开支付方式选择
const openPaymentPicker = async () => {
  await loadWalletBalance();
  showPaymentPicker.value = true;
};

// 选择支付方式
const selectPaymentMethod = (method: 'wechat' | 'balance') => {
  if (method === 'balance' && !isBalanceSufficient.value) {
    uni.showToast({
      title: `余额不足，还差 ¥${formatPrice((order.value.totalAmount || 0) - walletBalance.value)}`,
      icon: 'none'
    });
    return;
  }
  paymentMethod.value = method;
};

// 确认支付
const confirmPay = async () => {
  showPaymentPicker.value = false;
  if (paymentMethod.value === 'balance') {
    await payWithBalance();
  } else {
    await payWithWechat();
  }
};

// 支付订单 - 打开支付方式选择
const payOrder = async () => {
  await openPaymentPicker();
};

// 余额支付
const payWithBalance = async () => {
  try {
    uni.showLoading({ title: '支付中...' });

    const res = await callFunction('order', {
      action: 'payWithBalance',
      data: { orderId: order.value._id }
    });

    uni.hideLoading();

    if (res.code === 0 && res.data?.success !== false) {
      uni.showToast({
        title: '支付成功',
        icon: 'success'
      });
      // 刷新订单详情
      loadOrderDetail(order.value._id!);
    } else {
      const errorMsg = res.data?.message || res.msg || '支付失败';
      uni.showModal({
        title: '支付失败',
        content: errorMsg,
        showCancel: false
      });
    }
  } catch (error: any) {
    uni.hideLoading();
    console.error('余额支付失败:', error);
    uni.showToast({
      title: error.message || '支付失败',
      icon: 'none'
    });
  }
};

// 微信支付
const payWithWechat = async () => {
  try {
    uni.showLoading({ title: '正在创建支付...' });

    // 调用微信支付云函数
    const result = await callFunction('wechatpay', {
      action: 'createPayment',
      data: {
        orderId: order.value._id,
        openid: order.value._openid || getCachedOpenid()
      }
    });

    uni.hideLoading();

    // callFunction 返回格式: { code: 0, msg: 'success', data: 云函数返回值 }
    // 云函数返回值格式: { success: true, data: { payParams: {...} } }
    const wechatpayResult = result.data as { success: boolean; data?: { payParams: any } };
    
    console.log('[支付调试] callFunction 返回:', result);
    console.log('[支付调试] wechatpayResult:', wechatpayResult);

    // 检查支付创建是否成功
    if (wechatpayResult.success === true && wechatpayResult.data?.payParams) {
      // 调起微信支付
      const payParams = wechatpayResult.data.payParams;
      console.log('[支付调试] 调起微信支付，参数:', payParams);
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
      const errorMsg = (wechatpayResult as any).message || result.msg || '创建支付失败';
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

/* 支付方式选择弹窗 */
.payment-popup {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1000;
}

.popup-mask {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
}

.popup-content {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  background: #FFFFFF;
  border-radius: 32rpx 32rpx 0 0;
}

.popup-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 30rpx;
  border-bottom: 1rpx solid #F5F0E8;
}

.popup-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #1A1A1A;
}

.popup-close {
  font-family: "iconfont";
  font-size: 40rpx;
  color: #999;
  padding: 10rpx;
}

.popup-body {
  padding: 30rpx;
}

.payment-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx 20rpx;
  margin-bottom: 20rpx;
  border: 2rpx solid #E0E0E0;
  border-radius: 12rpx;
  transition: all 0.3s;
}

.payment-item.active {
  border-color: #D4A574;
  background: rgba(212, 165, 116, 0.05);
}

.payment-item.disabled {
  opacity: 0.5;
}

.payment-left {
  display: flex;
  align-items: center;
}

.payment-icon {
  font-family: "iconfont";
  font-size: 40rpx;
  margin-right: 20rpx;
}

.payment-icon.wechat {
  color: #09BB07;
}

.payment-icon.balance {
  color: #D4A574;
}

.payment-name {
  font-size: 28rpx;
  color: #1A1A1A;
}

.payment-info {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.balance-amount {
  font-size: 24rpx;
  color: #999;
}

.balance-tip {
  font-size: 24rpx;
  color: #ff4d4f;
}

.uncheck-circle {
  width: 36rpx;
  height: 36rpx;
  border: 2rpx solid #E0E0E0;
  border-radius: 50%;
}

.check-icon {
  font-family: "iconfont";
  font-size: 36rpx;
  color: #D4A574;
}

.popup-footer {
  padding: 20rpx 30rpx;
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
}

.confirm-btn {
  background: #1A1A1A;
  border-radius: 40rpx;
  padding: 24rpx;
  display: flex;
  justify-content: center;
  align-items: center;
}

.confirm-text {
  font-size: 30rpx;
  color: #FFFFFF;
  font-weight: 600;
}
</style>
