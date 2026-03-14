<template>
  <view class="container">
    <view class="form-section">
      <view class="form-item">
        <view class="label-wrapper">
          <svg class="form-icon user-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="8" r="3" stroke="currentColor" stroke-width="1.5"/>
            <path d="M12 13C8.13401 13 5 16.134 5 20H19C19 16.134 15.866 13 12 13Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
          </svg>
          <text class="form-label">收货人</text>
        </view>
        <input class="form-input" type="text" placeholder="请输入收货人姓名" v-model="form.name" />
      </view>
      <view class="form-item">
        <view class="label-wrapper">
          <svg class="form-icon phone-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M5 4H9C10.1046 4 11 4.89543 11 6V10C11 10.5523 10.5523 11 10 11H9C9 11 9 13 11 15C13 17 15 17 15 17V16C15 15.4477 15.4477 15 16 15H20C21.1046 15 22 15.8954 22 17V21C22 22.1046 21.1046 23 20 23C11.7157 23 5 16.2843 5 8V4Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
          </svg>
          <text class="form-label">手机号码</text>
        </view>
        <input class="form-input" type="number" placeholder="请输入手机号码" v-model="form.phone" maxlength="11" />
      </view>
      <view class="form-item">
        <view class="label-wrapper">
          <svg class="form-icon location-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" stroke="currentColor" stroke-width="1.5"/>
            <circle cx="12" cy="9" r="2.5" stroke="currentColor" stroke-width="1.5"/>
          </svg>
          <text class="form-label">所在地区</text>
        </view>
        <picker mode="region" @change="onRegionChange" :value="region">
          <view class="picker-value" :class="{ placeholder: !form.province }">
            {{ regionText }}
            <svg class="arrow-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 18L15 12L9 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </view>
        </picker>
      </view>
      <view class="form-item">
        <view class="label-wrapper">
          <svg class="form-icon address-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 5C3 3.89543 3.89543 3 5 3H19C20.1046 3 21 3.89543 21 5V19C21 20.1046 20.1046 21 19 21H5C3.89543 21 3 20.1046 3 19V5Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
            <path d="M3 9H21" stroke="currentColor" stroke-width="1.5"/>
            <path d="M9 21V9" stroke="currentColor" stroke-width="1.5"/>
          </svg>
          <text class="form-label">详细地址</text>
        </view>
        <textarea class="form-textarea" placeholder="请输入详细地址，如街道、门牌号等" v-model="form.detail" />
      </view>
      <view class="form-item switch-item">
        <view class="label-wrapper">
          <svg class="form-icon star-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
          </svg>
          <text class="form-label">设为默认地址</text>
        </view>
        <switch :checked="form.isDefault" @change="onDefaultChange" color="#D4A574" />
      </view>
    </view>

    <view class="btn-save" :class="{ disabled: !canSave }" @click="saveAddress">
      <svg class="save-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H16L21 8V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
        <path d="M17 21V13H7V21" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
        <path d="M7 3V8H15" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
      </svg>
      <text class="btn-text">保存地址</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { addAddress, updateAddress } from '@/utils/api';

// 类型定义（内联，避免分包导入问题）
interface Address {
  _id?: string
  name: string
  phone: string
  province: string
  city: string
  district: string
  detail: string
  isDefault?: boolean
}

// 表单数据
const form = ref<Address>({
  name: '',
  phone: '',
  province: '',
  city: '',
  district: '',
  detail: '',
  isDefault: false
});

const editIndex = ref(-1);
const region = ref<string[]>([]);

// 计算属性
const regionText = computed(() => {
  if (form.value.province) {
    return `${form.value.province} ${form.value.city} ${form.value.district}`;
  }
  return '请选择所在地区';
});

const canSave = computed(() => {
  return form.value.name && 
         form.value.phone && 
         form.value.province && 
         form.value.detail;
});

// 地区选择
const onRegionChange = (e: any) => {
  const value = e.detail.value;
  region.value = value;
  form.value.province = value[0];
  form.value.city = value[1];
  form.value.district = value[2];
};

// 默认地址切换
const onDefaultChange = (e: any) => {
  form.value.isDefault = e.detail.value;
};

// 保存地址
const saveAddress = async () => {
  if (!canSave.value) return;

  // 验证手机号
  if (!/^1[3-9]\d{9}$/.test(form.value.phone)) {
    uni.showToast({
      title: '手机号格式不正确',
      icon: 'none'
    });
    return;
  }

  try {
    uni.showLoading({ title: '保存中' });

    if (editIndex.value >= 0) {
      await updateAddress(editIndex.value, form.value);
    } else {
      await addAddress(form.value);
    }

    uni.hideLoading();
    uni.showToast({
      title: '保存成功',
      icon: 'success'
    });

    // 通知地址列表更新
    uni.$emit('addressUpdated');

    setTimeout(() => {
      uni.navigateBack();
    }, 1500);
  } catch (error) {
    uni.hideLoading();
    uni.showToast({
      title: '保存失败',
      icon: 'none'
    });
  }
};

// 生命周期
onLoad(() => {
  const index = uni.getStorageSync('editAddressIndex');
  const data = uni.getStorageSync('editAddressData');

  if (index >= 0 && data) {
    editIndex.value = index;
    form.value = { ...data };
    region.value = [data.province, data.city, data.district];
  }

  // 清除缓存
  uni.removeStorageSync('editAddressIndex');
  uni.removeStorageSync('editAddressData');
});
</script>

<style scoped>
.container {
  min-height: 100vh;
  background-color: #FDF8F3;
  padding: 20rpx;
}

.form-section {
  background: #FFFFFF;
  border-radius: 16rpx;
  overflow: hidden;
}

.form-item {
  display: flex;
  align-items: center;
  padding: 30rpx;
  border-bottom: 1rpx solid #F5F0E8;
}

.form-item:last-child {
  border-bottom: none;
}

.form-item.switch-item {
  justify-content: space-between;
}

.label-wrapper {
  width: 180rpx;
  display: flex;
  align-items: center;
  gap: 12rpx;
  flex-shrink: 0;
}

.form-icon {
  width: 36rpx;
  height: 36rpx;
  color: #D4A574;
  flex-shrink: 0;
}

.user-icon, .phone-icon, .location-icon, .address-icon, .star-icon {
  color: #D4A574;
}

.form-label {
  font-size: 30rpx;
  color: #3D2914;
}

.form-input {
  flex: 1;
  font-size: 30rpx;
  color: #3D2914;
}

.form-input::placeholder {
  color: #9B8B7F;
}

.picker-value {
  flex: 1;
  font-size: 30rpx;
  color: #3D2914;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.picker-value.placeholder {
  color: #9B8B7F;
}

.arrow-icon {
  width: 32rpx;
  height: 32rpx;
  color: #D4A574;
  transform: rotate(90deg);
  margin-left: 8rpx;
}

.form-textarea {
  flex: 1;
  height: 120rpx;
  font-size: 30rpx;
  color: #3D2914;
}

.form-textarea::placeholder {
  color: #9B8B7F;
}

.btn-save {
  margin-top: 40rpx;
  padding: 28rpx 0;
  background: linear-gradient(135deg, #D4A574 0%, #C9A962 100%);
  border-radius: 40rpx;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  box-shadow: 0 4rpx 12rpx rgba(212, 165, 116, 0.3);
  transition: all 0.3s ease;
}

.btn-save:active {
  transform: translateY(2rpx);
  box-shadow: 0 2rpx 8rpx rgba(212, 165, 116, 0.2);
}

.btn-save.disabled {
  background: #D4D4D4;
  box-shadow: none;
}

.save-icon {
  width: 32rpx;
  height: 32rpx;
  color: #FFFFFF;
}

.btn-text {
  font-size: 32rpx;
  color: #FFFFFF;
  font-weight: 600;
}
</style>
