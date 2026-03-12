/**
 * 功能开关配置
 *
 * 用于控制性能优化功能的启用/禁用，支持渐进式优化和快速回滚
 */

/**
 * 功能开关枚举
 */
export const FEATURE_FLAGS = {
  ORDER_PAGINATION: true,        // 订单列表分页
  VIRTUAL_LIST: true,             // 分类虚拟列表
  SKELETON_SCREEN: true,          // 骨架屏加载
  API_OPTIMIZATION: true,         // 接口优化（并行请求）
  CACHE_STRATEGY: true,           // 缓存策略
  PERFORMANCE_MONITORING: true    // 性能监控
} as const;

/**
 * 功能开关类型
 */
export type FeatureFlag = keyof typeof FEATURE_FLAGS;

/**
 * 检查功能是否启用
 * @param feature 功能名称
 * @returns 是否启用
 */
export function isFeatureEnabled(feature: FeatureFlag): boolean {
  // 可以从远程配置读取，支持动态开关
  // 当前版本使用本地配置
  return FEATURE_FLAGS[feature];
}

/**
 * 禁用功能（用于回滚）
 * @param feature 功能名称
 */
export function disableFeature(feature: FeatureFlag): void {
  (FEATURE_FLAGS as any)[feature] = false;

  // 记录回滚日志
  uni.setStorageSync('feature_rollback_log', {
    feature,
    timestamp: Date.now(),
    reason: 'manual_disable'
  });

  console.warn(`[FeatureFlag] ${feature} 已禁用`);
}

/**
 * 启用功能（用于恢复）
 * @param feature 功能名称
 */
export function enableFeature(feature: FeatureFlag): void {
  (FEATURE_FLAGS as any)[feature] = true;
  console.log(`[FeatureFlag] ${feature} 已启用`);
}
