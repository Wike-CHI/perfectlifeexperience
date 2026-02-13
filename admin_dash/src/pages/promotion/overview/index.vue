<template>
  <MainLayout>
    <view class="promotion-overview-page">
      <!-- Stats Cards -->
      <view class="stats-grid">
        <view class="stat-card">
          <text class="stat-value">{{ stats.totalPromoters || 0 }}</text>
          <text class="stat-label">推广员总数</text>
        </view>

        <view class="stat-card">
          <text class="stat-value">{{ stats.totalTeams || 0 }}</text>
          <text class="stat-label">团队总数</text>
        </view>

        <view class="stat-card">
          <text class="stat-value">{{ stats.totalRewards || 0 }}</text>
          <text class="stat-label">奖励发放</text>
        </view>
      </view>

      <!-- Recent Promotion Orders -->
      <view class="orders-card">
        <view class="card-header">
          <text class="card-title">最近推广订单</text>
        </view>

        <view class="orders-list">
          <view
            v-for="order in recentOrders"
            :key="order._id"
            class="order-item"
          >
            <text class="order-id">{{ order.orderId || '-' }}</text>
            <text class="buyer">{{ order.buyerId?.substring(0, 8) || '-' }}...</text>
            <text class="status">{{ order.status === 'processed' ? '已处理' : '待处理' }}</text>
          </view>
        </view>
      </view>
    </view>
  </MainLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { app } from '@/utils/cloudbase';
import MainLayout from '@/components/MainLayout.vue';

const stats = ref({
  totalPromoters: 0,
  totalTeams: 0,
  totalRewards: 0
});
const recentOrders = ref([]);

onMounted(async () => {
  await fetchStats();
});

const fetchStats = async () => {
  try {
    const res = await app.callFunction({
      name: 'admin-api',
      data: {
        action: 'getPromotionStats',
        data: {}
      }
    });

    if (res.result.code === 0) {
      stats.value = res.result.data;
      recentOrders.value = res.result.data.recentOrders || [];
    }
  } catch (error) {
    console.error('Fetch stats error:', error);
  }
};
</script>

<style lang="scss" scoped>
@use "@/styles/variables.scss" as *;

.promotion-overview-page {
  padding: $spacing-lg;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: $spacing-lg;
  margin-bottom: $spacing-lg;
}

.stat-card {
  background: linear-gradient(135deg, $bg-card 0%, rgba(201, 169, 98, 0.1) 100%);
  border-radius: $radius-md;
  padding: $spacing-lg;
  border: 1px solid rgba($color-amber-gold, 0.2);
  text-align: center;
}

.stat-value {
  font-family: $font-family-heading;
  font-size: 32px;
  font-weight: 600;
  color: $color-amber-gold;
  display: block;
  margin-bottom: $spacing-xs;
}

.stat-label {
  font-size: 14px;
  color: $text-secondary;
}

.orders-card {
  background-color: $bg-card;
  border-radius: $radius-md;
  overflow: hidden;
}

.card-header {
  padding: $spacing-lg;
  background-color: rgba($color-amber-gold, 0.1);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.card-title {
  font-family: $font-family-heading;
  font-size: 18px;
  color: $color-amber-gold;
}

.orders-list {
  padding: 0;
}

.order-item {
  display: flex;
  padding: $spacing-md $spacing-lg;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  font-size: 14px;
}

.order-id {
  flex: 2;
  font-family: $font-family-mono;
}

.buyer {
  flex: 1;
  color: $text-secondary;
}

.status {
  flex: 1;
  text-align: right;
}
</style>
