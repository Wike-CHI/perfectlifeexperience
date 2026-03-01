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
      <circle v-if="name === 'cart'" cx="20" cy="20" r="1.5" stroke="currentColor" stroke-width="1.5"/>
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

      <!-- 优惠券/票券 -->
      <path v-if="name === 'ticket'" d="M20 6H4C2.89543 6 2 6.89543 2 8V10C3.10457 10 4 10.8954 4 12C4 13.1046 3.10457 14 2 14V16C2 17.1046 2.89543 18 4 18H20C21.1046 18 22 17.1046 22 16V14C20.8954 14 20 13.1046 20 12C20 10.8954 20.8954 10 22 10V8C22 6.89543 21.1046 6 20 6Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      <path v-if="name === 'ticket'" d="M9 12H15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>

      <!-- 礼物/活动 -->
      <rect v-if="name === 'gift'" x="3" y="8" width="18" height="13" rx="2" stroke="currentColor" stroke-width="1.5"/>
      <path v-if="name === 'gift'" d="M12 8V21" stroke="currentColor" stroke-width="1.5"/>
      <path v-if="name === 'gift'" d="M3 12H21" stroke="currentColor" stroke-width="1.5"/>
      <path v-if="name === 'gift'" d="M12 8C12 8 12 4 8 4C6 4 6 6 6 6C6 8 8 8 12 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      <path v-if="name === 'gift'" d="M12 8C12 8 12 4 16 4C18 4 18 6 18 6C18 8 16 8 12 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>

      <!-- 公告/通知 -->
      <path v-if="name === 'notice'" d="M18 8C18 6.4087 17.3679 4.88258 16.2426 3.75736C15.1174 2.63214 13.5913 2 12 2C10.4087 2 8.88258 2.63214 7.75736 3.75736C6.63214 4.88258 6 6.4087 6 8V16C6 16 4 16 4 18H20C20 16 18 16 18 16V8Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      <path v-if="name === 'notice'" d="M9 21H15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      <path v-if="name === 'notice'" d="M12 2V4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>

      <!-- 金币/佣金 -->
      <circle v-if="name === 'coin'" cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.5"/>
      <path v-if="name === 'coin'" d="M12 7V17" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      <path v-if="name === 'coin'" d="M15 10H10C9.46957 10 8.96086 10.2107 8.58579 10.5858C8.21071 10.9609 8 11.4696 8 12C8 12.5304 8.21071 13.0391 8.58579 13.4142C8.96086 13.7893 9.46957 14 10 14H14C14.5304 14 15.0391 14.2107 15.4142 14.5858C15.7893 14.9609 16 15.4696 16 16C16 16.5304 15.7893 17.0391 15.4142 17.4142C15.0391 17.7893 14.5304 18 14 18H9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>

      <!-- 钱包 -->
      <rect v-if="name === 'wallet'" x="2" y="6" width="20" height="14" rx="2" stroke="currentColor" stroke-width="1.5"/>
      <path v-if="name === 'wallet'" d="M16 12H16.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      <path v-if="name === 'wallet'" d="M2 10H22" stroke="currentColor" stroke-width="1.5"/>

      <!-- 店铺 -->
      <path v-if="name === 'shop'" d="M3 9L5 4H19L21 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      <path v-if="name === 'shop'" d="M3 9V19C3 19.5304 3.21071 20.0391 3.58579 20.4142C3.96086 20.7893 4.46957 21 5 21H19C19.5304 21 20.0391 20.7893 20.4142 20.4142C20.7893 20.0391 21 19.5304 21 19V9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      <path v-if="name === 'shop'" d="M9 21V14H15V21" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      <path v-if="name === 'shop'" d="M10 4V9C10 9.53043 10.2107 10.0391 10.5858 10.4142C10.9609 10.7893 11.4696 11 12 11C12.5304 11 13.0391 10.7893 13.4142 10.4142C13.7893 10.0391 14 9.53043 14 9V4" stroke="currentColor" stroke-width="1.5"/>

      <!-- 设置 -->
      <circle v-if="name === 'settings'" cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.5"/>
      <path v-if="name === 'settings'" d="M19.4 15C19.2669 15.3016 19.2272 15.6362 19.286 15.9606C19.3448 16.285 19.4995 16.5843 19.73 16.82L19.79 16.88C19.976 17.0657 20.1235 17.2863 20.2241 17.5291C20.3248 17.7719 20.3766 18.0322 20.3766 18.295C20.3766 18.5578 20.3248 18.8181 20.2241 19.0609C20.1235 19.3037 19.976 19.5243 19.79 19.71C19.6043 19.896 19.3837 20.0435 19.1409 20.1441C18.8981 20.2448 18.6378 20.2966 18.375 20.2966C18.1122 20.2966 17.8519 20.2448 17.6091 20.1441C17.3663 20.0435 17.1457 19.896 16.96 19.71L16.9 19.65C16.6643 19.4195 16.365 19.2648 16.0406 19.206C15.7162 19.1472 15.3816 19.1869 15.08 19.32C14.7842 19.4468 14.532 19.6572 14.3543 19.9255C14.1766 20.1938 14.0813 20.5082 14.08 20.83V21C14.08 21.5304 13.8693 22.0391 13.4942 22.4142C13.1191 22.7893 12.6104 23 12.08 23C11.5496 23 11.0409 22.7893 10.6658 22.4142C10.2907 22.0391 10.08 21.5304 10.08 21V20.91C10.0723 20.579 9.96512 20.258 9.77251 19.9887C9.5799 19.7194 9.31074 19.5143 9 19.4C8.69838 19.2669 8.36381 19.2272 8.03941 19.286C7.71502 19.3448 7.41568 19.4995 7.18 19.73L7.12 19.79C6.93425 19.976 6.71368 20.1235 6.47088 20.2241C6.22808 20.3248 5.96783 20.3766 5.705 20.3766C5.44217 20.3766 5.18192 20.3248 4.93912 20.2241C4.69632 20.1235 4.47575 19.976 4.29 19.79C4.10405 19.6043 3.95653 19.3837 3.85588 19.1409C3.75523 18.8981 3.70343 18.6378 3.70343 18.375C3.70343 18.1122 3.75523 17.8519 3.85588 17.6091C3.95653 17.3663 4.10405 17.1457 4.29 16.96L4.35 16.9C4.58054 16.6643 4.73519 16.365 4.794 16.0406C4.85282 15.7162 4.81312 15.3816 4.68 15.08C4.55324 14.7842 4.34276 14.532 4.07447 14.3543C3.80618 14.1766 3.49179 14.0813 3.17 14.08H3C2.46957 14.08 1.96086 13.8693 1.58579 13.4942C1.21071 13.1191 1 12.6104 1 12.08C1 11.5496 1.21071 11.0409 1.58579 10.6658C1.96086 10.2907 2.46957 10.08 3 10.08H3.09C3.42099 10.0723 3.742 9.96512 4.0113 9.77251C4.28059 9.5799 4.48572 9.31074 4.6 9C4.73312 8.69838 4.77282 8.36381 4.714 8.03941C4.65519 7.71502 4.50054 7.41568 4.27 7.18L4.21 7.12C4.02405 6.93425 3.87653 6.71368 3.77588 6.47088C3.67523 6.22808 3.62343 5.96783 3.62343 5.705C3.62343 5.44217 3.67523 5.18192 3.77588 4.93912C3.87653 4.69632 4.02405 4.47575 4.21 4.29C4.39575 4.10405 4.61632 3.95653 4.85912 3.85588C5.10192 3.75523 5.36217 3.70343 5.625 3.70343C5.88783 3.70343 6.14808 3.75523 6.39088 3.85588C6.63368 3.95653 6.85425 4.10405 7.04 4.29L7.1 4.35C7.33568 4.58054 7.63502 4.73519 7.95941 4.794C8.28381 4.85282 8.61838 4.81312 8.92 4.68H9C9.29577 4.55324 9.54802 4.34276 9.72569 4.07447C9.90337 3.80618 9.99872 3.49179 10 3.17V3C10 2.46957 10.2107 1.96086 10.5858 1.58579C10.9609 1.21071 11.4696 1 12 1C12.5304 1 13.0391 1.21071 13.4142 1.58579C13.7893 1.96086 14 2.46957 14 3V3.09C14.0013 3.41179 14.0966 3.72618 14.2743 3.99447C14.452 4.26276 14.7042 4.47324 15 4.6C15.3016 4.73312 15.6362 4.77282 15.9606 4.714C16.285 4.65519 16.5843 4.50054 16.82 4.27L16.88 4.21C17.0657 4.02405 17.2863 3.87653 17.5291 3.77588C17.7719 3.67523 18.0322 3.62343 18.295 3.62343C18.5578 3.62343 18.8181 3.67523 19.0609 3.77588C19.3037 3.87653 19.5243 4.02405 19.71 4.21C19.896 4.39575 20.0435 4.61632 20.1441 4.85912C20.2448 5.10192 20.2966 5.36217 20.2966 5.625C20.2966 5.88783 20.2448 6.14808 20.1441 6.39088C20.0435 6.63368 19.896 6.85425 19.71 7.04L19.65 7.1C19.4195 7.33568 19.2648 7.63502 19.206 7.95941C19.1472 8.28381 19.1869 8.61838 19.32 8.92V9C19.4468 9.29577 19.6572 9.54802 19.9255 9.72569C20.1938 9.90337 20.5082 9.99872 20.83 10H21C21.5304 10 22.0391 10.2107 22.4142 10.5858C22.7893 10.9609 23 11.4696 23 12C23 12.5304 22.7893 13.0391 22.4142 13.4142C22.0391 13.8693 21.5304 14.08 21 14.08H20.91C20.5882 14.0813 20.2738 14.1766 20.0055 14.3543C19.7372 14.532 19.5268 14.7842 19.4 15.08L19.4 15Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>

      <!-- 相机/扫码 -->
      <path v-if="name === 'camera'" d="M23 19C23 19.5304 22.7893 20.0391 22.4142 20.4142C22.0391 20.7893 21.5304 21 21 21H3C2.46957 21 1.96086 20.7893 1.58579 20.4142C1.21071 20.0391 1 19.5304 1 19V8C1 7.46957 1.21071 6.96086 1.58579 6.58579C1.96086 6.21071 2.46957 6 3 6H7L9 3H15L17 6H21C21.5304 6 22.0391 6.21071 22.4142 6.58579C22.7893 6.96086 23 7.46957 23 8V19Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      <circle v-if="name === 'camera'" cx="12" cy="13" r="4" stroke="currentColor" stroke-width="1.5"/>

      <!-- 日历 -->
      <rect v-if="name === 'calendar'" x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" stroke-width="1.5"/>
      <path v-if="name === 'calendar'" d="M16 2V6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      <path v-if="name === 'calendar'" d="M8 2V6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      <path v-if="name === 'calendar'" d="M3 10H21" stroke="currentColor" stroke-width="1.5"/>
      <rect v-if="name === 'calendar'" x="7" y="14" width="3" height="3" rx="0.5" fill="currentColor"/>

      <!-- 庆祝/星星 -->
      <path v-if="name === 'celebration'" d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
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
