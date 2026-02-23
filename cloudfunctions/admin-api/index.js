const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command
const { verifyAdmin, hasPermission, logOperation } = require('./auth')
const { getRequiredPermission } = require('./permissions')

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
      case 'getCategories':
        return await getCategoriesAdmin()
      case 'getOrders':
        return await getOrdersAdmin(data)
      case 'getOrderDetail':
        return await getOrderDetailAdmin(data)
      case 'updateOrderStatus':
        return await updateOrderStatusAdmin(data, wxContext)
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
    // TODO: 实现真实的 token 验证逻辑
    // 当前简化版本：直接返回授权通过
    // 实际生产环境应该：
    // 1. 验证 token 有效性
    // 2. 从 token 中提取管理员信息
    // 3. 检查管理员权限列表是否包含所需权限

    // 临时实现：假设所有请求都通过（需要后续完善）
    return {
      authorized: true,
      admin: {
        id: 'temp_admin_id',
        username: 'admin',
        role: 'super_admin',
        permissions: [] // 超级管理员拥有所有权限
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

  // Log the login operation
  await logOperation(result.admin.id, 'login', { username });

  return {
    code: 0,
    data: result.admin,
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

    const { id, ...updateData } = data;
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

    await db.collection('withdrawals').doc(withdrawalId).update({
      data: {
        status: 'approved',
        approvedBy: adminInfo.id,
        approvedTime: new Date()
      }
    });

    await logOperation(adminInfo.id, 'approveWithdrawal', { withdrawalId });

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

    await db.collection('withdrawals').doc(withdrawalId).update({
      data: {
        status: 'rejected',
        rejectedBy: adminInfo.id,
        rejectedTime: new Date(),
        rejectReason: reason
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
