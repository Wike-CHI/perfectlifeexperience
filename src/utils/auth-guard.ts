/**
 * 登录态拦截器 - KISS原则实现
 * 用于统一处理需要登录的页面
 */
import { getCachedOpenid, checkLogin } from './cloudbase';

/**
 * 检查登录状态，未登录则弹出提示
 * @param callback 登录后的回调
 * @returns 是否已登录
 */
export const requireAuth = async (callback?: () => void): Promise<boolean> => {
  let openid = getCachedOpenid();

  if (!openid) {
    openid = await checkLogin();
  }

  if (!openid) {
    uni.showModal({
      title: '提示',
      content: '该功能需要登录，是否立即登录？',
      confirmText: '去登录',
      success: (res) => {
        if (res.confirm) {
          uni.switchTab({ url: '/pages/user/user' });
        }
      }
    });
    return false;
  }

  callback?.();
  return true;
};

/**
 * 同步检查登录状态（不弹窗）
 * @returns 是否已登录
 */
export const isLoggedIn = (): boolean => {
  return !!getCachedOpenid();
};

/**
 * 获取登录用户ID，未登录返回null
 */
export const getLoginUserId = async (): Promise<string | null> => {
  return getCachedOpenid() || await checkLogin();
};

export default {
  requireAuth,
  isLoggedIn,
  getLoginUserId
};
