<template>
  <view class="banner-swiper-wrapper">
    <swiper
      class="banner-swiper"
      :autoplay="autoplay"
      :interval="interval"
      :circular="true"
      :indicator-dots="true"
      indicator-color="rgba(201, 169, 98, 0.3)"
      indicator-active-color="#C9A962"
      @change="handleSwiperChange"
    >
      <swiper-item
        v-for="(banner, index) in banners"
        :key="banner._id || index"
        class="swiper-item"
      >
        <view
          class="banner-container"
          @click="handleBannerClick(banner)"
        >
          <!-- Banner 图片 -->
          <image
            class="banner-image"
            :src="getImageUrl(banner, index)"
            mode="aspectFill"
            :lazy-load="true"
            @error="handleImageError(banner, index)"
            @load="handleImageLoad(index)"
          />

          <!-- 图片加载占位符 -->
          <view v-if="!loadedImages[index]" class="image-placeholder">
            <view class="placeholder-spinner"></view>
            <text class="placeholder-text">加载中...</text>
          </view>

          <!-- Banner 信息覆盖层 -->
          <view v-if="banner.title || banner.subtitle" class="banner-overlay">
            <text v-if="banner.title" class="banner-title">{{ banner.title }}</text>
            <text v-if="banner.subtitle" class="banner-subtitle">{{ banner.subtitle }}</text>
          </view>
        </view>
      </swiper-item>
    </swiper>

    <!-- 空状态 -->
    <view v-if="banners.length === 0" class="empty-state">
      <text class="empty-text">暂无轮播图</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'

/**
 * BannerSwiper 组件
 * 独立的 Banner 轮播组件，支持图片懒加载、点击跳转、fileID 自动转换
 */

interface Banner {
  _id?: string
  image: string
  title?: string
  subtitle?: string
  link?: string
  sort?: number
  isActive?: boolean
}

interface Props {
  banners: Banner[]
  autoplay?: boolean
  interval?: number
}

interface Emits {
  (e: 'click', banner: Banner): void
  (e: 'change', event: any): void
}

const props = withDefaults(defineProps<Props>(), {
  banners: () => [],
  autoplay: true,
  interval: 5000
})

const emit = defineEmits<Emits>()

// 图片加载状态
const loadedImages = ref<Record<number, boolean>>({})
// 图片 URL 缓存（fileID 转换后的 URL）
const imageUrls = ref<Record<number, string>>({})

/**
 * 判断是否为 fileID 格式
 */
const isCloudFileId = (url: string): boolean => {
  return url && url.startsWith('cloud://')
}

/**
 * 获取图片的显示 URL
 * 如果是 fileID，返回转换后的临时 URL；否则返回原始 URL
 */
const getImageUrl = (banner: Banner, index: number): string => {
  // 如果已经缓存了转换后的 URL，直接返回
  if (imageUrls.value[index]) {
    return imageUrls.value[index]
  }

  // 如果不是 fileID，直接返回
  if (!isCloudFileId(banner.image)) {
    return banner.image
  }

  // 如果是 fileID，尝试异步转换
  if (typeof wx !== 'undefined' && wx.cloud) {
    wx.cloud.getTempFileURL({
      fileList: [banner.image]
    }).then((res: any) => {
      if (res.fileList && res.fileList[0] && res.fileList[0].tempFileURL) {
        imageUrls.value[index] = res.fileList[0].tempFileURL
        console.log('✅ fileID 转换成功:', banner.image, '→', res.fileList[0].tempFileURL)
      }
    }).catch((err: any) => {
      console.error('❌ fileID 转换失败:', err)
    })
  }

  // 转换中，返回原始 fileID（虽然可能无法显示，但至少不会报错）
  return banner.image
}

// 组件挂载时初始化
onMounted(() => {
  console.log('BannerSwiper 组件已挂载', { bannerCount: props.banners.length })

  // 预先转换所有 fileID
  props.banners.forEach((banner, index) => {
    if (isCloudFileId(banner.image)) {
      console.log(`🔄 开始转换 Banner ${index} 的 fileID`)
      getImageUrl(banner, index)
    }
  })
})

/**
 * 处理 Swiper 切换事件
 */
const handleSwiperChange = (event: any) => {
  emit('change', event)
}

/**
 * 处理 Banner 点击事件
 */
const handleBannerClick = (banner: Banner) => {
  console.log('Banner clicked:', banner)

  if (!banner.link) {
    console.log('Banner 无跳转链接')
    return
  }

  emit('click', banner)

  // 处理跳转
  if (banner.link.startsWith('/pages')) {
    // 内部页面跳转
    uni.navigateTo({
      url: banner.link,
      fail: () => {
        console.error('页面跳转失败:', banner.link)
        uni.showToast({
          title: '页面跳转失败',
          icon: 'none'
        })
      }
    })
  } else if (banner.link.startsWith('http')) {
    // 外部链接
    uni.showModal({
      title: '提示',
      content: '即将打开外部链接',
      success: (res) => {
        if (res.confirm) {
          // 复制链接到剪贴板
          uni.setClipboardData({
            data: banner.link,
            success: () => {
              uni.showToast({
                title: '链接已复制',
                icon: 'success'
              })
            }
          })
        }
      }
    })
  }
}

/**
 * 处理图片加载错误
 */
const handleImageError = (banner: Banner, index: number) => {
  console.error('Banner 图片加载失败:', banner.image)
  loadedImages.value[index] = true // 标记为已加载，避免无限显示占位符

  uni.showToast({
    title: '图片加载失败',
    icon: 'none',
    duration: 2000
  })
}

/**
 * 处理图片加载完成
 */
const handleImageLoad = (index: number) => {
  console.log(`Banner 图片 ${index} 加载完成`)
  loadedImages.value[index] = true
}
</script>

<style scoped>
.banner-swiper-wrapper {
  width: 100%;
  position: relative;
  background: #0D0D0D;
}

.banner-swiper {
  width: 100%;
  height: 360rpx;
}

.swiper-item {
  width: 100%;
  height: 100%;
}

.banner-container {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.banner-image {
  width: 100%;
  height: 100%;
  display: block;
}

/* 图片加载占位符 */
.image-placeholder {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(201, 169, 98, 0.1);
  gap: 16rpx;
}

.placeholder-spinner {
  width: 60rpx;
  height: 60rpx;
  border: 4rpx solid rgba(201, 169, 98, 0.3);
  border-top-color: #C9A962;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.placeholder-text {
  font-size: 24rpx;
  color: rgba(201, 169, 98, 0.6);
}

/* Banner 信息覆盖层 */
.banner-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 32rpx 24rpx;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.7) 0%, transparent 100%);
}

.banner-title {
  display: block;
  font-size: 32rpx;
  font-weight: 700;
  color: #F5F5F0;
  margin-bottom: 8rpx;
  text-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.5);
}

.banner-subtitle {
  display: block;
  font-size: 24rpx;
  color: rgba(245, 245, 240, 0.8);
  text-shadow: 0 2rpx 4rpx rgba(0, 0, 0, 0.5);
}

/* 空状态 */
.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 360rpx;
  background: rgba(255, 255, 255, 0.03);
}

.empty-text {
  font-size: 26rpx;
  color: rgba(245, 245, 240, 0.4);
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
