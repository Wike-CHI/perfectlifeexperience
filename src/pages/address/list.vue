<template>
  <view class="container">
    <!-- 地址列表 -->
    <scroll-view class="address-list" scroll-y v-if="addresses.length > 0">
      <view
        class="address-card"
        v-for="(address, index) in addresses"
        :key="index"
        :class="{ selected: isSelectMode && selectedIndex === index }"
        @click="selectAddress(index)"
      >
        <view class="address-content">
          <view class="address-header">
            <view class="user-info">
              <svg class="user-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="8" r="3" stroke="currentColor" stroke-width="1.5"/>
                <path d="M12 13C8.13401 13 5 16.134 5 20H19C19 16.134 15.866 13 12 13Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
              </svg>
              <text class="address-name">{{ address.name }}</text>
            </view>
            <view class="phone-info">
              <svg class="phone-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M5 4H9C10.1046 4 11 4.89543 11 6V10C11 10.5523 10.5523 11 10 11H9C9 11 9 13 11 15C13 17 15 17 15 17V16C15 15.4477 15.4477 15 16 15H20C21.1046 15 22 15.8954 22 17V21C22 22.1046 21.1046 23 20 23C11.7157 23 5 16.2843 5 8V4Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
              </svg>
              <text class="address-phone">{{ address.phone }}</text>
            </view>
            <view class="default-badge" v-if="address.isDefault">
              <svg class="badge-icon" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 16.17L4.83 12L3.41 13.41L9 19L21 7L19.59 5.59L9 16.17Z"/>
              </svg>
              <text class="badge-text">默认</text>
            </view>
          </view>
          <view class="address-detail">
            <svg class="location-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 21.35L10.55 20.03C5.4 15.36 2 12.27 2 8.5C2 5.41 4.42 3 7.5 3C9.24 3 10.91 3.81 12 5.08C13.09 3.81 14.76 3 16.5 3C19.58 3 22 5.41 22 8.5C22 12.27 18.6 15.36 13.45 20.03L12 21.35Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
            </svg>
            <text class="detail-text">{{ address.province }} {{ address.city }} {{ address.district }} {{ address.detail }}</text>
          </view>
        </view>
        <view class="address-actions" v-if="!isSelectMode">
          <view class="action-btn" @click.stop="editAddress(index)">
            <svg class="action-icon edit-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M11 4H4C3.46957 4 2.96086 4.21071 2.58579 4.58579C2.21071 4.96086 2 5.46957 2 6V20C2 20.5304 2.21071 21.0391 2.58579 21.4142C2.96086 21.7893 3.46957 22 4 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M18.5 2.50001C18.8978 2.10219 19.4374 1.87869 20 1.87869C20.5626 1.87869 21.1022 2.10219 21.5 2.50001C21.8978 2.89784 22.1213 3.4374 22.1213 4.00001C22.1213 4.56262 21.8978 5.10219 21.5 5.50001L12 15L8 16L9 12L18.5 2.50001Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <text class="action-text">编辑</text>
          </view>
          <view class="action-btn delete" @click.stop="deleteAddress(index)">
            <svg class="action-icon delete-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 6H5H21" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6H19Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M10 11V17" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M14 11V17" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <text class="action-text">删除</text>
          </view>
        </view>
        <view class="select-icon" v-else>
          <view class="check-circle" :class="{ checked: selectedIndex === index }">
            <svg v-if="selectedIndex === index" class="check-icon-svg" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 16.17L4.83 12L3.41 13.41L9 19L21 7L19.59 5.59L9 16.17Z"/>
            </svg>
          </view>
        </view>
      </view>
    </scroll-view>

    <!-- 空状态 -->
    <view class="empty-state" v-else>
      <svg class="empty-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 21.35L10.55 20.03C5.4 15.36 2 12.27 2 8.5C2 5.41 4.42 3 7.5 3C9.24 3 10.91 3.81 12 5.08C13.09 3.81 14.76 3 16.5 3C19.58 3 22 5.41 22 8.5C22 12.27 18.6 15.36 13.45 20.03L12 21.35Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
        <path d="M9 12L11 14L15 10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="2 2"/>
      </svg>
      <text class="empty-title">暂无收货地址</text>
      <text class="empty-desc">请添加收货地址</text>
    </view>

    <!-- 添加按钮 -->
    <view class="footer">
      <view class="btn-add" @click="addAddress">
        <text class="btn-text">+ 添加新地址</text>
      </view>
    </view>

    <!-- 安全区域 -->
    <view class="safe-area"></view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { getUserInfo, deleteAddress as apiDeleteAddress } from '@/utils/api';

// 类型定义（内联，避免分包导入问题）
interface Address {
  _id: string
  name: string
  phone: string
  province: string
  city: string
  district: string
  detail: string
  isDefault: boolean
}

// 数据
const addresses = ref<Address[]>([]);
const isSelectMode = ref(false);
const selectedIndex = ref(-1);

// 加载地址列表
const loadAddresses = async () => {
  try {
    const userInfo = await getUserInfo();
    if (userInfo && userInfo.addresses) {
      addresses.value = userInfo.addresses;
    }
  } catch (error) {
    console.error('加载地址失败:', error);
  }
};

// 选择地址
const selectAddress = (index: number) => {
  if (isSelectMode.value) {
    selectedIndex.value = index;
    // 通知订单确认页
    uni.$emit('selectAddress', addresses.value[index]);
    uni.navigateBack();
  }
};

// 添加地址
const addAddress = () => {
  uni.navigateTo({
    url: '/pages/address/edit'
  });
};

// 编辑地址
const editAddress = (index: number) => {
  uni.setStorageSync('editAddressIndex', index);
  uni.setStorageSync('editAddressData', addresses.value[index]);
  uni.navigateTo({
    url: '/pages/address/edit'
  });
};

// 删除地址
const deleteAddress = (index: number) => {
  uni.showModal({
    title: '提示',
    content: '确定要删除这个地址吗？',
    success: async (res) => {
      if (res.confirm) {
        try {
          await apiDeleteAddress(index);
          addresses.value.splice(index, 1);
          uni.showToast({
            title: '已删除',
            icon: 'success'
          });
        } catch (error) {
          uni.showToast({
            title: '删除失败',
            icon: 'none'
          });
        }
      }
    }
  });
};

// 生命周期
onLoad((options) => {
  if (options?.select === 'true') {
    isSelectMode.value = true;
  }
  loadAddresses();
});

// 监听地址更新
uni.$on('addressUpdated', () => {
  loadAddresses();
});
</script>

<style scoped>
.container {
  min-height: 100vh;
  background-color: #FDF8F3;
  padding-bottom: 140rpx;
}

/* 地址列表 */
.address-list {
  padding: 20rpx;
}

.address-card {
  background: #FFFFFF;
  border-radius: 16rpx;
  padding: 30rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 2rpx 12rpx rgba(61, 41, 20, 0.06);
}

.address-card.selected {
  border: 2rpx solid #D4A574;
}

.address-content {
  margin-bottom: 20rpx;
}

.address-header {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 20rpx;
  margin-bottom: 16rpx;
}

.user-info, .phone-info {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.user-icon, .phone-icon {
  width: 32rpx;
  height: 32rpx;
  color: #D4A574;
  flex-shrink: 0;
}

.address-name {
  font-size: 32rpx;
  font-weight: 600;
  color: #3D2914;
}

.address-phone {
  font-size: 28rpx;
  color: #6B5B4F;
}

.default-badge {
  background: linear-gradient(135deg, #D4A574 0%, #C9A962 100%);
  padding: 6rpx 16rpx;
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  gap: 6rpx;
  margin-left: auto;
}

.badge-icon {
  width: 24rpx;
  height: 24rpx;
  color: #FFFFFF;
}

.badge-text {
  font-size: 22rpx;
  color: #FFFFFF;
  font-weight: 500;
}

.address-detail {
  display: flex;
  align-items: flex-start;
  gap: 12rpx;
}

.location-icon {
  width: 32rpx;
  height: 32rpx;
  color: #D4A574;
  flex-shrink: 0;
  margin-top: 4rpx;
}

.detail-text {
  font-size: 28rpx;
  color: #6B5B4F;
  line-height: 1.6;
  flex: 1;
}

.address-actions {
  display: flex;
  gap: 20rpx;
  padding-top: 20rpx;
  border-top: 1rpx solid #F5F0E8;
}

.action-btn {
  padding: 12rpx 28rpx;
  border: 2rpx solid #D4A574;
  border-radius: 28rpx;
  display: flex;
  align-items: center;
  gap: 8rpx;
  transition: all 0.3s ease;
}

.action-btn:active {
  transform: scale(0.95);
  background: rgba(212, 165, 116, 0.1);
}

.action-btn.delete {
  border-color: #C44536;
}

.action-btn.delete:active {
  background: rgba(196, 69, 54, 0.1);
}

.action-icon {
  width: 28rpx;
  height: 28rpx;
}

.edit-icon {
  color: #D4A574;
}

.delete-icon {
  color: #C44536;
}

.action-text {
  font-size: 26rpx;
  color: #D4A574;
  font-weight: 500;
}

.action-btn.delete .action-text {
  color: #C44536;
}

.select-icon {
  display: flex;
  justify-content: flex-end;
}

.check-circle {
  width: 44rpx;
  height: 44rpx;
  border: 3rpx solid #D4A574;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}

.check-circle.checked {
  background: linear-gradient(135deg, #D4A574 0%, #C9A962 100%);
  border-color: #D4A574;
  transform: scale(1.05);
}

.check-icon-svg {
  width: 24rpx;
  height: 24rpx;
  color: #FFFFFF;
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 200rpx 40rpx;
}

.empty-icon {
  width: 160rpx;
  height: 160rpx;
  color: #D4A574;
  margin-bottom: 40rpx;
  opacity: 0.6;
}

.empty-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #3D2914;
  margin-bottom: 16rpx;
}

.empty-desc {
  font-size: 28rpx;
  color: #9B8B7F;
}

/* 底部添加按钮 */
.footer {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 20rpx 30rpx;
  background: #FFFFFF;
  border-top: 1rpx solid #F5F0E8;
}

.btn-add {
  padding: 28rpx 0;
  background: #D4A574;
  border-radius: 40rpx;
  text-align: center;
}

.btn-text {
  font-size: 32rpx;
  color: #FFFFFF;
  font-weight: 600;
}

.safe-area {
  height: constant(safe-area-inset-bottom);
  height: env(safe-area-inset-bottom);
}
</style>
