<template>
  <view class="container">
    <!-- 顶部搜索栏 - 极简设计 -->
    <view class="header">
      <view class="brand-mark">
        <image class="brand-logo" src="/static/logo.png" mode="aspectFit" />
        <text class="brand-text">大友元气</text>
      </view>
      <view class="search-trigger" @click="goToSearch">
        <view class="search-line"></view>
        <text class="search-placeholder">搜索精酿</text>
        <view class="search-icon-svg">
          <view class="magnifier">
            <view class="glass"></view>
            <view class="handle"></view>
          </view>
        </view>
      </view>
    </view>

    <!-- 轮播图 - 沉浸式 -->
    <swiper class="banner-swiper" indicator-dots autoplay circular indicator-active-color="#C8A464" indicator-color="rgba(200,164,100,0.3)">
      <swiper-item v-for="(banner, index) in banners" :key="index" @click="onBannerClick(banner)">
        <image class="banner-image" :src="banner.image" mode="aspectFill" />
        <view class="banner-gradient"></view>
        <view class="banner-content">
          <text class="banner-tag">LIMITED</text>
          <text class="banner-title">{{ banner.title }}</text>
          <text class="banner-subtitle">{{ banner.subtitle }}</text>
        </view>
      </swiper-item>
    </swiper>

    <!-- 服务入口 - 非对称双卡片 -->
    <view class="service-section">
      <!-- 门店自提 - 左侧大卡片 -->
      <view class="service-card pickup" @click="goToCategory({type: 'category', value: 'all'})">
        <view class="card-bg-pattern">
          <view class="pattern-line" v-for="n in 5" :key="n" :style="{top: (n * 20) + '%'}"></view>
        </view>
        <view class="service-icon-custom">
          <view class="store-icon">
            <view class="store-roof"></view>
            <view class="store-body"></view>
            <view class="store-door"></view>
            <view class="store-window"></view>
          </view>
        </view>
        <view class="service-info">
          <text class="service-label">SELF PICKUP</text>
          <text class="service-title">门店自提</text>
          <text class="service-desc">预约免排队</text>
        </view>
        <view class="service-arrow">
          <view class="arrow-line"></view>
          <view class="arrow-head"></view>
        </view>
      </view>
      
      <!-- 外送到家 - 右侧卡片 -->
      <view class="service-card delivery" @click="goToCategory({type: 'category', value: 'all'})">
        <view class="card-bg-dots">
          <view class="dot" v-for="n in 6" :key="n" :style="{left: (n * 15) + 'rpx', top: ((n % 3) * 20 + 10) + 'rpx'}"></view>
        </view>
        <view class="service-icon-custom">
          <view class="delivery-icon">
            <view class="box-body"></view>
            <view class="box-flap"></view>
            <view class="box-tape"></view>
          </view>
        </view>
        <view class="service-info">
          <text class="service-label">DELIVERY</text>
          <text class="service-title">外送到家</text>
          <text class="service-desc">新鲜直送</text>
        </view>
        <view class="service-arrow">
          <view class="arrow-line"></view>
          <view class="arrow-head"></view>
        </view>
      </view>
    </view>

    <!-- 会员功能区 - 精致双卡片 -->
    <view class="member-section">
      <view class="member-card vip" @click="goToUser">
        <view class="vip-crown">
          <view class="crown-base"></view>
          <view class="crown-point p1"></view>
          <view class="crown-point p2"></view>
          <view class="crown-point p3"></view>
          <view class="crown-jewel"></view>
        </view>
        <view class="member-content">
          <text class="member-label">VIP CENTER</text>
          <text class="member-title">会员中心</text>
          <view class="member-badge">
            <text class="badge-text">查看权益</text>
          </view>
        </view>
      </view>
      
      <view class="member-card points" @click="goToPromo">
        <view class="points-icon-custom">
          <view class="coin">
            <view class="coin-outer"></view>
            <view class="coin-inner"></view>
            <text class="coin-text">¥</text>
          </view>
        </view>
        <view class="member-content">
          <text class="member-label">POINTS</text>
          <text class="member-title">积分商城</text>
          <view class="member-badge points-badge">
            <text class="badge-text">兑换好礼</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 会员储值区 - 大卡片设计 -->
    <view class="recharge-section" @click="goToRecharge">
      <view class="recharge-bg">
        <view class="bg-circle c1"></view>
        <view class="bg-circle c2"></view>
        <view class="bg-circle c3"></view>
      </view>
      <view class="recharge-main">
        <view class="recharge-left">
          <view class="wallet-icon">
            <view class="wallet-body"></view>
            <view class="wallet-flap"></view>
            <view class="wallet-card"></view>
          </view>
          <view class="recharge-titles">
            <text class="recharge-label">MEMBERSHIP</text>
            <text class="recharge-title">会员储值</text>
          </view>
        </view>
        <view class="recharge-action">
          <text class="action-text">去充值</text>
          <view class="action-arrow">
            <view class="a-line"></view>
            <view class="a-head"></view>
          </view>
        </view>
      </view>
      <view class="recharge-options">
        <view class="option-item" v-for="(opt, idx) in rechargeOptionsList" :key="idx">
          <view class="option-amount">
            <text class="currency">¥</text>
            <text class="amount">{{ opt.amount }}</text>
          </view>
          <view class="option-gift">
            <text class="gift-text">赠¥{{ opt.gift }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 热销推荐 - 双列瀑布 -->
    <view class="hot-section">
      <view class="section-header">
        <view class="header-left">
          <view class="flame-icon">
            <view class="flame-body"></view>
            <view class="flame-inner"></view>
          </view>
          <view class="header-text">
            <text class="section-label">POPULAR</text>
            <text class="section-title">热销推荐</text>
          </view>
        </view>
        <view class="header-more" @click="goToCategory({type: 'sort', value: 'sales'})">
          <text class="more-text">全部</text>
          <view class="more-arrow">
            <view class="mr-line"></view>
            <view class="mr-head"></view>
          </view>
        </view>
      </view>
      
      <view class="product-grid">
        <view
          class="product-card"
          v-for="(product, index) in hotProducts"
          :key="index"
          :class="{ 'card-offset': index % 2 === 1 }"
          @click="goToProduct(product)"
        >
          <view class="product-image-wrap">
            <image class="product-image" :src="product.images[0]" mode="aspectFill" />
            <view v-if="product.isNew" class="product-tag">NEW</view>
          </view>
          <view class="product-tags" v-if="product.tags && product.tags.length">
            <text class="tag" v-for="(tag, tIndex) in product.tags.slice(0, 2)" :key="tIndex">{{ tag }}</text>
          </view>
          <view class="product-info">
            <text class="product-name">{{ product.name }}</text>
            <text class="product-enname" v-if="product.enName">{{ product.enName }}</text>
            <text class="product-brewery">{{ product.brewery }}</text>
            <view class="product-meta">
              <text class="meta-item">{{ product.alcoholContent }}%vol</text>
            </view>
            <view class="product-bottom">
              <view class="price-section">
                <text class="price">
                  ¥{{ formatPrice(product.price) }}
                  <text class="price-suffix" v-if="product.priceList && product.priceList.length > 1">起</text>
                </text>
                <text class="original-price" v-if="product.originalPrice">¥{{ formatPrice(product.originalPrice) }}</text>
              </view>
              <view class="add-btn" @click.stop="addToCart(product)">
                <view class="plus-icon">
                  <view class="plus-h"></view>
                  <view class="plus-v"></view>
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 新品上市 - 横向滚动 -->
    <view class="new-section" v-if="newProducts.length">
      <view class="section-header">
        <view class="header-left">
          <view class="star-icon">
            <view class="star-center"></view>
            <view class="star-ray r1"></view>
            <view class="star-ray r2"></view>
            <view class="star-ray r3"></view>
            <view class="star-ray r4"></view>
          </view>
          <view class="header-text">
            <text class="section-label">NEW ARRIVAL</text>
            <text class="section-title">新品上市</text>
          </view>
        </view>
      </view>
      
      <scroll-view class="new-scroll" scroll-x enhanced show-scrollbar="false">
        <view class="new-list">
          <view 
            class="new-card" 
            v-for="(product, index) in newProducts" 
            :key="index"
            @click="goToProduct(product)"
          >
            <view class="new-image-wrap">
              <image class="new-image" :src="product.images[0]" mode="aspectFill" />
              <view class="new-overlay"></view>
            </view>
            <view class="new-info">
              <text class="new-name">{{ product.name }}</text>
              <view class="new-price-wrap">
                <text class="currency">¥</text>
                <text class="new-price">{{ formatPrice(product.price) }}</text>
              </view>
            </view>
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- 底部留白 -->
    <view class="bottom-spacer"></view>

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
import { ref, onMounted } from 'vue';
import { onLoad, onPullDownRefresh, onReachBottom } from '@dcloudio/uni-app';
import { getProducts, addToCart as addToCartApi, formatPrice } from '@/utils/api';
import { rechargeOptions } from '@/config/recharge';
import type { Product, Banner } from '@/types';
import ProductSkuPopup from '@/components/ProductSkuPopup.vue';

// 轮播图数据
const banners = ref<Banner[]>([
  {
    image: '/static/img/gallery-02.png',
    title: '精酿啤酒节',
    subtitle: '限时特惠 全场8折起',
    link: '/pages/promo/promo',
    sort: 1,
    isActive: true
  },
  {
    image: '/static/img/gallery-09.png',
    title: '双倍IPA',
    subtitle: '新品上市 震撼味蕾',
    link: '/pages/product/detail',
    sort: 2,
    isActive: true
  },
  {
    image: '/static/img/gallery-03.png',
    title: '会员专享',
    subtitle: '注册即享9折优惠',
    link: '/pages/user/user',
    sort: 3,
    isActive: true
  }
]);

// 充值选项 - 使用共享配置
const rechargeOptionsList = ref(rechargeOptions);

// 商品数据
const hotProducts = ref<Product[]>([]);
const newProducts = ref<Product[]>([]);
const loading = ref(false);

// 弹窗状态
const skuPopupVisible = ref(false);
const currentProduct = ref<Product | null>(null);

// 获取首页数据
const loadData = async () => {
  try {
    loading.value = true;
    
    // 获取热销商品
    const hotRes = await getProducts({ page: 1, limit: 4 });
    hotProducts.value = hotRes.map(p => ({...p, spec: p.volume ? `${p.volume}ml` : ''}));
    
    // 获取新品
    const newRes = await getProducts({ page: 1, limit: 6 });
    newProducts.value = newRes.filter(p => p.isNew).map(p => ({...p, spec: p.volume ? `${p.volume}ml` : ''}));
    
  } catch (error) {
    console.error('加载数据失败:', error);
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
  // 可以做一些后续操作
};

// 页面跳转
const goToSearch = () => {
  uni.navigateTo({ url: '/pages/search/search' });
};

const goToCategory = (category: any) => {
  uni.switchTab({ url: '/pages/category/category' });
  
  uni.removeStorageSync('selectedCategory');
  uni.removeStorageSync('searchKeyword');
  uni.removeStorageSync('sortType');

  if (category.type === 'category') {
    uni.setStorageSync('selectedCategory', category.value);
  } else if (category.type === 'sort') {
    uni.setStorageSync('sortType', category.value);
  }
};

const goToUser = () => {
  uni.switchTab({ url: '/pages/user/user' });
};

const goToPromo = () => {
  uni.navigateTo({ url: '/pages/promo/promo' });
};

const goToRecharge = () => {
  uni.navigateTo({ url: '/pages/wallet/recharge' });
};

const goToProduct = (product: any) => {
  uni.navigateTo({ 
    url: `/pages/product/detail?id=${product._id || ''}` 
  });
};

const onBannerClick = (banner: any) => {
  uni.navigateTo({ url: banner.link });
};

// 生命周期
onLoad(() => {
  loadData();
});

onPullDownRefresh(() => {
  loadData().then(() => {
    uni.stopPullDownRefresh();
  });
});
</script>

<style scoped>
/* ============================================
   大友元气 - Luxury/Refined 奢华精致风格
   ============================================ */

.container {
  min-height: 100vh;
  background: #0D0D0D;
  padding-bottom: 40rpx;
}

/* ============================================
   顶部搜索栏 - 极简品牌风格
   ============================================ */
.header {
  display: flex;
  align-items: center;
  padding: 32rpx;
  background: #0D0D0D;
}

.brand-mark {
  display: flex;
  align-items: center;
  margin-right: 24rpx;
}

.brand-logo {
  width: 56rpx;
  height: 56rpx;
  margin-right: 16rpx;
  border-radius: 50%;
  background: #FFFFFF;
  padding: 4rpx;
  box-sizing: border-box;
}

.brand-text {
  font-size: 32rpx;
  font-weight: 700;
  color: #C8A464;
  letter-spacing: 4rpx;
  font-family: 'DIN Alternate', 'Avenir Next', sans-serif;
}

.search-trigger {
  flex: 1;
  display: flex;
  align-items: center;
  background: #1A1A1A;
  border-radius: 32rpx;
  padding: 16rpx 24rpx;
  border: 1rpx solid rgba(200, 164, 100, 0.15);
}

.search-line {
  width: 2rpx;
  height: 24rpx;
  background: rgba(200, 164, 100, 0.3);
  margin-right: 16rpx;
}

.search-placeholder {
  flex: 1;
  font-size: 26rpx;
  color: #666;
  letter-spacing: 1rpx;
}

/* 放大镜图标 */
.magnifier {
  position: relative;
  width: 32rpx;
  height: 32rpx;
}

.glass {
  width: 22rpx;
  height: 22rpx;
  border: 3rpx solid #C8A464;
  border-radius: 50%;
  position: absolute;
  top: 0;
  left: 0;
}

.handle {
  width: 10rpx;
  height: 3rpx;
  background: #C8A464;
  position: absolute;
  bottom: 2rpx;
  right: 0;
  transform: rotate(45deg);
  border-radius: 2rpx;
}

/* ============================================
   轮播图 - 沉浸式深色
   ============================================ */
.banner-swiper {
  height: 400rpx;
  margin: 0 32rpx;
  border-radius: 16rpx;
  overflow: hidden;
}

.banner-image {
  width: 100%;
  height: 100%;
}

.banner-gradient {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 200rpx;
  background: linear-gradient(to top, rgba(13,13,13,0.95) 0%, rgba(13,13,13,0.5) 50%, transparent 100%);
}

.banner-content {
  position: absolute;
  bottom: 40rpx;
  left: 40rpx;
}

.banner-tag {
  font-size: 20rpx;
  color: #C8A464;
  letter-spacing: 4rpx;
  margin-bottom: 12rpx;
  font-weight: 500;
}

.banner-title {
  font-size: 48rpx;
  font-weight: 700;
  color: #F5F5F0;
  letter-spacing: 2rpx;
  margin-bottom: 8rpx;
  font-family: 'DIN Alternate', sans-serif;
}

.banner-subtitle {
  font-size: 24rpx;
  color: rgba(245, 245, 240, 0.7);
  letter-spacing: 1rpx;
}

/* ============================================
   服务入口 - 非对称卡片
   ============================================ */
.service-section {
  display: flex;
  gap: 20rpx;
  margin: 32rpx;
}

.service-card {
  position: relative;
  border-radius: 20rpx;
  padding: 32rpx;
  overflow: hidden;
}

.pickup {
  flex: 1.2;
  background: linear-gradient(145deg, #2D2420 0%, #1F1814 100%);
  border: 1rpx solid rgba(200, 164, 100, 0.2);
}

.delivery {
  flex: 1;
  background: linear-gradient(145deg, #1A1A1A 0%, #0F0F0F 100%);
  border: 1rpx solid rgba(200, 164, 100, 0.1);
}

/* 背景装饰 */
.card-bg-pattern {
  position: absolute;
  top: 0;
  right: 0;
  width: 100rpx;
  height: 100%;
  opacity: 0.1;
}

.pattern-line {
  position: absolute;
  right: 0;
  width: 60rpx;
  height: 1rpx;
  background: #C8A464;
}

.card-bg-dots {
  position: absolute;
  top: 20rpx;
  right: 20rpx;
  width: 100rpx;
  height: 80rpx;
}

.dot {
  position: absolute;
  width: 6rpx;
  height: 6rpx;
  background: rgba(200, 164, 100, 0.3);
  border-radius: 50%;
}

/* 门店图标 */
.store-icon {
  position: relative;
  width: 64rpx;
  height: 56rpx;
  margin-bottom: 20rpx;
}

.store-roof {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 32rpx solid transparent;
  border-right: 32rpx solid transparent;
  border-bottom: 24rpx solid #C8A464;
}

.store-body {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 64rpx;
  height: 36rpx;
  background: #2D2420;
  border: 2rpx solid #C8A464;
  border-top: none;
}

.store-door {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 20rpx;
  height: 24rpx;
  background: #C8A464;
}

.store-window {
  position: absolute;
  bottom: 12rpx;
  left: 10rpx;
  width: 14rpx;
  height: 14rpx;
  background: rgba(200, 164, 100, 0.3);
  border: 1rpx solid #C8A464;
}

/* 外卖图标 */
.delivery-icon {
  position: relative;
  width: 56rpx;
  height: 48rpx;
  margin-bottom: 20rpx;
}

.box-body {
  position: absolute;
  bottom: 0;
  width: 56rpx;
  height: 36rpx;
  background: #C8A464;
  border-radius: 4rpx;
}

.box-flap {
  position: absolute;
  top: 12rpx;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 28rpx solid transparent;
  border-right: 28rpx solid transparent;
  border-top: 16rpx solid #A88B4A;
}

.box-tape {
  position: absolute;
  top: 8rpx;
  left: 50%;
  transform: translateX(-50%);
  width: 12rpx;
  height: 40rpx;
  background: rgba(255,255,255,0.2);
}

.service-info {
  position: relative;
  z-index: 1;
}

.service-label {
  font-size: 18rpx;
  color: rgba(200, 164, 100, 0.6);
  letter-spacing: 2rpx;
  display: block;
  margin-bottom: 4rpx;
}

.service-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #F5F5F0;
  display: block;
  margin-bottom: 4rpx;
}

.service-desc {
  font-size: 22rpx;
  color: rgba(245, 245, 240, 0.5);
}

/* 箭头 */
.service-arrow {
  position: absolute;
  right: 24rpx;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
}

.arrow-line {
  width: 20rpx;
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

/* ============================================
   会员功能区
   ============================================ */
.member-section {
  display: flex;
  gap: 20rpx;
  margin: 0 32rpx 32rpx;
}

.member-card {
  flex: 1;
  border-radius: 20rpx;
  padding: 28rpx;
  display: flex;
  align-items: center;
  gap: 20rpx;
}

.vip {
  background: linear-gradient(145deg, #3D2914 0%, #2A1C0D 100%);
  border: 1rpx solid rgba(200, 164, 100, 0.3);
}

.points {
  background: linear-gradient(145deg, #1F2D24 0%, #141F17 100%);
  border: 1rpx solid rgba(91, 122, 110, 0.3);
}

/* 皇冠图标 */
.vip-crown {
  position: relative;
  width: 56rpx;
  height: 48rpx;
  flex-shrink: 0;
}

.crown-base {
  position: absolute;
  bottom: 8rpx;
  left: 50%;
  transform: translateX(-50%);
  width: 48rpx;
  height: 12rpx;
  background: #C8A464;
  border-radius: 2rpx;
}

.crown-point {
  position: absolute;
  width: 0;
  height: 0;
  border-left: 8rpx solid transparent;
  border-right: 8rpx solid transparent;
  border-bottom: 28rpx solid #C8A464;
}

.p1 { bottom: 16rpx; left: 4rpx; }
.p2 { bottom: 20rpx; left: 50%; transform: translateX(-50%); border-bottom-width: 32rpx; }
.p3 { bottom: 16rpx; right: 4rpx; }

.crown-jewel {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 10rpx;
  height: 10rpx;
  background: #F5F5F0;
  border-radius: 50%;
}

/* 金币图标 */
.coin {
  position: relative;
  width: 56rpx;
  height: 56rpx;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.coin-outer {
  position: absolute;
  width: 56rpx;
  height: 56rpx;
  background: linear-gradient(145deg, #5B7A6E 0%, #4A6A5E 100%);
  border-radius: 50%;
}

.coin-inner {
  position: absolute;
  width: 44rpx;
  height: 44rpx;
  background: linear-gradient(145deg, #6B8A7E 0%, #5A7A6E 100%);
  border-radius: 50%;
}

.coin-text {
  position: relative;
  font-size: 28rpx;
  font-weight: 700;
  color: #F5F5F0;
}

.member-content {
  flex: 1;
}

.member-label {
  font-size: 18rpx;
  color: rgba(200, 164, 100, 0.5);
  letter-spacing: 1rpx;
  display: block;
  margin-bottom: 4rpx;
}

.points .member-label {
  color: rgba(91, 122, 110, 0.7);
}

.member-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #F5F5F0;
  display: block;
  margin-bottom: 12rpx;
}

.member-badge {
  display: inline-block;
  background: rgba(200, 164, 100, 0.15);
  border: 1rpx solid rgba(200, 164, 100, 0.3);
  border-radius: 20rpx;
  padding: 6rpx 16rpx;
}

.points-badge {
  background: rgba(91, 122, 110, 0.2);
  border-color: rgba(91, 122, 110, 0.4);
}

.badge-text {
  font-size: 20rpx;
  color: #C8A464;
}

.points-badge .badge-text {
  color: #7A9A8E;
}

/* ============================================
   会员储值区 - 大卡片
   ============================================ */
.recharge-section {
  position: relative;
  margin: 0 32rpx 32rpx;
  background: linear-gradient(145deg, #2D2420 0%, #1F1814 100%);
  border-radius: 24rpx;
  padding: 32rpx;
  border: 1rpx solid rgba(200, 164, 100, 0.2);
  overflow: hidden;
}

.recharge-bg {
  position: absolute;
  top: 0;
  right: 0;
  width: 300rpx;
  height: 100%;
}

.bg-circle {
  position: absolute;
  border-radius: 50%;
  border: 1rpx solid rgba(200, 164, 100, 0.1);
}

.c1 {
  width: 200rpx;
  height: 200rpx;
  top: -60rpx;
  right: -60rpx;
}

.c2 {
  width: 160rpx;
  height: 160rpx;
  top: 20rpx;
  right: 40rpx;
}

.c3 {
  width: 120rpx;
  height: 120rpx;
  bottom: 40rpx;
  right: 80rpx;
}

.recharge-main {
  position: relative;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 28rpx;
}

.recharge-left {
  display: flex;
  align-items: center;
  gap: 20rpx;
}

/* 钱包图标 */
.wallet-icon {
  position: relative;
  width: 64rpx;
  height: 52rpx;
}

.wallet-body {
  position: absolute;
  bottom: 0;
  width: 64rpx;
  height: 44rpx;
  background: #C8A464;
  border-radius: 8rpx;
}

.wallet-flap {
  position: absolute;
  top: 0;
  right: 0;
  width: 24rpx;
  height: 24rpx;
  background: #A88B4A;
  border-radius: 0 8rpx 0 8rpx;
}

.wallet-card {
  position: absolute;
  top: 50%;
  left: 8rpx;
  transform: translateY(-50%);
  width: 28rpx;
  height: 18rpx;
  background: rgba(255,255,255,0.3);
  border-radius: 2rpx;
}

.recharge-titles {
  display: flex;
  flex-direction: column;
}

.recharge-label {
  font-size: 18rpx;
  color: rgba(200, 164, 100, 0.5);
  letter-spacing: 2rpx;
  margin-bottom: 4rpx;
}

.recharge-title {
  font-size: 36rpx;
  font-weight: 700;
  color: #C8A464;
  letter-spacing: 2rpx;
}

.recharge-action {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.action-text {
  font-size: 26rpx;
  color: #F5F5F0;
}

.action-arrow {
  display: flex;
  align-items: center;
}

.a-line {
  width: 24rpx;
  height: 2rpx;
  background: #C8A464;
}

.a-head {
  width: 0;
  height: 0;
  border-top: 5rpx solid transparent;
  border-bottom: 5rpx solid transparent;
  border-left: 8rpx solid #C8A464;
}

.recharge-options {
  position: relative;
  display: flex;
  gap: 16rpx;
}

.option-item {
  flex: 1;
  background: rgba(13, 13, 13, 0.6);
  border-radius: 12rpx;
  padding: 20rpx 0;
  text-align: center;
  border: 1rpx solid rgba(200, 164, 100, 0.1);
}

.option-amount {
  display: flex;
  align-items: baseline;
  justify-content: center;
  margin-bottom: 4rpx;
}

.option-amount .currency {
  font-size: 20rpx;
  color: #F5F5F0;
  margin-right: 2rpx;
}

.option-amount .amount {
  font-size: 32rpx;
  font-weight: 700;
  color: #F5F5F0;
}

.option-gift {
  background: rgba(200, 164, 100, 0.15);
  border-radius: 8rpx;
  padding: 4rpx 12rpx;
  display: inline-block;
}

.gift-text {
  font-size: 20rpx;
  color: #C8A464;
}

/* ============================================
   热销推荐 - 瀑布流布局
   ============================================ */
.hot-section {
  margin: 0 32rpx 32rpx;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24rpx;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

/* 火焰图标 */
.flame-icon {
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
  width: 28rpx;
  height: 36rpx;
  background: linear-gradient(180deg, #E85D4E 0%, #B54A3F 100%);
  border-radius: 50% 50% 50% 50% / 60% 60% 40% 40%;
}

.flame-inner {
  position: absolute;
  bottom: 8rpx;
  width: 14rpx;
  height: 18rpx;
  background: linear-gradient(180deg, #F5A623 0%, #E85D4E 100%);
  border-radius: 50% 50% 50% 50% / 60% 60% 40% 40%;
}

.header-text {
  display: flex;
  flex-direction: column;
}

.section-label {
  font-size: 18rpx;
  color: rgba(200, 164, 100, 0.5);
  letter-spacing: 2rpx;
  margin-bottom: 2rpx;
}

.section-title {
  font-size: 32rpx;
  font-weight: 700;
  color: #F5F5F0;
  letter-spacing: 1rpx;
}

.header-more {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.more-text {
  font-size: 24rpx;
  color: rgba(245, 245, 240, 0.6);
}

.more-arrow {
  display: flex;
  align-items: center;
}

.mr-line {
  width: 16rpx;
  height: 2rpx;
  background: rgba(245, 245, 240, 0.4);
}

.mr-head {
  width: 0;
  height: 0;
  border-top: 4rpx solid transparent;
  border-bottom: 4rpx solid transparent;
  border-left: 5rpx solid rgba(245, 245, 240, 0.4);
}

/* 产品网格 - 错落布局 */
.product-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20rpx;
}

.product-card {
  background: #1A1A1A;
  border-radius: 16rpx;
  overflow: hidden;
  border: 1rpx solid rgba(200, 164, 100, 0.08);
}

.card-offset {
  margin-top: 32rpx;
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

.product-tag {
  position: absolute;
  top: 12rpx;
  left: 12rpx;
  background: linear-gradient(145deg, #C8A464 0%, #A88B4A 100%);
  color: #0D0D0D;
  font-size: 18rpx;
  font-weight: 700;
  padding: 6rpx 14rpx;
  border-radius: 6rpx;
  letter-spacing: 1rpx;
}

/* 标签列表 - 深色主题适配 */
.product-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8rpx;
  padding: 16rpx 20rpx 0;
}

.product-tags .tag {
  font-size: 20rpx;
  color: #C8A464;
  background: rgba(200, 164, 100, 0.15);
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
  border: 1rpx solid rgba(200, 164, 100, 0.2);
}

.product-info {
  padding: 16rpx 20rpx 20rpx;
}

.product-name {
  font-size: 28rpx;
  font-weight: 600;
  color: #F5F5F0;
  margin-bottom: 4rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: block;
}

/* 英文名 - 深色主题 */
.product-enname {
  font-size: 22rpx;
  color: rgba(245, 245, 240, 0.5);
  display: block;
  margin-bottom: 4rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 酒厂 - 深色主题 */
.product-brewery {
  font-size: 24rpx;
  color: rgba(245, 245, 240, 0.6);
  display: block;
  margin-bottom: 8rpx;
}

/* 商品元信息 - 酒精度等 */
.product-meta {
  display: flex;
  gap: 12rpx;
  margin-bottom: 12rpx;
}

.product-meta .meta-item {
  font-size: 22rpx;
  color: rgba(245, 245, 240, 0.5);
  background: rgba(245, 245, 240, 0.08);
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
}

.product-spec {
  font-size: 22rpx;
  color: rgba(245, 245, 240, 0.4);
  margin-bottom: 16rpx;
  display: block;
}

.product-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

/* 价格区 - 深色主题 */
.price-section {
  display: flex;
  align-items: baseline;
  gap: 12rpx;
}

.price-section .price {
  font-size: 32rpx;
  font-weight: bold;
  color: #C8A464;
}

.price-section .price-suffix {
  font-size: 22rpx;
  font-weight: normal;
  margin-left: 4rpx;
}

.price-section .original-price {
  font-size: 24rpx;
  color: rgba(245, 245, 240, 0.4);
  text-decoration: line-through;
}

/* 旧样式兼容 */
.price-wrap {
  display: flex;
  align-items: baseline;
}

.price-wrap .currency {
  font-size: 24rpx;
  color: #C8A464;
  margin-right: 2rpx;
}

.price-wrap .price {
  font-size: 36rpx;
  font-weight: 700;
  color: #C8A464;
}

.add-btn {
  width: 52rpx;
  height: 52rpx;
  background: linear-gradient(145deg, #C8A464 0%, #A88B4A 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 加号图标 */
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

/* ============================================
   新品上市 - 横向滚动
   ============================================ */
.new-section {
  margin: 0 32rpx;
}

/* 星星图标 */
.star-icon {
  position: relative;
  width: 48rpx;
  height: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.star-center {
  width: 16rpx;
  height: 16rpx;
  background: #5B7A6E;
  border-radius: 50%;
}

.star-ray {
  position: absolute;
  width: 2rpx;
  height: 12rpx;
  background: #5B7A6E;
  border-radius: 1rpx;
}

.r1 { top: 4rpx; transform: rotate(0deg); }
.r2 { right: 10rpx; transform: rotate(90deg); }
.r3 { bottom: 4rpx; transform: rotate(0deg); }
.r4 { left: 10rpx; transform: rotate(90deg); }

.new-scroll {
  white-space: nowrap;
}

.new-list {
  display: flex;
  gap: 20rpx;
  padding-bottom: 8rpx;
}

.new-card {
  position: relative;
  width: 200rpx;
  flex-shrink: 0;
}

.new-image-wrap {
  position: relative;
  width: 200rpx;
  height: 200rpx;
  border-radius: 16rpx;
  overflow: hidden;
  background: #1A1A1A;
  margin-bottom: 16rpx;
}

.new-image {
  width: 100%;
  height: 100%;
}

.new-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 60rpx;
  background: linear-gradient(to top, rgba(13,13,13,0.8), transparent);
}

.new-info {
  padding: 0 4rpx;
}

.new-name {
  font-size: 26rpx;
  color: #F5F5F0;
  margin-bottom: 8rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: block;
}

.new-price-wrap {
  display: flex;
  align-items: baseline;
}

.new-price-wrap .currency {
  font-size: 22rpx;
  color: #C8A464;
  margin-right: 2rpx;
}

.new-price-wrap .new-price {
  font-size: 32rpx;
  font-weight: 700;
  color: #C8A464;
}

.bottom-spacer {
  height: 40rpx;
}
</style>