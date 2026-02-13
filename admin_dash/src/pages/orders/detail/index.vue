<template>
  <MainLayout>
    <view class="order-detail-page" v-if="order">
      <!-- Order Info Card -->
      <view class="info-card">
        <view class="card-header">
          <text class="card-title">订单详情</text>
          <view :class="'status-badge status-' + order.status">
            {{ getStatusText(order.status) }}
          </view>
        </view>

        <view class="info-row">
          <text class="label">订单号:</text>
          <text class="value">{{ order.orderNo }}</text>
        </view>

        <view class="info-row">
          <text class="label">创建时间:</text>
          <text class="value">{{ formatDateTime(order.createTime) }}</text>
        </view>

        <view class="info-row" v-if="order.payTime">
          <text class="label">支付时间:</text>
          <text class="value">{{ formatDateTime(order.payTime) }}</text>
        </view>

        <view class="info-row" v-if="order.shipTime">
          <text class="label">发货时间:</text>
          <text class="value">{{ formatDateTime(order.shipTime) }}</text>
        </view>

        <view class="info-row" v-if="order.completeTime">
          <text class="label">完成时间:</text>
          <text class="value">{{ formatDateTime(order.completeTime) }}</text>
        </view>
      </view>

      <!-- User Info Card -->
      <view class="info-card" v-if="user">
        <view class="card-header">
          <text class="card-title">用户信息</text>
        </view>

        <view class="info-row">
          <text class="label">昵称:</text>
          <text class="value">{{ user.nickName }}</text>
        </view>

        <view class="info-row">
          <text class="label">手机号:</text>
          <text class="value">{{ user.phone || '未绑定' }}</text>
        </view>

        <view class="info-row" v-if="order.address">
          <text class="label">地址:</text>
          <text class="value">{{ formatAddress(order.address) }}</text>
        </view>
      </view>

      <!-- Products Card -->
      <view class="products-card">
        <view class="card-header">
          <text class="card-title">商品列表</text>
        </view>

        <view
          v-for="(item, index) in order.items"
          :key="index"
          class="product-item"
        >
          <text class="product-name">{{ item.name || '商品' }}</text>
          <text class="product-specs" v-if="item.specs">{{ item.specs }}</text>
          <text class="product-quantity">x{{ item.quantity }}</text>
          <text class="product-price">¥{{ ((item.price * item.quantity) / 100).toFixed(2) }}</text>
        </view>

        <view class="total-row">
          <text class="total-label">订单总额:</text>
          <text class="total-value">¥{{ (order.totalAmount / 100).toFixed(2) }}</text>
        </view>
      </view>

      <!-- Status Actions -->
      <view class="actions-card" v-if="canUpdateStatus">
        <view class="card-header">
          <text class="card-title">状态操作</text>
        </view>

        <view class="action-buttons">
          <button
            v-if="order.status === 'paid'"
            class="action-btn"
            @click="updateStatus('shipping')"
          >标记发货</button>

          <button
            v-if="order.status === 'shipping'"
            class="action-btn"
            @click="updateStatus('completed')"
          >标记完成</button>

          <button
            v-if="order.status === 'pending'"
            class="action-btn cancel"
            @click="updateStatus('cancelled')"
          >取消订单</button>
        </view>
      </view>
    </view>
  </MainLayout>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { app } from '@/utils/cloudbase';
import MainLayout from '@/components/MainLayout.vue';

const orderId = ref('');
const order = ref(null);
const user = ref(null);

const canUpdateStatus = computed(() => {
  return order.value && ['pending', 'paid', 'shipping'].includes(order.value.status);
});

onMounted(async () => {
  const pages = getCurrentPages();
  const currentPage = pages[pages.length - 1];
  const options = currentPage.options as any;

  if (options.id) {
    orderId.value = options.id;
    await loadOrderDetail();
  }
});

const loadOrderDetail = async () => {
  try {
    const res = await app.callFunction({
      name: 'admin-api',
      data: {
        action: 'getOrderDetail',
        data: { id: orderId.value }
      }
    });

    if (res.result.code === 0) {
      order.value = res.result.data.order;
      user.value = res.result.data.user;
    }
  } catch (error) {
    console.error('Load order detail error:', error);
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

const formatDateTime = (date: Date) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

const formatAddress = (addr: any) => {
  if (!addr) return '无';
  return `${addr.province || ''}${addr.city || ''}${addr.district || ''}${addr.detail || ''}`;
};

const updateStatus = async (status: string) => {
  try {
    const res = await app.callFunction({
      name: 'admin-api',
      data: {
        action: 'updateOrderStatus',
        data: { orderId: orderId.value, status }
      }
    });

    if (res.result.code === 0) {
      uni.showToast({ title: '状态更新成功', icon: 'success' });
      await loadOrderDetail();
    } else {
      uni.showToast({ title: res.result.msg, icon: 'none' });
    }
  } catch (error) {
    console.error('Update status error:', error);
    uni.showToast({ title: '更新失败', icon: 'none' });
  }
};
</script>

<style lang="scss" scoped>
@import "@/styles/variables.scss";

.order-detail-page {
  padding: $spacing-lg;
}

.info-card, .products-card, .actions-card {
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

.status-badge {
  padding: $spacing-xs $spacing-md;
  border-radius: $radius-sm;
  font-size: 12px;
  font-weight: 600;
}

.status-pending { background-color: rgba(250, 173, 20, 0.2); color: #faad14; }
.status-paid { background-color: rgba(24, 144, 255, 0.2); color: #1890ff; }
.status-shipping { background-color: rgba(114, 46, 209, 0.2); color: #722ed1; }
.status-completed { background-color: rgba(82, 196, 26, 0.2); color: #52c41a; }
.status-cancelled { background-color: rgba(255, 77, 79, 0.2); color: #ff4d4f; }

.info-row {
  display: flex;
  padding: $spacing-md $spacing-lg;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.info-row:last-child {
  border-bottom: none;
}

.info-row .label {
  width: 120px;
  font-size: 14px;
  color: $text-secondary;
}

.info-row .value {
  flex: 1;
  font-size: 14px;
  color: $text-primary;
}

.product-item {
  display: flex;
  padding: $spacing-md $spacing-lg;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.product-name {
  flex: 2;
  font-size: 14px;
}

.product-specs {
  flex: 1;
  font-size: 12px;
  color: $text-secondary;
}

.product-quantity {
  width: 60px;
  text-align: center;
  font-size: 14px;
  color: $text-secondary;
}

.product-price {
  width: 100px;
  text-align: right;
  font-size: 14px;
  font-weight: 600;
}

.total-row {
  display: flex;
  justify-content: space-between;
  padding: $spacing-lg;
  background-color: rgba($color-amber-gold, 0.05);
}

.total-label {
  font-size: 16px;
  color: $text-primary;
}

.total-value {
  font-size: 20px;
  font-weight: 600;
  color: $color-amber-gold;
}

.action-buttons {
  display: flex;
  gap: $spacing-md;
  padding: $spacing-lg;
}

.action-btn {
  flex: 1;
  height: 44px;
  background: linear-gradient(135deg, $color-amber-gold 0%, #b8943d 100%);
  border: none;
  border-radius: $radius-sm;
  color: $bg-primary;
  font-size: 16px;
  font-weight: 600;
}

.action-btn.cancel {
  background-color: rgba(255, 77, 79, 0.2);
  color: #ff4d4f;
}
</style>
