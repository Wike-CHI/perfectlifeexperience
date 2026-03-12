/**
 * 搜索性能配置
 *
 * 集中管理搜索系统相关的性能优化参数
 */

/**
 * 搜索性能配置
 */
export const SEARCH_PERFORMANCE_CONFIG = {
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
};
