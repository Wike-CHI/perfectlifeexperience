const cloud = require('wx-server-sdk');
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

/**
 * 初始化商品数据到云数据库
 * 用于首次部署时录入商品和分类数据
 */
async function initDataToDatabase(data) {
  const { categories } = data;

  try {
    // 1. 创建分类
    const categoryRecords = categories.map((cat, index) => ({
      _id: `cat_${index}`,
      name: cat.name,
      icon: cat.name === '鲜啤外带' ? 'DR' : 'FR',
      sort: index,
      isActive: true,
      createTime: new Date()
    }));

    await db.collection('categories').add({
      data: categoryRecords
    });

    // 2. 创建商品
    const productRecords = [];
    categories.forEach((cat, catIndex) => {
      cat.items.forEach((item, itemIndex) => {
        // 默认使用第一个规格的价格作为主价格
        const defaultPrice = item.prices[0];

        // 图片映射
        const imageMap = {
          '皮尔森': 'https://images.unsplash.com/photo-1566633806327-68e152aaf26d?auto=format&fit=crop&w=800&q=80',
          'IPA': 'https://images.unsplash.com/photo-1571613316887-7f7ef7?auto=format&fit=crop&w=800&q=80',
          '仙浆': 'https://images.unsplash.com/photo-1608270586620-2485a16c1293?auto=format&fit=crop&w=800&q=80',
          '百香果': 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=800&q=80',
          '芒果': 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=800&q=80',
          '菠萝': 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=800&q=80',
          '番石榴': 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=800&q=80',
          '草莓': 'https://images.unsplash.com/photo-1546173159-827d68a56a64?auto=format&fit=crop&w=800&q=80',
          '葡萄': 'https://images.unsplash.com/photo-1537047902294-62a40c20a6ae?auto=format&fit=crop&w=800&q=80',
          '苹果': 'https://images.unsplash.com/photo-1559839914-6f5a6c908d9a6?auto=format&fit=crop&w=800&q=80',
          '茶': 'https://images.unsplash.com/photo-1558584724-0e4d32aaf38?auto=format&fit=crop&w=800&q=80',
          '姜山': 'https://images.unsplash.com/photo-1595981267035-7b04ca84a82d?auto=format&fit=crop&w=800&q=80'
        };

        // 获取图片
        let imageUrl = imageMap['飞云江小麦'];
        if (item.name.includes('飞云江小麦')) {
          imageUrl = '/static/img/feiyun-wheat-ale-haibao.png';
        } else {
          for (const key in imageMap) {
            if (item.name.includes(key)) {
              imageUrl = imageMap[key];
              break;
            }
          }
        }

        // 解析酒精度
        const alcoholMatch = item.specs.match(/酒精.*?(\d+(\.\d+)?)/);
        const alcoholContent = alcoholMatch ? parseFloat(alcoholMatch[1]) : 4.0;

        // 解析规格体积（转换为ml）
        const volumeStr = defaultPrice.volume.toLowerCase();
        let volume = 500;
        if (volumeStr.includes('ml')) {
          volume = parseInt(volumeStr.replace('ml', ''));
        } else if (volumeStr.includes('l')) {
          volume = parseFloat(volumeStr.replace('l', '')) * 1000;
        }

        productRecords.push({
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
          images: [imageUrl],
          category: cat.name,
          tags: catIndex === 0 ? ['鲜啤', '推荐'] : ['果味', '甜美'],
          stock: 999,
          sales: Math.floor(Math.random() * 1000),
          rating: 4.8,
          brewery: '大友精酿',
          alcoholContent: alcoholContent,
          volume: volume,
          isHot: itemIndex < 3,
          isNew: itemIndex > 8,
          createTime: new Date()
        });
      });
    });

    // 批量插入商品
    await db.collection('products').add({
      data: productRecords
    });

    return {
      code: 0,
      msg: '商品数据初始化成功',
      data: {
        categories: categoryRecords.length,
        products: productRecords.length
      }
    };
  } catch (error) {
    console.error('初始化商品数据失败:', error);
    return {
      code: -1,
      msg: error.message,
      error: error.toString()
    };
  }
}

/**
 * 获取商品列表
 * 支持分类筛选、关键词搜索、分页、排序
 */
async function getProducts(params) {
  const { category, keyword, page = 1, limit = 20, sort = 'createTime' } = params || {};

  try {
    // 构建查询条件
    const where = {};

    // 分类筛选
    if (category) {
      where.category = category;
    }

    // 关键词搜索（防 ReDoS）
    if (keyword) {
      // 长度验证
      if (keyword.length > 100) {
        throw new Error('搜索关键词长度不能超过100');
      }

      // 移除正则特殊字符
      const safeKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '');

      // 使用正则搜索
      where.name = db.RegExp({
        regexp: safeKeyword,
        options: 'i'
      });
    }

    // 分页计算
    const skip = (page - 1) * limit;

    // 执行查询
    const result = await db.collection('products')
      .where(where)
      .skip(skip)
      .limit(limit)
      .get();

    // 获取总数
    const countResult = await db.collection('products')
      .where(where)
      .count();

    // 排序处理
    let data = result.data || [];
    if (sort === 'price') {
      data.sort((a, b) => a.price - b.price);
    } else if (sort === 'sales') {
      data.sort((a, b) => b.sales - a.sales);
    } else {
      // 默认按创建时间
      data.sort((a, b) => new Date(b.createTime).getTime() - new Date(a.createTime).getTime());
    }

    return {
      code: 0,
      msg: 'success',
      data: data,
      total: countResult.total
    };
  } catch (error) {
    console.error('获取商品列表失败:', error);
    return {
      code: -1,
      msg: error.message || '获取商品列表失败'
    };
  }
}

/**
 * 获取商品详情
 */
async function getProductDetail(data) {
  const { id } = data;

  try {
    const result = await db.collection('products')
      .doc(id)
      .get();

    if (!result.data) {
      return {
        code: -1,
        msg: '商品不存在'
      };
    }

    return {
      code: 0,
      msg: 'success',
      data: result.data
    };
  } catch (error) {
    console.error('获取商品详情失败:', error);
    return {
      code: -1,
      msg: error.message || '获取商品详情失败'
    };
  }
}

/**
 * 获取热门商品
 */
async function getHotProducts(data) {
  const { limit = 6 } = data;

  try {
    const result = await db.collection('products')
      .where({
        isHot: true
      })
      .limit(limit)
      .orderBy('createTime', 'desc')
      .get();

    return {
      code: 0,
      msg: 'success',
      data: result.data || []
    };
  } catch (error) {
    console.error('获取热门商品失败:', error);
    return {
      code: -1,
      msg: error.message || '获取热门商品失败'
    };
  }
}

/**
 * 获取新品
 */
async function getNewProducts(data) {
  const { limit = 6 } = data;

  try {
    const result = await db.collection('products')
      .where({
        isNew: true
      })
      .limit(limit)
      .orderBy('createTime', 'desc')
      .get();

    return {
      code: 0,
      msg: 'success',
      data: result.data || []
    };
  } catch (error) {
    console.error('获取新品失败:', error);
    return {
      code: -1,
      msg: error.message || '获取新品失败'
    };
  }
}

/**
 * 获取分类列表
 */
async function getCategories() {
  try {
    const result = await db.collection('categories')
      .where({
        isActive: true
      })
      .orderBy('sort', 'asc')
      .get();

    return {
      code: 0,
      msg: 'success',
      data: result.data || []
    };
  } catch (error) {
    console.error('获取分类列表失败:', error);
    return {
      code: -1,
      msg: error.message || '获取分类列表失败'
    };
  }
}

// 云函数入口
exports.main = async (event, context) => {
  const { action, data } = event;

  console.log('收到请求:', { action, data });

  switch (action) {
    case 'initData':
      return await initDataToDatabase(data);

    case 'getProducts':
      return await getProducts(data);

    case 'getProductDetail':
      return await getProductDetail(data);

    case 'getHotProducts':
      return await getHotProducts(data);

    case 'getNewProducts':
      return await getNewProducts(data);

    case 'getCategories':
      return await getCategories();

    default:
      return {
        code: 400,
        msg: `Unknown action: ${action}`
      };
  }
};
