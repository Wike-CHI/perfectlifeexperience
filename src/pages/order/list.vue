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
            <image class="tab-icon" src="/static/icons/icon-order.svg" mode="aspectFit" />
            <text class="tab-text">全部</text>
          </view>
          <view
            class="tab-item"
            :class="{ active: currentStatus === 'pending' }"
            @click="switchStatus('pending')"
          >
            <image class="tab-icon" src="/static/icons/order-pay.svg" mode="aspectFit" />
            <text class="tab-text">待付款</text>
            <text v-if="statusCount.pending > 0" class="badge">{{ statusCount.pending }}</text>
          </view>
          <view
            class="tab-item"
            :class="{ active: currentStatus === 'paid' }"
            @click="switchStatus('paid')"
          >
            <image class="tab-icon" src="/static/icons/order-ship.svg" mode="aspectFit" />
            <text class="tab-text">待发货</text>
            <text v-if="statusCount.paid > 0" class="badge">{{ statusCount.paid }}</text>
          </view>
          <view
            class="tab-item"
            :class="{ active: currentStatus === 'shipping' }"
            @click="switchStatus('shipping')"
          >
            <image class="tab-icon" src="/static/icons/order-receive.svg" mode="aspectFit" />
            <text class="tab-text">待收货</text>
            <text v-if="statusCount.shipping > 0" class="badge">{{ statusCount.shipping }}</text>
          </view>
          <view
            class="tab-item"
            :class="{ active: currentStatus === 'completed' }"
            @click="switchStatus('completed')"
          >
            <image class="tab-icon" src="/static/icons/order-done.svg" mode="aspectFit" />
            <text class="tab-text">已完成</text>
          </view>
          <view
            class="tab-item"
            :class="{ active: currentStatus === 'refunding' }"
            @click="switchStatus('refunding')"
          >
            <image class="tab-icon" src="/static/icons/order-refund.svg" mode="aspectFit" />
            <text class="tab-text">退款中</text>
            <text v-if="statusCount.refunding > 0" class="badge">{{ statusCount.refunding }}</text>
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
          <view class="order-status-badge" :style="{ backgroundColor: getStatusBgColor(order.status) }">
            <image class="status-icon" :src="getStatusIcon(order.status)" mode="aspectFit" />
            <text
              class="order-status"
              :style="{ color: getStatusColor(order.status) }"
            >
              {{ getStatusText(order.status) }}
            </text>
          </view>
        </view>

        <!-- 商品列表 -->
        <view class="order-goods" @click="goToDetail(order)">
          <view class="goods-item" v-for="(item, idx) in order.products" :key="item.productId || idx">
            <image class="goods-image" :src="item.image" mode="aspectFill" lazy-load />
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
          <view class="btn-default" v-if="order.status === 'refunding'" @click="viewRefundDetail(order)">
            <text class="btn-text">查看退款</text>
          </view>
          <view class="btn-primary" v-if="order.status === 'refunding'" @click="handleCancelRefund(order)">
            <text class="btn-text">取消退款</text>
          </view>
        </view>
      </view>

      <!-- 加载状态 -->
      <view class="load-more">
        <view v-if="loading" class="loading">
          <text class="load-text">加载中...</text>
        </view>
        <view v-else-if="!hasMore" class="no-more">
          <text class="no-more-text">已加载全部订单</text>
        </view>
        <view v-else class="has-more" @click="loadMore">
          <text class="load-more-text">已加载 {{ orders.length }} 条订单</text>
        </view>
      </view>
    </scroll-view>

    <!-- 空状态 -->
    <view class="empty-state" v-else>
      <image class="empty-icon" src="/static/icons/empty-order.svg" mode="aspectFit" />
      <text class="empty-title">暂无订单</text>
      <text class="empty-desc">快去选购心仪的精酿啤酒吧</text>
      <view class="go-shopping" @click="goToHome">
        <text class="btn-text">去逛逛</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { getOrders, updateOrderStatus, cancelOrder as apiCancelOrder, cancelRefund, callFunction, getWalletBalance } from '@/utils/api';
import { formatPrice as fp } from '@/utils/format';
import { getListThumbnail } from '@/utils/image';
import { ORDER_STATUS_TEXTS, ORDER_STATUS_COLORS, PAGINATION_CONFIG } from '@/constants/order';
import type { OrderDB, OrderStatus } from '@/types/database';
import { isFeatureEnabled } from '@/config/featureFlags';
import { ORDER_PAGINATION_CONFIG, CACHE_KEYS } from '@/config/performance';

// 使用数据库类型定义
type Order = OrderDB;

// 数据
const orders = ref<Order[]>([]);
const currentStatus = ref('all');
const loading = ref(false);
const hasMore = ref(true);
const page = ref(1);
const pageSize = ref(ORDER_PAGINATION_CONFIG.pageSize);
const error = ref<string | null>(null);
const retryAttempted = ref(false);

// 状态计数
const statusCount = ref({
  pending: 0,
  paid: 0,
  shipping: 0,
  completed: 0,
  refunding: 0
});

// 获取状态文本（使用常量）
const getStatusText = (status: OrderStatus | string) => {
  return ORDER_STATUS_TEXTS[status as keyof typeof ORDER_STATUS_TEXTS] || status;
};

// 获取状态颜色（使用常量）
const getStatusColor = (status: OrderStatus | string) => {
  return ORDER_STATUS_COLORS[status as keyof typeof ORDER_STATUS_COLORS] || '#6B5B4F';
};

// 获取状态背景颜色
const getStatusBgColor = (status: OrderStatus | string) => {
  const bgMap: Record<string, string> = {
    pending: 'rgba(255, 152, 0, 0.1)',
    paid: 'rgba(33, 150, 243, 0.1)',
    shipping: 'rgba(76, 175, 80, 0.1)',
    completed: 'rgba(158, 158, 158, 0.1)',
    refunding: 'rgba(244, 67, 54, 0.1)',
    refunded: 'rgba(158, 158, 158, 0.1)',
    cancelled: 'rgba(158, 158, 158, 0.1)'
  };
  return bgMap[status as keyof typeof bgMap] || 'rgba(107, 91, 79, 0.1)';
};

// 获取状态图标
const getStatusIcon = (status: OrderStatus | string) => {
  const iconMap: Record<string, string> = {
    pending: '/static/icons/order-pay.svg',
    paid: '/static/icons/order-ship.svg',
    shipping: '/static/icons/order-receive.svg',
    completed: '/static/icons/order-done.svg',
    cancelled: '/static/icons/icon-close.svg',
    refunding: '/static/icons/order-refund.svg',
    refunded: '/static/icons/order-refund.svg'
  };
  return iconMap[status as keyof typeof iconMap] || '/static/icons/order-pay.svg';
};

// 获取商品总数
const getTotalQuantity = (order: Order) => {
  const products = order.products || [];
  return products.reduce((total, item) => total + item.quantity, 0);
};

// 加载订单列表
const loadOrders = async (isRefresh = false) => {
  // 检查功能开关
  if (!isFeatureEnabled('ORDER_PAGINATION')) {
    // 降级：使用原有全量加载逻辑
    return loadAllOrders();
  }

  if (loading.value) return;

  // 尝试读取缓存（仅首次加载）
  if (!isRefresh && page.value === 1) {
    const cached = getCachedOrders();
    if (cached && cached.length > 0) {
      orders.value = cached;
      // 后台静默刷新
      refreshOrdersInBackground();
      return;
    }
  }

  try {
    loading.value = true;
    error.value = null;

    if (isRefresh) {
      page.value = 1;
      orders.value = [];
      hasMore.value = true;
    }

    // 调用云函数
    const result = await callFunction('order', {
      action: 'getOrders',
      data: {
        status: currentStatus.value === 'all' ? undefined : currentStatus.value,
        page: page.value,
        pageSize: pageSize.value
      }
    });

    if (result.code !== 0) {
      throw new Error(result.msg);
    }

    const { orders: newOrders, hasMore: moreData } = result.data;

    // 计算各状态数量（仅刷新时）
    if (isRefresh) {
      statusCount.value = {
        pending: newOrders.filter(o => o.status === 'pending').length,
        paid: newOrders.filter(o => o.status === 'paid').length,
        shipping: newOrders.filter(o => o.status === 'shipping').length,
        completed: newOrders.filter(o => o.status === 'completed').length,
        refunding: newOrders.filter(o => o.status === 'refunding').length
      };
    }

    // 追加订单列表
    if (isRefresh) {
      orders.value = newOrders;
    } else {
      orders.value.push(...newOrders);
    }

    hasMore.value = moreData;

    // 更新缓存（仅第一页）
    if (page.value === 1 && isRefresh) {
      setCachedOrders(newOrders);
    }

    // 准备下一页
    if (!isRefresh && moreData) {
      page.value++;
    }

  } catch (err: any) {
    console.error('加载订单失败:', err);

    // 错误处理
    if (err.errCode === 'NETWORK_ERROR') {
      error.value = '网络连接失败，请检查网络';
    } else if (err.errCode === 'TIMEOUT' || err.message?.includes('timeout')) {
      error.value = '请求超时，请重试';
      // 超时自动重试一次
      if (!retryAttempted.value) {
        retryAttempted.value = true;
        await loadOrders(isRefresh);
        return;
      }
    } else {
      error.value = err.errMsg || err.message || '加载失败，请重试';
    }

    uni.showToast({
      title: error.value,
      icon: 'none'
    });
  } finally {
    loading.value = false;
    retryAttempted.value = false;
  }
};

/**
 * 读取缓存的订单列表
 */
function getCachedOrders(): Order[] | null {
  try {
    const cached = uni.getStorageSync(CACHE_KEYS.ORDER_LIST);
    if (!cached) return null;

    const { data, timestamp, version } = JSON.parse(cached);

    // 检查缓存版本
    if (version !== '1.0') {
      uni.removeStorageSync(CACHE_KEYS.ORDER_LIST);
      return null;
    }

    // 检查是否过期（5分钟）
    if (Date.now() - timestamp > ORDER_PAGINATION_CONFIG.cacheTTL) {
      uni.removeStorageSync(CACHE_KEYS.ORDER_LIST);
      return null;
    }

    console.log('[Cache] 命中缓存:', cached.length, '条订单');
    return data;
  } catch (err) {
    console.warn('[Cache] 读取缓存失败:', err);
    return null;
  }
}

/**
 * 写入缓存
 */
function setCachedOrders(orderList: Order[]) {
  try {
    const cache = {
      data: orderList,
      timestamp: Date.now(),
      version: '1.0'
    };
    uni.setStorageSync(CACHE_KEYS.ORDER_LIST, JSON.stringify(cache));
    console.log('[Cache] 已缓存', orderList.length, '条订单');
  } catch (err) {
    console.warn('[Cache] 写入缓存失败:', err);
  }
}

/**
 * 后台静默刷新
 */
let backgroundRefreshInProgress = false;

async function refreshOrdersInBackground() {
  if (backgroundRefreshInProgress) {
    return;
  }

  backgroundRefreshInProgress = true;

  try {
    const result = await callFunction('order', {
      action: 'getOrders',
      data: {
        status: currentStatus.value === 'all' ? undefined : currentStatus.value,
        page: 1,
        pageSize: orders.value.length
      }
    });

    if (result.code === 0) {
      const newOrders = result.data.orders;

      // 检查是否有变化
      if (hasOrdersChanged(newOrders, orders.value)) {
        setCachedOrders(newOrders);
        orders.value = newOrders;

        // 更新状态计数
        statusCount.value = {
          pending: newOrders.filter(o => o.status === 'pending').length,
          paid: newOrders.filter(o => o.status === 'paid').length,
          shipping: newOrders.filter(o => o.status === 'shipping').length,
          completed: newOrders.filter(o => o.status === 'completed').length,
          refunding: newOrders.filter(o => o.status === 'refunding').length
        };
      }
    }
  } catch (err) {
    // 后台刷新失败不影响用户当前看到的内容
    console.warn('[Cache] 后台刷新失败:', err);
  } finally {
    backgroundRefreshInProgress = false;
  }
}

/**
 * 检查订单列表是否有变化
 */
function hasOrdersChanged(newOrders: Order[], oldOrders: Order[]): boolean {
  if (newOrders.length !== oldOrders.length) {
    return true;
  }

  const newOrderIds = new Map(newOrders.map(o => [o._id, o.updateTime]));
  const oldOrderIds = new Map(oldOrders.map(o => [o._id, o.updateTime]));

  for (const [id, newTime] of newOrderIds) {
    const oldTime = oldOrderIds.get(id);
    if (!oldTime || newTime !== oldTime) {
      return true;
    }
  }

  return false;
}

/**
 * 降级：加载所有订单（原有逻辑）
 * 当功能开关关闭时使用此方法
 */
async function loadAllOrders() {
  console.warn('[Fallback] 使用全量加载逻辑');

  try {
    const res = await getOrders(currentStatus.value === 'all' ? undefined : currentStatus.value);

    // 全量加载：一次性返回所有订单
    orders.value = res;
    hasMore.value = false; // 全量加载无更多数据
    page.value = 1;

    // 计算各状态数量
    statusCount.value = {
      pending: res.filter(o => o.status === 'pending').length,
      paid: res.filter(o => o.status === 'paid').length,
      shipping: res.filter(o => o.status === 'shipping').length,
      completed: res.filter(o => o.status === 'completed').length,
      refunding: res.filter(o => o.status === 'refunding').length
    };

    uni.showToast({
      title: '已加载全部订单',
      icon: 'success'
    });
  } catch (err: any) {
    console.error('[Fallback] 全量加载失败:', err);
    error.value = err.errMsg || err.message || '加载失败';

    uni.showToast({
      title: error.value,
      icon: 'none'
    });
  }
}

// 加载更多
const loadMore = () => {
  if (!hasMore.value || loading.value) return;

  // 使用新的分页加载逻辑
  if (isFeatureEnabled('ORDER_PAGINATION')) {
    loadOrders(false); // loadOrders 内部会自动增加 page
  } else {
    // 原有逻辑
    page.value++;
    loadOrders();
  }
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
const payOrder = async (order: Order) => {
  const paymentMethod = order.paymentMethod || 'wechat';

  if (paymentMethod === 'balance') {
    // 余额支付
    uni.showModal({
      title: '余额支付',
      content: `支付金额: ¥${fp(order.totalAmount)}，将从余额扣除`,
      success: async (res) => {
        if (res.confirm) {
          try {
            uni.showLoading({ title: '支付中...' });
            const payRes = await callFunction('order', {
              action: 'payWithBalance',
              data: { orderId: order._id }
            });
            uni.hideLoading();

            if (payRes.code === 0) {
              uni.showToast({
                title: '支付成功',
                icon: 'success'
              });
              loadOrders(true);
            } else {
              uni.showToast({
                title: payRes.msg || '支付失败',
                icon: 'none'
              });
            }
          } catch (error) {
            uni.hideLoading();
            uni.showToast({
              title: '支付失败',
              icon: 'none'
            });
          }
        }
      }
    });
  } else {
    // 微信支付
    uni.showModal({
      title: '微信支付',
      content: `支付金额: ¥${fp(order.totalAmount)}`,
      success: async (res) => {
        if (res.confirm) {
          try {
            uni.showLoading({ title: '创建支付...' });

            // 获取 openid
            const userInfo = uni.getStorageSync('userInfo') || {};
            const openid = userInfo.openid;

            if (!openid) {
              uni.hideLoading();
              uni.showToast({
                title: '请先登录',
                icon: 'none'
              });
              return;
            }

            const payRes = await callFunction('wechatpay', {
              action: 'createPayment',
              data: {
                orderId: order._id,
                openid
              }
            });

            uni.hideLoading();

            if (payRes.code === 0 && payRes.data?.payParams) {
              const payParams = payRes.data.payParams;
              uni.requestPayment({
                provider: 'wxpay',
                orderInfo: '',
                timeStamp: payParams.timeStamp,
                nonceStr: payParams.nonceStr,
                package: payParams.package,
                signType: payParams.signType,
                paySign: payParams.paySign,
                success: () => {
                  uni.showToast({
                    title: '支付成功',
                    icon: 'success'
                  });
                  loadOrders(true);
                },
                fail: (err) => {
                  console.error('微信支付失败:', err);
                  uni.showToast({
                    title: '支付取消或失败',
                    icon: 'none'
                  });
                }
              });
            } else {
              uni.showToast({
                title: payRes.msg || '创建支付失败',
                icon: 'none'
              });
            }
          } catch (error) {
            uni.hideLoading();
            console.error('支付失败:', error);
            uni.showToast({
              title: '支付失败',
              icon: 'none'
            });
          }
        }
      }
    });
  }
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

// 取消退款
const handleCancelRefund = (order: Order) => {
  uni.showModal({
    title: '提示',
    content: '确定要取消退款申请吗？',
    success: async (res) => {
      if (res.confirm) {
        try {
          // 先获取退款记录ID
          const res = await callFunction('order', {
            action: 'getRefundList',
            data: { status: 'pending' }
          });
          const refunds = res?.result?.data?.refunds || [];
          const refund = refunds.find((r: any) => r.orderId === order._id);

          if (refund) {
            await cancelRefund(refund._id);
            uni.showToast({
              title: '已取消退款',
              icon: 'success'
            });
            loadOrders(true);
          } else {
            uni.showToast({
              title: '退款记录不存在',
              icon: 'none'
            });
          }
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

// 查看退款详情
const viewRefundDetail = (order: Order) => {
  uni.navigateTo({
    url: `/pages/order/refund-list?orderId=${order._id}`
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
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 0 24rpx;
  height: 100%;
  gap: 4rpx;
}

.tab-icon {
  width: 36rpx;
  height: 36rpx;
  opacity: 0.6;
  transition: opacity 0.3s;
}

.tab-item.active .tab-icon {
  opacity: 1;
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
  font-size: 24rpx;
  color: #6B5B4F;
  white-space: nowrap;
}

.tab-item.active .tab-text {
  color: #3D2914;
  font-weight: 600;
}

.badge {
  position: absolute;
  top: 8rpx;
  right: 12rpx;
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
  z-index: 1;
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

.order-status-badge {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 8rpx 16rpx;
  border-radius: 20rpx;
}

.status-icon {
  width: 28rpx;
  height: 28rpx;
  margin-right: 8rpx;
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
  width: 160rpx;
  height: 160rpx;
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
