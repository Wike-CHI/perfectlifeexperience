<template>
  <view class="supplier-edit-page">
    <view class="page-title">{{ isEdit ? '编辑供应商' : '添加供应商' }}</view>

    <view class="form">
      <!-- 供应商名称 -->
      <view class="form-item">
        <text class="label required">供应商名称</text>
        <input
          class="input"
          v-model="formData.name"
          placeholder="请输入供应商名称"
          maxlength="50"
        />
      </view>

      <!-- 联系人 -->
      <view class="form-item">
        <text class="label">联系人</text>
        <input
          class="input"
          v-model="formData.contactPerson"
          placeholder="请输入联系人姓名"
          maxlength="20"
        />
      </view>

      <!-- 联系电话 -->
      <view class="form-item">
        <text class="label">联系电话</text>
        <input
          class="input"
          v-model="formData.phone"
          placeholder="请输入联系电话"
          type="tel"
          maxlength="20"
        />
      </view>

      <!-- 地址 -->
      <view class="form-item">
        <text class="label">地址</text>
        <textarea
          class="textarea"
          v-model="formData.address"
          placeholder="请输入供应商地址"
          maxlength="200"
          :auto-height="true"
        />
      </view>

      <!-- 开户行 -->
      <view class="form-item">
        <text class="label">开户行</text>
        <input
          class="input"
          v-model="formData.bankName"
          placeholder="请输入开户行"
          maxlength="50"
        />
      </view>

      <!-- 银行账号 -->
      <view class="form-item">
        <text class="label">银行账号</text>
        <input
          class="input"
          v-model="formData.bankAccount"
          placeholder="请输入银行账号"
          maxlength="30"
        />
      </view>

      <!-- 状态（编辑模式显示） -->
      <view v-if="isEdit" class="form-item">
        <text class="label">状态</text>
        <view class="status-switch">
          <view
            :class="['status-option', { active: formData.status === 'active' }]"
            @click="formData.status = 'active'"
          >
            正常
          </view>
          <view
            :class="['status-option', { active: formData.status === 'inactive' }]"
            @click="formData.status = 'inactive'"
          >
            停用
          </view>
        </view>
      </view>

      <!-- 备注 -->
      <view class="form-item">
        <text class="label">备注</text>
        <textarea
          class="textarea"
          v-model="formData.remark"
          placeholder="请输入备注信息"
          maxlength="500"
          :auto-height="true"
        />
      </view>
    </view>

    <!-- 操作按钮 -->
    <view class="action-buttons">
      <button class="btn-cancel" @click="handleCancel">取消</button>
      <button class="btn-submit" :loading="submitting" @click="handleSubmit">
        {{ isEdit ? '保存' : '创建' }}
      </button>
    </view>

    <!-- 删除按钮（编辑模式显示） -->
    <view v-if="isEdit" class="delete-section">
      <button class="btn-delete" @click="handleDelete">删除供应商</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { callFunction } from '@/utils/cloudbase'
import AdminAuthManager from '@/utils/admin-auth'

// 状态
const isEdit = ref(false)
const supplierId = ref('')
const submitting = ref(false)

// 表单数据
const formData = ref({
  name: '',
  contactPerson: '',
  phone: '',
  address: '',
  bankName: '',
  bankAccount: '',
  status: 'active',
  remark: ''
})

// 生命周期
onMounted(() => {
  if (!AdminAuthManager.checkAuth()) return

  // 检查是否为编辑模式
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1] as any
  const options = currentPage.options || {}

  if (options.id) {
    isEdit.value = true
    supplierId.value = options.id
    loadSupplier()
  }
})

// 加载供应商信息
const loadSupplier = async () => {
  try {
    uni.showLoading({ title: '加载中...' })

    const res = await callFunction('admin-api', {
      action: 'getSupplierDetail',
      adminToken: AdminAuthManager.getToken(),
      data: { supplierId: supplierId.value }
    })

    uni.hideLoading()

    if (res.code === 0 && res.data) {
      formData.value = {
        name: res.data.name || '',
        contactPerson: res.data.contactPerson || '',
        phone: res.data.phone || '',
        address: res.data.address || '',
        bankName: res.data.bankName || '',
        bankAccount: res.data.bankAccount || '',
        status: res.data.status || 'active',
        remark: res.data.remark || ''
      }
    } else {
      uni.showToast({ title: res.msg || '加载失败', icon: 'none' })
    }
  } catch (e) {
    uni.hideLoading()
    console.error('加载供应商失败', e)
    uni.showToast({ title: '网络错误', icon: 'none' })
  }
}

// 取消
const handleCancel = () => {
  uni.navigateBack()
}

// 提交
const handleSubmit = async () => {
  // 验证
  if (!formData.value.name.trim()) {
    uni.showToast({ title: '请输入供应商名称', icon: 'none' })
    return
  }

  if (submitting.value) return
  submitting.value = true

  try {
    uni.showLoading({ title: isEdit.value ? '保存中...' : '创建中...' })

    const action = isEdit.value ? 'updateSupplier' : 'createSupplier'
    const data: any = { ...formData.value }

    if (isEdit.value) {
      data.supplierId = supplierId.value
    }

    const res = await callFunction('admin-api', {
      action,
      adminToken: AdminAuthManager.getToken(),
      data
    })

    uni.hideLoading()

    if (res.code === 0) {
      uni.showToast({
        title: isEdit.value ? '保存成功' : '创建成功',
        icon: 'success'
      })

      setTimeout(() => {
        uni.navigateBack()
      }, 1500)
    } else {
      uni.showToast({ title: res.msg || '操作失败', icon: 'none' })
    }
  } catch (e) {
    uni.hideLoading()
    console.error('提交失败', e)
    uni.showToast({ title: '网络错误', icon: 'none' })
  } finally {
    submitting.value = false
  }
}

// 删除
const handleDelete = async () => {
  uni.showModal({
    title: '确认删除',
    content: '确定要删除此供应商吗？删除后无法恢复。',
    confirmColor: '#B85C5C',
    success: async (result) => {
      if (result.confirm) {
        try {
          uni.showLoading({ title: '删除中...' })

          const res = await callFunction('admin-api', {
            action: 'deleteSupplier',
            adminToken: AdminAuthManager.getToken(),
            data: { supplierId: supplierId.value }
          })

          uni.hideLoading()

          if (res.code === 0) {
            uni.showToast({ title: '删除成功', icon: 'success' })
            setTimeout(() => {
              uni.navigateBack()
            }, 1500)
          } else {
            uni.showToast({ title: res.msg || '删除失败', icon: 'none' })
          }
        } catch (e) {
          uni.hideLoading()
          console.error('删除失败', e)
          uni.showToast({ title: '网络错误', icon: 'none' })
        }
      }
    }
  })
}
</script>

<style lang="scss" scoped>
.supplier-edit-page {
  min-height: 100vh;
  background: #0D0D0D;
  padding: 24rpx;
  padding-bottom: 200rpx;
}

.page-title {
  font-size: 36rpx;
  font-weight: bold;
  color: #F5F5F0;
  text-align: center;
  margin-bottom: 40rpx;
}

.form {
  background: rgba(255, 255, 255, 0.03);
  border-radius: 16rpx;
  border: 1rpx solid rgba(201, 169, 98, 0.1);
  padding: 20rpx;
}

.form-item {
  margin-bottom: 30rpx;

  &:last-child {
    margin-bottom: 0;
  }
}

.label {
  display: block;
  font-size: 26rpx;
  color: rgba(245, 245, 240, 0.7);
  margin-bottom: 16rpx;

  &.required::after {
    content: '*';
    color: #B85C5C;
    margin-left: 8rpx;
  }
}

.input {
  width: 100%;
  height: 80rpx;
  background: rgba(255, 255, 255, 0.05);
  border: 1rpx solid rgba(201, 169, 98, 0.2);
  border-radius: 8rpx;
  padding: 0 20rpx;
  font-size: 28rpx;
  color: #F5F5F0;
  box-sizing: border-box;

  &::placeholder {
    color: rgba(245, 245, 240, 0.3);
  }
}

.textarea {
  width: 100%;
  min-height: 120rpx;
  background: rgba(255, 255, 255, 0.05);
  border: 1rpx solid rgba(201, 169, 98, 0.2);
  border-radius: 8rpx;
  padding: 20rpx;
  font-size: 28rpx;
  color: #F5F5F0;
  box-sizing: border-box;

  &::placeholder {
    color: rgba(245, 245, 240, 0.3);
  }
}

.status-switch {
  display: flex;
  gap: 20rpx;
}

.status-option {
  flex: 1;
  height: 80rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.05);
  border: 1rpx solid rgba(201, 169, 98, 0.2);
  border-radius: 8rpx;
  font-size: 28rpx;
  color: rgba(245, 245, 240, 0.5);

  &.active {
    background: rgba(201, 169, 98, 0.2);
    border-color: #C9A962;
    color: #C9A962;
  }
}

.action-buttons {
  display: flex;
  gap: 20rpx;
  margin-top: 40rpx;
}

.btn-cancel {
  flex: 1;
  height: 88rpx;
  background: rgba(255, 255, 255, 0.05);
  border: 1rpx solid rgba(201, 169, 98, 0.2);
  border-radius: 8rpx;
  font-size: 30rpx;
  color: rgba(245, 245, 240, 0.7);
}

.btn-submit {
  flex: 1;
  height: 88rpx;
  background: linear-gradient(145deg, #C8A464 0%, #A88B4A 100%);
  border-radius: 8rpx;
  font-size: 30rpx;
  color: #1A1A1A;
  font-weight: bold;
}

.delete-section {
  margin-top: 40rpx;
}

.btn-delete {
  width: 100%;
  height: 88rpx;
  background: rgba(184, 92, 92, 0.1);
  border: 1rpx solid rgba(184, 92, 92, 0.3);
  border-radius: 8rpx;
  font-size: 28rpx;
  color: #B85C5C;
}
</style>
