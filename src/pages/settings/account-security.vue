<template>
  <view class="container">
    <view class="section-title">基本信息</view>
    <view class="menu-section">
      <view class="menu-item">
        <text class="menu-text">头像</text>
        <view class="menu-right">
          <image class="user-avatar" :src="userInfo.avatarUrl || '/static/logo.png'" mode="aspectFill" />
          <uni-icons type="right" size="14" color="#9B8B7F"></uni-icons>
        </view>
      </view>
      <view class="menu-item">
        <text class="menu-text">昵称</text>
        <view class="menu-right">
          <text class="menu-value">{{ userInfo.nickName || '微信用户' }}</text>
          <uni-icons type="right" size="14" color="#9B8B7F"></uni-icons>
        </view>
      </view>
    </view>

    <view class="section-title">账号绑定</view>
    <view class="menu-section">
      <view class="menu-item" @click="handleBindPhone">
        <text class="menu-text">手机号</text>
        <view class="menu-right">
          <text class="menu-value">{{ userInfo.phone ? maskPhone(userInfo.phone) : '未绑定' }}</text>
          <uni-icons type="right" size="14" color="#9B8B7F"></uni-icons>
        </view>
      </view>
      <view class="menu-item">
        <text class="menu-text">微信</text>
        <view class="menu-right">
          <text class="menu-value highlight">已绑定</text>
        </view>
      </view>
    </view>

    <view class="section-title">安全设置</view>
    <view class="menu-section">
      <view class="menu-item" @click="handleChangePassword">
        <text class="menu-text">修改登录密码</text>
        <uni-icons type="right" size="14" color="#9B8B7F"></uni-icons>
      </view>
      <view class="menu-item" @click="handleDeleteAccount">
        <text class="menu-text warning">注销账号</text>
        <uni-icons type="right" size="14" color="#9B8B7F"></uni-icons>
      </view>
    </view>

    <view class="tips">
      <text>注销账号后，您将无法找回账号相关的所有信息，请谨慎操作。</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { getUserInfo } from '@/utils/api';

// 模拟用户信息
const userInfo = ref({
  nickName: '微信用户',
  avatarUrl: '',
  phone: '13800138000'
});

// 手机号脱敏
const maskPhone = (phone: string) => {
  return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
};

const handleBindPhone = () => {
  uni.showToast({
    title: '功能开发中',
    icon: 'none'
  });
};

const handleChangePassword = () => {
  uni.showToast({
    title: '当前账号支持验证码登录，无需修改密码',
    icon: 'none'
  });
};

const handleDeleteAccount = () => {
  uni.showModal({
    title: '风险提示',
    content: '注销账号是不可恢复的操作，您将失去所有订单记录、优惠券和会员权益。确定要继续吗？',
    confirmColor: '#C44536',
    success: (res) => {
      if (res.confirm) {
        uni.showLoading({ title: '处理中' });
        setTimeout(() => {
          uni.hideLoading();
          uni.showToast({
            title: '请联系客服进行人工注销',
            icon: 'none',
            duration: 2000
          });
        }, 1000);
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

.section-title {
  font-size: 28rpx;
  color: #9B8B7F;
  margin: 30rpx 10rpx 20rpx;
}

.section-title:first-child {
  margin-top: 10rpx;
}

.menu-section {
  background: #FFFFFF;
  border-radius: 20rpx;
  overflow: hidden;
  box-shadow: 0 4rpx 20rpx rgba(61, 41, 20, 0.05);
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

.menu-text.warning {
  color: #C44536;
}

.menu-right {
  display: flex;
  align-items: center;
}

.menu-value {
  font-size: 28rpx;
  color: #9B8B7F;
  margin-right: 10rpx;
}

.menu-value.highlight {
  color: #D4A574;
}

.user-avatar {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  margin-right: 10rpx;
  background-color: #F5F0E8;
}

.tips {
  padding: 30rpx 20rpx;
}

.tips text {
  font-size: 24rpx;
  color: #BDB0A4;
  line-height: 1.5;
}
</style>