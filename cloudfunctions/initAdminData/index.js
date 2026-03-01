const cloud = require('wx-server-sdk');
const bcrypt = require('bcryptjs');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

// 密码哈希配置
const SALT_ROUNDS = 10;
const DEFAULT_PASSWORD = 'admin123'; // 生产环境应立即修改

/**
 * Hash password using bcrypt
 * @param {string} plainPassword - Plain text password
 * @returns {Promise<string>} Hashed password
 */
async function hashPassword(plainPassword) {
  return await bcrypt.hash(plainPassword, SALT_ROUNDS);
}

/**
 * 重新初始化管理员 - 删除现有管理员并创建新的
 */
async function reinitAdmin(specifiedOpenid) {
  // 删除所有现有管理员
  const { data: existingAdmins } = await db.collection('admins').get();

  for (const admin of existingAdmins) {
    await db.collection('admins').doc(admin._id).remove();
  }

  console.log(`已删除 ${existingAdmins.length} 个现有管理员账号`);

  // 创建新管理员
  return await createAdmin(specifiedOpenid);
}

/**
 * 创建管理员账号
 */
async function createAdmin(specifiedOpenid) {
  // 对默认密码进行哈希处理
  const hashedPassword = await hashPassword(DEFAULT_PASSWORD);

  const adminData = {
    username: 'admin',
    password: hashedPassword,
    role: 'super_admin',
    permissions: ['all'],
    status: 'active',
    createTime: new Date(),
    lastLoginTime: null
  };

  // 如果指定了 openid，添加到管理员数据
  if (specifiedOpenid) {
    adminData._openid = specifiedOpenid;
  }

  // Create default super admin
  const result = await db.collection('admins').add({
    data: adminData
  });

  const adminId = result.id;

  // Create operation log (ignore if collection not exists)
  try {
    await db.collection('operation_logs').add({
      data: {
        adminId,
        action: specifiedOpenid ? 'init_with_openid' : 'init',
        details: specifiedOpenid
          ? `System initialized with default admin (openid: ${specifiedOpenid})`
          : 'System initialized with default admin',
        ipAddress: 'system',
        timestamp: new Date()
      }
    });
  } catch (logError) {
    console.log('操作日志记录失败（可忽略）:', logError.message);
  }

  return {
    code: 0,
    message: 'Admin initialized successfully',
    data: {
      adminId,
      defaultUsername: 'admin',
      defaultPassword: DEFAULT_PASSWORD,
      openid: specifiedOpenid || null,
      warning: '请立即登录并修改默认密码！'
    }
  };
}

exports.main = async (event, context) => {
  const { action, openid } = event;

  try {
    // 重新初始化模式
    if (action === 'reinit') {
      return await reinitAdmin(openid);
    }

    // 默认模式：检查是否已初始化
    const { data: existingAdmins } = await db.collection('admins').limit(1).get();

    if (existingAdmins.length > 0) {
      return {
        code: 0,
        message: 'Admin collections already initialized',
        data: {
          hint: '使用 action: "reinit" 可以重新初始化'
        }
      };
    }

    // 创建管理员（可指定 openid）
    return await createAdmin(openid);

  } catch (error) {
    console.error('Init error:', error);
    return {
      code: 500,
      message: error.message
    };
  }
};
