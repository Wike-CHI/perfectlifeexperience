<template>
  <view class="products-page">
    <view class="page-header">
      <text class="page-title">商品管理</text>
      <button class="add-btn" @click="goToAdd">添加商品</button>
    </view>

    <view class="search-bar">
      <input class="search-input" v-model="searchKeyword" placeholder="搜索商品名称" @confirm="handleSearch" />
    </view>

    <view class="products-list">
      <view v-for="product in products" :key="product._id" class="product-item" @click="goToDetail(product._id)">
        <image class="product-image" :src="product.images[0]" mode="aspectFill" />
        <view class="product-info">
          <text class="product-name">{{ product.name }}</text>
          <text class="product-price">¥{{ (product.price / 100).toFixed(2) }}</text>
          <text class="product-stock">库存: {{ product.stock }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { callFunction } from '@/utils/cloudbase'

const products = ref<any[]>([])
const searchKeyword = ref('')

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

const goToAdd = () => {
  uni.navigateTo({ url: '/pagesAdmin/products/edit' })
}

const goToDetail = (id: string) => {
  uni.navigateTo({ url: `/pagesAdmin/products/edit?id=${id}` })
}
</script>

<style lang="scss" scoped>
.products-page {
  padding: 20rpx;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30rpx;
}

.page-title {
  font-size: 36rpx;
  font-weight: bold;
}

.add-btn {
  padding: 15rpx 30rpx;
  background: #C9A962;
  color: #fff;
  border-radius: 8rpx;
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
  padding: 20rpx;
  background: #fff;
  border-radius: 12rpx;
  margin-bottom: 20rpx;
}

.product-image {
  width: 150rpx;
  height: 150rpx;
  border-radius: 8rpx;
  margin-right: 20rpx;
}

.product-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 10rpx;
}

.product-name {
  font-size: 28rpx;
  font-weight: bold;
}

.product-price {
  color: #C9A962;
  font-size: 32rpx;
}

.product-stock {
  font-size: 24rpx;
  color: #999;
}
</style>
