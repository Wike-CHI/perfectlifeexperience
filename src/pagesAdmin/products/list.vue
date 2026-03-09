<template>
  <view class="products-page">
    <view class="page-header">
      <text class="page-title">商品管理</text>
      <view class="add-btn" @click="goToAdd">
        <text class="add-icon">+</text>
        <text class="add-text">添加商品</text>
      </view>
    </view>

    <!-- 搜索组件 -->
    <admin-search
      placeholder="搜索商品名称"
      :show-filter="true"
      :filter-options="filterOptions"
      @search="handleSearch"
    />

    <!-- 分类筛选标签 -->
    <scroll-view class="category-scroll" scroll-x enhanced show-scrollbar="false">
      <view class="category-list">
        <view
          class="category-item"
          :class="{ active: !selectedCategory }"
          @click="selectCategory('')"
        >
          <text class="category-text">全部</text>
        </view>
        <view
          v-for="cat in categories"
          :key="cat._id"
          class="category-item"
          :class="{ active: selectedCategory === cat._id }"
          @click="selectCategory(cat._id)"
        >
          <text class="category-text">{{ cat.name }}</text>
        </view>
      </view>
    </scroll-view>

    <!-- 商品列表 -->
    <view class="products-list">
      <view
        v-for="product in list"
        :key="product._id"
        class="product-item"
        @click="goToDetail(product._id)"
      >
        <image class="product-image" :src="product.images?.[0] || product.image || '/static/images/default.png'" mode="aspectFill" />
        <view class="product-info">
          <text class="product-name">{{ product.name }}</text>
          <text class="product-category">{{ getCategoryName(product.category) }}</text>
          <view class="product-meta">
            <text class="product-price">¥{{ formatPrice(product.price) }}</text>
            <text class="product-stock">库存: {{ product.stock }}</text>
          </view>
          <view class="product-status">
            <view :class="['status-badge', product.stock > 0 ? 'active' : 'inactive']">
              <text class="status-text">{{ product.stock > 0 ? '在售' : '售罄' }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 空状态 -->
      <view v-if="list.length === 0 && !loading" class="empty-state">
        <AdminIcon name="package" size="large" />
        <text class="empty-text">暂无商品</text>
      </view>

      <!-- 加载状态 -->
      <view v-if="loading" class="loading-wrapper">
        <view class="loading-spinner"></view>
      </view>
    </view>

    <!-- 加载更多 -->
    <view v-if="hasMore && !loading" class="load-more" @click="loadMore">
      <text class="load-more-text">加载更多</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { onPullDownRefresh, onReachBottom } from '@dcloudio/uni-app'
import { callFunction } from '@/utils/cloudbase'
import { useAdminList } from '@/composables/useAdmin'
import AdminSearch from '@/components/admin-search.vue'
import AdminIcon from '@/components/admin-icon.vue'

/**
 * 商品管理页面
 * 使用 useAdminList composable 简化代码
 */

// 分类数据
const categories = ref<any[]>([])
const selectedCategory = ref('')

// 分类筛选选项
const filterOptions = [
  { key: 'inStock', label: '有货' },
  { key: 'outOfStock', label: '缺货' }
]

// 加载分类列表
const loadCategories = async () => {
  try {
    const res = await callFunction('admin-api', {
      action: 'getCategories'
    })

    if (res.code === 0 && res.data) {
      if (Array.isArray(res.data)) {
        categories.value = res.data
      } else if (res.data.list) {
        categories.value = res.data.list
      } else if (res.data.categories) {
        categories.value = res.data.categories
      } else {
        categories.value = []
      }
    }
  } catch (error) {
    console.error('加载分类失败:', error)
  }
}

// 获取选中分类名称
const categoryFilter = computed(() => {
  if (!selectedCategory.value) return undefined
  const selectedCat = categories.value.find(c => c._id === selectedCategory.value)
  return selectedCat?.name
})

// 使用 useAdminList
const {
  list,
  loading,
  hasMore,
  search,
  loadMore,
  refresh
} = useAdminList({
  action: 'getProducts',
  cachePrefix: 'products',
  pageSize: 20,
  extraParams: computed(() => ({
    category: categoryFilter.value
  })),
  onLoaded: (data) => {
    console.log('商品列表加载完成', data.length)
  },
  onError: (error) => {
    console.error('加载商品失败', error)
  }
})

// 初始化
onMounted(async () => {
  await loadCategories()
})

// 监听分类变化
watch(selectedCategory, () => {
  refresh()
})

// 处理搜索
const handleSearch = (keyword: string, filters: Record<string, any>) => {
  search(keyword)
}

// 选择分类
const selectCategory = (categoryId: string) => {
  selectedCategory.value = categoryId
}

// 格式化价格
const formatPrice = (price: number): string => {
  return (price / 100).toFixed(2)
}

// 获取分类名称
const getCategoryName = (category: string): string => {
  if (!category) return '未分类'
  const cat = categories.value.find(c => c._id === category)
  if (cat) return cat.name
  const catByName = categories.value.find(c => c.name === category)
  if (catByName) return catByName.name
  return category || '未分类'
}

// 跳转到添加页面
const goToAdd = () => {
  uni.navigateTo({
    url: '/pagesAdmin/products/edit'
  })
}

// 跳转到详情页
const goToDetail = (id: string) => {
  uni.navigateTo({
    url: `/pagesAdmin/products/edit?id=${id}`
  })
}

// 下拉刷新
onPullDownRefresh(async () => {
  await refresh()
  uni.stopPullDownRefresh()
})

// 上拉加载更多
onReachBottom(() => {
  loadMore()
})
</script>

<style scoped>
.products-page {
  min-height: 100vh;
  background: #0D0D0D;
  padding: 24rpx;
  padding-bottom: 120rpx;
}

/* 页面头部 */
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

/* 分类滚动条 */
.category-scroll {
  margin-bottom: 16rpx;
}

.category-list {
  display: flex;
  gap: 12rpx;
  padding: 0 4rpx;
}

.category-item {
  padding: 12rpx 24rpx;
  background: rgba(255, 255, 255, 0.03);
  border: 1rpx solid rgba(201, 169, 98, 0.15);
  border-radius: 28rpx;
  flex-shrink: 0;
}

.category-item.active {
  background: linear-gradient(145deg, #C8A464 0%, #A88B4A 100%);
  border-color: transparent;
}

.category-text {
  font-size: 24rpx;
  color: rgba(245, 245, 240, 0.6);
  white-space: nowrap;
}

.category-item.active .category-text {
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

.product-category {
  font-size: 22rpx;
  color: rgba(245, 245, 240, 0.4);
}

.product-meta {
  display: flex;
  gap: 16rpx;
  align-items: center;
}

.product-price {
  font-size: 28rpx;
  font-weight: 700;
  color: #C9A962;
}

.product-stock {
  font-size: 22rpx;
  color: rgba(245, 245, 240, 0.5);
}

.product-status {
  display: flex;
  gap: 8rpx;
}

.status-badge {
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
  font-size: 20rpx;
}

.status-badge.active {
  background: rgba(122, 154, 142, 0.2);
}

.status-badge.active .status-text {
  color: #7A9A8E;
}

.status-badge.inactive {
  background: rgba(184, 92, 92, 0.2);
}

.status-badge.inactive .status-text {
  color: #B85C5C;
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

/* 加载更多 */
.load-more {
  text-align: center;
  padding: 32rpx;
}

.load-more-text {
  font-size: 26rpx;
  color: #C9A962;
}
</style>
