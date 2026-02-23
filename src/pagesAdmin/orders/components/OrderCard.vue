<template>
  <view class="order-card" @click="handleClick">
    <!-- 卡片头部 -->
    <view class="card-header">
      <text class="order-no">{{ order.orderNo }}</text>
      <view :class="['status-badge', order.status]">
        {{ statusMap[order.status] }}
      </view>
    </view>

    <!-- 卡片内容 -->
    <view class="card-body">
      <!-- 商品缩略图 -->
      <scroll-view scroll-x class="product-images" v-if="order.items && order.items.length">
        <image
          v-for="(item, index) in order.items.slice(0, 5)"
          :key="index"
          class="product-image"
          :src="item.image || '/static/logo.png'"
          mode="aspectFill"
        />
        <view v-if="order.items.length > 5" class="more-count">
          +{{ order.items.length - 5 }}
        </view>
      </scroll-view>

      <!-- 订单信息 -->
      <view class="order-info">
        <view class="info-row">
          <text class="info-label">用户：</text>
          <text class="info-value">{{ order.userName || '未知用户' }}</text>
        </view>
        <view class="info-row">
          <text class="info-label">金额：</text>
          <text class="info-value amount">¥{{ order.totalAmount }}</text>
        </view>
        <view class="info-row">
          <text class="info-label">时间：</text>
          <text class="info-value">{{ formatTime(order.createTime) }}</text>
        </view>
      </view>
    </view>

    <!-- 卡片底部 -->
    <view class="card-footer" @click.stop>
      <button class="action-btn scan-btn" @click="handleScan">
        <text class="btn-icon">📷</text>
        <text>扫快递单</text>
      </button>
      <button class="action-btn update-btn" @click="handleUpdateStatus">
        <text>更新状态</text>
      </button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { defineProps, defineEmits } from 'vue'

/**
 * OrderCard - 订单卡片组件
 */

interface OrderItem {
  image?: string
  name: string
  quantity: number
  price: number
}

interface Order {
  _id: string
  orderNo: string
  status: string
  items?: OrderItem[]
  userName?: string
  totalAmount: number
  createTime: string | Date
}

interface Props {
  order: Order
}

const props = defineProps<Props>()

const emit = defineEmits<{
  click: [order: Order]
  scan: [order: Order]
  updateStatus: [order: Order]
}>()

// 订单状态映射
const statusMap: Record<string, string> = {
  pending: '待付款',
  paid: '待发货',
  shipping: '待收货',
  completed: '已完成',
  cancelled: '已取消'
}

// 格式化时间
const formatTime = (time: string | Date) => {
  const date = new Date(time)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')

  return `${month}-${day} ${hour}:${minute}`
}

// 处理卡片点击
const handleClick = () => {
  emit('click', props.order)
}

// 处理扫码
const handleScan = () => {
  emit('scan', props.order)
}

// 处理更新状态
const handleUpdateStatus = () => {
  emit('updateStatus', props.order)
}
</script>

<style scoped>
.order-card {
  background: #252525;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.3);
  border: 2rpx solid rgba(201, 169, 98, 0.2);
  transition: all 0.3s;
}

.order-card:active {
  transform: scale(0.98);
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.3);
}

/* 卡片头部 */
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20rpx;
  padding-bottom: 16rpx;
  border-bottom: 1rpx solid rgba(201, 169, 98, 0.1);
}

.order-no {
  font-size: 28rpx;
  font-weight: 600;
  color: #F5F5F0;
  font-family: 'Manrope', sans-serif;
}

.status-badge {
  padding: 6rpx 16rpx;
  border-radius: 8rpx;
  font-size: 22rpx;
  font-weight: 500;
}

.status-badge.pending {
  background: rgba(212, 165, 116, 0.2);
  color: #D4A574;
}

.status-badge.paid {
  background: rgba(201, 169, 98, 0.2);
  color: #C9A962;
}

.status-badge.shipping {
  background: rgba(122, 154, 142, 0.2);
  color: #7A9A8E;
}

.status-badge.completed {
  background: rgba(245, 245, 240, 0.1);
  color: rgba(245, 245, 240, 0.5);
}

.status-badge.cancelled {
  background: rgba(184, 92, 92, 0.2);
  color: #B85C5C;
}

/* 卡片内容 */
.card-body {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.product-images {
  display: flex;
  white-space: nowrap;
  gap: 12rpx;
}

.product-image {
  width: 80rpx;
  height: 80rpx;
  border-radius: 8rpx;
  background: rgba(255, 255, 255, 0.05);
  flex-shrink: 0;
}

.more-count {
  width: 80rpx;
  height: 80rpx;
  border-radius: 8rpx;
  background: rgba(201, 169, 98, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24rpx;
  color: #C9A962;
  flex-shrink: 0;
}

.order-info {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.info-row {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.info-label {
  font-size: 24rpx;
  color: rgba(245, 245, 240, 0.5);
}

.info-value {
  font-size: 26rpx;
  color: #F5F5F0;
}

.info-value.amount {
  color: #C9A962;
  font-weight: 600;
}

/* 卡片底部 */
.card-footer {
  display: flex;
  gap: 16rpx;
  margin-top: 20rpx;
  padding-top: 16rpx;
  border-top: 1rpx solid rgba(201, 169, 98, 0.1);
}

.action-btn {
  flex: 1;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  border-radius: 12rpx;
  font-size: 26rpx;
  border: none;
  transition: all 0.3s;
}

.scan-btn {
  background: rgba(201, 169, 98, 0.1);
  color: #C9A962;
}

.scan-btn:active {
  background: rgba(201, 169, 98, 0.2);
}

.update-btn {
  background: rgba(122, 154, 142, 0.1);
  color: #7A9A8E;
}

.update-btn:active {
  background: rgba(122, 154, 142, 0.2);
}

.btn-icon {
  font-size: 28rpx;
}
</style>
