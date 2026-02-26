/**
 * 钱包相关常量
 */

import { TransactionType } from '@/types/database'

/**
 * 交易类型文本映射
 */
export const TRANSACTION_TYPE_TEXTS: Record<TransactionType, string> = {
  recharge: '充值',
  consumption: '消费',
  refund: '退款',
  commission: '佣金收入',
  withdraw: '提现',
  withdraw_refund: '提现失败退款'
}

/**
 * 交易类型图标映射
 */
export const TRANSACTION_TYPE_ICONS: Record<TransactionType, string> = {
  recharge: 'wallet-filled',
  consumption: 'shop-filled',
  refund: 'refreshempty',
  commission: 'gift-filled',
  withdraw: 'arrow-down',
  withdraw_refund: 'refresh-filled'
}

/**
 * 交易类型颜色（东方美学配色）
 */
export const TRANSACTION_TYPE_COLORS: Record<TransactionType, string> = {
  recharge: '#06D6A0',          // 绿色 - 收入
  consumption: '#C44536',       // 红色 - 支出
  refund: '#7A9A8E',            // 鼠尾草绿 - 退款
  commission: '#C9A962',        // 琥珀金 - 佣金
  withdraw: '#FFB085',          // 橙色 - 提现
  withdraw_refund: '#9B8B7F'    // 棕灰色 - 退款
}

/**
 * 交易类型流向（收入/支出）
 */
export const TRANSACTION_FLOW: Record<TransactionType, 'income' | 'expense'> = {
  recharge: 'income',
  consumption: 'expense',
  refund: 'income',
  commission: 'income',
  withdraw: 'expense',
  withdraw_refund: 'income'
}

/**
 * 钱包状态配置
 */
export const WALLET_CONFIG = {
  /** 最小提现金额（分） */
  MIN_WITHDRAW_AMOUNT: 1000,    // 10元
  /** 提现手续费率（千分比） */
  WITHDRAW_FEE_RATE: 3,         // 0.3%
  /** 提现到账时间描述 */
  WITHDRAW_TIME_DESC: '1-3个工作日'
} as const
