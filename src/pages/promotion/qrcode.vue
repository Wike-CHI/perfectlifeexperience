<template>
  <view class="container">
    <!-- 二维码卡片 -->
    <view class="qrcode-card">
      <view class="card-header">
        <image class="logo" src="/static/logo.png" mode="aspectFit" />
        <text class="brand-name">大友元气</text>
      </view>

      <view class="qrcode-wrapper">
        <view class="qrcode-border">
          <image
            v-if="qrCodeUrl"
            class="qrcode-image"
            :src="qrCodeUrl"
            mode="aspectFit"
            @longpress="saveQRCode"
          />
          <view v-else class="qrcode-placeholder">
            <text class="loading-text">生成中...</text>
          </view>
        </view>
        <text class="qrcode-hint">长按保存图片</text>
      </view>

      <view class="invite-info">
        <text class="invite-label">我的邀请码</text>
        <view class="invite-code-box" @click="copyInviteCode">
          <text class="invite-code">{{ inviteCode }}</text>
          <text class="copy-btn">复制</text>
        </view>
      </view>
    </view>

    <!-- 推广链接卡片 -->
    <view class="link-card">
      <view class="link-header">
        <text class="link-title">推广链接</text>
        <text class="link-desc">分享链接，好友点击即可绑定</text>
      </view>
      <view class="link-content">
        <text class="link-text" selectable>{{ promotionLink }}</text>
      </view>
      <view class="link-actions">
        <button class="link-btn" @click="copyLink">
          <text>复制链接</text>
        </button>
      </view>
    </view>

    <!-- 分享提示 -->
    <view class="share-tips">
      <view class="tips-title">
        <text>分享方式</text>
      </view>
      <view class="tip-item">
        <view class="tip-icon">
          <image class="tip-icon-img" src="/static/icons/icon-wechat.svg" mode="aspectFit"/>
        </view>
        <view class="tip-content">
          <text class="tip-title">分享到微信</text>
          <text class="tip-desc">发送给好友或分享到朋友圈</text>
        </view>
      </view>
      <view class="tip-item">
        <view class="tip-icon">
          <image class="tip-icon-img" src="/static/icons/icon-link.svg" mode="aspectFit"/>
        </view>
        <view class="tip-content">
          <text class="tip-title">复制推广链接</text>
          <text class="tip-desc">粘贴到任意平台分享</text>
        </view>
      </view>
      <view class="tip-item">
        <view class="tip-icon">
          <image class="tip-icon-img" src="/static/icons/icon-download.svg" mode="aspectFit"/>
        </view>
        <view class="tip-content">
          <text class="tip-title">保存二维码图片</text>
          <text class="tip-desc">保存后分享给好友</text>
        </view>
      </view>
    </view>

    <!-- 分享按钮 -->
    <view class="action-section">
      <button class="share-btn primary" @click="shareToWeChat">
        <image class="btn-icon" src="/static/icons/icon-wechat.svg" mode="aspectFit"/>
        <text>分享给好友</text>
      </button>
      <button class="share-btn secondary" @click="copyLink">
        <image class="btn-icon-secondary" src="/static/icons/icon-link.svg" mode="aspectFit"/>
        <text>复制链接</text>
      </button>
    </view>

    <view class="action-section">
      <button class="share-btn tertiary" @click="saveQRCode">
        <image class="btn-icon-secondary" src="/static/icons/icon-download.svg" mode="aspectFit"/>
        <text>保存图片</text>
      </button>
    </view>

    <!-- 分享海报预览 -->
    <view class="poster-preview" v-if="showPoster">
      <view class="poster-mask" @click="closePoster"></view>
      <view class="poster-content">
        <image class="poster-image" :src="posterUrl" mode="aspectFit" />
        <view class="poster-actions">
          <button class="poster-btn" @click="savePoster">保存海报</button>
          <button class="poster-btn secondary" @click="closePoster">关闭</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { generatePromotionQRCode } from '@/utils/api';

const qrCodeUrl = ref('');
const inviteCode = ref('');
const showPoster = ref(false);
const posterUrl = ref('');
const loading = ref(false);

// 小程序 AppID
const APP_ID = 'wx4a0b93c3660d1404';

// 生成推广链接
const promotionLink = computed(() => {
  if (!inviteCode.value) return '';
  // 使用小程序路径格式，带邀请码参数
  return `pages/index/index?inviteCode=${inviteCode.value}`;
});

// 生成完整的分享链接（用于复制）
const fullShareLink = computed(() => {
  if (!inviteCode.value) return '';
  // 微信小程序 URL Scheme 格式
  // 实际使用时需要从微信后台生成 URL Scheme
  return `weixin://dl/business/?appid=${APP_ID}&path=pages/index/index&query=inviteCode%3D${inviteCode.value}`;
});

const loadQRCode = async () => {
  loading.value = true;
  try {
    const res = await generatePromotionQRCode('pages/index/index');
    qrCodeUrl.value = res.qrCodeUrl;
    inviteCode.value = res.inviteCode;
  } catch (error) {
    console.error('生成二维码失败:', error);
    uni.showToast({
      title: '生成失败，请重试',
      icon: 'none'
    });
  } finally {
    loading.value = false;
  }
};

const copyInviteCode = () => {
  if (!inviteCode.value) return;

  uni.setClipboardData({
    data: inviteCode.value,
    success: () => {
      uni.showToast({
        title: '邀请码已复制',
        icon: 'success'
      });
    }
  });
};

const copyLink = () => {
  if (!promotionLink.value) return;

  uni.setClipboardData({
    data: promotionLink.value,
    success: () => {
      uni.showToast({
        title: '推广链接已复制',
        icon: 'success'
      });
    }
  });
};

const saveQRCode = () => {
  if (!qrCodeUrl.value) return;

  uni.downloadFile({
    url: qrCodeUrl.value,
    success: (res) => {
      if (res.statusCode === 200) {
        uni.saveImageToPhotosAlbum({
          filePath: res.tempFilePath,
          success: () => {
            uni.showToast({
              title: '已保存到相册',
              icon: 'success'
            });
          },
          fail: (err) => {
            console.error('保存失败:', err);
            uni.showToast({
              title: '保存失败',
              icon: 'none'
            });
          }
        });
      }
    },
    fail: (err) => {
      console.error('下载失败:', err);
      uni.showToast({
        title: '下载失败',
        icon: 'none'
      });
    }
  });
};

const shareToWeChat = () => {
  // #ifdef MP-WEIXIN
  uni.showShareMenu({
    withShareTicket: true,
    menus: ['shareAppMessage', 'shareTimeline']
  });

  uni.showToast({
    title: '请点击右上角分享',
    icon: 'none'
  });
  // #endif

  // #ifndef MP-WEIXIN
  uni.showToast({
    title: '请使用微信小程序分享',
    icon: 'none'
  });
  // #endif
};

const generatePoster = () => {
  showPoster.value = true;
};

const closePoster = () => {
  showPoster.value = false;
};

const savePoster = () => {
  if (!posterUrl.value) return;

  uni.saveImageToPhotosAlbum({
    filePath: posterUrl.value,
    success: () => {
      uni.showToast({
        title: '海报已保存',
        icon: 'success'
      });
    },
    fail: () => {
      uni.showToast({
        title: '保存失败',
        icon: 'none'
      });
    }
  });
};

// 微信小程序分享配置
// #ifdef MP-WEIXIN
uni.showShareMenu({
  withShareTicket: true,
  menus: ['shareAppMessage', 'shareTimeline']
});
// #endif

onMounted(() => {
  loadQRCode();
});
</script>

<style scoped>
.container {
  min-height: 100vh;
  background: linear-gradient(180deg, #3D2914 0%, #5D3924 50%, #FDF8F3 50%);
  padding: 40rpx 30rpx;
  padding-bottom: 120rpx;
}

/* 推广链接卡片 */
.link-card {
  background: #FFFFFF;
  border-radius: 24rpx;
  padding: 32rpx;
  margin-bottom: 32rpx;
  box-shadow: 0 8rpx 32rpx rgba(61, 41, 20, 0.08);
}

.link-header {
  margin-bottom: 24rpx;
}

.link-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #3D2914;
  margin-bottom: 8rpx;
  display: block;
}

.link-desc {
  font-size: 24rpx;
  color: #9B8B7F;
  display: block;
}

.link-content {
  background: #F5F0E8;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 24rpx;
}

.link-text {
  font-size: 26rpx;
  color: #4A4A4A;
  word-break: break-all;
  line-height: 1.6;
}

.link-actions {
  display: flex;
  justify-content: center;
}

.link-btn {
  background: linear-gradient(135deg, #D4A574 0%, #B8935F 100%);
  color: #FFFFFF;
  font-size: 28rpx;
  font-weight: 500;
  padding: 16rpx 48rpx;
  border-radius: 24rpx;
  border: none;
}

/* 二维码卡片 */
.qrcode-card {
  background: #FFFFFF;
  border-radius: 32rpx;
  padding: 50rpx;
  box-shadow: 0 16rpx 64rpx rgba(61, 41, 20, 0.15);
  margin-bottom: 40rpx;
}

.card-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 40rpx;
}

.logo {
  width: 120rpx;
  height: 120rpx;
  margin-bottom: 20rpx;
}

.brand-name {
  font-size: 40rpx;
  font-weight: bold;
  color: #3D2914;
}

.qrcode-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 40rpx;
}

.qrcode-border {
  width: 400rpx;
  height: 400rpx;
  padding: 20rpx;
  background: linear-gradient(135deg, #D4A574 0%, #B8935F 100%);
  border-radius: 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.qrcode-image {
  width: 360rpx;
  height: 360rpx;
  background: #FFFFFF;
  border-radius: 16rpx;
}

.qrcode-placeholder {
  width: 360rpx;
  height: 360rpx;
  background: #F5F0E8;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.loading-text {
  font-size: 28rpx;
  color: #9B8B7F;
}

.qrcode-hint {
  font-size: 24rpx;
  color: #9B8B7F;
  margin-top: 20rpx;
}

.invite-info {
  text-align: center;
}

.invite-label {
  display: block;
  font-size: 26rpx;
  color: #9B8B7F;
  margin-bottom: 16rpx;
}

.invite-code-box {
  display: inline-flex;
  align-items: center;
  background: #FDF8F3;
  border: 2rpx solid #D4A574;
  border-radius: 16rpx;
  padding: 20rpx 40rpx;
}

.invite-code {
  font-size: 48rpx;
  font-weight: bold;
  color: #3D2914;
  letter-spacing: 8rpx;
  margin-right: 24rpx;
  font-family: 'DIN Alternate', monospace;
}

.copy-btn {
  font-size: 26rpx;
  color: #D4A574;
  background: rgba(212, 165, 116, 0.15);
  padding: 8rpx 24rpx;
  border-radius: 8rpx;
}

/* 推广链接卡片 */
.link-card {
  background: #FFFFFF;
  border-radius: 24rpx;
  padding: 32rpx;
  margin-bottom: 40rpx;
  box-shadow: 0 8rpx 32rpx rgba(61, 41, 20, 0.08);
}

.link-header {
  margin-bottom: 20rpx;
}

.link-title {
  display: block;
  font-size: 32rpx;
  font-weight: 600;
  color: #3D2914;
  margin-bottom: 8rpx;
}

.link-desc {
  display: block;
  font-size: 24rpx;
  color: #9B8B7F;
}

.link-content {
  background: #F5F0E8;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
}

.link-text {
  font-size: 26rpx;
  color: #4A4A4A;
  word-break: break-all;
  line-height: 1.6;
}

.link-actions {
  display: flex;
  justify-content: center;
}

.link-btn {
  background: linear-gradient(135deg, #D4A574 0%, #B8935F 100%);
  color: #FFFFFF;
  font-size: 28rpx;
  font-weight: 500;
  padding: 16rpx 48rpx;
  border-radius: 24rpx;
  border: none;
}

.link-btn::after {
  border: none;
}

/* 分享提示 */
.share-tips {
  background: #FFFFFF;
  border-radius: 24rpx;
  padding: 40rpx;
  margin-bottom: 40rpx;
  box-shadow: 0 8rpx 32rpx rgba(61, 41, 20, 0.08);
}

.tips-title {
  margin-bottom: 30rpx;
}

.tips-title text {
  font-size: 32rpx;
  font-weight: 600;
  color: #3D2914;
}

.tip-item {
  display: flex;
  align-items: center;
  padding: 24rpx 0;
  border-bottom: 1rpx solid #F5F0E8;
}

.tip-item:last-child {
  border-bottom: none;
}

.tip-icon {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  background: #FDF8F3;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 24rpx;
}

.tip-icon-img {
  width: 40rpx;
  height: 40rpx;
}

.tip-content {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.tip-title {
  font-size: 30rpx;
  font-weight: 500;
  color: #3D2914;
  margin-bottom: 8rpx;
}

.tip-desc {
  font-size: 24rpx;
  color: #9B8B7F;
}

/* 推广链接卡片 */
.link-card {
  background: #FFFFFF;
  border-radius: 24rpx;
  padding: 32rpx;
  margin-bottom: 32rpx;
  box-shadow: 0 8rpx 32rpx rgba(61, 41, 20, 0.08);
}

.link-header {
  margin-bottom: 20rpx;
}

.link-title {
  display: block;
  font-size: 32rpx;
  font-weight: 600;
  color: #3D2914;
  margin-bottom: 8rpx;
}

.link-desc {
  display: block;
  font-size: 24rpx;
  color: #9B8B7F;
}

.link-content {
  background: #F5F0E8;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
}

.link-text {
  font-size: 26rpx;
  color: #4A4A4A;
  word-break: break-all;
  line-height: 1.6;
}

.link-actions {
  display: flex;
  justify-content: center;
}

.link-btn {
  background: linear-gradient(135deg, #D4A574 0%, #B8935F 100%);
  color: #FFFFFF;
  font-size: 28rpx;
  font-weight: 500;
  padding: 16rpx 48rpx;
  border-radius: 24rpx;
  border: none;
}

.link-btn::after {
  border: none;
}

/* 分享按钮 */
.action-section {
  display: flex;
  gap: 24rpx;
  margin-bottom: 24rpx;
}

.share-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100rpx;
  border-radius: 50rpx;
  border: none;
  padding: 0 32rpx;
}

.share-btn::after {
  border: none;
}

.share-btn.primary {
  background: linear-gradient(135deg, #07C160 0%, #05a350 100%);
  box-shadow: 0 8rpx 24rpx rgba(7, 193, 96, 0.3);
}

.share-btn.primary text {
  font-size: 28rpx;
  color: #FFFFFF;
  font-weight: 500;
  margin-left: 12rpx;
}

.share-btn.secondary {
  background: linear-gradient(135deg, #D4A574 0%, #B8935F 100%);
  box-shadow: 0 8rpx 24rpx rgba(212, 165, 116, 0.3);
}

.share-btn.secondary text {
  font-size: 28rpx;
  color: #FFFFFF;
  font-weight: 500;
  margin-left: 12rpx;
}

.share-btn.tertiary {
  background: #FFFFFF;
  border: 2rpx solid #D4A574;
  width: 100%;
}

.share-btn.tertiary text {
  font-size: 28rpx;
  color: #3D2914;
  font-weight: 500;
  margin-left: 12rpx;
}

.btn-icon {
  width: 40rpx;
  height: 40rpx;
}

.btn-icon-secondary {
  width: 36rpx;
  height: 36rpx;
}

/* 海报预览 */
.poster-preview {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.poster-mask {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
}

.poster-content {
  position: relative;
  z-index: 1;
  width: 80%;
  max-width: 600rpx;
}

.poster-image {
  width: 100%;
  border-radius: 24rpx;
  margin-bottom: 40rpx;
}

.poster-actions {
  display: flex;
  gap: 24rpx;
}

.poster-btn {
  flex: 1;
  height: 90rpx;
  line-height: 90rpx;
  background: linear-gradient(135deg, #D4A574 0%, #B8935F 100%);
  color: #FFFFFF;
  font-size: 30rpx;
  font-weight: 500;
  border-radius: 45rpx;
  border: none;
}

.poster-btn::after {
  border: none;
}

.poster-btn.secondary {
  background: rgba(255, 255, 255, 0.2);
  color: #FFFFFF;
}
</style>
