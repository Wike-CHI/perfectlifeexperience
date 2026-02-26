<template>
  <view :class="['admin-icon', `admin-icon--${size}`, `admin-icon--${variant}`]" :style="iconStyle">
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <!-- 用户图标 -->
      <path v-if="name === 'user'" d="M12 12C14.7614 12 17 9.76142 17 7C17 4.23858 14.7614 2 12 2C9.23858 2 7 4.23858 7 7C7 9.76142 9.23858 12 12 12Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      <path v-if="name === 'user'" d="M20.5899 22C20.5899 18.13 16.7499 15 11.9999 15C7.24992 15 3.40992 18.13 3.40992 22" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>

      <!-- 搜索图标 -->
      <circle v-if="name === 'search'" cx="11" cy="11" r="7" stroke="currentColor" stroke-width="1.5"/>
      <path v-if="name === 'search'" d="M20 20L15.5 15.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>

      <!-- 眼睛/密码显示 -->
      <path v-if="name === 'eye'" d="M1 12S5 4 12 4S23 12 23 12S19 20 12 20S1 12 1 12Z" stroke="currentColor" stroke-width="1.5"/>
      <circle v-if="name === 'eye'" cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.5"/>
      <path v-if="name === 'eye-off'" d="M1 12S5 4 12 4S23 12 23 12" stroke="currentColor" stroke-width="1.5"/>
      <path v-if="name === 'eye-off'" d="M3 3L21 21" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>

      <!-- 位置 -->
      <path v-if="name === 'location'" d="M12 2C8.13 2 5 5.13 5 9C5 14.25 12 22 12 22C12 22 19 14.25 19 9C19 5.13 15.87 2 12 2Z" stroke="currentColor" stroke-width="1.5"/>
      <circle v-if="name === 'location'" cx="12" cy="9" r="2.5" stroke="currentColor" stroke-width="1.5"/>

      <!-- 包裹/订单 -->
      <rect v-if="name === 'package'" x="3" y="8" width="18" height="13" rx="2" stroke="currentColor" stroke-width="1.5"/>
      <path v-if="name === 'package'" d="M3 13H21" stroke="currentColor" stroke-width="1.5"/>
      <path v-if="name === 'package'" d="M12 8V3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      <path v-if="name === 'package'" d="M9 3H15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>

      <!-- 金钱/钱包 -->
      <circle v-if="name === 'money'" cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.5"/>
      <path v-if="name === 'money'" d="M8 12H16" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      <path v-if="name === 'money'" d="M12 8V16" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>

      <!-- 购物车 -->
      <circle v-if="name === 'cart'" cx="9" cy="20" r="1.5" stroke="currentColor" stroke-width="1.5"/>
      <circle v-if="name === 'cart'" cx="20" cy="20" r="1.5" stroke="currentColor" stroke="1.5"/>
      <path v-if="name === 'cart'" d="M1 1H5L7.68 14.39C7.77144 14.8504 8.02191 15.264 8.38755 15.5583C8.75318 15.8526 9.2107 16.009 9.68 16H19.4C19.8693 16.009 20.3268 15.8526 20.6925 15.5583C21.0581 15.264 21.3086 14.8504 21.4 14.39L23 6H6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>

      <!-- 用户群组 -->
      <path v-if="name === 'users'" d="M17 21V19C17 17.9391 16.5786 16.9217 15.8284 16.1716C15.0783 15.4214 14.0609 15 13 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      <circle v-if="name === 'users'" cx="9" cy="7" r="4" stroke="currentColor" stroke-width="1.5"/>
      <path v-if="name === 'users'" d="M23 21V19C22.9993 18.1137 22.7044 17.2528 22.1614 16.5523C21.6184 15.8519 20.8581 15.3516 20 15.13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      <path v-if="name === 'users'" d="M16 3.13C16.8604 3.35031 17.623 3.85071 18.1676 4.55232C18.7122 5.25392 19.0078 6.11683 19.0078 7.005C19.0078 7.89318 18.7122 8.75608 18.1676 9.45769C17.623 10.1593 16.8604 10.6597 16 10.88" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>

      <!-- 图表 -->
      <path v-if="name === 'chart'" d="M18 20V10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      <path v-if="name === 'chart'" d="M12 20V4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      <path v-if="name === 'chart'" d="M6 20V14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>

      <!-- 加号/添加 -->
      <path v-if="name === 'plus'" d="M12 5V19" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      <path v-if="name === 'plus'" d="M5 12H19" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>

      <!-- 文档列表 -->
      <path v-if="name === 'list'" d="M8 6H21" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      <path v-if="name === 'list'" d="M8 12H21" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      <path v-if="name === 'list'" d="M8 18H21" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      <path v-if="name === 'list'" d="M3 6H3.01" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      <path v-if="name === 'list'" d="M3 12H3.01" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      <path v-if="name === 'list'" d="M3 18H3.01" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>

      <!-- 退款/返回 -->
      <path v-if="name === 'refund'" d="M8 16H5C4.46957 16 3.96086 15.7893 3.58579 15.4142C3.21071 15.0391 3 14.5304 3 14V10C3 9.46957 3.21071 8.96086 3.58579 8.58579C3.96086 8.21071 4.46957 8 5 8H16" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      <path v-if="name === 'refund'" d="M6 11L3 8L6 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>

      <!-- 刷新/转账 -->
      <path v-if="name === 'refresh'" d="M21 2V6H17" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      <path v-if="name === 'refresh'" d="M3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12C21 16.9706 16.9706 21 12 21C9.29412 21 6.86123 19.8506 5.22836 18" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      <path v-if="name === 'refresh'" d="M3 22V18H7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>

      <!-- 勾选/成功 -->
      <path v-if="name === 'check'" d="M20 6L9 17L4 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>

      <!-- 关闭/取消 -->
      <path v-if="name === 'close'" d="M18 6L6 18" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      <path v-if="name === 'close'" d="M6 6L18 18" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>

      <!-- 警告/提示 -->
      <path v-if="name === 'alert'" d="M12 9V12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      <path v-if="name === 'alert'" d="M12 17H12.01" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      <path v-if="name === 'alert'" d="M10.29 3.86L1.81982 18C1.63537 18.3024 1.53688 18.6508 1.53545 19.0054C1.53403 19.36 1.62971 19.7081 1.81185 20.0106C1.994 20.3132 2.25544 20.5583 2.5686 20.7208C2.88177 20.8833 3.2346 20.9576 3.58782 20.9359H20.4122C20.7654 20.9576 21.1182 20.8833 21.4314 20.7208C21.7446 20.5583 22.006 20.3132 22.1881 20.0106C22.3703 19.7081 22.466 19.36 22.4645 19.0054C22.4631 18.6508 22.3646 18.3024 22.1802 18L13.71 3.86C13.5319 3.55246 13.2719 3.30063 12.9594 3.13269C12.6469 2.96475 12.2933 2.88664 11.9372 2.90637C11.5811 2.9261 11.2386 3.04296 10.9476 3.24482C10.6566 3.44668 10.4276 3.72638 10.2858 4.05492L10.29 3.86Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>

      <!-- 灯泡/提示 -->
      <path v-if="name === 'bulb'" d="M9 18H15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      <path v-if="name === 'bulb'" d="M10 22H14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      <path v-if="name === 'bulb'" d="M12 2C8.13 2 5 5.13 5 9C5 11.38 6.19 13.47 8 14.74V17C8 17.55 8.45 18 9 18H15C15.55 18 16 17.55 16 17V14.74C17.81 13.47 19 11.38 19 9C19 5.13 15.87 2 12 2Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>

      <!-- 奖杯/成就 -->
      <path v-if="name === 'trophy'" d="M8 21H16" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      <path v-if="name === 'trophy'" d="M12 21V17" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      <path v-if="name === 'trophy'" d="M17 4H7C5.89543 4 5 4.89543 5 6V8C5 11.3137 7.68629 14 11 14H13C16.3137 14 19 11.3137 19 8V6C19 4.89543 18.1046 4 17 4Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      <path v-if="name === 'trophy'" d="M5 8C3.34315 8 2 9.34315 2 11C2 12.6569 3.34315 14 5 14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      <path v-if="name === 'trophy'" d="M19 8C20.6569 8 22 9.34315 22 11C22 12.6569 20.6569 14 19 14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>

      <!-- 图片/横幅 -->
      <rect v-if="name === 'image'" x="3" y="3" width="18" height="18" rx="2" ry="2" stroke="currentColor" stroke-width="1.5"/>
      <circle v-if="name === 'image'" cx="8.5" cy="8.5" r="1.5" fill="currentColor"/>
      <path v-if="name === 'image'" d="M21 15L16 10L5 21" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>

      <!-- 优惠券/票券 -->
      <path v-if="name === 'coupon'" d="M20 6H4C2.89543 6 2 6.89543 2 8V10C3.10457 10 4 10.8954 4 12C4 13.1046 3.10457 14 2 14V16C2 17.1046 2.89543 18 4 18H20C21.1046 18 22 17.1046 22 16V14C20.8954 14 20 13.1046 20 12C20 10.8954 20.8954 10 22 10V8C22 6.89543 21.1046 6 20 6Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      <path v-if="name === 'coupon'" d="M9 12H15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>

      <!-- 锁 -->
      <rect v-if="name === 'lock'" x="6" y="11" width="12" height="10" rx="2" stroke="currentColor" stroke-width="1.5"/>
      <circle v-if="name === 'lock'" cx="12" cy="16" r="1" fill="currentColor"/>
      <path v-if="name === 'lock'" d="M8 11V7C8 5.93913 8.42143 4.92172 9.17157 4.17157C9.92172 3.42143 10.9391 3 12 3C13.0609 3 14.0783 3.42143 14.8284 4.17157C15.5786 4.92172 16 5.93913 16 7V11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>

      <!-- 空包裹 -->
      <rect v-if="name === 'box'" x="4" y="8" width="16" height="12" rx="2" stroke="currentColor" stroke-width="1.5" stroke-dasharray="4 4"/>
      <path v-if="name === 'box'" d="M9 8V3H15V8" stroke="currentColor" stroke-width="1.5"/>

      <!-- 银行卡 -->
      <rect v-if="name === 'card'" x="2" y="5" width="20" height="14" rx="3" stroke="currentColor" stroke-width="1.5"/>
      <path v-if="name === 'card'" d="M2 10H22" stroke="currentColor" stroke-width="1.5"/>
      <path v-if="name === 'card'" d="M6 15H10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>

      <!-- 卡车/发货 -->
      <path v-if="name === 'truck'" d="M16 3H1V14H16V3Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      <path v-if="name === 'truck'" d="M16 8H20L23 11V14H16V8Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      <circle v-if="name === 'truck'" cx="5.5" cy="17.5" r="2.5" stroke="currentColor" stroke-width="1.5"/>
      <circle v-if="name === 'truck'" cx="18.5" cy="17.5" r="2.5" stroke="currentColor" stroke-width="1.5"/>

      <!-- 时钟/时间 -->
      <circle v-if="name === 'clock'" cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.5"/>
      <path v-if="name === 'clock'" d="M12 6V12L16 14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  name: string
  size?: 'small' | 'medium' | 'large'
  variant?: 'default' | 'gold' | 'success' | 'warning' | 'danger'
}

const props = withDefaults(defineProps<Props>(), {
  size: 'medium',
  variant: 'default'
})

const iconStyle = computed(() => {
  const colors = {
    default: 'rgba(245, 245, 240, 0.7)',
    gold: '#C9A962',
    success: '#7A9A8E',
    warning: '#D4A574',
    danger: '#B85C5C'
  }
  return { color: colors[props.variant] }
})
</script>

<style scoped>
.admin-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.admin-icon--small {
  width: 32rpx;
  height: 32rpx;
}

.admin-icon--medium {
  width: 48rpx;
  height: 48rpx;
}

.admin-icon--large {
  width: 64rpx;
  height: 64rpx;
}

.admin-icon svg {
  width: 100%;
  height: 100%;
}
</style>
