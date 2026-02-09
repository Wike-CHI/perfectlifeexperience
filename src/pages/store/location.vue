<template>
  <view class="container">
    <!-- 地图组件 -->
    <map
      class="store-map"
      :latitude="storeLocation.latitude"
      :longitude="storeLocation.longitude"
      :markers="markers"
      :scale="16"
      show-location
      @markertap="onMarkerTap"
    />

    <!-- 门店信息卡片 -->
    <view class="store-card">
      <view class="store-header">
        <view class="store-logo">
          <image class="logo-image" src="/static/logo.png" mode="aspectFit" />
        </view>
        <view class="store-title">
          <text class="store-name">{{ storeInfo.name }}</text>
          <view class="store-status-row">
            <text class="store-status">营业中</text>
            <text class="store-distance">距离您最近</text>
          </view>
        </view>
      </view>

      <view class="store-info">
        <view class="info-item" @click="callStore">
          <image class="info-icon" :src="icons.phone" mode="aspectFit" />
          <text class="info-text">{{ storeInfo.phone }}</text>
          <view class="action-btn-small">
            <text class="action-text">拨打</text>
          </view>
        </view>
        <view class="info-item" @click="openLocation">
          <image class="info-icon" :src="icons.location" mode="aspectFit" />
          <text class="info-text">{{ storeInfo.address }}</text>
          <view class="action-btn-small">
            <text class="action-text">导航</text>
          </view>
        </view>
        <view class="info-item">
          <image class="info-icon" :src="icons.time" mode="aspectFit" />
          <text class="info-text">{{ storeInfo.businessHours }}</text>
        </view>
      </view>

      <!-- 操作按钮 -->
      <view class="action-buttons">
        <view class="btn-navigate" @click="openLocation" hover-class="btn-hover">
          <image class="btn-icon" :src="icons.navigation" mode="aspectFit" />
          <text class="btn-text">导航到店</text>
        </view>
      </view>
    </view>

    <!-- 返回按钮 -->
    <view class="back-btn" @click="goBack" hover-class="btn-hover-light">
      <image class="back-icon" :src="icons.back" mode="aspectFit" />
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';

// 图标资源 (SVG Base64)
const icons = {
  phone: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjNkI1QjRGIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTIyIDE2.OTJ2M2EyIDIgMCAwIDEtMi4xOCAyIDE5Ljc5IDE5Ljc5IDAgMCAxLTguNjMtMy4wNyAxOS41IDE5LjUgMCAwIDEtNi02IDE5Ljc5IDE5Ljc5IDAgMCAxLTMuMDctOC42N0EyIDIgMCAwIDEgNC4xMSAyaDNhMiAyIDAgMCAxIDIgMS43MmMuMS43MS41NyAyLjM4IDEgMy4xMWEyIDIgMCAwIDEtLjQ1IDIuMTFsLTIuMiAyLjJhMTYgMTYgMCAwIDAgNiA2bDIuMi0yLjJhMiAyIDAgMCAxIDIuMTEtLjQ1YzcuNzMuNDMgMS40IDEuMDUgMi4xMyAxYTIgMiAwIDAgMSAxLjcyIDJ6Ij48L3BhdGg+PC9zdmc+',
  location: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjNkI1QjRGIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTIxIDEwYzAgNy05IDEzLTkgMTNzLTktNi05LTEzYSA5IDkgMCAwIDEgMTggMHoiPjwvcGF0aD48Y2lyY2xlIGN4PSIxMiIgY3k9IjEwIiByPSIzIj48L2NpcmNsZT48L3N2Zz4=',
  time: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjNkI1QjRGIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iMTAiPjwvY2lyY2xlPjxwb2x5bGluZSBwb2ludHM9IjEyIDYgMTIgMTIgMTYgMTQiPjwvcG9seWxpbmU+PC9zdmc+',
  navigation: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iI2ZmZmZmZiI+PHBhdGggZD0iTTEyIDJMNCAyMC41bDguNS0zLjU4LjUtLjMuNS4zIDguNSAzLjU4TDEyIDJ6Ii8+PC9zdmc+',
  back: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjM0QyOTE0IiBzdHJva2Utd2lkdGg9IjIuNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cG9seWxpbmUgcG9pbnRzPSIxNSAxOCA5IDEyIDE1IDYiPjwvcG9seWxpbmU+PC9zdmc+'
};

// 门店位置信息（瑞安店示例坐标）
const storeLocation = ref({
  latitude: 27.744734,
  longitude: 120.660902
});

// 门店详细信息
const storeInfo = ref({
  name: '大友元气精酿啤酒屋',
  phone: '0577-66668888',
  address: '浙江省温州市瑞安市瑞光大道1308号德信铂瑞湾二期30楼05-06',
  businessHours: '周一至周日 10:00 - 22:00'
});

// 地图标记点
const markers = ref([
  {
    id: 1,
    latitude: 27.744734,
    longitude: 120.660902,
    title: '大友元气精酿啤酒屋',
    iconPath: '/static/icons/marker.png',
    width: 40,
    height: 40,
    callout: {
      content: '大友元气精酿啤酒屋',
      color: '#3D2914',
      fontSize: 14,
      borderRadius: 8,
      bgColor: '#FFFFFF',
      padding: 8,
      display: 'ALWAYS'
    }
  }
]);

// 点击标记点
const onMarkerTap = (e: any) => {
  console.log('标记点被点击:', e);
};

// 打开地图导航
const openLocation = () => {
  uni.openLocation({
    latitude: storeLocation.value.latitude,
    longitude: storeLocation.value.longitude,
    name: storeInfo.value.name,
    address: storeInfo.value.address,
    success: () => {
      console.log('打开地图成功');
    },
    fail: (err) => {
      console.error('打开地图失败:', err);
      uni.showToast({
        title: '打开地图失败',
        icon: 'none'
      });
    }
  });
};

// 拨打电话
const callStore = () => {
  uni.makePhoneCall({
    phoneNumber: storeInfo.value.phone.replace(/-/g, ''),
    success: () => {
      console.log('拨打电话成功');
    },
    fail: (err) => {
      console.error('拨打电话失败:', err);
    }
  });
};

// 返回上一页
const goBack = () => {
  uni.navigateBack();
};
</script>

<style scoped>
.container {
  position: relative;
  width: 100%;
  height: 100vh;
  background-color: #FDF8F3;
}

/* 地图样式 */
.store-map {
  width: 100%;
  height: 70%;
}

/* 门店信息卡片 */
.store-card {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: #FFFFFF;
  border-radius: 32rpx 32rpx 0 0;
  padding: 40rpx 40rpx 60rpx; /* 底部增加 padding 适配安全区 */
  box-shadow: 0 -8rpx 30rpx rgba(212, 165, 116, 0.15);
  padding-bottom: calc(60rpx + constant(safe-area-inset-bottom));
  padding-bottom: calc(60rpx + env(safe-area-inset-bottom));
}

.store-header {
  display: flex;
  align-items: center;
  margin-bottom: 40rpx;
  padding-bottom: 30rpx;
  border-bottom: 1rpx solid #F5F0E8;
}

.store-logo {
  width: 96rpx;
  height: 96rpx;
  border-radius: 20rpx;
  background: linear-gradient(135deg, #D4A574 0%, #C9A962 100%);
  margin-right: 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4rpx 12rpx rgba(212, 165, 116, 0.3);
  overflow: hidden;
}

.logo-image {
  width: 100%;
  height: 100%;
}

.store-title {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.store-name {
  font-size: 34rpx;
  font-weight: bold;
  color: #3D2914;
}

.store-status-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.store-status {
  font-size: 22rpx;
  color: #52C41A;
  background: rgba(82, 196, 26, 0.1);
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
}

.store-distance {
  font-size: 22rpx;
  color: #9B8B7F;
  background: #F9F5F0;
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
}

/* 门店信息列表 */
.store-info {
  margin-bottom: 40rpx;
}

.info-item {
  display: flex;
  align-items: flex-start;
  padding: 20rpx 0;
}

.info-icon {
  width: 36rpx;
  height: 36rpx;
  margin-right: 20rpx;
  margin-top: 4rpx;
  flex-shrink: 0;
}

.info-text {
  flex: 1;
  font-size: 28rpx;
  color: #3D2914;
  line-height: 1.5;
  margin-right: 20rpx;
}

.action-btn-small {
  background: rgba(212, 165, 116, 0.1);
  padding: 8rpx 24rpx;
  border-radius: 28rpx;
  transition: all 0.3s ease;
  flex-shrink: 0;
  margin-left: auto;
}

.action-btn-small:active {
  background: rgba(212, 165, 116, 0.2);
  transform: scale(0.96);
}

.action-text {
  font-size: 24rpx;
  color: #D4A574;
  font-weight: 600;
}

/* 操作按钮 */
.action-buttons {
  display: flex;
  gap: 20rpx;
}

.btn-navigate {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16rpx;
  background: linear-gradient(135deg, #D4A574 0%, #C9A962 100%);
  padding: 32rpx 0;
  border-radius: 50rpx;
  box-shadow: 0 8rpx 20rpx rgba(212, 165, 116, 0.3);
  transition: all 0.3s ease;
}

.btn-hover {
  transform: translateY(2rpx);
  box-shadow: 0 4rpx 10rpx rgba(212, 165, 116, 0.3);
  opacity: 0.95;
}

.btn-icon {
  width: 40rpx;
  height: 40rpx;
}

.btn-text {
  font-size: 32rpx;
  font-weight: 600;
  color: #FFFFFF;
}

/* 返回按钮 */
.back-btn {
  position: absolute;
  top: calc(var(--status-bar-height) + 20rpx); /* 适配刘海屏 */
  left: 30rpx;
  width: 80rpx;
  height: 80rpx;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.1);
  z-index: 100;
  transition: all 0.3s ease;
}

.btn-hover-light {
  background: #F5F5F5;
  transform: scale(0.95);
}

.back-icon {
  width: 44rpx;
  height: 44rpx;
}
</style>
