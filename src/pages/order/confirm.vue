<template>
  <view class="container">
    <!-- 配送方式切换 -->
    <view class="mode-switch">
      <view class="switch-item" :class="{ active: deliveryType === 'delivery' }" @click="deliveryType = 'delivery'">
        <text class="switch-text">外卖配送</text>
      </view>
      <view class="switch-item" :class="{ active: deliveryType === 'pickup' }" @click="deliveryType = 'pickup'">
        <text class="switch-text">到店自提</text>
      </view>
    </view>

    <!-- 地址选择 (外卖模式) -->
    <view class="address-section" @click="selectAddress" v-if="deliveryType === 'delivery'">
      <view class="address-content" v-if="selectedAddress">
        <view class="address-top">
          <text class="address-name">{{ selectedAddress.name }}</text>
          <text class="address-phone">{{ selectedAddress.phone }}</text>
        </view>
        <text class="address-detail">{{ selectedAddress.province }} {{ selectedAddress.city }} {{ selectedAddress.district }} {{ selectedAddress.detail }}</text>
      </view>
      <view class="address-empty" v-else>
        <text class="empty-text">请选择收货地址</text>
      </view>
      <text class="arrow">&#xe6a7;</text>
    </view>

    <!-- 自提门店信息 (自提模式) -->
    <view class="store-section" v-if="deliveryType === 'pickup'" @click="openStoreLocation">
      <view class="store-info">
        <text class="store-name">大友元气精酿啤酒屋</text>
        <text class="store-address">浙江省温州市瑞安市瑞光大道1308号德信铂瑞湾二期30楼05-06</text>
        <text class="store-time">营业时间：10:00-22:00</text>
      </view>
      <text class="arrow">&#xe6a7;</text>
    </view>

    <!-- 商品列表 -->
    <view class="goods-section">
      <view class="section-title">商品清单</view>
      <view class="goods-list">
        <view class="goods-item" v-for="(item, index) in orderItems" :key="index">
          <image class="goods-image" :src="item.image" mode="aspectFill" />
          <view class="goods-info">
            <text class="goods-name">{{ item.name }}</text>
            <text class="goods-specs" v-if="item.specs">{{ item.specs }}</text>
            <text class="goods-price">¥{{ formatPrice(item.price) }}</text>
          </view>
          <text class="goods-quantity">x{{ item.quantity }}</text>
        </view>
      </view>
    </view>

    <!-- 优惠券选择 -->
    <view class="coupon-section" @click="showCouponSelector">
      <view class="section-title">优惠券</view>
      <view class="coupon-content">
        <view class="coupon-info" v-if="selectedCoupon">
          <text class="coupon-tag">-{{ formatPrice(discountAmount) }}</text>
          <text class="coupon-name">{{ selectedCoupon.template?.name }}</text>
        </view>
        <text class="coupon-placeholder" v-else>{{ availableCoupons.length > 0 ? `${availableCoupons.length}张可用` : '暂无可用优惠券' }}</text>
        <text class="arrow">&#xe6a7;</text>
      </view>
    </view>

    <!-- 支付方式 -->
    <view class="payment-section">
      <view class="section-title">支付方式</view>
      <view class="payment-options">
        <view class="payment-item" @click="paymentMethod = 'wechat'" :class="{ active: paymentMethod === 'wechat' }">
          <view class="payment-left">
            <text class="payment-icon wechat">&#xe6cb;</text>
            <text class="payment-name">微信支付</text>
          </view>
          <text class="check-icon" v-if="paymentMethod === 'wechat'">&#xe6ad;</text>
          <text class="uncheck-circle" v-else></text>
        </view>
        <view class="payment-item" @click="paymentMethod = 'balance'" :class="{ active: paymentMethod === 'balance' }">
          <view class="payment-left">
            <text class="payment-icon balance">&#xe6b8;</text>
            <text class="payment-name">余额支付</text>
          </view>
          <text class="check-icon" v-if="paymentMethod === 'balance'">&#xe6ad;</text>
          <text class="uncheck-circle" v-else></text>
        </view>
      </view>
    </view>

    <!-- 配送信息 -->
    <view class="delivery-section">
      <view class="section-title">配送信息</view>
      <view class="info-cell">
        <text class="cell-label">配送方式</text>
        <view class="cell-content">
          <text>{{ deliveryType === 'delivery' ? '快递配送' : '门店自提' }}</text>
          <text class="free-shipping" v-if="shippingFee === 0">免运费</text>
        </view>
      </view>
      <picker mode="selector" :range="deliveryTimeOptions" :value="deliveryTimeIndex" @change="(e: any) => deliveryTimeIndex = e.detail.value">
        <view class="info-cell">
          <text class="cell-label">送货时间</text>
          <view class="cell-content">
            <text>{{ deliveryTimeOptions[deliveryTimeIndex] }}</text>
            <text class="arrow">&#xe6a7;</text>
          </view>
        </view>
      </picker>
    </view>


    <!-- 订单备注 -->
    <view class="remark-section">
      <text class="remark-label">订单备注</text>
      <input class="remark-input" type="text" placeholder="请输入备注信息（选填）" v-model="remark" />
    </view>

    <!-- 价格明细 -->
    <view class="price-section">
      <view class="price-item">
        <text class="price-label">共{{ totalCount }}件商品</text>
        <text class="price-value">合计 ¥{{ formatPrice(goodsTotal) }}</text>
      </view>
      <view class="price-item">
        <text class="price-label">运费</text>
        <text class="price-value">{{ shippingFee > 0 ? '¥' + formatPrice(shippingFee) : '免运费' }}</text>
      </view>
      <view class="price-item" v-if="selectedCoupon && discountAmount > 0">
        <text class="price-label">优惠券抵扣</text>
        <text class="price-value discount">-¥{{ formatPrice(discountAmount) }}</text>
      </view>
      <view class="price-item total">
        <text class="price-label">实付金额</text>
        <text class="price-value total">¥{{ formatPrice(finalAmount) }}</text>
      </view>
    </view>

    <!-- 底部提交栏 -->
    <view class="footer">
      <view class="footer-left">
        <text class="total-label">合计:</text>
        <text class="total-price">¥{{ formatPrice(finalAmount) }}</text>
        <text class="original-total" v-if="selectedCoupon && discountAmount > 0">¥{{ formatPrice(goodsTotal) }}</text>
      </view>
      <view class="footer-right">
        <view class="btn-submit" :class="{ disabled: !canSubmit || loading }" @click="submitOrder">
          <text class="btn-text">{{ loading ? '提交中...' : '提交订单' }}</text>
        </view>
      </view>
    </view>

    <!-- 优惠券选择弹窗 -->
    <view class="coupon-popup" v-if="couponPopupVisible" @click="closeCouponPopup">
      <view class="popup-mask"></view>
      <view class="popup-content" @click.stop>
        <view class="popup-header">
          <text class="popup-title">选择优惠券</text>
          <text class="popup-close" @click="closeCouponPopup">&#xe6b1;</text>
        </view>
        <view class="popup-body">
          <view class="coupon-option none" @click="selectCoupon(null)">
            <text class="option-text">不使用优惠券</text>
            <text class="check-icon" v-if="!selectedCoupon">&#xe6ad;</text>
          </view>
          <view 
            class="coupon-option" 
            v-for="coupon in availableCoupons" 
            :key="coupon._id"
            @click="selectCoupon(coupon)"
          >
            <view class="option-left">
              <view class="option-value">
                <text class="value-symbol" v-if="coupon.template?.type !== 'discount'">¥</text>
                <text class="value-num">{{ formatCouponValue(coupon.template) }}</text>
                <text class="value-unit" v-if="coupon.template?.type === 'discount'">折</text>
              </view>
              <view class="option-info">
                <text class="option-name">{{ coupon.template?.name }}</text>
                <text class="option-desc">{{ coupon.template?.description }}</text>
                <text class="option-expire">{{ formatDate(coupon.expireTime) }}到期</text>
              </view>
            </view>
            <text class="check-icon" v-if="selectedCoupon?._id === coupon._id">&#xe6ad;</text>
          </view>
          <view class="no-coupon" v-if="availableCoupons.length === 0">
            <text class="no-coupon-text">暂无可用优惠券</text>
          </view>
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
import { getCartItems, createOrder, formatPrice, getUserInfo, getAvailableCoupons, calculateCouponDiscount, useCoupon } from '@/utils/api';
import type { CartItem, Address, OrderItem, UserCoupon } from '@/types';

// 数据
const cartItems = ref<CartItem[]>([]);
const selectedAddress = ref<Address | null>(null);
const remark = ref('');
const paymentMethod = ref<'wechat' | 'balance'>('wechat');
const deliveryType = ref<'delivery' | 'pickup'>('delivery');
const DELIVERY_FEE = 1000; // 10元运费
const deliveryTimeIndex = ref(0);
const deliveryTimeOptions = ['随时送货', '工作日送货', '双休日/节假日送货'];

const loading = ref(false);
const isDirectBuy = ref(false);
const availableCoupons = ref<UserCoupon[]>([]);
const selectedCoupon = ref<UserCoupon | null>(null);
const couponPopupVisible = ref(false);

// 计算属性
const orderItems = computed(() => {
  return cartItems.value
    .filter(item => item.selected)
    .map(item => ({
      productId: item.productId,
      name: item.name,
      price: item.price,
      image: item.image,
      quantity: item.quantity,
      specs: item.specs
    }));
});

const totalCount = computed(() => {
  return orderItems.value.reduce((total, item) => total + item.quantity, 0);
});

const goodsTotal = computed(() => {
  return orderItems.value.reduce((total, item) => total + item.price * item.quantity, 0);
});

const discountAmount = computed(() => {
  if (!selectedCoupon.value) return 0;
  return calculateCouponDiscount(selectedCoupon.value, goodsTotal.value);
});

const shippingFee = computed(() => {
  if (deliveryType.value === 'pickup') return 0;
  
  // 检查是否有整箱商品
  const hasBoxItem = orderItems.value.some(item => 
    item.specs && item.specs.includes('整箱')
  );
  
  if (hasBoxItem) return 0;
  return DELIVERY_FEE;
});

const finalAmount = computed(() => {
  return Math.max(0, goodsTotal.value - discountAmount.value + shippingFee.value);
});

const canSubmit = computed(() => {
  const basicCheck = orderItems.value.length > 0;
  if (deliveryType.value === 'delivery') {
    return basicCheck && selectedAddress.value !== null;
  }
  return basicCheck;
});

// 加载购物车数据
const loadCartData = async () => {
  try {
    if (isDirectBuy.value) {
      // 如果是直接购买，从本地存储读取临时商品
      const tempItemsStr = uni.getStorageSync('temp_order_items');
      if (tempItemsStr) {
        cartItems.value = JSON.parse(tempItemsStr);
        // 加载完成后获取可用优惠券
        await loadAvailableCoupons();
      } else {
        uni.showToast({
          title: '订单信息丢失',
          icon: 'none'
        });
        setTimeout(() => {
          uni.navigateBack();
        }, 1500);
      }
    } else {
      // 购物车购买
      const res = await getCartItems();
      cartItems.value = res.filter(item => item.selected);
      
      if (cartItems.value.length === 0) {
        uni.showToast({
          title: '请先选择商品',
          icon: 'none'
        });
        setTimeout(() => {
          uni.navigateBack();
        }, 1500);
      } else {
        // 加载完成后获取可用优惠券
        await loadAvailableCoupons();
      }
    }
  } catch (error) {
    console.error('加载订单数据失败:', error);
  }
};

// 加载默认地址
const loadDefaultAddress = async () => {
  try {
    const userInfo = await getUserInfo();
    if (userInfo && userInfo.addresses) {
      const defaultAddr = userInfo.addresses.find(addr => addr.isDefault);
      if (defaultAddr) {
        selectedAddress.value = defaultAddr;
      }
    }
  } catch (error) {
    console.error('加载地址失败:', error);
  }
};

// 选择地址
const selectAddress = () => {
  uni.navigateTo({
    url: '/pages/address/list?select=true'
  });
};

// 打开门店导航
const openStoreLocation = () => {
  uni.openLocation({
    latitude: 27.744734,
    longitude: 120.660902,
    name: '大友元气精酿啤酒屋',
    address: '浙江省温州市瑞安市瑞光大道1308号德信铂瑞湾二期30楼05-06',
    scale: 18
  });
};

// 加载可用优惠券
const loadAvailableCoupons = async () => {
  try {
    const res = await getAvailableCoupons(goodsTotal.value);
    availableCoupons.value = res;
  } catch (error) {
    console.error('加载优惠券失败:', error);
  }
};

// 显示优惠券选择器
const showCouponSelector = () => {
  couponPopupVisible.value = true;
};

// 关闭优惠券选择器
const closeCouponPopup = () => {
  couponPopupVisible.value = false;
};

// 选择优惠券
const selectCoupon = (coupon: UserCoupon | null) => {
  selectedCoupon.value = coupon;
  closeCouponPopup();
};

// 格式化优惠券面值
const formatCouponValue = (template?: any) => {
  if (!template) return '0';
  if (template.type === 'discount') {
    return (template.value / 10).toFixed(1);
  }
  return formatPrice(template.value);
};

// 格式化日期
const formatDate = (date?: Date | string) => {
  if (!date) return '';
  const d = new Date(date);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
};

// 提交订单
const submitOrder = async () => {
  if (!canSubmit.value) return;
  
  if (loading.value) return;
  loading.value = true;
  
  try {
    const orderData = {
      products: orderItems.value,
      totalAmount: finalAmount.value,
      status: 'pending' as const,
      address: deliveryType.value === 'delivery' ? selectedAddress.value! : undefined,
      remark: remark.value,
      paymentMethod: paymentMethod.value,
      deliveryTime: deliveryTimeOptions[deliveryTimeIndex.value],
      deliveryType: deliveryType.value,
      shippingFee: shippingFee.value
    };
    
    const res = await createOrder(orderData);
    
    // 如果有使用优惠券，核销优惠券
    if (selectedCoupon.value && res._id) {
      try {
        await useCoupon(selectedCoupon.value._id!, res._id);
      } catch (error) {
        console.error('核销优惠券失败:', error);
      }
    }
    
    // 如果是直接购买，清除临时数据
    if (isDirectBuy.value) {
      uni.removeStorageSync('temp_order_items');
    }
    
    uni.showToast({
      title: '订单创建成功',
      icon: 'success'
    });
    
    // 跳转到支付页面或订单详情
    setTimeout(() => {
      uni.redirectTo({
        url: `/pages/order/detail?id=${res._id}`
      });
    }, 1500);
    
  } catch (error) {
    uni.showToast({
      title: '创建订单失败',
      icon: 'none'
    });
  } finally {
    loading.value = false;
  }
};

// 生命周期
onLoad((options) => {
  if (options?.mode === 'direct') {
    isDirectBuy.value = true;
  }
  loadCartData();
  loadDefaultAddress();
});

// 监听地址选择
uni.$on('selectAddress', (address: Address) => {
  selectedAddress.value = address;
});
</script>

<style scoped>
.container {
  min-height: 100vh;
  background-color: #FDF8F3;
  padding-bottom: 140rpx;
}

/* 配送方式切换 */
.mode-switch {
  display: flex;
  background: #FFFFFF;
  margin: 20rpx;
  border-radius: 16rpx;
  padding: 8rpx;
}

.switch-item {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  height: 80rpx;
  border-radius: 12rpx;
  transition: all 0.3s;
}

.switch-item.active {
  background: #D4A574;
}

.switch-text {
  font-size: 28rpx;
  color: #6B5B4F;
  font-weight: 500;
}

.switch-item.active .switch-text {
  color: #FFFFFF;
  font-weight: 600;
}

/* 自提门店信息 */
.store-section {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #FFFFFF;
  padding: 30rpx;
  margin: 20rpx;
  border-radius: 16rpx;
}

.store-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
  margin-right: 20rpx;
}

.store-name {
  font-size: 32rpx;
  font-weight: 600;
  color: #3D2914;
}

.store-address {
  font-size: 28rpx;
  color: #6B5B4F;
}

.store-time {
  font-size: 26rpx;
  color: #9B8B7F;
}

/* 地址选择 */
.address-section {
  display: flex;
  align-items: center;
  background: #FFFFFF;
  padding: 30rpx;
  margin: 20rpx;
  border-radius: 16rpx;
}

.address-content {
  flex: 1;
}

.address-top {
  display: flex;
  align-items: center;
  gap: 20rpx;
  margin-bottom: 12rpx;
}

.address-name {
  font-size: 32rpx;
  font-weight: 600;
  color: #3D2914;
}

.address-phone {
  font-size: 28rpx;
  color: #6B5B4F;
}

.address-detail {
  font-size: 26rpx;
  color: #9B8B7F;
  line-height: 1.5;
}

.address-empty {
  flex: 1;
}

.empty-text {
  font-size: 30rpx;
  color: #9B8B7F;
}

.arrow {
  font-family: "iconfont";
  font-size: 32rpx;
  color: #9B8B7F;
  margin-left: 20rpx;
}

/* 商品列表 */
.goods-section {
  background: #FFFFFF;
  padding: 30rpx;
  margin: 0 20rpx 20rpx;
  border-radius: 16rpx;
}

.section-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #3D2914;
  margin-bottom: 24rpx;
}

.goods-list {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.goods-item {
  display: flex;
  align-items: center;
}

.goods-image {
  width: 140rpx;
  height: 140rpx;
  border-radius: 12rpx;
  margin-right: 24rpx;
}

.goods-info {
  flex: 1;
}

.goods-name {
  font-size: 28rpx;
  color: #3D2914;
  display: block;
  margin-bottom: 12rpx;
}

.goods-price {
  font-size: 28rpx;
  font-weight: 600;
  color: #C44536;
}

.goods-quantity {
  font-size: 28rpx;
  color: #9B8B7F;
}

/* 优惠券选择 */
.coupon-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #FFFFFF;
  padding: 30rpx;
  margin: 0 20rpx 20rpx;
  border-radius: 16rpx;
}

.coupon-content {
  display: flex;
  align-items: center;
}

.coupon-info {
  display: flex;
  align-items: center;
}

.coupon-tag {
  font-size: 28rpx;
  color: #C44536;
  font-weight: 600;
  margin-right: 12rpx;
  padding: 4rpx 12rpx;
  background: rgba(196, 69, 54, 0.1);
  border-radius: 8rpx;
}

.coupon-name {
  font-size: 28rpx;
  color: #3D2914;
  max-width: 300rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.coupon-placeholder {
  font-size: 28rpx;
  color: #9B8B7F;
  margin-right: 12rpx;
}

/* 支付方式 */
.payment-section {
  background: #FFFFFF;
  padding: 30rpx;
  margin: 0 20rpx 20rpx;
  border-radius: 16rpx;
}

.payment-options {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.payment-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20rpx;
  border: 2rpx solid #F5F0E8;
  border-radius: 12rpx;
}

.payment-item.active {
  border-color: #D4A574;
  background: rgba(212, 165, 116, 0.05);
}

.payment-left {
  display: flex;
  align-items: center;
}

.payment-icon {
  font-family: "iconfont";
  font-size: 40rpx;
  margin-right: 20rpx;
}

.payment-icon.wechat {
  color: #09BB07;
}

.payment-icon.balance {
  color: #D4A574;
}

.payment-name {
  font-size: 28rpx;
  color: #3D2914;
}

.uncheck-circle {
  width: 36rpx;
  height: 36rpx;
  border: 2rpx solid #9B8B7F;
  border-radius: 50%;
}

/* 配送信息 */
.delivery-section {
  background: #FFFFFF;
  padding: 30rpx;
  margin: 0 20rpx 20rpx;
  border-radius: 16rpx;
}

.info-cell {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx 0;
  border-bottom: 2rpx solid #F5F0E8;
}

.info-cell:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.info-cell:first-of-type {
  padding-top: 0;
}

.cell-label {
  font-size: 28rpx;
  color: #3D2914;
}

.cell-content {
  display: flex;
  align-items: center;
  font-size: 28rpx;
  color: #6B5B4F;
}

.free-shipping {
  margin-left: 20rpx;
  color: #2D5016;
  font-size: 24rpx;
  background: rgba(45, 80, 22, 0.1);
  padding: 2rpx 8rpx;
  border-radius: 4rpx;
}


.goods-specs {
  font-size: 24rpx;
  color: #9B8B7F;
  background: #F5F0E8;
  padding: 4rpx 12rpx;
  border-radius: 6rpx;
  display: inline-block;
  margin-bottom: 12rpx;
}

/* 订单备注 */
.remark-section {
  display: flex;
  align-items: center;
  background: #FFFFFF;
  padding: 30rpx;
  margin: 0 20rpx 20rpx;
  border-radius: 16rpx;
}

.remark-label {
  font-size: 28rpx;
  color: #3D2914;
  margin-right: 24rpx;
}

.remark-input {
  flex: 1;
  font-size: 28rpx;
  color: #3D2914;
}

.remark-input::placeholder {
  color: #9B8B7F;
}

/* 价格明细 */
.price-section {
  background: #FFFFFF;
  padding: 30rpx;
  margin: 0 20rpx;
  border-radius: 16rpx;
}

.price-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20rpx;
}

.price-item.total {
  margin-top: 20rpx;
  padding-top: 20rpx;
  border-top: 2rpx solid #F5F0E8;
  margin-bottom: 0;
}

.price-label {
  font-size: 28rpx;
  color: #6B5B4F;
}

.price-value {
  font-size: 28rpx;
  color: #3D2914;
}

.price-value.total {
  font-size: 40rpx;
  font-weight: bold;
  color: #C44536;
}

.price-value.discount {
  color: #2D5016;
}

/* 优惠券选择弹窗 */
.coupon-popup {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1000;
}

.popup-mask {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
}

.popup-content {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  background: #FDF8F3;
  border-radius: 32rpx 32rpx 0 0;
  max-height: 70vh;
  display: flex;
  flex-direction: column;
}

.popup-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 30rpx;
  background: #FFFFFF;
  border-radius: 32rpx 32rpx 0 0;
}

.popup-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #3D2914;
}

.popup-close {
  font-family: "iconfont";
  font-size: 40rpx;
  color: #9B8B7F;
  padding: 10rpx;
}

.popup-body {
  flex: 1;
  overflow-y: auto;
  padding: 20rpx;
}

.coupon-option {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #FFFFFF;
  padding: 30rpx;
  border-radius: 16rpx;
  margin-bottom: 20rpx;
}

.coupon-option.none {
  justify-content: space-between;
}

.option-text {
  font-size: 30rpx;
  color: #6B5B4F;
}

.option-left {
  display: flex;
  align-items: center;
  flex: 1;
}

.option-value {
  display: flex;
  align-items: baseline;
  color: #C44536;
  margin-right: 24rpx;
  min-width: 100rpx;
}

.option-value .value-symbol {
  font-size: 24rpx;
}

.option-value .value-num {
  font-size: 40rpx;
  font-weight: bold;
}

.option-value .value-unit {
  font-size: 24rpx;
}

.option-info {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.option-name {
  font-size: 28rpx;
  font-weight: 600;
  color: #3D2914;
  margin-bottom: 8rpx;
}

.option-desc {
  font-size: 24rpx;
  color: #6B5B4F;
  margin-bottom: 8rpx;
}

.option-expire {
  font-size: 22rpx;
  color: #9B8B7F;
}

.check-icon {
  font-family: "iconfont";
  font-size: 36rpx;
  color: #D4A574;
  margin-left: 20rpx;
}

.no-coupon {
  display: flex;
  justify-content: center;
  padding: 60rpx 0;
}

.no-coupon-text {
  font-size: 28rpx;
  color: #9B8B7F;
}

/* 底部提交栏 */
.footer {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20rpx 30rpx;
  background: #FFFFFF;
  border-top: 1rpx solid #F5F0E8;
}

.footer-left {
  display: flex;
  align-items: baseline;
  gap: 8rpx;
}

.total-label {
  font-size: 28rpx;
  color: #3D2914;
}

.total-price {
  font-size: 44rpx;
  font-weight: bold;
  color: #C44536;
}

.original-total {
  font-size: 28rpx;
  color: #9B8B7F;
  text-decoration: line-through;
  margin-left: 12rpx;
}

.btn-submit {
  padding: 24rpx 80rpx;
  background: #D4A574;
  border-radius: 40rpx;
}

.btn-submit.disabled {
  background: #D4D4D4;
}

.btn-text {
  font-size: 32rpx;
  color: #FFFFFF;
  font-weight: 600;
}

.safe-area {
  height: constant(safe-area-inset-bottom);
  height: env(safe-area-inset-bottom);
}
</style>
