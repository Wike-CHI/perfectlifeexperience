<template>
  <view class="user-detail-page">
    <view class="page-title">用户详情</view>

    <view class="user-card">
      <image class="avatar" :src="userInfo.avatarUrl" />
      <text class="nickname">{{ userInfo.nickName || '未设置' }}</text>
      <view class="stats">
        <view class="stat-item">
          <text class="stat-value">¥{{ formatMoney(userInfo.performance?.totalSales || 0) }}</text>
          <text class="stat-label">销售额</text>
        </view>
        <view class="stat-item">
          <text class="stat-value">{{ userInfo.performance?.teamCount || 0 }}</text>
          <text class="stat-label">团队人数</text>
        </view>
      </view>
    </view>

    <view class="info-section">
      <text class="section-title">基本信息</text>
      <view class="info-item">
        <text class="label">OPENID</text>
        <text class="value">{{ userInfo._openid }}</text>
      </view>
      <view class="info-item">
        <text class="label">代理等级</text>
        <view class="value-with-btn">
          <text class="value">{{ getAgentLevelName(userInfo.agentLevel) }}</text>
          <button class="edit-btn" @click="showLevelPicker">修改等级</button>
        </view>
      </view>
    </view>

    <!-- 推广关系信息 -->
    <view class="info-section">
      <text class="section-title">推广关系</text>
      <view class="info-item">
        <text class="label">邀请码</text>
        <text class="value">{{ userInfo.inviteCode || '无' }}</text>
      </view>
      <view class="info-item">
        <text class="label">上级推广人</text>
        <view class="value-with-btn">
          <text class="value">{{ userInfo.parentId ? '已绑定' : '未绑定' }}</text>
          <view class="btn-group">
            <button class="edit-btn" @click="openBindDialog">绑定</button>
            <button class="edit-btn danger" @click="handleUnbind" v-if="userInfo.parentId">解绑</button>
          </view>
        </view>
      </view>
      <view class="info-item" v-if="userInfo.promotionPath">
        <text class="label">推广路径</text>
        <text class="value">{{ userInfo.promotionPath }}</text>
      </view>
    </view>

    <!-- 业绩信息 -->
    <view class="info-section" v-if="userInfo.performance">
      <text class="section-title">业绩信息</text>
      <view class="info-item">
        <text class="label">累计销售额</text>
        <text class="value">¥{{ formatMoney(userInfo.performance.totalSales || 0) }}</text>
      </view>
      <view class="info-item">
        <text class="label">本月销售额</text>
        <text class="value">¥{{ formatMoney(userInfo.performance.monthSales || 0) }}</text>
      </view>
      <view class="info-item">
        <text class="label">团队人数</text>
        <text class="value">{{ userInfo.performance.teamCount || 0 }}人</text>
      </view>
    </view>

    <!-- 修改等级弹窗 -->
    <view class="level-picker-mask" v-if="showPicker" @click="showPicker = false">
      <view class="level-picker" @click.stop>
        <view class="picker-header">
          <text class="picker-title">修改代理等级</text>
          <text class="picker-close" @click="showPicker = false">×</text>
        </view>
        <view class="picker-content">
          <view
            v-for="level in levels"
            :key="level.value"
            :class="['level-option', { active: selectedLevel === level.value }]"
            @click="selectedLevel = level.value"
          >
            <view class="level-info">
              <text class="level-name">{{ level.name }}</text>
              <text class="level-desc">{{ level.desc }}</text>
            </view>
            <view class="level-check" v-if="selectedLevel === level.value">✓</view>
          </view>
        </view>
        <view class="picker-footer">
          <button class="cancel-btn" @click="showPicker = false">取消</button>
          <button class="confirm-btn" @click="confirmLevelChange" :disabled="selectedLevel === userInfo.agentLevel">
            确认修改
          </button>
        </view>
      </view>
    </view>

    <!-- 绑定推广人弹窗 -->
    <view class="level-picker-mask" v-if="showBindDialog" @click="showBindDialog = false">
      <view class="level-picker" @click.stop>
        <view class="picker-header">
          <text class="picker-title">绑定上级推广人</text>
          <text class="picker-close" @click="showBindDialog = false">×</text>
        </view>
        <view class="picker-content">
          <view class="bind-input-item">
            <text class="input-label">上级邀请码</text>
            <input
              class="bind-input"
              v-model="bindInviteCode"
              placeholder="请输入上级用户的邀请码"
            />
          </view>
        </view>
        <view class="picker-footer">
          <button class="cancel-btn" @click="showBindDialog = false">取消</button>
          <button class="confirm-btn" @click="confirmBind" :disabled="!bindInviteCode">
            确认绑定
          </button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { callFunction } from '@/utils/cloudbase'
import AdminAuthManager from '@/utils/admin-auth'

const userInfo = ref<any>({})
const showPicker = ref(false)
const selectedLevel = ref(4)
const showBindDialog = ref(false)
const bindInviteCode = ref('')

// 代理等级选项
const levels = [
  { value: 0, name: '总公司', desc: '系统管理员' },
  { value: 1, name: '金牌推广员', desc: '一级代理，推广佣金最高' },
  { value: 2, name: '银牌推广员', desc: '二级代理' },
  { value: 3, name: '铜牌推广员', desc: '三级代理' },
  { value: 4, name: '普通会员', desc: '四级代理，最基础的代理等级' }
]

// 代理等级名称映射
const AGENT_LEVEL_NAMES: Record<number, string> = {
  0: '总公司',
  1: '金牌推广员',
  2: '银牌推广员',
  3: '铜牌推广员',
  4: '普通会员'
}

const getAgentLevelName = (level: number): string => {
  return AGENT_LEVEL_NAMES[level] || '普通会员'
}

/**
 * 格式化金额（从分转换为元）
 */
const formatMoney = (amount: number): string => {
  if (amount === undefined || amount === null) return '0.00'
  return (amount / 100).toFixed(2)
}

onMounted(() => {
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1] as any
  const options = currentPage.options || {}

  if (options.id) {
    loadUser(options.id)
  }
})

const loadUser = async (id: string) => {
  try {
    uni.showLoading({ title: '加载中...' })

    const res = await callFunction('admin-api', {
      action: 'getUserDetail',
      adminToken: AdminAuthManager.getToken(),
      data: { userId: id }
    })

    uni.hideLoading()

    if (res.code === 0) {
      userInfo.value = res.data
      selectedLevel.value = res.data.agentLevel || 4
    } else {
      uni.showToast({ title: res.msg || '加载失败', icon: 'none' })
    }
  } catch (e) {
    uni.hideLoading()
    console.error('加载用户失败', e)
    uni.showToast({ title: '网络错误', icon: 'none' })
  }
}

const showLevelPicker = () => {
  selectedLevel.value = userInfo.value.agentLevel || 4
  showPicker.value = true
}

const confirmLevelChange = async () => {
  if (selectedLevel.value === userInfo.value.agentLevel) {
    showPicker.value = false
    return
  }

  try {
    uni.showLoading({ title: '修改中...' })

    const res = await callFunction('admin-api', {
      action: 'updateUserAgentLevel',
      adminToken: AdminAuthManager.getToken(),
      data: {
        userId: userInfo.value._id,
        agentLevel: selectedLevel.value
      }
    })

    uni.hideLoading()

    if (res.code === 0) {
      uni.showToast({ title: '修改成功', icon: 'success' })
      userInfo.value.agentLevel = selectedLevel.value
      showPicker.value = false
    } else {
      uni.showToast({ title: res.msg || '修改失败', icon: 'none' })
    }
  } catch (e) {
    uni.hideLoading()
    console.error('修改等级失败', e)
    uni.showToast({ title: '网络错误', icon: 'none' })
  }
}

// 显示绑定弹窗
const openBindDialog = () => {
  bindInviteCode.value = ''
  showBindDialog.value = true
}

// 确认绑定
const confirmBind = async () => {
  if (!bindInviteCode.value) {
    uni.showToast({ title: '请输入邀请码', icon: 'none' })
    return
  }

  try {
    uni.showLoading({ title: '绑定中...' })

    const res = await callFunction('admin-api', {
      action: 'bindUserRelation',
      adminToken: AdminAuthManager.getToken(),
      data: {
        userId: userInfo.value._id,
        parentInviteCode: bindInviteCode.value
      }
    })

    uni.hideLoading()

    if (res.code === 0) {
      uni.showToast({ title: '绑定成功', icon: 'success' })
      // 更新本地数据
      userInfo.value.parentId = res.data.parentId
      userInfo.value.promotionPath = res.data.promotionPath
      userInfo.value.agentLevel = res.data.agentLevel
      showBindDialog.value = false
    } else {
      uni.showToast({ title: res.msg || '绑定失败', icon: 'none' })
    }
  } catch (e) {
    uni.hideLoading()
    console.error('绑定失败', e)
    uni.showToast({ title: '网络错误', icon: 'none' })
  }
}

// 解绑
const handleUnbind = () => {
  uni.showModal({
    title: '确认解绑',
    content: '确定要解绑该用户的推广关系吗？',
    success: async (res) => {
      if (res.confirm) {
        try {
          uni.showLoading({ title: '解绑中...' })

          const response = await callFunction('admin-api', {
            action: 'unbindUserRelation',
            adminToken: AdminAuthManager.getToken(),
            data: {
              userId: userInfo.value._id
            }
          })

          uni.hideLoading()

          if (response.code === 0) {
            uni.showToast({ title: '解绑成功', icon: 'success' })
            // 更新本地数据
            userInfo.value.parentId = null
            userInfo.value.promotionPath = null
            userInfo.value.agentLevel = 4
          } else {
            uni.showToast({ title: response.msg || '解绑失败', icon: 'none' })
          }
        } catch (e) {
          uni.hideLoading()
          console.error('解绑失败', e)
          uni.showToast({ title: '网络错误', icon: 'none' })
        }
      }
    }
  })
}
</script>

<style lang="scss" scoped>
.user-detail-page {
  padding: 20rpx;
}

.page-title {
  font-size: 36rpx;
  font-weight: bold;
  text-align: center;
  margin-bottom: 40rpx;
}

.user-card {
  background: #fff;
  border-radius: 12rpx;
  padding: 40rpx;
  text-align: center;
  margin-bottom: 20rpx;
}

.avatar {
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
  margin-bottom: 20rpx;
}

.nickname {
  display: block;
  font-size: 32rpx;
  font-weight: bold;
  margin-bottom: 30rpx;
}

.stats {
  display: flex;
  justify-content: center;
  gap: 60rpx;
}

.stat-item {
  text-align: center;
}

.stat-value {
  display: block;
  font-size: 32rpx;
  font-weight: bold;
  color: #C9A962;
  margin-bottom: 10rpx;
}

.stat-label {
  font-size: 24rpx;
  color: #666;
}

.info-section {
  background: #fff;
  border-radius: 12rpx;
  padding: 30rpx;
  margin-bottom: 20rpx;
}

.section-title {
  font-size: 30rpx;
  font-weight: bold;
  margin-bottom: 25rpx;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20rpx 0;
  border-bottom: 1rpx solid #f0f0f0;

  &:last-child {
    border-bottom: none;
  }
}

.label {
  font-size: 26rpx;
  color: #666;
}

.value {
  font-size: 26rpx;
  color: #333;
}

.value-with-btn {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.edit-btn {
  font-size: 22rpx;
  color: #C9A962;
  background: #FFF8E7;
  border: 1rpx solid #C9A962;
  padding: 8rpx 16rpx;
  border-radius: 6rpx;
  line-height: 1.5;
}

.btn-group {
  display: flex;
  gap: 12rpx;
}

.edit-btn.danger {
  color: #ff4d4f;
  background: #fff1f0;
  border-color: #ff4d4f;
}

.bind-input-item {
  padding: 20rpx;
}

.bind-input-item .input-label {
  display: block;
  font-size: 28rpx;
  color: #F5F5F0;
  margin-bottom: 16rpx;
}

.bind-input {
  width: 100%;
  height: 80rpx;
  background: rgba(255, 255, 255, 0.05);
  border: 1rpx solid rgba(201, 169, 98, 0.3);
  border-radius: 12rpx;
  padding: 0 24rpx;
  font-size: 28rpx;
  color: #F5F5F0;
}

/* 修改等级弹窗 */
.level-picker-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 1000;
}

.level-picker {
  width: 100%;
  background: #fff;
  border-radius: 24rpx 24rpx 0 0;
  padding: 30rpx;
  padding-bottom: calc(30rpx + env(safe-area-inset-bottom));
}

.picker-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30rpx;
}

.picker-title {
  font-size: 32rpx;
  font-weight: bold;
}

.picker-close {
  font-size: 48rpx;
  color: #999;
  line-height: 1;
}

.picker-content {
  max-height: 60vh;
  overflow-y: auto;
}

.level-option {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx;
  border: 2rpx solid #f0f0f0;
  border-radius: 12rpx;
  margin-bottom: 16rpx;

  &.active {
    border-color: #C9A962;
    background: #FFF8E7;
  }
}

.level-info {
  flex: 1;
}

.level-name {
  display: block;
  font-size: 28rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 8rpx;
}

.level-desc {
  font-size: 24rpx;
  color: #999;
}

.level-check {
  width: 44rpx;
  height: 44rpx;
  background: #C9A962;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 24rpx;
  font-weight: bold;
}

.picker-footer {
  display: flex;
  gap: 20rpx;
  margin-top: 30rpx;
}

.cancel-btn {
  flex: 1;
  height: 88rpx;
  line-height: 88rpx;
  background: #f5f5f5;
  color: #666;
  border-radius: 44rpx;
  font-size: 30rpx;
}

.confirm-btn {
  flex: 1;
  height: 88rpx;
  line-height: 88rpx;
  background: #C9A962;
  color: #fff;
  border-radius: 44rpx;
  font-size: 30rpx;

  &[disabled] {
    background: #ccc;
  }
}
</style>
