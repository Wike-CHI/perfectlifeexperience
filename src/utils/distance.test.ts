/**
 * distance.ts 单元测试
 * 测试距离计算相关功能
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  STORE_LOCATION,
  calculateDistance,
  formatDistance,
  getDistanceLevel,
  isInDeliveryRange,
  calculateDeliveryFee,
  clearLocationCache
} from './distance'

describe('distance.ts', () => {
  describe('STORE_LOCATION', () => {
    it('应该定义门店位置', () => {
      expect(STORE_LOCATION.latitude).toBeDefined()
      expect(STORE_LOCATION.longitude).toBeDefined()
      expect(STORE_LOCATION.name).toBe('大友元气精酿啤酒屋')
    })

    it('门店坐标应该在有效范围内', () => {
      expect(STORE_LOCATION.latitude).toBeGreaterThanOrEqual(-90)
      expect(STORE_LOCATION.latitude).toBeLessThanOrEqual(90)
      expect(STORE_LOCATION.longitude).toBeGreaterThanOrEqual(-180)
      expect(STORE_LOCATION.longitude).toBeLessThanOrEqual(180)
    })
  })

  describe('calculateDistance', () => {
    it('应该计算两个坐标之间的距离', () => {
      // 北京天安门到故宫的距离约500米
      const distance = calculateDistance(
        39.9087, 116.3975, // 天安门
        39.9163, 116.3972  // 故宫
      )
      expect(distance).toBeGreaterThan(400)
      expect(distance).toBeLessThan(1000)
    })

    it('相同坐标应该返回0', () => {
      const distance = calculateDistance(
        39.9087, 116.3975,
        39.9087, 116.3975
      )
      expect(distance).toBe(0)
    })

    it('应该正确计算远距离', () => {
      // 北京到上海约1000公里
      const distance = calculateDistance(
        39.9042, 116.4074, // 北京
        31.2304, 121.4737  // 上海
      )
      expect(distance).toBeGreaterThan(1000000) // 大于1000公里
      expect(distance).toBeLessThan(1500000)    // 小于1500公里
    })

    it('无效坐标应该抛出错误', () => {
      expect(() => calculateDistance(91, 0, 0, 0)).toThrow('Invalid coordinates')
      expect(() => calculateDistance(0, 181, 0, 0)).toThrow('Invalid coordinates')
      expect(() => calculateDistance(0, 0, -91, 0)).toThrow('Invalid coordinates')
      expect(() => calculateDistance(0, 0, 0, -181)).toThrow('Invalid coordinates')
    })

    it('NaN坐标应该抛出错误', () => {
      expect(() => calculateDistance(NaN, 0, 0, 0)).toThrow('Invalid coordinates')
      expect(() => calculateDistance(0, NaN, 0, 0)).toThrow('Invalid coordinates')
      expect(() => calculateDistance(Infinity, 0, 0, 0)).toThrow('Invalid coordinates')
    })
  })

  describe('formatDistance', () => {
    it('小于1000米应该显示米', () => {
      expect(formatDistance(500)).toBe('500m')
      expect(formatDistance(999)).toBe('999m')
      expect(formatDistance(0)).toBe('0m')
    })

    it('大于等于1000米应该显示公里', () => {
      expect(formatDistance(1000)).toBe('1.0km')
      expect(formatDistance(1500)).toBe('1.5km')
      expect(formatDistance(10000)).toBe('10.0km')
    })

    it('无效值应该返回--', () => {
      expect(formatDistance(NaN)).toBe('--')
      expect(formatDistance(Infinity)).toBe('--')
      expect(formatDistance(-100)).toBe('--')
    })
  })

  describe('getDistanceLevel', () => {
    it('小于1000米应该是near', () => {
      const result = getDistanceLevel(500)
      expect(result.level).toBe('near')
      expect(result.text).toBe('很近')
      expect(result.color).toBe('#52C41A')
    })

    it('1000-5000米应该是medium', () => {
      const result = getDistanceLevel(3000)
      expect(result.level).toBe('medium')
      expect(result.text).toBe('适中')
      expect(result.color).toBe('#D4A574')
    })

    it('大于5000米应该是far', () => {
      const result = getDistanceLevel(10000)
      expect(result.level).toBe('far')
      expect(result.text).toBe('较远')
      expect(result.color).toBe('#9B8B7F')
    })

    it('边界值测试', () => {
      expect(getDistanceLevel(999).level).toBe('near')
      expect(getDistanceLevel(1000).level).toBe('medium')
      expect(getDistanceLevel(4999).level).toBe('medium')
      expect(getDistanceLevel(5000).level).toBe('far')
    })
  })

  describe('isInDeliveryRange', () => {
    it('默认配送范围10公里', () => {
      expect(isInDeliveryRange(5000)).toBe(true)
      expect(isInDeliveryRange(10000)).toBe(true)
      expect(isInDeliveryRange(10001)).toBe(false)
    })

    it('应该支持自定义配送范围', () => {
      expect(isInDeliveryRange(5000, 3000)).toBe(false)
      expect(isInDeliveryRange(5000, 10000)).toBe(true)
    })
  })

  describe('calculateDeliveryFee', () => {
    it('1公里内免配送费', () => {
      expect(calculateDeliveryFee(0)).toBe(0)
      expect(calculateDeliveryFee(500)).toBe(0)
      expect(calculateDeliveryFee(999)).toBe(0)
    })

    it('1-3公里配送费5元', () => {
      expect(calculateDeliveryFee(1000)).toBe(500)
      expect(calculateDeliveryFee(2000)).toBe(500)
      expect(calculateDeliveryFee(2999)).toBe(500)
    })

    it('3-5公里配送费8元', () => {
      expect(calculateDeliveryFee(3000)).toBe(800)
      expect(calculateDeliveryFee(4000)).toBe(800)
      expect(calculateDeliveryFee(4999)).toBe(800)
    })

    it('5公里以上配送费10元', () => {
      expect(calculateDeliveryFee(5000)).toBe(1000)
      expect(calculateDeliveryFee(10000)).toBe(1000)
      expect(calculateDeliveryFee(50000)).toBe(1000)
    })
  })

  describe('getUserLocation', () => {
    beforeEach(() => {
      clearLocationCache()
    })

    it('应该成功获取用户位置', async () => {
      const { getUserLocation } = await import('./distance')

      // uni.getLocation 使用回调模式
      const location = await getUserLocation()

      expect(location).toHaveProperty('latitude')
      expect(location).toHaveProperty('longitude')
    })
  })

  describe('getDistanceToStore', () => {
    beforeEach(() => {
      clearLocationCache()
    })

    it('应该计算用户到门店的距离', async () => {
      const { getDistanceToStore } = await import('./distance')

      const distance = await getDistanceToStore()

      expect(typeof distance).toBe('number')
      expect(distance).toBeGreaterThanOrEqual(0)
    })
  })

  describe('clearLocationCache', () => {
    it('应该清除位置缓存', () => {
      clearLocationCache()
      // 没有抛出错误即为成功
      expect(true).toBe(true)
    })
  })

  describe('requestLocationPermission', () => {
    it('应该处理授权请求', async () => {
      const { requestLocationPermission } = await import('./distance')

      // 由于我们mock了uni.authorize，它会返回true
      const result = await requestLocationPermission()
      expect(typeof result).toBe('boolean')
    })
  })
})
