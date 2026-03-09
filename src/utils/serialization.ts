/**
 * 序列化工具函数
 * 用于安全地处理可能包含循环引用或响应式对象的数据
 */

/**
 * 安全地深度克隆对象，移除循环引用和响应式属性
 * @param obj 要克隆的对象
 * @returns 克隆后的纯 JavaScript 对象
 */
export function safeClone<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj
  }

  // 处理基本类型
  if (typeof obj !== 'object') {
    return obj
  }

  try {
    // 使用 JSON 序列化/反序列化移除循环引用和响应式属性
    return JSON.parse(JSON.stringify(obj))
  } catch (error) {
    console.warn('对象包含循环引用，使用降级克隆方法', error)

    // 降级方案：手动克隆（忽略循环引用）
    const seen = new WeakSet()

    const deepClone = (value: any): any => {
      // 基本类型直接返回
      if (value === null || typeof value !== 'object') {
        return value
      }

      // 检测循环引用
      if (seen.has(value)) {
        return '[Circular Reference]'
      }

      seen.add(value)

      // 处理数组
      if (Array.isArray(value)) {
        return value.map(item => deepClone(item))
      }

      // 处理普通对象
      const cloned: any = {}
      for (const key in value) {
        if (value.hasOwnProperty(key)) {
          // 跳过 Vue 内部属性
          if (!key.startsWith('__v_') && key !== '_computed') {
            try {
              cloned[key] = deepClone(value[key])
            } catch (e) {
              // 忽略无法克隆的属性
              cloned[key] = undefined
            }
          }
        }
      }

      return cloned
    }

    return deepClone(obj) as T
  }
}

/**
 * 安全地序列化对象为 JSON 字符串
 * @param obj 要序列化的对象
 * @returns JSON 字符串，如果失败则返回错误信息
 */
export function safeStringify(obj: any): string {
  try {
    return JSON.stringify(obj)
  } catch (error) {
    return '[Object contains circular references or non-serializable data]'
  }
}

/**
 * 检查对象是否包含循环引用
 * @param obj 要检查的对象
 * @returns 是否包含循环引用
 */
export function hasCircularReference(obj: any): boolean {
  const seen = new WeakSet()

  const check = (value: any): boolean => {
    if (value === null || typeof value !== 'object') {
      return false
    }

    if (seen.has(value)) {
      return true
    }

    seen.add(value)

    if (Array.isArray(value)) {
      return value.some(item => check(item))
    }

    for (const key in value) {
      if (value.hasOwnProperty(key)) {
        if (check(value[key])) {
          return true
        }
      }
    }

    return false
  }

  return check(obj)
}

/**
 * 安全地打印对象到控制台
 * @param label 标签
 * @param obj 要打印的对象
 */
export function safeLog(label: string, obj: any): void {
  try {
    console.log(label, safeStringify(obj))
  } catch (error) {
    console.log(label, '[无法序列化的对象]')
  }
}

export default {
  safeClone,
  safeStringify,
  hasCircularReference,
  safeLog
}
