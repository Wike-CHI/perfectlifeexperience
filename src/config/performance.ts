/**
 * 搜索性能配置
 *
 * 集中管理搜索系统相关的性能优化参数，包括防抖延迟、分页大小、
 * 分批渲染、缓存策略和图片加载等配置。
 *
 * @example
 * ```typescript
 * import { SEARCH_PERFORMANCE_CONFIG } from '@/config/performance';
 *
 * // 使用防抖延迟配置
 * const delay = SEARCH_PERFORMANCE_CONFIG.debounceDelay; // 500ms
 *
 * // 使用缓存配置
 * const cacheTTL = SEARCH_PERFORMANCE_CONFIG.cache.searchResultTTL; // 60000ms
 *
 * // 使用图片懒加载配置
 * const enableLazyLoad = SEARCH_PERFORMANCE_CONFIG.image.lazy; // true
 * ```
 */

/**
 * 搜索性能配置接口
 *
 * 定义搜索系统中所有性能优化相关的配置参数
 */
export interface SearchPerformanceConfig {
  /** 防抖延迟（毫秒）- 用户输入后等待多久执行搜索 */
  debounceDelay: number;

  /** 初始每页大小 - 首次加载的搜索结果数量，从20降到12以减少初始加载量 */
  initialPageSize: number;

  /** 分批渲染时每批渲染的结果数量 */
  renderBatchSize: number;

  /** 分批渲染时每批之间的延迟（毫秒） */
  renderBatchDelay: number;

  /** 近似总数阈值 - 超过此数量的搜索结果将显示近似总数而非精确值 */
  approximateTotalThreshold: number;

  /** 缓存配置 */
  cache: {
    /** 热门关键词缓存有效期（毫秒）- 默认5分钟 */
    hotKeywordsTTL: number;
    /** 搜索结果缓存有效期（毫秒）- 默认1分钟 */
    searchResultTTL: number;
  };

  /** 图片加载配置 */
  image: {
    /** 是否启用图片懒加载 */
    lazy: boolean;
    /** 图片加载失败时的占位图路径 */
    errorPlaceholder: string;
  };
}

/**
 * 搜索性能配置常量
 *
 * 集中管理搜索系统相关的性能优化参数
 */
export const SEARCH_PERFORMANCE_CONFIG: SearchPerformanceConfig = {
  // 防抖延迟（毫秒）
  debounceDelay: 500,

  // 初始每页大小（从20降到12，减少初始加载量）
  initialPageSize: 12,

  // 分批渲染配置
  renderBatchSize: 5,
  renderBatchDelay: 100,

  // 近似总数阈值（超过此值使用近似总数）
  approximateTotalThreshold: 100,

  // 缓存配置
  cache: {
    hotKeywordsTTL: 300000,      // 5分钟
    searchResultTTL: 60000,       // 1分钟
  },

  // 图片加载配置
  image: {
    lazy: true,
    errorPlaceholder: '/static/placeholder.png'
  }
} as const;

/**
 * 订单分页性能配置接口
 */
export interface OrderPaginationConfig {
  /** 每页订单数量 */
  pageSize: number;
  /** 缓存有效期（毫秒） */
  cacheTTL: number;
  /** 最大分页数 */
  maxPage: number;
}

/**
 * 虚拟列表性能配置接口
 */
export interface VirtualListConfig {
  /** 可见区域商品数量 */
  visibleCount: number;
  /** 缓冲区大小（上下各多少个） */
  bufferSize: number;
  /** 商品卡片固定高度（rpx） */
  itemHeight: number;
}

/**
 * 缓存配置接口
 */
export interface CacheConfig {
  /** 订单列表缓存键 */
  ORDER_LIST: string;
  /** 分类商品缓存键前缀 */
  CATEGORY_PRODUCTS: string;
  /** 性能基线缓存键 */
  PERFORMANCE_BASELINE: string;
}

/**
 * 订单分页性能配置常量
 */
export const ORDER_PAGINATION_CONFIG: OrderPaginationConfig = {
  pageSize: 10,              // 每页10条订单
  cacheTTL: 5 * 60 * 1000,   // 缓存5分钟
  maxPage: 50                // 最多加载50页
} as const;

/**
 * 虚拟列表性能配置常量
 */
export const VIRTUAL_LIST_CONFIG: VirtualListConfig = {
  visibleCount: 5,           // 可见区域5个商品
  bufferSize: 3,             // 上下各缓冲3个
  itemHeight: 100            // 商品卡片高度100rpx (极度紧凑)
} as const;

/**
 * 缓存键配置常量
 */
export const CACHE_KEYS: CacheConfig = {
  ORDER_LIST: 'perf_order_list_cache',
  CATEGORY_PRODUCTS: 'perf_category_products_',
  PERFORMANCE_BASELINE: 'perf_baseline'
} as const;
