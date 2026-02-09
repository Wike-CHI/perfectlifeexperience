<template>
  <view class="container">
    <view class="menu-section">
      <view class="menu-item" @click="handleAccount">
        <text class="menu-text">账号与安全</text>
        <text class="arrow">&#xe6a7;</text>
      </view>
      <view class="menu-item">
        <text class="menu-text">消息通知</text>
        <switch :checked="notificationsEnabled" @change="toggleNotifications" color="#D4A574" style="transform:scale(0.8)"/>
      </view>
    </view>

    <view class="menu-section">
      <view class="menu-item" @click="handlePrivacy">
        <text class="menu-text">隐私政策</text>
        <text class="arrow">&#xe6a7;</text>
      </view>
      <view class="menu-item" @click="handleAgreement">
        <text class="menu-text">用户协议</text>
        <text class="arrow">&#xe6a7;</text>
      </view>
      <view class="menu-item" @click="clearCache">
        <text class="menu-text">清除缓存</text>
        <text class="menu-desc">{{ cacheSize }}</text>
      </view>
      <view class="menu-item" @click="handleAbout">
        <text class="menu-text">关于我们</text>
        <text class="menu-desc">v1.0.0</text>
      </view>
    </view>

    <view class="logout-btn" @click="handleLogout">
      <text>退出登录</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { logout } from '@/utils/api';

const notificationsEnabled = ref(true);
const cacheSize = ref('2.5MB'); // Mock size

const toggleNotifications = (e: any) => {
  notificationsEnabled.value = e.detail.value;
};

const handleAccount = () => {
  uni.navigateTo({
    url: '/pages/settings/account-security'
  });
};

const handlePrivacy = () => {
  uni.navigateTo({
    url: '/pages/common/privacy-policy'
  });
};

const handleAgreement = () => {
  uni.navigateTo({
    url: '/pages/common/user-agreement'
  });
};

const clearCache = () => {
  uni.showLoading({ title: '清理中...' });
  setTimeout(() => {
    cacheSize.value = '0KB';
    uni.hideLoading();
    uni.showToast({ title: '清理完成', icon: 'success' });
  }, 1000);
};

const handleAbout = () => {
  uni.navigateTo({
    url: '/pages/common/about-us'
  });
};

const handleLogout = async () => {
  uni.showModal({
    title: '提示',
    content: '确定要退出登录吗？',
    success: async (res) => {
      if (res.confirm) {
        await logout();
        // 重新加载到个人中心，触发页面刷新
        uni.reLaunch({
          url: '/pages/user/user'
        });
      }
    }
  });
};
</script>

<style scoped>
.container {
  min-height: 100vh;
  background-color: #FDF8F3;
  padding: 20rpx;
  box-sizing: border-box;
}

.menu-section {
  background: #FFFFFF;
  border-radius: 20rpx;
  margin-bottom: 20rpx;
  overflow: hidden;
  box-shadow: 0 4rpx 20rpx rgba(61, 41, 20, 0.08);
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

.menu-text {
  font-size: 30rpx;
  color: #3D2914;
}

.menu-desc {
  font-size: 26rpx;
  color: #9B8B7F;
  margin-right: 10rpx;
}

.arrow {
  font-family: "iconfont";
  font-size: 24rpx;
  color: #9B8B7F;
}

.logout-btn {
  margin-top: 60rpx;
  background: #FFFFFF;
  height: 100rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50rpx;
  font-size: 32rpx;
  color: #C44536;
  font-weight: 500;
  box-shadow: 0 4rpx 20rpx rgba(61, 41, 20, 0.08);
}

.logout-btn:active {
  opacity: 0.8;
}
</style>
