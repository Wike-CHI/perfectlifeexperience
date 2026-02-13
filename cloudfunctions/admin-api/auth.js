const cloud = require('wx-server-sdk');
const db = cloud.database();
const _ = db.command;
const bcrypt = require('bcryptjs');

// 密码哈希配置
const SALT_ROUNDS = 10;

/**
 * Hash password using bcrypt
 * @param {string} plainPassword - Plain text password
 * @returns {Promise<string>} Hashed password
 */
async function hashPassword(plainPassword) {
  return await bcrypt.hash(plainPassword, SALT_ROUNDS);
}

/**
 * Verify password against hash
 * @param {string} plainPassword - Plain text password to verify
 * @param {string} hashedPassword - Hashed password from database
 * @returns {Promise<boolean>} True if password matches
 */
async function verifyPassword(plainPassword, hashedPassword) {
  return await bcrypt.compare(plainPassword, hashedPassword);
}

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

    // ✅ 使用 bcrypt 验证密码
    const isValid = await verifyPassword(password, admin.password);
    if (!isValid) {
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

module.exports = {
  verifyAdmin,
  hasPermission,
  logOperation,
  hashPassword,
  verifyPassword
};
