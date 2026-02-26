/**
 * format.ts 单元测试
 */

import { describe, it, expect } from 'vitest'
import { formatPrice, formatTime, formatRelativeTime, formatPercent, formatNumber, formatFileSize } from './format'

describe('formatPrice', () => {
  it('应该将分转换为元', () => {
    expect(formatPrice(100)).toBe('1.00')
    expect(formatPrice(1500)).toBe('15.00')
    expect(formatPrice(12345)).toBe('123.45')
  })

  it('应该支持自定义精度', () => {
    expect(formatPrice(100, 0)).toBe('1')
    expect(formatPrice(1234, 1)).toBe('12.3')
    expect(formatPrice(1234, 3)).toBe('12.340')
  })

  it('应该处理 0 值', () => {
    expect(formatPrice(0)).toBe('0.00')
  })

  it('应该处理小数', () => {
    expect(formatPrice(1)).toBe('0.01')
    expect(formatPrice(99)).toBe('0.99')
  })
})

describe('formatTime', () => {
  it('应该格式化日期对象', () => {
    const date = new Date('2026-02-26T15:30:00Z')
    expect(formatTime(date)).toBe('2026-02-26 15:30')
  })

  it('应该格式化日期字符串', () => {
    expect(formatTime('2026-02-26T15:30:00Z')).toBe('2026-02-26 15:30')
  })

  it('应该支持自定义格式', () => {
    const date = new Date('2026-02-26T15:30:45Z')
    expect(formatTime(date, 'YYYY-MM-DD')).toBe('2026-02-26')
    expect(formatTime(date, 'HH:mm:ss')).toBe('15:30:45')
  })

  it('应该处理空值', () => {
    expect(formatTime(undefined)).toBe('')
    expect(formatTime('')).toBe('')
  })

  it('应该处理闰年和不同月份', () => {
    expect(formatTime('2026-01-01T00:00:00Z')).toBe('2026-01-01 00:00')
    expect(formatTime('2026-12-31T23:59:59Z')).toBe('2026-12-31 23:59')
  })
})

describe('formatRelativeTime', () => {
  it('应该显示"刚刚"', () => {
    const now = new Date()
    expect(formatRelativeTime(now)).toBe('刚刚')
  })

  it('应该显示"X分钟前"', () => {
    const now = new Date()
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000)
    expect(formatRelativeTime(fiveMinutesAgo)).toBe('5分钟前')
  })

  it('应该显示"X小时前"', () => {
    const now = new Date()
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000)
    expect(formatRelativeTime(twoHoursAgo)).toBe('2小时前')
  })

  it('应该显示"X天前"', () => {
    const now = new Date()
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)
    expect(formatRelativeTime(threeDaysAgo)).toBe('3天前')
  })

  it('超过7天显示日期', () => {
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)
    const result = formatRelativeTime(tenDaysAgo)
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('应该处理空值', () => {
    expect(formatRelativeTime(undefined)).toBe('')
    expect(formatRelativeTime('')).toBe('')
  })
})

describe('formatPercent', () => {
  it('应该将小数转换为百分比', () => {
    expect(formatPercent(0.123)).toBe('12.30%')
    expect(formatPercent(0.5)).toBe('50.00%')
    expect(formatPercent(1)).toBe('100.00%')
  })

  it('应该支持自定义精度', () => {
    expect(formatPercent(0.1234, 1)).toBe('12.3%')
    expect(formatPercent(0.5, 0)).toBe('50%')
  })

  it('应该处理 0 值', () => {
    expect(formatPercent(0)).toBe('0.00%')
  })

  it('应该处理小百分比', () => {
    expect(formatPercent(0.001)).toBe('0.10%')
    expect(formatPercent(0.0001)).toBe('0.01%')
  })
})

describe('formatNumber', () => {
  it('应该添加千分位分隔符', () => {
    expect(formatNumber(1000)).toBe('1,000')
    expect(formatNumber(1000000)).toBe('1,000,000')
    expect(formatNumber(1234567890)).toBe('1,234,567,890')
  })

  it('应该处理小数', () => {
    expect(formatNumber(1234.56)).toBe('1,234.56')
  })

  it('应该处理小数字', () => {
    expect(formatNumber(0)).toBe('0')
    expect(formatNumber(999)).toBe('999')
  })

  it('应该处理负数', () => {
    expect(formatNumber(-1000)).toBe('-1,000')
  })
})

describe('formatFileSize', () => {
  it('应该格式化字节', () => {
    expect(formatFileSize(0)).toBe('0 B')
    expect(formatFileSize(512)).toBe('512 B')
    expect(formatFileSize(1023)).toBe('1023 B')
  })

  it('应该格式化KB', () => {
    expect(formatFileSize(1024)).toBe('1.00 KB')
    expect(formatFileSize(1536)).toBe('1.50 KB')
    expect(formatFileSize(10240)).toBe('10.00 KB')
  })

  it('应该格式化MB', () => {
    expect(formatFileSize(1048576)).toBe('1.00 MB')
    expect(formatFileSize(5242880)).toBe('5.00 MB')
  })

  it('应该格式化GB', () => {
    expect(formatFileSize(1073741824)).toBe('1.00 GB')
    expect(formatFileSize(5368709120)).toBe('5.00 GB')
  })

  it('应该格式化TB', () => {
    expect(formatFileSize(1099511627776)).toBe('1.00 TB')
  })
})
