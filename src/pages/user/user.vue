<template>
  <view class="container">
    <!-- 用户信息区 -->
    <view class="user-header" @click="handleHeaderClick">
      <view class="user-bg"></view>
      <view class="user-info">
        <image class="user-avatar" :src="userInfo.avatarUrl || '/static/logo.png'" mode="aspectFill" />
        <view class="user-detail">
          <text class="user-name">{{ isLoggedIn ? (userInfo.nickName || '微信用户') : '点击登录' }}</text>
          <view class="user-level" v-if="isLoggedIn">
            <text class="level-badge">VIP会员</text>
            <text v-if="userInfo.nickName === '微信用户'" class="auth-tip">点击更新头像昵称</text>
          </view>
          <view class="user-level" v-else>
            <text class="level-badge login-badge">登录享受更多权益</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 订单入口 -->
    <view class="order-section">
      <view class="section-header" @click="goToOrders">
        <text class="section-title">我的订单</text>
        <view class="header-right">
          <text class="more-text">查看全部</text>
          <image class="arrow-icon" src="/static/icons/arrow-right.svg" mode="aspectFit" />
        </view>
      </view>
      <view class="order-grid">
        <view class="order-item" @click="goToOrders('pending')">
          <view class="order-icon">
            <image class="action-icon" src="/static/icons/order-pay.svg" mode="aspectFit" />
            <text v-if="orderCount.pending > 0" class="badge">{{ orderCount.pending }}</text>
          </view>
          <text class="order-text">待付款</text>
        </view>
        <view class="order-item" @click="goToOrders('paid')">
          <view class="order-icon">
            <image class="action-icon" src="/static/icons/order-ship.svg" mode="aspectFit" />
            <text v-if="orderCount.paid > 0" class="badge">{{ orderCount.paid }}</text>
          </view>
          <text class="order-text">待发货</text>
        </view>
        <view class="order-item" @click="goToOrders('shipping')">
          <view class="order-icon">
            <image class="action-icon" src="/static/icons/order-receive.svg" mode="aspectFit" />
            <text v-if="orderCount.shipping > 0" class="badge">{{ orderCount.shipping }}</text>
          </view>
          <text class="order-text">待收货</text>
        </view>
        <view class="order-item" @click="goToOrders('completed')">
          <view class="order-icon">
            <image class="action-icon" src="/static/icons/order-done.svg" mode="aspectFit" />
          </view>
          <text class="order-text">已完成</text>
        </view>
      </view>
    </view>

    <!-- 钱包入口 -->
    <view class="menu-section">
      <view class="menu-item" @click="goToWallet">
        <view class="menu-left">
          <view class="menu-icon wallet">
            <image class="menu-icon-img" src="/static/icons/menu-wallet.svg" mode="aspectFit" />
          </view>
          <text class="menu-text">我的钱包</text>
        </view>
        <view class="menu-right">
          <text class="balance-text" v-if="isLoggedIn && balance > 0">¥{{ (balance/100).toFixed(2) }}</text>
          <image class="arrow-icon" src="/static/icons/arrow-right.svg" mode="aspectFit" />
        </view>
      </view>
    </view>

    <!-- 推广中心入口 -->
    <view class="menu-section">
      <view class="menu-item" @click="goToPromotion">
        <view class="menu-left">
          <view class="menu-icon promotion">
            <image class="menu-icon-img" src="/static/icons/menu-promotion.svg" mode="aspectFit" />
          </view>
          <text class="menu-text">推广中心</text>
        </view>
        <view class="menu-right">
          <text class="promotion-hint" v-if="isLoggedIn && promotionReward > 0">+{{ (promotionReward/100).toFixed(2) }}</text>
          <image class="arrow-icon" src="/static/icons/arrow-right.svg" mode="aspectFit" />
        </view>
      </view>
    </view>

    <!-- 功能列表 -->
    <view class="menu-section">
      <view class="menu-item" @click="goToAddress">
        <view class="menu-left">
          <view class="menu-icon address">
            <image class="menu-icon-img" src="/static/icons/menu-address.svg" mode="aspectFit" />
          </view>
          <text class="menu-text">收货地址</text>
        </view>
        <image class="arrow-icon" src="/static/icons/arrow-right.svg" mode="aspectFit" />
      </view>
      <view class="menu-item" @click="goToCoupon">
        <view class="menu-left">
          <view class="menu-icon coupon">
            <image class="menu-icon-img" src="/static/icons/menu-coupon.svg" mode="aspectFit" />
          </view>
          <text class="menu-text">优惠券</text>
        </view>
        <image class="arrow-icon" src="/static/icons/arrow-right.svg" mode="aspectFit" />
      </view>
      <view class="menu-item" @click="goToFavorites">
        <view class="menu-left">
          <view class="menu-icon favorite">
            <image class="menu-icon-img" src="/static/icons/menu-favorite.svg" mode="aspectFit" />
          </view>
          <text class="menu-text">我的收藏</text>
        </view>
        <image class="arrow-icon" src="/static/icons/arrow-right.svg" mode="aspectFit" />
      </view>
      <view class="menu-item" @click="contactService">
        <view class="menu-left">
          <view class="menu-icon service">
            <image class="menu-icon-img" src="/static/icons/menu-service.svg" mode="aspectFit" />
          </view>
          <text class="menu-text">联系客服</text>
        </view>
        <image class="arrow-icon" src="/static/icons/arrow-right.svg" mode="aspectFit" />
      </view>
    </view>

    <!-- 设置列表 -->
    <view class="menu-section">
      <view class="menu-item" @click="goToSettings">
        <view class="menu-left">
          <view class="menu-icon settings">
            <image class="menu-icon-img" src="/static/icons/menu-settings.svg" mode="aspectFit" />
          </view>
          <text class="menu-text">设置</text>
        </view>
        <image class="arrow-icon" src="/static/icons/arrow-right.svg" mode="aspectFit" />
      </view>
    </view>

    <!-- 安全区域 -->
    <view class="safe-area"></view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { getUserInfo, getOrders, getWalletBalance, getPromotionInfo, fullLogin } from '@/utils/api';
import { getUserOpenid, checkLogin as checkCloudLogin } from '@/utils/cloudbase';
import type { UserInfo } from '@/types';

// 数据
const userInfo = ref<Partial<UserInfo>>({});
const isLoggedIn = ref(false);
const balance = ref(0);
const promotionReward = ref(0);
const orderCount = ref({
  pending: 0,
  paid: 0,
  shipping: 0,
  completed: 0
});

// 加载用户信息
const loadUserInfo = async () => {
  try {
    const res = await getUserInfo();
    if (res) {
      userInfo.value = res;
      isLoggedIn.value = true;
      // 加载其他数据
      loadOrderCount();
      loadWalletBalance();
      loadPromotionReward();
    } else {
      userInfo.value = {};
      isLoggedIn.value = false;
      // 重置数据
      balance.value = 0;
      promotionReward.value = 0;
      orderCount.value = { pending: 0, paid: 0, shipping: 0, completed: 0 };
    }
  } catch (error) {
    console.error('加载用户信息失败:', error);
    isLoggedIn.value = false;
  }
};

// 点击头部区域
const handleHeaderClick = async () => {
  if (isLoggedIn.value) {
    // 已登录，跳转到个人资料设置页
    uni.navigateTo({
      url: '/pages/settings/account-security'
    });
  } else {
    // 未登录，触发登录
    await handleLogin();
  }
};

// 处理登录
const handleLogin = async () => {
  uni.showLoading({ title: '登录中...' });
  try {
    // 1. 确保云开发登录态有效
    let openid = getUserOpenid();
    if (!openid) {
      openid = await checkCloudLogin();
    }
    
    if (!openid) {
      throw new Error('云服务连接失败');
    }
    
    // 2. 执行完整登录流程（获取头像昵称 + 同步云端）
    const result = await fullLogin(openid);
    
    // 先隐藏 loading，避免与 showToast 冲突
    uni.hideLoading();

    if (result.success) {
      uni.showToast({ title: '登录成功', icon: 'success' });
      // 刷新用户信息
      await loadUserInfo();
    } else {
      throw new Error(result.message);
    }
  } catch (error: any) {
    // 先隐藏 loading
    uni.hideLoading();
    
    console.error('登录失败:', error);
    uni.showToast({ 
      title: error.message || '登录失败', 
      icon: 'none' 
    });
  }
};

// 检查登录拦截
const checkAuth = () => {
  if (!isLoggedIn.value) {
    uni.showModal({
      title: '提示',
      content: '请先登录',
      confirmText: '去登录',
      success: (res) => {
        if (res.confirm) {
          handleLogin();
        }
      }
    });
    return false;
  }
  return true;
};

// 加载钱包余额
const loadWalletBalance = async () => {
  if (!isLoggedIn.value) return;
  try {
    const res = await getWalletBalance();
    balance.value = res.balance || 0;
  } catch (error) {
    console.error('加载余额失败:', error);
  }
};

// 加载订单统计
const loadOrderCount = async () => {
  if (!isLoggedIn.value) return;
  try {
    const orders = await getOrders();
    orderCount.value = {
      pending: orders.filter(o => o.status === 'pending').length,
      paid: orders.filter(o => o.status === 'paid').length,
      shipping: orders.filter(o => o.status === 'shipping').length,
      completed: orders.filter(o => o.status === 'completed').length
    };
  } catch (error) {
    console.error('加载订单统计失败:', error);
  }
};

// 页面跳转
const goToOrders = (status?: string | unknown) => {
  if (!checkAuth()) return;
  const targetStatus = typeof status === 'string' ? status : '';
  uni.navigateTo({
    url: `/pages/order/list${targetStatus ? '?status=' + targetStatus : ''}`
  });
};

const goToAddress = () => {
  if (!checkAuth()) return;
  uni.navigateTo({
    url: '/pages/address/list'
  });
};

const goToCoupon = () => {
  if (!checkAuth()) return;
  uni.navigateTo({
    url: '/pages/coupon/mine'
  });
};

const goToFavorites = () => {
  if (!checkAuth()) return;
  uni.showToast({
    title: '功能开发中',
    icon: 'none'
  });
};

const contactService = () => {
  uni.makePhoneCall({
    phoneNumber: '400-888-8888'
  });
};

const goToSettings = () => {
  // 设置页面不需要强制登录，但里面的部分功能可能需要
  uni.navigateTo({
    url: '/pages/settings/settings'
  });
};

// 生命周期
onShow(() => {
  loadUserInfo();
});

const goToWallet = () => {
  if (!checkAuth()) return;
  uni.navigateTo({
    url: '/pages/wallet/index'
  });
};

const goToPromotion = () => {
  if (!checkAuth()) return;
  uni.navigateTo({
    url: '/pages/promotion/center'
  });
};

// 加载推广收益
const loadPromotionReward = async () => {
  if (!isLoggedIn.value) return;
  try {
    const info = await getPromotionInfo();
    promotionReward.value = info.pendingReward;
  } catch (error) {
    console.error('加载推广收益失败:', error);
  }
};
</script>

<style scoped>
.container {
  min-height: 100vh;
  background-color: #FDF8F3;
  padding-bottom: 40rpx;
}

/* 用户信息区 */
.user-header {
  position: relative;
  padding: 60rpx 30rpx 40rpx;
  overflow: hidden;
}

.user-bg {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 300rpx;
  background: linear-gradient(180deg, #3D2914 0%, #5D3924 100%);
  border-radius: 0 0 40rpx 40rpx;
}

.user-info {
  position: relative;
  display: flex;
  align-items: center;
  z-index: 1;
}

.user-avatar {
  width: 140rpx;
  height: 140rpx;
  border-radius: 50%;
  border: 4rpx solid #D4A574;
  margin-right: 30rpx;
  background-color: #FFFFFF;
}

.user-detail {
  flex: 1;
}

.user-name {
  font-size: 40rpx;
  font-weight: bold;
  color: #FFFFFF;
  display: block;
  margin-bottom: 16rpx;
}

.user-level {
  display: flex;
  align-items: center;
}

.level-badge {
  font-size: 24rpx;
  color: #3D2914;
  background: #D4A574;
  padding: 8rpx 24rpx;
  border-radius: 24rpx;
}

.auth-tip {
  font-size: 20rpx;
  color: #FFFFFF;
  background: rgba(255, 255, 255, 0.2);
  padding: 4rpx 12rpx;
  border-radius: 16rpx;
  margin-left: 12rpx;
}

.login-badge {
  background: rgba(212, 165, 116, 0.3);
  color: #E8DCC8;
  border: 1rpx solid #D4A574;
}

/* 订单入口 */
.order-section {
  background: #FFFFFF;
  margin: 0 20rpx 20rpx;
  padding: 30rpx;
  border-radius: 20rpx;
  box-shadow: 0 4rpx 20rpx rgba(61, 41, 20, 0.08);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30rpx;
}

.section-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #3D2914;
}

.header-right {
  display: flex;
  align-items: center;
}

.more-text {
  font-size: 26rpx;
  color: #9B8B7F;
  margin-right: 8rpx;
}


.order-grid {
  display: flex;
  justify-content: space-around;
}

.order-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.order-icon {
  position: relative;
  width: 80rpx;
  height: 80rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12rpx;
}


.badge {
  position: absolute;
  top: -4rpx;
  right: -4rpx;
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

.order-text {
  font-size: 26rpx;
  color: #6B5B4F;
}

/* 功能列表 */
.menu-section {
  background: #FFFFFF;
  margin: 0 20rpx 20rpx;
  border-radius: 20rpx;
  box-shadow: 0 4rpx 20rpx rgba(61, 41, 20, 0.08);
  overflow: hidden;
}

.menu-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 30rpx;
  border-bottom: 1rpx solid #F5F0E8;
}

.menu-item:last-child {
  border-bottom: none;
}

.menu-left {
  display: flex;
  align-items: center;
}

.menu-icon {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 20rpx;
}

.menu-icon.address {
  background: rgba(212, 165, 116, 0.15);
}

.menu-icon.coupon {
  background: rgba(224, 123, 57, 0.15);
}

.menu-icon.favorite {
  background: rgba(196, 69, 54, 0.15);
}

.menu-icon.service {
  background: rgba(45, 80, 22, 0.15);
}

.menu-icon.settings {
  background: rgba(139, 69, 19, 0.15);
}

.menu-icon.wallet {
  background: rgba(255, 176, 133, 0.15);
}

.menu-icon.promotion {
  background: rgba(212, 165, 116, 0.15);
}

.menu-text {
  font-size: 30rpx;
  color: #3D2914;
}

.menu-right {
  display: flex;
  align-items: center;
}

.balance-text {
  font-size: 28rpx;
  color: #FF9F6D;
  margin-right: 10rpx;
  font-weight: bold;
}

.promotion-hint {
  font-size: 28rpx;
  color: #D4A574;
  margin-right: 10rpx;
  font-weight: bold;
}

/* 菜单图标图片 */
.menu-icon-img {
  width: 32rpx;
  height: 32rpx;
}

/* 订单操作图标 */
.action-icon {
  width: 56rpx;
  height: 56rpx;
  margin-bottom: 8rpx;
}

/* 箭头图标 */
.arrow-icon {
  width: 24rpx;
  height: 24rpx;
  opacity: 0.6;
}

/* 安全区域 */
.safe-area {
  height: constant(safe-area-inset-bottom);
  height: env(safe-area-inset-bottom);
}
</style>
