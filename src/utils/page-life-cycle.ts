/**
 * 页面生命周期工具
 * 用于管理页面中的定时器、事件监听等资源，防止内存泄漏
 */

type CleanupCallback = () => void;
type Observer = {
  type: 'timer' | 'event' | 'network' | 'custom';
  name?: string;
  callback?: CleanupCallback;
};

/**
 * 页面资源管理器
 * 在 onUnload 中调用 cleanup 方法清理所有资源
 */
export class PageResourceManager {
  private observers: Observer[] = [];
  private timers: ReturnType<typeof setTimeout>[] = [];
  private intervals: ReturnType<typeof setInterval>[] = [];

  /**
   * 清理所有资源
   * 应在 onUnload 或 onBeforeUnmount 中调用
   */
  cleanup(): void {
    // 清理定时器
    this.timers.forEach((timer) => {
      if (timer) {
        clearTimeout(timer);
      }
    });
    this.timers = [];

    this.intervals.forEach((interval) => {
      if (interval) {
        clearInterval(interval);
      }
    });
    this.intervals = [];

    // 清理事件监听
    this.observers.forEach((observer) => {
      if (observer.type === 'event' && observer.name) {
        uni.$off(observer.name);
      } else if (observer.type === 'network') {
        uni.offNetworkStatusChange(observer.callback as any);
      } else if (observer.type === 'custom' && observer.callback) {
        observer.callback();
      }
    });
    this.observers = [];
  }

  /**
   * 暂停所有定时器
   * 在 onHide 中调用
   */
  pause(): void {
    // 定时器不需要暂停，它们会自动停止
  }

  /**
   * 恢复定时器
   * 在 onShow 中调用
   */
  resume(): void {
    // 定时器恢复由具体业务逻辑处理
  }

  /**
   * 注册 setTimeout
   */
  setTimeout(callback: () => void, delay: number): ReturnType<typeof setTimeout> {
    const timer = setTimeout(callback, delay);
    this.timers.push(timer);
    return timer;
  }

  /**
   * 注册 setInterval
   */
  setInterval(callback: () => void, delay: number): ReturnType<typeof setInterval> {
    const interval = setInterval(callback, delay);
    this.intervals.push(interval);
    return interval;
  }

  /**
   * 注册 uni.$on 事件监听
   */
  addEventListener(eventName: string, callback: (...args: any[]) => void): void {
    uni.$on(eventName, callback);
    this.observers.push({
      type: 'event',
      name: eventName,
    });
  }

  /**
   * 注册网络状态监听
   */
  addNetworkListener(callback: (res: UniApp.NetworkStatus) => void): void {
    uni.onNetworkStatusChange(callback);
    this.observers.push({
      type: 'network',
      callback: callback as any,
    });
  }

  /**
   * 注册自定义清理回调
   */
  addCleanupCallback(callback: CleanupCallback): void {
    this.observers.push({
      type: 'custom',
      callback,
    });
  }
}

/**
 * 创建页面资源管理器实例
 */
export function createResourceManager(): PageResourceManager {
  return new PageResourceManager();
}
