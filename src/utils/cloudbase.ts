// 云开发环境ID - 年费环境
const ENV_ID: string = 'dyyq-0gxfchpt0a88ca22';

// 云函数 HTTP 触发域名映射
const CLOUD_FUNCTION_URLS: Record<string, string> = {
  'login': 'https://1402837521-kdpu0388ji.ap-shanghai.tencentscf.com',
  'wallet': 'https://1402837521-6ebaxudvw4.ap-shanghai.tencentscf.com',
  'coupon': 'https://1402837521-cucv0vyptk.ap-shanghai.tencentscf.com',
  'promotion': 'https://1402837521-4mvonkik2k.ap-shanghai.tencentscf.com',
  'initData': 'https://1402837521-95tu47fi6q.ap-shanghai.tencentscf.com',
  'hello': 'https://1402837521-kdpu0388ji.ap-shanghai.tencentscf.com', // 使用login的地址作为默认
  'rewardSettlement': 'https://1402837521-kdpu0388ji.ap-shanghai.tencentscf.com'
};

// 检查环境ID是否已配置
export const isValidEnvId = ENV_ID && ENV_ID !== 'your-env-id';

// 判断是否为微信小程序环境
const isMpWeixin = typeof uni !== 'undefined';

// 存储用户登录凭证
let userToken: string | null = null;
let userOpenid: string | null = null;

// 存储键名
const OPENID_KEY = 'cloudbase_openid';
const LOGIN_TIME_KEY = 'cloudbase_login_time';
const LOGIN_EXPIRE_DAYS = 7; // 登录有效期7天

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
 * 获取小程序登录凭证 (code)
 */
const getWxLoginCode = (): Promise<string> => {
  return new Promise((resolve, reject) => {
    uni.login({
      provider: 'weixin',
      success: (res: UniApp.LoginRes) => {
        if (res.code) {
          resolve(res.code);
        } else {
          reject(new Error('获取登录凭证失败'));
        }
      },
      fail: reject
    });
  });
};

/**
 * 调用云函数 (通过 HTTP API)
 */
export const callFunction = async (name: string, data?: any) => {
  try {
    const baseUrl = CLOUD_FUNCTION_URLS[name];
    if (!baseUrl) {
      throw new Error(`未找到云函数 ${name} 的 HTTP 地址`);
    }
    
    const requestData = {
      ...data,
      _token: userToken
    };
    console.log(`调用云函数 ${name}，URL:`, baseUrl);
    console.log(`请求数据:`, JSON.stringify(requestData));
    
    return await new Promise((resolve, reject) => {
      uni.request({
        url: baseUrl,
        method: 'POST',
        data: requestData,
        header: {
          'Content-Type': 'application/json'
        },
        success: (res: UniApp.RequestSuccessCallbackResult) => {
          console.log(`云函数 ${name} 响应:`, res.statusCode, JSON.stringify(res.data));
          if (res.statusCode === 200) {
            resolve({ result: res.data });
          } else {
            reject(new Error(`请求失败: ${res.statusCode}`));
          }
        },
        fail: (err: UniApp.GeneralCallbackResult) => {
          console.error(`云函数 ${name} 请求失败:`, err);
          reject(err);
        }
      });
    });
  } catch (error) {
    console.error(`调用云函数 ${name} 失败:`, error);
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
 * 用户登录 - 使用小程序 code 换取自定义登录态
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
    userToken = cachedOpenid;
    console.log('使用缓存的登录态:', cachedOpenid);
    return cachedOpenid;
  }
  
  try {
    // 获取小程序登录凭证
    console.log('正在获取 wx.login code...');
    const code = await getWxLoginCode();
    console.log('获取到 code:', code ? code.substring(0, 10) + '...' : 'null');
    
    // 调用登录云函数
    console.log('调用 login 云函数...');
    const result: any = await callFunction('login', { code });
    console.log('login 云函数返回:', JSON.stringify(result));
    
    if (result?.result?.success) {
      userOpenid = result.result.openid;
      userToken = result.result.token || result.result.openid;
      
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
  userToken = null;
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

/**
 * 初始化云开发
 */
export async function initCloudBase() {
  try {
    console.log('正在初始化云开发，环境ID:', ENV_ID);
    const openid = await checkLogin();
    console.log('云开发初始化:', openid ? '成功' : '失败');
    return openid;
  } catch (error) {
    console.error('云开发初始化失败:', error);
    return null;
  }
}

// 默认导出
export default {
  checkLogin,
  checkEnvironment,
  isValidEnvId,
  initCloudBase,
  callFunction,
  getUserOpenid,
  logoutCloudBase
};