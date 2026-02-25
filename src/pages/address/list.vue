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
            <text class="address-name">{{ address.name }}</text>
            <text class="address-phone">{{ address.phone }}</text>
            <view class="default-badge" v-if="address.isDefault">
              <text class="badge-text">默认</text>
            </view>
          </view>
          <text class="address-detail">{{ address.province }} {{ address.city }} {{ address.district }} {{ address.detail }}</text>
        </view>
        <view class="address-actions" v-if="!isSelectMode">
          <view class="action-btn" @click.stop="editAddress(index)">
            <text class="action-text">编辑</text>
          </view>
          <view class="action-btn delete" @click.stop="deleteAddress(index)">
            <text class="action-text">删除</text>
          </view>
        </view>
        <view class="select-icon" v-else>
          <view class="check-circle" :class="{ checked: selectedIndex === index }">
            <text v-if="selectedIndex === index" class="check-icon">&#xe6ad;</text>
          </view>
        </view>
      </view>
    </scroll-view>

    <!-- 空状态 -->
    <view class="empty-state" v-else>
      <view class="empty-icon">&#xe6a7;</view>
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
  gap: 20rpx;
  margin-bottom: 16rpx;
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
  background: #D4A574;
  padding: 4rpx 16rpx;
  border-radius: 8rpx;
}

.badge-text {
  font-size: 22rpx;
  color: #FFFFFF;
}

.address-detail {
  font-size: 28rpx;
  color: #6B5B4F;
  line-height: 1.5;
}

.address-actions {
  display: flex;
  gap: 20rpx;
  padding-top: 20rpx;
  border-top: 1rpx solid #F5F0E8;
}

.action-btn {
  padding: 12rpx 32rpx;
  border: 2rpx solid #D4A574;
  border-radius: 28rpx;
}

.action-btn.delete {
  border-color: #C44536;
}

.action-text {
  font-size: 26rpx;
  color: #D4A574;
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
  border: 2rpx solid #D4A574;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.check-circle.checked {
  background: #D4A574;
  border-color: #D4A574;
}

.check-icon {
  font-family: "iconfont";
  font-size: 24rpx;
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
  font-family: "iconfont";
  font-size: 120rpx;
  color: #D4A574;
  margin-bottom: 40rpx;
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
