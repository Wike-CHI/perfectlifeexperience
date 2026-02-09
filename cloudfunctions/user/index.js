// 用户管理云函数
const cloud = require('wx-server-sdk');

// 初始化云开发
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

// 解析 HTTP 触发器的请求体
function parseEvent(event) {
  if (event.body) {
    try {
      return typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    } catch (e) {
      console.error('解析 body 失败:', e);
    }
  }
  return event;
}

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
      
      // 如果有新信息则更新
      if (userInfo.nickName) updateData.nickName = userInfo.nickName;
      if (userInfo.avatarUrl) updateData.avatarUrl = userInfo.avatarUrl;
      if (userInfo.gender !== undefined) updateData.gender = userInfo.gender;
      if (userInfo.country) updateData.country = userInfo.country;
      if (userInfo.province) updateData.province = userInfo.province;
      if (userInfo.city) updateData.city = userInfo.city;
      
      await usersCollection.doc(user._id).update({
        data: updateData
      });
      
      console.log('用户登录信息更新成功:', openid);
      
      return {
        success: true,
        isNewUser: false,
        userId: user._id,
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
        isVip: false,
        vipLevel: 0,
        status: 'active'
      };
      
      const { _id } = await usersCollection.add({
        data: newUser
      });
      
      console.log('新用户创建成功:', openid, '用户ID:', _id);
      
      return {
        success: true,
        isNewUser: true,
        userId: _id,
        message: '注册成功'
      };
    }
  } catch (error) {
    console.error('登录或更新用户失败:', error);
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
        isVip: user.isVip,
        vipLevel: user.vipLevel,
        createTime: user.createTime,
        lastLoginTime: user.lastLoginTime,
        loginCount: user.loginCount
      },
      message: '获取成功'
    };
  } catch (error) {
    console.error('获取用户信息失败:', error);
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
    const allowedFields = ['nickName', 'avatarUrl', 'gender', 'country', 'province', 'city', 'phone'];
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
    
    console.log('用户信息更新成功:', openid);
    
    return {
      success: true,
      message: '更新成功'
    };
  } catch (error) {
    console.error('更新用户信息失败:', error);
    throw error;
  }
}

// 云函数入口函数
exports.main = async (event, context) => {
  console.log('User function called, Raw event:', JSON.stringify(event));
  
  // 解析请求数据
  const requestData = parseEvent(event);
  console.log('Parsed requestData:', requestData);
  
  // 获取 openid
  const wxContext = cloud.getWXContext();
  const openid = requestData._token || wxContext.OPENID;
  
  if (!openid) {
    return {
      success: false,
      error: '未登录',
      message: '请先登录'
    };
  }
  
  const { action, data } = requestData;
  
  console.log('Action:', action, 'OpenID:', openid);
  
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
        
      default:
        return {
          success: false,
          error: '未知操作',
          message: `不支持的操作: ${action}`
        };
    }
  } catch (error) {
    console.error('云函数执行失败:', error);
    return {
      success: false,
      error: error.message,
      message: '操作失败，请稍后重试'
    };
  }
};
