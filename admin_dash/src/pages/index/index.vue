<template>
  <view class="admin-welcome">
    <view class="welcome-container">
      <view class="logo-section">
        <image class="logo" src="/static/logo.png" mode="aspectFit" />
        <text class="title">大友元气精酿啤酒</text>
        <text class="subtitle">后台管理系统</text>
      </view>

      <view class="action-section">
        <button class="action-btn primary" @click="goToAdminLogin">
          <text>管理员登录</text>
        </button>
        <button class="action-btn secondary" @click="goToDashboard">
          <text>进入控制台</text>
        </button>
      </view>

      <view class="info-section">
        <text class="info-text">Powered by CloudBase + UniApp</text>
        <text class="version">v1.0.0</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { onLoad } from '@dcloudio/uni-app';

onLoad(() => {
  console.log('Admin Home Loaded');
});

const goToAdminLogin = () => {
  uni.navigateTo({ url: '/pages/admin/login/index' });
};

const goToDashboard = () => {
  uni.navigateTo({ url: '/pages/dashboard/index' });
};
</script>

<style scoped>
.admin-welcome {
  min-height: 100vh;
  background: linear-gradient(135deg, #1A1A1A 0%, #0D0D0D 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40rpx;
}

.welcome-container {
  width: 100%;
  max-width: 600rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 60rpx;
}

.logo-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24rpx;
}

.logo {
  width: 160rpx;
  height: 160rpx;
  border-radius: 50%;
  background: #FFFFFF;
  padding: 8rpx;
  box-shadow: 0 8px 32px rgba(201, 169, 98, 0.2);
}

.title {
  font-size: 48rpx;
  font-weight: 700;
  color: #C9A962;
  letter-spacing: 2rpx;
  text-align: center;
}

.subtitle {
  font-size: 28rpx;
  color: rgba(245, 245, 240, 0.6);
  letter-spacing: 1rpx;
}

.action-section {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.action-btn {
  width: 100%;
  height: 96rpx;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32rpx;
  font-weight: 600;
  border: none;
  margin: 0;
}

.primary {
  background: linear-gradient(135deg, #C9A962 0%, #B8984A 100%);
  color: #1A1A1A;
  box-shadow: 0 8px 24px rgba(201, 169, 98, 0.3);
}

.primary:active {
  opacity: 0.9;
}

.secondary {
  background: transparent;
  color: #C9A962;
  border: 2rpx solid rgba(201, 169, 98, 0.3);
}

.secondary:active {
  background: rgba(201, 169, 98, 0.1);
}

.info-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
}

.info-text {
  font-size: 24rpx;
  color: rgba(245, 245, 240, 0.4);
}

.version {
  font-size: 22rpx;
  color: rgba(245, 245, 240, 0.3);
}
</style>
