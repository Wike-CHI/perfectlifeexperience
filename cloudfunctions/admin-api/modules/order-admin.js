/**
 * 订单管理模块（后台）
 */
const { calcPagination } = require('./common/pagination');

async function getOrders(db, data) {
  try {
    const { page = 1, limit = 20, status, keyword, startDate, endDate } = data || {};
    const { skip, limit: validLimit } = calcPagination(page, limit);
    let query = {};

    // 支持数组状态查询（用于处理中、退款等分组）
    if (status && status !== 'all') {
      if (Array.isArray(status)) {
        query.status = db.command.in(status);
      } else {
        query.status = status;
      }
    }

    if (keyword) query.orderNo = db.RegExp({ regexp: keyword, options: 'i' });
    if (startDate || endDate) {
      query.createTime = {};
      if (startDate) query.createTime.$gte = new Date(startDate);
      if (endDate) query.createTime.$lte = new Date(endDate);
    }
    const [ordersResult, countResult] = await Promise.all([
      db.collection('orders').where(query).orderBy('createTime', 'desc').skip(skip).limit(validLimit).get(),
      db.collection('orders').where(query).count()
    ]);

    const orders = ordersResult.data;

    // 为每个订单获取用户信息
    const openids = [...new Set(orders.map(o => o._openid).filter(Boolean))];
    let userMap = {};
    if (openids.length > 0) {
      const usersResult = await db.collection('users').where({
        _openid: db.command.in(openids)
      }).get();
      userMap = usersResult.data.reduce((map, user) => {
        map[user._openid] = user;
        return map;
      }, {});
    }

    // 为每个订单添加用户名，并统一使用 items 字段
    const list = orders.map(order => ({
      ...order,
      // 统一返回 id 字段（兼容前端使用）
      id: order._id,
      // 统一使用 items 字段（数据库存储为 items）
      items: order.items || [],
      userName: order.userName || userMap[order._openid]?.nickName || userMap[order._openid]?.name || '微信用户'
    }));

    return { code: 0, data: { list, total: countResult.total, page, limit: validLimit } };
  } catch (error) {
    console.error('Get orders error:', error);
    return { code: 500, msg: error.message };
  }
}

async function getOrderDetail(db, data) {
  try {
    const { id } = data || {};
    const order = await db.collection('orders').doc(id).get();
    if (!order.data) return { code: 404, msg: '订单不存在' };
    const user = await db.collection('users').where({ _openid: order.data._openid }).limit(1).get();

    // 统一返回字段
    const orderData = {
      ...order.data,
      // 统一使用 items 字段
      items: order.data.items || [],
      // 兼容：保留 products 字段以便旧前端代码使用
      products: order.data.items || [],
      // 明确返回 id 字段
      id: order.data._id
    };

    return { code: 0, data: { order: orderData, user: user.data[0] || null } };
  } catch (error) {
    console.error('Get order detail error:', error);
    return { code: 500, msg: error.message };
  }
}

async function updateOrderStatus(db, logOperation, data, wxContext) {
  try {
    const adminInfo = wxContext.ADMIN_INFO || { id: 'system' };
    // 统一使用 orderId 参数
    const { orderId, status } = data || {};
    if (!orderId || !status) return { code: -2, msg: '缺少必要参数' };

    await db.collection('orders').doc(orderId).update({ data: { status, updateTime: db.serverDate() } });
    await logOperation(adminInfo.id, 'updateOrderStatus', { orderId, status });
    return { code: 0, msg: '订单状态更新成功' };
  } catch (error) {
    console.error('Update order status error:', error);
    return { code: 500, msg: error.message };
  }
}

// 快递相关功能已移除（2026年3月重构）
// 不再支持快递单号查询和更新功能
// async function searchOrderByExpress(db, data) { ... }
// async function updateOrderExpress(db, logOperation, data, wxContext) { ... }

async function deleteOrder(db, logOperation, data, wxContext) {
  try {
    const adminInfo = wxContext.ADMIN_INFO || { id: 'system' };
    // 统一使用 orderId 参数
    const { orderId } = data || {};
    if (!orderId) return { code: -2, msg: '缺少订单ID' };

    // 检查订单是否存在
    const order = await db.collection('orders').doc(orderId).get();
    if (!order.data) return { code: 404, msg: '订单不存在' };

    // 删除订单
    await db.collection('orders').doc(orderId).remove();
    await logOperation(adminInfo.id, 'deleteOrder', { orderId, orderNo: order.data.orderNo });

    return { code: 0, msg: '订单删除成功' };
  } catch (error) {
    console.error('Delete order error:', error);
    return { code: 500, msg: error.message };
  }
}

module.exports = { getOrders, getOrderDetail, updateOrderStatus, deleteOrder };
