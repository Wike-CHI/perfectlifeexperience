/**
 * 订单管理模块（后台）
 */
const { calcPagination } = require('./common/pagination');

async function getOrders(db, data) {
  try {
    const { page = 1, limit = 20, status, keyword, startDate, endDate } = data || {};
    const { skip, limit: validLimit } = calcPagination(page, limit);
    let query = {};
    if (status && status !== 'all') query.status = status;
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

    // 为每个订单添加用户名
    const list = orders.map(order => ({
      ...order,
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
    return { code: 0, data: { order: order.data, user: user.data[0] || null } };
  } catch (error) {
    console.error('Get order detail error:', error);
    return { code: 500, msg: error.message };
  }
}

async function updateOrderStatus(db, logOperation, data, wxContext) {
  try {
    const adminInfo = wxContext.ADMIN_INFO || { id: 'system' };
    const { id, status } = data || {};
    if (!id || !status) return { code: -2, msg: '缺少必要参数' };
    await db.collection('orders').doc(id).update({ data: { status, updateTime: db.serverDate() } });
    await logOperation(adminInfo.id, 'updateOrderStatus', { orderId: id, status });
    return { code: 0, msg: '订单状态更新成功' };
  } catch (error) {
    console.error('Update order status error:', error);
    return { code: 500, msg: error.message };
  }
}

async function searchOrderByExpress(db, data) {
  try {
    const { expressNo } = data || {};
    if (!expressNo) return { code: -2, msg: '缺少快递单号' };
    const result = await db.collection('orders').where({ expressNo: db.RegExp({ regexp: expressNo, options: 'i' }) }).get();
    return { code: 0, data: result.data };
  } catch (error) {
    console.error('Search order error:', error);
    return { code: 500, msg: error.message };
  }
}

async function updateOrderExpress(db, logOperation, data, wxContext) {
  try {
    const adminInfo = wxContext.ADMIN_INFO || { id: 'system' };
    const { id, expressNo, expressCompany } = data || {};
    if (!id) return { code: -2, msg: '缺少订单ID' };
    await db.collection('orders').doc(id).update({ data: { expressNo, expressCompany, updateTime: db.serverDate() } });
    await logOperation(adminInfo.id, 'updateOrderExpress', { orderId: id, expressNo, expressCompany });
    return { code: 0, msg: '快递信息更新成功' };
  } catch (error) {
    console.error('Update express error:', error);
    return { code: 500, msg: error.message };
  }
}

module.exports = { getOrders, getOrderDetail, updateOrderStatus, searchOrderByExpress, updateOrderExpress };
