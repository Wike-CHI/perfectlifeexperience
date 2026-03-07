<template>
  <view class="dashboard-container">
    <!-- 顶部欢迎区 -->
    <view class="welcome-section">
      <view class="welcome-left">
        <text class="welcome-title">{{ welcomeMessage }}</text>
        <text class="welcome-subtitle">{{ currentDate }}</text>
      </view>
      <view class="welcome-actions">
        <view class="action-btn" @click="scanExpressCode">
          <AdminIcon name="camera" size="small" variant="default" />
          <text class="action-text">扫快递</text>
        </view>
        <view class="action-btn" @click="goToProductAdd">
          <AdminIcon name="plus" size="small" variant="default" />
          <text class="action-text">添加商品</text>
        </view>
      </view>
    </view>

    <!-- 核心数据卡片 -->
    <view class="stats-section">
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

    <!-- 常用功能入口 -->
    <view class="features-section">
      <view class="section-title">常用功能</view>
      <view class="features-grid">
        <view
          v-for="feature in coreFeatures"
          :key="feature.id"
          class="feature-item"
          @click="goToPage(feature.link)"
        >
          <view class="feature-icon-wrapper" :class="feature.color">
            <AdminIcon :name="feature.icon" size="medium" variant="gold" />
          </view>
          <text class="feature-label">{{ feature.label }}</text>
          <text v-if="feature.badge && feature.badge > 0" class="feature-badge">{{ feature.badge }}</text>
        </view>
      </view>
    </view>

    <!-- 更多功能入口 -->
    <view class="more-section">
      <view class="section-header" @click="toggleMoreFeatures">
        <view class="section-title">更多功能</view>
        <view class="expand-icon" :class="{ expanded: showMoreFeatures }">
          <text class="expand-arrow">›</text>
        </view>
      </view>

      <view v-if="showMoreFeatures" class="more-grid">
        <view
          v-for="menu in moreFeatures"
          :key="menu.id"
          class="menu-item"
          @click="goToPage(menu.link)"
        >
          <view class="menu-icon-wrapper" :class="menu.color">
            <AdminIcon :name="menu.icon" size="medium" variant="gold" />
          </view>
          <text class="menu-label">{{ menu.label }}</text>
        </view>
      </view>
    </view>

    <!-- 安全区域 -->
    <view class="safe-area"></view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { onPullDownRefresh } from '@dcloudio/uni-app'
import AdminAuthManager from '@/utils/admin-auth'
import AdminCacheManager from '@/utils/admin-cache'
import { CACHE_CONFIG } from '@/utils/cache-config'
import { callFunction } from '@/utils/cloudbase'
import AdminDataCard from '@/components/admin-data-card.vue'
import AdminIcon from '@/components/admin-icon.vue'

/**
 * 管理后台仪表盘 - 精简版
 */

// 当前日期
const currentDate = computed(() => {
  const now = new Date()
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  }
  return now.toLocaleDateString('zh-CN', options)
})

// 欢迎信息
const welcomeMessage = computed(() => {
  const hour = new Date().getHours()
  if (hour < 12) return '早上好'
  if (hour < 14) return '中午好'
  if (hour < 18) return '下午好'
  return '晚上好'
})

// 是否展开更多功能
const showMoreFeatures = ref(false)

// 切换更多功能展开状态
const toggleMoreFeatures = () => {
  showMoreFeatures.value = !showMoreFeatures.value
}

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

// 核心数据卡片
const stats = ref([
  {
    id: 'today-orders',
    label: '今日订单',
    value: 0,
    unit: '单',
    icon: 'package',
    trend: '',
    trendType: 'neutral',
    link: '/pagesAdmin/orders/list'
  },
  {
    id: 'today-sales',
    label: '今日销售额',
    value: 0,
    unit: '元',
    icon: 'money',
    trend: '',
    trendType: 'neutral',
    link: '/pagesAdmin/statistics/index'
  },
  {
    id: 'pending-ship',
    label: '待发货',
    value: 0,
    unit: '单',
    icon: 'truck',
    trend: '',
    trendType: 'neutral',
    link: '/pagesAdmin/orders/list?status=paid'
  },
  {
    id: 'pending-refund',
    label: '待审核退款',
    value: 0,
    unit: '单',
    icon: 'refund',
    trend: '',
    trendType: 'neutral',
    link: '/pagesAdmin/refunds/index'
  }
])

// 核心功能（6个常用功能）
const coreFeatures = ref<any[]>([
  { id: 'orders', icon: 'list', label: '订单管理', link: '/pagesAdmin/orders/list', color: 'gold', badge: 0 },
  { id: 'products', icon: 'box', label: '商品管理', link: '/pagesAdmin/products/list', color: 'gold', badge: 0 },
  { id: 'users', icon: 'users', label: '用户管理', link: '/pagesAdmin/users/list', color: 'bronze', badge: 0 },
  { id: 'refunds', icon: 'refund', label: '退款管理', link: '/pagesAdmin/refunds/index', color: 'danger', badge: 0 },
  { id: 'finance', icon: 'money', label: '财务管理', link: '/pagesAdmin/finance/index', color: 'sage', badge: 0 },
  { id: 'promotion', icon: 'chart', label: '推广管理', link: '/pagesAdmin/promotion/index', color: 'gold', badge: 0 }
])

// 更多功能
const moreFeatures = ref([
  { id: 'coupons', icon: 'ticket', label: '优惠券', link: '/pagesAdmin/coupons/list', color: 'bronze' },
  { id: 'banners', icon: 'image', label: 'Banner', link: '/pagesAdmin/banners/list', color: 'bronze' },
  { id: 'promotions', icon: 'gift', label: '活动管理', link: '/pagesAdmin/promotions/list', color: 'bronze' },
  { id: 'announcements', icon: 'notice', label: '公告管理', link: '/pagesAdmin/announcements/list', color: 'sage' },
  { id: 'commissions', icon: 'coin', label: '佣金明细', link: '/pagesAdmin/commissions/list', color: 'gold' },
  { id: 'commission-wallets', icon: 'wallet', label: '佣金钱包', link: '/pagesAdmin/commission-wallets/list', color: 'gold' },
  { id: 'categories', icon: 'list', label: '分类管理', link: '/pagesAdmin/categories/list', color: 'sage' },
  { id: 'stores', icon: 'shop', label: '门店管理', link: '/pagesAdmin/stores/edit', color: 'bronze' },
  { id: 'statistics', icon: 'chart', label: '数据统计', link: '/pagesAdmin/statistics/index', color: 'gold' },
  { id: 'settings', icon: 'settings', label: '系统设置', link: '/pagesAdmin/settings/config', color: 'sage' }
])

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

    // 检查 token 是否过期
    if (res.code === 401 || res.msg?.includes('登录已过期') || res.msg?.includes('登录') || res.code === 'TOKEN_EXPIRED') {
      AdminAuthManager.logout()
      uni.showToast({ title: '登录已过期，请重新登录', icon: 'none' })
      setTimeout(() => {
        uni.redirectTo({ url: '/pagesAdmin/login/index' })
      }, 1500)
      return
    }

    if (res.code === 0 && res.data) {
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
  // 更新核心数据卡片
  stats.value[0].value = data.todayOrders || 0
  stats.value[1].value = Math.round((data.todaySales || 0) / 100)
  stats.value[2].value = data.pendingTasks?.find((t: any) => t.type === 'shipment')?.count || 0
  stats.value[3].value = data.pendingTasks?.find((t: any) => t.type === 'refund')?.count || 0

  // 更新核心功能角标
  const pendingRefund = data.pendingTasks?.find((t: any) => t.type === 'refund')?.count || 0
  const pendingShip = data.pendingTasks?.find((t: any) => t.type === 'shipment')?.count || 0

  coreFeatures.value[0].badge = pendingShip  // 订单待发货
  coreFeatures.value[3].badge = pendingRefund // 退款待审核
}

// 跳转到统计详情
const goToStatDetail = (link: string) => {
  if (!link) return
  uni.navigateTo({ url: link })
}

// 通用页面跳转
const goToPage = (link: string) => {
  if (!link) return
  uni.navigateTo({ url: link })
}

// 扫快递单
const scanExpressCode = async () => {
  uni.scanCode({
    success: async (res) => {
      try {
        uni.showLoading({ title: '搜索中...' })

        const result = await callFunction('admin-api', {
          action: 'searchOrderByExpress',
          adminToken: AdminAuthManager.getToken(),
          data: { expressCode: res.result }
        })

        uni.hideLoading()

        if (result.code === 0 && result.data) {
          uni.navigateTo({
            url: `/pagesAdmin/orders/detail?id=${result.data.id}`
          })
        } else {
          uni.showToast({
            title: result.msg || '未找到该订单',
            icon: 'none'
          })
        }
      } catch (error: any) {
        uni.hideLoading()
        uni.showToast({
          title: error.message || '搜索失败',
          icon: 'none'
        })
      }
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
</script>

<style scoped>
.dashboard-container {
  min-height: 100vh;
  background: #1A1A1A;
  padding: 24rpx;
  padding-bottom: 120rpx;
}

/* 顶部欢迎区 */
.welcome-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32rpx;
  padding: 24rpx;
  background: linear-gradient(135deg, rgba(61, 41, 20, 0.8) 0%, rgba(61, 41, 20, 0.6) 100%);
  border-radius: 20rpx;
  border: 1rpx solid rgba(201, 169, 98, 0.2);
}

.welcome-left {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.welcome-title {
  font-size: 36rpx;
  font-weight: 700;
  color: #F5F5F0;
}

.welcome-subtitle {
  font-size: 24rpx;
  color: rgba(245, 245, 240, 0.6);
}

.welcome-actions {
  display: flex;
  gap: 16rpx;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 16rpx 20rpx;
  background: rgba(201, 169, 98, 0.15);
  border-radius: 12rpx;
  transition: all 0.3s;
}

.action-btn:active {
  background: rgba(201, 169, 98, 0.25);
  transform: scale(0.95);
}

.action-text {
  font-size: 24rpx;
  color: #C9A962;
}

/* 核心数据卡片 */
.stats-section {
  margin-bottom: 32rpx;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20rpx;
}

/* 功能入口 */
.features-section {
  margin-bottom: 24rpx;
}

.section-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #F5F5F0;
  margin-bottom: 20rpx;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16rpx;
}

.feature-item {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
  padding: 28rpx 16rpx;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 16rpx;
  transition: all 0.3s;
}

.feature-item:active {
  background: rgba(255, 255, 255, 0.06);
  transform: scale(0.95);
}

.feature-icon-wrapper {
  width: 72rpx;
  height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 16rpx;
}

.feature-icon-wrapper.gold {
  background: rgba(201, 169, 98, 0.15);
}

.feature-icon-wrapper.bronze {
  background: rgba(212, 165, 116, 0.15);
}

.feature-icon-wrapper.sage {
  background: rgba(122, 154, 142, 0.15);
}

.feature-icon-wrapper.danger {
  background: rgba(184, 92, 92, 0.15);
}

.feature-label {
  font-size: 24rpx;
  color: rgba(245, 245, 240, 0.85);
  text-align: center;
}

.feature-badge {
  position: absolute;
  top: 12rpx;
  right: 12rpx;
  min-width: 36rpx;
  height: 36rpx;
  padding: 0 10rpx;
  background: #B85C5C;
  border-radius: 18rpx;
  font-size: 22rpx;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 更多功能 */
.more-section {
  margin-bottom: 24rpx;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20rpx;
}

.expand-icon {
  width: 48rpx;
  height: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.3s;
}

.expand-icon.expanded {
  transform: rotate(90deg);
}

.expand-arrow {
  font-size: 36rpx;
  color: rgba(245, 245, 240, 0.5);
}

.more-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 12rpx;
}

.menu-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
  padding: 20rpx 12rpx;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 12rpx;
  transition: all 0.3s;
}

.menu-item:active {
  background: rgba(255, 255, 255, 0.06);
  transform: scale(0.95);
}

.menu-icon-wrapper {
  width: 56rpx;
  height: 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12rpx;
}

.menu-icon-wrapper.gold {
  background: rgba(201, 169, 98, 0.15);
}

.menu-icon-wrapper.bronze {
  background: rgba(212, 165, 116, 0.15);
}

.menu-icon-wrapper.sage {
  background: rgba(122, 154, 142, 0.15);
}

.menu-label {
  font-size: 20rpx;
  color: rgba(245, 245, 240, 0.75);
  text-align: center;
  line-height: 1.2;
}

/* 安全区域 */
.safe-area {
  height: constant(safe-area-inset-bottom);
  height: env(safe-area-inset-bottom);
}
</style>
