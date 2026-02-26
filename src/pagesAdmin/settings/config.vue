<template>
  <view class="settings-page">
    <!-- 页面头部 -->
    <view class="page-header">
      <text class="page-title">系统设置</text>
      <text class="page-subtitle">配置佣金比例与晋升阈值</text>
    </view>

    <!-- 佣金配置 -->
    <view class="setting-section">
      <view class="section-header">
        <text class="section-title">佣金比例配置</text>
        <text class="section-desc">设置各级代理的佣金比例</text>
      </view>

      <view class="form-item">
        <text class="form-label">一级代理佣金比例</text>
        <view class="input-wrapper">
          <input
            class="form-input"
            v-model="config.level1Commission"
            type="digit"
            placeholder="25"
          />
          <text class="input-unit">%</text>
        </view>
      </view>

      <view class="form-item">
        <text class="form-label">二级代理佣金比例</text>
        <view class="input-wrapper">
          <input
            class="form-input"
            v-model="config.level2Commission"
            type="digit"
            placeholder="20"
          />
          <text class="input-unit">%</text>
        </view>
      </view>

      <view class="form-item">
        <text class="form-label">三级代理佣金比例</text>
        <view class="input-wrapper">
          <input
            class="form-input"
            v-model="config.level3Commission"
            type="digit"
            placeholder="15"
          />
          <text class="input-unit">%</text>
        </view>
      </view>

      <view class="form-item">
        <text class="form-label">四级代理佣金比例</text>
        <view class="input-wrapper">
          <input
            class="form-input"
            v-model="config.level4Commission"
            type="digit"
            placeholder="10"
          />
          <text class="input-unit">%</text>
        </view>
      </view>

      <view class="form-item">
        <text class="form-label">复购奖励比例</text>
        <view class="input-wrapper">
          <input
            class="form-input"
            v-model="config.repurchaseReward"
            type="digit"
            placeholder="3"
          />
          <text class="input-unit">%</text>
        </view>
        <text class="form-tip">复购用户（星级≥1）额外奖励</text>
      </view>

      <view class="form-item">
        <text class="form-label">团队管理奖比例</text>
        <view class="input-wrapper">
          <input
            class="form-input"
            v-model="config.teamAward"
            type="digit"
            placeholder="2"
          />
          <text class="input-unit">%</text>
        </view>
        <text class="form-tip">银牌及以上推广员可获得</text>
      </view>

      <view class="form-item">
        <text class="form-label">育成津贴比例</text>
        <view class="input-wrapper">
          <input
            class="form-input"
            v-model="config.nurtureAllowance"
            type="digit"
            placeholder="2"
          />
          <text class="input-unit">%</text>
        </view>
        <text class="form-tip">直接下级晋升时给予导师的津贴</text>
      </view>
    </view>

    <!-- 晋升阈值配置 -->
    <view class="setting-section">
      <view class="section-header">
        <text class="section-title">晋升阈值配置</text>
        <text class="section-desc">设置星级推广员的晋升条件</text>
      </view>

      <view class="form-item">
        <text class="form-label">铜牌推广员 - 直接人数</text>
        <view class="input-wrapper">
          <input
            class="form-input"
            v-model="config.bronzeDirectCount"
            type="number"
            placeholder="5"
          />
          <text class="input-unit">人</text>
        </view>
      </view>

      <view class="form-item">
        <text class="form-label">铜牌推广员 - 累计销售额</text>
        <view class="input-wrapper">
          <input
            class="form-input"
            v-model="config.bronzeTotalSales"
            type="number"
            placeholder="1000"
          />
          <text class="input-unit">元</text>
        </view>
      </view>

      <view class="form-item">
        <text class="form-label">银牌推广员 - 直接人数</text>
        <view class="input-wrapper">
          <input
            class="form-input"
            v-model="config.silverDirectCount"
            type="number"
            placeholder="10"
          />
          <text class="input-unit">人</text>
        </view>
      </view>

      <view class="form-item">
        <text class="form-label">银牌推广员 - 团队人数</text>
        <view class="input-wrapper">
          <input
            class="form-input"
            v-model="config.silverTeamCount"
            type="number"
            placeholder="30"
          />
          <text class="input-unit">人</text>
        </view>
      </view>

      <view class="form-item">
        <text class="form-label">银牌推广员 - 月销售额</text>
        <view class="input-wrapper">
          <input
            class="form-input"
            v-model="config.silverMonthSales"
            type="number"
            placeholder="5000"
          />
          <text class="input-unit">元</text>
        </view>
      </view>

      <view class="form-item">
        <text class="form-label">金牌推广员 - 直接人数</text>
        <view class="input-wrapper">
          <input
            class="form-input"
            v-model="config.goldDirectCount"
            type="number"
            placeholder="20"
          />
          <text class="input-unit">人</text>
        </view>
      </view>

      <view class="form-item">
        <text class="form-label">金牌推广员 - 团队人数</text>
        <view class="input-wrapper">
          <input
            class="form-input"
            v-model="config.goldTeamCount"
            type="number"
            placeholder="100"
          />
          <text class="input-unit">人</text>
        </view>
      </view>

      <view class="form-item">
        <text class="form-label">金牌推广员 - 月销售额</text>
        <view class="input-wrapper">
          <input
            class="form-input"
            v-model="config.goldMonthSales"
            type="number"
            placeholder="20000"
          />
          <text class="input-unit">元</text>
        </view>
      </view>
    </view>

    <!-- 其他配置 -->
    <view class="setting-section">
      <view class="section-header">
        <text class="section-title">其他配置</text>
      </view>

      <view class="form-item">
        <text class="form-label">最低提现金额</text>
        <view class="input-wrapper">
          <input
            class="form-input"
            v-model="config.minWithdrawAmount"
            type="number"
            placeholder="100"
          />
          <text class="input-unit">元</text>
        </view>
      </view>

      <view class="form-item">
        <text class="form-label">提现手续费比例</text>
        <view class="input-wrapper">
          <input
            class="form-input"
            v-model="config.withdrawFeeRate"
            type="digit"
            placeholder="0"
          />
          <text class="input-unit">%</text>
        </view>
      </view>
    </view>

    <!-- 操作按钮 -->
    <view class="action-buttons">
      <button class="action-btn secondary" @click="handleReset">重置默认</button>
      <button class="action-btn primary" @click="handleSave">保存配置</button>
    </view>

    <!-- 保存提示 -->
    <view class="save-tip">
      <text class="tip-icon">⚠️</text>
      <text class="tip-text">修改配置将影响新的订单佣金计算，请谨慎操作</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { callFunction } from '@/utils/cloudbase'
import AdminAuthManager from '@/utils/admin-auth'

/**
 * 系统设置页面
 * 功能：配置佣金比例、晋升阈值等系统参数
 */

// 配置数据
const config = ref({
  // 佣金比例
  level1Commission: '25',
  level2Commission: '20',
  level3Commission: '15',
  level4Commission: '10',
  repurchaseReward: '3',
  teamAward: '2',
  nurtureAllowance: '2',
  // 晋升阈值
  bronzeDirectCount: '5',
  bronzeTotalSales: '1000',
  silverDirectCount: '10',
  silverTeamCount: '30',
  silverMonthSales: '5000',
  goldDirectCount: '20',
  goldTeamCount: '100',
  goldMonthSales: '20000',
  // 其他
  minWithdrawAmount: '100',
  withdrawFeeRate: '0'
})

// 默认配置
const defaultConfig = { ...config.value }

onMounted(() => {
  loadConfig()
})

/**
 * 加载配置
 */
const loadConfig = async () => {
  try {
    uni.showLoading({ title: '加载中...' })

    const res = await callFunction('admin-api', {
      action: 'getSystemConfig',
      adminToken: AdminAuthManager.getToken()
    })

    uni.hideLoading()

    if (res.code === 0 && res.data) {
      config.value = {
        level1Commission: String(res.data.level1Commission ?? 25),
        level2Commission: String(res.data.level2Commission ?? 20),
        level3Commission: String(res.data.level3Commission ?? 15),
        level4Commission: String(res.data.level4Commission ?? 10),
        repurchaseReward: String(res.data.repurchaseReward ?? 3),
        teamAward: String(res.data.teamAward ?? 2),
        nurtureAllowance: String(res.data.nurtureAllowance ?? 2),
        bronzeDirectCount: String(res.data.bronzeDirectCount ?? 5),
        bronzeTotalSales: String(res.data.bronzeTotalSales ?? 1000),
        silverDirectCount: String(res.data.silverDirectCount ?? 10),
        silverTeamCount: String(res.data.silverTeamCount ?? 30),
        silverMonthSales: String(res.data.silverMonthSales ?? 5000),
        goldDirectCount: String(res.data.goldDirectCount ?? 20),
        goldTeamCount: String(res.data.goldTeamCount ?? 100),
        goldMonthSales: String(res.data.goldMonthSales ?? 20000),
        minWithdrawAmount: String(res.data.minWithdrawAmount ?? 100),
        withdrawFeeRate: String(res.data.withdrawFeeRate ?? 0)
      }
    }
  } catch (error: any) {
    uni.hideLoading()
    console.error('加载配置失败:', error)
  }
}

/**
 * 重置为默认值
 */
const handleReset = () => {
  uni.showModal({
    title: '确认重置',
    content: '确定要重置为默认配置吗？',
    success: (res) => {
      if (res.confirm) {
        config.value = { ...defaultConfig }
        uni.showToast({
          title: '已重置',
          icon: 'success'
        })
      }
    }
  })
}

/**
 * 验证配置
 */
const validateConfig = (): boolean => {
  // 验证佣金比例
  const commissionFields = [
    'level1Commission', 'level2Commission', 'level3Commission', 'level4Commission',
    'repurchaseReward', 'teamAward', 'nurtureAllowance', 'withdrawFeeRate'
  ]

  for (const field of commissionFields) {
    const value = parseFloat(config.value[field])
    if (isNaN(value) || value < 0 || value > 100) {
      uni.showToast({
        title: '佣金比例应在0-100之间',
        icon: 'none'
      })
      return false
    }
  }

  // 验证数值字段
  const numberFields = [
    'bronzeDirectCount', 'bronzeTotalSales', 'silverDirectCount', 'silverTeamCount',
    'silverMonthSales', 'goldDirectCount', 'goldTeamCount', 'goldMonthSales',
    'minWithdrawAmount'
  ]

  for (const field of numberFields) {
    const value = parseFloat(config.value[field])
    if (isNaN(value) || value < 0) {
      uni.showToast({
        title: '请输入有效的数值',
        icon: 'none'
      })
      return false
    }
  }

  // 验证晋升阈值的合理性
  if (parseInt(config.value.silverDirectCount) <= parseInt(config.value.bronzeDirectCount)) {
    uni.showToast({
      title: '银牌直接人数应大于铜牌',
      icon: 'none'
    })
    return false
  }

  if (parseInt(config.value.goldDirectCount) <= parseInt(config.value.silverDirectCount)) {
    uni.showToast({
      title: '金牌直接人数应大于银牌',
      icon: 'none'
    })
    return false
  }

  return true
}

/**
 * 保存配置
 */
const handleSave = async () => {
  if (!validateConfig()) return

  uni.showModal({
    title: '确认保存',
    content: '修改配置将影响新的订单佣金计算，确认保存？',
    success: async (res) => {
      if (res.confirm) {
        try {
          uni.showLoading({ title: '保存中...' })

          const saveData = {
            level1Commission: parseFloat(config.value.level1Commission),
            level2Commission: parseFloat(config.value.level2Commission),
            level3Commission: parseFloat(config.value.level3Commission),
            level4Commission: parseFloat(config.value.level4Commission),
            repurchaseReward: parseFloat(config.value.repurchaseReward),
            teamAward: parseFloat(config.value.teamAward),
            nurtureAllowance: parseFloat(config.value.nurtureAllowance),
            bronzeDirectCount: parseInt(config.value.bronzeDirectCount),
            bronzeTotalSales: parseInt(config.value.bronzeTotalSales),
            silverDirectCount: parseInt(config.value.silverDirectCount),
            silverTeamCount: parseInt(config.value.silverTeamCount),
            silverMonthSales: parseInt(config.value.silverMonthSales),
            goldDirectCount: parseInt(config.value.goldDirectCount),
            goldTeamCount: parseInt(config.value.goldTeamCount),
            goldMonthSales: parseInt(config.value.goldMonthSales),
            minWithdrawAmount: parseInt(config.value.minWithdrawAmount),
            withdrawFeeRate: parseFloat(config.value.withdrawFeeRate)
          }

          const response = await callFunction('admin-api', {
            action: 'updateSystemConfig',
            adminToken: AdminAuthManager.getToken(),
            data: saveData
          })

          uni.hideLoading()

          if (response.code === 0) {
            uni.showToast({
              title: '保存成功',
              icon: 'success'
            })
          } else {
            throw new Error(response.msg || '保存失败')
          }
        } catch (error: any) {
          uni.hideLoading()
          console.error('保存配置失败:', error)
          uni.showToast({
            title: error.message || '保存失败',
            icon: 'none'
          })
        }
      }
    }
  })
}
</script>

<style scoped>
.settings-page {
  min-height: 100vh;
  background: #1A1A1A;
  padding: 24rpx;
  padding-bottom: 120rpx;
}

/* 页面头部 */
.page-header {
  margin-bottom: 32rpx;
}

.page-title {
  font-size: 48rpx;
  font-weight: 700;
  color: #F5F5F0;
  letter-spacing: 2rpx;
  display: block;
}

.page-subtitle {
  font-size: 24rpx;
  color: rgba(245, 245, 240, 0.5);
  margin-top: 8rpx;
  display: block;
}

/* 设置区块 */
.setting-section {
  background: rgba(255, 255, 255, 0.03);
  border: 1rpx solid rgba(201, 169, 98, 0.1);
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 24rpx;
}

.section-header {
  margin-bottom: 24rpx;
  padding-bottom: 16rpx;
  border-bottom: 1rpx solid rgba(201, 169, 98, 0.1);
}

.section-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #F5F5F0;
  display: block;
}

.section-desc {
  font-size: 22rpx;
  color: rgba(245, 245, 240, 0.4);
  margin-top: 8rpx;
  display: block;
}

/* 表单项 */
.form-item {
  margin-bottom: 24rpx;
}

.form-item:last-child {
  margin-bottom: 0;
}

.form-label {
  font-size: 26rpx;
  color: rgba(245, 245, 240, 0.6);
  display: block;
  margin-bottom: 12rpx;
}

.input-wrapper {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.form-input {
  flex: 1;
  padding: 16rpx 20rpx;
  background: rgba(255, 255, 255, 0.03);
  border: 1rpx solid rgba(201, 169, 98, 0.2);
  border-radius: 12rpx;
  font-size: 28rpx;
  color: #F5F5F0;
}

.input-unit {
  font-size: 24rpx;
  color: rgba(245, 245, 240, 0.5);
  flex-shrink: 0;
  min-width: 40rpx;
}

.form-tip {
  font-size: 22rpx;
  color: rgba(245, 245, 240, 0.3);
  margin-top: 8rpx;
  display: block;
}

/* 操作按钮 */
.action-buttons {
  display: flex;
  gap: 16rpx;
  margin-bottom: 16rpx;
}

.action-btn {
  flex: 1;
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 16rpx;
  font-size: 28rpx;
  font-weight: 600;
  border: none;
}

.action-btn.secondary {
  background: rgba(255, 255, 255, 0.05);
  border: 1rpx solid rgba(201, 169, 98, 0.2);
  color: #C9A962;
}

.action-btn.secondary:active {
  background: rgba(255, 255, 255, 0.08);
}

.action-btn.primary {
  background: linear-gradient(145deg, #C8A464 0%, #A88B4A 100%);
  color: #0D0D0D;
}

.action-btn.primary:active {
  opacity: 0.9;
}

/* 保存提示 */
.save-tip {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 16rpx 20rpx;
  background: rgba(212, 165, 116, 0.1);
  border: 1rpx solid rgba(212, 165, 116, 0.2);
  border-radius: 12rpx;
}

.tip-icon {
  font-size: 24rpx;
}

.tip-text {
  font-size: 22rpx;
  color: rgba(245, 245, 240, 0.5);
  flex: 1;
}
</style>
