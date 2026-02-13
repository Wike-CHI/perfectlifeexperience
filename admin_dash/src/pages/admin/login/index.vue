<template>
  <view class="login-container">
    <view class="login-card">
      <view class="logo-section">
        <text class="logo-title">Perfect Life</text>
        <text class="logo-subtitle">Admin Dashboard</text>
      </view>

      <view class="form-section">
        <view class="form-group">
          <text class="label">用户名</text>
          <input
            v-model="formData.username"
            class="input"
            placeholder="请输入管理员用户名"
            placeholder-class="placeholder"
          />
        </view>

        <view class="form-group">
          <text class="label">密码</text>
          <input
            v-model="formData.password"
            class="input"
            type="password"
            placeholder="请输入密码"
            placeholder-class="placeholder"
          />
        </view>

        <button class="login-btn" @click="handleLogin">登录</button>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { app } from '@/utils/cloudbase';

const formData = ref({
  username: '',
  password: ''
});

const handleLogin = async () => {
  if (!formData.value.username || !formData.value.password) {
    uni.showToast({ title: '请填写完整信息', icon: 'none' });
    return;
  }

  try {
    // 直接调用管理员登录
    const res = await app.callFunction({
      name: 'admin-api',
      data: {
        action: 'adminLogin',
        data: formData.value
      }
    });

    if (res.result.code === 0) {
      // Store admin info in local storage
      uni.setStorageSync('adminInfo', res.result.data);
      uni.setStorageSync('isAdminLoggedIn', true);

      uni.showToast({ title: '登录成功', icon: 'success' });
      setTimeout(() => {
        uni.redirectTo({ url: '/pages/dashboard/index' });
      }, 1000);
    } else {
      uni.showToast({ title: res.result.msg || '登录失败', icon: 'none' });
    }
  } catch (error) {
    console.error('Login error:', error);
    uni.showToast({ title: '登录失败', icon: 'none' });
  }
};
</script>

<style lang="scss" scoped>
@import "@/styles/variables.scss";

.login-container {
  min-height: 100vh;
  background: linear-gradient(135deg, $bg-primary 0%, #2a2a2a 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: $spacing-lg;
}

.login-card {
  width: 100%;
  max-width: 400px;
  background-color: $bg-card;
  border-radius: $radius-lg;
  padding: $spacing-xl * 1.5;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.logo-section {
  text-align: center;
  margin-bottom: $spacing-xl * 2;
}

.logo-title {
  font-family: $font-family-heading;
  font-size: 32px;
  color: $color-amber-gold;
  display: block;
  margin-bottom: $spacing-xs;
}

.logo-subtitle {
  font-family: $font-family-mono;
  font-size: 12px;
  color: $text-secondary;
  letter-spacing: 2px;
}

.form-section {
  .form-group {
    margin-bottom: $spacing-lg;
  }

  .label {
    display: block;
    font-size: 14px;
    color: $text-secondary;
    margin-bottom: $spacing-sm;
  }

  .input {
    width: 100%;
    height: 48px;
    background-color: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: $radius-md;
    padding: 0 $spacing-md;
    color: $text-primary;
    font-size: 14px;
    box-sizing: border-box;

    &:focus {
      border-color: $color-amber-gold;
      outline: none;
    }
  }

  .placeholder {
    color: rgba(255, 255, 255, 0.3);
  }
}

.login-btn {
  width: 100%;
  height: 48px;
  background: linear-gradient(135deg, $color-amber-gold 0%, #b8943d 100%);
  border: none;
  border-radius: $radius-md;
  color: $bg-primary;
  font-size: 16px;
  font-weight: 600;
  margin-top: $spacing-lg;
  cursor: pointer;
}
</style>
