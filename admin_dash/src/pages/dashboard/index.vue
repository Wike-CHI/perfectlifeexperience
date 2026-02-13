<template>
  <MainLayout>
    <div class="dashboard-overview">
      <div class="stat-grid">
        <div class="stat-card">
          <div class="label">Today's Sales</div>
          <div class="value">¥{{ stats.todaySales.toLocaleString() }}</div>
          <div class="trend up">↑ 12% vs yesterday</div>
        </div>
        <div class="stat-card">
          <div class="label">New Orders</div>
          <div class="value">{{ stats.todayOrders }}</div>
          <div class="trend up">↑ 5% vs yesterday</div>
        </div>
        <div class="stat-card">
          <div class="label">Total Users</div>
          <div class="value">{{ stats.totalUsers.toLocaleString() }}</div>
          <div class="trend">Stable</div>
        </div>
      </div>

      <div class="section-title">Pending Tasks</div>
      <div class="task-list">
        <div v-for="task in stats.pendingTasks" :key="task.type" class="task-item">
          <span class="task-name">{{ formatTaskName(task.type) }}</span>
          <span class="task-count">{{ task.count }}</span>
          <button class="task-action">View</button>
        </div>
      </div>
    </div>
  </MainLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import MainLayout from '@/components/MainLayout.vue';
import { app } from '@/utils/cloudbase';

const stats = ref({
  todaySales: 0,
  todayOrders: 0,
  totalUsers: 0,
  pendingTasks: [] as { type: string, count: number }[]
});

const formatTaskName = (type: string) => {
  const map: Record<string, string> = {
    shipment: 'Orders to Ship',
    withdrawal: 'Pending Withdrawals'
  };
  return map[type] || type;
};

const fetchDashboardData = async () => {
  try {
    // Call admin-api
    const res = await app.callFunction({
      name: 'admin-api',
      data: { action: 'getDashboardData' }
    });

    if (res.result && res.result.code === 0) {
      stats.value = res.result.data;
    } else {
      throw new Error(res.result?.msg || 'Failed to fetch dashboard data');
    }
  } catch (e) {
    console.error('Failed to fetch dashboard data:', e);
    throw e;
  }
};

onMounted(() => {
  fetchDashboardData();
});
</script>

<style lang="scss" scoped>
@use "@/styles/variables.scss" as *;

.dashboard-overview {
  padding: $spacing-lg;
}

.stat-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: $spacing-lg;
  margin-bottom: $spacing-xl;
}

.stat-card {
  background: $bg-card;
  padding: $spacing-lg;
  border-radius: $radius-md;
  box-shadow: 0 4px 16px rgba($color-deep-brown, 0.08);
  border: 1px solid rgba($color-amber-gold, 0.15);
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba($color-deep-brown, 0.15);
    border-color: rgba($color-amber-gold, 0.3);
  }

  .label {
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: $text-secondary;
    margin-bottom: $spacing-sm;
  }
  .value {
    font-family: $font-family-mono;
    font-size: 28px;
    font-weight: 700;
    background: linear-gradient(135deg, $color-deep-brown, $color-amber-gold);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    margin-bottom: $spacing-xs;
  }
  .trend {
    font-size: 12px;
    font-weight: 500;
    &.up {
      color: $color-sage-green;
    }
    &.down {
      color: $color-error-red;
    }
  }
}

.section-title {
  font-family: 'Playfair Display', 'PingFang SC', serif;
  font-size: 20px;
  margin-bottom: $spacing-md;
  color: $color-deep-brown;
  font-weight: 700;
  letter-spacing: 0.5px;
}

.task-list {
  background: $bg-card;
  border-radius: $radius-md;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba($color-deep-brown, 0.06);
  border: 1px solid rgba($color-amber-gold, 0.1);

  .task-item {
    display: flex;
    align-items: center;
    padding: $spacing-md $spacing-lg;
    border-bottom: 1px solid rgba($color-deep-brown, 0.05);
    transition: background-color 0.2s ease;

    &:last-child { border-bottom: none; }

    &:hover {
      background-color: rgba($color-amber-gold, 0.03);
    }

    .task-name {
      flex: 1;
      font-weight: 500;
      color: $text-primary;
    }
    .task-count {
      background: $gradient-warm;
      color: white;
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
      margin-right: $spacing-md;
      box-shadow: 0 2px 4px rgba($color-amber-gold, 0.2);
    }
    .task-action {
      border: 1px solid rgba($color-deep-brown, 0.2);
      background: none;
      padding: 6px 14px;
      border-radius: $radius-sm;
      cursor: pointer;
      font-size: 12px;
      transition: all 0.2s ease;
      color: $text-secondary;

      &:hover {
        background: $gradient-warm;
        border-color: transparent;
        color: white;
        transform: translateY(-1px);
        box-shadow: 0 2px 8px rgba($color-amber-gold, 0.2);
      }
    }
  }
}
</style>
