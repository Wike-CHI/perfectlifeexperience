// ==================== 类型定义 ====================

// 微信用户信息
export interface WxUserInfo {
  nickName: string;
  avatarUrl: string;
  gender: number;
  language: string;
  city: string;
  province: string;
  country: string;
}

// 微信云开发环境
export interface WxCloudEnv {
  envId: string;
}

/**
 * 微信云开发 SDK（声明式）
 */
declare const wx: {
  cloud: {
    init: (options: { env: string; traceUser?: boolean }) => void;
    callFunction: (options: { name: string; data?: Record<string, unknown> }) => Promise<{
      result: any;
      errMsg: string;
    }>;
    uploadFile: (options: { cloudPath: string; filePath: string }) => Promise<{
      fileID: string;
      statusCode: number;
      errMsg: string;
    }>;
  };
};

// ==================== 环境配置 ====================

// 云开发环境ID - 生产环境
const ENV_ID: string = 'cloud1-6gmp2q0y3171c353';

// 存储用户登录凭证
let userOpenid: string | null = null;

// 存储键名
const OPENID_KEY = 'cloudbase_openid';
const LOGIN_TIME_KEY = 'cloudbase_login_time';
const LOGIN_EXPIRE_DAYS = 7; // 登录有效期7天

// ==================== 环境检查 ====================

/**
 * 检查环境配置是否有效
 */
export const checkEnvironment = (): boolean => {
  if (!ENV_ID) {
    console.error('❌ 云开发环境ID未配置');
    return false;
  }
  return true;
};

// ==================== 初始化 ====================

/**
 * 初始化云开发
 */
export const initCloudBase = async (): Promise<boolean> => {
  if (!checkEnvironment()) {
    return false;
  }

  if (typeof wx === 'undefined' || !wx.cloud) {
    console.warn('当前环境不支持云开发（非微信小程序环境）');
    return false;
  }

  try {
    console.log('正在初始化云开发，环境ID:', ENV_ID);

    wx.cloud.init({
      env: ENV_ID,
      traceUser: true
    });

    // 尝试静默登录
    const openid = await getUserOpenid();

    if (openid) {
      userOpenid = openid;
      console.log('云开发初始化成功，已获取用户OpenID');
    } else {
      console.warn('云开发初始化成功，但未获取到OpenID（可能是新用户）');
    }

    return true;
  } catch (error) {
    console.error('云开发初始化失败:', error);
    return false;
  }
};

// ==================== OpenID 获取 ====================

/**
 * 获取用户 OpenID（静默登录）
 */
export const getUserOpenid = async (): Promise<string | null> => {
  try {
    // 检查是否已有有效的 OpenID
    const cachedOpenid = uni.getStorageSync(OPENID_KEY);
    const loginTime = uni.getStorageSync(LOGIN_TIME_KEY);

    if (cachedOpenid && loginTime) {
      const now = Date.now();
      const expireTime = loginTime + LOGIN_EXPIRE_DAYS * 24 * 60 * 60 * 1000;

      if (now < expireTime) {
        console.log('使用缓存的OpenID:', cachedOpenid.substring(0, 10) + '***');
        return cachedOpenid;
      }
    }

    // 调用登录云函数进行静默登录
    console.log('调用登录云函数进行静默登录...');

    const result = await wx.cloud.callFunction({
      name: 'login',
      data: {}
    });

    if (result.result && result.result.openid) {
      const openid = result.result.openid;
      console.log('静默登录成功，已获取OpenID');

      // 缓存 OpenID 和登录时间
      uni.setStorageSync(OPENID_KEY, openid);
      recordLoginTime();

      return openid;
    } else {
      console.error('静默登录失败:', result.errMsg || '未知错误');
      return null;
    }
  } catch (error) {
    console.error('获取OpenID失败:', error);
    return null;
  }
};

// ==================== 登录时间记录 ====================

/**
 * 记录登录时间
 */
export const recordLoginTime = (): void => {
  const now = Date.now();
  uni.setStorageSync(LOGIN_TIME_KEY, now);
  console.log('登录时间已记录');
};

// ==================== 获取缓存的 OpenID ====================

/**
 * 获取缓存的用户 OpenID（同步方法）
 */
export const getCachedOpenid = (): string | null => {
  return userOpenid;
};

/**
 * 检查登录状态并获取 OpenID（别名）
 * 等同于 getUserOpenid
 */
export const checkLogin = getUserOpenid;

// ==================== 登录状态检查 ====================

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

// ==================== 退出登录 ====================

/**
 * 退出登录
 */
export const logoutCloudBase = (): void => {
  userOpenid = null;
  uni.removeStorageSync(OPENID_KEY);
  uni.removeStorageSync(LOGIN_TIME_KEY);
  console.log('已退出登录');
};

// ==================== 获取登录剩余天数 ====================

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

  const remainingDays = Math.ceil(remainingMs / (24 * 60 * 60 * 1000));

  return remainingDays;
};

// ==================== 云函数调用（原生 wx.cloud.callFunction）====================

/**
 * 调用云函数（原生）
 */
export const callFunction = async (name: string, data: Record<string, unknown> = {}) => {
  if (typeof wx === 'undefined' || !wx.cloud) {
    throw new Error('当前环境不支持云开发');
  }

  try {
    // 🔧 自动注入 adminToken（如果是管理后台 API）
    let requestData = { ...data };

    if (name === 'admin-api' && !requestData.adminToken) {
      // 动态导入 AdminAuthManager 以避免循环依赖
      const { default: AdminAuthManager } = await import('./admin-auth');
      const token = AdminAuthManager.getToken();

      if (token) {
        requestData.adminToken = token;
        console.log('✅ 已自动注入 adminToken');
      }
    }

    console.log(`调用云函数 ${name} (原生)`, JSON.stringify(requestData));

    const res = await wx.cloud.callFunction({
      name,
      data: requestData
    });

    console.log(`云函数 ${name} 响应:`, res.result);

    // 保持与 HTTP 调用一致的返回格式
    // wx.cloud.callFunction 返回 { result: ..., errMsg: ... }
    // 转换为 { code: ..., msg: ..., data: ... } 格式

    // 检查是否调用失败（errMsg 包含 fail 或 error）
    if (res.errMsg && (res.errMsg.includes('fail') || res.errMsg.includes('error'))) {
      return {
        code: -1,
        msg: res.errMsg,
        data: null
      };
    }

    // 成功时，errMsg 是 "cloud.callFunction:ok"，res.result 包含云函数返回值
    return {
      code: 0,
      msg: 'success',
      data: res.result
    };
  } catch (error) {
    console.error(`调用云函数 ${name} 失败:`, error);

    return {
      code: -1,
      msg: error instanceof Error ? error.message : '调用失败',
      data: null
    };
  }
};

// ==================== 文件上传 ====================

/**
 * 上传文件到云存储
 */
export const uploadFile = async (filePath: string, cloudPath: string): Promise<string> => {
  if (typeof wx === 'undefined' || !wx.cloud) {
    throw new Error('当前环境不支持云开发');
  }

  try {
    console.log(`上传文件: ${filePath} -> ${cloudPath}`);

    const res = await wx.cloud.uploadFile({
      cloudPath,
      filePath
    });

    if (res.statusCode === 0) {
      console.log('文件上传成功:', res.fileID);
      return res.fileID;
    } else {
      throw new Error(`文件上传失败: ${res.statusCode}`);
    }
  } catch (error) {
    console.error('文件上传失败:', error);
    throw error;
  }
};

// ==================== 默认导出 ====================

export default {
  checkEnvironment,
  initCloudBase,
  getUserOpenid,
  getCachedOpenid,
  checkLogin,
  recordLoginTime,
  logoutCloudBase,
  isLoginExpired,
  getLoginRemainingDays,
  callFunction,
  uploadFile
};
