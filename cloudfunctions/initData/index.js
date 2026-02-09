const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

// 分类数据
const categories = [
  { name: '全部', icon: 'all', sort: 0, isActive: true },
  { name: 'IPA', icon: 'ipa', sort: 1, isActive: true },
  { name: '世涛', icon: 'stout', sort: 2, isActive: true },
  { name: '艾尔', icon: 'ale', sort: 3, isActive: true },
  { name: '拉格', icon: 'lager', sort: 4, isActive: true },
  { name: '小麦', icon: 'wheat', sort: 5, isActive: true },
  { name: '精酿套装', icon: 'set', sort: 6, isActive: true }
];

// 商品数据
const products = [
  {
    name: '大友元气 · 经典IPA',
    description: '采用美国西海岸风格酿造，浓郁的啤酒花香气，带有柑橘和松针的芬芳，苦味适中，回味悠长。酒精度6.5%，适合精酿入门爱好者。',
    price: 2800,
    originalPrice: 3500,
    images: ['https://images.unsplash.com/photo-1608270586620-248524c67de9?w=400'],
    category: 'IPA',
    tags: ['热销', '入门推荐'],
    stock: 100,
    sales: 568,
    rating: 4.8,
    brewery: '大友元气酿酒厂',
    alcoholContent: 6.5,
    volume: 330,
    isHot: true,
    isNew: false,
    createTime: new Date()
  },
  {
    name: '大友元气 · 双倍IPA',
    description: '双倍干投啤酒花，带来爆炸性的热带水果香气，芒果、菠萝、百香果风味交织，酒体饱满，苦度较高但平衡感极佳。',
    price: 3200,
    originalPrice: 3800,
    images: ['https://images.unsplash.com/photo-1535958636474-b021ee887b13?w=400'],
    category: 'IPA',
    tags: ['新品', '重度酒花'],
    stock: 80,
    sales: 234,
    rating: 4.9,
    brewery: '大友元气酿酒厂',
    alcoholContent: 8.2,
    volume: 330,
    isHot: true,
    isNew: true,
    createTime: new Date()
  },
  {
    name: '大友元气 · 牛奶世涛',
    description: '添加乳糖酿造的甜世涛，口感丝滑如奶油，带有咖啡、巧克力和焦糖的香气，甜度适中，是冬季的暖心之选。',
    price: 2600,
    originalPrice: 3200,
    images: ['https://images.unsplash.com/photo-1586993451228-c2600805a51f?w=400'],
    category: '世涛',
    tags: ['冬季限定', '甜型'],
    stock: 60,
    sales: 445,
    rating: 4.7,
    brewery: '大友元气酿酒厂',
    alcoholContent: 5.8,
    volume: 330,
    isHot: true,
    isNew: false,
    createTime: new Date()
  },
  {
    name: '大友元气 · 帝国世涛',
    description: '高酒精度的帝国世涛，酒体厚重，带有浓郁的烘焙咖啡、黑巧克力和干果香气，适合慢慢品味。',
    price: 3800,
    originalPrice: 4500,
    images: ['https://images.unsplash.com/photo-1575037614876-c38a4c44f5bd?w=400'],
    category: '世涛',
    tags: ['限量', '收藏级'],
    stock: 30,
    sales: 89,
    rating: 4.9,
    brewery: '大友元气酿酒厂',
    alcoholContent: 10.5,
    volume: 330,
    isHot: false,
    isNew: true,
    createTime: new Date()
  },
  {
    name: '大友元气 · 比利时小麦',
    description: '传统比利时风格小麦啤酒，添加橙皮和芫荽籽，带有清新的柑橘香气和香料味，口感清爽，适合夏日畅饮。',
    price: 2200,
    originalPrice: 2800,
    images: ['https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?w=400'],
    category: '小麦',
    tags: ['清爽', '夏日推荐'],
    stock: 120,
    sales: 892,
    rating: 4.6,
    brewery: '大友元气酿酒厂',
    alcoholContent: 4.8,
    volume: 330,
    isHot: true,
    isNew: false,
    createTime: new Date()
  },
  {
    name: '大友元气 · 德式小麦',
    description: '遵循德国纯净法酿造，浓郁的香蕉和丁香香气，酒体浑浊金黄，口感醇厚，是德式小麦的经典之作。',
    price: 2400,
    originalPrice: 3000,
    images: ['https://images.unsplash.com/photo-1566633806327-68e152aaf26d?w=400'],
    category: '小麦',
    tags: ['经典', '德式'],
    stock: 90,
    sales: 567,
    rating: 4.7,
    brewery: '大友元气酿酒厂',
    alcoholContent: 5.2,
    volume: 500,
    isHot: false,
    isNew: false,
    createTime: new Date()
  },
  {
    name: '大友元气 · 淡色艾尔',
    description: '英式淡色艾尔风格，麦芽甜味与啤酒花苦味完美平衡，带有太妃糖和柑橘的香气，适合日常饮用。',
    price: 2000,
    originalPrice: 2600,
    images: ['https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400'],
    category: '艾尔',
    tags: ['日常', '平衡'],
    stock: 150,
    sales: 723,
    rating: 4.5,
    brewery: '大友元气酿酒厂',
    alcoholContent: 4.5,
    volume: 330,
    isHot: false,
    isNew: false,
    createTime: new Date()
  },
  {
    name: '大友元气 · 琥珀艾尔',
    description: '深琥珀色酒体，焦糖麦芽香气浓郁，带有坚果和干果的风味，口感醇厚，是秋季的完美选择。',
    price: 2600,
    originalPrice: 3200,
    images: ['https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=400'],
    category: '艾尔',
    tags: ['秋季限定', '醇厚'],
    stock: 70,
    sales: 334,
    rating: 4.6,
    brewery: '大友元气酿酒厂',
    alcoholContent: 5.5,
    volume: 330,
    isHot: false,
    isNew: true,
    createTime: new Date()
  },
  {
    name: '大友元气 · 皮尔森',
    description: '捷克风格皮尔森，金黄色酒体清澈透亮，萨兹啤酒花带来独特的香料和花香，口感干爽清脆。',
    price: 1800,
    originalPrice: 2400,
    images: ['https://images.unsplash.com/photo-1579126035584-6dca6e318943?w=400'],
    category: '拉格',
    tags: ['清爽', '入门'],
    stock: 200,
    sales: 1205,
    rating: 4.4,
    brewery: '大友元气酿酒厂',
    alcoholContent: 4.2,
    volume: 330,
    isHot: true,
    isNew: false,
    createTime: new Date()
  },
  {
    name: '大友元气 · 精酿品鉴套装',
    description: '包含6款不同风格的精酿啤酒，从清爽的小麦到浓郁的世涛，一次品尝大友元气的经典之作，附赠品鉴指南。',
    price: 12800,
    originalPrice: 16800,
    images: ['https://images.unsplash.com/photo-1584225064785-c62a8b43d148?w=400'],
    category: '精酿套装',
    tags: ['礼盒', '品鉴'],
    stock: 50,
    sales: 156,
    rating: 4.9,
    brewery: '大友元气酿酒厂',
    alcoholContent: 0,
    volume: 1980,
    isHot: true,
    isNew: false,
    createTime: new Date()
  },
  {
    name: '大友元气 · 新英格兰IPA',
    description: '浑浊IPA风格，果汁感十足，带有浓郁的热带水果香气，口感顺滑，几乎没有苦味，是当下最流行的精酿风格。',
    price: 3000,
    originalPrice: 3600,
    images: ['https://images.unsplash.com/photo-1505075106905-fb0528c29f1c?w=400'],
    category: 'IPA',
    tags: ['潮流', '果汁感'],
    stock: 65,
    sales: 445,
    rating: 4.8,
    brewery: '大友元气酿酒厂',
    alcoholContent: 6.8,
    volume: 330,
    isHot: true,
    isNew: true,
    createTime: new Date()
  },
  {
    name: '大友元气 · 咖啡世涛',
    description: '与本地咖啡烘焙坊合作，添加精选咖啡豆酿造，浓郁的咖啡香气与啤酒完美融合，是咖啡爱好者的最爱。',
    price: 2800,
    originalPrice: 3400,
    images: ['https://images.unsplash.com/photo-1546549010-63b5dd2d8fb9?w=400'],
    category: '世涛',
    tags: ['联名', '咖啡'],
    stock: 45,
    sales: 278,
    rating: 4.7,
    brewery: '大友元气酿酒厂',
    alcoholContent: 6.2,
    volume: 330,
    isHot: false,
    isNew: true,
    createTime: new Date()
  }
];

exports.main = async (event, context) => {
  try {
    // 清空现有数据
    const categoryRes = await db.collection('categories').get();
    for (const item of categoryRes.data) {
      await db.collection('categories').doc(item._id).remove();
    }
    
    const productRes = await db.collection('products').get();
    for (const item of productRes.data) {
      await db.collection('products').doc(item._id).remove();
    }
    
    // 添加分类
    for (const category of categories) {
      await db.collection('categories').add({
        data: category
      });
    }
    
    // 添加商品
    for (const product of products) {
      await db.collection('products').add({
        data: product
      });
    }
    
    return {
      success: true,
      message: '数据初始化成功',
      categoryCount: categories.length,
      productCount: products.length
    };
  } catch (error) {
    return {
      success: false,
      message: error.message
    };
  }
};
