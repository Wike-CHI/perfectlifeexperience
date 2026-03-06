/**
 * 图片处理工具函数
 * 用于优化图片加载，提升性能
 */

// CloudBase CDN 基础 URL
const CDN_BASE = 'https://cloud1-6gmp2q0y3171c353-1403736715.tcloudbaseapp.com';

/**
 * 获取图片缩略图 URL
 * 使用 CDN 图片处理参数生成缩略图
 * @param url 原始图片 URL
 * @param width 目标宽度
 * @param height 目标高度
 * @returns 处理后的图片 URL
 */
export function getThumbnail(
  url: string,
  width: number = 400,
  height: number = 400
): string {
  if (!url) {
    return '/static/images/default.png';
  }

  // 如果是本地静态资源，直接返回
  if (url.startsWith('/static/') || url.startsWith('/static/')) {
    return url;
  }

  // 如果已经是 CDN 图片，添加处理参数
  if (url.includes('cloudbaseapp.com') || url.includes('tcloudbaseapp.com')) {
    // 判断 URL 是否已经包含参数
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}imageMogr2/thumbnail/${width}x${height}`;
  }

  // 其他外部 URL
  return url;
}

/**
 * 获取列表缩略图 - 针对商品列表优化
 * @param url 原始图片 URL
 * @returns 缩略图 URL
 */
export function getListThumbnail(url: string): string {
  return getThumbnail(url, 400, 400);
}

/**
 * 获取详情页缩略图 - 针对详情页优化
 * @param url 原始图片 URL
 * @returns 缩略图 URL
 */
export function getDetailThumbnail(url: string): string {
  return getThumbnail(url, 800, 800);
}

/**
 * 获取头像缩略图
 * @param url 原始图片 URL
 * @returns 缩略图 URL
 */
export function getAvatarThumbnail(url: string): string {
  return getThumbnail(url, 200, 200);
}

/**
 * 检查图片 URL 是否有效
 * @param url 图片 URL
 * @returns 是否有效
 */
export function isValidImageUrl(url: string): boolean {
  if (!url) return false;
  return url.startsWith('http') || url.startsWith('/static');
}

/**
 * 预加载图片
 * @param urls 图片 URL 数组
 * @returns Promise 数组
 */
export function preloadImages(urls: string[]): Promise<UniApp.GetImageInfoSuccessData>[] {
  return urls.map(
    (url) =>
      new Promise((resolve, reject) => {
        uni.getImageInfo({
          src: url,
          success: resolve,
          fail: reject,
        });
      })
  );
}

/**
 * 清理图片缓存（uni-app 需要手动清理）
 * 某些情况下可能需要手动触发垃圾回收
 */
export function clearImageCache(): void {
  // 小程序中无法直接清理图片缓存
  // 但可以清理相关的内存引用
  if (uni.canIUse('PERFORMANCE')) {
    // 仅作为占位符，实际清理需要平台特定 API
    console.log('[ImageUtils] Image cache clear not supported on this platform');
  }
}
