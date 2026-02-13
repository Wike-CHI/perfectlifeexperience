<template>
  <MainLayout>
    <view class="dashboard-page">
      <!-- Stats Cards -->
      <view class="stats-grid">
        <view class="stat-card">
          <text class="stat-label">今日销售额</text>
          <text class="stat-value">¥{{ (dashboardData.todaySales / 100).toFixed(2) }}</text>
          <text class="stat-sub">{{ dashboardData.todayOrders }}笔订单</text>
        </view>

        <view class="stat-card">
          <text class="stat-label">本月销售额</text>
          <text class="stat-value">¥{{ (dashboardData.monthSales / 100).toFixed(2) }}</text>
          <text class="stat-sub">{{ dashboardData.monthOrders }}笔订单</text>
        </view>

        <view class="stat-card">
          <text class="stat-label">总用户数</text>
          <text class="stat-value">{{ dashboardData.totalUsers }}</text>
          <text class="stat-sub">注册用户</text>
        </view>

        <view class="stat-card">
          <text class="stat-label">待处理</text>
          <text class="stat-value">{{ pendingCount }}</text>
          <text class="stat-sub">任务</text>
        </view>
      </view>

      <!-- Pending Tasks -->
      <view class="tasks-card" v-if="hasPendingTasks">
        <view class="card-header">
          <text class="card-title">待处理任务</text>
        </view>

        <view class="tasks-list">
          <view
            v-for="task in dashboardData.pendingTasks"
            :key="task.type"
            class="task-item"
            @click="handleTaskClick(task)"
          >
            <view class="task-icon">{{ getTaskIcon(task.type) }}</view>
            <view class="task-info">
              <text class="task-name">{{ getTaskName(task.type) }}</text>
              <text class="task-count">{{ task.count }}条待处理</text>
            </view>
            <text class="task-arrow">→</text>
          </view>
        </view>
      </view>

      <!-- Recent Orders -->
      <view class="orders-card">
        <view class="card-header">
          <text class="card-title">最近订单</text>
          <button class="view-all-btn" @click="viewAllOrders">查看全部</button>
        </view>

        <view class="orders-list">
          <view
            v-for="order in dashboardData.recentOrders"
            :key="order._id"
            class="order-item"
            @click="viewOrderDetail(order)"
          >
            <view class="order-info">
              <text class="order-no">{{ order.orderNo }}</text>
              <text class="order-time">{{ formatTime(order.createTime) }}</text>
            </view>

            <view class="order-details">
              <text class="order-amount">¥{{ (order.totalAmount / 100).toFixed(2) }}</text>
              <view :class="'order-status status-' + order.status">
                {{ getStatusText(order.status) }}
              </view>
            </view>
          </view>
        </view>
      </view>
    </view>
  </MainLayout>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { app } from '@/utils/cloudbase';
import MainLayout from '@/components/MainLayout.vue';

const dashboardData = ref({
  todaySales: 0,
  todayOrders: 0,
  monthSales: 0,
  monthOrders: 0,
  totalUsers: 0,
  pendingTasks: [],
  recentOrders: []
});

const pendingCount = computed(() => {
  return dashboardData.value.pendingTasks.reduce((sum: number, task: any) => sum + task.count, 0);
});

const hasPendingTasks = computed(() => {
  return pendingCount.value > 0;
});

onMounted(async () => {
  await fetchDashboardData();
});

const fetchDashboardData = async () => {
  try {
    const res = await app.callFunction({
      name: 'admin-api',
      data: {
        action: 'getDashboardData',
        data: {}
      }
    });

    if (res.result.code === 0) {
      dashboardData.value = res.result.data;
    }
  } catch (error) {
    console.error('Fetch dashboard data error:', error);
    uni.showToast({ title: '加载失败', icon: 'none' });
  }
};

const formatTime = (date: Date) => {
  const d = new Date(date);
  const now = new Date();
  const diff = now.getTime() - d.getTime();

  if (diff < 3600000) {
    return Math.floor(diff / 60000) + '分钟前';
  } else if (diff < 86400000) {
    return Math.floor(diff / 3600000) + '小时前';
  } else {
    return `${d.getMonth() + 1}/${d.getDate()}`;
  }
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

const getTaskIcon = (type: string) => {
  return type === 'shipment' ? '📦' : '💰';
};

const getTaskName = (type: string) => {
  return type === 'shipment' ? '待发货订单' : '提现申请';
};

const handleTaskClick = (task: any) => {
  if (task.type === 'shipment') {
    uni.navigateTo({ url: '/pages/orders/list/index?status=shipping' });
  }
};

const viewAllOrders = () => {
  uni.navigateTo({ url: '/pages/orders/list/index' });
};

const viewOrderDetail = (order: any) => {
  uni.navigateTo({
    url: `/pages/orders/detail/index?id=${order._id}`
  });
};
</script>

<style lang="scss" scoped>
@use "@/styles/variables.scss" as *;

.dashboard-page {
  padding: $spacing-lg;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: $spacing-lg;
  margin-bottom: $spacing-lg;
}

.stat-card {
  background: linear-gradient(135deg, $bg-card 0%, rgba(201, 169, 98, 0.1) 100%);
  border-radius: $radius-lg;
  padding: $spacing-lg;
  border: 1px solid rgba($color-amber-gold, 0.2);
}

.stat-label {
  font-size: 14px;
  color: $text-secondary;
  margin-bottom: $spacing-sm;
}

.stat-value {
  font-family: $font-family-heading;
  font-size: 32px;
  font-weight: 600;
  color: $color-amber-gold;
  display: block;
  margin-bottom: $spacing-xs;
}

.stat-sub {
  font-size: 12px;
  color: $text-secondary;
}

.tasks-card, .orders-card {
  background-color: $bg-card;
  border-radius: $radius-md;
  margin-bottom: $spacing-lg;
  overflow: hidden;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: $spacing-lg;
  background-color: rgba($color-amber-gold, 0.1);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.card-title {
  font-family: $font-family-heading;
  font-size: 18px;
  color: $color-amber-gold;
}

.view-all-btn {
  height: 32px;
  padding: 0 $spacing-md;
  background-color: rgba($color-amber-gold, 0.2);
  border: none;
  border-radius: $radius-sm;
  color: $color-amber-gold;
  font-size: 12px;
}

.tasks-list {
  padding: 0;
}

.task-item {
  display: flex;
  align-items: center;
  padding: $spacing-lg;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  cursor: pointer;
}

.task-item:hover {
  background-color: rgba(255, 255, 255, 0.02);
}

.task-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  background-color: rgba($color-amber-gold, 0.1);
  border-radius: $radius-md;
  margin-right: $spacing-md;
}

.task-info {
  flex: 1;
}

.task-name {
  display: block;
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 4px;
}

.task-count {
  font-size: 14px;
  color: $text-secondary;
}

.task-arrow {
  font-size: 20px;
  color: $text-secondary;
}

.orders-list {
  padding: 0;
}

.order-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: $spacing-lg;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  cursor: pointer;
}

.order-item:hover {
  background-color: rgba(255, 255, 255, 0.02);
}

.order-info {
  flex: 1;
}

.order-no {
  display: block;
  font-family: $font-family-mono;
  font-size: 14px;
  margin-bottom: 4px;
}

.order-time {
  font-size: 12px;
  color: $text-secondary;
}

.order-details {
  display: flex;
  align-items: center;
  gap: $spacing-md;
}

.order-amount {
  font-size: 16px;
  font-weight: 600;
}

.order-status {
  padding: 4px $spacing-sm;
  border-radius: $radius-sm;
  font-size: 12px;
}

.status-pending { background-color: rgba(250, 173, 20, 0.2); color: #faad14; }
.status-paid { background-color: rgba(24, 144, 255, 0.2); color: #1890ff; }
.status-shipping { background-color: rgba(114, 46, 209, 0.2); color: #722ed1; }
.status-completed { background-color: rgba(82, 196, 26, 0.2); color: #52c41a; }

@media (max-width: 1024px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
