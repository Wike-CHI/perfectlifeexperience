/**
 * 收藏功能 - KISS原则本地存储实现
 */

// 存储键名
const FAVORITE_KEY = 'user_favorites';

// 收藏项类型
export interface FavoriteItem {
  productId: string;
  name: string;
  price: number;
  image: string;
  addTime: number;
}

/**
 * 获取所有收藏
 */
export const getFavorites = (): FavoriteItem[] => {
  try {
    const data = uni.getStorageSync(FAVORITE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

/**
 * 添加收藏
 */
export const addFavorite = (item: Omit<FavoriteItem, 'addTime'>): boolean => {
  const favorites = getFavorites();

  // 检查是否已收藏
  if (favorites.some(f => f.productId === item.productId)) {
    return false;
  }

  favorites.unshift({
    ...item,
    addTime: Date.now()
  });

  uni.setStorageSync(FAVORITE_KEY, JSON.stringify(favorites));
  return true;
};

/**
 * 取消收藏
 */
export const removeFavorite = (productId: string): boolean => {
  const favorites = getFavorites();
  const index = favorites.findIndex(f => f.productId === productId);

  if (index === -1) return false;

  favorites.splice(index, 1);
  uni.setStorageSync(FAVORITE_KEY, JSON.stringify(favorites));
  return true;
};

/**
 * 切换收藏状态
 */
export const toggleFavorite = (item: Omit<FavoriteItem, 'addTime'>): boolean => {
  const isFav = isFavorite(item.productId);

  if (isFav) {
    removeFavorite(item.productId);
    return false;
  } else {
    addFavorite(item);
    return true;
  }
};

/**
 * 检查是否已收藏
 */
export const isFavorite = (productId: string): boolean => {
  const favorites = getFavorites();
  return favorites.some(f => f.productId === productId);
};

/**
 * 获取收藏数量
 */
export const getFavoriteCount = (): number => {
  return getFavorites().length;
};

/**
 * 清空收藏
 */
export const clearFavorites = (): void => {
  uni.removeStorageSync(FAVORITE_KEY);
};

export default {
  getFavorites,
  addFavorite,
  removeFavorite,
  toggleFavorite,
  isFavorite,
  getFavoriteCount,
  clearFavorites
};
