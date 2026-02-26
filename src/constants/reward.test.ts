/**
 * reward.ts 常量单元测试
 */

import { describe, it, expect } from 'vitest'
import {
  REWARD_LEVEL_TEXTS,
  REWARD_STATUS_TEXTS,
  REWARD_STATUS_ICONS,
  REWARD_STATUS_COLORS,
  REWARD_TYPE_SHORT_NAMES,
  REWARD_TYPE_FULL_NAMES,
  REWARD_TYPE_CLASSES,
  REWARD_TYPE_GRADIENTS,
  PAGINATION_CONFIG
} from './reward'
import { RewardType, RewardStatus } from '@/types/database'

describe('Reward Constants', () => {
  describe('REWARD_LEVEL_TEXTS', () => {
    it('应该包含所有层级文本', () => {
      expect(REWARD_LEVEL_TEXTS[1]).toBe('直接推广')
      expect(REWARD_LEVEL_TEXTS[2]).toBe('二级推广')
      expect(REWARD_LEVEL_TEXTS[3]).toBe('三级推广')
      expect(REWARD_LEVEL_TEXTS[4]).toBe('四级推广')
    })

    it('应该包含 4 个层级', () => {
      const levels = Object.keys(REWARD_LEVEL_TEXTS).map(Number)
      expect(levels).toContain(1)
      expect(levels).toContain(2)
      expect(levels).toContain(3)
      expect(levels).toContain(4)
      expect(levels.length).toBe(4)
    })
  })

  describe('REWARD_STATUS_TEXTS', () => {
    it('应该包含所有状态文本', () => {
      expect(REWARD_STATUS_TEXTS[RewardStatus.PENDING]).toBe('待结算')
      expect(REWARD_STATUS_TEXTS[RewardStatus.SETTLED]).toBe('已结算')
      expect(REWARD_STATUS_TEXTS[RewardStatus.CANCELLED]).toBe('已取消')
      expect(REWARD_STATUS_TEXTS[RewardStatus.DEDUCTED]).toBe('已扣回')
    })

    it('应该是 Record 类型', () => {
      expect(typeof REWARD_STATUS_TEXTS).toBe('object')
      expect(Object.keys(REWARD_STATUS_TEXTS).length).toBe(4)
    })
  })

  describe('REWARD_STATUS_ICONS', () => {
    it('应该包含所有状态图标', () => {
      expect(REWARD_STATUS_ICONS[RewardStatus.PENDING]).toBe('clock-filled')
      expect(REWARD_STATUS_ICONS[RewardStatus.SETTLED]).toBe('checkmarkempty')
      expect(REWARD_STATUS_ICONS[RewardStatus.CANCELLED]).toBe('closeempty')
      expect(REWARD_STATUS_ICONS[RewardStatus.DEDUCTED]).toBe('refreshempty')
    })
  })

  describe('REWARD_STATUS_COLORS', () => {
    it('应该使用东方美学暖色调', () => {
      // 检查没有冷色调（蓝色、紫色）
      const colors = Object.values(REWARD_STATUS_COLORS)
      const hasColdColors = colors.some(color =>
        color.includes('0052') || // 蓝色
        color.includes('7C3A') ||  // 紫色
        color.includes('A855')     // 紫色
      )
      expect(hasColdColors).toBe(false)

      // 检查有暖色调
      expect(REWARD_STATUS_COLORS[RewardStatus.PENDING]).toBe('#FFB085')   // 橙色
      expect(REWARD_STATUS_COLORS[RewardStatus.SETTLED]).toBe('#06D6A0')   // 绿色
    })

    it('所有颜色应该是有效的十六进制值', () => {
      const hexColorRegex = /^#[0-9A-F]{6}$/i
      Object.values(REWARD_STATUS_COLORS).forEach(color => {
        expect(color).toMatch(hexColorRegex)
      })
    })
  })

  describe('REWARD_TYPE_SHORT_NAMES', () => {
    it('应该包含所有奖励类型的短名称', () => {
      expect(REWARD_TYPE_SHORT_NAMES[RewardType.BASIC_COMMISSION]).toBe('佣')
      expect(REWARD_TYPE_SHORT_NAMES[RewardType.REPURCHASE_REWARD]).toBe('复')
      expect(REWARD_TYPE_SHORT_NAMES[RewardType.TEAM_MANAGEMENT]).toBe('管')
      expect(REWARD_TYPE_SHORT_NAMES[RewardType.NURTURE_ALLOWANCE]).toBe('育')
    })

    it('所有短名称应该是单个汉字', () => {
      Object.values(REWARD_TYPE_SHORT_NAMES).forEach(name => {
        expect(/^[\u4e00-\u9fa5]$/.test(name)).toBe(true)
      })
    })
  })

  describe('REWARD_TYPE_FULL_NAMES', () => {
    it('应该包含所有奖励类型的完整名称', () => {
      expect(REWARD_TYPE_FULL_NAMES[RewardType.BASIC_COMMISSION]).toBe('基础佣金')
      expect(REWARD_TYPE_FULL_NAMES[RewardType.REPURCHASE_REWARD]).toBe('复购奖励')
      expect(REWARD_TYPE_FULL_NAMES[RewardType.TEAM_MANAGEMENT]).toBe('团队管理奖')
      expect(REWARD_TYPE_FULL_NAMES[RewardType.NURTURE_ALLOWANCE]).toBe('育成津贴')
    })
  })

  describe('REWARD_TYPE_CLASSES', () => {
    it('应该包含所有奖励类型的 CSS 类名', () => {
      expect(REWARD_TYPE_CLASSES[RewardType.BASIC_COMMISSION]).toBe('type-commission')
      expect(REWARD_TYPE_CLASSES[RewardType.REPURCHASE_REWARD]).toBe('type-repurchase')
      expect(REWARD_TYPE_CLASSES[RewardType.TEAM_MANAGEMENT]).toBe('type-management')
      expect(REWARD_TYPE_CLASSES[RewardType.NURTURE_ALLOWANCE]).toBe('type-nurture')
    })

    it('所有类名应该以 type- 开头', () => {
      Object.values(REWARD_TYPE_CLASSES).forEach(className => {
        expect(className).toMatch(/^type-/)
      })
    })
  })

  describe('REWARD_TYPE_GRADIENTS', () => {
    it('应该使用东方美学暖色调渐变', () => {
      // 检查没有冷色调渐变
      const gradients = Object.values(REWARD_TYPE_GRADIENTS)
      const hasColdGradients = gradients.some(grad =>
        grad.includes('#0052') ||  // 蓝色
        grad.includes('#00A1') ||  // 蓝色
        grad.includes('#7C3A') ||  // 紫色
        grad.includes('#A855')     // 紫色
      )
      expect(hasColdGradients).toBe(false)

      // 检查有暖色调渐变
      expect(REWARD_TYPE_GRADIENTS[RewardType.BASIC_COMMISSION]).toContain('#D4A574') // 琥珀金
      expect(REWARD_TYPE_GRADIENTS[RewardType.REPURCHASE_REWARD]).toContain('#7A9A8E') // 鼠尾草绿
    })

    it('所有渐变应该是有效的 CSS 渐变语法', () => {
      Object.values(REWARD_TYPE_GRADIENTS).forEach(gradient => {
        expect(gradient).toMatch(/^linear-gradient\(\d+deg,/)
      })
    })
  })

  describe('PAGINATION_CONFIG', () => {
    it('应该有默认页大小', () => {
      expect(PAGINATION_CONFIG.DEFAULT_PAGE_SIZE).toBe(20)
    })

    it('应该有最大页大小', () => {
      expect(PAGINATION_CONFIG.MAX_PAGE_SIZE).toBe(100)
    })

    it('默认页大小应该小于等于最大页大小', () => {
      expect(PAGINATION_CONFIG.DEFAULT_PAGE_SIZE).toBeLessThanOrEqual(
        PAGINATION_CONFIG.MAX_PAGE_SIZE
      )
    })

    it('应该是不可变对象', () => {
      expect(PAGINATION_CONFIG).toBeFrozenOrSealed()
    })
  })
})

// 辅助匹配器：检查对象是否冻结或密封
declare global {
  namespace Vi {
    interface Matchers<R = any> {
      toBeFrozenOrSealed(): R
    }
  }
}

expect.extend({
  toBeFrozenOrSealed(received: any) {
    const isFrozen = Object.isFrozen(received)
    const isSealed = Object.isSealed(received)
    const pass = isFrozen || isSealed

    return {
      pass,
      message: () =>
        pass
          ? `对象是冻结或密封的`
          : `期望对象是冻结或密封的，但实际上既不冻结也不密封`
    }
  }
})
