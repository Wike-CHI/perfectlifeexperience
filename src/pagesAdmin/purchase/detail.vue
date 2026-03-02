<template>
  <view class="purchase-detail-page">
    <!-- 基本信息 -->
    <view class="section">
      <view class="section-header">
        <text class="order-no">{{ order.purchaseNo }}</text>
        <view :class="['order-status', order.status]">
          {{ getStatusText(order.status) }}
        </view>
      </view>

      <view class="info-list">
        <view class="info-item">
          <text class="info-label">供应商</text>
          <text class="info-value">{{ order.supplierName }}</text>
        </view>
        <view class="info-item">
          <text class="info-label">采购金额</text>
          <text class="info-value price">¥{{ ((order.totalAmount || 0) / 100).toFixed(2) }}</text>
        </view>
        <view class="info-item">
          <text class="info-label">预计到货</text>
          <text class="info-value">{{ order.expectedDate ? formatDate(order.expectedDate) : '-' }}</text>
        </view>
        <view class="info-item">
          <text class="info-label">创建时间</text>
          <text class="info-value">{{ formatDate(order.createTime) }}</text>
        </view>
        <view class="info-item" v-if="order.operatorName">
          <text class="info-label">创建人</text>
          <text class="info-value">{{ order.operatorName }}</text>
        </view>
        <view class="info-item" v-if="order.remark">
          <text class="info-label">备注</text>
          <text class="info-value">{{ order.remark }}</text>
        </view>
      </view>
    </view>

    <!-- 商品明细 -->
    <view class="section">
      <view class="section-title">采购明细</view>
      <view class="items-list">
        <view v-for="(item, index) in order.items" :key="index" class="item-card">
          <view class="item-header">
            <text class="item-name">{{ item.productName }}</text>
            <text v-if="item.sku" class="item-sku">{{ item.sku }}</text>
          </view>
          <view class="item-info">
            <view class="item-row">
              <text class="item-label">采购数量</text>
              <text class="item-value">{{ item.quantity }}</text>
            </view>
            <view class="item-row">
              <text class="item-label">已收货</text>
              <text class="item-value">{{ item.receivedQuantity || 0 }}</text>
            </view>
            <view class="item-row">
              <text class="item-label">单价</text>
              <text class="item-value">¥{{ ((item.unitCost || 0) / 100).toFixed(2) }}</text>
            </view>
            <view class="item-row">
              <text class="item-label">小计</text>
              <text class="item-value price">¥{{ ((item.totalCost || 0) / 100).toFixed(2) }}</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 收货操作（待收货/部分收货状态显示） -->
    <view v-if="order.status === 'pending' || order.status === 'partial'" class="section">
      <view class="section-title">收货入库</view>
      <view class="receive-form">
        <view v-for="(item, index) in receiveItems" :key="index" class="receive-item">
          <text class="receive-name">{{ item.productName }}</text>
          <view class="receive-inputs">
            <view class="input-group">
              <text class="input-label">收货数量</text>
              <input
                class="input"
                type="number"
                v-model="item.quantity"
                :placeholder="`最多${item.maxQuantity}`"
              />
            </view>
            <view class="input-group">
              <text class="input-label">生产日期</text>
              <picker mode="date" :value="item.productionDate" @change="(e: any) => item.productionDate = e.detail.value">
                <view class="picker">{{ item.productionDate || '选择日期' }}</view>
              </picker>
            </view>
            <view class="input-group">
              <text class="input-label">过期日期</text>
              <picker mode="date" :value="item.expiryDate" @change="(e: any) => item.expiryDate = e.detail.value">
                <view class="picker">{{ item.expiryDate || '选择日期' }}</view>
              </picker>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 操作按钮 -->
    <view class="action-buttons">
      <!-- 草稿状态 -->
      <template v-if="order.status === 'draft'">
        <button class="btn-secondary" @click="handleEdit">编辑</button>
        <button class="btn-primary" @click="handleSubmit">提交采购单</button>
      </template>

      <!-- 待收货/部分收货状态 -->
      <template v-if="order.status === 'pending' || order.status === 'partial'">
        <button class="btn-secondary" @click="handleCancel">取消采购单</button>
        <button class="btn-primary" @click="handleReceive">确认收货</button>
      </template>

      <!-- 已完成状态 -->
      <template v-if="order.status === 'completed'">
        <button class="btn-secondary" @click="goBack">返回</button>
      </template>

      <!-- 已取消状态 -->
      <template v-if="order.status === 'cancelled'">
        <button class="btn-secondary" @click="goBack">返回</button>
      </template>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { callFunction } from '@/utils/cloudbase'
import AdminAuthManager from '@/utils/admin-auth'

// 状态
const orderId = ref('')
const order = ref<any>({
  purchaseNo: '',
  status: '',
  supplierName: '',
  items: []
})

// 收货表单
const receiveItems = ref<any[]>([])

// 状态文本
const statusTextMap: Record<string, string> = {
  draft: '草稿',
  pending: '待收货',
  partial: '部分收货',
  received: '已收货',
  completed: '已完成',
  cancelled: '已取消'
}

const getStatusText = (status: string) => statusTextMap[status] || status

// 日期格式化
const formatDate = (date: string | Date) => {
  if (!date) return '-'
  const d = new Date(date)
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`
}

// 生命周期
onMounted(() => {
  if (!AdminAuthManager.checkAuth()) return

  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1] as any
  const options = currentPage.options || {}

  if (options.id) {
    orderId.value = options.id
    loadOrder()
  }
})

// 加载采购单详情
const loadOrder = async () => {
  try {
    uni.showLoading({ title: '加载中...' })

    const res = await callFunction('admin-api', {
      action: 'getPurchaseOrderDetail',
      adminToken: AdminAuthManager.getToken(),
      data: { purchaseOrderId: orderId.value }
    })

    uni.hideLoading()

    if (res.code === 0 && res.data) {
      order.value = res.data

      // 初始化收货表单
      receiveItems.value = (res.data.items || []).map((item: any) => ({
        productId: item.productId,
        productName: item.productName,
        quantity: 0,
        maxQuantity: item.quantity - (item.receivedQuantity || 0),
        productionDate: '',
        expiryDate: ''
      }))
    } else {
      uni.showToast({ title: res.msg || '加载失败', icon: 'none' })
    }
  } catch (e) {
    uni.hideLoading()
    console.error('加载采购单失败', e)
    uni.showToast({ title: '网络错误', icon: 'none' })
  }
}

// 编辑
const handleEdit = () => {
  uni.navigateTo({
    url: `/pagesAdmin/purchase/create?id=${orderId.value}`
  })
}

// 提交采购单
const handleSubmit = async () => {
  uni.showModal({
    title: '确认提交',
    content: '提交后采购单将进入待收货状态，确定提交吗？',
    success: async (result) => {
      if (result.confirm) {
        try {
          uni.showLoading({ title: '提交中...' })

          const res = await callFunction('admin-api', {
            action: 'submitPurchaseOrder',
            adminToken: AdminAuthManager.getToken(),
            data: { purchaseOrderId: orderId.value }
          })

          uni.hideLoading()

          if (res.code === 0) {
            uni.showToast({ title: '提交成功', icon: 'success' })
            loadOrder()
          } else {
            uni.showToast({ title: res.msg || '提交失败', icon: 'none' })
          }
        } catch (e) {
          uni.hideLoading()
          uni.showToast({ title: '网络错误', icon: 'none' })
        }
      }
    }
  })
}

// 取消采购单
const handleCancel = async () => {
  uni.showModal({
    title: '确认取消',
    content: '确定要取消此采购单吗？',
    confirmColor: '#B85C5C',
    success: async (result) => {
      if (result.confirm) {
        try {
          uni.showLoading({ title: '取消中...' })

          const res = await callFunction('admin-api', {
            action: 'cancelPurchaseOrder',
            adminToken: AdminAuthManager.getToken(),
            data: { purchaseOrderId: orderId.value }
          })

          uni.hideLoading()

          if (res.code === 0) {
            uni.showToast({ title: '已取消', icon: 'success' })
            loadOrder()
          } else {
            uni.showToast({ title: res.msg || '取消失败', icon: 'none' })
          }
        } catch (e) {
          uni.hideLoading()
          uni.showToast({ title: '网络错误', icon: 'none' })
        }
      }
    }
  })
}

// 确认收货
const handleReceive = async () => {
  // 过滤出有收货数量的项
  const validItems = receiveItems.value.filter(item => item.quantity > 0)

  if (validItems.length === 0) {
    uni.showToast({ title: '请填写收货数量', icon: 'none' })
    return
  }

  try {
    uni.showLoading({ title: '入库中...' })

    const res = await callFunction('admin-api', {
      action: 'receivePurchaseOrder',
      adminToken: AdminAuthManager.getToken(),
      data: {
        purchaseOrderId: orderId.value,
        receiveItems: validItems.map(item => ({
          productId: item.productId,
          quantity: parseInt(item.quantity),
          productionDate: item.productionDate || null,
          expiryDate: item.expiryDate || null
        }))
      }
    })

    uni.hideLoading()

    if (res.code === 0) {
      uni.showToast({ title: '入库成功', icon: 'success' })
      loadOrder()
    } else {
      uni.showToast({ title: res.msg || '入库失败', icon: 'none' })
    }
  } catch (e) {
    uni.hideLoading()
    console.error('入库失败', e)
    uni.showToast({ title: '网络错误', icon: 'none' })
  }
}

// 返回
const goBack = () => {
  uni.navigateBack()
}
</script>

<style lang="scss" scoped>
.purchase-detail-page {
  min-height: 100vh;
  background: #0D0D0D;
  padding: 24rpx;
  padding-bottom: 200rpx;
}

.section {
  background: rgba(255, 255, 255, 0.03);
  border-radius: 16rpx;
  border: 1rpx solid rgba(201, 169, 98, 0.1);
  padding: 24rpx;
  margin-bottom: 24rpx;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20rpx;
  padding-bottom: 16rpx;
  border-bottom: 1rpx solid rgba(255, 255, 255, 0.05);
}

.order-no {
  font-size: 28rpx;
  font-weight: bold;
  color: #F5F5F0;
}

.order-status {
  padding: 6rpx 16rpx;
  border-radius: 6rpx;
  font-size: 22rpx;

  &.draft { background: rgba(150, 150, 150, 0.2); color: #999; }
  &.pending { background: rgba(201, 169, 98, 0.2); color: #C9A962; }
  &.partial { background: rgba(180, 140, 80, 0.2); color: #B48C50; }
  &.completed { background: rgba(122, 154, 142, 0.2); color: #7A9A8E; }
  &.cancelled { background: rgba(184, 92, 92, 0.2); color: #B85C5C; }
}

.section-title {
  font-size: 28rpx;
  font-weight: bold;
  color: #F5F5F0;
  margin-bottom: 20rpx;
}

.info-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.info-label {
  font-size: 24rpx;
  color: rgba(245, 245, 240, 0.5);
}

.info-value {
  font-size: 24rpx;
  color: #F5F5F0;
  text-align: right;
  max-width: 60%;

  &.price {
    color: #C9A962;
    font-weight: bold;
  }
}

.items-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.item-card {
  background: rgba(255, 255, 255, 0.03);
  border-radius: 12rpx;
  padding: 20rpx;
}

.item-header {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 16rpx;
}

.item-name {
  font-size: 26rpx;
  font-weight: bold;
  color: #F5F5F0;
}

.item-sku {
  font-size: 22rpx;
  color: rgba(245, 245, 240, 0.4);
  background: rgba(255, 255, 255, 0.05);
  padding: 4rpx 12rpx;
  border-radius: 4rpx;
}

.item-info {
  display: flex;
  flex-direction: column;
  gap: 10rpx;
}

.item-row {
  display: flex;
  justify-content: space-between;
}

.item-label {
  font-size: 24rpx;
  color: rgba(245, 245, 240, 0.5);
}

.item-value {
  font-size: 24rpx;
  color: #F5F5F0;

  &.price {
    color: #C9A962;
  }
}

.receive-form {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.receive-item {
  background: rgba(255, 255, 255, 0.03);
  border-radius: 12rpx;
  padding: 20rpx;
}

.receive-name {
  font-size: 26rpx;
  font-weight: bold;
  color: #F5F5F0;
  margin-bottom: 16rpx;
  display: block;
}

.receive-inputs {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.input-group {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.input-label {
  font-size: 24rpx;
  color: rgba(245, 245, 240, 0.5);
  width: 140rpx;
  flex-shrink: 0;
}

.input {
  flex: 1;
  height: 64rpx;
  background: rgba(255, 255, 255, 0.05);
  border: 1rpx solid rgba(201, 169, 98, 0.2);
  border-radius: 8rpx;
  padding: 0 16rpx;
  font-size: 26rpx;
  color: #F5F5F0;
}

.picker {
  flex: 1;
  height: 64rpx;
  background: rgba(255, 255, 255, 0.05);
  border: 1rpx solid rgba(201, 169, 98, 0.2);
  border-radius: 8rpx;
  padding: 0 16rpx;
  font-size: 26rpx;
  color: #F5F5F0;
  display: flex;
  align-items: center;
}

.action-buttons {
  display: flex;
  gap: 20rpx;
  margin-top: 40rpx;
}

.btn-secondary {
  flex: 1;
  height: 88rpx;
  background: rgba(255, 255, 255, 0.05);
  border: 1rpx solid rgba(201, 169, 98, 0.2);
  border-radius: 8rpx;
  font-size: 28rpx;
  color: rgba(245, 245, 240, 0.7);
}

.btn-primary {
  flex: 1;
  height: 88rpx;
  background: linear-gradient(145deg, #C8A464 0%, #A88B4A 100%);
  border-radius: 8rpx;
  font-size: 28rpx;
  color: #1A1A1A;
  font-weight: bold;
}
</style>
