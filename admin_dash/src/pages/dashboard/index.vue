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
    // Attempt to call admin-api
    const res = await app.callFunction({
      name: 'admin-api',
      data: { action: 'getDashboardData' }
    });
    
    if (res.result && res.result.code === 0) {
      stats.value = res.result.data;
    } else {
      console.warn('Using mock data due to API failure');
      // Fallback to mock data if function not deployed yet
      stats.value = {
        todaySales: 12800,
        todayOrders: 45,
        totalUsers: 1205,
        pendingTasks: [
          { type: 'shipment', count: 12 },
          { type: 'withdrawal', count: 5 }
        ]
      };
    }
  } catch (e) {
    console.error('Failed to fetch dashboard data:', e);
    // Fallback to mock data
     stats.value = {
        todaySales: 12800,
        todayOrders: 45,
        totalUsers: 1205,
        pendingTasks: [
          { type: 'shipment', count: 12 },
          { type: 'withdrawal', count: 5 }
        ]
      };
  }
};

onMounted(() => {
  fetchDashboardData();
});
</script>

<style lang="scss" scoped>
@import "@/styles/variables.scss";

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
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
  border: 1px solid rgba(0,0,0,0.05);

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
    font-weight: 600;
    color: $color-obsidian-black;
    margin-bottom: $spacing-xs;
  }
  .trend {
    font-size: 12px;
    &.up { color: $color-success-green; }
    &.down { color: $color-error-red; }
  }
}

.section-title {
  font-family: $font-family-heading;
  font-size: 20px;
  margin-bottom: $spacing-md;
  color: $color-obsidian-black;
}

.task-list {
  background: $bg-card;
  border-radius: $radius-md;
  overflow: hidden;
  
  .task-item {
    display: flex;
    align-items: center;
    padding: $spacing-md $spacing-lg;
    border-bottom: 1px solid rgba(0,0,0,0.05);
    
    &:last-child { border-bottom: none; }

    .task-name {
      flex: 1;
      font-weight: 500;
    }
    .task-count {
      background: $color-amber-gold;
      color: white;
      padding: 2px 8px;
      border-radius: 10px;
      font-size: 12px;
      margin-right: $spacing-md;
    }
    .task-action {
      border: 1px solid $text-secondary;
      background: none;
      padding: 4px 12px;
      border-radius: $radius-sm;
      cursor: pointer;
      font-size: 12px;
      &:hover {
        background: $text-secondary;
        color: white;
      }
    }
  }
}
</style>
