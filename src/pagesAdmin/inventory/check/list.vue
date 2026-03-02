<template>
  <view class="check-list-page">
    <!-- 页面头部 -->
    <view class="page-header">
      <text class="page-title">盘点管理</text>
      <view class="add-btn" @click="createCheck">
        <text class="add-icon">+</text>
        <text class="add-text">新建盘点</text>
      </view>
    </view>

    <!-- 状态筛选 -->
    <scroll-view class="status-scroll" scroll-x enhanced show-scrollbar="false">
      <view class="status-tabs">
        <view
          v-for="tab in statusTabs"
          :key="tab.value"
          :class="['status-tab', { active: currentStatus === tab.value }]"
          @click="changeStatus(tab.value)"
        >
          {{ tab.label }}
        </view>
      </view>
    </scroll-view>

    <!-- 盘点单列表 -->
    <view class="check-list">
      <view
        v-for="check in checks"
        :key="check._id"
        class="check-item"
        @click="goToDetail(check._id)"
      >
        <view class="check-header">
          <text class="check-no">{{ check.checkNo }}</text>
          <view :class="['check-status', check.status]">
            {{ getStatusText(check.status) }}
          </view>
        </view>

        <view class="check-info">
          <view class="info-row">
            <text class="info-label">商品数量</text>
            <text class="info-value">{{ check.items?.length || 0 }} 种</text>
          </view>
          <view class="info-row" v-if="check.status === 'completed'">
            <text class="info-label">盘盈</text>
            <text class="info-value gain">+{{ check.totalGain || 0 }}</text>
          </view>
          <view class="info-row" v-if="check.status === 'completed'">
            <text class="info-label">盘亏</text>
            <text class="info-value loss">-{{ check.totalLoss || 0 }}</text>
          </view>
          <view class="info-row">
            <text class="info-label">创建时间</text>
            <text class="info-value">{{ formatDateTime(check.createTime) }}</text>
          </view>
          <view class="info-row" v-if="check.operatorName">
            <text class="info-label">创建人</text>
            <text class="info-value">{{ check.operatorName }}</text>
          </view>
        </view>

        <view class="check-footer">
          <text class="footer-arrow">›</text>
        </view>
      </view>

      <!-- 空状态 -->
      <view v-if="checks.length === 0 && !loading" class="empty-state">
        <AdminIcon name="document" size="large" />
        <text class="empty-text">暂无盘点单</text>
        <text class="empty-hint">点击右上角新建盘点</text>
      </view>

      <!-- 加载状态 -->
      <view v-if="loading" class="loading-wrapper">
        <view class="loading-spinner"></view>
        <text class="loading-text">加载中...</text>
      </view>

      <!-- 加载更多 -->
      <view v-if="hasMore && !loading && checks.length > 0" class="load-more" @click="loadMore">
        <text class="load-more-text">加载更多</text>
      </view>
    </view>

    <!-- 新建盘点弹窗 -->
    <view v-if="showCreateModal" class="modal-mask" @click="showCreateModal = false">
      <view class="modal-content" @click.stop>
        <view class="modal-header">
          <text class="modal-title">新建盘点单</text>
          <text class="modal-close" @click="showCreateModal = false">×</text>
        </view>
        <view class="modal-body">
          <view class="option-item" @click="createCheckWithType('all')">
            <text class="option-title">全部商品盘点</text>
            <text class="option-desc">对所有在售商品进行盘点</text>
          </view>
          <view class="option-item" @click="createCheckWithType('partial')">
            <text class="option-title">部分商品盘点</text>
            <text class="option-desc">选择特定商品进行盘点</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { onPullDownRefresh, onReachBottom } from '@dcloudio/uni-app'
import { callFunction } from '@/utils/cloudbase'
import AdminAuthManager from '@/utils/admin-auth'
import AdminIcon from '@/components/admin-icon.vue'

// 状态标签
const statusTabs = [
  { label: '全部', value: '' },
  { label: '草稿', value: 'draft' },
  { label: '盘点中', value: 'checking' },
  { label: '已完成', value: 'completed' }
]

const currentStatus = ref('')
const checks = ref<any[]>([])
const loading = ref(false)
const page = ref(1)
const limit = 20
const hasMore = ref(true)
const showCreateModal = ref(false)

// 状态文本
const statusTextMap: Record<string, string> = {
  draft: '草稿',
  checking: '盘点中',
  completed: '已完成',
  cancelled: '已取消'
}

const getStatusText = (status: string) => statusTextMap[status] || status

// 日期时间格式化
const formatDateTime = (date: string | Date) => {
  if (!date) return '-'
  const d = new Date(date)
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
}

// 生命周期
onMounted(() => {
  if (!AdminAuthManager.checkAuth()) return
  loadChecks()
})

// 下拉刷新
onPullDownRefresh(async () => {
  page.value = 1
  hasMore.value = true
  await loadChecks()
  uni.stopPullDownRefresh()
})

// 触底加载
onReachBottom(() => {
  if (hasMore.value && !loading.value) {
    loadMore()
  }
})

// 加载盘点单列表
const loadChecks = async () => {
  if (loading.value) return
  loading.value = true

  try {
    const res = await callFunction('admin-api', {
      action: 'getInventoryChecks',
      adminToken: AdminAuthManager.getToken(),
      data: {
        status: currentStatus.value || undefined,
        page: page.value,
        limit
      }
    })

    if (res.code === 0) {
      if (page.value === 1) {
        checks.value = res.data.list || []
      } else {
        checks.value = [...checks.value, ...(res.data.list || [])]
      }
      hasMore.value = res.data.hasMore
    } else {
      uni.showToast({ title: res.msg || '加载失败', icon: 'none' })
    }
  } catch (e) {
    console.error('加载盘点单失败', e)
    uni.showToast({ title: '网络错误', icon: 'none' })
  } finally {
    loading.value = false
  }
}

// 切换状态
const changeStatus = (status: string) => {
  currentStatus.value = status
  page.value = 1
  hasMore.value = true
  loadChecks()
}

// 加载更多
const loadMore = () => {
  page.value++
  loadChecks()
}

// 显示创建弹窗
const createCheck = () => {
  showCreateModal.value = true
}

// 创建盘点单
const createCheckWithType = async (type: 'all' | 'partial') => {
  showCreateModal.value = false

  if (type === 'all') {
    // 全部商品盘点
    try {
      uni.showLoading({ title: '创建中...' })

      const res = await callFunction('admin-api', {
        action: 'createInventoryCheck',
        adminToken: AdminAuthManager.getToken(),
        data: {}
      })

      uni.hideLoading()

      if (res.code === 0) {
        uni.showToast({ title: '创建成功', icon: 'success' })
        // 跳转到详情页
        setTimeout(() => {
          uni.navigateTo({
            url: `/pagesAdmin/inventory/check/detail?id=${res.data._id}`
          })
        }, 1500)
      } else {
        uni.showToast({ title: res.msg || '创建失败', icon: 'none' })
      }
    } catch (e) {
      uni.hideLoading()
      console.error('创建盘点单失败', e)
      uni.showToast({ title: '网络错误', icon: 'none' })
    }
  } else {
    // 部分商品盘点 - 跳转到商品选择页面
    uni.showToast({ title: '部分盘点功能开发中', icon: 'none' })
  }
}

// 跳转详情
const goToDetail = (id: string) => {
  uni.navigateTo({
    url: `/pagesAdmin/inventory/check/detail?id=${id}`
  })
}
</script>

<style lang="scss" scoped>
.check-list-page {
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

.status-scroll {
  margin-bottom: 20rpx;
  white-space: nowrap;
}

.status-tabs {
  display: inline-flex;
  gap: 16rpx;
}

.status-tab {
  display: inline-flex;
  align-items: center;
  padding: 16rpx 28rpx;
  background: rgba(255, 255, 255, 0.05);
  border: 1rpx solid rgba(201, 169, 98, 0.2);
  border-radius: 8rpx;
  font-size: 26rpx;
  color: rgba(245, 245, 240, 0.5);

  &.active {
    background: rgba(201, 169, 98, 0.2);
    border-color: #C9A962;
    color: #C9A962;
  }
}

.check-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.check-item {
  background: rgba(255, 255, 255, 0.03);
  border-radius: 16rpx;
  border: 1rpx solid rgba(201, 169, 98, 0.1);
  padding: 24rpx;
}

.check-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
  padding-bottom: 16rpx;
  border-bottom: 1rpx solid rgba(255, 255, 255, 0.05);
}

.check-no {
  font-size: 26rpx;
  font-weight: bold;
  color: #F5F5F0;
}

.check-status {
  padding: 6rpx 16rpx;
  border-radius: 6rpx;
  font-size: 22rpx;

  &.draft { background: rgba(150, 150, 150, 0.2); color: #999; }
  &.checking { background: rgba(201, 169, 98, 0.2); color: #C9A962; }
  &.completed { background: rgba(122, 154, 142, 0.2); color: #7A9A8E; }
  &.cancelled { background: rgba(184, 92, 92, 0.2); color: #B85C5C; }
}

.check-info {
  display: flex;
  flex-direction: column;
  gap: 10rpx;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.info-label {
  font-size: 24rpx;
  color: rgba(245, 245, 240, 0.5);
}

.info-value {
  font-size: 24rpx;
  color: #F5F5F0;

  &.gain { color: #7A9A8E; }
  &.loss { color: #B85C5C; }
}

.check-footer {
  display: flex;
  justify-content: flex-end;
  margin-top: 16rpx;
  padding-top: 16rpx;
  border-top: 1rpx solid rgba(255, 255, 255, 0.05);
}

.footer-arrow {
  font-size: 32rpx;
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

// 弹窗样式
.modal-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  width: 80%;
  background: #1A1A1A;
  border-radius: 16rpx;
  overflow: hidden;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 30rpx;
  border-bottom: 1rpx solid rgba(255, 255, 255, 0.1);
}

.modal-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #F5F5F0;
}

.modal-close {
  font-size: 40rpx;
  color: rgba(245, 245, 240, 0.5);
}

.modal-body {
  padding: 20rpx;
}

.option-item {
  padding: 30rpx;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 12rpx;
  margin-bottom: 16rpx;
  border: 1rpx solid rgba(201, 169, 98, 0.1);

  &:last-child {
    margin-bottom: 0;
  }
}

.option-title {
  font-size: 28rpx;
  font-weight: bold;
  color: #F5F5F0;
  display: block;
}

.option-desc {
  font-size: 24rpx;
  color: rgba(245, 245, 240, 0.5);
  margin-top: 8rpx;
  display: block;
}
</style>
