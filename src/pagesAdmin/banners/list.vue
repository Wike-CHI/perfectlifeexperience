<template>
  <view class="banners-page">
    <!-- 页面头部 -->
    <view class="page-header">
      <text class="page-title">Banner管理</text>
      <view class="header-actions">
        <view class="action-btn" @click="goToCreate">
          <text class="action-icon">+</text>
          <text class="action-text">新建Banner</text>
        </view>
      </view>
    </view>

    <!-- 筛选标签 -->
    <view class="filter-tabs">
      <view
        v-for="tab in statusTabs"
        :key="tab.value"
        class="filter-tab"
        :class="{ active: statusFilter === tab.value }"
        @click="changeStatusFilter(tab.value)"
      >
        <text class="tab-text">{{ tab.label }}</text>
        <text v-if="tab.count !== undefined" class="tab-count">{{ tab.count }}</text>
      </view>
    </view>

    <!-- Banner列表 -->
    <view class="banner-list">
      <view
        v-for="banner in banners"
        :key="banner._id"
        class="banner-item"
        @click="goToEdit(banner._id)"
      >
        <!-- Banner图片 -->
        <view class="banner-image-wrapper">
          <image class="banner-image" :src="banner.image" mode="aspectFill" />
          <view :class="['status-badge', banner.isActive ? 'active' : 'inactive']">
            <text class="status-text">{{ banner.isActive ? '启用' : '禁用' }}</text>
          </view>
        </view>

        <!-- Banner信息 -->
        <view class="banner-info">
          <text class="banner-title">{{ banner.title || '无标题' }}</text>
          <text v-if="banner.subtitle" class="banner-subtitle">{{ banner.subtitle }}</text>
          <view class="banner-meta">
            <text class="meta-item">排序: {{ banner.sort }}</text>
            <text class="meta-item">{{ formatLink(banner.link) }}</text>
          </view>
        </view>

        <!-- 操作按钮 -->
        <view class="banner-actions" @click.stop>
          <view
            class="action-btn-small"
            :class="{ active: banner.isActive }"
            @click="toggleStatus(banner)"
          >
            <text class="btn-text">{{ banner.isActive ? '禁用' : '启用' }}</text>
          </view>
          <view class="action-btn-small delete" @click="deleteBanner(banner)">
            <text class="btn-text">删除</text>
          </view>
        </view>
      </view>

      <!-- 空状态 -->
      <view v-if="banners.length === 0 && !loading" class="empty-state">
        <view class="empty-icon">🖼️</view>
        <text class="empty-text">暂无Banner</text>
        <view class="empty-action" @click="goToCreate">
          <text class="empty-action-text">创建第一个Banner</text>
        </view>
      </view>

      <!-- 加载状态 -->
      <view v-if="loading" class="loading-wrapper">
        <view class="loading-spinner"></view>
        <text class="loading-text">加载中...</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { onPullDownRefresh, onReachBottom } from '@dcloudio/uni-app'
import AdminAuthManager from '@/utils/admin-auth'
import { callFunction } from '@/utils/cloudbase'

/**
 * Banner管理列表页
 */

// ==================== 数据状态 ====================

const banners = ref<any[]>([])
const loading = ref(false)
const statusFilter = ref('all')
const page = ref(1)
const hasMore = ref(true)

// 状态筛选选项
const statusTabs = computed(() => {
  const activeCount = banners.value.filter(b => b.isActive).length
  const inactiveCount = banners.value.filter(b => !b.isActive).length

  return [
    { label: '全部', value: 'all', count: banners.value.length },
    { label: '启用', value: 'active', count: activeCount },
    { label: '禁用', value: 'inactive', count: inactiveCount }
  ]
})

// ==================== 生命周期 ====================

onMounted(() => {
  if (!AdminAuthManager.checkAuth()) return
  loadBanners()
})

onPullDownRefresh(async () => {
  page.value = 1
  hasMore.value = true
  await loadBanners()
  uni.stopPullDownRefresh()
})

onReachBottom(() => {
  if (hasMore.value && !loading.value) {
    page.value++
    loadBanners()
  }
})

// ==================== 数据加载 ====================

/**
 * 加载Banner列表
 */
const loadBanners = async () => {
  try {
    loading.value = true

    const res = await callFunction('admin-api', {
      action: 'getBanners',
      adminToken: AdminAuthManager.getToken(),
      data: {
        page: page.value,
        limit: 20,
        status: statusFilter.value === 'all' ? undefined : statusFilter.value
      }
    })

    if (res.code === 0 && res.data) {
      if (page.value === 1) {
        banners.value = res.data.list || []
      } else {
        banners.value.push(...(res.data.list || []))
      }
      hasMore.value = (res.data.list || []).length >= 20
    } else {
      throw new Error(res.msg || '加载失败')
    }
  } catch (error: any) {
    console.error('加载Banner列表失败:', error)
    uni.showToast({
      title: error.message || '加载失败',
      icon: 'none'
    })
  } finally {
    loading.value = false
  }
}

// ==================== 操作函数 ====================

/**
 * 切换状态筛选
 */
const changeStatusFilter = (status: string) => {
  statusFilter.value = status
  page.value = 1
  hasMore.value = true
  loadBanners()
}

/**
 * 切换Banner状态
 */
const toggleStatus = async (banner: any) => {
  try {
    const res = await callFunction('admin-api', {
      action: 'updateBanner',
      adminToken: AdminAuthManager.getToken(),
      data: {
        id: banner._id,
        isActive: !banner.isActive
      }
    })

    if (res.code === 0) {
      banner.isActive = !banner.isActive
      uni.showToast({
        title: banner.isActive ? '已启用' : '已禁用',
        icon: 'success'
      })
    } else {
      throw new Error(res.msg || '操作失败')
    }
  } catch (error: any) {
    console.error('切换状态失败:', error)
    uni.showToast({
      title: error.message || '操作失败',
      icon: 'none'
    })
  }
}

/**
 * 删除Banner
 */
const deleteBanner = async (banner: any) => {
  uni.showModal({
    title: '确认删除',
    content: `确定要删除Banner "${banner.title || '无标题'}" 吗？`,
    success: async (res) => {
      if (res.confirm) {
        try {
          const result = await callFunction('admin-api', {
            action: 'deleteBanner',
            adminToken: AdminAuthManager.getToken(),
            data: { id: banner._id }
          })

          if (result.code === 0) {
            banners.value = banners.value.filter(b => b._id !== banner._id)
            uni.showToast({
              title: '删除成功',
              icon: 'success'
            })
          } else {
            throw new Error(result.msg || '删除失败')
          }
        } catch (error: any) {
          console.error('删除Banner失败:', error)
          uni.showToast({
            title: error.message || '删除失败',
            icon: 'none'
          })
        }
      }
    }
  })
}

// ==================== 导航函数 ====================

/**
 * 跳转到创建页面
 */
const goToCreate = () => {
  uni.navigateTo({
    url: '/pagesAdmin/banners/edit'
  })
}

/**
 * 跳转到编辑页面
 */
const goToEdit = (id: string) => {
  uni.navigateTo({
    url: `/pagesAdmin/banners/edit?id=${id}`
  })
}

// ==================== 工具函数 ====================

/**
 * 格式化链接显示
 */
const formatLink = (link: string): string => {
  if (!link) return '无链接'
  if (link.startsWith('/pages')) {
    const pageName = link.split('/').pop()
    return `页面: ${pageName}`
  }
  return link.length > 20 ? link.substring(0, 20) + '...' : link
}
</script>

<style scoped>
.banners-page {
  min-height: 100vh;
  background: #0D0D0D;
  padding: 24rpx;
  padding-bottom: 120rpx;
}

/* 页面头部 */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24rpx;
}

.page-title {
  font-size: 48rpx;
  font-weight: 700;
  color: #F5F5F0;
  letter-spacing: 2rpx;
}

.header-actions {
  display: flex;
  gap: 16rpx;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 12rpx 24rpx;
  background: linear-gradient(145deg, #C8A464 0%, #A88B4A 100%);
  border-radius: 28rpx;
}

.action-icon {
  font-size: 32rpx;
  color: #0D0D0D;
  font-weight: 700;
}

.action-text {
  font-size: 26rpx;
  color: #0D0D0D;
  font-weight: 600;
}

/* 筛选标签 */
.filter-tabs {
  display: flex;
  gap: 16rpx;
  margin-bottom: 24rpx;
  overflow-x: auto;
}

.filter-tab {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 12rpx 28rpx;
  background: rgba(255, 255, 255, 0.03);
  border: 1rpx solid rgba(201, 169, 98, 0.15);
  border-radius: 28rpx;
  flex-shrink: 0;
}

.filter-tab.active {
  background: linear-gradient(145deg, #C8A464 0%, #A88B4A 100%);
  border-color: transparent;
}

.tab-text {
  font-size: 26rpx;
  color: rgba(245, 245, 240, 0.6);
}

.filter-tab.active .tab-text {
  color: #0D0D0D;
  font-weight: 600;
}

.tab-count {
  font-size: 22rpx;
  color: rgba(245, 245, 240, 0.6);
}

.filter-tab.active .tab-count {
  color: #0D0D0D;
}

/* Banner列表 */
.banner-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.banner-item {
  background: rgba(255, 255, 255, 0.03);
  border-radius: 16rpx;
  overflow: hidden;
  border: 1rpx solid rgba(201, 169, 98, 0.1);
}

.banner-image-wrapper {
  position: relative;
  width: 100%;
  height: 320rpx;
}

.banner-image {
  width: 100%;
  height: 100%;
}

.status-badge {
  position: absolute;
  top: 16rpx;
  right: 16rpx;
  padding: 6rpx 16rpx;
  border-radius: 8rpx;
  font-size: 22rpx;
}

.status-badge.active {
  background: rgba(122, 154, 142, 0.9);
}

.status-badge.active .status-text {
  color: #0D0D0D;
}

.status-badge.inactive {
  background: rgba(184, 92, 92, 0.9);
}

.status-badge.inactive .status-text {
  color: #FFFFFF;
}

/* Banner信息 */
.banner-info {
  padding: 20rpx;
}

.banner-title {
  display: block;
  font-size: 28rpx;
  color: #F5F5F0;
  font-weight: 600;
  margin-bottom: 8rpx;
}

.banner-subtitle {
  display: block;
  font-size: 24rpx;
  color: rgba(245, 245, 240, 0.5);
  margin-bottom: 12rpx;
}

.banner-meta {
  display: flex;
  gap: 16rpx;
}

.meta-item {
  font-size: 22rpx;
  color: rgba(245, 245, 240, 0.4);
}

/* 操作按钮 */
.banner-actions {
  display: flex;
  gap: 12rpx;
  padding: 0 20rpx 20rpx;
}

.action-btn-small {
  flex: 1;
  padding: 12rpx;
  text-align: center;
  background: rgba(201, 169, 98, 0.1);
  border: 1rpx solid rgba(201, 169, 98, 0.2);
  border-radius: 8rpx;
}

.action-btn-small.active {
  background: rgba(122, 154, 142, 0.2);
  border-color: rgba(122, 154, 142, 0.3);
}

.action-btn-small.delete {
  background: rgba(184, 92, 92, 0.1);
  border-color: rgba(184, 92, 92, 0.2);
}

.btn-text {
  font-size: 24rpx;
  color: rgba(245, 245, 240, 0.6);
}

.action-btn-small.active .btn-text {
  color: #7A9A8E;
}

.action-btn-small.delete .btn-text {
  color: #B85C5C;
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 120rpx 40rpx;
}

.empty-icon {
  font-size: 80rpx;
  margin-bottom: 24rpx;
}

.empty-text {
  font-size: 26rpx;
  color: rgba(245, 245, 240, 0.4);
  margin-bottom: 32rpx;
}

.empty-action {
  padding: 12rpx 32rpx;
  background: linear-gradient(145deg, #C8A464 0%, #A88B4A 100%);
  border-radius: 28rpx;
}

.empty-action-text {
  font-size: 26rpx;
  color: #0D0D0D;
  font-weight: 600;
}

/* 加载状态 */
.loading-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 120rpx 0;
}

.loading-spinner {
  width: 60rpx;
  height: 60rpx;
  border: 4rpx solid rgba(201, 169, 98, 0.3);
  border-top-color: #C9A962;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-bottom: 24rpx;
}

.loading-text {
  font-size: 26rpx;
  color: rgba(245, 245, 240, 0.5);
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
