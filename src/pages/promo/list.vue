<template>
  <view class="promo-list-container">
    <!-- 顶部Banner -->
    <view class="header-banner">
      <view class="banner-content">
        <text class="banner-title">优惠活动</text>
        <text class="banner-subtitle">精选好物，限时特惠</text>
      </view>
      <view class="banner-decoration"></view>
    </view>

    <!-- 活动列表 -->
    <scroll-view class="promo-scroll" scroll-y @scrolltolower="loadMore">
      <view class="promo-list">
        <view
          v-for="promo in promotions"
          :key="promo._id"
          class="promo-card"
          @click="goToDetail(promo)"
        >
          <!-- 活动图片 -->
          <view class="promo-image-wrap">
            <image
              v-if="promo.image"
              class="promo-image"
              :src="promo.image"
              mode="aspectFill"
            />
            <view v-else class="promo-image-placeholder">
              <text class="placeholder-icon">🎉</text>
            </view>
            <!-- 状态标签 -->
            <view class="promo-status" :class="getStatusClass(promo)">
              <text class="status-text">{{ getStatusText(promo) }}</text>
            </view>
          </view>

          <!-- 活动信息 -->
          <view class="promo-info">
            <text class="promo-name">{{ promo.name }}</text>
            <text class="promo-desc">{{ promo.description || '暂无描述' }}</text>

            <!-- 时间 -->
            <view class="promo-time">
              <text class="time-label">活动时间：</text>
              <text class="time-value">{{ formatTime(promo.startTime) }} - {{ formatTime(promo.endTime) }}</text>
            </view>

            <!-- 类型标签 -->
            <view class="promo-tags">
              <view class="tag" :class="promo.type">{{ getTypeText(promo.type) }}</view>
            </view>
          </view>

          <!-- 右侧箭头 -->
          <view class="promo-arrow">
            <text class="arrow-icon">›</text>
          </view>
        </view>
      </view>

      <!-- 空状态 -->
      <view v-if="!loading && promotions.length === 0" class="empty-state">
        <text class="empty-icon">🎁</text>
        <text class="empty-text">暂无进行中的活动</text>
        <text class="empty-desc">敬请期待更多优惠活动</text>
      </view>

      <!-- 加载状态 -->
      <view v-if="loading" class="loading-state">
        <text class="loading-text">加载中...</text>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getActivePromotions } from '@/utils/api'

interface Promotion {
  _id: string
  name: string
  description?: string
  image?: string
  type: string
  status: string
  isActive: boolean
  startTime: string | Date
  endTime: string | Date
}

const promotions = ref<Promotion[]>([])
const loading = ref(false)
const hasMore = ref(true)

onMounted(() => {
  loadPromotions()
})

const loadPromotions = async () => {
  if (loading.value) return

  try {
    loading.value = true
    const data = await getActivePromotions()
    promotions.value = data || []
    hasMore.value = false
  } catch (error) {
    console.error('加载活动失败:', error)
    uni.showToast({
      title: '加载失败',
      icon: 'none'
    })
  } finally {
    loading.value = false
  }
}

const loadMore = () => {
  // 暂时不做分页
}

const goToDetail = (promo: Promotion) => {
  uni.navigateTo({
    url: `/pages/promo/detail?id=${promo._id}`
  })
}

const getStatusClass = (promo: Promotion): string => {
  const now = new Date().getTime()
  const start = new Date(promo.startTime).getTime()
  const end = new Date(promo.endTime).getTime()

  if (now < start) return 'pending'
  if (now >= start && now <= end) return 'active'
  return 'ended'
}

const getStatusText = (promo: Promotion): string => {
  const status = getStatusClass(promo)
  const map: Record<string, string> = {
    pending: '即将开始',
    active: '进行中',
    ended: '已结束'
  }
  return map[status] || ''
}

const getTypeText = (type: string): string => {
  const map: Record<string, string> = {
    discount: '折扣优惠',
    flash_sale: '限时抢购',
    bundle: '组合优惠',
    new: '新品尝鲜'
  }
  return map[type] || '优惠活动'
}

const formatTime = (date: string | Date): string => {
  if (!date) return ''
  const d = new Date(date)
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${month}-${day}`
}
</script>

<style scoped>
.promo-list-container {
  min-height: 100vh;
  background: #0D0D0D;
}

.header-banner {
  position: relative;
  background: linear-gradient(145deg, #2D2420 0%, #1F1814 100%);
  padding: 40rpx 32rpx;
  overflow: hidden;
}

.banner-content {
  position: relative;
  z-index: 1;
}

.banner-title {
  display: block;
  font-size: 44rpx;
  font-weight: 700;
  color: #C8A464;
  margin-bottom: 8rpx;
}

.banner-subtitle {
  font-size: 26rpx;
  color: rgba(245, 245, 240, 0.6);
}

.banner-decoration {
  position: absolute;
  right: -40rpx;
  top: 50%;
  transform: translateY(-50%);
  width: 200rpx;
  height: 200rpx;
  background: radial-gradient(circle, rgba(200, 164, 100, 0.15) 0%, transparent 70%);
}

.promo-scroll {
  height: calc(100vh - 200rpx);
  padding: 24rpx;
}

.promo-list {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.promo-card {
  position: relative;
  background: #1A1A1A;
  border-radius: 16rpx;
  overflow: hidden;
  border: 1rpx solid rgba(200, 164, 100, 0.1);
  display: flex;
}

.promo-image-wrap {
  position: relative;
  width: 240rpx;
  height: 180rpx;
  flex-shrink: 0;
}

.promo-image {
  width: 100%;
  height: 100%;
}

.promo-image-placeholder {
  width: 100%;
  height: 100%;
  background: linear-gradient(145deg, #2D2420 0%, #1F1814 100%);
  display: flex;
  align-items: center;
  justify-content: center;
}

.placeholder-icon {
  font-size: 60rpx;
}

.promo-status {
  position: absolute;
  top: 12rpx;
  left: 12rpx;
  padding: 6rpx 16rpx;
  border-radius: 8rpx;
  font-size: 20rpx;
}

.promo-status.active {
  background: linear-gradient(145deg, #06D6A0 0%, #05B88A 100%);
}

.promo-status.pending {
  background: linear-gradient(145deg, #FFB085 0%, #E89A70 100%);
}

.promo-status.ended {
  background: rgba(155, 139, 127, 0.8);
}

.status-text {
  color: #fff;
  font-weight: 600;
}

.promo-info {
  flex: 1;
  padding: 20rpx;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.promo-name {
  font-size: 30rpx;
  font-weight: 600;
  color: #F5F5F0;
  margin-bottom: 8rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.promo-desc {
  font-size: 24rpx;
  color: rgba(245, 245, 240, 0.5);
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  margin-bottom: 12rpx;
}

.promo-time {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin-bottom: 8rpx;
}

.time-label {
  font-size: 20rpx;
  color: rgba(245, 245, 240, 0.4);
}

.time-value {
  font-size: 20rpx;
  color: #C8A464;
}

.promo-tags {
  display: flex;
  gap: 8rpx;
}

.tag {
  padding: 4rpx 12rpx;
  border-radius: 6rpx;
  font-size: 20rpx;
  background: rgba(200, 164, 100, 0.15);
  color: #C8A464;
}

.tag.flash_sale {
  background: rgba(232, 93, 78, 0.15);
  color: #E85D4E;
}

.tag.bundle {
  background: rgba(122, 154, 142, 0.15);
  color: #7A9A8E;
}

.tag.new {
  background: rgba(6, 214, 160, 0.15);
  color: #06D6A0;
}

.promo-arrow {
  position: absolute;
  right: 20rpx;
  top: 50%;
  transform: translateY(-50%);
}

.arrow-icon {
  font-size: 40rpx;
  color: rgba(245, 245, 240, 0.3);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 120rpx 40rpx;
}

.empty-icon {
  font-size: 80rpx;
  margin-bottom: 24rpx;
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

.loading-state {
  padding: 40rpx;
  text-align: center;
}

.loading-text {
  font-size: 24rpx;
  color: rgba(245, 245, 240, 0.4);
}
</style>
