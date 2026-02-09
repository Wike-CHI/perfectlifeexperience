<template>
  <view class="container">
    <!-- 商品列表 -->
    <view class="product-list">
      <view 
        class="product-card" 
        v-for="(product, index) in products" 
        :key="index"
        @click="goToDetail(product)"
      >
        <image class="product-image" :src="product.images[0]" mode="aspectFit" />
        <view class="product-tags" v-if="product.tags && product.tags.length">
          <text class="tag" v-for="(tag, tIndex) in product.tags" :key="tIndex">{{ tag }}</text>
        </view>
        <view class="product-info">
          <text class="product-name">{{ product.name }}</text>
          <text class="product-enname" v-if="product.enName">{{ product.enName }}</text>
          <text class="product-desc">{{ product.brewery }}</text>
          <view class="product-meta">
            <text class="alcohol">{{ product.alcoholContent }}%vol</text>
          </view>
          <view class="product-bottom">
            <view class="price-section">
              <text class="price">
                ¥{{ formatPrice(product.price) }}
                <text class="price-suffix" v-if="product.priceList && product.priceList.length > 1">起</text>
              </text>
            </view>
            <view class="add-cart" @click.stop="addToCart(product)">
              <text class="cart-icon">+</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 加载状态 -->
    <view class="load-status">
      <text v-if="loading" class="status-text">加载中...</text>
      <text v-else-if="!hasMore" class="status-text">没有更多了</text>
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
import { ref } from 'vue';
import { onLoad, onPullDownRefresh, onReachBottom } from '@dcloudio/uni-app';
import { getProducts, formatPrice } from '@/utils/api';
import type { Product } from '@/types';
import ProductSkuPopup from '@/components/ProductSkuPopup.vue';

const products = ref<Product[]>([]);
const loading = ref(false);
const hasMore = ref(true);
const page = ref(1);
const pageSize = 10;

// 弹窗状态
const skuPopupVisible = ref(false);
const currentProduct = ref<Product | null>(null);

// 加载数据
const loadData = async (isRefresh = false) => {
  if (loading.value) return;
  
  try {
    loading.value = true;
    
    if (isRefresh) {
      page.value = 1;
      products.value = [];
      hasMore.value = true;
    }
    
    // 这里简单调用 getProducts，实际项目中可能需要 getPromotions 接口
    const res = await getProducts({ 
      page: page.value, 
      limit: pageSize,
      sort: 'price' // 假设特惠按价格排序
    });
    
    if (isRefresh) {
      products.value = res;
    } else {
      products.value.push(...res);
    }
    
    if (res.length < pageSize) {
      hasMore.value = false;
    }
  } catch (error) {
    console.error('加载失败:', error);
    uni.showToast({
      title: '加载失败',
      icon: 'none'
    });
  } finally {
    loading.value = false;
  }
};

// 打开规格选择弹窗
const addToCart = (product: Product) => {
  currentProduct.value = product;
  skuPopupVisible.value = true;
};

// 加入购物车成功回调
const onAddToCartSuccess = () => {
  // 可以在这里添加成功后的逻辑
};

// 跳转详情
const goToDetail = (product: Product) => {
  uni.navigateTo({
    url: `/pages/product/detail?id=${product._id}`
  });
};

// 生命周期
onLoad(() => {
  loadData(true);
});

onPullDownRefresh(() => {
  loadData(true).then(() => {
    uni.stopPullDownRefresh();
  });
});

onReachBottom(() => {
  if (hasMore.value) {
    page.value++;
    loadData();
  }
});
</script>

<style scoped>
.container {
  min-height: 100vh;
  background-color: #FDF8F3;
  padding: 24rpx;
}

.product-list {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
}

.product-card {
  width: 48%;
  background: #FAF9F7;
  border-radius: 20rpx;
  overflow: hidden;
  box-shadow: 0 4rpx 16rpx rgba(26, 26, 26, 0.05);
  border: 1rpx solid rgba(201, 169, 98, 0.08);
  transition: all 0.3s ease;
  margin-bottom: 24rpx;
}

.product-card:active {
  transform: translateY(-4rpx);
  box-shadow: 0 8rpx 24rpx rgba(26, 26, 26, 0.1);
}

.product-image {
  width: 100%;
  height: 320rpx;
}

.product-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8rpx;
  padding: 20rpx 20rpx 0;
}

.tag {
  font-size: 20rpx;
  color: #C9A962;
  background: rgba(201, 169, 98, 0.12);
  padding: 6rpx 16rpx;
  border-radius: 8rpx;
  border: 1rpx solid rgba(201, 169, 98, 0.2);
  font-weight: 500;
}

.product-info {
  padding: 20rpx;
}

.product-name {
  font-size: 28rpx;
  font-weight: 600;
  color: #1A1A1A;
  display: block;
  margin-bottom: 8rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  letter-spacing: 1rpx;
}

.product-enname {
  font-size: 22rpx;
  color: #999999;
  display: block;
  margin-bottom: 8rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.product-desc {
  font-size: 24rpx;
  color: #666666;
  display: block;
  margin-bottom: 16rpx;
}

.product-meta {
  display: flex;
  gap: 12rpx;
  margin-bottom: 20rpx;
}

.alcohol {
  font-size: 22rpx;
  color: #4A4A4A;
  background: rgba(201, 169, 98, 0.1);
  padding: 6rpx 16rpx;
  border-radius: 8rpx;
  border: 1rpx solid rgba(201, 169, 98, 0.15);
}

.product-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.price-section {
  display: flex;
  align-items: baseline;
  gap: 12rpx;
}

.price {
  font-size: 36rpx;
  font-weight: 700;
  color: #C9A962;
}

.price-suffix {
  font-size: 24rpx;
  font-weight: normal;
  margin-left: 4rpx;
}

.original-price {
  font-size: 24rpx;
  color: #999999;
  text-decoration: line-through;
}

.add-cart {
  width: 64rpx;
  height: 64rpx;
  background: linear-gradient(135deg, #C9A962 0%, #B8984A 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4rpx 16rpx rgba(201, 169, 98, 0.4);
  transition: all 0.3s ease;
}

.add-cart:active {
  transform: scale(0.95);
  box-shadow: 0 2rpx 8rpx rgba(201, 169, 98, 0.3);
}

.cart-icon {
  font-family: "iconfont";
  font-size: 28rpx;
  color: #FFFFFF;
}

.load-status {
  text-align: center;
  padding: 40rpx;
}

.status-text {
  font-size: 26rpx;
  color: #9B8B7F;
}
</style>