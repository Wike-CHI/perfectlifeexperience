<template>
  <view class="store-page">
    <!-- 页面头部 -->
    <view class="page-header">
      <view class="header-left">
        <text class="page-title">门店管理</text>
        <text class="page-subtitle">管理门店信息</text>
      </view>
      <view class="header-right">
        <view class="add-btn" @click="goToEdit()">
          <AdminIcon name="plus" size="small" />
          <text>添加门店</text>
        </view>
      </view>
    </view>

    <!-- 门店列表 -->
    <view class="store-list">
      <view
        class="store-item"
        v-for="item in list"
        :key="item._id"
      >
        <view class="store-info">
          <view class="store-icon">
            <AdminIcon name="store" size="medium" />
          </view>
          <view class="store-content">
            <view class="store-name-row">
              <text class="store-name">{{ item.name }}</text>
              <text v-if="item.isDefault" class="default-tag">默认</text>
            </view>
            <text class="store-address">{{ item.address || '未设置地址' }}</text>
            <text class="store-phone">{{ item.phone || '未设置电话' }}</text>
          </view>
        </view>
        <view class="store-status">
          <text :class="['status-tag', item.isActive ? 'active' : 'inactive']">
            {{ item.isActive ? '营业中' : '已停业' }}
          </text>
        </view>
        <view class="store-actions">
          <view class="action-btn" @click="setDefault(item)" v-if="!item.isDefault">
            <AdminIcon name="check" size="small" />
          </view>
          <view class="action-btn" @click="goToEdit(item._id)">
            <AdminIcon name="edit" size="small" />
          </view>
          <view class="action-btn danger" @click="handleDelete(item)">
            <AdminIcon name="delete" size="small" />
          </view>
        </view>
      </view>

      <!-- 空状态 -->
      <view class="empty-state" v-if="list.length === 0 && !loading">
        <AdminIcon name="store" size="large" variant="muted" />
        <text class="empty-text">暂无门店</text>
        <text class="empty-hint">点击上方按钮添加第一个门店</text>
      </view>

      <!-- 加载中 -->
      <view class="loading-state" v-if="loading">
        <text>加载中...</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { callFunction } from '@/utils/cloudbase'
import AdminAuthManager from '@/utils/admin-auth'
import AdminIcon from '@/components/admin-icon.vue'

interface Store {
  _id: string
  name: string
  address: string
  phone: string
  isActive: boolean
  isDefault: boolean
}

const list = ref<Store[]>([])
const loading = ref(false)
const page = ref(1)
const limit = ref(50)
const total = ref(0)

onMounted(() => {
  loadData()
})

const loadData = async () => {
  loading.value = true
  try {
    const res = await callFunction('admin-api', {
      action: 'getStoreInfo',
      adminToken: AdminAuthManager.getToken(),
      data: {
        page: page.value,
        limit: limit.value
      }
    })

    if (res.code === 0 && res.data) {
      list.value = res.data.list || []
      total.value = res.data.total || 0
    }
  } catch (error) {
    console.error('加载门店失败:', error)
    uni.showToast({
      title: '加载失败',
      icon: 'none'
    })
  } finally {
    loading.value = false
  }
}

const goToEdit = (id?: string) => {
  const url = id ? `/pagesAdmin/stores/edit?id=${id}` : '/pagesAdmin/stores/edit'
  uni.navigateTo({ url })
}

const setDefault = (item: Store) => {
  uni.showModal({
    title: '设置默认',
    content: `确定要将"${item.name}"设为默认门店吗？`,
    success: async (res) => {
      if (res.confirm) {
        try {
          uni.showLoading({ title: '设置中...' })

          const res = await callFunction('admin-api', {
            action: 'setDefaultStore',
            adminToken: AdminAuthManager.getToken(),
            data: { id: item._id }
          })

          uni.hideLoading()

          if (res.code === 0) {
            uni.showToast({
              title: '设置成功',
              icon: 'success'
            })
            loadData()
          } else {
            throw new Error(res.msg || '设置失败')
          }
        } catch (error: any) {
          uni.hideLoading()
          console.error('设置默认门店失败:', error)
          uni.showToast({
            title: error.message || '设置失败',
            icon: 'none'
          })
        }
      }
    }
  })
}

const handleDelete = (item: Store) => {
  uni.showModal({
    title: '确认删除',
    content: `确定要删除门店"${item.name}"吗？`,
    success: async (res) => {
      if (res.confirm) {
        try {
          uni.showLoading({ title: '删除中...' })

          const res = await callFunction('admin-api', {
            action: 'deleteStore',
            adminToken: AdminAuthManager.getToken(),
            data: { id: item._id }
          })

          uni.hideLoading()

          if (res.code === 0) {
            uni.showToast({
              title: '删除成功',
              icon: 'success'
            })
            loadData()
          } else {
            throw new Error(res.msg || '删除失败')
          }
        } catch (error: any) {
          uni.hideLoading()
          console.error('删除门店失败:', error)
          uni.showToast({
            title: error.message || '删除失败',
            icon: 'none'
          })
        }
      }
    }
  })
}
</script>

<style scoped>
.store-page {
  min-height: 100vh;
  background: #1A1A1A;
  padding: 24rpx;
  padding-bottom: 120rpx;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32rpx;
}

.page-title {
  font-size: 48rpx;
  font-weight: 700;
  color: #F5F5F0;
  letter-spacing: 2rpx;
  display: block;
}

.page-subtitle {
  font-size: 24rpx;
  color: rgba(245, 245, 240, 0.5);
  margin-top: 8rpx;
  display: block;
}

.add-btn {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 16rpx 24rpx;
  background: linear-gradient(145deg, #C8A464 0%, #A88B4A 100%);
  border-radius: 12rpx;
  color: #0D0D0D;
  font-size: 26rpx;
  font-weight: 600;
}

.store-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.store-item {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 24rpx;
  background: rgba(255, 255, 255, 0.03);
  border: 1rpx solid rgba(201, 169, 98, 0.1);
  border-radius: 16rpx;
}

.store-info {
  display: flex;
  align-items: flex-start;
  gap: 16rpx;
  flex: 1;
}

.store-icon {
  width: 80rpx;
  height: 80rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(201, 169, 98, 0.1);
  border-radius: 12rpx;
  color: #C9A962;
}

.store-content {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  flex: 1;
}

.store-name-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.store-name {
  font-size: 30rpx;
  font-weight: 600;
  color: #F5F5F0;
}

.default-tag {
  padding: 4rpx 12rpx;
  background: rgba(201, 169, 98, 0.2);
  color: #C9A962;
  font-size: 20rpx;
  border-radius: 6rpx;
}

.store-address,
.store-phone {
  font-size: 24rpx;
  color: rgba(245, 245, 240, 0.4);
}

.store-status {
  margin-right: 16rpx;
}

.status-tag {
  padding: 8rpx 16rpx;
  border-radius: 8rpx;
  font-size: 22rpx;
  font-weight: 500;
}

.status-tag.active {
  background: rgba(76, 175, 80, 0.15);
  color: #4CAF50;
}

.status-tag.inactive {
  background: rgba(158, 158, 158, 0.15);
  color: #9E9E9E;
}

.store-actions {
  display: flex;
  gap: 12rpx;
}

.action-btn {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.05);
  border: 1rpx solid rgba(201, 169, 98, 0.2);
  border-radius: 12rpx;
  color: #C9A962;
}

.action-btn.danger {
  color: #F44336;
  border-color: rgba(244, 67, 54, 0.2);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 120rpx 0;
  gap: 16rpx;
}

.empty-text {
  font-size: 32rpx;
  color: rgba(245, 245, 240, 0.6);
}

.empty-hint {
  font-size: 24rpx;
  color: rgba(245, 245, 240, 0.3);
}

.loading-state {
  display: flex;
  justify-content: center;
  padding: 40rpx;
  color: rgba(245, 245, 240, 0.4);
  font-size: 26rpx;
}
</style>
