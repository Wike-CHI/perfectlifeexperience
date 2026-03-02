<template>
  <view class="suppliers-page">
    <!-- 页面头部 -->
    <view class="page-header">
      <text class="page-title">供应商管理</text>
      <view class="add-btn" @click="goToAdd">
        <text class="add-icon">+</text>
        <text class="add-text">添加供应商</text>
      </view>
    </view>

    <!-- 搜索组件 -->
    <admin-search
      placeholder="搜索供应商名称"
      :show-filter="false"
      @search="handleSearch"
    />

    <!-- 供应商列表 -->
    <view class="suppliers-list">
      <view
        v-for="supplier in suppliers"
        :key="supplier._id"
        class="supplier-item"
        @click="goToEdit(supplier._id)"
      >
        <view class="supplier-info">
          <view class="supplier-header">
            <text class="supplier-name">{{ supplier.name }}</text>
            <view :class="['status-badge', supplier.status]">
              {{ supplier.status === 'active' ? '正常' : '停用' }}
            </view>
          </view>
          <view class="supplier-detail">
            <text class="detail-item">联系人: {{ supplier.contactPerson || '-' }}</text>
            <text class="detail-item">电话: {{ supplier.phone || '-' }}</text>
          </view>
        </view>
        <view class="supplier-actions">
          <text class="action-arrow">›</text>
        </view>
      </view>

      <!-- 空状态 -->
      <view v-if="suppliers.length === 0 && !loading" class="empty-state">
        <AdminIcon name="users" size="large" />
        <text class="empty-text">暂无供应商</text>
        <text class="empty-hint">点击右上角添加供应商</text>
      </view>

      <!-- 加载状态 -->
      <view v-if="loading" class="loading-wrapper">
        <view class="loading-spinner"></view>
        <text class="loading-text">加载中...</text>
      </view>

      <!-- 加载更多 -->
      <view v-if="hasMore && !loading && suppliers.length > 0" class="load-more" @click="loadMore">
        <text class="load-more-text">加载更多</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { onPullDownRefresh, onReachBottom } from '@dcloudio/uni-app'
import { callFunction } from '@/utils/cloudbase'
import AdminAuthManager from '@/utils/admin-auth'
import AdminSearch from '@/components/admin-search.vue'
import AdminIcon from '@/components/admin-icon.vue'

// 数据状态
const suppliers = ref<any[]>([])
const loading = ref(false)
const keyword = ref('')
const page = ref(1)
const limit = 20
const hasMore = ref(true)

// 生命周期
onMounted(() => {
  if (!AdminAuthManager.checkAuth()) return
  loadSuppliers()
})

// 下拉刷新
onPullDownRefresh(async () => {
  page.value = 1
  hasMore.value = true
  await loadSuppliers()
  uni.stopPullDownRefresh()
})

// 触底加载更多
onReachBottom(() => {
  if (hasMore.value && !loading.value) {
    loadMore()
  }
})

// 加载供应商列表
const loadSuppliers = async () => {
  if (loading.value) return
  loading.value = true

  try {
    const res = await callFunction('admin-api', {
      action: 'getSuppliers',
      adminToken: AdminAuthManager.getToken(),
      data: {
        keyword: keyword.value || undefined,
        page: page.value,
        limit
      }
    })

    if (res.code === 0) {
      if (page.value === 1) {
        suppliers.value = res.data.list || []
      } else {
        suppliers.value = [...suppliers.value, ...(res.data.list || [])]
      }
      hasMore.value = res.data.hasMore
    } else {
      uni.showToast({ title: res.msg || '加载失败', icon: 'none' })
    }
  } catch (e) {
    console.error('加载供应商失败', e)
    uni.showToast({ title: '网络错误', icon: 'none' })
  } finally {
    loading.value = false
  }
}

// 搜索
const handleSearch = (searchKeyword: string) => {
  keyword.value = searchKeyword
  page.value = 1
  hasMore.value = true
  loadSuppliers()
}

// 加载更多
const loadMore = () => {
  page.value++
  loadSuppliers()
}

// 跳转添加页面
const goToAdd = () => {
  uni.navigateTo({
    url: '/pagesAdmin/suppliers/edit'
  })
}

// 跳转编辑页面
const goToEdit = (id: string) => {
  uni.navigateTo({
    url: `/pagesAdmin/suppliers/edit?id=${id}`
  })
}
</script>

<style lang="scss" scoped>
.suppliers-page {
  min-height: 100vh;
  background: #0D0D0D;
  padding: 24rpx;
  padding-bottom: 120rpx;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30rpx;
}

.page-title {
  font-size: 36rpx;
  font-weight: bold;
  color: #F5F5F0;
}

.add-btn {
  display: flex;
  align-items: center;
  gap: 8rpx;
  background: linear-gradient(145deg, #C8A464 0%, #A88B4A 100%);
  padding: 16rpx 24rpx;
  border-radius: 8rpx;
}

.add-icon {
  font-size: 28rpx;
  color: #1A1A1A;
  font-weight: bold;
}

.add-text {
  font-size: 24rpx;
  color: #1A1A1A;
}

.suppliers-list {
  margin-top: 20rpx;
}

.supplier-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 16rpx;
  border: 1rpx solid rgba(201, 169, 98, 0.1);
  padding: 30rpx;
  margin-bottom: 20rpx;
}

.supplier-info {
  flex: 1;
}

.supplier-header {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 16rpx;
}

.supplier-name {
  font-size: 30rpx;
  font-weight: bold;
  color: #F5F5F0;
}

.status-badge {
  padding: 6rpx 16rpx;
  border-radius: 6rpx;
  font-size: 20rpx;

  &.active {
    background: rgba(122, 154, 142, 0.2);
    color: #7A9A8E;
  }

  &.inactive {
    background: rgba(184, 92, 92, 0.2);
    color: #B85C5C;
  }
}

.supplier-detail {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.detail-item {
  font-size: 24rpx;
  color: rgba(245, 245, 240, 0.5);
}

.supplier-actions {
  display: flex;
  align-items: center;
}

.action-arrow {
  font-size: 36rpx;
  color: rgba(245, 245, 240, 0.3);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 100rpx 0;
}

.empty-text {
  font-size: 28rpx;
  color: rgba(245, 245, 240, 0.5);
  margin-top: 20rpx;
}

.empty-hint {
  font-size: 24rpx;
  color: rgba(245, 245, 240, 0.3);
  margin-top: 10rpx;
}

.loading-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40rpx 0;
}

.loading-spinner {
  width: 40rpx;
  height: 40rpx;
  border: 3rpx solid rgba(201, 169, 98, 0.3);
  border-top-color: #C9A962;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-text {
  font-size: 24rpx;
  color: rgba(245, 245, 240, 0.5);
  margin-top: 16rpx;
}

.load-more {
  display: flex;
  justify-content: center;
  padding: 30rpx 0;
}

.load-more-text {
  font-size: 24rpx;
  color: #C9A962;
}
</style>
