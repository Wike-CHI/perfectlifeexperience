/**
 * 并行请求工具
 *
 * 用于优化多个独立 API 请求的性能，通过并行执行减少总等待时间
 *
 * @example
 * // 并行请求多个 API（全部成功才返回）
 * const [banners, categories, products] = await parallelRequest([
 *   getBanners(),
 *   getCategories(),
 *   getProducts()
 * ], { timeout: 5000, logPerformance: true });
 *
 * @example
 * // 容错并行请求（部分成功也返回）
 * const results = await parallelRequestSettled([
 *   getBanners(),
 *   getCategories(),
 *   getProducts()
 * ]);
 */

interface ParallelRequestOptions {
  /** 请求超时时间（毫秒），默认 10000ms */
  timeout?: number;
  /** 降级数据，请求失败时返回 */
  fallback?: any;
  /** 是否记录性能日志，默认 false */
  logPerformance?: boolean;
  /** 请求标识（用于日志记录） */
  label?: string;
}

/**
 * 并行请求多个 Promise（全部成功才返回）
 *
 * @param requests - Promise 数组
 * @param options - 配置选项
 * @returns Promise<Array> - 所有请求的结果数组
 *
 * @throws 如果任何一个请求失败，抛出错误
 */
export async function parallelRequest<T extends any[]>(
  requests: T,
  options: ParallelRequestOptions = {}
): Promise<{ [K in keyof T]: Awaited<T[K]> }> {
  const {
    timeout = 10000,
    fallback,
    logPerformance = false,
    label = 'ParallelRequest'
  } = options;

  const startTime = Date.now();

  try {
    // 添加超时控制
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`请求超时: ${timeout}ms`)), timeout);
    });

    // 执行并行请求
    const results = await Promise.race([
      Promise.all(requests),
      timeoutPromise
    ]) as Awaited<T>;

    if (logPerformance) {
      const duration = Date.now() - startTime;
      console.log(`[${label}] 并行请求完成，耗时: ${duration}ms，请求数: ${requests.length}`);
    }

    return results;

  } catch (error) {
    console.error(`[${label}] 并行请求失败:`, error);

    // 如果提供了降级数据，返回降级数据
    if (fallback !== undefined) {
      console.warn(`[${label}] 使用降级数据`);
      return fallback;
    }

    throw error;
  }
}

/**
 * 容错并行请求（部分成功也返回）
 *
 * @param requests - Promise 数组
 * @param options - 配置选项
 * @returns Promise<Array> - 每个请求的结果（fulfilled 或 rejected）
 */
export async function parallelRequestSettled<T extends any[]>(
  requests: T,
  options: ParallelRequestOptions = {}
): Promise<Array<{
  status: 'fulfilled' | 'rejected';
  value?: any;
  reason?: any;
}>> {
  const {
    timeout = 10000,
    logPerformance = false,
    label = 'ParallelRequestSettled'
  } = options;

  const startTime = Date.now();

  try {
    // 添加超时控制
    const timeoutPromise = new Promise<Array<any>>((_, reject) => {
      setTimeout(() => reject(new Error(`请求超时: ${timeout}ms`)), timeout);
    });

    // 执行容错并行请求
    const results = await Promise.race([
      Promise.allSettled(requests),
      timeoutPromise
    ]);

    if (logPerformance) {
      const duration = Date.now() - startTime;
      const successCount = results.filter(r => r.status === 'fulfilled').length;
      console.log(
        `[${label}] 容错并行请求完成，耗时: ${duration}ms，` +
        `成功: ${successCount}/${requests.length}`
      );
    }

    return results;

  } catch (error) {
    console.error(`[${label}] 容错并行请求失败:`, error);
    throw error;
  }
}

/**
 * 批量并行请求（分批执行，避免同时发起过多请求）
 *
 * @param requests - Promise 数组
 * @param batchSize - 每批大小，默认 5
 * @param options - 配置选项
 * @returns Promise<Array> - 所有请求的结果数组
 */
export async function batchParallelRequest<T extends any[]>(
  requests: T,
  batchSize: number = 5,
  options: ParallelRequestOptions = {}
): Promise<Awaited<T>[]> {
  const {
    logPerformance = false,
    label = 'BatchParallelRequest'
  } = options;

  const startTime = Date.now();
  const results: any[] = [];

  // 分批执行
  for (let i = 0; i < requests.length; i += batchSize) {
    const batch = requests.slice(i, i + batchSize);
    const batchResults = await parallelRequest(batch, {
      ...options,
      label: `${label}-Batch${Math.floor(i / batchSize) + 1}`
    });
    results.push(...batchResults);
  }

  if (logPerformance) {
    const duration = Date.now() - startTime;
    console.log(
      `[${label}] 批量并行请求完成，耗时: ${duration}ms，` +
      `总请求数: ${requests.length}，批次数: ${Math.ceil(requests.length / batchSize)}`
    );
  }

  return results;
}

/**
 * 并行请求装饰器（用于性能监控）
 *
 * @param target - 目标对象
 * @param propertyKey - 属性名
 * @param descriptor - 属性描述符
 */
export function parallelRequestDecorator(
  options: ParallelRequestOptions = {}
) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const label = options.label || `${target.constructor.name}.${propertyKey}`;
      const startTime = Date.now();

      try {
        const result = await originalMethod.apply(this, args);

        if (options.logPerformance) {
          const duration = Date.now() - startTime;
          console.log(`[${label}] 方法执行完成，耗时: ${duration}ms`);
        }

        return result;
      } catch (error) {
        console.error(`[${label}] 方法执行失败:`, error);
        throw error;
      }
    };

    return descriptor;
  };
}
