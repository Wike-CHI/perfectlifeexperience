<template>
  <view class="page-skeleton">
    <!-- 导航栏骨架 -->
    <view class="skeleton-header">
      <view class="skeleton-brand"></view>
      <view class="skeleton-search"></view>
    </view>

    <!-- 轮播图骨架 -->
    <view class="skeleton-banner">
      <view class="banner-placeholder"></view>
    </view>

    <!-- 服务入口骨架 -->
    <view class="skeleton-services">
      <view class="service-card-skeleton">
        <view class="service-icon-skeleton"></view>
        <view class="service-text-skeleton"></view>
      </view>
      <view class="service-card-skeleton">
        <view class="service-icon-skeleton"></view>
        <view class="service-text-skeleton"></view>
      </view>
    </view>

    <!-- 会员功能区骨架 -->
    <view class="skeleton-members">
      <view class="member-card-skeleton">
        <view class="member-icon-skeleton"></view>
        <view class="member-text-skeleton"></view>
      </view>
      <view class="member-card-skeleton">
        <view class="member-icon-skeleton"></view>
        <view class="member-text-skeleton"></view>
      </view>
    </view>

    <!-- 商品列表骨架 -->
    <view class="skeleton-products">
      <view class="section-title-skeleton"></view>
      <view class="products-grid">
        <view
          v-for="n in 6"
          :key="n"
          class="product-card-skeleton"
        >
          <view class="product-image-skeleton"></view>
          <view class="product-info-skeleton">
            <view class="product-title-skeleton"></view>
            <view class="product-desc-skeleton"></view>
            <view class="product-price-skeleton"></view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
interface Props {
  type?: 'home' | 'category' | 'product';
}

const props = withDefaults(defineProps<Props>(), {
  type: 'home'
});
</script>

<style scoped>
.page-skeleton {
  width: 100%;
  min-height: 100vh;
  background-color: #f5f5f5;
  padding-bottom: 40rpx;
}

/* 导航栏骨架 */
.skeleton-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 30rpx;
  background-color: #fff;
  margin-bottom: 20rpx;
}

.skeleton-brand {
  width: 200rpx;
  height: 60rpx;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 8rpx;
}

.skeleton-search {
  width: 400rpx;
  height: 60rpx;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 30rpx;
  animation-delay: 0.2s;
}

/* 轮播图骨架 */
.skeleton-banner {
  width: 100%;
  height: 360rpx;
  padding: 0 30rpx;
  margin-bottom: 30rpx;
}

.banner-placeholder {
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 16rpx;
  animation-delay: 0.4s;
}

/* 服务入口骨架 */
.skeleton-services {
  display: flex;
  gap: 20rpx;
  padding: 0 30rpx;
  margin-bottom: 30rpx;
}

.service-card-skeleton {
  flex: 1;
  height: 200rpx;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 16rpx;
  padding: 30rpx;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  animation-delay: 0.6s;
}

.service-icon-skeleton {
  width: 80rpx;
  height: 80rpx;
  background: rgba(255, 255, 255, 0.5);
  border-radius: 50%;
  margin-bottom: 20rpx;
}

.service-text-skeleton {
  width: 120rpx;
  height: 36rpx;
  background: rgba(255, 255, 255, 0.5);
  border-radius: 4rpx;
}

/* 会员功能区骨架 */
.skeleton-members {
  display: flex;
  gap: 20rpx;
  padding: 0 30rpx;
  margin-bottom: 40rpx;
}

.member-card-skeleton {
  flex: 1;
  height: 180rpx;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 16rpx;
  padding: 30rpx;
  display: flex;
  align-items: center;
  animation-delay: 0.8s;
}

.member-icon-skeleton {
  width: 80rpx;
  height: 80rpx;
  background: rgba(255, 255, 255, 0.5);
  border-radius: 50%;
  margin-right: 20rpx;
}

.member-text-skeleton {
  flex: 1;
  height: 36rpx;
  background: rgba(255, 255, 255, 0.5);
  border-radius: 4rpx;
}

/* 商品列表骨架 */
.skeleton-products {
  padding: 0 30rpx;
}

.section-title-skeleton {
  width: 200rpx;
  height: 48rpx;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 8rpx;
  margin-bottom: 30rpx;
  animation-delay: 1s;
}

.products-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20rpx;
}

.product-card-skeleton {
  height: 400rpx;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 16rpx;
  padding: 20rpx;
  display: flex;
  flex-direction: column;
  animation-delay: 1.2s;
}

.product-image-skeleton {
  width: 100%;
  height: 240rpx;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 8rpx;
  margin-bottom: 20rpx;
}

.product-info-skeleton {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.product-title-skeleton {
  width: 80%;
  height: 32rpx;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 4rpx;
}

.product-desc-skeleton {
  width: 60%;
  height: 24rpx;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 4rpx;
}

.product-price-skeleton {
  width: 100rpx;
  height: 36rpx;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 4rpx;
  margin-top: auto;
}

@keyframes shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}
</style>
