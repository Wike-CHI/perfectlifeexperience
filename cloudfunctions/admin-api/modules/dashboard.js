/**
 * Dashboard模块
 */
async function getDashboardData(db) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 并行查询各项数据
    const [
      todayOrdersResult,
      todayOrdersList,
      pendingShipResult,
      pendingRefundResult
    ] = await Promise.all([
      // 今日订单数（已付款、配送中、已完成）
      db.collection('orders').where({
        createTime: db.command.gte(today),
        status: db.command.in(['paid', 'shipping', 'completed'])
      }).count(),

      // 今日订单列表（用于计算销售额）
      db.collection('orders').where({
        createTime: db.command.gte(today),
        status: db.command.in(['paid', 'shipping', 'completed'])
      }).get(),

      // 待发货订单
      db.collection('orders').where({
        status: 'paid'
      }).count(),

      // 待审核退款
      db.collection('refunds').where({
        status: 'pending'
      }).count()
    ]);

    // 计算今日销售额（单位：分）
    const todaySales = todayOrdersList.data.reduce((sum, order) => {
      return sum + (order.totalAmount || 0);
    }, 0);

    return {
      code: 0,
      data: {
        todayOrders: todayOrdersResult.total,  // 今日订单数
        todaySales: todaySales,                   // 今日销售额（分）
        pendingTasks: [
          {
            type: 'shipment',
            count: pendingShipResult.total,     // 待发货数量
            label: '待发货'
          },
          {
            type: 'refund',
            count: pendingRefundResult.total,     // 待退款数量
            label: '待审核退款'
          }
        ]
      }
    };
  } catch (error) {
    console.error('Get dashboard error:', error);
    return { code: 500, msg: error.message };
  }
}

module.exports = { getDashboardData };
