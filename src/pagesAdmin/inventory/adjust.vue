<template>
  <view class="adjust-page">
    <view class="page-title">库存调整</view>

    <!-- 选择商品 -->
    <view class="section">
      <view class="section-title required">选择商品</view>
      <view class="product-select" @click="showProductPicker = true">
        <text v-if="selectedProduct" class="product-name">{{ selectedProduct.name }}</text>
        <text v-else class="product-placeholder">请选择商品</text>
        <text class="select-arrow">›</text>
      </view>

      <view v-if="selectedProduct" class="current-stock">
        <text class="stock-label">当前库存：</text>
        <text class="stock-value">{{ selectedProduct.stock || 0 }}</text>
      </view>
    </view>

    <!-- 调整信息 -->
    <view class="section">
      <view class="form-item">
        <text class="label required">调整数量</text>
        <view class="quantity-input">
          <button class="qty-btn" @click="adjustQuantity(-1)">-</button>
          <input class="qty-value" type="number" v-model="formData.quantity" />
          <button class="qty-btn" @click="adjustQuantity(1)">+</button>
        </view>
        <view class="quantity-hint">
          <text>正数为增加库存，负数为减少库存</text>
        </view>
      </view>

      <view class="form-item">
        <text class="label">调整原因</text>
        <textarea
          class="textarea"
          v-model="formData.reason"
          placeholder="请输入调整原因"
          maxlength="200"
        />
      </view>
    </view>

    <!-- 预览 -->
    <view v-if="selectedProduct && formData.quantity" class="section preview">
      <view class="preview-row">
        <text class="preview-label">调整前库存</text>
        <text class="preview-value">{{ selectedProduct.stock || 0 }}</text>
      </view>
      <view class="preview-row">
        <text class="preview-label">调整数量</text>
        <text :class="['preview-value', formData.quantity > 0 ? 'positive' : 'negative']">
          {{ formData.quantity > 0 ? '+' : '' }}{{ formData.quantity }}
        </text>
      </view>
      <view class="preview-row highlight">
        <text class="preview-label">调整后库存</text>
        <text class="preview-value">{{ (selectedProduct.stock || 0) + parseInt(formData.quantity || '0') }}</text>
      </view>
    </view>

    <!-- 提交按钮 -->
    <view class="action-buttons">
      <button class="btn-submit" :loading="submitting" @click="handleSubmit">确认调整</button>
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
            @click="selectProduct(product)"
          >
            <text class="picker-item-name">{{ product.name }}</text>
            <text class="picker-item-stock">库存: {{ product.stock || 0 }}</text>
          </view>
        </scroll-view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { callFunction } from '@/utils/cloudbase'
import AdminAuthManager from '@/utils/admin-auth'

// 状态
const showProductPicker = ref(false)
const products = ref<any[]>([])
const selectedProduct = ref<any>(null)
const submitting = ref(false)

// 表单数据
const formData = ref({
  quantity: '',
  reason: ''
})

// 生命周期
onMounted(() => {
  if (!AdminAuthManager.checkAuth()) return
  loadProducts()
})

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

// 选择商品
const selectProduct = (product: any) => {
  selectedProduct.value = product
  showProductPicker.value = false
}

// 调整数量
const adjustQuantity = (delta: number) => {
  const current = parseInt(formData.value.quantity || '0')
  formData.value.quantity = (current + delta).toString()
}

// 提交
const handleSubmit = async () => {
  if (!selectedProduct.value) {
    uni.showToast({ title: '请选择商品', icon: 'none' })
    return
  }

  const quantity = parseInt(formData.value.quantity || '0')
  if (quantity === 0) {
    uni.showToast({ title: '调整数量不能为0', icon: 'none' })
    return
  }

  const newStock = (selectedProduct.value.stock || 0) + quantity
  if (newStock < 0) {
    uni.showToast({ title: '调整后库存不能为负数', icon: 'none' })
    return
  }

  uni.showModal({
    title: '确认调整',
    content: `确定要将"${selectedProduct.value.name}"的库存${quantity > 0 ? '增加' : '减少'}${Math.abs(quantity)}吗？`,
    success: async (result) => {
      if (result.confirm) {
        try {
          submitting.value = true
          uni.showLoading({ title: '调整中...' })

          const res = await callFunction('admin-api', {
            action: 'adjustInventory',
            adminToken: AdminAuthManager.getToken(),
            data: {
              productId: selectedProduct.value._id,
              quantity,
              reason: formData.value.reason || (quantity > 0 ? '手动增加库存' : '手动减少库存')
            }
          })

          uni.hideLoading()

          if (res.code === 0) {
            uni.showToast({ title: '调整成功', icon: 'success' })

            // 更新显示
            selectedProduct.value.stock = res.data.afterStock
            formData.value.quantity = ''
            formData.value.reason = ''

            // 重新加载商品列表
            loadProducts()
          } else {
            uni.showToast({ title: res.msg || '调整失败', icon: 'none' })
          }
        } catch (e) {
          uni.hideLoading()
          console.error('调整失败', e)
          uni.showToast({ title: '网络错误', icon: 'none' })
        } finally {
          submitting.value = false
        }
      }
    }
  })
}
</script>

<style lang="scss" scoped>
.adjust-page {
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

.section-title {
  font-size: 28rpx;
  font-weight: bold;
  color: #F5F5F0;
  margin-bottom: 16rpx;

  &.required::after {
    content: '*';
    color: #B85C5C;
    margin-left: 8rpx;
  }
}

.product-select {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(255, 255, 255, 0.05);
  border: 1rpx solid rgba(201, 169, 98, 0.2);
  border-radius: 8rpx;
  padding: 24rpx;
}

.product-name {
  font-size: 28rpx;
  color: #F5F5F0;
}

.product-placeholder {
  font-size: 28rpx;
  color: rgba(245, 245, 240, 0.3);
}

.select-arrow {
  font-size: 32rpx;
  color: rgba(245, 245, 240, 0.3);
}

.current-stock {
  margin-top: 16rpx;
  padding: 16rpx;
  background: rgba(201, 169, 98, 0.1);
  border-radius: 8rpx;
}

.stock-label {
  font-size: 26rpx;
  color: rgba(245, 245, 240, 0.7);
}

.stock-value {
  font-size: 26rpx;
  color: #C9A962;
  font-weight: bold;
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

  &.required::after {
    content: '*';
    color: #B85C5C;
    margin-left: 8rpx;
  }
}

.quantity-input {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.qty-btn {
  width: 80rpx;
  height: 80rpx;
  background: rgba(201, 169, 98, 0.2);
  border: 1rpx solid rgba(201, 169, 98, 0.3);
  border-radius: 8rpx;
  font-size: 36rpx;
  color: #C9A962;
  display: flex;
  align-items: center;
  justify-content: center;
}

.qty-value {
  flex: 1;
  height: 80rpx;
  background: rgba(255, 255, 255, 0.05);
  border: 1rpx solid rgba(201, 169, 98, 0.2);
  border-radius: 8rpx;
  padding: 0 24rpx;
  font-size: 32rpx;
  color: #F5F5F0;
  text-align: center;
}

.quantity-hint {
  margin-top: 12rpx;
  font-size: 22rpx;
  color: rgba(245, 245, 240, 0.4);
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

.preview {
  background: rgba(201, 169, 98, 0.1);
  border-color: rgba(201, 169, 98, 0.2);
}

.preview-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12rpx 0;

  &.highlight {
    padding-top: 16rpx;
    border-top: 1rpx solid rgba(201, 169, 98, 0.2);
    margin-top: 8rpx;
  }
}

.preview-label {
  font-size: 26rpx;
  color: rgba(245, 245, 240, 0.7);
}

.preview-value {
  font-size: 28rpx;
  color: #F5F5F0;
  font-weight: bold;

  &.positive { color: #7A9A8E; }
  &.negative { color: #B85C5C; }
}

.action-buttons {
  margin-top: 40rpx;
}

.btn-submit {
  width: 100%;
  height: 96rpx;
  background: linear-gradient(145deg, #C8A464 0%, #A88B4A 100%);
  border-radius: 12rpx;
  font-size: 32rpx;
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

.picker-item-stock {
  font-size: 24rpx;
  color: rgba(245, 245, 240, 0.5);
  margin-top: 8rpx;
  display: block;
}
</style>
