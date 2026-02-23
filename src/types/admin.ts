/**
 * 管理员相关类型定义
 */

/**
 * 管理员信息
 */
export interface AdminInfo {
  id: string
  username: string
  role: 'super_admin' | 'operator' | 'finance'
  permissions: string[]
  status: 'active' | 'disabled'
  lastLoginTime?: Date
  createTime: Date
}

/**
 * 管理员角色
 */
export type AdminRole = 'super_admin' | 'operator' | 'finance'

/**
 * 管理员状态
 */
export type AdminStatus = 'active' | 'disabled'

/**
 * 登录请求
 */
export interface LoginRequest {
  username: string
  password: string
}

/**
 * 登录响应
 */
export interface LoginResponse {
  adminInfo: AdminInfo
  token?: string
}

/**
 * 权限列表
 */
export const PERMISSIONS = {
  // 仪表盘
  DASHBOARD_VIEW: 'dashboard.view',

  // 订单管理
  ORDER_VIEW: 'order.view',
  ORDER_UPDATE: 'order.update',
  ORDER_DELETE: 'order.delete',

  // 商品管理
  PRODUCT_VIEW: 'product.view',
  PRODUCT_CREATE: 'product.create',
  PRODUCT_UPDATE: 'product.update',
  PRODUCT_DELETE: 'product.delete',

  // 数据统计
  STATISTICS_VIEW: 'statistics.view',

  // 推广管理
  PROMOTION_VIEW: 'promotion.view',
  PROMOTION_MANAGE: 'promotion.manage',

  // 公告管理
  ANNOUNCEMENT_VIEW: 'announcement.view',
  ANNOUNCEMENT_CREATE: 'announcement.create',
  ANNOUNCEMENT_UPDATE: 'announcement.update',
  ANNOUNCEMENT_DELETE: 'announcement.delete',

  // 用户管理
  USER_VIEW: 'user.view',
  USER_MANAGE: 'user.manage',

  // 财务管理
  FINANCE_VIEW: 'finance.view',
  FINANCE_APPROVE: 'finance.approve',

  // 库存管理
  INVENTORY_VIEW: 'inventory.view'
} as const

/**
 * 权限类型
 */
export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS]

/**
 * 角色默认权限
 */
export const ROLE_PERMISSIONS: Record<AdminRole, Permission[]> = {
  super_admin: Object.values(PERMISSIONS),
  operator: [
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.ORDER_VIEW,
    PERMISSIONS.ORDER_UPDATE,
    PERMISSIONS.PRODUCT_VIEW,
    PERMISSIONS.PRODUCT_CREATE,
    PERMISSIONS.PRODUCT_UPDATE,
    PERMISSIONS.STATISTICS_VIEW,
    PERMISSIONS.PROMOTION_VIEW,
    PERMISSIONS.ANNOUNCEMENT_VIEW,
    PERMISSIONS.USER_VIEW,
    PERMISSIONS.INVENTORY_VIEW
  ],
  finance: [
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.ORDER_VIEW,
    PERMISSIONS.STATISTICS_VIEW,
    PERMISSIONS.FINANCE_VIEW,
    PERMISSIONS.FINANCE_APPROVE
  ]
}
