<template>
  <view class="category-page">
    <!-- 页面头部 -->
    <view class="page-header">
      <view class="header-left">
        <text class="page-title">分类管理</text>
        <text class="page-subtitle">管理产品分类</text>
      </view>
      <view class="header-right">
        <view class="add-btn" @click="goToEdit()">
          <AdminIcon name="plus" size="small" />
          <text>添加分类</text>
        </view>
      </view>
    </view>

    <!-- 分类列表 -->
    <view class="category-list">
      <view
        class="category-item"
        v-for="item in list"
        :key="item._id"
      >
        <view class="category-info">
          <view class="category-icon">
            <text>{{ item.icon || '📁' }}</text>
          </view>
          <view class="category-content">
            <text class="category-name">{{ item.name }}</text>
            <text class="category-meta">排序: {{ item.sort || 0 }}</text>
          </view>
        </view>
        <view class="category-status">
          <text :class="['status-tag', item.isActive ? 'active' : 'inactive']">
            {{ item.isActive ? '启用' : '禁用' }}
          </text>
        </view>
        <view class="category-actions">
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
        <AdminIcon name="folder-open" size="large" />
        <text class="empty-text">暂无分类</text>
        <text class="empty-hint">点击上方按钮添加第一个分类</text>
      </view>

      <!-- 加载中 -->
      <view class="loading-state" v-if="loading">
        <text>加载中...</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useAdminList, useAdminAction } from '@/composables/useAdmin'
import AdminIcon from '@/components/admin-icon.vue'

interface Category {
  _id: string
  name: string
  icon: string
  sort: number
  isActive: boolean
}

/**
 * 分类管理列表页
 * 使用 useAdminList composable 简化代码
 */

// 使用 useAdminList（分类数据较少，使用较大 pageSize 一次加载）
const {
  list,
  loading,
  loadMore,
  refresh
} = useAdminList({
  action: 'getCategories',
  cachePrefix: 'categories',
  pageSize: 50,
  onLoaded: (data) => {
    console.log('分类列表加载完成', data.length)
  },
  onError: (error) => {
    console.error('加载分类失败', error)
  }
})

// 操作 Actions
const { execute: deleteCategory } = useAdminAction({
  action: 'deleteCategory',
  successMsg: '删除成功'
})

// 跳转到编辑页面
const goToEdit = (id?: string) => {
  const url = id ? `/pagesAdmin/categories/edit?id=${id}` : '/pagesAdmin/categories/edit'
  uni.navigateTo({ url })
}

// 删除分类
const handleDelete = (item: Category) => {
  uni.showModal({
    title: '确认删除',
    content: `确定要删除分类"${item.name}"吗？`,
    success: async (res) => {
      if (res.confirm) {
        try {
          await deleteCategory({ id: item._id })
          refresh()
        } catch (error) {
          // 错误已由 useAdminAction 处理
        }
      }
    }
  })
}
</script>

<style scoped>
.category-page {
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

.category-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.category-item {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 24rpx;
  background: rgba(255, 255, 255, 0.03);
  border: 1rpx solid rgba(201, 169, 98, 0.1);
  border-radius: 16rpx;
}

.category-info {
  display: flex;
  align-items: center;
  gap: 16rpx;
  flex: 1;
}

.category-icon {
  width: 80rpx;
  height: 80rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(201, 169, 98, 0.1);
  border-radius: 12rpx;
  font-size: 36rpx;
}

.category-content {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.category-name {
  font-size: 30rpx;
  font-weight: 600;
  color: #F5F5F0;
}

.category-meta {
  font-size: 24rpx;
  color: rgba(245, 245, 240, 0.4);
}

.category-status {
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

.category-actions {
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
