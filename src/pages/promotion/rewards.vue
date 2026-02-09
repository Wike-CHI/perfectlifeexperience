<template>
  <view class="container">
    <!-- 收益概览 -->
    <view class="overview-section">
      <view class="overview-bg"></view>
      <view class="overview-content">
        <view class="overview-item">
          <text class="overview-label">累计收益</text>
          <text class="overview-value">{{ formatPrice(totalReward) }}</text>
        </view>
        <view class="overview-divider"></view>
        <view class="overview-item">
          <text class="overview-label">待结算</text>
          <text class="overview-value pending">{{ formatPrice(pendingReward) }}</text>
        </view>
      </view>
    </view>

    <!-- 状态筛选 -->
    <view class="filter-bar">
      <view 
        v-for="status in statusOptions" 
        :key="status.value"
        class="filter-tab"
        :class="{ active: currentStatus === status.value }"
        @click="switchStatus(status.value)"
      >
        <text>{{ status.label }}</text>
      </view>
    </view>

    <!-- 奖励列表 -->
    <view class="reward-list">
      <view v-if="loading" class="loading-state">
        <text>加载中...</text>
      </view>

      <view v-else-if="records.length === 0" class="empty-state">
        <image class="empty-icon" src="/static/logo.png" mode="aspectFit" />
        <text class="empty-text">暂无奖励记录</text>
        <text class="empty-hint">分享邀请好友，开始赚取奖励</text>
      </view>

      <view v-else class="record-list">
        <view 
          v-for="record in records" 
          :key="record.id"
          class="record-item"
        >
          <view class="record-left">
            <view :class="['record-icon', record.status]">
              <uni-icons 
                :type="getStatusIcon(record.status)" 
                size="32" 
                :color="getStatusColor(record.status)"
              ></uni-icons>
            </view>
            <view class="record-info">
              <text class="record-title">{{ getLevelText(record.level) }}奖励</text>
              <text class="record-desc">来自 {{ record.sourceUser?.nickName || '好友' }}</text>
              <text class="record-time">{{ formatTime(record.createTime) }}</text>
            </view>
          </view>
          <view class="record-right">
            <text :class="['record-amount', record.status]">+{{ formatPrice(record.amount) }}</text>
            <text class="record-status">{{ getStatusText(record.status) }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 加载更多 -->
    <view v-if="hasMore" class="load-more" @click="loadMore">
      <text>{{ loadingMore ? '加载中...' : '加载更多' }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { getRewardRecords, getPromotionInfo } from '@/utils/api';
import type { RewardRecord } from '@/types';

const currentStatus = ref('');
const records = ref<RewardRecord[]>([]);
const totalReward = ref(0);
const pendingReward = ref(0);
const loading = ref(false);
const loadingMore = ref(false);
const hasMore = ref(false);
const page = ref(1);
const pageSize = 20;

const statusOptions = [
  { label: '全部', value: '' },
  { label: '待结算', value: 'pending' },
  { label: '已结算', value: 'settled' }
];

const loadOverview = async () => {
  try {
    const info = await getPromotionInfo();
    totalReward.value = info.totalReward;
    pendingReward.value = info.pendingReward;
  } catch (error) {
    console.error('加载概览数据失败:', error);
  }
};

const loadRecords = async (isLoadMore = false) => {
  if (loading.value || (isLoadMore && loadingMore.value)) return;

  if (isLoadMore) {
    loadingMore.value = true;
    page.value++;
  } else {
    loading.value = true;
    page.value = 1;
    records.value = [];
  }

  try {
    const res = await getRewardRecords(currentStatus.value || undefined, page.value, pageSize);
    const newRecords = res.records || [];
    
    if (isLoadMore) {
      records.value.push(...newRecords);
    } else {
      records.value = newRecords;
    }

    hasMore.value = newRecords.length === pageSize;
  } catch (error) {
    console.error('加载奖励记录失败:', error);
    uni.showToast({
      title: '加载失败',
      icon: 'none'
    });
  } finally {
    loading.value = false;
    loadingMore.value = false;
  }
};

const switchStatus = (status: string) => {
  currentStatus.value = status;
  loadRecords();
};

const loadMore = () => {
  if (hasMore.value) {
    loadRecords(true);
  }
};

const formatPrice = (price: number) => {
  return (price / 100).toFixed(2);
};

const formatTime = (time: Date | string) => {
  if (!time) return '';
  const date = new Date(time);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
};

const getLevelText = (level: number) => {
  const texts: Record<number, string> = {
    1: '直接推广',
    2: '二级推广',
    3: '三级推广',
    4: '四级推广'
  };
  return texts[level] || '推广';
};

const getStatusIcon = (status: string) => {
  const icons: Record<string, string> = {
    pending: 'clock-filled',
    settled: 'checkmarkempty',
    cancelled: 'closeempty',
    deducted: 'refreshempty'
  };
  return icons[status] || 'help-filled';
};

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    pending: '#FFB085',
    settled: '#06D6A0',
    cancelled: '#C44536',
    deducted: '#9B8B7F'
  };
  return colors[status] || '#9B8B7F';
};

const getStatusText = (status: string) => {
  const texts: Record<string, string> = {
    pending: '待结算',
    settled: '已结算',
    cancelled: '已取消',
    deducted: '已扣回'
  };
  return texts[status] || status;
};

onMounted(() => {
  loadOverview();
  loadRecords();
});
</script>

<style scoped>
.container {
  min-height: 100vh;
  background-color: #FDF8F3;
  padding-bottom: 40rpx;
}

/* 收益概览 */
.overview-section {
  position: relative;
  padding: 40rpx 30rpx;
  overflow: hidden;
}

.overview-bg {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 240rpx;
  background: linear-gradient(180deg, #3D2914 0%, #5D3924 100%);
  border-radius: 0 0 40rpx 40rpx;
}

.overview-content {
  position: relative;
  display: flex;
  align-items: center;
  background: #FFFFFF;
  border-radius: 24rpx;
  padding: 40rpx;
  box-shadow: 0 8rpx 32rpx rgba(61, 41, 20, 0.08);
  z-index: 1;
}

.overview-item {
  flex: 1;
  text-align: center;
}

.overview-label {
  display: block;
  font-size: 26rpx;
  color: #9B8B7F;
  margin-bottom: 16rpx;
}

.overview-value {
  display: block;
  font-size: 52rpx;
  font-weight: bold;
  color: #D4A574;
  font-family: 'DIN Alternate', monospace;
}

.overview-value.pending {
  color: #FFB085;
}

.overview-divider {
  width: 2rpx;
  height: 80rpx;
  background: #F5F0E8;
}

/* 状态筛选 */
.filter-bar {
  display: flex;
  background: #FFFFFF;
  padding: 20rpx 30rpx;
  margin-bottom: 20rpx;
}

.filter-tab {
  flex: 1;
  text-align: center;
  padding: 20rpx 0;
  margin: 0 10rpx;
  border-radius: 12rpx;
  background: #F5F0E8;
  transition: all 0.3s;
}

.filter-tab text {
  font-size: 28rpx;
  color: #6B5B4F;
}

.filter-tab.active {
  background: linear-gradient(135deg, #D4A574 0%, #B8935F 100%);
}

.filter-tab.active text {
  color: #FFFFFF;
  font-weight: 500;
}

/* 奖励列表 */
.reward-list {
  padding: 0 30rpx;
}

.loading-state, .empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 120rpx 0;
}

.empty-icon {
  width: 160rpx;
  height: 160rpx;
  opacity: 0.3;
  margin-bottom: 30rpx;
}

.empty-text {
  font-size: 30rpx;
  color: #6B5B4F;
  margin-bottom: 16rpx;
}

.empty-hint {
  font-size: 26rpx;
  color: #9B8B7F;
}

.record-list {
  background: #FFFFFF;
  border-radius: 24rpx;
  padding: 20rpx 30rpx;
  box-shadow: 0 8rpx 32rpx rgba(61, 41, 20, 0.08);
}

.record-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 30rpx 0;
  border-bottom: 1rpx solid #F9F9F9;
}

.record-item:last-child {
  border-bottom: none;
}

.record-left {
  display: flex;
  align-items: center;
  flex: 1;
}

.record-icon {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 24rpx;
}

.record-icon.pending {
  background: rgba(255, 176, 133, 0.15);
}

.record-icon.settled {
  background: rgba(6, 214, 160, 0.15);
}

.record-icon.cancelled {
  background: rgba(196, 69, 54, 0.15);
}

.record-icon.deducted {
  background: rgba(155, 139, 127, 0.15);
}

.record-info {
  display: flex;
  flex-direction: column;
}

.record-title {
  font-size: 30rpx;
  font-weight: 500;
  color: #3D2914;
  margin-bottom: 8rpx;
}

.record-desc {
  font-size: 24rpx;
  color: #6B5B4F;
  margin-bottom: 8rpx;
}

.record-time {
  font-size: 22rpx;
  color: #9B8B7F;
}

.record-right {
  text-align: right;
}

.record-amount {
  display: block;
  font-size: 36rpx;
  font-weight: bold;
  margin-bottom: 8rpx;
  font-family: 'DIN Alternate', monospace;
}

.record-amount.pending {
  color: #FFB085;
}

.record-amount.settled {
  color: #06D6A0;
}

.record-amount.cancelled,
.record-amount.deducted {
  color: #C44536;
}

.record-status {
  font-size: 22rpx;
  color: #9B8B7F;
}

/* 加载更多 */
.load-more {
  text-align: center;
  padding: 40rpx;
}

.load-more text {
  font-size: 26rpx;
  color: #9B8B7F;
}
</style>
