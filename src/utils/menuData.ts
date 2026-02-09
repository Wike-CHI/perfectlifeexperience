import type { Product, Category } from '@/types';
import rawMenuData from '@/data/menu_data.json';

// 辅助函数：获取商品图片
const getProductImage = (name: string) => {
  if (name.includes('飞云江小麦')) {
    return '/static/img/feiyun-wheat-ale-haibao.png';
  }

  // 关键词映射表
  const imageMap: { [key: string]: string } = {
    '皮尔森': 'https://images.unsplash.com/photo-1566633806327-68e152aaf26d?auto=format&fit=crop&w=800&q=80',
    'IPA': 'https://images.unsplash.com/photo-1571613316887-6f8d5cbf7ef7?auto=format&fit=crop&w=800&q=80',
    '仙浆': 'https://images.unsplash.com/photo-1608270586620-248524c67de9?auto=format&fit=crop&w=800&q=80',
    '百香果': 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=800&q=80',
    '芒果': 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=800&q=80',
    '菠萝': 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=800&q=80',
    '番石榴': 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=800&q=80',
    '草莓': 'https://images.unsplash.com/photo-1546173159-315724a31696?auto=format&fit=crop&w=800&q=80',
    '葡萄': 'https://images.unsplash.com/photo-1537047902294-62a40c20a6ae?auto=format&fit=crop&w=800&q=80',
    '芭乐': 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=800&q=80',
    '苹果': 'https://images.unsplash.com/photo-1559839914-17a60a98f9a6?auto=format&fit=crop&w=800&q=80',
    '茶': 'https://images.unsplash.com/photo-1558584724-0e4d32caee0a?auto=format&fit=crop&w=800&q=80',
    '姜山': 'https://images.unsplash.com/photo-1595981267035-7b04ca84a82d?auto=format&fit=crop&w=800&q=80'
  };

  // 遍历匹配
  for (const key in imageMap) {
    if (name.includes(key)) {
      return imageMap[key];
    }
  }

  // 默认图片（精酿啤酒通用图）
  return 'https://images.unsplash.com/photo-1575037614876-c38a4d44f5b8?auto=format&fit=crop&w=800&q=80';
};

// 解析酒精度
const parseAlcohol = (specs: string): number => {
  const match = specs.match(/酒精.*?(\d+(\.\d+)?)/);
  return match ? parseFloat(match[1]) : 4.0;
};

// 转换数据
export const localCategories: Category[] = rawMenuData.categories.map((cat, index) => ({
  _id: `cat_${index}`,
  name: cat.name,
  icon: cat.name === '鲜啤外带' ? 'DR' : 'FR',
  sort: index,
  isActive: true
}));

export const localProducts: Product[] = [];

rawMenuData.categories.forEach((cat, catIndex) => {
  cat.items.forEach((item, itemIndex) => {
    // 默认取第一个规格（通常是最小规格）作为主商品展示
    const defaultPrice = item.prices[0];
    const volumeStr = defaultPrice.volume.toLowerCase();
    let volume = 500;
    if (volumeStr.includes('ml')) {
      volume = parseInt(volumeStr.replace('ml', ''));
    } else if (volumeStr.includes('l')) {
      volume = parseFloat(volumeStr.replace('l', '')) * 1000;
    }

    localProducts.push({
      _id: `prod_${catIndex}_${itemIndex}`,
      name: item.name,
      enName: item.enName,
      description: `${item.enName} - ${item.specs}`,
      specs: item.specs,
      price: defaultPrice.price * 100, // 转换为分
      priceList: item.prices.map(p => ({
        volume: p.volume,
        price: p.price * 100
      })),
      // originalPrice: defaultPrice.price * 120, // 已移除假原价
      images: [getProductImage(item.name)],
      category: cat.name,
      tags: catIndex === 0 ? ['鲜啤', '推荐'] : ['果味', '甜美'],
      stock: 999,
      sales: Math.floor(Math.random() * 1000),
      rating: 4.8,
      brewery: '大友精酿',
      alcoholContent: parseAlcohol(item.specs),
      volume: volume,
      isHot: itemIndex < 3,
      isNew: itemIndex > 8,
      createTime: new Date()
    });
  });
});
