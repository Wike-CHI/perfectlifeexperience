<template>
  <view class="container">
    <!-- 空状态 -->
    <view class="empty" v-if="favorites.length === 0">
      <image class="empty-icon" src="/static/icons/empty-favorite.svg" mode="aspectFit" />
      <text class="empty-text">暂无收藏商品</text>
      <text class="empty-hint">去首页逛逛，收藏喜欢的精酿啤酒吧</text>
      <button class="go-btn" @click="goHome">去逛逛</button>
    </view>

    <!-- 收藏列表 -->
    <view class="list" v-else>
      <view class="item" v-for="item in favorites" :key="item.productId" @click="goDetail(item.productId)">
        <image class="item-img" :src="getListThumbnail(item.image)" mode="aspectFill" lazy-load />
        <view class="item-info">
          <text class="item-name">{{ item.name }}</text>
          <view class="item-bottom">
            <text class="item-price">¥{{ (item.price / 100).toFixed(2) }}</text>
            <view class="item-actions">
              <button class="cart-btn" @click.stop="addToCart(item)">加入购物车</button>
              <view class="del-btn" @click.stop="removeFav(item.productId)">
                <uni-icons type="trash" size="18" color="#999" />
              </view>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 底部操作栏 -->
    <view class="footer" v-if="favorites.length > 0">
      <text class="count">共 {{ favorites.length }} 件收藏</text>
      <button class="clear-btn" @click="clearAll">清空收藏</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { getFavorites, removeFavorite, clearFavorites, type FavoriteItem } from '@/utils/favorite';
import { addToCart as addToCartApi } from '@/utils/api';
import { getListThumbnail } from '@/utils/image';

const favorites = ref<FavoriteItem[]>([]);

onShow(() => {
  favorites.value = getFavorites();
});

const goHome = () => {
  uni.switchTab({ url: '/pages/index/index' });
};

const goDetail = (productId: string) => {
  uni.navigateTo({ url: `/pages/product/detail?id=${productId}` });
};

const addToCart = async (item: FavoriteItem) => {
  try {
    await addToCartApi({
      productId: item.productId,
      name: item.name,
      price: item.price,
      image: item.image,
      quantity: 1,
      specs: ''
    });
    uni.showToast({ title: '已加入购物车', icon: 'success' });
  } catch (error) {
    uni.showToast({ title: '添加失败', icon: 'none' });
  }
};

const removeFav = (productId: string) => {
  uni.showModal({
    title: '提示',
    content: '确定取消收藏？',
    success: (res) => {
      if (res.confirm) {
        removeFavorite(productId);
        favorites.value = getFavorites();
        uni.showToast({ title: '已取消收藏', icon: 'none' });
      }
    }
  });
};

const clearAll = () => {
  uni.showModal({
    title: '提示',
    content: '确定清空所有收藏？',
    confirmColor: '#C44536',
    success: (res) => {
      if (res.confirm) {
        clearFavorites();
        favorites.value = [];
        uni.showToast({ title: '已清空', icon: 'none' });
      }
    }
  });
};
</script>

<style scoped>
.container {
  min-height: 100vh;
  background-color: #FDF8F3;
  padding-bottom: 120rpx;
}

/* 空状态 */
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 200rpx;
}

.empty-icon {
  width: 200rpx;
  height: 200rpx;
  opacity: 0.5;
  margin-bottom: 30rpx;
}

.empty-text {
  font-size: 32rpx;
  color: #3D2914;
  margin-bottom: 16rpx;
}

.empty-hint {
  font-size: 26rpx;
  color: #9B8B7F;
  margin-bottom: 40rpx;
}

.go-btn {
  background: linear-gradient(135deg, #C9A962 0%, #B8984A 100%);
  color: white;
  font-size: 28rpx;
  padding: 20rpx 60rpx;
  border-radius: 40rpx;
  border: none;
}

/* 列表 */
.list {
  padding: 20rpx;
}

.item {
  display: flex;
  background: white;
  border-radius: 16rpx;
  padding: 20rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 4rpx 16rpx rgba(61, 41, 20, 0.06);
}

.item-img {
  width: 160rpx;
  height: 160rpx;
  border-radius: 12rpx;
  background: #F5F0E8;
}

.item-info {
  flex: 1;
  margin-left: 20rpx;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.item-name {
  font-size: 28rpx;
  color: #3D2914;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.item-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.item-price {
  font-size: 32rpx;
  color: #C44536;
  font-weight: bold;
}

.item-actions {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.cart-btn {
  font-size: 22rpx;
  color: #C9A962;
  background: rgba(201, 169, 98, 0.1);
  padding: 12rpx 20rpx;
  border-radius: 24rpx;
  border: 1rpx solid rgba(201, 169, 98, 0.3);
}

.del-btn {
  padding: 10rpx;
}

/* 底部 */
.footer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: white;
  padding: 20rpx 30rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 -4rpx 16rpx rgba(0, 0, 0, 0.05);
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
}

.count {
  font-size: 26rpx;
  color: #9B8B7F;
}

.clear-btn {
  font-size: 26rpx;
  color: #C44536;
  background: transparent;
  border: 1rpx solid #C44536;
  padding: 16rpx 32rpx;
  border-radius: 32rpx;
}
</style>
