<template>
  <view class="promotion-products-page">
    <!-- 页面头部 -->
    <view class="page-header">
      <text class="page-title">活动商品</text>
      <view class="add-btn" @click="showProductSelector = true">
        <text class="add-icon">+</text>
        <text class="add-text">添加商品</text>
      </view>
    </view>

    <!-- 已添加的商品列表 -->
    <view class="products-list">
      <view
        v-for="item in promotionProducts"
        :key="item._id"
        class="product-item"
      >
        <image class="product-image" :src="item.product?.images?.[0]" mode="aspectFill" />
        <view class="product-info">
          <text class="product-name">{{ item.product?.name || '未知商品' }}</text>
          <view class="product-price-row">
            <text class="price-label">原价:</text>
            <text class="price-original">¥{{ (item.product?.price || 0) / 100 }}</text>
            <text class="price-label">活动价:</text>
            <input
              v-model.number="item.discountPrice"
              type="digit"
              class="price-input"
              @blur="updateProductPrice(item)"
            />
            <text class="price-unit">元</text>
          </view>
          <view class="product-stock-row">
            <text class="stock-label">限量:</text>
            <input
              v-model.number="item.stockLimit"
              type="number"
              class="stock-input"
              @blur="updateProductStock(item)"
            />
            <text class="stock-unit">件</text>
            <text class="sold-count">已售: {{ item.soldCount || 0 }}</text>
          </view>
        </view>
        <view class="product-remove" @click="removeProduct(item)">
          <text class="remove-icon">×</text>
        </view>
      </view>

      <!-- 空状态 -->
      <view v-if="promotionProducts.length === 0 && !loading" class="empty-state">
        <AdminIcon name="package" size="large" />
        <text class="empty-text">暂无商品</text>
        <view class="empty-action" @click="showProductSelector = true">
          <text class="empty-action-text">添加第一个商品</text>
        </view>
      </view>

      <!-- 加载状态 -->
      <view v-if="loading" class="loading-wrapper">
        <view class="loading-spinner"></view>
      </view>
    </view>

    <!-- 商品选择器弹窗 -->
    <view v-if="showProductSelector" class="selector-modal" @click.self="showProductSelector = false">
      <view class="selector-content">
        <view class="selector-header">
          <text class="selector-title">选择商品</text>
          <view class="selector-close" @click="showProductSelector = false">
            <text class="close-icon">×</text>
          </view>
        </view>

        <input
          v-model="searchKeyword"
          class="search-input"
          placeholder="搜索商品名称"
          @input="searchProducts"
        />

        <scroll-view class="product-selector-list" scroll-y enhanced show-scrollbar="false">
          <view
            v-for="product in availableProducts"
            :key="product._id"
            class="selector-item"
            @click="selectProduct(product)"
          >
            <image class="selector-image" :src="product.images?.[0]" mode="aspectFill" />
            <view class="selector-info">
              <text class="selector-name">{{ product.name }}</text>
              <text class="selector-price">¥{{ (product.price || 0) / 100 }}</text>
            </view>
            <view class="selector-check">
              <text class="check-icon">+</text>
            </view>
          </view>

          <view v-if="availableProducts.length === 0" class="selector-empty">
            <text class="empty-text">暂无商品</text>
          </view>
        </scroll-view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import AdminAuthManager from '@/utils/admin-auth'
import { callFunction } from '@/utils/cloudbase'
import AdminIcon from '@/components/admin-icon.vue'

const promotionId = ref('')
const loading = ref(false)
const showProductSelector = ref(false)
const searchKeyword = ref('')

const promotionProducts = ref<any[]>([])
const availableProducts = ref<any[]>([])

onMounted(() => {
  if (!AdminAuthManager.checkAuth()) return
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1] as any
  const options = currentPage.options || {}
  if (options.id) {
    promotionId.value = options.id
    loadPromotionProducts()
    loadAvailableProducts()
  }
})

const loadPromotionProducts = async () => {
  try {
    loading.value = true
    const res = await callFunction('admin-api', {
      action: 'getPromotionProducts',
      adminToken: AdminAuthManager.getToken(),
      data: { promotionId: promotionId.value }
    })
    if (res.code === 0) {
      promotionProducts.value = res.data || []
      // Convert price from cents to yuan for display
      promotionProducts.value.forEach(p => {
        p.discountPrice = (p.discountPrice || 0) / 100
      })
    }
  } catch (error: any) {
    console.error('加载活动商品失败:', error)
  } finally {
    loading.value = false
  }
}

const loadAvailableProducts = async () => {
  try {
    const res = await callFunction('admin-api', {
      action: 'getProducts',
      adminToken: AdminAuthManager.getToken(),
      data: { page: 1, limit: 100 }
    })
    if (res.code === 0) {
      // Filter out already added products
      const addedIds = promotionProducts.value.map(p => p.productId)
      availableProducts.value = (res.data.list || []).filter(
        (p: any) => !addedIds.includes(p._id)
      )
    }
  } catch (error: any) {
    console.error('加载商品列表失败:', error)
  }
}

const searchProducts = () => {
  if (!searchKeyword.value) {
    loadAvailableProducts()
    return
  }
  availableProducts.value = availableProducts.value.filter(
    (p: any) => p.name.toLowerCase().includes(searchKeyword.value.toLowerCase())
  )
}

const selectProduct = async (product: any) => {
  uni.showModal({
    title: '设置活动价格',
    content: `原价: ¥${(product.price || 0) / 100}\n请输入活动价格（元）`,
    editable: true,
    placeholderText: '输入活动价格',
    success: async (res) => {
      if (res.confirm) {
        const discountPrice = parseFloat(res.content) || 0
        try {
          const result = await callFunction('admin-api', {
            action: 'addPromotionProducts',
            adminToken: AdminAuthManager.getToken(),
            data: {
              promotionId: promotionId.value,
              products: [
                {
                  productId: product._id,
                  discountPrice: Math.round(discountPrice * 100),
                  stockLimit: 0
                }
              ]
            }
          })
          if (result.code === 0) {
            showProductSelector.value = false
            loadPromotionProducts()
            loadAvailableProducts()
            uni.showToast({ title: '添加成功', icon: 'success' })
          }
        } catch (error: any) {
          uni.showToast({ title: error.message || '添加失败', icon: 'none' })
        }
      }
    }
  })
}

const updateProductPrice = async (item: any) => {
  try {
    await callFunction('admin-api', {
      action: 'removePromotionProduct',
      adminToken: AdminAuthManager.getToken(),
      data: { id: item._id }
    })
    await callFunction('admin-api', {
      action: 'addPromotionProducts',
      adminToken: AdminAuthManager.getToken(),
      data: {
        promotionId: promotionId.value,
        products: [
          {
            productId: item.productId,
            discountPrice: Math.round((item.discountPrice || 0) * 100),
            stockLimit: item.stockLimit || 0
          }
        ]
      }
    })
    await loadPromotionProducts()
  } catch (error: any) {
    console.error('更新价格失败:', error)
  }
}

const updateProductStock = async (item: any) => {
  await updateProductPrice(item)
}

const removeProduct = async (item: any) => {
  uni.showModal({
    title: '确认移除',
    content: '确定要从活动中移除此商品吗？',
    success: async (res) => {
      if (res.confirm) {
        try {
          const result = await callFunction('admin-api', {
            action: 'removePromotionProduct',
            adminToken: AdminAuthManager.getToken(),
            data: { id: item._id }
          })
          if (result.code === 0) {
            loadPromotionProducts()
            loadAvailableProducts()
            uni.showToast({ title: '移除成功', icon: 'success' })
          }
        } catch (error: any) {
          uni.showToast({ title: error.message || '移除失败', icon: 'none' })
        }
      }
    }
  })
}
</script>

<style scoped>
.promotion-products-page {
  min-height: 100vh;
  background: #0D0D0D;
  padding: 24rpx;
  padding-bottom: 120rpx;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24rpx;
}

.page-title {
  font-size: 48rpx;
  font-weight: 700;
  color: #F5F5F0;
  letter-spacing: 2rpx;
}

.add-btn {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 12rpx 24rpx;
  background: linear-gradient(145deg, #C8A464 0%, #A88B4A 100%);
  border-radius: 28rpx;
}

.add-icon {
  font-size: 28rpx;
  color: #0D0D0D;
  font-weight: 700;
}

.add-text {
  font-size: 26rpx;
  color: #0D0D0D;
  font-weight: 600;
}

/* 商品列表 */
.products-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.product-item {
  display: flex;
  gap: 16rpx;
  padding: 16rpx;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 16rpx;
  border: 1rpx solid rgba(201, 169, 98, 0.1);
  position: relative;
}

.product-image {
  width: 120rpx;
  height: 120rpx;
  border-radius: 12rpx;
  flex-shrink: 0;
  background: rgba(201, 169, 98, 0.1);
}

.product-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  min-width: 0;
}

.product-name {
  font-size: 28rpx;
  color: #F5F5F0;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.product-price-row,
.product-stock-row {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.price-label,
.stock-label {
  font-size: 22rpx;
  color: rgba(245, 245, 240, 0.5);
}

.price-original {
  font-size: 24rpx;
  color: rgba(245, 245, 240, 0.4);
  text-decoration: line-through;
  margin-right: 8rpx;
}

.price-input,
.stock-input {
  width: 120rpx;
  padding: 4rpx 8rpx;
  background: rgba(201, 169, 98, 0.1);
  border: 1rpx solid rgba(201, 169, 98, 0.2);
  border-radius: 8rpx;
  font-size: 24rpx;
  color: #C9A962;
  text-align: center;
}

.price-unit,
.stock-unit {
  font-size: 22rpx;
  color: rgba(245, 245, 240, 0.5);
}

.sold-count {
  margin-left: auto;
  font-size: 22rpx;
  color: rgba(245, 245, 240, 0.4);
}

.product-remove {
  position: absolute;
  top: 8rpx;
  right: 8rpx;
  width: 40rpx;
  height: 40rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(184, 92, 92, 0.2);
  border-radius: 50%;
}

.remove-icon {
  font-size: 32rpx;
  color: #B85C5C;
  line-height: 1;
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 120rpx 40rpx;
}

.empty-icon {
  font-size: 80rpx;
  margin-bottom: 24rpx;
}

.empty-text {
  font-size: 26rpx;
  color: rgba(245, 245, 240, 0.4);
  margin-bottom: 32rpx;
}

.empty-action {
  padding: 12rpx 32rpx;
  background: linear-gradient(145deg, #C8A464 0%, #A88B4A 100%);
  border-radius: 28rpx;
}

.empty-action-text {
  font-size: 26rpx;
  color: #0D0D0D;
  font-weight: 600;
}

/* 加载状态 */
.loading-wrapper {
  display: flex;
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
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* 商品选择器 */
.selector-modal {
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

.selector-content {
  width: 100%;
  max-height: 80vh;
  background: #1A1A1A;
  border-radius: 24rpx 24rpx 0 0;
  padding: 24rpx;
  display: flex;
  flex-direction: column;
}

.selector-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24rpx;
}

.selector-title {
  font-size: 32rpx;
  font-weight: 700;
  color: #F5F5F0;
}

.selector-close {
  width: 40rpx;
  height: 40rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-icon {
  font-size: 40rpx;
  color: rgba(245, 245, 240, 0.5);
  line-height: 1;
}

.search-input {
  width: 100%;
  padding: 16rpx 20rpx;
  background: rgba(255, 255, 255, 0.05);
  border: 1rpx solid rgba(201, 169, 98, 0.15);
  border-radius: 12rpx;
  font-size: 28rpx;
  color: #F5F5F0;
  margin-bottom: 16rpx;
}

.product-selector-list {
  flex: 1;
  overflow-y: auto;
}

.selector-item {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 16rpx;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 12rpx;
  margin-bottom: 12rpx;
}

.selector-image {
  width: 80rpx;
  height: 80rpx;
  border-radius: 8rpx;
  flex-shrink: 0;
  background: rgba(201, 169, 98, 0.1);
}

.selector-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
  min-width: 0;
}

.selector-name {
  font-size: 26rpx;
  color: #F5F5F0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.selector-price {
  font-size: 24rpx;
  color: #C9A962;
}

.selector-check {
  width: 40rpx;
  height: 40rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(201, 169, 98, 0.2);
  border-radius: 50%;
}

.check-icon {
  font-size: 32rpx;
  color: #C9A962;
  line-height: 1;
}

.selector-empty {
  padding: 60rpx 40rpx;
  text-align: center;
}
</style>
