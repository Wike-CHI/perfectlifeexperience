<template>
  <view class="order-detail-container">
    <!-- 订单状态卡片 -->
    <admin-card class="status-card">
      <view class="status-content">
        <view :class="['status-icon', detail.status]">
          <AdminIcon :name="statusIcon" size="large" :variant="getStatusVariant(detail.status)" />
        </view>
        <view class="status-info">
          <text class="status-text">{{ statusText }}</text>
          <text class="status-desc">{{ statusDesc }}</text>
        </view>
      </view>
    </admin-card>

    <!-- 订单基本信息 -->
    <admin-card title="订单信息" class="section-card">
      <view class="info-list">
        <view class="info-item">
          <text class="info-label">订单编号</text>
          <text class="info-value">{{ detail.orderNo }}</text>
        </view>
        <view class="info-item">
          <text class="info-label">下单时间</text>
          <text class="info-value">{{ formatFullTime(detail.createTime) }}</text>
        </view>
        <view class="info-item">
          <text class="info-label">订单金额</text>
          <text class="info-value amount">¥{{ formatPrice(detail.totalAmount) }}</text>
        </view>
        <view v-if="detail.payTime" class="info-item">
          <text class="info-label">支付时间</text>
          <text class="info-value">{{ formatFullTime(detail.payTime) }}</text>
        </view>
      </view>
    </admin-card>

    <!-- 用户信息 -->
    <admin-card title="用户信息" class="section-card">
      <view class="user-info">
        <image class="user-avatar" :src="detail.userAvatar || '/static/logo.png'" mode="aspectFill" />
        <view class="user-details">
          <text class="user-name">{{ detail.userName || '未知用户' }}</text>
          <text class="user-phone">{{ detail.userPhone || '未绑定手机' }}</text>
        </view>
      </view>
    </admin-card>

    <!-- 收货地址 -->
    <admin-card title="收货地址" class="section-card">
      <view class="address-info">
        <view class="address-header">
          <text class="receiver-name">{{ detail.receiverName }}</text>
          <text class="receiver-phone">{{ detail.receiverPhone }}</text>
        </view>
        <text class="address-detail">{{ detail.fullAddress }}</text>
        <!-- 地图预览 -->
        <view v-if="detail.location" class="map-container">
          <map
            class="order-map"
            :latitude="detail.location.latitude"
            :longitude="detail.location.longitude"
            :markers="mapMarkers"
            :scale="14"
            :show-location="true"
            @click="openLocation"
          />
          <view class="map-marker-info">
            <text class="map-marker-label">配送位置</text>
            <text class="map-marker-hint">点击打开微信地图导航</text>
          </view>
        </view>
        <button v-else class="location-btn" @click="showLocation">
          <AdminIcon name="location" size="small" />
          <text>查看位置</text>
        </button>
      </view>
    </admin-card>

    <!-- 商品列表 -->
    <admin-card title="商品清单" class="section-card">
      <view class="product-list">
        <view v-for="item in detail.items" :key="item.id || item.productId" class="product-item">
          <image class="product-image" :src="item.productImage || item.image || '/static/logo.png'" mode="aspectFill" />
          <view class="product-details">
            <text class="product-name">{{ item.productName || item.name }}</text>
            <view class="product-meta">
              <text class="product-spec">{{ item.spec || '' }}</text>
              <text class="product-price">¥{{ formatPrice(item.price) }}</text>
            </view>
          </view>
          <text class="product-quantity">x{{ item.quantity }}</text>
        </view>
      </view>
    </admin-card>

    <!-- 物流信息 -->
    <admin-card v-if="detail.expressNo" title="物流信息" class="section-card">
      <view class="express-info">
        <view class="express-row">
          <text class="express-label">快递公司</text>
          <text class="express-value">{{ detail.expressCompany || '未知' }}</text>
        </view>
        <view class="express-row">
          <text class="express-label">快递单号</text>
          <text class="express-value">{{ detail.expressNo }}</text>
        </view>
        <button class="scan-express-btn" @click="scanExpress">
          <AdminIcon name="scan" size="small" />
          <text>重新扫描</text>
        </button>
      </view>
    </admin-card>

    <!-- 操作按钮 -->
    <view class="action-buttons">
      <button class="action-btn primary" @click="handleUpdateStatus">
        更新状态
      </button>
      <button v-if="detail.status === 'paid'" class="action-btn secondary" @click="handleAddExpress">
        添加物流
      </button>
    </view>

    <!-- 安全区域 -->
    <view class="safe-area"></view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import AdminAuthManager from '@/utils/admin-auth'
import { callFunction } from '@/utils/cloudbase'
import { useAdminDetail } from '@/composables/useAdmin'
import AdminCard from '@/components/admin-card.vue'
import AdminIcon from '@/components/admin-icon.vue'
import { formatPrice } from '@/utils/format'

/**
 * 订单详情页面
 * 使用 useAdminDetail composable 简化代码
 */

// 从页面参数获取订单ID
const getOrderIdFromOptions = (): string => {
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1] as any
  const options = currentPage.options || {}
  return options.id || ''
}

// 使用 useAdminDetail
const { detail, loading, loadDetail } = useAdminDetail({
  action: 'getOrderDetail',
  idParam: 'id',
  transform: (data: any) => {
    const orderData = data.order || data
    const userInfo = data.user || {}
    return {
      ...orderData,
      items: orderData.items || orderData.products || [],
      userName: orderData.userName || userInfo.nickName || userInfo.name || '未知用户',
      userPhone: orderData.userPhone || userInfo.phone || userInfo.mobile || '',
      userAvatar: userInfo.avatarUrl || userInfo.avatar || ''
    }
  },
  onLoaded: (data) => {
    console.log('订单详情加载完成', data.orderNo)
  },
  onError: (error) => {
    console.error('加载订单详情失败', error)
  }
})

// 初始化
onMounted(() => {
  if (!AdminAuthManager.checkAuth()) return
  const orderId = getOrderIdFromOptions()
  if (orderId) {
    loadDetail(orderId)
  }
})

// 状态映射
const statusConfig: Record<string, { icon: string; text: string; desc: string }> = {
  pending: { icon: 'clock', text: '待付款', desc: '等待用户支付' },
  paid: { icon: 'package', text: '待发货', desc: '请尽快发货' },
  shipping: { icon: 'truck', text: '待收货', desc: '商品配送中' },
  completed: { icon: 'check', text: '已完成', desc: '订单已完成' },
  refunding: { icon: 'refresh', text: '退款中', desc: '退款申请处理中' },
  refunded: { icon: 'reload', text: '已退款', desc: '退款已完成' },
  cancelled: { icon: 'close', text: '已取消', desc: '订单已取消' }
}

const statusIcon = computed(() => statusConfig[detail.value?.status]?.icon || '')
const statusText = computed(() => statusConfig[detail.value?.status]?.text || '')
const statusDesc = computed(() => statusConfig[detail.value?.status]?.desc || '')

// 获取状态图标颜色变体
const getStatusVariant = (status: string): 'default' | 'gold' | 'success' | 'warning' | 'danger' => {
  const variants: Record<string, 'default' | 'gold' | 'success' | 'warning' | 'danger'> = {
    pending: 'warning',
    paid: 'gold',
    shipping: 'default',
    completed: 'success',
    refunding: 'warning',
    refunded: 'default',
    cancelled: 'danger'
  }
  return variants[status] || 'default'
}

// 格式化完整时间
const formatFullTime = (time: string | Date) => {
  if (!time) return '-'
  const date = new Date(time)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 地图标记点
const mapMarkers = computed(() => {
  if (!detail.value?.location) return []
  return [{
    id: 1,
    latitude: detail.value.location.latitude,
    longitude: detail.value.location.longitude,
    title: '配送位置'
  }]
})

// 打开微信地图导航
const openLocation = () => {
  if (!detail.value.location) return
  uni.openLocation({
    latitude: detail.value.location.latitude,
    longitude: detail.value.location.longitude,
    name: '配送地址',
    address: detail.value.fullAddress
  })
}

// 兼容旧函数
const showLocation = () => {
  openLocation()
}

// 扫描快递单
const scanExpress = () => {
  uni.scanCode({
    success: async (res) => {
      try {
        uni.showLoading({ title: '更新中...' })

        await callFunction('admin-api', {
          action: 'updateOrderExpress',
          adminToken: AdminAuthManager.getToken(),
          data: {
            orderId: detail.value.id || detail.value._id,
            expressNo: res.result
          }
        })

        uni.hideLoading()
        uni.showToast({
          title: '更新成功',
          icon: 'success'
        })

        // 刷新详情
        const orderId = getOrderIdFromOptions()
        loadDetail(orderId)
      } catch (error: any) {
        uni.hideLoading()
        uni.showToast({
          title: error.message || '更新失败',
          icon: 'none'
        })
      }
    }
  })
}

// 更新状态
const handleUpdateStatus = () => {
  const statusOptions = [
    { label: '待付款', value: 'pending' },
    { label: '待发货', value: 'paid' },
    { label: '待收货', value: 'shipping' },
    { label: '已完成', value: 'completed' },
    { label: '退款中', value: 'refunding' },
    { label: '已退款', value: 'refunded' },
    { label: '已取消', value: 'cancelled' }
  ]

  const currentIndex = statusOptions.findIndex(s => s.value === detail.value.status)

  uni.showActionSheet({
    itemList: statusOptions.map(s => s.label),
    success: async (res) => {
      if (res.tapIndex === currentIndex) return

      const newStatus = statusOptions[res.tapIndex].value

      try {
        uni.showLoading({ title: '更新中...' })

        await callFunction('admin-api', {
          action: 'updateOrderStatus',
          adminToken: AdminAuthManager.getToken(),
          data: {
            orderId: detail.value.id,
            status: newStatus
          }
        })

        uni.hideLoading()
        uni.showToast({
          title: '更新成功',
          icon: 'success'
        })

        // 刷新详情
        const orderId = getOrderIdFromOptions()
        loadDetail(orderId)
      } catch (error: any) {
        uni.hideLoading()
        uni.showToast({
          title: error.message || '更新失败',
          icon: 'none'
        })
      }
    }
  })
}

// 添加物流信息
const handleAddExpress = () => {
  uni.showModal({
    title: '添加物流信息',
    editable: true,
    placeholderText: '请输入快递单号',
    success: async (res) => {
      if (res.confirm && res.content) {
        try {
          uni.showLoading({ title: '添加中...' })

          await callFunction('admin-api', {
            action: 'updateOrderExpress',
            adminToken: AdminAuthManager.getToken(),
            data: {
              orderId: detail.value.id || detail.value._id,
              expressNo: res.content
            }
          })

          uni.hideLoading()
          uni.showToast({
            title: '添加成功',
            icon: 'success'
          })

          // 刷新详情
          const orderId = getOrderIdFromOptions()
          loadDetail(orderId)
        } catch (error: any) {
          uni.hideLoading()
          uni.showToast({
            title: error.message || '添加失败',
            icon: 'none'
          })
        }
      }
    }
  })
}
</script>

<style scoped>
.order-detail-container {
  min-height: 100vh;
  background: #1A1A1A;
  padding: 24rpx;
  padding-bottom: 120rpx;
}

.section-card {
  margin-bottom: 24rpx;
}

/* 状态卡片 */
.status-card {
  background: linear-gradient(135deg, rgba(201, 169, 98, 0.1) 0%, rgba(184, 152, 74, 0.05) 100%);
}

.status-content {
  display: flex;
  align-items: center;
  gap: 24rpx;
}

.status-icon {
  width: 88rpx;
  height: 88rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(201, 169, 98, 0.2);
}

.status-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.status-text {
  font-size: 36rpx;
  font-weight: 600;
  color: #C9A962;
}

.status-desc {
  font-size: 24rpx;
  color: rgba(245, 245, 240, 0.5);
}

/* 信息列表 */
.info-list {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.info-label {
  font-size: 26rpx;
  color: rgba(245, 245, 240, 0.5);
}

.info-value {
  font-size: 28rpx;
  color: #F5F5F0;
  text-align: right;
}

.info-value.amount {
  color: #C9A962;
  font-weight: 600;
}

/* 用户信息 */
.user-info {
  display: flex;
  align-items: center;
  gap: 24rpx;
}

.user-avatar {
  width: 88rpx;
  height: 88rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.05);
}

.user-details {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.user-name {
  font-size: 28rpx;
  color: #F5F5F0;
  font-weight: 500;
}

.user-phone {
  font-size: 24rpx;
  color: rgba(245, 245, 240, 0.5);
}

/* 地址信息 */
.address-info {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.address-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.receiver-name {
  font-size: 28rpx;
  color: #F5F5F0;
  font-weight: 500;
}

.receiver-phone {
  font-size: 26rpx;
  color: rgba(245, 245, 240, 0.6);
}

.address-detail {
  font-size: 26rpx;
  color: rgba(245, 245, 240, 0.7);
  line-height: 1.6;
}

.location-btn {
  margin-top: 8rpx;
  padding: 16rpx;
  background: rgba(201, 169, 98, 0.1);
  border-radius: 8rpx;
  font-size: 26rpx;
  color: #C9A962;
  border: none;
}

/* 地图容器 */
.map-container {
  margin-top: 16rpx;
  border-radius: 12rpx;
  overflow: hidden;
}

.order-map {
  width: 100%;
  height: 240rpx;
}

.map-marker-info {
  padding: 12rpx 16rpx;
  background: rgba(201, 169, 98, 0.1);
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.map-marker-label {
  font-size: 26rpx;
  color: #3D2914;
  font-weight: 500;
}

.map-marker-hint {
  font-size: 22rpx;
  color: rgba(61, 41, 20, 0.6);
}

/* 商品列表 */
.product-list {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.product-item {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.product-image {
  width: 120rpx;
  height: 120rpx;
  border-radius: 12rpx;
  background: rgba(255, 255, 255, 0.05);
  flex-shrink: 0;
}

.product-details {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.product-name {
  font-size: 28rpx;
  color: #F5F5F0;
}

.product-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.product-spec {
  font-size: 24rpx;
  color: rgba(245, 245, 240, 0.4);
}

.product-price {
  font-size: 26rpx;
  color: #C9A962;
}

.product-quantity {
  font-size: 28rpx;
  color: rgba(245, 245, 240, 0.6);
}

/* 物流信息 */
.express-info {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.express-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.express-label {
  font-size: 26rpx;
  color: rgba(245, 245, 240, 0.5);
}

.express-value {
  font-size: 26rpx;
  color: #F5F5F0;
}

.scan-express-btn {
  margin-top: 8rpx;
  padding: 16rpx;
  background: rgba(201, 169, 98, 0.1);
  border-radius: 8rpx;
  font-size: 26rpx;
  color: #C9A962;
  border: none;
}

/* 操作按钮 */
.action-buttons {
  display: flex;
  gap: 16rpx;
  margin-top: 24rpx;
}

.action-btn {
  flex: 1;
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 16rpx;
  font-size: 30rpx;
  font-weight: 600;
  border: none;
}

.action-btn.primary {
  background: linear-gradient(135deg, #C9A962 0%, #B8984A 100%);
  color: #1A1A1A;
}

.action-btn.secondary {
  background: rgba(122, 154, 142, 0.1);
  color: #7A9A8E;
}

/* 安全区域 */
.safe-area {
  height: constant(safe-area-inset-bottom);
  height: env(safe-area-inset-bottom);
}
</style>
