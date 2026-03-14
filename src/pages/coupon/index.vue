<template>
  <view class="container">
    <!-- 顶部 Banner -->
    <view class="coupon-banner">
      <view class="banner-content">
        <text class="banner-title">优惠券中心</text>
        <text class="banner-subtitle">精酿啤酒节 限时特惠</text>
      </view>
      <view class="banner-decoration">
        <view class="circle circle-1"></view>
        <view class="circle circle-2"></view>
        <view class="circle circle-3"></view>
      </view>
    </view>

    <!-- 我的优惠券入口 -->
    <view class="my-coupon-entry" @click="goToMyCoupons">
      <view class="entry-left">
        <svg class="entry-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M20 6H4C2.89543 6 2 6.89543 2 8V16C2 17.1046 2.89543 18 4 18H20C21.1046 18 22 17.1046 22 16V8C22 6.89543 21.1046 6 20 6Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
          <path d="M13 12L15 14L13 12Z" fill="currentColor"/>
          <path d="M2 10H22" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          <circle cx="8" cy="14" r="1.5" fill="currentColor"/>
          <circle cx="16" cy="14" r="1.5" fill="currentColor"/>
        </svg>
        <view class="entry-text">
          <text class="entry-title">我的优惠券</text>
          <text class="entry-desc">{{ unusedCount }}张未使用</text>
        </view>
      </view>
      <view class="entry-right">
        <text class="entry-action">查看全部</text>
        <svg class="arrow-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M9 18L15 12L9 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </view>
    </view>

    <!-- 可领取优惠券列表 -->
    <view class="coupon-section">
      <view class="section-header">
        <text class="section-title">领券专区</text>
        <text class="section-subtitle">限时限量 先到先得</text>
      </view>
      
      <view class="coupon-list">
        <view 
          class="coupon-card" 
          v-for="(template, index) in templates" 
          :key="template._id"
          :class="{ 'disabled': isTemplateDisabled(template) }"
        >
          <!-- 左侧金额区 -->
          <view class="coupon-left">
            <view class="coupon-value">
              <text class="value-symbol" v-if="template.type !== 'discount'">¥</text>
              <text class="value-num">{{ formatValue(template) }}</text>
              <text class="value-unit" v-if="template.type === 'discount'">折</text>
            </view>
            <text class="coupon-type">{{ getTypeText(template.type) }}</text>
          </view>
          
          <!-- 中间分隔线 -->
          <view class="coupon-divider">
            <view class="semicircle top"></view>
            <view class="dashed-line"></view>
            <view class="semicircle bottom"></view>
          </view>
          
          <!-- 右侧信息区 -->
          <view class="coupon-right">
            <view class="coupon-info">
              <text class="coupon-name">{{ template.name }}</text>
              <text class="coupon-desc">{{ template.description }}</text>
              <text class="coupon-valid">有效期：领取后{{ template.validDays }}天</text>
            </view>
            <view class="coupon-action">
              <view 
                class="btn-receive" 
                :class="{ 'received': isReceived(template._id!), 'disabled': isTemplateDisabled(template) }"
                @click="receiveCoupon(template._id!)"
              >
                <text class="btn-text">{{ getReceiveBtnText(template) }}</text>
              </view>
              <text class="receive-progress">已领 {{ template.receivedCount }}/{{ template.totalCount }}</text>
            </view>
          </view>
        </view>
      </view>
      
      <!-- 空状态 -->
      <view class="empty-state" v-if="templates.length === 0 && !loading">
        <svg class="empty-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M20 6H4C2.89543 6 2 6.89543 2 8V16C2 17.1046 2.89543 18 4 18H20C21.1046 18 22 17.1046 22 16V8C22 6.89543 21.1046 6 20 6Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
          <path d="M2 10H22" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          <path d="M9 15L9.01 15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          <path d="M15 15L15.01 15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
        <text class="empty-text">暂无可用优惠券</text>
        <text class="empty-desc">敬请期待更多优惠活动</text>
      </view>
    </view>

    <!-- 使用说明 -->
    <view class="coupon-tips">
      <view class="tips-header">
        <svg class="tips-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.5"/>
          <path d="M12 16V12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          <path d="M12 8H12.01" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
        <text class="tips-title">使用说明</text>
      </view>
      <view class="tips-list">
        <view class="tip-item">
          <svg class="tip-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.5"/>
            <path d="M12 8V12L15 15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <text class="tip-text">优惠券领取后请在有效期内使用，过期自动失效</text>
        </view>
        <view class="tip-item">
          <svg class="tip-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M9 12L11 14L15 10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <text class="tip-text">每张优惠券仅限使用一次，不可叠加使用</text>
        </view>
        <view class="tip-item">
          <svg class="tip-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 8V12L15 15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.5"/>
          </svg>
          <text class="tip-text">部分特价商品可能不参与优惠券活动</text>
        </view>
        <view class="tip-item">
          <svg class="tip-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M22 16.92V19C22 19.5304 21.7893 20.0391 21.4142 20.4142C21.0391 20.7893 20.5304 21 20 21H4C3.46957 21 2.96086 20.7893 2.58579 20.4142C2.21071 20.0391 2 19.5304 2 19V5C2 4.46957 2.21071 3.96086 2.58579 3.58579C2.96086 3.21071 3.46957 3 4 3H12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M16 2V8H22" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M22 2L16 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <text class="tip-text">如有疑问请联系客服：400-888-8888</text>
        </view>
      </view>
    </view>

    <!-- 安全区域 -->
    <view class="safe-area"></view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { getCouponTemplates, receiveCoupon as receiveCouponApi, getMyCoupons, formatPrice } from '@/utils/api';

// 类型定义（内联，避免分包导入问题）
interface CouponTemplate {
  _id: string
  name: string
  type: 'cash' | 'discount'
  value: number
  minAmount?: number
  description?: string
  startTime: Date
  endTime: Date
  totalCount: number
  receivedCount: number
  status: 'active' | 'inactive'
}

// 数据
const templates = ref<CouponTemplate[]>([]);
const myCoupons = ref<any[]>([]);
const loading = ref(false);
const unusedCount = ref(0);

// 加载优惠券模板
const loadTemplates = async () => {
  try {
    loading.value = true;
    const res = await getCouponTemplates();
    templates.value = res;
  } catch (error) {
    console.error('加载优惠券模板失败:', error);
    uni.showToast({
      title: '加载失败',
      icon: 'none'
    });
  } finally {
    loading.value = false;
  }
};

// 加载我的优惠券
const loadMyCoupons = async () => {
  try {
    const res = await getMyCoupons();
    myCoupons.value = res;
    unusedCount.value = res.filter((c: any) => c.status === 'unused').length;
  } catch (error) {
    console.error('加载我的优惠券失败:', error);
  }
};

// 领取优惠券
const receiveCoupon = async (templateId: string) => {
  if (isReceived(templateId)) {
    uni.showToast({
      title: '已领取',
      icon: 'none'
    });
    return;
  }
  
  const template = templates.value.find(t => t._id === templateId);
  if (template && isTemplateDisabled(template)) {
    uni.showToast({
      title: '该优惠券已领完',
      icon: 'none'
    });
    return;
  }
  
  try {
    uni.showLoading({ title: '领取中...' });
    await receiveCouponApi(templateId);
    uni.hideLoading();
    
    uni.showToast({
      title: '领取成功',
      icon: 'success'
    });
    
    // 刷新数据
    await loadTemplates();
    await loadMyCoupons();
  } catch (error: any) {
    uni.hideLoading();
    uni.showToast({
      title: error.message || '领取失败',
      icon: 'none'
    });
  }
};

// 判断是否已领取
const isReceived = (templateId: string) => {
  return myCoupons.value.some(c => c.templateId === templateId);
};

// 判断模板是否不可用
const isTemplateDisabled = (template: CouponTemplate) => {
  return template.receivedCount >= template.totalCount;
};

// 获取领取按钮文字
const getReceiveBtnText = (template: CouponTemplate) => {
  if (isReceived(template._id!)) return '已领取';
  if (template.receivedCount >= template.totalCount) return '已领完';
  return '立即领取';
};

// 格式化优惠券面值
const formatValue = (template: CouponTemplate) => {
  if (template.type === 'discount') {
    return (template.value / 10).toFixed(1);
  }
  return formatPrice(template.value);
};

// 获取类型文字
const getTypeText = (type: string) => {
  const map: Record<string, string> = {
    'amount': '满减券',
    'discount': '折扣券',
    'no_threshold': '无门槛'
  };
  return map[type] || '优惠券';
};

// 跳转到我的优惠券
const goToMyCoupons = () => {
  uni.navigateTo({
    url: '/pages/coupon/mine'
  });
};

// 生命周期
onShow(() => {
  loadTemplates();
  loadMyCoupons();
});
</script>

<style scoped>
.container {
  min-height: 100vh;
  background-color: #FDF8F3;
  padding-bottom: 40rpx;
}

/* 顶部 Banner */
.coupon-banner {
  position: relative;
  height: 280rpx;
  background: linear-gradient(135deg, #D4A574 0%, #C9A962 50%, #B8956A 100%);
  padding: 60rpx 40rpx 40rpx;
  overflow: hidden;
}

.banner-content {
  position: relative;
  z-index: 1;
}

.banner-title {
  font-size: 48rpx;
  font-weight: bold;
  color: #FFFFFF;
  display: block;
  margin-bottom: 16rpx;
}

.banner-subtitle {
  font-size: 28rpx;
  color: rgba(255, 255, 255, 0.9);
}

.banner-decoration {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
}

.circle {
  position: absolute;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
}

.circle-1 {
  width: 300rpx;
  height: 300rpx;
  top: -100rpx;
  right: -80rpx;
}

.circle-2 {
  width: 200rpx;
  height: 200rpx;
  bottom: -60rpx;
  left: -60rpx;
}

.circle-3 {
  width: 150rpx;
  height: 150rpx;
  top: 40rpx;
  right: 200rpx;
  background: rgba(255, 255, 255, 0.05);
}

/* 我的优惠券入口 */
.my-coupon-entry {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #FFFFFF;
  margin: -40rpx 30rpx 30rpx;
  padding: 30rpx;
  border-radius: 20rpx;
  box-shadow: 0 8rpx 30rpx rgba(61, 41, 20, 0.1);
  position: relative;
  z-index: 2;
}

.entry-left {
  display: flex;
  align-items: center;
}

.entry-icon {
  width: 48rpx;
  height: 48rpx;
  color: #D4A574;
  margin-right: 20rpx;
}

.entry-text {
  display: flex;
  flex-direction: column;
}

.entry-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #3D2914;
  margin-bottom: 8rpx;
}

.entry-desc {
  font-size: 26rpx;
  color: #9B8B7F;
}

.entry-right {
  display: flex;
  align-items: center;
}

.entry-action {
  font-size: 26rpx;
  color: #D4A574;
  margin-right: 8rpx;
}

.arrow-icon {
  width: 32rpx;
  height: 32rpx;
  color: #D4A574;
}

/* 优惠券列表区域 */
.coupon-section {
  padding: 0 30rpx;
}

.section-header {
  display: flex;
  align-items: baseline;
  margin-bottom: 30rpx;
}

.section-title {
  font-size: 36rpx;
  font-weight: 600;
  color: #3D2914;
  margin-right: 16rpx;
}

.section-subtitle {
  font-size: 26rpx;
  color: #9B8B7F;
}

.coupon-list {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

/* 优惠券卡片 */
.coupon-card {
  display: flex;
  background: #FFFFFF;
  border-radius: 20rpx;
  overflow: hidden;
  box-shadow: 0 4rpx 20rpx rgba(61, 41, 20, 0.06);
}

.coupon-card.disabled {
  opacity: 0.7;
}

.coupon-left {
  width: 200rpx;
  background: linear-gradient(135deg, #D4A574 0%, #C9A962 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 30rpx 20rpx;
}

.coupon-value {
  display: flex;
  align-items: baseline;
  color: #FFFFFF;
}

.value-symbol {
  font-size: 32rpx;
  margin-right: 4rpx;
}

.value-num {
  font-size: 56rpx;
  font-weight: bold;
}

.value-unit {
  font-size: 28rpx;
  margin-left: 4rpx;
}

.coupon-type {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.9);
  margin-top: 12rpx;
  padding: 6rpx 16rpx;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 20rpx;
}

/* 分隔线 */
.coupon-divider {
  width: 2rpx;
  background: #F5F0E8;
  position: relative;
}

.semicircle {
  position: absolute;
  width: 20rpx;
  height: 20rpx;
  background: #FDF8F3;
  border-radius: 50%;
  left: 50%;
  transform: translateX(-50%);
}

.semicircle.top {
  top: -10rpx;
}

.semicircle.bottom {
  bottom: -10rpx;
}

.dashed-line {
  position: absolute;
  top: 20rpx;
  bottom: 20rpx;
  left: 50%;
  border-left: 2rpx dashed #E5E0D8;
  transform: translateX(-50%);
}

/* 右侧信息区 */
.coupon-right {
  flex: 1;
  display: flex;
  padding: 24rpx;
}

.coupon-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.coupon-name {
  font-size: 30rpx;
  font-weight: 600;
  color: #3D2914;
  margin-bottom: 12rpx;
}

.coupon-desc {
  font-size: 24rpx;
  color: #6B5B4F;
  margin-bottom: 12rpx;
  line-height: 1.4;
}

.coupon-valid {
  font-size: 22rpx;
  color: #9B8B7F;
}

.coupon-action {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  justify-content: space-between;
  margin-left: 20rpx;
}

.btn-receive {
  padding: 16rpx 32rpx;
  background: linear-gradient(135deg, #D4A574 0%, #C9A962 100%);
  border-radius: 30rpx;
}

.btn-receive.received {
  background: #E5E0D8;
}

.btn-receive.disabled {
  background: #CCCCCC;
}

.btn-text {
  font-size: 26rpx;
  color: #FFFFFF;
  font-weight: 500;
}

.receive-progress {
  font-size: 20rpx;
  color: #9B8B7F;
  margin-top: 12rpx;
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 100rpx 0;
}

.empty-icon {
  width: 120rpx;
  height: 120rpx;
  color: #D4A574;
  opacity: 0.4;
  margin-bottom: 20rpx;
}

.empty-text {
  font-size: 30rpx;
  color: #6B5B4F;
  margin-bottom: 12rpx;
}

.empty-desc {
  font-size: 26rpx;
  color: #9B8B7F;
}

/* 使用说明 */
.coupon-tips {
  background: #FFFFFF;
  margin: 30rpx;
  padding: 30rpx;
  border-radius: 20rpx;
}

.tips-header {
  display: flex;
  align-items: center;
  margin-bottom: 24rpx;
}

.tips-icon {
  width: 32rpx;
  height: 32rpx;
  color: #D4A574;
  margin-right: 12rpx;
}

.tips-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #3D2914;
}

.tips-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.tip-item {
  display: flex;
  align-items: flex-start;
  gap: 12rpx;
}

.tip-icon {
  width: 32rpx;
  height: 32rpx;
  color: #D4A574;
  flex-shrink: 0;
  margin-top: 4rpx;
}

.tip-text {
  font-size: 26rpx;
  color: #6B5B4F;
  line-height: 1.6;
  flex: 1;
}

/* 安全区域 */
.safe-area {
  height: constant(safe-area-inset-bottom);
  height: env(safe-area-inset-bottom);
}
</style>
