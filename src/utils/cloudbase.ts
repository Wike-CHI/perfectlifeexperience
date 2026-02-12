// 云开发环境ID - 年费环境
const ENV_ID: string = 'cloud1-6gmp2q0y3171c353';

// 声明 wx 全局对象
declare const wx: any;

// 存储用户登录凭证
let userOpenid: string | null = null;

// 存储键名
const OPENID_KEY = 'cloudbase_openid';
const LOGIN_TIME_KEY = 'cloudbase_login_time';
const LOGIN_EXPIRE_DAYS = 7; // 登录有效期7天

/**
 * 检查环境配置是否有效
 */
export const checkEnvironment = () => {
  if (!ENV_ID) {
    console.error('❌ 云开发环境ID未配置');
    return false;
  }
  return true;
};

/**
 * 初始化云开发
 */
export async function initCloudBase() {
  if (typeof wx === 'undefined' || !wx.cloud) {
    console.warn('当前环境不支持云开发 (非微信小程序环境)');
    return false;
  }

  try {
    console.log('正在初始化云开发，环境ID:', ENV_ID);
    wx.cloud.init({
      env: ENV_ID,
      traceUser: true
    });
    
    // 尝试静默登录
    const openid = await checkLogin();
    console.log('云开发初始化:', openid ? '成功' : '失败');
    return !!openid;
  } catch (error) {
    console.error('云开发初始化失败:', error);
    return false;
  }
}

/**
 * 调用云函数 (原生 wx.cloud.callFunction)
 */
export const callFunction = async (name: string, data: any = {}) => {
  if (typeof wx === 'undefined' || !wx.cloud) {
    throw new Error('当前环境不支持云开发');
  }

  try {
    console.log(`调用云函数 ${name} (原生)`, JSON.stringify(data));
    const res = await wx.cloud.callFunction({
      name,
      data
    });
    
    console.log(`云函数 ${name} 响应:`, res.result);
    // 保持与原有 HTTP 调用一致的返回结构: { result: ... }
    // wx.cloud.callFunction 返回结构为 { result: ..., requestID: ... }
    // 如果云函数内部返回 { success: true, ... }，则 res.result 就是这个对象
    // 前端 api.ts 期望的结构是 res.result.success
    // 所以直接返回 res 即可，res.result 就是云函数的返回值
    return res;
  } catch (error) {
    console.error(`调用云函数 ${name} 失败:`, error);
    throw error;
  }
};

/**
 * 上传文件到云存储
 * @param filePath 本地文件路径
 * @param cloudPath 云端路径（可选，如果不传则自动生成）
 */
export const uploadFile = async (filePath: string, cloudPath?: string): Promise<string> => {
  if (typeof wx === 'undefined' || !wx.cloud) {
    throw new Error('当前环境不支持云开发');
  }

  try {
    if (!cloudPath) {
      const ext = filePath.split('.').pop() || 'jpg';
      const randomStr = Math.random().toString(36).substring(2);
      const timestamp = Date.now();
      cloudPath = `uploads/${timestamp}_${randomStr}.${ext}`;
    }

    console.log(`上传文件: ${filePath} -> ${cloudPath}`);
    const res = await wx.cloud.uploadFile({
      cloudPath,
      filePath
    });

    console.log('上传成功:', res.fileID);
    return res.fileID;
  } catch (error) {
    console.error('上传文件失败:', error);
    throw error;
  }
};

/**
 * 获取用户 openid
 */
export const getUserOpenid = (): string | null => {
  return userOpenid;
};

/**
 * 用户登录 - 使用原生云开发静默登录
 * @returns 登录成功返回 openid，失败返回 null
 */
export const checkLogin = async (): Promise<string | null> => {
  if (!checkEnvironment()) {
    console.error('环境检查失败');
    return null;
  }
  
  // 先检查本地是否有缓存的 openid
  const cachedOpenid = uni.getStorageSync(OPENID_KEY);
  if (cachedOpenid) {
    userOpenid = cachedOpenid;
    console.log('使用缓存的登录态:', cachedOpenid);
    // 可以在这里异步验证一下登录态是否有效，但为了性能通常信任缓存
    return cachedOpenid;
  }
  
  try {
    console.log('正在进行云开发静默登录...');
    // 调用 login 云函数，无需传参，云函数会自动获取 wxContext
    const result: any = await callFunction('login', {});
    
    if (result?.result?.success) {
      userOpenid = result.result.openid;
      
      // 缓存 openid 到本地
      if (userOpenid) {
        uni.setStorageSync(OPENID_KEY, userOpenid);
        // 记录登录时间
        recordLoginTime();
        console.log('登录成功，openid:', userOpenid);
        return userOpenid;
      } else {
        console.error('登录成功但返回的 openid 为空');
        return null;
      }
    } else {
      console.error('登录失败:', result?.result?.error || '未知错误');
      return null;
    }
  } catch (error) {
    console.error('登录异常:', error);
    return null;
  }
};

/**
 * 退出登录
 */
export const logoutCloudBase = () => {
  userOpenid = null;
  uni.removeStorageSync(OPENID_KEY);
  uni.removeStorageSync(LOGIN_TIME_KEY);
  console.log('已退出登录');
};

/**
 * 检查登录是否过期
 */
export const isLoginExpired = (): boolean => {
  const loginTime = uni.getStorageSync(LOGIN_TIME_KEY);
  if (!loginTime) {
    return true;
  }
  
  const now = Date.now();
  const expireTime = loginTime + LOGIN_EXPIRE_DAYS * 24 * 60 * 60 * 1000;
  return now > expireTime;
};

/**
 * 获取登录剩余天数
 */
export const getLoginRemainingDays = (): number => {
  const loginTime = uni.getStorageSync(LOGIN_TIME_KEY);
  if (!loginTime) {
    return 0;
  }
  
  const now = Date.now();
  const expireTime = loginTime + LOGIN_EXPIRE_DAYS * 24 * 60 * 60 * 1000;
  const remainingMs = expireTime - now;
  
  if (remainingMs <= 0) {
    return 0;
  }
  
  return Math.ceil(remainingMs / (24 * 60 * 60 * 1000));
};

/**
 * 检查并刷新登录状态
 * 如果登录过期，清除本地缓存并返回 false
 */
export const checkAndRefreshLoginStatus = async (): Promise<boolean> => {
  if (isLoginExpired()) {
    console.log('登录已过期，清除登录状态');
    logoutCloudBase();
    return false;
  }
  return true;
};

/**
 * 记录登录时间
 */
export const recordLoginTime = () => {
  uni.setStorageSync(LOGIN_TIME_KEY, Date.now());
  console.log('登录时间已记录');
};

// 默认导出
export default {
  checkLogin,
  checkEnvironment,
  initCloudBase,
  callFunction,
  uploadFile,
  getUserOpenid,
  logoutCloudBase
};
