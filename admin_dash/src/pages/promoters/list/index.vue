<template>
  <MainLayout>
    <view class="promoters-page">
      <!-- Filter Section -->
      <view class="filter-section">
        <view class="filter-row">
          <view class="filter-group">
            <text class="filter-label">星级筛选:</text>
            <picker
              mode="selector"
              :range="starLevelOptions"
              :value="starLevelIndex"
              @change="onStarLevelChange"
            >
              <view class="picker-value">{{ starLevelOptions[starLevelIndex] }}</view>
            </picker>
          </view>

          <view class="filter-group">
            <text class="filter-label">代理等级:</text>
            <picker
              mode="selector"
              :range="agentLevelOptions"
              :value="agentLevelIndex"
              @change="onAgentLevelChange"
            >
              <view class="picker-value">{{ agentLevelOptions[agentLevelIndex] }}</view>
            </picker>
          </view>

          <view class="filter-group">
            <text class="filter-label">搜索:</text>
            <input
              v-model="searchKeyword"
              class="search-input"
              placeholder="昵称/OPENID"
              @confirm="handleSearch"
            />
          </view>
        </view>

        <view class="action-row">
          <button class="search-btn" @click="handleSearch">搜索</button>
          <button class="reset-btn" @click="handleReset">重置</button>
        </view>
      </view>

      <!-- Stats Cards -->
      <view class="stats-cards">
        <view class="stat-card">
          <text class="stat-value">{{ stats.totalPromoters }}</text>
          <text class="stat-label">总推广员数</text>
        </view>
        <view class="stat-card">
          <text class="stat-value">{{ stats.goldPromoters }}</text>
          <text class="stat-label">金牌推广员</text>
        </view>
        <view class="stat-card">
          <text class="stat-value">{{ stats.silverPromoters }}</text>
          <text class="stat-label">银牌推广员</text>
        </view>
        <view class="stat-card">
          <text class="stat-value">{{ stats.bronzePromoters }}</text>
          <text class="stat-label">铜牌推广员</text>
        </view>
      </view>

      <!-- Promoters Table -->
      <view class="table-container">
        <view class="table-header">
          <text class="col-user">推广员</text>
          <text class="col-agentLevel">代理等级</text>
          <text class="col-starLevel">会员等级</text>
          <text class="col-teamSize">团队人数</text>
          <text class="col-totalSales">累计销售额</text>
          <text class="col-commission">累计佣金</text>
          <text class="col-actions">操作</text>
        </view>

        <view class="table-body">
          <view
            v-for="promoter in promoters"
            :key="promoter._id"
            class="table-row"
          >
            <view class="col-user">
              <image v-if="promoter.avatarUrl" :src="promoter.avatarUrl" class="user-avatar" />
              <text class="user-name">{{ promoter.nickName || '未设置' }}</text>
            </view>
            <text class="col-agentLevel">{{ getAgentLevelText(promoter.agentLevel) }}</text>
            <text class="col-starLevel">{{ getStarLevelText(promoter.starLevel) }}</text>
            <text class="col-teamSize">{{ promoter.performance?.teamCount || 0 }}人</text>
            <text class="col-totalSales">¥{{ formatMoney(promoter.performance?.totalSales || 0) }}</text>
            <text class="col-commission">¥{{ formatMoney(promoter.totalCommission || 0) }}</text>
            <view class="col-actions">
              <button class="action-btn" size="mini" @click="handleViewTeam(promoter)">团队</button>
              <button class="action-btn" size="mini" @click="handleViewDetail(promoter)">详情</button>
            </view>
          </view>

          <view v-if="promoters.length === 0" class="empty-state">
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

interface Promoter {
  _id: string;
  _openid: string;
  nickName?: string;
  avatarUrl?: string;
  agentLevel: number;
  starLevel: number;
  performance?: {
    totalSales: number;
    teamCount: number;
  };
  totalCommission?: number;
}

const promoters = ref<Promoter[]>([]);
const stats = ref({
  totalPromoters: 0,
  goldPromoters: 0,
  silverPromoters: 0,
  bronzePromoters: 0
});

const starLevelOptions = ref(['全部', '铜牌及以上', '银牌及以上', '金牌']);
const starLevelValues = [-1, 1, 2, 3];
const starLevelIndex = ref(0);

const agentLevelOptions = ref(['全部', '一级代理', '二级代理', '三级代理', '四级代理']);
const agentLevelValues = [-1, 1, 2, 3, 4];
const agentLevelIndex = ref(0);

const searchKeyword = ref('');
const currentPage = ref(1);
const totalPages = ref(1);
const pageSize = 20;

const fetchPromoters = async () => {
  try {
    const res = await app.callFunction({
      name: 'admin-api',
      data: {
        action: 'getPromoters',
        data: {
          starLevel: starLevelValues[starLevelIndex.value],
          agentLevel: agentLevelValues[agentLevelIndex.value],
          keyword: searchKeyword.value,
          page: currentPage.value,
          pageSize
        }
      }
    });

    if (res.result?.code === 0) {
      promoters.value = res.result.data.list || [];
      stats.value = res.result.data.stats || stats.value;
      totalPages.value = Math.ceil((res.result.data.total || 0) / pageSize);
    } else {
      uni.showToast({
        title: res.result?.msg || '获取推广员列表失败',
        icon: 'none'
      });
    }
  } catch (error) {
    console.error('获取推广员列表失败:', error);
    uni.showToast({
      title: '获取推广员列表失败',
      icon: 'none'
    });
  }
};

const onStarLevelChange = (e: any) => {
  starLevelIndex.value = e.detail.value;
  currentPage.value = 1;
  fetchPromoters();
};

const onAgentLevelChange = (e: any) => {
  agentLevelIndex.value = e.detail.value;
  currentPage.value = 1;
  fetchPromoters();
};

const handleSearch = () => {
  currentPage.value = 1;
  fetchPromoters();
};

const handleReset = () => {
  starLevelIndex.value = 0;
  agentLevelIndex.value = 0;
  searchKeyword.value = '';
  currentPage.value = 1;
  fetchPromoters();
};

const changePage = (page: number) => {
  if (page < 1 || page > totalPages.value) return;
  currentPage.value = page;
  fetchPromoters();
};

const handleViewTeam = (promoter: Promoter) => {
  uni.navigateTo({
    url: `/pages/promoters/team/index?userId=${promoter._id}`
  });
};

const handleViewDetail = (promoter: Promoter) => {
  uni.navigateTo({
    url: `/pages/users/detail/index?id=${promoter._id}`
  });
};

const formatMoney = (amount: number) => {
  return (amount / 100).toFixed(2);
};

const getAgentLevelText = (level: number) => {
  const texts = ['总公司', '一级代理', '二级代理', '三级代理', '四级代理'];
  return texts[level] || '-';
};

const getStarLevelText = (level: number) => {
  const texts = ['普通会员', '铜牌推广员', '银牌推广员', '金牌推广员'];
  return texts[level] || '普通会员';
};

onMounted(() => {
  fetchPromoters();
});
</script>

<style lang="scss" scoped>
@import '@/styles/variables.scss';

.promoters-page {
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

.picker-value,
.search-input {
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
.reset-btn {
  padding: 15rpx 40rpx;
  border-radius: $border-radius-sm;
  font-size: 28rpx;
  border: none;
}

.search-btn {
  background: $primary-color;
  color: $white;
}

.reset-btn {
  background: $bg-secondary;
  color: $text-primary;
}

.stats-cards {
  display: flex;
  gap: 20rpx;
  margin-bottom: 20rpx;
}

.stat-card {
  flex: 1;
  background: $card-bg;
  border-radius: $border-radius;
  padding: 30rpx 20rpx;
  text-align: center;
  box-shadow: $box-shadow;
}

.stat-value {
  display: block;
  font-size: 36rpx;
  font-weight: 600;
  color: $primary-color;
  margin-bottom: 10rpx;
}

.stat-label {
  font-size: 24rpx;
  color: $text-secondary;
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

.col-agentLevel,
.col-starLevel,
.col-teamSize,
.col-totalSales,
.col-commission {
  flex: 1;
  color: $text-primary;
}

.col-commission {
  color: #4CAF50;
  font-weight: 600;
}

.col-actions {
  flex: 1.2;
  display: flex;
  gap: 10rpx;
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
