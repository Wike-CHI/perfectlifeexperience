<template>
  <view class="transactions-page">
    <!-- 页面头部 -->
    <view class="page-header">
      <text class="page-title">库存流水</text>
    </view>

    <!-- 类型筛选 -->
    <scroll-view class="type-scroll" scroll-x enhanced show-scrollbar="false">
      <view class="type-tabs">
        <view
          v-for="tab in typeTabs"
          :key="tab.value"
          :class="['type-tab', { active: currentType === tab.value }]"
          @click="changeType(tab.value)"
        >
          {{ tab.label }}
        </view>
      </view>
    </scroll-view>

    <!-- 流水列表 -->
    <view class="transaction-list">
      <view v-for="tx in transactions" :key="tx._id" class="tx-item">
        <view class="tx-header">
          <view :class="['tx-type', tx.type]">
            {{ getTypeText(tx.type) }}
          </view>
          <text class="tx-time">{{ formatDateTime(tx.createTime) }}</text>
        </view>

        <view class="tx-info">
          <view class="info-row">
            <text class="info-label">商品</text>
            <text class="info-value">{{ tx.productName }}</text>
          </view>
          <view class="info-row">
            <text class="info-label">数量</text>
            <text :class="['info-value', 'quantity', getQuantityClass(tx.type)]">
              {{ getQuantityPrefix(tx.type) }}{{ tx.quantity }}
            </text>
          </view>
          <view class="info-row">
            <text class="info-label">库存变化</text>
            <text class="info-value">{{ tx.beforeStock }} → {{ tx.afterStock }}</text>
          </view>
          <view class="info-row" v-if="tx.relatedNo">
            <text class="info-label">关联单据</text>
            <text class="info-value">{{ tx.relatedNo }}</text>
          </view>
          <view class="info-row" v-if="tx.operatorName">
            <text class="info-label">操作人</text>
            <text class="info-value">{{ tx.operatorName }}</text>
          </view>
          <view class="info-row" v-if="tx.remark">
            <text class="info-label">备注</text>
            <text class="info-value">{{ tx.remark }}</text>
          </view>
        </view>
      </view>

      <!-- 空状态 -->
      <view v-if="transactions.length === 0 && !loading" class="empty-state">
        <AdminIcon name="document" size="large" />
        <text class="empty-text">暂无流水记录</text>
      </view>

      <!-- 加载状态 -->
      <view v-if="loading" class="loading-wrapper">
        <view class="loading-spinner"></view>
        <text class="loading-text">加载中...</text>
      </view>

      <!-- 加载更多 -->
      <view v-if="hasMore && !loading && transactions.length > 0" class="load-more" @click="loadMore">
        <text class="load-more-text">加载更多</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { onPullDownRefresh, onReachBottom } from '@dcloudio/uni-app'
import { callFunction } from '@/utils/cloudbase'
import AdminAuthManager from '@/utils/admin-auth'
import AdminIcon from '@/components/admin-icon.vue'

// 类型标签
const typeTabs = [
  { label: '全部', value: '' },
  { label: '采购入库', value: 'purchase_in' },
  { label: '销售出库', value: 'sale_out' },
  { label: '退款入库', value: 'refund_in' },
  { label: '库存调整', value: 'adjustment' },
  { label: '盘点盈亏', value: 'inventory_gain' }
]

const currentType = ref('')
const transactions = ref<any[]>([])
const loading = ref(false)
const page = ref(1)
const limit = 20
const hasMore = ref(true)

// 类型文本
const typeTextMap: Record<string, string> = {
  purchase_in: '采购入库',
  sale_out: '销售出库',
  refund_in: '退款入库',
  adjustment: '库存调整',
  inventory_gain: '盘点盈',
  inventory_loss: '盘点亏'
}

const getTypeText = (type: string) => typeTextMap[type] || type

// 数量前缀
const getQuantityPrefix = (type: string) => {
  if (['sale_out', 'inventory_loss'].includes(type)) return '-'
  return '+'
}

// 数量样式
const getQuantityClass = (type: string) => {
  if (['sale_out', 'inventory_loss'].includes(type)) return 'negative'
  return 'positive'
}

// 日期时间格式化
const formatDateTime = (date: string | Date) => {
  if (!date) return '-'
  const d = new Date(date)
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
}

// 生命周期
onMounted(() => {
  if (!AdminAuthManager.checkAuth()) return
  loadTransactions()
})

// 下拉刷新
onPullDownRefresh(async () => {
  page.value = 1
  hasMore.value = true
  await loadTransactions()
  uni.stopPullDownRefresh()
})

// 触底加载
onReachBottom(() => {
  if (hasMore.value && !loading.value) {
    loadMore()
  }
})

// 加载流水列表
const loadTransactions = async () => {
  if (loading.value) return
  loading.value = true

  try {
    const res = await callFunction('admin-api', {
      action: 'getInventoryTransactions',
      adminToken: AdminAuthManager.getToken(),
      data: {
        type: currentType.value || undefined,
        page: page.value,
        limit
      }
    })

    if (res.code === 0) {
      if (page.value === 1) {
        transactions.value = res.data.list || []
      } else {
        transactions.value = [...transactions.value, ...(res.data.list || [])]
      }
      hasMore.value = res.data.hasMore
    } else {
      uni.showToast({ title: res.msg || '加载失败', icon: 'none' })
    }
  } catch (e) {
    console.error('加载流水失败', e)
    uni.showToast({ title: '网络错误', icon: 'none' })
  } finally {
    loading.value = false
  }
}

// 切换类型
const changeType = (type: string) => {
  currentType.value = type
  page.value = 1
  hasMore.value = true
  loadTransactions()
}

// 加载更多
const loadMore = () => {
  page.value++
  loadTransactions()
}
</script>

<style lang="scss" scoped>
.transactions-page {
  min-height: 100vh;
  background: #0D0D0D;
  padding: 24rpx;
  padding-bottom: 120rpx;
}

.page-header {
  margin-bottom: 24rpx;
}

.page-title {
  font-size: 36rpx;
  font-weight: bold;
  color: #F5F5F0;
}

.type-scroll {
  margin-bottom: 20rpx;
  white-space: nowrap;
}

.type-tabs {
  display: inline-flex;
  gap: 12rpx;
}

.type-tab {
  display: inline-flex;
  align-items: center;
  padding: 14rpx 24rpx;
  background: rgba(255, 255, 255, 0.05);
  border: 1rpx solid rgba(201, 169, 98, 0.2);
  border-radius: 8rpx;
  font-size: 24rpx;
  color: rgba(245, 245, 240, 0.5);

  &.active {
    background: rgba(201, 169, 98, 0.2);
    border-color: #C9A962;
    color: #C9A962;
  }
}

.transaction-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.tx-item {
  background: rgba(255, 255, 255, 0.03);
  border-radius: 16rpx;
  border: 1rpx solid rgba(201, 169, 98, 0.1);
  padding: 24rpx;
}

.tx-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
  padding-bottom: 16rpx;
  border-bottom: 1rpx solid rgba(255, 255, 255, 0.05);
}

.tx-type {
  padding: 6rpx 16rpx;
  border-radius: 6rpx;
  font-size: 22rpx;

  &.purchase_in {
    background: rgba(122, 154, 142, 0.2);
    color: #7A9A8E;
  }

  &.sale_out {
    background: rgba(201, 169, 98, 0.2);
    color: #C9A962;
  }

  &.refund_in {
    background: rgba(100, 149, 237, 0.2);
    color: #6495ED;
  }

  &.adjustment {
    background: rgba(150, 150, 150, 0.2);
    color: #999;
  }

  &.inventory_gain {
    background: rgba(50, 205, 50, 0.2);
    color: #32CD32;
  }

  &.inventory_loss {
    background: rgba(184, 92, 92, 0.2);
    color: #B85C5C;
  }
}

.tx-time {
  font-size: 22rpx;
  color: rgba(245, 245, 240, 0.4);
}

.tx-info {
  display: flex;
  flex-direction: column;
  gap: 10rpx;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.info-label {
  font-size: 24rpx;
  color: rgba(245, 245, 240, 0.5);
}

.info-value {
  font-size: 24rpx;
  color: #F5F5F0;

  &.quantity {
    font-weight: bold;

    &.positive {
      color: #7A9A8E;
    }

    &.negative {
      color: #B85C5C;
    }
  }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 100rpx 0;
}

.empty-text {
  font-size: 28rpx;
  color: rgba(245, 245, 240, 0.5);
  margin-top: 20rpx;
}

.loading-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40rpx 0;
}

.loading-spinner {
  width: 40rpx;
  height: 40rpx;
  border: 3rpx solid rgba(201, 169, 98, 0.3);
  border-top-color: #C9A962;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-text {
  font-size: 24rpx;
  color: rgba(245, 245, 240, 0.5);
  margin-top: 16rpx;
}

.load-more {
  display: flex;
  justify-content: center;
  padding: 30rpx 0;
}

.load-more-text {
  font-size: 24rpx;
  color: #C9A962;
}
</style>
