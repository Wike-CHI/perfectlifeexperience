<template>
  <view class="container">
    <view class="form-section">
      <view class="form-item">
        <text class="form-label">收货人</text>
        <input class="form-input" type="text" placeholder="请输入收货人姓名" v-model="form.name" />
      </view>
      <view class="form-item">
        <text class="form-label">手机号码</text>
        <input class="form-input" type="number" placeholder="请输入手机号码" v-model="form.phone" maxlength="11" />
      </view>
      <view class="form-item">
        <text class="form-label">所在地区</text>
        <picker mode="region" @change="onRegionChange" :value="region">
          <view class="picker-value" :class="{ placeholder: !form.province }">
            {{ regionText }}
          </view>
        </picker>
      </view>
      <view class="form-item">
        <text class="form-label">详细地址</text>
        <textarea class="form-textarea" placeholder="请输入详细地址，如街道、门牌号等" v-model="form.detail" />
      </view>
      <view class="form-item switch-item">
        <text class="form-label">设为默认地址</text>
        <switch :checked="form.isDefault" @change="onDefaultChange" color="#D4A574" />
      </view>
    </view>

    <view class="btn-save" :class="{ disabled: !canSave }" @click="saveAddress">
      <text class="btn-text">保存</text>
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

.form-label {
  width: 160rpx;
  font-size: 30rpx;
  color: #3D2914;
  flex-shrink: 0;
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
}

.picker-value.placeholder {
  color: #9B8B7F;
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
  background: #D4A574;
  border-radius: 40rpx;
  text-align: center;
}

.btn-save.disabled {
  background: #D4D4D4;
}

.btn-text {
  font-size: 32rpx;
  color: #FFFFFF;
  font-weight: 600;
}
</style>
