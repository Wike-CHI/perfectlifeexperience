<template>
  <view class="dashboard-container">
    <!-- 时间范围选择 -->
    <view class="time-filter">
      <view
        class="filter-item"
        :class="{ active: timeRange === 'today' }"
        @click="changeTimeRange('today')"
      >
        <text>今日</text>
      </view>
      <view
        class="filter-item"
        :class="{ active: timeRange === 'week' }"
        @click="changeTimeRange('week')"
      >
        <text>本周</text>
      </view>
      <view
        class="filter-item"
        :class="{ active: timeRange === 'month' }"
        @click="changeTimeRange('month')"
      >
        <text>本月</text>
      </view>
      <view
        class="filter-item"
        :class="{ active: timeRange === 'all' }"
        @click="changeTimeRange('all')"
      >
        <text>全部</text>
      </view>
    </view>

    <!-- 核心指标卡片 -->
    <view class="metrics-section">
      <view class="metrics-grid">
        <view class="metric-card primary">
          <text class="metric-value">{{ formatPrice(dashboardData.totalCommission) }}</text>
          <text class="metric-label">佣金收益</text>
          <view class="metric-trend" v-if="dashboardData.commissionTrend !== undefined">
            <text :class="dashboardData.commissionTrend >= 0 ? 'trend-up' : 'trend-down'">
              {{ dashboardData.commissionTrend >= 0 ? '↑' : '↓' }}{{ Math.abs(dashboardData.commissionTrend).toFixed(1) }}%
            </text>
          </view>
        </view>
        <view class="metric-card">
          <text class="metric-value">{{ dashboardData.orderCount || 0 }}</text>
          <text class="metric-label">推广订单</text>
        </view>
        <view class="metric-card">
          <text class="metric-value">{{ formatPrice(dashboardData.totalSales) }}</text>
          <text class="metric-label">推广销售额</text>
        </view>
        <view class="metric-card">
          <text class="metric-value">{{ dashboardData.teamSize || 0 }}</text>
          <text class="metric-label">团队人数</text>
        </view>
      </view>
    </view>

    <!-- 团队统计 -->
    <view class="section-card">
      <view class="section-header">
        <view class="section-icon">
          <image class="icon-svg" src="/static/icons/icon-team.svg" mode="aspectFit" />
        </view>
        <text class="section-title">团队概览</text>
      </view>
      <view class="team-stats">
        <view class="team-level" v-for="(level, index) in teamLevels" :key="index">
          <view class="level-header">
            <text class="level-name">{{ level.name }}</text>
            <text class="level-count">{{ level.count }}人</text>
          </view>
          <view class="level-bar">
            <view class="level-progress" :style="{ width: level.percent + '%' }"></view>
          </view>
        </view>
      </view>
      <view class="team-summary">
        <view class="summary-item">
          <text class="summary-label">直推人数</text>
          <text class="summary-value">{{ dashboardData.directCount || 0 }}</text>
        </view>
        <view class="summary-item">
          <text class="summary-label">间推人数</text>
          <text class="summary-value">{{ (dashboardData.teamSize || 0) - (dashboardData.directCount || 0) }}</text>
        </view>
      </view>
    </view>

    <!-- 收益趋势图 -->
    <view class="section-card">
      <view class="section-header">
        <view class="section-icon">
          <image class="icon-svg" src="/static/icons/icon-chart.svg" mode="aspectFit" />
        </view>
        <text class="section-title">收益趋势</text>
      </view>
      <view class="chart-container">
        <view class="chart-placeholder" v-if="trendData.length === 0">
          <text class="placeholder-text">暂无数据</text>
        </view>
        <view class="simple-chart" v-else>
          <view class="chart-bar" v-for="(item, index) in trendData" :key="index">
            <view class="bar-value">
              <text>¥{{ (item.value / 100).toFixed(0) }}</text>
            </view>
            <view class="bar-container">
              <view class="bar-fill" :style="{ height: getBarHeight(item.value) + '%' }"></view>
            </view>
            <text class="bar-label">{{ item.label }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 佣金明细分类 -->
    <view class="section-card">
      <view class="section-header">
        <view class="section-icon">
          <image class="icon-svg" src="/static/icons/icon-reward.svg" mode="aspectFit" />
        </view>
        <text class="section-title">佣金构成</text>
      </view>
      <view class="commission-breakdown">
        <view class="breakdown-item" v-for="(item, index) in commissionBreakdown" :key="index">
          <view class="breakdown-info">
            <text class="breakdown-name">{{ item.name }}</text>
            <text class="breakdown-desc">{{ item.desc }}</text>
          </view>
          <view class="breakdown-value">
            <text class="value-amount">{{ formatPrice(item.amount) }}</text>
            <text class="value-percent">{{ item.percent.toFixed(1) }}%</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 最近推广订单 -->
    <view class="section-card">
      <view class="section-header">
        <view class="section-icon">
          <image class="icon-svg" src="/static/icons/icon-order.svg" mode="aspectFit" />
        </view>
        <text class="section-title">最近订单</text>
        <text class="section-more" @click="goToOrders">查看全部</text>
      </view>
      <view class="recent-orders">
        <view class="order-empty" v-if="recentOrders.length === 0">
          <text class="empty-text">暂无推广订单</text>
        </view>
        <view class="order-item" v-for="(order, index) in recentOrders" :key="index">
          <view class="order-info">
            <text class="order-buyer">{{ maskPhone(order.buyerPhone) }}</text>
            <text class="order-time">{{ formatOrderTime(order.createTime) }}</text>
          </view>
          <view class="order-detail">
            <text class="order-amount">¥{{ (order.orderAmount / 100).toFixed(2) }}</text>
            <text class="order-commission">+¥{{ (order.commission / 100).toFixed(2) }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 加载状态 -->
    <view class="loading-section" v-if="loading">
      <text class="loading-text">加载中...</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { getPromotionDashboard } from '@/utils/api';

const loading = ref(true);
const timeRange = ref('month');
const dashboardData = ref({
  totalCommission: 0,
  orderCount: 0,
  totalSales: 0,
  teamSize: 0,
  directCount: 0,
  commissionTrend: undefined as number | undefined
});

const trendData = ref<Array<{ label: string; value: number }>>([]);
const recentOrders = ref<Array<any>>([]);

// 团队层级统计
const teamLevels = computed(() => {
  const levels = dashboardData.value.teamByLevel || [0, 0, 0, 0];
  const total = levels.reduce((sum: number, n: number) => sum + n, 0) || 1;
  const names = ['一级下级', '二级下级', '三级下级', '四级下级'];
  return levels.map((count: number, index: number) => ({
    name: names[index],
    count: count,
    percent: (count / total) * 100
  }));
});

// 佣金构成（简化版：只有推广佣金一种类型）
const commissionBreakdown = computed(() => {
  const total = dashboardData.value.totalCommission || 0;

  // 当前系统只有推广佣金一种奖励类型
  // 旧规则（复购奖励、团队管理奖、育成津贴）已废弃
  return [
    {
      name: '推广佣金',
      desc: '推广订单获得的佣金',
      amount: total,
      percent: 100  // 只有这一种类型，占比100%
    }
  ];
});

// 格式化价格
const formatPrice = (price: number) => {
  if (!price) return '¥0.00';
  return `¥${(price / 100).toFixed(2)}`;
};

// 计算柱状图高度
const getBarHeight = (value: number) => {
  const maxValue = Math.max(...trendData.value.map(d => d.value), 1);
  return (value / maxValue) * 100;
};

// 手机号脱敏
const maskPhone = (phone: string) => {
  if (!phone) return '用户';
  return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
};

// 格式化订单时间
const formatOrderTime = (time: string | Date) => {
  if (!time) return '';
  const date = new Date(time);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  return `${month}-${day} ${hour}:${minute}`;
};

// 切换时间范围
const changeTimeRange = (range: string) => {
  timeRange.value = range;
  loadDashboardData();
};

// 加载仪表板数据
const loadDashboardData = async () => {
  loading.value = true;
  try {
    const res = await getPromotionDashboard(timeRange.value);
    dashboardData.value = res.summary || {};
    trendData.value = res.trend || [];
    recentOrders.value = res.recentOrders || [];
  } catch (error) {
    console.error('加载仪表板数据失败:', error);
    uni.showToast({
      title: '加载失败',
      icon: 'none'
    });
  } finally {
    loading.value = false;
  }
};

// 跳转到订单列表
const goToOrders = () => {
  uni.navigateTo({
    url: '/pages/promotion/orders'
  });
};

onMounted(() => {
  loadDashboardData();
});
</script>

<style lang="scss" scoped>
.dashboard-container {
  min-height: 100vh;
  background: #F5F0E8;
  padding-bottom: 40rpx;
}

/* 时间筛选 */
.time-filter {
  display: flex;
  background: #FFFFFF;
  padding: 20rpx 30rpx;
  gap: 16rpx;
  position: sticky;
  top: 0;
  z-index: 10;
}

.filter-item {
  flex: 1;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 32rpx;
  background: #F5F0E8;
  transition: all 0.3s;
}

.filter-item text {
  font-size: 26rpx;
  color: #6B5B4F;
}

.filter-item.active {
  background: linear-gradient(135deg, #D4A574 0%, #B8935F 100%);
}

.filter-item.active text {
  color: #FFFFFF;
  font-weight: 500;
}

/* 核心指标 */
.metrics-section {
  padding: 24rpx;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20rpx;
}

.metric-card {
  background: #FFFFFF;
  border-radius: 20rpx;
  padding: 28rpx;
  position: relative;
}

.metric-card.primary {
  grid-column: span 2;
  background: linear-gradient(135deg, #3D2914 0%, #5D3924 100%);
}

.metric-card.primary .metric-value {
  font-size: 56rpx;
  color: #D4A574;
}

.metric-card.primary .metric-label {
  color: rgba(255, 255, 255, 0.8);
}

.metric-value {
  display: block;
  font-size: 40rpx;
  font-weight: 700;
  color: #3D2914;
  margin-bottom: 8rpx;
}

.metric-label {
  font-size: 24rpx;
  color: #9B8B7F;
}

.metric-trend {
  position: absolute;
  right: 28rpx;
  top: 28rpx;
}

.trend-up {
  color: #00A870;
  font-size: 24rpx;
}

.trend-down {
  color: #E34D59;
  font-size: 24rpx;
}

/* 卡片区块 */
.section-card {
  background: #FFFFFF;
  margin: 0 24rpx 24rpx;
  border-radius: 20rpx;
  padding: 28rpx;
  box-shadow: 0 4rpx 20rpx rgba(61, 41, 20, 0.06);
}

.section-header {
  display: flex;
  align-items: center;
  margin-bottom: 24rpx;
}

.section-icon {
  width: 40rpx;
  height: 40rpx;
  margin-right: 12rpx;
}

.icon-svg {
  width: 36rpx;
  height: 36rpx;
}

.section-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #3D2914;
  flex: 1;
}

.section-more {
  font-size: 24rpx;
  color: #D4A574;
}

/* 团队统计 */
.team-stats {
  margin-bottom: 24rpx;
}

.team-level {
  margin-bottom: 16rpx;
}

.level-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8rpx;
}

.level-name {
  font-size: 26rpx;
  color: #6B5B4F;
}

.level-count {
  font-size: 26rpx;
  font-weight: 500;
  color: #3D2914;
}

.level-bar {
  height: 12rpx;
  background: #F5F0E8;
  border-radius: 6rpx;
  overflow: hidden;
}

.level-progress {
  height: 100%;
  background: linear-gradient(90deg, #D4A574 0%, #C9A962 100%);
  border-radius: 6rpx;
  transition: width 0.3s;
}

.team-summary {
  display: flex;
  justify-content: space-around;
  padding-top: 20rpx;
  border-top: 1rpx solid #F5F0E8;
}

.summary-item {
  text-align: center;
}

.summary-label {
  display: block;
  font-size: 24rpx;
  color: #9B8B7F;
  margin-bottom: 8rpx;
}

.summary-value {
  font-size: 32rpx;
  font-weight: 600;
  color: #3D2914;
}

/* 趋势图 */
.chart-container {
  height: 300rpx;
}

.chart-placeholder {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.placeholder-text {
  font-size: 28rpx;
  color: #9B8B7F;
}

.simple-chart {
  display: flex;
  align-items: flex-end;
  height: 100%;
  padding-bottom: 40rpx;
}

.chart-bar {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100%;
}

.bar-value {
  font-size: 20rpx;
  color: #6B5B4F;
  margin-bottom: 4rpx;
}

.bar-container {
  flex: 1;
  width: 32rpx;
  background: #F5F0E8;
  border-radius: 4rpx;
  display: flex;
  align-items: flex-end;
  overflow: hidden;
}

.bar-fill {
  width: 100%;
  background: linear-gradient(180deg, #D4A574 0%, #B8935F 100%);
  border-radius: 4rpx;
  transition: height 0.3s;
}

.bar-label {
  font-size: 20rpx;
  color: #9B8B7F;
  margin-top: 8rpx;
}

/* 佣金构成 */
.commission-breakdown {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.breakdown-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16rpx 0;
  border-bottom: 1rpx solid #F5F0E8;
}

.breakdown-item:last-child {
  border-bottom: none;
}

.breakdown-info {
  display: flex;
  flex-direction: column;
}

.breakdown-name {
  font-size: 28rpx;
  font-weight: 500;
  color: #3D2914;
  margin-bottom: 4rpx;
}

.breakdown-desc {
  font-size: 24rpx;
  color: #9B8B7F;
}

.breakdown-value {
  text-align: right;
}

.value-amount {
  display: block;
  font-size: 28rpx;
  font-weight: 600;
  color: #D4A574;
}

.value-percent {
  font-size: 22rpx;
  color: #9B8B7F;
}

/* 最近订单 */
.order-empty {
  padding: 40rpx;
  text-align: center;
}

.empty-text {
  font-size: 26rpx;
  color: #9B8B7F;
}

.order-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20rpx 0;
  border-bottom: 1rpx solid #F5F0E8;
}

.order-item:last-child {
  border-bottom: none;
}

.order-info {
  display: flex;
  flex-direction: column;
}

.order-buyer {
  font-size: 28rpx;
  color: #3D2914;
  margin-bottom: 4rpx;
}

.order-time {
  font-size: 24rpx;
  color: #9B8B7F;
}

.order-detail {
  text-align: right;
}

.order-amount {
  display: block;
  font-size: 26rpx;
  color: #6B5B4F;
  margin-bottom: 4rpx;
}

.order-commission {
  font-size: 28rpx;
  font-weight: 600;
  color: #00A870;
}

/* 加载状态 */
.loading-section {
  padding: 60rpx;
  text-align: center;
}

.loading-text {
  font-size: 28rpx;
  color: #9B8B7F;
}
</style>
