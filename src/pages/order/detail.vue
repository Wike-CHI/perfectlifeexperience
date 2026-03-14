<template>
  <view class="container">
    <!-- 顶部状态栏 - 极简版 -->
    <view class="status-header" :class="`status-${order.status}`">
      <view class="status-icon">
        <svg v-if="order.status === 'pending'" class="icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.5"/>
          <path d="M12 7V12L15 15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
        <svg v-else-if="order.status === 'paid'" class="icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M20 7L9 18L4 13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <svg v-else-if="order.status === 'shipping'" class="icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M9 20C9 21.1 8.1 22 7 22C5.9 22 5 21.1 5 20C5 18.9 5.9 18 7 18C8.1 18 9 18.9 9 20ZM20 20C20 21.1 19.1 22 18 22C16.9 22 16 21.1 16 20C16 18.9 16.9 18 18 18C19.1 18 20 18.9 20 20ZM1 1H4L6.68 14.39C6.77144 14.8504 7.02191 15.264 7.38755 15.5583C7.75318 15.8526 8.2107 16.009 8.68 16H19.4C19.8686 16.0081 20.3255 15.8505 20.6907 15.5558C21.0559 15.2611 21.3063 14.8476 21.398 14.387L23 6H6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <svg v-else-if="order.status === 'completed'" class="icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M22 11.08V12C21.9988 14.1564 21.3005 16.2547 20.0093 17.9818C18.7182 19.709 16.9033 20.9725 14.8354 21.5839C12.7674 22.1953 10.5573 22.1219 8.53447 21.3746C6.51168 20.6273 4.78465 19.2461 3.61096 17.4371C2.43727 15.628 1.87979 13.4881 2.02168 11.3363C2.16356 9.18455 2.99721 7.13631 4.39828 5.49706C5.79935 3.85781 7.69279 2.71537 9.79619 2.24013C11.8996 1.7649 14.1003 1.98232 16.07 2.95997" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M22 4L12 14.01L9 11.01" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <svg v-else-if="order.status === 'cancelled'" class="icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.5"/>
          <path d="M15 9L9 15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          <path d="M9 9L15 15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
        <svg v-else-if="order.status === 'refunding'" class="icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M3 10H21" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          <path d="M8 14L8.01 14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          <path d="M16 14L16.01 14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          <path d="M10 20H4C2.89543 20 2 19.1046 2 18V6C2 4.89543 2.89543 4 4 4H20C21.1046 4 22 4.89543 22 6V18C22 19.1046 21.1046 20 20 20H14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <svg v-else-if="order.status === 'refunded'" class="icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M9 12L11 14L15 10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.5"/>
        </svg>
      </view>
      <view class="status-text">
        <text class="status-title">{{ getStatusText(order.status) }}</text>
        <text class="status-desc">{{ getStatusDesc(order.status) }}</text>
        <!-- 待付款倒计时 -->
        <view class="countdown" v-if="order.status === 'pending' && countdownTime > 0">
          <svg class="countdown-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.5"/>
            <path d="M12 6V12L16 14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
          <text class="countdown-text">剩余 {{ formatCountdown(countdownTime) }}</text>
        </view>
      </view>
    </view>

    <!-- 核心内容区 -->
    <view class="content-body">
      <!-- 物流追踪 (仅在相关状态显示) -->
      <view class="section-card logistics-card" v-if="order.status === 'shipping' || order.status === 'completed'">
        <view class="card-header">
          <view class="card-title-wrapper">
            <svg class="logistics-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M20 8H4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M4 8L12 3L20 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M12 21V3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M8 12L16 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M8 16L16 16" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <text class="card-title">物流动态</text>
          </view>
          <text class="card-action">查看详情</text>
        </view>
        <view class="logistics-latest">
          <view class="logistics-dot"></view>
          <view class="logistics-info">
            <text class="logistics-status">运输中</text>
            <text class="logistics-desc">包裹正在派送中，请保持电话畅通</text>
            <text class="logistics-time">2024-01-15 14:30</text>
          </view>
        </view>
      </view>

      <!-- 退款信息 (仅在退款相关状态显示) -->
      <view class="section-card refund-card" v-if="order.status === 'refunding' || order.status === 'refunded'">
        <view class="card-header">
          <view class="card-title-wrapper">
            <svg class="refund-header-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 10H21" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
              <path d="M8 14L8.01 14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              <path d="M16 14L16.01 14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              <path d="M20 21C20 22.1 19.1 23 18 23H6C4.9 23 4 22.1 4 21V9C4 7.9 4.9 7 6 7H18C19.1 7 20 7.9 20 9V21Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
              <path d="M16 2V7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
              <path d="M8 2V7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
            <text class="card-title">退款信息</text>
          </view>
          <text class="refund-status-tag" :class="`status-${refundInfo?.refundStatus}`">
            {{ getRefundStatusText(refundInfo?.refundStatus) }}
          </text>
        </view>
        <view class="refund-info" v-if="refundInfo">
          <view class="refund-row">
            <text class="refund-label">退款类型</text>
            <text class="refund-value">{{ getRefundTypeText(refundInfo.refundType) }}</text>
          </view>
          <view class="refund-row">
            <text class="refund-label">退款金额</text>
            <text class="refund-value refund-amount">¥{{ formatPrice(refundInfo.refundAmount) }}</text>
          </view>
          <view class="refund-row">
            <text class="refund-label">退款原因</text>
            <text class="refund-value">{{ refundInfo.refundReason || '用户申请退款' }}</text>
          </view>
          <view class="refund-row" v-if="refundInfo.rejectReason">
            <text class="refund-label">拒绝原因</text>
            <text class="refund-value refund-reject">{{ refundInfo.rejectReason }}</text>
          </view>
          <view class="refund-row" v-if="refundInfo.refundNo">
            <text class="refund-label">退款单号</text>
            <text class="refund-value">{{ refundInfo.refundNo }}</text>
          </view>
        </view>
      </view>

      <!-- 收货地址 -->
      <view class="section-card address-card" v-if="order.address">
        <view class="card-header">
          <view class="card-title-wrapper">
            <svg class="address-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 21.35L10.55 20.03C5.4 15.36 2 12.27 2 8.5C2 5.41 4.42 3 7.5 3C9.24 3 10.91 3.81 12 5.08C13.09 3.81 14.76 3 16.5 3C19.58 3 22 5.41 22 8.5C22 12.27 18.6 15.36 13.45 20.03L12 21.35Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
            </svg>
            <text class="card-title">配送信息</text>
          </view>
        </view>
        <view class="address-details">
          <view class="user-info">
            <svg class="user-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="8" r="3" stroke="currentColor" stroke-width="1.5"/>
              <path d="M12 13C8.13401 13 5 16.134 5 20H19C19 16.134 15.866 13 12 13Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
            </svg>
            <text class="user-name">{{ order.address.name }}</text>
            <svg class="phone-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M5 4H9C10.1046 4 11 4.89543 11 6V10C11 10.5523 10.5523 11 10 11H9C9 11 9 13 11 15C13 17 15 17 15 17V16C15 15.4477 15.4477 15 16 15H20C21.1046 15 22 15.8954 22 17V21C22 22.1046 21.1046 23 20 23C11.7157 23 5 16.2843 5 8V4Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
            </svg>
            <text class="user-phone">{{ order.address.phone }}</text>
          </view>
          <view class="address-text-wrapper">
            <svg class="location-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M21 10C21 17 12 23 12 23C12 23 3 17 3 10C3 5.02944 7.02944 1 12 1C16.9706 1 21 5.02944 21 10Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
              <circle cx="12" cy="10" r="3" stroke="currentColor" stroke-width="1.5"/>
            </svg>
            <text class="address-text">{{ order.address.province }} {{ order.address.city }} {{ order.address.district }} {{ order.address.detail }}</text>
          </view>
        </view>
      </view>

      <!-- 商品清单 -->
      <view class="section-card goods-card">
        <view class="card-header">
          <view class="card-title-wrapper">
            <svg class="goods-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M20 7L9 18L4 13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <text class="card-title">商品清单</text>
            <text class="goods-count">{{ order.products?.length || 0 }}件商品</text>
          </view>
        </view>

        <!-- 商品卡片列表 - 完整信息版 -->
        <view class="products-list">
          <!-- Loading状态 -->
          <view class="loading-products" v-if="loadingProducts">
            <text>加载商品详情中...</text>
          </view>

          <!-- 商品卡片 -->
          <template v-else>
            <view
              class="product-card"
              v-for="(item, index) in order.products"
              :key="item.productId || index"
            >
              <!-- 产品图片 - 支持占位符 -->
              <template v-if="!imageErrors[index]">
                <image
                  class="product-image"
                  :src="item.image"
                  mode="aspectFill"
                  lazy-load
                  @error="() => handleImageError(index)"
                />
              </template>
              <view v-else class="product-image-placeholder">
                <text class="placeholder-icon">📷</text>
                <text class="placeholder-text">图片加载失败</text>
              </view>

              <!-- 产品信息区域 -->
              <view class="product-info">
              <!-- 名称组 -->
              <view class="product-name-group">
                <text class="product-name">{{ item.name }}</text>
                <text class="product-en-name" v-if="computedProductDetails[item.productId]?.enName">
                  {{ computedProductDetails[item.productId]?.enName }}
                </text>
              </view>

              <!-- 标签徽章 -->
              <view class="product-badges" v-if="hasBadges(item.productId)">
                <text class="badge hot" v-if="computedProductDetails[item.productId]?.isHot">🔥 热销</text>
                <text class="badge new" v-if="computedProductDetails[item.productId]?.isNew">🆕 新品</text>
              </view>

              <!-- 产品描述 -->
              <text class="product-description" v-if="computedProductDetails[item.productId]?.description">
                {{ computedProductDetails[item.productId]?.description }}
              </text>

              <!-- 技术参数 -->
              <view class="product-specs-grid">
                <text class="spec-item" v-if="item.specs">规格: {{ item.specs }}</text>
                <text class="spec-item" v-if="computedProductDetails[item.productId]?.brewery">
                  酒厂: {{ computedProductDetails[item.productId]?.brewery }}
                </text>
                <text class="spec-item" v-if="hasAlcoholOrVolume(item.productId)">
                  <template v-if="computedProductDetails[item.productId]?.alcoholContent">
                    酒精度: {{ computedProductDetails[item.productId]?.alcoholContent }}%
                  </template>
                  <template v-if="computedProductDetails[item.productId]?.alcoholContent && computedProductDetails[item.productId]?.volume">
                    <text class="spec-separator"> | </text>
                  </template>
                  <template v-if="computedProductDetails[item.productId]?.volume">
                    容量: {{ computedProductDetails[item.productId]?.volume }}ml
                  </template>
                </text>
              </view>

              <!-- 价格区域 -->
              <view class="product-footer">
                <view class="price-left">
                  <text class="original-price"
                    v-if="computedProductDetails[item.productId]?.originalPrice && computedProductDetails[item.productId].originalPrice! > item.price">
                    ¥{{ formatPrice(computedProductDetails[item.productId]!.originalPrice!) }}
                  </text>
                  <text class="unit-price">¥{{ formatPrice(item.price) }}</text>
                  <text class="quantity">x{{ item.quantity }}</text>
                </view>
                <text class="total-price">¥{{ formatPrice(item.price * item.quantity) }}</text>
              </view>
            </view>
          </view>
          </template>
        </view>
      </view>

      <!-- 订单概览 -->
      <view class="section-card summary-card">
        <view class="summary-header">
          <svg class="summary-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M9 5H7C5.89543 5 5 5.89543 5 7V19C5 20.1046 5.89543 21 7 21H17C18.1046 21 19 20.1046 19 19V7C19 5.89543 18.1046 5 17 5H15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M9 5C9 3.89543 9.89543 3 11 3H13C14.1046 3 15 3.89543 15 5V7H9V5Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M9 12H15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            <path d="M9 16H13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
          <text class="summary-title">订单概览</text>
        </view>
        <view class="summary-row">
          <text class="summary-label">订单编号</text>
          <text class="summary-value copyable">{{ order.orderNo }}</text>
        </view>
        <view class="summary-row">
          <text class="summary-label">下单时间</text>
          <text class="summary-value">{{ formatTime(order.createTime) }}</text>
        </view>
        <view class="summary-row" v-if="order.payTime">
          <text class="summary-label">支付时间</text>
          <text class="summary-value">{{ formatTime(order.payTime) }}</text>
        </view>
        <view class="divider"></view>
        <view class="summary-row">
          <text class="summary-label">商品总额</text>
          <text class="summary-value">¥{{ formatPrice(order.totalAmount || 0) }}</text>
        </view>
        <view class="summary-row">
          <text class="summary-label">运费</text>
          <text class="summary-value">¥0.00</text>
        </view>
        <view class="summary-row total-row">
          <text class="total-label">实付金额</text>
          <text class="total-value">¥{{ formatPrice(order.totalAmount || 0) }}</text>
        </view>
      </view>
    </view>

    <!-- 底部操作栏 -->
    <view class="action-bar-placeholder"></view>
    <view class="action-bar" v-if="order.status !== 'cancelled'">
      <view class="action-btn secondary" v-if="order.status === 'pending'" @click="cancelOrder">取消订单</view>
      <view class="action-btn primary" v-if="order.status === 'pending'" @click="payOrder">立即支付</view>
      <view class="action-btn primary" v-if="order.status === 'shipping'" @click="confirmReceive">确认收货</view>
      <view class="action-btn secondary" v-if="order.status === 'completed'" @click="buyAgain">再次购买</view>
      <view class="action-btn secondary" v-if="order.status === 'refunding' && refundInfo?.refundStatus === 'pending'" @click="handleCancelRefund">取消退款</view>
      <view class="action-btn secondary refund-btn" v-if="canApplyRefund" @click="applyRefund">申请退款</view>
    </view>

    <!-- 支付方式选择弹窗 -->
    <view class="payment-popup" v-if="showPaymentPicker" @click="showPaymentPicker = false">
      <view class="popup-mask"></view>
      <view class="popup-content" @click.stop>
        <view class="popup-header">
          <text class="popup-title">选择支付方式</text>
          <image class="popup-close" src="/static/icons/icon-close.svg" mode="aspectFit" @click="showPaymentPicker = false" />
        </view>
        <view class="popup-body">
          <view class="payment-item" @click="selectPaymentMethod('wechat')" :class="{ active: paymentMethod === 'wechat' }">
            <view class="payment-left">
              <view class="payment-tag wechat-tag">微信</view>
              <text class="payment-name">微信支付</text>
            </view>
            <view class="check-circle" :class="{ checked: paymentMethod === 'wechat' }">
              <view class="check-dot" v-if="paymentMethod === 'wechat'"></view>
            </view>
          </view>
          <view class="payment-item" @click="selectPaymentMethod('balance')" :class="{ active: paymentMethod === 'balance', disabled: !isBalanceSufficient }">
            <view class="payment-left">
              <view class="payment-tag balance-tag">余额</view>
              <view class="payment-info">
                <text class="payment-name">余额支付</text>
                <text class="balance-amount" v-if="!balanceLoading">
                  可用: ¥{{ formatPrice(walletBalance) }}
                </text>
                <text class="balance-tip" v-if="!isBalanceSufficient">
                  不足 ¥{{ formatPrice((order.totalAmount || 0) - walletBalance) }}
                </text>
              </view>
            </view>
            <view class="check-circle" :class="{ checked: paymentMethod === 'balance' }">
              <view class="check-dot" v-if="paymentMethod === 'balance'"></view>
            </view>
          </view>
        </view>
        <view class="popup-footer">
          <view class="confirm-btn" @click="confirmPay">
            <text class="confirm-text">确认支付 ¥{{ formatPrice(order.totalAmount || 0) }}</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, onUnmounted } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { getOrderDetail, updateOrderStatus, cancelOrder as apiCancelOrder, formatPrice, getWalletBalance, cancelRefund, callFunction, getBatchProducts } from '@/utils/api';
import { getCachedOpenid } from '@/utils/cloudbase';
import { getDetailThumbnail } from '@/utils/image';
import type { Product } from '@/types';

// 类型定义（内联，避免分包导入问题）
interface Order {
  _id: string
  orderNo: string
  products?: Array<{
    productId?: string
    name: string
    price: number
    quantity: number
    image: string
    specs?: string
  }>
  items?: Array<{
    productId?: string
    productName?: string
    name?: string
    price: number
    quantity: number
    productImage?: string
    image?: string
  }>
  totalAmount: number
  status: 'pending' | 'paid' | 'shipping' | 'completed' | 'cancelled' | 'refunding' | 'refunded'
  address?: {
    name: string
    phone: string
    province: string
    city: string
    district: string
    detail: string
  }
  createTime: Date | string
  payTime?: Date | string
  _openid?: string
  paymentStatus?: string
}

// 退款详情类型
interface RefundInfo {
  _id: string
  refundType: 'only_refund' | 'return_refund'
  refundAmount: number
  refundReason?: string
  rejectReason?: string
  refundNo?: string
  refundStatus: 'pending' | 'approved' | 'waiting_receive' | 'processing' | 'completed' | 'rejected' | 'cancelled'
  products?: Array<{
    productId: string
    refundQuantity: number
  }>
}

// 数据
const order = ref<Partial<Order>>({
  orderNo: '',
  products: [],
  items: [],
  totalAmount: 0,
  status: 'pending',
  createTime: new Date()
});

// 退款详情
const refundInfo = ref<RefundInfo | null>(null);

// 商品详情（用于显示完整信息）
const productDetails = ref<Map<string, Product>>(new Map());
const loadingProducts = ref(false);

// 图片加载失败状态（使用 Record<number, boolean> 类型）
const imageErrors = ref<Record<number, boolean>>({});

// 处理图片加载失败
const handleImageError = (index: number) => {
  console.warn(`商品图片加载失败，索引: ${index}`);
  imageErrors.value[index] = true;
};

// 获取商品详情
const getProductDetail = (productId?: string): Product | undefined => {
  if (!productId) return undefined;
  return productDetails.value.get(productId);
};

// 优化3: 使用 computed 缓存计算结果，避免模板中重复计算
const computedProductDetails = computed(() => {
  const details: Record<string, {
    enName?: string;
    description?: string;
    originalPrice?: number;
    isHot?: boolean;
    isNew?: boolean;
    brewery?: string;
    alcoholContent?: number;
    volume?: number;
  }> = {};

  order.value.products?.forEach(item => {
    if (item.productId) {
      const detail = getProductDetail(item.productId);
      if (detail) {
        details[item.productId] = {
          enName: detail.enName,
          description: detail.description,
          originalPrice: detail.originalPrice,
          isHot: detail.isHot,
          isNew: detail.isNew,
          brewery: detail.brewery,
          alcoholContent: detail.alcoholContent,
          volume: detail.volume
        };
      }
    }
  });

  return details;
});

// 检查商品是否有徽章
const hasBadges = (productId?: string): boolean => {
  if (!productId) return false;
  const detail = getProductDetail(productId);
  return !!(detail?.isHot || detail?.isNew);
};

// 检查商品是否有酒精度或容量信息
const hasAlcoholOrVolume = (productId?: string): boolean => {
  if (!productId) return false;
  const detail = getProductDetail(productId);
  return !!(detail?.alcoholContent || detail?.volume);
};

// 加载商品详情（性能优化版）
const loadProductDetails = async () => {
  const productIds = order.value.products
    ?.map(p => p.productId)
    .filter((id): id is string => Boolean(id)) || [];

  if (productIds.length === 0) return;

  // 优化1: 检查本地缓存，避免重复查询
  const uncachedIds = productIds.filter(id => !productDetails.value.has(id));
  if (uncachedIds.length === 0) {
    console.log('所有商品详情已缓存，跳过查询');
    return;
  }

  loadingProducts.value = true;
  try {
    // 优化2: 只查询未缓存的商品
    const products = await getBatchProducts(uncachedIds);
    products.forEach(p => {
      if (p._id) productDetails.value.set(p._id, p);
    });
  } catch (error) {
    console.error('加载商品详情失败:', error);
  } finally {
    loadingProducts.value = false;
  }
};

// 支付方式选择
const showPaymentPicker = ref(false);
const paymentMethod = ref<'wechat' | 'balance'>('wechat');
const walletBalance = ref(0);
const balanceLoading = ref(false);

// 倒计时
const countdownTime = ref(0);
const countdownTimer = ref<number | null>(null);

// 检查是否可以申请退款
const canApplyRefund = computed(() => {
  return ['paid', 'shipping', 'completed'].includes(order.value.status || '');
});

// 检查余额是否充足
const isBalanceSufficient = computed(() => {
  return walletBalance.value >= (order.value.totalAmount || 0);
});

// 获取钱包余额
const loadWalletBalance = async () => {
  try {
    balanceLoading.value = true;
    const res = await getWalletBalance();
    walletBalance.value = res.balance || 0;
  } catch (error) {
    console.error('获取钱包余额失败:', error);
  } finally {
    balanceLoading.value = false;
  }
};

// 获取状态文本
const getStatusText = (status?: string) => {
  const statusMap: Record<string, string> = {
    pending: '等待付款',
    paid: '等待发货',
    shipping: '运输途中',
    completed: '订单完成',
    cancelled: '已取消',
    refunding: '退款中',
    refunded: '已退款'
  };
  return statusMap[status || 'pending'];
};

// 获取状态描述
const getStatusDesc = (status?: string) => {
  const descMap: Record<string, string> = {
    pending: '剩23分59秒自动关闭',
    paid: '商家正在打包您的商品',
    shipping: '您的包裹正在飞奔向您',
    completed: '感谢您的信任与支持',
    cancelled: '期待下次为您服务',
    refunding: '退款申请正在处理中',
    refunded: '退款已完成'
  };
  return descMap[status || 'pending'];
};

// 格式化时间
const formatTime = (time?: Date | string) => {
  if (!time) return '';
  const date = typeof time === 'string' ? new Date(time) : time;
  if (isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
};

// 启动倒计时
const startCountdown = () => {
  if (order.value.status !== 'pending') return;

  // 订单创建时间 + 24小时 - 当前时间
  if (!order.value.createTime) return;

  const createTime = typeof order.value.createTime === 'string'
    ? new Date(order.value.createTime)
    : order.value.createTime;
  const expireTime = new Date(createTime.getTime() + 24 * 60 * 60 * 1000);
  const now = new Date();
  const remaining = expireTime.getTime() - now.getTime();

  if (remaining > 0) {
    countdownTime.value = Math.floor(remaining / 1000);
    countdownTimer.value = setInterval(() => {
      countdownTime.value--;
      if (countdownTime.value <= 0) {
        stopCountdown();
      }
    }, 1000) as unknown as number;
  }
};

// 停止倒计时
const stopCountdown = () => {
  if (countdownTimer.value) {
    clearInterval(countdownTimer.value);
    countdownTimer.value = null;
  }
};

// 格式化倒计时
const formatCountdown = (seconds: number) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

// 加载订单详情
const loadOrderDetail = async (id: string) => {
  try {
    uni.showLoading({ title: '加载中' });
    const res = await getOrderDetail(id);
    order.value = res;

    // 如果订单是退款中或已退款，加载退款详情
    if (res.status === 'refunding' || res.status === 'refunded') {
      await loadRefundDetail(id);
    }

    // 如果是待付款订单，启动倒计时
    if (res.status === 'pending') {
      stopCountdown(); // 先停止之前的倒计时
      startCountdown();
    }

    // 加载商品详情
    await loadProductDetails();

    uni.hideLoading();
  } catch (error) {
    uni.hideLoading();
    uni.showToast({
      title: '加载失败',
      icon: 'none'
    });
  }
};

// 加载退款详情
const loadRefundDetail = async (orderId: string) => {
  try {
    const res = await callFunction('order', {
      action: 'getRefundList',
      data: { orderId }
    });
    if (res?.result?.code === 0 && res?.result?.data?.refunds?.length > 0) {
      refundInfo.value = res.result.data.refunds[0];
    }
  } catch (error) {
    console.error('加载退款详情失败:', error);
  }
};

// 获取退款状态文本
const getRefundStatusText = (status?: string) => {
  const statusMap: Record<string, string> = {
    pending: '待审核',
    approved: '已同意',
    waiting_receive: '待收货',
    processing: '退款中',
    success: '退款成功',
    failed: '退款失败',
    rejected: '已拒绝',
    cancelled: '已取消'
  };
  return statusMap[status || 'pending'] || '未知';
};

// 获取退款类型文本
const getRefundTypeText = (type?: string) => {
  const typeMap: Record<string, string> = {
    only_refund: '仅退款',
    return_refund: '退货退款'
  };
  return typeMap[type || 'only_refund'] || '仅退款';
};

// 获取退款商品数量
const getRefundQuantity = (productId?: string) => {
  if (!refundInfo.value?.products || !productId) {
    return 1;
  }
  const product = refundInfo.value.products.find((p: any) => p.productId === productId);
  return product?.refundQuantity || 1;
};

// 取消订单
const cancelOrder = () => {
  uni.showModal({
    title: '提示',
    content: '确定要取消这个订单吗？',
    success: async (res) => {
      if (res.confirm) {
        try {
          await apiCancelOrder(order.value._id!);
          uni.showToast({
            title: '已取消',
            icon: 'success'
          });
          loadOrderDetail(order.value._id!);
        } catch (error) {
          uni.showToast({
            title: '取消失败',
            icon: 'none'
          });
        }
      }
    }
  });
};

// 打开支付方式选择
const openPaymentPicker = async () => {
  await loadWalletBalance();
  showPaymentPicker.value = true;
};

// 选择支付方式
const selectPaymentMethod = (method: 'wechat' | 'balance') => {
  if (method === 'balance' && !isBalanceSufficient.value) {
    uni.showToast({
      title: `余额不足，还差 ¥${formatPrice((order.value.totalAmount || 0) - walletBalance.value)}`,
      icon: 'none'
    });
    return;
  }
  paymentMethod.value = method;
};

// 确认支付
const confirmPay = async () => {
  showPaymentPicker.value = false;
  if (paymentMethod.value === 'balance') {
    await payWithBalance();
  } else {
    await payWithWechat();
  }
};

// 支付订单 - 打开支付方式选择
const payOrder = async () => {
  await openPaymentPicker();
};

// 余额支付
const payWithBalance = async () => {
  try {
    uni.showLoading({ title: '支付中...' });

    const res = await callFunction('order', {
      action: 'payWithBalance',
      data: { orderId: order.value._id }
    });

    uni.hideLoading();

    if (res.code === 0 && res.data?.success !== false) {
      uni.showToast({
        title: '支付成功',
        icon: 'success'
      });
      // 刷新订单详情
      loadOrderDetail(order.value._id!);
    } else {
      const errorMsg = res.data?.message || res.msg || '支付失败';
      uni.showModal({
        title: '支付失败',
        content: errorMsg,
        showCancel: false
      });
    }
  } catch (error: any) {
    uni.hideLoading();
    console.error('余额支付失败:', error);
    uni.showToast({
      title: error.message || '支付失败',
      icon: 'none'
    });
  }
};

// 微信支付
const payWithWechat = async () => {
  try {
    uni.showLoading({ title: '正在创建支付...' });

    // 调用微信支付云函数
    const result = await callFunction('wechatpay', {
      action: 'createPayment',
      data: {
        orderId: order.value._id,
        openid: order.value._openid || getCachedOpenid()
      }
    });

    uni.hideLoading();

    // 云函数返回格式: { code: 0, msg: '...', data: { prepayId, payParams, orderNo } }
    console.log('[支付调试] callFunction 返回:', result);

    // 检查支付创建是否成功
    if (result.code === 0 && result.data?.payParams) {
      // 调起微信支付
      const payParams = result.data.payParams;
      console.log('[支付调试] 调起微信支付，参数:', payParams);
      uni.requestPayment({
        provider: 'wxpay',
        orderInfo: '', // UniApp requires this field but WeChat Pay doesn't use it
        timeStamp: payParams.timeStamp,
        nonceStr: payParams.nonceStr,
        package: payParams.package,
        signType: payParams.signType as 'MD5' | 'RSA',
        paySign: payParams.paySign,
        success: async () => {
          uni.showToast({
            title: '支付成功',
            icon: 'success'
          });

          // 主动查询订单状态，确保订单状态已更新
          // 轮询最多5次，每次间隔1秒
          let isPaid = false;
          for (let i = 0; i < 5; i++) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            try {
              const orderRes = await getOrderDetail(order.value._id!);
              if (orderRes && (orderRes.paymentStatus === 'paid' || orderRes.status === 'paid')) {
                isPaid = true;
                console.log('[支付调试] 订单状态已更新为已支付');
                break;
              }
            } catch (e) {
              console.warn('[支付调试] 查询订单状态失败:', e);
            }
          }

          // 刷新订单详情
          loadOrderDetail(order.value._id!);
        },
        fail: (err: any) => {
          if (err.errMsg?.includes('cancel')) {
            uni.showToast({
              title: '已取消支付',
              icon: 'none'
            });
          } else {
            uni.showToast({
              title: '支付失败',
              icon: 'none'
            });
          }
        }
      } as any);
    } else {
      // 微信支付创建失败，显示错误信息
      const errorMsg = result.msg || '创建支付失败';
      uni.showModal({
        title: '支付失败',
        content: errorMsg,
        showCancel: false
      });
    }
  } catch (error: any) {
    uni.hideLoading();
    console.error('支付失败:', error);
    uni.showModal({
      title: '支付失败',
      content: error.message || '请稍后重试',
      showCancel: false
    });
  }
};

// 确认收货
const confirmReceive = () => {
  uni.showModal({
    title: '提示',
    content: '确认已收到商品？',
    success: async (res) => {
      if (res.confirm) {
        try {
          await updateOrderStatus(order.value._id!, 'completed');
          uni.showToast({
            title: '确认成功',
            icon: 'success'
          });
          loadOrderDetail(order.value._id!);
        } catch (error) {
          uni.showToast({
            title: '操作失败',
            icon: 'none'
          });
        }
      }
    }
  });
};

// 再次购买
const buyAgain = () => {
  uni.switchTab({
    url: '/pages/index/index'
  });
};

// 申请退款
const applyRefund = () => {
  // 序列化订单数据，传递给退款页面
  const orderData = encodeURIComponent(JSON.stringify(order.value));
  uni.navigateTo({
    url: `/pages/order/refund-apply?orderId=${order.value._id}&orderData=${orderData}`
  });
};

// 取消退款
const handleCancelRefund = () => {
  if (!refundInfo.value?._id) {
    uni.showToast({
      title: '退款记录不存在',
      icon: 'none'
    });
    return;
  }

  uni.showModal({
    title: '提示',
    content: '确定要取消退款申请吗？',
    success: async (res) => {
      if (res.confirm) {
        try {
          if (refundInfo.value) {
            await cancelRefund(refundInfo.value._id);
          }
          uni.showToast({
            title: '已取消退款',
            icon: 'success'
          });
          // 刷新订单详情
          loadOrderDetail(order.value._id!);
          refundInfo.value = null;
        } catch (error) {
          uni.showToast({
            title: '取消失败',
            icon: 'none'
          });
        }
      }
    }
  });
};

// 生命周期
onLoad((options) => {
  if (options?.id) {
    loadOrderDetail(options.id);
  }
});

onUnmounted(() => {
  stopCountdown();
});
</script>

<style scoped>
/* Design System Variables */
.container {
  --color-bg: #FAFAFA;
  --color-text-primary: #1A1A1A;
  --color-text-secondary: #666666;
  --color-text-tertiary: #999999;
  --color-accent: #D9480F;
  --color-white: #FFFFFF;
  --spacing-base: 32rpx;
  --radius-base: 0; /* Sharp corners for Magazine style, or minimal radius */
  
  min-height: 100vh;
  background-color: var(--color-bg);
  padding-bottom: 120rpx;
}

/* Status Header - 东方美学配色 */
.status-header {
  padding: 40rpx var(--spacing-base);
  display: flex;
  align-items: center;
  gap: 24rpx;
  position: relative;
  transition: all 0.3s ease;
}

/* 不同状态的纯色背景 - 极简版 */
.status-header.status-pending {
  background: #FFF7ED;
  border-bottom: 1rpx solid #FED7AA;
}

.status-header.status-paid {
  background: #EFF6FF;
  border-bottom: 1rpx solid #BFDBFE;
}

.status-header.status-shipping {
  background: #F0FDF4;
  border-bottom: 1rpx solid #BBF7D0;
}

.status-header.status-completed {
  background: #FAFAF9;
  border-bottom: 1rpx solid #E5E7EB;
}

.status-header.status-cancelled {
  background: #FEF2F2;
  border-bottom: 1rpx solid #FECACA;
}

.status-header.status-refunding {
  background: #FEF3C7;
  border-bottom: 1rpx solid #FDE68A;
}

.status-header.status-refunded {
  background: #F3F4F6;
  border-bottom: 1rpx solid #E5E7EB;
}

.status-content {
  z-index: 1;
  flex: 1;
}

.status-icon {
  width: 48rpx;
  height: 48rpx;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.status-icon .icon {
  width: 100%;
  height: 100%;
}

.status-header.status-pending .status-icon .icon {
  color: #FB923C;
}

.status-header.status-paid .status-icon .icon {
  color: #3B82F6;
}

.status-header.status-shipping .status-icon .icon {
  color: #10B981;
}

.status-header.status-completed .status-icon .icon {
  color: #EC4899;
}

.status-header.status-cancelled .status-icon .icon {
  color: #9CA3AF;
}

.status-header.status-refunding .status-icon .icon {
  color: #F59E0B;
}

.status-header.status-refunded .status-icon .icon {
  color: #6B7280;
}

.status-text {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.status-title {
  display: block;
  font-size: 36rpx;
  font-weight: 700;
  line-height: 1.2;
}

.status-header.status-pending .status-title {
  color: #9A3412;
}

.status-header.status-paid .status-title {
  color: #1E40AF;
}

.status-header.status-shipping .status-title {
  color: #166534;
}

.status-header.status-completed .status-title {
  color: #885337;
}

.status-header.status-cancelled .status-title {
  color: #991B1B;
}

.status-header.status-refunding .status-title {
  color: #92400E;
}

.status-header.status-refunded .status-title {
  color: #374151;
}

.status-desc {
  display: block;
  font-size: 26rpx;
  font-weight: 400;
  opacity: 0.8;
}

.status-header.status-pending .status-desc {
  color: #9A3412;
}

.status-header.status-paid .status-desc {
  color: #1E40AF;
}

.status-header.status-shipping .status-desc {
  color: #166534;
}

.status-header.status-completed .status-desc {
  color: #885337;
}

.status-header.status-cancelled .status-desc {
  color: #991B1B;
}

.status-header.status-refunding .status-desc {
  color: #92400E;
}

.status-header.status-refunded .status-desc {
  color: #374151;
}

/* 倒计时 */
.countdown {
  display: inline-flex;
  align-items: center;
  gap: 8rpx;
  margin-top: 8rpx;
  padding: 8rpx 20rpx;
  background: rgba(255, 255, 255, 0.6);
  border-radius: 20rpx;
  align-self: flex-start;
}

.countdown-icon {
  width: 24rpx;
  height: 24rpx;
  color: #FB923C;
}

.countdown-text {
  font-size: 24rpx;
  font-weight: 500;
  color: #FB923C;
  font-family: monospace;
}

/* Content Body */
.content-body {
  padding: var(--spacing-base);
  display: flex;
  flex-direction: column;
  gap: 40rpx;
}

/* Cards General */
.section-card {
  background: transparent;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24rpx;
  padding-bottom: 16rpx;
  border-bottom: 2rpx solid #EAEAEA;
}

.card-title-wrapper {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.logistics-icon {
  width: 32rpx;
  height: 32rpx;
  color: #22C55E;
}

.card-title {
  font-size: 28rpx;
  font-weight: 700;
  color: var(--color-text-primary);
  text-transform: uppercase;
  letter-spacing: 2rpx;
}

.card-action {
  font-size: 24rpx;
  color: var(--color-accent);
}

/* Logistics */
.logistics-card {
  background: #F0FDF4;
  border: 1rpx solid #DCFCE7;
  border-radius: 16rpx;
  padding: 30rpx;
}

.logistics-latest {
  display: flex;
  gap: 24rpx;
  padding: 24rpx 0;
}

.logistics-dot {
  width: 16rpx;
  height: 16rpx;
  background-color: #22C55E;
  border-radius: 50%;
  margin-top: 12rpx;
  position: relative;
}

.logistics-dot::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 32rpx;
  height: 32rpx;
  border: 1px solid #22C55E;
  border-radius: 50%;
  opacity: 0.3;
}

.logistics-info {
  flex: 1;
}

.logistics-status {
  display: block;
  font-size: 30rpx;
  font-weight: 600;
  color: #166534;
  margin-bottom: 8rpx;
}

.logistics-desc {
  display: block;
  font-size: 26rpx;
  color: #15803D;
  line-height: 1.5;
  margin-bottom: 12rpx;
}

.logistics-time {
  font-size: 24rpx;
  color: #166534;
  font-family: monospace;
  opacity: 0.7;
}

/* Refund Info - 极简版 */
.refund-card {
  background: #FFFBEB;
  border: 1rpx solid #FDE68A;
  border-radius: 16rpx;
  padding: 30rpx;
}

.refund-header-icon {
  width: 32rpx;
  height: 32rpx;
  color: #F59E0B;
}

.refund-status-tag {
  display: inline-block;
  padding: 4rpx 16rpx;
  border-radius: 20rpx;
  font-size: 24rpx;
  font-weight: 500;
}

.refund-status-tag.status-pending {
  background: #FFF8E1;
  color: #F57C00;
}

.refund-status-tag.status-approved {
  background: #E8F5E9;
  color: #4CAF50;
}

.refund-status-tag.status-waiting_receive {
  background: #E0F2FE;
  color: #0284C7;
}

.refund-status-tag.status-processing {
  background: #E3F2FD;
  color: #1976D2;
}

.refund-status-tag.status-completed {
  background: #E8F5E9;
  color: #4CAF50;
}

.refund-status-tag.status-rejected {
  background: #FFEBEE;
  color: #F44336;
}

.refund-status-tag.status-success {
  background: #E8F5E9;
  color: #4CAF50;
}

.refund-status-tag.status-failed {
  background: #FFEBEE;
  color: #F44336;
}

.refund-status-tag.status-cancelled {
  background: #F5F5F5;
  color: #9E9E9E;
}

.refund-info {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.refund-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.refund-label {
  font-size: 26rpx;
  color: #999999;
  flex-shrink: 0;
  width: 140rpx;
}

.refund-value {
  font-size: 26rpx;
  color: #333333;
  flex: 1;
  text-align: right;
}

.refund-amount {
  font-size: 32rpx;
  font-weight: 600;
  color: #D9480F;
}

.refund-reject {
  color: #F44336;
}

.refund-tag {
  font-size: 20rpx;
  color: #FF9800;
  margin-left: 8rpx;
}

/* Address */
.address-card {
  background: #FDF8F3;
  border: 1rpx solid #F5F0E8;
  border-radius: 16rpx;
  padding: 30rpx;
}

.address-icon {
  width: 32rpx;
  height: 32rpx;
  color: #D4A574;
}

.address-details {
  padding: 10rpx 0;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 16rpx;
}

.user-icon, .phone-icon {
  width: 28rpx;
  height: 28rpx;
  color: #D4A574;
  flex-shrink: 0;
}

.user-name {
  font-size: 34rpx;
  font-weight: 700;
  color: var(--color-text-primary);
}

.user-phone {
  font-size: 30rpx;
  color: var(--color-text-secondary);
  font-family: monospace;
}

.address-text-wrapper {
  display: flex;
  align-items: flex-start;
  gap: 12rpx;
}

.location-icon {
  width: 28rpx;
  height: 28rpx;
  color: #D4A574;
  flex-shrink: 0;
  margin-top: 4rpx;
}

.address-text {
  font-size: 28rpx;
  color: var(--color-text-secondary);
  line-height: 1.6;
  flex: 1;
}

/* Goods */
.goods-status-tag {
  display: inline-flex;
  align-items: center;
  gap: 8rpx;
  padding: 6rpx 16rpx;
  border-radius: 20rpx;
  font-size: 24rpx;
  font-weight: 500;
  transition: all 0.3s ease;
}

.goods-status-tag .tag-icon {
  width: 24rpx;
  height: 24rpx;
}

.goods-status-tag.tag-pending {
  background: #FFF7ED;
  color: #F97316;
}

.goods-status-tag.tag-paid {
  background: #EFF6FF;
  color: #3B82F6;
}

.goods-status-tag.tag-shipping {
  background: #F0FDF4;
  color: #22C55E;
}

.goods-status-tag.tag-completed {
  background: #FAFAF9;
  color: #D4A574;
}

.goods-status-tag.tag-cancelled {
  background: #FEF2F2;
  color: #EF4444;
}

.goods-status-tag.tag-refunding {
  background: #FEF3C7;
  color: #F59E0B;
}

.goods-status-tag.tag-refunded {
  background: #F3F4F6;
  color: #6B7280;
}

.goods-count {
  font-size: 24rpx;
  color: var(--color-text-tertiary);
}

/* Loading状态 */
.loading-products {
  padding: 40rpx;
  text-align: center;
  color: #9B8B7F;
  font-size: 28rpx;
}

/* 商品列表容器 - 极简版 */
.products-list {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

/* 商品列表容器 - 完整信息版 */
.products-list {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

/* 商品卡片 - 垂直布局 */
.product-card {
  background: #FFFFFF;
  border-radius: 16rpx;
  overflow: hidden;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.06);
  margin-bottom: 0;
}

/* 产品图片 */
.product-image {
  width: 100%;
  height: 280rpx;
  border-radius: 16rpx 16rpx 0 0;
  display: block;
}

/* 产品信息区域 */
.product-info {
  padding: 24rpx;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

/* 名称组 */
.product-name-group {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.product-name {
  font-size: 32rpx;
  font-weight: 600;
  color: #1A1A1A;
  line-height: 1.4;
}

.product-en-name {
  font-size: 24rpx;
  font-weight: 400;
  color: #9B8B7F;
  line-height: 1.3;
}

/* 标签徽章 */
.product-badges {
  display: flex;
  gap: 8rpx;
  flex-wrap: wrap;
}

.badge {
  display: inline-flex;
  align-items: center;
  padding: 6rpx 12rpx;
  border-radius: 8rpx;
  font-size: 20rpx;
  font-weight: 500;
}

.badge.hot {
  background: #FFF7ED;
  color: #EA580C;
}

.badge.new {
  background: #EFF6FF;
  color: #3B82F6;
}

/* 产品描述 */
.product-description {
  font-size: 26rpx;
  color: #666666;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 技术参数网格 */
.product-specs-grid {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.spec-item {
  font-size: 24rpx;
  color: #666666;
  line-height: 1.4;
}

.spec-separator {
  color: #CCCCCC;
  margin: 0 4rpx;
}

/* 价格区域 */
.product-footer {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  padding-top: 16rpx;
  border-top: 1rpx solid #E5E7EB;
}

.price-left {
  display: flex;
  align-items: baseline;
  gap: 8rpx;
}

.original-price {
  font-size: 24rpx;
  color: #999999;
  text-decoration: line-through;
}

.unit-price {
  font-size: 28rpx;
  color: #666666;
}

.quantity {
  font-size: 28rpx;
  color: #9B8B7F;
}

.total-price {
  font-size: 36rpx;
  font-weight: 700;
  color: #1A1A1A;
}

/* 图片占位符 - 简洁版 */
.product-image-placeholder {
  width: 100%;
  height: 280rpx;
  background: #F5F5F5;
  border-radius: 16rpx 16rpx 0 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
}

.placeholder-icon {
  font-size: 64rpx;
  opacity: 0.3;
}

.placeholder-text {
  font-size: 24rpx;
  color: #999999;
}

.product-quantity {
  font-size: 24rpx;
  color: #9B8B7F;
}

.goods-list {
  display: flex;
  flex-direction: column;
  gap: 32rpx;
}

.goods-item {
  display: flex;
  gap: 24rpx;
  position: relative;
  padding: 20rpx;
  margin: -20rpx;
  margin-bottom: 0;
  border-radius: 12rpx;
  transition: all 0.3s ease;
  background: #FFFFFF;
}

/* 退款商品特殊样式 - 极简版 */
.goods-item.is-refund {
  background: #FFF7ED;
  border: 2rpx solid #FED7AA;
  margin-bottom: 16rpx;
}

/* 退款标识 - 极简版 */
.refund-badge {
  position: absolute;
  top: 12rpx;
  right: 12rpx;
  display: flex;
  align-items: center;
  gap: 4rpx;
  background: #F97316;
  padding: 6rpx 12rpx;
  border-radius: 20rpx;
  box-shadow: 0 2rpx 6rpx rgba(249, 115, 22, 0.2);
}

.refund-icon {
  width: 20rpx;
  height: 20rpx;
  color: #FFFFFF;
}

.refund-text {
  font-size: 20rpx;
  color: #FFFFFF;
  font-weight: 600;
}

/* 退款详情面板 */
.refund-details {
  background: rgba(255, 255, 255, 0.8);
  border-radius: 12rpx;
  padding: 16rpx;
  margin-top: 12rpx;
  border: 1rpx solid #FFE4B5;
}

.refund-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8rpx 0;
}

.refund-row:not(:last-child) {
  border-bottom: 1rpx dashed #FFE4B5;
}

.refund-row.subtotal {
  padding-top: 12rpx;
  margin-top: 4rpx;
  border-top: 2rpx solid #FFE4B5;
  border-bottom: none;
}

.refund-label {
  font-size: 24rpx;
  color: #999999;
}

.refund-value {
  font-size: 26rpx;
  color: #666666;
}

.refund-value.highlight {
  color: #FF9800;
  font-weight: 600;
  font-size: 28rpx;
}

.refund-value.money {
  color: #E64A19;
  font-size: 32rpx;
  font-weight: 700;
}

.goods-img {
  width: 160rpx;
  height: 160rpx;
  background-color: #F0F0F0;
  border-radius: 4rpx;
}

.goods-meta {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 4rpx 0;
}

.goods-name {
  font-size: 30rpx;
  color: var(--color-text-primary);
  line-height: 1.4;
  font-weight: 500;
}

.goods-price-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}

.goods-quantity {
  font-size: 26rpx;
  color: var(--color-text-tertiary);
}

.goods-price {
  font-size: 32rpx;
  font-weight: 600;
  color: var(--color-text-primary);
}

.goods-specs {
  font-size: 24rpx;
  color: #999999;
  margin-bottom: 8rpx;
}

/* Summary */
.summary-card {
  background: #FDF8F3;
  border: 1rpx solid #F5F0E8;
  border-radius: 16rpx;
  padding: 30rpx;
}

.summary-header {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 24rpx;
  padding-bottom: 16rpx;
  border-bottom: 2rpx solid #EAEAEA;
}

.summary-icon {
  width: 32rpx;
  height: 32rpx;
  color: #D4A574;
}

.summary-title {
  font-size: 28rpx;
  font-weight: 700;
  color: var(--color-text-primary);
  text-transform: uppercase;
  letter-spacing: 2rpx;
}

.summary-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 20rpx;
}

.summary-label {
  font-size: 26rpx;
  color: var(--color-text-secondary);
}

.summary-value {
  font-size: 26rpx;
  color: var(--color-text-primary);
  font-family: monospace;
}

.divider {
  height: 2rpx;
  background-color: #EAEAEA;
  margin: 20rpx 0;
}

.total-row {
  margin-top: 10rpx;
  align-items: baseline;
}

.total-label {
  font-size: 30rpx;
  font-weight: 700;
  color: var(--color-text-primary);
}

.total-value {
  font-size: 44rpx;
  font-weight: 800;
  color: var(--color-accent);
}

/* Action Bar - 状态化样式 */
.action-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(255, 255, 255, 0.98);
  padding: 24rpx 32rpx;
  padding-bottom: 24rpx;
  display: flex;
  justify-content: flex-end;
  gap: 24rpx;
  border-top: 1rpx solid rgba(0,0,0,0.05);
  z-index: 100;
}

.action-btn {
  padding: 0 48rpx;
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28rpx;
  font-weight: 600;
  border-radius: 40rpx;
  transition: all 0.2s;
}

.action-btn.secondary {
  background: transparent;
  color: var(--color-text-primary);
  border: 2rpx solid #E0E0E0;
}

.action-btn.primary {
  background: var(--color-text-primary);
  color: var(--color-white);
  border: 2rpx solid var(--color-text-primary);
}

/* 退款按钮 - 极简版 */
.action-btn.refund-btn {
  background: #F59E0B;
  border-color: #F59E0B;
  color: #FFFFFF;
  box-shadow: 0 2rpx 8rpx rgba(245, 158, 11, 0.25);
}

.action-btn:active {
  opacity: 0.8;
  transform: scale(0.98);
}

/* 支付方式选择弹窗 */
.payment-popup {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1000;
}

.popup-mask {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
}

.popup-content {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  background: #FFFFFF;
  border-radius: 32rpx 32rpx 0 0;
}

.popup-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 30rpx;
  border-bottom: 1rpx solid #F5F0E8;
}

.popup-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #1A1A1A;
}

.popup-close {
  width: 32rpx;
  height: 32rpx;
  color: #999;
  padding: 10rpx;
}

.popup-body {
  padding: 30rpx;
}

.payment-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx 20rpx;
  margin-bottom: 20rpx;
  border: 2rpx solid #E0E0E0;
  border-radius: 12rpx;
  transition: all 0.3s;
}

.payment-item.active {
  border-color: #D4A574;
  background: rgba(212, 165, 116, 0.05);
}

.payment-item.disabled {
  opacity: 0.5;
}

.payment-left {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.payment-tag {
  padding: 6rpx 16rpx;
  border-radius: 8rpx;
  font-size: 22rpx;
  font-weight: 600;
  flex-shrink: 0;
}

.wechat-tag {
  background: #09BB07;
  color: #FFFFFF;
}

.balance-tag {
  background: #D4A574;
  color: #FFFFFF;
}

.payment-name {
  font-size: 28rpx;
  color: #1A1A1A;
}

.payment-info {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.balance-amount {
  font-size: 24rpx;
  color: #999;
}

.balance-tip {
  font-size: 24rpx;
  color: #ff4d4f;
}

.check-circle {
  width: 36rpx;
  height: 36rpx;
  border: 2rpx solid #E0E0E0;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.check-circle.checked {
  border-color: #D4A574;
  background: #D4A574;
}

.check-dot {
  width: 16rpx;
  height: 16rpx;
  background: #FFFFFF;
  border-radius: 50%;
}

.popup-footer {
  padding: 20rpx 30rpx;
  padding-bottom: 20rpx;
}

.confirm-btn {
  background: #1A1A1A;
  border-radius: 40rpx;
  padding: 24rpx;
  display: flex;
  justify-content: center;
  align-items: center;
}

.confirm-text {
  font-size: 30rpx;
  color: #FFFFFF;
  font-weight: 600;
}
</style>
