/**
 * 转换云存储 URL 为临时访问链接
 * @param url 原始URL（可能是cloud://格式或普通URL）
 * @returns Promise<string> 临时访问链接或原始URL
 */
export async function convertCloudUrl(url: string): Promise<string> {
  if (!url) {
    return '/static/logo.png';
  }

  // 如果不是云存储格式，直接返回
  if (!url.startsWith('cloud://')) {
    return url;
  }

  try {
    const res = await wx.cloud.getTempFileURL({
      fileList: [url]
    });

    if (res.fileList && res.fileList[0] && res.fileList[0].tempFileURL) {
      return res.fileList[0].tempFileURL;
    }

    return '/static/logo.png';
  } catch (error) {
    console.error('转换云存储URL失败:', error);
    return '/static/logo.png';
  }
}

/**
 * 批量转换云存储URL为临时访问链接
 * @param urls 云存储URL数组
 * @returns Promise<Array<{originalUrl: string, convertedUrl: string}>> 转换结果数组
 */
export async function batchConvertCloudUrls(urls: string[]): Promise<Array<{originalUrl: string, convertedUrl: string}>> {
  if (!urls || urls.length === 0) return [];

  const cloudUrls = urls.filter(url => url && url.startsWith('cloud://'));

  if (cloudUrls.length === 0) {
    // 没有云存储URL，直接返回原始URL
    return urls.map(url => ({
      originalUrl: url,
      convertedUrl: url || '/static/logo.png'
    }));
  }

  try {
    const res = await wx.cloud.getTempFileURL({
      fileList: cloudUrls
    });

    // 建立映射关系
    const urlMap = new Map<string, string>();
    res.fileList.forEach((file) => {
      if (file.tempFileURL) {
        urlMap.set(file.fileID, file.tempFileURL);
      }
    });

    // 返回转换结果（保持原顺序）
    return urls.map(url => {
      if (!url) {
        return { originalUrl: url, convertedUrl: '/static/logo.png' };
      }
      if (!url.startsWith('cloud://')) {
        return { originalUrl: url, convertedUrl: url };
      }
      return {
        originalUrl: url,
        convertedUrl: urlMap.get(url) || '/static/logo.png'
      };
    });
  } catch (error) {
    console.error('批量转换云存储URL失败:', error);
    // 失败时返回原始URL
    return urls.map(url => ({
      originalUrl: url,
      convertedUrl: url || '/static/logo.png'
    }));
  }
}

/**
 * 获取缩略图 URL（云存储图片处理）
 * @param url 原始图片 URL
 * @param width 宽度
 * @param height 高度
 * @returns 缩略图 URL
 */
export function getThumbnail(url: string, width: number = 200, height: number = 200): string {
  if (!url) {
    return '/static/logo.png';
  }

  // 如果是云存储临时链接，添加图片处理参数
  if (url.includes('tcb.qcloud.la') || url.includes('cos.')) {
    return `${url}?imageMogr2/thumbnail/${width}x${height}`;
  }

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
 * 获取详情页缩略图 - 针对商品详情页优化
 * @param url 原始图片 URL
 * @returns 缩略图 URL
 */
export function getDetailThumbnail(url: string): string {
  return getThumbnail(url, 800, 800);
}

/**
 * 获取头像缩略图 - 针对用户头像优化
 * @param url 原始图片 URL
 * @returns 缩略图 URL
 */
export function getAvatarThumbnail(url: string): string {
  return getThumbnail(url, 200, 200);
}
