/**
 * 转换云存储 URL 为临时访问链接
 * @param url 原始URL（可能是cloud://格式或普通URL）
 * @param forceRefresh 是否强制刷新（即使已经是http/https链接也重新获取）
 * @returns Promise<string> 临时访问链接或原始URL
 */
export async function convertCloudUrl(url: string, forceRefresh: boolean = false): Promise<string> {
  if (!url) {
    return '/static/logo.png';
  }

  // 如果不是云存储格式，检查是否需要刷新
  if (!url.startsWith('cloud://')) {
    // 如果是临时链接且已过期或需要强制刷新，从URL中提取fileID重新获取
    if (forceRefresh && (url.includes('tcb.qcloud.la') || url.includes('cos.'))) {
      try {
        // 尝试从URL中提取fileID（适用于云存储URL）
        const urlParts = url.split('?')[0]; // 移除签名参数
        // 这里需要存储原始的 cloud:// URL，暂时返回原URL
        console.warn('无法从临时链接刷新，请使用 cloud:// 格式的文件ID');
        return url;
      } catch (error) {
        return url;
      }
    }
    return url;
  }

  try {
    const res = await wx.cloud.getTempFileURL({
      fileList: [url]
    });

    if (res.fileList && res.fileList[0] && res.fileList[0].tempFileURL) {
      const tempUrl = res.fileList[0].tempFileURL;
      console.log('✅ 获取临时链接成功:', tempUrl);
      return tempUrl;
    }

    return '/static/logo.png';
  } catch (error) {
    console.error('❌ 转换云存储URL失败:', error);
    return '/static/logo.png';
  }
}

/**
 * 刷新过期的临时链接
 * 检测URL是否过期，如果过期则重新获取临时链接
 * @param url 原始URL或临时链接
 * @param originalCloudId 原始的 cloud:// 文件ID（可选，如果传入则更可靠）
 * @returns Promise<string> 新的临时链接
 */
export async function refreshExpiredUrl(url: string, originalCloudId?: string): Promise<string> {
  // 如果提供了原始 cloud:// ID，直接使用
  if (originalCloudId && originalCloudId.startsWith('cloud://')) {
    return convertCloudUrl(originalCloudId);
  }

  // 如果URL已过期（403），尝试重新获取
  if (url.includes('tcb.qcloud.la') || url.includes('cos.')) {
    console.warn('⚠️ 检测到可能过期的临时链接，尝试刷新...');
    // 注意：无法从临时链接还原 cloud:// ID，需要数据库存储原始ID
    return url;
  }

  // 如果是 cloud:// 格式，直接转换
  if (url.startsWith('cloud://')) {
    return convertCloudUrl(url);
  }

  return url;
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
