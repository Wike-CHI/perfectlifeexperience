<template>
  <view class="promo-detail-container">
    <!-- 头部信息 -->
    <view class="detail-header">
      <view class="header-content">
        <text class="promo-name">{{ promotion?.name || '' }}</text>
        <text class="promo-desc">{{ promotion?.description || '' }}</text>
        <view class="time-info">
          <text class="time-label">活动时间：</text>
          <text class="time-value">{{ formatFullTime(promotion?.startTime) }} - {{ formatFullTime(promotion?.endTime) }}</text>
        </view>
      </view>
    </view>

    <!-- 倒计时 -->
    <view v-if="isActive" class="countdown-section">
      <text class="countdown-label">距活动结束</text>
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

    <!-- 商品列表 -->
    <scroll-view class="product-scroll" scroll-y>
      <view class="section-title">
        <text class="title-text">活动商品</text>
        <text class="title-count">({{ products.length }}件)</text>
      </view>

      <view class="product-list">
        <view
          v-for="item in products"
          :key="item._id"
          class="product-card"
          @click="goToProduct(item.product)"
        >
          <!-- 商品图片 -->
          <view class="product-image-wrap">
            <image
              v-if="item.product?.images?.[0]"
              class="product-image"
              :src="item.product.images[0]"
              mode="aspectFill"
            />
            <view v-else class="product-image-placeholder">
              <text>暂无图片</text>
            </view>
            <!-- 折扣标签 -->
            <view v-if="item.discountPrice && item.product" class="discount-tag">
              <text class="discount-text">{{ calculateDiscount(item) }}折</text>
            </view>
          </view>

          <!-- 商品信息 -->
          <view class="product-info">
            <text class="product-name">{{ item.product?.name || '商品已下架' }}</text>
            <text class="product-brewery">{{ item.product?.brewery || '' }}</text>

            <view class="product-bottom">
              <view class="price-section">
                <view class="current-price">
                  <text class="price-symbol">¥</text>
                  <text class="price-value">{{ formatPrice(item.discountPrice || item.product?.price) }}</text>
                </view>
                <view v-if="item.product?.price && item.discountPrice" class="original-price-wrap">
                  <text class="original-price">¥{{ formatPrice(item.product.price) }}</text>
                </view>
              </view>
              <view class="add-cart" @click.stop="addToCart(item)">
                <text class="plus-icon">+</text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 空状态 -->
      <view v-if="!loading && products.length === 0" class="empty-state">
        <text class="empty-text">暂无活动商品</text>
      </view>
    </scroll-view>

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
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { getPromotionDetail } from '@/utils/api'
import ProductSkuPopup from '@/components/ProductSkuPopup.vue'

interface PromotionProduct {
  _id: string
  productId: string
  discountPrice: number
  stockLimit: number
  product?: any
}

interface Promotion {
  _id: string
  name: string
  description: string
  type: string
  status: string
  startTime: string | Date
  endTime: string | Date
}

const promotion = ref<Promotion | null>(null)
const products = ref<PromotionProduct[]>([])
const loading = ref(false)
const promotionId = ref('')

// 弹窗状态
const skuPopupVisible = ref(false)
const currentProduct = ref<any>(null)

// 倒计时
const countdown = ref({ hours: 0, minutes: 0, seconds: 0 })
let countdownTimer: number | null = null

const isActive = computed(() => {
  if (!promotion.value) return false
  const now = new Date().getTime()
  const start = new Date(promotion.value.startTime).getTime()
  const end = new Date(promotion.value.endTime).getTime()
  return now >= start && now <= end
})

onLoad((options) => {
  if (options?.id) {
    promotionId.value = options.id
    loadPromotionDetail()
  }
})

onMounted(() => {
  if (isActive.value) {
    startCountdown()
  }
})

onUnmounted(() => {
  if (countdownTimer) {
    clearInterval(countdownTimer)
  }
})

const loadPromotionDetail = async () => {
  if (!promotionId.value) return

  try {
    loading.value = true
    const data = await getPromotionDetail(promotionId.value)

    if (data) {
      promotion.value = data.promotion
      products.value = data.products || []
    }
  } catch (error) {
    console.error('加载活动详情失败:', error)
    uni.showToast({
      title: '加载失败',
      icon: 'none'
    })
  } finally {
    loading.value = false
  }
}

const startCountdown = () => {
  const updateCountdown = () => {
    if (!promotion.value) return

    const now = new Date().getTime()
    const end = new Date(promotion.value.endTime).getTime()
    const diff = end - now

    if (diff <= 0) {
      countdown.value = { hours: 0, minutes: 0, seconds: 0 }
      if (countdownTimer) {
        clearInterval(countdownTimer)
      }
      return
    }

    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((diff % (1000 * 60)) / 1000)

    countdown.value = { hours, minutes, seconds }
  }

  updateCountdown()
  countdownTimer = setInterval(updateCountdown, 1000) as unknown as number
}

const formatDigit = (n: number): string => {
  return n.toString().padStart(2, '0')
}

const formatFullTime = (date: string | Date | undefined): string => {
  if (!date) return ''
  const d = new Date(date)
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hour = String(d.getHours()).padStart(2, '0')
  const minute = String(d.getMinutes()).padStart(2, '0')
  return `${month}-${day} ${hour}:${minute}`
}

const formatPrice = (price: number | undefined): string => {
  if (!price) return '0'
  return (price / 100).toFixed(2)
}

const calculateDiscount = (item: PromotionProduct): string => {
  if (!item.product?.price || !item.discountPrice) return '0'
  return Math.round((item.discountPrice / item.product.price) * 10).toFixed(1)
}

const goToProduct = (product: any) => {
  if (!product?._id) return
  uni.navigateTo({
    url: `/pages/product/detail?id=${product._id}`
  })
}

const addToCart = (item: PromotionProduct) => {
  if (!item.product) return
  currentProduct.value = item.product
  skuPopupVisible.value = true
}

const onAddToCartSuccess = () => {
  uni.showToast({
    title: '已加入购物车',
    icon: 'success'
  })
}
</script>

<style scoped>
.promo-detail-container {
  min-height: 100vh;
  background: #0D0D0D;
  padding-bottom: 120rpx;
}

.detail-header {
  background: linear-gradient(145deg, #2D2420 0%, #1F1814 100%);
  padding: 32rpx;
  border-bottom: 1rpx solid rgba(200, 164, 100, 0.1);
}

.header-content {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.promo-name {
  font-size: 36rpx;
  font-weight: 700;
  color: #C8A464;
}

.promo-desc {
  font-size: 26rpx;
  color: rgba(245, 245, 240, 0.7);
}

.time-info {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin-top: 8rpx;
}

.time-label {
  font-size: 22rpx;
  color: rgba(245, 245, 240, 0.4);
}

.time-value {
  font-size: 22rpx;
  color: #C8A464;
}

.countdown-section {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16rpx;
  padding: 24rpx;
  background: rgba(200, 164, 100, 0.08);
}

.countdown-label {
  font-size: 24rpx;
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
  padding: 8rpx 16rpx;
  min-width: 48rpx;
  text-align: center;
}

.digit {
  font-size: 28rpx;
  font-weight: 700;
  color: #C8A464;
  font-family: monospace;
}

.digit-separator {
  font-size: 28rpx;
  color: rgba(200, 164, 100, 0.5);
  font-weight: 600;
}

.product-scroll {
  height: calc(100vh - 300rpx);
  padding: 24rpx;
}

.section-title {
  display: flex;
  align-items: baseline;
  gap: 12rpx;
  margin-bottom: 20rpx;
}

.title-text {
  font-size: 30rpx;
  font-weight: 600;
  color: #F5F5F0;
}

.title-count {
  font-size: 24rpx;
  color: rgba(245, 245, 240, 0.4);
}

.product-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.product-card {
  display: flex;
  background: #1A1A1A;
  border-radius: 16rpx;
  overflow: hidden;
  border: 1rpx solid rgba(200, 164, 100, 0.08);
}

.product-image-wrap {
  position: relative;
  width: 200rpx;
  height: 200rpx;
  flex-shrink: 0;
}

.product-image {
  width: 100%;
  height: 100%;
}

.product-image-placeholder {
  width: 100%;
  height: 100%;
  background: #2D2420;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22rpx;
  color: rgba(245, 245, 240, 0.3);
}

.discount-tag {
  position: absolute;
  top: 8rpx;
  left: 8rpx;
  background: linear-gradient(145deg, #E85D4E 0%, #B54A3F 100%);
  border-radius: 6rpx;
  padding: 4rpx 10rpx;
}

.discount-text {
  font-size: 20rpx;
  font-weight: 700;
  color: #fff;
}

.product-info {
  flex: 1;
  padding: 20rpx;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.product-name {
  font-size: 28rpx;
  font-weight: 600;
  color: #F5F5F0;
  margin-bottom: 8rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.product-brewery {
  font-size: 22rpx;
  color: rgba(245, 245, 240, 0.4);
  margin-bottom: 12rpx;
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
  color: rgba(245, 245, 240, 0.3);
  text-decoration: line-through;
}

.add-cart {
  width: 56rpx;
  height: 56rpx;
  background: linear-gradient(145deg, #C8A464 0%, #A88B4A 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.plus-icon {
  font-size: 32rpx;
  color: #0D0D0D;
  font-weight: 700;
}

.empty-state {
  display: flex;
  justify-content: center;
  padding: 80rpx;
}

.empty-text {
  font-size: 26rpx;
  color: rgba(245, 245, 240, 0.4);
}
</style>
