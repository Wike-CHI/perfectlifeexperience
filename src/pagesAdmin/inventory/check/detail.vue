<template>
  <view class="check-detail-page">
    <!-- 基本信息 -->
    <view class="section">
      <view class="section-header">
        <text class="check-no">{{ check.checkNo }}</text>
        <view :class="['check-status', check.status]">
          {{ getStatusText(check.status) }}
        </view>
      </view>

      <view class="info-list">
        <view class="info-item">
          <text class="info-label">商品数量</text>
          <text class="info-value">{{ check.items?.length || 0 }} 种</text>
        </view>
        <view class="info-item" v-if="check.status === 'completed'">
          <text class="info-label">盘盈数量</text>
          <text class="info-value gain">+{{ check.totalGain || 0 }}</text>
        </view>
        <view class="info-item" v-if="check.status === 'completed'">
          <text class="info-label">盘亏数量</text>
          <text class="info-value loss">-{{ check.totalLoss || 0 }}</text>
        </view>
        <view class="info-item">
          <text class="info-label">创建时间</text>
          <text class="info-value">{{ formatDateTime(check.createTime) }}</text>
        </view>
        <view class="info-item" v-if="check.operatorName">
          <text class="info-label">创建人</text>
          <text class="info-value">{{ check.operatorName }}</text>
        </view>
        <view class="info-item" v-if="check.completeTime">
          <text class="info-label">完成时间</text>
          <text class="info-value">{{ formatDateTime(check.completeTime) }}</text>
        </view>
        <view class="info-item" v-if="check.remark">
          <text class="info-label">备注</text>
          <text class="info-value">{{ check.remark }}</text>
        </view>
      </view>
    </view>

    <!-- 盘点进度 -->
    <view v-if="check.status !== 'completed' && check.status !== 'cancelled'" class="section">
      <view class="section-title">盘点进度</view>
      <view class="progress-bar">
        <view class="progress-fill" :style="{ width: progressPercent + '%' }"></view>
      </view>
      <view class="progress-text">
        <text>已盘点 {{ checkedCount }} / {{ totalCount }} 项</text>
        <text>{{ progressPercent }}%</text>
      </view>
    </view>

    <!-- 盘点明细 -->
    <view class="section">
      <view class="section-title">盘点明细</view>

      <!-- 筛选 -->
      <view class="filter-tabs">
        <view
          :class="['filter-tab', { active: filterType === 'all' }]"
          @click="filterType = 'all'"
        >
          全部
        </view>
        <view
          :class="['filter-tab', { active: filterType === 'unchecked' }]"
          @click="filterType = 'unchecked'"
        >
          未盘点
        </view>
        <view
          :class="['filter-tab', { active: filterType === 'diff' }]"
          @click="filterType = 'diff'"
        >
          有差异
        </view>
      </view>

      <view class="items-list">
        <view
          v-for="(item, index) in filteredItems"
          :key="index"
          class="item-card"
          :class="{ checked: item.checked, diff: item.difference !== 0 }"
        >
          <view class="item-header">
            <text class="item-name">{{ item.productName }}</text>
            <text v-if="item.sku" class="item-sku">{{ item.sku }}</text>
          </view>

          <view class="item-values">
            <view class="value-item">
              <text class="value-label">系统库存</text>
              <text class="value-num">{{ item.systemStock }}</text>
            </view>
            <view class="value-arrow">→</view>
            <view class="value-item">
              <text class="value-label">实际库存</text>
              <template v-if="check.status === 'draft' || check.status === 'checking'">
                <input
                  class="value-input"
                  type="number"
                  v-model="item.actualStock"
                  @blur="updateItemDiff(item)"
                />
              </template>
              <text v-else class="value-num">{{ item.actualStock }}</text>
            </view>
            <view class="value-item">
              <text class="value-label">差异</text>
              <text :class="['value-diff', getDiffClass(item.difference)]">
                {{ item.difference > 0 ? '+' : '' }}{{ item.difference }}
              </text>
            </view>
          </view>

          <view class="item-remark" v-if="item.remark">
            <text>{{ item.remark }}</text>
          </view>
        </view>

        <view v-if="filteredItems.length === 0" class="empty-items">
          <text>暂无数据</text>
        </view>
      </view>
    </view>

    <!-- 操作按钮 -->
    <view class="action-buttons">
      <template v-if="check.status === 'draft' || check.status === 'checking'">
        <button class="btn-secondary" @click="handleCancel">取消盘点</button>
        <button class="btn-primary" @click="handleComplete">完成盘点</button>
      </template>
      <template v-else>
        <button class="btn-secondary" @click="goBack">返回</button>
      </template>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { callFunction } from '@/utils/cloudbase'
import AdminAuthManager from '@/utils/admin-auth'

// 状态
const checkId = ref('')
const check = ref<any>({
  checkNo: '',
  status: '',
  items: []
})
const filterType = ref('all')

// 状态文本
const statusTextMap: Record<string, string> = {
  draft: '草稿',
  checking: '盘点中',
  completed: '已完成',
  cancelled: '已取消'
}

const getStatusText = (status: string) => statusTextMap[status] || status

// 日期时间格式化
const formatDateTime = (date: string | Date) => {
  if (!date) return '-'
  const d = new Date(date)
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
}

// 计算属性
const totalCount = computed(() => check.value.items?.length || 0)

const checkedCount = computed(() => {
  return (check.value.items || []).filter((item: any) => item.checked).length
})

const progressPercent = computed(() => {
  if (totalCount.value === 0) return 0
  return Math.round((checkedCount.value / totalCount.value) * 100)
})

const filteredItems = computed(() => {
  const items = check.value.items || []
  switch (filterType.value) {
    case 'unchecked':
      return items.filter((item: any) => !item.checked)
    case 'diff':
      return items.filter((item: any) => item.difference !== 0)
    default:
      return items
  }
})

// 获取差异样式
const getDiffClass = (diff: number) => {
  if (diff > 0) return 'gain'
  if (diff < 0) return 'loss'
  return ''
}

// 更新项差异
const updateItemDiff = async (item: any) => {
  const actualStock = parseInt(item.actualStock) || 0
  const difference = actualStock - item.systemStock

  if (item.actualStock !== '' && item.difference !== difference) {
    item.difference = difference
    item.checked = true

    // 保存到服务器
    try {
      await callFunction('admin-api', {
        action: 'updateInventoryCheckItem',
        adminToken: AdminAuthManager.getToken(),
        data: {
          checkId: checkId.value,
          productId: item.productId,
          actualStock,
          remark: item.remark
        }
      })
    } catch (e) {
      console.error('更新盘点项失败', e)
    }
  }
}

// 生命周期
onMounted(() => {
  if (!AdminAuthManager.checkAuth()) return

  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1] as any
  const options = currentPage.options || {}

  if (options.id) {
    checkId.value = options.id
    loadCheck()
  }
})

// 加载盘点单详情
const loadCheck = async () => {
  try {
    uni.showLoading({ title: '加载中...' })

    const res = await callFunction('admin-api', {
      action: 'getInventoryCheckDetail',
      adminToken: AdminAuthManager.getToken(),
      data: { checkId: checkId.value }
    })

    uni.hideLoading()

    if (res.code === 0 && res.data) {
      check.value = res.data
    } else {
      uni.showToast({ title: res.msg || '加载失败', icon: 'none' })
    }
  } catch (e) {
    uni.hideLoading()
    console.error('加载盘点单失败', e)
    uni.showToast({ title: '网络错误', icon: 'none' })
  }
}

// 取消盘点
const handleCancel = async () => {
  uni.showModal({
    title: '确认取消',
    content: '确定要取消此盘点单吗？',
    confirmColor: '#B85C5C',
    success: async (result) => {
      if (result.confirm) {
        try {
          uni.showLoading({ title: '取消中...' })

          const res = await callFunction('admin-api', {
            action: 'cancelInventoryCheck',
            adminToken: AdminAuthManager.getToken(),
            data: { checkId: checkId.value }
          })

          uni.hideLoading()

          if (res.code === 0) {
            uni.showToast({ title: '已取消', icon: 'success' })
            loadCheck()
          } else {
            uni.showToast({ title: res.msg || '取消失败', icon: 'none' })
          }
        } catch (e) {
          uni.hideLoading()
          uni.showToast({ title: '网络错误', icon: 'none' })
        }
      }
    }
  })
}

// 完成盘点
const handleComplete = async () => {
  // 检查是否有未盘点的项
  const unchecked = (check.value.items || []).filter((item: any) => !item.checked)
  if (unchecked.length > 0) {
    uni.showModal({
      title: '提示',
      content: `还有 ${unchecked.length} 项未盘点，确定要完成吗？未盘点的项将按无差异处理。`,
      success: async (result) => {
        if (result.confirm) {
          doComplete()
        }
      }
    })
  } else {
    doComplete()
  }
}

const doComplete = async () => {
  uni.showModal({
    title: '确认完成',
    content: '完成盘点后将自动调整库存，确定要完成吗？',
    success: async (result) => {
      if (result.confirm) {
        try {
          uni.showLoading({ title: '处理中...' })

          const res = await callFunction('admin-api', {
            action: 'completeInventoryCheck',
            adminToken: AdminAuthManager.getToken(),
            data: { checkId: checkId.value }
          })

          uni.hideLoading()

          if (res.code === 0) {
            uni.showToast({ title: '盘点完成', icon: 'success' })
            loadCheck()
          } else {
            uni.showToast({ title: res.msg || '操作失败', icon: 'none' })
          }
        } catch (e) {
          uni.hideLoading()
          console.error('完成盘点失败', e)
          uni.showToast({ title: '网络错误', icon: 'none' })
        }
      }
    }
  })
}

// 返回
const goBack = () => {
  uni.navigateBack()
}
</script>

<style lang="scss" scoped>
.check-detail-page {
  min-height: 100vh;
  background: #0D0D0D;
  padding: 24rpx;
  padding-bottom: 200rpx;
}

.section {
  background: rgba(255, 255, 255, 0.03);
  border-radius: 16rpx;
  border: 1rpx solid rgba(201, 169, 98, 0.1);
  padding: 24rpx;
  margin-bottom: 24rpx;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20rpx;
  padding-bottom: 16rpx;
  border-bottom: 1rpx solid rgba(255, 255, 255, 0.05);
}

.check-no {
  font-size: 28rpx;
  font-weight: bold;
  color: #F5F5F0;
}

.check-status {
  padding: 6rpx 16rpx;
  border-radius: 6rpx;
  font-size: 22rpx;

  &.draft { background: rgba(150, 150, 150, 0.2); color: #999; }
  &.checking { background: rgba(201, 169, 98, 0.2); color: #C9A962; }
  &.completed { background: rgba(122, 154, 142, 0.2); color: #7A9A8E; }
  &.cancelled { background: rgba(184, 92, 92, 0.2); color: #B85C5C; }
}

.section-title {
  font-size: 28rpx;
  font-weight: bold;
  color: #F5F5F0;
  margin-bottom: 20rpx;
}

.info-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.info-label {
  font-size: 24rpx;
  color: rgba(245, 245, 240, 0.5);
}

.info-value {
  font-size: 24rpx;
  color: #F5F5F0;

  &.gain { color: #7A9A8E; }
  &.loss { color: #B85C5C; }
}

.progress-bar {
  height: 12rpx;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 6rpx;
  overflow: hidden;
  margin-bottom: 12rpx;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #C9A962 0%, #7A9A8E 100%);
  border-radius: 6rpx;
  transition: width 0.3s ease;
}

.progress-text {
  display: flex;
  justify-content: space-between;
  font-size: 24rpx;
  color: rgba(245, 245, 240, 0.5);
}

.filter-tabs {
  display: flex;
  gap: 16rpx;
  margin-bottom: 20rpx;
}

.filter-tab {
  padding: 12rpx 24rpx;
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

.items-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.item-card {
  background: rgba(255, 255, 255, 0.03);
  border-radius: 12rpx;
  padding: 20rpx;
  border: 1rpx solid transparent;

  &.checked {
    border-color: rgba(122, 154, 142, 0.2);
  }

  &.diff {
    border-color: rgba(201, 169, 98, 0.3);
    background: rgba(201, 169, 98, 0.05);
  }
}

.item-header {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 16rpx;
}

.item-name {
  font-size: 26rpx;
  font-weight: bold;
  color: #F5F5F0;
}

.item-sku {
  font-size: 22rpx;
  color: rgba(245, 245, 240, 0.4);
  background: rgba(255, 255, 255, 0.05);
  padding: 4rpx 12rpx;
  border-radius: 4rpx;
}

.item-values {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.value-item {
  flex: 1;
  text-align: center;
}

.value-label {
  font-size: 22rpx;
  color: rgba(245, 245, 240, 0.4);
  display: block;
  margin-bottom: 8rpx;
}

.value-num {
  font-size: 28rpx;
  font-weight: bold;
  color: #F5F5F0;
}

.value-arrow {
  font-size: 28rpx;
  color: rgba(245, 245, 240, 0.3);
}

.value-input {
  width: 100%;
  height: 60rpx;
  background: rgba(255, 255, 255, 0.05);
  border: 1rpx solid rgba(201, 169, 98, 0.2);
  border-radius: 8rpx;
  text-align: center;
  font-size: 28rpx;
  color: #F5F5F0;
}

.value-diff {
  font-size: 28rpx;
  font-weight: bold;

  &.gain { color: #7A9A8E; }
  &.loss { color: #B85C5C; }
}

.item-remark {
  margin-top: 12rpx;
  padding-top: 12rpx;
  border-top: 1rpx solid rgba(255, 255, 255, 0.05);
  font-size: 22rpx;
  color: rgba(245, 245, 240, 0.5);
}

.empty-items {
  padding: 40rpx 0;
  text-align: center;
  color: rgba(245, 245, 240, 0.3);
}

.action-buttons {
  display: flex;
  gap: 20rpx;
  margin-top: 40rpx;
}

.btn-secondary {
  flex: 1;
  height: 88rpx;
  background: rgba(255, 255, 255, 0.05);
  border: 1rpx solid rgba(201, 169, 98, 0.2);
  border-radius: 8rpx;
  font-size: 28rpx;
  color: rgba(245, 245, 240, 0.7);
}

.btn-primary {
  flex: 1;
  height: 88rpx;
  background: linear-gradient(145deg, #C8A464 0%, #A88B4A 100%);
  border-radius: 8rpx;
  font-size: 28rpx;
  color: #1A1A1A;
  font-weight: bold;
}
</style>
