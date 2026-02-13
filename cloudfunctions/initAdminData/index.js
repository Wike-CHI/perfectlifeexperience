const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

exports.main = async (event, context) => {
  try {
    // Check if already initialized
    const { data: existingAdmins } = await db.collection('admins').limit(1).get();

    if (existingAdmins.length > 0) {
      return {
        code: 0,
        message: 'Admin collections already initialized'
      };
    }

    // Create default super admin
    const result = await db.collection('admins').add({
      data: {
        username: 'admin',
        password: 'admin123', // Change in production!
        role: 'super_admin',
        permissions: ['all'],
        status: 'active',
        createTime: new Date(),
        lastLoginTime: null
      }
    });

    const adminId = result.id;

    // Create operation log
    await db.collection('operation_logs').add({
      data: {
        adminId,
        action: 'init',
        details: 'System initialized with default admin',
        ipAddress: 'system',
        timestamp: new Date()
      }
    });

    return {
      code: 0,
      message: 'Admin collections initialized successfully',
      data: {
        adminId,
        defaultUsername: 'admin',
        defaultPassword: 'admin123'
      }
    };
  } catch (error) {
    console.error('Init error:', error);
    return {
      code: 500,
      message: error.message
    };
  }
};
