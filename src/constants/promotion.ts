/**
 * 推广系统相关常量
 */

import type { UserDB } from '@/types/database'

/**
 * 代理级别文本映射
 */
export const AGENT_LEVEL_TEXTS = {
  0: '普通用户',
  1: '一级代理',
  2: '二级代理',
  3: '三级代理',
  4: '四级代理'
} as const

/**
 * 代理级别罗马数字映射（用于徽章显示）
 */
export const AGENT_LEVEL_ROMAN = {
  1: 'I',
  2: 'II',
  3: 'III',
  4: 'IV'
} as const

/**
 * 星级文本映射
 */
export const STAR_LEVEL_TEXTS = {
  0: '普通会员',
  1: '铜牌推广员',
  2: '银牌推广员',
  3: '金牌推广员'
} as const

/**
 * 星级短名称映射（用于徽章显示）
 */
export const STAR_LEVEL_SHORT = {
  0: '',
  1: '铜',
  2: '银',
  3: '金'
} as const

/**
 * 代理级别颜色（东方美学配色）
 */
export const AGENT_LEVEL_COLORS = {
  0: '#9B8B7F',    // 棕灰色
  1: '#C9A962',    // 琥珀金
  2: '#8B6F47',    // 棕色
  3: '#D4A574',    // 青铜色
  4: '#5D3924'     // 深棕色
} as const

/**
 * 星级颜色（东方美学配色）
 */
export const STAR_LEVEL_COLORS = {
  0: '#9B8B7F',    // 棕灰色
  1: '#CD7F32',    // 铜色
  2: '#C0C0C0',    // 银色
  3: '#FFD700'     // 金色
} as const

/**
 * 推广层级文本映射
 */
export const PROMOTION_LEVEL_TEXTS = {
  0: '全部',
  1: '一级',
  2: '二级',
  3: '三级',
  4: '四级'
} as const

/**
 * 用户类型定义（用于推广系统）
 */
export interface PromotionUser extends UserDB {
  /** 邀请码 */
  inviteCode?: string
  /** 在团队中的层级 */
  levelInTeam?: number
  /** 是否在线 */
  isOnline?: boolean
}

/**
 * 推广统计信息
 */
export interface PromotionStatistics {
  /** 团队总人数 */
  totalTeamSize: number
  /** 直推人数 */
  directCount: number
  /** 各级别人数 */
  levelCounts: {
    level1: number
    level2: number
    level3: number
    level4: number
  }
  /** 团队总销售额（分） */
  totalSales: number
  /** 当月销售额（分） */
  monthSales: number
}

/**
 * 推广配置常量
 */
export const PROMOTION_CONFIG = {
  /** 最大推广层级 */
  MAX_LEVEL: 4,
  /** 铜牌推广员门槛（直推人数） */
  BRONZE_DIRECT_COUNT: 10,
  /** 铜牌推广员门槛（累计销售额） */
  BRONZE_TOTAL_SALES: 1000000,  // 10000元
  /** 银牌推广员门槛（团队人数） */
  SILVER_TEAM_COUNT: 50,
  /** 银牌推广员门槛（月销售额） */
  SILVER_MONTH_SALES: 5000000,  // 50000元
  /** 金牌推广员门槛（团队人数） */
  GOLD_TEAM_COUNT: 200,
  /** 金牌推广员门槛（月销售额） */
  GOLD_MONTH_SALES: 20000000    // 200000元
} as const
