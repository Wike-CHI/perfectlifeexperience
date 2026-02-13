const cloud = require('wx-server-sdk');
const db = cloud.database();
const _ = db.command;

/**
 * Verify admin credentials and return admin user
 */
async function verifyAdmin(username, password) {
  try {
    const { data: admins } = await db.collection('admins')
      .where({ username, status: 'active' })
      .get();

    if (admins.length === 0) {
      return { success: false, message: '管理员不存在' };
    }

    const admin = admins[0];

    // In production, use bcrypt.compare for password verification
    if (admin.password !== password) {
      return { success: false, message: '密码错误' };
    }

    if (admin.status !== 'active') {
      return { success: false, message: '账号已被禁用' };
    }

    // Update last login time
    await db.collection('admins').doc(admin._id).update({
      data: { lastLoginTime: new Date() }
    });

    return {
      success: true,
      admin: {
        id: admin._id,
        username: admin.username,
        role: admin.role,
        permissions: admin.permissions || []
      }
    };
  } catch (error) {
    console.error('Admin verification error:', error);
    return { success: false, message: '验证失败' };
  }
}

/**
 * Check if admin has required permission
 */
function hasPermission(adminRole, requiredRole) {
  const roleHierarchy = {
    'super_admin': 3,
    'operator': 2,
    'finance': 1
  };

  return roleHierarchy[adminRole] >= roleHierarchy[requiredRole];
}

/**
 * Log admin operation
 */
async function logOperation(adminId, action, details) {
  try {
    await db.collection('operation_logs').add({
      data: {
        adminId,
        action,
        details,
        ipAddress: cloud.getWXContext().CLIENTIP || 'unknown',
        timestamp: new Date()
      }
    });
  } catch (error) {
    console.error('Failed to log operation:', error);
  }
}

module.exports = { verifyAdmin, hasPermission, logOperation };
