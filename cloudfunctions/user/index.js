// 用户管理云函数
const cloud = require('wx-server-sdk');

// 初始化云开发
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

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
      
      console.log('用户登录信息更新成功:', openid);
      
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
        userInfo: newUser,
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
  // 支持从 token 或者 wxContext 获取 openid
  // 如果是通过 HTTP 触发器且带有 _token 参数，则优先使用 _token (假设 _token 就是 openid，或者在网关层已经验证过)
  // 注意：在生产环境中，_token 应该是一个加密的令牌，这里简化处理，假设 _token 已经是 openid
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
