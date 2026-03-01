<template>
  <view class="bind-page">
    <!-- 已绑定状态 -->
    <view class="binded-card" v-if="bindInfo.isBinded">
      <view class="card-header">
        <view class="header-icon success">
          <text class="icon-text">✓</text>
        </view>
        <text class="header-title">已绑定推广人</text>
      </view>

      <view class="parent-info" v-if="bindInfo.parentInfo">
        <image class="parent-avatar" :src="bindInfo.parentInfo.avatarUrl || '/static/images/default-avatar.png'" mode="aspectFill" />
        <view class="parent-detail">
          <text class="parent-name">{{ bindInfo.parentInfo.nickName || '推广人' }}</text>
          <text class="parent-level">{{ bindInfo.parentInfo.agentLevelName || '普通会员' }}</text>
        </view>
      </view>

      <view class="bind-time">
        <text class="time-label">绑定时间</text>
        <text class="time-value">{{ formatTime(bindInfo.bindTime) }}</text>
      </view>

      <view class="tips-section">
        <text class="tips-title">温馨提示</text>
        <text class="tips-text">推广关系绑定后不可更改，您下单时推广人将获得相应佣金</text>
      </view>
    </view>

    <!-- 未绑定状态 -->
    <view class="unbinded-card" v-else>
      <view class="card-header">
        <view class="header-icon warning">
          <text class="icon-text">!</text>
        </view>
        <text class="header-title">绑定推广人</text>
      </view>

      <view class="intro-section">
        <text class="intro-title">为什么要绑定推广人？</text>
        <view class="intro-list">
          <view class="intro-item">
            <text class="intro-num">1</text>
            <text class="intro-text">绑定后，您的推广人可以获得佣金收益</text>
          </view>
          <view class="intro-item">
            <text class="intro-num">2</text>
            <text class="intro-text">支持朋友的推广事业，共同发展</text>
          </view>
          <view class="intro-item">
            <text class="intro-num">3</text>
            <text class="intro-text">绑定关系永久有效，一次绑定终身受益</text>
          </view>
        </view>
      </view>

      <view class="form-section">
        <view class="form-item">
          <text class="form-label">邀请码</text>
          <input
            class="form-input"
            v-model="inviteCode"
            type="text"
            maxlength="8"
            placeholder="请输入8位邀请码"
            :disabled="loading"
          />
        </view>

        <button class="bind-btn" :disabled="!canSubmit || loading" @click="handleBind">
          <text v-if="loading">绑定中...</text>
          <text v-else>确认绑定</text>
        </button>
      </view>

      <view class="warning-section">
        <text class="warning-title">注意事项</text>
        <text class="warning-text">• 邀请码由您的推广人提供</text>
        <text class="warning-text">• 绑定后不可更改，请确认邀请码正确</text>
        <text class="warning-text">• 每个用户只能绑定一次推广人</text>
      </view>
    </view>

    <!-- 跳过绑定 -->
    <view class="skip-section" v-if="!bindInfo.isBinded">
      <text class="skip-text" @click="handleSkip">暂不绑定，稍后再说</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { bindPromotionRelation, getPromotionInfo } from '@/utils/api';

interface BindInfo {
  isBinded: boolean;
  parentInfo: {
    nickName: string;
    avatarUrl: string;
    agentLevelName: string;
  } | null;
  bindTime: string | null;
}

const inviteCode = ref('');
const loading = ref(false);
const bindInfo = ref<BindInfo>({
  isBinded: false,
  parentInfo: null,
  bindTime: null
});

const canSubmit = computed(() => {
  return inviteCode.value.length === 8;
});

const formatTime = (time: string | null) => {
  if (!time) return '未知';
  const date = new Date(time);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const loadBindInfo = async () => {
  try {
    uni.showLoading({ title: '加载中...' });
    const data = await getPromotionInfo();

    // 检查是否有上级（通过 promotionPath 判断）
    const hasParent = data.promotionPath && data.promotionPath.length > 0;

    bindInfo.value = {
      isBinded: hasParent,
      parentInfo: data.parentInfo || null,
      bindTime: data.bindTime || null
    };
  } catch (error) {
    console.error('加载绑定信息失败:', error);
    uni.showToast({ title: '加载失败', icon: 'none' });
  } finally {
    uni.hideLoading();
  }
};

const handleBind = async () => {
  if (!canSubmit.value || loading.value) return;

  const code = inviteCode.value.toUpperCase().trim();

  // 二次确认
  uni.showModal({
    title: '确认绑定',
    content: `确认绑定邀请码 ${code}？绑定后不可更改`,
    success: async (res) => {
      if (res.confirm) {
        await doBind(code);
      }
    }
  });
};

const doBind = async (code: string) => {
  loading.value = true;
  uni.showLoading({ title: '绑定中...' });

  try {
    // 获取用户信息
    const userInfo = await getUserInfo();

    await bindPromotionRelation(code, userInfo);

    uni.hideLoading();
    uni.showToast({
      title: '绑定成功',
      icon: 'success'
    });

    // 刷新绑定信息
    await loadBindInfo();
  } catch (error: any) {
    uni.hideLoading();
    uni.showToast({
      title: error.message || '绑定失败',
      icon: 'none'
    });
  } finally {
    loading.value = false;
  }
};

const getUserInfo = async (): Promise<{ nickName: string; avatarUrl: string }> => {
  return new Promise((resolve) => {
    // 尝试获取已保存的用户信息
    const cachedUserInfo = uni.getStorageSync('userInfo');
    if (cachedUserInfo) {
      resolve({
        nickName: cachedUserInfo.nickName || '微信用户',
        avatarUrl: cachedUserInfo.avatarUrl || ''
      });
      return;
    }

    // 没有缓存则使用默认值
    resolve({
      nickName: '微信用户',
      avatarUrl: ''
    });
  });
};

const handleSkip = () => {
  uni.navigateBack({
    fail: () => {
      uni.switchTab({ url: '/pages/index/index' });
    }
  });
};

onMounted(() => {
  loadBindInfo();
});
</script>

<style lang="scss" scoped>
.bind-page {
  min-height: 100vh;
  background: #FAF9F7;
  padding: 30rpx;
}

/* 已绑定卡片 */
.binded-card {
  background: #FFFFFF;
  border-radius: 24rpx;
  padding: 40rpx;
  box-shadow: 0 8rpx 32rpx rgba(61, 41, 20, 0.1);
}

.card-header {
  display: flex;
  align-items: center;
  margin-bottom: 40rpx;
}

.header-icon {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 20rpx;
}

.header-icon.success {
  background: linear-gradient(135deg, #7A9A8E 0%, #5B7A6E 100%);
}

.header-icon.warning {
  background: linear-gradient(135deg, #D4A574 0%, #B8944D 100%);
}

.icon-text {
  color: #FFFFFF;
  font-size: 36rpx;
  font-weight: bold;
}

.header-title {
  font-size: 36rpx;
  font-weight: 600;
  color: #1A1A1A;
}

.parent-info {
  display: flex;
  align-items: center;
  padding: 30rpx;
  background: linear-gradient(135deg, #FAF9F7 0%, #F5F0E8 100%);
  border-radius: 16rpx;
  margin-bottom: 30rpx;
}

.parent-avatar {
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
  margin-right: 24rpx;
  border: 4rpx solid #C9A962;
}

.parent-detail {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.parent-name {
  font-size: 32rpx;
  font-weight: 600;
  color: #1A1A1A;
  margin-bottom: 8rpx;
}

.parent-level {
  font-size: 24rpx;
  color: #C9A962;
  font-weight: 500;
}

.bind-time {
  display: flex;
  justify-content: space-between;
  padding: 20rpx 0;
  border-top: 1rpx solid #F5F0E8;
  border-bottom: 1rpx solid #F5F0E8;
  margin-bottom: 30rpx;
}

.time-label {
  font-size: 26rpx;
  color: #6B5B4F;
}

.time-value {
  font-size: 26rpx;
  color: #1A1A1A;
  font-weight: 500;
}

.tips-section {
  padding: 20rpx;
  background: rgba(201, 169, 98, 0.08);
  border-radius: 12rpx;
}

.tips-title {
  font-size: 24rpx;
  color: #C9A962;
  font-weight: 600;
  margin-bottom: 12rpx;
  display: block;
}

.tips-text {
  font-size: 24rpx;
  color: #6B5B4F;
  line-height: 1.6;
}

/* 未绑定卡片 */
.unbinded-card {
  background: #FFFFFF;
  border-radius: 24rpx;
  padding: 40rpx;
  box-shadow: 0 8rpx 32rpx rgba(61, 41, 20, 0.1);
}

.intro-section {
  margin-bottom: 40rpx;
}

.intro-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #1A1A1A;
  margin-bottom: 24rpx;
  display: block;
}

.intro-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.intro-item {
  display: flex;
  align-items: flex-start;
}

.intro-num {
  width: 36rpx;
  height: 36rpx;
  background: linear-gradient(135deg, #C9A962 0%, #B8860B 100%);
  color: #FFFFFF;
  font-size: 22rpx;
  font-weight: 700;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16rpx;
  flex-shrink: 0;
}

.intro-text {
  font-size: 26rpx;
  color: #4A4A4A;
  line-height: 1.6;
  flex: 1;
}

/* 表单 */
.form-section {
  margin-bottom: 40rpx;
}

.form-item {
  margin-bottom: 30rpx;
}

.form-label {
  font-size: 28rpx;
  font-weight: 600;
  color: #1A1A1A;
  margin-bottom: 16rpx;
  display: block;
}

.form-input {
  width: 100%;
  height: 96rpx;
  background: #FAF9F7;
  border: 2rpx solid #E5E5E5;
  border-radius: 16rpx;
  padding: 0 24rpx;
  font-size: 32rpx;
  color: #1A1A1A;
  letter-spacing: 4rpx;
  text-transform: uppercase;
  box-sizing: border-box;
}

.form-input:focus {
  border-color: #C9A962;
  background: #FFFFFF;
}

.bind-btn {
  width: 100%;
  height: 96rpx;
  background: linear-gradient(135deg, #C9A962 0%, #B8944D 100%);
  border-radius: 16rpx;
  font-size: 32rpx;
  font-weight: 600;
  color: #3D2914;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
}

.bind-btn[disabled] {
  background: #E5E5E5;
  color: #999999;
}

/* 警告区域 */
.warning-section {
  padding: 24rpx;
  background: rgba(212, 165, 116, 0.08);
  border-radius: 12rpx;
  border-left: 6rpx solid #D4A574;
}

.warning-title {
  font-size: 26rpx;
  font-weight: 600;
  color: #D4A574;
  margin-bottom: 16rpx;
  display: block;
}

.warning-text {
  font-size: 24rpx;
  color: #6B5B4F;
  line-height: 1.8;
  display: block;
}

/* 跳过绑定 */
.skip-section {
  text-align: center;
  margin-top: 40rpx;
  padding: 30rpx 0;
}

.skip-text {
  font-size: 28rpx;
  color: #999999;
  text-decoration: underline;
}
</style>
