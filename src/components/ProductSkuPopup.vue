<template>
  <view class="popup-mask" v-if="visible" @click="close">
    <view class="popup-content" @click.stop>
      <view class="popup-header">
        <image class="popup-image" :src="product.images[0]" mode="aspectFill" />
        <view class="popup-info">
          <view class="popup-price-row">
            <text class="popup-price">¥{{ formatPrice(currentPrice) }}</text>
            <text class="popup-stock">库存: {{ product.stock }}</text>
          </view>
          <text class="popup-selected">已选: {{ currentSpec || '默认规格' }}</text>
        </view>
        <view class="close-btn" @click="close">
          <text class="close-icon">&#xe6a6;</text>
        </view>
      </view>
      
      <scroll-view class="popup-body" scroll-y>
        <!-- 规格选择 -->
        <view class="spec-section" v-if="product.priceList && product.priceList.length > 0">
          <text class="section-title">规格</text>
          <view class="spec-list">
            <view 
              class="spec-item" 
              v-for="(spec, index) in product.priceList" 
              :key="index"
              :class="{ active: currentSpec === spec.volume }"
              @click="selectSpec(spec)"
            >
              <text>{{ spec.volume }}</text>
            </view>
          </view>
        </view>

        <!-- 数量选择 -->
        <view class="quantity-section">
          <text class="section-title">数量</text>
          <view class="quantity-control">
            <view class="btn-minus" :class="{ disabled: quantity <= 1 }" @click="decreaseQuantity">
              <text class="btn-text">-</text>
            </view>
            <text class="quantity-num">{{ quantity }}</text>
            <view class="btn-plus" :class="{ disabled: quantity >= product.stock }" @click="increaseQuantity">
              <text class="btn-text">+</text>
            </view>
          </view>
        </view>
      </scroll-view>

      <view class="popup-footer">
        <view class="btn-confirm" @click="confirm">
          <text class="btn-text">加入购物车</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { addToCart as apiAddToCart, formatPrice } from '@/utils/api';
import type { Product } from '@/types';

const props = defineProps<{
  visible: boolean;
  product: Product;
}>();

const emit = defineEmits(['update:visible', 'close', 'success']);

const quantity = ref(1);
const currentPrice = ref(0);
const currentSpec = ref('');

// 初始化数据
watch(() => props.visible, (newVal) => {
  if (newVal && props.product) {
    quantity.value = 1;
    if (props.product.priceList && props.product.priceList.length > 0) {
      // 默认选中第一个规格
      const defaultSpec = props.product.priceList[0];
      currentPrice.value = defaultSpec.price;
      currentSpec.value = defaultSpec.volume;
    } else {
      currentPrice.value = props.product.price;
      currentSpec.value = props.product.specs || '';
    }
  }
});

const close = () => {
  emit('update:visible', false);
  emit('close');
};

const selectSpec = (spec: { volume: string; price: number }) => {
  currentSpec.value = spec.volume;
  currentPrice.value = spec.price;
};

const decreaseQuantity = () => {
  if (quantity.value > 1) {
    quantity.value--;
  }
};

const increaseQuantity = () => {
  if (quantity.value < props.product.stock) {
    quantity.value++;
  }
};

const confirm = async () => {
  try {
    await apiAddToCart({
      productId: props.product._id!,
      name: props.product.name,
      price: currentPrice.value,
      image: props.product.images[0],
      quantity: quantity.value,
      selected: true,
      stock: props.product.stock,
      category: props.product.category,
      specs: currentSpec.value
    });
    
    uni.showToast({
      title: '已加入购物车',
      icon: 'success'
    });
    
    emit('success');
    close();
  } catch (error) {
    uni.showToast({
      title: '添加失败',
      icon: 'none'
    });
  }
};
</script>

<style scoped>
.popup-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  z-index: 999;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
}

.popup-content {
  background: #FFFFFF;
  border-radius: 24rpx 24rpx 0 0;
  padding: 30rpx;
  min-height: 600rpx;
  display: flex;
  flex-direction: column;
}

.popup-header {
  display: flex;
  margin-bottom: 40rpx;
  position: relative;
}

.popup-image {
  width: 180rpx;
  height: 180rpx;
  border-radius: 12rpx;
  margin-right: 24rpx;
  margin-top: -60rpx;
  background: #FFFFFF;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.1);
}

.popup-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
}

.popup-price-row {
  display: flex;
  align-items: baseline;
  margin-bottom: 8rpx;
}

.popup-price {
  font-size: 40rpx;
  font-weight: bold;
  color: #C44536;
  margin-right: 16rpx;
}

.popup-stock {
  font-size: 24rpx;
  color: #999999;
}

.popup-selected {
  font-size: 26rpx;
  color: #3D2914;
}

.close-btn {
  position: absolute;
  top: 0;
  right: 0;
  padding: 10rpx;
}

.close-icon {
  font-family: "iconfont";
  font-size: 32rpx;
  color: #999999;
}

.popup-body {
  flex: 1;
  margin-bottom: 30rpx;
}

.section-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #3D2914;
  margin-bottom: 20rpx;
  display: block;
}

.spec-section {
  margin-bottom: 40rpx;
}

.spec-list {
  display: flex;
  flex-wrap: wrap;
  gap: 20rpx;
}

.spec-item {
  padding: 12rpx 30rpx;
  background: #F5F0E8;
  border-radius: 30rpx;
  border: 1rpx solid transparent;
  font-size: 26rpx;
  color: #3D2914;
}

.spec-item.active {
  background: rgba(212, 165, 116, 0.15);
  border-color: #D4A574;
  color: #D4A574;
  font-weight: 600;
}

.quantity-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 40rpx;
}

.quantity-control {
  display: flex;
  align-items: center;
}

.btn-minus, .btn-plus {
  width: 60rpx;
  height: 60rpx;
  background: #F5F0E8;
  border-radius: 8rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-minus.disabled, .btn-plus.disabled {
  opacity: 0.5;
  background: #F9F9F9;
}

.btn-text {
  font-size: 32rpx;
  color: #3D2914;
  font-weight: bold;
}

.quantity-num {
  width: 80rpx;
  text-align: center;
  font-size: 28rpx;
  font-weight: 600;
}

.popup-footer {
  padding-bottom: constant(safe-area-inset-bottom);
  padding-bottom: env(safe-area-inset-bottom);
}

.btn-confirm {
  height: 88rpx;
  background: linear-gradient(135deg, #C9A962 0%, #B8984A 100%);
  border-radius: 44rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 20rpx rgba(201, 169, 98, 0.3);
}

.btn-confirm .btn-text {
  color: #FFFFFF;
  font-size: 32rpx;
}
</style>