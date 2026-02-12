const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

// Main entry point
exports.main = async (event, context) => {
  const { action, data } = event
  const wxContext = cloud.getWXContext()

  // Middleware: Check Admin Permissions (TODO: Implement real RBAC)
  // For now, we assume anyone calling this via the admin dashboard (which requires login) is authorized.
  // In production, verify event.userInfo or a custom token.

  try {
    switch (action) {
      case 'getDashboardData':
        return await getDashboardData(data)
      case 'checkAuth':
        return { success: true, message: 'Admin API connected', openId: wxContext.OPENID }
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

async function getDashboardData(data) {
  // Mock data for now, or query DB
  // In real implementation, we would query orders, users, etc.
  
  // Example: Count today's orders
  // const today = new Date()
  // today.setHours(0,0,0,0)
  // const orderCount = await db.collection('orders').where({
  //   createTime: _.gte(today)
  // }).count()
  
  return {
    code: 0,
    data: {
      todaySales: 12800, // Mock
      todayOrders: 45,   // Mock
      totalUsers: 1205,  // Mock
      pendingTasks: [
        { type: 'shipment', count: 12 },
        { type: 'withdrawal', count: 5 }
      ]
    }
  }
}
