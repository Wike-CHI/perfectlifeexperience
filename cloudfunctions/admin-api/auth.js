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
 * 检查密码是否为 bcrypt 哈希格式
 * bcrypt 哈希格式: $2a$, $2b$, $2y$ 开头，后跟轮数和哈希值
 * @param {string} password - 待检查的密码
 * @returns {boolean} 是否为 bcrypt 哈希
 */
function isBcryptHash(password) {
  if (!password || typeof password !== 'string') {
    return false;
  }
  // bcrypt 哈希以 $2a$, $2b$, 或 $2y$ 开头
  return /^\$2[aby]\$\d{2}\$/.test(password);
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

    // 🔒 安全修复：检查存储的密码是否为 bcrypt 哈希格式
    if (!isBcryptHash(admin.password)) {
      console.error('[安全警告] 管理员密码不是 bcrypt 哈希格式，请立即重置密码:', { username });
      return { success: false, message: '账号安全配置异常，请联系管理员重置密码' };
    }

    // 🔒 密码验证：仅支持 bcrypt 哈希（生产安全）
    let isValid = false;

    // 使用 bcrypt 验证密码
    try {
      isValid = await verifyPassword(password, admin.password);
    } catch (error) {
      console.error('密码验证失败:', error.message);
      // bcrypt 验证失败时，不进行明文比较
      isValid = false;
    }

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
        permissions: admin.permissions || [],
        status: admin.status,
        createTime: admin.createTime
      }
    };
  } catch (error) {
    console.error('Admin verification error:', error);
    return { success: false, message: '验证失败' };
  }
}

/**
 * Check if admin has required permission (角色层级方式 - 已弃用，保留兼容性)
 * @deprecated 使用 checkPermission 替代
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
 * 检查管理员是否拥有指定权限（动态权限方式）
 * @param {object} admin - 管理员对象
 * @param {string} requiredPermission - 所需权限标识
 * @returns {boolean} 是否拥有权限
 */
function checkPermission(admin, requiredPermission) {
  if (!admin || !requiredPermission) {
    return false
  }

  // 超级管理员拥有所有权限
  if (admin.role === 'super_admin') {
    return true
  }

  // 检查权限列表
  if (admin.permissions && Array.isArray(admin.permissions)) {
    return admin.permissions.includes(requiredPermission)
  }

  return false
}

/**
 * 检查管理员是否拥有任一权限
 * @param {object} admin - 管理员对象
 * @param {string[]} requiredPermissions - 权限数组
 * @returns {boolean} 是否拥有任一权限
 */
function hasAnyPermission(admin, requiredPermissions) {
  if (!admin || !requiredPermissions || !Array.isArray(requiredPermissions)) {
    return false
  }

  // 超级管理员拥有所有权限
  if (admin.role === 'super_admin') {
    return true
  }

  if (!admin.permissions || !Array.isArray(admin.permissions)) {
    return false
  }

  return requiredPermissions.some(permission =>
    admin.permissions.includes(permission)
  )
}

/**
 * 检查管理员是否拥有所有权限
 * @param {object} admin - 管理员对象
 * @param {string[]} requiredPermissions - 权限数组
 * @returns {boolean} 是否拥有所有权限
 */
function hasAllPermissions(admin, requiredPermissions) {
  if (!admin || !requiredPermissions || !Array.isArray(requiredPermissions)) {
    return false
  }

  // 超级管理员拥有所有权限
  if (admin.role === 'super_admin') {
    return true
  }

  if (!admin.permissions || !Array.isArray(admin.permissions)) {
    return false
  }

  return requiredPermissions.every(permission =>
    admin.permissions.includes(permission)
  )
}

/**
 * 根据角色获取默认权限列表
 * @param {string} role - 角色
 * @returns {string[]} 权限列表
 */
function getDefaultPermissions(role) {
  const rolePermissions = {
    'super_admin': [
      // 仪表盘
      'dashboard.view',
      // 订单管理
      'order.view', 'order.update', 'order.delete',
      // 商品管理
      'product.view', 'product.create', 'product.update', 'product.delete',
      // 数据统计
      'statistics.view',
      // 推广管理
      'promotion.view', 'promotion.manage',
      // 公告管理
      'announcement.view', 'announcement.create', 'announcement.update', 'announcement.delete',
      // 用户管理
      'user.view', 'user.manage',
      // 财务管理
      'finance.view', 'finance.approve',
      // 库存管理
      'inventory.view',
      // 退款管理
      'refund.view', 'refund.approve',
      // 地址管理
      'address.view', 'address.delete',
      // 门店管理
      'store.view', 'store.update',
      // 钱包管理
      'wallet.view',
      // 佣金钱包
      'commission_wallet.view',
      // 系统配置
      'system_config.view', 'system_config.update'
    ],
    'operator': [
      // 仪表盘
      'dashboard.view',
      // 订单管理
      'order.view', 'order.update',
      // 商品管理
      'product.view', 'product.create', 'product.update',
      // 数据统计
      'statistics.view',
      // 推广管理
      'promotion.view',
      // 公告管理
      'announcement.view',
      // 用户管理
      'user.view',
      // 库存管理
      'inventory.view',
      // 退款管理
      'refund.view',
      // 地址管理
      'address.view',
      // 门店管理
      'store.view',
      // 钱包管理
      'wallet.view',
      // 佣金钱包
      'commission_wallet.view',
      // 系统配置
      'system_config.view'
    ],
    'finance': [
      // 仪表盘
      'dashboard.view',
      // 订单管理
      'order.view',
      // 数据统计
      'statistics.view',
      // 财务管理
      'finance.view', 'finance.approve',
      // 退款管理
      'refund.view', 'refund.approve',
      // 钱包管理
      'wallet.view',
      // 佣金钱包
      'commission_wallet.view'
    ]
  }

  return rolePermissions[role] || []
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
  checkPermission,
  hasAnyPermission,
  hasAllPermissions,
  getDefaultPermissions,
  logOperation,
  hashPassword,
  verifyPassword
};
