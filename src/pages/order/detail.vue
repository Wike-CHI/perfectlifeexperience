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

      <!-- 退款信息 (仅在退款相关状态显示) -->
      <view class="section-card refund-card" v-if="order.status === 'refunding' || order.status === 'refunded'">
        <view class="card-header">
          <text class="card-title">退款信息</text>
          <text class="refund-status-tag" :class="`status-${refundInfo?.refundStatus}`">
            {{ getRefundStatusText(refundInfo?.refundStatus) }}
          </text>
        </view>
        <view class="refund-info" v-if="refundInfo">
          <view class="refund-row">
            <text class="refund-label">退款类型</text>
            <text class="refund-value">{{ getRefundTypeText(refundInfo.refundType) }}</text>
          </view>
          <view class="refund-row">
            <text class="refund-label">退款金额</text>
            <text class="refund-value refund-amount">¥{{ formatPrice(refundInfo.refundAmount) }}</text>
          </view>
          <view class="refund-row">
            <text class="refund-label">退款原因</text>
            <text class="refund-value">{{ refundInfo.refundReason || '用户申请退款' }}</text>
          </view>
          <view class="refund-row" v-if="refundInfo.rejectReason">
            <text class="refund-label">拒绝原因</text>
            <text class="refund-value refund-reject">{{ refundInfo.rejectReason }}</text>
          </view>
          <view class="refund-row" v-if="refundInfo.refundNo">
            <text class="refund-label">退款单号</text>
            <text class="refund-value">{{ refundInfo.refundNo }}</text>
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
          <text class="goods-count" v-if="order.status === 'refunding' || order.status === 'refunded'">
            退款金额: ¥{{ formatPrice(refundInfo?.refundAmount || order.totalAmount) }}
          </text>
          <text class="goods-count" v-else>共 {{ order.products?.length || 0 }} 件</text>
        </view>
        <view class="goods-list">
          <view class="goods-item" v-for="(item, index) in order.products" :key="item.productId || index"
            :class="{ 'is-refund': order.status === 'refunding' || order.status === 'refunded' }">
            <!-- 退款标识 -->
            <view class="refund-badge" v-if="order.status === 'refunding' || order.status === 'refunded'">
              <text class="refund-icon">↩</text>
              <text class="refund-text">退款商品</text>
            </view>

            <image class="goods-img" :src="item.image" mode="aspectFill" />
            <view class="goods-meta">
              <text class="goods-name">{{ item.name }}</text>
              <!-- 商品规格 -->
              <text class="goods-specs" v-if="item.specs">{{ item.specs }}</text>

              <!-- 非退款状态 -->
              <view class="goods-price-row" v-if="order.status !== 'refunding' && order.status !== 'refunded'">
                <text class="goods-quantity">x{{ item.quantity }}</text>
                <text class="goods-price">¥{{ formatPrice(item.price) }}</text>
              </view>

              <!-- 退款中状态 - 美化版 -->
              <view class="refund-details" v-else>
                <view class="refund-row">
                  <text class="refund-label">退款数量</text>
                  <text class="refund-value highlight">x{{ getRefundQuantity(item.productId) }}</text>
                </view>
                <view class="refund-row">
                  <text class="refund-label">单价</text>
                  <text class="refund-value">¥{{ formatPrice(item.price) }}</text>
                </view>
                <view class="refund-row subtotal">
                  <text class="refund-label">小计</text>
                  <text class="refund-value money">¥{{ formatPrice(item.price * getRefundQuantity(item.productId)) }}</text>
                </view>
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
      <view class="action-btn secondary" v-if="order.status === 'refunding' && refundInfo?.refundStatus === 'pending'" @click="handleCancelRefund">取消退款</view>
      <view class="action-btn secondary refund-btn" v-if="canApplyRefund" @click="applyRefund">申请退款</view>
    </view>

    <!-- 支付方式选择弹窗 -->
    <view class="payment-popup" v-if="showPaymentPicker" @click="showPaymentPicker = false">
      <view class="popup-mask"></view>
      <view class="popup-content" @click.stop>
        <view class="popup-header">
          <text class="popup-title">选择支付方式</text>
          <image class="popup-close" src="/static/icons/icon-close.svg" mode="aspectFit" @click="showPaymentPicker = false" />
        </view>
        <view class="popup-body">
          <view class="payment-item" @click="selectPaymentMethod('wechat')" :class="{ active: paymentMethod === 'wechat' }">
            <view class="payment-left">
              <view class="payment-tag wechat-tag">微信</view>
              <text class="payment-name">微信支付</text>
            </view>
            <view class="check-circle" :class="{ checked: paymentMethod === 'wechat' }">
              <view class="check-dot" v-if="paymentMethod === 'wechat'"></view>
            </view>
          </view>
          <view class="payment-item" @click="selectPaymentMethod('balance')" :class="{ active: paymentMethod === 'balance', disabled: !isBalanceSufficient }">
            <view class="payment-left">
              <view class="payment-tag balance-tag">余额</view>
              <view class="payment-info">
                <text class="payment-name">余额支付</text>
                <text class="balance-amount" v-if="!balanceLoading">
                  可用: ¥{{ formatPrice(walletBalance) }}
                </text>
                <text class="balance-tip" v-if="!isBalanceSufficient">
                  不足 ¥{{ formatPrice((order.totalAmount || 0) - walletBalance) }}
                </text>
              </view>
            </view>
            <view class="check-circle" :class="{ checked: paymentMethod === 'balance' }">
              <view class="check-dot" v-if="paymentMethod === 'balance'"></view>
            </view>
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
import { getOrderDetail, updateOrderStatus, cancelOrder as apiCancelOrder, formatPrice, getWalletBalance, cancelRefund, callFunction } from '@/utils/api';
import { getCachedOpenid } from '@/utils/cloudbase';
import { getDetailThumbnail } from '@/utils/image';

// 类型定义（内联，避免分包导入问题）
interface Order {
  _id: string
  orderNo: string
  products?: Array<{
    name: string
    price: number
    quantity: number
    image: string
  }>
  items?: Array<{
    productId?: string
    productName?: string
    name?: string
    price: number
    quantity: number
    productImage?: string
    image?: string
  }>
  totalAmount: number
  status: 'pending' | 'paid' | 'shipping' | 'completed' | 'cancelled' | 'refunding' | 'refunded'
  address?: {
    name: string
    phone: string
    province: string
    city: string
    district: string
    detail: string
  }
  createTime: Date
  payTime?: Date
  _openid?: string
  paymentStatus?: string
}

// 数据
const order = ref<Partial<Order>>({
  orderNo: '',
  products: [],
  items: [],
  totalAmount: 0,
  status: 'pending',
  createTime: new Date()
});

// 退款详情
const refundInfo = ref<any>(null);

// 支付方式选择
const showPaymentPicker = ref(false);
const paymentMethod = ref<'wechat' | 'balance'>('wechat');
const walletBalance = ref(0);
const balanceLoading = ref(false);

// 检查是否可以申请退款
const canApplyRefund = computed(() => {
  return ['paid', 'shipping', 'completed'].includes(order.value.status || '');
});

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
    cancelled: '/static/icons/order-done.svg',
    refunding: '/static/icons/order-refund.svg',
    refunded: '/static/icons/order-refund.svg'
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
    cancelled: '已取消',
    refunding: '退款中',
    refunded: '已退款'
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
    cancelled: '期待下次为您服务',
    refunding: '退款申请正在处理中',
    refunded: '退款已完成'
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

    // 如果订单是退款中或已退款，加载退款详情
    if (res.status === 'refunding' || res.status === 'refunded') {
      await loadRefundDetail(id);
    }

    uni.hideLoading();
  } catch (error) {
    uni.hideLoading();
    uni.showToast({
      title: '加载失败',
      icon: 'none'
    });
  }
};

// 加载退款详情
const loadRefundDetail = async (orderId: string) => {
  try {
    const res = await callFunction('order', {
      action: 'getRefundList',
      data: { orderId }
    });
    if (res?.result?.code === 0 && res?.result?.data?.refunds?.length > 0) {
      refundInfo.value = res.result.data.refunds[0];
    }
  } catch (error) {
    console.error('加载退款详情失败:', error);
  }
};

// 获取退款状态文本
const getRefundStatusText = (status?: string) => {
  const statusMap: Record<string, string> = {
    pending: '待审核',
    approved: '已同意',
    waiting_receive: '待收货',
    processing: '退款中',
    completed: '已完成',
    rejected: '已拒绝',
    cancelled: '已取消'
  };
  return statusMap[status || 'pending'] || '未知';
};

// 获取退款类型文本
const getRefundTypeText = (type?: string) => {
  const typeMap: Record<string, string> = {
    only_refund: '仅退款',
    return_refund: '退货退款'
  };
  return typeMap[type || 'only_refund'] || '仅退款';
};

// 获取退款商品数量
const getRefundQuantity = (productId?: string) => {
  if (!refundInfo?.products || !productId) {
    return 1;
  }
  const product = refundInfo.products.find((p: any) => p.productId === productId);
  return product?.refundQuantity || 1;
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

    // 云函数返回格式: { code: 0, msg: '...', data: { prepayId, payParams, orderNo } }
    console.log('[支付调试] callFunction 返回:', result);

    // 检查支付创建是否成功
    if (result.code === 0 && result.data?.payParams) {
      // 调起微信支付
      const payParams = result.data.payParams;
      console.log('[支付调试] 调起微信支付，参数:', payParams);
      uni.requestPayment({
        provider: 'wxpay',
        orderInfo: '', // UniApp requires this field but WeChat Pay doesn't use it
        timeStamp: payParams.timeStamp,
        nonceStr: payParams.nonceStr,
        package: payParams.package,
        signType: payParams.signType as 'MD5' | 'RSA',
        paySign: payParams.paySign,
        success: async () => {
          uni.showToast({
            title: '支付成功',
            icon: 'success'
          });

          // 主动查询订单状态，确保订单状态已更新
          // 轮询最多5次，每次间隔1秒
          let isPaid = false;
          for (let i = 0; i < 5; i++) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            try {
              const orderRes = await getOrderDetail(order.value._id!);
              if (orderRes && (orderRes.paymentStatus === 'paid' || orderRes.status === 'paid')) {
                isPaid = true;
                console.log('[支付调试] 订单状态已更新为已支付');
                break;
              }
            } catch (e) {
              console.warn('[支付调试] 查询订单状态失败:', e);
            }
          }

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

// 申请退款
const applyRefund = () => {
  // 序列化订单数据，传递给退款页面
  const orderData = encodeURIComponent(JSON.stringify(order.value));
  uni.navigateTo({
    url: `/pages/order/refund-apply?orderId=${order.value._id}&orderData=${orderData}`
  });
};

// 取消退款
const handleCancelRefund = () => {
  if (!refundInfo.value?._id) {
    uni.showToast({
      title: '退款记录不存在',
      icon: 'none'
    });
    return;
  }

  uni.showModal({
    title: '提示',
    content: '确定要取消退款申请吗？',
    success: async (res) => {
      if (res.confirm) {
        try {
          await cancelRefund(refundInfo.value._id);
          uni.showToast({
            title: '已取消退款',
            icon: 'success'
          });
          // 刷新订单详情
          loadOrderDetail(order.value._id!);
          refundInfo.value = null;
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

/* Refund Info */
.refund-card {
  background: #FFFFFF;
  border-radius: 16rpx;
  padding: 30rpx;
}

.refund-status-tag {
  display: inline-block;
  padding: 4rpx 16rpx;
  border-radius: 20rpx;
  font-size: 24rpx;
  font-weight: 500;
}

.refund-status-tag.status-pending {
  background: #FFF8E1;
  color: #F57C00;
}

.refund-status-tag.status-approved {
  background: #E8F5E9;
  color: #4CAF50;
}

.refund-status-tag.status-processing {
  background: #E3F2FD;
  color: #1976D2;
}

.refund-status-tag.status-completed {
  background: #E8F5E9;
  color: #4CAF50;
}

.refund-status-tag.status-rejected {
  background: #FFEBEE;
  color: #F44336;
}

.refund-status-tag.status-cancelled {
  background: #F5F5F5;
  color: #9E9E9E;
}

.refund-info {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.refund-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.refund-label {
  font-size: 26rpx;
  color: #999999;
  flex-shrink: 0;
  width: 140rpx;
}

.refund-value {
  font-size: 26rpx;
  color: #333333;
  flex: 1;
  text-align: right;
}

.refund-amount {
  font-size: 32rpx;
  font-weight: 600;
  color: #D9480F;
}

.refund-reject {
  color: #F44336;
}

.refund-tag {
  font-size: 20rpx;
  color: #FF9800;
  margin-left: 8rpx;
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
  position: relative;
  padding: 20rpx;
  margin: -20rpx;
  margin-bottom: 0;
  border-radius: 12rpx;
  transition: all 0.3s ease;
}

/* 退款商品特殊样式 */
.goods-item.is-refund {
  background: linear-gradient(135deg, #FFF7E6 0%, #FFF0D5 100%);
  border: 2rpx solid #FFE4B5;
  margin-bottom: 16rpx;
}

/* 退款标识 */
.refund-badge {
  position: absolute;
  top: 12rpx;
  right: 12rpx;
  display: flex;
  align-items: center;
  gap: 4rpx;
  background: linear-gradient(135deg, #FF9800 0%, #F57C00 100%);
  padding: 6rpx 12rpx;
  border-radius: 20rpx;
  box-shadow: 0 4rpx 8rpx rgba(255, 152, 0, 0.3);
}

.refund-icon {
  font-size: 20rpx;
  color: #FFFFFF;
}

.refund-text {
  font-size: 20rpx;
  color: #FFFFFF;
  font-weight: 600;
}

/* 退款详情面板 */
.refund-details {
  background: rgba(255, 255, 255, 0.8);
  border-radius: 12rpx;
  padding: 16rpx;
  margin-top: 12rpx;
  border: 1rpx solid #FFE4B5;
}

.refund-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8rpx 0;
}

.refund-row:not(:last-child) {
  border-bottom: 1rpx dashed #FFE4B5;
}

.refund-row.subtotal {
  padding-top: 12rpx;
  margin-top: 4rpx;
  border-top: 2rpx solid #FFE4B5;
  border-bottom: none;
}

.refund-label {
  font-size: 24rpx;
  color: #999999;
}

.refund-value {
  font-size: 26rpx;
  color: #666666;
}

.refund-value.highlight {
  color: #FF9800;
  font-weight: 600;
  font-size: 28rpx;
}

.refund-value.money {
  color: #E64A19;
  font-size: 32rpx;
  font-weight: 700;
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

.goods-specs {
  font-size: 24rpx;
  color: #999999;
  margin-bottom: 8rpx;
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
  width: 32rpx;
  height: 32rpx;
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
  gap: 16rpx;
}

.payment-tag {
  padding: 6rpx 16rpx;
  border-radius: 8rpx;
  font-size: 22rpx;
  font-weight: 600;
  flex-shrink: 0;
}

.wechat-tag {
  background: #09BB07;
  color: #FFFFFF;
}

.balance-tag {
  background: #D4A574;
  color: #FFFFFF;
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

.check-circle {
  width: 36rpx;
  height: 36rpx;
  border: 2rpx solid #E0E0E0;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.check-circle.checked {
  border-color: #D4A574;
  background: #D4A574;
}

.check-dot {
  width: 16rpx;
  height: 16rpx;
  background: #FFFFFF;
  border-radius: 50%;
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
