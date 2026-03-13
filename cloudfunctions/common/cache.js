/**
 * CloudBase 统计数据缓存工具
 * TTL: 5 分钟
 *
 * 这个模块提供简单的内存缓存功能，用于缓存统计数据
 * 减少数据库查询，提升性能
 */

/**
 * 简单内存缓存类
 */
class SimpleCache {
  constructor(defaultTTL = 300000) { // 默认5分钟
    this.cache = new Map();
    this.defaultTTL = defaultTTL;
  }

  /**
   * 设置缓存
   * @param {string} key - 缓存键
   * @param {*} value - 缓存值
   * @param {number} ttl - 过期时间（毫秒）
   */
  set(key, value, ttl) {
    this.cache.set(key, {
      value,
      expireAt: Date.now() + (ttl || this.defaultTTL)
    });
    console.log('缓存已设置:', key, 'TTL:', ttl || this.defaultTTL);
  }

  /**
   * 获取缓存
   * @param {string} key - 缓存键
   * @returns {*} 缓存值，不存在或已过期返回 null
   */
  get(key) {
    const item = this.cache.get(key);

    if (!item) {
      return null;
    }

    if (Date.now() > item.expireAt) {
      this.cache.delete(key);
      return null;
    }

    console.log('缓存命中:', key);
    return item.value;
  }

  /**
   * 删除缓存
   * @param {string} key - 缓存键
   */
  delete(key) {
    this.cache.delete(key);
    console.log('缓存已删除:', key);
  }

  /**
   * 清空所有缓存
   */
  clear() {
    this.cache.clear();
    console.log('所有缓存已清空');
  }

  /**
   * 获取缓存统计
   */
  getStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

// 全局缓存实例（用于统计数据）
const statsCache = new SimpleCache(5 * 60 * 1000); // 5分钟

/**
 * 生成缓存键
 * @param {string} openid - 用户 openid
 * @param {string} type - 统计类型 (teamCount, monthSales, totalSales, todayEarnings, etc.)
 * @returns {string} 缓存键
 */
function getCacheKey(openid, type) {
  return `stats:${type}:${openid}`;
}

/**
 * 获取缓存的统计数据
 * @param {string} openid - 用户 openid
 * @param {string} type - 统计类型
 * @returns {Promise<number|null>} 缓存值或 null
 */
async function getCachedStats(openid, type) {
  try {
    const key = getCacheKey(openid, type);
    const cached = statsCache.get(key);

    if (cached !== null) {
      return cached;
    }

    return null;
  } catch (error) {
    console.error('读取缓存失败:', error);
    return null;
  }
}

/**
 * 设置缓存的统计数据
 * @param {string} openid - 用户 openid
 * @param {string} type - 统计类型
 * @param {any} value - 统计值
 * @param {number} ttl - 过期时间（毫秒），默认 5 分钟
 */
async function setCachedStats(openid, type, value, ttl = 5 * 60 * 1000) {
  try {
    const key = getCacheKey(openid, type);
    statsCache.set(key, value, ttl);
  } catch (error) {
    console.error('设置缓存失败:', error);
  }
}

/**
 * 清除用户的所有统计缓存
 * @param {string} openid - 用户 openid
 */
async function clearUserStatsCache(openid) {
  try {
    const types = ['teamCount', 'monthSales', 'totalSales', 'todayEarnings', 'promotionInfo'];

    for (const type of types) {
      const key = getCacheKey(openid, type);
      statsCache.delete(key);
    }

    console.log('用户统计缓存已清除:', openid);
  } catch (error) {
    console.error('清除缓存失败:', error);
  }
}

module.exports = {
  SimpleCache,
  statsCache,
  getCacheKey,
  getCachedStats,
  setCachedStats,
  clearUserStatsCache
};
