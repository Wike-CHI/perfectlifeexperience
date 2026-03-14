/**
 * 商品Mock数据
 * 包含不同状态的商品用于测试
 */
module.exports = {
  // 上架商品
  active: {
    _id: 'product_active_001',
    name: '大友元气精酿啤酒',
    enName: 'Dayou Vitality Craft Beer',
    description: '精选优质麦芽，传统工艺酿造，口感醇厚，回味悠长',
    category: '鲜啤外带',
    price: 2800, // 28元（单位：分）
    originalPrice: 3500,
    priceList: [
      { volume: '500ml', price: 2800 },
      { volume: '1000ml', price: 5200 }
    ],
    images: ['https://example.com/beer1.jpg'],
    tags: ['精酿', '鲜啤', '畅销'],
    status: 'on_sale',
    stock: 100,
    sales: 50,
    isHot: true,
    isNew: false,
    brewery: '大友元气精酿',
    alcoholContent: 5,
    volume: 500,
    specs: '酒精度≥5% / 麦芽浓度12°P',
    rating: 4.5,
    sort: 1,
    createTime: new Date('2025-01-01')
  },

  // 下架商品
  inactive: {
    _id: 'product_inactive_001',
    name: '已下架啤酒',
    enName: 'Delisted Beer',
    description: '暂时下架商品',
    category: '鲜啤外带',
    price: 3000,
    originalPrice: 3000,
    priceList: [
      { volume: '330ml', price: 3000 }
    ],
    images: ['https://example.com/beer2.jpg'],
    tags: ['精酿'],
    status: 'discontinued', // 已下架
    stock: 50,
    sales: 10,
    isHot: false,
    isNew: false,
    brewery: '大友元气精酿',
    alcoholContent: 4,
    volume: 330,
    specs: '酒精度≥4%',
    rating: 4.0,
    sort: 999,
    createTime: new Date('2025-01-01')
  },

  // 无库存商品
  outOfStock: {
    _id: 'product_nostock_001',
    name: '缺货啤酒',
    enName: 'Out of Stock Beer',
    description: '暂时缺货，敬请期待',
    category: '套餐',
    price: 4500,
    originalPrice: 5000,
    priceList: [
      { volume: '500ml', price: 4500 }
    ],
    images: ['https://example.com/beer3.jpg'],
    tags: ['套餐', '缺货'],
    status: 'out_of_stock', // 缺货
    stock: 0, // 无库存
    sales: 200,
    isHot: false,
    isNew: false,
    brewery: '大友元气精酿',
    alcoholContent: 6,
    volume: 500,
    specs: '酒精度≥6%',
    rating: 4.8,
    sort: 2,
    createTime: new Date('2025-01-01')
  },

  // 热门商品
  hot: {
    _id: 'product_hot_001',
    name: '人气精酿',
    enName: 'Popular Craft Beer',
    description: '人气爆款，深受消费者喜爱',
    category: '鲜啤外带',
    price: 3200,
    originalPrice: 3800,
    priceList: [
      { volume: '500ml', price: 3200 },
      { volume: '1000ml', price: 6000 }
    ],
    images: ['https://example.com/beer4.jpg'],
    tags: ['精酿', '热门', '推荐'],
    status: 'on_sale',
    stock: 80,
    sales: 500,
    isHot: true, // 热门
    isNew: false,
    brewery: '大友元气精酿',
    alcoholContent: 5.5,
    volume: 500,
    specs: '酒精度≥5.5%',
    rating: 4.7,
    sort: 3,
    createTime: new Date('2025-01-01')
  },

  // 新品
  new: {
    _id: 'product_new_001',
    name: '新品精酿',
    enName: 'New Craft Beer',
    description: '全新推出，限时优惠',
    category: '套餐',
    price: 4800,
    originalPrice: 4800,
    priceList: [
      { volume: '750ml', price: 4800 }
    ],
    images: ['https://example.com/beer5.jpg'],
    tags: ['精酿', '新品', '套餐'],
    status: 'on_sale',
    stock: 60,
    sales: 5,
    isHot: false,
    isNew: true, // 新品
    brewery: '大友元气精酿',
    alcoholContent: 7,
    volume: 750,
    specs: '酒精度≥7%',
    rating: 4.6,
    sort: 4,
    createTime: new Date('2026-03-01')
  },

  // 多规格商品
  multiSpec: {
    _id: 'product_multispec_001',
    name: '多规格精酿套装',
    enName: 'Multi-Spec Craft Beer Set',
    description: '多规格组合，超值套装',
    category: '套餐',
    price: 8800,
    originalPrice: 10000,
    priceList: [
      { volume: '330ml', price: 3200 },
      { volume: '500ml', price: 4800 },
      { volume: '1500ml', price: 8800 }
    ],
    images: ['https://example.com/set.jpg'],
    tags: ['精酿', '套餐', '多规格'],
    status: 'on_sale',
    stock: 30,
    sales: 45,
    isHot: false,
    isNew: false,
    brewery: '大友元气精酿',
    alcoholContent: 5,
    volume: 1500,
    specs: '330ml x 3瓶',
    rating: 4.9,
    sort: 5,
    createTime: new Date('2025-02-01')
  }
};
