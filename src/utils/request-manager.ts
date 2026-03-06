/**
 * 请求管理工具
 * 用于请求去重、缓存和性能优化
 */

interface CacheItem<T> {
  data: T;
  time: number;
}

interface PendingRequest {
  promise: Promise<any>;
  abort?: () => void;
}

/**
 * 请求管理器
 */
class RequestManagerClass {
  private pendingRequests = new Map<string, PendingRequest>();
  private cache = new Map<string, CacheItem<any>>();
  private defaultCacheTime = 5 * 60 * 1000; // 默认缓存 5 分钟

  /**
   * 生成请求唯一 key
   */
  private getRequestKey(url: string, method: string, data?: any): string {
    return `${method}_${url}_${JSON.stringify(data || {})}`;
  }

  /**
   * 检查缓存是否有效
   */
  private isCacheValid(key: string, cacheTime: number): boolean {
    const cached = this.cache.get(key);
    if (!cached) return false;
    return Date.now() - cached.time < cacheTime;
  }

  /**
   * 发起请求（带去重和缓存）
   */
  async request<T>(config: {
    url: string;
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    data?: any;
    cache?: boolean;
    cacheTime?: number;
    abortKey?: string;
  }): Promise<T> {
    const {
      url,
      method = 'GET',
      data,
      cache = false,
      cacheTime = this.defaultCacheTime,
      abortKey,
    } = config;

    const key = this.getRequestKey(url, method, data);

    // 检查缓存
    if (cache && this.isCacheValid(key, cacheTime)) {
      console.log(`[RequestManager] Cache hit: ${key}`);
      return Promise.resolve(this.cache.get(key)!.data);
    }

    // 检查是否有相同请求正在进行
    if (this.pendingRequests.has(key)) {
      console.log(`[RequestManager] Request deduplicated: ${key}`);
      return this.pendingRequests.get(key)!.promise;
    }

    // 发起请求
    const promise = uni
      .request({
        url,
        method,
        data,
      })
      .then(([error, res]) => {
        if (error) {
          throw error;
        }

        // 缓存结果
        if (cache) {
          this.cache.set(key, {
            data: res.data,
            time: Date.now(),
          });
        }

        return res.data as T;
      })
      .finally(() => {
        this.pendingRequests.delete(key);
      });

    this.pendingRequests.set(key, { promise });

    return promise;
  }

  /**
   * 带 abort 的请求
   */
  async requestWithAbort<T>(
    abortKey: string,
    config: {
      url: string;
      method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
      data?: any;
      cache?: boolean;
      cacheTime?: number;
    }
  ): Promise<T> {
    const { url, method = 'GET', data, cache = false, cacheTime } = config;

    // 如果有相同 abortKey 的请求正在进行，取消它
    const existingKey = `abort_${abortKey}`;
    if (this.pendingRequests.has(existingKey)) {
      const existing = this.pendingRequests.get(existingKey);
      existing?.abort?.();
    }

    const promise = this.request<T>({
      url,
      method,
      data,
      cache,
      cacheTime,
    });

    this.pendingRequests.set(existingKey, { promise });

    return promise;
  }

  /**
   * 清除指定缓存
   */
  clearCache(key?: string): void {
    if (key) {
      this.cache.delete(key);
    } else {
      this.cache.clear();
    }
  }

  /**
   * 清除所有pending请求
   */
  clearPending(): void {
    this.pendingRequests.forEach((request) => {
      request.abort?.();
    });
    this.pendingRequests.clear();
  }
}

// 导出单例
export const requestManager = new RequestManagerClass();

// 便捷方法
export const request = <T>(config: Parameters<typeof requestManager.request>[0]): Promise<T> =>
  requestManager.request(config);
