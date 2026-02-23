/**
 * 管理后台缓存配置
 * 定义不同类型数据的缓存策略
 */

/**
 * 缓存配置项
 */
export interface CacheConfig {
  key: string          // 缓存键前缀
  expire: number       // 过期时间（分钟）
}

/**
 * 缓存配置
 */
export const CACHE_CONFIG: Record<string, CacheConfig> = {
  // 仪表盘数据 - 10分钟过期（数据统计不需要太高实时性）
  dashboard: {
    key: 'admin_dashboard_data',
    expire: 10
  },

  // 商品列表 - 30分钟过期（商品信息变化不频繁）
  products: {
    key: 'admin_products_list',
    expire: 30
  },

  // 订单列表 - 5分钟过期（需要及时更新）
  orders: {
    key: 'admin_orders_list',
    expire: 5
  },

  // 用户列表 - 20分钟过期
  users: {
    key: 'admin_users_list',
    expire: 20
  },

  // 推广数据 - 15分钟过期
  promotion: {
    key: 'admin_promotion_stats',
    expire: 15
  },

  // 公告列表 - 60分钟过期（公告变化不频繁）
  announcements: {
    key: 'admin_announcements_list',
    expire: 60
  },

  // 财务数据 - 10分钟过期
  finance: {
    key: 'admin_finance_data',
    expire: 10
  },

  // 库存数据 - 15分钟过期
  inventory: {
    key: 'admin_inventory_data',
    expire: 15
  }
}

/**
 * 获取完整的缓存键
 * @param key 缓存键前缀
 * @param params 参数对象（可选）
 * @returns 完整的缓存键
 */
export function getCacheKey(key: string, params?: Record<string, any>): string {
  if (!params || Object.keys(params).length === 0) {
    return key
  }

  // 将参数对象转换为字符串并附加到键后面
  const paramsStr = JSON.stringify(params)
  return `${key}_${paramsStr}`
}
