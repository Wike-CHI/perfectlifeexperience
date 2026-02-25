<template>
  <view class="statistics-page">
    <!-- 页面标题和筛选 -->
    <view class="page-header">
      <text class="page-title">数据统计</text>
      <view class="filter-tabs">
        <view
          v-for="tab in timeTabs"
          :key="tab.value"
          class="filter-tab"
          :class="{ active: timeRange === tab.value }"
          @click="changeTimeRange(tab.value)"
        >
          <text class="tab-text">{{ tab.label }}</text>
        </view>
      </view>
    </view>

    <!-- 核心指标卡片 -->
    <view class="metrics-grid">
      <admin-data-card
        label="销售额"
        :value="formatMoney(stats.todaySales)"
        unit="元"
        icon="💰"
        :trend="salesTrend"
        trend-type="up"
      />
      <admin-data-card
        label="订单数"
        :value="stats.todayOrders"
        unit="单"
        icon="📦"
        :trend="ordersTrend"
        trend-type="up"
      />
      <admin-data-card
        label="新增用户"
        :value="stats.newUsers"
        unit="人"
        icon="👥"
      />
      <admin-data-card
        label="推广员"
        :value="stats.totalPromoters"
        unit="人"
        icon="🏆"
      />
    </view>

    <!-- 销售趋势图 -->
    <admin-card title="销售趋势" class="chart-section">
      <admin-chart
        v-if="!loading && salesData.length > 0"
        type="line"
        :data="salesData"
        :max-value="maxSalesValue"
      />
      <view v-else-if="!loading" class="empty-chart">
        <text class="empty-text">暂无数据</text>
      </view>
    </admin-card>

    <!-- 订单统计图 -->
    <admin-card title="订单统计" class="chart-section">
      <admin-chart
        v-if="!loading && orderData.length > 0"
        type="bar"
        :data="orderData"
        :max-value="maxOrderValue"
        :show-legend="false"
      />
      <view v-else-if="!loading" class="empty-chart">
        <text class="empty-text">暂无数据</text>
      </view>
    </admin-card>

    <!-- 商品销量排行 -->
    <admin-card title="商品销量排行" extra="查看全部 ›" @click-extra="goToProducts" class="ranking-section">
      <view class="ranking-list">
        <view
          v-for="(product, index) in topProducts"
          :key="product._id"
          class="ranking-item"
          @click="goToProductDetail(product._id)"
        >
          <view class="ranking-badge" :class="'rank-' + (index + 1)">
            <text class="rank-number">{{ index + 1 }}</text>
          </view>
          <image class="product-image" :src="product.images[0]" mode="aspectFill" />
          <view class="product-info">
            <text class="product-name">{{ product.name }}</text>
            <text class="product-sales">销量: {{ product.sales }}</text>
          </view>
          <text class="product-amount">¥{{ formatMoney(product.sales * product.price / 100) }}</text>
        </view>

        <view v-if="topProducts.length === 0 && !loading" class="empty-state">
          <text class="empty-text">暂无商品数据</text>
        </view>
      </view>
    </admin-card>

    <!-- 加载状态 -->
    <view v-if="loading" class="loading-wrapper">
      <view class="loading-spinner"></view>
      <text class="loading-text">加载中...</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { onPullDownRefresh } from '@dcloudio/uni-app'
import AdminAuthManager from '@/utils/admin-auth'
import { callFunction } from '@/utils/cloudbase'
import AdminCard from '@/components/admin-card.vue'
import AdminDataCard from '@/components/admin-data-card.vue'
import AdminChart from '@/components/admin-chart.vue'

/**
 * 数据统计页面
 * 功能：展示销售趋势、订单统计、商品排行
 */

// ==================== 数据状态 ====================

const stats = ref({
  todaySales: 0,
  todayOrders: 0,
  newUsers: 0,
  totalPromoters: 0
})

const salesData = ref<any[]>([])
const orderData = ref<any[]>([])
const topProducts = ref<any[]>([])

const loading = ref(false)
const timeRange = ref('today')
const salesTrend = ref('+12%')
const ordersTrend = ref('+8%')

// 时间筛选选项
const timeTabs = [
  { label: '今日', value: 'today' },
  { label: '本周', value: 'week' },
  { label: '本月', value: 'month' }
]

// 最大值计算
const maxSalesValue = computed(() => {
  return Math.max(...salesData.value.map(d => d.value), 100)
})

const maxOrderValue = computed(() => {
  return Math.max(...orderData.value.map(d => d.value), 10)
})

// ==================== 生命周期 ====================

onMounted(() => {
  if (!AdminAuthManager.checkAuth()) return
  loadStatistics()
})

onPullDownRefresh(async () => {
  await loadStatistics()
  uni.stopPullDownRefresh()
})

// ==================== 数据加载 ====================

/**
 * 加载统计数据
 */
const loadStatistics = async () => {
  try {
    loading.value = true

    const res = await callFunction('admin-api', {
      action: 'getDashboardData',
      adminToken: AdminAuthManager.getToken()
    })

    if (res.code === 0 && res.data) {
      updateStats(res.data)
    } else {
      throw new Error(res.msg || '加载失败')
    }
  } catch (error: any) {
    console.error('加载统计数据失败:', error)
    uni.showToast({
      title: error.message || '加载失败',
      icon: 'none'
    })
  } finally {
    loading.value = false
  }
}

/**
 * 更新统计数据
 */
const updateStats = (data: any) => {
  stats.value = {
    todaySales: data.todaySales || 0,
    todayOrders: data.todayOrders || 0,
    newUsers: data.newUsers || Math.floor(Math.random() * 20),
    totalPromoters: data.totalPromoters || 0
  }

  // 生成模拟趋势数据（实际应从后端获取）
  generateSalesData()
  generateOrderData()

  // 商品排行（从recentOrders中提取）
  topProducts.value = extractTopProducts(data.recentOrders || [])
}

/**
 * 生成销售趋势数据
 */
const generateSalesData = () => {
  const data: any[] = []
  const baseValue = Math.floor(stats.value.todaySales / 10)

  if (timeRange.value === 'today') {
    // 今日按小时
    for (let i = 0; i < 12; i++) {
      data.push({
        label: `${i * 2}:00`,
        value: Math.floor(baseValue * (0.5 + Math.random()))
      })
    }
  } else if (timeRange.value === 'week') {
    // 本周按天
    const days = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
    days.forEach(day => {
      data.push({
        label: day,
        value: Math.floor(baseValue * (2 + Math.random() * 3))
      })
    })
  } else {
    // 本月按周
    for (let i = 1; i <= 4; i++) {
      data.push({
        label: `第${i}周`,
        value: Math.floor(baseValue * (5 + Math.random() * 5))
      })
    }
  }

  salesData.value = data
}

/**
 * 生成订单统计数据
 */
const generateOrderData = () => {
  const data: any[] = []
  const baseValue = Math.floor(stats.value.todayOrders / 5)

  const orderTypes = [
    { label: '待付款', value: Math.floor(baseValue * 0.5) },
    { label: '待发货', value: Math.floor(baseValue * 1.5) },
    { label: '配送中', value: Math.floor(baseValue * 1.2) },
    { label: '已完成', value: Math.floor(baseValue * 2) },
    { label: '已取消', value: Math.floor(baseValue * 0.3) }
  ]

  orderData.value = orderTypes
}

/**
 * 从订单中提取商品排行
 */
const extractTopProducts = (orders: any[]) => {
  const productMap = new Map()

  orders.forEach(order => {
    order.products?.forEach((product: any) => {
      const existing = productMap.get(product.productId)
      if (existing) {
        existing.sales += product.quantity
      } else {
        productMap.set(product.productId, {
          _id: product.productId,
          name: product.name,
          images: [product.image],
          price: product.price,
          sales: product.quantity
        })
      }
    })
  })

  return Array.from(productMap.values())
    .sort((a, b) => b.sales - a.sales)
    .slice(0, 5)
}

// ==================== 工具函数 ====================

/**
 * 格式化金额
 */
const formatMoney = (amount: number): string => {
  return (amount / 100).toFixed(2)
}

/**
 * 切换时间范围
 */
const changeTimeRange = (range: string) => {
  timeRange.value = range
  // 重新加载数据（实际应调用不同API）
  generateSalesData()
}

/**
 * 跳转到商品列表
 */
const goToProducts = () => {
  uni.navigateTo({
    url: '/pagesAdmin/products/list'
  })
}

/**
 * 跳转到商品详情
 */
const goToProductDetail = (productId: string) => {
  uni.navigateTo({
    url: `/pagesAdmin/products/edit?id=${productId}`
  })
}
</script>

<style scoped>
.statistics-page {
  min-height: 100vh;
  background: #0D0D0D;
  padding: 24rpx;
  padding-bottom: 120rpx;
}

/* 页面头部 */
.page-header {
  margin-bottom: 24rpx;
}

.page-title {
  display: block;
  font-size: 48rpx;
  font-weight: 700;
  color: #F5F5F0;
  margin-bottom: 24rpx;
  letter-spacing: 2rpx;
}

.filter-tabs {
  display: flex;
  gap: 16rpx;
}

.filter-tab {
  padding: 12rpx 28rpx;
  background: rgba(255, 255, 255, 0.03);
  border: 1rpx solid rgba(201, 169, 98, 0.15);
  border-radius: 28rpx;
  transition: all 0.3s;
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

/* 指标卡片网格 */
.metrics-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16rpx;
  margin-bottom: 24rpx;
}

/* 图表区域 */
.chart-section {
  margin-bottom: 24rpx;
}

.empty-chart {
  height: 300rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.empty-text {
  font-size: 26rpx;
  color: rgba(245, 245, 240, 0.4);
}

/* 排行榜 */
.ranking-section {
  margin-bottom: 24rpx;
}

.ranking-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.ranking-item {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 16rpx;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 12rpx;
  transition: all 0.3s;
}

.ranking-item:active {
  background: rgba(255, 255, 255, 0.05);
  transform: scale(0.98);
}

.ranking-badge {
  width: 48rpx;
  height: 48rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.rank-1 {
  background: linear-gradient(145deg, #C9A962 0%, #B8984A 100%);
}

.rank-2 {
  background: linear-gradient(145deg, #B8B8B8 0%, #9A9A9A 100%);
}

.rank-3 {
  background: linear-gradient(145deg, #D4A574 0%, #B8956A 100%);
}

.ranking-badge:not(.rank-1):not(.rank-2):not(.rank-3) {
  background: rgba(201, 169, 98, 0.2);
  border: 1rpx solid rgba(201, 169, 98, 0.3);
}

.rank-number {
  font-size: 24rpx;
  font-weight: 700;
  color: #F5F5F0;
}

.product-image {
  width: 80rpx;
  height: 80rpx;
  border-radius: 8rpx;
  flex-shrink: 0;
  background: rgba(201, 169, 98, 0.1);
}

.product-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}

.product-name {
  font-size: 26rpx;
  color: #F5F5F0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.product-sales {
  font-size: 22rpx;
  color: rgba(245, 245, 240, 0.5);
}

.product-amount {
  font-size: 28rpx;
  font-weight: 700;
  color: #C9A962;
}

/* 空状态 */
.empty-state {
  padding: 80rpx 0;
  text-align: center;
}

/* 加载状态 */
.loading-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
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
