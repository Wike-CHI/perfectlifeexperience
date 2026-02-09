<template>
  <view class="container">
    <view class="header-section">
      <view class="logo-box">
        <image class="logo" src="/static/logo.png" mode="aspectFill" />
      </view>
      <text class="app-name">大友元气</text>
      <text class="app-version">Version 1.0.0</text>
    </view>

    <view class="content-wrapper">
      <view class="card">
        <view class="info-item">
          <text class="label">公司名称</text>
          <text class="value">瑞安市来风餐饮店（个人独资）</text>
        </view>
        <view class="divider"></view>
        <view class="info-item" @click="makePhoneCall">
          <text class="label">联系电话</text>
          <view class="value-row">
            <text class="value link">135 6618 6557</text>
            <uni-icons type="phone-filled" size="16" color="#D4A574" style="margin-left: 10rpx;"></uni-icons>
          </view>
        </view>
        <view class="divider"></view>
        <view class="info-item">
          <text class="label">公司地址</text>
          <text class="value">浙江省温州市瑞安市瑞光大道1308号德信铂瑞湾二期30楼05-06</text>
        </view>
        <view class="divider"></view>
        <view class="info-item">
          <text class="label">官方网站</text>
          <text class="value">perfectlifeexpensive.com</text>
        </view>
      </view>

      <view class="card">
        <view class="menu-item" @click="goToPrivacy">
          <text class="menu-text">隐私政策</text>
          <uni-icons type="right" size="14" color="#9B8B7F"></uni-icons>
        </view>
        <view class="divider"></view>
        <view class="menu-item" @click="goToAgreement">
          <text class="menu-text">用户协议</text>
          <uni-icons type="right" size="14" color="#9B8B7F"></uni-icons>
        </view>
      </view>
    </view>

    <view class="footer">
      <text class="copyright">Copyright © 2024 大友元气 All Rights Reserved</text>
    </view>
  </view>
</template>

<script setup lang="ts">
const makePhoneCall = () => {
  uni.makePhoneCall({
    phoneNumber: '13566186557'
  });
};

const goToPrivacy = () => {
  uni.navigateTo({
    url: '/pages/common/privacy-policy'
  });
};

const goToAgreement = () => {
  uni.navigateTo({
    url: '/pages/common/user-agreement'
  });
};
</script>

<style scoped>
.container {
  min-height: 100vh;
  background-color: #FDF8F3;
  padding-bottom: 40rpx;
}

.header-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 80rpx 0 60rpx;
}

.logo-box {
  width: 160rpx;
  height: 160rpx;
  background: #FFFFFF;
  border-radius: 32rpx;
  box-shadow: 0 8rpx 24rpx rgba(61, 41, 20, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 30rpx;
}

.logo {
  width: 120rpx;
  height: 120rpx;
}

.app-name {
  font-size: 40rpx;
  font-weight: bold;
  color: #3D2914;
  margin-bottom: 12rpx;
}

.app-version {
  font-size: 26rpx;
  color: #9B8B7F;
}

.content-wrapper {
  padding: 0 30rpx;
}

.card {
  background: #FFFFFF;
  border-radius: 24rpx;
  padding: 0 30rpx;
  box-shadow: 0 4rpx 20rpx rgba(61, 41, 20, 0.05);
  margin-bottom: 30rpx;
}

.info-item {
  padding: 30rpx 0;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.label {
  font-size: 28rpx;
  color: #6B5B4F;
  width: 160rpx;
  flex-shrink: 0;
}

.value {
  font-size: 28rpx;
  color: #3D2914;
  flex: 1;
  text-align: right;
  line-height: 1.4;
}

.value-row {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex: 1;
}

.link {
  color: #D4A574;
}

.divider {
  height: 1rpx;
  background: #F5F0E8;
}

.menu-item {
  padding: 30rpx 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.menu-text {
  font-size: 28rpx;
  color: #3D2914;
}

.footer {
  text-align: center;
  margin-top: 60rpx;
  padding-bottom: 40rpx;
}

.copyright {
  font-size: 22rpx;
  color: #CDB7A5;
}
</style>