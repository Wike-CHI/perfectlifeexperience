/**
 * 管理端通用列表页面 Composable
 *
 * 封装管理端列表页面的通用逻辑：
 * - 分页加载
 * - 搜索功能
 * - 缓存管理
 * - 下拉刷新
 * - 上拉加载更多
 * - 权限检查
 */
import { ref, onMounted, computed } from 'vue'
import { onPullDownRefresh, onReachBottom } from '@dcloudio/uni-app'
import AdminAuthManager from '@/utils/admin-auth'
import AdminCacheManager from '@/utils/admin-cache'
import { CACHE_CONFIG } from '@/utils/cache-config'
import { callFunction } from '@/utils/cloudbase'

export interface ListQueryParams {
  page?: number
  limit?: number
  keyword?: string
  [key: string]: any
}

export interface ListResponse {
  list: any[]
  total: number
  totalPages: number
  [key: string]: any
}

export interface UseAdminListOptions {
  /** API action 名称 */
  action: string
  /** 缓存键前缀（对应 CACHE_CONFIG 中的键） */
  cachePrefix?: keyof typeof CACHE_CONFIG
  /** 每页数量 */
  pageSize?: number
  /** 额外查询参数 (支持 ComputedRef) */
  extraParams?: Record<string, any> | (() => Record<string, any>)
  /** 自定义数据转换 */
  transform?: (data: any) => any
  /** 加载完成回调 */
  onLoaded?: (list: any[]) => void
  /** 错误回调 */
  onError?: (error: any) => void
}

/**
 * 管理端列表页面 Composable
 */
export function useAdminList(options: UseAdminListOptions) {
  const {
    action,
    cachePrefix,
    pageSize = 20,
    extraParams = {},
    transform,
    onLoaded,
    onError
  } = options

  // 状态
  const list = ref<any[]>([])
  const loading = ref(false)
  const hasMore = ref(false)
  const currentPage = ref(1)
  const keyword = ref('')
  const refreshing = ref(false)

  // 缓存键
  const cacheKey = computed(() => {
    if (!cachePrefix) return ''
    return AdminCacheManager.getConfigKey(cachePrefix, {
      keyword: keyword.value
    })
  })

  // 加载数据
  const loadData = async (isRefresh: boolean = false) => {
    if (loading.value) return

    try {
      loading.value = true
      refreshing.value = isRefresh

      if (isRefresh) {
        currentPage.value = 1
        hasMore.value = true
      }

      // 尝试从缓存获取
      if (!isRefresh && currentPage.value === 1 && cacheKey.value) {
        const cached = AdminCacheManager.get(cacheKey.value) as { list?: any[], hasMore?: boolean } | null
        if (cached) {
          list.value = cached.list || []
          hasMore.value = cached.hasMore !== false
          return
        }
      }

      // 处理 extraParams，支持普通对象或 ComputedRef
      const resolvedExtraParams = typeof extraParams === 'function'
        ? extraParams()
        : (extraParams || {})

      const res = await callFunction('admin-api', {
        action,
        adminToken: AdminAuthManager.getToken(),
        data: {
          page: currentPage.value,
          limit: pageSize,
          keyword: keyword.value || undefined,
          ...resolvedExtraParams
        }
      })

      if (res.code === 0 && res.data) {
        let data = res.data

        // 自定义数据转换
        if (transform) {
          data = transform(data)
        }

        const newList = data.list || []

        if (isRefresh || currentPage.value === 1) {
          list.value = newList
        } else {
          list.value = [...list.value, ...newList]
        }

        hasMore.value = currentPage.value < (data.totalPages || 1)

        // 缓存第一页
        if (currentPage.value === 1 && cacheKey.value) {
          const cacheConfig = cachePrefix ? CACHE_CONFIG[cachePrefix] : null
          const expire = cacheConfig ? cacheConfig.expire * 60 * 1000 : 300000 // 转换为毫秒
          AdminCacheManager.set(cacheKey.value, {
            list: list.value,
            hasMore: hasMore.value
          }, expire)
        }

        onLoaded?.(list.value)
      } else {
        throw new Error(res.msg || '加载失败')
      }
    } catch (error: any) {
      console.error('加载数据失败:', error)
      onError?.(error)
      uni.showToast({
        title: error.message || '加载失败',
        icon: 'none'
      })
    } finally {
      loading.value = false
      refreshing.value = false
    }
  }

  // 加载更多
  const loadMore = () => {
    if (hasMore.value && !loading.value) {
      currentPage.value++
      loadData()
    }
  }

  // 刷新
  const refresh = () => {
    currentPage.value = 1
    hasMore.value = true
    list.value = []
    // 清除缓存
    if (cacheKey.value) {
      AdminCacheManager.remove(cacheKey.value)
    }
    loadData(true)
  }

  // 搜索
  const search = (k: string = '') => {
    keyword.value = k
    currentPage.value = 1
    hasMore.value = true
    list.value = []
    // 清除缓存
    if (cacheKey.value) {
      AdminCacheManager.remove(cacheKey.value)
    }
    loadData()
  }

  // 清除搜索
  const clearSearch = () => {
    search('')
  }

  // 初始化
  const init = () => {
    if (!AdminAuthManager.checkAuth()) return
    loadData()
  }

  // 生命周期钩子
  onMounted(init)

  onPullDownRefresh(async () => {
    await refresh()
    uni.stopPullDownRefresh()
  })

  onReachBottom(() => {
    loadMore()
  })

  return {
    // 状态
    list,
    loading,
    hasMore,
    keyword,
    refreshing,
    currentPage,
    pageSize,
    // 方法
    loadData,
    loadMore,
    refresh,
    search,
    clearSearch,
    init
  }
}

/**
 * 管理端详情页面 Composable
 */
export function useAdminDetail(options: {
  action: string
  idParam?: string
  transform?: (data: any) => any
  onLoaded?: (data: any) => void
  onError?: (error: any) => void
}) {
  const { action, idParam = 'id', transform, onLoaded, onError } = options

  const detail = ref<any>(null)
  const loading = ref(false)

  const loadDetail = async (id: string) => {
    try {
      loading.value = true

      const res = await callFunction('admin-api', {
        action,
        adminToken: AdminAuthManager.getToken(),
        data: { [idParam]: id }
      })

      if (res.code === 0 && res.data) {
        let data = res.data
        if (transform) {
          data = transform(data)
        }
        detail.value = data
        onLoaded?.(detail.value)
      } else {
        throw new Error(res.msg || '加载失败')
      }
    } catch (error: any) {
      console.error('加载详情失败:', error)
      onError?.(error)
      uni.showToast({
        title: error.message || '加载失败',
        icon: 'none'
      })
    } finally {
      loading.value = false
    }
  }

  return {
    detail,
    loading,
    loadDetail
  }
}

/**
 * 管理端操作 Composable
 * 封装通用的增删改操作
 */
export function useAdminAction(options: {
  action: string
  successMsg?: string
  onSuccess?: (data: any) => void
  onError?: (error: any) => void
}) {
  const { action, successMsg = '操作成功', onSuccess, onError } = options

  const loading = ref(false)

  const execute = async (data: any = {}) => {
    try {
      loading.value = true

      const res = await callFunction('admin-api', {
        action,
        adminToken: AdminAuthManager.getToken(),
        data
      })

      if (res.code === 0) {
        uni.showToast({
          title: successMsg,
          icon: 'success'
        })
        onSuccess?.(res.data)
        return res.data
      } else {
        throw new Error(res.msg || '操作失败')
      }
    } catch (error: any) {
      console.error('操作失败:', error)
      uni.showToast({
        title: error.message || '操作失败',
        icon: 'none'
      })
      onError?.(error)
      throw error
    } finally {
      loading.value = false
    }
  }

  return {
    loading,
    execute
  }
}
