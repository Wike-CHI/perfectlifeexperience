/**
 * CDN 图片资源配置
 * 所有图片已上传到 CloudBase 云存储
 */

export const CDN_BASE_URL = 'https://cloud1-6gmp2q0y3171c353-1403736715.tcloudbaseapp.com';

export const CDN_IMAGES = {
  // 啤酒相关图片
  breweryFactory: `${CDN_BASE_URL}/images/brewery-factory.jpg`,
  feiyunWheatAle: `${CDN_BASE_URL}/images/feiyun-wheat-ale.jpg`,
  feiyunWheatAleHaibao: `${CDN_BASE_URL}/images/feiyun-wheat-ale-haibao.jpg`,
  feiyunxiaomai: `${CDN_BASE_URL}/images/feiyunxiaomai.jpg`,
  freshHopsCraftBeer: `${CDN_BASE_URL}/images/fresh-hops-craft-beer.jpg`,

  // 画廊图片
  gallery02: `${CDN_BASE_URL}/images/gallery-02.jpg`,
  gallery03: `${CDN_BASE_URL}/images/gallery-03.jpg`,
  gallery04: `${CDN_BASE_URL}/images/gallery-04.jpg`,
  gallery05: `${CDN_BASE_URL}/images/gallery-05.jpg`,
  gallery06: `${CDN_BASE_URL}/images/gallery-06.jpg`,
  gallery07: `${CDN_BASE_URL}/images/gallery-07.jpg`,
  gallery08: `${CDN_BASE_URL}/images/gallery-08.jpg`,
  gallery09: `${CDN_BASE_URL}/images/gallery-09.jpg`,
  gallery10: `${CDN_BASE_URL}/images/gallery-10.jpg`,

  // 瑞安风景
  ruianScenery: `${CDN_BASE_URL}/images/ruian-scenery.jpg`,
} as const;

// 获取图片 CDN URL 的辅助函数
export function getCdnImage(imageKey: keyof typeof CDN_IMAGES): string {
  return CDN_IMAGES[imageKey];
}
