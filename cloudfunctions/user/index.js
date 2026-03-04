// 用户管理云函数
const cloud = require('wx-server-sdk');

// 初始化云开发
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

// ✅ 引入安全日志工具
const { createLogger } = require('../common/logger');
const logger = createLogger('user');

const { getUserIdentity, parseEvent, withAuth, isDeprecatedAuth } = require('./common/auth');

/**
 * 登录或更新用户信息
 * @param {string} openid - 用户openid
 * @param {Object} userInfo - 用户信息
 */
async function loginOrUpdate(openid, userInfo) {
  try {
    const usersCollection = db.collection('users');
    const now = new Date();
    
    // 查询用户是否已存在
    const { data: existingUsers } = await usersCollection
      .where({
        _openid: openid
      })
      .limit(1)
      .get();
    
    if (existingUsers.length > 0) {
      // 更新现有用户信息
      const user = existingUsers[0];
      const updateData = {
        lastLoginTime: now,
        loginCount: _.inc(1)
      };
      
      // 注意：登录时不覆盖现有的昵称和头像，防止用户自定义的修改被微信信息覆盖
      // 只有当数据库中没有这些字段时才补充
      if (!user.nickName && userInfo.nickName) updateData.nickName = userInfo.nickName;
      if (!user.avatarUrl && userInfo.avatarUrl) updateData.avatarUrl = userInfo.avatarUrl;
      if (!user.gender && userInfo.gender !== undefined) updateData.gender = userInfo.gender;
      
      await usersCollection.doc(user._id).update({
        data: updateData
      });

      logger.info('User login updated', { openid });
      
      // 获取最新的用户信息返回
      const latestUser = { ...user, ...updateData, loginCount: user.loginCount + 1, lastLoginTime: now };
      
      return {
        success: true,
        isNewUser: false,
        userId: user._id,
        userInfo: latestUser,
        message: '登录成功'
      };
    } else {
      // 创建新用户
      const newUser = {
        _openid: openid,
        nickName: userInfo.nickName || '微信用户',
        avatarUrl: userInfo.avatarUrl || '',
        gender: userInfo.gender || 0,
        country: userInfo.country || '',
        province: userInfo.province || '',
        city: userInfo.city || '',
        phone: '',
        createTime: now,
        lastLoginTime: now,
        loginCount: 1,
        status: 'active'
      };
      
      const { _id } = await usersCollection.add({
        data: newUser
      });

      logger.info('New user created', { openid, userId: _id });
      
      return {
        success: true,
        isNewUser: true,
        userId: _id,
        userInfo: newUser,
        message: '注册成功'
      };
    }
  } catch (error) {
    logger.error('Login or update user failed', error);
    throw error;
  }
}

/**
 * 获取用户信息
 * @param {string} openid - 用户openid
 */
async function getUserInfo(openid) {
  try {
    const usersCollection = db.collection('users');
    
    const { data: users } = await usersCollection
      .where({
        _openid: openid
      })
      .limit(1)
      .get();
    
    if (users.length === 0) {
      return {
        success: false,
        error: '用户不存在',
        message: '用户不存在'
      };
    }
    
    const user = users[0];
    
    return {
      success: true,
      userInfo: {
        userId: user._id,
        nickName: user.nickName,
        avatarUrl: user.avatarUrl,
        gender: user.gender,
        country: user.country,
        province: user.province,
        city: user.city,
        phone: user.phone,
        createTime: user.createTime,
        lastLoginTime: user.lastLoginTime,
        loginCount: user.loginCount
      },
      message: '获取成功'
    };
  } catch (error) {
    logger.error('Get user info failed', error);
    throw error;
  }
}

/**
 * 更新用户信息
 * @param {string} openid - 用户openid
 * @param {Object} updateData - 要更新的数据
 */
async function updateUserInfo(openid, updateData) {
  try {
    const usersCollection = db.collection('users');
    const now = new Date();
    
    // 查询用户
    const { data: users } = await usersCollection
      .where({
        _openid: openid
      })
      .limit(1)
      .get();
    
    if (users.length === 0) {
      return {
        success: false,
        error: '用户不存在',
        message: '用户不存在'
      };
    }
    
    const user = users[0];
    
    // 过滤允许更新的字段
    const allowedFields = ['nickName', 'avatarUrl', 'gender', 'country', 'province', 'city', 'phone', 'addresses'];
    const filteredData = {};
    
    for (const key of allowedFields) {
      if (updateData[key] !== undefined) {
        filteredData[key] = updateData[key];
      }
    }
    
    filteredData.updateTime = now;
    
    await usersCollection.doc(user._id).update({
      data: filteredData
    });

    logger.info('User info updated', { openid });
    
    return {
      success: true,
      message: '更新成功'
    };
  } catch (error) {
    logger.error('Update user info failed', error);
    throw error;
  }
}

/**
 * 绑定手机号 - 使用新版云调用 API
 * 微信2023年后更新：使用 cloud.openapi.phonenumber.getPhoneNumber
 * 旧版 cloud.getOpenData 已弃用
 */
async function bindPhone(openid, code) {
  try {
    // 使用新版云调用 API 获取手机号
    const res = await cloud.openapi.phonenumber.getPhoneNumber({
      code: code
    });

    // 检查返回结果
    if (res.errcode !== 0 || !res.phoneInfo) {
      logger.warn('获取手机号失败', { errcode: res.errcode, errmsg: res.errmsg });
      return {
        success: false,
        error: '获取手机号失败',
        message: res.errmsg || '请重新授权'
      };
    }

    const phoneNumber = res.phoneInfo.phoneNumber;

    if (!phoneNumber) {
      return {
        success: false,
        error: '获取手机号失败',
        message: '请重新授权'
      };
    }

    // 更新用户手机号
    const usersCollection = db.collection('users');
    const { data: users } = await usersCollection
      .where({ _openid: openid })
      .limit(1)
      .get();

    if (users.length === 0) {
      return {
        success: false,
        error: '用户不存在',
        message: '请先登录'
      };
    }

    await usersCollection.doc(users[0]._id).update({
      data: {
        phone: phoneNumber,
        phoneUpdateTime: new Date()
      }
    });

    logger.info('Phone bound', { openid, phone: phoneNumber.slice(-4) });

    return {
      success: true,
      phone: phoneNumber,
      message: '绑定成功'
    };
  } catch (error) {
    logger.error('Bind phone failed', error);
    return {
      success: false,
      error: error.message,
      message: '绑定失败，请重试'
    };
  }
}

// 云函数入口函数
exports.main = async (event, context) => {
  logger.debug('User function called', { action: event.action });

  // 解析请求数据
  const requestData = parseEvent(event);
  logger.debug('Request data parsed', { action: requestData.action });

  // 获取 openid
  const wxContext = cloud.getWXContext();
  // 🔒 安全：只使用 wxContext.OPENID，不信任前端传递的 _token
  const openid = wxContext.OPENID;

  if (!openid) {
    return {
      success: false,
      error: '未登录',
      message: '用户未登录或登录已过期'
    };
  }
  
  const { action, data } = requestData;

  logger.info('User action', { action, openid });
  
  try {
    switch (action) {
      case 'loginOrUpdate':
        // 登录或更新用户信息
        if (!data || !data.userInfo) {
          return {
            success: false,
            error: '缺少用户信息',
            message: '请提供用户信息'
          };
        }
        return await loginOrUpdate(openid, data.userInfo);
        
      case 'getUserInfo':
        // 获取用户信息
        return await getUserInfo(openid);
        
      case 'updateUserInfo':
        // 更新用户信息
        if (!data) {
          return {
            success: false,
            error: '缺少更新数据',
            message: '请提供要更新的数据'
          };
        }
        return await updateUserInfo(openid, data);

      case 'bindPhone':
        // 绑定手机号
        if (!data || !data.code) {
          return {
            success: false,
            error: '缺少授权码',
            message: '请重新授权'
          };
        }
        return await bindPhone(openid, data.code);

      default:
        return {
          success: false,
          error: '未知操作',
          message: `不支持的操作: ${action}`
        };
    }
  } catch (error) {
    logger.error('User function failed', error);
    return {
      success: false,
      error: error.message,
      message: '操作失败，请稍后重试'
    };
  }
};
