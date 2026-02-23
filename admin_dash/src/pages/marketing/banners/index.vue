<template>
  <MainLayout>
    <view class="banners-page">
      <!-- Header Actions -->
      <view class="header-actions">
        <button class="create-btn" @click="handleCreate">添加Banner</button>
      </view>

      <!-- Filter Section -->
      <view class="filter-section">
        <view class="filter-row">
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
      </view>

      <!-- Banners List -->
      <view class="banners-list">
        <view
          v-for="banner in banners"
          :key="banner._id"
          class="banner-card"
        >
          <view class="banner-image-wrapper">
            <image
              v-if="banner.imageUrl"
              :src="banner.imageUrl"
              class="banner-image"
              mode="aspectFill"
            />
            <view v-else class="banner-placeholder">
              <text>暂无图片</text>
            </view>
            <view class="banner-sort">{{ banner.sort }}</view>
            <view class="banner-status" :class="'status-' + (banner.isActive ? 'active' : 'inactive')">
              {{ banner.isActive ? '已启用' : '已禁用' }}
            </view>
          </view>

          <view class="banner-info">
            <text class="banner-title">{{ banner.title || '未设置标题' }}</text>
            <text class="banner-link">跳转: {{ banner.link || '无' }}</text>
          </view>

          <view class="banner-actions">
            <button class="action-btn edit-btn" size="mini" @click="handleEdit(banner)">编辑</button>
            <button
              class="action-btn toggle-btn"
              size="mini"
              @click="handleToggleStatus(banner)"
            >
              {{ banner.isActive ? '禁用' : '启用' }}
            </button>
            <button class="action-btn delete-btn" size="mini" @click="handleDelete(banner)">删除</button>
          </view>
        </view>

        <view v-if="banners.length === 0" class="empty-state">
          <text>暂无Banner</text>
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

interface Banner {
  _id: string;
  title: string;
  imageUrl?: string;
  link?: string;
  sort: number;
  isActive: boolean;
}

const banners = ref<Banner[]>([]);
const statusOptions = ref(['全部', '已启用', '已禁用']);
const statusValues = ['all', 'active', 'inactive'];
const statusIndex = ref(0);

const currentPage = ref(1);
const totalPages = ref(1);
const pageSize = 20;

const fetchBanners = async () => {
  try {
    const res = await app.callFunction({
      name: 'admin-api',
      data: {
        action: 'getBanners',
        data: {
          status: statusValues[statusIndex.value],
          page: currentPage.value,
          limit: pageSize
        }
      }
    });

    if (res.result?.code === 0) {
      banners.value = res.result.data.list || [];
      totalPages.value = Math.ceil((res.result.data.total || 0) / pageSize);
    } else {
      uni.showToast({
        title: res.result?.msg || '获取Banner列表失败',
        icon: 'none'
      });
    }
  } catch (error) {
    console.error('获取Banner列表失败:', error);
    uni.showToast({
      title: '获取Banner列表失败',
      icon: 'none'
    });
  }
};

const onStatusChange = (e: any) => {
  statusIndex.value = e.detail.value;
  currentPage.value = 1;
  fetchBanners();
};

const changePage = (page: number) => {
  if (page < 1 || page > totalPages.value) return;
  currentPage.value = page;
  fetchBanners();
};

const handleCreate = () => {
  uni.navigateTo({
    url: '/pages/marketing/banners/edit/index'
  });
};

const handleEdit = (banner: Banner) => {
  uni.navigateTo({
    url: `/pages/marketing/banners/edit/index?id=${banner._id}`
  });
};

const handleToggleStatus = async (banner: Banner) => {
  try {
    const result = await app.callFunction({
      name: 'admin-api',
      data: {
        action: 'updateBanner',
        data: {
          id: banner._id,
          isActive: !banner.isActive
        }
      }
    });

    if (result.result?.code === 0) {
      uni.showToast({
        title: '状态更新成功',
        icon: 'success'
      });
      fetchBanners();
    } else {
      uni.showToast({
        title: result.result?.msg || '更新失败',
        icon: 'none'
      });
    }
  } catch (error) {
    console.error('更新失败:', error);
    uni.showToast({
      title: '更新失败',
      icon: 'none'
    });
  }
};

const handleDelete = async (banner: Banner) => {
  uni.showModal({
    title: '确认删除',
    content: `确定要删除Banner"${banner.title || '未设置标题'}"吗？`,
    success: async (res) => {
      if (res.confirm) {
        try {
          const result = await app.callFunction({
            name: 'admin-api',
            data: {
              action: 'deleteBanner',
              data: { id: banner._id }
            }
          });

          if (result.result?.code === 0) {
            uni.showToast({
              title: '删除成功',
              icon: 'success'
            });
            fetchBanners();
          } else {
            uni.showToast({
              title: result.result?.msg || '删除失败',
              icon: 'none'
            });
          }
        } catch (error) {
          console.error('删除失败:', error);
          uni.showToast({
            title: '删除失败',
            icon: 'none'
          });
        }
      }
    }
  });
};

onMounted(() => {
  fetchBanners();
});
</script>

<style lang="scss" scoped>
@import '@/styles/variables.scss';

.banners-page {
  padding: 20rpx;
}

.header-actions {
  margin-bottom: 20rpx;
}

.create-btn {
  width: 100%;
  padding: 25rpx;
  background: $primary-color;
  color: $white;
  border: none;
  border-radius: $border-radius;
  font-size: 30rpx;
  font-weight: 600;
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
  gap: 20rpx;
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 10rpx;
  flex: 1;
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
}

.banners-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.banner-card {
  background: $card-bg;
  border-radius: $border-radius;
  overflow: hidden;
  box-shadow: $box-shadow;
}

.banner-image-wrapper {
  position: relative;
  width: 100%;
  height: 400rpx;
}

.banner-image {
  width: 100%;
  height: 100%;
}

.banner-placeholder {
  width: 100%;
  height: 100%;
  background: $bg-secondary;
  display: flex;
  align-items: center;
  justify-content: center;
  color: $text-secondary;
  font-size: 28rpx;
}

.banner-sort {
  position: absolute;
  top: 20rpx;
  left: 20rpx;
  background: rgba(0, 0, 0, 0.6);
  color: $white;
  padding: 8rpx 15rpx;
  border-radius: $border-radius-sm;
  font-size: 24rpx;
}

.banner-status {
  position: absolute;
  top: 20rpx;
  right: 20rpx;
  padding: 8rpx 20rpx;
  border-radius: $border-radius-sm;
  font-size: 24rpx;
  color: $white;

  &.status-active {
    background: #4CAF50;
  }

  &.status-inactive {
    background: #9E9E9E;
  }
}

.banner-info {
  padding: 20rpx;
  display: flex;
  flex-direction: column;
  gap: 10rpx;
}

.banner-title {
  font-size: 30rpx;
  font-weight: 600;
  color: $text-primary;
}

.banner-link {
  font-size: 24rpx;
  color: $text-secondary;
}

.banner-actions {
  display: flex;
  gap: 10rpx;
  padding: 20rpx;
  padding-top: 0;
}

.action-btn {
  flex: 1;
  padding: 15rpx;
  border-radius: $border-radius-sm;
  font-size: 24rpx;
  border: none;
}

.edit-btn {
  background: $primary-color;
  color: $white;
}

.toggle-btn {
  background: #FF9800;
  color: $white;
}

.delete-btn {
  background: #F44336;
  color: $white;
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
