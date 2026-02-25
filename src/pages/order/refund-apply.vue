<template>
  <view class="container">
    <!-- 订单信息 -->
    <view class="order-card" v-if="order">
      <view class="card-title">订单信息</view>
      <view class="order-no">订单号：{{ order.orderNo }}</view>
      <view class="order-amount">订单金额：¥{{ formatPrice(order.totalAmount) }}</view>
    </view>

    <!-- 退款类型选择 -->
    <view class="section-card">
      <view class="card-title">退款类型</view>
      <view class="type-options">
        <view
          class="type-option"
          :class="{ active: refundType === 'only_refund' }"
          @click="selectRefundType('only_refund')"
        >
          <view class="type-radio">
            <view class="radio-dot" v-if="refundType === 'only_refund'"></view>
          </view>
          <view class="type-info">
            <text class="type-name">仅退款</text>
            <text class="type-desc">无需退货，直接退款</text>
          </view>
        </view>
        <view
          class="type-option"
          :class="{ active: refundType === 'return_refund' }"
          @click="selectRefundType('return_refund')"
        >
          <view class="type-radio">
            <view class="radio-dot" v-if="refundType === 'return_refund'"></view>
          </view>
          <view class="type-info">
            <text class="type-name">退货退款</text>
            <text class="type-desc">需要寄回商品后退款</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 选择商品 -->
    <view class="section-card" v-if="order && order.products">
      <view class="card-title">
        选择退款商品
        <text class="select-all" @click="toggleSelectAll">{{ allSelected ? '取消全选' : '全选' }}</text>
      </view>
      <view class="product-list">
        <view
          class="product-item"
          v-for="(product, index) in order.products"
          :key="index"
        >
          <view class="product-checkbox" @click="toggleProduct(index)">
            <view class="checkbox" :class="{ checked: selectedProducts.has(index) }">
              <text v-if="selectedProducts.has(index)">✓</text>
            </view>
          </view>
          <image class="product-img" :src="product.image || ''" mode="aspectFill" />
          <view class="product-info">
            <text class="product-name">{{ product.name }}</text>
            <text class="product-price">¥{{ formatPrice(product.price) }}</text>
            <text class="product-quantity">x{{ product.quantity }}</text>
          </view>
          <view class="quantity-control" v-if="selectedProducts.has(index)">
            <text class="control-btn" @click="decreaseQuantity(index)">-</text>
            <text class="quantity-value">{{ refundQuantities[index] }}</text>
            <text class="control-btn" @click="increaseQuantity(index)">+</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 退款原因 -->
    <view class="section-card">
      <view class="card-title">退款原因</view>
      <view class="reason-list">
        <view
          class="reason-item"
          :class="{ active: refundReason === reason }"
          v-for="reason in refundReasons"
          :key="reason"
          @click="selectReason(reason)"
        >
          <text class="reason-text">{{ reason }}</text>
          <view class="reason-check" v-if="refundReason === reason">✓</view>
        </view>
      </view>
      <view class="custom-reason" v-if="showCustomReason">
        <textarea
          class="reason-input"
          v-model="customReason"
          placeholder="请输入退款原因"
          maxlength="200"
        />
      </view>
    </view>

    <!-- 退款金额预览 -->
    <view class="section-card">
      <view class="card-title">退款金额</view>
      <view class="amount-preview">
        <text class="amount-label">退款总额</text>
        <text class="amount-value">¥{{ formatPrice(calculatedRefundAmount) }}</text>
      </view>
      <view class="amount-desc" v-if="order">
        退款金额将原路返回至您的支付账户
      </view>
    </view>

    <!-- 提交按钮 -->
    <view class="submit-section">
      <button class="submit-btn" :disabled="!canSubmit" @click="submitRefund">
        提交申请
      </button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { applyRefund, formatPrice } from '@/utils/api';

// 类型定义（内联，避免分包导入问题）
interface Order {
  _id: string
  orderNo: string
  products: OrderItem[]
  totalAmount: number
  status: 'pending' | 'paid' | 'shipping' | 'completed' | 'cancelled'
  address?: {
    name: string
    phone: string
    province: string
    city: string
    district: string
    detail: string
  }
  createTime: Date
  payTime?: Date
  _openid?: string
}

interface OrderItem {
  productId: string
  name: string
  price: number
  quantity: number
  specs?: string
  image?: string
}

// 订单信息
const order = ref<Partial<Order> | null>(null);
const orderId = ref('');

// 退款类型
const refundType = ref<'only_refund' | 'return_refund'>('only_refund');

// 选中的商品
const selectedProducts = ref<Set<number>>(new Set());
const refundQuantities = ref<Record<number, number>>({});

// 退款原因
const refundReasons = [
  '不想要了',
  '商品信息描述不符',
  '质量问题',
  '发货/物流问题',
  '其他'
];
const refundReason = ref('');
const customReason = ref('');
const showCustomReason = ref(false);

// 计算退款金额
const calculatedRefundAmount = computed(() => {
  if (!order.value) return 0;

  let total = 0;
  for (const index of selectedProducts.value) {
    const product = order.value.products?.[index];
    if (product) {
      const qty = refundQuantities.value[index] || 1;
      total += product.price * qty;
    }
  }
  return total;
});

// 是否全选
const allSelected = computed(() => {
  if (!order.value || order.value.products.length === 0) return false;
  return selectedProducts.value.size === order.value.products.length;
});

// 是否可以提交
const canSubmit = computed(() => {
  if (selectedProducts.value.size === 0) return false;
  if (!refundReason.value) return false;
  if (refundReason.value === '其他' && !customReason.value) return false;
  return true;
});

// 选择退款类型
const selectRefundType = (type: 'only_refund' | 'return_refund') => {
  refundType.value = type;
};

// 切换商品选择
const toggleProduct = (index: number) => {
  if (selectedProducts.value.has(index)) {
    selectedProducts.value.delete(index);
    delete refundQuantities.value[index];
  } else {
    selectedProducts.value.add(index);
    const product = order.value?.products?.[index];
    if (product) {
      refundQuantities.value[index] = product.quantity || 1;
    }
  }
};

// 全选/取消全选
const toggleSelectAll = () => {
  if (allSelected.value) {
    selectedProducts.value.clear();
    refundQuantities.value = {};
  } else {
    order.value?.products?.forEach((_, index) => {
      selectedProducts.value.add(index);
      refundQuantities.value[index] = order.value.products[index].quantity || 1;
    });
  }
};

// 增加退款数量
const increaseQuantity = (index: number) => {
  const product = order.value?.products?.[index];
  if (product) {
    const maxQty = product.quantity || 1;
    const currentQty = refundQuantities.value[index] || 1;
    if (currentQty < maxQty) {
      refundQuantities.value[index] = currentQty + 1;
    }
  }
};

// 减少退款数量
const decreaseQuantity = (index: number) => {
  const currentQty = refundQuantities.value[index] || 1;
  if (currentQty > 1) {
    refundQuantities.value[index] = currentQty - 1;
  }
};

// 选择退款原因
const selectReason = (reason: string) => {
  if (reason === refundReason.value) {
    refundReason.value = '';
    showCustomReason.value = false;
  } else {
    refundReason.value = reason;
    showCustomReason.value = reason === '其他';
  }
};

// 提交退款申请
const submitRefund = async () => {
  if (!canSubmit.value || !order.value) return;

  const products = Array.from(selectedProducts.value).map(index => {
    const product = order.value!.products![index];
    return {
      productId: product.productId || product._id!,
      refundQuantity: refundQuantities.value[index]
    };
  });

  const finalReason = refundReason.value === '其他' ? customReason.value : refundReason.value;

  try {
    uni.showLoading({ title: '提交中...' });
    await applyRefund({
      orderId: orderId.value,
      refundType: refundType.value,
      refundReason: finalReason,
      products: products
    });
    uni.hideLoading();
    uni.showToast({ title: '申请成功', icon: 'success' });
    setTimeout(() => {
      uni.navigateBack();
    }, 1500);
  } catch (err: any) {
    uni.hideLoading();
    uni.showToast({ title: err.message || '申请失败', icon: 'none' });
  }
};

onMounted(() => {
  const pages = getCurrentPages();
  const currentPage = pages[pages.length - 1];
  const options = currentPage.options as any;

  orderId.value = options.orderId || '';

  if (orderId.value && options.orderData) {
    try {
      order.value = JSON.parse(decodeURIComponent(options.orderData));
    } catch (e) {
      console.error('Failed to parse order data:', e);
    }
  }
});
</script>

<style scoped>
.container {
  min-height: 100vh;
  background-color: #FAFAFA;
  padding: 20rpx 32rpx 120rpx;
}

.order-card,
.section-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
}

.card-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #1A1A1A;
  margin-bottom: 20rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.select-all {
  font-size: 24rpx;
  color: #D4A574;
}

.order-no {
  font-size: 26rpx;
  color: #666;
  margin-bottom: 8rpx;
}

.order-amount {
  font-size: 32rpx;
  font-weight: 700;
  color: #D4A574;
}

.type-options {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.type-option {
  display: flex;
  gap: 20rpx;
  padding: 20rpx;
  border: 2rpx solid #E0E0E0;
  border-radius: 12rpx;
  transition: all 0.3s;
}

.type-option.active {
  border-color: #D4A574;
  background: #FDF8F3;
}

.type-radio {
  width: 36rpx;
  height: 36rpx;
  border: 2rpx solid #E0E0E0;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.type-option.active .type-radio {
  border-color: #D4A574;
}

.radio-dot {
  width: 20rpx;
  height: 20rpx;
  background: #D4A574;
  border-radius: 50%;
}

.type-info {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.type-name {
  font-size: 28rpx;
  color: #1A1A1A;
  font-weight: 500;
}

.type-desc {
  font-size: 24rpx;
  color: #999;
}

.product-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.product-item {
  display: flex;
  gap: 20rpx;
  padding: 16rpx;
  background: #FAFAFA;
  border-radius: 12rpx;
  align-items: center;
}

.product-checkbox {
  flex-shrink: 0;
}

.checkbox {
  width: 36rpx;
  height: 36rpx;
  border: 2rpx solid #E0E0E0;
  border-radius: 6rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 20rpx;
}

.checkbox.checked {
  background: #D4A574;
  border-color: #D4A574;
}

.product-img {
  width: 100rpx;
  height: 100rpx;
  border-radius: 8rpx;
  background: #F0F0F0;
  flex-shrink: 0;
}

.product-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.product-name {
  font-size: 26rpx;
  color: #1A1A1A;
  font-weight: 500;
}

.product-price {
  font-size: 24rpx;
  color: #D4A574;
}

.product-quantity {
  font-size: 24rpx;
  color: #999;
}

.quantity-control {
  display: flex;
  align-items: center;
  gap: 16rpx;
  flex-shrink: 0;
}

.control-btn {
  width: 48rpx;
  height: 48rpx;
  border: 1rpx solid #E0E0E0;
  border-radius: 6rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24rpx;
  color: #666;
}

.quantity-value {
  min-width: 40rpx;
  text-align: center;
  font-size: 26rpx;
  color: #1A1A1A;
}

.reason-list {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.reason-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20rpx;
  border: 1rpx solid #E0E0E0;
  border-radius: 8rpx;
}

.reason-item.active {
  border-color: #D4A574;
  background: #FDF8F3;
}

.reason-text {
  font-size: 26rpx;
  color: #1A1A1A;
}

.reason-check {
  width: 32rpx;
  height: 32rpx;
  background: #D4A574;
  color: #fff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18rpx;
}

.custom-reason {
  margin-top: 16rpx;
}

.reason-input {
  width: 100%;
  min-height: 120rpx;
  padding: 16rpx;
  border: 1rpx solid #E0E0E0;
  border-radius: 8rpx;
  font-size: 26rpx;
}

.amount-preview {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16rpx 0;
}

.amount-label {
  font-size: 26rpx;
  color: #666;
}

.amount-value {
  font-size: 40rpx;
  font-weight: 700;
  color: #D4A574;
}

.amount-desc {
  font-size: 24rpx;
  color: #999;
  margin-top: 16rpx;
}

.submit-section {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 20rpx 32rpx;
  background: #fff;
  border-top: 1rpx solid #EAEAEA;
}

.submit-btn {
  width: 100%;
  height: 88rpx;
  background: #D4A574;
  color: #fff;
  border-radius: 12rpx;
  font-size: 28rpx;
  font-weight: 600;
  border: none;
}

.submit-btn[disabled] {
  background: #E0E0E0;
  color: #999;
}
</style>
