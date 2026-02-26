/**
 * 订单相关常量
 */

import { OrderStatus, RefundStatus } from '@/types/database'

/**
 * 订单状态文本映射
 */
export const ORDER_STATUS_TEXTS: Record<OrderStatus, string> = {
  pending: '待支付',
  paid: '已支付',
  shipped: '已发货',
  completed: '已完成',
  refunding: '退款中',
  refunded: '已退款',
  cancelled: '已取消'
}

/**
 * 订单状态图标映射
 */
export const ORDER_STATUS_ICONS: Record<OrderStatus, string> = {
  pending: 'wallet-filled',
  paid: 'checkmarkempty',
  shipped: 'paperplane-filled',
  completed: 'checkbox-filled',
  refunding: 'refreshempty',
  refunded: 'reload-filled',
  cancelled: 'closeempty'
}

/**
 * 订单状态颜色（东方美学配色）
 */
export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  pending: '#FFB085',     // 橙色
  paid: '#06D6A0',        // 绿色
  shipped: '#7A9A8E',     // 鼠尾草绿
  completed: '#C9A962',   // 琥珀金
  refunding: '#FFB085',   // 橙色
  refunded: '#9B8B7F',    // 棕灰色
  cancelled: '#C44536'    // 红色
}

/**
 * 退款状态文本映射
 */
export const REFUND_STATUS_TEXTS: Record<RefundStatus, string> = {
  pending: '待审核',
  approved: '已批准',
  rejected: '已拒绝',
  processing: '退款中',
  completed: '已完成',
  cancelled: '已取消'
}

/**
 * 退款状态颜色
 */
export const REFUND_STATUS_COLORS: Record<RefundStatus, string> = {
  pending: '#FFB085',     // 橙色
  approved: '#06D6A0',    // 绿色
  rejected: '#C44536',    // 红色
  processing: '#7A9A8E',  // 鼠尾草绿
  completed: '#C9A962',   // 琥珀金
  cancelled: '#9B8B7F'    // 棕灰色
}

/**
 * 支付方式文本映射
 */
export const PAYMENT_METHOD_TEXTS = {
  wechat: '微信支付',
  wallet: '余额支付',
  mixed: '混合支付'
} as const
