/**
 * 推广系统佣金计算测试套件
 *
 * 测试范围：
 * 1. 四级代理佣金分配规则
 * 2. 金额单位转换（元 vs 分）
 * 3. 边界情况处理
 * 4. 佣金池总额验证
 *
 * 系统规则：
 * - 佣金池固定为订单金额的 20%
 * - 一级代理推广：自己拿 20%
 * - 二级代理推广：自己拿 12%，一级代理拿 8%
 * - 三级代理推广：自己拿 12%，二级拿 4%，一级拿 4%
 * - 四级代理推广：自己拿 8%，三级拿 4%，二级拿 4%，一级拿 4%
 */

import { describe, it, expect } from 'vitest'

// 佣金规则配置（与云函数保持一致）
const commissionRules = {
  1: { own: 0.20, upstream: [] },
  2: { own: 0.12, upstream: [0.08] },
  3: { own: 0.12, upstream: [0.04, 0.04] },
  4: { own: 0.08, upstream: [0.04, 0.04, 0.04] }
}

// 代理等级枚举
const AgentLevel = {
  LEVEL_1: 1,  // 金牌推广员
  LEVEL_2: 2,  // 银牌推广员
  LEVEL_3: 3,  // 铜牌推广员
  LEVEL_4: 4   // 普通会员
}

/**
 * 计算佣金分配（云函数逻辑）
 * @param orderAmountInCents 订单金额（分）
 * @param promoterLevel 推广人等级
 * @returns 佣金分配结果
 */
function calculateCommission(orderAmountInCents: number, promoterLevel: number) {
  const rule = commissionRules[promoterLevel as keyof typeof commissionRules]
  const results = []

  // 推广人自己
  const ownCommission = Math.floor(orderAmountInCents * rule.own)
  if (ownCommission >= 1) {  // 最小奖励金额：1分
    results.push({
      role: 'promoter',
      amount: ownCommission,
      ratio: rule.own
    })
  }

  // 上级代理
  rule.upstream.forEach((ratio, index) => {
    const commission = Math.floor(orderAmountInCents * ratio)
    if (commission >= 1) {
      results.push({
        role: `upstream_${index + 1}`,
        amount: commission,
        ratio: ratio
      })
    }
  })

  return results
}

/**
 * 元转分
 */
function yuanToFen(yuan: number): number {
  return Math.round(yuan * 100)
}

/**
 * 分转元
 */
function fenToYuan(fen: number): number {
  return fen / 100
}

describe('推广系统佣金计算测试', () => {
  describe('一级代理推广佣金计算', () => {
    it('应该正确计算一级代理推广佣金（100元订单）', () => {
      const orderAmountInCents = yuanToFen(100)  // 10000分
      const results = calculateCommission(orderAmountInCents, AgentLevel.LEVEL_1)

      expect(results).toHaveLength(1)
      expect(results[0].role).toBe('promoter')
      expect(results[0].amount).toBe(2000)  // 20元 = 2000分
      expect(results[0].ratio).toBe(0.20)
    })

    it('应该正确计算一级代理推广佣金（500元订单）', () => {
      const orderAmountInCents = yuanToFen(500)  // 50000分
      const results = calculateCommission(orderAmountInCents, AgentLevel.LEVEL_1)

      expect(results).toHaveLength(1)
      expect(results[0].amount).toBe(10000)  // 100元 = 10000分
    })

    it('一级代理无上级，只拿自己的佣金', () => {
      const orderAmountInCents = yuanToFen(288)
      const results = calculateCommission(orderAmountInCents, AgentLevel.LEVEL_1)

      // 只有推广人自己，没有上级
      expect(results.filter(r => r.role.startsWith('upstream'))).toHaveLength(0)
    })
  })

  describe('二级代理推广佣金计算', () => {
    it('应该正确计算二级代理推广佣金（100元订单）', () => {
      const orderAmountInCents = yuanToFen(100)
      const results = calculateCommission(orderAmountInCents, AgentLevel.LEVEL_2)

      expect(results).toHaveLength(2)

      // 推广人自己：12%
      expect(results[0].role).toBe('promoter')
      expect(results[0].amount).toBe(1200)  // 12元
      expect(results[0].ratio).toBe(0.12)

      // 一级上级：8%
      expect(results[1].role).toBe('upstream_1')
      expect(results[1].amount).toBe(800)  // 8元
      expect(results[1].ratio).toBe(0.08)
    })

    it('总佣金应为订单金额的20%', () => {
      const orderAmountInCents = yuanToFen(100)
      const results = calculateCommission(orderAmountInCents, AgentLevel.LEVEL_2)

      const totalCommission = results.reduce((sum, r) => sum + r.amount, 0)
      expect(totalCommission).toBe(2000)  // 20元 = 2000分
    })
  })

  describe('三级代理推广佣金计算', () => {
    it('应该正确计算三级代理推广佣金（100元订单）', () => {
      const orderAmountInCents = yuanToFen(100)
      const results = calculateCommission(orderAmountInCents, AgentLevel.LEVEL_3)

      expect(results).toHaveLength(3)

      // 推广人自己：12%
      expect(results[0].role).toBe('promoter')
      expect(results[0].amount).toBe(1200)  // 12元
      expect(results[0].ratio).toBe(0.12)

      // 二级上级：4%
      expect(results[1].role).toBe('upstream_1')
      expect(results[1].amount).toBe(400)  // 4元
      expect(results[1].ratio).toBe(0.04)

      // 一级上级：4%
      expect(results[2].role).toBe('upstream_2')
      expect(results[2].amount).toBe(400)  // 4元
      expect(results[2].ratio).toBe(0.04)
    })

    it('总佣金应为订单金额的20%', () => {
      const orderAmountInCents = yuanToFen(100)
      const results = calculateCommission(orderAmountInCents, AgentLevel.LEVEL_3)

      const totalCommission = results.reduce((sum, r) => sum + r.amount, 0)
      expect(totalCommission).toBe(2000)  // 20元
    })
  })

  describe('四级代理推广佣金计算', () => {
    it('应该正确计算四级代理推广佣金（100元订单）', () => {
      const orderAmountInCents = yuanToFen(100)
      const results = calculateCommission(orderAmountInCents, AgentLevel.LEVEL_4)

      expect(results).toHaveLength(4)

      // 推广人自己：8%
      expect(results[0].role).toBe('promoter')
      expect(results[0].amount).toBe(800)  // 8元
      expect(results[0].ratio).toBe(0.08)

      // 三级上级：4%
      expect(results[1].role).toBe('upstream_1')
      expect(results[1].amount).toBe(400)  // 4元
      expect(results[1].ratio).toBe(0.04)

      // 二级上级：4%
      expect(results[2].role).toBe('upstream_2')
      expect(results[2].amount).toBe(400)  // 4元
      expect(results[2].ratio).toBe(0.04)

      // 一级上级：4%
      expect(results[3].role).toBe('upstream_3')
      expect(results[3].amount).toBe(400)  // 4元
      expect(results[3].ratio).toBe(0.04)
    })

    it('总佣金应为订单金额的20%', () => {
      const orderAmountInCents = yuanToFen(100)
      const results = calculateCommission(orderAmountInCents, AgentLevel.LEVEL_4)

      const totalCommission = results.reduce((sum, r) => sum + r.amount, 0)
      expect(totalCommission).toBe(2000)  // 20元
    })
  })

  describe('金额单位转换测试', () => {
    it('应该正确转换元到分', () => {
      expect(yuanToFen(1)).toBe(100)
      expect(yuanToFen(100)).toBe(10000)
      expect(yuanToFen(0.01)).toBe(1)
      expect(yuanToFen(288.88)).toBe(28888)
    })

    it('应该正确转换分到元', () => {
      expect(fenToYuan(100)).toBe(1)
      expect(fenToYuan(10000)).toBe(100)
      expect(fenToYuan(1)).toBe(0.01)
      expect(fenToYuan(28888)).toBe(288.88)
    })

    it('应该正确处理小数精度', () => {
      const yuan = 123.45
      const fen = yuanToFen(yuan)
      const backToYuan = fenToYuan(fen)
      expect(backToYuan).toBe(yuan)
    })
  })

  describe('边界情况测试', () => {
    it('订单金额为0时不应产生佣金', () => {
      const results = calculateCommission(0, AgentLevel.LEVEL_1)
      expect(results).toHaveLength(0)
    })

    it('订单金额为1分时，佣金应为0（向下取整）', () => {
      const results = calculateCommission(1, AgentLevel.LEVEL_4)
      // 1分 * 8% = 0.08分，向下取整 = 0分
      expect(results).toHaveLength(0)
    })

    it('订单金额为13分时，四级代理应得1分佣金', () => {
      const results = calculateCommission(13, AgentLevel.LEVEL_4)
      // 13分 * 8% = 1.04分，向下取整 = 1分
      expect(results[0].amount).toBe(1)
    })

    it('大额订单佣金计算应准确', () => {
      const orderAmountInCents = yuanToFen(10000)  // 10000元
      const results = calculateCommission(orderAmountInCents, AgentLevel.LEVEL_1)

      expect(results[0].amount).toBe(200000)  // 2000元
    })

    it('佣金精度应向下取整', () => {
      const orderAmountInCents = 101  // 1.01元
      const results = calculateCommission(orderAmountInCents, AgentLevel.LEVEL_4)

      // 101 * 8% = 8.08分，向下取整 = 8分
      expect(results[0].amount).toBe(8)
    })
  })

  describe('佣金池总额验证', () => {
    it('所有等级的佣金总额应为订单金额的20%', () => {
      const orderAmountInCents = yuanToFen(100)

      for (let level = 1; level <= 4; level++) {
        const results = calculateCommission(orderAmountInCents, level)
        const totalCommission = results.reduce((sum, r) => sum + r.amount, 0)

        expect(totalCommission).toBe(2000)  // 20元
      }
    })

    it('公司应拿80%的订单金额', () => {
      const orderAmountInCents = yuanToFen(100)

      for (let level = 1; level <= 4; level++) {
        const results = calculateCommission(orderAmountInCents, level)
        const totalCommission = results.reduce((sum, r) => sum + r.amount, 0)
        const companyProfit = orderAmountInCents - totalCommission

        expect(companyProfit).toBe(8000)  // 80元
      }
    })
  })

  describe('前端佣金计算器验证', () => {
    it('前端计算器应使用元作为输入单位', () => {
      const inputInYuan = 100
      const rule = commissionRules[4]  // 四级代理

      // 前端计算逻辑
      const promoterCommission = (inputInYuan * rule.own).toFixed(2)

      expect(promoterCommission).toBe('8.00')  // 8.00元
    })

    it('前端计算器应正确显示总佣金', () => {
      const inputInYuan = 100
      const totalCommission = (inputInYuan * 0.2).toFixed(2)

      expect(totalCommission).toBe('20.00')  // 20.00元
    })

    it('前端计算器应正确显示公司利润', () => {
      const inputInYuan = 100
      const companyProfit = (inputInYuan * 0.8).toFixed(2)

      expect(companyProfit).toBe('80.00')  // 80.00元
    })

    it('前端计算器结果应与云函数逻辑一致', () => {
      const inputInYuan = 100

      // 前端计算（元）
      const frontendResult = (inputInYuan * 0.08).toFixed(2)

      // 云函数计算（分）
      const backendResultInFen = calculateCommission(yuanToFen(inputInYuan), AgentLevel.LEVEL_4)[0].amount
      const backendResultInYuan = fenToYuan(backendResultInFen).toFixed(2)

      expect(frontendResult).toBe(backendResultInYuan)
    })
  })

  describe('佣金比例验证', () => {
    it('一级代理佣金比例总和应为20%', () => {
      const rule = commissionRules[1]
      const totalRatio = rule.own + rule.upstream.reduce((sum, r) => sum + r, 0)
      expect(totalRatio).toBe(0.20)
    })

    it('二级代理佣金比例总和应为20%', () => {
      const rule = commissionRules[2]
      const totalRatio = rule.own + rule.upstream.reduce((sum, r) => sum + r, 0)
      expect(totalRatio).toBe(0.20)
    })

    it('三级代理佣金比例总和应为20%', () => {
      const rule = commissionRules[3]
      const totalRatio = rule.own + rule.upstream.reduce((sum, r) => sum + r, 0)
      expect(totalRatio).toBe(0.20)
    })

    it('四级代理佣金比例总和应为20%', () => {
      const rule = commissionRules[4]
      const totalRatio = rule.own + rule.upstream.reduce((sum, r) => sum + r, 0)
      expect(totalRatio).toBe(0.20)
    })
  })

  describe('最小奖励金额过滤测试', () => {
    it('佣金小于1分时不应发放', () => {
      // 订单金额10分，四级代理自己拿8%（0.8分）
      // 向下取整后为0分，不应发放
      const results = calculateCommission(10, AgentLevel.LEVEL_4)
      expect(results.filter(r => r.role === 'promoter')).toHaveLength(0)
    })

    it('佣金等于1分时应发放', () => {
      // 订单金额13分，四级代理自己拿8%（1.04分）
      // 向下取整后为1分，应发放
      const results = calculateCommission(13, AgentLevel.LEVEL_4)
      expect(results[0].amount).toBe(1)
    })
  })
})
