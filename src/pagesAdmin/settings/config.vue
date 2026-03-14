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
        <text class="form-label">一级代理佣金比例（金牌推广员）</text>
        <view class="input-wrapper">
          <input
            class="form-input"
            v-model="config.level1Commission"
            type="digit"
            placeholder="20"
          />
          <text class="input-unit">%</text>
        </view>
      </view>

      <view class="form-item">
        <text class="form-label">二级代理佣金比例（银牌推广员）</text>
        <view class="input-wrapper">
          <input
            class="form-input"
            v-model="config.level2Commission"
            type="digit"
            placeholder="12"
          />
          <text class="input-unit">%</text>
        </view>
      </view>

      <view class="form-item">
        <text class="form-label">三级代理佣金比例（铜牌推广员）</text>
        <view class="input-wrapper">
          <input
            class="form-input"
            v-model="config.level3Commission"
            type="digit"
            placeholder="12"
          />
          <text class="input-unit">%</text>
        </view>
      </view>

      <view class="form-item">
        <text class="form-label">四级代理佣金比例（普通会员）</text>
        <view class="input-wrapper">
          <input
            class="form-input"
            v-model="config.level4Commission"
            type="digit"
            placeholder="8"
          />
          <text class="input-unit">%</text>
        </view>
      </view>
    </view>

    <!-- 晋升阈值配置 -->
    <view class="setting-section">
      <view class="section-header">
        <text class="section-title">晋升阈值配置</text>
        <text class="section-desc">设置各级代理的晋升条件（团队人数 + 销售额）</text>
      </view>

      <view class="form-item">
        <text class="form-label">铜牌推广员 - 累计销售额</text>
        <view class="input-wrapper">
          <input
            class="form-input"
            v-model="config.bronzeTotalSales"
            type="number"
            placeholder="20000"
          />
          <text class="input-unit">元</text>
        </view>
        <text class="form-tip">普通会员晋升为铜牌推广员</text>
      </view>

      <view class="form-item">
        <text class="form-label">银牌推广员 - 团队人数</text>
        <view class="input-wrapper">
          <input
            class="form-input"
            v-model="config.silverTeamCount"
            type="number"
            placeholder="50"
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
            placeholder="50000"
          />
          <text class="input-unit">元</text>
        </view>
        <text class="form-tip">铜牌晋升为银牌需同时满足</text>
      </view>

      <view class="form-item">
        <text class="form-label">金牌推广员 - 团队人数</text>
        <view class="input-wrapper">
          <input
            class="form-input"
            v-model="config.goldTeamCount"
            type="number"
            placeholder="200"
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
            placeholder="100000"
          />
          <text class="input-unit">元</text>
        </view>
        <text class="form-tip">银牌晋升为金牌需同时满足</text>
      </view>
    </view>

    <!-- 充值配置 -->
    <view class="setting-section">
      <view class="section-header">
        <text class="section-title">充值配置</text>
        <text class="section-desc">设置充值档位及赠送金额</text>
      </view>

      <view class="recharge-options">
        <view
          class="recharge-option"
          v-for="(opt, idx) in rechargeOptions"
          :key="idx"
        >
          <view class="option-input">
            <text class="option-label">充值</text>
            <input
              class="form-input small"
              v-model="opt.amount"
              type="number"
              placeholder="金额"
            />
            <text class="option-unit">元</text>
          </view>
          <view class="option-input">
            <text class="option-label">赠送</text>
            <input
              class="form-input small"
              v-model="opt.gift"
              type="number"
              placeholder="金额"
            />
            <text class="option-unit">元</text>
          </view>
          <view class="option-actions">
            <view class="delete-btn" @click="removeRechargeOption(idx)">
              <AdminIcon name="delete" size="small" variant="danger" />
            </view>
          </view>
        </view>
      </view>

      <view class="add-option-btn" @click="addRechargeOption">
        <AdminIcon name="plus" size="small" />
        <text>添加充值档位</text>
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
            placeholder="1"
          />
          <text class="input-unit">元</text>
        </view>
        <text class="form-tip">用户单次提现的最低金额限制</text>
      </view>

      <view class="form-item">
        <text class="form-label">最大提现金额</text>
        <view class="input-wrapper">
          <input
            class="form-input"
            v-model="config.maxWithdrawAmount"
            type="number"
            placeholder="500"
          />
          <text class="input-unit">元</text>
        </view>
        <text class="form-tip">用户单次提现的最大金额限制</text>
      </view>

      <view class="form-item">
        <text class="form-label">每日提现次数限制</text>
        <view class="input-wrapper">
          <input
            class="form-input"
            v-model="config.maxDailyWithdraws"
            type="number"
            placeholder="3"
          />
          <text class="input-unit">次</text>
        </view>
        <text class="form-tip">每个用户每天最多可申请提现的次数</text>
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
      <AdminIcon name="alert" size="medium" variant="warning" />
      <text class="tip-text">修改配置将影响新的订单佣金计算，请谨慎操作</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { callFunction } from '@/utils/cloudbase'
import AdminAuthManager from '@/utils/admin-auth'
import AdminIcon from '@/components/admin-icon.vue'

/**
 * 系统设置页面
 * 功能：配置佣金比例、晋升阈值等系统参数
 */

// 配置数据
const config = ref({
  // 佣金比例（修正后的正确值）
  level1Commission: '20',
  level2Commission: '12',
  level3Commission: '12',  // 修正：8 → 12
  level4Commission: '8',   // 修正：4 → 8
  // 晋升阈值（修正后的正确值）
  bronzeTotalSales: '20000',   // 修正：1000 → 20000
  silverTeamCount: '50',       // 修正：30 → 50
  silverMonthSales: '50000',   // 修正：5000 → 50000
  goldTeamCount: '200',        // 修正：100 → 200
  goldMonthSales: '100000',    // 修正：20000 → 100000
  // 其他（修正后的正确值）
  minWithdrawAmount: '1',      // 修正：100 → 1
  maxWithdrawAmount: '500',    // 新增：最大提现金额
  maxDailyWithdraws: '3',      // 新增：每日提现次数
  withdrawFeeRate: '0'
})

// 充值配置(默认无赠送)
const rechargeOptions = ref([
  { amount: '100', gift: '0' },
  { amount: '200', gift: '0' },
  { amount: '500', gift: '0' },
  { amount: '1000', gift: '0' },
  { amount: '2000', gift: '0' }
])

// 默认配置
const defaultConfig = { ...config.value }

// 添加充值档位
const addRechargeOption = () => {
  rechargeOptions.value.push({ amount: '', gift: '' })
}

// 删除充值档位
const removeRechargeOption = (index: number) => {
  if (rechargeOptions.value.length <= 1) {
    uni.showToast({
      title: '至少保留一个档位',
      icon: 'none'
    })
    return
  }
  rechargeOptions.value.splice(index, 1)
}

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
        level1Commission: String(res.data.level1Commission ?? 20),
        level2Commission: String(res.data.level2Commission ?? 12),
        level3Commission: String(res.data.level3Commission ?? 12),  // 修正：8 → 12
        level4Commission: String(res.data.level4Commission ?? 8),   // 修正：4 → 8
        bronzeTotalSales: String(res.data.bronzeTotalSales ?? 20000),   // 修正
        silverTeamCount: String(res.data.silverTeamCount ?? 50),       // 修正
        silverMonthSales: String(res.data.silverMonthSales ?? 50000),   // 修正
        goldTeamCount: String(res.data.goldTeamCount ?? 200),        // 修正
        goldMonthSales: String(res.data.goldMonthSales ?? 100000),    // 修正
        minWithdrawAmount: String(res.data.minWithdrawAmount ?? 1),      // 修正：1元
        maxWithdrawAmount: String(res.data.maxWithdrawAmount ?? 500),    // 新增
        maxDailyWithdraws: String(res.data.maxDailyWithdraws ?? 3),      // 新增
        withdrawFeeRate: String(res.data.withdrawFeeRate ?? 0)
      }

      // 加载充值配置
      if (res.data.rechargeOptions && Array.isArray(res.data.rechargeOptions) && res.data.rechargeOptions.length > 0) {
        rechargeOptions.value = res.data.rechargeOptions.map((opt: any) => ({
          amount: String(opt.amount ?? ''),
          gift: String(opt.gift ?? '')
        }))
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
    'withdrawFeeRate'
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
    'bronzeTotalSales', 'silverTeamCount', 'silverMonthSales',
    'goldTeamCount', 'goldMonthSales', 'minWithdrawAmount',
    'maxWithdrawAmount', 'maxDailyWithdraws'  // 新增字段
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
  if (parseInt(config.value.silverTeamCount) <= 0) {
    uni.showToast({
      title: '银牌团队人数应大于0',
      icon: 'none'
    })
    return false
  }

  if (parseInt(config.value.goldTeamCount) <= parseInt(config.value.silverTeamCount)) {
    uni.showToast({
      title: '金牌团队人数应大于银牌',
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
            bronzeTotalSales: parseInt(config.value.bronzeTotalSales),
            silverTeamCount: parseInt(config.value.silverTeamCount),
            silverMonthSales: parseInt(config.value.silverMonthSales),
            goldTeamCount: parseInt(config.value.goldTeamCount),
            goldMonthSales: parseInt(config.value.goldMonthSales),
            minWithdrawAmount: parseInt(config.value.minWithdrawAmount),
            maxWithdrawAmount: parseInt(config.value.maxWithdrawAmount),  // 新增
            maxDailyWithdraws: parseInt(config.value.maxDailyWithdraws),  // 新增
            withdrawFeeRate: parseFloat(config.value.withdrawFeeRate),
            // 充值配置
            rechargeOptions: rechargeOptions.value
              .filter(opt => opt.amount && opt.gift)
              .map(opt => ({
                amount: parseInt(opt.amount),
                gift: parseInt(opt.gift)
              }))
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

/* 充值配置样式 */
.recharge-options {
  margin-bottom: 16rpx;
}

.recharge-option {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 16rpx;
  background: rgba(255, 255, 255, 0.02);
  border: 1rpx solid rgba(201, 169, 98, 0.1);
  border-radius: 12rpx;
  margin-bottom: 12rpx;
}

.option-input {
  display: flex;
  align-items: center;
  gap: 8rpx;
  flex: 1;
}

.option-label {
  font-size: 24rpx;
  color: rgba(245, 245, 240, 0.5);
  min-width: 40rpx;
}

.option-unit {
  font-size: 24rpx;
  color: rgba(245, 245, 240, 0.5);
}

.form-input.small {
  width: 120rpx;
  padding: 12rpx 16rpx;
}

.option-actions {
  display: flex;
  align-items: center;
}

.delete-btn {
  padding: 8rpx;
}

.add-option-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  padding: 20rpx;
  border: 1rpx dashed rgba(201, 169, 98, 0.3);
  border-radius: 12rpx;
  color: #C9A962;
  font-size: 26rpx;
}

.add-option-btn:active {
  background: rgba(201, 169, 98, 0.1);
}
</style>
