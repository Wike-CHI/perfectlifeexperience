<template>
  <view class="finance-page">
    <view class="page-title">财务管理</view>

    <!-- 统计卡片区域 -->
    <view class="stats-cards">
      <view class="stat-card stat-pending">
        <text class="stat-value">{{ stats.pendingCount }}</text>
        <text class="stat-label">待审核</text>
        <text class="stat-amount">¥{{ (stats.pendingAmount / 100).toFixed(2) }}</text>
      </view>
      <view class="stat-card stat-approved">
        <text class="stat-value">{{ stats.todayApproved }}</text>
        <text class="stat-label">今日已批准</text>
        <text class="stat-amount">¥{{ (stats.todayAmount / 100).toFixed(2) }}</text>
      </view>
    </view>

    <view class="section">
      <text class="section-title">提现审核</text>

      <!-- 状态筛选器 -->
      <view class="filter-tabs">
        <view
          v-for="tab in statusTabs"
          :key="tab.value"
          :class="['tab-item', { active: currentStatus === tab.value }]"
          @click="handleStatusChange(tab.value)"
        >
          {{ tab.label }}
        </view>
      </view>

      <!-- 提现列表 -->
      <scroll-view
        class="withdrawals-list"
        scroll-y
        @scrolltolower="loadMore"
        :style="{ height: listHeight }"
      >
        <!-- 空状态 -->
        <view v-if="withdrawals.length === 0 && !loading" class="empty-state">
          <text class="empty-icon">📋</text>
          <text class="empty-text">暂无提现记录</text>
          <text class="empty-hint">当用户发起提现申请后会显示在这里</text>
        </view>

        <!-- 提现卡片 -->
        <view v-for="item in withdrawals" :key="item._id" class="withdrawal-card" @click="showDetail(item)">
          <!-- 用户信息区域 -->
          <view class="user-section">
            <view class="user-info">
              <text class="user-name">{{ item.user?.nickName || '未知用户' }}</text>
              <text class="agent-level" :class="'level-' + (item.user?.agentLevel || 4)">
                {{ getAgentLevelText(item.user?.agentLevel) }}
              </text>
            </view>
            <view class="withdrawal-amount">
              <text class="amount">¥{{ (item.amount / 100).toFixed(2) }}</text>
            </view>
          </view>

          <!-- 详细信息 -->
          <view class="detail-info">
            <view class="info-row">
              <text class="label">手机号：</text>
              <text class="value">{{ item.user?.phone || '未绑定' }}</text>
            </view>
            <view class="info-row">
              <text class="label">申请时间：</text>
              <text class="value">{{ formatDate(item.applyTime) }}</text>
            </view>
            <view v-if="item.status !== 'pending'" class="info-row">
              <text class="label">处理时间：</text>
              <text class="value">{{ formatDate(item.status === 'approved' ? item.approvedTime : item.rejectedTime) }}</text>
            </view>
            <view v-if="item.status === 'rejected' && item.rejectReason" class="info-row">
              <text class="label">拒绝原因：</text>
              <text class="value reason">{{ item.rejectReason }}</text>
            </view>
          </view>

          <!-- 状态标识 -->
          <view class="status-section">
            <view :class="['status-badge', 'status-' + item.status]">
              {{ getStatusText(item.status) }}
            </view>
          </view>

          <!-- 操作按钮（仅待审核状态显示） -->
          <view v-if="item.status === 'pending'" class="actions-section" @click.stop>
            <button class="action-btn approve-btn" @click="handleApprove(item._id)">批准</button>
            <button class="action-btn reject-btn" @click="showRejectModal(item)">拒绝</button>
          </view>
        </view>

        <!-- 加载更多提示 -->
        <view class="load-more">
          <text v-if="loading" class="loading-text">加载中...</text>
          <text v-else-if="!hasMore" class="no-more-text">没有更多了</text>
          <text v-else class="hint-text">上拉加载更多</text>
        </view>
      </scroll-view>
    </view>

    <!-- 提现详情弹窗 -->
    <view v-if="showDetailModal" class="modal-overlay" @click="closeDetail">
      <view class="detail-modal" @click.stop>
        <view class="modal-header">
          <text class="modal-title">提现详情</text>
          <text class="close-btn" @click="closeDetail">×</text>
        </view>
        <view v-if="currentWithdrawal" class="modal-content">
          <view class="detail-section">
            <text class="section-title">用户信息</text>
            <view class="detail-row">
              <text class="detail-label">昵称：</text>
              <text class="detail-value">{{ currentWithdrawal.user?.nickName || '未知' }}</text>
            </view>
            <view class="detail-row">
              <text class="detail-label">手机号：</text>
              <text class="detail-value">{{ currentWithdrawal.user?.phone || '未绑定' }}</text>
            </view>
            <view class="detail-row">
              <text class="detail-label">代理级别：</text>
              <text class="detail-value">{{ getAgentLevelText(currentWithdrawal.user?.agentLevel) }}</text>
            </view>
          </view>

          <view class="detail-section">
            <text class="section-title">提现信息</text>
            <view class="detail-row">
              <text class="detail-label">提现金额：</text>
              <text class="detail-value amount">¥{{ (currentWithdrawal.amount / 100).toFixed(2) }}</text>
            </view>
            <view class="detail-row">
              <text class="detail-label">申请时间：</text>
              <text class="detail-value">{{ formatDate(currentWithdrawal.applyTime) }}</text>
            </view>
            <view class="detail-row">
              <text class="detail-label">当前状态：</text>
              <text :class="['detail-value', 'status-' + currentWithdrawal.status]">
                {{ getStatusText(currentWithdrawal.status) }}
              </text>
            </view>
            <view v-if="currentWithdrawal.status !== 'pending'" class="detail-row">
              <text class="detail-label">处理时间：</text>
              <text class="detail-value">
                {{ formatDate(currentWithdrawal.status === 'approved' ? currentWithdrawal.approvedTime : currentWithdrawal.rejectedTime) }}
              </text>
            </view>
            <view v-if="currentWithdrawal.status === 'rejected' && currentWithdrawal.rejectReason" class="detail-row">
              <text class="detail-label">拒绝原因：</text>
              <text class="detail-value reason">{{ currentWithdrawal.rejectReason }}</text>
            </view>
          </view>

          <view v-if="currentWithdrawal.status === 'pending'" class="modal-actions">
            <button class="modal-btn modal-approve" @click="handleApprove(currentWithdrawal._id)">批准提现</button>
            <button class="modal-btn modal-reject" @click="showRejectModal(currentWithdrawal)">拒绝提现</button>
          </view>
        </view>
      </view>
    </view>

    <!-- 拒绝原因输入弹窗 -->
    <view v-if="showRejectInput" class="modal-overlay" @click="closeRejectModal">
      <view class="reject-modal" @click.stop>
        <view class="modal-header">
          <text class="modal-title">拒绝提现</text>
          <text class="close-btn" @click="closeRejectModal">×</text>
        </view>
        <view class="modal-content">
          <view class="reject-tips">
            <text class="tips-icon">⚠️</text>
            <text class="tips-text">请谨慎拒绝，拒绝后金额将返还用户佣金钱包</text>
          </view>

          <!-- 快捷原因 -->
          <view class="quick-reasons">
            <text class="quick-title">快捷原因：</text>
            <view class="reason-tags">
              <view
                v-for="reason in quickReasons"
                :key="reason"
                :class="['reason-tag', { active: rejectReason === reason }]"
                @click="rejectReason = reason"
              >
                {{ reason }}
              </view>
            </view>
          </view>

          <!-- 自定义原因 -->
          <view class="custom-reason">
            <text class="reason-label">自定义原因：</text>
            <textarea
              v-model="rejectReason"
              class="reason-input"
              placeholder="请输入拒绝原因（必填）"
              maxlength="200"
            />
            <text class="char-count">{{ rejectReason.length }}/200</text>
          </view>

          <view class="modal-actions">
            <button class="modal-btn modal-cancel" @click="closeRejectModal">取消</button>
            <button class="modal-btn modal-confirm" :disabled="!rejectReason.trim()" @click="confirmReject">
              确认拒绝
            </button>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { callFunction } from '@/utils/cloudbase'
import AdminAuthManager from '@/utils/admin-auth'

// 状态管理
const withdrawals = ref<any[]>([])
const currentStatus = ref('pending')
const currentPage = ref(1)
const hasMore = ref(true)
const loading = ref(false)
const stats = ref({
  pendingCount: 0,
  pendingAmount: 0,
  todayApproved: 0,
  todayAmount: 0
})

// 详情弹窗
const showDetailModal = ref(false)
const currentWithdrawal = ref<any>(null)

// 拒绝弹窗
const showRejectInput = ref(false)
const rejectWithdrawal = ref<any>(null)
const rejectReason = ref('')

// 快捷拒绝原因
const quickReasons = [
  '资料不完整',
  '账户异常',
  '提现金额异常',
  '涉嫌违规操作',
  '请联系客服'
]

// 状态筛选标签
const statusTabs = [
  { label: '待审核', value: 'pending' },
  { label: '已批准', value: 'approved' },
  { label: '已拒绝', value: 'rejected' },
  { label: '全部', value: 'all' }
]

// 列表高度（动态计算）
const listHeight = computed(() => {
  return 'calc(100vh - 400rpx)'
})

onMounted(() => {
  if (!AdminAuthManager.checkAuth()) return
  loadStats()
  loadWithdrawals()
})

// 加载统计数据
const loadStats = async () => {
  try {
    const res = await callFunction('admin-api', {
      action: 'getWithdrawalStats',
      adminToken: AdminAuthManager.getToken()
    })

    if (res.code === 0 && res.data) {
      stats.value = res.data
    }
  } catch (e) {
    console.error('加载统计数据失败', e)
  }
}

// 加载提现列表
const loadWithdrawals = async (refresh = false) => {
  if (loading.value) return

  if (refresh) {
    currentPage.value = 1
    withdrawals.value = []
    hasMore.value = true
  }

  if (!hasMore.value) return

  try {
    loading.value = true

    const res = await callFunction('admin-api', {
      action: 'getWithdrawals',
      adminToken: AdminAuthManager.getToken(),
      data: {
        status: currentStatus.value,
        page: currentPage.value,
        limit: 20
      }
    })

    if (res.code === 0 && res.data) {
      const newList = res.data.list || []

      if (refresh) {
        withdrawals.value = newList
      } else {
        withdrawals.value.push(...newList)
      }

      hasMore.value = withdrawals.value.length < res.data.total
    } else {
      uni.showToast({ title: res.msg || '加载失败', icon: 'none' })
    }
  } catch (e) {
    console.error('加载提现列表失败', e)
    uni.showToast({ title: '网络错误', icon: 'none' })
  } finally {
    loading.value = false
  }
}

// 上拉加载更多
const loadMore = () => {
  if (!loading.value && hasMore.value) {
    currentPage.value++
    loadWithdrawals()
  }
}

// 切换状态筛选
const handleStatusChange = (status: string) => {
  currentStatus.value = status
  loadWithdrawals(true)
}

// 格式化日期
const formatDate = (date: string | Date) => {
  if (!date) return '-'
  const d = new Date(date)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hour = String(d.getHours()).padStart(2, '0')
  const minute = String(d.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day} ${hour}:${minute}`
}

// 获取代理级别文本
const getAgentLevelText = (level: number) => {
  const map: Record<number, string> = {
    1: '金牌推广员',
    2: '银牌推广员',
    3: '铜牌推广员',
    4: '普通会员'
  }
  return map[level || 4] || '未知'
}

// 获取状态文本
const getStatusText = (status: string) => {
  const map: Record<string, string> = {
    pending: '待审核',
    approved: '已批准',
    rejected: '已拒绝',
    failed: '失败'
  }
  return map[status] || '未知'
}

// 显示详情
const showDetail = (item: any) => {
  currentWithdrawal.value = item
  showDetailModal.value = true
}

// 关闭详情
const closeDetail = () => {
  showDetailModal.value = false
  currentWithdrawal.value = null
}

// 显示拒绝弹窗
const showRejectModal = (item: any) => {
  rejectWithdrawal.value = item
  rejectReason.value = ''
  showRejectInput.value = true
  showDetailModal.value = false
}

// 关闭拒绝弹窗
const closeRejectModal = () => {
  showRejectInput.value = false
  rejectWithdrawal.value = null
  rejectReason.value = ''
}

// 批准提现
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
      closeDetail()
      loadWithdrawals(true)
      loadStats()
    } else {
      uni.showToast({ title: res.msg || '操作失败', icon: 'none' })
    }
  } catch (e) {
    uni.hideLoading()
    console.error('操作失败', e)
    uni.showToast({ title: '操作失败', icon: 'none' })
  }
}

// 确认拒绝
const confirmReject = async () => {
  if (!rejectWithdrawal.value || !rejectReason.value.trim()) {
    uni.showToast({ title: '请输入拒绝原因', icon: 'none' })
    return
  }

  try {
    uni.showLoading({ title: '处理中...' })

    const res = await callFunction('admin-api', {
      action: 'rejectWithdrawal',
      adminToken: AdminAuthManager.getToken(),
      data: {
        withdrawalId: rejectWithdrawal.value._id,
        reason: rejectReason.value.trim()
      }
    })

    uni.hideLoading()

    if (res.code === 0) {
      uni.showToast({ title: '已拒绝', icon: 'success' })
      closeRejectModal()
      loadWithdrawals(true)
      loadStats()
    } else {
      uni.showToast({ title: res.msg || '操作失败', icon: 'none' })
    }
  } catch (e) {
    uni.hideLoading()
    console.error('操作失败', e)
    uni.showToast({ title: '操作失败', icon: 'none' })
  }
}
</script>

<style lang="scss" scoped>
.finance-page {
  min-height: 100vh;
  background: #FAF9F7;
  padding: 20rpx;
}

.page-title {
  font-size: 36rpx;
  font-weight: bold;
  text-align: center;
  margin-bottom: 30rpx;
  color: #3D2914;
}

// 统计卡片
.stats-cards {
  display: flex;
  gap: 20rpx;
  margin-bottom: 30rpx;
}

.stat-card {
  flex: 1;
  padding: 30rpx;
  border-radius: 16rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
}

.stat-pending {
  background: linear-gradient(135deg, #7A9A8E 0%, #5A7A6E 100%);
  color: #fff;
}

.stat-approved {
  background: linear-gradient(135deg, #C9A962 0%, #A88942 100%);
  color: #fff;
}

.stat-value {
  font-size: 48rpx;
  font-weight: bold;
}

.stat-label {
  font-size: 24rpx;
  opacity: 0.9;
}

.stat-amount {
  font-size: 28rpx;
  font-weight: bold;
}

.section {
  background: #fff;
  border-radius: 16rpx;
  padding: 30rpx;
}

.section-title {
  font-size: 30rpx;
  font-weight: bold;
  margin-bottom: 20rpx;
  color: #3D2914;
}

// 筛选标签
.filter-tabs {
  display: flex;
  gap: 15rpx;
  margin-bottom: 25rpx;
  overflow-x: auto;
}

.tab-item {
  padding: 12rpx 24rpx;
  background: #f5f5f5;
  border-radius: 20rpx;
  font-size: 26rpx;
  color: #666;
  white-space: nowrap;
  transition: all 0.3s;
}

.tab-item.active {
  background: linear-gradient(135deg, #C9A962 0%, #A88942 100%);
  color: #fff;
}

// 提现列表
.withdrawals-list {
  max-height: calc(100vh - 400rpx);
}

.withdrawal-card {
  background: #FAF9F7;
  border-radius: 12rpx;
  padding: 25rpx;
  margin-bottom: 20rpx;
  border: 1rpx solid #E8E4DC;
}

.user-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15rpx;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 10rpx;
}

.user-name {
  font-size: 28rpx;
  font-weight: bold;
  color: #3D2914;
}

.agent-level {
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
  font-size: 20rpx;
  font-weight: bold;
}

.level-1 {
  background: linear-gradient(135deg, #C9A962 0%, #A88942 100%);
  color: #fff;
}

.level-2 {
  background: linear-gradient(135deg, #D4A574 0%, #B8956A 100%);
  color: #fff;
}

.level-3 {
  background: linear-gradient(135deg, #7A9A8E 0%, #5A7A6E 100%);
  color: #fff;
}

.level-4 {
  background: #E8E4DC;
  color: #666;
}

.withdrawal-amount {
  text-align: right;
}

.amount {
  font-size: 36rpx;
  font-weight: bold;
  color: #C9A962;
}

.detail-info {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  margin-bottom: 15rpx;
}

.info-row {
  display: flex;
  font-size: 24rpx;
}

.label {
  color: #999;
  min-width: 140rpx;
}

.value {
  color: #666;
  flex: 1;
}

.value.reason {
  color: #F44336;
}

.status-section {
  margin-bottom: 15rpx;
}

.status-badge {
  display: inline-block;
  padding: 6rpx 16rpx;
  border-radius: 8rpx;
  font-size: 22rpx;
  font-weight: bold;
}

.status-pending {
  background: #E8F5E9;
  color: #7A9A8E;
}

.status-approved {
  background: #E8F5E9;
  color: #4CAF50;
}

.status-rejected {
  background: #FFEBEE;
  color: #F44336;
}

.actions-section {
  display: flex;
  gap: 15rpx;
}

.action-btn {
  flex: 1;
  padding: 16rpx;
  border-radius: 8rpx;
  font-size: 26rpx;
  font-weight: bold;
  border: none;
}

.approve-btn {
  background: linear-gradient(135deg, #4CAF50 0%, #45A049 100%);
  color: #fff;
}

.reject-btn {
  background: linear-gradient(135deg, #F44336 0%, #E53935 100%);
  color: #fff;
}

// 空状态
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 100rpx 40rpx;
}

.empty-icon {
  font-size: 120rpx;
  margin-bottom: 20rpx;
  opacity: 0.5;
}

.empty-text {
  font-size: 28rpx;
  color: #999;
  margin-bottom: 10rpx;
}

.empty-hint {
  font-size: 24rpx;
  color: #BBB;
}

// 加载更多
.load-more {
  padding: 30rpx;
  text-align: center;
}

.loading-text,
.no-more-text,
.hint-text {
  font-size: 24rpx;
  color: #999;
}

// 弹窗样式
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.detail-modal,
.reject-modal {
  width: 600rpx;
  max-height: 80vh;
  background: #fff;
  border-radius: 16rpx;
  overflow: hidden;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 30rpx;
  border-bottom: 1rpx solid #E8E4DC;
}

.modal-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #3D2914;
}

.close-btn {
  font-size: 48rpx;
  color: #999;
  line-height: 1;
}

.modal-content {
  padding: 30rpx;
  max-height: 60vh;
  overflow-y: auto;
}

.detail-section {
  margin-bottom: 30rpx;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  padding: 15rpx 0;
  border-bottom: 1rpx solid #F5F5F5;
}

.detail-label {
  font-size: 26rpx;
  color: #999;
}

.detail-value {
  font-size: 26rpx;
  color: #333;
  text-align: right;
}

.detail-value.amount {
  color: #C9A962;
  font-weight: bold;
}

.detail-value.status-pending {
  color: #7A9A8E;
}

.detail-value.status-approved {
  color: #4CAF50;
}

.detail-value.status-rejected {
  color: #F44336;
}

.detail-value.reason {
  color: #F44336;
}

.modal-actions {
  display: flex;
  gap: 15rpx;
  margin-top: 30rpx;
}

.modal-btn {
  flex: 1;
  padding: 20rpx;
  border-radius: 8rpx;
  font-size: 28rpx;
  font-weight: bold;
  border: none;
}

.modal-approve {
  background: linear-gradient(135deg, #4CAF50 0%, #45A049 100%);
  color: #fff;
}

.modal-reject {
  background: linear-gradient(135deg, #F44336 0%, #E53935 100%);
  color: #fff;
}

.modal-cancel {
  background: #F5F5F5;
  color: #666;
}

.modal-confirm {
  background: linear-gradient(135deg, #F44336 0%, #E53935 100%);
  color: #fff;
}

.modal-confirm:disabled {
  background: #E0E0E0;
  color: #999;
}

// 拒绝弹窗特殊样式
.reject-tips {
  display: flex;
  align-items: flex-start;
  gap: 10rpx;
  padding: 15rpx;
  background: #FFF3E0;
  border-radius: 8rpx;
  margin-bottom: 20rpx;
}

.tips-icon {
  font-size: 32rpx;
}

.tips-text {
  flex: 1;
  font-size: 24rpx;
  color: #E65100;
  line-height: 1.5;
}

.quick-reasons {
  margin-bottom: 25rpx;
}

.quick-title {
  font-size: 26rpx;
  color: #666;
  margin-bottom: 15rpx;
}

.reason-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 10rpx;
}

.reason-tag {
  padding: 10rpx 20rpx;
  background: #F5F5F5;
  border-radius: 20rpx;
  font-size: 24rpx;
  color: #666;
}

.reason-tag.active {
  background: linear-gradient(135deg, #C9A962 0%, #A88942 100%);
  color: #fff;
}

.custom-reason {
  position: relative;
  margin-bottom: 20rpx;
}

.reason-label {
  font-size: 26rpx;
  color: #666;
  margin-bottom: 10rpx;
}

.reason-input {
  width: 100%;
  min-height: 150rpx;
  padding: 15rpx;
  background: #F5F5F5;
  border-radius: 8rpx;
  font-size: 26rpx;
  border: none;
}

.char-count {
  position: absolute;
  right: 15rpx;
  bottom: 35rpx;
  font-size: 22rpx;
  color: #999;
}
</style>
