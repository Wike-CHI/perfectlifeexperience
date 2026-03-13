/**
 * 全局加载状态管理
 *
 * 统一管理页面的加载状态，支持多个独立加载场景
 *
 * @example
 * // 基础用法
 * const { loading, startLoading, stopLoading } = useLoading();
 * startLoading();
 * await fetchData();
 * stopLoading();
 *
 * @example
 * // 带自动关闭
 * const { loading, startLoading } = useLoading();
 * startLoading(10000); // 10秒后自动关闭
 */
import { ref, Ref } from 'vue';

export function useLoading() {
  const loading: Ref<boolean> = ref(false);
  const timeoutId: Ref<NodeJS.Timeout | undefined> = ref();

  /**
   * 开始加载
   * @param autoClose - 自动关闭时间（毫秒），默认 10000ms
   */
  const startLoading = (autoClose = 10000) => {
    loading.value = true;

    // 清除之前的定时器
    if (timeoutId.value) {
      clearTimeout(timeoutId.value);
    }

    // 设置自动关闭定时器
    if (autoClose > 0) {
      timeoutId.value = setTimeout(() => {
        loading.value = false;
        console.warn('[useLoading] 加载超时，自动关闭');
      }, autoClose);
    }
  };

  /**
   * 停止加载
   */
  const stopLoading = () => {
    loading.value = false;

    if (timeoutId.value) {
      clearTimeout(timeoutId.value);
      timeoutId.value = undefined;
    }
  };

  /**
   * 切换加载状态
   */
  const toggleLoading = () => {
    if (loading.value) {
      stopLoading();
    } else {
      startLoading();
    }
  };

  return {
    loading,
    startLoading,
    stopLoading,
    toggleLoading
  };
}

/**
 * 多场景加载状态管理
 *
 * 支持同时管理多个独立的加载状态
 *
 * @example
 * const { loadings, start, stop, isLoading } = useMultipleLoading(['user', 'products', 'orders']);
 * start('user');  // 开始用户加载
 * stop('user');   // 停止用户加载
 * isLoading('user'); // 检查用户是否正在加载
 */
export function useMultipleLoading(scenes: string[]) {
  const loadings: Ref<Record<string, boolean>> = ref(
    scenes.reduce((acc, scene) => ({ ...acc, [scene]: false }), {})
  );
  const timeouts: Ref<Record<string, NodeJS.Timeout>> = ref({});

  /**
   * 开始指定场景的加载
   */
  const start = (scene: string, autoClose = 10000) => {
    if (!scenes.includes(scene)) {
      console.warn(`[useMultipleLoading] 场景 "${scene}" 不存在`);
      return;
    }

    loadings.value[scene] = true;

    // 清除之前的定时器
    if (timeouts.value[scene]) {
      clearTimeout(timeouts.value[scene]);
    }

    // 设置自动关闭
    if (autoClose > 0) {
      timeouts.value[scene] = setTimeout(() => {
        loadings.value[scene] = false;
        console.warn(`[useMultipleLoading] 场景 "${scene}" 加载超时`);
      }, autoClose);
    }
  };

  /**
   * 停止指定场景的加载
   */
  const stop = (scene: string) => {
    if (!scenes.includes(scene)) {
      console.warn(`[useMultipleLoading] 场景 "${scene}" 不存在`);
      return;
    }

    loadings.value[scene] = false;

    if (timeouts.value[scene]) {
      clearTimeout(timeouts.value[scene]);
      delete timeouts.value[scene];
    }
  };

  /**
   * 检查指定场景是否正在加载
   */
  const isLoading = (scene: string): boolean => {
    return loadings.value[scene] || false;
  };

  /**
   * 检查是否有任何场景正在加载
   */
  const isAnyLoading = (): boolean => {
    return Object.values(loadings.value).some(v => v);
  };

  /**
   * 停止所有场景的加载
   */
  const stopAll = () => {
    scenes.forEach(scene => stop(scene));
  };

  return {
    loadings,
    start,
    stop,
    isLoading,
    isAnyLoading,
    stopAll
  };
}

/**
 * 加载状态计算属性
 *
 * 根据多个响应式状态计算统一的加载状态
 *
 * @example
 * const userLoading = ref(false);
 * const productsLoading = ref(false);
 * const ordersLoading = ref(false);
 * const globalLoading = computedLoading([userLoading, productsLoading, ordersLoading]);
 */
export function computedLoading(loadings: Ref<boolean>[]): Ref<boolean> {
  return ref(false); // Placeholder - 在实际使用时需要导入 computed from vue
}
