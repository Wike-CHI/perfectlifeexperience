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

  // 分类管理
  CATEGORY_VIEW: 'category.view',
  CATEGORY_CREATE: 'category.create',
  CATEGORY_UPDATE: 'category.update',
  CATEGORY_DELETE: 'category.delete',

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
  INVENTORY_VIEW: 'inventory.view',
  INVENTORY_ADJUST: 'inventory.adjust',
  INVENTORY_CHECK: 'inventory.check',

  // 活动管理
  ACTIVITY_VIEW: 'activity.view',
  ACTIVITY_CREATE: 'activity.create',
  ACTIVITY_UPDATE: 'activity.update',
  ACTIVITY_DELETE: 'activity.delete',

  // Banner管理
  BANNER_VIEW: 'banner.view',
  BANNER_CREATE: 'banner.create',
  BANNER_UPDATE: 'banner.update',
  BANNER_DELETE: 'banner.delete',

  // 优惠券管理
  COUPON_VIEW: 'coupon.view',
  COUPON_CREATE: 'coupon.create',
  COUPON_UPDATE: 'coupon.update',
  COUPON_DELETE: 'coupon.delete',

  // 退款管理
  REFUND_VIEW: 'refund.view',
  REFUND_APPROVE: 'refund.approve',

  // 地址管理
  ADDRESS_VIEW: 'address.view',
  ADDRESS_DELETE: 'address.delete',

  // 门店管理
  STORE_VIEW: 'store.view',
  STORE_CREATE: 'store.create',
  STORE_UPDATE: 'store.update',
  STORE_DELETE: 'store.delete',

  // 钱包管理
  WALLET_VIEW: 'wallet.view',

  // 佣金钱包
  COMMISSION_WALLET_VIEW: 'commission_wallet.view',

  // 系统配置
  SYSTEM_CONFIG_VIEW: 'system_config.view',
  SYSTEM_CONFIG_UPDATE: 'system_config.update',

  // ========== ERP 权限 ==========
  // 供应商管理
  SUPPLIER_VIEW: 'supplier.view',
  SUPPLIER_CREATE: 'supplier.create',
  SUPPLIER_UPDATE: 'supplier.update',
  SUPPLIER_DELETE: 'supplier.delete',

  // 采购管理
  PURCHASE_VIEW: 'purchase.view',
  PURCHASE_CREATE: 'purchase.create',
  PURCHASE_UPDATE: 'purchase.update',
  PURCHASE_RECEIVE: 'purchase.receive'
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
  'searchOrderByExpress': PERMISSIONS.ORDER_VIEW,
  'updateOrderExpress': PERMISSIONS.ORDER_UPDATE,
  // deleteOrder 未实现，已移除权限映射

  // 商品管理
  'getProducts': PERMISSIONS.PRODUCT_VIEW,
  'getProductDetail': PERMISSIONS.PRODUCT_VIEW,
  'createProduct': PERMISSIONS.PRODUCT_CREATE,
  'updateProduct': PERMISSIONS.PRODUCT_UPDATE,
  'deleteProduct': PERMISSIONS.PRODUCT_DELETE,
  'adjustProductStock': PERMISSIONS.PRODUCT_UPDATE,

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
  'updateUserAgentLevel': PERMISSIONS.USER_MANAGE,

  // 财务管理
  'getWithdrawList': PERMISSIONS.FINANCE_VIEW,
  'approveWithdraw': PERMISSIONS.FINANCE_APPROVE,
  'getFinanceReport': PERMISSIONS.FINANCE_VIEW,

  // 库存管理
  'getLowStockProducts': PERMISSIONS.INVENTORY_VIEW,

  // 活动管理
  'getPromotions': PERMISSIONS.ACTIVITY_VIEW,
  'getPromotionDetail': PERMISSIONS.ACTIVITY_VIEW,
  'createPromotion': PERMISSIONS.ACTIVITY_CREATE,
  'updatePromotion': PERMISSIONS.ACTIVITY_UPDATE,
  'deletePromotion': PERMISSIONS.ACTIVITY_DELETE,
  'getPromotionProducts': PERMISSIONS.ACTIVITY_VIEW,
  'addPromotionProducts': PERMISSIONS.ACTIVITY_UPDATE,
  'removePromotionProduct': PERMISSIONS.ACTIVITY_UPDATE,
  'getPromotionActivityStats': PERMISSIONS.ACTIVITY_VIEW,

  // Banner管理
  'getBanners': PERMISSIONS.BANNER_VIEW,
  'getBannerDetail': PERMISSIONS.BANNER_VIEW,
  'createBanner': PERMISSIONS.BANNER_CREATE,
  'updateBanner': PERMISSIONS.BANNER_UPDATE,
  'deleteBanner': PERMISSIONS.BANNER_DELETE,

  // 优惠券管理
  'getCoupons': PERMISSIONS.COUPON_VIEW,
  'getCouponDetail': PERMISSIONS.COUPON_VIEW,
  'createCoupon': PERMISSIONS.COUPON_CREATE,
  'updateCoupon': PERMISSIONS.COUPON_UPDATE,
  'deleteCoupon': PERMISSIONS.COUPON_DELETE,

  // 退款管理
  'getRefundList': PERMISSIONS.REFUND_VIEW,
  'getRefundDetail': PERMISSIONS.REFUND_VIEW,
  'approveRefund': PERMISSIONS.REFUND_APPROVE,
  'confirmReceipt': PERMISSIONS.REFUND_APPROVE,
  'rejectRefund': PERMISSIONS.REFUND_APPROVE,
  'retryRefund': PERMISSIONS.REFUND_APPROVE,

  // 地址管理
  'getAddresses': PERMISSIONS.ADDRESS_VIEW,
  'deleteAddress': PERMISSIONS.ADDRESS_DELETE,

  // 门店管理
  'getStoreInfo': PERMISSIONS.STORE_VIEW,
  'getStoreDetail': PERMISSIONS.STORE_VIEW,
  'createStore': PERMISSIONS.STORE_CREATE,
  'updateStore': PERMISSIONS.STORE_UPDATE,
  'updateStoreInfo': PERMISSIONS.STORE_UPDATE,
  'deleteStore': PERMISSIONS.STORE_DELETE,
  'setDefaultStore': PERMISSIONS.STORE_UPDATE,

  // 钱包管理
  'getWalletTransactions': PERMISSIONS.WALLET_VIEW,

  // 佣金钱包
  'getCommissionWallets': PERMISSIONS.COMMISSION_WALLET_VIEW,

  // 系统配置（getSystemConfig 公开，updateSystemConfig 需要权限）
  'updateSystemConfig': PERMISSIONS.SYSTEM_CONFIG_UPDATE,

  // 用户详情相关（需要 USER_VIEW 权限）
  'getUserWallet': PERMISSIONS.USER_VIEW,
  'getPromotionPath': PERMISSIONS.USER_VIEW,
  'getUserOrders': PERMISSIONS.USER_VIEW,
  'getUserRewards': PERMISSIONS.USER_VIEW,
  'getTeamMembers': PERMISSIONS.USER_VIEW,

  // 推广管理相关（需要 PROMOTION_VIEW 权限）
  'getPromoters': PERMISSIONS.PROMOTION_VIEW,
  'getCommissions': PERMISSIONS.PROMOTION_VIEW,

  // 分类管理（需要 PRODUCT_VIEW 权限）
  'getCategories': PERMISSIONS.CATEGORY_VIEW,
  'getCategoryDetail': PERMISSIONS.CATEGORY_VIEW,
  'createCategory': PERMISSIONS.CATEGORY_CREATE,
  'updateCategory': PERMISSIONS.CATEGORY_UPDATE,
  'deleteCategory': PERMISSIONS.CATEGORY_DELETE,

  // 提现审批（需要 FINANCE_APPROVE 权限）
  'approveWithdrawal': PERMISSIONS.FINANCE_APPROVE,
  'rejectWithdrawal': PERMISSIONS.FINANCE_APPROVE,

  // 财务提现列表（兼容不同的 action 命名）
  'getWithdrawals': PERMISSIONS.FINANCE_VIEW,

  // ========== ERP 权限映射 ==========
  // 供应商管理
  'getSuppliers': PERMISSIONS.SUPPLIER_VIEW,
  'getSupplierDetail': PERMISSIONS.SUPPLIER_VIEW,
  'createSupplier': PERMISSIONS.SUPPLIER_CREATE,
  'updateSupplier': PERMISSIONS.SUPPLIER_UPDATE,
  'deleteSupplier': PERMISSIONS.SUPPLIER_DELETE,

  // 采购管理
  'getPurchaseOrders': PERMISSIONS.PURCHASE_VIEW,
  'getPurchaseOrderDetail': PERMISSIONS.PURCHASE_VIEW,
  'createPurchaseOrder': PERMISSIONS.PURCHASE_CREATE,
  'updatePurchaseOrder': PERMISSIONS.PURCHASE_UPDATE,
  'submitPurchaseOrder': PERMISSIONS.PURCHASE_UPDATE,
  'receivePurchaseOrder': PERMISSIONS.PURCHASE_RECEIVE,
  'cancelPurchaseOrder': PERMISSIONS.PURCHASE_UPDATE,

  // 库存管理
  'getInventoryOverview': PERMISSIONS.INVENTORY_VIEW,
  'getInventoryBatches': PERMISSIONS.INVENTORY_VIEW,
  'getInventoryTransactions': PERMISSIONS.INVENTORY_VIEW,
  'adjustInventory': PERMISSIONS.INVENTORY_ADJUST,
  'getExpiringBatches': PERMISSIONS.INVENTORY_VIEW,
  'getExpiredBatches': PERMISSIONS.INVENTORY_VIEW,

  // 盘点管理
  'getInventoryChecks': PERMISSIONS.INVENTORY_CHECK,
  'getInventoryCheckDetail': PERMISSIONS.INVENTORY_CHECK,
  'createInventoryCheck': PERMISSIONS.INVENTORY_CHECK,
  'updateInventoryCheckItem': PERMISSIONS.INVENTORY_CHECK,
  'completeInventoryCheck': PERMISSIONS.INVENTORY_CHECK,
  'cancelInventoryCheck': PERMISSIONS.INVENTORY_CHECK
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
