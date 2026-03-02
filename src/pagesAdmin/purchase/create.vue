<template>
  <view class="purchase-create-page">
    <view class="page-title">{{ isEdit ? '编辑采购单' : '创建采购单' }}</view>

    <!-- 选择供应商 -->
    <view class="section">
      <view class="section-title required">供应商</view>
      <view class="supplier-select" @click="showSupplierPicker = true">
        <text v-if="selectedSupplier" class="supplier-name">{{ selectedSupplier.name }}</text>
        <text v-else class="supplier-placeholder">请选择供应商</text>
        <text class="select-arrow">›</text>
      </view>
    </view>

    <!-- 商品列表 -->
    <view class="section">
      <view class="section-header">
        <text class="section-title required">采购商品</text>
        <view class="add-product-btn" @click="showProductPicker = true">
          <text class="add-icon">+</text>
          <text class="add-text">添加商品</text>
        </view>
      </view>

      <view class="product-list">
        <view v-for="(item, index) in items" :key="index" class="product-item">
          <view class="product-header">
            <text class="product-name">{{ item.productName }}</text>
            <text class="remove-btn" @click="removeItem(index)">删除</text>
          </view>
          <view class="product-inputs">
            <view class="input-row">
              <text class="input-label">数量</text>
              <input
                class="input"
                type="number"
                v-model="item.quantity"
                placeholder="0"
              />
            </view>
            <view class="input-row">
              <text class="input-label">单价(元)</text>
              <input
                class="input"
                type="digit"
                v-model="item.unitCostYuan"
                placeholder="0.00"
              />
            </view>
            <view class="input-row">
              <text class="input-label">小计</text>
              <text class="subtotal">¥{{ calculateSubtotal(item) }}</text>
            </view>
          </view>
        </view>

        <view v-if="items.length === 0" class="empty-products">
          <text class="empty-text">请添加采购商品</text>
        </view>
      </view>
    </view>

    <!-- 其他信息 -->
    <view class="section">
      <view class="form-item">
        <text class="label">预计到货日期</text>
        <picker mode="date" :value="formData.expectedDate" @change="onDateChange">
          <view class="picker">{{ formData.expectedDate || '选择日期' }}</view>
        </picker>
      </view>
      <view class="form-item">
        <text class="label">备注</text>
        <textarea
          class="textarea"
          v-model="formData.remark"
          placeholder="请输入备注"
          maxlength="500"
        />
      </view>
    </view>

    <!-- 金额汇总 -->
    <view class="summary">
      <view class="summary-row">
        <text class="summary-label">商品数量</text>
        <text class="summary-value">{{ items.length }} 种</text>
      </view>
      <view class="summary-row">
        <text class="summary-label">采购金额</text>
        <text class="summary-value price">¥{{ totalAmount.toFixed(2) }}</text>
      </view>
    </view>

    <!-- 操作按钮 -->
    <view class="action-buttons">
      <button class="btn-cancel" @click="handleCancel">取消</button>
      <button class="btn-submit" :loading="submitting" @click="handleSubmit">
        {{ isEdit ? '保存' : '创建' }}
      </button>
    </view>

    <!-- 供应商选择弹窗 -->
    <view v-if="showSupplierPicker" class="picker-modal" @click="showSupplierPicker = false">
      <view class="picker-content" @click.stop>
        <view class="picker-header">
          <text class="picker-title">选择供应商</text>
          <text class="picker-close" @click="showSupplierPicker = false">×</text>
        </view>
        <scroll-view scroll-y class="picker-list">
          <view
            v-for="supplier in suppliers"
            :key="supplier._id"
            class="picker-item"
            @click="selectSupplier(supplier)"
          >
            <text class="picker-item-name">{{ supplier.name }}</text>
            <text class="picker-item-contact">{{ supplier.contactPerson }} {{ supplier.phone }}</text>
          </view>
          <view v-if="suppliers.length === 0" class="picker-empty">
            <text>暂无供应商，请先添加</text>
          </view>
        </scroll-view>
      </view>
    </view>

    <!-- 商品选择弹窗 -->
    <view v-if="showProductPicker" class="picker-modal" @click="showProductPicker = false">
      <view class="picker-content" @click.stop>
        <view class="picker-header">
          <text class="picker-title">选择商品</text>
          <text class="picker-close" @click="showProductPicker = false">×</text>
        </view>
        <scroll-view scroll-y class="picker-list">
          <view
            v-for="product in products"
            :key="product._id"
            class="picker-item"
            @click="addProduct(product)"
          >
            <text class="picker-item-name">{{ product.name }}</text>
            <text class="picker-item-price">¥{{ (product.price / 100).toFixed(2) }}</text>
          </view>
          <view v-if="products.length === 0" class="picker-empty">
            <text>暂无商品</text>
          </view>
        </scroll-view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { callFunction } from '@/utils/cloudbase'
import AdminAuthManager from '@/utils/admin-auth'

// 状态
const isEdit = ref(false)
const purchaseOrderId = ref('')
const submitting = ref(false)
const showSupplierPicker = ref(false)
const showProductPicker = ref(false)

// 表单数据
const formData = ref({
  expectedDate: '',
  remark: ''
})

// 供应商
const suppliers = ref<any[]>([])
const selectedSupplier = ref<any>(null)

// 商品
const products = ref<any[]>([])
const items = ref<any[]>([])

// 计算小计
const calculateSubtotal = (item: any) => {
  const quantity = parseInt(item.quantity) || 0
  const unitCost = parseFloat(item.unitCostYuan) || 0
  return (quantity * unitCost).toFixed(2)
}

// 计算总金额
const totalAmount = computed(() => {
  return items.value.reduce((sum, item) => {
    const quantity = parseInt(item.quantity) || 0
    const unitCost = parseFloat(item.unitCostYuan) || 0
    return sum + quantity * unitCost
  }, 0)
})

// 生命周期
onMounted(() => {
  if (!AdminAuthManager.checkAuth()) return

  loadSuppliers()
  loadProducts()

  // 检查是否为编辑模式
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1] as any
  const options = currentPage.options || {}

  if (options.id) {
    isEdit.value = true
    purchaseOrderId.value = options.id
    loadPurchaseOrder()
  }
})

// 加载供应商列表
const loadSuppliers = async () => {
  try {
    const res = await callFunction('admin-api', {
      action: 'getSuppliers',
      adminToken: AdminAuthManager.getToken(),
      data: { limit: 100, status: 'active' }
    })

    if (res.code === 0) {
      suppliers.value = res.data.list || []
    }
  } catch (e) {
    console.error('加载供应商失败', e)
  }
}

// 加载商品列表
const loadProducts = async () => {
  try {
    const res = await callFunction('admin-api', {
      action: 'getProducts',
      adminToken: AdminAuthManager.getToken(),
      data: { limit: 1000 }
    })

    if (res.code === 0) {
      products.value = res.data.list || []
    }
  } catch (e) {
    console.error('加载商品失败', e)
  }
}

// 加载采购单（编辑模式）
const loadPurchaseOrder = async () => {
  try {
    uni.showLoading({ title: '加载中...' })

    const res = await callFunction('admin-api', {
      action: 'getPurchaseOrderDetail',
      adminToken: AdminAuthManager.getToken(),
      data: { purchaseOrderId: purchaseOrderId.value }
    })

    uni.hideLoading()

    if (res.code === 0 && res.data) {
      const order = res.data

      // 设置供应商
      selectedSupplier.value = {
        _id: order.supplierId,
        name: order.supplierName
      }

      // 设置商品列表
      items.value = (order.items || []).map((item: any) => ({
        productId: item.productId,
        productName: item.productName,
        sku: item.sku,
        quantity: item.quantity.toString(),
        unitCostYuan: (item.unitCost / 100).toFixed(2),
        receivedQuantity: item.receivedQuantity || 0
      }))

      // 设置其他信息
      formData.value = {
        expectedDate: order.expectedDate ? order.expectedDate.split('T')[0] : '',
        remark: order.remark || ''
      }
    }
  } catch (e) {
    uni.hideLoading()
    console.error('加载采购单失败', e)
  }
}

// 选择供应商
const selectSupplier = (supplier: any) => {
  selectedSupplier.value = supplier
  showSupplierPicker.value = false
}

// 添加商品
const addProduct = (product: any) => {
  // 检查是否已添加
  const existIndex = items.value.findIndex(item => item.productId === product._id)
  if (existIndex >= 0) {
    uni.showToast({ title: '该商品已添加', icon: 'none' })
    return
  }

  items.value.push({
    productId: product._id,
    productName: product.name,
    sku: product.sku || '',
    quantity: '1',
    unitCostYuan: ((product.costPrice || 0) / 100).toFixed(2)
  })

  showProductPicker.value = false
}

// 删除商品
const removeItem = (index: number) => {
  items.value.splice(index, 1)
}

// 日期选择
const onDateChange = (e: any) => {
  formData.value.expectedDate = e.detail.value
}

// 取消
const handleCancel = () => {
  uni.navigateBack()
}

// 提交
const handleSubmit = async () => {
  // 验证
  if (!selectedSupplier.value) {
    uni.showToast({ title: '请选择供应商', icon: 'none' })
    return
  }

  if (items.value.length === 0) {
    uni.showToast({ title: '请添加采购商品', icon: 'none' })
    return
  }

  // 检查商品数据
  for (const item of items.value) {
    if (!item.quantity || parseInt(item.quantity) <= 0) {
      uni.showToast({ title: '请填写商品数量', icon: 'none' })
      return
    }
    if (!item.unitCostYuan || parseFloat(item.unitCostYuan) <= 0) {
      uni.showToast({ title: '请填写商品单价', icon: 'none' })
      return
    }
  }

  if (submitting.value) return
  submitting.value = true

  try {
    uni.showLoading({ title: isEdit.value ? '保存中...' : '创建中...' })

    // 转换数据格式
    const orderItems = items.value.map(item => ({
      productId: item.productId,
      productName: item.productName,
      sku: item.sku,
      quantity: parseInt(item.quantity),
      unitCost: Math.round(parseFloat(item.unitCostYuan) * 100) // 转为分
    }))

    const data: any = {
      supplierId: selectedSupplier.value._id,
      items: orderItems,
      expectedDate: formData.value.expectedDate || null,
      remark: formData.value.remark
    }

    const action = isEdit.value ? 'updatePurchaseOrder' : 'createPurchaseOrder'
    if (isEdit.value) {
      data.purchaseOrderId = purchaseOrderId.value
    }

    const res = await callFunction('admin-api', {
      action,
      adminToken: AdminAuthManager.getToken(),
      data
    })

    uni.hideLoading()

    if (res.code === 0) {
      uni.showToast({
        title: isEdit.value ? '保存成功' : '创建成功',
        icon: 'success'
      })

      setTimeout(() => {
        uni.navigateBack()
      }, 1500)
    } else {
      uni.showToast({ title: res.msg || '操作失败', icon: 'none' })
    }
  } catch (e) {
    uni.hideLoading()
    console.error('提交失败', e)
    uni.showToast({ title: '网络错误', icon: 'none' })
  } finally {
    submitting.value = false
  }
}
</script>

<style lang="scss" scoped>
.purchase-create-page {
  min-height: 100vh;
  background: #0D0D0D;
  padding: 24rpx;
  padding-bottom: 200rpx;
}

.page-title {
  font-size: 36rpx;
  font-weight: bold;
  color: #F5F5F0;
  text-align: center;
  margin-bottom: 30rpx;
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
}

.section-title {
  font-size: 28rpx;
  font-weight: bold;
  color: #F5F5F0;

  &.required::after {
    content: '*';
    color: #B85C5C;
    margin-left: 8rpx;
  }
}

.supplier-select {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(255, 255, 255, 0.05);
  border: 1rpx solid rgba(201, 169, 98, 0.2);
  border-radius: 8rpx;
  padding: 24rpx;
}

.supplier-name {
  font-size: 28rpx;
  color: #F5F5F0;
}

.supplier-placeholder {
  font-size: 28rpx;
  color: rgba(245, 245, 240, 0.3);
}

.select-arrow {
  font-size: 32rpx;
  color: rgba(245, 245, 240, 0.3);
}

.add-product-btn {
  display: flex;
  align-items: center;
  gap: 8rpx;
  background: linear-gradient(145deg, #C8A464 0%, #A88B4A 100%);
  padding: 12rpx 20rpx;
  border-radius: 8rpx;
}

.add-icon {
  font-size: 24rpx;
  color: #1A1A1A;
  font-weight: bold;
}

.add-text {
  font-size: 22rpx;
  color: #1A1A1A;
}

.product-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.product-item {
  background: rgba(255, 255, 255, 0.03);
  border-radius: 12rpx;
  padding: 20rpx;
}

.product-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
}

.product-name {
  font-size: 26rpx;
  font-weight: bold;
  color: #F5F5F0;
}

.remove-btn {
  font-size: 24rpx;
  color: #B85C5C;
}

.product-inputs {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.input-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.input-label {
  font-size: 24rpx;
  color: rgba(245, 245, 240, 0.5);
  width: 120rpx;
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

.subtotal {
  font-size: 26rpx;
  color: #C9A962;
  font-weight: bold;
}

.empty-products {
  padding: 40rpx 0;
  text-align: center;
}

.empty-text {
  font-size: 26rpx;
  color: rgba(245, 245, 240, 0.3);
}

.form-item {
  margin-bottom: 24rpx;

  &:last-child {
    margin-bottom: 0;
  }
}

.label {
  display: block;
  font-size: 26rpx;
  color: rgba(245, 245, 240, 0.7);
  margin-bottom: 16rpx;
}

.picker {
  background: rgba(255, 255, 255, 0.05);
  border: 1rpx solid rgba(201, 169, 98, 0.2);
  border-radius: 8rpx;
  padding: 20rpx;
  font-size: 28rpx;
  color: #F5F5F0;
}

.textarea {
  width: 100%;
  min-height: 120rpx;
  background: rgba(255, 255, 255, 0.05);
  border: 1rpx solid rgba(201, 169, 98, 0.2);
  border-radius: 8rpx;
  padding: 20rpx;
  font-size: 28rpx;
  color: #F5F5F0;
  box-sizing: border-box;
}

.summary {
  background: rgba(201, 169, 98, 0.1);
  border-radius: 12rpx;
  padding: 24rpx;
  margin-bottom: 24rpx;
}

.summary-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12rpx;

  &:last-child {
    margin-bottom: 0;
  }
}

.summary-label {
  font-size: 26rpx;
  color: rgba(245, 245, 240, 0.7);
}

.summary-value {
  font-size: 26rpx;
  color: #F5F5F0;

  &.price {
    font-size: 32rpx;
    color: #C9A962;
    font-weight: bold;
  }
}

.action-buttons {
  display: flex;
  gap: 20rpx;
}

.btn-cancel {
  flex: 1;
  height: 88rpx;
  background: rgba(255, 255, 255, 0.05);
  border: 1rpx solid rgba(201, 169, 98, 0.2);
  border-radius: 8rpx;
  font-size: 30rpx;
  color: rgba(245, 245, 240, 0.7);
}

.btn-submit {
  flex: 1;
  height: 88rpx;
  background: linear-gradient(145deg, #C8A464 0%, #A88B4A 100%);
  border-radius: 8rpx;
  font-size: 30rpx;
  color: #1A1A1A;
  font-weight: bold;
}

// 弹窗样式
.picker-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: flex-end;
  z-index: 1000;
}

.picker-content {
  width: 100%;
  max-height: 70vh;
  background: #1A1A1A;
  border-radius: 24rpx 24rpx 0 0;
}

.picker-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 30rpx;
  border-bottom: 1rpx solid rgba(255, 255, 255, 0.1);
}

.picker-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #F5F5F0;
}

.picker-close {
  font-size: 40rpx;
  color: rgba(245, 245, 240, 0.5);
}

.picker-list {
  max-height: 60vh;
  padding: 20rpx;
}

.picker-item {
  padding: 24rpx;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 12rpx;
  margin-bottom: 16rpx;
}

.picker-item-name {
  font-size: 28rpx;
  color: #F5F5F0;
  display: block;
}

.picker-item-contact,
.picker-item-price {
  font-size: 24rpx;
  color: rgba(245, 245, 240, 0.5);
  margin-top: 8rpx;
  display: block;
}

.picker-empty {
  padding: 60rpx 0;
  text-align: center;
  color: rgba(245, 245, 240, 0.3);
}
</style>
