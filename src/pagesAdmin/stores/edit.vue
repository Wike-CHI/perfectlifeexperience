<template>
  <view class="store-edit-page">
    <!-- 页面头部 -->
    <view class="page-header">
      <text class="page-title">门店管理</text>
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
        <view class="coordinate-tip">
          <text class="tip-icon">💡</text>
          <text class="tip-text">可在地图应用中获取精确坐标</text>
        </view>
      </view>
    </view>

    <!-- 地图预览 -->
    <view class="map-section" v-if="storeInfo.latitude && storeInfo.longitude">
      <view class="section-title">地图预览</view>
      <view class="map-preview">
        <map
          class="map"
          :latitude="parseFloat(storeInfo.latitude)"
          :longitude="parseFloat(storeInfo.longitude)"
          :markers="mapMarkers"
          :scale="15"
          show-location
        />
      </view>
    </view>

    <!-- 营业状态 -->
    <view class="status-section">
      <view class="section-title">营业状态</view>
      <view class="status-switch">
        <text class="status-label">{{ storeInfo.isOpen ? '营业中' : '已打烊' }}</text>
        <switch
          :checked="storeInfo.isOpen"
          @change="handleStatusChange"
          color="#C9A962"
        />
      </view>
    </view>

    <!-- 门店描述 -->
    <view class="form-section">
      <view class="section-title">门店描述</view>
      <textarea
        class="form-textarea"
        v-model="storeInfo.description"
        placeholder="请输入门店描述、交通指南等信息"
        placeholder-class="input-placeholder"
        :maxlength="500"
      />
      <view class="char-count">{{ (storeInfo.description || '').length }}/500</view>
    </view>

    <!-- 操作按钮 -->
    <view class="action-buttons">
      <button class="action-btn primary" @click="handleSave">保存更改</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { callFunction } from '@/utils/cloudbase'
import AdminAuthManager from '@/utils/admin-auth'

/**
 * 门店管理页面
 * 功能：编辑门店基本信息、位置、营业状态
 */

// 门店信息
const storeInfo = ref({
  name: '大友元气精酿啤酒总店',
  address: '',
  phone: '',
  latitude: '',
  longitude: '',
  openTime: '09:00',
  closeTime: '22:00',
  isOpen: true,
  description: ''
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
  loadStoreInfo()
})

/**
 * 加载门店信息
 */
const loadStoreInfo = async () => {
  try {
    uni.showLoading({ title: '加载中...' })

    const res = await callFunction('admin-api', {
      action: 'getStoreInfo',
      adminToken: AdminAuthManager.getToken()
    })

    uni.hideLoading()

    if (res.code === 0 && res.data) {
      storeInfo.value = {
        name: res.data.name || '大友元气精酿啤酒总店',
        address: res.data.address || '',
        phone: res.data.phone || '',
        latitude: res.data.latitude || '',
        longitude: res.data.longitude || '',
        openTime: res.data.openTime || '09:00',
        closeTime: res.data.closeTime || '22:00',
        isOpen: res.data.isOpen !== false,
        description: res.data.description || ''
      }
    }
  } catch (error: any) {
    uni.hideLoading()
    console.error('加载门店信息失败:', error)
  }
}

/**
 * 切换营业状态
 */
const handleStatusChange = (e: any) => {
  storeInfo.value.isOpen = e.detail.value
}

/**
 * 验证表单
 */
const validateForm = (): boolean => {
  if (!storeInfo.value.name?.trim()) {
    uni.showToast({
      title: '请输入门店名称',
      icon: 'none'
    })
    return false
  }

  if (!storeInfo.value.address?.trim()) {
    uni.showToast({
      title: '请输入门店地址',
      icon: 'none'
    })
    return false
  }

  if (!storeInfo.value.phone?.trim()) {
    uni.showToast({
      title: '请输入联系电话',
      icon: 'none'
    })
    return false
  }

  // 验证手机号格式
  const phoneReg = /^1[3-9]\d{9}$/
  if (!phoneReg.test(storeInfo.value.phone)) {
    uni.showToast({
      title: '请输入正确的手机号',
      icon: 'none'
    })
    return false
  }

  // 验证经纬度
  if (storeInfo.value.latitude || storeInfo.value.longitude) {
    const lat = parseFloat(storeInfo.value.latitude)
    const lng = parseFloat(storeInfo.value.longitude)

    if (isNaN(lat) || lat < -90 || lat > 90) {
      uni.showToast({
        title: '纬度范围应在-90到90之间',
        icon: 'none'
      })
      return false
    }

    if (isNaN(lng) || lng < -180 || lng > 180) {
      uni.showToast({
        title: '经度范围应在-180到180之间',
        icon: 'none'
      })
      return false
    }
  }

  return true
}

/**
 * 保存门店信息
 */
const handleSave = async () => {
  if (!validateForm()) return

  try {
    uni.showLoading({ title: '保存中...' })

    const res = await callFunction('admin-api', {
      action: 'updateStoreInfo',
      adminToken: AdminAuthManager.getToken(),
      data: {
        ...storeInfo.value,
        latitude: storeInfo.value.latitude ? parseFloat(storeInfo.value.latitude) : null,
        longitude: storeInfo.value.longitude ? parseFloat(storeInfo.value.longitude) : null
      }
    })

    uni.hideLoading()

    if (res.code === 0) {
      uni.showToast({
        title: '保存成功',
        icon: 'success'
      })
    } else {
      throw new Error(res.msg || '保存失败')
    }
  } catch (error: any) {
    uni.hideLoading()
    console.error('保存门店信息失败:', error)
    uni.showToast({
      title: error.message || '保存失败',
      icon: 'none'
    })
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

/* 页面头部 */
.page-header {
  margin-bottom: 32rpx;
}

.page-title {
  font-size: 48rpx;
  font-weight: 700;
  color: #F5F5F0;
  letter-spacing: 2rpx;
}

/* 表单区域 */
.form-section {
  background: rgba(255, 255, 255, 0.03);
  border: 1rpx solid rgba(201, 169, 98, 0.1);
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 24rpx;
}

.section-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #F5F5F0;
  margin-bottom: 24rpx;
}

.form-item {
  margin-bottom: 24rpx;
}

.form-item:last-child {
  margin-bottom: 0;
}

.form-label {
  display: block;
  font-size: 26rpx;
  color: rgba(245, 245, 240, 0.6);
  margin-bottom: 12rpx;
}

.form-input {
  width: 100%;
  padding: 20rpx;
  background: rgba(255, 255, 255, 0.03);
  border: 1rpx solid rgba(201, 169, 98, 0.2);
  border-radius: 12rpx;
  font-size: 28rpx;
  color: #F5F5F0;
}

.form-textarea {
  width: 100%;
  min-height: 160rpx;
  padding: 20rpx;
  background: rgba(255, 255, 255, 0.03);
  border: 1rpx solid rgba(201, 169, 98, 0.2);
  border-radius: 12rpx;
  font-size: 28rpx;
  color: #F5F5F0;
  line-height: 1.6;
}

.input-placeholder {
  color: rgba(245, 245, 240, 0.3);
}

.char-count {
  text-align: right;
  font-size: 22rpx;
  color: rgba(245, 245, 240, 0.3);
  margin-top: 8rpx;
}

/* 时间选择 */
.time-range {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.time-input {
  flex: 1;
  padding: 20rpx;
  background: rgba(255, 255, 255, 0.03);
  border: 1rpx solid rgba(201, 169, 98, 0.2);
  border-radius: 12rpx;
  font-size: 28rpx;
  color: #F5F5F0;
  text-align: center;
}

.time-separator {
  font-size: 24rpx;
  color: rgba(245, 245, 240, 0.5);
}

/* 坐标输入 */
.coordinate-row {
  display: flex;
  gap: 16rpx;
}

.coordinate-input-wrapper {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 16rpx 20rpx;
  background: rgba(255, 255, 255, 0.03);
  border: 1rpx solid rgba(201, 169, 98, 0.2);
  border-radius: 12rpx;
}

.coordinate-label {
  font-size: 22rpx;
  color: rgba(245, 245, 240, 0.5);
  flex-shrink: 0;
}

.coordinate-input {
  flex: 1;
  font-size: 26rpx;
  color: #F5F5F0;
}

.coordinate-tip {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin-top: 12rpx;
  padding: 12rpx 16rpx;
  background: rgba(201, 169, 98, 0.05);
  border-radius: 8rpx;
}

.tip-icon {
  font-size: 24rpx;
}

.tip-text {
  font-size: 22rpx;
  color: rgba(245, 245, 240, 0.4);
}

/* 地图预览 */
.map-section {
  background: rgba(255, 255, 255, 0.03);
  border: 1rpx solid rgba(201, 169, 98, 0.1);
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 24rpx;
}

.map-preview {
  border-radius: 12rpx;
  overflow: hidden;
  background: rgba(201, 169, 98, 0.05);
}

.map {
  width: 100%;
  height: 400rpx;
}

/* 营业状态 */
.status-section {
  background: rgba(255, 255, 255, 0.03);
  border: 1rpx solid rgba(201, 169, 98, 0.1);
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 24rpx;
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

/* 操作按钮 */
.action-buttons {
  display: flex;
  gap: 16rpx;
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

.action-btn.primary {
  background: linear-gradient(145deg, #C8A464 0%, #A88B4A 100%);
  color: #0D0D0D;
}

.action-btn.primary:active {
  opacity: 0.9;
}
</style>
