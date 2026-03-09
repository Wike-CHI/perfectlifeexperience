/**
 * 初始化数据库数据
 * 使用真实的商品数据：鲜啤外带 + 增味啤
 */
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

// ==================== 分类数据 ====================
const categories = [
  { name: '全部', icon: 'all', sort: 0, isActive: true },
  { name: '鲜啤外带', icon: 'fresh', sort: 1, isActive: true },
  { name: '增味啤', icon: 'flavor', sort: 2, isActive: true }
];

// ==================== 商品数据 ====================
const products = [
  // ========== 鲜啤外带 ==========
  {
    name: '飞云江小麦',
    enName: 'Feiyunjiang wheat',
    category: '鲜啤外带',
    description: '飞云江小麦 - 酒精含量≥5% / 麦芽浓度12°P',
    specs: '酒精含量≥5% / 麦芽浓度12°P',
    alcoholContent: 5,  // 酒精度（%vol）
    brewery: '大友元气精酿',  // 酿酒厂
    volume: 500,  // 默认容量（ml）
    price: 1400,  // 主价格（单位：分）
    priceList: [
      { volume: '500ml', price: 1400 },
      { volume: '1L', price: 2600 },
      { volume: '1.5L', price: 3600 },
      { volume: '2.5L', price: 6000 },
      { volume: '1.5L×4（整箱）', price: 14400 }
    ],
    images: ['https://images.unsplash.com/photo-1608270586620-248524c67de9?w=400'],
    isHot: false,
    isNew: false,
    stock: 999,
    sales: 0,
    rating: 4.5,
    tags: [],
    sort: 0,
    createTime: db.serverDate()
  },
  {
    name: '玉海楼·皮尔森',
    enName: 'Yuhailou pilsner',
    category: '鲜啤外带',
    description: '玉海楼·皮尔森 - 酒精含量≥5% / 麦芽浓度12°P',
    specs: '酒精含量≥5% / 麦芽浓度12°P',
    alcoholContent: 5,  // 酒精度（%vol）
    brewery: '大友元气精酿',  // 酿酒厂
    volume: 500,  // 默认容量（ml）
    price: 1800,  // 主价格（单位：分）
    priceList: [
      { volume: '500ml', price: 1800 },
      { volume: '1L', price: 3400 },
      { volume: '1.5L', price: 4900 },
      { volume: '2.5L', price: 8100 },
      { volume: '1.5L×4（整箱）', price: 19600 }
    ],
    images: ['https://images.unsplash.com/photo-1608270586620-248524c67de9?w=400'],
    isHot: false,
    isNew: false,
    stock: 999,
    sales: 0,
    rating: 4.5,
    tags: [],
    sort: 1,
    createTime: db.serverDate()
  },
  {
    name: '晒黑浑浊IPA',
    enName: 'Tanned cloudy ipa',
    category: '鲜啤外带',
    description: '晒黑浑浊IPA - 酒精含量≥8.2% / 麦芽浓度19°P',
    specs: '酒精含量≥8.2% / 麦芽浓度19°P',
    alcoholContent: 8.2,  // 酒精度（%vol）
    brewery: '大友元气精酿',  // 酿酒厂
    volume: 500,  // 默认容量（ml）
    price: 2700,  // 主价格（单位：分）
    priceList: [
      { volume: '500ml', price: 2700 },
      { volume: '1L', price: 4800 },
      { volume: '1.5L', price: 7600 },
      { volume: '2.5L', price: 12200 },
      { volume: '1.5L×4（整箱）', price: 30400 }
    ],
    images: ['https://images.unsplash.com/photo-1608270586620-248524c67de9?w=400'],
    isHot: false,
    isNew: false,
    stock: 999,
    sales: 0,
    rating: 4.5,
    tags: [],
    sort: 2,
    createTime: db.serverDate()
  },
  {
    name: '仙浆',
    enName: 'Fairy pulp',
    category: '鲜啤外带',
    description: '仙浆 - 酒精度8° / 麦芽浓度18°P',
    specs: '酒精度8° / 麦芽浓度18°P',
    alcoholContent: 8,  // 酒精度（%vol）
    brewery: '大友元气精酿',  // 酿酒厂
    volume: 500,  // 默认容量（ml）
    price: 2500,  // 主价格（单位：分）
    priceList: [
      { volume: '500ml', price: 2500 },
      { volume: '1L', price: 4800 },
      { volume: '1.5L', price: 7000 },
      { volume: '2.5L', price: 11600 },
      { volume: '1.5L×4（整箱）', price: 28000 }
    ],
    images: ['https://images.unsplash.com/photo-1608270586620-248524c67de9?w=400'],
    isHot: false,
    isNew: false,
    stock: 999,
    sales: 0,
    rating: 4.5,
    tags: [],
    sort: 3,
    createTime: db.serverDate()
  },

  // ========== 增味啤 ==========
  {
    name: '百香果啤',
    enName: 'Passion Fruit',
    category: '增味啤',
    description: '百香果啤 - 酒精度≥4',
    specs: '酒精度≥4',
    note: '部分商品500ml/1500ml价格统一',
    alcoholContent: 4,  // 酒精度（%vol）
    brewery: '大友元气精酿',  // 酿酒厂
    volume: 500,  // 默认容量（ml）
    price: 4000,  // 主价格（单位：分）
    priceList: [
      { volume: '500ml', price: 4000 },
      { volume: '1.5L', price: 11400 },
      { volume: '1.5L×4（整箱）', price: 45600 }
    ],
    images: ['https://images.unsplash.com/photo-1608270586620-248524c67de9?w=400'],
    isHot: false,
    isNew: false,
    stock: 999,
    sales: 0,
    rating: 4.5,
    tags: [],
    sort: 4,
    createTime: db.serverDate()
  },
  {
    name: '番石榴啤',
    enName: 'Guava',
    category: '增味啤',
    description: '番石榴啤 - 酒精度≥4',
    specs: '酒精度≥4',
    note: '部分商品500ml/1500ml价格统一',
    alcoholContent: 4,  // 酒精度（%vol）
    brewery: '大友元气精酿',  // 酿酒厂
    volume: 500,  // 默认容量（ml）
    price: 4000,  // 主价格（单位：分）
    priceList: [
      { volume: '500ml', price: 4000 },
      { volume: '1.5L', price: 11400 },
      { volume: '1.5L×4（整箱）', price: 45600 }
    ],
    images: ['https://images.unsplash.com/photo-1608270586620-248524c67de9?w=400'],
    isHot: false,
    isNew: false,
    stock: 999,
    sales: 0,
    rating: 4.5,
    tags: [],
    sort: 5,
    createTime: db.serverDate()
  },
  {
    name: '奶油芭乐啤',
    enName: 'Creamy bala',
    category: '增味啤',
    description: '奶油芭乐啤 - 酒精度≥4',
    specs: '酒精度≥4',
    note: '部分商品500ml/1500ml价格统一',
    alcoholContent: 4,  // 酒精度（%vol）
    brewery: '大友元气精酿',  // 酿酒厂
    volume: 500,  // 默认容量（ml）
    price: 4000,  // 主价格（单位：分）
    priceList: [
      { volume: '500ml', price: 4000 },
      { volume: '1.5L', price: 11400 },
      { volume: '1.5L×4（整箱）', price: 45600 }
    ],
    images: ['https://images.unsplash.com/photo-1608270586620-248524c67de9?w=400'],
    isHot: false,
    isNew: false,
    stock: 999,
    sales: 0,
    rating: 4.5,
    tags: [],
    sort: 6,
    createTime: db.serverDate()
  },
  {
    name: '苹果啤',
    enName: 'Apple',
    category: '增味啤',
    description: '苹果啤 - 酒精度≥4',
    specs: '酒精度≥4',
    note: '部分商品500ml/1500ml价格统一',
    alcoholContent: 4,  // 酒精度（%vol）
    brewery: '大友元气精酿',  // 酿酒厂
    volume: 500,  // 默认容量（ml）
    price: 4000,  // 主价格（单位：分）
    priceList: [
      { volume: '500ml', price: 4000 },
      { volume: '1.5L', price: 11400 },
      { volume: '1.5L×4（整箱）', price: 45600 }
    ],
    images: ['https://images.unsplash.com/photo-1608270586620-248524c67de9?w=400'],
    isHot: false,
    isNew: false,
    stock: 999,
    sales: 0,
    rating: 4.5,
    tags: [],
    sort: 7,
    createTime: db.serverDate()
  },
  {
    name: '草莓啤',
    enName: 'Strawberry beer',
    category: '增味啤',
    description: '草莓啤 - 酒精度≥4',
    specs: '酒精度≥4',
    note: '部分商品500ml/1500ml价格统一',
    alcoholContent: 4,  // 酒精度（%vol）
    brewery: '大友元气精酿',  // 酿酒厂
    volume: 500,  // 默认容量（ml）
    price: 4000,  // 主价格（单位：分）
    priceList: [
      { volume: '500ml', price: 4000 },
      { volume: '1.5L', price: 11400 },
      { volume: '1.5L×4（整箱）', price: 45600 }
    ],
    images: ['https://images.unsplash.com/photo-1608270586620-248524c67de9?w=400'],
    isHot: false,
    isNew: false,
    stock: 999,
    sales: 0,
    rating: 4.5,
    tags: [],
    sort: 8,
    createTime: db.serverDate()
  },
  {
    name: '葡萄啤',
    enName: 'Grape beer',
    category: '增味啤',
    description: '葡萄啤 - 酒精度≥4',
    specs: '酒精度≥4',
    note: '部分商品500ml/1500ml价格统一',
    alcoholContent: 4,  // 酒精度（%vol）
    brewery: '大友元气精酿',  // 酿酒厂
    volume: 500,  // 默认容量（ml）
    price: 4000,  // 主价格（单位：分）
    priceList: [
      { volume: '500ml', price: 4000 },
      { volume: '1.5L', price: 11400 },
      { volume: '1.5L×4（整箱）', price: 45600 }
    ],
    images: ['https://images.unsplash.com/photo-1608270586620-248524c67de9?w=400'],
    isHot: false,
    isNew: false,
    stock: 999,
    sales: 0,
    rating: 4.5,
    tags: [],
    sort: 9,
    createTime: db.serverDate()
  },
  {
    name: '柠檬红茶',
    enName: 'Black tea beer',
    category: '增味啤',
    description: '柠檬红茶 - 酒精度≥4',
    specs: '酒精度≥4',
    note: '部分商品500ml/1500ml价格统一',
    alcoholContent: 4,  // 酒精度（%vol）
    brewery: '大友元气精酿',  // 酿酒厂
    volume: 500,  // 默认容量（ml）
    price: 4000,  // 主价格（单位：分）
    priceList: [
      { volume: '500ml', price: 4000 },
      { volume: '1.5L', price: 11400 },
      { volume: '1.5L×4（整箱）', price: 45600 }
    ],
    images: ['https://images.unsplash.com/photo-1608270586620-248524c67de9?w=400'],
    isHot: false,
    isNew: false,
    stock: 999,
    sales: 0,
    rating: 4.5,
    tags: [],
    sort: 10,
    createTime: db.serverDate()
  },
  {
    name: '红茶啤',
    enName: 'Black tea beer',
    category: '增味啤',
    description: '红茶啤 - 酒精度≥4',
    specs: '酒精度≥4',
    note: '部分商品500ml/1500ml价格统一',
    alcoholContent: 4,  // 酒精度（%vol）
    brewery: '大友元气精酿',  // 酿酒厂
    volume: 500,  // 默认容量（ml）
    price: 4000,  // 主价格（单位：分）
    priceList: [
      { volume: '500ml', price: 4000 },
      { volume: '1.5L', price: 11400 },
      { volume: '1.5L×4（整箱）', price: 45600 }
    ],
    images: ['https://images.unsplash.com/photo-1608270586620-248524c67de9?w=400'],
    isHot: false,
    isNew: false,
    stock: 999,
    sales: 0,
    rating: 4.5,
    tags: [],
    sort: 11,
    createTime: db.serverDate()
  },
  {
    name: '乌龙茶啤',
    enName: 'Oolong tea',
    category: '增味啤',
    description: '乌龙茶啤 - 酒精度≥4',
    specs: '酒精度≥4',
    note: '部分商品500ml/1500ml价格统一',
    alcoholContent: 4,  // 酒精度（%vol）
    brewery: '大友元气精酿',  // 酿酒厂
    volume: 500,  // 默认容量（ml）
    price: 4000,  // 主价格（单位：分）
    priceList: [
      { volume: '500ml', price: 4000 },
      { volume: '1.5L', price: 11400 },
      { volume: '1.5L×4（整箱）', price: 45600 }
    ],
    images: ['https://images.unsplash.com/photo-1608270586620-248524c67de9?w=400'],
    isHot: false,
    isNew: false,
    stock: 999,
    sales: 0,
    rating: 4.5,
    tags: [],
    sort: 12,
    createTime: db.serverDate()
  },
  {
    name: '芒果啤',
    enName: 'Mango beer',
    category: '增味啤',
    description: '芒果啤 - 酒精度≥4',
    specs: '酒精度≥4',
    note: '部分商品500ml/1500ml价格统一',
    alcoholContent: 4,  // 酒精度（%vol）
    brewery: '大友元气精酿',  // 酿酒厂
    volume: 500,  // 默认容量（ml）
    price: 4000,  // 主价格（单位：分）
    priceList: [
      { volume: '500ml', price: 4000 },
      { volume: '1.5L', price: 11400 },
      { volume: '1.5L×4（整箱）', price: 45600 }
    ],
    images: ['https://images.unsplash.com/photo-1608270586620-248524c67de9?w=400'],
    isHot: false,
    isNew: false,
    stock: 999,
    sales: 0,
    rating: 4.5,
    tags: [],
    sort: 13,
    createTime: db.serverDate()
  },
  {
    name: '一桶姜山',
    enName: 'A bucket of ginger',
    category: '增味啤',
    description: '一桶姜山 - 酒精度≥4',
    specs: '酒精度≥4',
    note: '部分商品500ml/1500ml价格统一',
    alcoholContent: 4,  // 酒精度（%vol）
    brewery: '大友元气精酿',  // 酿酒厂
    volume: 500,  // 默认容量（ml）
    price: 4000,  // 主价格（单位：分）
    priceList: [
      { volume: '500ml', price: 4000 },
      { volume: '1.5L', price: 11400 },
      { volume: '1.5L×4（整箱）', price: 45600 }
    ],
    images: ['https://images.unsplash.com/photo-1608270586620-248524c67de9?w=400'],
    isHot: false,
    isNew: false,
    stock: 999,
    sales: 0,
    rating: 4.5,
    tags: [],
    sort: 14,
    createTime: db.serverDate()
  },
  {
    name: '菠萝啤',
    enName: 'Pineapple beer',
    category: '增味啤',
    description: '菠萝啤 - 酒精度≥4',
    specs: '酒精度≥4',
    note: '部分商品500ml/1500ml价格统一',
    alcoholContent: 4,  // 酒精度（%vol）
    brewery: '大友元气精酿',  // 酿酒厂
    volume: 500,  // 默认容量（ml）
    price: 4000,  // 主价格（单位：分）
    priceList: [
      { volume: '500ml', price: 4000 },
      { volume: '1.5L', price: 11400 },
      { volume: '1.5L×4（整箱）', price: 45600 }
    ],
    images: ['https://images.unsplash.com/photo-1608270586620-248524c67de9?w=400'],
    isHot: false,
    isNew: false,
    stock: 999,
    sales: 0,
    rating: 4.5,
    tags: [],
    sort: 15,
    createTime: db.serverDate()
  }
];

// ==================== 初始化函数 ====================
exports.main = async (event, context) => {
  const results = {
    categories: { success: 0, failed: 0 },
    products: { success: 0, failed: 0 }
  };

  try {
    console.log('开始初始化数据库...');

    // 1. 清空现有分类数据
    console.log('清空现有分类数据...');
    const existingCategories = await db.collection('categories').get();
    for (const category of existingCategories.data) {
      await db.collection('categories').doc(category._id).remove();
    }

    // 2. 插入新分类数据
    console.log('插入新分类数据...');
    for (const category of categories) {
      try {
        await db.collection('categories').add({ data: category });
        results.categories.success++;
        console.log(`✓ 分类添加成功: ${category.name}`);
      } catch (err) {
        results.categories.failed++;
        console.error(`✗ 分类添加失败: ${category.name}`, err);
      }
    }

    // 3. 清空现有商品数据
    console.log('清空现有商品数据...');
    const existingProducts = await db.collection('products').get();
    for (const product of existingProducts.data) {
      await db.collection('products').doc(product._id).remove();
    }

    // 4. 插入新商品数据
    console.log('插入新商品数据...');
    for (const product of products) {
      try {
        await db.collection('products').add({ data: product });
        results.products.success++;
        console.log(`✓ 商品添加成功: ${product.name}`);
      } catch (err) {
        results.products.failed++;
        console.error(`✗ 商品添加失败: ${product.name}`, err);
      }
    }

    console.log('数据库初始化完成！');

    return {
      success: true,
      message: '数据库初始化成功',
      data: results,
      summary: {
        totalCategories: categories.length,
        totalProducts: products.length,
        successRate: {
          categories: `${results.categories.success}/${categories.length}`,
          products: `${results.products.success}/${products.length}`
        }
      }
    };

  } catch (error) {
    console.error('初始化失败:', error);
    return {
      success: false,
      message: '数据库初始化失败',
      error: error.message,
      data: results
    };
  }
};
