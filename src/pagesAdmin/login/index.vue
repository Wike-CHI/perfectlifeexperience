<template>
  <view class="login-container">
    <!-- Logo 区域 -->
    <view class="logo-section">
      <image class="logo" src="/static/logo.png" mode="aspectFit" />
      <text class="app-name">大友元气精酿啤酒</text>
      <text class="login-title">管理员登录</text>
    </view>

    <!-- 登录表单 -->
    <view class="form-section">
      <view class="form-item">
        <view class="input-wrapper">
          <text class="input-icon">👤</text>
          <input
            class="input-field"
            type="text"
            placeholder="请输入用户名"
            v-model="formData.username"
            placeholder-class="input-placeholder"
          />
        </view>
      </view>

      <view class="form-item">
        <view class="input-wrapper">
          <text class="input-icon">🔒</text>
          <input
            class="input-field"
            :type="showPassword ? 'text' : 'password'"
            placeholder="请输入密码"
            v-model="formData.password"
            placeholder-class="input-placeholder"
          />
          <text class="toggle-password" @click="togglePassword">
            {{ showPassword ? '🙈' : '👁️' }}
          </text>
        </view>
      </view>

      <!-- 登录按钮 -->
      <button
        class="login-btn"
        :class="{ loading: isLoading }"
        :disabled="isLoading"
        @click="handleLogin"
      >
        <text v-if="!isLoading">登录</text>
        <text v-else>登录中...</text>
      </button>

      <!-- 返回用户端 -->
      <view class="back-section">
        <text class="back-link" @click="goBack">← 返回用户端</text>
      </view>
    </view>

    <!-- 版权信息 -->
    <view class="footer">
      <text class="footer-text">Powered by CloudBase + UniApp</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AdminAuthManager from '@/utils/admin-auth'

/**
 * 管理员登录页面
 */

// 表单数据
const formData = reactive({
  username: '',
  password: ''
})

// UI 状态
const showPassword = ref(false)
const isLoading = ref(false)

// 页面加载
onLoad(() => {
  // 如果已登录，直接跳转到管理后台
  if (AdminAuthManager.isLoggedIn()) {
    uni.redirectTo({
      url: '/pagesAdmin/dashboard/index'
    })
  }
})

// 切换密码显示
const togglePassword = () => {
  showPassword.value = !showPassword.value
}

// 表单验证
const validateForm = (): boolean => {
  if (!formData.username.trim()) {
    uni.showToast({
      title: '请输入用户名',
      icon: 'none'
    })
    return false
  }

  if (!formData.password.trim()) {
    uni.showToast({
      title: '请输入密码',
      icon: 'none'
    })
    return false
  }

  return true
}

// 处理登录
const handleLogin = async () => {
  if (!validateForm()) return

  isLoading.value = true

  try {
    // 调用登录接口
    await AdminAuthManager.login(formData.username.trim(), formData.password.trim())

    uni.showToast({
      title: '登录成功',
      icon: 'success'
    })

    // 延迟跳转，让用户看到成功提示
    setTimeout(() => {
      uni.redirectTo({
        url: '/pagesAdmin/dashboard/index'
      })
    }, 1500)
  } catch (error: any) {
    uni.showToast({
      title: error.message || '登录失败',
      icon: 'none',
      duration: 2000
    })
  } finally {
    isLoading.value = false
  }
}

// 返回用户端
const goBack = () => {
  uni.switchTab({
    url: '/pages/user/user'
  })
}
</script>

<style scoped>
.login-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #1A1A1A 0%, #0D0D0D 100%);
  padding: 80rpx 60rpx;
  display: flex;
  flex-direction: column;
}

/* Logo 区域 */
.logo-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 80rpx;
}

.logo {
  width: 160rpx;
  height: 160rpx;
  border-radius: 50%;
  background: #FFFFFF;
  padding: 8rpx;
  box-shadow: 0 8rpx 32rpx rgba(201, 169, 98, 0.3);
  margin-bottom: 32rpx;
}

.app-name {
  font-size: 36rpx;
  font-weight: 700;
  color: #C9A962;
  letter-spacing: 2rpx;
  margin-bottom: 16rpx;
}

.login-title {
  font-size: 28rpx;
  color: rgba(245, 245, 240, 0.6);
}

/* 表单区域 */
.form-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 32rpx;
}

.form-item {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.input-wrapper {
  display: flex;
  align-items: center;
  background: rgba(255, 255, 255, 0.05);
  border: 2rpx solid rgba(201, 169, 98, 0.3);
  border-radius: 16rpx;
  padding: 24rpx 32rpx;
  gap: 16rpx;
  transition: all 0.3s;
}

.input-wrapper:focus-within {
  border-color: #C9A962;
  background: rgba(255, 255, 255, 0.08);
}

.input-icon {
  font-size: 40rpx;
}

.input-field {
  flex: 1;
  font-size: 30rpx;
  color: #F5F5F0;
}

.input-placeholder {
  color: rgba(245, 245, 240, 0.3);
}

.toggle-password {
  font-size: 40rpx;
  cursor: pointer;
}

/* 登录按钮 */
.login-btn {
  width: 100%;
  height: 96rpx;
  background: linear-gradient(135deg, #C9A962 0%, #B8984A 100%);
  border: none;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32rpx;
  font-weight: 600;
  color: #1A1A1A;
  box-shadow: 0 8rpx 24rpx rgba(201, 169, 98, 0.3);
  margin-top: 24rpx;
  transition: all 0.3s;
}

.login-btn:active {
  opacity: 0.9;
  transform: scale(0.98);
}

.login-btn.loading {
  opacity: 0.6;
  pointer-events: none;
}

/* 返回区域 */
.back-section {
  display: flex;
  justify-content: center;
  margin-top: 24rpx;
}

.back-link {
  font-size: 26rpx;
  color: #C9A962;
}

/* 版权信息 */
.footer {
  margin-top: auto;
  padding-top: 60rpx;
  display: flex;
  justify-content: center;
}

.footer-text {
  font-size: 22rpx;
  color: rgba(245, 245, 240, 0.3);
}
</style>
