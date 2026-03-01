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
import AdminAuthManager from '@/utils/admin-auth'

const withdrawals = ref<any[]>([])

onMounted(() => {
  if (!AdminAuthManager.checkAuth()) return
  loadWithdrawals()
})

const loadWithdrawals = async () => {
  try {
    uni.showLoading({ title: '加载中...' })

    const res = await callFunction('admin-api', {
      action: 'getWithdrawals',
      adminToken: AdminAuthManager.getToken(),
      data: { status: 'pending', page: 1, limit: 20 }
    })

    uni.hideLoading()

    if (res.code === 0 && res.data) {
      withdrawals.value = res.data.list || []
    } else {
      uni.showToast({ title: res.msg || '加载失败', icon: 'none' })
    }
  } catch (e) {
    uni.hideLoading()
    console.error('加载提现失败', e)
    uni.showToast({ title: '网络错误', icon: 'none' })
  }
}

const formatDate = (date: string) => {
  return new Date(date).toLocaleString()
}

const handleApprove = async (id: string) => {
  try {
    uni.showLoading({ title: '处理中...' })

    const res = await callFunction('admin-api', {
      action: 'approveWithdrawal',
      adminToken: AdminAuthManager.getToken(),
      data: { withdrawalId: id }
    })

    uni.hideLoading()

    if (res.code === 0) {
      uni.showToast({ title: '已批准', icon: 'success' })
      loadWithdrawals()
    } else {
      uni.showToast({ title: res.msg || '操作失败', icon: 'none' })
    }
  } catch (e) {
    uni.hideLoading()
    console.error('操作失败', e)
    uni.showToast({ title: '操作失败', icon: 'none' })
  }
}

const handleReject = async (id: string) => {
  uni.showModal({
    title: '确认拒绝',
    content: '确定要拒绝此提现申请吗？',
    success: async (res) => {
      if (res.confirm) {
        try {
          uni.showLoading({ title: '处理中...' })

          const result = await callFunction('admin-api', {
            action: 'rejectWithdrawal',
            adminToken: AdminAuthManager.getToken(),
            data: { withdrawalId: id, reason: '审核未通过' }
          })

          uni.hideLoading()

          if (result.code === 0) {
            uni.showToast({ title: '已拒绝', icon: 'success' })
            loadWithdrawals()
          } else {
            uni.showToast({ title: result.msg || '操作失败', icon: 'none' })
          }
        } catch (e) {
          uni.hideLoading()
          console.error('操作失败', e)
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
