import type { Product, Category, CartItem, Order, UserInfo, Address, CouponTemplate, UserCoupon } from '@/types';
import { localProducts, localCategories } from '@/utils/menuData';
import { callFunction } from '@/utils/cloudbase';

declare const wx: any;

// 获取数据库实例 - 微信小程序使用 wx.cloud
// const getDb = () => {
//   if (typeof wx !== 'undefined' && wx.cloud) {
//     return wx.cloud.database();
//   }
//   throw new Error('云开发未初始化');
// };

// ==================== 商品相关 API ====================

// 获取商品列表
export const getProducts = async (params?: {
  category?: string;
  keyword?: string;
  page?: number;
  limit?: number;
  sort?: string;
}) => {
  const { category, keyword, page = 1, limit = 20, sort = 'createTime' } = params || {};
  
  let result = [...localProducts];

  if (category) {
    result = result.filter(p => p.category === category);
  }

  if (keyword) {
    const reg = new RegExp(keyword, 'i');
    result = result.filter(p => reg.test(p.name));
  }

  // 排序
  result.sort((a, b) => {
    if (sort === 'price') {
      return a.price - b.price;
    } else if (sort === 'sales') {
      return b.sales - a.sales;
    } else {
      // 默认按创建时间
      return new Date(b.createTime!).getTime() - new Date(a.createTime!).getTime();
    }
  });

  // 分页
  const start = (page - 1) * limit;
  const end = start + limit;
  return result.slice(start, end);
};

// 获取商品详情
export const getProductDetail = async (id: string) => {
  const product = localProducts.find(p => p._id === id);
  if (!product) throw new Error('商品不存在');
  return product;
};

// 获取热门商品
export const getHotProducts = async (limitCount = 6) => {
  return localProducts.filter(p => p.isHot).slice(0, limitCount);
};

// 获取新品
export const getNewProducts = async (limitCount = 6) => {
  return localProducts.filter(p => p.isNew).slice(0, limitCount);
};

// ==================== 分类相关 API ====================

// 获取分类列表
export const getCategories = async () => {
  return localCategories;
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
  return { _id: 'mock_id', stats: { updated: 1 } };
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
  const ordersJson = uni.getStorageSync(ORDER_KEY);
  const orders: Order[] = ordersJson ? JSON.parse(ordersJson) : [];
  
  const orderNo = generateOrderNo();
  const newOrder: Order = {
    ...order,
    _id: `order_${Date.now()}`,
    orderNo,
    createTime: new Date()
  };
  
  orders.push(newOrder);
  uni.setStorageSync(ORDER_KEY, JSON.stringify(orders));
  return { _id: newOrder._id };
};

// 获取订单列表
export const getOrders = async (status?: string) => {
  const ordersJson = uni.getStorageSync(ORDER_KEY);
  let orders: Order[] = ordersJson ? JSON.parse(ordersJson) : [];
  
  if (status && status !== 'all') {
    orders = orders.filter(o => o.status === status);
  }
  
  return orders.sort((a, b) => new Date(b.createTime).getTime() - new Date(a.createTime).getTime());
};

// 获取订单详情
export const getOrderDetail = async (id: string) => {
  const orders = await getOrders('all');
  const order = orders.find(o => o._id === id);
  if (!order) throw new Error('订单不存在');
  return order;
};

// 更新订单状态
export const updateOrderStatus = async (id: string, status: Order['status']) => {
  const orders = await getOrders('all');
  const order = orders.find(o => o._id === id);
  if (order) {
    order.status = status;
    if (status === 'paid') order.payTime = new Date();
    else if (status === 'shipping') order.shipTime = new Date();
    else if (status === 'completed') order.completeTime = new Date();
    
    uni.setStorageSync(ORDER_KEY, JSON.stringify(orders));
  }
  return { stats: { updated: 1 } };
};

// 取消订单
export const cancelOrder = async (id: string) => {
  return updateOrderStatus(id, 'cancelled');
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

// 添加地址
export const addAddress = async (address: Address) => {
  const user = await getUserInfo();
  if (!user) throw new Error('用户不存在');
  
  if (!user.addresses) user.addresses = [];
  
  if (address.isDefault) {
    user.addresses.forEach(addr => addr.isDefault = false);
  }
  
  user.addresses.push(address);
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
    
    if ((res as any).result && (res as any).result.success) {
      // 记录登录时间
      uni.setStorageSync(LOGIN_TIME_KEY, Date.now());
      return (res as any).result;
    }
    throw new Error((res as any).result?.message || '同步用户失败');
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
    
    if ((res as any).result && (res as any).result.success) {
      return (res as any).result.userInfo;
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
    
    return (res as any).result && (res as any).result.success;
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
    const userInfo: UserInfo = {
      _id: openid,
      nickName: wxProfile.nickName,
      avatarUrl: wxProfile.avatarUrl,
      addresses: []
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
export const updateAddress = async (index: number, address: Address) => {
  const user = await getUserInfo();
  if (!user) throw new Error('用户不存在');
  
  if (address.isDefault) {
    user.addresses.forEach((addr, i) => {
      if (i !== index) addr.isDefault = false;
    });
  }
  
  user.addresses[index] = address;
  uni.setStorageSync(USER_KEY, JSON.stringify(user));
  return { stats: { updated: 1 } };
};

// 删除地址
export const deleteAddress = async (index: number) => {
  const user = await getUserInfo();
  if (!user) throw new Error('用户不存在');
  
  user.addresses.splice(index, 1);
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
    if ((res as any).result && (res as any).result.code === 0) {
      return (res as any).result.data;
    }
    throw new Error((res as any).result?.msg || '获取余额失败');
  } catch (error) {
    console.error('获取钱包余额失败:', error);
    // 降级处理
    return { balance: 0 };
  }
};

// 充值
export const rechargeWallet = async (amount: number, giftAmount: number = 0) => {
  if (typeof wx === 'undefined' || !wx.cloud) {
    throw new Error('当前环境不支持云开发');
  }

  try {
    const res = await callFunction('wallet', { 
      action: 'recharge',
      data: { amount, giftAmount }
    });
    
    if ((res as any).result && (res as any).result.code === 0) {
      return (res as any).result.data;
    }
    throw new Error((res as any).result?.msg || '充值失败');
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
    
    if ((res as any).result && (res as any).result.code === 0) {
      return (res as any).result.data;
    }
    throw new Error((res as any).result?.msg || '获取交易记录失败');
  } catch (error) {
    console.error('获取交易记录失败:', error);
    throw error;
  }
};

// ==================== 优惠券相关 API ====================

// 本地优惠券模板数据（模拟）
const localCouponTemplates: CouponTemplate[] = [
  {
    _id: 'coupon_001',
    name: '新用户专享券',
    type: 'no_threshold',
    value: 500,
    minAmount: 0,
    totalCount: 1000,
    receivedCount: 0,
    limitPerUser: 1,
    startTime: new Date('2025-01-01'),
    endTime: new Date('2025-12-31'),
    validDays: 30,
    applicableScope: 'all',
    description: '新用户注册即可领取，全场通用',
    isActive: true,
    createTime: new Date()
  },
  {
    _id: 'coupon_002',
    name: '满减券',
    type: 'amount',
    value: 1000,
    minAmount: 5000,
    totalCount: 500,
    receivedCount: 0,
    limitPerUser: 3,
    startTime: new Date('2025-01-01'),
    endTime: new Date('2025-12-31'),
    validDays: 14,
    applicableScope: 'all',
    description: '满50元可用，全场通用',
    isActive: true,
    createTime: new Date()
  },
  {
    _id: 'coupon_003',
    name: '精酿啤酒节折扣券',
    type: 'discount',
    value: 85,
    minAmount: 3000,
    totalCount: 200,
    receivedCount: 0,
    limitPerUser: 2,
    startTime: new Date('2025-01-01'),
    endTime: new Date('2025-06-30'),
    validDays: 7,
    applicableScope: 'all',
    description: '满30元享8.5折优惠',
    isActive: true,
    createTime: new Date()
  },
  {
    _id: 'coupon_004',
    name: 'VIP专享券',
    type: 'amount',
    value: 2000,
    minAmount: 10000,
    totalCount: 100,
    receivedCount: 0,
    limitPerUser: 1,
    startTime: new Date('2025-01-01'),
    endTime: new Date('2025-12-31'),
    validDays: 30,
    applicableScope: 'all',
    description: '满100元减20元，VIP用户专享',
    isActive: true,
    createTime: new Date()
  }
];

const COUPON_KEY = 'local_coupons';
const COUPON_TEMPLATE_KEY = 'local_coupon_templates';

// 获取优惠券模板列表
export const getCouponTemplates = async () => {
  // 优先从本地存储获取
  const templatesJson = uni.getStorageSync(COUPON_TEMPLATE_KEY);
  if (templatesJson) {
    return JSON.parse(templatesJson) as CouponTemplate[];
  }
  // 首次使用初始化数据
  uni.setStorageSync(COUPON_TEMPLATE_KEY, JSON.stringify(localCouponTemplates));
  return localCouponTemplates;
};

// 获取我的优惠券列表
export const getMyCoupons = async (status?: 'unused' | 'used' | 'expired') => {
  const couponsJson = uni.getStorageSync(COUPON_KEY);
  let coupons: UserCoupon[] = couponsJson ? JSON.parse(couponsJson) : [];
  
  // 更新过期状态
  const now = new Date();
  coupons = coupons.map(coupon => {
    if (coupon.status === 'unused' && new Date(coupon.expireTime) < now) {
      coupon.status = 'expired';
    }
    return coupon;
  });
  uni.setStorageSync(COUPON_KEY, JSON.stringify(coupons));
  
  // 按状态筛选
  if (status) {
    coupons = coupons.filter(c => c.status === status);
  }
  
  // 获取模板信息
  const templates = await getCouponTemplates();
  coupons = coupons.map(coupon => ({
    ...coupon,
    template: templates.find(t => t._id === coupon.templateId)
  }));
  
  // 按领取时间倒序
  return coupons.sort((a, b) => new Date(b.receiveTime).getTime() - new Date(a.receiveTime).getTime());
};

// 领取优惠券
export const receiveCoupon = async (templateId: string) => {
  const templates = await getCouponTemplates();
  const template = templates.find(t => t._id === templateId);
  
  if (!template) {
    throw new Error('优惠券不存在');
  }
  
  if (!template.isActive) {
    throw new Error('优惠券已停用');
  }
  
  const now = new Date();
  if (now < new Date(template.startTime) || now > new Date(template.endTime)) {
    throw new Error('不在领取时间范围内');
  }
  
  if (template.receivedCount >= template.totalCount) {
    throw new Error('优惠券已领完');
  }
  
  // 检查用户领取限制
  const myCoupons = await getMyCoupons();
  const receivedCount = myCoupons.filter(c => c.templateId === templateId).length;
  if (receivedCount >= template.limitPerUser) {
    throw new Error('已达到领取上限');
  }
  
  // 创建用户优惠券
  const newCoupon: UserCoupon = {
    _id: `user_coupon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    templateId,
    status: 'unused',
    receiveTime: new Date(),
    expireTime: new Date(Date.now() + template.validDays * 24 * 60 * 60 * 1000)
  };
  
  // 保存到本地
  const couponsJson = uni.getStorageSync(COUPON_KEY);
  const coupons: UserCoupon[] = couponsJson ? JSON.parse(couponsJson) : [];
  coupons.push(newCoupon);
  uni.setStorageSync(COUPON_KEY, JSON.stringify(coupons));
  
  // 更新模板领取数量
  template.receivedCount++;
  uni.setStorageSync(COUPON_TEMPLATE_KEY, JSON.stringify(templates));
  
  return { _id: newCoupon._id };
};

// 获取订单可用优惠券
export const getAvailableCoupons = async (orderAmount: number) => {
  const coupons = await getMyCoupons('unused');
  const now = new Date();
  
  return coupons.filter(coupon => {
    if (!coupon.template) return false;
    if (new Date(coupon.expireTime) < now) return false;
    if (coupon.template.minAmount && orderAmount < coupon.template.minAmount) return false;
    return true;
  });
};

// 使用优惠券
export const useCoupon = async (couponId: string, orderNo: string) => {
  const couponsJson = uni.getStorageSync(COUPON_KEY);
  const coupons: UserCoupon[] = couponsJson ? JSON.parse(couponsJson) : [];
  
  const coupon = coupons.find(c => c._id === couponId);
  if (!coupon) {
    throw new Error('优惠券不存在');
  }
  
  if (coupon.status !== 'unused') {
    throw new Error('优惠券状态异常');
  }
  
  if (new Date(coupon.expireTime) < new Date()) {
    throw new Error('优惠券已过期');
  }
  
  coupon.status = 'used';
  coupon.useTime = new Date();
  coupon.orderNo = orderNo;
  
  uni.setStorageSync(COUPON_KEY, JSON.stringify(coupons));
  return { stats: { updated: 1 } };
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

    if ((res as any).result && (res as any).result.code === 0) {
      return (res as any).result.data;
    }
    throw new Error((res as any).result?.msg || '绑定失败');
  } catch (error) {
    console.error('绑定推广关系失败:', error);
    throw error;
  }
};

// 获取推广信息
export const getPromotionInfo = async (): Promise<PromotionInfo> => {
  if (typeof wx === 'undefined' || !wx.cloud) {
    // 返回模拟数据
    return {
      inviteCode: 'MOCK1234',
      level: 1,
      totalReward: 0,
      pendingReward: 0,
      todayReward: 0,
      monthReward: 0,
      teamStats: {
        total: 0,
        level1: 0,
        level2: 0,
        level3: 0,
        level4: 0
      }
    };
  }

  try {
    const res = await callFunction('promotion', { action: 'getInfo' });
    if ((res as any).result && (res as any).result.code === 0) {
      return (res as any).result.data;
    }
    throw new Error((res as any).result?.msg || '获取失败');
  } catch (error) {
    console.error('获取推广信息失败:', error);
    throw error;
  }
};

// 获取团队成员列表
export const getTeamMembers = async (level: number = 1, page: number = 1, limit: number = 20) => {
  if (typeof wx === 'undefined' || !wx.cloud) {
    return { members: [] };
  }

  try {
    const res = await callFunction('promotion', {
      action: 'getTeamMembers',
      level,
      page,
      limit
    });

    if ((res as any).result && (res as any).result.code === 0) {
      return (res as any).result.data;
    }
    throw new Error((res as any).result?.msg || '获取失败');
  } catch (error) {
    console.error('获取团队成员失败:', error);
    throw error;
  }
};

// 获取奖励明细
export const getRewardRecords = async (status?: string, page: number = 1, limit: number = 20) => {
  if (typeof wx === 'undefined' || !wx.cloud) {
    return { records: [] };
  }

  try {
    const res = await callFunction('promotion', {
      action: 'getRewardRecords',
      status,
      page,
      limit
    });

    if ((res as any).result && (res as any).result.code === 0) {
      return (res as any).result.data;
    }
    throw new Error((res as any).result?.msg || '获取失败');
  } catch (error) {
    console.error('获取奖励明细失败:', error);
    throw error;
  }
};

// 生成推广二维码
export const generatePromotionQRCode = async (page?: string) => {
  if (typeof wx === 'undefined' || !wx.cloud) {
    return { qrCodeUrl: '', inviteCode: 'MOCK1234' };
  }

  try {
    const res = await callFunction('promotion', {
      action: 'generateQRCode',
      page
    });

    if ((res as any).result && (res as any).result.code === 0) {
      return (res as any).result.data;
    }
    throw new Error((res as any).result?.msg || '生成失败');
  } catch (error) {
    console.error('生成二维码失败:', error);
    throw error;
  }
};

// 计算订单推广奖励（订单完成后调用）
export const calculatePromotionReward = async (orderId: string, buyerId: string, orderAmount: number) => {
  if (typeof wx === 'undefined' || !wx.cloud) {
    return { rewards: [] };
  }

  try {
    const res = await callFunction('promotion', {
      action: 'calculateReward',
      orderId,
      buyerId,
      orderAmount
    });

    if ((res as any).result && (res as any).result.code === 0) {
      return (res as any).result.data;
    }
    throw new Error((res as any).result?.msg || '计算失败');
  } catch (error) {
    console.error('计算奖励失败:', error);
    throw error;
  }
};
