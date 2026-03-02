<template>
  <view class="erp-page">
    <!-- 页面头部 -->
    <view class="page-header">
      <text class="page-title">ERP管理</text>
    </view>

    <!-- 数据概览 -->
    <view class="stats-section">
      <view class="stats-grid">
        <view class="stat-card" @click="goTo('/pagesAdmin/inventory/batches')">
          <text class="stat-value">{{ overview.totalStock }}</text>
          <text class="stat-label">库存总量</text>
        </view>
        <view class="stat-card warning" @click="goTo('/pagesAdmin/inventory/batches?status=expiring_soon')">
          <text class="stat-value">{{ overview.expiringCount }}</text>
          <text class="stat-label">临期预警</text>
        </view>
        <view class="stat-card danger" @click="goTo('/pagesAdmin/inventory/batches?status=expired')">
          <text class="stat-value">{{ overview.expiredCount }}</text>
          <text class="stat-label">过期商品</text>
        </view>
        <view class="stat-card" @click="goTo('/pagesAdmin/purchase/list?status=pending')">
          <text class="stat-value">{{ overview.pendingPurchaseCount }}</text>
          <text class="stat-label">待收货</text>
        </view>
      </view>
    </view>

    <!-- 快捷入口 -->
    <view class="section">
      <view class="section-title">快捷入口</view>
      <view class="quick-actions">
        <view class="action-item" @click="goTo('/pagesAdmin/purchase/create')">
          <view class="action-icon purchase">
            <text class="icon-text">采</text>
          </view>
          <text class="action-label">新建采购</text>
        </view>
        <view class="action-item" @click="goTo('/pagesAdmin/purchase/list')">
          <view class="action-icon order">
            <text class="icon-text">单</text>
          </view>
          <text class="action-label">采购单</text>
        </view>
        <view class="action-item" @click="goTo('/pagesAdmin/inventory/batches')">
          <view class="action-icon batch">
            <text class="icon-text">批</text>
          </view>
          <text class="action-label">批次管理</text>
        </view>
        <view class="action-item" @click="goTo('/pagesAdmin/inventory/transactions')">
          <view class="action-icon flow">
            <text class="icon-text">流</text>
          </view>
          <text class="action-label">库存流水</text>
        </view>
        <view class="action-item" @click="goTo('/pagesAdmin/suppliers/list')">
          <view class="action-icon supplier">
            <text class="icon-text">供</text>
          </view>
          <text class="action-label">供应商</text>
        </view>
        <view class="action-item" @click="goTo('/pagesAdmin/inventory/check/list')">
          <view class="action-icon check">
            <text class="icon-text">盘</text>
          </view>
          <text class="action-label">盘点管理</text>
        </view>
      </view>
    </view>

    <!-- 待处理事项 -->
    <view class="section">
      <view class="section-title">待处理事项</view>
      <view class="todo-list">
        <view
          v-if="overview.expiringCount > 0"
          class="todo-item warning"
          @click="goTo('/pagesAdmin/inventory/batches?status=expiring_soon')"
        >
          <view class="todo-badge">!</view>
          <text class="todo-text">临期批次预警（{{ overview.expiringCount }}个）</text>
          <text class="todo-arrow">›</text>
        </view>
        <view
          v-if="overview.expiredCount > 0"
          class="todo-item danger"
          @click="goTo('/pagesAdmin/inventory/batches?status=expired')"
        >
          <view class="todo-badge">!</view>
          <text class="todo-text">过期批次处理（{{ overview.expiredCount }}个）</text>
          <text class="todo-arrow">›</text>
        </view>
        <view
          v-if="overview.pendingPurchaseCount > 0"
          class="todo-item"
          @click="goTo('/pagesAdmin/purchase/list?status=pending')"
        >
          <view class="todo-badge">●</view>
          <text class="todo-text">待收货采购单（{{ overview.pendingPurchaseCount }}个）</text>
          <text class="todo-arrow">›</text>
        </view>
        <view
          v-if="overview.lowStockCount > 0"
          class="todo-item info"
          @click="goTo('/pagesAdmin/inventory/list')"
        >
          <view class="todo-badge">!</view>
          <text class="todo-text">库存不足商品（{{ overview.lowStockCount }}个）</text>
          <text class="todo-arrow">›</text>
        </view>
        <view v-if="!hasTodoItems" class="todo-empty">
          <text class="empty-text">暂无待处理事项</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { onPullDownRefresh } from '@dcloudio/uni-app'
import { callFunction } from '@/utils/cloudbase'
import AdminAuthManager from '@/utils/admin-auth'

// 概览数据
const overview = ref({
  totalProducts: 0,
  totalStock: 0,
  lowStockCount: 0,
  expiringCount: 0,
  expiredCount: 0,
  pendingPurchaseCount: 0
})

// 是否有待处理事项
const hasTodoItems = computed(() => {
  return overview.value.expiringCount > 0 ||
    overview.value.expiredCount > 0 ||
    overview.value.pendingPurchaseCount > 0 ||
    overview.value.lowStockCount > 0
})

// 生命周期
onMounted(() => {
  if (!AdminAuthManager.checkAuth()) return
  loadOverview()
})

// 下拉刷新
onPullDownRefresh(async () => {
  await loadOverview()
  uni.stopPullDownRefresh()
})

// 加载概览数据
const loadOverview = async () => {
  try {
    const res = await callFunction('admin-api', {
      action: 'getInventoryOverview',
      adminToken: AdminAuthManager.getToken(),
      data: {}
    })

    if (res.code === 0) {
      overview.value = res.data
    }
  } catch (e) {
    console.error('加载概览失败', e)
  }
}

// 跳转页面
const goTo = (url: string) => {
  uni.navigateTo({ url })
}
</script>

<style lang="scss" scoped>
.erp-page {
  min-height: 100vh;
  background: #0D0D0D;
  padding: 24rpx;
  padding-bottom: 120rpx;
}

.page-header {
  margin-bottom: 30rpx;
}

.page-title {
  font-size: 36rpx;
  font-weight: bold;
  color: #F5F5F0;
}

.stats-section {
  margin-bottom: 24rpx;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16rpx;
}

.stat-card {
  background: rgba(255, 255, 255, 0.03);
  border-radius: 12rpx;
  padding: 24rpx 16rpx;
  text-align: center;
  border: 1rpx solid rgba(201, 169, 98, 0.1);

  &.warning {
    border-color: rgba(201, 169, 98, 0.3);
    background: rgba(201, 169, 98, 0.05);
  }

  &.danger {
    border-color: rgba(184, 92, 92, 0.3);
    background: rgba(184, 92, 92, 0.05);
  }
}

.stat-value {
  font-size: 36rpx;
  font-weight: bold;
  color: #F5F5F0;
  display: block;
}

.stat-label {
  font-size: 20rpx;
  color: rgba(245, 245, 240, 0.5);
  margin-top: 8rpx;
  display: block;
}

.section {
  background: rgba(255, 255, 255, 0.03);
  border-radius: 16rpx;
  border: 1rpx solid rgba(201, 169, 98, 0.1);
  padding: 24rpx;
  margin-bottom: 24rpx;
}

.section-title {
  font-size: 28rpx;
  font-weight: bold;
  color: #F5F5F0;
  margin-bottom: 20rpx;
}

.quick-actions {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20rpx;
}

.action-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
}

.action-icon {
  width: 88rpx;
  height: 88rpx;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;

  &.purchase { background: linear-gradient(145deg, #7A9A8E 0%, #5B7A6E 100%); }
  &.order { background: linear-gradient(145deg, #C9A962 0%, #A88B4A 100%); }
  &.batch { background: linear-gradient(145deg, #6495ED 0%, #4169E1 100%); }
  &.flow { background: linear-gradient(145deg, #9370DB 0%, #8A2BE2 100%); }
  &.supplier { background: linear-gradient(145deg, #20B2AA 0%, #008B8B 100%); }
  &.check { background: linear-gradient(145deg, #F0E68C 0%, #DAA520 100%); }
}

.icon-text {
  font-size: 32rpx;
  color: #fff;
  font-weight: bold;
}

.action-label {
  font-size: 24rpx;
  color: rgba(245, 245, 240, 0.7);
}

.todo-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.todo-item {
  display: flex;
  align-items: center;
  gap: 16rpx;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 12rpx;
  padding: 20rpx;
  border: 1rpx solid rgba(255, 255, 255, 0.05);

  &.warning {
    border-color: rgba(201, 169, 98, 0.3);
    background: rgba(201, 169, 98, 0.05);
  }

  &.danger {
    border-color: rgba(184, 92, 92, 0.3);
    background: rgba(184, 92, 92, 0.05);
  }

  &.info {
    border-color: rgba(100, 149, 237, 0.3);
    background: rgba(100, 149, 237, 0.05);
  }
}

.todo-badge {
  width: 36rpx;
  height: 36rpx;
  border-radius: 50%;
  background: rgba(201, 169, 98, 0.2);
  color: #C9A962;
  font-size: 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  .danger & {
    background: rgba(184, 92, 92, 0.2);
    color: #B85C5C;
  }

  .info & {
    background: rgba(100, 149, 237, 0.2);
    color: #6495ED;
  }
}

.todo-text {
  flex: 1;
  font-size: 26rpx;
  color: #F5F5F0;
}

.todo-arrow {
  font-size: 32rpx;
  color: rgba(245, 245, 240, 0.3);
}

.todo-empty {
  padding: 40rpx 0;
  text-align: center;
}

.empty-text {
  font-size: 26rpx;
  color: rgba(245, 245, 240, 0.3);
}
</style>
