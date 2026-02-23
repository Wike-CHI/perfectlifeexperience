/**
 * 权限映射配置
 * 将 action 映射到所需的权限
 */

const PERMISSIONS = {
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
}

/**
 * Action 到权限的映射表
 * 需要权限验证的 action 在这里配置
 */
const ACTION_PERMISSIONS = {
  // 仪表盘
  'getDashboardData': PERMISSIONS.DASHBOARD_VIEW,

  // 订单管理
  'getOrders': PERMISSIONS.ORDER_VIEW,
  'getOrderDetail': PERMISSIONS.ORDER_VIEW,
  'updateOrderStatus': PERMISSIONS.ORDER_UPDATE,
  'deleteOrder': PERMISSIONS.ORDER_DELETE,

  // 商品管理
  'getProducts': PERMISSIONS.PRODUCT_VIEW,
  'getProductDetail': PERMISSIONS.PRODUCT_VIEW,
  'createProduct': PERMISSIONS.PRODUCT_CREATE,
  'updateProduct': PERMISSIONS.PRODUCT_UPDATE,
  'deleteProduct': PERMISSIONS.PRODUCT_DELETE,

  // 推广管理
  'getPromotionStats': PERMISSIONS.PROMOTION_VIEW,
  'updatePromotion': PERMISSIONS.PROMOTION_MANAGE,

  // 公告管理
  'getAnnouncements': PERMISSIONS.ANNOUNCEMENT_VIEW,
  'getAnnouncementDetail': PERMISSIONS.ANNOUNCEMENT_VIEW,
  'createAnnouncement': PERMISSIONS.ANNOUNCEMENT_CREATE,
  'updateAnnouncement': PERMISSIONS.ANNOUNCEMENT_UPDATE,
  'deleteAnnouncement': PERMISSIONS.ANNOUNCEMENT_DELETE,

  // 用户管理
  'getUsers': PERMISSIONS.USER_VIEW,
  'getUserDetail': PERMISSIONS.USER_VIEW,
  'updateUserStatus': PERMISSIONS.USER_MANAGE,

  // 财务管理
  'getWithdrawList': PERMISSIONS.FINANCE_VIEW,
  'approveWithdraw': PERMISSIONS.FINANCE_APPROVE,
  'getFinanceReport': PERMISSIONS.FINANCE_VIEW,

  // 库存管理
  'getLowStockProducts': PERMISSIONS.INVENTORY_VIEW
}

/**
 * 不需要权限验证的 action（公开操作）
 * 如登录、检查状态等
 */
const PUBLIC_ACTIONS = [
  'adminLogin',
  'checkAuth',
  'checkAdminStatus'
]

/**
 * 获取 action 所需的权限
 * @param {string} action - action 名称
 * @returns {string|null} 权限标识或 null（无需权限）
 */
function getRequiredPermission(action) {
  // 检查是否为公开 action
  if (PUBLIC_ACTIONS.includes(action)) {
    return null
  }

  // 返回所需权限
  return ACTION_PERMISSIONS[action] || null
}

module.exports = {
  PERMISSIONS,
  ACTION_PERMISSIONS,
  PUBLIC_ACTIONS,
  getRequiredPermission
}
