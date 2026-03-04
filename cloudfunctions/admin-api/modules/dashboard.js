/**
 * Dashboard模块
 */
async function getDashboardData(db) {
  try {
    const [ordersCount, productsCount, usersCount, withdrawalsPending] = await Promise.all([
      db.collection('orders').count(),
      db.collection('products').count(),
      db.collection('users').count(),
      db.collection('withdrawals').where({ status: 'pending' }).count()
    ]);
    return { code: 0, data: { orders: ordersCount.total, products: productsCount.total, users: usersCount.total, withdrawalsPending: withdrawalsPending.total } };
  } catch (error) {
    console.error('Get dashboard error:', error);
    return { code: 500, msg: error.message };
  }
}

module.exports = { getDashboardData };
