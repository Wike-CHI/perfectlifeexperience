<template>
  <view class="coupon-edit-page">
    <view class="page-header">
      <text class="page-title">{{ isEdit ? '编辑优惠券' : '新建优惠券' }}</text>
      <view class="header-actions">
        <view class="cancel-btn" @click="goBack">
          <text class="btn-text">取消</text>
        </view>
        <view class="save-btn" @click="saveCoupon">
          <text class="btn-text">{{ saving ? '保存中...' : '保存' }}</text>
        </view>
      </view>
    </view>

    <view class="form-content">
      <!-- 优惠券类型 -->
      <view class="form-section">
        <text class="section-label">优惠券类型</text>
        <view class="type-selector">
          <view
            v-for="type in couponTypes"
            :key="type.value"
            class="type-option"
            :class="{ active: formData.type === type.value }"
            @click="formData.type = type.value"
          >
            <text class="type-text">{{ type.label }}</text>
          </view>
        </view>
      </view>

      <!-- 优惠券名称 -->
      <view class="form-section">
        <text class="section-label">优惠券名称</text>
        <input v-model="formData.name" class="form-input" placeholder="请输入优惠券名称" maxlength="20" />
      </view>

      <!-- 面值/折扣 -->
      <view class="form-section">
        <text class="section-label">{{ formData.type === 'discount' ? '折扣' : '面值' }}</text>
        <input
          v-model.number="formData.value"
          type="digit"
          class="form-input"
          :placeholder="formData.type === 'discount' ? '例如: 8.8 表示8.8折' : '单位:分，例如: 1000 = 10元'"
        />
      </view>

      <!-- 使用门槛 -->
      <view class="form-section">
        <text class="section-label">使用门槛</text>
        <input
          v-model.number="formData.minAmount"
          type="digit"
          class="form-input"
          placeholder="0表示无门槛，单位:分"
        />
      </view>

      <!-- 发行数量 -->
      <view class="form-section">
        <text class="section-label">发行数量</text>
        <input v-model.number="formData.totalCount" type="number" class="form-input" placeholder="请输入发行数量" />
      </view>

      <!-- 每人限领 -->
      <view class="form-section">
        <text class="section-label">每人限领</text>
        <input v-model.number="formData.limitPerUser" type="number" class="form-input" placeholder="0表示不限领" />
      </view>

      <!-- 有效天数 -->
      <view class="form-section">
        <text class="section-label">有效天数</text>
        <input v-model.number="formData.validDays" type="number" class="form-input" placeholder="领取后多少天有效" />
      </view>

      <!-- 状态 -->
      <view class="form-section">
        <text class="section-label">状态</text>
        <view class="switch-row" @click="formData.isActive = !formData.isActive">
          <text class="switch-text">{{ formData.isActive ? '启用' : '禁用' }}</text>
          <view :class="['switch', { active: formData.isActive }]">
            <view class="switch-dot"></view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import AdminAuthManager from '@/utils/admin-auth'
import { callFunction } from '@/utils/cloudbase'

const couponId = ref('')
const isEdit = ref(false)
const saving = ref(false)

const formData = ref({
  name: '',
  type: 'amount',
  value: 0,
  minAmount: 0,
  totalCount: 1000,
  limitPerUser: 1,
  validDays: 30,
  isActive: true
})

const couponTypes = [
  { label: '满减券', value: 'amount' },
  { label: '折扣券', value: 'discount' },
  { label: '无门槛券', value: 'no_threshold' }
]

onMounted(() => {
  if (!AdminAuthManager.checkAuth()) return
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1] as any
  const options = currentPage.options || {}
  if (options.id) {
    couponId.value = options.id
    isEdit.value = true
    loadCouponDetail()
  }
})

const loadCouponDetail = async () => {
  try {
    const res = await callFunction('admin-api', {
      action: 'getCouponDetail',
      adminToken: AdminAuthManager.getToken(),
      data: { id: couponId.value }
    })
    if (res.code === 0 && res.data) {
      formData.value = { ...formData.value, ...res.data }
    }
  } catch (error: any) {
    uni.showToast({ title: error.message || '加载失败', icon: 'none' })
  }
}

const saveCoupon = async () => {
  if (!formData.value.name) {
    uni.showToast({ title: '请输入优惠券名称', icon: 'none' })
    return
  }
  if (formData.value.value <= 0) {
    uni.showToast({ title: '请输入有效面值', icon: 'none' })
    return
  }

  try {
    saving.value = true
    const action = isEdit.value ? 'updateCoupon' : 'createCoupon'
    const data = isEdit.value ? { id: couponId.value, ...formData.value } : formData.value
    const res = await callFunction('admin-api', { action, adminToken: AdminAuthManager.getToken(), data })
    if (res.code === 0) {
      uni.showToast({ title: '保存成功', icon: 'success' })
      setTimeout(goBack, 1500)
    }
  } catch (error: any) {
    uni.showToast({ title: error.message || '保存失败', icon: 'none' })
  } finally {
    saving.value = false
  }
}

const goBack = () => uni.navigateBack()
</script>

<style scoped>
.coupon-edit-page { min-height: 100vh; background: #0D0D0D; padding-bottom: 120rpx; }
.page-header { display: flex; justify-content: space-between; align-items: center; padding: 24rpx; border-bottom: 1rpx solid rgba(201, 169, 98, 0.1); }
.page-title { font-size: 36rpx; font-weight: 700; color: #F5F5F0; }
.header-actions { display: flex; gap: 16rpx; }
.cancel-btn, .save-btn { padding: 12rpx 28rpx; border-radius: 28rpx; }
.cancel-btn { background: rgba(255, 255, 255, 0.05); border: 1rpx solid rgba(201, 169, 98, 0.2); }
.cancel-btn .btn-text { font-size: 26rpx; color: rgba(245, 245, 240, 0.6); }
.save-btn { background: linear-gradient(145deg, #C8A464 0%, #A88B4A 100%); }
.save-btn .btn-text { font-size: 26rpx; color: #0D0D0D; font-weight: 600; }
.form-content { padding: 24rpx; }
.form-section { margin-bottom: 32rpx; }
.section-label { display: block; font-size: 26rpx; color: rgba(245, 245, 240, 0.8); margin-bottom: 12rpx; }
.type-selector { display: flex; gap: 12rpx; }
.type-option { padding: 12rpx 24rpx; background: rgba(255, 255, 255, 0.03); border: 1rpx solid rgba(201, 169, 98, 0.15); border-radius: 20rpx; }
.type-option.active { background: linear-gradient(145deg, #C8A464 0%, #A88B4A 100%); border-color: transparent; }
.type-text { font-size: 24rpx; color: rgba(245, 245, 240, 0.6); }
.type-option.active .type-text { color: #0D0D0D; font-weight: 600; }
.form-input { width: 100%; padding: 20rpx; background: rgba(255, 255, 255, 0.03); border: 1rpx solid rgba(201, 169, 98, 0.15); border-radius: 12rpx; font-size: 28rpx; color: #F5F5F0; }
.switch-row { display: flex; justify-content: space-between; align-items: center; padding: 20rpx; background: rgba(255, 255, 255, 0.03); border: 1rpx solid rgba(201, 169, 98, 0.15); border-radius: 12rpx; }
.switch-text { font-size: 28rpx; color: #F5F5F0; }
.switch { width: 88rpx; height: 48rpx; background: rgba(184, 92, 92, 0.3); border-radius: 24rpx; position: relative; transition: all 0.3s; }
.switch.active { background: rgba(122, 154, 142, 0.5); }
.switch-dot { position: absolute; top: 4rpx; left: 4rpx; width: 40rpx; height: 40rpx; background: #F5F5F0; border-radius: 50%; transition: all 0.3s; box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.3); }
.switch.active .switch-dot { left: 44rpx; }
</style>
