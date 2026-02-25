<template>
  <view class="banner-edit-page">
    <!-- 页面标题 -->
    <view class="page-header">
      <text class="page-title">{{ isEdit ? '编辑Banner' : '新建Banner' }}</text>
      <view class="header-actions">
        <view class="cancel-btn" @click="goBack">
          <text class="btn-text">取消</text>
        </view>
        <view class="save-btn" @click="saveBanner">
          <text class="btn-text">{{ saving ? '保存中...' : '保存' }}</text>
        </view>
      </view>
    </view>

    <!-- 表单内容 -->
    <view class="form-content">
      <!-- 图片上传 -->
      <view class="form-section">
        <text class="section-title">Banner图片</text>
        <view class="image-uploader" @click="chooseImage">
          <image v-if="formData.image" class="uploaded-image" :src="formData.image" mode="aspectFill" />
          <view v-else class="upload-placeholder">
            <text class="upload-icon">+</text>
            <text class="upload-text">选择图片</text>
          </view>
        </view>
        <text class="section-hint">建议尺寸: 750x400，支持JPG/PNG，大小不超过2MB</text>
      </view>

      <!-- 标题 -->
      <view class="form-section">
        <text class="section-label">标题</text>
        <input
          v-model="formData.title"
          class="form-input"
          placeholder="请输入Banner标题（选填）"
          maxlength="20"
        />
      </view>

      <!-- 副标题 -->
      <view class="form-section">
        <text class="section-label">副标题</text>
        <input
          v-model="formData.subtitle"
          class="form-input"
          placeholder="请输入副标题（选填）"
          maxlength="30"
        />
      </view>

      <!-- 跳转链接 -->
      <view class="form-section">
        <text class="section-label">跳转链接</text>
        <input
          v-model="formData.link"
          class="form-input"
          placeholder="例如: /pages/product/detail?id=xxx"
        />
        <view class="link-suggestions">
          <view
            v-for="suggestion in linkSuggestions"
            :key="suggestion.link"
            class="suggestion-tag"
            @click="formData.link = suggestion.link"
          >
            <text class="suggestion-text">{{ suggestion.label }}</text>
          </view>
        </view>
      </view>

      <!-- 排序 -->
      <view class="form-section">
        <text class="section-label">排序</text>
        <input
          v-model.number="formData.sort"
          type="number"
          class="form-input"
          placeholder="数字越小越靠前"
        />
        <text class="section-hint">当前值: {{ formData.sort || 0 }}</text>
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
import { callFunction, uploadFile } from '@/utils/cloudbase'

/**
 * Banner编辑页
 */

// ==================== 数据状态 ====================

const bannerId = ref('')
const isEdit = ref(false)
const saving = ref(false)

const formData = ref({
  image: '',
  title: '',
  subtitle: '',
  link: '',
  sort: 0,
  isActive: true
})

// 链接建议
const linkSuggestions = [
  { label: '首页', link: '/pages/index/index' },
  { label: '商品列表', link: '/pages/category/category' },
  { label: '限时特惠', link: '/pages/promo/promo' },
  { label: '推广中心', link: '/pages/promotion/center' }
]

// ==================== 生命周期 ====================

onMounted(() => {
  if (!AdminAuthManager.checkAuth()) return

  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1] as any
  const options = currentPage.options || {}

  if (options.id) {
    bannerId.value = options.id
    isEdit.value = true
    loadBannerDetail()
  }
})

// ==================== 数据加载 ====================

/**
 * 加载Banner详情
 */
const loadBannerDetail = async () => {
  try {
    const res = await callFunction('admin-api', {
      action: 'getBannerDetail',
      adminToken: AdminAuthManager.getToken(),
      data: { id: bannerId.value }
    })

    if (res.code === 0 && res.data) {
      formData.value = {
        image: res.data.image || '',
        title: res.data.title || '',
        subtitle: res.data.subtitle || '',
        link: res.data.link || '',
        sort: res.data.sort || 0,
        isActive: res.data.isActive !== false
      }
    } else {
      throw new Error(res.msg || '加载失败')
    }
  } catch (error: any) {
    console.error('加载Banner详情失败:', error)
    uni.showToast({
      title: error.message || '加载失败',
      icon: 'none'
    })
  }
}

// ==================== 操作函数 ====================

/**
 * 选择图片
 */
const chooseImage = () => {
  uni.chooseImage({
    count: 1,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success: (res) => {
      const tempFilePath = res.tempFilePaths[0]
      uploadImage(tempFilePath)
    }
  })
}

/**
 * 上传图片
 */
const uploadImage = async (filePath: string) => {
  uni.showLoading({ title: '上传中...' })

  try {
    const cloudPath = `banners/${Date.now()}_${Math.random().toString(36).substr(2, 9)}.jpg`
    const res = await uploadFile(cloudPath, filePath)

    if (res.fileID) {
      formData.value.image = res.fileID
      uni.hideLoading()
      uni.showToast({
        title: '上传成功',
        icon: 'success'
      })
    } else {
      throw new Error('上传失败')
    }
  } catch (error: any) {
    console.error('上传图片失败:', error)
    uni.hideLoading()
    uni.showToast({
      title: error.message || '上传失败',
      icon: 'none'
    })
  }
}

/**
 * 保存Banner
 */
const saveBanner = async () => {
  // 表单验证
  if (!formData.value.image) {
    uni.showToast({
      title: '请上传Banner图片',
      icon: 'none'
    })
    return
  }

  try {
    saving.value = true

    const action = isEdit.value ? 'updateBanner' : 'createBanner'
    const data = isEdit.value
      ? { id: bannerId.value, ...formData.value }
      : formData.value

    const res = await callFunction('admin-api', {
      action,
      adminToken: AdminAuthManager.getToken(),
      data
    })

    if (res.code === 0) {
      uni.showToast({
        title: isEdit.value ? '更新成功' : '创建成功',
        icon: 'success',
        duration: 1500
      })

      setTimeout(() => {
        goBack()
      }, 1500)
    } else {
      throw new Error(res.msg || '保存失败')
    }
  } catch (error: any) {
    console.error('保存Banner失败:', error)
    uni.showToast({
      title: error.message || '保存失败',
      icon: 'none'
    })
  } finally {
    saving.value = false
  }
}

/**
 * 返回上一页
 */
const goBack = () => {
  uni.navigateBack()
}
</script>

<style scoped>
.banner-edit-page {
  min-height: 100vh;
  background: #0D0D0D;
  padding-bottom: 120rpx;
}

/* 页面头部 */
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

/* 表单内容 */
.form-content {
  padding: 24rpx;
}

.form-section {
  margin-bottom: 32rpx;
}

.section-title {
  display: block;
  font-size: 28rpx;
  color: #F5F5F0;
  font-weight: 600;
  margin-bottom: 16rpx;
}

.section-label {
  display: block;
  font-size: 26rpx;
  color: rgba(245, 245, 240, 0.8);
  margin-bottom: 12rpx;
}

.section-hint {
  display: block;
  font-size: 22rpx;
  color: rgba(245, 245, 240, 0.4);
  margin-top: 8rpx;
}

/* 图片上传 */
.image-uploader {
  width: 100%;
  height: 360rpx;
  background: rgba(255, 255, 255, 0.03);
  border: 2rpx dashed rgba(201, 169, 98, 0.3);
  border-radius: 16rpx;
  overflow: hidden;
}

.uploaded-image {
  width: 100%;
  height: 100%;
}

.upload-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
}

.upload-icon {
  font-size: 64rpx;
  color: rgba(201, 169, 98, 0.5);
}

.upload-text {
  font-size: 26rpx;
  color: rgba(201, 169, 98, 0.5);
}

/* 表单输入 */
.form-input {
  width: 100%;
  padding: 20rpx;
  background: rgba(255, 255, 255, 0.03);
  border: 1rpx solid rgba(201, 169, 98, 0.15);
  border-radius: 12rpx;
  font-size: 28rpx;
  color: #F5F5F0;
}

/* 链接建议 */
.link-suggestions {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-top: 12rpx;
}

.suggestion-tag {
  padding: 8rpx 20rpx;
  background: rgba(201, 169, 98, 0.1);
  border: 1rpx solid rgba(201, 169, 98, 0.2);
  border-radius: 20rpx;
}

.suggestion-text {
  font-size: 24rpx;
  color: #C9A962;
}

/* 开关 */
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
