<template>
  <view class="container">
    <view class="section-title">基本信息</view>
    <view class="menu-section">
      <button class="menu-item avatar-btn" open-type="chooseAvatar" @chooseavatar="onChooseAvatar">
        <text class="menu-text">头像</text>
        <view class="menu-right">
          <image class="user-avatar" :src="userInfo.avatarUrl || '/static/logo.png'" mode="aspectFill" />
          <uni-icons type="right" size="14" color="#9B8B7F"></uni-icons>
        </view>
      </button>
      <view class="menu-item">
        <text class="menu-text">昵称</text>
        <view class="menu-right">
          <input 
            type="nickname" 
            class="nickname-input" 
            placeholder="请输入昵称" 
            :value="userInfo.nickName" 
            @blur="onNicknameBlur"
          />
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
import { onShow } from '@dcloudio/uni-app';
import { getUserInfo, saveUserInfo, updateCloudUserInfo } from '@/utils/api';
import { callFunction } from '@/utils/cloudbase';

// 用户信息
const userInfo = ref({
  nickName: '微信用户',
  avatarUrl: '',
  phone: ''
});

// 页面显示时获取最新用户信息
onShow(async () => {
  const user = await getUserInfo();
  if (user) {
    userInfo.value = {
      nickName: user.nickName || '微信用户',
      avatarUrl: user.avatarUrl || '',
      phone: user.phone || ''
    };
  }
});

// 处理头像选择
const onChooseAvatar = async (e: any) => {
  const { avatarUrl } = e.detail;
  if (!avatarUrl) return;

  try {
    uni.showLoading({ title: '上传头像中...' });

    // 1. 读取图片文件并转换为 base64
    const base64Data = await readImageAsBase64(avatarUrl);

    // 2. 通过云函数上传到云存储（绕过客户端安全规则）
    const uploadRes = await callFunction('upload', {
      action: 'uploadAvatar',
      base64Data,
      fileName: `${Date.now()}.jpg`
    });

    if (uploadRes.code !== 0 || !uploadRes.data) {
      throw new Error(uploadRes.msg || '上传失败');
    }

    const fileID = uploadRes.data.fileID;

    // 3. 更新本地显示
    userInfo.value.avatarUrl = fileID;

    // 4. 更新云端用户信息
    const success = await updateCloudUserInfo({ avatarUrl: fileID });
    if (!success) throw new Error('同步到云端失败');

    // 5. 更新本地缓存
    await saveUserInfo({ avatarUrl: fileID });

    uni.hideLoading();
    uni.showToast({ title: '头像更新成功', icon: 'success' });
  } catch (error) {
    console.error('更新头像失败:', error);
    uni.hideLoading();
    uni.showToast({ title: '头像更新失败', icon: 'none' });
  }
};

// 读取图片为 base64
const readImageAsBase64 = (filePath: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    uni.getFileSystemManager().readFile({
      filePath,
      encoding: 'base64',
      success: (res: any) => resolve(res.data),
      fail: reject
    });
  });
};

// 处理昵称输入
const onNicknameBlur = async (e: any) => {
  const nickName = e.detail.value;
  if (!nickName || nickName === userInfo.value.nickName) return;

  try {
    // 1. 更新本地显示
    userInfo.value.nickName = nickName;
    
    // 2. 更新云端用户信息
    const success = await updateCloudUserInfo({ nickName });
    if (!success) throw new Error('同步到云端失败');
    
    // 3. 更新本地缓存
    await saveUserInfo({ nickName });
    
    uni.showToast({ title: '昵称更新成功', icon: 'none' });
  } catch (error) {
    console.error('更新昵称失败:', error);
    uni.showToast({ title: '昵称更新失败', icon: 'none' });
  }
};

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
  background-color: #FFFFFF;
  width: 100%;
  box-sizing: border-box;
}

/* 重置 button 样式 */
button.menu-item {
  margin: 0;
  line-height: inherit;
  border-radius: 0;
  text-align: left;
  font-size: inherit;
}

button.menu-item::after {
  border: none;
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
  flex: 1;
  justify-content: flex-end;
}

.menu-value {
  font-size: 28rpx;
  color: #9B8B7F;
  margin-right: 10rpx;
}

.nickname-input {
  font-size: 28rpx;
  color: #9B8B7F;
  text-align: right;
  margin-right: 10rpx;
  width: 300rpx;
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