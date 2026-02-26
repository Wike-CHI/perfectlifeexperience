const cloud = require('wx-server-sdk')
const jwt = require('jsonwebtoken')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command
const { verifyAdmin, hasPermission, logOperation, getDefaultPermissions } = require('./auth')
const { getRequiredPermission } = require('./permissions')
// 微信商家转账功能 (需先开通权限)
let wechatTransfer = null
try {
  wechatTransfer = require('./wechat-transfer')
} catch (error) {
  console.warn('微信转账模块未加载,请确保已开通权限并配置正确:', error.message)
}
const {
  isValidObjectId,
  validateOrderStatus,
  validatePaginationParams,
  validateWithdrawalAction,
  validateProductData,
  sanitizeUpdateData
} = require('./validator')

// JWT配置 - 必须从环境变量获取
const JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required')
}
const JWT_EXPIRES_IN = '7d' // 7天过期

// Main entry point
exports.main = async (event, context) => {
  const { action, data } = event
  const wxContext = cloud.getWXContext()

  try {
    // 权限验证中间件
    const requiredPermission = getRequiredPermission(action)

    // 如果需要权限验证
    if (requiredPermission !== null) {
      // 从请求中获取管理员信息（前端应该传递 adminToken）
      const adminToken = data.adminToken || event.adminToken

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
        return await getDashboardData(data)
      case 'checkAuth':
        return { success: true, message: 'Admin API connected', openId: wxContext.OPENID }
      case 'checkAdminStatus':
        return await checkAdminStatus(wxContext)
      case 'getProducts':
        return await getProductsList(data)
      case 'getProductDetail':
        return await getProductDetailAdmin(data)
      case 'createProduct':
        return await createProductAdmin(data, wxContext)
      case 'updateProduct':
        return await updateProductAdmin(data, wxContext)
      case 'deleteProduct':
        return await deleteProductAdmin(data, wxContext)
      case 'adjustProductStock':
        return await adjustProductStock(data, wxContext)
      case 'getCategories':
        return await getCategoriesAdmin()
      case 'getOrders':
        return await getOrdersAdmin(data)
      case 'getOrderDetail':
        return await getOrderDetailAdmin(data)
      case 'updateOrderStatus':
        return await updateOrderStatusAdmin(data, wxContext)
      case 'searchOrderByExpress':
        return await searchOrderByExpress(data)
      case 'updateOrderExpress':
        return await updateOrderExpressAdmin(data, wxContext)
      case 'getAnnouncements':
        return await getAnnouncementsAdmin(data)
      case 'createAnnouncement':
        return await createAnnouncementAdmin(data, wxContext)
      case 'updateAnnouncement':
        return await updateAnnouncementAdmin(data, wxContext)
      case 'deleteAnnouncement':
        return await deleteAnnouncementAdmin(data, wxContext)
      case 'getPromotionStats':
        return await getPromotionStatsAdmin(data)
      case 'getUsers':
        return await getUsersAdmin(data)
      case 'getUserDetail':
        return await getUserDetailAdmin(data)
      case 'getUserWallet':
        return await getUserWalletAdmin(data)
      case 'getPromotionPath':
        return await getPromotionPathAdmin(data)
      case 'getUserOrders':
        return await getUserOrdersAdmin(data)
      case 'getUserRewards':
        return await getUserRewardsAdmin(data)
      case 'getWithdrawals':
        return await getWithdrawalsAdmin(data)
      case 'approveWithdrawal':
        return await approveWithdrawalAdmin(data, wxContext)
      case 'rejectWithdrawal':
        return await rejectWithdrawalAdmin(data, wxContext)
      case 'getPromoters':
        return await getPromotersAdmin(data)
      case 'getCommissions':
        return await getCommissionsAdmin(data)
      case 'getCoupons':
        return await getCouponsAdmin(data)
      case 'createCoupon':
        return await createCouponAdmin(data, wxContext)
      case 'updateCoupon':
        return await updateCouponAdmin(data, wxContext)
      case 'deleteCoupon':
        return await deleteCouponAdmin(data, wxContext)
      case 'getBanners':
        return await getBannersAdmin(data)
      case 'createBanner':
        return await createBannerAdmin(data, wxContext)
      case 'updateBanner':
        return await updateBannerAdmin(data, wxContext)
      case 'deleteBanner':
        return await deleteBannerAdmin(data, wxContext)
      case 'getCouponDetail':
        return await getCouponDetailAdmin(data)
      case 'getBannerDetail':
        return await getBannerDetailAdmin(data)
      case 'getTeamMembers':
        return await getTeamMembersAdmin(data)
      // Activity Management APIs
      case 'getPromotions':
        return await getPromotionsAdmin(data)
      case 'getPromotionDetail':
        return await getPromotionDetailAdmin(data)
      case 'createPromotion':
        return await createPromotionAdmin(data, wxContext)
      case 'updatePromotion':
        return await updatePromotionAdmin(data, wxContext)
      case 'deletePromotion':
        return await deletePromotionAdmin(data, wxContext)
      case 'getPromotionProducts':
        return await getPromotionProductsAdmin(data)
      case 'addPromotionProducts':
        return await addPromotionProductsAdmin(data, wxContext)
      case 'removePromotionProduct':
        return await removePromotionProductAdmin(data, wxContext)
      case 'getPromotionActivityStats':
        return await getPromotionActivityStatsAdmin(data)
      // Refund Management APIs
      case 'getRefundList':
        return await getRefundListAdmin(data)
      case 'getRefundDetail':
        return await getRefundDetailAdmin(data)
      case 'approveRefund':
        return await approveRefundAdmin(data, wxContext)
      case 'confirmReceipt':
        return await confirmReceiptAdmin(data, wxContext)
      case 'rejectRefund':
        return await rejectRefundAdmin(data, wxContext)
      case 'retryRefund':
        return await retryRefundAdmin(data, wxContext)
      // Address Management APIs
      case 'getAddresses':
        return await getAddressesAdmin(data)
      case 'deleteAddress':
        return await deleteAddressAdmin(data, wxContext)
      // Store Management APIs
      case 'getStoreInfo':
        return await getStoreInfoAdmin(data)
      case 'updateStoreInfo':
        return await updateStoreInfoAdmin(data, wxContext)
      // Wallet Management APIs
      case 'getWalletTransactions':
        return await getWalletTransactionsAdmin(data)
      // Commission Wallet APIs
      case 'getCommissionWallets':
        return await getCommissionWalletsAdmin(data)
      // System Configuration APIs
      case 'getSystemConfig':
        return await getSystemConfigAdmin(data)
      case 'updateSystemConfig':
        return await updateSystemConfigAdmin(data, wxContext)
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

    // 验证 JWT token
    let decoded;
    try {
      decoded = jwt.verify(adminToken, JWT_SECRET);
    } catch (error) {
      return {
        authorized: false,
        message: 'Token无效或已过期'
      }
    }

    // 从数据库查询管理员信息（确保账号仍然有效）
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
  const { username, password } = data;

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

    const [todayOrdersResult, monthOrdersResult, usersResult, pendingShipments, recentOrdersData] = await Promise.all([
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
        .get()
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
          { type: 'withdrawal', count: 0 }
        ],
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
    const [totalPromoters, totalTeams, totalRewards, recentOrders] = await Promise.all([
      db.collection('users').where({ starLevel: _.gte(1) }).count(),
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

// Product functions
async function getProductsList(data) {
  try {
    const { page = 1, limit = 20, category, keyword, status } = data;
    const skip = (page - 1) * limit;

    let query = {};

    if (category && category !== 'all') {
      query.category = category;
    }

    if (keyword) {
      query.name = db.RegExp({
        regexp: keyword,
        options: 'i'
      });
    }

    if (status === 'active') {
      query.stock = _.gte(1);
    } else if (status === 'inactive') {
      query.stock = 0;
    }

    const [productsResult, categoriesResult] = await Promise.all([
      db.collection('products')
        .where(query)
        .orderBy('createTime', 'desc')
        .skip(skip)
        .limit(limit)
        .get(),
      db.collection('categories')
        .where({ isActive: true })
        .orderBy('sort', 'asc')
        .get()
    ]);

    const countResult = await db.collection('products').where(query).count();

    return {
      code: 0,
      data: {
        list: productsResult.data,
        total: countResult.total,
        page,
        limit,
        totalPages: Math.ceil(countResult.total / limit),
        categories: categoriesResult.data
      }
    };
  } catch (error) {
    console.error('Get products error:', error);
    return { code: 500, msg: error.message };
  }
}

async function getProductDetailAdmin(data) {
  try {
    const { id } = data;

    const productResult = await db.collection('products').doc(id).get();

    if (!productResult.data) {
      return { code: 404, msg: '商品不存在' };
    }

    const categoriesResult = await db.collection('categories')
      .where({ isActive: true })
      .orderBy('sort', 'asc')
      .get();

    return {
      code: 0,
      data: {
        product: productResult.data,
        categories: categoriesResult.data
      }
    };
  } catch (error) {
    console.error('Get product detail error:', error);
    return { code: 500, msg: error.message };
  }
}

async function createProductAdmin(data, wxContext) {
  try {
    const adminInfo = wxContext.ADMIN_INFO || { id: 'system' };

    const productData = {
      ...data,
      createTime: new Date(),
      updateTime: new Date(),
      sales: 0,
      rating: 0
    };

    const result = await db.collection('products').add({
      data: productData
    });

    await logOperation(adminInfo.id, 'createProduct', {
      productId: result._id,
      name: data.name
    });

    return {
      code: 0,
      data: { id: result._id },
      msg: '商品创建成功'
    };
  } catch (error) {
    console.error('Create product error:', error);
    return { code: 500, msg: error.message };
  }
}

async function updateProductAdmin(data, wxContext) {
  try {
    const adminInfo = wxContext.ADMIN_INFO || { id: 'system' };

    // 验证输入
    if (!isValidObjectId(data.id)) {
      return { code: 400, msg: '商品ID格式无效' };
    }

    const { id, ...updateData } = data;

    // 清理不允许更新的字段
    updateData = sanitizeUpdateData(updateData, ['_id', '_openid', 'createTime']);

    // 添加更新时间
    updateData.updateTime = new Date();

    await db.collection('products').doc(id).update({
      data: updateData
    });

    await logOperation(adminInfo.id, 'updateProduct', {
      productId: id,
      ...updateData
    });

    return {
      code: 0,
      msg: '商品更新成功'
    };
  } catch (error) {
    console.error('Update product error:', error);
    return { code: 500, msg: error.message };
  }
}

async function deleteProductAdmin(data, wxContext) {
  try {
    const adminInfo = wxContext.ADMIN_INFO || { id: 'system' };

    const { id } = data;

    await db.collection('products').doc(id).remove();

    await logOperation(adminInfo.id, 'deleteProduct', { productId: id });

    return {
      code: 0,
      msg: '商品删除成功'
    };
  } catch (error) {
    console.error('Delete product error:', error);
    return { code: 500, msg: error.message };
  }
}

/**
 * 调整商品库存
 */
async function adjustProductStock(data, wxContext) {
  try {
    const adminInfo = wxContext.ADMIN_INFO || { id: 'system' };
    const { productId, delta, reason } = data;

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
    const { page = 1, limit = 20, status, keyword, startDate, endDate } = data;
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
    const { id } = data;

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

    const { orderId, status } = data;

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
    const { expressCode } = data;

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

    const { orderId, expressCode } = data;

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

// Announcement functions
async function getAnnouncementsAdmin(data) {
  try {
    const { page = 1, limit = 20, type, status } = data;
    const skip = (page - 1) * limit;

    let query = {};

    if (type && type !== 'all') {
      query.type = type;
    }

    if (status === 'active') {
      query.isActive = true;
    } else if (status === 'inactive') {
      query.isActive = false;
    }

    const [announcementsResult, countResult] = await Promise.all([
      db.collection('announcements')
        .where(query)
        .orderBy('createTime', 'desc')
        .skip(skip)
        .limit(limit)
        .get(),
      db.collection('announcements').where(query).count()
    ]);

    return {
      code: 0,
      data: {
        list: announcementsResult.data,
        total: countResult.total,
        page,
        limit,
        totalPages: Math.ceil(countResult.total / limit)
      }
    };
  } catch (error) {
    console.error('Get announcements error:', error);
    return { code: 500, msg: error.message };
  }
}

async function createAnnouncementAdmin(data, wxContext) {
  try {
    const adminInfo = wxContext.ADMIN_INFO || { id: 'system' };

    const announcementData = {
      ...data,
      createTime: new Date(),
      publishTime: data.isActive ? new Date() : null
    };

    const result = await db.collection('announcements').add({
      data: announcementData
    });

    await logOperation(adminInfo.id, 'createAnnouncement', {
      announcementId: result.id,
      title: data.title
    });

    return {
      code: 0,
      data: { id: result.id },
      msg: '公告创建成功'
    };
  } catch (error) {
    console.error('Create announcement error:', error);
    return { code: 500, msg: error.message };
  }
}

async function updateAnnouncementAdmin(data, wxContext) {
  try {
    const adminInfo = wxContext.ADMIN_INFO || { id: 'system' };

    const { id, ...updateData } = data;
    if (updateData.isActive && !updateData.publishTime) {
      updateData.publishTime = new Date();
    }

    await db.collection('announcements').doc(id).update({
      data: updateData
    });

    await logOperation(adminInfo.id, 'updateAnnouncement', {
      announcementId: id,
      ...updateData
    });

    return {
      code: 0,
      msg: '公告更新成功'
    };
  } catch (error) {
    console.error('Update announcement error:', error);
    return { code: 500, msg: error.message };
  }
}

async function deleteAnnouncementAdmin(data, wxContext) {
  try {
    const adminInfo = wxContext.ADMIN_INFO || { id: 'system' };

    const { id } = data;

    await db.collection('announcements').doc(id).remove();

    await logOperation(adminInfo.id, 'deleteAnnouncement', { announcementId: id });

    return {
      code: 0,
      msg: '公告删除成功'
    };
  } catch (error) {
    console.error('Delete announcement error:', error);
    return { code: 500, msg: error.message };
  }
}

// User Management functions
async function getUsersAdmin(data) {
  try {
    const { page = 1, pageSize = 20, starLevel, agentLevel, keyword } = data;
    const skip = (page - 1) * pageSize;

    let query = {};

    if (starLevel !== undefined && starLevel >= 0) {
      query['performance.starLevel'] = starLevel;
    }

    if (agentLevel !== undefined && agentLevel >= 0) {
      query.agentLevel = agentLevel;
    }

    if (keyword) {
      query.$or = [
        { nickName: db.RegExp({ regexp: keyword, options: 'i' }) },
        { phoneNumber: db.RegExp({ regexp: keyword, options: 'i' }) },
        { _openid: db.RegExp({ regexp: keyword, options: 'i' }) }
      ];
    }

    const [usersResult, countResult] = await Promise.all([
      db.collection('users')
        .where(query)
        .orderBy('createTime', 'desc')
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

    return {
      code: 0,
      data: {
        list: usersResult.data,
        total: countResult.total,
        page,
        pageSize
      }
    };
  } catch (error) {
    console.error('Get users error:', error);
    return { code: 500, msg: error.message };
  }
}

async function getUserDetailAdmin(data) {
  try {
    const { userId } = data;

    const userResult = await db.collection('users').doc(userId).get();

    if (!userResult.data) {
      return { code: 404, msg: '用户不存在' };
    }

    return {
      code: 0,
      data: userResult.data
    };
  } catch (error) {
    console.error('Get user detail error:', error);
    return { code: 500, msg: error.message };
  }
}

async function getUserWalletAdmin(data) {
  try {
    const { userId } = data;

    const walletResult = await db.collection('wallets')
      .where({ _openid: data.openid || userId })
      .limit(1)
      .get();

    if (walletResult.data.length === 0) {
      return {
        code: 0,
        data: { balance: 0, totalReward: 0, withdrawn: 0 }
      };
    }

    return {
      code: 0,
      data: walletResult.data[0]
    };
  } catch (error) {
    console.error('Get user wallet error:', error);
    return { code: 500, msg: error.message };
  }
}

async function getPromotionPathAdmin(data) {
  try {
    const { userId } = data;

    const userResult = await db.collection('users').doc(userId).get();

    if (!userResult.data) {
      return { code: 404, msg: '用户不存在' };
    }

    const promotionPath = userResult.data.promotionPath || '';

    if (!promotionPath) {
      return {
        code: 0,
        data: []
      };
    }

    const parentIds = promotionPath.split('/').filter(id => id);
    const parents = [];

    for (const parentId of parentIds) {
      const parentResult = await db.collection('users')
        .doc(parentId)
        .field({
          _id: true,
          nickName: true,
          agentLevel: true
        })
        .get();

      if (parentResult.data) {
        parents.push(parentResult.data);
      }
    }

    return {
      code: 0,
      data: parents
    };
  } catch (error) {
    console.error('Get promotion path error:', error);
    return { code: 500, msg: error.message };
  }
}

async function getUserOrdersAdmin(data) {
  try {
    const { userId, limit = 5 } = data;

    const userResult = await db.collection('users').doc(userId).get();

    if (!userResult.data) {
      return { code: 404, msg: '用户不存在' };
    }

    const ordersResult = await db.collection('orders')
      .where({ _openid: userResult.data._openid })
      .orderBy('createTime', 'desc')
      .limit(limit)
      .get();

    return {
      code: 0,
      data: ordersResult.data
    };
  } catch (error) {
    console.error('Get user orders error:', error);
    return { code: 500, msg: error.message };
  }
}

async function getUserRewardsAdmin(data) {
  try {
    const { userId, limit = 5 } = data;

    const userResult = await db.collection('users').doc(userId).get();

    if (!userResult.data) {
      return { code: 404, msg: '用户不存在' };
    }

    const rewardsResult = await db.collection('reward_records')
      .where({ _openid: userResult.data._openid })
      .orderBy('createTime', 'desc')
      .limit(limit)
      .get();

    return {
      code: 0,
      data: rewardsResult.data
    };
  } catch (error) {
    console.error('Get user rewards error:', error);
    return { code: 500, msg: error.message };
  }
}

// Financial Management functions
async function getWithdrawalsAdmin(data) {
  try {
    const { page = 1, limit = 20, status } = data;
    const skip = (page - 1) * limit;

    let query = {};

    if (status && status !== 'all') {
      query.status = status;
    }

    const [withdrawalsResult, countResult] = await Promise.all([
      db.collection('withdrawals')
        .where(query)
        .orderBy('createTime', 'desc')
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
        limit
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

    const { withdrawalId } = data;

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

    // 更新佣金钱包余额 - 解冻并减少余额，增加已提现金额
    await db.collection('commission_wallets')
      .where({ _openid: withdrawal._openid })
      .update({
        data: {
          frozenAmount: _.inc(-withdrawal.amount), // 解冻
          balance: _.inc(-withdrawal.amount),       // 实际扣除
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
    if (wechatTransfer) {
      try {
        // 生成商家批次单号 (格式: WD + 年月日时分秒 + 6位随机数)
        const outBatchNo = `WD${new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14)}${Math.random().toString().slice(2, 8)}`;

        const transferResult = await wechatTransfer.transferToWechatBalance({
          outBatchNo,
          openid: withdrawal._openid,
          amount: withdrawal.amount,
          transferRemark: '佣金钱包提现'
          // userName: withdrawal.realName, // 可选: >0.5元需要填写用户真实姓名(需加密)
        });

        if (transferResult.success) {
          // 更新提现记录为转账中状态
          await db.collection('withdrawals').doc(withdrawalId).update({
            data: {
              transferStatus: 'processing',
              transferBatchId: transferResult.batchId,
              transferTime: new Date()
            }
          });
        } else {
          // 转账失败,记录错误但批准流程已完成
          console.error('微信转账失败:', transferResult.message);
          await db.collection('withdrawals').doc(withdrawalId).update({
            data: {
              transferStatus: 'failed',
              transferError: transferResult.message,
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
            transferError: transferError.message,
            transferTime: new Date()
          }
        });
      }
    } else {
      // 转账功能未启用,记录为需手动转账
      await db.collection('withdrawals').doc(withdrawalId).update({
        data: {
          transferStatus: 'manual',
          transferError: '微信转账功能未配置,需手动转账',
          transferTime: new Date()
        }
      });
    }

    await logOperation(adminInfo.id, 'approveWithdrawal', { withdrawalId, amount: withdrawal.amount });

    return {
      code: 0,
      msg: '提现已批准'
    };
  } catch (error) {
    console.error('Approve withdrawal error:', error);
    return { code: 500, msg: error.message };
  }
}

async function rejectWithdrawalAdmin(data, wxContext) {
  try {
    const adminInfo = wxContext.ADMIN_INFO || { id: 'system' };

    const { withdrawalId, reason } = data;

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
    const { page = 1, pageSize = 20, starLevel, agentLevel, keyword } = data;
    const skip = (page - 1) * pageSize;

    let query = {
      starLevel: _.gte(1) // Only get promoters
    };

    if (starLevel !== undefined && starLevel >= 0) {
      query.starLevel = _.gte(starLevel);
    }

    if (agentLevel !== undefined && agentLevel >= 0) {
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
          starLevel: true,
          performance: true
        })
        .get(),
      db.collection('users').where(query).count()
    ]);

    // Calculate stats
    const [goldResult, silverResult, bronzeResult] = await Promise.all([
      db.collection('users').where({ starLevel: 3 }).count(),
      db.collection('users').where({ starLevel: 2 }).count(),
      db.collection('users').where({ starLevel: 1 }).count()
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
    const { page = 1, limit = 20, type, dateRange } = data;
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
        const userResult = await db.collection('users')
          .where({ _openid: commission._openid })
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
      totalCommission: 0,
      basicCommission: 0,
      repurchaseReward: 0,
      teamAward: 0
    };

    allCommissions.data.forEach((record) => {
      summary.totalCommission += record.amount || 0;
      if (record.rewardType === 'basic') summary.basicCommission += record.amount || 0;
      if (record.rewardType === 'repurchase') summary.repurchaseReward += record.amount || 0;
      if (record.rewardType === 'team' || record.rewardType === 'nurture') {
        summary.teamAward += record.amount || 0;
      }
    });

    return {
      code: 0,
      data: {
        list: commissionsWithUsers,
        total: countResult.total,
        page,
        limit,
        summary
      }
    };
  } catch (error) {
    console.error('Get commissions error:', error);
    return { code: 500, msg: error.message };
  }
}

// Marketing Configuration functions - Coupons
async function getCouponsAdmin(data) {
  try {
    const { page = 1, limit = 20, status } = data;
    const skip = (page - 1) * limit;

    let query = {};

    if (status === 'active') {
      query.isActive = true;
    } else if (status === 'inactive') {
      query.isActive = false;
    }

    const [couponsResult, countResult] = await Promise.all([
      db.collection('coupons')
        .where(query)
        .orderBy('createTime', 'desc')
        .skip(skip)
        .limit(limit)
        .get(),
      db.collection('coupons').where(query).count()
    ]);

    return {
      code: 0,
      data: {
        list: couponsResult.data,
        total: countResult.total,
        page,
        limit
      }
    };
  } catch (error) {
    console.error('Get coupons error:', error);
    return { code: 500, msg: error.message };
  }
}

async function createCouponAdmin(data, wxContext) {
  try {
    const adminInfo = wxContext.ADMIN_INFO || { id: 'system' };

    const couponData = {
      ...data,
      createTime: new Date(),
      updateTime: new Date()
    };

    const result = await db.collection('coupons').add({
      data: couponData
    });

    await logOperation(adminInfo.id, 'createCoupon', {
      couponId: result.id,
      name: data.name
    });

    return {
      code: 0,
      data: { id: result.id },
      msg: '优惠券创建成功'
    };
  } catch (error) {
    console.error('Create coupon error:', error);
    return { code: 500, msg: error.message };
  }
}

async function updateCouponAdmin(data, wxContext) {
  try {
    const adminInfo = wxContext.ADMIN_INFO || { id: 'system' };

    const { id, ...updateData } = data;
    updateData.updateTime = new Date();

    await db.collection('coupons').doc(id).update({
      data: updateData
    });

    await logOperation(adminInfo.id, 'updateCoupon', {
      couponId: id,
      ...updateData
    });

    return {
      code: 0,
      msg: '优惠券更新成功'
    };
  } catch (error) {
    console.error('Update coupon error:', error);
    return { code: 500, msg: error.message };
  }
}

async function deleteCouponAdmin(data, wxContext) {
  try {
    const adminInfo = wxContext.ADMIN_INFO || { id: 'system' };

    const { id } = data;

    await db.collection('coupons').doc(id).remove();

    await logOperation(adminInfo.id, 'deleteCoupon', { couponId: id });

    return {
      code: 0,
      msg: '优惠券删除成功'
    };
  } catch (error) {
    console.error('Delete coupon error:', error);
    return { code: 500, msg: error.message };
  }
}

// Marketing Configuration functions - Banners
async function getBannersAdmin(data) {
  try {
    const { page = 1, limit = 20, status } = data;
    const skip = (page - 1) * limit;

    let query = {};

    if (status === 'active') {
      query.isActive = true;
    } else if (status === 'inactive') {
      query.isActive = false;
    }

    const [bannersResult, countResult] = await Promise.all([
      db.collection('banners')
        .where(query)
        .orderBy('sort', 'asc')
        .skip(skip)
        .limit(limit)
        .get(),
      db.collection('banners').where(query).count()
    ]);

    return {
      code: 0,
      data: {
        list: bannersResult.data,
        total: countResult.total,
        page,
        limit
      }
    };
  } catch (error) {
    console.error('Get banners error:', error);
    return { code: 500, msg: error.message };
  }
}

async function createBannerAdmin(data, wxContext) {
  try {
    const adminInfo = wxContext.ADMIN_INFO || { id: 'system' };

    const bannerData = {
      ...data,
      createTime: new Date(),
      updateTime: new Date()
    };

    const result = await db.collection('banners').add({
      data: bannerData
    });

    await logOperation(adminInfo.id, 'createBanner', {
      bannerId: result.id,
      title: data.title
    });

    return {
      code: 0,
      data: { id: result.id },
      msg: 'Banner创建成功'
    };
  } catch (error) {
    console.error('Create banner error:', error);
    return { code: 500, msg: error.message };
  }
}

async function updateBannerAdmin(data, wxContext) {
  try {
    const adminInfo = wxContext.ADMIN_INFO || { id: 'system' };

    const { id, ...updateData } = data;
    updateData.updateTime = new Date();

    await db.collection('banners').doc(id).update({
      data: updateData
    });

    await logOperation(adminInfo.id, 'updateBanner', {
      bannerId: id,
      ...updateData
    });

    return {
      code: 0,
      msg: 'Banner更新成功'
    };
  } catch (error) {
    console.error('Update banner error:', error);
    return { code: 500, msg: error.message };
  }
}

async function deleteBannerAdmin(data, wxContext) {
  try {
    const adminInfo = wxContext.ADMIN_INFO || { id: 'system' };

    const { id } = data;

    await db.collection('banners').doc(id).remove();

    await logOperation(adminInfo.id, 'deleteBanner', { bannerId: id });

    return {
      code: 0,
      msg: 'Banner删除成功'
    };
  } catch (error) {
    console.error('Delete banner error:', error);
    return { code: 500, msg: error.message };
  }
}

// Detail functions
async function getCouponDetailAdmin(data) {
  try {
    const { id } = data;

    const couponResult = await db.collection('coupons').doc(id).get();

    if (!couponResult.data) {
      return { code: 404, msg: '优惠券不存在' };
    }

    return {
      code: 0,
      data: couponResult.data
    };
  } catch (error) {
    console.error('Get coupon detail error:', error);
    return { code: 500, msg: error.message };
  }
}

async function getBannerDetailAdmin(data) {
  try {
    const { id } = data;

    const bannerResult = await db.collection('banners').doc(id).get();

    if (!bannerResult.data) {
      return { code: 404, msg: 'Banner不存在' };
    }

    return {
      code: 0,
      data: bannerResult.data
    };
  } catch (error) {
    console.error('Get banner detail error:', error);
    return { code: 500, msg: error.message };
  }
}

async function getTeamMembersAdmin(data) {
  try {
    const { userId, maxLevel = -1 } = data;

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
          starLevel: true,
          performance: true
        })
        .get();

      directMembers = directUsersResult.data;

      // Count stats
      for (const member of directMembers) {
        if (member.starLevel >= 1) activePromoters++;
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
            starLevel: true,
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
    const { page = 1, limit = 20, status, type } = data;
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
    const { id } = data;

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

    const { id, ...updateData } = data;
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

    const { id } = data;

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
    const { promotionId } = data;

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

    const { promotionId, products } = data;

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

    const { id } = data;

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
    const { promotionId, startDate, endDate } = data;

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
    const { page = 1, limit = 20, status, keyword, startDate, endDate } = data;
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
    const { refundId } = data;

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

    const { refundId, refundAmount, remark } = data;

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

    const { refundId } = data;

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

    const { refundId, reason } = data;

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

    const { refundId } = data;

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
    const { page = 1, limit = 20, keyword } = data;
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
    const { addressId, openid } = data;

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
    const { page = 1, limit = 20, type } = data;
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
    const { page = 1, limit = 20, status, type } = data;
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

    // 获取关联的用户信息
    const commissionsWithUsers = await Promise.all(
      commissionsResult.data.map(async (commission) => {
        const userResult = await db.collection('users')
          .where({ _openid: commission._openid })
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
          level1Commission: 25,
          level2Commission: 20,
          level3Commission: 15,
          level4Commission: 10,
          repurchaseReward: 3,
          teamAward: 2,
          nurtureAllowance: 2,
          bronzeThreshold: 1000,
          silverSalesThreshold: 10000,
          goldSalesThreshold: 50000,
          silverTeamThreshold: 20,
          goldTeamThreshold: 50,
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
      'repurchaseReward', 'teamAward', 'nurtureAllowance',
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

