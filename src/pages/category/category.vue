<template>
  <view class="container">
    <!-- 顶部店铺信息区 -->
    <view class="store-header">
      <view class="store-main">
        <view class="store-info">
          <view class="store-name-row">
            <!-- 店铺Logo -->
            <image class="store-logo" src="/static/logo.png" mode="aspectFit" />
            <text class="store-name">大友元气</text>
          </view>
          <view class="store-meta">
            <text class="distance" :class="{'loading': loadingDistance}" @click="loadDistance">{{ formatDistance }}</text>
            <text class="switch-store">切换门店 ></text>
          </view>
        </view>
        <view class="delivery-tabs">
          <view 
            class="tab-item" 
            :class="{ active: deliveryType === 'pickup' }"
            @click="switchDeliveryType('pickup')"
          >
            <text class="tab-text">自提</text>
          </view>
          <view 
            class="tab-item" 
            :class="{ active: deliveryType === 'delivery' }"
            @click="switchDeliveryType('delivery')"
          >
            <text class="tab-text">外卖</text>
          </view>
        </view>
      </view>
      <view class="announcement-bar">
        <view class="announcement-icon">
          <view class="horn-body"></view>
          <view class="horn-mouth"></view>
        </view>
        <text class="announcement-text">商家暂无公告</text>
        <text class="announcement-more">更多 ></text>
      </view>
    </view>

    <!-- 商家推荐 -->
    <view class="recommend-section" v-if="recommendProducts.length > 0">
      <view class="section-title">
        <text class="title-text">商家推荐</text>
      </view>
      <scroll-view class="recommend-scroll" scroll-x enhanced show-scrollbar="false">
        <view class="recommend-list">
          <view 
            class="recommend-card" 
            v-for="(product, index) in recommendProducts" 
            :key="index"
            @click="goToDetail(product)"
          >
            <image class="recommend-image" :src="product.images[0]" mode="aspectFill" />
            <view class="recommend-info">
              <text class="recommend-name">{{ product.name }}</text>
              <view class="recommend-bottom">
                <text class="recommend-price">¥{{ formatPrice(product.price) }}</text>
                <view 
                  class="select-btn" 
                  :class="{ 'has-spec': product.priceList && product.priceList.length > 1 }"
                  @click.stop="handleRecommendAdd(product)"
                >
                  <text class="select-text">{{ product.priceList && product.priceList.length > 1 ? '选择' : '+' }}</text>
                </view>
              </view>
            </view>
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- 分类内容区 -->
    <view class="category-content">
      <!-- 左侧分类导航 -->
      <scroll-view class="category-nav" scroll-y>
        <view 
          class="nav-item" 
          :class="{ active: currentCategory === 'all' }"
          @click="selectCategory('all')"
        >
          <view class="nav-icon all-icon">
            <view class="grid-dot" v-for="n in 4" :key="n"></view>
          </view>
          <text class="nav-text">全部</text>
        </view>
        <view 
          class="nav-item" 
          v-for="(category, index) in categories" 
          :key="index"
          :class="{ active: currentCategory === category.name }"
          @click="selectCategory(category.name)"
        >
          <!-- 使用 SVG 图标 -->
          <CategoryIcon :type="getCategoryIconType(category.name)" size="48rpx" />
          <text class="nav-text">{{ category.name }}</text>
        </view>
      </scroll-view>

      <!-- 右侧商品列表 -->
      <scroll-view class="product-area" scroll-y @scrolltolower="loadMore">
        <!-- 分类标题和排序 -->
        <view class="category-header">
          <view class="category-tag">
            <text class="tag-text">{{ currentCategoryName }}</text>
          </view>
          <view class="sort-bar">
            <text 
              class="sort-item" 
              :class="{ active: sortBy === 'default' }"
              @click="changeSort('default')"
            >综合</text>
            <text 
              class="sort-item" 
              :class="{ active: sortBy === 'sales' }"
              @click="changeSort('sales')"
            >销量</text>
            <text 
              class="sort-item" 
              :class="{ active: sortBy === 'price' }"
              @click="changeSort('price')"
            >价格</text>
          </view>
        </view>

        <!-- 商品列表 -->
        <view class="product-list">
          <view 
            class="product-item" 
            v-for="(product, index) in products" 
            :key="index"
            @click="goToDetail(product)"
          >
            <image class="product-image" :src="product.images[0]" mode="aspectFill" />
            <view class="product-info">
              <text class="product-name">{{ product.name }}</text>
              <text class="product-desc" v-if="product.description">{{ product.description }}</text>
              <text class="product-brewery" v-else>{{ product.brewery }}</text>
              <view class="product-meta">
                <text class="sales">销量{{ product.sales || 0 }}</text>
              </view>
              <view class="product-bottom">
                <view class="price-section">
                  <text class="price-symbol">¥</text>
                  <text class="price">{{ formatPrice(product.price) }}</text>
                  <text class="price-suffix" v-if="product.priceList && product.priceList.length > 1">起</text>
                </view>
                <view class="add-cart" @click.stop="addToCart(product)">
                  <view class="plus-icon">
                    <view class="plus-h"></view>
                    <view class="plus-v"></view>
                  </view>
                </view>
              </view>
            </view>
          </view>
        </view>

        <!-- 加载状态 -->
        <view class="load-status">
          <text v-if="loading" class="status-text">加载中...</text>
          <text v-else-if="!hasMore && products.length > 0" class="status-text">没有更多了</text>
        </view>

        <!-- 空状态 -->
        <view class="empty-state" v-if="!loading && products.length === 0">
          <view class="empty-icon">
            <view class="beer-mug">
              <view class="mug-body"></view>
              <view class="mug-handle"></view>
              <view class="foam"></view>
            </view>
          </view>
          <text class="empty-text">暂无商品</text>
        </view>
      </scroll-view>
    </view>
    
    <!-- 规格选择弹窗 -->
    <product-sku-popup
      v-if="currentProduct"
      v-model:visible="skuPopupVisible"
      :product="currentProduct"
      @success="onAddToCartSuccess"
    />
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { onLoad, onPullDownRefresh } from '@dcloudio/uni-app';
import { getProducts, getCategories, addToCart as addToCartApi, formatPrice } from '@/utils/api';
import { getDistanceToStore, formatDistance, getDistanceLevel, STORE_LOCATION } from '@/utils/distance';
import ProductSkuPopup from '@/components/ProductSkuPopup.vue';
import CategoryIcon from '@/components/CategoryIcon.vue';
import DistanceBadge from '@/components/distance-badge.vue';

// 类型定义（内联，避免分包导入问题）
interface Product {
  _id: string
  name: string
  enName?: string
  description?: string
  images: string[]
  price: number
  priceList?: Array<{ volume: string; price: number }>
  volume?: string
  stock?: number
  sales?: number
  category?: string
  tags?: string[]
  alcoholContent?: number
  brewery?: string
}

interface Category {
  _id: string
  name: string
  icon: string
  sort: number
}

// 数据
const categories = ref<Category[]>([]);
const products = ref<Product[]>([]);

// 距离相关状态
const distance = ref<number | null>(null);
const loadingDistance = ref(false);

// 距离格式化显示
const formatDistance = computed(() => {
  if (loadingDistance.value) return '获取中...';
  if (distance.value === null) return '--';
  return formatDistance(distance.value);
});

// 加载距离
const loadDistance = async () => {
  try {
    loadingDistance.value = true;
    distance.value = await getDistanceToStore();
  } catch (error) {
    console.error('获取距离失败:', error);
    distance.value = null;
  } finally {
    loadingDistance.value = false;
  }
};

// 获取分类图标类型
const getCategoryIconType = (categoryName: string): 'beer' | 'cocktail' => {
  const iconMap: Record<string, 'beer' | 'cocktail'> = {
    '鲜啤外带': 'beer',
    '增味啤': 'cocktail'
  };
  return iconMap[categoryName] || 'beer';
};
const recommendProducts = ref<Product[]>([]);
const currentCategory = ref('all');
const sortBy = ref('default');
const loading = ref(false);
const hasMore = ref(true);
const page = ref(1);
const pageSize = 10;
const deliveryType = ref<'pickup' | 'delivery'>('pickup');

// 弹窗状态
const skuPopupVisible = ref(false);
const currentProduct = ref<Product | null>(null);

// 计算当前分类名称
const currentCategoryName = computed(() => {
  if (currentCategory.value === 'all') return '全部商品';
  const cat = categories.value.find(c => c.name === currentCategory.value);
  return cat?.name || '全部商品';
});

// 切换配送方式
const switchDeliveryType = (type: 'pickup' | 'delivery') => {
  deliveryType.value = type;
};

// 获取分类列表
const loadCategories = async () => {
  try {
    const res = await getCategories();
    categories.value = res.filter((c: any) => c.name !== '全部');
  } catch (error) {
    console.error('加载分类失败:', error);
  }
};

// 获取推荐商品
const loadRecommendProducts = async () => {
  try {
    const res = await getProducts({ page: 1, limit: 6, sort: 'recommend' });
    recommendProducts.value = res;
  } catch (error) {
    console.error('加载推荐商品失败:', error);
  }
};

// 获取商品列表
const loadProducts = async (isRefresh = false) => {
  if (loading.value) return;
  
  try {
    loading.value = true;
    
    if (isRefresh) {
      page.value = 1;
      products.value = [];
    }
    
    const params: any = {
      page: page.value,
      limit: pageSize
    };
    
    if (currentCategory.value !== 'all') {
      params.category = currentCategory.value;
    }
    
    const res = await getProducts(params);
    
    if (res.length < pageSize) {
      hasMore.value = false;
    }
    
    // 排序
    let sortedRes = [...res];
    if (sortBy.value === 'sales') {
      sortedRes.sort((a, b) => (b.sales || 0) - (a.sales || 0));
    } else if (sortBy.value === 'price') {
      sortedRes.sort((a, b) => a.price - b.price);
    }
    
    if (isRefresh) {
      products.value = sortedRes;
    } else {
      products.value.push(...sortedRes);
    }
    
  } catch (error) {
    console.error('加载商品失败:', error);
    uni.showToast({
      title: '加载失败',
      icon: 'none'
    });
  } finally {
    loading.value = false;
  }
};

// 加载更多
const loadMore = () => {
  if (!hasMore.value || loading.value) return;
  page.value++;
  loadProducts();
};

// 选择分类
const selectCategory = (name: string) => {
  currentCategory.value = name;
  loadProducts(true);
};

// 切换排序
const changeSort = (sort: string) => {
  sortBy.value = sort;
  loadProducts(true);
};

// 处理推荐商品添加
const handleRecommendAdd = (product: Product) => {
  if (product.priceList && product.priceList.length > 1) {
    currentProduct.value = product;
    skuPopupVisible.value = true;
  } else {
    addToCart(product);
  }
};

// 打开规格选择弹窗
const addToCart = (product: Product) => {
  currentProduct.value = product;
  skuPopupVisible.value = true;
};

// 加入购物车成功回调
const onAddToCartSuccess = () => {
  // 可以做一些后续操作
};

// 页面跳转
const goToDetail = (product: Product) => {
  uni.navigateTo({
    url: `/pages/product/detail?id=${product._id}`
  });
};

// 生命周期
onLoad(() => {
  loadCategories();
  loadRecommendProducts();
  loadDistance();

  // 检查是否有选中的分类或排序
  const selected = uni.getStorageSync('selectedCategory');
  const sort = uni.getStorageSync('sortType');

  if (selected) {
    currentCategory.value = selected;
    uni.removeStorageSync('selectedCategory');
  }

  if (sort) {
    sortBy.value = sort;
    uni.removeStorageSync('sortType');
  }

  loadProducts(true);
});

onPullDownRefresh(() => {
  loadCategories();
  loadRecommendProducts();
  loadProducts(true).then(() => {
    uni.stopPullDownRefresh();
  });
});
</script>

<style scoped>
/* ============================================
   分类页面 - 深色奢华主题
   ============================================ */

.container {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #0D0D0D;
}

/* ============================================
   顶部店铺信息区
   ============================================ */
.store-header {
  background: #0D0D0D;
  border-bottom: 1rpx solid rgba(200, 164, 100, 0.1);
}

.store-main {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 24rpx 32rpx;
}

.store-info {
  flex: 1;
}

.store-name-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 12rpx;
}

/* 店铺Logo */
.store-logo {
  width: 48rpx;
  height: 48rpx;
  background-color: #FFFFFF;
  border-radius: 50%;
  padding: 6rpx;
  box-sizing: border-box;
}

.store-name {
  font-size: 36rpx;
  font-weight: 700;
  color: #F5F5F0;
  letter-spacing: 2rpx;
  font-family: 'DIN Alternate', 'Avenir Next', sans-serif;
}

.store-meta {
  display: flex;
  align-items: center;
  gap: 20rpx;
}

.distance {
  font-size: 24rpx;
  color: rgba(245, 245, 240, 0.6);
  transition: all 0.3s ease;
}

.distance.loading {
  color: #C8A464;
  opacity: 0.7;
}

.distance:active {
  opacity: 0.5;
}

.switch-store {
  font-size: 24rpx;
  color: #C8A464;
}

/* 配送方式切换 */
.delivery-tabs {
  display: flex;
  background: rgba(200, 164, 100, 0.1);
  border-radius: 32rpx;
  padding: 4rpx;
}

.tab-item {
  padding: 12rpx 28rpx;
  border-radius: 28rpx;
}

.tab-item.active {
  background: #C8A464;
}

.tab-text {
  font-size: 26rpx;
  color: rgba(245, 245, 240, 0.6);
}

.tab-item.active .tab-text {
  color: #0D0D0D;
  font-weight: 600;
}

/* 公告栏 */
.announcement-bar {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 16rpx 32rpx;
  background: rgba(200, 164, 100, 0.05);
}

/* 喇叭图标 */
.announcement-icon {
  position: relative;
  width: 28rpx;
  height: 28rpx;
}

.horn-body {
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 16rpx;
  height: 16rpx;
  background: #C8A464;
  border-radius: 2rpx;
}

.horn-mouth {
  position: absolute;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 0;
  height: 0;
  border-top: 8rpx solid transparent;
  border-bottom: 8rpx solid transparent;
  border-left: 12rpx solid #C8A464;
}

.announcement-text {
  flex: 1;
  font-size: 24rpx;
  color: rgba(245, 245, 240, 0.5);
}

.announcement-more {
  font-size: 24rpx;
  color: rgba(245, 245, 240, 0.4);
}

/* ============================================
   商家推荐
   ============================================ */
.recommend-section {
  padding: 24rpx 0;
  border-bottom: 1rpx solid rgba(200, 164, 100, 0.1);
}

.section-title {
  padding: 0 32rpx 16rpx;
}

.title-text {
  font-size: 30rpx;
  font-weight: 600;
  color: #F5F5F0;
  letter-spacing: 1rpx;
}

.recommend-scroll {
  white-space: nowrap;
}

.recommend-list {
  display: flex;
  gap: 20rpx;
  padding: 0 32rpx;
}

.recommend-card {
  flex-shrink: 0;
  width: 240rpx;
  background: #1A1A1A;
  border-radius: 16rpx;
  overflow: hidden;
  border: 1rpx solid rgba(200, 164, 100, 0.08);
}

.recommend-image {
  width: 240rpx;
  height: 200rpx;
  background: #0D0D0D;
}

.recommend-info {
  padding: 16rpx;
}

.recommend-name {
  font-size: 26rpx;
  color: #F5F5F0;
  margin-bottom: 12rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: block;
}

.recommend-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.recommend-price {
  font-size: 32rpx;
  font-weight: 700;
  color: #C8A464;
}

.select-btn {
  padding: 8rpx 20rpx;
  background: linear-gradient(145deg, #C8A464 0%, #A88B4A 100%);
  border-radius: 24rpx;
}

.select-btn.has-spec {
  padding: 8rpx 16rpx;
}

.select-text {
  font-size: 22rpx;
  color: #0D0D0D;
  font-weight: 600;
}

/* ============================================
   分类内容区
   ============================================ */
.category-content {
  flex: 1;
  display: flex;
  overflow: hidden;
}

/* 左侧导航 */
.category-nav {
  width: 160rpx;
  background: #141414;
  height: 100%;
}

.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24rpx 16rpx;
  position: relative;
}

.nav-item.active {
  background: #0D0D0D;
}

.nav-item.active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 4rpx;
  height: 40rpx;
  background: #C8A464;
  border-radius: 0 2rpx 2rpx 0;
}

/* 全部图标 */
.nav-icon {
  width: 48rpx;
  height: 48rpx;
  display: flex;
  flex-wrap: wrap;
  align-content: center;
  justify-content: center;
  gap: 4rpx;
  margin-bottom: 8rpx;
}

.grid-dot {
  width: 16rpx;
  height: 16rpx;
  background: rgba(200, 164, 100, 0.4);
  border-radius: 4rpx;
}

.nav-item.active .grid-dot {
  background: #C8A464;
}

.nav-icon-img {
  width: 48rpx;
  height: 48rpx;
  margin-bottom: 8rpx;
  border-radius: 8rpx;
}

.nav-text {
  font-size: 22rpx;
  color: rgba(245, 245, 240, 0.5);
  text-align: center;
}

.nav-item.active .nav-text {
  color: #C8A464;
  font-weight: 600;
}

/* 右侧商品区 */
.product-area {
  flex: 1;
  background: #0D0D0D;
  height: 100%;
}

.category-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20rpx 24rpx;
  border-bottom: 1rpx solid rgba(200, 164, 100, 0.1);
}

.category-tag {
  background: rgba(200, 164, 100, 0.15);
  border: 1rpx solid rgba(200, 164, 100, 0.2);
  border-radius: 8rpx;
  padding: 8rpx 16rpx;
}

.tag-text {
  font-size: 24rpx;
  color: #C8A464;
  font-weight: 500;
}

.sort-bar {
  display: flex;
  gap: 24rpx;
}

.sort-item {
  font-size: 24rpx;
  color: rgba(245, 245, 240, 0.5);
}

.sort-item.active {
  color: #C8A464;
  font-weight: 500;
}

/* 商品列表 */
.product-list {
  padding: 16rpx 24rpx;
}

.product-item {
  display: flex;
  gap: 20rpx;
  padding: 20rpx 0;
  border-bottom: 1rpx solid rgba(200, 164, 100, 0.08);
}

.product-item:last-child {
  border-bottom: none;
}

.product-image {
  width: 180rpx;
  height: 180rpx;
  border-radius: 12rpx;
  background: #1A1A1A;
  flex-shrink: 0;
}

.product-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-width: 0;
}

.product-name {
  font-size: 30rpx;
  font-weight: 600;
  color: #F5F5F0;
  margin-bottom: 8rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: block;
}

.product-desc {
  font-size: 24rpx;
  color: rgba(245, 245, 240, 0.5);
  margin-bottom: 8rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  white-space: normal;
}

.product-brewery {
  font-size: 24rpx;
  color: rgba(245, 245, 240, 0.4);
  margin-bottom: 8rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  white-space: normal;
}

.product-meta {
  display: flex;
  gap: 16rpx;
  margin-bottom: 12rpx;
}

.sales {
  font-size: 22rpx;
  color: rgba(245, 245, 240, 0.4);
}

.product-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.price-section {
  display: flex;
  align-items: baseline;
}

.price-symbol {
  font-size: 24rpx;
  color: #C8A464;
  margin-right: 2rpx;
}

.price {
  font-size: 36rpx;
  font-weight: 700;
  color: #C8A464;
}

.price-suffix {
  font-size: 22rpx;
  color: rgba(245, 245, 240, 0.5);
  margin-left: 4rpx;
}

/* 加购按钮 */
.add-cart {
  width: 56rpx;
  height: 56rpx;
  background: linear-gradient(145deg, #C8A464 0%, #A88B4A 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.plus-icon {
  position: relative;
  width: 24rpx;
  height: 24rpx;
}

.plus-h {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 18rpx;
  height: 2rpx;
  background: #0D0D0D;
}

.plus-v {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 2rpx;
  height: 18rpx;
  background: #0D0D0D;
}

/* 加载状态 */
.load-status {
  text-align: center;
  padding: 40rpx;
}

.status-text {
  font-size: 24rpx;
  color: rgba(245, 245, 240, 0.4);
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 120rpx 40rpx;
}

/* 啤酒杯图标 */
.empty-icon {
  margin-bottom: 24rpx;
}

.beer-mug {
  position: relative;
  width: 80rpx;
  height: 80rpx;
}

.mug-body {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 56rpx;
  height: 64rpx;
  background: rgba(200, 164, 100, 0.2);
  border: 2rpx solid rgba(200, 164, 100, 0.4);
  border-radius: 0 0 12rpx 12rpx;
}

.mug-handle {
  position: absolute;
  bottom: 16rpx;
  right: 0;
  width: 24rpx;
  height: 36rpx;
  border: 2rpx solid rgba(200, 164, 100, 0.4);
  border-left: none;
  border-radius: 0 16rpx 16rpx 0;
}

.foam {
  position: absolute;
  top: 8rpx;
  left: 4rpx;
  width: 48rpx;
  height: 16rpx;
  background: rgba(245, 245, 240, 0.3);
  border-radius: 8rpx;
}

.empty-text {
  font-size: 28rpx;
  color: rgba(245, 245, 240, 0.4);
}
</style>
