<template>
  <view class="store-edit-page">
    <!-- 页面头部 -->
    <view class="page-header">
      <text class="page-title">{{ storeId ? '编辑门店' : '添加门店' }}</text>
    </view>

    <!-- 门店信息表单 -->
    <view class="form-section">
      <view class="section-title">基本信息</view>

      <view class="form-item">
        <text class="form-label">门店名称 *</text>
        <input
          class="form-input"
          v-model="storeInfo.name"
          placeholder="请输入门店名称"
          placeholder-class="input-placeholder"
        />
      </view>

      <view class="form-item">
        <text class="form-label">门店地址 *</text>
        <textarea
          class="form-textarea"
          v-model="storeInfo.address"
          placeholder="请输入门店详细地址"
          placeholder-class="input-placeholder"
          :maxlength="200"
        />
      </view>

      <view class="form-item">
        <text class="form-label">联系电话 *</text>
        <input
          class="form-input"
          v-model="storeInfo.phone"
          placeholder="请输入联系电话"
          placeholder-class="input-placeholder"
          type="number"
        />
      </view>

      <view class="form-item">
        <text class="form-label">营业时间</text>
        <view class="time-range">
          <input
            class="time-input"
            v-model="storeInfo.openTime"
            placeholder="09:00"
            placeholder-class="input-placeholder"
          />
          <text class="time-separator">至</text>
          <input
            class="time-input"
            v-model="storeInfo.closeTime"
            placeholder="22:00"
            placeholder-class="input-placeholder"
          />
        </view>
      </view>

      <view class="form-item">
        <text class="form-label">排序</text>
        <input
          class="form-input"
          v-model.number="storeInfo.sort"
          type="number"
          placeholder="数字越小越靠前"
          placeholder-class="input-placeholder"
        />
      </view>

      <view class="form-item">
        <text class="form-label">经纬度坐标</text>
        <view class="coordinate-row">
          <view class="coordinate-input-wrapper">
            <text class="coordinate-label">纬度</text>
            <input
              class="coordinate-input"
              v-model="storeInfo.latitude"
              placeholder="例如：39.908823"
              placeholder-class="input-placeholder"
              type="digit"
            />
          </view>
          <view class="coordinate-input-wrapper">
            <text class="coordinate-label">经度</text>
            <input
              class="coordinate-input"
              v-model="storeInfo.longitude"
              placeholder="例如：116.397470"
              placeholder-class="input-placeholder"
              type="digit"
            />
          </view>
        </view>
      </view>
    </view>

    <!-- 营业状态 -->
    <view class="status-section">
      <view class="section-title">营业状态</view>
      <view class="status-switch">
        <text class="status-label">{{ storeInfo.isActive ? '营业中' : '已停业' }}</text>
        <switch
          :checked="storeInfo.isActive"
          @change="handleStatusChange"
          color="#C9A962"
        />
      </view>
    </view>

    <!-- 操作按钮 -->
    <view class="action-buttons">
      <button class="action-btn secondary" @click="handleCancel">取消</button>
      <button class="action-btn primary" @click="handleSave">保存</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { callFunction } from '@/utils/cloudbase'
import AdminAuthManager from '@/utils/admin-auth'
import AdminIcon from '@/components/admin-icon.vue'

// 门店ID
const storeId = ref('')

// 门店信息
const storeInfo = ref({
  name: '',
  address: '',
  phone: '',
  latitude: '',
  longitude: '',
  openTime: '09:00',
  closeTime: '22:00',
  isActive: true,
  sort: 0
})

// 地图标记
const mapMarkers = computed(() => {
  if (!storeInfo.value.latitude || !storeInfo.value.longitude) return []

  return [{
    id: 1,
    latitude: parseFloat(storeInfo.value.latitude),
    longitude: parseFloat(storeInfo.value.longitude),
    title: storeInfo.value.name,
    iconPath: '/static/marker.png',
    width: 30,
    height: 30
  }]
})

onMounted(() => {
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1] as any
  const options = currentPage?.options || {}

  if (options.id) {
    storeId.value = options.id
    loadStoreDetail(options.id)
  }
})

const loadStoreDetail = async (id: string) => {
  try {
    uni.showLoading({ title: '加载中...' })

    const res = await callFunction('admin-api', {
      action: 'getStoreDetail',
      adminToken: AdminAuthManager.getToken(),
      data: { id }
    })

    uni.hideLoading()

    if (res.code === 0 && res.data) {
      const bh = res.data.businessHours || ''
      storeInfo.value = {
        name: res.data.name || '',
        address: res.data.address || '',
        phone: res.data.phone || '',
        latitude: res.data.latitude || '',
        longitude: res.data.longitude || '',
        openTime: bh.split('-')[0] || '09:00',
        closeTime: bh.split('-')[1] || '22:00',
        isActive: res.data.isActive !== false,
        sort: res.data.sort || 0
      }
    }
  } catch (error: any) {
    uni.hideLoading()
    console.error('加载失败:', error)
  }
}

const handleStatusChange = (e: any) => {
  storeInfo.value.isActive = e.detail.value
}

const handleCancel = () => {
  uni.navigateBack()
}

const validateForm = (): boolean => {
  if (!storeInfo.value.name?.trim()) {
    uni.showToast({ title: '请输入门店名称', icon: 'none' })
    return false
  }
  if (!storeInfo.value.address?.trim()) {
    uni.showToast({ title: '请输入门店地址', icon: 'none' })
    return false
  }
  if (!storeInfo.value.phone?.trim()) {
    uni.showToast({ title: '请输入联系电话', icon: 'none' })
    return false
  }
  return true
}

const handleSave = async () => {
  if (!validateForm()) return

  try {
    uni.showLoading({ title: '保存中...' })

    const data = {
      name: storeInfo.value.name,
      address: storeInfo.value.address,
      phone: storeInfo.value.phone,
      businessHours: `${storeInfo.value.openTime}-${storeInfo.value.closeTime}`,
      latitude: storeInfo.value.latitude ? parseFloat(storeInfo.value.latitude) : '',
      longitude: storeInfo.value.longitude ? parseFloat(storeInfo.value.longitude) : '',
      isActive: storeInfo.value.isActive,
      sort: storeInfo.value.sort || 0
    }

    const action = storeId.value ? 'updateStore' : 'createStore'
    const saveData = storeId.value ? { id: storeId.value, ...data } : data

    const res = await callFunction('admin-api', {
      action,
      adminToken: AdminAuthManager.getToken(),
      data: saveData
    })

    uni.hideLoading()

    if (res.code === 0) {
      uni.showToast({ title: '保存成功', icon: 'success' })
      setTimeout(() => uni.navigateBack(), 1500)
    } else {
      throw new Error(res.msg || '保存失败')
    }
  } catch (error: any) {
    uni.hideLoading()
    console.error('保存失败:', error)
    uni.showToast({ title: error.message || '保存失败', icon: 'none' })
  }
}
</script>

<style scoped>
.store-edit-page {
  min-height: 100vh;
  background: #1A1A1A;
  padding: 24rpx;
  padding-bottom: 120rpx;
}

.page-header {
  margin-bottom: 32rpx;
}

.page-title {
  font-size: 48rpx;
  font-weight: 700;
  color: #F5F5F0;
  letter-spacing: 2rpx;
}

.form-section, .status-section {
  background: rgba(255, 255, 255, 0.03);
  border: 1rpx solid rgba(201, 169, 98, 0.1);
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 24rpx;
}

.section-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #F5F5F0;
  margin-bottom: 24rpx;
}

.form-item {
  margin-bottom: 24rpx;
}

.form-label {
  font-size: 26rpx;
  color: rgba(245, 245, 240, 0.6);
  display: block;
  margin-bottom: 12rpx;
}

.form-input, .form-textarea {
  width: 100%;
  padding: 20rpx 24rpx;
  background: rgba(255, 255, 255, 0.03);
  border: 1rpx solid rgba(201, 169, 98, 0.2);
  border-radius: 12rpx;
  font-size: 28rpx;
  color: #F5F5F0;
  box-sizing: border-box;
}

.form-textarea {
  min-height: 120rpx;
}

.time-range {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.time-input {
  flex: 1;
  padding: 16rpx 20rpx;
  background: rgba(255, 255, 255, 0.03);
  border: 1rpx solid rgba(201, 169, 98, 0.2);
  border-radius: 12rpx;
  font-size: 28rpx;
  color: #F5F5F0;
}

.time-separator {
  color: rgba(245, 245, 240, 0.4);
}

.coordinate-row {
  display: flex;
  gap: 16rpx;
}

.coordinate-input-wrapper {
  flex: 1;
}

.coordinate-label {
  font-size: 24rpx;
  color: rgba(245, 245, 240, 0.4);
  display: block;
  margin-bottom: 8rpx;
}

.coordinate-input {
  width: 100%;
  padding: 16rpx 20rpx;
  background: rgba(255, 255, 255, 0.03);
  border: 1rpx solid rgba(201, 169, 98, 0.2);
  border-radius: 12rpx;
  font-size: 28rpx;
  color: #F5F5F0;
  box-sizing: border-box;
}

.status-switch {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.status-label {
  font-size: 28rpx;
  color: #F5F5F0;
}

.action-buttons {
  display: flex;
  gap: 16rpx;
  margin-top: 48rpx;
}

.action-btn {
  flex: 1;
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 16rpx;
  font-size: 28rpx;
  font-weight: 600;
  border: none;
}

.action-btn.secondary {
  background: rgba(255, 255, 255, 0.05);
  border: 1rpx solid rgba(201, 169, 98, 0.2);
  color: #C9A962;
}

.action-btn.primary {
  background: linear-gradient(145deg, #C8A464 0%, #A88B4A 100%);
  color: #0D0D0D;
}
</style>
