/**
 * 距离计算工具
 * 用于计算用户与门店之间的距离
 */

// 门店位置配置
export const STORE_LOCATION = {
  latitude: 27.744734,  // 瑞安店纬度
  longitude: 120.660902, // 瑞安店经度
  name: '大友元气精酿啤酒屋',
  address: '浙江省温州市瑞安市瑞光大道1308号德信铂瑞湾二期30楼05-06'
}

/**
 * 验证坐标是否有效
 */
function isValidCoordinate(lat: number, lon: number): boolean {
  return (
    isFinite(lat) &&
    isFinite(lon) &&
    lat >= -90 &&
    lat <= 90 &&
    lon >= -180 &&
    lon <= 180
  )
}

/**
 * 计算两个经纬度坐标之间的距离（米）
 * 使用 Haversine 公式
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  // 输入验证
  if (!isValidCoordinate(lat1, lon1) || !isValidCoordinate(lat2, lon2)) {
    throw new Error('Invalid coordinates')
  }

  const R = 6371000 // 地球半径（米）
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
    Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  const distance = R * c

  return distance
}

/**
 * 将角度转换为弧度
 */
function toRad(degrees: number): number {
  return degrees * (Math.PI / 180)
}

/**
 * 格式化距离显示
 */
export function formatDistance(meters: number): string {
  // 边界检查
  if (!isFinite(meters) || meters < 0) {
    return '--'
  }
  if (meters < 1000) {
    return `${Math.round(meters)}m`
  }
  return `${(meters / 1000).toFixed(1)}km`
}

/**
 * 获取用户当前位置
 */
export function getUserLocation(): Promise<{
  latitude: number
  longitude: number
}> {
  return new Promise((resolve, reject) => {
    uni.getLocation({
      type: 'wgs84', // 返回可以用于 uni.openLocation 的坐标
      success: (res) => {
        resolve({
          latitude: res.latitude,
          longitude: res.longitude
        })
      },
      fail: (err) => {
        console.error('获取位置失败:', err)
        reject(err)
      }
    })
  })
}

// 位置缓存
let cachedLocation: { latitude: number; longitude: number } | null = null
let cacheTime: number | null = null
const CACHE_DURATION = 5 * 60 * 1000 // 5分钟缓存

/**
 * 计算用户到门店的距离（米）
 * 使用缓存机制，5分钟内不重复请求位置
 */
export async function getDistanceToStore(): Promise<number> {
  const now = Date.now()

  // 检查缓存是否有效
  if (cachedLocation && cacheTime && (now - cacheTime) < CACHE_DURATION) {
    return calculateDistance(
      cachedLocation.latitude,
      cachedLocation.longitude,
      STORE_LOCATION.latitude,
      STORE_LOCATION.longitude
    )
  }

  try {
    const userLocation = await getUserLocation()
    // 更新缓存
    cachedLocation = userLocation
    cacheTime = now

    const distance = calculateDistance(
      userLocation.latitude,
      userLocation.longitude,
      STORE_LOCATION.latitude,
      STORE_LOCATION.longitude
    )
    return distance
  } catch (error) {
    console.error('计算距离失败:', error)
    throw error
  }
}

/**
 * 清除位置缓存（用于手动刷新）
 */
export function clearLocationCache(): void {
  cachedLocation = null
  cacheTime = null
}

/**
 * 请求位置权限
 */
export function requestLocationPermission(): Promise<boolean> {
  return new Promise((resolve) => {
    uni.authorize({
      scope: 'scope.userLocation',
      success: () => {
        resolve(true)
      },
      fail: () => {
        // 用户拒绝授权，引导用户打开设置
        uni.showModal({
          title: '位置权限',
          content: '需要获取您的位置信息来计算距离，请在设置中开启位置权限',
          confirmText: '去设置',
          success: (res) => {
            if (res.confirm) {
              uni.openSetting({
                success: (settingRes) => {
                  if (settingRes.authSetting['scope.userLocation']) {
                    resolve(true)
                  } else {
                    resolve(false)
                  }
                },
                fail: () => {
                  resolve(false)
                }
              })
            } else {
              resolve(false)
            }
          }
        })
      }
    })
  })
}

/**
 * 距离等级分类
 */
export function getDistanceLevel(meters: number): {
  level: 'near' | 'medium' | 'far'
  text: string
  color: string
} {
  if (meters < 1000) {
    return {
      level: 'near',
      text: '很近',
      color: '#52C41A' // 绿色
    }
  } else if (meters < 5000) {
    return {
      level: 'medium',
      text: '适中',
      color: '#D4A574' // 橙色
    }
  } else {
    return {
      level: 'far',
      text: '较远',
      color: '#9B8B7F' // 灰色
    }
  }
}

/**
 * 检查是否在配送范围内
 */
export function isInDeliveryRange(meters: number, range: number = 10000): boolean {
  return meters <= range
}

/**
 * 计算配送费（根据距离）
 */
export function calculateDeliveryFee(meters: number): number {
  if (meters < 1000) {
    return 0 // 1公里内免配送费
  } else if (meters < 3000) {
    return 500 // 5元
  } else if (meters < 5000) {
    return 800 // 8元
  } else {
    return 1000 // 10元
  }
}
