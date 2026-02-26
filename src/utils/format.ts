/**
 * 格式化工具函数
 *
 * 提供统一的格式化方法
 */

/**
 * 格式化价格（分 → 元）
 * @param price 价格（分）
 * @param precision 小数位数，默认2位
 * @returns 格式化后的价格字符串
 * @example
 * formatPrice(100) // "1.00"
 * formatPrice(1500) // "15.00"
 * formatPrice(1234, 1) // "123.4"
 */
export function formatPrice(price: number, precision: number = 2): string {
  return (price / 100).toFixed(precision)
}

/**
 * 格式化时间
 * @param time 时间对象或字符串
 * @param format 格式模板，默认 "YYYY-MM-DD HH:mm"
 * @returns 格式化后的时间字符串
 * @example
 * formatTime(new Date()) // "2026-02-26 15:30"
 * formatTime("2026-02-26T15:30:00Z") // "2026-02-26 15:30"
 */
export function formatTime(time: Date | string | undefined, format: string = 'YYYY-MM-DD HH:mm'): string {
  if (!time) return ''

  const date = new Date(time)

  // 简单格式化（不依赖第三方库）
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')

  return format
    .replace('YYYY', String(year))
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds)
}

/**
 * 格式化相对时间
 * @param time 时间对象或字符串
 * @returns 相对时间字符串（如"刚刚"、"5分钟前"）
 * @example
 * formatRelativeTime(new Date()) // "刚刚"
 * formatRelativeTime(new Date(Date.now() - 3600000)) // "1小时前"
 */
export function formatRelativeTime(time: Date | string | undefined): string {
  if (!time) return ''

  const date = new Date(time)
  const now = new Date()
  const diff = now.getTime() - date.getTime()

  const minute = 60 * 1000
  const hour = 60 * minute
  const day = 24 * hour

  if (diff < minute) {
    return '刚刚'
  } else if (diff < hour) {
    return `${Math.floor(diff / minute)}分钟前`
  } else if (diff < day) {
    return `${Math.floor(diff / hour)}小时前`
  } else if (diff < 7 * day) {
    return `${Math.floor(diff / day)}天前`
  } else {
    return formatTime(time, 'YYYY-MM-DD')
  }
}

/**
 * 格式化百分比
 * @param value 数值（0-1）
 * @param precision 小数位数，默认2位
 * @returns 格式化后的百分比字符串
 * @example
 * formatPercent(0.123) // "12.30%"
 * formatPercent(0.5, 0) // "50%"
 */
export function formatPercent(value: number, precision: number = 2): string {
  return `${(value * 100).toFixed(precision)}%`
}

/**
 * 格式化数字（添加千分位分隔符）
 * @param num 数字
 * @returns 格式化后的数字字符串
 * @example
 * formatNumber(1000000) // "1,000,000"
 * formatNumber(1234.56) // "1,234.56"
 */
export function formatNumber(num: number): string {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

/**
 * 格式化文件大小
 * @param bytes 字节数
 * @returns 格式化后的文件大小字符串
 * @example
 * formatFileSize(1024) // "1.00 KB"
 * formatFileSize(1048576) // "1.00 MB"
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'

  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`
}
