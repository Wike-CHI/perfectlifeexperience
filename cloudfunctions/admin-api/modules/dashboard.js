/**
 * Dashboard模块
 */
async function getDashboardData(db, data = {}) {
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

    // 时间范围参数（today/week/month）
    const timeRange = data.timeRange || 'today';

    // 根据时间范围计算查询起始时间
    let startTime = today;
    let salesLabels = [];

    if (timeRange === 'week') {
      // 本周第一天（周一）
      const dayOfWeek = now.getDay() || 7;
      startTime = new Date(today.getTime() - (dayOfWeek - 1) * 24 * 60 * 60 * 1000);
      salesLabels = getWeekLabels(now);
    } else if (timeRange === 'month') {
      // 本月第一天
      startTime = new Date(now.getFullYear(), now.getMonth(), 1);
      salesLabels = getMonthLabels(now);
    } else {
      // 今日按小时
      salesLabels = getTodayLabels();
    }

    // 并行查询各项数据
    const [
      todayOrdersResult,
      todayOrdersList,
      yesterdayOrdersResult,
      yesterdayOrdersList,
      pendingShipResult,
      pendingRefundResult,
      newUsersResult,
      promotersResult,
      // 订单状态统计
      pendingPayResult,
      paidResult,
      shippingResult,
      completedResult,
      refundedResult,
      cancelledResult,
      // 销售趋势数据
      salesTrendData,
      // 商品销量排行
      productSalesData
    ] = await Promise.all([
      // 今日订单数（所有状态）
      db.collection('orders').where({
        createTime: db.command.gte(today)
      }).count(),

      // 今日订单列表（用于计算销售额）
      db.collection('orders').where({
        createTime: db.command.gte(today),
        status: db.command.in(['paid', 'shipping', 'completed'])
      }).get(),

      // 昨日订单数（所有状态）
      db.collection('orders').where({
        createTime: db.command.gte(yesterday).and(db.command.lt(today))
      }).count(),

      // 昨日订单列表（用于计算销售额）
      db.collection('orders').where({
        createTime: db.command.gte(yesterday).and(db.command.lt(today)),
        status: db.command.in(['paid', 'shipping', 'completed'])
      }).get(),

      // 待发货订单
      db.collection('orders').where({
        status: 'paid'
      }).count(),

      // 待审核退款
      db.collection('refunds').where({
        refundStatus: 'pending'
      }).count(),

      // 今日新增用户数（通过注册时间筛选）
      db.collection('users').where({
        createTime: db.command.gte(today)
      }).count(),

      // 推广员总数
      db.collection('users').where({
        isPromoter: true
      }).count(),

      // 待付款订单
      db.collection('orders').where({
        status: 'pending'
      }).count(),

      // 已付款（待发货）订单
      db.collection('orders').where({
        status: 'paid'
      }).count(),

      // 配送中订单
      db.collection('orders').where({
        status: 'shipping'
      }).count(),

      // 已完成订单
      db.collection('orders').where({
        status: 'completed'
      }).count(),

      // 已退款订单
      db.collection('orders').where({
        status: 'refunded'
      }).count(),

      // 已取消订单
      db.collection('orders').where({
        status: 'cancelled'
      }).count(),

      // 销售趋势数据
      getSalesTrendData(db, timeRange, startTime, today),

      // 商品销量排行
      getProductSalesData(db)
    ]);

    // 计算今日销售额（单位：分）
    const todaySales = todayOrdersList.data.reduce((sum, order) => {
      return sum + (order.totalAmount || 0);
    }, 0);

    // 计算昨日销售额（单位：分）
    const yesterdaySales = yesterdayOrdersList.data.reduce((sum, order) => {
      return sum + (order.totalAmount || 0);
    }, 0);

    // 计算销售额增长率
    let salesTrend = '+0%';
    if (yesterdaySales > 0) {
      const salesGrowth = ((todaySales - yesterdaySales) / yesterdaySales) * 100;
      salesTrend = (salesGrowth >= 0 ? '+' : '') + salesGrowth.toFixed(1) + '%';
    } else if (todaySales > 0) {
      salesTrend = '+100%';
    }

    // 计算订单数增长率
    let ordersTrend = '+0%';
    const yesterdayOrders = yesterdayOrdersResult.total;
    if (yesterdayOrders > 0) {
      const ordersGrowth = ((todayOrdersResult.total - yesterdayOrders) / yesterdayOrders) * 100;
      ordersTrend = (ordersGrowth >= 0 ? '+' : '') + ordersGrowth.toFixed(1) + '%';
    } else if (todayOrdersResult.total > 0) {
      ordersTrend = '+100%';
    }

    return {
      code: 0,
      data: {
        todayOrders: todayOrdersResult.total,  // 今日订单数
        todaySales: todaySales,                // 今日销售额（分）
        yesterdaySales: yesterdaySales,       // 昨日销售额（分）
        yesterdayOrders: yesterdayOrders,      // 昨日订单数
        salesTrend: salesTrend,                // 销售额增长率
        ordersTrend: ordersTrend,              // 订单数增长率
        newUsers: newUsersResult.total,        // 今日新增用户数
        totalPromoters: promotersResult.total,  // 推广员总数
        // 订单状态统计
        orderStats: {
          pending: pendingPayResult.total,      // 待付款
          paid: paidResult.total,              // 待发货
          shipping: shippingResult.total,      // 配送中
          completed: completedResult.total,     // 已完成
          refunded: refundedResult.total,       // 已退款
          cancelled: cancelledResult.total     // 已取消
        },
        // 销售趋势数据
        salesTrendData: salesTrendData,
        // 商品销量排行
        topProducts: productSalesData,
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

/**
 * 获取今日按小时的标签和数据
 */
function getTodayLabels() {
  const labels = [];
  for (let i = 0; i < 12; i++) {
    labels.push(`${i * 2}:00`);
  }
  return labels;
}

/**
 * 获取本周每天的标签
 */
function getWeekLabels(now) {
  const days = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
  const dayOfWeek = now.getDay() || 7;
  const labels = [];

  for (let i = 0; i < dayOfWeek; i++) {
    labels.push(days[i]);
  }
  // 补齐7天
  while (labels.length < 7) {
    labels.push(days[labels.length]);
  }
  return labels;
}

/**
 * 获取本月每周的标签
 */
function getMonthLabels(now) {
  const labels = [];
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const weeks = Math.ceil(daysInMonth / 7);

  for (let i = 1; i <= weeks; i++) {
    labels.push(`第${i}周`);
  }
  return labels;
}

/**
 * 获取销售趋势数据
 */
async function getSalesTrendData(db, timeRange, startTime, today) {
  try {
    let queryField = 'createTime';
    let salesData = [];

    if (timeRange === 'today') {
      // 今日按小时统计
      const hourlyData = new Array(12).fill(0);

      // 获取今日所有已支付订单
      const orders = await db.collection('orders').where({
        createTime: db.command.gte(startTime),
        status: db.command.in(['paid', 'shipping', 'completed'])
      }).get();

      orders.data.forEach(order => {
        const hour = new Date(order.createTime).getHours();
        const slot = Math.floor(hour / 2);
        if (slot < 12) {
          hourlyData[slot] += order.totalAmount || 0;
        }
      });

      salesData = hourlyData.map((value, index) => ({
        label: `${index * 2}:00`,
        value: Math.round(value / 100) // 转换为元
      }));
    } else if (timeRange === 'week') {
      // 本周按天统计
      const dailyData = new Array(7).fill(0);
      const dayOfWeek = today.getDay() || 7;

      const orders = await db.collection('orders').where({
        createTime: db.command.gte(startTime),
        status: db.command.in(['paid', 'shipping', 'completed'])
      }).get();

      orders.data.forEach(order => {
        const orderDate = new Date(order.createTime);
        const dayIndex = orderDate.getDay() === 0 ? 6 : orderDate.getDay() - 1;
        dailyData[dayIndex] += order.totalAmount || 0;
      });

      const days = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
      salesData = dailyData.map((value, index) => ({
        label: days[index],
        value: Math.round(value / 100)
      }));
    } else {
      // 本月按周统计
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const weeks = Math.ceil(daysInMonth / 7);

      const weeklyData = new Array(weeks).fill(0);

      const orders = await db.collection('orders').where({
        createTime: db.command.gte(startTime),
        status: db.command.in(['paid', 'shipping', 'completed'])
      }).get();

      orders.data.forEach(order => {
        const orderDate = new Date(order.createTime);
        const dayOfMonth = orderDate.getDate();
        const weekIndex = Math.min(Math.ceil(dayOfMonth / 7) - 1, weeks - 1);
        weeklyData[weekIndex] += order.totalAmount || 0;
      });

      salesData = weeklyData.map((value, index) => ({
        label: `第${index + 1}周`,
        value: Math.round(value / 100)
      }));
    }

    return salesData;
  } catch (error) {
    console.error('Get sales trend error:', error);
    return [];
  }
}

/**
 * 获取商品销量排行
 */
async function getProductSalesData(db) {
  try {
    // 查询所有已完成的订单
    const orders = await db.collection('orders').where({
      status: db.command.in(['paid', 'shipping', 'completed'])
    }).get();

    // 统计商品销量
    const productMap = new Map();

    orders.data.forEach(order => {
      order.products?.forEach(product => {
        const productId = product.productId || product._id;
        if (productMap.has(productId)) {
          const existing = productMap.get(productId);
          existing.sales += product.quantity || 1;
          existing.amount += (product.price || 0) * (product.quantity || 1);
        } else {
          productMap.set(productId, {
            _id: productId,
            name: product.name || '未知商品',
            image: product.image || '',
            price: product.price || 0,
            sales: product.quantity || 1,
            amount: (product.price || 0) * (product.quantity || 1)
          });
        }
      });
    });

    // 转换为数组并按销量排序
    const productList = Array.from(productMap.values())
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 5);

    return productList;
  } catch (error) {
    console.error('Get product sales error:', error);
    return [];
  }
}

module.exports = { getDashboardData };
