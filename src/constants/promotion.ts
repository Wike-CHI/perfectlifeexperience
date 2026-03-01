/**
 * 推广系统相关常量
 *
 * 更新记录：2026年2月重构为单一四级代理制
 */

import type { UserDB } from '@/types/database'

// ==================== 代理等级常量 ====================

/**
 * 代理等级枚举值
 */
export const AGENT_LEVEL = {
  HEAD_OFFICE: 0,   // 总公司
  GOLD: 1,          // 金牌推广员 = 一级代理
  SILVER: 2,        // 银牌推广员 = 二级代理
  BRONZE: 3,        // 铜牌推广员 = 三级代理
  NORMAL: 4         // 普通会员 = 四级代理
} as const

/**
 * 代理等级对外名称（用于用户展示）
 */
export const AGENT_LEVEL_NAMES = {
  0: '总公司',
  1: '金牌推广员',
  2: '银牌推广员',
  3: '铜牌推广员',
  4: '普通会员'
} as const

/**
 * 代理等级内部名称（用于后台管理）
 */
export const AGENT_LEVEL_INTERNAL_NAMES = {
  0: '总公司',
  1: '一级代理',
  2: '二级代理',
  3: '三级代理',
  4: '四级代理'
} as const

/**
 * 代理等级罗马数字映射（用于徽章显示）
 */
export const AGENT_LEVEL_ROMAN = {
  1: 'I',
  2: 'II',
  3: 'III',
  4: 'IV'
} as const

/**
 * 代理等级颜色（东方美学配色）
 */
export const AGENT_LEVEL_COLORS = {
  0: '#9B8B7F',    // 棕灰色
  1: '#C9A962',    // 琥珀金
  2: '#8B6F47',    // 棕色
  3: '#D4A574',    // 青铜色
  4: '#5D3924'     // 深棕色
} as const

/**
 * 代理等级短名称（用于徽章显示）
 */
export const AGENT_LEVEL_SHORT = {
  1: '金',
  2: '银',
  3: '铜',
  4: '普'
} as const

// ==================== 晋升门槛常量 ====================

/**
 * 晋升门槛配置（单位：分）
 */
export const PROMOTION_THRESHOLD = {
  // 四级 → 三级（普通 → 铜牌）
  LEVEL_4_TO_3: {
    totalSales: 2000000      // 累计销售额 >= 20,000元
  },
  // 三级 → 二级（铜牌 → 银牌）
  LEVEL_3_TO_2: {
    monthSales: 5000000,     // 本月销售额 >= 50,000元
    teamCount: 50            // 或团队人数 >= 50人
  },
  // 二级 → 一级（银牌 → 金牌）
  LEVEL_2_TO_1: {
    monthSales: 10000000,    // 本月销售额 >= 100,000元
    teamCount: 200           // 或团队人数 >= 200人
  }
} as const

// ==================== 佣金规则常量 ====================

/**
 * 佣金分配规则
 * 规则说明：
 * - 每笔订单的 20% 作为佣金池
 * - 佣金分配取决于推广人的代理等级
 */
export const COMMISSION_RULES = {
  1: {  // 一级代理（金牌）推广
    own: 0.20,        // 自己拿20%
    upstream: []      // 无上级
  },
  2: {  // 二级代理（银牌）推广
    own: 0.12,        // 自己拿12%
    upstream: [0.08]  // 一级代理拿8%
  },
  3: {  // 三级代理（铜牌）推广
    own: 0.12,        // 自己拿12%
    upstream: [0.04, 0.04]  // 二级代理4%，一级代理4%
  },
  4: {  // 四级代理（普通）推广
    own: 0.08,        // 自己拿8%
    upstream: [0.04, 0.04, 0.04]  // 三级4%，二级4%，一级4%
  }
} as const

/**
 * 公司分成比例
 */
export const COMPANY_SHARE = 0.80  // 公司拿80%

/**
 * 佣金池比例
 */
export const COMMISSION_POOL = 0.20  // 佣金池20%

// ==================== 其他常量 ====================

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
 * 推广配置常量
 */
export const PROMOTION_CONFIG = {
  /** 最大推广层级 */
  MAX_LEVEL: 4,
  /** 最小佣金金额（分） */
  MIN_REWARD: 1
} as const

/**
 * 分页配置
 */
export const PAGINATION_CONFIG = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100
} as const

// ==================== 类型定义 ====================

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

// ==================== 辅助函数 ====================

/**
 * 获取代理等级名称
 * @param level 代理等级
 * @returns 对外名称
 */
export function getAgentLevelName(level: number): string {
  return AGENT_LEVEL_NAMES[level as keyof typeof AGENT_LEVEL_NAMES] || '普通会员'
}

/**
 * 获取代理等级内部名称
 * @param level 代理等级
 * @returns 内部名称
 */
export function getAgentLevelInternalName(level: number): string {
  return AGENT_LEVEL_INTERNAL_NAMES[level as keyof typeof AGENT_LEVEL_INTERNAL_NAMES] || '四级代理'
}

/**
 * 获取代理等级颜色
 * @param level 代理等级
 * @returns 颜色值
 */
export function getAgentLevelColor(level: number): string {
  return AGENT_LEVEL_COLORS[level as keyof typeof AGENT_LEVEL_COLORS] || '#5D3924'
}

/**
 * 获取佣金规则
 * @param level 推广人代理等级
 * @returns 佣金规则
 */
export function getCommissionRule(level: number) {
  return COMMISSION_RULES[level as keyof typeof COMMISSION_RULES] || COMMISSION_RULES[4]
}

/**
 * 获取晋升门槛
 * @param currentLevel 当前等级
 * @returns 晋升门槛配置
 */
export function getPromotionThreshold(currentLevel: number) {
  const thresholdMap: Record<number, typeof PROMOTION_THRESHOLD.LEVEL_4_TO_3 | typeof PROMOTION_THRESHOLD.LEVEL_3_TO_2 | typeof PROMOTION_THRESHOLD.LEVEL_2_TO_1 | null> = {
    4: PROMOTION_THRESHOLD.LEVEL_4_TO_3,
    3: PROMOTION_THRESHOLD.LEVEL_3_TO_2,
    2: PROMOTION_THRESHOLD.LEVEL_2_TO_1
  }
  return thresholdMap[currentLevel] || null
}
