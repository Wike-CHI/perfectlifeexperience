<template>
  <view class="container">
    <view class="header">
      <text class="title">会员储值</text>
      <text class="subtitle">充值享赠送优惠，余额可用于购买商品</text>
    </view>

    <!-- 充值档位网格 -->
    <view class="amount-grid">
      <view 
        v-for="(option, index) in rechargeOptions" 
        :key="index"
        :class="['amount-card', isFixedOptionSelected(option) ? 'active' : '']"
        @click="selectOption(option)"
      >
        <view class="amount-main">
          <text class="currency">¥</text>
          <text class="value">{{ option.amount }}</text>
        </view>
        <view class="gift-badge" v-if="option.gift > 0">
          <text class="gift-text">赠¥{{ option.gift }}</text>
        </view>
      </view>
      
      <!-- 自定义金额卡片 -->
      <view 
        :class="['amount-card', 'custom-card', isCustomAmount ? 'active' : '']"
        @click="selectCustom"
      >
        <view class="amount-main" v-if="!isCustomAmount">
          <text class="custom-label">自定义</text>
        </view>
        <view class="custom-input-wrapper" v-else @click.stop>
          <text class="currency">¥</text>
          <input 
            class="custom-input"
            type="digit"
            v-model="customAmount"
            placeholder="输入金额"
            focus
            @input="onCustomInput"
          />
        </view>
      </view>
    </view>

    <!-- 选中档位的详情展示 -->
    <view class="selected-detail" v-if="currentAmount > 0">
      <view class="detail-row">
        <text class="detail-label">充值金额</text>
        <text class="detail-value">¥{{ currentAmount }}</text>
      </view>
      <view class="detail-row" v-if="currentGift > 0">
        <text class="detail-label">赠送金额</text>
        <text class="detail-value gift">+¥{{ currentGift }}</text>
      </view>
      <view class="detail-divider"></view>
      <view class="detail-row total">
        <text class="detail-label">实际到账</text>
        <text class="detail-value total">¥{{ totalAmount }}</text>
      </view>
    </view>

    <!-- 支付按钮 -->
    <view class="footer">
      <view class="pay-info" v-if="currentAmount > 0">
        <text class="pay-label">实付金额</text>
        <text class="pay-amount">¥{{ currentAmount }}</text>
      </view>
      <button 
        class="pay-btn" 
        :disabled="loading || currentAmount <= 0"
        @click="handleRecharge"
      >
        {{ loading ? '处理中...' : '立即支付' }}
      </button>
      <text class="tips">点击支付即代表同意《用户充值协议》</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { rechargeWallet } from '@/utils/api';
import { rechargeOptions, getGiftAmount, type RechargeOption } from '@/config/recharge';

const selectedOption = ref<RechargeOption | null>(null);
const isCustomAmount = ref(false);
const customAmount = ref('');
const loading = ref(false);

// 当前充值金额
const currentAmount = computed(() => {
  if (isCustomAmount.value) {
    return parseFloat(customAmount.value) || 0;
  }
  return selectedOption.value?.amount || 0;
});

// 当前赠送金额
const currentGift = computed(() => {
  if (isCustomAmount.value) {
    // 自定义金额不赠送
    return 0;
  }
  return selectedOption.value?.gift || 0;
});

// 计算总到账金额
const totalAmount = computed(() => {
  return currentAmount.value + currentGift.value;
});

// 检查是否为固定档位选中
const isFixedOptionSelected = (option: RechargeOption) => {
  return !isCustomAmount.value && selectedOption.value?.amount === option.amount;
};

// 选择充值档位
const selectOption = (option: RechargeOption) => {
  selectedOption.value = option;
  isCustomAmount.value = false;
  customAmount.value = '';
};

// 选择自定义金额
const selectCustom = () => {
  isCustomAmount.value = true;
  selectedOption.value = null;
};

// 自定义金额输入处理
const onCustomInput = (e: any) => {
  let value = e.detail.value;
  // 只允许数字和小数点
  value = value.replace(/[^\d.]/g, '');
  // 限制小数点后两位
  const parts = value.split('.');
  if (parts.length > 2) {
    value = parts[0] + '.' + parts[1];
  }
  if (parts[1] && parts[1].length > 2) {
    value = parts[0] + '.' + parts[1].slice(0, 2);
  }
  // 限制最大金额 99999
  const numValue = parseFloat(value);
  if (numValue > 99999) {
    value = '99999';
  }
  customAmount.value = value;
};

// 处理充值
const handleRecharge = async () => {
  const amount = currentAmount.value;
  
  if (amount <= 0) {
    uni.showToast({
      title: '请输入有效的充值金额',
      icon: 'none'
    });
    return;
  }
  
  if (amount < 1) {
    uni.showToast({
      title: '充值金额不能小于1元',
      icon: 'none'
    });
    return;
  }

  const gift = currentGift.value;

  loading.value = true;
  try {
    // 转换为分
    const amountInCents = Math.round(amount * 100);
    const giftInCents = Math.round(gift * 100);
    
    await rechargeWallet(amountInCents, giftInCents);
    
    uni.showToast({
      title: `充值成功，到账¥${totalAmount.value}`,
      icon: 'success'
    });
    
    setTimeout(() => {
      uni.navigateBack();
    }, 1500);
  } catch (error: any) {
    uni.showToast({
      title: error.message || '充值失败',
      icon: 'none'
    });
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.container {
  min-height: 100vh;
  background-color: #FDF8F5;
  padding: 40rpx;
}

.header {
  margin-bottom: 48rpx;
}

.title {
  font-size: 40rpx;
  font-weight: bold;
  color: #333;
  display: block;
  margin-bottom: 12rpx;
}

.subtitle {
  font-size: 26rpx;
  color: #999;
}

.amount-grid {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  margin-bottom: 48rpx;
}

.amount-card {
  width: 48%;
  background: #FFFFFF;
  border-radius: 24rpx;
  padding: 32rpx 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 24rpx;
  border: 2rpx solid transparent;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
  position: relative;
}

.amount-card.active {
  border-color: #C8A464;
  background: linear-gradient(145deg, #FFF9F0 0%, #FFF5E8 100%);
}

.amount-main {
  display: flex;
  align-items: baseline;
  margin-bottom: 12rpx;
}

.amount-main .currency {
  font-size: 28rpx;
  color: #333;
  font-weight: 600;
  margin-right: 4rpx;
}

.amount-main .value {
  font-size: 48rpx;
  font-weight: bold;
  color: #333;
}

.gift-badge {
  background: linear-gradient(135deg, #C8A464 0%, #A88B4A 100%);
  border-radius: 20rpx;
  padding: 6rpx 20rpx;
}

.gift-text {
  font-size: 22rpx;
  color: #FFFFFF;
  font-weight: 500;
}

/* 自定义金额卡片 */
.custom-card {
  justify-content: center;
  min-height: 140rpx;
}

.custom-label {
  font-size: 32rpx;
  color: #666;
  font-weight: 500;
}

.custom-input-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: 0 20rpx;
}

.custom-input {
  font-size: 40rpx;
  font-weight: bold;
  color: #333;
  text-align: center;
  width: 160rpx;
  height: 60rpx;
  min-height: 60rpx;
}

/* 选中详情 */
.selected-detail {
  background: #FFFFFF;
  border-radius: 24rpx;
  padding: 32rpx;
  margin-bottom: 48rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.05);
}

.detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20rpx;
}

.detail-row:last-child {
  margin-bottom: 0;
}

.detail-label {
  font-size: 28rpx;
  color: #666;
}

.detail-value {
  font-size: 32rpx;
  color: #333;
  font-weight: 600;
}

.detail-value.gift {
  color: #C8A464;
}

.detail-value.total {
  font-size: 40rpx;
  color: #C8A464;
  font-weight: bold;
}

.detail-divider {
  height: 1rpx;
  background: #EEE;
  margin: 24rpx 0;
}

/* 底部支付区域 */
.footer {
  margin-top: auto;
}

.pay-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #FFFFFF;
  border-radius: 16rpx;
  padding: 24rpx 32rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.05);
}

.pay-label {
  font-size: 28rpx;
  color: #666;
}

.pay-amount {
  font-size: 40rpx;
  color: #333;
  font-weight: bold;
}

.pay-btn {
  background: linear-gradient(135deg, #C8A464 0%, #A88B4A 100%);
  color: #FFFFFF;
  border-radius: 44rpx;
  height: 96rpx;
  line-height: 96rpx;
  font-size: 32rpx;
  font-weight: 600;
  box-shadow: 0 10rpx 30rpx rgba(200, 164, 100, 0.4);
  margin-bottom: 20rpx;
}

.pay-btn:active {
  opacity: 0.9;
}

.pay-btn[disabled] {
  background: #E0E0E0;
  color: #999;
  box-shadow: none;
}

.tips {
  display: block;
  text-align: center;
  font-size: 24rpx;
  color: #CCC;
}
</style>
