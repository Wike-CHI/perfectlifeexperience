<template>
  <view class="addresses-page">
    <!-- 页面头部 -->
    <view class="page-header">
      <text class="page-title">地址管理</text>
      <view class="header-actions">
        <admin-search
          placeholder="搜索用户昵称"
          @search="handleSearch"
        />
      </view>
    </view>

    <!-- 统计摘要 -->
    <view class="summary-cards">
      <view class="summary-card">
        <text class="summary-value">{{ totalAddresses }}</text>
        <text class="summary-label">总地址数</text>
      </view>
      <view class="summary-card">
        <text class="summary-value">{{ defaultAddresses }}</text>
        <text class="summary-label">默认地址</text>
      </view>
      <view class="summary-card">
        <text class="summary-value">{{ totalUsers }}</text>
        <text class="summary-label">关联用户</text>
      </view>
    </view>

    <!-- 地址列表 -->
    <view class="addresses-list">
      <view
        v-for="item in addresses"
        :key="item._id"
        class="address-item"
        @click="showAddressDetail(item)"
      >
        <!-- 用户信息 -->
        <view class="user-info">
          <image class="user-avatar" :src="item.user?.avatarUrl" mode="aspectFill" />
          <view class="user-details">
            <text class="user-nickname">{{ item.user?.nickName || '未知用户' }}</text>
            <text class="user-openid">{{ item.user?._openid?.substring(0, 16) }}...</text>
          </view>
          <view v-if="item.isDefault" class="default-badge">默认</view>
        </view>

        <!-- 地址信息 -->
        <view class="address-content">
          <view class="contact-info">
            <text class="contact-name">{{ item.contactName }}</text>
            <text class="contact-phone">{{ item.contactPhone }}</text>
          </view>
          <view class="address-text">
            <text class="region">{{ item.province }} {{ item.city }} {{ item.district }}</text>
            <text class="detail">{{ item.detailAddress }}</text>
          </view>
          <view v-if="item.remark" class="remark">
            <text class="remark-label">备注：</text>
            <text class="remark-text">{{ item.remark }}</text>
          </view>
        </view>

        <!-- 操作按钮 -->
        <view class="address-actions" @click.stop>
          <view class="action-btn delete" @click="handleDelete(item)">
            <text class="btn-text">删除</text>
          </view>
        </view>
      </view>

      <!-- 空状态 -->
      <view v-if="addresses.length === 0 && !loading" class="empty-state">
        <text class="empty-icon">📍</text>
        <text class="empty-text">暂无地址数据</text>
      </view>

      <!-- 加载状态 -->
      <view v-if="loading" class="loading-wrapper">
        <view class="loading-spinner"></view>
        <text class="loading-text">加载中...</text>
      </view>
    </view>

    <!-- 加载更多 -->
    <view v-if="hasMore && !loading" class="load-more" @click="loadMore">
      <text class="load-more-text">加载更多</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { onPullDownRefresh, onReachBottom } from '@dcloudio/uni-app'
import AdminAuthManager from '@/utils/admin-auth'
import AdminCacheManager from '@/utils/admin-cache'
import { CACHE_CONFIG } from '@/utils/cache-config'
import { callFunction } from '@/utils/cloudbase'
import AdminSearch from '@/components/admin-search.vue'

/**
 * 地址管理页面
 * 功能：查看所有用户的地址信息、删除地址
 */

// ==================== 数据状态 ====================

const addresses = ref<any[]>([])
const loading = ref(false)
const hasMore = ref(true)
const page = ref(1)
const keyword = ref('')

// 统计数据
const totalAddresses = ref(0)
const defaultAddresses = ref(0)
const totalUsers = ref(0)

// ==================== 生命周期 ====================

onMounted(() => {
  if (!AdminAuthManager.checkAuth()) return
  loadAddresses()
})

onPullDownRefresh(async () => {
  page.value = 1
  hasMore.value = true
  await loadAddresses(true)
  uni.stopPullDownRefresh()
})

onReachBottom(() => {
  if (hasMore.value && !loading.value) {
    loadMore()
  }
})

// ==================== 数据加载 ====================

/**
 * 加载地址列表
 */
const loadAddresses = async (forceRefresh: boolean = false) => {
  if (loading.value) return

  try {
    loading.value = true

    const cacheKey = AdminCacheManager.getConfigKey('addresses', {
      keyword: keyword.value
    })

    if (!forceRefresh && page.value === 1) {
      const cached = AdminCacheManager.get(cacheKey)
      if (cached) {
        addresses.value = cached.list
        totalAddresses.value = cached.totalAddresses || 0
        defaultAddresses.value = cached.defaultAddresses || 0
        totalUsers.value = cached.totalUsers || 0
        return
      }
    }

    const res = await callFunction('admin-api', {
      action: 'getAddresses',
      adminToken: AdminAuthManager.getToken(),
      data: {
        page: page.value,
        limit: 20,
        keyword: keyword.value || undefined
      }
    })

    if (res.code === 0 && res.data) {
      const newList = res.data.list || []
      if (page.value === 1) {
        addresses.value = newList
      } else {
        addresses.value.push(...newList)
      }
      hasMore.value = newList.length >= 20

      // 更新统计
      totalAddresses.value = res.data.totalAddresses || newList.length
      defaultAddresses.value = res.data.defaultAddresses || newList.filter((a: any) => a.isDefault).length
      totalUsers.value = res.data.totalUsers || new Set(newList.map((a: any) => a.user?._openid)).size

      // 缓存第一页
      if (page.value === 1) {
        AdminCacheManager.set(cacheKey, {
          list: addresses.value,
          totalAddresses: totalAddresses.value,
          defaultAddresses: defaultAddresses.value,
          totalUsers: totalUsers.value
        }, CACHE_CONFIG.dashboard.expire)
      }
    } else {
      throw new Error(res.msg || '加载失败')
    }
  } catch (error: any) {
    console.error('加载地址列表失败:', error)
    uni.showToast({
      title: error.message || '加载失败',
      icon: 'none'
    })
  } finally {
    loading.value = false
  }
}

/**
 * 加载更多
 */
const loadMore = () => {
  page.value++
  loadAddresses()
}

/**
 * 处理搜索
 */
const handleSearch = (searchKeyword: string) => {
  keyword.value = searchKeyword
  page.value = 1
  hasMore.value = true
  addresses.value = []
  loadAddresses(true)
}

// ==================== 操作函数 ====================

/**
 * 显示地址详情
 */
const showAddressDetail = (item: any) => {
  const content = `
收货人：${item.contactName}
联系电话：${item.contactPhone}
地区：${item.province} ${item.city} ${item.district}
详细地址：${item.detailAddress}
${item.remark ? `备注：${item.remark}` : ''}
是否默认：${item.isDefault ? '是' : '否'}
  `.trim()

  uni.showModal({
    title: '地址详情',
    content,
    showCancel: false
  })
}

/**
 * 删除地址
 */
const handleDelete = (item: any) => {
  uni.showModal({
    title: '确认删除',
    content: `确定要删除 "${item.contactName}" 的地址吗？`,
    success: async (res) => {
      if (res.confirm) {
        try {
          uni.showLoading({ title: '删除中...' })

          const result = await callFunction('admin-api', {
            action: 'deleteAddress',
            adminToken: AdminAuthManager.getToken(),
            data: {
              addressId: item._id,
              openid: item.user?._openid
            }
          })

          uni.hideLoading()

          if (result.code === 0) {
            addresses.value = addresses.value.filter(a => a._id !== item._id)
            totalAddresses.value--
            if (item.isDefault) defaultAddresses.value--
            uni.showToast({
              title: '删除成功',
              icon: 'success'
            })
          } else {
            throw new Error(result.msg || '删除失败')
          }
        } catch (error: any) {
          uni.hideLoading()
          console.error('删除地址失败:', error)
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
.addresses-page {
  min-height: 100vh;
  background: #1A1A1A;
  padding: 24rpx;
  padding-bottom: 120rpx;
}

/* 页面头部 */
.page-header {
  margin-bottom: 24rpx;
}

.page-title {
  font-size: 48rpx;
  font-weight: 700;
  color: #F5F5F0;
  letter-spacing: 2rpx;
  display: block;
  margin-bottom: 20rpx;
}

.header-actions {
  display: flex;
  gap: 16rpx;
}

/* 统计卡片 */
.summary-cards {
  display: flex;
  gap: 16rpx;
  margin-bottom: 24rpx;
}

.summary-card {
  flex: 1;
  padding: 24rpx;
  background: rgba(201, 169, 98, 0.1);
  border: 1rpx solid rgba(201, 169, 98, 0.2);
  border-radius: 16rpx;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  align-items: center;
}

.summary-value {
  font-size: 40rpx;
  font-weight: 700;
  color: #C9A962;
}

.summary-label {
  font-size: 22rpx;
  color: rgba(245, 245, 240, 0.5);
}

/* 地址列表 */
.addresses-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.address-item {
  background: rgba(255, 255, 255, 0.03);
  border: 1rpx solid rgba(201, 169, 98, 0.1);
  border-radius: 16rpx;
  overflow: hidden;
}

/* 用户信息 */
.user-info {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 20rpx;
  background: rgba(201, 169, 98, 0.05);
  border-bottom: 1rpx solid rgba(201, 169, 98, 0.1);
  position: relative;
}

.user-avatar {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  background: rgba(201, 169, 98, 0.1);
}

.user-details {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.user-nickname {
  font-size: 28rpx;
  color: #F5F5F0;
  font-weight: 500;
}

.user-openid {
  font-size: 22rpx;
  color: rgba(245, 245, 240, 0.4);
}

.default-badge {
  padding: 6rpx 12rpx;
  background: rgba(122, 154, 142, 0.2);
  border: 1rpx solid rgba(122, 154, 142, 0.3);
  border-radius: 8rpx;
  font-size: 20rpx;
  color: #7A9A8E;
}

/* 地址内容 */
.address-content {
  padding: 20rpx;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.contact-info {
  display: flex;
  gap: 16rpx;
  align-items: center;
}

.contact-name {
  font-size: 28rpx;
  color: #F5F5F0;
  font-weight: 500;
}

.contact-phone {
  font-size: 26rpx;
  color: rgba(245, 245, 240, 0.6);
}

.address-text {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.region {
  font-size: 24rpx;
  color: rgba(245, 245, 240, 0.5);
}

.detail {
  font-size: 26rpx;
  color: #F5F5F0;
  line-height: 1.5;
}

.remark {
  display: flex;
  gap: 8rpx;
  padding-top: 8rpx;
  border-top: 1rpx solid rgba(245, 245, 240, 0.1);
}

.remark-label {
  font-size: 22rpx;
  color: rgba(245, 245, 240, 0.4);
}

.remark-text {
  font-size: 22rpx;
  color: rgba(245, 245, 240, 0.6);
  flex: 1;
}

/* 操作按钮 */
.address-actions {
  display: flex;
  border-top: 1rpx solid rgba(201, 169, 98, 0.1);
}

.action-btn {
  flex: 1;
  padding: 16rpx;
  text-align: center;
  font-size: 26rpx;
}

.action-btn.delete {
  color: #B85C5C;
}

.action-btn.delete:active {
  background: rgba(184, 92, 92, 0.1);
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 120rpx 0;
  gap: 24rpx;
}

.empty-icon {
  font-size: 80rpx;
  opacity: 0.3;
}

.empty-text {
  font-size: 26rpx;
  color: rgba(245, 245, 240, 0.4);
}

/* 加载状态 */
.loading-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 120rpx 0;
  gap: 24rpx;
}

.loading-spinner {
  width: 60rpx;
  height: 60rpx;
  border: 4rpx solid rgba(201, 169, 98, 0.3);
  border-top-color: #C9A962;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.loading-text {
  font-size: 26rpx;
  color: rgba(245, 245, 240, 0.5);
}

/* 加载更多 */
.load-more {
  padding: 32rpx;
  text-align: center;
}

.load-more-text {
  font-size: 26rpx;
  color: #C9A962;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
