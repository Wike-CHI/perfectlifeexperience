<template>
  <MainLayout>
    <view class="orders-page">
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

          <view class="filter-group">
            <text class="filter-label">订单号:</text>
            <input
              v-model="searchKeyword"
              class="search-input"
              placeholder="搜索订单号"
              @confirm="handleSearch"
            />
          </view>
        </view>

        <view class="action-row">
          <button class="search-btn" @click="handleSearch">搜索</button>
          <button class="reset-btn" @click="handleReset">重置</button>
        </view>
      </view>

      <!-- Orders Table -->
      <view class="table-container">
        <view class="table-header">
          <text class="col-orderNo">订单号</text>
          <text class="col-amount">金额</text>
          <text class="col-status">状态</text>
          <text class="col-time">创建时间</text>
          <text class="col-actions">操作</text>
        </view>

        <view class="table-body">
          <view
            v-for="order in orders"
            :key="order._id"
            class="table-row"
          >
            <text class="col-orderNo">{{ order.orderNo }}</text>
            <text class="col-amount">¥{{ (order.totalAmount / 100).toFixed(2) }}</text>
            <view class="col-status">
              <text :class="'status-' + order.status">
                {{ getStatusText(order.status) }}
              </text>
            </view>
            <text class="col-time">{{ formatDate(order.createTime) }}</text>
            <view class="col-actions">
              <button class="action-btn" size="mini" @click="handleViewDetail(order)">详情</button>
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

const orders = ref([]);
const statusOptions = ref(['全部', '待付款', '已付款', '发货中', '已完成', '已取消']);
const statusValues = ['all', 'pending', 'paid', 'shipping', 'completed', 'cancelled'];
const statusIndex = ref(0);
const searchKeyword = ref('');
const currentPage = ref(1);
const totalPages = ref(1);

const fetchOrders = async () => {
  try {
    const res = await app.callFunction({
      name: 'admin-api',
      data: {
        action: 'getOrders',
        data: {
          page: currentPage.value,
          limit: 20,
          status: statusValues[statusIndex.value],
          keyword: searchKeyword.value
        }
      }
    });

    if (res.result.code === 0) {
      orders.value = res.result.data.list;
      totalPages.value = res.result.data.totalPages;
    }
  } catch (error) {
    console.error('Fetch orders error:', error);
    uni.showToast({ title: '加载失败', icon: 'none' });
  }
};

const onStatusChange = (e: any) => {
  statusIndex.value = e.detail.value;
  currentPage.value = 1;
  fetchOrders();
};

const handleSearch = () => {
  currentPage.value = 1;
  fetchOrders();
};

const handleReset = () => {
  statusIndex.value = 0;
  searchKeyword.value = '';
  currentPage.value = 1;
  fetchOrders();
};

const changePage = (page: number) => {
  currentPage.value = page;
  fetchOrders();
};

const getStatusText = (status: string) => {
  const map = {
    pending: '待付款',
    paid: '已付款',
    shipping: '发货中',
    completed: '已完成',
    cancelled: '已取消'
  };
  return map[status] || status;
};

const formatDate = (date: Date) => {
  const d = new Date(date);
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
};

const handleViewDetail = (order: any) => {
  uni.navigateTo({
    url: `/pages/orders/detail/index?id=${order._id}`
  });
};

onMounted(() => {
  fetchOrders();
});
</script>

<style lang="scss" scoped>
@import "@/styles/variables.scss";

.orders-page {
  padding: $spacing-lg;
}

.filter-section {
  background-color: $bg-card;
  border-radius: $radius-md;
  padding: $spacing-lg;
  margin-bottom: $spacing-lg;
}

.filter-row {
  display: flex;
  gap: $spacing-lg;
  margin-bottom: $spacing-md;
}

.action-row {
  display: flex;
  gap: $spacing-md;
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

.search-input {
  width: 200px;
  height: 36px;
  background-color: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: $radius-sm;
  padding: 0 $spacing-md;
  color: $text-primary;
  font-size: 14px;
}

.search-btn, .reset-btn {
  height: 36px;
  padding: 0 $spacing-lg;
  border: none;
  border-radius: $radius-sm;
  font-size: 14px;
}

.search-btn {
  background-color: rgba($color-amber-gold, 0.2);
  color: $color-amber-gold;
}

.reset-btn {
  background-color: rgba(255, 255, 255, 0.1);
  color: $text-primary;
}

.table-container {
  background-color: $bg-card;
  border-radius: $radius-md;
  overflow: hidden;
}

.table-header {
  display: flex;
  background-color: rgba($color-amber-gold, 0.1);
  padding: $spacing-md;
  font-weight: 600;
  font-size: 14px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.table-row {
  display: flex;
  padding: $spacing-md;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  align-items: center;
}

.col-orderNo {
  flex: 2;
  font-size: 14px;
  font-family: $font-family-mono;
}

.col-amount {
  flex: 1;
  font-size: 14px;
  font-weight: 600;
}

.col-status {
  flex: 1;
}

.status-pending { color: #faad14; }
.status-paid { color: #1890ff; }
.status-shipping { color: #722ed1; }
.status-completed { color: #52c41a; }
.status-cancelled { color: #ff4d4f; }

.col-time {
  flex: 1;
  font-size: 12px;
  color: $text-secondary;
}

.col-actions {
  flex: 1;
}

.action-btn {
  width: 100%;
  height: 28px;
  background-color: rgba($color-amber-gold, 0.2);
  border: none;
  border-radius: $radius-sm;
  color: $color-amber-gold;
  font-size: 12px;
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
