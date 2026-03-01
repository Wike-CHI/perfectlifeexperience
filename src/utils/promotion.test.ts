/**
 * 推广系统晋升逻辑测试套件
 *
 * 测试范围：
 * 1. 四级→三级晋升（普通→铜牌）
 * 2. 三级→二级晋升（铜牌→银牌）
 * 3. 二级→一级晋升（银牌→金牌）
 * 4. 跨月数据重置
 * 5. 晋升条件验证
 *
 * 晋升规则：
 * - 四级→三级：累计销售额 >= 1,000元
 * - 三级→二级：本月销售额 >= 5,000元 或 团队人数 >= 30人
 * - 二级→一级：本月销售额 >= 20,000元 或 团队人数 >= 100人
 */

import { describe, it, expect } from 'vitest'

// 晋升门槛配置（单位：分）
const PROMOTION_THRESHOLDS = {
  LEVEL_4_TO_3: {
    totalSales: 100000  // 累计销售额 >= 1,000元
  },
  LEVEL_3_TO_2: {
    monthSales: 500000,  // 本月销售额 >= 5,000元
    teamCount: 30        // 或团队人数 >= 30人
  },
  LEVEL_2_TO_1: {
    monthSales: 2000000,  // 本月销售额 >= 20,000元
    teamCount: 100        // 或团队人数 >= 100人
  }
}

// 代理等级枚举
const AgentLevel = {
  LEVEL_1: 1,  // 金牌推广员
  LEVEL_2: 2,  // 银牌推广员
  LEVEL_3: 3,  // 铜牌推广员
  LEVEL_4: 4   // 普通会员
}

/**
 * 获取当前月份标识
 */
function getCurrentMonthTag() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

/**
 * 元转分
 */
function yuanToFen(yuan: number): number {
  return Math.round(yuan * 100)
}

/**
 * 检查晋升条件（模拟云函数逻辑）
 */
function checkPromotion(currentLevel: number, performance: {
  totalSales: number
  monthSales: number
  teamCount: number
  monthTag: string
}): { canPromote: boolean; reason?: string } {
  const currentMonthTag = getCurrentMonthTag()

  // 检查跨月重置
  if (performance.monthTag !== currentMonthTag) {
    performance = {
      ...performance,
      monthSales: 0,
      monthTag: currentMonthTag
    }
  }

  if (currentLevel === AgentLevel.LEVEL_4) {
    // 四级→三级：累计销售额
    if (performance.totalSales >= PROMOTION_THRESHOLDS.LEVEL_4_TO_3.totalSales) {
      return {
        canPromote: true,
        reason: `累计销售额达到${PROMOTION_THRESHOLDS.LEVEL_4_TO_3.totalSales / 100}元`
      }
    }
  } else if (currentLevel === AgentLevel.LEVEL_3) {
    // 三级→二级：本月销售额 或 团队人数
    if (performance.monthSales >= PROMOTION_THRESHOLDS.LEVEL_3_TO_2.monthSales) {
      return {
        canPromote: true,
        reason: `本月销售额达到${PROMOTION_THRESHOLDS.LEVEL_3_TO_2.monthSales / 100}元`
      }
    }
    if (performance.teamCount >= PROMOTION_THRESHOLDS.LEVEL_3_TO_2.teamCount) {
      return {
        canPromote: true,
        reason: `团队人数达到${PROMOTION_THRESHOLDS.LEVEL_3_TO_2.teamCount}人`
      }
    }
  } else if (currentLevel === AgentLevel.LEVEL_2) {
    // 二级→一级：本月销售额 或 团队人数
    if (performance.monthSales >= PROMOTION_THRESHOLDS.LEVEL_2_TO_1.monthSales) {
      return {
        canPromote: true,
        reason: `本月销售额达到${PROMOTION_THRESHOLDS.LEVEL_2_TO_1.monthSales / 100}元`
      }
    }
    if (performance.teamCount >= PROMOTION_THRESHOLDS.LEVEL_2_TO_1.teamCount) {
      return {
        canPromote: true,
        reason: `团队人数达到${PROMOTION_THRESHOLDS.LEVEL_2_TO_1.teamCount}人`
      }
    }
  }

  return { canPromote: false }
}

describe('推广系统晋升逻辑测试', () => {
  describe('四级→三级晋升测试', () => {
    it('累计销售额达到1,000元应晋升', () => {
      const result = checkPromotion(AgentLevel.LEVEL_4, {
        totalSales: yuanToFen(1000),
        monthSales: 0,
        teamCount: 0,
        monthTag: getCurrentMonthTag()
      })

      expect(result.canPromote).toBe(true)
      expect(result.reason).toContain('累计销售额')
    })

    it('累计销售额999元不应晋升', () => {
      const result = checkPromotion(AgentLevel.LEVEL_4, {
        totalSales: yuanToFen(999),
        monthSales: 0,
        teamCount: 0,
        monthTag: getCurrentMonthTag()
      })

      expect(result.canPromote).toBe(false)
    })

    it('累计销售额1,001元应晋升', () => {
      const result = checkPromotion(AgentLevel.LEVEL_4, {
        totalSales: yuanToFen(1001),
        monthSales: 0,
        teamCount: 0,
        monthTag: getCurrentMonthTag()
      })

      expect(result.canPromote).toBe(true)
    })
  })

  describe('三级→二级晋升测试', () => {
    it('本月销售额达到5,000元应晋升', () => {
      const result = checkPromotion(AgentLevel.LEVEL_3, {
        totalSales: 0,
        monthSales: yuanToFen(5000),
        teamCount: 0,
        monthTag: getCurrentMonthTag()
      })

      expect(result.canPromote).toBe(true)
      expect(result.reason).toContain('本月销售额')
    })

    it('团队人数达到30人应晋升', () => {
      const result = checkPromotion(AgentLevel.LEVEL_3, {
        totalSales: 0,
        monthSales: 0,
        teamCount: 30,
        monthTag: getCurrentMonthTag()
      })

      expect(result.canPromote).toBe(true)
      expect(result.reason).toContain('团队人数')
    })

    it('本月销售额4,999元且团队29人不应晋升', () => {
      const result = checkPromotion(AgentLevel.LEVEL_3, {
        totalSales: 0,
        monthSales: yuanToFen(4999),
        teamCount: 29,
        monthTag: getCurrentMonthTag()
      })

      expect(result.canPromote).toBe(false)
    })

    it('满足任一条件即可晋升', () => {
      // 满足销售额条件
      let result = checkPromotion(AgentLevel.LEVEL_3, {
        totalSales: 0,
        monthSales: yuanToFen(5000),
        teamCount: 0,
        monthTag: getCurrentMonthTag()
      })
      expect(result.canPromote).toBe(true)

      // 满足团队人数条件
      result = checkPromotion(AgentLevel.LEVEL_3, {
        totalSales: 0,
        monthSales: 0,
        teamCount: 30,
        monthTag: getCurrentMonthTag()
      })
      expect(result.canPromote).toBe(true)
    })
  })

  describe('二级→一级晋升测试', () => {
    it('本月销售额达到20,000元应晋升', () => {
      const result = checkPromotion(AgentLevel.LEVEL_2, {
        totalSales: 0,
        monthSales: yuanToFen(20000),
        teamCount: 0,
        monthTag: getCurrentMonthTag()
      })

      expect(result.canPromote).toBe(true)
      expect(result.reason).toContain('本月销售额')
    })

    it('团队人数达到100人应晋升', () => {
      const result = checkPromotion(AgentLevel.LEVEL_2, {
        totalSales: 0,
        monthSales: 0,
        teamCount: 100,
        monthTag: getCurrentMonthTag()
      })

      expect(result.canPromote).toBe(true)
      expect(result.reason).toContain('团队人数')
    })

    it('本月销售额19,999元且团队99人不应晋升', () => {
      const result = checkPromotion(AgentLevel.LEVEL_2, {
        totalSales: 0,
        monthSales: yuanToFen(19999),
        teamCount: 99,
        monthTag: getCurrentMonthTag()
      })

      expect(result.canPromote).toBe(false)
    })
  })

  describe('跨月数据重置测试', () => {
    it('月份变更时应重置月度销售额', () => {
      const lastMonth = '2026-01'
      const currentMonth = getCurrentMonthTag()

      // 如果当前月份不是2026-01，则应该重置
      if (lastMonth !== currentMonth) {
        const result = checkPromotion(AgentLevel.LEVEL_3, {
          totalSales: 0,
          monthSales: yuanToFen(5000),  // 上个月的数据
          teamCount: 0,
          monthTag: lastMonth
        })

        // 由于月份不同，月度销售额会被重置为0，不应晋升
        // 注意：这个测试在实际运行时会根据当前月份判断
        if (lastMonth !== currentMonth) {
          expect(result.canPromote).toBe(false)
        }
      }
    })

    it('累计销售额不应跨月重置', () => {
      const result = checkPromotion(AgentLevel.LEVEL_4, {
        totalSales: yuanToFen(1000),
        monthSales: 0,
        teamCount: 0,
        monthTag: '2026-01'  // 上个月
      })

      // 累计销售额不受月份影响
      expect(result.canPromote).toBe(true)
    })
  })

  describe('最高等级限制测试', () => {
    it('一级代理不应再晋升', () => {
      const result = checkPromotion(AgentLevel.LEVEL_1, {
        totalSales: yuanToFen(100000),
        monthSales: yuanToFen(50000),
        teamCount: 500,
        monthTag: getCurrentMonthTag()
      })

      expect(result.canPromote).toBe(false)
    })
  })

  describe('晋升门槛配置验证', () => {
    it('四级→三级门槛应正确配置', () => {
      expect(PROMOTION_THRESHOLDS.LEVEL_4_TO_3.totalSales).toBe(yuanToFen(1000))
    })

    it('三级→二级门槛应正确配置', () => {
      expect(PROMOTION_THRESHOLDS.LEVEL_3_TO_2.monthSales).toBe(yuanToFen(5000))
      expect(PROMOTION_THRESHOLDS.LEVEL_3_TO_2.teamCount).toBe(30)
    })

    it('二级→一级门槛应正确配置', () => {
      expect(PROMOTION_THRESHOLDS.LEVEL_2_TO_1.monthSales).toBe(yuanToFen(20000))
      expect(PROMOTION_THRESHOLDS.LEVEL_2_TO_1.teamCount).toBe(100)
    })
  })

  describe('晋升进度计算测试', () => {
    it('四级代理晋升进度应正确计算', () => {
      const totalSales = yuanToFen(500)  // 500元
      const target = PROMOTION_THRESHOLDS.LEVEL_4_TO_3.totalSales
      const progress = Math.floor((totalSales / target) * 100)

      expect(progress).toBe(50)  // 50%
    })

    it('三级代理晋升进度应正确计算（销售额）', () => {
      const monthSales = yuanToFen(2500)  // 2500元
      const target = PROMOTION_THRESHOLDS.LEVEL_3_TO_2.monthSales
      const progress = Math.floor((monthSales / target) * 100)

      expect(progress).toBe(50)  // 50%
    })

    it('三级代理晋升进度应正确计算（团队人数）', () => {
      const teamCount = 15
      const target = PROMOTION_THRESHOLDS.LEVEL_3_TO_2.teamCount
      const progress = Math.floor((teamCount / target) * 100)

      expect(progress).toBe(50)  // 50%
    })
  })

  describe('边界情况测试', () => {
    it('刚好达到门槛应晋升', () => {
      const result = checkPromotion(AgentLevel.LEVEL_4, {
        totalSales: yuanToFen(1000),  // 刚好1000元
        monthSales: 0,
        teamCount: 0,
        monthTag: getCurrentMonthTag()
      })

      expect(result.canPromote).toBe(true)
    })

    it('差1分钱不应晋升', () => {
      const result = checkPromotion(AgentLevel.LEVEL_4, {
        totalSales: yuanToFen(1000) - 1,  // 999.99元
        monthSales: 0,
        teamCount: 0,
        monthTag: getCurrentMonthTag()
      })

      expect(result.canPromote).toBe(false)
    })

    it('团队人数刚好达标应晋升', () => {
      const result = checkPromotion(AgentLevel.LEVEL_3, {
        totalSales: 0,
        monthSales: 0,
        teamCount: 30,  // 刚好30人
        monthTag: getCurrentMonthTag()
      })

      expect(result.canPromote).toBe(true)
    })
  })
})
