<template>
  <view class="container">
    <!-- 顶部 Banner - 限时特惠 -->
    <view class="promo-header">
      <view class="header-content">
        <view class="promo-badge">
          <view class="badge-flame">
            <view class="flame-body"></view>
            <view class="flame-inner"></view>
          </view>
          <text class="badge-text">限时特惠</text>
        </view>
        <view class="countdown-wrap">
          <text class="countdown-label">距结束</text>
          <view class="countdown-digits">
            <view class="digit-box">
              <text class="digit">{{ formatDigit(countdown.hours) }}</text>
            </view>
            <text class="digit-separator">:</text>
            <view class="digit-box">
              <text class="digit">{{ formatDigit(countdown.minutes) }}</text>
            </view>
            <text class="digit-separator">:</text>
            <view class="digit-box">
              <text class="digit">{{ formatDigit(countdown.seconds) }}</text>
            </view>
          </view>
        </view>
      </view>
      <view class="header-bg-pattern">
        <view class="pattern-line" v-for="n in 8" :key="n" :style="{top: (n * 12.5) + '%'}"></view>
      </view>
    </view>

    <!-- 筛选标签 -->
    <view class="filter-section">
      <scroll-view class="filter-scroll" scroll-x enhanced show-scrollbar="false">
        <view class="filter-list">
          <view
            class="filter-item"
            :class="{ active: activeFilter === 'all' }"
            @click="changeFilter('all')"
          >
            <text class="filter-text">全部</text>
          </view>
          <view
            class="filter-item"
            :class="{ active: activeFilter === 'discount' }"
            @click="changeFilter('discount')"
          >
            <text class="filter-text">折扣商品</text>
          </view>
          <view
            class="filter-item"
            :class="{ active: activeFilter === 'bundle' }"
            @click="changeFilter('bundle')"
          >
            <text class="filter-text">组合优惠</text>
          </view>
          <view
            class="filter-item"
            :class="{ active: activeFilter === 'new' }"
            @click="changeFilter('new')"
          >
            <text class="filter-text">新品尝鲜</text>
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- 商品列表 -->
    <scroll-view class="product-scroll" scroll-y @scrolltolower="loadMore">
      <view class="product-grid">
        <view
          class="product-card"
          v-for="(product, index) in products"
          :key="index"
          @click="goToDetail(product)"
        >
          <!-- 商品图片 -->
          <view class="product-image-wrap">
            <image class="product-image" :src="product.images[0]" mode="aspectFill" />
            <!-- 折扣标签 -->
            <view class="discount-tag" v-if="product.discount">
              <text class="discount-text">{{ product.discount }}折</text>
            </view>
            <!-- 限时标签 -->
            <view class="limited-tag" v-if="product.isLimited">
              <text class="limited-text">限时</text>
            </view>
          </view>

          <!-- 商品信息 -->
          <view class="product-info">
            <text class="product-name">{{ product.name }}</text>
            <text class="product-brewery">{{ product.brewery }}</text>

            <!-- 规格信息 -->
            <view class="product-specs">
              <text class="spec-item">{{ product.alcoholContent }}%vol</text>
              <text class="spec-item" v-if="product.volume">{{ product.volume }}ml</text>
            </view>

            <!-- 价格区域 -->
            <view class="product-bottom">
              <view class="price-section">
                <view class="current-price">
                  <text class="price-symbol">¥</text>
                  <text class="price-value">{{ formatPrice(product.price) }}</text>
                </view>
                <view class="original-price-wrap" v-if="product.originalPrice">
                  <text class="original-price">¥{{ formatPrice(product.originalPrice) }}</text>
                </view>
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
          <view class="gift-box">
            <view class="box-body"></view>
            <view class="box-lid"></view>
            <view class="box-ribbon"></view>
          </view>
        </view>
        <text class="empty-text">暂无特惠商品</text>
        <text class="empty-desc">敬请期待更多优惠活动</text>
      </view>
    </scroll-view>

    <!-- 底部活动规则入口 -->
    <view class="rules-footer" @click="showRules">
      <view class="rules-icon">
        <view class="document">
          <view class="doc-line" v-for="n in 3" :key="n"></view>
        </view>
      </view>
      <text class="rules-text">活动规则</text>
      <view class="rules-arrow">
        <view class="arrow-line"></view>
        <view class="arrow-head"></view>
      </view>
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
import { ref, onMounted, onUnmounted } from 'vue';
import { onLoad, onPullDownRefresh } from '@dcloudio/uni-app';
import { getProducts, formatPrice } from '@/utils/api';
import type { Product } from '@/types';
import ProductSkuPopup from '@/components/ProductSkuPopup.vue';

// 数据
const products = ref<Product[]>([]);
const loading = ref(false);
const hasMore = ref(true);
const page = ref(1);
const pageSize = 10;
const activeFilter = ref('all');

// 弹窗状态
const skuPopupVisible = ref(false);
const currentProduct = ref<Product | null>(null);

// 倒计时
const countdown = ref({
  hours: 23,
  minutes: 59,
  seconds: 59
});
let countdownTimer: number | null = null;

// 格式化数字
const formatDigit = (n: number) => {
  return n.toString().padStart(2, '0');
};

// 启动倒计时
const startCountdown = () => {
  countdownTimer = setInterval(() => {
    const { hours, minutes, seconds } = countdown.value;

    if (seconds > 0) {
      countdown.value.seconds--;
    } else if (minutes > 0) {
      countdown.value.minutes--;
      countdown.value.seconds = 59;
    } else if (hours > 0) {
      countdown.value.hours--;
      countdown.value.minutes = 59;
      countdown.value.seconds = 59;
    } else {
      // 倒计时结束，重置
      countdown.value = { hours: 23, minutes: 59, seconds: 59 };
    }
  }, 1000) as unknown as number;
};

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

    // 获取商品数据
    const res = await getProducts({
      page: page.value,
      limit: pageSize,
      sort: 'price' // 特惠商品按价格排序
    });

    // 添加模拟折扣信息
    const enrichedProducts = res.map((p: Product) => ({
      ...p,
      discount: p.originalPrice ? Math.round((p.price / p.originalPrice) * 10) : null,
      isLimited: Math.random() > 0.7 // 30%商品标记为限时
    }));

    if (isRefresh) {
      products.value = enrichedProducts;
    } else {
      products.value.push(...enrichedProducts);
    }

    if (res.length < pageSize) {
      hasMore.value = false;
    }
  } catch (error) {
    console.error('加载特惠商品失败:', error);
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
  loadData();
};

// 切换筛选
const changeFilter = (filter: string) => {
  activeFilter.value = filter;
  loadData(true);
};

// 打开规格选择弹窗
const addToCart = (product: Product) => {
  currentProduct.value = product;
  skuPopupVisible.value = true;
};

// 加入购物车成功回调
const onAddToCartSuccess = () => {
  // 可以添加成功后的逻辑
};

// 跳转详情
const goToDetail = (product: Product) => {
  uni.navigateTo({
    url: `/pages/product/detail?id=${product._id}`
  });
};

// 显示活动规则
const showRules = () => {
  uni.showModal({
    title: '限时特惠活动规则',
    content: '1. 活动时间：每日00:00-23:59\n2. 特惠商品数量有限，售完即止\n3. 活动商品不与其他优惠同享\n4. 最终解释权归商家所有',
    showCancel: false,
    confirmText: '我知道了'
  });
};

// 生命周期
onLoad(() => {
  loadData(true);
  startCountdown();
});

onPullDownRefresh(() => {
  loadData(true).then(() => {
    uni.stopPullDownRefresh();
  });
});

onMounted(() => {
  startCountdown();
});

onUnmounted(() => {
  if (countdownTimer) {
    clearInterval(countdownTimer);
  }
});
</script>

<style scoped>
/* ============================================
   限时特惠页面 - 东方美学暗色主题
   ============================================ */

.container {
  min-height: 100vh;
  background: #0D0D0D;
  display: flex;
  flex-direction: column;
}

/* ============================================
   顶部 Banner - 倒计时区域
   ============================================ */
.promo-header {
  position: relative;
  background: linear-gradient(145deg, #2D2420 0%, #1F1814 100%);
  padding: 32rpx;
  overflow: hidden;
  border-bottom: 1rpx solid rgba(200, 164, 100, 0.2);
}

.header-content {
  position: relative;
  display: flex;
  justify-content: space-between;
  align-items: center;
  z-index: 1;
}

/* 促销徽章 */
.promo-badge {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.badge-flame {
  position: relative;
  width: 48rpx;
  height: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.flame-body {
  position: absolute;
  bottom: 4rpx;
  width: 24rpx;
  height: 32rpx;
  background: linear-gradient(180deg, #E85D4E 0%, #B54A3F 100%);
  border-radius: 50% 50% 50% 50% / 60% 60% 40% 40%;
}

.flame-inner {
  position: absolute;
  bottom: 8rpx;
  width: 12rpx;
  height: 16rpx;
  background: linear-gradient(180deg, #F5A623 0%, #E85D4E 100%);
  border-radius: 50% 50% 50% 50% / 60% 60% 40% 40%;
}

.badge-text {
  font-size: 36rpx;
  font-weight: 700;
  color: #C8A464;
  letter-spacing: 2rpx;
}

/* 倒计时 */
.countdown-wrap {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.countdown-label {
  font-size: 22rpx;
  color: rgba(245, 245, 240, 0.6);
}

.countdown-digits {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.digit-box {
  background: rgba(13, 13, 13, 0.6);
  border: 1rpx solid rgba(200, 164, 100, 0.3);
  border-radius: 8rpx;
  padding: 6rpx 12rpx;
  min-width: 48rpx;
  text-align: center;
}

.digit {
  font-size: 24rpx;
  font-weight: 700;
  color: #C8A464;
  font-family: 'DIN Alternate', monospace;
}

.digit-separator {
  font-size: 24rpx;
  color: rgba(200, 164, 100, 0.5);
  font-weight: 600;
}

/* 背景装饰 */
.header-bg-pattern {
  position: absolute;
  top: 0;
  right: 0;
  width: 200rpx;
  height: 100%;
  opacity: 0.05;
}

.pattern-line {
  position: absolute;
  right: 0;
  width: 80rpx;
  height: 1rpx;
  background: #C8A464;
}

/* ============================================
   筛选标签
   ============================================ */
.filter-section {
  background: #0D0D0D;
  border-bottom: 1rpx solid rgba(200, 164, 100, 0.1);
}

.filter-scroll {
  white-space: nowrap;
}

.filter-list {
  display: flex;
  padding: 20rpx 32rpx;
  gap: 16rpx;
}

.filter-item {
  flex-shrink: 0;
  padding: 12rpx 28rpx;
  background: #1A1A1A;
  border: 1rpx solid rgba(200, 164, 100, 0.15);
  border-radius: 28rpx;
  transition: all 0.3s ease;
}

.filter-item.active {
  background: linear-gradient(145deg, #C8A464 0%, #A88B4A 100%);
  border-color: transparent;
}

.filter-text {
  font-size: 26rpx;
  color: rgba(245, 245, 240, 0.6);
  white-space: nowrap;
}

.filter-item.active .filter-text {
  color: #0D0D0D;
  font-weight: 600;
}

/* ============================================
   商品滚动区
   ============================================ */
.product-scroll {
  flex: 1;
  height: 0;
}

.product-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20rpx;
  padding: 24rpx 32rpx;
}

/* ============================================
   商品卡片
   ============================================ */
.product-card {
  background: #1A1A1A;
  border-radius: 16rpx;
  overflow: hidden;
  border: 1rpx solid rgba(200, 164, 100, 0.08);
  transition: all 0.3s ease;
}

.product-card:active {
  transform: translateY(-4rpx);
  box-shadow: 0 8rpx 24rpx rgba(200, 164, 100, 0.15);
}

.product-image-wrap {
  position: relative;
  width: 100%;
  height: 280rpx;
  background: #0D0D0D;
}

.product-image {
  width: 100%;
  height: 100%;
}

/* 折扣标签 */
.discount-tag {
  position: absolute;
  top: 12rpx;
  left: 12rpx;
  background: linear-gradient(145deg, #E85D4E 0%, #B54A3F 100%);
  border-radius: 8rpx;
  padding: 6rpx 14rpx;
  border: 1rpx solid rgba(255, 255, 255, 0.2);
}

.discount-text {
  font-size: 20rpx;
  font-weight: 700;
  color: #FFFFFF;
}

/* 限时标签 */
.limited-tag {
  position: absolute;
  top: 12rpx;
  right: 12rpx;
  background: rgba(200, 164, 100, 0.9);
  border-radius: 8rpx;
  padding: 6rpx 14rpx;
  border: 1rpx solid rgba(200, 164, 100, 0.3);
}

.limited-text {
  font-size: 20rpx;
  font-weight: 600;
  color: #0D0D0D;
}

/* 商品信息 */
.product-info {
  padding: 20rpx;
}

.product-name {
  font-size: 28rpx;
  font-weight: 600;
  color: #F5F5F0;
  margin-bottom: 8rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: block;
}

.product-brewery {
  font-size: 22rpx;
  color: rgba(245, 245, 240, 0.5);
  margin-bottom: 12rpx;
  display: block;
}

.product-specs {
  display: flex;
  gap: 12rpx;
  margin-bottom: 16rpx;
}

.spec-item {
  font-size: 20rpx;
  color: rgba(245, 245, 240, 0.5);
  background: rgba(245, 245, 240, 0.08);
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
}

.product-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.price-section {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.current-price {
  display: flex;
  align-items: baseline;
}

.price-symbol {
  font-size: 22rpx;
  color: #C8A464;
  margin-right: 2rpx;
}

.price-value {
  font-size: 32rpx;
  font-weight: 700;
  color: #C8A464;
}

.original-price-wrap {
  display: flex;
  align-items: center;
}

.original-price {
  font-size: 20rpx;
  color: rgba(245, 245, 240, 0.4);
  text-decoration: line-through;
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
  box-shadow: 0 4rpx 16rpx rgba(200, 164, 100, 0.3);
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
  width: 16rpx;
  height: 2rpx;
  background: #0D0D0D;
}

.plus-v {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 2rpx;
  height: 16rpx;
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

.empty-icon {
  margin-bottom: 24rpx;
}

/* 礼品盒图标 */
.gift-box {
  position: relative;
  width: 80rpx;
  height: 80rpx;
}

.box-body {
  position: absolute;
  bottom: 0;
  left: 10rpx;
  width: 60rpx;
  height: 52rpx;
  background: rgba(200, 164, 100, 0.2);
  border: 2rpx solid rgba(200, 164, 100, 0.4);
  border-radius: 8rpx;
}

.box-lid {
  position: absolute;
  top: 16rpx;
  left: 6rpx;
  width: 68rpx;
  height: 16rpx;
  background: rgba(200, 164, 100, 0.3);
  border: 2rpx solid rgba(200, 164, 100, 0.4);
  border-radius: 4rpx;
}

.box-ribbon {
  position: absolute;
  top: 16rpx;
  left: 50%;
  transform: translateX(-50%);
  width: 8rpx;
  height: 40rpx;
  background: rgba(200, 164, 100, 0.5);
}

.empty-text {
  font-size: 28rpx;
  color: rgba(245, 245, 240, 0.5);
  margin-bottom: 12rpx;
}

.empty-desc {
  font-size: 24rpx;
  color: rgba(245, 245, 240, 0.3);
}

/* ============================================
   底部活动规则
   ============================================ */
.rules-footer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  background: rgba(200, 164, 100, 0.08);
  border-top: 1rpx solid rgba(200, 164, 100, 0.1);
  padding: 24rpx;
}

.rules-icon {
  width: 32rpx;
  height: 32rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 文档图标 */
.document {
  position: relative;
  width: 28rpx;
  height: 32rpx;
  background: rgba(200, 164, 100, 0.3);
  border: 2rpx solid rgba(200, 164, 100, 0.5);
  border-radius: 4rpx;
}

.doc-line {
  position: absolute;
  left: 6rpx;
  width: 12rpx;
  height: 2rpx;
  background: rgba(200, 164, 100, 0.5);
  border-radius: 1rpx;
}

.doc-line:nth-child(1) { top: 8rpx; }
.doc-line:nth-child(2) { top: 14rpx; }
.doc-line:nth-child(3) { top: 20rpx; }

.rules-text {
  font-size: 26rpx;
  color: rgba(200, 164, 100, 0.7);
}

.rules-arrow {
  display: flex;
  align-items: center;
}

.arrow-line {
  width: 16rpx;
  height: 2rpx;
  background: rgba(200, 164, 100, 0.4);
}

.arrow-head {
  width: 0;
  height: 0;
  border-top: 4rpx solid transparent;
  border-bottom: 4rpx solid transparent;
  border-left: 6rpx solid rgba(200, 164, 100, 0.4);
}
</style>
