<template>
  <view class="container">
    <!-- 层级筛选 -->
    <view class="filter-section">
      <scroll-view class="filter-scroll" scroll-x>
        <view 
          v-for="level in levelOptions" 
          :key="level.value"
          class="filter-item"
          :class="{ active: currentLevel === level.value }"
          @click="switchLevel(level.value)"
        >
          <text class="filter-text">{{ level.label }}</text>
          <text class="filter-count" v-if="level.count">{{ level.count }}</text>
        </view>
      </scroll-view>
    </view>

    <!-- 统计卡片 -->
    <view class="stats-section">
      <view class="stats-card">
        <view class="stats-row">
          <view class="stats-item">
            <text class="stats-value">{{ teamStats.total }}</text>
            <text class="stats-label">团队成员</text>
          </view>
          <view class="stats-divider"></view>
          <view class="stats-item">
            <text class="stats-value">{{ teamStats.level1 }}</text>
            <text class="stats-label">直接邀请</text>
          </view>
          <view class="stats-divider"></view>
          <view class="stats-item">
            <text class="stats-value">{{ teamContribution }}</text>
            <text class="stats-label">团队贡献(元)</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 成员列表 -->
    <view class="member-section">
      <view class="section-header">
        <text class="section-title">成员列表</text>
        <text class="section-subtitle">共 {{ filteredMembers.length }} 人</text>
      </view>

      <view v-if="loading" class="loading-state">
        <text>加载中...</text>
      </view>

      <view v-else-if="filteredMembers.length === 0" class="empty-state">
        <image class="empty-icon" src="/static/logo.png" mode="aspectFit" />
        <text class="empty-text">暂无团队成员</text>
        <text class="empty-hint">分享你的邀请码，邀请好友加入</text>
      </view>

      <view v-else class="member-list">
        <view
          v-for="member in filteredMembers"
          :key="member._id || member.inviteCode"
          class="member-item"
        >
          <image class="member-avatar" :src="member.avatarUrl || '/static/logo.png'" mode="aspectFill" />
          <view class="member-info">
            <view class="member-name-row">
              <text class="member-name">{{ member.nickName || '微信用户' }}</text>
              <view class="member-badges">
                <view :class="['star-badge', 'star-' + member.starLevel]">
                  <text>{{ getStarLevelShort(member.starLevel) }}</text>
                </view>
                <view :class="['agent-badge', 'agent-' + member.agentLevel]">
                  <text>{{ getAgentLevelRoman(member.agentLevel) }}</text>
                </view>
              </view>
            </view>
            <text class="member-time">{{ formatTime(member.createTime || '') }}</text>
            <view class="member-stats" v-if="member.performance">
              <text class="stats-text">销售额 ¥{{ formatPrice(member.performance.totalSales) }}</text>
              <text class="stats-text" v-if="member.performance.directCount">直推 {{ member.performance.directCount }}人</text>
            </view>
          </view>
          <view class="member-level">
            <text class="level-tag">{{ getLevelText(member.agentLevel) }}</text>
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
import { getTeamMembers, getPromotionInfo } from '@/utils/api';

// 类型定义（内联，避免分包导入问题）
interface PromotionUser {
  _id: string
  _openid: string
  nickname: string
  avatarUrl: string
  agentLevel: number
  starLevel: number
  performance: {
    totalSales: number
    monthSales: number
    monthTag: string
    directCount: number
    teamCount: number
  }
  createTime: Date
}

interface TeamStats {
  total: number
  level1: number
  level2: number
  level3: number
  level4: number
}

const currentLevel = ref(0);
const members = ref<PromotionUser[]>([]);
const teamStats = ref<TeamStats>({
  total: 0,
  level1: 0,
  level2: 0,
  level3: 0,
  level4: 0
});
const teamContribution = ref(0);
const loading = ref(false);
const loadingMore = ref(false);
const hasMore = ref(false);
const page = ref(1);
const pageSize = 20;

const levelOptions = computed(() => [
  { label: '全部', value: 0, count: teamStats.value.total },
  { label: '一级', value: 1, count: teamStats.value.level1 },
  { label: '二级', value: 2, count: teamStats.value.level2 },
  { label: '三级', value: 3, count: teamStats.value.level3 },
  { label: '四级', value: 4, count: teamStats.value.level4 }
]);

const filteredMembers = computed(() => {
  if (currentLevel.value === 0) {
    return members.value;
  }
  return members.value.filter(m => m.agentLevel === currentLevel.value);
});

const loadTeamStats = async () => {
  try {
    const info = await getPromotionInfo();
    teamStats.value = info.teamStats;
  } catch (error) {
    console.error('加载团队统计失败:', error);
  }
};

const loadMembers = async (isLoadMore = false) => {
  if (loading.value || (isLoadMore && loadingMore.value)) return;

  if (isLoadMore) {
    loadingMore.value = true;
    page.value++;
  } else {
    loading.value = true;
    page.value = 1;
    members.value = [];
  }

  try {
    const res = await getTeamMembers(currentLevel.value || 1, page.value, pageSize);
    const newMembers = res.members || [];
    
    if (isLoadMore) {
      members.value.push(...newMembers);
    } else {
      members.value = newMembers;
    }

    hasMore.value = newMembers.length === pageSize;
  } catch (error) {
    console.error('加载成员失败:', error);
    uni.showToast({
      title: '加载失败',
      icon: 'none'
    });
  } finally {
    loading.value = false;
    loadingMore.value = false;
  }
};

const switchLevel = (level: number) => {
  currentLevel.value = level;
  loadMembers();
};

const loadMore = () => {
  if (hasMore.value) {
    loadMembers(true);
  }
};

const formatTime = (time: Date | string) => {
  if (!time) return '';
  const date = new Date(time);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const getLevelText = (level: number | undefined) => {
  if (level === undefined || level === 0) return '成员';
  const texts: Record<number, string> = {
    1: '一级',
    2: '二级',
    3: '三级',
    4: '四级'
  };
  return texts[level] || '成员';
};

const getStarLevelShort = (level: number) => {
  const names: Record<number, string> = {
    0: '普',
    1: '铜',
    2: '银',
    3: '金'
  };
  return names[level] || '普';
};

const getAgentLevelRoman = (level: number) => {
  const romans: Record<number, string> = {
    0: 'HQ',
    1: 'I',
    2: 'II',
    3: 'III',
    4: 'IV'
  };
  return romans[level] || 'IV';
};

const formatPrice = (price: number) => {
  return ((price || 0) / 100).toFixed(0);
};

onMounted(() => {
  loadTeamStats();
  loadMembers();
});
</script>

<style scoped>
.container {
  min-height: 100vh;
  background-color: #FDF8F3;
  padding-bottom: 40rpx;
}

/* 层级筛选 */
.filter-section {
  background: #FFFFFF;
  padding: 24rpx 0;
  margin-bottom: 20rpx;
}

.filter-scroll {
  white-space: nowrap;
  padding: 0 30rpx;
}

.filter-item {
  display: inline-flex;
  align-items: center;
  padding: 16rpx 32rpx;
  margin-right: 16rpx;
  background: #F5F0E8;
  border-radius: 32rpx;
  transition: all 0.3s;
}

.filter-item.active {
  background: linear-gradient(135deg, #D4A574 0%, #B8935F 100%);
}

.filter-text {
  font-size: 28rpx;
  color: #6B5B4F;
}

.filter-item.active .filter-text {
  color: #FFFFFF;
  font-weight: 500;
}

.filter-count {
  font-size: 22rpx;
  color: #9B8B7F;
  margin-left: 8rpx;
  background: rgba(0, 0, 0, 0.05);
  padding: 2rpx 10rpx;
  border-radius: 12rpx;
}

.filter-item.active .filter-count {
  color: #FFFFFF;
  background: rgba(255, 255, 255, 0.2);
}

/* 统计卡片 */
.stats-section {
  padding: 0 30rpx;
  margin-bottom: 30rpx;
}

.stats-card {
  background: linear-gradient(135deg, #3D2914 0%, #5D3924 100%);
  border-radius: 24rpx;
  padding: 40rpx;
}

.stats-row {
  display: flex;
  align-items: center;
  justify-content: space-around;
}

.stats-item {
  flex: 1;
  text-align: center;
}

.stats-value {
  display: block;
  font-size: 48rpx;
  font-weight: bold;
  color: #D4A574;
  margin-bottom: 12rpx;
  font-family: 'DIN Alternate', monospace;
}

.stats-label {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.7);
}

.stats-divider {
  width: 2rpx;
  height: 60rpx;
  background: rgba(255, 255, 255, 0.2);
}

/* 成员列表 */
.member-section {
  background: #FFFFFF;
  margin: 0 30rpx;
  border-radius: 24rpx;
  padding: 30rpx;
  box-shadow: 0 8rpx 32rpx rgba(61, 41, 20, 0.08);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30rpx;
  padding-bottom: 20rpx;
  border-bottom: 1rpx solid #F5F0E8;
}

.section-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #3D2914;
}

.section-subtitle {
  font-size: 24rpx;
  color: #9B8B7F;
}

.loading-state, .empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80rpx 0;
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

.member-list {
  display: flex;
  flex-direction: column;
}

.member-item {
  display: flex;
  align-items: center;
  padding: 24rpx 0;
  border-bottom: 1rpx solid #F9F9F9;
}

.member-item:last-child {
  border-bottom: none;
}

.member-avatar {
  width: 88rpx;
  height: 88rpx;
  border-radius: 50%;
  margin-right: 24rpx;
  background: #F5F0E8;
}

.member-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.member-name-row {
  display: flex;
  align-items: center;
  margin-bottom: 8rpx;
}

.member-name {
  font-size: 30rpx;
  font-weight: 500;
  color: #3D2914;
  margin-right: 12rpx;
}

.member-badges {
  display: flex;
  gap: 8rpx;
}

.star-badge, .agent-badge {
  padding: 2rpx 10rpx;
  border-radius: 6rpx;
  font-size: 18rpx;
}

.star-badge text, .agent-badge text {
  font-size: 18rpx;
  color: #FFFFFF;
  font-weight: 600;
}

/* 星级徽章颜色 */
.star-badge.star-0 { background: #9E9E9E; }
.star-badge.star-1 { background: linear-gradient(135deg, #CD7F32 0%, #B8860B 100%); }
.star-badge.star-2 { background: linear-gradient(135deg, #C0C0C0 0%, #A8A8A8 100%); }
.star-badge.star-3 { background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%); }

/* 代理等级徽章颜色 */
.agent-badge.agent-0 { background: linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%); }
.agent-badge.agent-1 { background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%); }
.agent-badge.agent-2 { background: linear-gradient(135deg, #C0C0C0 0%, #A8A8A8 100%); }
.agent-badge.agent-3 { background: linear-gradient(135deg, #CD7F32 0%, #B8860B 100%); }
.agent-badge.agent-4 { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }

.member-time {
  font-size: 24rpx;
  color: #9B8B7F;
  margin-bottom: 4rpx;
}

.member-stats {
  display: flex;
  gap: 16rpx;
  margin-top: 4rpx;
}

.stats-text {
  font-size: 22rpx;
  color: #6B5B4F;
  background: #F5F0E8;
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
}

.member-level {
  margin-left: 20rpx;
}

.level-tag {
  font-size: 22rpx;
  color: #D4A574;
  background: rgba(212, 165, 116, 0.15);
  padding: 8rpx 20rpx;
  border-radius: 8rpx;
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
