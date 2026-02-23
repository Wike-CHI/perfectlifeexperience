<template>
  <MainLayout>
    <view class="commissions-page">
      <!-- Filter Section -->
      <view class="filter-section">
        <view class="filter-row">
          <view class="filter-group">
            <text class="filter-label">佣金类型:</text>
            <picker
              mode="selector"
              :range="typeOptions"
              :value="typeIndex"
              @change="onTypeChange"
            >
              <view class="picker-value">{{ typeOptions[typeIndex] }}</view>
            </picker>
          </view>

          <view class="filter-group">
            <text class="filter-label">时间范围:</text>
            <picker
              mode="selector"
              :range="dateRangeOptions"
              :value="dateRangeIndex"
              @change="onDateRangeChange"
            >
              <view class="picker-value">{{ dateRangeOptions[dateRangeIndex] }}</view>
            </picker>
          </view>
        </view>

        <view class="action-row">
          <button class="search-btn" @click="handleSearch">搜索</button>
          <button class="export-btn" @click="handleExport">导出</button>
        </view>
      </view>

      <!-- Summary Cards -->
      <view class="summary-cards">
        <view class="summary-card">
          <text class="summary-label">总佣金支出</text>
          <text class="summary-value">¥{{ formatMoney(summary.totalCommission) }}</text>
        </view>
        <view class="summary-card">
          <text class="summary-label">基础佣金</text>
          <text class="summary-value">¥{{ formatMoney(summary.basicCommission) }}</text>
        </view>
        <view class="summary-card">
          <text class="summary-label">复购奖励</text>
          <text class="summary-value">¥{{ formatMoney(summary.repurchaseReward) }}</text>
        </view>
        <view class="summary-card">
          <text class="summary-label">团队管理奖</text>
          <text class="summary-value">¥{{ formatMoney(summary.teamAward) }}</text>
        </view>
      </view>

      <!-- Commissions Table -->
      <view class="table-container">
        <view class="table-header">
          <text class="col-user">推广员</text>
          <text class="col-type">类型</text>
          <text class="col-order">来源订单</text>
          <text class="col-amount">金额</text>
          <text class="col-level">层级</text>
          <text class="col-time">发放时间</text>
          <text class="col-actions">操作</text>
        </view>

        <view class="table-body">
          <view
            v-for="commission in commissions"
            :key="commission._id"
            class="table-row"
          >
            <view class="col-user">
              <image v-if="commission.user?.avatarUrl" :src="commission.user.avatarUrl" class="user-avatar" />
              <text class="user-name">{{ commission.user?.nickName || '未知用户' }}</text>
            </view>
            <view class="col-type">
              <text :class="'type-badge type-' + commission.rewardType">
                {{ getTypeText(commission.rewardType) }}
              </text>
            </view>
            <text class="col-order">{{ commission.orderNo || '-' }}</text>
            <text class="col-amount">¥{{ formatMoney(commission.amount) }}</text>
            <text class="col-level">{{ commission.level !== undefined ? `第${commission.level}级` : '-' }}</text>
            <text class="col-time">{{ formatDate(commission.createTime) }}</text>
            <view class="col-actions">
              <button class="action-btn" size="mini" @click="handleViewDetail(commission)">详情</button>
            </view>
          </view>

          <view v-if="commissions.length === 0" class="empty-state">
            <text>暂无数据</text>
          </view>
        </view>
      </view>

      <!-- Pagination -->
      <view class="pagination" v-if="totalPages > 1">
        <button
          :disabled="currentPage === 1"
          @click="changePage(currentPage - 1)"
        >上一页</button>
        <text class="page-info">{{ currentPage }} / {{ totalPages }}</text>
        <button
          :disabled="currentPage === totalPages"
          @click="changePage(currentPage + 1)"
        >下一页</button>
      </view>
    </view>
  </MainLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { app } from '@/utils/cloudbase';
import MainLayout from '@/components/MainLayout.vue';

interface Commission {
  _id: string;
  _openid: string;
  rewardType: string;
  amount: number;
  orderNo?: string;
  level?: number;
  createTime: Date;
  user?: {
    nickName?: string;
    avatarUrl?: string;
  };
}

const commissions = ref<Commission[]>([]);
const summary = ref({
  totalCommission: 0,
  basicCommission: 0,
  repurchaseReward: 0,
  teamAward: 0
});

const typeOptions = ref(['全部', '基础佣金', '复购奖励', '团队管理奖', '育成津贴']);
const typeValues = ['all', 'basic', 'repurchase', 'team', 'nurture'];
const typeIndex = ref(0);

const dateRangeOptions = ref(['全部', '今天', '本周', '本月', '本月']);
const dateRangeValues = ['all', 'today', 'week', 'month', 'lastMonth'];
const dateRangeIndex = ref(0);

const currentPage = ref(1);
const totalPages = ref(1);
const pageSize = 20;

const fetchCommissions = async () => {
  try {
    const res = await app.callFunction({
      name: 'admin-api',
      data: {
        action: 'getCommissions',
        data: {
          type: typeValues[typeIndex.value],
          dateRange: dateRangeValues[dateRangeIndex.value],
          page: currentPage.value,
          limit: pageSize
        }
      }
    });

    if (res.result?.code === 0) {
      commissions.value = res.result.data.list || [];
      summary.value = res.result.data.summary || summary.value;
      totalPages.value = Math.ceil((res.result.data.total || 0) / pageSize);
    } else {
      uni.showToast({
        title: res.result?.msg || '获取佣金列表失败',
        icon: 'none'
      });
    }
  } catch (error) {
    console.error('获取佣金列表失败:', error);
    uni.showToast({
      title: '获取佣金列表失败',
      icon: 'none'
    });
  }
};

const onTypeChange = (e: any) => {
  typeIndex.value = e.detail.value;
  currentPage.value = 1;
  fetchCommissions();
};

const onDateRangeChange = (e: any) => {
  dateRangeIndex.value = e.detail.value;
  currentPage.value = 1;
  fetchCommissions();
};

const handleSearch = () => {
  currentPage.value = 1;
  fetchCommissions();
};

const handleExport = () => {
  uni.showToast({
    title: '导出功能开发中',
    icon: 'none'
  });
};

const changePage = (page: number) => {
  if (page < 1 || page > totalPages.value) return;
  currentPage.value = page;
  fetchCommissions();
};

const handleViewDetail = (commission: Commission) => {
  uni.navigateTo({
    url: `/pages/users/detail/index?id=${commission._openid}`
  });
};

const formatMoney = (amount: number) => {
  return (amount / 100).toFixed(2);
};

const getTypeText = (type: string) => {
  const typeMap: Record<string, string> = {
    basic: '基础佣金',
    repurchase: '复购奖励',
    team: '团队管理奖',
    nurture: '育成津贴'
  };
  return typeMap[type] || type;
};

const formatDate = (date: Date) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

onMounted(() => {
  fetchCommissions();
});
</script>

<style lang="scss" scoped>
@import '@/styles/variables.scss';

.commissions-page {
  padding: 20rpx;
}

.filter-section {
  background: $card-bg;
  border-radius: $border-radius;
  padding: 30rpx;
  margin-bottom: 20rpx;
  box-shadow: $box-shadow;
}

.filter-row {
  display: flex;
  flex-wrap: wrap;
  gap: 20rpx;
  margin-bottom: 20rpx;
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 10rpx;
  flex: 1;
  min-width: 200rpx;
}

.filter-label {
  font-size: 28rpx;
  color: $text-secondary;
  white-space: nowrap;
}

.picker-value {
  flex: 1;
  height: 60rpx;
  padding: 0 20rpx;
  background: $input-bg;
  border: 1rpx solid $border-color;
  border-radius: $border-radius-sm;
  font-size: 28rpx;
  color: $text-primary;
}

.action-row {
  display: flex;
  gap: 20rpx;
  justify-content: flex-end;
}

.search-btn,
.export-btn {
  padding: 15rpx 40rpx;
  border-radius: $border-radius-sm;
  font-size: 28rpx;
  border: none;
}

.search-btn {
  background: $primary-color;
  color: $white;
}

.export-btn {
  background: #4CAF50;
  color: $white;
}

.summary-cards {
  display: flex;
  gap: 20rpx;
  margin-bottom: 20rpx;
  flex-wrap: wrap;
}

.summary-card {
  flex: 1;
  min-width: 200rpx;
  background: $card-bg;
  border-radius: $border-radius;
  padding: 30rpx 20rpx;
  box-shadow: $box-shadow;
}

.summary-label {
  display: block;
  font-size: 24rpx;
  color: $text-secondary;
  margin-bottom: 10rpx;
}

.summary-value {
  display: block;
  font-size: 32rpx;
  font-weight: 600;
  color: $primary-color;
}

.table-container {
  background: $card-bg;
  border-radius: $border-radius;
  overflow: hidden;
  box-shadow: $box-shadow;
}

.table-header {
  display: flex;
  background: $bg-secondary;
  padding: 25rpx 20rpx;
  font-size: 26rpx;
  color: $text-secondary;
  font-weight: 600;
  border-bottom: 1rpx solid $border-color;
}

.table-body {
  max-height: 1000rpx;
  overflow-y: auto;
}

.table-row {
  display: flex;
  padding: 25rpx 20rpx;
  border-bottom: 1rpx solid $border-color;
  align-items: center;
  font-size: 26rpx;

  &:last-child {
    border-bottom: none;
  }
}

.col-user {
  flex: 1.5;
  display: flex;
  align-items: center;
  gap: 15rpx;
}

.user-avatar {
  width: 60rpx;
  height: 60rpx;
  border-radius: 50%;
}

.user-name {
  color: $text-primary;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 150rpx;
}

.col-type {
  flex: 1;
}

.type-badge {
  padding: 5rpx 15rpx;
  border-radius: $border-radius-sm;
  font-size: 22rpx;
  color: $white;

  &.type-basic { background: #4CAF50; }
  &.type-repurchase { background: #2196F3; }
  &.type-team { background: #FF9800; }
  &.type-nurture { background: #9C27B0; }
}

.col-order,
.col-level,
.col-time {
  flex: 1;
  color: $text-primary;
  font-size: 24rpx;
}

.col-amount {
  flex: 0.8;
  color: $primary-color;
  font-weight: 600;
}

.col-actions {
  flex: 0.5;
  display: flex;
  justify-content: flex-end;
}

.action-btn {
  background: $primary-color;
  color: $white;
  border: none;
  padding: 10rpx 20rpx;
  border-radius: $border-radius-sm;
  font-size: 24rpx;
}

.empty-state {
  padding: 100rpx;
  text-align: center;
  color: $text-secondary;
  font-size: 28rpx;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 30rpx;
  margin-top: 30rpx;
  padding: 20rpx;

  button {
    padding: 15rpx 30rpx;
    background: $card-bg;
    border: 1rpx solid $border-color;
    border-radius: $border-radius-sm;
    font-size: 26rpx;
    color: $text-primary;

    &:disabled {
      opacity: 0.5;
    }
  }

  .page-info {
    font-size: 28rpx;
    color: $text-primary;
  }
}
</style>
