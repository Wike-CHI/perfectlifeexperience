const cloud = require('wx-server-sdk');
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

// ✅ 引入安全日志工具
const { createLogger } = require('./common/logger');
const logger = createLogger('product');

// ✅ 引入缓存模块
const { productCache, categoryCache } = require('./common/cache');

/**
 * 初始化商品数据到云数据库
 * 用于首次部署时录入商品和分类数据
 */
async function initDataToDatabase(data) {
  const { categories } = data;

  try {
    logger.info('Initializing product data', { categoryCount: categories.length });

    // 1. 先删除旧数据（避免 _id 冲突）
    try {
      const oldCategories = await db.collection('categories').get();
      if (oldCategories.data.length > 0) {
        logger.debug('Deleting old category data');
        for (const cat of oldCategories.data) {
          await db.collection('categories').doc(cat._id).remove();
        }
      }
    } catch (error) {
      logger.debug('Failed to delete old category data or no data', { error: error.message });
    }

    try {
      const oldProducts = await db.collection('products').get();
      if (oldProducts.data.length > 0) {
        logger.debug('Deleting old product data');
        for (const prod of oldProducts.data) {
          await db.collection('products').doc(prod._id).remove();
        }
      }
    } catch (error) {
      logger.debug('Failed to delete old product data or no data', { error: error.message });
    }

    // 2. 创建分类（逐条添加）
    logger.debug('Adding category data');
    const categoryRecords = categories.map((cat, index) => ({
      _id: `cat_${index}`,
      name: cat.name,
      icon: cat.name === '鲜啤外带' ? 'DR' : 'FR',
      sort: index,
      isActive: true,
      createTime: new Date()
    }));

    for (const cat of categoryRecords) {
      try {
        await db.collection('categories').add({
          data: cat
        });
        logger.debug('Category added', { name: cat.name });
      } catch (error) {
        logger.error('Failed to add category', { name: cat.name, error });
        // 尝试使用 doc().set() 替代
        try {
          await db.collection('categories').doc(cat._id).set({
            data: cat
          });
          logger.debug('Category added using set', { name: cat.name });
        } catch (error2) {
          logger.error('Set method also failed', { error: error2 });
        }
      }
    }

    // 3. 创建商品（逐条添加）
    logger.debug('Adding product data');
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
          imageUrl = 'https://cloud1-6gmp2q0y3171c353-1403736715.tcloudbaseapp.com/images/feiyun-wheat-ale-haibao.jpg';
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

    // 逐条插入商品
    let successCount = 0;
    let failCount = 0;
    for (const prod of productRecords) {
      try {
        await db.collection('products').add({
          data: prod
        });
        logger.debug('Product added', { name: prod.name });
        successCount++;
      } catch (error) {
        logger.error('Failed to add product', { name: prod.name, error });
        // 尝试使用 doc().set() 替代
        try {
          await db.collection('products').doc(prod._id).set({
            data: prod
          });
          logger.debug('Product added using set', { name: prod.name });
          successCount++;
        } catch (error2) {
          logger.error('Set method also failed', { error: error2 });
          failCount++;
        }
      }
    }

    logger.info('Product initialization completed', { success: successCount, failed: failCount });

    return {
      code: 0,
      msg: '商品数据初始化成功',
      data: {
        categories: categoryRecords.length,
        products: successCount,
        failed: failCount
      }
    };
  } catch (error) {
    logger.error('Product data initialization failed', error);
    return {
      code: -1,
      msg: error.message,
      error: error.toString()
    };
  }
}

/**
 * 获取商品列表（优化版）
 * 支持分类筛选、关键词搜索、分页、排序
 * 优化点：字段投影、并行查询count、条件缓存
 */
async function getProducts(params) {
  const { category, keyword, page = 1, limit = 20, sort = 'createTime', fields = 'list' } = params || {};

  // 构建缓存键（包含所有查询参数和字段类型）
  const cacheKey = `products_${fields}_${category || 'all'}_${keyword || 'none'}_page${page}_limit${limit}_sort${sort}`;

  // 1. 尝试从缓存获取
  const cached = productCache.get(cacheKey);
  if (cached !== null) {
    return cached;
  }

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

    // 定义字段投影 - 根据场景返回不同字段
    let fieldProjection = null;
    if (fields === 'list') {
      // 列表页只返回必要字段
      fieldProjection = {
        _id: true,
        name: true,
        enName: true,
        description: true,
        images: true,
        price: true,
        priceList: true,
        volume: true,
        sales: true,
        category: true,
        tags: true,
        alcoholContent: true,
        brewery: true,
        isHot: true,
        isNew: true
      };
    } else if (fields === 'minimal') {
      // 最小字段集合（用于首页推荐等）
      fieldProjection = {
        _id: true,
        name: true,
        images: true,
        price: true,
        priceList: true,
        volume: true,
        sales: true,
        isNew: true
      };
    }
    // 'detail' 或其他情况返回所有字段

    // 并行执行查询和count
    const [result, countResult] = await Promise.all([
      db.collection('products')
        .where(where)
        .skip(skip)
        .limit(limit)
        .field(fieldProjection)
        .get(),
      db.collection('products')
        .where(where)
        .count()
    ]);

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

    const response = {
      code: 0,
      msg: 'success',
      data: data,
      total: countResult.total
    };

    // 2. 缓存结果
    // 列表数据缓存1小时，详情数据缓存2小时
    const ttl = fields === 'list' ? 3600000 : 7200000;
    productCache.set(cacheKey, response, ttl);

    return response;
  } catch (error) {
    logger.error('Get products failed', error);
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

  const cacheKey = `product_detail_${id}`;

  // 1. 尝试从缓存获取
  const cached = productCache.get(cacheKey);
  if (cached !== null) {
    return cached;
  }

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

    const response = {
      code: 0,
      msg: 'success',
      data: result.data
    };

    // 2. 缓存结果（1小时TTL）
    productCache.set(cacheKey, response, 3600000);

    return response;
  } catch (error) {
    logger.error('Get product detail failed', error);
    return {
      code: -1,
      msg: error.message || '获取商品详情失败'
    };
  }
}

/**
 * 获取热门商品（优化版 - 使用缓存）
 */
async function getHotProducts(data) {
  const { limit = 6 } = data;

  const cacheKey = `hot_products_${limit}`;

  // 尝试从缓存获取
  const cached = productCache.get(cacheKey);
  if (cached !== null) {
    return cached;
  }

  try {
    const result = await db.collection('products')
      .where({
        isHot: true
      })
      .field({
        _id: true,
        name: true,
        images: true,
        price: true,
        priceList: true,
        volume: true,
        sales: true
      })
      .limit(limit)
      .orderBy('createTime', 'desc')
      .get();

    const response = {
      code: 0,
      msg: 'success',
      data: result.data || []
    };

    // 缓存30分钟
    productCache.set(cacheKey, response, 1800000);

    return response;
  } catch (error) {
    logger.error('Get hot products failed', error);
    return {
      code: -1,
      msg: error.message || '获取热门商品失败'
    };
  }
}

/**
 * 获取新品（优化版 - 使用缓存）
 */
async function getNewProducts(data) {
  const { limit = 6 } = data;

  const cacheKey = `new_products_${limit}`;

  // 尝试从缓存获取
  const cached = productCache.get(cacheKey);
  if (cached !== null) {
    return cached;
  }

  try {
    const result = await db.collection('products')
      .where({
        isNew: true
      })
      .field({
        _id: true,
        name: true,
        images: true,
        price: true,
        priceList: true,
        volume: true,
        sales: true
      })
      .limit(limit)
      .orderBy('createTime', 'desc')
      .get();

    const response = {
      code: 0,
      msg: 'success',
      data: result.data || []
    };

    // 缓存30分钟
    productCache.set(cacheKey, response, 1800000);

    return response;
  } catch (error) {
    logger.error('Get new products failed', error);
    return {
      code: -1,
      msg: error.message || '获取新品失败'
    };
  }
}

/**
 * 聚合查询 - 首页数据（一次性获取首页所需所有数据）
 */
async function getHomePageData(data) {
  const cacheKey = 'homepage_aggregate';

  // 尝试从缓存获取
  const cached = productCache.get(cacheKey);
  if (cached !== null) {
    return cached;
  }

  try {
    // 并行获取所有首页数据
    const [hotResult, newResult, allProducts, bannersResult] = await Promise.all([
      // 热门商品
      db.collection('products')
        .where({ isHot: true })
        .field({
          _id: true, name: true, images: true, price: true,
          priceList: true, volume: true, sales: true
        })
        .limit(6)
        .orderBy('createTime', 'desc')
        .get(),

      // 新品
      db.collection('products')
        .where({ isNew: true })
        .field({
          _id: true, name: true, images: true, price: true,
          priceList: true, volume: true, sales: true
        })
        .limit(6)
        .orderBy('createTime', 'desc')
        .get(),

      // 所有商品（用于销量排序）
      db.collection('products')
        .field({
          _id: true, name: true, images: true, price: true,
          priceList: true, volume: true, sales: true
        })
        .limit(20)
        .get(),

      // 轮播图 - 获取激活的banner
      db.collection('banners')
        .where({ isActive: true })
        .orderBy('sort', 'asc')
        .get()
    ]);

    // 按销量排序取前4个
    const sortedBySales = allProducts.data
      .sort((a, b) => (b.sales || 0) - (a.sales || 0))
      .slice(0, 4);

    // 处理banners数据，转换为前端需要的格式
    const banners = (bannersResult.data || []).map(banner => ({
      image: banner.image,
      title: banner.title,
      subtitle: banner.subtitle,
      link: banner.link || '',
      sort: banner.sort,
      isActive: banner.isActive
    }));

    const response = {
      code: 0,
      msg: 'success',
      data: {
        hotProducts: hotResult.data || [],
        newProducts: newResult.data || [],
        topSalesProducts: sortedBySales,
        banners: banners
      }
    };

    // 缓存15分钟
    productCache.set(cacheKey, response, 900000);

    return response;
  } catch (error) {
    logger.error('Get homepage data failed', error);
    return {
      code: -1,
      msg: error.message || '获取首页数据失败'
    };
  }
}

/**
 * 获取分类列表
 */
async function getCategories() {
  const cacheKey = 'categories_list';

  // 1. 尝试从缓存获取
  const cached = categoryCache.get(cacheKey);
  if (cached !== null) {
    return cached;
  }

  try {
    const result = await db.collection('categories')
      .where({
        isActive: true
      })
      .orderBy('sort', 'asc')
      .get();

    const response = {
      code: 0,
      msg: 'success',
      data: result.data || []
    };

    // 2. 缓存结果（2小时TTL - 分类数据很少变化）
    categoryCache.set(cacheKey, response, 7200000);

    return response;
  } catch (error) {
    logger.error('Get categories failed', error);
    return {
      code: -1,
      msg: error.message || '获取分类列表失败'
    };
  }
}

/**
 * 修复分类图标（临时使用，完成后可删除）
 */
async function fixCategoryIcons() {
  try {
    logger.info('Fixing category icons');

    // 获取所有分类
    const categories = await db.collection('categories').get();

    logger.debug('Found categories', { count: categories.data.length });

    // 更新每个分类的图标为 emoji
    const iconMap = {
      '鲜啤外带': '🍺',
      '增味啤': '🍹'
    };

    let updatedCount = 0;
    for (const cat of categories.data) {
      const newIcon = iconMap[cat.name] || '🍺';

      await db.collection('categories').doc(cat._id).update({
        data: {
          icon: newIcon,
          iconType: 'emoji'
        }
      });

      logger.debug('Category icon updated', { name: cat.name, icon: newIcon });
      updatedCount++;
    }

    // 清除分类缓存（分类数据已更新）
    categoryCache.delete('categories_list');
    logger.debug('Category cache cleared');

    return {
      code: 0,
      msg: '分类图标修复成功',
      data: { updated: updatedCount }
    };
  } catch (error) {
    logger.error('Fix category icons failed', error);
    return {
      code: -1,
      msg: error.message || '修复分类图标失败'
    };
  }
}

/**
 * 清除商品相关缓存
 * 在商品数据更新时调用此函数
 */
function clearProductCache(productId = null) {
  if (productId) {
    // 清除特定商品的缓存
    productCache.delete(`product_detail_${productId}`);
  } else {
    // 清除所有商品相关缓存
    productCache.clear();
  }

  // 如果分类更新了，也应该清除分类缓存
  categoryCache.delete('categories_list');
}

// 云函数入口
exports.main = async (event, context) => {
  const { action, data } = event;

  logger.debug('Product request received', { action });

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

    case 'getHomePageData':
      return await getHomePageData(data);

    case 'fixCategoryIcons':
      return await fixCategoryIcons();

    default:
      return {
        code: 400,
        msg: `Unknown action: ${action}`
      };
  }
};
