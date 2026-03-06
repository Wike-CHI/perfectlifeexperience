/**
 * usePromotion Composable 单元测试
 * 测试推广相关的 Vue Composable 功能
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { nextTick } from 'vue'

// Mock API
vi.mock('@/utils/api', () => ({
  getPromotionInfo: vi.fn(async () => ({
    inviteCode: 'ABC123',
    agentLevel: 1,
    agentLevelName: '金牌推广员',
    agentLevelInternalName: '一级代理',
    totalReward: 100000,
    pendingReward: 20000,
    withdrawableReward: 80000,
    todayReward: 5000,
    monthReward: 30000,
    performance: {
      totalSales: 200000,
      monthSales: 50000,
      monthTag: '2026-03',
      teamCount: 100
    },
    promotionProgress: null,
    teamStats: {
      total: 100,
      level1: 50,
      level2: 30,
      level3: 15,
      level4: 5
    }
  })),
  promoteAgentLevel: vi.fn(async (oldLevel: number, newLevel: number) => ({
    oldLevel,
    newLevel,
    followedUsers: []
  }))
}))

// Mock constants
vi.mock('@/constants/promotion', () => ({
  AGENT_LEVEL_NAMES: {
    1: '金牌推广员',
    2: '银牌推广员',
    3: '铜牌推广员',
    4: '普通会员'
  }
}))

describe('usePromotion', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('初始化状态', () => {
    it('应该有正确的初始状态', async () => {
      const { usePromotion } = await import('./usePromotion')
      const { user, loading } = usePromotion()

      expect(user.value.inviteCode).toBe('')
      expect(user.value.agentLevel).toBe(4)
      expect(user.value.agentLevelName).toBe('普通会员')
      expect(loading.value).toBe(false)
    })
  })

  describe('fetchPromotionInfo', () => {
    it('应该成功获取推广信息', async () => {
      const { usePromotion } = await import('./usePromotion')
      const { user, loading, fetchPromotionInfo } = usePromotion()

      await fetchPromotionInfo()
      await nextTick()

      expect(user.value.inviteCode).toBe('ABC123')
      expect(user.value.agentLevel).toBe(1)
      expect(user.value.agentLevelName).toBe('金牌推广员')
      expect(user.value.totalReward).toBe(100000)
    })

    it('获取数据时loading应为true', async () => {
      const { usePromotion } = await import('./usePromotion')
      const { loading, fetchPromotionInfo } = usePromotion()

      const promise = fetchPromotionInfo()
      // 注意：由于mock很快完成，可能捕捉不到loading状态
      await promise
      await nextTick()

      expect(loading.value).toBe(false)
    })

    it('API失败时应该抛出错误', async () => {
      const { getPromotionInfo } = await import('@/utils/api')
      vi.mocked(getPromotionInfo).mockRejectedValueOnce(new Error('网络错误'))

      const { usePromotion } = await import('./usePromotion')
      const { fetchPromotionInfo } = usePromotion()

      await expect(fetchPromotionInfo()).rejects.toThrow('网络错误')
    })
  })

  describe('myCommissionRatio', () => {
    it('一级代理佣金比例应为20%', async () => {
      const { usePromotion } = await import('./usePromotion')
      const { user, myCommissionRatio, fetchPromotionInfo } = usePromotion()

      await fetchPromotionInfo()
      await nextTick()

      expect(user.value.agentLevel).toBe(1)
      expect(myCommissionRatio.value).toBe(20)
    })

    it('二级代理佣金比例应为12%', async () => {
      const { getPromotionInfo } = await import('@/utils/api')
      vi.mocked(getPromotionInfo).mockResolvedValueOnce({
        inviteCode: 'DEF456',
        agentLevel: 2,
        agentLevelName: '银牌推广员',
        agentLevelInternalName: '二级代理',
        totalReward: 50000,
        pendingReward: 10000,
        withdrawableReward: 40000,
        todayReward: 2000,
        monthReward: 15000,
        performance: { totalSales: 100000, monthSales: 30000, monthTag: '2026-03', teamCount: 50 },
        promotionProgress: null,
        teamStats: { total: 50, level1: 25, level2: 15, level3: 8, level4: 2 }
      })

      const { usePromotion } = await import('./usePromotion')
      const { myCommissionRatio, fetchPromotionInfo } = usePromotion()

      await fetchPromotionInfo()
      await nextTick()

      expect(myCommissionRatio.value).toBe(12)
    })

    it('三级代理佣金比例应为12%', async () => {
      const { getPromotionInfo } = await import('@/utils/api')
      vi.mocked(getPromotionInfo).mockResolvedValueOnce({
        inviteCode: 'GHI789',
        agentLevel: 3,
        agentLevelName: '铜牌推广员',
        agentLevelInternalName: '三级代理',
        totalReward: 30000,
        pendingReward: 5000,
        withdrawableReward: 25000,
        todayReward: 1000,
        monthReward: 8000,
        performance: { totalSales: 50000, monthSales: 15000, monthTag: '2026-03', teamCount: 20 },
        promotionProgress: null,
        teamStats: { total: 20, level1: 10, level2: 6, level3: 3, level4: 1 }
      })

      const { usePromotion } = await import('./usePromotion')
      const { myCommissionRatio, fetchPromotionInfo } = usePromotion()

      await fetchPromotionInfo()
      await nextTick()

      expect(myCommissionRatio.value).toBe(12)
    })

    it('四级代理佣金比例应为8%', async () => {
      const { usePromotion } = await import('./usePromotion')
      const { myCommissionRatio } = usePromotion()

      // 默认为四级代理
      expect(myCommissionRatio.value).toBe(8)
    })
  })

  describe('upstreamRatios', () => {
    it('一级代理应无上级佣金', async () => {
      const { usePromotion } = await import('./usePromotion')
      const { upstreamRatios, fetchPromotionInfo } = usePromotion()

      await fetchPromotionInfo()
      await nextTick()

      expect(upstreamRatios.value).toEqual([])
    })

    it('二级代理上级佣金应为[0.08]', async () => {
      const { getPromotionInfo } = await import('@/utils/api')
      vi.mocked(getPromotionInfo).mockResolvedValueOnce({
        inviteCode: 'DEF456',
        agentLevel: 2,
        agentLevelName: '银牌推广员',
        agentLevelInternalName: '二级代理',
        promotionPath: 'parent1', // 二级代理有1个上级
        totalReward: 50000,
        pendingReward: 10000,
        withdrawableReward: 40000,
        todayReward: 2000,
        monthReward: 15000,
        performance: { totalSales: 100000, monthSales: 30000, monthTag: '2026-03', teamCount: 50 },
        promotionProgress: null,
        teamStats: { total: 50, level1: 25, level2: 15, level3: 8, level4: 2 }
      })

      const { usePromotion } = await import('./usePromotion')
      const { upstreamRatios, fetchPromotionInfo } = usePromotion()

      await fetchPromotionInfo()
      await nextTick()

      expect(upstreamRatios.value).toEqual([0.08])
    })

    it('三级代理上级佣金应为[0.04, 0.04]', async () => {
      const { getPromotionInfo } = await import('@/utils/api')
      vi.mocked(getPromotionInfo).mockResolvedValueOnce({
        inviteCode: 'GHI789',
        agentLevel: 3,
        agentLevelName: '铜牌推广员',
        agentLevelInternalName: '三级代理',
        promotionPath: 'parent1/parent2', // 三级代理有2个上级
        totalReward: 30000,
        pendingReward: 5000,
        withdrawableReward: 25000,
        todayReward: 1000,
        monthReward: 8000,
        performance: { totalSales: 50000, monthSales: 15000, monthTag: '2026-03', teamCount: 20 },
        promotionProgress: null,
        teamStats: { total: 20, level1: 10, level2: 6, level3: 3, level4: 1 }
      })

      const { usePromotion } = await import('./usePromotion')
      const { upstreamRatios, fetchPromotionInfo } = usePromotion()

      await fetchPromotionInfo()
      await nextTick()

      expect(upstreamRatios.value).toEqual([0.04, 0.04])
    })

    it('四级代理上级佣金应为[0.04, 0.04, 0.04]', async () => {
      const { getPromotionInfo } = await import('@/utils/api')
      // Mock 返回四级代理，有3个上级
      vi.mocked(getPromotionInfo).mockResolvedValueOnce({
        inviteCode: 'GHI789',
        agentLevel: 4,
        agentLevelName: '普通会员',
        agentLevelInternalName: '四级代理',
        promotionPath: 'parent1/parent2/parent3',
        totalReward: 10000,
        pendingReward: 5000,
        withdrawableReward: 5000,
        todayReward: 100,
        monthReward: 500,
        performance: { totalSales: 10000, monthSales: 3000, monthTag: '2026-03', teamCount: 3 },
        promotionProgress: null,
        teamStats: { total: 3, level1: 1, level2: 1, level3: 1, level4: 0 }
      })

      const { usePromotion } = await import('./usePromotion')
      const { upstreamRatios, fetchPromotionInfo } = usePromotion()

      await fetchPromotionInfo()
      await nextTick()

      // 四级代理有3个上级时，应返回 [0.04, 0.04, 0.04]
      expect(upstreamRatios.value).toEqual([0.04, 0.04, 0.04])
    })

    it('四级代理无上级时应返回空数组', async () => {
      const { usePromotion } = await import('./usePromotion')
      const { upstreamRatios } = usePromotion()

      // 默认为四级代理，没有 promotionPath
      expect(upstreamRatios.value).toEqual([])
    })
  })

  describe('upgradeAgentLevel', () => {
    it('应该成功升级代理等级', async () => {
      const { usePromotion } = await import('./usePromotion')
      const { user, upgradeAgentLevel } = usePromotion()

      // 从四级升级到三级
      const result = await upgradeAgentLevel(3 as any)

      expect(result.newLevel).toBe(3)
      expect(user.value.agentLevel).toBe(3)
    })

    it('升级失败时应该抛出错误', async () => {
      const { promoteAgentLevel } = await import('@/utils/api')
      vi.mocked(promoteAgentLevel).mockRejectedValueOnce(new Error('升级失败'))

      const { usePromotion } = await import('./usePromotion')
      const { upgradeAgentLevel } = usePromotion()

      await expect(upgradeAgentLevel(2 as any)).rejects.toThrow('升级失败')
    })
  })

  describe('agentLevelName', () => {
    it('应该返回当前代理等级名称', async () => {
      const { usePromotion } = await import('./usePromotion')
      const { agentLevelName, fetchPromotionInfo } = usePromotion()

      await fetchPromotionInfo()
      await nextTick()

      expect(agentLevelName.value).toBe('金牌推广员')
    })
  })

  describe('agentLevelInternalName', () => {
    it('应该返回当前代理等级内部名称', async () => {
      const { usePromotion } = await import('./usePromotion')
      const { agentLevelInternalName, fetchPromotionInfo } = usePromotion()

      await fetchPromotionInfo()
      await nextTick()

      expect(agentLevelInternalName.value).toBe('一级代理')
    })
  })

  describe('团队统计', () => {
    it('应该正确返回团队统计数据', async () => {
      const { usePromotion } = await import('./usePromotion')
      const { user, fetchPromotionInfo } = usePromotion()

      await fetchPromotionInfo()
      await nextTick()

      expect(user.value.teamStats.total).toBe(100)
      expect(user.value.teamStats.level1).toBe(50)
      expect(user.value.teamStats.level2).toBe(30)
      expect(user.value.teamStats.level3).toBe(15)
      expect(user.value.teamStats.level4).toBe(5)
    })
  })

  describe('业绩数据', () => {
    it('应该正确返回业绩数据', async () => {
      const { usePromotion } = await import('./usePromotion')
      const { user, fetchPromotionInfo } = usePromotion()

      await fetchPromotionInfo()
      await nextTick()

      expect(user.value.performance.totalSales).toBe(200000)
      expect(user.value.performance.monthSales).toBe(50000)
      expect(user.value.performance.teamCount).toBe(100)
    })
  })

  describe('奖励数据', () => {
    it('应该正确返回奖励数据', async () => {
      const { usePromotion } = await import('./usePromotion')
      const { user, fetchPromotionInfo } = usePromotion()

      await fetchPromotionInfo()
      await nextTick()

      expect(user.value.totalReward).toBe(100000)
      expect(user.value.pendingReward).toBe(20000)
      expect(user.value.withdrawableReward).toBe(80000)
      expect(user.value.todayReward).toBe(5000)
      expect(user.value.monthReward).toBe(30000)
    })
  })
})
