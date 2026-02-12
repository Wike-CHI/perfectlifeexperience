// 订单管理云函数
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

// Create order
async function createOrder(openid, orderData) {
  try {
    const order = {
      ...orderData,
      _openid: openid,
      createTime: new Date(),
      status: 'pending', // pending, paid, shipping, completed, cancelled
      updateTime: new Date()
    };
    
    const res = await db.collection('orders').add({
      data: order
    });
    
    return {
      success: true,
      orderId: res._id,
      message: '订单创建成功'
    };
  } catch (error) {
    console.error('创建订单失败:', error);
    throw error;
  }
}

// Get orders
async function getOrders(openid, status) {
  try {
    const query = {
      _openid: openid
    };
    
    if (status && status !== 'all') {
      query.status = status;
    }
    
    const res = await db.collection('orders')
      .where(query)
      .orderBy('createTime', 'desc')
      .get();
      
    return {
      success: true,
      orders: res.data,
      message: '获取订单成功'
    };
  } catch (error) {
    console.error('获取订单失败:', error);
    throw error;
  }
}

// Update order status
async function updateOrderStatus(openid, orderId, status) {
  try {
    const updateData = {
      status,
      updateTime: new Date()
    };
    
    if (status === 'paid') updateData.payTime = new Date();
    else if (status === 'shipping') updateData.shipTime = new Date();
    else if (status === 'completed') updateData.completeTime = new Date();
    
    // 只能更新自己的订单
    await db.collection('orders').where({
      _id: orderId,
      _openid: openid
    }).update({
      data: updateData
    });
    
    return {
      success: true,
      message: '订单状态更新成功'
    };
  } catch (error) {
    console.error('更新订单状态失败:', error);
    throw error;
  }
}

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  const { action, data } = event;
  
  if (!openid) {
      return { success: false, message: '未登录' };
  }

  try {
    switch (action) {
      case 'createOrder':
        return await createOrder(openid, data);
      case 'getOrders':
        return await getOrders(openid, data ? data.status : null);
      case 'updateOrderStatus':
        return await updateOrderStatus(openid, data.orderId, data.status);
      case 'cancelOrder':
        return await updateOrderStatus(openid, data.orderId, 'cancelled');
      default:
        return { success: false, message: '未知操作' };
    }
  } catch (error) {
    console.error('云函数执行失败:', error);
    return { success: false, error: error.message };
  }
};
