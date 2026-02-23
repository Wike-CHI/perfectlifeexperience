/**
 * 管理后台缓存管理工具
 * 提供数据的缓存、读取、清除等功能
 */

import { CACHE_CONFIG, getCacheKey } from './cache-config'

/**
 * 缓存项数据结构
 */
interface CacheItem<T = any> {
  data: T
  timestamp: number
  expire: number  // 过期时间（毫秒）
}

/**
 * 管理后台缓存管理类
 */
class AdminCacheManager {
  private static readonly PREFIX = 'admin_cache_'
  private static readonly VERSION = 'v1' // 缓存版本，用于批量清除

  /**
   * 设置缓存
   * @param key 缓存键
   * @param data 数据
   * @param expireMinutes 过期时间（分钟），默认 30 分钟
   */
  static set<T>(key: string, data: T, expireMinutes: number = 30): void {
    try {
      const cacheItem: CacheItem<T> = {
        data,
        timestamp: Date.now(),
        expire: expireMinutes * 60 * 1000
      }

      const fullKey = this.getFullKey(key)
      uni.setStorageSync(fullKey, JSON.stringify(cacheItem))
    } catch (error) {
      console.error('缓存设置失败:', error)
    }
  }

  /**
   * 获取缓存
   * @param key 缓存键
   * @returns 数据或 null
   */
  static get<T>(key: string): T | null {
    try {
      const fullKey = this.getFullKey(key)
      const cacheStr = uni.getStorageSync(fullKey)

      if (!cacheStr) return null

      const cacheItem: CacheItem<T> = JSON.parse(cacheStr)

      // 检查是否过期
      if (Date.now() - cacheItem.timestamp > cacheItem.expire) {
        this.remove(key)
        return null
      }

      return cacheItem.data
    } catch (error) {
      console.error('缓存读取失败:', error)
      return null
    }
  }

  /**
   * 移除指定缓存
   * @param key 缓存键
   */
  static remove(key: string): void {
    try {
      const fullKey = this.getFullKey(key)
      uni.removeStorageSync(fullKey)
    } catch (error) {
      console.error('缓存删除失败:', error)
    }
  }

  /**
   * 清空所有管理后台缓存
   */
  static clear(): void {
    try {
      uni.getStorageInfo({
        success: (res) => {
          res.keys.forEach(key => {
            if (key.startsWith(this.PREFIX)) {
              uni.removeStorageSync(key)
            }
          })
        }
      })
    } catch (error) {
      console.error('清空缓存失败:', error)
    }
  }

  /**
   * 清除指定类型的缓存
   * @param type 缓存类型（对应 CACHE_CONFIG 的键）
   */
  static clearByType(type: keyof typeof CACHE_CONFIG): void {
    try {
      const config = CACHE_CONFIG[type]
      if (!config) return

      // 清除该类型的所有缓存
      uni.getStorageInfo({
        success: (res) => {
          res.keys.forEach(key => {
            if (key.startsWith(this.getFullKey(config.key))) {
              uni.removeStorageSync(key)
            }
          })
        }
      })
    } catch (error) {
      console.error('清除缓存失败:', error)
    }
  }

  /**
   * 获取或设置（带自动刷新）
   * 如果缓存存在且未过期，直接返回缓存数据
   * 否则调用 fetcher 获取数据并缓存
   * @param key 缓存键
   * @param fetcher 数据获取函数
   * @param expireMinutes 过期时间（分钟）
   * @returns 数据
   */
  static async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    expireMinutes: number = 30
  ): Promise<T> {
    // 先尝试从缓存获取
    const cached = this.get<T>(key)
    if (cached !== null) {
      return cached
    }

    // 缓存未命中，调用 fetcher 获取数据
    try {
      const data = await fetcher()
      this.set(key, data, expireMinutes)
      return data
    } catch (error) {
      console.error('获取数据失败:', error)
      throw error
    }
  }

  /**
   * 获取配置的缓存键
   * @param type 缓存类型
   * @param params 参数对象（可选）
   * @returns 完整的缓存键
   */
  static getConfigKey(type: keyof typeof CACHE_CONFIG, params?: Record<string, any>): string {
    const config = CACHE_CONFIG[type]
    return getCacheKey(config.key, params)
  }

  /**
   * 获取完整缓存键（带前缀）
   * @param key 缓存键
   * @returns 完整的缓存键
   */
  private static getFullKey(key: string): string {
    return `${this.PREFIX}${this.VERSION}_${key}`
  }

  /**
   * 检查缓存是否存在且未过期
   * @param key 缓存键
   * @returns 是否有效
   */
  static isValid(key: string): boolean {
    try {
      const fullKey = this.getFullKey(key)
      const cacheStr = uni.getStorageSync(fullKey)

      if (!cacheStr) return false

      const cacheItem: CacheItem = JSON.parse(cacheStr)
      const age = Date.now() - cacheItem.timestamp

      return age <= cacheItem.expire
    } catch (error) {
      return false
    }
  }

  /**
   * 获取缓存大小（字节）
   * @returns 缓存大小
   */
  static getSize(): number {
    try {
      let size = 0
      uni.getStorageInfo({
        success: (res) => {
          res.keys.forEach(key => {
            if (key.startsWith(this.PREFIX)) {
              const value = uni.getStorageSync(key)
              size += key.length + value.length
            }
          })
        }
      })
      return size
    } catch (error) {
      return 0
    }
  }

  /**
   * 获取缓存信息
   * @returns 缓存统计信息
   */
  static getInfo(): { count: number; size: number } {
    try {
      let count = 0
      let size = 0

      uni.getStorageInfo({
        success: (res) => {
          res.keys.forEach(key => {
            if (key.startsWith(this.PREFIX)) {
              count++
              const value = uni.getStorageSync(key)
              size += key.length + (value?.length || 0)
            }
          })
        }
      })

      return { count, size }
    } catch (error) {
      return { count: 0, size: 0 }
    }
  }
}

export default AdminCacheManager
