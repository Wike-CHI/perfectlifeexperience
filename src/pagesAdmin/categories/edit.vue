<template>
  <view class="edit-page">
    <!-- 页面头部 -->
    <view class="page-header">
      <text class="page-title">{{ isEdit ? '编辑分类' : '添加分类' }}</text>
    </view>

    <!-- 表单 -->
    <view class="form-section">
      <view class="form-item">
        <text class="form-label">分类名称 *</text>
        <input
          class="form-input"
          v-model="form.name"
          placeholder="请输入分类名称"
        />
      </view>

      <view class="form-item">
        <text class="form-label">图标</text>
        <input
          class="form-input"
          v-model="form.icon"
          placeholder="请输入图标emoji或图片URL"
        />
        <text class="form-tip">支持emoji或图片URL，如: 🍺</text>
      </view>

      <view class="form-item">
        <text class="form-label">排序</text>
        <input
          class="form-input"
          v-model.number="form.sort"
          type="number"
          placeholder="数字越小越靠前"
        />
        <text class="form-tip">数字越小越靠前，默认为0</text>
      </view>

      <view class="form-item">
        <view class="switch-row">
          <text class="form-label">是否启用</text>
          <switch
            :checked="form.isActive"
            @change="onSwitchChange"
            color="#C9A962"
          />
        </view>
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
import { ref, computed, onMounted } from 'vue'
import { callFunction } from '@/utils/cloudbase'
import AdminAuthManager from '@/utils/admin-auth'

const form = ref({
  name: '',
  icon: '',
  sort: 0,
  isActive: true
})

const categoryId = ref('')
const loading = ref(false)

const isEdit = computed(() => !!categoryId.value)

onMounted(() => {
  // 获取页面参数
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1] as any
  const options = currentPage?.options || {}

  if (options.id) {
    categoryId.value = options.id
    loadDetail(options.id)
  }
})

const loadDetail = async (id: string) => {
  loading.value = true
  try {
    const res = await callFunction('admin-api', {
      action: 'getCategoryDetail',
      adminToken: AdminAuthManager.getToken(),
      data: { id }
    })

    if (res.code === 0 && res.data) {
      form.value = {
        name: res.data.name || '',
        icon: res.data.icon || '',
        sort: res.data.sort || 0,
        isActive: res.data.isActive !== false
      }
    }
  } catch (error) {
    console.error('加载分类详情失败:', error)
    uni.showToast({
      title: '加载失败',
      icon: 'none'
    })
  } finally {
    loading.value = false
  }
}

const onSwitchChange = (e: any) => {
  form.value.isActive = e.detail.value
}

const handleCancel = () => {
  uni.navigateBack()
}

const handleSave = async () => {
  if (!form.value.name.trim()) {
    uni.showToast({
      title: '请输入分类名称',
      icon: 'none'
    })
    return
  }

  uni.showModal({
    title: '确认保存',
    content: isEdit.value ? '确定要保存修改吗？' : '确定要创建分类吗？',
    success: async (res) => {
      if (res.confirm) {
        try {
          uni.showLoading({ title: '保存中...' })

          const action = isEdit.value ? 'updateCategory' : 'createCategory'
          const data = isEdit.value
            ? { id: categoryId.value, ...form.value }
            : { ...form.value }

          const res = await callFunction('admin-api', {
            action,
            adminToken: AdminAuthManager.getToken(),
            data
          })

          uni.hideLoading()

          if (res.code === 0) {
            uni.showToast({
              title: '保存成功',
              icon: 'success'
            })
            setTimeout(() => {
              uni.navigateBack()
            }, 1500)
          } else {
            throw new Error(res.msg || '保存失败')
          }
        } catch (error: any) {
          uni.hideLoading()
          console.error('保存分类失败:', error)
          uni.showToast({
            title: error.message || '保存失败',
            icon: 'none'
          })
        }
      }
    }
  })
}
</script>

<style scoped>
.edit-page {
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
  display: block;
}

.form-section {
  background: rgba(255, 255, 255, 0.03);
  border: 1rpx solid rgba(201, 169, 98, 0.1);
  border-radius: 16rpx;
  padding: 24rpx;
}

.form-item {
  margin-bottom: 32rpx;
}

.form-item:last-child {
  margin-bottom: 0;
}

.form-label {
  font-size: 26rpx;
  color: rgba(245, 245, 240, 0.6);
  display: block;
  margin-bottom: 12rpx;
}

.form-input {
  width: 100%;
  padding: 20rpx 24rpx;
  background: rgba(255, 255, 255, 0.03);
  border: 1rpx solid rgba(201, 169, 98, 0.2);
  border-radius: 12rpx;
  font-size: 28rpx;
  color: #F5F5F0;
  box-sizing: border-box;
}

.form-tip {
  font-size: 22rpx;
  color: rgba(245, 245, 240, 0.3);
  margin-top: 8rpx;
  display: block;
}

.switch-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.switch-row .form-label {
  margin-bottom: 0;
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
