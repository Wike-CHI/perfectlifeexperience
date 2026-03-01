<template>
  <view class="container">
    <!-- 商品图片 -->
    <swiper class="product-swiper" indicator-dots circular indicator-active-color="#D4A574">
      <swiper-item v-for="(image, index) in product.images" :key="index">
        <image class="product-image" :src="image" mode="aspectFit" @click="previewImage(index)" />
      </swiper-item>
    </swiper>

    <!-- 商品信息 -->
    <view class="product-info">
      <view class="price-section">
        <text class="current-price">¥{{ formatPrice(currentPrice) }}</text>
        <view class="tags">
          <text class="tag" v-for="(tag, index) in product.tags" :key="index">{{ tag }}</text>
        </view>
      </view>
      <text class="product-name">{{ product.name }}</text>
      <text class="product-enname" v-if="product.enName">{{ product.enName }}</text>
      <text class="product-desc">{{ product.description }}</text>

      <!-- 单瓶规格 -->
      <view class="specs-list" v-if="singleSpecs.length > 0">
        <text class="specs-title">单瓶装</text>
        <view class="specs-grid">
          <view
            class="spec-option"
            v-for="(spec, index) in singleSpecs"
            :key="index"
            :class="{ active: currentSpec === spec.volume }"
            @click="selectSpec(spec)"
          >
            <text class="spec-volume">{{ spec.volume }}</text>
            <text class="spec-price">¥{{ formatPrice(spec.price) }}</text>
          </view>
        </view>
      </view>

      <!-- 整箱规格 -->
      <view class="specs-list box-specs" v-if="boxSpecs.length > 0">
        <text class="specs-title">整箱装 <text class="box-hint">更优惠</text></text>
        <view class="specs-grid">
          <view
            class="spec-option box-option"
            v-for="(spec, index) in boxSpecs"
            :key="index"
            :class="{ active: currentSpec === spec.volume }"
            @click="selectSpec(spec)"
          >
            <text class="spec-volume">{{ spec.volume }}</text>
            <text class="spec-price">¥{{ formatPrice(spec.price) }}</text>
          </view>
        </view>
      </view>

      <!-- 数量选择 -->
      <view class="quantity-section">
        <text class="quantity-label">购买数量</text>
        <view class="quantity-selector">
          <view class="quantity-btn" :class="{ disabled: quantity <= 1 }" @click="decreaseQuantity">
            <text class="btn-icon">−</text>
          </view>
          <text class="quantity-value">{{ quantity }}</text>
          <view class="quantity-btn" @click="increaseQuantity">
            <text class="btn-icon">+</text>
          </view>
        </view>
      </view>

      <view class="product-meta">
        <view class="meta-item">
          <text class="meta-label">酒精度</text>
          <text class="meta-value">{{ product.alcoholContent }}%vol</text>
        </view>
        <view class="meta-item">
          <text class="meta-label">容量</text>
          <text class="meta-value">{{ displayVolume }}</text>
        </view>
        <view class="meta-item">
          <text class="meta-label">销量</text>
          <text class="meta-value">{{ product.sales }}</text>
        </view>
      </view>
    </view>

    <!-- 酿酒厂信息 -->
    <view class="brewery-section">
      <text class="section-title">酿酒厂</text>
      <view class="brewery-info">
        <text class="brewery-name">{{ product.brewery }}</text>
        <text class="brewery-desc">专注于精酿啤酒的酿造，采用传统工艺与现代技术相结合，为您带来独特的品饮体验。</text>
      </view>
    </view>

    <!-- 门店位置 -->
    <view class="store-section" @click="goToStoreLocation">
      <view class="store-header-row">
        <text class="section-title">门店位置</text>
        <view class="store-distance-info" v-if="distance > 0 && !loadingDistance">
          <text class="distance-badge" :class="`distance-${distanceLevel.level}`">
            {{ formatDistance }}
          </text>
          <text class="distance-hint">距离您{{ distanceLevel.text }}</text>
        </view>
        <view class="store-arrow">
          <image class="arrow-icon" src="/static/icons/arrow-right.svg" mode="aspectFit" />
        </view>
      </view>
      <view class="store-preview">
        <image class="store-map-preview" :src="CDN_IMAGES.breweryFactory" mode="aspectFill" />
        <view class="store-overlay">
          <view class="store-info-row">
            <image class="store-icon" src="/static/icons/menu-address.svg" mode="aspectFit" />
            <text class="store-address">{{ STORE_LOCATION.address }}</text>
          </view>
          <text class="store-navigate-hint" v-if="distance > 0 && !loadingDistance">
            预计{{ estimatedTime }}分钟到达
          </text>
          <text class="store-navigate-hint" v-else>点击查看地图导航</text>
        </view>
      </view>
    </view>

    <!-- 商品详情 -->
    <view class="detail-section">
      <text class="section-title">商品详情</text>
      <view class="detail-content">
        <image 
          v-for="(image, index) in product.images" 
          :key="index"
          class="detail-image" 
          :src="image" 
          mode="widthFix" 
        />
      </view>
    </view>

    <!-- 底部操作栏 -->
    <view class="footer">
      <view class="footer-left">
        <view class="action-item" @click="goToHome">
          <image class="action-icon" src="/static/tabbar/home.png" mode="aspectFit" />
          <text class="action-text">首页</text>
        </view>
        <view class="action-item" @click="goToCart">
          <image class="action-icon" src="/static/tabbar/cart.png" mode="aspectFit" />
          <text class="action-text">购物车</text>
          <text v-if="cartCount > 0" class="cart-badge">{{ cartCount }}</text>
        </view>
      </view>
      <view class="footer-center">
        <view class="selected-info">
          <text class="selected-spec">{{ currentSpec || '请选择规格' }}</text>
          <text class="selected-quantity">x{{ quantity }}</text>
        </view>
        <text class="total-price">¥{{ formatPrice(totalPrice) }}</text>
      </view>
      <view class="footer-right">
        <view class="btn-cart" :class="{ disabled: loading }" @click="addToCart">
          <text class="btn-text">加入购物车</text>
        </view>
        <view class="btn-buy" :class="{ disabled: loading }" @click="buyNow">
          <text class="btn-text">立即购买</text>
        </view>
      </view>
    </view>

    <!-- 安全区域 -->
    <view class="safe-area"></view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { getProductDetail, addToCart as apiAddToCart, getCartItems, formatPrice } from '@/utils/api';
import { getDistanceToStore, formatDistance as formatDistanceUtil, getDistanceLevel, STORE_LOCATION } from '@/utils/distance';
import { CDN_IMAGES } from '@/config/cdn';

// 类型定义（内联，避免分包导入问题）
interface Product {
  _id: string
  name: string
  enName?: string
  description: string
  images: string[]
  price: number
  priceList?: Array<{
    volume: string
    price: number
  }>
  volume?: string
  stock?: number
  sales: number
  category?: string
  tags?: string[]
  alcoholContent: number
  brewery: string
}

// 数据
const product = ref<Product>({} as Product);
const cartCount = ref(0);
const currentPrice = ref(0);
const currentSpec = ref('');
const quantity = ref(1);
const loading = ref(false);

// 距离相关
const distance = ref<number | null>(null);
const loadingDistance = ref(false);

// 计算属性：单瓶规格
const singleSpecs = computed(() => {
  if (!product.value.priceList) return [];
  return product.value.priceList.filter(spec => !spec.volume.includes('整箱'));
});

// 计算属性：整箱规格
const boxSpecs = computed(() => {
  if (!product.value.priceList) return [];
  return product.value.priceList.filter(spec => spec.volume.includes('整箱'));
});

// 计算总价
const totalPrice = computed(() => {
  return currentPrice.value * quantity.value;
});

// 显示容量
const displayVolume = computed(() => {
  return currentSpec.value || (product.value.volume ? `${product.value.volume}ml` : '--');
});

// 距离相关计算属性
const formatDistance = computed(() => {
  if (distance.value === null) return '--';
  return formatDistanceUtil(distance.value);
});

const distanceLevel = computed(() => {
  if (distance.value === null) return { level: 'near', text: '很近', color: '#52C41A' };
  return getDistanceLevel(distance.value);
});

const estimatedTime = computed(() => {
  if (distance.value === null) return '--';
  const drivingTime = Math.ceil(distance.value / (15000 / 60)); // 分钟
  return Math.min(drivingTime + 10, 60); // 加上准备时间，最多60分钟
});

// 获取商品详情
const loadProductDetail = async (id: string) => {
  try {
    const res = await getProductDetail(id);
    product.value = res;
    // 初始化选中第一个规格（如果有）
    if (res.priceList && res.priceList.length > 0) {
      currentPrice.value = res.priceList[0].price;
      currentSpec.value = res.priceList[0].volume;
    } else {
      currentPrice.value = res.price;
      currentSpec.value = res.specs || ''; // 如果没有 priceList，尝试使用 specs 字段
    }
  } catch (error) {
    uni.showToast({
      title: '获取详情失败',
      icon: 'none'
    });
  }
};

// 加载购物车数量
const loadCartCount = async () => {
  try {
    const res = await getCartItems();
    cartCount.value = res.length;
  } catch (error) {
    console.error('加载购物车数量失败:', error);
  }
};

// 加载距离信息
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

// 预览图片
const previewImage = (index: number) => {
  uni.previewImage({
    current: product.value.images[index],
    urls: product.value.images
  });
};

// 选择规格
const selectSpec = (spec: { volume: string; price: number }) => {
  currentPrice.value = spec.price;
  currentSpec.value = spec.volume;
};

// 增加数量
const increaseQuantity = () => {
  if (quantity.value < (product.value.stock || 999)) {
    quantity.value++;
  } else {
    uni.showToast({
      title: '已达库存上限',
      icon: 'none'
    });
  }
};

// 减少数量
const decreaseQuantity = () => {
  if (quantity.value > 1) {
    quantity.value--;
  }
};

// 加入购物车
const addToCart = async () => {
  if (loading.value) return;
  loading.value = true;
  
  try {
    await apiAddToCart({
      productId: product.value._id!,
      name: product.value.name,
      price: currentPrice.value,
      image: product.value.images[0],
      quantity: quantity.value,
      selected: true,
      stock: product.value.stock,
      category: product.value.category,
      specs: currentSpec.value
    });

    cartCount.value += quantity.value;

    uni.showToast({
      title: '已加入购物车',
      icon: 'success'
    });
  } catch (error) {
    uni.showToast({
      title: '添加失败',
      icon: 'none'
    });
  } finally {
    loading.value = false;
  }
};

// 立即购买
const buyNow = async () => {
  if (loading.value) return;
  loading.value = true;

  try {
    // 构造临时订单项
    const tempItem = {
      productId: product.value._id!,
      name: product.value.name,
      price: currentPrice.value,
      image: product.value.images[0],
      quantity: quantity.value,
      selected: true,
      stock: product.value.stock,
      category: product.value.category,
      specs: currentSpec.value,
      _id: 'temp_buy_now'
    };
    
    // 存入本地存储供确认订单页使用
    uni.setStorageSync('temp_order_items', JSON.stringify([tempItem]));

    uni.navigateTo({
      url: '/pages/order/confirm?mode=direct'
    });
  } catch (error) {
    uni.showToast({
      title: '操作失败',
      icon: 'none'
    });
  } finally {
    loading.value = false;
  }
};

// 页面跳转
const goToHome = () => {
  uni.switchTab({ url: '/pages/index/index' });
};

const goToCart = () => {
  uni.switchTab({ url: '/pages/cart/cart' });
};

// 跳转到门店位置页面
const goToStoreLocation = () => {
  uni.navigateTo({
    url: '/pages/store/location'
  });
};

// 生命周期
onLoad((options) => {
  if (options?.id) {
    loadProductDetail(options.id);
  }
  loadCartCount();
  loadDistance();
});
</script>

<style scoped>
.container {
  min-height: 100vh;
  background-color: #FDF8F3;
  padding-bottom: 140rpx;
}

/* 商品图片 */
.product-swiper {
  height: 600rpx;
}

.product-image {
  width: 100%;
  height: 100%;
}

/* 商品信息 */
.product-info {
  background: #FFFFFF;
  padding: 30rpx;
  margin-bottom: 20rpx;
}

.price-section {
  display: flex;
  align-items: baseline;
  gap: 16rpx;
  margin-bottom: 20rpx;
}

.current-price {
  font-size: 48rpx;
  font-weight: bold;
  color: #C44536;
}

.original-price {
  font-size: 28rpx;
  color: #9B8B7F;
  text-decoration: line-through;
}

.tags {
  display: flex;
  gap: 12rpx;
  margin-left: auto;
}

.tag {
  font-size: 22rpx;
  color: #D4A574;
  background: rgba(212, 165, 116, 0.15);
  padding: 6rpx 16rpx;
  border-radius: 8rpx;
}

.product-name {
  font-size: 36rpx;
  font-weight: 600;
  color: #3D2914;
  display: block;
  margin-bottom: 16rpx;
}

.product-enname {
  font-size: 28rpx;
  color: #9B8B7F;
  margin-bottom: 12rpx;
  display: block;
  font-style: italic;
}

.specs-list {
  background: #FDF8F3;
  padding: 24rpx;
  border-radius: 12rpx;
  margin-bottom: 24rpx;
}

.specs-list.box-specs {
  background: linear-gradient(135deg, #FDF8F3 0%, #FFF5E6 100%);
  border: 2rpx solid #D4A574;
}

.box-hint {
  font-size: 22rpx;
  color: #FFFFFF;
  background: #C44536;
  padding: 4rpx 12rpx;
  border-radius: 12rpx;
  margin-left: 12rpx;
}

.spec-option.box-option {
  background: linear-gradient(135deg, #FFFFFF 0%, #FFF8F0 100%);
  border: 2rpx solid #E5D5C5;
}

.spec-option.box-option.active {
  background: #D4A574;
  border-color: #D4A574;
}

.specs-title {
  font-size: 26rpx;
  color: #9B8B7F;
  margin-bottom: 16rpx;
  display: block;
}

.specs-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.spec-option {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 12rpx 24rpx;
  background: #FFFFFF;
  border: 1rpx solid #E5D5C5;
  border-radius: 8rpx;
  min-width: 140rpx;
  transition: all 0.3s ease;
}

.spec-option.active {
  background: #D4A574;
  border-color: #D4A574;
}

.spec-option.active .spec-volume,
.spec-option.active .spec-price {
  color: #FFFFFF;
}

.spec-volume {
  color: #3D2914;
  font-size: 26rpx;
  margin-bottom: 4rpx;
}

.spec-price {
  color: #C44536;
  font-weight: bold;
  font-size: 24rpx;
}

.product-desc {
  font-size: 28rpx;
  color: #6B5B4F;
  line-height: 1.6;
  display: block;
  margin-bottom: 24rpx;
}

.product-meta {
  display: flex;
  gap: 40rpx;
  padding-top: 24rpx;
  border-top: 1rpx solid #F5F0E8;
}

.meta-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.meta-label {
  font-size: 24rpx;
  color: #9B8B7F;
  margin-bottom: 8rpx;
}

.meta-value {
  font-size: 30rpx;
  font-weight: 600;
  color: #3D2914;
}

/* 数量选择 */
.quantity-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx 0;
  border-top: 1rpx solid #F5F0E8;
  margin-top: 24rpx;
}

.quantity-label {
  font-size: 28rpx;
  color: #3D2914;
  font-weight: 500;
}

.quantity-selector {
  display: flex;
  align-items: center;
  gap: 20rpx;
}

.quantity-btn {
  width: 56rpx;
  height: 56rpx;
  background: #F5F0E8;
  border-radius: 28rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}

.quantity-btn:active {
  background: #E5D5C5;
}

.quantity-btn.disabled {
  opacity: 0.5;
}

.btn-icon {
  font-size: 32rpx;
  color: #3D2914;
  font-weight: bold;
}

.quantity-value {
  font-size: 32rpx;
  color: #3D2914;
  font-weight: 600;
  min-width: 60rpx;
  text-align: center;
}

/* 酿酒厂信息 */
.brewery-section {
  background: #FFFFFF;
  padding: 30rpx;
  margin-bottom: 20rpx;
}

.section-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #3D2914;
  display: block;
  margin-bottom: 20rpx;
}

.brewery-info {
  background: #F5F0E8;
  padding: 24rpx;
  border-radius: 12rpx;
}

.brewery-name {
  font-size: 30rpx;
  font-weight: 600;
  color: #3D2914;
  display: block;
  margin-bottom: 12rpx;
}

.brewery-desc {
  font-size: 26rpx;
  color: #6B5B4F;
  line-height: 1.5;
}

/* 门店位置 */
.store-section {
  background: #FFFFFF;
  padding: 30rpx;
  margin-bottom: 20rpx;
}

.store-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20rpx;
}

.store-arrow {
  width: 48rpx;
  height: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.arrow-icon {
  width: 32rpx;
  height: 32rpx;
  opacity: 0.5;
}

.store-preview {
  position: relative;
  width: 100%;
  height: 240rpx;
  border-radius: 16rpx;
  overflow: hidden;
}

.store-map-preview {
  width: 100%;
  height: 100%;
}

.store-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.7), transparent);
  padding: 30rpx;
}

.store-info-row {
  display: flex;
  align-items: center;
  margin-bottom: 12rpx;
}

.store-icon {
  width: 28rpx;
  height: 28rpx;
  margin-right: 12rpx;
}

.store-address {
  font-size: 26rpx;
  color: #FFFFFF;
  flex: 1;
}

.store-navigate-hint {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.8);
}

/* 门店距离信息 */
.store-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20rpx;
}

.store-distance-info {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  align-items: flex-end;
}

.distance-badge {
  font-size: 28rpx;
  font-weight: 700;
  padding: 6rpx 16rpx;
  border-radius: 12rpx;
}

.distance-badge.distance-near {
  background: rgba(82, 196, 26, 0.15);
  color: #52C41A;
}

.distance-badge.distance-medium {
  background: rgba(212, 165, 116, 0.15);
  color: #D4A574;
}

.distance-badge.distance-far {
  background: rgba(155, 139, 127, 0.15);
  color: #9B8B7F;
}

.distance-hint {
  font-size: 22rpx;
  color: #9B8B7F;
}

/* 商品详情 */
.detail-section {
  background: #FFFFFF;
  padding: 30rpx;
}

.detail-content {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.detail-image {
  width: 100%;
  border-radius: 12rpx;
}

/* 底部操作栏 */
.footer {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  padding: 16rpx 30rpx;
  background: #FFFFFF;
  border-top: 1rpx solid #F5F0E8;
}

.footer-left {
  display: flex;
  gap: 40rpx;
  margin-right: 30rpx;
}

.action-item {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.action-icon {
  width: 44rpx;
  height: 44rpx;
  margin-bottom: 4rpx;
}

.action-text {
  font-size: 22rpx;
  color: #6B5B4F;
}

.cart-badge {
  position: absolute;
  top: -8rpx;
  right: -8rpx;
  min-width: 32rpx;
  height: 32rpx;
  background: #C44536;
  color: #FFFFFF;
  font-size: 20rpx;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 8rpx;
}

.footer-center {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding: 0 20rpx;
}

.selected-info {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin-bottom: 4rpx;
}

.selected-spec {
  font-size: 24rpx;
  color: #6B5B4F;
}

.selected-quantity {
  font-size: 24rpx;
  color: #9B8B7F;
}

.total-price {
  font-size: 36rpx;
  font-weight: bold;
  color: #C44536;
}

.footer-right {
  display: flex;
  gap: 16rpx;
}

.btn-cart, .btn-buy {
  flex: 1;
  padding: 24rpx 0;
  border-radius: 40rpx;
  text-align: center;
}

.btn-cart {
  background: #F5F0E8;
}

.btn-buy {
  background: #D4A574;
}

.btn-cart.disabled, .btn-buy.disabled {
  opacity: 0.7;
  pointer-events: none;
}

.btn-text {
  font-size: 30rpx;
  font-weight: 600;
}

.btn-cart .btn-text {
  color: #3D2914;
}

.btn-buy .btn-text {
  color: #FFFFFF;
}

.safe-area {
  height: constant(safe-area-inset-bottom);
  height: env(safe-area-inset-bottom);
}
</style>
