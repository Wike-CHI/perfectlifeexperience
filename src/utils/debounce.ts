/**
 * 防抖函数
 *
 * 在指定延迟时间内只执行最后一次调用
 * 用于优化搜索输入，减少不必要的请求
 *
 * @param fn 要防抖的函数
 * @param delay 延迟时间（毫秒）
 * @returns 防抖后的函数
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timer: number | null = null;

  return function(this: any, ...args: Parameters<T>) {
    // 清除之前的定时器
    if (timer !== null) {
      clearTimeout(timer);
    }

    // 设置新的定时器
    timer = setTimeout(() => {
      fn.apply(this, args);
      timer = null;
    }, delay) as unknown as number;
  };
}

/**
 * 节流函数 - 固定时间间隔执行
 * @param fn 要执行的函数
 * @param delay 间隔时间（毫秒），默认 300ms
 * @returns 包装后的函数
 */
export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  delay: number = 300
): (...args: Parameters<T>) => void {
  let lastTime: number = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;

  return function (this: any, ...args: Parameters<T>) {
    const now = Date.now();

    // 如果距离上次执行时间超过 delay，立即执行
    if (now - lastTime >= delay) {
      lastTime = now;
      fn.apply(this, args);
    } else if (!timer) {
      // 否则设置定时器，在剩余时间后执行
      timer = setTimeout(() => {
        lastTime = Date.now();
        timer = null;
        fn.apply(this, args);
      }, delay - (now - lastTime));
    }
  };
}

/**
 * 立即执行的防抖函数 - 立即执行一次，后续触发才防抖
 * @param fn 要执行的函数
 * @param delay 延迟时间（毫秒），默认 300ms
 * @returns 包装后的函数
 */
export function debounceImmediate<T extends (...args: any[]) => any>(
  fn: T,
  delay: number = 300
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: Parameters<T> | null = null;

  return function (this: any, ...args: Parameters<T>) {
    lastArgs = args;

    if (!timer) {
      // 立即执行
      fn.apply(this, args);
      timer = setTimeout(() => {
        timer = null;
        // 防抖部分：如果有新的参数，在延迟后执行
        if (lastArgs) {
          fn.apply(this, lastArgs);
          lastArgs = null;
        }
      }, delay);
    }
  };
}

/**
 * 动画帧节流 - 使用 requestAnimationFrame
 * @param fn 要执行的函数
 * @returns 包装后的函数
 */
export function throttleRAF<T extends (...args: any[]) => any>(
  fn: T
): (...args: Parameters<T>) => void {
  let pending: boolean = false;
  let lastArgs: Parameters<T> | null = null;

  return function (this: any, ...args: Parameters<T>) {
    lastArgs = args;

    if (!pending) {
      pending = true;
      requestAnimationFrame(() => {
        pending = false;
        if (lastArgs) {
          fn.apply(this, lastArgs);
          lastArgs = null;
        }
      });
    }
  };
}
