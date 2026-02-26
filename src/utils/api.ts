import type { Product, Category, CartItem, Order, UserInfo, Address, CouponTemplate, UserCoupon, CommissionV2Response } from '@/types';
import { callFunction } from '@/utils/cloudbase';

// 重新导出 callFunction 供外部使用
export { callFunction };

declare const wx: any;

// ==================== 商品相关 API ====================

// 获取商品列表
export const getProducts = async (params?: {
  category?: string;
  keyword?: string;
  page?: number;
  limit?: number;
  sort?: string;
}) => {
  if (typeof wx === 'undefined' || !wx.cloud) {
    throw new Error('当前环境不支持云开发');
  }

  try {
    const res = await callFunction('product', {
      action: 'getProducts',
      data: params || {}
    });

    if (res.code === 0 && res.data) {
      // res.data 是云函数返回值 {code: 0, msg: 'success', data: [...], total: 12}
      // 需要返回 res.data.data 来获取商品数组
      const result = res.data as { code: number; msg: string; data: any[]; total: number };
      return result.data || [];
    }
    throw new Error(res.msg || '获取商品列表失败');
  } catch (error) {
    console.error('获取商品列表失败:', error);
    throw error;
  }
};

// 获取商品详情
export const getProductDetail = async (id: string) => {
  if (typeof wx === 'undefined' || !wx.cloud) {
    throw new Error('当前环境不支持云开发');
  }

  try {
    const res = await callFunction('product', {
      action: 'getProductDetail',
      data: { id }
    });

    if (res.code === 0 && res.data) {
      const result = res.data as { code: number; msg: string; data: any };
      return result.data;
    }
    throw new Error(res.msg || '获取商品详情失败');
  } catch (error) {
    console.error('获取商品详情失败:', error);
    throw error;
  }
};

// 获取热门商品
export const getHotProducts = async (limitCount = 6) => {
  if (typeof wx === 'undefined' || !wx.cloud) {
    throw new Error('当前环境不支持云开发');
  }

  try {
    const res = await callFunction('product', {
      action: 'getHotProducts',
      data: { limit: limitCount }
    });

    if (res.code === 0 && res.data) {
      const result = res.data as { code: number; msg: string; data: any[] };
      return result.data || [];
    }
    throw new Error(res.msg || '获取热门商品失败');
  } catch (error) {
    console.error('获取热门商品失败:', error);
    throw error;
  }
};

// 获取新品
export const getNewProducts = async (limitCount = 6) => {
  if (typeof wx === 'undefined' || !wx.cloud) {
    throw new Error('当前环境不支持云开发');
  }

  try {
    const res = await callFunction('product', {
      action: 'getNewProducts',
      data: { limit: limitCount }
    });

    if (res.code === 0 && res.data) {
      const result = res.data as { code: number; msg: string; data: any[] };
      return result.data || [];
    }
    throw new Error(res.msg || '获取新品失败');
  } catch (error) {
    console.error('获取新品失败:', error);
    throw error;
  }
};

// ==================== 分类相关 API ====================

// 获取分类列表
export const getCategories = async () => {
  if (typeof wx === 'undefined' || !wx.cloud) {
    throw new Error('当前环境不支持云开发');
  }

  try {
    const res = await callFunction('product', {
      action: 'getCategories'
    });

    if (res.code === 0 && res.data) {
      const result = res.data as { code: number; msg: string; data: any[] };
      return result.data || [];
    }
    throw new Error(res.msg || '获取分类列表失败');
  } catch (error) {
    console.error('获取分类列表失败:', error);
    throw error;
  }
};

// ==================== 购物车相关 API ====================
const CART_KEY = 'local_cart';

// 获取购物车列表
export const getCartItems = async () => {
  const cartJson = uni.getStorageSync(CART_KEY);
  const cart: CartItem[] = cartJson ? JSON.parse(cartJson) : [];
  return cart.sort((a, b) => new Date(b.updateTime!).getTime() - new Date(a.updateTime!).getTime());
};

// 添加商品到购物车
export const addToCart = async (item: Omit<CartItem, '_id' | '_openid'>) => {
  const cartItems = await getCartItems();
  // 查找是否存在相同商品且规格一致的记录
  const existingIndex = cartItems.findIndex(p =>
    p.productId === item.productId && p.specs === item.specs
  );

  if (existingIndex > -1) {
    cartItems[existingIndex].quantity += item.quantity;
    // 如果价格变了（虽然同一个规格一般价格不变，但为了保险），也可以更新下
    cartItems[existingIndex].price = item.price;
    cartItems[existingIndex].updateTime = new Date();
  } else {
    cartItems.push({
      ...item,
      _id: `cart_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      updateTime: new Date()
    });
  }
  uni.setStorageSync(CART_KEY, JSON.stringify(cartItems));
  return { _id: cartItems[existingIndex > -1 ? existingIndex : cartItems.length - 1]._id, stats: { updated: 1 } };
};

// 更新购物车商品数量
export const updateCartQuantity = async (id: string, quantity: number) => {
  let cartItems = await getCartItems();
  if (quantity <= 0) {
    cartItems = cartItems.filter(item => item._id !== id);
  } else {
    const item = cartItems.find(p => p._id === id);
    if (item) {
      item.quantity = quantity;
      item.updateTime = new Date();
    }
  }
  uni.setStorageSync(CART_KEY, JSON.stringify(cartItems));
  return { stats: { updated: 1 } };
};

// 更新购物车商品选中状态
export const updateCartSelected = async (id: string, selected: boolean) => {
  const cartItems = await getCartItems();
  const item = cartItems.find(p => p._id === id);
  if (item) {
    item.selected = selected;
    item.updateTime = new Date();
    uni.setStorageSync(CART_KEY, JSON.stringify(cartItems));
  }
  return { stats: { updated: 1 } };
};

// 批量更新购物车选中状态
export const batchUpdateCartSelected = async (selected: boolean) => {
  const cartItems = await getCartItems();
  cartItems.forEach(item => item.selected = selected);
  uni.setStorageSync(CART_KEY, JSON.stringify(cartItems));
  return { stats: { updated: cartItems.length } };
};

// 删除购物车商品
export const removeFromCart = async (id: string) => {
  let cartItems = await getCartItems();
  cartItems = cartItems.filter(item => item._id !== id);
  uni.setStorageSync(CART_KEY, JSON.stringify(cartItems));
  return { stats: { removed: 1 } };
};

// 清空购物车
export const clearCart = async () => {
  uni.removeStorageSync(CART_KEY);
  return { stats: { removed: 1 } };
};

// ==================== 订单相关 API ====================
const ORDER_KEY = 'local_orders';

// 创建订单
export const createOrder = async (order: Omit<Order, '_id' | '_openid' | 'orderNo' | 'createTime'>) => {
  const orderNo = generateOrderNo();
  const newOrder = {
    ...order,
    orderNo
  };
  
  try {
    const res = await callFunction('order', {
      action: 'createOrder',
      data: newOrder
    });
    
    if (res.code === 0 && res.data) {
      // res.data 是云函数返回值 {code: 0, msg: '...', data: {orderId: '...'}}
      // 需要访问 res.data.data.orderId
      const cloudResult = res.data as { code: number; msg: string; data: { orderId?: string } };
      const orderId = cloudResult.data?.orderId;
      console.log('[api.ts] createOrder 云函数返回:', cloudResult);
      console.log('[api.ts] createOrder orderId:', orderId);
      return { _id: orderId };
    }
    throw new Error(res.msg || '创建订单失败');
  } catch (error) {
    console.error('创建订单失败:', error);
    // 降级到本地存储（如果云函数失败）- 但这会导致数据不一致，暂时只抛出错误
    throw error;
  }
};

// 获取订单列表
export const getOrders = async (status?: string) => {
  try {
    const res = await callFunction('order', {
      action: 'getOrders',
      data: { status }
    });

    if (res.code === 0 && res.data) {
      // res.data 是云函数返回的 {code: 0, msg: '...', data: {orders: [...]}}
      const cloudFunctionData = res.data as { code: number; msg: string; data: { orders: Order[] } };
      const orders = cloudFunctionData.data?.orders || [];

      // 更新本地缓存
      uni.setStorageSync(ORDER_KEY, JSON.stringify(orders));
      return orders;
    }
    throw new Error(res.msg || '获取订单失败');
  } catch (error) {
    console.error('获取订单列表失败:', error);
    // 降级：从本地缓存读取
    const ordersJson = uni.getStorageSync(ORDER_KEY);
    let orders: Order[] = ordersJson ? JSON.parse(ordersJson) : [];
    if (status && status !== 'all') {
      orders = orders.filter(o => o.status === status);
    }
    return orders;
  }
};

// 获取订单详情
export const getOrderDetail = async (id: string) => {
  // 优先从获取到的订单列表中查找
  const orders = await getOrders('all');
  const order = orders.find(o => o._id === id);
  if (!order) throw new Error('订单不存在');
  return order;
};

// 更新订单状态
export const updateOrderStatus = async (id: string, status: Order['status']) => {
  try {
    const res = await callFunction('order', {
      action: 'updateOrderStatus',
      data: { orderId: id, status }
    });
    
    if (res.code === 0) {
      return { stats: { updated: 1 } };
    }
    throw new Error(res.msg || '更新订单状态失败');
  } catch (error) {
    console.error('更新订单状态失败:', error);
    throw error;
  }
};

// 取消订单
export const cancelOrder = async (id: string) => {
  try {
    const res = await callFunction('order', {
      action: 'cancelOrder',
      data: { orderId: id }
    });
    
    if (res.code === 0) {
      return { stats: { updated: 1 } };
    }
    throw new Error(res.msg || '取消订单失败');
  } catch (error) {
    console.error('取消订单失败:', error);
    throw error;
  }
};

// ==================== 用户相关 API ====================
const USER_KEY = 'local_user';
const LOGIN_TIME_KEY = 'login_time';
const LOGIN_EXPIRE_DAYS = 7; // 登录有效期7天

// 微信用户信息类型
interface WxUserProfile {
  nickName: string;
  avatarUrl: string;
  gender: number;
  country: string;
  province: string;
  city: string;
  language: string;
}

// 云端用户信息类型
interface CloudUserInfo {
  userId: string;
  nickName: string;
  avatarUrl: string;
  gender: number;
  country: string;
  province: string;
  city: string;
  phone: string;
  isVip: boolean;
  vipLevel: number;
  createTime: Date;
  lastLoginTime: Date;
  loginCount: number;
  addresses?: Address[];
}

// 获取微信用户信息（需要用户点击按钮触发）
export const getWxUserProfile = (): Promise<WxUserProfile> => {
  return new Promise((resolve, reject) => {
    uni.getUserProfile({
      desc: '获取头像昵称',
      success: (res: any) => {
        if (res.userInfo) {
          resolve({
            nickName: res.userInfo.nickName,
            avatarUrl: res.userInfo.avatarUrl,
            gender: res.userInfo.gender,
            country: res.userInfo.country,
            province: res.userInfo.province,
            city: res.userInfo.city,
            language: res.userInfo.language
          });
        } else {
          reject(new Error('获取用户信息失败'));
        }
      },
      fail: (err) => {
        console.error('获取用户信息失败:', err);
        // 用户拒绝授权时，提供默认信息
        if (err.errMsg && err.errMsg.includes('deny')) {
          resolve({
            nickName: '微信用户',
            avatarUrl: '/static/logo.png',
            gender: 0,
            country: '',
            province: '',
            city: '',
            language: 'zh_CN'
          });
        } else {
          reject(err);
        }
      }
    });
  });
};

// 获取用户手机号（需要专用按钮触发）
export const getUserPhoneNumber = (e: any): Promise<string> => {
  return new Promise((resolve, reject) => {
    // 检查是否获取到了加密数据
    if (e.detail && e.detail.encryptedData && e.detail.iv) {
      // 这里需要发送到后端解密，暂时返回提示
      console.log('获取手机号加密数据:', e.detail);
      resolve('手机号获取中...');
    } else {
      // 用户拒绝授权或其他错误
      if (e.detail.errMsg && e.detail.errMsg.includes('deny')) {
        reject(new Error('您取消了手机号授权'));
      } else {
        reject(new Error('获取手机号失败，请重试'));
      }
    }
  });
};

// 获取用户信息（从本地存储读取，如果没有则返回 null）
export const getUserInfo = async (): Promise<UserInfo | null> => {
  const userJson = uni.getStorageSync(USER_KEY);
  if (!userJson) {
    return null;
  }
  return JSON.parse(userJson) as UserInfo;
};

// 检查用户是否已登录（有用户信息）
export const isUserLoggedIn = async (): Promise<boolean> => {
  const user = await getUserInfo();
  return user !== null;
};

// 创建或更新用户信息
export const saveUserInfo = async (userInfo: Partial<UserInfo>) => {
  let user = await getUserInfo();
  if (user) {
    user = { ...user, ...userInfo };
  } else {
    user = {
      ...userInfo,
      _id: userInfo._id || `user_${Date.now()}`,
      nickName: userInfo.nickName || '微信用户',
      avatarUrl: userInfo.avatarUrl || '',
      addresses: userInfo.addresses || [],
      createTime: new Date()
    } as UserInfo;
  }
  uni.setStorageSync(USER_KEY, JSON.stringify(user));
  return { _id: user._id };
};

// 使用微信用户信息创建/更新用户
export const saveWxUserInfo = async (wxProfile: WxUserProfile, openid?: string) => {
  const userInfo: Partial<UserInfo> = {
    _id: openid,
    nickName: wxProfile.nickName,
    avatarUrl: wxProfile.avatarUrl,
    addresses: []
  };
  return saveUserInfo(userInfo);
};

// 添加地址（同步到云端）
export const addAddress = async (address: Address) => {
  const user = await getUserInfo();
  if (!user) throw new Error('用户不存在');

  if (!user.addresses) user.addresses = [];

  if (address.isDefault) {
    user.addresses.forEach(addr => addr.isDefault = false);
  }

  user.addresses.push(address);

  // 同步到云端
  const success = await updateCloudUserInfo({ addresses: user.addresses });
  if (!success) {
    console.warn('地址同步到云端失败，但本地已更新');
  }

  uni.setStorageSync(USER_KEY, JSON.stringify(user));
  return { stats: { updated: 1 } };
};

// 退出登录
export const logout = async () => {
  uni.removeStorageSync(USER_KEY);
  uni.removeStorageSync(LOGIN_TIME_KEY);
  // 同时清除云开发登录态
  const { logoutCloudBase } = await import('./cloudbase');
  logoutCloudBase();
  return { stats: { removed: 1 } };
};

// ==================== 云端用户相关 API ====================

/**
 * 同步用户登录信息到云端
 * @param wxProfile - 微信用户信息
 * @param openid - 用户openid
 */
export const syncUserToCloud = async (wxProfile: WxUserProfile, openid: string): Promise<{
  success: boolean;
  isNewUser: boolean;
  userId: string;
  userInfo?: any;
  message: string;
}> => {
  try {
    const res = await callFunction('user', {
      action: 'loginOrUpdate',
      data: {
        userInfo: {
          nickName: wxProfile.nickName,
          avatarUrl: wxProfile.avatarUrl,
          gender: wxProfile.gender,
          country: wxProfile.country,
          province: wxProfile.province,
          city: wxProfile.city
        }
      }
    });
    
    if (res.code === 0 && res.data) {
      // 记录登录时间
      uni.setStorageSync(LOGIN_TIME_KEY, Date.now());
      return res.data;
    }
    throw new Error(res.msg || '同步用户失败');
  } catch (error) {
    console.error('同步用户到云端失败:', error);
    throw error;
  }
};

/**
 * 从云端获取用户信息
 */
export const getCloudUserInfo = async (): Promise<CloudUserInfo | null> => {
  try {
    const res = await callFunction('user', {
      action: 'getUserInfo'
    });
    
    if (res.code === 0 && res.data) {
      return (res.data as any).userInfo || res.data;
    }
    return null;
  } catch (error) {
    console.error('获取云端用户信息失败:', error);
    return null;
  }
};

/**
 * 更新云端用户信息
 */
export const updateCloudUserInfo = async (updateData: Partial<CloudUserInfo>): Promise<boolean> => {
  try {
    const res = await callFunction('user', {
      action: 'updateUserInfo',
      data: updateData
    });
    
    return res.code === 0 && res.data !== undefined;
  } catch (error) {
    console.error('更新云端用户信息失败:', error);
    return false;
  }
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
 * 完整的登录流程：获取用户信息 + 云端同步
 * @param openid - 用户openid
 * @returns 登录结果
 */
export const fullLogin = async (openid: string): Promise<{
  success: boolean;
  isNewUser: boolean;
  userInfo?: UserInfo;
  message: string;
}> => {
  try {
    // 1. 获取微信用户信息（需要用户点击触发）
    const wxProfile = await getWxUserProfile();
    
    // 2. 同步到云端
    const cloudResult = await syncUserToCloud(wxProfile, openid);
    
    if (!cloudResult.success) {
      throw new Error(cloudResult.message);
    }
    
    // 3. 保存到本地
    // 优先使用云端返回的用户信息（因为可能包含了之前的修改），如果没有则使用微信信息
    const cloudUser = cloudResult.userInfo || {};
    
    const userInfo: UserInfo = {
      _id: openid,
      nickName: cloudUser.nickName || wxProfile.nickName,
      avatarUrl: cloudUser.avatarUrl || wxProfile.avatarUrl,
      addresses: cloudUser.addresses || []
    };
    await saveUserInfo(userInfo);
    
    return {
      success: true,
      isNewUser: cloudResult.isNewUser,
      userInfo,
      message: cloudResult.message
    };
  } catch (error: any) {
    console.error('完整登录流程失败:', error);
    return {
      success: false,
      isNewUser: false,
      message: error.message || '登录失败'
    };
  }
};

/**
 * 检查并刷新登录状态
 * 如果登录过期，清除本地缓存
 */
export const checkAndRefreshLoginStatus = async (): Promise<boolean> => {
  if (isLoginExpired()) {
    console.log('登录已过期，清除登录状态');
    await logout();
    return false;
  }
  return true;
};

// 更新地址
// 更新地址（同步到云端）
export const updateAddress = async (index: number, address: Address) => {
  const user = await getUserInfo();
  if (!user) throw new Error('用户不存在');

  if (address.isDefault) {
    user.addresses.forEach((addr, i) => {
      if (i !== index) addr.isDefault = false;
    });
  }

  user.addresses[index] = address;

  // 同步到云端
  const success = await updateCloudUserInfo({ addresses: user.addresses });
  if (!success) {
    console.warn('地址同步到云端失败，但本地已更新');
  }

  uni.setStorageSync(USER_KEY, JSON.stringify(user));
  return { stats: { updated: 1 } };
};

// 删除地址（同步到云端）
export const deleteAddress = async (index: number) => {
  const user = await getUserInfo();
  if (!user) throw new Error('用户不存在');

  user.addresses.splice(index, 1);

  // 同步到云端
  const success = await updateCloudUserInfo({ addresses: user.addresses });
  if (!success) {
    console.warn('地址同步到云端失败，但本地已更新');
  }

  uni.setStorageSync(USER_KEY, JSON.stringify(user));
  return { stats: { updated: 1 } };
};

// ==================== 工具函数 ====================

// 生成订单号
const generateOrderNo = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
  return `DY${year}${month}${day}${random}`;
};

// 计算购物车总价
export const calculateCartTotal = (items: CartItem[]) => {
  return items
    .filter(item => item.selected)
    .reduce((total, item) => total + item.price * item.quantity, 0);
};

// 格式化价格
export const formatPrice = (price: number) => {
  return (price / 100).toFixed(2);
};

// ==================== 钱包相关 API ====================

// 获取钱包余额
export const getWalletBalance = async () => {
  // 检查是否有云开发环境
  if (typeof wx === 'undefined' || !wx.cloud) {
    console.warn('当前环境不支持云开发，返回模拟数据');
    return { balance: 0 };
  }

  try {
    const res = await callFunction('wallet', { action: 'getBalance' });
    if (res.code === 0 && res.data) {
      // res.data 是云函数返回的 {code: 0, data: {balance: ...}}
      const walletData = (res.data as any).data || res.data;
      return { balance: walletData.balance || 0 };
    }
    throw new Error(res.msg || '获取余额失败');
  } catch (error) {
    console.error('获取钱包余额失败:', error);
    // 降级处理
    return { balance: 0 };
  }
};

// 创建充值支付订单（微信支付）
export const createRechargePayment = async (amount: number, giftAmount: number = 0, openid: string) => {
  if (typeof wx === 'undefined' || !wx.cloud) {
    throw new Error('当前环境不支持云开发');
  }

  try {
    const res = await callFunction('wechatpay', { 
      action: 'createRechargePayment',
      data: { amount, giftAmount, openid }
    });
    
    if (res.code === 0 && res.data) {
      // res.data 是云函数返回值 {success: true, data: {payParams: {...}}}
      const wechatpayResult = res.data as { success: boolean; data?: { payParams: any; orderNo?: string } };
      if (wechatpayResult.success && wechatpayResult.data?.payParams) {
        return {
          payParams: wechatpayResult.data.payParams,
          orderNo: wechatpayResult.data.orderNo
        };
      }
    }
    throw new Error((res.data as any)?.message || res.msg || '创建充值支付失败');
  } catch (error) {
    console.error('创建充值支付失败:', error);
    throw error;
  }
};

// 充值（已废弃，请使用 createRechargePayment + 微信支付）
export const rechargeWallet = async (amount: number, giftAmount: number = 0) => {
  if (typeof wx === 'undefined' || !wx.cloud) {
    throw new Error('当前环境不支持云开发');
  }

  try {
    const res = await callFunction('wallet', { 
      action: 'recharge',
      data: { amount, giftAmount }
    });
    
    if (res.code === 0) {
      return res.data;
    }
    throw new Error(res.msg || '充值失败');
  } catch (error) {
    console.error('充值失败:', error);
    throw error;
  }
};

// 获取交易记录
export const getWalletTransactions = async (page = 1, limit = 20) => {
  if (typeof wx === 'undefined' || !wx.cloud) {
    return { list: [], total: 0 };
  }

  try {
    const res = await callFunction('wallet', { 
      action: 'getTransactions',
      data: { page, limit }
    });
    
    if (res.code === 0) {
      return res.data;
    }
    throw new Error(res.msg || '获取交易记录失败');
  } catch (error) {
    console.error('获取交易记录失败:', error);
    throw error;
  }
};

// 确认充值状态（支付成功后主动调用）
export const confirmRecharge = async (orderNo: string) => {
  if (typeof wx === 'undefined' || !wx.cloud) {
    throw new Error('当前环境不支持云开发');
  }

  try {
    const res = await callFunction('wechatpay', {
      action: 'confirmRecharge',
      data: { orderNo }
    });

    if (res.code === 0 && res.data) {
      return res.data;
    }
    throw new Error((res.data as any)?.message || res.msg || '确认充值失败');
  } catch (error) {
    console.error('确认充值失败:', error);
    throw error;
  }
};

// ==================== 佣金钱包相关 API ====================

// 获取佣金钱包余额
export const getCommissionWalletBalance = async () => {
  if (typeof wx === 'undefined' || !wx.cloud) {
    throw new Error('当前环境不支持云开发');
  }

  try {
    const res = await callFunction('commission-wallet', { action: 'getBalance' });
    if (res.code === 0 && res.data) {
      const walletData = (res.data as any).data || res.data;
      return {
        balance: walletData.balance || 0,
        totalCommission: walletData.totalCommission || 0,
        totalWithdrawn: walletData.totalWithdrawn || 0
      };
    }
    throw new Error(res.msg || '获取佣金钱包失败');
  } catch (error) {
    console.error('获取佣金钱包失败:', error);
    // 降级处理
    return { balance: 0, totalCommission: 0, totalWithdrawn: 0 };
  }
};

// 申请提现到微信余额
export const applyCommissionWithdraw = async (amount: number) => {
  if (typeof wx === 'undefined' || !wx.cloud) {
    throw new Error('当前环境不支持云开发');
  }

  try {
    const res = await callFunction('commission-wallet', {
      action: 'applyWithdraw',
      data: { amount }
    });

    if (res.code === 0) {
      return res.data;
    }
    throw new Error(res.msg || '提现申请失败');
  } catch (error) {
    console.error('提现申请失败:', error);
    throw error;
  }
};

// 获取提现记录列表
export const getCommissionWithdrawals = async (params?: {
  status?: string;
  page?: number;
  limit?: number;
}) => {
  if (typeof wx === 'undefined' || !wx.cloud) {
    throw new Error('当前环境不支持云开发');
  }

  try {
    const res = await callFunction('commission-wallet', {
      action: 'getWithdrawals',
      data: params || {}
    });

    if (res.code === 0) {
      return res.data;
    }
    throw new Error(res.msg || '获取提现记录失败');
  } catch (error) {
    console.error('获取提现记录失败:', error);
    throw error;
  }
};

// 获取佣金钱包交易记录
export const getCommissionTransactions = async (params?: {
  type?: string;
  page?: number;
  limit?: number;
}) => {
  if (typeof wx === 'undefined' || !wx.cloud) {
    throw new Error('当前环境不支持云开发');
  }

  try {
    const res = await callFunction('commission-wallet', {
      action: 'getTransactions',
      data: params || {}
    });

    if (res.code === 0) {
      return res.data;
    }
    throw new Error(res.msg || '获取交易记录失败');
  } catch (error) {
    console.error('获取交易记录失败:', error);
    throw error;
  }
};

// ==================== 优惠券相关 API ====================

const COUPON_KEY = 'local_coupons';

// 获取优惠券模板列表
export const getCouponTemplates = async () => {
  if (typeof wx === 'undefined' || !wx.cloud) {
    throw new Error('当前环境不支持云开发');
  }

  try {
    const res = await callFunction('coupon', {
      action: 'getTemplates'
    });

    if (res.code === 0) {
      return res.data;
    }
    throw new Error(res.msg || '获取优惠券模板失败');
  } catch (error) {
    console.error('获取优惠券模板失败:', error);
    throw error;
  }
};

// 获取我的优惠券列表
export const getMyCoupons = async (status?: 'unused' | 'used' | 'expired') => {
  if (typeof wx === 'undefined' || !wx.cloud) {
    throw new Error('当前环境不支持云开发');
  }

  try {
    const res = await callFunction('coupon', {
      action: 'getMyCoupons',
      data: { status }
    });

    if (res.code === 0) {
      return res.data;
    }
    throw new Error(res.msg || '获取我的优惠券失败');
  } catch (error) {
    console.error('获取我的优惠券失败:', error);
    throw error;
  }
};

// 领取优惠券
export const receiveCoupon = async (templateId: string) => {
  if (typeof wx === 'undefined' || !wx.cloud) {
    throw new Error('当前环境不支持云开发');
  }

  try {
    const res = await callFunction('coupon', {
      action: 'receiveCoupon',
      data: { templateId }
    });

    if (res.code === 0) {
      return res.data;
    }
    throw new Error(res.msg || '领取优惠券失败');
  } catch (error) {
    console.error('领取优惠券失败:', error);
    throw error;
  }
};

// 获取订单可用优惠券
export const getAvailableCoupons = async (orderAmount: number) => {
  if (typeof wx === 'undefined' || !wx.cloud) {
    throw new Error('当前环境不支持云开发');
  }

  try {
    const res = await callFunction('coupon', {
      action: 'getAvailableCoupons',
      data: { orderAmount }
    });

    if (res.code === 0) {
      return res.data;
    }
    throw new Error(res.msg || '获取可用优惠券失败');
  } catch (error) {
    console.error('获取可用优惠券失败:', error);
    throw error;
  }
};

// 使用优惠券
export const useCoupon = async (couponId: string, orderNo: string) => {
  if (typeof wx === 'undefined' || !wx.cloud) {
    throw new Error('当前环境不支持云开发');
  }

  try {
    const res = await callFunction('coupon', {
      action: 'useCoupon',
      data: { couponId, orderNo }
    });

    if (res.code === 0) {
      return res.data;
    }
    throw new Error(res.msg || '使用优惠券失败');
  } catch (error) {
    console.error('使用优惠券失败:', error);
    throw error;
  }
};

// 计算优惠券优惠金额
export const calculateCouponDiscount = (coupon: UserCoupon, orderAmount: number): number => {
  if (!coupon.template) return 0;
  
  const template = coupon.template;
  
  // 检查最低消费
  if (template.minAmount && orderAmount < template.minAmount) {
    return 0;
  }
  
  switch (template.type) {
    case 'amount':
      return Math.min(template.value, orderAmount);
    case 'discount':
      // value 是折扣率，如 85 表示 8.5 折
      return Math.floor(orderAmount * (100 - template.value) / 100);
    case 'no_threshold':
      return Math.min(template.value, orderAmount);
    default:
      return 0;
  }
};

// ==================== 推广相关 API ====================
import type { PromotionInfo } from '@/types';

// 绑定推广关系
export const bindPromotionRelation = async (parentInviteCode: string, userInfo: {
  nickName: string;
  avatarUrl: string;
}) => {
  if (typeof wx === 'undefined' || !wx.cloud) {
    throw new Error('当前环境不支持云开发');
  }

  try {
    // 获取设备信息（用于防刷）
    const deviceInfo = {
      ip: '', // 服务端获取
      timestamp: Date.now()
    };

    const res = await callFunction('promotion', {
      action: 'bindRelation',
      parentInviteCode,
      userInfo,
      deviceInfo
    });

    if (res.code === 0) {
      return res.data;
    }
    throw new Error(res.msg || '绑定失败');
  } catch (error) {
    console.error('绑定推广关系失败:', error);
    throw error;
  }
};

// 获取推广信息
export const getPromotionInfo = async (): Promise<PromotionInfo> => {
  if (typeof wx === 'undefined' || !wx.cloud) {
    throw new Error('当前环境不支持云开发');
  }

  try {
    const res = await callFunction('promotion', { action: 'getInfo' });
    if (res.code === 0 && res.data) {
      // res.data 是云函数返回的 {code: 0, msg: '...', data: {...}}
      return (res.data as any).data || res.data;
    }
    throw new Error(res.msg || '获取失败');
  } catch (error) {
    console.error('获取推广信息失败:', error);
    throw error;
  }
};

// 获取团队成员列表
export const getTeamMembers = async (level: number = 1, page: number = 1, limit: number = 20) => {
  if (typeof wx === 'undefined' || !wx.cloud) {
    throw new Error('当前环境不支持云开发');
  }

  try {
    const res = await callFunction('promotion', {
      action: 'getTeamMembers',
      level,
      page,
      limit
    });

    if (res.code === 0) {
      return res.data;
    }
    throw new Error(res.msg || '获取失败');
  } catch (error) {
    console.error('获取团队成员失败:', error);
    throw error;
  }
};

// 获取奖励明细
export const getRewardRecords = async (status?: string, page: number = 1, limit: number = 20, rewardType?: string) => {
  if (typeof wx === 'undefined' || !wx.cloud) {
    throw new Error('当前环境不支持云开发');
  }

  try {
    const res = await callFunction('promotion', {
      action: 'getRewardRecords',
      status,
      rewardType,
      page,
      limit
    });

    if (res.code === 0) {
      return res.data;
    }
    throw new Error(res.msg || '获取失败');
  } catch (error) {
    console.error('获取奖励明细失败:', error);
    throw error;
  }
};

// 生成推广二维码
export const generatePromotionQRCode = async (page?: string) => {
  if (typeof wx === 'undefined' || !wx.cloud) {
    throw new Error('当前环境不支持云开发');
  }

  try {
    const res = await callFunction('promotion', {
      action: 'generateQRCode',
      page
    });

    if (res.code === 0) {
      return res.data;
    }
    throw new Error(res.msg || '生成失败');
  } catch (error) {
    console.error('生成二维码失败:', error);
    throw error;
  }
};

// 计算订单推广奖励（订单完成后调用）
export const calculatePromotionReward = async (orderId: string, buyerId: string, orderAmount: number) => {
  if (typeof wx === 'undefined' || !wx.cloud) {
    throw new Error('当前环境不支持云开发');
  }

  try {
    const res = await callFunction('promotion', {
      action: 'calculateRewardV2',
      orderId,
      buyerId,
      orderAmount
    });

    if (res.code === 0) {
      return res.data as CommissionV2Response;
    }
    throw new Error(res.msg || '计算失败');
  } catch (error) {
    console.error('计算奖励失败:', error);
    throw error;
  }
};

// ==================== 推广升级相关 API ====================

// 代理层级升级（带跟随升级）
// 注意：不传递 userId，云函数会从 wxContext.OPENID 自动获取
export const promoteAgentLevel = async (
  oldLevel: number,
  newLevel: number
): Promise<import('@/types').PromotionResponse> => {
  if (typeof wx === 'undefined' || !wx.cloud) {
    throw new Error('当前环境不支持云开发');
  }

  try {
    const res = await callFunction('promotion', {
      action: 'promoteAgentLevel',
      // 不传递 userId，云函数会从 wxContext.OPENID 获取
      oldLevel,
      newLevel
    });

    if (res.code === 0) {
      return res.data as import('@/types').PromotionResponse;
    }
    throw new Error(res.msg || '升级失败');
  } catch (error) {
    console.error('代理层级升级失败:', error);
    throw error;
  }
};

// 星级升级
// 注意：不传递 userId，云函数会从 wxContext.OPENID 自动获取
export const promoteStarLevel = async (
  oldStarLevel: number,
  newStarLevel: number
): Promise<{ success: boolean; promoted: { userId: string; from: number; to: number } }> => {
  if (typeof wx === 'undefined' || !wx.cloud) {
    throw new Error('当前环境不支持云开发');
  }

  try {
    const res = await callFunction('promotion', {
      action: 'promoteStarLevel',
      // 不传递 userId，云函数会从 wxContext.OPENID 获取
      oldStarLevel,
      newStarLevel
    });

    if (res.code === 0) {
      return res.data;
    }
    throw new Error(res.msg || '升级失败');
  } catch (error) {
    console.error('星级升级失败:', error);
    throw error;
  }
};

// ==================== 退款相关 API ====================

/**
 * 申请退款
 */
export const applyRefund = async (params: {
  orderId: string;
  refundType: 'only_refund' | 'return_refund';
  refundReason: string;
  products?: Array<{
    productId: string;
    refundQuantity: number;
  }>;
}) => {
  if (typeof wx === 'undefined' || !wx.cloud) {
    throw new Error('当前环境不支持云开发');
  }

  try {
    const res = await callFunction('order', {
      action: 'applyRefund',
      data: params
    });

    if (res.code === 0) {
      return res.data;
    }
    throw new Error(res.msg || '申请退款失败');
  } catch (error) {
    console.error('申请退款失败:', error);
    throw error;
  }
};

/**
 * 取消退款申请
 */
export const cancelRefund = async (refundId: string) => {
  if (typeof wx === 'undefined' || !wx.cloud) {
    throw new Error('当前环境不支持云开发');
  }

  try {
    const res = await callFunction('order', {
      action: 'cancelRefund',
      data: { refundId }
    });

    if (res.code === 0) {
      return res.data;
    }
    throw new Error(res.msg || '取消退款失败');
  } catch (error) {
    console.error('取消退款失败:', error);
    throw error;
  }
};

/**
 * 更新退货物流信息
 */
export const updateReturnLogistics = async (params: {
  refundId: string;
  company: string;
  trackingNo: string;
}) => {
  if (typeof wx === 'undefined' || !wx.cloud) {
    throw new Error('当前环境不支持云开发');
  }

  try {
    const res = await callFunction('order', {
      action: 'updateReturnLogistics',
      data: params
    });

    if (res.code === 0) {
      return res.data;
    }
    throw new Error(res.msg || '更新物流失败');
  } catch (error) {
    console.error('更新物流失败:', error);
    throw error;
  }
};

/**
 * 获取退款列表
 */
export const getRefundList = async (status?: string) => {
  if (typeof wx === 'undefined' || !wx.cloud) {
    throw new Error('当前环境不支持云开发');
  }

  try {
    const res = await callFunction('order', {
      action: 'getRefundList',
      data: { status }
    });

    if (res.code === 0) {
      return res.data;
    }
    throw new Error(res.msg || '获取退款列表失败');
  } catch (error) {
    console.error('获取退款列表失败:', error);
    throw error;
  }
};

/**
 * 获取退款详情
 */
export const getRefundDetail = async (refundId: string) => {
  if (typeof wx === 'undefined' || !wx.cloud) {
    throw new Error('当前环境不支持云开发');
  }

  try {
    const res = await callFunction('order', {
      action: 'getRefundDetail',
      data: { refundId }
    });

    if (res.code === 0) {
      return res.data;
    }
    throw new Error(res.msg || '获取退款详情失败');
  } catch (error) {
    console.error('获取退款详情失败:', error);
    throw error;
  }
};

// ==================== 管理端退款 API ====================

/**
 * 管理端 - 获取退款列表
 */
export const adminGetRefundList = async (params: {
  page?: number;
  limit?: number;
  status?: string;
  keyword?: string;
  startDate?: string;
  endDate?: string;
  adminToken: string;
}) => {
  if (typeof wx === 'undefined' || !wx.cloud) {
    throw new Error('当前环境不支持云开发');
  }

  try {
    const res = await callFunction('admin-api', {
      action: 'getRefundList',
      data: params
    });

    if (res.code === 0) {
      return res.data;
    }
    throw new Error(res.msg || '获取退款列表失败');
  } catch (error) {
    console.error('获取退款列表失败:', error);
    throw error;
  }
};

/**
 * 管理端 - 获取退款详情
 */
export const adminGetRefundDetail = async (params: {
  refundId: string;
  adminToken: string;
}) => {
  if (typeof wx === 'undefined' || !wx.cloud) {
    throw new Error('当前环境不支持云开发');
  }

  try {
    const res = await callFunction('admin-api', {
      action: 'getRefundDetail',
      data: params
    });

    if (res.code === 0) {
      return res.data;
    }
    throw new Error(res.msg || '获取退款详情失败');
  } catch (error) {
    console.error('获取退款详情失败:', error);
    throw error;
  }
};

/**
 * 管理端 - 审核通过退款
 */
export const adminApproveRefund = async (params: {
  refundId: string;
  refundAmount?: number;
  remark?: string;
  adminToken: string;
}) => {
  if (typeof wx === 'undefined' || !wx.cloud) {
    throw new Error('当前环境不支持云开发');
  }

  try {
    const res = await callFunction('admin-api', {
      action: 'approveRefund',
      data: params
    });

    if (res.code === 0) {
      return res.data;
    }
    throw new Error(res.msg || '审核退款失败');
  } catch (error) {
    console.error('审核退款失败:', error);
    throw error;
  }
};

/**
 * 管理端 - 确认收货
 */
export const adminConfirmReceipt = async (params: {
  refundId: string;
  adminToken: string;
}) => {
  if (typeof wx === 'undefined' || !wx.cloud) {
    throw new Error('当前环境不支持云开发');
  }

  try {
    const res = await callFunction('admin-api', {
      action: 'confirmReceipt',
      data: params
    });

    if (res.code === 0) {
      return res.data;
    }
    throw new Error(res.msg || '确认收货失败');
  } catch (error) {
    console.error('确认收货失败:', error);
    throw error;
  }
};

/**
 * 管理端 - 拒绝退款
 */
export const adminRejectRefund = async (params: {
  refundId: string;
  reason: string;
  adminToken: string;
}) => {
  if (typeof wx === 'undefined' || !wx.cloud) {
    throw new Error('当前环境不支持云开发');
  }

  try {
    const res = await callFunction('admin-api', {
      action: 'rejectRefund',
      data: params
    });

    if (res.code === 0) {
      return res.data;
    }
    throw new Error(res.msg || '拒绝退款失败');
  } catch (error) {
    console.error('拒绝退款失败:', error);
    throw error;
  }
};

/**
 * 管理端 - 重试退款
 */
export const adminRetryRefund = async (params: {
  refundId: string;
  adminToken: string;
}) => {
  if (typeof wx === 'undefined' || !wx.cloud) {
    throw new Error('当前环境不支持云开发');
  }

  try {
    const res = await callFunction('admin-api', {
      action: 'retryRefund',
      data: params
    });

    if (res.code === 0) {
      return res.data;
    }
    throw new Error(res.msg || '重试退款失败');
  } catch (error) {
    console.error('重试退款失败:', error);
    throw error;
  }
};
