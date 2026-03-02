/**
 * 数据库查询性能优化模块
 *
 * 提供缓存和批量查询优化功能
 */

const { createLogger } = require('./logger');
const logger = createLogger('cache');

/**
 * 简单内存缓存类
 */
class QueryCache {
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
    logger.debug('Cache set', { key, ttl: ttl || this.defaultTTL });
  }

  /**
   * 获取缓存
   * @param {string} key - 缓存键
   * @returns {*} 缓存值，不存在或已过期返回 null
   */
  get(key) {
    const item = this.cache.get(key);

    if (!item) {
      logger.debug('Cache miss', { key });
      return null;
    }

    if (Date.now() > item.expireAt) {
      logger.debug('Cache expired', { key });
      this.cache.delete(key);
      return null;
    }

    logger.debug('Cache hit', { key });
    return item.value;
  }

  /**
   * 删除缓存
   * @param {string} key - 缓存键
   */
  delete(key) {
    this.cache.delete(key);
    logger.debug('Cache deleted', { key });
  }

  /**
   * 清空所有缓存
   */
  clear() {
    this.cache.clear();
    logger.info('Cache cleared');
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

// 全局缓存实例
const userCache = new QueryCache(300000);       // 用户信息缓存 5分钟
const productCache = new QueryCache(3600000);    // 商品缓存 1小时
const teamStatsCache = new QueryCache(3600000);  // 团队统计缓存 1小时
const categoryCache = new QueryCache(7200000);   // 分类缓存 2小时

/**
 * 带缓存的数据库查询装饰器
 * @param {QueryCache} cache - 缓存实例
 * @param {string} keyPrefix - 缓存键前缀
 * @param {number} ttl - 过期时间
 */
function withCache(cache, keyPrefix, ttl) {
  return async function(queryFn, ...args) {
    const key = `${keyPrefix}_${JSON.stringify(args)}`;

    // 1. 尝试从缓存获取
    const cached = cache.get(key);
    if (cached !== null) {
      return cached;
    }

    // 2. 执行查询
    const result = await queryFn(...args);

    // 3. 存入缓存
    if (result !== null && result !== undefined) {
      cache.set(key, result, ttl);
    }

    return result;
  };
}

/**
 * 批量获取数据（减少 N+1 查询）
 * @param {Array} ids - ID 列表
 * @param {string} collection - 集合名称
 * @param {object} db - 数据库实例
 * @param {Array} fields - 需要返回的字段
 */
async function batchGet(ids, collection, db, fields = null) {
  if (!ids || ids.length === 0) {
    return [];
  }

  const _ = db.command;
  const query = db.collection(collection).where({ _id: _.in(ids) });

  if (fields) {
    query.field(fields);
  }

  const result = await query.get();

  logger.debug('Batch get', {
    collection,
    count: ids.length,
    found: result.data.length
  });

  return result.data;
}

/**
 * 批量统计（减少 N+1 查询）
 * @param {Array} conditions - 查询条件列表
 * @param {string} collection - 集合名称
 * @param {object} db - 数据库实例
 */
async function batchCount(conditions, collection, db) {
  if (!conditions || conditions.length === 0) {
    return [];
  }

  const results = [];

  for (const condition of conditions) {
    const result = await db.collection(collection).where(condition).count();
    results.push(result.total);
  }

  return results;
}

module.exports = {
  QueryCache,
  userCache,
  productCache,
  teamStatsCache,
  categoryCache,
  withCache,
  batchGet,
  batchCount
};
