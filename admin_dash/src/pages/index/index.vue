<template>
  <view class="container">
    <view class="header">
      <h1 class="title">Perfect Life</h1>
      <text class="subtitle">Admin Portal</text>
    </view>

    <view class="card login-card">
      <div class="status-indicator" :class="{ connected: isConnected }">
        <span class="dot"></span>
        {{ isConnected ? 'System Online' : 'Connecting...' }}
      </div>

      <button class="btn btn-primary" @click="enterDashboard">
        Enter Dashboard
      </button>
      
      <div class="links">
        <text class="link" @click="goToLogin">Login as different user</text>
      </div>
    </view>

    <view class="footer">
      <text class="copyright">© 2026 Perfect Life Experience</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { checkEnvironment, initCloudBase } from '@/utils/cloudbase'

const isConnected = ref(false)

const enterDashboard = () => {
  uni.navigateTo({
    url: '/pages/dashboard/index'
  })
}

const goToLogin = () => {
  uni.navigateTo({
    url: '/pages/login/index'
  });
}

onMounted(async () => {
  if (checkEnvironment()) {
    const success = await initCloudBase();
    isConnected.value = success;
  }
})
</script>

<style lang="scss" scoped>
@import "@/styles/variables.scss";

.container {
  padding: 40rpx;
  background-color: $bg-primary;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.header {
  text-align: center;
  margin-bottom: 60rpx;

  .title {
    font-family: $font-family-heading;
    font-size: 48rpx;
    color: $color-amber-gold;
    margin-bottom: 10rpx;
  }
  .subtitle {
    font-family: $font-family-mono;
    font-size: 24rpx;
    color: rgba(255, 255, 255, 0.5);
    letter-spacing: 4px;
    text-transform: uppercase;
  }
}

.login-card {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 60rpx;
  border-radius: $radius-lg;
  width: 100%;
  max-width: 400px;
  display: flex;
  flex-direction: column;
  gap: $spacing-lg;
}

.status-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-family: $font-family-mono;
  font-size: 12px;
  color: $text-secondary;
  margin-bottom: $spacing-md;

  .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background-color: $color-charcoal-grey;
  }

  &.connected {
    color: $color-success-green;
    .dot { background-color: $color-success-green; }
  }
}

.btn {
  width: 100%;
  padding: 24rpx;
  border-radius: $radius-md;
  border: none;
  font-family: $font-family-body;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  &.btn-primary {
    background: $color-amber-gold;
    color: $bg-primary;
    &:hover {
      background: lighten($color-amber-gold, 10%);
    }
  }
}

.links {
  text-align: center;
  margin-top: $spacing-sm;
  .link {
    font-size: 14px;
    color: rgba(255, 255, 255, 0.5);
    text-decoration: underline;
    cursor: pointer;
    &:hover { color: $color-amber-gold; }
  }
}

.footer {
  margin-top: 60rpx;
  .copyright {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.3);
  }
}
</style>
