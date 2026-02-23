<template>
  <view class="finance-page">
    <view class="page-title">财务管理</view>

    <view class="section">
      <text class="section-title">提现审核</text>
      <view class="withdrawals-list">
        <view v-for="item in withdrawals" :key="item._id" class="withdrawal-item">
          <view class="info">
            <text class="amount">¥{{ (item.amount / 100).toFixed(2) }}</text>
            <text class="user">{{ item.userName || '未知' }}</text>
            <text class="time">{{ formatDate(item.createTime) }}</text>
          </view>
          <view class="actions">
            <button class="approve-btn" size="mini" @click="handleApprove(item._id)">批准</button>
            <button class="reject-btn" size="mini" @click="handleReject(item._id)">拒绝</button>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { callFunction } from '@/utils/cloudbase'

const withdrawals = ref<any[]>([])

onMounted(() => {
  loadWithdrawals()
})

const loadWithdrawals = async () => {
  try {
    const res = await callFunction('admin-api', {
      action: 'getWithdrawals',
      data: { status: 'pending', page: 1, limit: 20 }
    })
    if (res.result?.code === 0) {
      withdrawals.value = res.result.data.list || []
    }
  } catch (e) {
    console.error('加载提现失败', e)
  }
}

const formatDate = (date: string) => {
  return new Date(date).toLocaleString()
}

const handleApprove = async (id: string) => {
  try {
    const res = await callFunction('admin-api', {
      action: 'approveWithdrawal',
      data: { withdrawalId: id }
    })
    if (res.result?.code === 0) {
      uni.showToast({ title: '已批准', icon: 'success' })
      loadWithdrawals()
    }
  } catch (e) {
    uni.showToast({ title: '操作失败', icon: 'none' })
  }
}

const handleReject = async (id: string) => {
  uni.showModal({
    title: '确认拒绝',
    success: async (res) => {
      if (res.confirm) {
        try {
          const result = await callFunction('admin-api', {
            action: 'rejectWithdrawal',
            data: { withdrawalId: id, reason: '审核未通过' }
          })
          if (result.result?.code === 0) {
            uni.showToast({ title: '已拒绝', icon: 'success' })
            loadWithdrawals()
          }
        } catch (e) {
          uni.showToast({ title: '操作失败', icon: 'none' })
        }
      }
    }
  })
}
</script>

<style lang="scss" scoped>
.finance-page {
  padding: 20rpx;
}

.page-title {
  font-size: 36rpx;
  font-weight: bold;
  text-align: center;
  margin-bottom: 40rpx;
}

.section {
  background: #fff;
  border-radius: 12rpx;
  padding: 30rpx;
}

.section-title {
  font-size: 30rpx;
  font-weight: bold;
  margin-bottom: 25rpx;
}

.withdrawal-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20rpx;
  background: #f5f5f5;
  border-radius: 8rpx;
  margin-bottom: 15rpx;
}

.info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.amount {
  font-size: 30rpx;
  font-weight: bold;
  color: #C9A962;
}

.user {
  font-size: 24rpx;
  color: #666;
}

.time {
  font-size: 22rpx;
  color: #999;
}

.actions {
  display: flex;
  gap: 10rpx;
}

.approve-btn, .reject-btn {
  padding: 10rpx 20rpx;
  border-radius: 6rpx;
  font-size: 24rpx;
  border: none;
}

.approve-btn {
  background: #4CAF50;
  color: #fff;
}

.reject-btn {
  background: #F44336;
  color: #fff;
}
</style>
