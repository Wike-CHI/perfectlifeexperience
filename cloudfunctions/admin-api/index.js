const cloud = require('wx-server-sdk')
const jwt = require('jsonwebtoken')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

// 引入共享工具函数
const { generateTransactionNo } = require('./common/utils')

const { verifyAdmin, hasPermission, logOperation, getDefaultPermissions } = require('./auth')
const { getRequiredPermission } = require('./permissions')
const { sendWithdrawalNotification } = require('./common/notification')
const {
  isValidObjectId,
  validateOrderStatus,
  validatePaginationParams,
  validateWithdrawalAction,
  validateProductData,
  sanitizeUpdateData
} = require('./validator')

// ERP 模块
const erpModule = require('./modules/erp')

// 业务模块
const orderModule = require('./modules/order')
const bannerModule = require('./modules/banner')
const announcementModule = require('./modules/announcement')
const couponModule = require('./modules/coupon')
const productModule = require('./modules/product')
const userModule = require('./modules/user')
const withdrawalModule = require('./modules/withdrawal')
const promotionModule = require('./modules/promotion')
const promoterModule = require('./modules/promoter')
const inventoryModule = require('./modules/inventory')
const categoryModule = require('./modules/category')
const orderAdminModule = require('./modules/order-admin')
const dashboardModule = require('./modules/dashboard')
const refundModule = require('./modules/refund')
const miscModule = require('./modules/misc')

// ==================== 库存流水辅助函数 ====================

/**
 * 创建库存流水记录
 */
async function createInventoryTransaction(params) {
  try {
    const transaction = {
      transactionNo: generateTransactionNo(),
      productId: params.productId,
      productName: params.productName,
      sku: params.sku || '',
      type: params.type,
      quantity: params.quantity,
      beforeStock: params.beforeStock,
      afterStock: params.afterStock,
      relatedId: params.relatedId || '',
      relatedNo: params.relatedNo || '',
      operatorId: params.operatorId || 'system',
      operatorName: params.operatorName || '系统',
      remark: params.remark || '',
      createTime: db.serverDate()
    };

    await db.collection('inventory_transactions').add({ data: transaction });

    console.log('[库存流水] 创建成功', {
      transactionNo: transaction.transactionNo,
      type: params.type,
      productId: params.productId,
      quantity: params.quantity
    });

    return { success: true, transactionNo: transaction.transactionNo };
  } catch (err) {
    console.error('[库存流水] 创建失败', {
      productId: params.productId,
      error: err.message
    });
    return { success: false, error: err.message };
  }
}

// JWT配置 - 必须从环境变量获取
const JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required')
}
// 🔒 安全修复：将JWT过期时间从7天改为2小时，降低token泄露风险
// 如果需要长时间登录，前端应实现token刷新机制
const JWT_EXPIRES_IN = '2h' // 2小时过期（原为7天，存在安全风险）
const JWT_REFRESH_EXPIRES_IN = '24h' // 🔒 安全修复：刷新token有效期24小时（原为7天）

// Main entry point
exports.main = async (event, context) => {
  // 🔧 安全解构：确保 data 始终是对象
  // 🔧 兼容所有可能的调用方式（MCP/微信云函数）
  let action = event.action || null
  let data = event.data || event || {}
  if (data.action) {
    action = data.action
    data = data.data || {}
  }
  const wxContext = cloud.getWXContext()

  try {
    // 权限验证中间件
    const requiredPermission = getRequiredPermission(action)

    // 如果需要权限验证
    if (requiredPermission !== null) {
      // 从请求中获取管理员信息（前端应该传递 adminToken）
      // 🔧 修复：优先从顶层 event 获取 adminToken，兼容两种调用方式
      const adminToken = event.adminToken || data.adminToken

      if (!adminToken) {
        return {
          code: 401,
          msg: '未授权：缺少管理员令牌'
        }
      }

      // 验证管理员身份和权限
      const authResult = await verifyAdminPermission(adminToken, requiredPermission)

      if (!authResult.authorized) {
        return {
          code: 403,
          msg: authResult.message
        }
      }

      // 将管理员信息挂载到 wxContext，供后续函数使用
      wxContext.ADMIN_INFO = authResult.admin
    }

    // 路由到对应的处理函数
    switch (action) {
      case 'adminLogin':
        return await adminLogin(data)
      case 'getDashboardData':
        return await dashboardModule.getDashboardData(db)
      case 'checkAuth':
        return { success: true, message: 'Admin API connected', openId: wxContext.OPENID }
      case 'checkAdminStatus':
        return await checkAdminStatus(wxContext)
      case 'getProducts':
        return await productModule.getProductsList(db, data)
      case 'getProductDetail':
        return await productModule.getProductDetailAdmin(db, data)
      case 'createProduct':
        return await productModule.createProductAdmin(db, logOperation, data, wxContext)
      case 'updateProduct':
        return await productModule.updateProductAdmin(db, logOperation, data, wxContext)
      case 'deleteProduct':
        return await productModule.deleteProductAdmin(db, logOperation, data, wxContext)
      case 'adjustProductStock':
        return await inventoryModule.adjustProductStock(db, logOperation, data, wxContext)
      case 'getCategories':
        return await categoryModule.getCategories(db, data)
      case 'getOrders':
        return await orderAdminModule.getOrders(db, data)
      case 'getOrderDetail':
        return await orderAdminModule.getOrderDetail(db, data)
      case 'updateOrderStatus':
        return await orderAdminModule.updateOrderStatus(db, logOperation, data, wxContext)
      case 'searchOrderByExpress':
        return await orderAdminModule.searchOrderByExpress(db, data)
      case 'updateOrderExpress':
        return await orderAdminModule.updateOrderExpress(db, logOperation, data, wxContext)
      case 'getAnnouncements':
        return await announcementModule.getAnnouncementsAdmin(db, data)
      case 'createAnnouncement':
        return await announcementModule.createAnnouncementAdmin(db, logOperation, data, wxContext)
      case 'updateAnnouncement':
        return await announcementModule.updateAnnouncementAdmin(db, logOperation, data, wxContext)
      case 'deleteAnnouncement':
        return await announcementModule.deleteAnnouncementAdmin(db, logOperation, data, wxContext)
      case 'getPromotionStats':
        return await getPromotionStatsAdmin(data)
      case 'getUsers':
        return await userModule.getUsersAdmin(db, data)
      case 'getUserDetail':
        return await userModule.getUserDetailAdmin(db, data)
      case 'getUserWallet':
        return await userModule.getUserWalletAdmin(db, data)
      case 'getPromotionPath':
        return await userModule.getPromotionPathAdmin(db, data)
      case 'getUserOrders':
        return await userModule.getUserOrdersAdmin(db, data)
      case 'getUserRewards':
        return await userModule.getUserRewardsAdmin(db, data)
      case 'getWithdrawals':
        return await withdrawalModule.getWithdrawalsAdmin(db, data)
      case 'approveWithdrawal':
        return await withdrawalModule.approveWithdrawalAdmin(db, logOperation, data, wxContext)
      case 'rejectWithdrawal':
        return await withdrawalModule.rejectWithdrawalAdmin(db, logOperation, data, wxContext)
      case 'getPromoters':
        return await promoterModule.getPromotersAdmin(db, data)
      case 'getCommissions':
        return await promoterModule.getCommissionsAdmin(db, data)
      case 'getCoupons':
        return await couponModule.getCouponsAdmin(db, data)
      case 'createCoupon':
        return await couponModule.createCouponAdmin(db, logOperation, data, wxContext)
      case 'updateCoupon':
        return await couponModule.updateCouponAdmin(db, logOperation, data, wxContext)
      case 'deleteCoupon':
        return await couponModule.deleteCouponAdmin(db, logOperation, data, wxContext)
      case 'getBanners':
        return await bannerModule.getBannersAdmin(db, data)
      case 'createBanner':
        return await bannerModule.createBannerAdmin(db, logOperation, data, wxContext)
      case 'updateBanner':
        return await bannerModule.updateBannerAdmin(db, logOperation, data, wxContext)
      case 'deleteBanner':
        return await bannerModule.deleteBannerAdmin(db, logOperation, data, wxContext)
      case 'getCouponDetail':
        return await couponModule.getCouponDetailAdmin(db, data)
      case 'getBannerDetail':
        return await bannerModule.getBannerDetailAdmin(db, data)
      case 'getTeamMembers':
        return await getTeamMembersAdmin(data)
      // Activity Management APIs
      case 'getPromotions':
        return await promotionModule.getPromotionsAdmin(db, data)
      case 'getPromotionDetail':
        return await promotionModule.getPromotionDetailAdmin(db, data)
      case 'createPromotion':
        return await promotionModule.createPromotionAdmin(db, logOperation, data, wxContext)
      case 'updatePromotion':
        return await promotionModule.updatePromotionAdmin(db, logOperation, data, wxContext)
      case 'deletePromotion':
        return await promotionModule.deletePromotionAdmin(db, logOperation, data, wxContext)
      case 'getPromotionProducts':
        return await promotionModule.getPromotionProductsAdmin(db, data)
      case 'addPromotionProducts':
        return await promotionModule.addPromotionProductsAdmin(db, logOperation, data, wxContext)
      case 'removePromotionProduct':
        return await promotionModule.removePromotionProductAdmin(db, logOperation, data, wxContext)
      case 'getPromotionActivityStats':
        return await promotionModule.getPromotionActivityStatsAdmin(db, data)
      // Refund Management APIs
      case 'getRefundList':
        return await refundModule.getRefundList(db, data)
      case 'getRefundDetail':
        return await refundModule.getRefundDetail(db, data)
      case 'approveRefund':
        return await refundModule.approveRefund(db, logOperation, data, wxContext)
      case 'confirmReceipt':
        return await refundModule.confirmReceipt(db, logOperation, data, wxContext)
      case 'rejectRefund':
        return await refundModule.rejectRefund(db, logOperation, data, wxContext)
      case 'retryRefund':
        return await refundModule.retryRefund(db, logOperation, data, wxContext)
      // Address Management APIs
      case 'getAddresses':
        return await miscModule.getAddresses(db, data)
      case 'deleteAddress':
        return await miscModule.deleteAddress(db, logOperation, data, wxContext)
      // Store Management APIs
      case 'getStoreInfo':
        return await miscModule.getStoreInfo(db)
      case 'updateStoreInfo':
        return await miscModule.updateStoreInfo(db, logOperation, data, wxContext)
      // Wallet Management APIs
      case 'getWalletTransactions':
        return await miscModule.getWalletTransactions(db, data)
      // Commission Wallet APIs
      case 'getCommissionWallets':
        return await miscModule.getCommissionWallets(db, data)
      // System Configuration APIs
      case 'getSystemConfig':
        return await miscModule.getSystemConfig(db)
      case 'updateSystemConfig':
        return await miscModule.updateSystemConfig(db, data, wxContext)

      // ========== ERP APIs ==========
      // 供应商管理
      case 'getSuppliers':
        return await miscModule.getSuppliers(db, data)
      case 'getSupplierDetail':
        return await miscModule.getSupplierDetail(db, data)
      case 'createSupplier':
        return await miscModule.createSupplier(db, logOperation, data, wxContext)
      case 'updateSupplier':
        return await miscModule.updateSupplier(db, logOperation, data, wxContext)
      case 'deleteSupplier':
        return await miscModule.deleteSupplier(db, logOperation, data, wxContext)

      // 采购管理
      case 'getPurchaseOrders':
        return await erpModule.getPurchaseOrders(db, data)
      case 'getPurchaseOrderDetail':
        return await erpModule.getPurchaseOrderDetail(db, data)
      case 'createPurchaseOrder':
        return await erpModule.createPurchaseOrder(db, logOperation, data, wxContext)
      case 'updatePurchaseOrder':
        return await erpModule.updatePurchaseOrder(db, logOperation, data, wxContext)
      case 'submitPurchaseOrder':
        return await erpModule.submitPurchaseOrder(db, logOperation, data, wxContext)
      case 'receivePurchaseOrder':
        return await erpModule.receivePurchaseOrder(db, logOperation, data, wxContext)
      case 'cancelPurchaseOrder':
        return await erpModule.cancelPurchaseOrder(db, logOperation, data, wxContext)

      // 库存管理
      case 'getInventoryOverview':
        return await erpModule.getInventoryOverview(db)
      case 'getInventoryBatches':
        return await erpModule.getInventoryBatches(db, data)
      case 'getInventoryTransactions':
        return await erpModule.getInventoryTransactions(db, data)
      case 'adjustInventory':
        return await erpModule.adjustInventory(db, logOperation, data, wxContext)
      case 'getExpiringBatches':
        return await erpModule.getExpiringBatches(db, data)
      case 'getExpiredBatches':
        return await erpModule.getExpiredBatches(db)

      // 盘点管理
      case 'getInventoryChecks':
        return await erpModule.getInventoryChecks(db, data)
      case 'getInventoryCheckDetail':
        return await erpModule.getInventoryCheckDetail(db, data)
      case 'createInventoryCheck':
        return await erpModule.createInventoryCheck(db, logOperation, data, wxContext)
      case 'updateInventoryCheckItem':
        return await erpModule.updateInventoryCheckItem(db, data)
      case 'completeInventoryCheck':
        return await erpModule.completeInventoryCheck(db, logOperation, data, wxContext)
      case 'cancelInventoryCheck':
        return await erpModule.cancelInventoryCheck(db, logOperation, data, wxContext)

      default:
        return {
          code: 400,
          msg: `Unknown action: ${action}`
        }
    }
  } catch (err) {
    console.error(err)
    return {
      code: 500,
      msg: err.message,
      error: err
    }
  }
}

/**
 * 验证管理员权限
 * @param {string} adminToken - 管理员令牌
 * @param {string} requiredPermission - 所需权限
 * @returns {Promise<{authorized: boolean, message?: string, admin?: object}>}
 */
async function verifyAdminPermission(adminToken, requiredPermission) {
  try {
    if (!adminToken) {
      return {
        authorized: false,
        message: '未授权：缺少管理员令牌'
      }
    }

    // 验证 JWT token（jwt.verify会自动验证过期时间）
    let decoded;
    try {
      decoded = jwt.verify(adminToken, JWT_SECRET);
    } catch (error) {
      // 🔒 安全修复：区分不同的token验证失败原因
      if (error.name === 'TokenExpiredError') {
        return {
          authorized: false,
          message: '登录已过期，请重新登录',
          code: 'TOKEN_EXPIRED'
        }
      } else if (error.name === 'JsonWebTokenError') {
        return {
          authorized: false,
          message: 'Token无效',
          code: 'TOKEN_INVALID'
        }
      }
      return {
        authorized: false,
        message: 'Token验证失败'
      }
    }

    // 🔒 安全增强：检查token签发时间，如果密码在此之后被修改，则token失效
    const adminResult = await db.collection('admins')
      .where({
        _id: decoded.adminId,
        status: 'active'
      })
      .limit(1)
      .get()

    if (adminResult.data.length === 0) {
      return {
        authorized: false,
        message: '管理员不存在或已被禁用'
      }
    }

    const admin = adminResult.data[0];

    // 🔒 安全增强：如果密码在token签发后被修改，token失效
    if (admin.passwordUpdatedAt) {
      const tokenIssuedAt = new Date(decoded.iat * 1000); // JWT iat 是秒级时间戳
      const passwordUpdatedAt = new Date(admin.passwordUpdatedAt);
      if (passwordUpdatedAt > tokenIssuedAt) {
        return {
          authorized: false,
          message: '密码已更改，请重新登录',
          code: 'PASSWORD_CHANGED'
        }
      }
    }

    // 检查权限
    if (requiredPermission) {
      // 超级管理员拥有所有权限
      if (admin.role !== 'super_admin') {
        const permissions = admin.permissions || getDefaultPermissions(admin.role);
        if (!permissions.includes(requiredPermission)) {
          return {
            authorized: false,
            message: '权限不足'
          }
        }
      }
    }

    return {
      authorized: true,
      admin: {
        id: admin._id,
        username: admin.username,
        role: admin.role,
        permissions: admin.permissions || getDefaultPermissions(admin.role)
      }
    }
  } catch (error) {
    console.error('权限验证失败:', error)
    return {
      authorized: false,
      message: '权限验证失败'
    }
  }
}

/**
 * 检查用户是否为管理员
 * @param {object} wxContext - 微信上下文
 * @returns {Promise<{code: number, data?: {isAdmin: boolean}, msg?: string}>}
 */
async function checkAdminStatus(wxContext) {
  try {
    const openid = wxContext.OPENID

    if (!openid) {
      return {
        code: 401,
        msg: '未登录'
      }
    }

    // 查询用户是否为管理员
    const adminResult = await db.collection('admins')
      .where({
        _openid: openid,
        status: 'active'
      })
      .limit(1)
      .get()

    const isAdmin = adminResult.data.length > 0

    return {
      code: 0,
      data: {
        isAdmin
      }
    }
  } catch (error) {
    console.error('检查管理员状态失败:', error)
    return {
      code: 500,
      msg: '检查失败'
    }
  }
}

// Auth functions
async function adminLogin(data) {
  const { username, password } = data || {};

  if (!username || !password) {
    return { code: 400, msg: '用户名和密码不能为空' };
  }

  const result = await verifyAdmin(username, password);

  if (!result.success) {
    return { code: 401, msg: result.message };
  }

  // 生成JWT token
  const token = jwt.sign(
    {
      adminId: result.admin.id,
      username: result.admin.username,
      role: result.admin.role
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

  // Log the login operation
  await logOperation(result.admin.id, 'login', { username });

  return {
    code: 0,
    data: {
      ...result.admin,
      token
    },
    msg: '登录成功'
  };
}

async function getDashboardData(data) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [todayOrdersResult, monthOrdersResult, usersResult, pendingShipments, recentOrdersData, lowStockResult] = await Promise.all([
      db.collection('orders').where({
        createTime: _.gte(today),
        status: _.in(['paid', 'shipping', 'completed'])
      }).get(),

      db.collection('orders').where({
        createTime: _.gte(new Date(today.getFullYear(), today.getMonth(), 1)),
        status: _.in(['paid', 'shipping', 'completed'])
      }).get(),

      db.collection('users').count(),

      db.collection('orders').where({ status: 'shipping' }).count(),

      db.collection('orders')
        .orderBy('createTime', 'desc')
        .limit(10)
        .get(),

      // 库存预警：库存小于等于10的商品
      db.collection('products').where({
        stock: _.lte(10)
      }).count()
    ]);

    const todaySales = todayOrdersResult.data.reduce((sum, order) => sum + order.totalAmount, 0);
    const monthSales = monthOrdersResult.data.reduce((sum, order) => sum + order.totalAmount, 0);

    return {
      code: 0,
      data: {
        todaySales,
        todayOrders: todayOrdersResult.data.length,
        monthSales,
        monthOrders: monthOrdersResult.data.length,
        totalUsers: usersResult.total,
        pendingTasks: [
          { type: 'shipment', count: pendingShipments.total },
          { type: 'lowStock', count: lowStockResult.total },
          { type: 'withdrawal', count: 0 }
        ],
        lowStockCount: lowStockResult.total,
        recentOrders: recentOrdersData.data
      }
    };
  } catch (error) {
    console.error('Get dashboard data error:', error);
    return { code: 500, msg: error.message };
  }
}

// Promotion functions
async function getPromotionStatsAdmin(data) {
  try {
    // 推广员统计：代理等级1-3的都是推广员
    const [totalPromoters, totalTeams, totalRewards, recentOrders] = await Promise.all([
      db.collection('users').where({ agentLevel: _.lte(3) }).count(),
      db.collection('promotion_relations').count(),
      db.collection('reward_records').count(),
      db.collection('promotion_orders')
        .orderBy('createTime', 'desc')
        .limit(10)
        .get()
    ]);

    return {
      code: 0,
      data: {
        totalPromoters: totalPromoters.total,
        totalTeams: totalTeams.total,
        totalRewards: totalRewards.total,
        recentOrders: recentOrders.data
      }
    };
  } catch (error) {
    console.error('Get promotion stats error:', error);
    return { code: 500, msg: error.message };
  }
}

/**
 * 调整商品库存
 */
async function adjustProductStock(data, wxContext) {
  try {
    const adminInfo = wxContext.ADMIN_INFO || { id: 'system' };
    const { productId, delta, reason } = data || {};

    // 参数验证
    if (!isValidObjectId(productId)) {
      return { code: 400, msg: '商品ID格式无效' };
    }

    if (typeof delta !== 'number' || delta === 0) {
      return { code: 400, msg: '调整量必须为非零数字' };
    }

    // 获取当前商品
    const productResult = await db.collection('products').doc(productId).get();
    if (!productResult.data) {
      return { code: 404, msg: '商品不存在' };
    }

    const currentStock = productResult.data.stock || 0;
    const newStock = currentStock + delta;

    // 检查库存是否足够
    if (newStock < 0) {
      return { code: 400, msg: '库存不足，无法调整' };
    }

    // 更新库存
    await db.collection('products').doc(productId).update({
      data: {
        stock: newStock,
        updateTime: new Date()
      }
    });

    // 记录操作日志
    await logOperation(adminInfo.id, 'adjustProductStock', {
      productId,
      productName: productResult.data.name,
      delta,
      oldStock: currentStock,
      newStock,
      reason: reason || (delta > 0 ? '手动入库' : '手动出库')
    });

    return {
      code: 0,
      data: { oldStock: currentStock, newStock },
      msg: '库存调整成功'
    };
  } catch (error) {
    console.error('Adjust product stock error:', error);
    return { code: 500, msg: error.message };
  }
}

async function getCategoriesAdmin() {
  try {
    const { data: categories } = await db.collection('categories')
      .where({ isActive: true })
      .orderBy('sort', 'asc')
      .get();

    return {
      code: 0,
      data: categories
    };
  } catch (error) {
    console.error('Get categories error:', error);
    return { code: 500, msg: error.message };
  };
}

// Order functions
async function getOrdersAdmin(data) {
  try {
    const { page = 1, limit = 20, status, keyword, startDate, endDate } = data || {};
    const skip = (page - 1) * limit;

    let query = {};

    if (status && status !== 'all') {
      query.status = status;
    }

    if (keyword) {
      query.orderNo = db.RegExp({
        regexp: keyword,
        options: 'i'
      });
    }

    if (startDate || endDate) {
      query.createTime = {};
      if (startDate) query.createTime.$gte = new Date(startDate);
      if (endDate) query.createTime.$lte = new Date(endDate);
    }

    const [ordersResult, countResult] = await Promise.all([
      db.collection('orders')
        .where(query)
        .orderBy('createTime', 'desc')
        .skip(skip)
        .limit(limit)
        .get(),
      db.collection('orders').where(query).count()
    ]);

    return {
      code: 0,
      data: {
        list: ordersResult.data,
        total: countResult.total,
        page,
        limit,
        totalPages: Math.ceil(countResult.total / limit)
      }
    };
  } catch (error) {
    console.error('Get orders error:', error);
    return { code: 500, msg: error.message };
  }
}

async function getOrderDetailAdmin(data) {
  try {
    const { id } = data || {};

    const orderResult = await db.collection('orders').doc(id).get();

    if (!orderResult.data) {
      return { code: 404, msg: '订单不存在' };
    }

    // Get user info
    const userResult = await db.collection('users')
      .where({ _openid: orderResult.data._openid })
      .limit(1)
      .get();

    return {
      code: 0,
      data: {
        order: orderResult.data,
        user: userResult.data[0] || null
      }
    };
  } catch (error) {
    console.error('Get order detail error:', error);
    return { code: 500, msg: error.message };
  }
}

async function updateOrderStatusAdmin(data, wxContext) {
  try {
    const adminInfo = wxContext.ADMIN_INFO || { id: 'system' };

    // 验证输入
    if (!isValidObjectId(data.orderId)) {
      return { code: 400, msg: '订单ID格式无效' };
    }

    const statusValidation = validateOrderStatus(data.status);
    if (!statusValidation.valid) {
      return { code: 400, msg: statusValidation.message };
    }

    const { orderId, status } = data || {};

    const updateData = {
      status,
      updateTime: new Date()
    };

    if (status === 'paid') updateData.payTime = new Date();
    else if (status === 'shipping') updateData.shipTime = new Date();
    else if (status === 'completed') updateData.completeTime = new Date();

    await db.collection('orders').doc(orderId).update({
      data: updateData
    });

    await logOperation(adminInfo.id, 'updateOrderStatus', { orderId, status });

    return {
      code: 0,
      msg: '订单状态更新成功'
    };
  } catch (error) {
    console.error('Update order status error:', error);
    return { code: 500, msg: error.message };
  }
}

/**
 * 根据快递单号搜索订单
 */
async function searchOrderByExpress(data) {
  try {
    const { expressCode } = data || {};

    if (!expressCode || typeof expressCode !== 'string') {
      return { code: 400, msg: '快递单号不能为空' };
    }

    // 查询订单
    const result = await db.collection('orders')
      .where({ expressCode: expressCode.trim() })
      .limit(1)
      .get();

    if (result.data.length === 0) {
      return { code: 404, msg: '未找到该订单' };
    }

    return {
      code: 0,
      data: { id: result.data[0]._id },
      msg: '查询成功'
    };
  } catch (error) {
    console.error('Search order by express error:', error);
    return { code: 500, msg: error.message };
  }
}

/**
 * 更新订单快递单号
 */
async function updateOrderExpressAdmin(data, wxContext) {
  try {
    const adminInfo = wxContext.ADMIN_INFO || { id: 'system' };

    // 验证输入
    if (!isValidObjectId(data.orderId)) {
      return { code: 400, msg: '订单ID格式无效' };
    }

    const { orderId, expressCode } = data || {};

    if (!expressCode || typeof expressCode !== 'string') {
      return { code: 400, msg: '快递单号不能为空' };
    }

    // 更新订单快递单号
    await db.collection('orders').doc(orderId).update({
      data: {
        expressCode: expressCode.trim(),
        updateTime: new Date()
      }
    });

    await logOperation(adminInfo.id, 'updateOrderExpress', {
      orderId,
      expressCode
    });

    return {
      code: 0,
      msg: '快递单号更新成功'
    };
  } catch (error) {
    console.error('Update order express error:', error);
    return { code: 500, msg: error.message };
  }
}

// Financial Management functions
async function getWithdrawalsAdmin(data) {
  try {
    const { page = 1, limit = 20, status } = data || {};
    const skip = (page - 1) * limit;

    let query = {};

    if (status && status !== 'all') {
      query.status = status;
    }

    const [withdrawalsResult, countResult] = await Promise.all([
      db.collection('withdrawals')
        .where(query)
        .orderBy('applyTime', 'desc')
        .skip(skip)
        .limit(limit)
        .get(),
      db.collection('withdrawals').where(query).count()
    ]);

    // Get user info for each withdrawal
    const withdrawalsWithUsers = await Promise.all(
      withdrawalsResult.data.map(async (withdrawal) => {
        const userResult = await db.collection('users')
          .where({ _openid: withdrawal._openid })
          .limit(1)
          .get();

        return {
          ...withdrawal,
          user: userResult.data[0] || null
        };
      })
    );

    return {
      code: 0,
      data: {
        list: withdrawalsWithUsers,
        total: countResult.total,
        page,
        limit,
        totalPages: Math.ceil(countResult.total / limit)
      }
    };
  } catch (error) {
    console.error('Get withdrawals error:', error);
    return { code: 500, msg: error.message };
  }
}

async function approveWithdrawalAdmin(data, wxContext) {
  try {
    const adminInfo = wxContext.ADMIN_INFO || { id: 'system' };

    const { withdrawalId } = data || {};

    const withdrawalResult = await db.collection('withdrawals').doc(withdrawalId).get();

    if (!withdrawalResult.data) {
      return { code: 404, msg: '提现记录不存在' };
    }

    if (withdrawalResult.data.status !== 'pending') {
      return { code: 400, msg: '该提现记录已处理' };
    }

    const withdrawal = withdrawalResult.data;

    // 更新提现记录状态
    await db.collection('withdrawals').doc(withdrawalId).update({
      data: {
        status: 'approved',
        approvedBy: adminInfo.id,
        approvedTime: new Date()
      }
    });

    // 更新佣金钱包余额 - 解冻冻结金额，增加累计提现
    // 注意：申请提现时已经从balance扣减并转移到frozenAmount，所以审批时只需要：
    // 1. 从frozenAmount解冻（减少）
    // 2. 增加累计提现金额
    // balance不需要再扣减，否则会导致双重扣减
    await db.collection('commission_wallets')
      .where({ _openid: withdrawal._openid })
      .update({
        data: {
          frozenAmount: _.inc(-withdrawal.amount), // 解冻冻结金额
          totalWithdrawn: _.inc(withdrawal.amount), // 增加累计提现
          updateTime: new Date()
        }
      });

    // 创建交易记录
    await db.collection('commission_transactions').add({
      data: {
        _openid: withdrawal._openid,
        type: 'withdraw_success',
        amount: -withdrawal.amount,
        status: 'success',
        withdrawalId: withdrawalId,
        description: '提现申请已批准',
        createTime: new Date()
      }
    });

    // 调用微信商家转账API将钱打入用户微信余额
    // 使用 wechatpay 云函数进行转账（推荐方式）
    try {
      const transferResult = await cloud.callFunction({
        name: 'wechatpay',
        data: {
          action: 'transferToBalance',
          data: {
            openid: withdrawal._openid,
            amount: withdrawal.amount,
            withdrawNo: withdrawal.withdrawNo,
            remark: '佣金钱包提现'
          }
        }
      });

      const result = transferResult.result;

      if (result.code === 0) {
        // 转账成功或处理中
        await db.collection('withdrawals').doc(withdrawalId).update({
          data: {
            transferStatus: result.data.status || 'PROCESSING',
            transferBatchId: result.data.batchId,
            transferDetailId: result.data.detailId,
            transferTime: new Date()
          }
        });
        console.log('微信转账已发起:', result.data);
      } else {
        // 转账失败,记录错误但批准流程已完成
        console.error('微信转账失败:', result.msg);
        await db.collection('withdrawals').doc(withdrawalId).update({
          data: {
            transferStatus: 'failed',
            transferError: result.msg,
            transferTime: new Date()
          }
        });
      }
    } catch (transferError) {
      // 转账异常,记录错误但不影响批准流程
      console.error('微信转账异常:', transferError);
      await db.collection('withdrawals').doc(withdrawalId).update({
        data: {
          transferStatus: 'failed',
          transferError: transferError.message || '转账服务异常',
          transferTime: new Date()
        }
      });
    }

    await logOperation(adminInfo.id, 'approveWithdrawal', { withdrawalId, amount: withdrawal.amount });

    // 发送提现通知（异步，不阻塞主流程）
    sendWithdrawalNotification(withdrawal._openid, {
      amount: withdrawal.amount,
      status: '已批准，转账中',
      time: formatTime(new Date())
    }).then(notifyResult => {
      if (notifyResult.success) {
        console.log('[通知] 提现通知发送成功');
      } else {
        console.warn('[通知] 提现通知发送失败:', notifyResult.reason || notifyResult.error);
      }
    }).catch(notifyError => {
      console.error('[通知] 提现通知发送异常:', notifyError);
    });

    return {
      code: 0,
      msg: '提现已批准'
    };
  } catch (error) {
    console.error('Approve withdrawal error:', error);
    return { code: 500, msg: error.message };
  }
}

/**
 * 格式化时间
 */
function formatTime(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hour}:${minute}`;
}

async function rejectWithdrawalAdmin(data, wxContext) {
  try {
    const adminInfo = wxContext.ADMIN_INFO || { id: 'system' };

    const { withdrawalId, reason } = data || {};

    const withdrawalResult = await db.collection('withdrawals').doc(withdrawalId).get();

    if (!withdrawalResult.data) {
      return { code: 404, msg: '提现记录不存在' };
    }

    if (withdrawalResult.data.status !== 'pending') {
      return { code: 400, msg: '该提现记录已处理' };
    }

    const withdrawal = withdrawalResult.data;

    // 更新提现记录状态
    await db.collection('withdrawals').doc(withdrawalId).update({
      data: {
        status: 'rejected',
        rejectedBy: adminInfo.id,
        rejectedTime: new Date(),
        rejectReason: reason
      }
    });

    // 更新用户佣金钱包 - 释放冻结金额回余额
    await db.collection('commission_wallets')
      .where({ _openid: withdrawal._openid })
      .update({
        data: {
          balance: _.inc(withdrawal.amount),   // 余额恢复
          frozenAmount: _.inc(-withdrawal.amount), // 解冻
          updateTime: new Date()
        }
      });

    // 创建交易记录
    await db.collection('commission_transactions').add({
      data: {
        _openid: withdrawal._openid,
        type: 'withdraw_rejected',
        amount: withdrawal.amount,
        status: 'failed',
        withdrawalId: withdrawalId,
        description: `提现被拒绝: ${reason || '无原因'}`,
        createTime: new Date()
      }
    });

    await logOperation(adminInfo.id, 'rejectWithdrawal', { withdrawalId, reason });

    return {
      code: 0,
      msg: '提现已拒绝'
    };
  } catch (error) {
    console.error('Reject withdrawal error:', error);
    return { code: 500, msg: error.message };
  }
}

// Promoter Management functions
async function getPromotersAdmin(data) {
  try {
    const { page = 1, pageSize = 20, agentLevel, keyword } = data || {};
    const skip = (page - 1) * pageSize;

    // 推广员：代理等级1-3（金牌、银牌、铜牌）
    let query = {
      agentLevel: _.lte(3) // Only get promoters (1=金牌, 2=银牌, 3=铜牌)
    };

    if (agentLevel !== undefined && agentLevel >= 1 && agentLevel <= 3) {
      query.agentLevel = agentLevel;
    }

    if (keyword) {
      query.$or = [
        { nickName: db.RegExp({ regexp: keyword, options: 'i' }) },
        { _openid: db.RegExp({ regexp: keyword, options: 'i' }) }
      ];
    }

    const [promotersResult, countResult] = await Promise.all([
      db.collection('users')
        .where(query)
        .orderBy('performance.totalSales', 'desc')
        .skip(skip)
        .limit(pageSize)
        .field({
          _id: true,
          _openid: true,
          nickName: true,
          avatarUrl: true,
          agentLevel: true,
          performance: true
        })
        .get(),
      db.collection('users').where(query).count()
    ]);

    // Calculate stats (按代理等级统计)
    const [goldResult, silverResult, bronzeResult] = await Promise.all([
      db.collection('users').where({ agentLevel: 1 }).count(),
      db.collection('users').where({ agentLevel: 2 }).count(),
      db.collection('users').where({ agentLevel: 3 }).count()
    ]);

    return {
      code: 0,
      data: {
        list: promotersResult.data,
        total: countResult.total,
        page,
        pageSize,
        stats: {
          totalPromoters: countResult.total,
          goldPromoters: goldResult.total,
          silverPromoters: silverResult.total,
          bronzePromoters: bronzeResult.total
        }
      }
    };
  } catch (error) {
    console.error('Get promoters error:', error);
    return { code: 500, msg: error.message };
  }
}

async function getCommissionsAdmin(data) {
  try {
    const { page = 1, limit = 20, type, dateRange } = data || {};
    const skip = (page - 1) * limit;

    let query = {};

    if (type && type !== 'all') {
      query.rewardType = type;
    }

    if (dateRange && dateRange !== 'all') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      if (dateRange === 'today') {
        query.createTime = _.gte(today);
      } else if (dateRange === 'week') {
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        query.createTime = _.gte(weekAgo);
      } else if (dateRange === 'month') {
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        query.createTime = _.gte(monthStart);
      } else if (dateRange === 'lastMonth') {
        const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
        query.createTime = _.and(_.gte(lastMonthStart), _.lte(lastMonthEnd));
      }
    }

    const [commissionsResult, countResult] = await Promise.all([
      db.collection('reward_records')
        .where(query)
        .orderBy('createTime', 'desc')
        .skip(skip)
        .limit(limit)
        .get(),
      db.collection('reward_records').where(query).count()
    ]);

    // Get user info for each commission
    const commissionsWithUsers = await Promise.all(
      commissionsResult.data.map(async (commission) => {
        // beneficiaryId 是佣金受益人的 openid
        const userResult = await db.collection('users')
          .where({ _openid: commission.beneficiaryId })
          .limit(1)
          .get();

        return {
          ...commission,
          user: userResult.data[0] || null
        };
      })
    );

    // Calculate summary by type
    const summaryQuery = dateRange && dateRange !== 'all'
      ? { ...query, rewardType: _.exists(true) }
      : { rewardType: _.exists(true) };

    const allCommissions = await db.collection('reward_records')
      .where(summaryQuery)
      .get();

    const summary = {
      totalCommission: 0
    };

    allCommissions.data.forEach((record) => {
      summary.totalCommission += record.amount || 0;
    });

    return {
      code: 0,
      data: {
        list: commissionsWithUsers,
        total: countResult.total,
        page,
        limit,
        totalPages: Math.ceil(countResult.total / limit),
        summary
      }
    };
  } catch (error) {
    console.error('Get commissions error:', error);
    return { code: 500, msg: error.message };
  }
}

async function getTeamMembersAdmin(data) {
  try {
    const { userId, maxLevel = -1 } = data || {};

    // Get the user's promotion path
    const userResult = await db.collection('users').doc(userId).get();

    if (!userResult.data) {
      return { code: 404, msg: '用户不存在' };
    }

    const userOpenid = userResult.data._openid;

    // Get direct members (first level)
    const directMembersResult = await db.collection('promotion_relations')
      .where({ parentId: userId })
      .get();

    const directMemberIds = directMembersResult.data.map(r => r.childId);

    let directMembers = [];
    let subTeams = [];
    let totalMembers = 0;
    let activePromoters = 0;
    let totalSales = 0;

    if (directMemberIds.length > 0) {
      const directUsersResult = await db.collection('users')
        .where({
          _id: _.in(directMemberIds)
        })
        .field({
          _id: true,
          _openid: true,
          nickName: true,
          avatarUrl: true,
          agentLevel: true,
          performance: true
        })
        .get();

      directMembers = directUsersResult.data;

      // Count stats
      for (const member of directMembers) {
        if (member.agentLevel <= 3) activePromoters++;
        totalSales += member.performance?.totalSales || 0;
        totalMembers++;
      }

      // Get sub-teams if maxLevel > 1
      if (maxLevel === -1 || maxLevel > 1) {
        const levelsToGet = maxLevel === -1 ? [2, 3, 4] : [2, 3, 4].filter(l => l <= maxLevel);

        for (const level of levelsToGet) {
          // For each level, we need to find members at that level
          // This is a simplified approach - in production you'd want a more efficient query
          const levelMembers = await getMembersAtLevel(userId, level);
          if (levelMembers.length > 0) {
            subTeams.push({
              level,
              members: levelMembers
            });
            totalMembers += levelMembers.length;
          }
        }
      }
    }

    return {
      code: 0,
      data: {
        directMembers,
        subTeams,
        stats: {
          totalMembers,
          directMembers: directMembers.length,
          activePromoters,
          totalSales
        }
      }
    };
  } catch (error) {
    console.error('Get team members error:', error);
    return { code: 500, msg: error.message };
  }
}

// Helper function to get members at a specific level
async function getMembersAtLevel(parentUserId, level) {
  try {
    // Start with the parent user's OPENID
    let currentParentId = parentUserId;

    // Traverse down the tree to the target level
    for (let i = 1; i < level; i++) {
      const relationsResult = await db.collection('promotion_relations')
        .where({ parentId: currentParentId })
        .get();

      if (relationsResult.data.length === 0) {
        return []; // No members at this level
      }

      // For the last iteration, we want the members, not to continue traversing
      if (i === level - 1) {
        const memberIds = relationsResult.data.map(r => r.childId);
        const membersResult = await db.collection('users')
          .where({ _id: _.in(memberIds) })
          .field({
            _id: true,
            nickName: true,
            avatarUrl: true,
            agentLevel: true,
            performance: true
          })
          .get();

        return membersResult.data;
      }

      // Continue to next level (use first child for simplicity)
      currentParentId = relationsResult.data[0].childId;
    }

    return [];
  } catch (error) {
    console.error('Get members at level error:', error);
    return [];
  }
}

// ==================== Activity Management Functions ====================

/**
 * Get promotions list
 */
async function getPromotionsAdmin(data) {
  try {
    const { page = 1, limit = 20, status, type } = data || {};
    const skip = (page - 1) * limit;

    let query = {};

    if (status && status !== 'all') {
      query.status = status;
    }

    if (type && type !== 'all') {
      query.type = type;
    }

    const [promotionsResult, countResult] = await Promise.all([
      db.collection('promotions')
        .where(query)
        .orderBy('createTime', 'desc')
        .skip(skip)
        .limit(limit)
        .get(),
      db.collection('promotions').where(query).count()
    ]);

    return {
      code: 0,
      data: {
        list: promotionsResult.data,
        total: countResult.total,
        page,
        limit,
        totalPages: Math.ceil(countResult.total / limit)
      }
    };
  } catch (error) {
    console.error('Get promotions error:', error);
    return { code: 500, msg: error.message };
  }
}

/**
 * Get promotion detail
 */
async function getPromotionDetailAdmin(data) {
  try {
    const { id } = data || {};

    const promotionResult = await db.collection('promotions').doc(id).get();

    if (!promotionResult.data) {
      return { code: 404, msg: '活动不存在' };
    }

    // Get promotion products
    const productsResult = await db.collection('promotion_products')
      .where({ promotionId: id })
      .get();

    return {
      code: 0,
      data: {
        promotion: promotionResult.data,
        products: productsResult.data
      }
    };
  } catch (error) {
    console.error('Get promotion detail error:', error);
    return { code: 500, msg: error.message };
  }
}

/**
 * Create promotion
 */
async function createPromotionAdmin(data, wxContext) {
  try {
    const adminInfo = wxContext.ADMIN_INFO || { id: 'system' };

    const promotionData = {
      ...data,
      createTime: new Date(),
      updateTime: new Date()
    };

    const result = await db.collection('promotions').add({
      data: promotionData
    });

    await logOperation(adminInfo.id, 'createPromotion', {
      promotionId: result.id,
      name: data.name
    });

    return {
      code: 0,
      data: { id: result.id },
      msg: '活动创建成功'
    };
  } catch (error) {
    console.error('Create promotion error:', error);
    return { code: 500, msg: error.message };
  }
}

/**
 * Update promotion
 */
async function updatePromotionAdmin(data, wxContext) {
  try {
    const adminInfo = wxContext.ADMIN_INFO || { id: 'system' };

    const { id, ...updateData } = data || {};
    updateData.updateTime = new Date();

    await db.collection('promotions').doc(id).update({
      data: updateData
    });

    await logOperation(adminInfo.id, 'updatePromotion', {
      promotionId: id,
      ...updateData
    });

    return {
      code: 0,
      msg: '活动更新成功'
    };
  } catch (error) {
    console.error('Update promotion error:', error);
    return { code: 500, msg: error.message };
  }
}

/**
 * Delete promotion
 */
async function deletePromotionAdmin(data, wxContext) {
  try {
    const adminInfo = wxContext.ADMIN_INFO || { id: 'system' };

    const { id } = data || {};

    // Delete promotion products first
    const productsResult = await db.collection('promotion_products')
      .where({ promotionId: id })
      .get();

    for (const product of productsResult.data) {
      await db.collection('promotion_products').doc(product._id).remove();
    }

    // Delete promotion stats
    const statsResult = await db.collection('promotion_stats')
      .where({ promotionId: id })
      .get();

    for (const stat of statsResult.data) {
      await db.collection('promotion_stats').doc(stat._id).remove();
    }

    // Delete promotion
    await db.collection('promotions').doc(id).remove();

    await logOperation(adminInfo.id, 'deletePromotion', { promotionId: id });

    return {
      code: 0,
      msg: '活动删除成功'
    };
  } catch (error) {
    console.error('Delete promotion error:', error);
    return { code: 500, msg: error.message };
  }
}

/**
 * Get promotion products
 */
async function getPromotionProductsAdmin(data) {
  try {
    const { promotionId } = data || {};

    const productsResult = await db.collection('promotion_products')
      .where({ promotionId })
      .get();

    // Get full product details
    const productsWithDetails = await Promise.all(
      productsResult.data.map(async (pp) => {
        const productResult = await db.collection('products')
          .doc(pp.productId)
          .get();

        return {
          ...pp,
          product: productResult.data || null
        };
      })
    );

    return {
      code: 0,
      data: productsWithDetails
    };
  } catch (error) {
    console.error('Get promotion products error:', error);
    return { code: 500, msg: error.message };
  }
}

/**
 * Add products to promotion
 */
async function addPromotionProductsAdmin(data, wxContext) {
  try {
    const adminInfo = wxContext.ADMIN_INFO || { id: 'system' };

    const { promotionId, products } = data || {};

    // products should be an array of { productId, discountPrice, stockLimit }
    const results = [];

    for (const p of products) {
      const result = await db.collection('promotion_products').add({
        data: {
          promotionId,
          productId: p.productId,
          discountPrice: p.discountPrice || 0,
          stockLimit: p.stockLimit || 0,
          soldCount: 0,
          createTime: new Date()
        }
      });
      results.push(result);
    }

    await logOperation(adminInfo.id, 'addPromotionProducts', {
      promotionId,
      count: products.length
    });

    return {
      code: 0,
      data: { count: results.length },
      msg: `成功添加 ${results.length} 个商品`
    };
  } catch (error) {
    console.error('Add promotion products error:', error);
    return { code: 500, msg: error.message };
  }
}

/**
 * Remove product from promotion
 */
async function removePromotionProductAdmin(data, wxContext) {
  try {
    const adminInfo = wxContext.ADMIN_INFO || { id: 'system' };

    const { id } = data || {};

    await db.collection('promotion_products').doc(id).remove();

    await logOperation(adminInfo.id, 'removePromotionProduct', { id });

    return {
      code: 0,
      msg: '商品已从活动中移除'
    };
  } catch (error) {
    console.error('Remove promotion product error:', error);
    return { code: 500, msg: error.message };
  }
}

/**
 * Get promotion activity stats
 */
async function getPromotionActivityStatsAdmin(data) {
  try {
    const { promotionId, startDate, endDate } = data || {};

    let query = { promotionId };

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const statsResult = await db.collection('promotion_stats')
      .where(query)
      .orderBy('date', 'asc')
      .get();

    // Calculate totals
    const totals = statsResult.data.reduce((acc, stat) => {
      return {
        views: acc.views + (stat.views || 0),
        orders: acc.orders + (stat.orders || 0),
        sales: acc.sales + (stat.sales || 0)
      };
    }, { views: 0, orders: 0, sales: 0 });

    return {
      code: 0,
      data: {
        daily: statsResult.data,
        totals
      }
    };
  } catch (error) {
    console.error('Get promotion stats error:', error);
    return { code: 500, msg: error.message };
  }
}

// ==================== Refund Management Functions ====================

/**
 * 获取退款列表
 */
async function getRefundListAdmin(data) {
  try {
    const { page = 1, limit = 20, status, keyword, startDate, endDate } = data || {};
    const skip = (page - 1) * limit;

    let query = {};

    if (status && status !== 'all') {
      query.refundStatus = status;
    }

    if (keyword) {
      query.$or = [
        { refundNo: db.RegExp({ regexp: keyword, options: 'i' }) },
        { orderNo: db.RegExp({ regexp: keyword, options: 'i' }) }
      ];
    }

    if (startDate || endDate) {
      query.createTime = {};
      if (startDate) query.createTime.$gte = new Date(startDate);
      if (endDate) query.createTime.$lte = new Date(endDate);
    }

    const [refundsResult, countResult] = await Promise.all([
      db.collection('refunds')
        .where(query)
        .orderBy('createTime', 'desc')
        .skip(skip)
        .limit(limit)
        .get(),
      db.collection('refunds').where(query).count()
    ]);

    // 获取关联的用户和订单信息
    const refundsWithDetails = await Promise.all(
      refundsResult.data.map(async (refund) => {
        // 获取用户信息
        const userResult = await db.collection('users')
          .where({ _openid: refund._openid })
          .limit(1)
          .get();

        // 获取订单信息
        const orderResult = await db.collection('orders')
          .where({ _id: refund.orderId })
          .limit(1)
          .get();

        return {
          ...refund,
          user: userResult.data[0] || null,
          order: orderResult.data[0] || null
        };
      })
    );

    return {
      code: 0,
      data: {
        list: refundsWithDetails,
        total: countResult.total,
        page,
        limit,
        totalPages: Math.ceil(countResult.total / limit)
      }
    };
  } catch (error) {
    console.error('Get refund list error:', error);
    return { code: 500, msg: error.message };
  }
}

/**
 * 获取退款详情
 */
async function getRefundDetailAdmin(data) {
  try {
    const { refundId } = data || {};

    if (!refundId) {
      return { code: 400, msg: '缺少退款ID' };
    }

    const refundResult = await db.collection('refunds').doc(refundId).get();

    if (!refundResult.data) {
      return { code: 404, msg: '退款记录不存在' };
    }

    const refund = refundResult.data;

    // 获取关联的用户和订单信息
    const [userResult, orderResult] = await Promise.all([
      db.collection('users').where({ _openid: refund._openid }).limit(1).get(),
      db.collection('orders').where({ _id: refund.orderId }).limit(1).get()
    ]);

    return {
      code: 0,
      data: {
        refund: refund,
        user: userResult.data[0] || null,
        order: orderResult.data[0] || null
      }
    };
  } catch (error) {
    console.error('Get refund detail error:', error);
    return { code: 500, msg: error.message };
  }
}

/**
 * 审核通过退款
 */
async function approveRefundAdmin(data, wxContext) {
  try {
    const adminInfo = wxContext.ADMIN_INFO || { id: 'system' };

    const { refundId, refundAmount, remark } = data || {};

    if (!refundId) {
      return { code: 400, msg: '缺少退款ID' };
    }

    // 获取退款记录
    const refundResult = await db.collection('refunds').doc(refundId).get();

    if (!refundResult.data) {
      return { code: 404, msg: '退款记录不存在' };
    }

    const refund = refundResult.data;

    // 验证退款状态
    if (refund.refundStatus !== 'pending') {
      return { code: 400, msg: '当前状态不允许审核' };
    }

    // 获取订单信息
    const orderResult = await db.collection('orders')
      .where({ _id: refund.orderId })
      .get();

    if (orderResult.data.length === 0) {
      return { code: 404, msg: '订单不存在' };
    }

    const order = orderResult.data[0];

    // 根据退款类型处理
    if (refund.refundType === 'only_refund') {
      // 仅退款：直接执行退款
      return await executeRefund(refund, order, adminInfo, refundAmount, remark);
    } else {
      // 退货退款：更新状态为approved，等待用户退货
      await db.collection('refunds').doc(refundId).update({
        data: {
          refundStatus: 'approved',
          auditBy: adminInfo.id,
          auditTime: new Date(),
          auditRemark: remark,
          updateTime: new Date()
        }
      });

      await logOperation(adminInfo.id, 'approveRefund', {
        refundId,
        refundType: 'return_refund',
        remark
      });

      return {
        code: 0,
        msg: '已同意退货申请，等待用户寄回商品'
      };
    }
  } catch (error) {
    console.error('Approve refund error:', error);
    return { code: 500, msg: error.message };
  }
}

/**
 * 执行退款（内部函数）
 */
async function executeRefund(refund, order, adminInfo, customRefundAmount, remark) {
  try {
    const finalRefundAmount = customRefundAmount || refund.refundAmount;

    // 根据订单支付方式执行退款
    if (order.paymentMethod === 'wechat' || !order.paymentMethod) {
      // 微信支付退款
      const wechatpayResult = await cloud.callFunction({
        name: 'wechatpay',
        data: {
          action: 'createRefund',
          data: {
            orderNo: order.orderNo,
            refundNo: refund.refundNo,
            refundAmount: finalRefundAmount,
            reason: refund.refundReason
          }
        }
      });

      if (!wechatpayResult.result.success) {
        throw new Error(wechatpayResult.result.message || '微信退款失败');
      }

      // 更新退款记录状态
      await db.collection('refunds').doc(refund._id).update({
        data: {
          refundStatus: 'processing',
          auditBy: adminInfo.id,
          auditTime: new Date(),
          auditRemark: remark,
          updateTime: new Date()
        }
      });
    } else if (order.paymentMethod === 'balance') {
      // 余额支付退款：直接增加用户钱包余额
      const WALLETS_COLLECTION = 'user_wallets';
      const TRANSACTIONS_COLLECTION = 'wallet_transactions';

      // 增加钱包余额
      const walletRes = await db.collection(WALLETS_COLLECTION)
        .where({ _openid: refund._openid })
        .get();

      if (walletRes.data.length > 0) {
        await db.collection(WALLETS_COLLECTION).doc(walletRes.data[0]._id).update({
          data: {
            balance: _.inc(finalRefundAmount),
            updateTime: db.serverDate()
          }
        });
      } else {
        // 钱包不存在，创建新钱包
        await db.collection(WALLETS_COLLECTION).add({
          data: {
            _openid: refund._openid,
            balance: finalRefundAmount,
            totalRecharge: 0,
            totalGift: 0,
            updateTime: db.serverDate()
          }
        });
      }

      // 创建交易记录
      await db.collection(TRANSACTIONS_COLLECTION).add({
        data: {
          _openid: refund._openid,
          type: 'refund',
          amount: finalRefundAmount,
          title: '订单退款',
          description: `订单 ${order.orderNo} 退款`,
          orderId: order._id,
          refundId: refund._id,
          status: 'success',
          createTime: db.serverDate()
        }
      });

      // 更新退款记录状态为成功
      await db.collection('refunds').doc(refund._id).update({
        data: {
          refundStatus: 'success',
          auditBy: adminInfo.id,
          auditTime: new Date(),
          auditRemark: remark,
          successTime: db.serverDate(),
          updateTime: db.serverDate()
        }
      });

      // 更新订单退款金额
      await db.collection('orders').doc(order._id).update({
        data: {
          refundAmount: _.inc(finalRefundAmount),
          refundStatus: _.inc(finalRefundAmount) >= (order.totalAmount || 0) ? 'full' : 'partial',
          updateTime: db.serverDate()
        }
      });

      // 触发奖励扣回
      await triggerRewardDeduction(order._id, finalRefundAmount, order.totalAmount);

      // 🔧 恢复库存（根据退款商品）- 带幂等性保护
      if (!refund.stockRestored) {
        try {
          if (refund.products && refund.products.length > 0) {
            for (const item of refund.products) {
              // 获取当前库存（用于记录流水）
              const productRes = await db.collection('products').doc(item.productId).get();
              const beforeStock = productRes.data?.stock || 0;
              const restoreQty = item.refundQuantity || item.quantity;

              // 恢复产品库存
              await db.collection('products')
                .doc(item.productId)
                .update({
                  data: {
                    stock: _.inc(restoreQty),
                    updateTime: db.serverDate()
                  }
                });

              const afterStock = beforeStock + restoreQty;

              console.log(`[余额退款-库存恢复] 产品库存已恢复`, {
                productId: item.productId,
                productName: item.productName,
                restoredQuantity: restoreQty
              });

              // 创建库存流水记录（退款入库）
              await createInventoryTransaction({
                productId: item.productId,
                productName: item.productName,
                sku: item.skuName || item.skuId || '',
                type: 'refund_in',
                quantity: restoreQty,
                beforeStock,
                afterStock,
                relatedId: refund._id,
                relatedNo: refund.refundNo,
                operatorId: adminInfo.id,
                operatorName: adminInfo.username || '管理员',
                remark: `退款入库 - ${refund.refundNo}`
              });

              // 如果有SKU，同时恢复SKU库存
              if (item.skuId) {
                await db.collection('products')
                  .where({
                    _id: item.productId,
                    'skus._id': item.skuId
                  })
                  .update({
                    data: {
                      'skus.$.stock': _.inc(restoreQty),
                      updateTime: db.serverDate()
                    }
                  });
              }
            }
          }

          // 标记库存已恢复
          await db.collection('refunds').doc(refund._id).update({
            data: {
              stockRestored: true,
              stockRestoreTime: db.serverDate()
            }
          });
          console.log(`[余额退款-库存恢复] 已标记库存恢复完成`, { refundId: refund._id });
        } catch (stockError) {
          console.error(`[余额退款-库存恢复] 异常`, {
            refundId: refund._id,
            error: stockError.message
          });
          // 库存恢复异常不影响退款流程，但需要记录以便人工处理
        }
      } else {
        console.log(`[余额退款-库存恢复] 库存已恢复，跳过`, { refundId: refund._id });
      }

      // 🔧 恢复优惠券（仅全额退款时）- 带幂等性保护
      if (!refund.couponRestored) {
        if (order.couponId && finalRefundAmount >= order.totalAmount) {
          try {
            await db.collection('user_coupons')
              .where({
                _id: order.couponId,
                _openid: refund._openid,
                status: 'used'
              })
              .update({
                data: {
                  status: 'unused',
                  useTime: null,
                  orderNo: null,
                  restoreTime: db.serverDate(),
                  restoreReason: `订单全额退款: ${order.orderNo}`,
                  updateTime: db.serverDate()
                }
              });

            console.log(`[余额退款-优惠券恢复] 优惠券已恢复`, {
              couponId: order.couponId,
              orderNo: order.orderNo
            });
          } catch (couponError) {
            console.error(`[余额退款-优惠券恢复] 异常`, {
              couponId: order.couponId,
              error: couponError.message
            });
            // 优惠券恢复异常不影响退款流程
          }
        }

        // 标记优惠券已处理（无论是否恢复）
        await db.collection('refunds').doc(refund._id).update({
          data: {
            couponRestored: true,
            couponRestoreTime: db.serverDate()
          }
        });
      } else {
        console.log(`[余额退款-优惠券恢复] 优惠券已处理，跳过`, { refundId: refund._id });
      }
    }

    await logOperation(adminInfo.id, 'approveRefund', {
      refundId: refund._id,
      refundAmount: finalRefundAmount,
      refundType: refund.refundType
    });

    return {
      code: 0,
      msg: '退款处理成功'
    };
  } catch (error) {
    console.error('Execute refund error:', error);

    // 更新退款状态为失败
    await db.collection('refunds').doc(refund._id).update({
      data: {
        refundStatus: 'failed',
        failedReason: error.message,
        updateTime: new Date()
      }
    });

    throw error;
  }
}

/**
 * 确认收货（退货退款）
 */
async function confirmReceiptAdmin(data, wxContext) {
  try {
    const adminInfo = wxContext.ADMIN_INFO || { id: 'system' };

    const { refundId } = data || {};

    if (!refundId) {
      return { code: 400, msg: '缺少退款ID' };
    }

    // 获取退款记录
    const refundResult = await db.collection('refunds').doc(refundId).get();

    if (!refundResult.data) {
      return { code: 404, msg: '退款记录不存在' };
    }

    const refund = refundResult.data;

    // 验证退款状态
    if (refund.refundStatus !== 'waiting_receive') {
      return { code: 400, msg: '当前状态不是等待收货' };
    }

    // 获取订单信息
    const orderResult = await db.collection('orders')
      .where({ _id: refund.orderId })
      .get();

    if (orderResult.data.length === 0) {
      return { code: 404, msg: '订单不存在' };
    }

    const order = orderResult.data[0];

    // 执行退款
    await executeRefund(refund, order, adminInfo, null, '管理员确认收货');

    await logOperation(adminInfo.id, 'confirmReceipt', { refundId });

    return {
      code: 0,
      msg: '已确认收货，退款处理中'
    };
  } catch (error) {
    console.error('Confirm receipt error:', error);
    return { code: 500, msg: error.message };
  }
}

/**
 * 拒绝退款
 */
async function rejectRefundAdmin(data, wxContext) {
  try {
    const adminInfo = wxContext.ADMIN_INFO || { id: 'system' };

    const { refundId, reason } = data || {};

    if (!refundId) {
      return { code: 400, msg: '缺少退款ID' };
    }

    if (!reason) {
      return { code: 400, msg: '请填写拒绝原因' };
    }

    // 获取退款记录
    const refundResult = await db.collection('refunds').doc(refundId).get();

    if (!refundResult.data) {
      return { code: 404, msg: '退款记录不存在' };
    }

    const refund = refundResult.data;

    // 验证退款状态
    if (refund.refundStatus !== 'pending') {
      return { code: 400, msg: '当前状态不允许拒绝' };
    }

    // 更新退款状态
    await db.collection('refunds').doc(refundId).update({
      data: {
        refundStatus: 'rejected',
        rejectReason: reason,
        auditBy: adminInfo.id,
        auditTime: new Date(),
        updateTime: new Date()
      }
    });

    await logOperation(adminInfo.id, 'rejectRefund', { refundId, reason });

    return {
      code: 0,
      msg: '已拒绝退款申请'
    };
  } catch (error) {
    console.error('Reject refund error:', error);
    return { code: 500, msg: error.message };
  }
}

/**
 * 重试失败的退款
 */
async function retryRefundAdmin(data, wxContext) {
  try {
    const adminInfo = wxContext.ADMIN_INFO || { id: 'system' };

    const { refundId } = data || {};

    if (!refundId) {
      return { code: 400, msg: '缺少退款ID' };
    }

    // 获取退款记录
    const refundResult = await db.collection('refunds').doc(refundId).get();

    if (!refundResult.data) {
      return { code: 404, msg: '退款记录不存在' };
    }

    const refund = refundResult.data;

    // 验证退款状态
    if (refund.refundStatus !== 'failed') {
      return { code: 400, msg: '只有失败状态的退款才能重试' };
    }

    // 获取订单信息
    const orderResult = await db.collection('orders')
      .where({ _id: refund.orderId })
      .get();

    if (orderResult.data.length === 0) {
      return { code: 404, msg: '订单不存在' };
    }

    const order = orderResult.data[0];

    // 重置退款状态为pending，重新执行审核
    await db.collection('refunds').doc(refundId).update({
      data: {
        refundStatus: 'pending',
        failedReason: null,
        updateTime: new Date()
      }
    });

    // 重新执行退款
    await executeRefund(refund, order, adminInfo, null, '管理员重试退款');

    await logOperation(adminInfo.id, 'retryRefund', { refundId });

    return {
      code: 0,
      msg: '退款重试成功'
    };
  } catch (error) {
    console.error('Retry refund error:', error);
    return { code: 500, msg: error.message };
  }
}

/**
 * 触发推广奖励扣回
 */
async function triggerRewardDeduction(orderId, refundAmount, totalOrderAmount) {
  try {
    // 计算退款比例
    const refundRatio = refundAmount / totalOrderAmount;

    console.log(`[奖励扣回] 订单: ${orderId}, 退款金额: ${refundAmount}, 订单总额: ${totalOrderAmount}, 扣回比例: ${refundRatio}`);

    // 调用rewardSettlement云函数扣回奖励
    const result = await cloud.callFunction({
      name: 'rewardSettlement',
      data: {
        action: 'cancelOrderRewards',
        orderId: orderId,
        refundRatio: refundRatio
      }
    });

    if (result.result.code !== 0) {
      console.error('奖励扣回失败:', result.result.msg);
    } else {
      console.log('奖励扣回成功');
    }
  } catch (error) {
    console.error('触发奖励扣回失败:', error);
  }
}

// ==================== Address Management Functions ====================

/**
 * 获取地址列表
 */
async function getAddressesAdmin(data) {
  try {
    const { page = 1, limit = 20, keyword } = data || {};
    const skip = (page - 1) * limit;

    let query = {};

    // 关键词搜索：按用户昵称搜索
    if (keyword) {
      // 首先搜索匹配的用户
      const usersResult = await db.collection('users')
        .where({
          nickName: db.RegExp({
            regexp: keyword,
            options: 'i'
          })
        })
        .field({
          _openid: true
        })
        .get();

      if (usersResult.data.length > 0) {
        const openidList = usersResult.data.map(u => u._openid);
        query._openid = _.in(openidList);
      } else {
        // 如果没有匹配用户，返回空结果
        query._openid = _.in(['__nonexistent__']);
      }
    }

    const [addressesResult, countResult] = await Promise.all([
      db.collection('addresses')
        .where(query)
        .orderBy('createTime', 'desc')
        .skip(skip)
        .limit(limit)
        .get(),
      db.collection('addresses').where(query).count()
    ]);

    // 获取关联的用户信息
    const addressesWithUsers = await Promise.all(
      addressesResult.data.map(async (address) => {
        const userResult = await db.collection('users')
          .where({ _openid: address._openid })
          .field({
            _id: true,
            _openid: true,
            nickName: true,
            avatarUrl: true
          })
          .limit(1)
          .get();

        return {
          ...address,
          user: userResult.data[0] || null
        };
      })
    );

    // 统计数据
    const [totalAddresses, defaultAddresses, totalUsers] = await Promise.all([
      db.collection('addresses').count(),
      db.collection('addresses').where({ isDefault: true }).count(),
      db.collection('users').count()
    ]);

    return {
      code: 0,
      data: {
        list: addressesWithUsers,
        total: countResult.total,
        page,
        limit,
        totalPages: Math.ceil(countResult.total / limit),
        totalAddresses: totalAddresses.total,
        defaultAddresses: defaultAddresses.total,
        totalUsers: totalUsers.total
      }
    };
  } catch (error) {
    console.error('Get addresses error:', error);
    return { code: 500, msg: error.message };
  }
}

/**
 * 删除地址
 */
async function deleteAddressAdmin(data, wxContext) {
  try {
    const adminInfo = wxContext.ADMIN_INFO || { id: 'system' };
    const { addressId, openid } = data || {};

    if (!addressId) {
      return { code: 400, msg: '缺少地址ID' };
    }

    if (!openid) {
      return { code: 400, msg: '缺少用户openid' };
    }

    // 删除地址
    await db.collection('addresses').doc(addressId).remove();

    await logOperation(adminInfo.id, 'deleteAddress', { addressId, openid });

    return {
      code: 0,
      msg: '地址删除成功'
    };
  } catch (error) {
    console.error('Delete address error:', error);
    return { code: 500, msg: error.message };
  }
}

// ==================== Store Management Functions ====================

/**
 * 获取门店信息
 */
async function getStoreInfoAdmin(data) {
  try {
    // 从配置集合中获取门店信息
    const result = await db.collection('system_config')
      .where({ type: 'store_info' })
      .limit(1)
      .get();

    if (result.data.length === 0) {
      // 返回默认门店信息
      return {
        code: 0,
        data: {
          name: '大友元气精酿啤酒总店',
          address: '',
          phone: '',
          latitude: null,
          longitude: null,
          openTime: '09:00',
          closeTime: '22:00',
          isOpen: true,
          description: ''
        }
      };
    }

    return {
      code: 0,
      data: result.data[0].config || {}
    };
  } catch (error) {
    console.error('Get store info error:', error);
    return { code: 500, msg: error.message };
  }
}

/**
 * 更新门店信息
 */
async function updateStoreInfoAdmin(data, wxContext) {
  try {
    const adminInfo = wxContext.ADMIN_INFO || { id: 'system' };

    // 检查是否已存在门店配置
    const existingResult = await db.collection('system_config')
      .where({ type: 'store_info' })
      .limit(1)
      .get();

    const configData = {
      type: 'store_info',
      config: {
        ...data,
        updateTime: new Date()
      },
      updateTime: new Date()
    };

    if (existingResult.data.length > 0) {
      // 更新现有配置
      await db.collection('system_config')
        .doc(existingResult.data[0]._id)
        .update({ data: configData });
    } else {
      // 创建新配置
      await db.collection('system_config').add({
        data: {
          ...configData,
          createTime: new Date()
        }
      });
    }

    await logOperation(adminInfo.id, 'updateStoreInfo', data);

    return {
      code: 0,
      msg: '门店信息更新成功'
    };
  } catch (error) {
    console.error('Update store info error:', error);
    return { code: 500, msg: error.message };
  }
}

// ==================== Wallet Management Functions ====================

/**
 * 获取钱包交易记录
 */
async function getWalletTransactionsAdmin(data) {
  try {
    const { page = 1, limit = 20, type } = data || {};
    const skip = (page - 1) * limit;

    let query = {};

    if (type && type !== 'all') {
      query.type = type;
    }

    const [transactionsResult, countResult] = await Promise.all([
      db.collection('wallet_transactions')
        .where(query)
        .orderBy('createTime', 'desc')
        .skip(skip)
        .limit(limit)
        .get(),
      db.collection('wallet_transactions').where(query).count()
    ]);

    // 获取关联的用户信息
    const transactionsWithUsers = await Promise.all(
      transactionsResult.data.map(async (transaction) => {
        const userResult = await db.collection('users')
          .where({ _openid: transaction._openid })
          .field({
            _id: true,
            _openid: true,
            nickName: true,
            avatarUrl: true
          })
          .limit(1)
          .get();

        return {
          ...transaction,
          user: userResult.data[0] || null
        };
      })
    );

    // 统计数据
    const walletsResult = await db.collection('user_wallets').get();
    const totalBalance = walletsResult.data.reduce((sum, w) => sum + (w.balance || 0), 0);
    const totalRecharge = walletsResult.data.reduce((sum, w) => sum + (w.totalRecharge || 0), 0);
    const totalConsume = walletsResult.data.reduce((sum, w) => sum + (w.totalConsume || 0), 0);

    return {
      code: 0,
      data: {
        list: transactionsWithUsers,
        total: countResult.total,
        page,
        limit,
        totalPages: Math.ceil(countResult.total / limit),
        totalBalance,
        totalRecharge,
        totalConsume
      }
    };
  } catch (error) {
    console.error('Get wallet transactions error:', error);
    return { code: 500, msg: error.message };
  }
}

// ==================== Commission Wallet Functions ====================

/**
 * 获取佣金钱包数据
 */
async function getCommissionWalletsAdmin(data) {
  try {
    const { page = 1, limit = 20, status, type } = data || {};
    const skip = (page - 1) * limit;

    let query = {};

    if (status && status !== 'all') {
      query.status = status;
    }

    if (type && type !== 'all') {
      query.rewardType = type;
    }

    const [commissionsResult, countResult] = await Promise.all([
      db.collection('reward_records')
        .where(query)
        .orderBy('createTime', 'desc')
        .skip(skip)
        .limit(limit)
        .get(),
      db.collection('reward_records').where(query).count()
    ]);

    // 获取关联的用户信息（受益人）
    const commissionsWithUsers = await Promise.all(
      commissionsResult.data.map(async (commission) => {
        // beneficiaryId 是佣金受益人的 openid
        const userResult = await db.collection('users')
          .where({ _openid: commission.beneficiaryId })
          .field({
            _id: true,
            _openid: true,
            nickName: true,
            avatarUrl: true
          })
          .limit(1)
          .get();

        return {
          ...commission,
          user: userResult.data[0] || null
        };
      })
    );

    // 统计数据
    const allCommissions = await db.collection('reward_records').get();
    const totalCommission = allCommissions.data.reduce((sum, r) => sum + (r.amount || 0), 0);
    const settledCommission = allCommissions.data
      .filter(r => r.status === 'settled')
      .reduce((sum, r) => sum + (r.amount || 0), 0);
    const pendingCommission = allCommissions.data
      .filter(r => r.status === 'pending')
      .reduce((sum, r) => sum + (r.amount || 0), 0);

    // 从佣金钱包获取提现数据
    const commissionWalletsResult = await db.collection('commission_wallets').get();
    const withdrawnAmount = commissionWalletsResult.data
      .reduce((sum, w) => sum + (w.totalWithdrawn || 0), 0);

    // 待审核提现数量
    const pendingWithdrawalsResult = await db.collection('withdrawals')
      .where({ status: 'pending' })
      .count();

    return {
      code: 0,
      data: {
        list: commissionsWithUsers,
        total: countResult.total,
        page,
        limit,
        totalPages: Math.ceil(countResult.total / limit),
        totalCommission,
        settledCommission,
        pendingCommission,
        withdrawnAmount,
        pendingWithdrawals: pendingWithdrawalsResult.total
      }
    };
  } catch (error) {
    console.error('Get commission wallets error:', error);
    return { code: 500, msg: error.message };
  }
}

// ==================== System Configuration Functions ====================

/**
 * 获取系统配置
 */
async function getSystemConfigAdmin(data) {
  try {
    // 从配置集合中获取系统配置
    const result = await db.collection('system_config')
      .where({ type: 'commission_config' })
      .limit(1)
      .get();

    if (result.data.length === 0) {
      // 返回默认配置
      return {
        code: 0,
        data: {
          level1Commission: 20,
          level2Commission: 12,
          level3Commission: 8,
          level4Commission: 4,
          bronzeThreshold: 1000,
          silverSalesThreshold: 5000,
          goldSalesThreshold: 20000,
          silverTeamThreshold: 30,
          goldTeamThreshold: 100,
          withdrawalMinAmount: 100,
          withdrawalMaxAmount: 50000,
          withdrawalFeeRate: 0
        }
      };
    }

    return {
      code: 0,
      data: result.data[0].config || {}
    };
  } catch (error) {
    console.error('Get system config error:', error);
    return { code: 500, msg: error.message };
  }
}

/**
 * 更新系统配置
 */
async function updateSystemConfigAdmin(data, wxContext) {
  try {
    const adminInfo = wxContext.ADMIN_INFO || { id: 'system' };

    // 验证数据格式
    const numericFields = [
      'level1Commission', 'level2Commission', 'level3Commission', 'level4Commission',
      'bronzeThreshold', 'silverSalesThreshold', 'goldSalesThreshold',
      'silverTeamThreshold', 'goldTeamThreshold',
      'withdrawalMinAmount', 'withdrawalMaxAmount', 'withdrawalFeeRate'
    ];

    const configData = {};
    for (const field of numericFields) {
      if (data[field] !== undefined) {
        const value = parseFloat(data[field]);
        if (isNaN(value)) {
          return { code: 400, msg: `${field} 必须是数字` };
        }
        configData[field] = value;
      }
    }

    // 检查是否已存在配置
    const existingResult = await db.collection('system_config')
      .where({ type: 'commission_config' })
      .limit(1)
      .get();

    const updateData = {
      type: 'commission_config',
      config: {
        ...configData,
        updateTime: new Date()
      },
      updateTime: new Date()
    };

    if (existingResult.data.length > 0) {
      // 更新现有配置
      await db.collection('system_config')
        .doc(existingResult.data[0]._id)
        .update({ data: updateData });
    } else {
      // 创建新配置
      await db.collection('system_config').add({
        data: {
          ...updateData,
          createTime: new Date()
        }
      });
    }

    await logOperation(adminInfo.id, 'updateSystemConfig', configData);

    return {
      code: 0,
      msg: '系统配置更新成功'
    };
  } catch (error) {
    console.error('Update system config error:', error);
    return { code: 500, msg: error.message };
  }
}

