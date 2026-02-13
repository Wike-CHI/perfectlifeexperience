<template>
  <MainLayout>
    <view class="announcements-page">
      <!-- Header -->
      <view class="page-header">
        <text class="page-title">公告管理</text>
        <button class="add-btn" @click="handleAdd">发布公告</button>
      </view>

      <!-- Filter Section -->
      <view class="filter-section">
        <view class="filter-group">
          <text class="filter-label">类型:</text>
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
          <text class="filter-label">状态:</text>
          <picker
            mode="selector"
            :range="statusOptions"
            :value="statusIndex"
            @change="onStatusChange"
          >
            <view class="picker-value">{{ statusOptions[statusIndex] }}</view>
          </picker>
        </view>
      </view>

      <!-- Announcements List -->
      <view class="list-container">
        <view
          v-for="item in announcements"
          :key="item._id"
          class="announcement-item"
          @click="handleEdit(item)"
        >
          <view class="item-header">
            <text class="title">{{ item.title }}</text>
            <view :class="'badge type-' + item.type">
              {{ getTypeText(item.type) }}
            </view>
          </view>

          <view class="item-content">
            <text class="content-preview">{{ item.content }}</text>
          </view>

          <view class="item-footer">
            <text class="time">{{ formatDateTime(item.createTime) }}</text>
            <view class="meta-info">
              <text :class="'status ' + (item.isActive ? 'active' : 'inactive')">
                {{ item.isActive ? '已发布' : '草稿' }}
              </text>
              <text class="priority">优先级: {{ item.priority }}</text>
            </view>
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

const announcements = ref([]);
const typeOptions = ref(['全部', '系统公告', '推广活动', '优惠活动']);
const typeValues = ['all', 'system', 'promotion', 'discount'];
const typeIndex = ref(0);
const statusOptions = ref(['全部', '已发布', '草稿']);
const statusValues = ['all', 'active', 'inactive'];
const statusIndex = ref(0);
const currentPage = ref(1);
const totalPages = ref(1);

const fetchAnnouncements = async () => {
  try {
    const res = await app.callFunction({
      name: 'admin-api',
      data: {
        action: 'getAnnouncements',
        data: {
          page: currentPage.value,
          limit: 20,
          type: typeValues[typeIndex.value],
          status: statusValues[statusIndex.value]
        }
      }
    });

    if (res.result.code === 0) {
      announcements.value = res.result.data.list;
      totalPages.value = res.result.data.totalPages;
    }
  } catch (error) {
    console.error('Fetch announcements error:', error);
    uni.showToast({ title: '加载失败', icon: 'none' });
  }
};

const onTypeChange = (e: any) => {
  typeIndex.value = e.detail.value;
  currentPage.value = 1;
  fetchAnnouncements();
};

const onStatusChange = (e: any) => {
  statusIndex.value = e.detail.value;
  currentPage.value = 1;
  fetchAnnouncements();
};

const changePage = (page: number) => {
  currentPage.value = page;
  fetchAnnouncements();
};

const getTypeText = (type: string) => {
  const map = { system: '系统', promotion: '推广', discount: '优惠' };
  return map[type] || type;
};

const formatDateTime = (date: Date) => {
  const d = new Date(date);
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
};

const handleAdd = () => {
  uni.navigateTo({ url: '/pages/announcements/edit/index' });
};

const handleEdit = (item: any) => {
  uni.navigateTo({ url: `/pages/announcements/edit/index?id=${item._id}` });
};

onMounted(() => {
  fetchAnnouncements();
});
</script>

<style lang="scss" scoped>
@import "@/styles/variables.scss";

.announcements-page {
  padding: $spacing-lg;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: $spacing-lg;
}

.page-title {
  font-family: $font-family-heading;
  font-size: 24px;
  color: $color-amber-gold;
}

.add-btn {
  height: 40px;
  padding: 0 $spacing-xl;
  background: linear-gradient(135deg, $color-amber-gold 0%, #b8943d 100%);
  border: none;
  border-radius: $radius-sm;
  color: $bg-primary;
  font-size: 14px;
  font-weight: 600;
}

.filter-section {
  display: flex;
  gap: $spacing-lg;
  background-color: $bg-card;
  border-radius: $radius-md;
  padding: $spacing-lg;
  margin-bottom: $spacing-lg;
}

.filter-group {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
}

.filter-label {
  font-size: 14px;
  color: $text-secondary;
}

.picker-value {
  padding: $spacing-xs $spacing-md;
  background-color: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: $radius-sm;
  font-size: 14px;
  min-width: 100px;
}

.list-container {
  display: flex;
  flex-direction: column;
  gap: $spacing-md;
}

.announcement-item {
  background-color: $bg-card;
  border-radius: $radius-md;
  padding: $spacing-lg;
  cursor: pointer;
}

.announcement-item:hover {
  background-color: rgba(255, 255, 255, 0.02);
}

.item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: $spacing-sm;
}

.title {
  font-size: 16px;
  font-weight: 600;
  color: $text-primary;
}

.badge {
  padding: 4px $spacing-sm;
  border-radius: $radius-sm;
  font-size: 12px;
}

.type-system { background-color: rgba(24, 144, 255, 0.2); color: #1890ff; }
.type-promotion { background-color: rgba($color-amber-gold, 0.2); color: $color-amber-gold; }
.type-discount { background-color: rgba(255, 77, 79, 0.2); color: #ff4d4f; }

.item-content {
  margin-bottom: $spacing-md;
}

.content-preview {
  font-size: 14px;
  color: $text-secondary;
  line-height: 1.6;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
}

.item-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: $spacing-md;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
}

.time {
  font-size: 12px;
  color: $text-secondary;
}

.meta-info {
  display: flex;
  gap: $spacing-lg;
  font-size: 12px;
}

.status {
  color: $text-secondary;
}

.status.active {
  color: #52c41a;
}

.status.inactive {
  color: #faad14;
}

.priority {
  color: $text-secondary;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: $spacing-lg;
  margin-top: $spacing-lg;
}

.pagination button {
  height: 36px;
  padding: 0 $spacing-lg;
  background-color: $bg-card;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: $radius-sm;
  color: $text-primary;
  font-size: 14px;
}

.pagination button:disabled {
  opacity: 0.3;
}

.page-info {
  font-size: 14px;
  color: $text-secondary;
}
</style>
