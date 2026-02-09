// 云函数入口文件
const cloud = require('wx-server-sdk');
const axios = require('axios');

// 初始化云开发
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

// 小程序配置 - 需要从环境变量或常量配置
const APPID = 'wx4a0b93c3660d1404'; // 小程序 AppID
const SECRET = process.env.WX_APP_SECRET || 'f5e326daa6f723eb89e7ed0a09e04cda'; // 小程序密钥，建议从环境变量读取

// 云函数入口函数
exports.main = async (event, context) => {
  console.log('Raw event:', JSON.stringify(event));
  
  // HTTP 触发器模式下，参数可能在 event.body 中
  let requestData = event;
  if (event.body) {
    try {
      requestData = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    } catch (e) {
      console.error('解析 body 失败:', e);
    }
  }
  
  const { code } = requestData;
  
  console.log('Parsed requestData:', requestData);
  console.log('Extracted code:', code);
  
  // 如果没有 code，返回错误
  if (!code) {
    return {
      success: false,
      error: '缺少 code 参数',
      receivedEvent: event,
      message: '登录失败：缺少必要参数'
    };
  }
  
  // 使用 code 换取 openid
  try {
    // 调用微信接口换取 openid
    const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${APPID}&secret=${SECRET}&js_code=${code}&grant_type=authorization_code`;
    console.log('Calling wx api with code:', code);
    const response = await axios.get(url);
    
    console.log('Wx api response:', response.data);
    
    if (response.data.openid) {
      return {
        success: true,
        openid: response.data.openid,
        unionid: response.data.unionid,
        session_key: response.data.session_key,
        message: '登录成功'
      };
    } else {
      return {
        success: false,
        error: response.data.errmsg || '获取 openid 失败',
        errcode: response.data.errcode,
        message: '登录失败'
      };
    }
  } catch (error) {
    console.error('登录失败:', error);
    return {
      success: false,
      error: error.message,
      message: '登录失败'
    };
  }
};
