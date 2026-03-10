/**
 * 订单管理模块
 * 管理订单查询、状态更新等功能
 */

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const _ = db.command;

/**
 * 获取订单列表
 */
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

/**
 * 获取订单详情
 */
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

/**
 * 更新订单状态（通过调用order云函数）
 */
async function updateOrderStatusAdmin(data, wxContext) {
  // 需要从外部传入验证器和日志函数
  const { isValidObjectId, validateOrderStatus, logOperation } = require('../validator');

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

    // 调用 order 云函数进行更新（确保业务逻辑统一和缓存一致）
    const result = await cloud.callFunction({
      name: 'order',
      data: {
        action: 'adminUpdateOrderStatus',
        data: {
          orderId,
          status,
          adminToken: data.adminToken || 'admin' // 传递管理员标识
        }
      }
    });

    await logOperation(adminInfo.id, 'updateOrderStatus', { orderId, status });

    // 返回 order 云函数的结果
    return result.result;
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
 * 更新订单快递单号（直接操作数据库，不影响列表缓存）
 */
async function updateOrderExpressAdmin(data, wxContext) {
  const { isValidObjectId, logOperation } = require('../validator');

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

module.exports = {
  getOrdersAdmin,
  getOrderDetailAdmin,
  updateOrderStatusAdmin,
  searchOrderByExpress,
  updateOrderExpressAdmin
};
