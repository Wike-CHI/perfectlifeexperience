/**
 * 性能监控工具
 * 用于监控页面和接口性能，及时发现性能问题
 */

type PerformanceCallback = (duration: number, name: string) => void;

interface PerformanceMark {
  name: string;
  startTime: number;
}

class PerformanceMonitor {
  private marks = new Map<string, PerformanceMark>();
  private listeners: PerformanceCallback[] = [];
  private threshold = 1000; // 超过 1s 视为警告

  /**
   * 开始计时
   */
  start(name: string): void {
    this.marks.set(name, {
      name,
      startTime: Date.now(),
    });
  }

  /**
   * 结束计时
   */
  end(name: string): number | undefined {
    const mark = this.marks.get(name);
    if (!mark) {
      console.warn(`[Performance] Mark "${name}" not found`);
      return undefined;
    }

    const duration = Date.now() - mark.startTime;
    this.marks.delete(name);

    console.log(`[Performance] ${name}: ${duration}ms`);

    // 触发监听器
    this.listeners.forEach((callback) => {
      callback(duration, name);
    });

    // 如果超过阈值，打印警告
    if (duration > this.threshold) {
      console.warn(`[Performance Warning] ${name} took ${duration}ms (threshold: ${this.threshold}ms)`);
    }

    return duration;
  }

  /**
   * 设置警告阈值
   */
  setThreshold(ms: number): void {
    this.threshold = ms;
  }

  /**
   * 添加性能监听器
   */
  addListener(callback: PerformanceCallback): void {
    this.listeners.push(callback);
  }

  /**
   * 移除性能监听器
   */
  removeListener(callback: PerformanceCallback): void {
    const index = this.listeners.indexOf(callback);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * 测量 async 函数执行时间
   */
  async measure<T>(name: string, fn: () => Promise<T>): Promise<T> {
    this.start(name);
    try {
      return await fn();
    } finally {
      this.end(name);
    }
  }

  /**
   * 测量同步函数执行时间
   */
  measureSync<T>(name: string, fn: () => T): T {
    this.start(name);
    try {
      return fn();
    } finally {
      this.end(name);
    }
  }

  /**
   * 获取页面加载时间
   */
  getPageLoadTime(): number {
    const loadTime = Date.now() - (Date.now());
    // 实际应该使用 uni.getPerformance()
    return loadTime;
  }
}

// 导出单例
export const performanceMonitor = new PerformanceMonitor();

// 便捷方法
export const performance = {
  start: (name: string) => performanceMonitor.start(name),
  end: (name: string) => performanceMonitor.end(name),
  measure: <T>(name: string, fn: () => Promise<T>) => performanceMonitor.measure(name, fn),
  measureSync: <T>(name: string, fn: () => T) => performanceMonitor.measureSync(name, fn),
};
