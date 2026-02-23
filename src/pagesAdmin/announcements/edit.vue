<template>
  <view class="announcement-edit-page">
    <view class="page-title">{{ isEdit ? '编辑公告' : '添加公告' }}</view>

    <view class="form">
      <view class="form-item">
        <text class="label">公告标题</text>
        <input class="input" v-model="formData.title" placeholder="请输入标题" />
      </view>

      <view class="form-item">
        <text class="label">公告内容</text>
        <textarea class="textarea" v-model="formData.content" placeholder="请输入内容" />
      </view>

      <view class="form-item">
        <text class="label">类型</text>
        <picker mode="selector" :range="types" @change="onTypeChange">
          <view class="picker">{{ types[typeIndex] }}</view>
        </picker>
      </view>

      <view class="form-item switch-item">
        <text class="label">立即发布</text>
        <switch :checked="formData.isActive" @change="onActiveChange" />
      </view>

      <button class="submit-btn" @click="handleSubmit">{{ isEdit ? '保存' : '创建' }}</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { callFunction } from '@/utils/cloudbase'

const isEdit = ref(false)
const announcementId = ref('')
const typeIndex = ref(0)
const types = ['系统', '推广', '优惠']

const formData = ref({
  title: '',
  content: '',
  type: 'system',
  isActive: true
})

onMounted(() => {
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1] as any
  const options = currentPage.options || {}

  if (options.id) {
    isEdit.value = true
    announcementId.value = options.id
    loadAnnouncement()
  }
})

const loadAnnouncement = async () => {
  try {
    const res = await callFunction('admin-api', {
      action: 'getAnnouncementDetail',
      data: { id: announcementId.value }
    })
    if (res.result?.code === 0 && res.result.data) {
      const data = res.result.data
      formData.value = {
        title: data.title || '',
        content: data.content || '',
        type: data.type || 'system',
        isActive: data.isActive ?? true
      }
      typeIndex.value = types.indexOf(data.type) || 0
    }
  } catch (e) {
    console.error('加载公告失败', e)
  }
}

const onTypeChange = (e: any) => {
  typeIndex.value = e.detail.value
  formData.value.type = ['system', 'promo', 'coupon'][typeIndex.value]
}

const onActiveChange = (e: any) => {
  formData.value.isActive = e.detail.value
}

const handleSubmit = async () => {
  try {
    const action = isEdit.value ? 'updateAnnouncement' : 'createAnnouncement'
    const params = isEdit.value ? { id: announcementId.value, ...formData.value } : formData.value

    const res = await callFunction('admin-api', {
      action,
      data: params
    })

    if (res.result?.code === 0) {
      uni.showToast({ title: '保存成功', icon: 'success' })
      setTimeout(() => uni.navigateBack(), 1500)
    }
  } catch (e) {
    console.error('保存失败', e)
    uni.showToast({ title: '保存失败', icon: 'none' })
  }
}
</script>

<style lang="scss" scoped>
.announcement-edit-page {
  padding: 20rpx;
}

.page-title {
  font-size: 36rpx;
  font-weight: bold;
  text-align: center;
  margin-bottom: 40rpx;
}

.form {
  background: #fff;
  border-radius: 12rpx;
  padding: 30rpx;
}

.form-item {
  margin-bottom: 30rpx;
}

.label {
  display: block;
  font-size: 28rpx;
  margin-bottom: 15rpx;
  color: #333;
}

.input {
  width: 100%;
  height: 80rpx;
  padding: 0 20rpx;
  border: 1rpx solid #ddd;
  border-radius: 8rpx;
  box-sizing: border-box;
}

.textarea {
  width: 100%;
  min-height: 200rpx;
  padding: 20rpx;
  border: 1rpx solid #ddd;
  border-radius: 8rpx;
  box-sizing: border-box;
}

.picker {
  height: 80rpx;
  padding: 0 20rpx;
  border: 1rpx solid #ddd;
  border-radius: 8rpx;
  display: flex;
  align-items: center;
}

.switch-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.submit-btn {
  width: 100%;
  height: 80rpx;
  background: #C9A962;
  color: #fff;
  border-radius: 8rpx;
  font-size: 32rpx;
}
</style>
