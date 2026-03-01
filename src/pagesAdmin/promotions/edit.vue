<template>
  <view class="promotion-edit-page">
    <view class="page-header">
      <text class="page-title">{{ isEdit ? '编辑活动' : '新建活动' }}</text>
      <view class="header-actions">
        <view class="cancel-btn" @click="goBack">
          <text class="btn-text">取消</text>
        </view>
        <view class="save-btn" @click="savePromotion">
          <text class="btn-text">{{ saving ? '保存中...' : '保存' }}</text>
        </view>
      </view>
    </view>

    <scroll-view class="form-content" scroll-y enhanced show-scrollbar="false">
      <!-- 基本信息 -->
      <view class="form-section">
        <text class="section-label">活动名称</text>
        <input
          v-model="formData.name"
          class="form-input"
          placeholder="请输入活动名称"
          maxlength="50"
        />
      </view>

      <!-- 活动类型 -->
      <view class="form-section">
        <text class="section-label">活动类型</text>
        <view class="type-selector">
          <view
            v-for="type in promotionTypes"
            :key="type.value"
            class="type-option"
            :class="{ active: formData.type === type.value }"
            @click="formData.type = type.value"
          >
            <text class="type-text">{{ type.label }}</text>
          </view>
        </view>
      </view>

      <!-- 活动时间 -->
      <view class="form-section">
        <text class="section-label">开始时间</text>
        <picker mode="date" :value="formatDateForPicker(formData.startTime)" @change="onStartTimeChange">
          <view class="picker-input">
            <text :class="['picker-text', { placeholder: !formData.startTime }]">
              {{ formData.startTime ? formatTime(formData.startTime) : '请选择开始时间' }}
            </text>
            <AdminIcon name="calendar" size="small" />
          </view>
        </picker>
      </view>

      <view class="form-section">
        <text class="section-label">结束时间</text>
        <picker mode="date" :value="formatDateForPicker(formData.endTime)" @change="onEndTimeChange">
          <view class="picker-input">
            <text :class="['picker-text', { placeholder: !formData.endTime }]">
              {{ formData.endTime ? formatTime(formData.endTime) : '请选择结束时间' }}
            </text>
            <AdminIcon name="calendar" size="small" />
          </view>
        </picker>
      </view>

      <!-- 预算 -->
      <view class="form-section">
        <text class="section-label">活动预算（元）</text>
        <input
          v-model.number="formData.budget"
          type="digit"
          class="form-input"
          placeholder="0表示不限制预算"
        />
      </view>

      <!-- 活动描述 -->
      <view class="form-section">
        <text class="section-label">活动描述</text>
        <textarea
          v-model="formData.description"
          class="form-textarea"
          placeholder="请输入活动描述"
          maxlength="500"
        />
      </view>

      <!-- 状态 -->
      <view class="form-section">
        <text class="section-label">状态</text>
        <view class="switch-row" @click="toggleStatus">
          <text class="switch-text">{{ formData.status === 'active' ? '启用' : '草稿' }}</text>
          <view :class="['switch', { active: formData.status === 'active' }]">
            <view class="switch-dot"></view>
          </view>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import AdminAuthManager from '@/utils/admin-auth'
import AdminIcon from '@/components/admin-icon.vue'
import { callFunction } from '@/utils/cloudbase'

const promotionId = ref('')
const isEdit = ref(false)
const saving = ref(false)

const formData = ref({
  name: '',
  type: 'discount',
  startTime: '',
  endTime: '',
  budget: 0,
  description: '',
  status: 'draft'
})

const promotionTypes = [
  { label: '折扣活动', value: 'discount' },
  { label: '限时特惠', value: 'flash_sale' },
  { label: '组合优惠', value: 'bundle' }
]

onMounted(() => {
  if (!AdminAuthManager.checkAuth()) return
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1] as any
  const options = currentPage.options || {}
  if (options.id) {
    promotionId.value = options.id
    isEdit.value = true
    loadPromotionDetail()
  }
})

const loadPromotionDetail = async () => {
  try {
    const res = await callFunction('admin-api', {
      action: 'getPromotionDetail',
      adminToken: AdminAuthManager.getToken(),
      data: { id: promotionId.value }
    })
    if (res.code === 0 && res.data) {
      const promotion = res.data.promotion
      formData.value = {
        name: promotion.name || '',
        type: promotion.type || 'discount',
        startTime: promotion.startTime ? new Date(promotion.startTime).toISOString() : '',
        endTime: promotion.endTime ? new Date(promotion.endTime).toISOString() : '',
        budget: promotion.budget || 0,
        description: promotion.description || '',
        status: promotion.status || 'draft'
      }
    }
  } catch (error: any) {
    uni.showToast({ title: error.message || '加载失败', icon: 'none' })
  }
}

const savePromotion = async () => {
  if (!formData.value.name) {
    uni.showToast({ title: '请输入活动名称', icon: 'none' })
    return
  }
  if (!formData.value.startTime || !formData.value.endTime) {
    uni.showToast({ title: '请选择活动时间', icon: 'none' })
    return
  }
  if (new Date(formData.value.endTime) <= new Date(formData.value.startTime)) {
    uni.showToast({ title: '结束时间必须大于开始时间', icon: 'none' })
    return
  }

  try {
    saving.value = true
    const action = isEdit.value ? 'updatePromotion' : 'createPromotion'
    const data = {
      ...formData.value,
      startTime: new Date(formData.value.startTime),
      endTime: new Date(formData.value.endTime),
      budget: formData.value.budget ? Math.round(formData.value.budget * 100) : 0
    }
    if (isEdit.value) {
      data.id = promotionId.value
    }
    const res = await callFunction('admin-api', {
      action,
      adminToken: AdminAuthManager.getToken(),
      data
    })
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

const toggleStatus = () => {
  formData.value.status = formData.value.status === 'active' ? 'draft' : 'active'
}

const onStartTimeChange = (e: any) => {
  formData.value.startTime = new Date(e.detail.value).toISOString()
}

const onEndTimeChange = (e: any) => {
  formData.value.endTime = new Date(e.detail.value).toISOString()
}

const formatDateForPicker = (dateStr: string): string => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

const formatTime = (dateStr: string): string => {
  const date = new Date(dateStr)
  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`
}

const goBack = () => uni.navigateBack()
</script>

<style scoped>
.promotion-edit-page {
  min-height: 100vh;
  background: #0D0D0D;
  padding-bottom: 120rpx;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx;
  border-bottom: 1rpx solid rgba(201, 169, 98, 0.1);
}

.page-title {
  font-size: 36rpx;
  font-weight: 700;
  color: #F5F5F0;
}

.header-actions {
  display: flex;
  gap: 16rpx;
}

.cancel-btn,
.save-btn {
  padding: 12rpx 28rpx;
  border-radius: 28rpx;
}

.cancel-btn {
  background: rgba(255, 255, 255, 0.05);
  border: 1rpx solid rgba(201, 169, 98, 0.2);
}

.cancel-btn .btn-text {
  font-size: 26rpx;
  color: rgba(245, 245, 240, 0.6);
}

.save-btn {
  background: linear-gradient(145deg, #C8A464 0%, #A88B4A 100%);
}

.save-btn .btn-text {
  font-size: 26rpx;
  color: #0D0D0D;
  font-weight: 600;
}

.form-content {
  height: calc(100vh - 100rpx);
  padding: 24rpx;
}

.form-section {
  margin-bottom: 32rpx;
}

.section-label {
  display: block;
  font-size: 26rpx;
  color: rgba(245, 245, 240, 0.8);
  margin-bottom: 12rpx;
}

.form-input {
  width: 100%;
  padding: 20rpx;
  background: rgba(255, 255, 255, 0.03);
  border: 1rpx solid rgba(201, 169, 98, 0.15);
  border-radius: 12rpx;
  font-size: 28rpx;
  color: #F5F5F0;
}

.form-textarea {
  width: 100%;
  min-height: 200rpx;
  padding: 20rpx;
  background: rgba(255, 255, 255, 0.03);
  border: 1rpx solid rgba(201, 169, 98, 0.15);
  border-radius: 12rpx;
  font-size: 28rpx;
  color: #F5F5F0;
}

.type-selector {
  display: flex;
  gap: 12rpx;
}

.type-option {
  padding: 12rpx 24rpx;
  background: rgba(255, 255, 255, 0.03);
  border: 1rpx solid rgba(201, 169, 98, 0.15);
  border-radius: 20rpx;
}

.type-option.active {
  background: linear-gradient(145deg, #C8A464 0%, #A88B4A 100%);
  border-color: transparent;
}

.type-text {
  font-size: 24rpx;
  color: rgba(245, 245, 240, 0.6);
}

.type-option.active .type-text {
  color: #0D0D0D;
  font-weight: 600;
}

.picker-input {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20rpx;
  background: rgba(255, 255, 255, 0.03);
  border: 1rpx solid rgba(201, 169, 98, 0.15);
  border-radius: 12rpx;
}

.picker-text {
  font-size: 28rpx;
  color: #F5F5F0;
}

.picker-text.placeholder {
  color: rgba(245, 245, 240, 0.3);
}

.switch-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20rpx;
  background: rgba(255, 255, 255, 0.03);
  border: 1rpx solid rgba(201, 169, 98, 0.15);
  border-radius: 12rpx;
}

.switch-text {
  font-size: 28rpx;
  color: #F5F5F0;
}

.switch {
  width: 88rpx;
  height: 48rpx;
  background: rgba(184, 92, 92, 0.3);
  border-radius: 24rpx;
  position: relative;
  transition: all 0.3s;
}

.switch.active {
  background: rgba(122, 154, 142, 0.5);
}

.switch-dot {
  position: absolute;
  top: 4rpx;
  left: 4rpx;
  width: 40rpx;
  height: 40rpx;
  background: #F5F5F0;
  border-radius: 50%;
  transition: all 0.3s;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.3);
}

.switch.active .switch-dot {
  left: 44rpx;
}
</style>
