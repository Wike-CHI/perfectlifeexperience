<template>
  <view class="dashboard-container">
    <!-- 数据概览区域 -->
    <view class="stats-section">
      <view class="section-title">数据概览</view>
      <view class="stats-grid">
        <admin-data-card
          v-for="stat in stats"
          :key="stat.id"
          :label="stat.label"
          :value="stat.value"
          :unit="stat.unit"
          :icon="stat.icon"
          :trend="stat.trend"
          :trend-type="stat.trendType"
          :clickable="true"
          @click="goToStatDetail(stat.link)"
        />
      </view>
    </view>

    <!-- 待办事项区域 -->
    <admin-card title="待办事项" class="todo-section">
      <view class="todo-list">
        <view
          v-for="todo in todos"
          :key="todo.id"
          class="todo-item"
          @click="handleTodo(todo)"
        >
          <view class="todo-badge" :class="todo.type">
            <text class="badge-count">{{ todo.count }}</text>
          </view>
          <view class="todo-content">
            <text class="todo-label">{{ todo.label }}</text>
            <text v-if="todo.desc" class="todo-desc">{{ todo.desc }}</text>
          </view>
          <text class="todo-arrow">›</text>
        </view>
      </view>
    </admin-card>

    <!-- 快捷操作区域 -->
    <admin-card title="快捷操作" class="actions-section">
      <view class="quick-actions">
        <view
          v-for="action in quickActions"
          :key="action.id"
          class="action-item"
          @click="handleQuickAction(action)"
        >
          <view class="action-icon-wrapper">
            <text class="action-icon">{{ action.icon }}</text>
          </view>
          <text class="action-label">{{ action.label }}</text>
        </view>
      </view>
    </admin-card>

    <!-- 最近订单区域 -->
    <admin-card
      title="最近订单"
      extra="查看全部 ›"
      class="orders-section"
      @click-extra="goToOrders"
    >
      <view class="recent-orders">
        <view
          v-for="order in recentOrders"
          :key="order.id"
          class="order-item"
          @click="goToOrderDetail(order.id)"
        >
          <view class="order-info">
            <text class="order-no">{{ order.orderNo }}</text>
            <text class="order-user">{{ order.userName }}</text>
          </view>
          <view class="order-right">
            <text class="order-amount">¥{{ order.totalAmount }}</text>
            <view :class="['order-status', order.status]">
              {{ statusMap[order.status] }}
            </view>
          </view>
        </view>

        <view v-if="recentOrders.length === 0" class="empty-state">
          <text class="empty-text">暂无订单</text>
        </view>
      </view>
    </admin-card>

    <!-- 安全区域 -->
    <view class="safe-area"></view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { onPullDownRefresh } from '@dcloudio/uni-app'
import AdminAuthManager from '@/utils/admin-auth'
import AdminCacheManager from '@/utils/admin-cache'
import { CACHE_CONFIG } from '@/utils/cache-config'
import { callFunction } from '@/utils/cloudbase'
import AdminCard from '@/components/admin-card.vue'
import AdminDataCard from '@/components/admin-data-card.vue'

/**
 * 管理后台仪表盘
 */

// 权限检查
onMounted(() => {
  if (!AdminAuthManager.checkAuth()) {
    return
  }
  loadDashboard()
})

// 下拉刷新
onPullDownRefresh(async () => {
  await loadDashboard(true)
  uni.stopPullDownRefresh()
})

// 数据概览
const stats = ref([
  {
    id: 'today-sales',
    label: '今日销售额',
    value: 0,
    unit: '元',
    icon: '💰',
    trend: '+12%',
    trendType: 'up',
    link: '/pagesAdmin/statistics/index'
  },
  {
    id: 'today-orders',
    label: '今日订单',
    value: 0,
    unit: '单',
    icon: '📦',
    trend: '+8%',
    trendType: 'up',
    link: '/pagesAdmin/orders/list'
  },
  {
    id: 'pending-ship',
    label: '待发货',
    value: 0,
    unit: '单',
    icon: '🚚',
    trend: '',
    trendType: 'neutral',
    link: '/pagesAdmin/orders/list?status=paid'
  },
  {
    id: 'total-users',
    label: '总用户数',
    value: 0,
    unit: '人',
    icon: '👥',
    trend: '+5%',
    trendType: 'up',
    link: '/pagesAdmin/users/list'
  }
])

// 待办事项
const todos = ref([
  {
    id: 'pending-ship',
    label: '待发货订单',
    desc: '需要及时处理',
    count: 0,
    type: 'warning',
    link: '/pagesAdmin/orders/list?status=paid'
  },
  {
    id: 'low-stock',
    label: '库存预警',
    desc: '商品库存不足',
    count: 0,
    type: 'danger',
    link: '/pagesAdmin/inventory/list'
  },
  {
    id: 'pending-withdraw',
    label: '待审核提现',
    desc: '需要财务审核',
    count: 0,
    type: 'info',
    link: '/pagesAdmin/finance/index'
  }
])

// 快捷操作
const quickActions = ref([
  { id: 'scan-order', icon: '🔍', label: '扫快递单', handler: scanExpressCode },
  { id: 'add-product', icon: '➕', label: '添加商品', handler: goToProductAdd },
  { id: 'new-order', icon: '📋', label: '订单管理', handler: goToOrders },
  { id: 'promotion', icon: '📊', label: '推广数据', handler: goToPromotion }
])

// 最近订单
const recentOrders = ref<any[]>([])

// 订单状态映射
const statusMap: Record<string, string> = {
  pending: '待付款',
  paid: '待发货',
  shipping: '待收货',
  completed: '已完成'
}

// 加载仪表盘数据
const loadDashboard = async (forceRefresh: boolean = false) => {
  try {
    const cacheKey = AdminCacheManager.getConfigKey('dashboard')

    if (!forceRefresh) {
      const cached = AdminCacheManager.get(cacheKey)
      if (cached) {
        updateDashboard(cached)
        return
      }
    }

    uni.showLoading({ title: '加载中...' })

    const res = await callFunction('admin-api', {
      action: 'getDashboardData',
      adminToken: AdminAuthManager.getToken()
    })

    uni.hideLoading()

    if (res.code === 0 && res.data) {
      // 缓存数据
      AdminCacheManager.set(
        cacheKey,
        res.data,
        CACHE_CONFIG.dashboard.expire
      )

      updateDashboard(res.data)
    } else {
      throw new Error(res.msg || '加载数据失败')
    }
  } catch (error: any) {
    uni.hideLoading()
    console.error('加载仪表盘数据失败:', error)
    uni.showToast({
      title: error.message || '加载失败',
      icon: 'none'
    })
  }
}

// 更新仪表盘数据
const updateDashboard = (data: any) => {
  // 更新数据概览
  stats.value[0].value = data.todaySales || 0
  stats.value[1].value = data.todayOrders || 0
  stats.value[2].value = data.pendingTasks?.find((t: any) => t.type === 'shipment')?.count || 0
  stats.value[3].value = data.totalUsers || 0

  // 更新待办事项
  todos.value[0].count = data.pendingTasks?.find((t: any) => t.type === 'shipment')?.count || 0
  todos.value[1].count = data.lowStockCount || 0
  todos.value[2].count = data.pendingTasks?.find((t: any) => t.type === 'withdrawal')?.count || 0

  // 更新最近订单
  recentOrders.value = data.recentOrders || []
}

// 跳转到统计详情
const goToStatDetail = (link: string) => {
  if (!link) return
  uni.navigateTo({ url: link })
}

// 处理待办事项点击
const handleTodo = (todo: any) => {
  if (!todo.link) return
  uni.navigateTo({ url: todo.link })
}

// 处理快捷操作
const handleQuickAction = (action: any) => {
  if (action.handler) {
    action.handler()
  }
}

// 扫快递单
const scanExpressCode = () => {
  uni.scanCode({
    success: (res) => {
      console.log('扫码结果:', res.result)
      // TODO: 根据快递单号查找订单
      uni.showToast({
        title: '扫码成功',
        icon: 'success'
      })
    },
    fail: () => {
      uni.showToast({
        title: '扫码失败',
        icon: 'none'
      })
    }
  })
}

// 添加商品
const goToProductAdd = () => {
  uni.navigateTo({
    url: '/pagesAdmin/products/edit'
  })
}

// 订单管理
const goToOrders = () => {
  uni.navigateTo({
    url: '/pagesAdmin/orders/list'
  })
}

// 推广数据
const goToPromotion = () => {
  uni.navigateTo({
    url: '/pagesAdmin/promotion/index'
  })
}

// 跳转到订单详情
const goToOrderDetail = (orderId: string) => {
  uni.navigateTo({
    url: `/pagesAdmin/orders/detail?id=${orderId}`
  })
}
</script>

<style scoped>
.dashboard-container {
  min-height: 100vh;
  background: #1A1A1A;
  padding: 24rpx;
  padding-bottom: 120rpx;
}

.section-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #F5F5F0;
  margin-bottom: 24rpx;
}

/* 数据概览 */
.stats-section {
  margin-bottom: 32rpx;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24rpx;
}

/* 待办事项 */
.todo-section {
  margin-bottom: 32rpx;
}

.todo-list {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.todo-item {
  display: flex;
  align-items: center;
  gap: 24rpx;
  padding: 24rpx;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 12rpx;
  transition: all 0.3s;
}

.todo-item:active {
  background: rgba(255, 255, 255, 0.05);
  transform: scale(0.98);
}

.todo-badge {
  width: 64rpx;
  height: 64rpx;
  border-radius: 12rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.todo-badge.warning {
  background: rgba(212, 165, 116, 0.2);
}

.todo-badge.danger {
  background: rgba(184, 92, 92, 0.2);
}

.todo-badge.info {
  background: rgba(122, 154, 142, 0.2);
}

.badge-count {
  font-size: 32rpx;
  font-weight: 700;
  color: #F5F5F0;
}

.todo-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.todo-label {
  font-size: 28rpx;
  color: #F5F5F0;
  font-weight: 500;
}

.todo-desc {
  font-size: 24rpx;
  color: rgba(245, 245, 240, 0.5);
}

.todo-arrow {
  font-size: 40rpx;
  color: rgba(245, 245, 240, 0.3);
}

/* 快捷操作 */
.actions-section {
  margin-bottom: 32rpx;
}

.quick-actions {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 24rpx;
}

.action-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16rpx;
  padding: 32rpx 16rpx;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 16rpx;
  transition: all 0.3s;
}

.action-item:active {
  background: rgba(255, 255, 255, 0.05);
  transform: scale(0.95);
}

.action-icon-wrapper {
  width: 88rpx;
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(201, 169, 98, 0.1);
  border-radius: 16rpx;
}

.action-icon {
  font-size: 48rpx;
}

.action-label {
  font-size: 24rpx;
  color: rgba(245, 245, 240, 0.8);
}

/* 最近订单 */
.orders-section {
  margin-bottom: 32rpx;
}

.recent-orders {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.order-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 12rpx;
  transition: all 0.3s;
}

.order-item:active {
  background: rgba(255, 255, 255, 0.05);
  transform: scale(0.98);
}

.order-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.order-no {
  font-size: 28rpx;
  color: #F5F5F0;
  font-weight: 500;
}

.order-user {
  font-size: 24rpx;
  color: rgba(245, 245, 240, 0.5);
}

.order-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8rpx;
}

.order-amount {
  font-size: 28rpx;
  color: #C9A962;
  font-weight: 600;
}

.order-status {
  font-size: 22rpx;
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
}

.order-status.pending {
  background: rgba(212, 165, 116, 0.2);
  color: #D4A574;
}

.order-status.paid {
  background: rgba(201, 169, 98, 0.2);
  color: #C9A962;
}

.order-status.shipping {
  background: rgba(122, 154, 142, 0.2);
  color: #7A9A8E;
}

.order-status.completed {
  background: rgba(245, 245, 240, 0.1);
  color: rgba(245, 245, 240, 0.5);
}

/* 空状态 */
.empty-state {
  padding: 80rpx 0;
  display: flex;
  justify-content: center;
}

.empty-text {
  font-size: 26rpx;
  color: rgba(245, 245, 240, 0.4);
}

/* 安全区域 */
.safe-area {
  height: constant(safe-area-inset-bottom);
  height: env(safe-area-inset-bottom);
}
</style>
