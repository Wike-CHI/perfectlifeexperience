const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command
const { verifyAdmin, hasPermission, logOperation } = require('./auth')

// Main entry point
exports.main = async (event, context) => {
  const { action, data } = event
  const wxContext = cloud.getWXContext()

  // Middleware: Check Admin Permissions (TODO: Implement real RBAC)
  // For now, we assume anyone calling this via the admin dashboard (which requires login) is authorized.
  // In production, verify event.userInfo or a custom token.

  try {
    switch (action) {
      case 'adminLogin':
        return await adminLogin(data)
      case 'getDashboardData':
        return await getDashboardData(data)
      case 'checkAuth':
        return { success: true, message: 'Admin API connected', openId: wxContext.OPENID }
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
