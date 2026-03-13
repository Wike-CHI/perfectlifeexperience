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
 * 中国范围大致：纬度 3-53，经度 73-135
 * 瑞安区域：纬度约 27.7，经度约 120.6
 */
function isValidCoordinate(lat: number, lon: number): boolean {
  const isValid = (
    isFinite(lat) &&
    isFinite(lon) &&
    lat >= -90 &&
    lat <= 90 &&
    lon >= -180 &&
    lon <= 180
  )

  // 如果坐标明显不在中国范围内，发出警告
  if (isValid && (lat < 3 || lat > 53 || lon < 73 || lon > 135)) {
    console.warn(`⚠️ 坐标可能不在中国范围内:`, {
      latitude: lat,
      longitude: lon,
      建议范围: '纬度 3-53, 经度 73-135'
    })
  }

  return isValid
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

  // 调试日志
  console.log('📍 计算距离:', {
    用户位置: { lat: lat1, lon: lon1 },
    门店位置: { lat: lat2, lon: lon2 },
    坐标差: { lat: lat2 - lat1, lon: lon2 - lon1 }
  })

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

  // 如果距离异常大，输出警告
  if (distance > 100000) { // 超过100km
    console.warn('⚠️ 计算出的距离异常大:', {
      距离: `${(distance / 1000).toFixed(2)}km`,
      用户坐标: { lat: lat1, lon: lon1 },
      门店坐标: { lat: lat2, lon: lon2 }
    })
  }

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
 * 使用微信原生 API，获取更高精度的定位
 * gcj02 坐标系：国测局坐标系，微信小程序和腾讯地图使用此坐标系
 */
export function getUserLocation(): Promise<{
  latitude: number
  longitude: number
}> {
  return new Promise((resolve, reject) => {
    wx.getLocation({
      type: 'gcj02', // 国测局坐标系，微信小程序标准
      altitude: true, // 获取高精度
      isHighAccuracy: true, // 开启高精度定位
      highAccuracyExpireTime: 3000, // 高精度定位超时时间

      success: (res) => {
        console.log('定位成功:', {
          latitude: res.latitude,
          longitude: res.longitude,
          accuracy: res.accuracy,
          altitude: res.altitude
        })
        resolve({
          latitude: res.latitude,
          longitude: res.longitude
        })
      },
      fail: (err) => {
        console.error('获取位置失败:', err)
        uni.showToast({
          title: '定位失败，请检查定位权限',
          icon: 'none',
          duration: 2000
        })
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
 * 支持自动重试机制，最多重试3次
 */
export async function getDistanceToStore(retryCount = 0): Promise<number> {
  const MAX_RETRIES = 3
  const RETRY_DELAY = 1000 // 1秒基础延迟
  const now = Date.now()

  // 检查缓存是否有效
  if (cachedLocation && cacheTime && (now - cacheTime) < CACHE_DURATION) {
    console.log('♻️ 使用缓存的位置数据')
    return calculateDistance(
      cachedLocation.latitude,
      cachedLocation.longitude,
      STORE_LOCATION.latitude,
      STORE_LOCATION.longitude
    )
  }

  try {
    console.log(`🎯 开始获取用户位置...${retryCount > 0 ? `(重试 ${retryCount}/${MAX_RETRIES - 1})` : ''}`)
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

    console.log('✅ 距离计算完成:', formatDistance(distance))
    return distance
  } catch (error: any) {
    console.error(`❌ 获取距离失败 (尝试 ${retryCount + 1}/${MAX_RETRIES}):`, error)

    // 重试逻辑
    if (retryCount < MAX_RETRIES - 1) {
      const delay = RETRY_DELAY * (retryCount + 1) // 指数退避: 1s, 2s, 3s
      console.log(`⏳ ${delay}ms 后重试...`)
      await new Promise(resolve => setTimeout(resolve, delay))
      return getDistanceToStore(retryCount + 1)
    }

    // 最终失败处理
    if (error?.errMsg?.includes('authorize') || error?.errCode === 11) {
      console.error('🚫 用户拒绝位置权限')
      throw new Error('请授权位置权限以获取距离信息')
    }

    console.error('💥 所有重试均失败')
    throw new Error('无法获取位置信息，请检查定位设置')
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
