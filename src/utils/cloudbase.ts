// 云开发环境ID
const ENV_ID: string = import.meta.env.VITE_ENV_ID || 'dyyq-0gxfchpt0a88ca22';

// 检查环境ID是否已配置
export const isValidEnvId = ENV_ID && ENV_ID !== 'your-env-id';

// 判断是否为微信小程序环境
const isMpWeixin = typeof wx !== 'undefined' && wx.cloud;

// 初始化云开发
export const init = () => {
  if (isMpWeixin) {
    // 微信小程序环境使用 wx.cloud
    if (!wx.cloud.inited) {
      wx.cloud.init({
        env: ENV_ID,
        traceUser: true
      });
    }
    return wx.cloud;
  }
  return null;
};

// 初始化
init();

/**
 * 检查环境配置是否有效
 */
export const checkEnvironment = () => {
  if (!isValidEnvId) {
    console.error('❌ 云开发环境ID未配置');
    return false;
  }
  return true;
};

/**
 * 获取数据库实例
 */
export const getDatabase = () => {
  if (isMpWeixin) {
    return wx.cloud.database();
  }
  throw new Error('不支持的环境');
};

/**
 * 调用云函数
 */
export const callFunction = async (name: string, data?: any) => {
  if (isMpWeixin) {
    return await wx.cloud.callFunction({
      name,
      data
    });
  }
  throw new Error('不支持的环境');
};

/**
 * 检查用户登录态 - 小程序自动获取 OpenID
 */
export const checkLogin = async () => {
  if (!checkEnvironment()) {
    return false;
  }
  
  if (isMpWeixin) {
    try {
      // 小程序自动登录，通过微信获取 OpenID
      const { result } = await callFunction('login');
      console.log('小程序登录成功:', result);
      return true;
    } catch (error) {
      console.error('小程序登录失败:', error);
      return false;
    }
  }
  return false;
};

/**
 * 初始化云开发
 */
export async function initCloudBase() {
  try {
    const result = await checkLogin();
    console.log('云开发初始化:', result ? '成功' : '失败');
    return result;
  } catch (error) {
    console.error('云开发初始化失败:', error);
    return false;
  }
}

// 默认导出
export default {
  init,
  checkLogin,
  checkEnvironment,
  isValidEnvId,
  initCloudBase,
  getDatabase,
  callFunction
};