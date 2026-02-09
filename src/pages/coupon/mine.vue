<template>
  <view class="container">
    <!-- 顶部统计 -->
    <view class="stats-header">
      <view class="stats-bg"></view>
      <view class="stats-content">
        <view class="stat-item">
          <text class="stat-num">{{ stats.unused }}</text>
          <text class="stat-label">未使用</text>
        </view>
        <view class="stat-divider"></view>
        <view class="stat-item">
          <text class="stat-num">{{ stats.used }}</text>
          <text class="stat-label">已使用</text>
        </view>
        <view class="stat-divider"></view>
        <view class="stat-item">
          <text class="stat-num">{{ stats.expired }}</text>
          <text class="stat-label">已过期</text>
        </view>
      </view>
    </view>

    <!-- Tab 切换 -->
    <view class="tab-bar">
      <view 
        class="tab-item" 
        v-for="tab in tabs" 
        :key="tab.value"
        :class="{ active: currentTab === tab.value }"
        @click="switchTab(tab.value)"
      >
        <text class="tab-text">{{ tab.label }}</text>
        <view class="tab-line" v-if="currentTab === tab.value"></view>
      </view>
    </view>

    <!-- 优惠券列表 -->
    <view class="coupon-list">
      <view 
        class="coupon-card" 
        v-for="(coupon, index) in filteredCoupons" 
        :key="coupon._id"
        :class="{ 'expired': coupon.status !== 'unused', 'soon-expire': isSoonExpire(coupon) }"
      >
        <!-- 左侧金额区 -->
        <view class="coupon-left">
          <view class="coupon-value">
            <text class="value-symbol" v-if="coupon.template?.type !== 'discount'">¥</text>
            <text class="value-num">{{ formatValue(coupon.template) }}</text>
            <text class="value-unit" v-if="coupon.template?.type === 'discount'">折</text>
          </view>
          <text class="coupon-type">{{ getTypeText(coupon.template?.type) }}</text>
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
            <view class="coupon-header">
              <text class="coupon-name">{{ coupon.template?.name }}</text>
              <view class="status-tag" :class="coupon.status">
                {{ getStatusText(coupon.status) }}
              </view>
            </view>
            <text class="coupon-desc">{{ coupon.template?.description }}</text>
            <view class="coupon-time">
              <text class="time-text" :class="{ 'soon': isSoonExpire(coupon) }">
                {{ getTimeText(coupon) }}
              </text>
              <view class="soon-badge" v-if="isSoonExpire(coupon) && coupon.status === 'unused'">
                <text class="soon-text">即将过期</text>
              </view>
            </view>
          </view>
        </view>
        
        <!-- 已使用/过期遮罩 -->
        <view class="coupon-mask" v-if="coupon.status !== 'unused'">
          <text class="mask-text">{{ coupon.status === 'used' ? '已使用' : '已过期' }}</text>
        </view>
      </view>
      
      <!-- 空状态 -->
      <view class="empty-state" v-if="filteredCoupons.length === 0 && !loading">
        <text class="empty-icon">&#xe6c0;</text>
        <text class="empty-text">暂无{{ getTabLabel() }}优惠券</text>
        <text class="empty-desc" v-if="currentTab === 'unused'">快去优惠券中心领取吧</text>
        <view class="btn-go" v-if="currentTab === 'unused'" @click="goToCouponCenter">
          <text class="btn-text">去领券</text>
        </view>
      </view>
    </view>

    <!-- 底部提示 -->
    <view class="footer-tips" v-if="filteredCoupons.length > 0">
      <text class="tips-text">只显示最近一年的优惠券记录</text>
    </view>

    <!-- 安全区域 -->
    <view class="safe-area"></view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { getMyCoupons, formatPrice } from '@/utils/api';
import type { UserCoupon, CouponTemplate } from '@/types';

// Tab 配置
const tabs = [
  { label: '未使用', value: 'unused' },
  { label: '已使用', value: 'used' },
  { label: '已过期', value: 'expired' }
];

// 数据
const currentTab = ref('unused');
const coupons = ref<UserCoupon[]>([]);
const loading = ref(false);

// 统计
const stats = computed(() => {
  return {
    unused: coupons.value.filter(c => c.status === 'unused').length,
    used: coupons.value.filter(c => c.status === 'used').length,
    expired: coupons.value.filter(c => c.status === 'expired').length
  };
});

// 筛选后的优惠券
const filteredCoupons = computed(() => {
  return coupons.value.filter(c => c.status === currentTab.value);
});

// 加载优惠券
const loadCoupons = async () => {
  try {
    loading.value = true;
    const res = await getMyCoupons();
    coupons.value = res;
  } catch (error) {
    console.error('加载优惠券失败:', error);
    uni.showToast({
      title: '加载失败',
      icon: 'none'
    });
  } finally {
    loading.value = false;
  }
};

// 切换 Tab
const switchTab = (tab: string) => {
  currentTab.value = tab;
};

// 获取 Tab 标签
const getTabLabel = () => {
  const tab = tabs.find(t => t.value === currentTab.value);
  return tab?.label || '';
};

// 格式化优惠券面值
const formatValue = (template?: CouponTemplate) => {
  if (!template) return '0';
  if (template.type === 'discount') {
    return (template.value / 10).toFixed(1);
  }
  return formatPrice(template.value);
};

// 获取类型文字
const getTypeText = (type?: string) => {
  const map: Record<string, string> = {
    'amount': '满减券',
    'discount': '折扣券',
    'no_threshold': '无门槛'
  };
  return map[type || ''] || '优惠券';
};

// 获取状态文字
const getStatusText = (status: string) => {
  const map: Record<string, string> = {
    'unused': '未使用',
    'used': '已使用',
    'expired': '已过期'
  };
  return map[status] || status;
};

// 判断是否即将过期（3天内）
const isSoonExpire = (coupon: UserCoupon) => {
  if (coupon.status !== 'unused') return false;
  const now = new Date();
  const expireTime = new Date(coupon.expireTime);
  const diffDays = Math.ceil((expireTime.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return diffDays <= 3 && diffDays > 0;
};

// 获取时间文字
const getTimeText = (coupon: UserCoupon) => {
  if (coupon.status === 'used') {
    return `使用时间：${formatDate(coupon.useTime)}`;
  }
  return `有效期至：${formatDate(coupon.expireTime)}`;
};

// 格式化日期
const formatDate = (date?: Date | string) => {
  if (!date) return '';
  const d = new Date(date);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
};

// 跳转到优惠券中心
const goToCouponCenter = () => {
  uni.navigateTo({
    url: '/pages/coupon/index'
  });
};

// 生命周期
onShow(() => {
  loadCoupons();
});
</script>

<style scoped>
.container {
  min-height: 100vh;
  background-color: #FDF8F3;
  padding-bottom: 40rpx;
}

/* 顶部统计 */
.stats-header {
  position: relative;
  padding: 60rpx 40rpx 80rpx;
  overflow: hidden;
}

.stats-bg {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 100%;
  background: linear-gradient(135deg, #D4A574 0%, #C9A962 50%, #B8956A 100%);
  border-radius: 0 0 40rpx 40rpx;
}

.stats-content {
  position: relative;
  display: flex;
  justify-content: space-around;
  align-items: center;
  z-index: 1;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-num {
  font-size: 56rpx;
  font-weight: bold;
  color: #FFFFFF;
  margin-bottom: 12rpx;
}

.stat-label {
  font-size: 26rpx;
  color: rgba(255, 255, 255, 0.9);
}

.stat-divider {
  width: 2rpx;
  height: 60rpx;
  background: rgba(255, 255, 255, 0.3);
}

/* Tab 切换 */
.tab-bar {
  display: flex;
  background: #FFFFFF;
  margin: -40rpx 30rpx 30rpx;
  padding: 0 20rpx;
  border-radius: 16rpx;
  box-shadow: 0 4rpx 20rpx rgba(61, 41, 20, 0.08);
  position: relative;
  z-index: 2;
}

.tab-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 30rpx 0;
  position: relative;
}

.tab-text {
  font-size: 30rpx;
  color: #6B5B4F;
  transition: all 0.3s;
}

.tab-item.active .tab-text {
  color: #D4A574;
  font-weight: 600;
}

.tab-line {
  position: absolute;
  bottom: 0;
  width: 60rpx;
  height: 4rpx;
  background: linear-gradient(90deg, #D4A574 0%, #C9A962 100%);
  border-radius: 2rpx;
}

/* 优惠券列表 */
.coupon-list {
  padding: 0 30rpx;
}

.coupon-card {
  display: flex;
  background: #FFFFFF;
  border-radius: 20rpx;
  overflow: hidden;
  box-shadow: 0 4rpx 20rpx rgba(61, 41, 20, 0.06);
  margin-bottom: 24rpx;
  position: relative;
}

.coupon-card.expired {
  opacity: 0.7;
}

.coupon-card.soon-expire {
  box-shadow: 0 4rpx 20rpx rgba(196, 69, 54, 0.1);
}

.coupon-left {
  width: 180rpx;
  background: linear-gradient(135deg, #D4A574 0%, #C9A962 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24rpx 16rpx;
}

.coupon-card.expired .coupon-left {
  background: linear-gradient(135deg, #B8B0A8 0%, #A09890 100%);
}

.coupon-value {
  display: flex;
  align-items: baseline;
  color: #FFFFFF;
}

.value-symbol {
  font-size: 28rpx;
  margin-right: 4rpx;
}

.value-num {
  font-size: 48rpx;
  font-weight: bold;
}

.value-unit {
  font-size: 24rpx;
  margin-left: 4rpx;
}

.coupon-type {
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.9);
  margin-top: 8rpx;
  padding: 4rpx 12rpx;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 16rpx;
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
  padding: 24rpx;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.coupon-info {
  display: flex;
  flex-direction: column;
}

.coupon-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12rpx;
}

.coupon-name {
  font-size: 28rpx;
  font-weight: 600;
  color: #3D2914;
  flex: 1;
}

.status-tag {
  font-size: 20rpx;
  padding: 4rpx 12rpx;
  border-radius: 12rpx;
  margin-left: 12rpx;
}

.status-tag.unused {
  color: #2D5016;
  background: rgba(45, 80, 22, 0.1);
}

.status-tag.used {
  color: #9B8B7F;
  background: #F5F0E8;
}

.status-tag.expired {
  color: #9B8B7F;
  background: #F5F0E8;
}

.coupon-desc {
  font-size: 24rpx;
  color: #6B5B4F;
  margin-bottom: 12rpx;
  line-height: 1.4;
}

.coupon-time {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12rpx;
}

.time-text {
  font-size: 22rpx;
  color: #9B8B7F;
}

.time-text.soon {
  color: #C44536;
}

.soon-badge {
  padding: 4rpx 12rpx;
  background: rgba(196, 69, 54, 0.1);
  border-radius: 12rpx;
}

.soon-text {
  font-size: 20rpx;
  color: #C44536;
}

/* 遮罩 */
.coupon-mask {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
}

.mask-text {
  font-size: 48rpx;
  font-weight: bold;
  color: #9B8B7F;
  transform: rotate(-15deg);
  border: 4rpx solid #9B8B7F;
  padding: 12rpx 24rpx;
  border-radius: 12rpx;
  opacity: 0.5;
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 120rpx 0;
}

.empty-icon {
  font-family: "iconfont";
  font-size: 100rpx;
  color: #D4A574;
  opacity: 0.4;
  margin-bottom: 24rpx;
}

.empty-text {
  font-size: 32rpx;
  color: #6B5B4F;
  margin-bottom: 16rpx;
}

.empty-desc {
  font-size: 26rpx;
  color: #9B8B7F;
  margin-bottom: 40rpx;
}

.btn-go {
  padding: 24rpx 80rpx;
  background: linear-gradient(135deg, #D4A574 0%, #C9A962 100%);
  border-radius: 40rpx;
}

.btn-text {
  font-size: 30rpx;
  color: #FFFFFF;
  font-weight: 600;
}

/* 底部提示 */
.footer-tips {
  text-align: center;
  padding: 40rpx;
}

.tips-text {
  font-size: 24rpx;
  color: #9B8B7F;
}

/* 安全区域 */
.safe-area {
  height: constant(safe-area-inset-bottom);
  height: env(safe-area-inset-bottom);
}
</style>
