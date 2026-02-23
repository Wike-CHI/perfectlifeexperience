<template>
  <view class="inventory-page">
    <view class="page-title">库存管理</view>

    <view class="search-bar">
      <input class="search-input" v-model="keyword" placeholder="搜索商品" @confirm="handleSearch" />
    </view>

    <view class="products-list">
      <view v-for="product in products" :key="product._id" class="product-item">
        <view class="product-info">
          <text class="product-name">{{ product.name }}</text>
          <text class="product-sku">SKU: {{ product.sku || '未设置' }}</text>
        </view>
        <view class="stock-control">
          <button class="stock-btn" @click="adjustStock(product._id, -1)">-</button>
          <text class="stock-value">{{ product.stock }}</text>
          <button class="stock-btn" @click="adjustStock(product._id, 1)">+</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { callFunction } from '@/utils/cloudbase'

const products = ref<any[]>([])
const keyword = ref('')

onMounted(() => {
  loadProducts()
})

const loadProducts = async () => {
  try {
    const res = await callFunction('product', {
      action: 'getProducts',
      data: {}
    })
    if (res.code === 0) {
      products.value = res.data || []
    }
  } catch (e) {
    console.error('加载商品失败', e)
  }
}

const handleSearch = () => {
  // TODO: 实现搜索
}

const adjustStock = async (id: string, delta: number) => {
  // TODO: 实现库存调整
  uni.showToast({ title: '功能开发中', icon: 'none' })
}
</script>

<style lang="scss" scoped>
.inventory-page {
  padding: 20rpx;
}

.page-title {
  font-size: 36rpx;
  font-weight: bold;
  text-align: center;
  margin-bottom: 40rpx;
}

.search-bar {
  margin-bottom: 20rpx;
}

.search-input {
  width: 100%;
  height: 70rpx;
  padding: 0 20rpx;
  background: #f5f5f5;
  border-radius: 8rpx;
}

.product-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 25rpx;
  background: #fff;
  border-radius: 12rpx;
  margin-bottom: 15rpx;
}

.product-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.product-name {
  font-size: 28rpx;
  font-weight: bold;
}

.product-sku {
  font-size: 22rpx;
  color: #999;
}

.stock-control {
  display: flex;
  align-items: center;
  gap: 20rpx;
}

.stock-btn {
  width: 50rpx;
  height: 50rpx;
  background: #C9A962;
  color: #fff;
  border-radius: 8rpx;
  font-size: 28rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stock-value {
  min-width: 60rpx;
  text-align: center;
  font-size: 28rpx;
  font-weight: bold;
}
</style>
