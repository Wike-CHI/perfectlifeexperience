/**
 * 推广奖励相关常量
 *
 * 集中管理奖励相关的配置和映射
 * 避免在组件中硬编码
 */

import { RewardType, RewardStatus } from '@/types/database'

/**
 * 推广层级文本映射
 */
export const REWARD_LEVEL_TEXTS = {
  1: '直接推广',
  2: '二级推广',
  3: '三级推广',
  4: '四级推广'
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
 * 奖励类型短名称映射
 */
export const REWARD_TYPE_SHORT_NAMES: Record<RewardType, string> = {
  basic_commission: '佣',
  repurchase_reward: '复',
  team_management: '管',
  nurture_allowance: '育'
}

/**
 * 奖励类型完整名称映射
 */
export const REWARD_TYPE_FULL_NAMES: Record<RewardType, string> = {
  basic_commission: '基础佣金',
  repurchase_reward: '复购奖励',
  team_management: '团队管理奖',
  nurture_allowance: '育成津贴'
}

/**
 * 奖励类型 CSS 类名映射
 */
export const REWARD_TYPE_CLASSES: Record<RewardType, string> = {
  basic_commission: 'type-commission',
  repurchase_reward: 'type-repurchase',
  team_management: 'type-management',
  nurture_allowance: 'type-nurture'
}

/**
 * 奖励类型渐变背景色（东方美学暖色调）
 */
export const REWARD_TYPE_GRADIENTS: Record<RewardType, string> = {
  basic_commission: 'linear-gradient(135deg, #D4A574 0%, #C9A962 100%)',    // 琥珀金
  repurchase_reward: 'linear-gradient(135deg, #7A9A8E 0%, #5F7A6E 100%)',  // 鼠尾草绿
  team_management: 'linear-gradient(135deg, #8B6F47 0%, #6B5B4F 100%)',    // 棕色
  nurture_allowance: 'linear-gradient(135deg, #C9A962 0%, #B8935F 100%'    // 金色
}

/**
 * 分页配置
 */
export const PAGINATION_CONFIG = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100
} as const
