<template>
  <MainLayout>
    <view class="coupons-page">
      <!-- Header Actions -->
      <view class="header-actions">
        <button class="create-btn" @click="handleCreate">创建优惠券</button>
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

      <!-- Coupons List -->
      <view class="coupons-list">
        <view
          v-for="coupon in coupons"
          :key="coupon._id"
          class="coupon-card"
        >
          <view class="coupon-header">
            <text class="coupon-name">{{ coupon.name }}</text>
            <view class="coupon-status" :class="'status-' + (coupon.isActive ? 'active' : 'inactive')">
              {{ coupon.isActive ? '已启用' : '已禁用' }}
            </view>
          </view>

          <view class="coupon-info">
            <view class="info-row">
              <text class="info-label">类型:</text>
              <text class="info-value">{{ getTypeText(coupon.type) }}</text>
            </view>
            <view class="info-row">
              <text class="info-label">面值:</text>
              <text class="info-value coupon-amount">
                {{ coupon.type === 'percent' ? coupon.discount + '%' : '¥' + (coupon.discount / 100).toFixed(2) }}
              </text>
            </view>
            <view class="info-row">
              <text class="info-label">最低消费:</text>
              <text class="info-value">¥{{ (coupon.minAmount / 100).toFixed(2) }}</text>
            </view>
            <view class="info-row">
              <text class="info-label">有效期:</text>
              <text class="info-value">{{ formatDateRange(coupon) }}</text>
            </view>
            <view class="info-row">
              <text class="info-label">发放总量:</text>
              <text class="info-value">{{ coupon.totalIssued || 0 }} / {{ coupon.totalLimit || '无限制' }}</text>
            </view>
          </view>

          <view class="coupon-actions">
            <button class="action-btn edit-btn" size="mini" @click="handleEdit(coupon)">编辑</button>
            <button class="action-btn delete-btn" size="mini" @click="handleDelete(coupon)">删除</button>
          </view>
        </view>

        <view v-if="coupons.length === 0" class="empty-state">
          <text>暂无优惠券</text>
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

interface Coupon {
  _id: string;
  name: string;
  type: string;
  discount: number;
  minAmount: number;
  startTime: Date;
  endTime: Date;
  totalLimit?: number;
  totalIssued?: number;
  isActive: boolean;
}

const coupons = ref<Coupon[]>([]);
const statusOptions = ref(['全部', '已启用', '已禁用']);
const statusValues = ['all', 'active', 'inactive'];
const statusIndex = ref(0);

const currentPage = ref(1);
const totalPages = ref(1);
const pageSize = 20;

const fetchCoupons = async () => {
  try {
    const res = await app.callFunction({
      name: 'admin-api',
      data: {
        action: 'getCoupons',
        data: {
          status: statusValues[statusIndex.value],
          page: currentPage.value,
          limit: pageSize
        }
      }
    });

    if (res.result?.code === 0) {
      coupons.value = res.result.data.list || [];
      totalPages.value = Math.ceil((res.result.data.total || 0) / pageSize);
    } else {
      uni.showToast({
        title: res.result?.msg || '获取优惠券列表失败',
        icon: 'none'
      });
    }
  } catch (error) {
    console.error('获取优惠券列表失败:', error);
    uni.showToast({
      title: '获取优惠券列表失败',
      icon: 'none'
    });
  }
};

const onStatusChange = (e: any) => {
  statusIndex.value = e.detail.value;
  currentPage.value = 1;
  fetchCoupons();
};

const changePage = (page: number) => {
  if (page < 1 || page > totalPages.value) return;
  currentPage.value = page;
  fetchCoupons();
};

const handleCreate = () => {
  uni.navigateTo({
    url: '/pages/marketing/coupons/edit/index'
  });
};

const handleEdit = (coupon: Coupon) => {
  uni.navigateTo({
    url: `/pages/marketing/coupons/edit/index?id=${coupon._id}`
  });
};

const handleDelete = async (coupon: Coupon) => {
  uni.showModal({
    title: '确认删除',
    content: `确定要删除优惠券"${coupon.name}"吗？`,
    success: async (res) => {
      if (res.confirm) {
        try {
          const result = await app.callFunction({
            name: 'admin-api',
            data: {
              action: 'deleteCoupon',
              data: { id: coupon._id }
            }
          });

          if (result.result?.code === 0) {
            uni.showToast({
              title: '删除成功',
              icon: 'success'
            });
            fetchCoupons();
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

const getTypeText = (type: string) => {
  const typeMap: Record<string, string> = {
    percent: '折扣券',
    fixed: '满减券'
  };
  return typeMap[type] || type;
};

const formatDateRange = (coupon: Coupon) => {
  const start = new Date(coupon.startTime);
  const end = new Date(coupon.endTime);
  return `${start.getMonth() + 1}/${start.getDate()} - ${end.getMonth() + 1}/${end.getDate()}`;
};

onMounted(() => {
  fetchCoupons();
});
</script>

<style lang="scss" scoped>
@import '@/styles/variables.scss';

.coupons-page {
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

.coupons-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.coupon-card {
  background: $card-bg;
  border-radius: $border-radius;
  padding: 30rpx;
  box-shadow: $box-shadow;
}

.coupon-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20rpx;
  padding-bottom: 15rpx;
  border-bottom: 1rpx solid $border-color;
}

.coupon-name {
  font-size: 32rpx;
  font-weight: 600;
  color: $text-primary;
}

.coupon-status {
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

.coupon-info {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
  margin-bottom: 20rpx;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.info-label {
  font-size: 26rpx;
  color: $text-secondary;
}

.info-value {
  font-size: 26rpx;
  color: $text-primary;
}

.coupon-amount {
  font-size: 32rpx;
  font-weight: 600;
  color: $primary-color;
}

.coupon-actions {
  display: flex;
  gap: 15rpx;
  padding-top: 15rpx;
  border-top: 1rpx solid $border-color;
}

.action-btn {
  flex: 1;
  padding: 15rpx;
  border-radius: $border-radius-sm;
  font-size: 26rpx;
  border: none;
}

.edit-btn {
  background: $primary-color;
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
