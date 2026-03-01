// 云函数入口文件
const cloud = require('wx-server-sdk');
const axios = require('axios');

// 初始化云开发
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

// 获取小程序配置 (从环境变量读取)
function getAppConfig() {
  const appid = process.env.WX_APPID;
  const secret = process.env.WX_APP_SECRET;

  if (!appid) {
    console.error('WX_APPID 环境变量未配置，请在 CloudBase 控制台设置');
    throw new Error('WX_APPID 环境变量未配置');
  }
  if (!secret) {
    console.error('WX_APP_SECRET 环境变量未配置，请在 CloudBase 控制台设置');
    throw new Error('WX_APP_SECRET 环境变量未配置');
  }
  return { appid, secret };
}

/**
 * 获取或创建用户
 * @param {string} openid
 * @param {object} extraData 额外数据 (如 unionid, session_key)
 */
async function getOrCreateUser(openid, extraData = {}) {
  const userCollection = db.collection('users');
  const userResult = await userCollection.where({
    _openid: openid
  }).get();
  
  let user = null;
  let isNewUser = false;
  
  if (userResult.data.length === 0) {
    // 新用户，创建记录
    isNewUser = true;
    const createData = {
      _openid: openid,
      createTime: new Date(),
      lastLoginTime: new Date(),
      loginCount: 1,
      platform: 'weixin_miniprogram',
      ...extraData
    };
    
    const createResult = await userCollection.add({
      data: createData
    });
    user = { _id: createResult._id, ...createData };
  } else {
    // 已存在用户，更新登录信息
    user = userResult.data[0];
    const updateData = {
      lastLoginTime: new Date(),
      loginCount: _.inc(1)
    };
    if (extraData.session_key) updateData.session_key = extraData.session_key;
    if (extraData.unionid) updateData.unionid = extraData.unionid;
    
    await userCollection.doc(user._id).update({
      data: updateData
    });
  }
  
  return {
    success: true,
    openid,
    isNewUser,
    userId: user._id,
    userInfo: user,
    message: '登录成功'
  };
}

// 云函数入口函数
exports.main = async (event, context) => {
  console.log('Login function called, event:', event);
  
  const wxContext = cloud.getWXContext();
  let openid = wxContext.OPENID;
  let unionid = wxContext.UNIONID;
  let session_key = null;
  
  // 1. 尝试从 wxContext 获取 (原生调用)
  if (openid) {
    console.log('Native call detected, openid:', openid);
    return await getOrCreateUser(openid, { unionid });
  }
  
  // 2. 尝试使用 code 换取 (HTTP 调用或显式传 code)
  // 解析 body (如果是 HTTP 触发)
  let requestData = event;
  if (event.body) {
    try {
      requestData = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    } catch (e) {
      console.error('Parse body failed:', e);
    }
  }
  
  const { code } = requestData;
  
  if (code) {
    try {
      const { appid, secret } = getAppConfig();
      const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${appid}&secret=${secret}&js_code=${code}&grant_type=authorization_code`;
      const response = await axios.get(url);
      
      if (response.data.openid) {
        openid = response.data.openid;
        unionid = response.data.unionid;
        session_key = response.data.session_key;
        
        return await getOrCreateUser(openid, { unionid, session_key });
      } else {
        return {
          success: false,
          error: response.data.errmsg || '获取 openid 失败',
          code: response.data.errcode
        };
      }
    } catch (error) {
      console.error('Wx login failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  return {
    success: false,
    error: '无法获取用户身份 (缺少 code 且非原生调用)'
  };
};