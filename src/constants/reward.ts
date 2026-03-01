/**
 * 推广奖励相关常量
 *
 * 集中管理奖励相关的配置和映射
 * 避免在组件中硬编码
 *
 * 更新记录：2026年2月重构为单一四级代理制，只保留佣金类型
 */

import { RewardStatus } from '@/types/database'

/**
 * 推广层级文本映射
 */
export const REWARD_LEVEL_TEXTS = {
  0: '推广人',
  1: '1级上级',
  2: '2级上级',
  3: '3级上级'
} as const

/**
 * 奖励状态文本映射
 */
export const REWARD_STATUS_TEXTS: Record<RewardStatus, string> = {
  pending: '待结算',
  settled: '已结算',
  cancelled: '已取消',
  deducted: '已扣回'
}

/**
 * 奖励状态图标映射
 */
export const REWARD_STATUS_ICONS: Record<RewardStatus, string> = {
  pending: 'clock-filled',
  settled: 'checkmarkempty',
  cancelled: 'closeempty',
  deducted: 'refreshempty'
}

/**
 * 奖励状态颜色（东方美学配色）
 */
export const REWARD_STATUS_COLORS: Record<RewardStatus, string> = {
  pending: '#FFB085',    // 橙色
  settled: '#06D6A0',    // 绿色
  cancelled: '#C44536',  // 红色
  deducted: '#9B8B7F'    // 棕灰色
}

/**
 * 奖励类型（只有佣金一种）
 */
export type RewardType = 'commission'

/**
 * 奖励类型短名称映射
 */
export const REWARD_TYPE_SHORT_NAMES: Record<RewardType, string> = {
  commission: '佣'
}

/**
 * 奖励类型完整名称映射
 */
export const REWARD_TYPE_FULL_NAMES: Record<RewardType, string> = {
  commission: '推广佣金'
}

/**
 * 奖励类型 CSS 类名映射
 */
export const REWARD_TYPE_CLASSES: Record<RewardType, string> = {
  commission: 'type-commission'
}

/**
 * 奖励类型渐变背景色（东方美学暖色调）
 */
export const REWARD_TYPE_GRADIENTS: Record<RewardType, string> = {
  commission: 'linear-gradient(135deg, #D4A574 0%, #C9A962 100%)'  // 琥珀金
}

/**
 * 分页配置
 */
export const PAGINATION_CONFIG = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100
} as const
