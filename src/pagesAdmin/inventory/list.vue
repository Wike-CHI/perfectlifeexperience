<template>
  <view class="inventory-page">
    <view class="page-title">库存管理</view>

    <admin-search
      placeholder="搜索商品名称或SKU"
      :show-filter="true"
      :filter-options="filterOptions"
      @search="handleSearch"
    />

    <view class="products-list">
      <view v-for="product in products" :key="product._id" class="product-item">
        <view class="product-info">
          <text class="product-name">{{ product.name }}</text>
          <text class="product-sku">SKU: {{ product.sku || '未设置' }}</text>
        </view>
        <view class="stock-control">
          <button class="stock-btn" @click="handleStockAdjust(product, -1)">-</button>
          <text class="stock-value">{{ product.stock }}</text>
          <button class="stock-btn" @click="handleStockAdjust(product, 1)">+</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { callFunction } from '@/utils/cloudbase'
import AdminAuthManager from '@/utils/admin-auth'
import AdminSearch from '@/components/admin-search.vue'

const products = ref<any[]>([])
const keyword = ref('')
const selectedFilters = ref<Record<string, any>>({})

// 筛选选项
const filterOptions = [
  { key: 'lowStock', label: '库存预警' },
  { key: 'outOfStock', label: '已售罄' }
]

onMounted(() => {
  loadProducts()
})

const loadProducts = async () => {
  try {
    const res = await callFunction('admin-api', {
      action: 'getProducts',
      adminToken: AdminAuthManager.getToken(),
      data: {
        keyword: keyword.value || undefined
      }
    })
    if (res.code === 0) {
      let productList = res.data.list || []

      // 前端筛选库存预警和售罄
      if (selectedFilters.value.lowStock) {
        productList = productList.filter((p: any) => p.stock > 0 && p.stock <= 10)
      }
      if (selectedFilters.value.outOfStock) {
        productList = productList.filter((p: any) => p.stock === 0)
      }

      products.value = productList
    } else {
      uni.showToast({ title: res.msg || '加载失败', icon: 'none' })
    }
  } catch (e) {
    console.error('加载商品失败', e)
    uni.showToast({ title: '网络错误', icon: 'none' })
  }
}

const handleSearch = (searchKeyword: string, filters: Record<string, any>) => {
  keyword.value = searchKeyword
  selectedFilters.value = filters
  loadProducts()
}

const handleStockAdjust = async (product: any, delta: number) => {
  try {
    uni.showLoading({ title: '调整中...' })

    const res = await callFunction('admin-api', {
      action: 'adjustProductStock',
      adminToken: AdminAuthManager.getToken(),
      data: {
        productId: product._id,
        delta,
        reason: delta > 0 ? '手动入库' : '手动出库'
      }
    })

    uni.hideLoading()

    if (res.code === 0) {
      uni.showToast({
        title: `${delta > 0 ? '+' : ''}${delta} ${res.data.oldStock} → ${res.data.newStock}`,
        icon: 'none'
      })
      // 刷新列表
      await loadProducts()
    } else {
      uni.showToast({
        title: res.msg || '调整失败',
        icon: 'none'
      })
    }
  } catch (e: any) {
    uni.hideLoading()
    uni.showToast({
      title: e.message || '网络错误',
      icon: 'none'
    })
  }
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
