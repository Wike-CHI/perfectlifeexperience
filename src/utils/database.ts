/**
 * CloudBase 数据库直接查询工具
 *
 * 对于简单查询，直接使用 wx.cloud.database() 比云函数更快
 * 因为可以减少一次云函数调用的开销
 *
 * 性能对比：
 * - 云函数调用: ~200-500ms (包含冷启动)
 * - 直接数据库查询: ~50-100ms
 * - 性能提升: 2-5倍
 *
 * 参考: miniprogram-development skill
 */

import type { DBDate } from '@/types/database'

/**
 * 获取数据库实例
 */
function getDB() {
  return wx.cloud.database()
}

/**
 * 获取数据库指令操作符
 */
function getCommand() {
  return wx.cloud.database().command
}

// ============================================================================
// 通用查询方法
// ============================================================================

/**
 * 分页查询参数
 */
export interface PaginationParams {
  page?: number
  pageSize?: number
  orderBy?: string
  order?: 'asc' | 'desc'
}

/**
 * 通用分页查询
 */
export async function queryWithPagination<T>(
  collectionName: string,
  where: Record<string, any> = {},
  pagination: PaginationParams = {}
): Promise<{
  data: T[]
  hasMore: boolean
  total: number
}> {
  const {
    page = 1,
    pageSize = 20,
    orderBy = 'createTime',
    order = 'desc'
  } = pagination

  const db = getDB()
  const _ = getCommand()

  try {
    // 查询总数
    const countResult = await db.collection(collectionName)
      .where(where)
      .count()

    const total = countResult.total

    // 查询数据
    const result = await db.collection(collectionName)
      .where(where)
      .orderBy(orderBy, order)
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .get()

    return {
      data: result.data as T[],
      hasMore: page * pageSize < total,
      total
    }
  } catch (error) {
    console.error(`查询集合 ${collectionName} 失败:`, error)
    throw error
  }
}

// ============================================================================
// 奖励记录查询
// ============================================================================

/**
 * 查询用户的奖励记录
 */
export async function queryRewardRecords(params: {
  status?: 'pending' | 'settled' | 'cancelled' | 'deducted'
  rewardType?: 'basic_commission' | 'repurchase_reward' | 'team_management' | 'nurture_allowance'
  page?: number
  pageSize?: number
}) {
  const db = getDB()
  const _ = getCommand()

  const where: Record<string, any> = {
    _openid: '{openid}'  // CloudBase 会自动替换为用户 openid
  }

  if (params.status) {
    where.status = params.status
  }

  if (params.rewardType) {
    where.rewardType = params.rewardType
  }

  return queryWithPagination('reward_records', where, {
    page: params.page,
    pageSize: params.pageSize,
    orderBy: 'createTime',
    order: 'desc'
  })
}

// ============================================================================
// 订单查询
// ============================================================================

/**
 * 查询用户的订单
 */
export async function queryOrders(params: {
  status?: 'pending' | 'paid' | 'shipped' | 'completed' | 'refunding' | 'refunded' | 'cancelled'
  page?: number
  pageSize?: number
}) {
  const db = getDB()
  const _ = getCommand()

  const where: Record<string, any> = {
    _openid: '{openid}'
  }

  if (params.status) {
    where.status = params.status
  }

  return queryWithPagination('orders', where, {
    page: params.page,
    pageSize: params.pageSize,
    orderBy: 'createTime',
    order: 'desc'
  })
}

// ============================================================================
// 钱包交易记录查询
// ============================================================================

/**
 * 查询用户的钱包交易记录
 */
export async function queryWalletTransactions(params: {
  type?: 'recharge' | 'consumption' | 'refund' | 'commission' | 'withdraw' | 'withdraw_refund'
  page?: number
  pageSize?: number
}) {
  const db = getDB()
  const _ = getCommand()

  const where: Record<string, any> = {
    _openid: '{openid}'
  }

  if (params.type) {
    where.type = params.type
  }

  return queryWithPagination('wallet_transactions', where, {
    page: params.page,
    pageSize: params.pageSize,
    orderBy: 'createTime',
    order: 'desc'
  })
}

// ============================================================================
// 推广团队成员查询
// ============================================================================

/**
 * 查询推广团队成员
 *
 * 注意：这个查询比较复杂，建议仍使用云函数
 * 因为需要关联查询和复杂业务逻辑
 */
export async function queryTeamMembers(params: {
  level?: number  // 0=全部, 1=一级, 2=二级, 3=三级, 4=四级
  page?: number
  pageSize?: number
}) {
  // 注意：这个查询比较复杂，建议使用云函数
  // 这里仅作为示例

  // TODO: 需要先获取用户的 promotionPath
  // 然后根据 level 构建查询条件

  throw new Error('团队查询建议使用云函数，因为需要复杂业务逻辑')
}

// ============================================================================
// 产品查询
// ============================================================================

/**
 * 查询产品列表
 */
export async function queryProducts(params: {
  category?: string
  isHot?: boolean
  isNew?: boolean
  keyword?: string
  page?: number
  pageSize?: number
}) {
  const db = getDB()
  const _ = getCommand()

  const where: Record<string, any> = {
    status: 'on_sale'
  }

  if (params.category) {
    where.category = params.category
  }

  if (params.isHot !== undefined) {
    where.isHot = params.isHot
  }

  if (params.isNew !== undefined) {
    where.isNew = params.isNew
  }

  if (params.keyword) {
    // 使用正则表达式进行模糊搜索
    where.name = db.RegExp({
      regexp: params.keyword,
      options: 'i'  // 不区分大小写
    })
  }

  return queryWithPagination('products', where, {
    page: params.page,
    pageSize: params.pageSize,
    orderBy: 'createTime',
    order: 'desc'
  })
}

/**
 * 获取产品详情
 */
export async function getProductDetail(productId: string) {
  const db = getDB()

  try {
    const result = await db.collection('products')
      .doc(productId)
      .get()

    return result.data as any
  } catch (error) {
    console.error('获取产品详情失败:', error)
    throw error
  }
}

// ============================================================================
// 用户信息查询
// ============================================================================

/**
 * 获取当前用户信息
 */
export async function getCurrentUserInfo() {
  const db = getDB()

  try {
    const result = await db.collection('users')
      .where({
        _openid: '{openid}'
      })
      .get()

    return result.data[0] as any
  } catch (error) {
    console.error('获取用户信息失败:', error)
    throw error
  }
}

// ============================================================================
// 优惠券查询
// ============================================================================

/**
 * 查询用户的优惠券
 */
export async function queryUserCoupons(params: {
  status?: 'unused' | 'used' | 'expired'
  page?: number
  pageSize?: number
}) {
  const db = getDB()
  const _ = getCommand()
  const now = new Date()

  const where: Record<string, any> = {
    _openid: '{openid}'
  }

  if (params.status) {
    if (params.status === 'expired') {
      // 已过期：结束时间小于当前时间
      where.endTime = _.lt(now)
    } else {
      where.status = params.status
      // 未使用的优惠券还需要过滤已过期的
      if (params.status === 'unused') {
        where.endTime = _.gte(now)
      }
    }
  }

  return queryWithPagination('user_coupons', where, {
    page: params.page,
    pageSize: params.pageSize,
    orderBy: 'createTime',
    order: 'desc'
  })
}
