<template>
  <MainLayout>
    <view class="team-page">
      <!-- Header Info -->
      <view class="header-info">
        <view class="promoter-card">
          <image v-if="promoterInfo.avatarUrl" :src="promoterInfo.avatarUrl" class="avatar" />
          <view v-else class="avatar-placeholder">{{ (promoterInfo.nickName || 'U')[0] }}</view>
          <view class="info">
            <text class="name">{{ promoterInfo.nickName || '未设置' }}</text>
            <view class="badges">
              <text class="badge badge-agent">{{ getAgentLevelText(promoterInfo.agentLevel) }}</text>
              <text class="badge badge-star">{{ getStarLevelText(promoterInfo.starLevel) }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- Team Stats -->
      <view class="team-stats">
        <view class="stat-item">
          <text class="stat-value">{{ teamStats.totalMembers }}</text>
          <text class="stat-label">团队成员</text>
        </view>
        <view class="stat-item">
          <text class="stat-value">{{ teamStats.directMembers }}</text>
          <text class="stat-label">直推成员</text>
        </view>
        <view class="stat-item">
          <text class="stat-value">{{ teamStats.activePromoters }}</text>
          <text class="stat-label">活跃推广员</text>
        </view>
        <view class="stat-item">
          <text class="stat-value">¥{{ formatMoney(teamStats.totalSales) }}</text>
          <text class="stat-label">团队销售</text>
        </view>
      </view>

      <!-- Filter -->
      <view class="filter-section">
        <view class="filter-group">
          <text class="filter-label">显示层级:</text>
          <picker
            mode="selector"
            :range="levelOptions"
            :value="levelIndex"
            @change="onLevelChange"
          >
            <view class="picker-value">{{ levelOptions[levelIndex] }}</view>
          </picker>
        </view>
      </view>

      <!-- Team Tree -->
      <view class="team-tree">
        <view class="tree-section" v-if="directMembers.length > 0">
          <view class="section-title">
            <text class="title-text">直推成员 ({{ directMembers.length }}人)</text>
          </view>
          <view class="member-list">
            <view
              v-for="member in directMembers"
              :key="member._id"
              class="member-card"
              @click="handleMemberClick(member)"
            >
              <image v-if="member.avatarUrl" :src="member.avatarUrl" class="member-avatar" />
              <view v-else class="member-avatar-placeholder">{{ (member.nickName || 'U')[0] }}</view>
              <view class="member-info">
                <text class="member-name">{{ member.nickName || '未设置' }}</text>
                <view class="member-stats">
                  <text class="stat">团队{{ member.performance?.teamCount || 0 }}人</text>
                  <text class="stat">销售¥{{ formatMoney(member.performance?.totalSales || 0) }}</text>
                </view>
              </view>
              <view class="member-level">
                <text class="level-badge">{{ getStarLevelText(member.starLevel) }}</text>
              </view>
              <text class="expand-icon" v-if="member.hasChildren">›</text>
            </view>
          </view>
        </view>

        <!-- Sub Teams (expanded view) -->
        <view
          v-for="(team, index) in subTeams"
          :key="'team-' + index"
          class="tree-section sub-team"
        >
          <view class="section-title sub-title">
            <text class="level-badge level-{{ team.level }}">{{ team.level }}级团队</text>
            <text class="title-text">{{ team.members.length }}人</text>
          </view>
          <view class="member-list">
            <view
              v-for="member in team.members"
              :key="member._id"
              class="member-card sub-member"
              @click="handleMemberClick(member)"
            >
              <image v-if="member.avatarUrl" :src="member.avatarUrl" class="member-avatar small" />
              <view v-else class="member-avatar-placeholder small">{{ (member.nickName || 'U')[0] }}</view>
              <view class="member-info">
                <text class="member-name">{{ member.nickName || '未设置' }}</text>
                <text class="member-sales">销售¥{{ formatMoney(member.performance?.totalSales || 0) }}</text>
              </view>
            </view>
          </view>
        </view>

        <!-- Empty State -->
        <view v-if="directMembers.length === 0" class="empty-state">
          <text class="empty-icon">👥</text>
          <text class="empty-text">暂无团队成员</text>
        </view>
      </view>
    </view>
  </MainLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { app } from '@/utils/cloudbase';
import MainLayout from '@/components/MainLayout.vue';

interface Member {
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
  hasChildren?: boolean;
}

const promoterId = ref('');

const promoterInfo = ref<Member>({
  _id: '',
  _openid: '',
  agentLevel: 0,
  starLevel: 0
});

const teamStats = ref({
  totalMembers: 0,
  directMembers: 0,
  activePromoters: 0,
  totalSales: 0
});

const directMembers = ref<Member[]>([]);
const subTeams = ref<any[]>([]);

const levelOptions = ref(['仅直推', '2级', '3级', '全部']);
const levelValues = [1, 2, 3, 0];
const levelIndex = ref(0);

onMounted(() => {
  const pages = getCurrentPages();
  const currentPage = pages[pages.length - 1];
  const options = currentPage.options as any;

  if (options.userId) {
    promoterId.value = options.userId;
    loadData();
  }
});

const loadData = async () => {
  await Promise.all([
    loadPromoterInfo(),
    loadTeamMembers()
  ]);
};

const loadPromoterInfo = async () => {
  try {
    const res = await app.callFunction({
      name: 'admin-api',
      data: {
        action: 'getUserDetail',
        data: { userId: promoterId.value }
      }
    });

    if (res.result?.code === 0 && res.result.data) {
      promoterInfo.value = res.result.data;
    }
  } catch (error) {
    console.error('加载推广员信息失败:', error);
  }
};

const loadTeamMembers = async () => {
  try {
    const levelsToShow = levelValues[levelIndex.value];
    const maxLevel = levelsToShow === 0 ? -1 : levelsToShow;

    const res = await app.callFunction({
      name: 'admin-api',
      data: {
        action: 'getTeamMembers',
        data: {
          userId: promoterId.value,
          maxLevel
        }
      }
    });

    if (res.result?.code === 0) {
      const data = res.result.data;
      teamStats.value = data.stats || teamStats.value;
      directMembers.value = (data.directMembers || []).map((m: Member) => ({
        ...m,
        hasChildren: (m.performance?.teamCount || 0) > 0
      }));
      subTeams.value = data.subTeams || [];

      // Filter sub-teams based on level selection
      if (levelsToShow > 0) {
        subTeams.value = subTeams.value.filter((t: any) => t.level <= levelsToShow);
      }
    }
  } catch (error) {
    console.error('加载团队成员失败:', error);
  }
};

const onLevelChange = (e: any) => {
  levelIndex.value = e.detail.value;
  loadTeamMembers();
};

const handleMemberClick = (member: Member) => {
  uni.navigateTo({
    url: `/pages/users/detail/index?id=${member._id}`
  });
};

const formatMoney = (amount: number) => {
  return (amount / 100).toFixed(2);
};

const getAgentLevelText = (level: number) => {
  const texts = ['总公司', '一级代理', '二级代理', '三级代理', '四级代理'];
  return texts[level] || '普通用户';
};

const getStarLevelText = (level: number) => {
  const texts = ['普通会员', '铜牌', '银牌', '金牌'];
  return texts[level] || '普通会员';
};
</script>

<style lang="scss" scoped>
@import '@/styles/variables.scss';

.team-page {
  padding: 20rpx;
  padding-bottom: 40rpx;
}

.header-info {
  margin-bottom: 20rpx;
}

.promoter-card {
  background: $card-bg;
  border-radius: $border-radius;
  padding: 30rpx;
  display: flex;
  align-items: center;
  gap: 25rpx;
  box-shadow: $box-shadow;
}

.avatar,
.avatar-placeholder {
  width: 100rpx;
  height: 100rpx;
  border-radius: 50%;
  border: 3rpx solid $primary-color;
}

.avatar-placeholder {
  background: linear-gradient(135deg, #C9A962, #D4A574);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 40rpx;
  color: $white;
  font-weight: bold;
}

.info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 10rpx;
}

.name {
  font-size: 32rpx;
  font-weight: 600;
  color: $text-primary;
}

.badges {
  display: flex;
  gap: 12rpx;
}

.badge {
  padding: 6rpx 16rpx;
  border-radius: $border-radius-sm;
  font-size: 22rpx;
  color: $white;
}

.badge-agent {
  background: linear-gradient(135deg, #3D2914, #5D4037);
}

.badge-star {
  background: linear-gradient(135deg, #C9A962, #FFD700);
}

.team-stats {
  display: flex;
  gap: 15rpx;
  margin-bottom: 20rpx;
}

.stat-item {
  flex: 1;
  background: $card-bg;
  border-radius: $border-radius;
  padding: 25rpx 20rpx;
  text-align: center;
  box-shadow: $box-shadow;
}

.stat-value {
  display: block;
  font-size: 32rpx;
  font-weight: 600;
  color: $primary-color;
  margin-bottom: 8rpx;
}

.stat-label {
  font-size: 24rpx;
  color: $text-secondary;
}

.filter-section {
  background: $card-bg;
  border-radius: $border-radius;
  padding: 25rpx;
  margin-bottom: 20rpx;
  box-shadow: $box-shadow;
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 15rpx;
}

.filter-label {
  font-size: 28rpx;
  color: $text-secondary;
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
  display: flex;
  align-items: center;
}

.team-tree {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.tree-section {
  background: $card-bg;
  border-radius: $border-radius;
  overflow: hidden;
  box-shadow: $box-shadow;
}

.sub-team {
  border-left: 4rpx solid $primary-color;
}

.section-title {
  padding: 25rpx 30rpx;
  background: $bg-secondary;
  border-bottom: 1rpx solid $border-color;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.sub-title {
  background: rgba(201, 169, 98, 0.1);
}

.title-text {
  font-size: 28rpx;
  font-weight: 600;
  color: $text-primary;
}

.level-badge {
  padding: 6rpx 15rpx;
  border-radius: $border-radius-sm;
  font-size: 22rpx;
  color: $white;

  &.level-2 { background: #FF9800; }
  &.level-3 { background: #2196F3; }
  &.level-4 { background: #9C27B0; }
}

.member-list {
  padding: 20rpx;
}

.member-card {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 25rpx;
  background: $bg-secondary;
  border-radius: $border-radius-sm;
  margin-bottom: 15rpx;

  &:last-child {
    margin-bottom: 0;
  }
}

.sub-member {
  padding: 20rpx;
  background: transparent;
  border-bottom: 1rpx solid $border-color;

  &:last-child {
    border-bottom: none;
  }
}

.member-avatar,
.member-avatar-placeholder {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  border: 2rpx solid $primary-color;

  &.small {
    width: 60rpx;
    height: 60rpx;
  }
}

.member-avatar-placeholder {
  background: linear-gradient(135deg, #C9A962, #D4A574);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28rpx;
  color: $white;
  font-weight: bold;

  &.small {
    font-size: 24rpx;
  }
}

.member-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.member-name {
  font-size: 28rpx;
  color: $text-primary;
  font-weight: 500;
}

.member-stats {
  display: flex;
  gap: 20rpx;
}

.stat {
  font-size: 24rpx;
  color: $text-secondary;
}

.member-sales {
  font-size: 24rpx;
  color: $primary-color;
}

.member-level {
  margin-right: 10rpx;
}

.expand-icon {
  font-size: 40rpx;
  color: $text-secondary;
  transform: rotate(0deg);
  transition: transform 0.3s;
}

.empty-state {
  padding: 100rpx;
  text-align: center;
  background: $card-bg;
  border-radius: $border-radius;
  box-shadow: $box-shadow;
}

.empty-icon {
  display: block;
  font-size: 100rpx;
  margin-bottom: 20rpx;
}

.empty-text {
  font-size: 28rpx;
  color: $text-secondary;
}
</style>
