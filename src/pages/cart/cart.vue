<template>
  <view class="container">
    <!-- 顶部标题 -->
    <view class="header">
      <text class="header-title">购物车</text>
      <text class="header-action" @click="toggleEdit">{{ isEditing ? '完成' : '管理' }}</text>
    </view>

    <!-- 购物车列表 -->
    <scroll-view class="cart-list" scroll-y v-if="cartItems.length > 0">
      <view class="cart-item" v-for="(item, index) in cartItems" :key="item._id">
        <!-- 选择框 -->
        <view class="checkbox" @click="toggleSelect(item)">
          <view class="check-circle" :class="{ checked: item.selected }">
            <text v-if="item.selected" class="check-icon">&#xe6ad;</text>
          </view>
        </view>
        
        <!-- 商品图片 -->
        <image class="item-image" :src="item.image" mode="aspectFill" @click="goToProduct(item)" />
        
        <!-- 商品信息 -->
        <view class="item-info">
          <text class="item-name" @click="goToProduct(item)">{{ item.name }}</text>
          <view class="item-meta">
            <text class="item-specs" v-if="item.specs">{{ item.specs }}</text>
            <text class="item-category" v-else>{{ item.category }}</text>
          </view>
          <view class="item-bottom">
            <text class="item-price">¥{{ formatPrice(item.price) }}</text>
            <view class="quantity-control">
              <view class="btn-minus" :class="{ disabled: item.quantity <= 1 }" @click="decreaseQuantity(item)">
                <text class="btn-text">-</text>
              </view>
              <text class="quantity">{{ item.quantity }}</text>
              <view class="btn-plus" :class="{ disabled: item.quantity >= item.stock }" @click="increaseQuantity(item)">
                <text class="btn-text">+</text>
              </view>
            </view>
          </view>
        </view>
        
        <!-- 删除按钮 -->
        <view class="delete-btn" v-if="isEditing" @click="deleteItem(item)">
          <text class="delete-text">删除</text>
        </view>
      </view>
    </scroll-view>

    <!-- 空购物车 -->
    <view class="empty-cart" v-else>
      <view class="empty-icon">&#xe6af;</view>
      <text class="empty-title">购物车是空的</text>
      <text class="empty-desc">快去挑选心仪的精酿啤酒吧</text>
      <view class="go-shopping" @click="goToHome">
        <text class="btn-text">去逛逛</text>
      </view>
    </view>

    <!-- 底部结算栏 -->
    <view class="footer" v-if="cartItems.length > 0">
      <view class="footer-left">
        <view class="select-all" @click="toggleSelectAll">
          <view class="check-circle" :class="{ checked: isAllSelected }">
            <text v-if="isAllSelected" class="check-icon">&#xe6ad;</text>
          </view>
          <text class="select-text">全选</text>
        </view>
        <view class="total-section" v-if="!isEditing">
          <text class="total-label">合计:</text>
          <text class="total-price">¥{{ formatPrice(totalPrice) }}</text>
        </view>
      </view>
      <view class="footer-right">
        <view class="btn-settle" :class="{ disabled: selectedCount === 0 }" @click="settle" v-if="!isEditing">
          <text class="btn-text">结算({{ selectedCount }})</text>
        </view>
        <view class="btn-delete" :class="{ disabled: selectedCount === 0 }" @click="batchDelete" v-else>
          <text class="btn-text">删除({{ selectedCount }})</text>
        </view>
      </view>
    </view>

    <!-- 安全区域 -->
    <view class="safe-area"></view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { 
  getCartItems, 
  updateCartQuantity, 
  updateCartSelected,
  removeFromCart,
  calculateCartTotal,
  formatPrice 
} from '@/utils/api';
import type { CartItem } from '@/types';

// 数据
const cartItems = ref<CartItem[]>([]);
const isEditing = ref(false);
const loading = ref(false);

// 计算属性
const isAllSelected = computed(() => {
  if (cartItems.value.length === 0) return false;
  return cartItems.value.every(item => item.selected);
});

const selectedCount = computed(() => {
  return cartItems.value.filter(item => item.selected).length;
});

const totalPrice = computed(() => {
  return calculateCartTotal(cartItems.value);
});

// 获取购物车数据
const loadCartData = async () => {
  try {
    loading.value = true;
    const res = await getCartItems();
    cartItems.value = res;
  } catch (error) {
    console.error('加载购物车失败:', error);
    uni.showToast({
      title: '加载失败',
      icon: 'none'
    });
  } finally {
    loading.value = false;
  }
};

// 切换编辑模式
const toggleEdit = () => {
  isEditing.value = !isEditing.value;
};

// 切换选中状态
const toggleSelect = async (item: CartItem) => {
  try {
    await updateCartSelected(item._id!, !item.selected);
    item.selected = !item.selected;
  } catch (error) {
    uni.showToast({
      title: '操作失败',
      icon: 'none'
    });
  }
};

// 全选/取消全选
const toggleSelectAll = async () => {
  const newState = !isAllSelected.value;
  try {
    // 批量更新
    for (const item of cartItems.value) {
      if (item.selected !== newState) {
        await updateCartSelected(item._id!, newState);
        item.selected = newState;
      }
    }
  } catch (error) {
    uni.showToast({
      title: '操作失败',
      icon: 'none'
    });
  }
};

// 增加数量
const increaseQuantity = async (item: CartItem) => {
  if (item.quantity >= item.stock) {
    uni.showToast({
      title: '库存不足',
      icon: 'none'
    });
    return;
  }
  
  try {
    await updateCartQuantity(item._id!, item.quantity + 1);
    item.quantity++;
  } catch (error) {
    uni.showToast({
      title: '操作失败',
      icon: 'none'
    });
  }
};

// 减少数量
const decreaseQuantity = async (item: CartItem) => {
  if (item.quantity <= 1) return;
  
  try {
    await updateCartQuantity(item._id!, item.quantity - 1);
    item.quantity--;
  } catch (error) {
    uni.showToast({
      title: '操作失败',
      icon: 'none'
    });
  }
};

// 删除商品
const deleteItem = (item: CartItem) => {
  uni.showModal({
    title: '提示',
    content: '确定要删除这个商品吗？',
    success: async (res) => {
      if (res.confirm) {
        try {
          await removeFromCart(item._id!);
          const index = cartItems.value.findIndex(i => i._id === item._id);
          if (index > -1) {
            cartItems.value.splice(index, 1);
          }
          uni.showToast({
            title: '已删除',
            icon: 'success'
          });
        } catch (error) {
          uni.showToast({
            title: '删除失败',
            icon: 'none'
          });
        }
      }
    }
  });
};

// 批量删除
const batchDelete = () => {
  const selectedItems = cartItems.value.filter(item => item.selected);
  if (selectedItems.length === 0) return;
  
  uni.showModal({
    title: '提示',
    content: `确定要删除选中的${selectedItems.length}个商品吗？`,
    success: async (res) => {
      if (res.confirm) {
        try {
          for (const item of selectedItems) {
            await removeFromCart(item._id!);
          }
          cartItems.value = cartItems.value.filter(item => !item.selected);
          isEditing.value = false;
          uni.showToast({
            title: '已删除',
            icon: 'success'
          });
        } catch (error) {
          uni.showToast({
            title: '删除失败',
            icon: 'none'
          });
        }
      }
    }
  });
};

// 结算
const settle = () => {
  const selectedItems = cartItems.value.filter(item => item.selected);
  if (selectedItems.length === 0) return;
  
  // 跳转到订单确认页
  uni.navigateTo({
    url: '/pages/order/confirm'
  });
};

// 页面跳转
const goToProduct = (item: CartItem) => {
  uni.navigateTo({
    url: `/pages/product/detail?id=${item.productId}`
  });
};

const goToHome = () => {
  uni.switchTab({
    url: '/pages/index/index'
  });
};

// 生命周期
onShow(() => {
  loadCartData();
});
</script>

<style scoped>
.container {
  min-height: 100vh;
  background-color: #FDF8F3;
  display: flex;
  flex-direction: column;
}

/* 顶部标题 */
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 40rpx 30rpx 20rpx;
  background: linear-gradient(180deg, #3D2914 0%, #5D3924 100%);
}

.header-title {
  font-size: 36rpx;
  font-weight: bold;
  color: #FFFFFF;
}

.header-action {
  font-size: 28rpx;
  color: #D4A574;
}

/* 购物车列表 */
.cart-list {
  flex: 1;
  padding: 20rpx;
}

.cart-item {
  display: flex;
  align-items: center;
  background: #FFFFFF;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 2rpx 12rpx rgba(61, 41, 20, 0.06);
}

.checkbox {
  margin-right: 20rpx;
}

.check-circle {
  width: 44rpx;
  height: 44rpx;
  border: 2rpx solid #D4A574;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.check-circle.checked {
  background: #D4A574;
  border-color: #D4A574;
}

.check-icon {
  font-family: "iconfont";
  font-size: 24rpx;
  color: #FFFFFF;
}

.item-image {
  width: 160rpx;
  height: 160rpx;
  border-radius: 12rpx;
  margin-right: 24rpx;
}

.item-info {
  flex: 1;
  min-width: 0;
}

.item-name {
  font-size: 28rpx;
  font-weight: 600;
  color: #3D2914;
  display: block;
  margin-bottom: 8rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-meta {
  margin-bottom: 20rpx;
}

.item-specs {
  font-size: 24rpx;
  color: #D4A574;
  background: rgba(212, 165, 116, 0.1);
  padding: 4rpx 12rpx;
  border-radius: 6rpx;
}

.item-category {
  font-size: 24rpx;
  color: #9B8B7F;
  display: block;
}

.item-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.item-price {
  font-size: 32rpx;
  font-weight: bold;
  color: #C44536;
}

.quantity-control {
  display: flex;
  align-items: center;
  background: #F5F0E8;
  border-radius: 8rpx;
}

.btn-minus, .btn-plus {
  width: 56rpx;
  height: 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-minus.disabled, .btn-plus.disabled {
  opacity: 0.4;
}

.btn-text {
  font-size: 32rpx;
  color: #3D2914;
  font-weight: bold;
}

.quantity {
  font-size: 28rpx;
  color: #3D2914;
  min-width: 60rpx;
  text-align: center;
  padding: 0 16rpx;
}

.delete-btn {
  margin-left: 20rpx;
  padding: 16rpx 24rpx;
  background: #C44536;
  border-radius: 8rpx;
}

.delete-text {
  font-size: 26rpx;
  color: #FFFFFF;
}

/* 空购物车 */
.empty-cart {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 100rpx 40rpx;
}

.empty-icon {
  font-family: "iconfont";
  font-size: 120rpx;
  color: #D4A574;
  margin-bottom: 40rpx;
}

.empty-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #3D2914;
  margin-bottom: 16rpx;
}

.empty-desc {
  font-size: 28rpx;
  color: #9B8B7F;
  margin-bottom: 40rpx;
}

.go-shopping {
  padding: 24rpx 80rpx;
  background: #D4A574;
  border-radius: 40rpx;
}

.go-shopping .btn-text {
  font-size: 30rpx;
  color: #FFFFFF;
  font-weight: 500;
}

/* 底部结算栏 */
.footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20rpx 30rpx;
  background: #FFFFFF;
  border-top: 1rpx solid #F5F0E8;
}

.footer-left {
  display: flex;
  align-items: center;
  gap: 30rpx;
}

.select-all {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.select-text {
  font-size: 28rpx;
  color: #3D2914;
}

.total-section {
  display: flex;
  align-items: baseline;
  gap: 8rpx;
}

.total-label {
  font-size: 28rpx;
  color: #3D2914;
}

.total-price {
  font-size: 40rpx;
  font-weight: bold;
  color: #C44536;
}

.footer-right {
  display: flex;
  align-items: center;
}

.btn-settle, .btn-delete {
  padding: 24rpx 60rpx;
  background: #D4A574;
  border-radius: 40rpx;
}

.btn-settle.disabled, .btn-delete.disabled {
  background: #D4D4D4;
}

.btn-settle .btn-text, .btn-delete .btn-text {
  font-size: 30rpx;
  color: #FFFFFF;
  font-weight: 600;
}

/* 安全区域 */
.safe-area {
  height: constant(safe-area-inset-bottom);
  height: env(safe-area-inset-bottom);
  background: #FFFFFF;
}
</style>
