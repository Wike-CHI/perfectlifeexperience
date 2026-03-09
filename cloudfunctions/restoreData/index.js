/**
 * 恢复商品数据到云数据库
 * 从 src/data/数据.json 读取数据并上传到云数据库
 */

const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  try {
    // 1. 读取原始数据
    const data = require('../../src/data/数据.json');

    console.log('开始恢复商品数据...');
    console.log('分类数量:', data.categories.length);

    // 2. 清空现有数据
    console.log('清空现有商品数据...');
    const existingProducts = await db.collection('products').get();
    for (const product of existingProducts.data) {
      await db.collection('products').doc(product._id).remove();
    }

    const existingCategories = await db.collection('categories').get();
    for (const category of existingCategories.data) {
      await db.collection('categories').doc(category._id).remove();
    }

    // 3. 插入分类数据
    console.log('插入分类数据...');
    const categoriesData = [
      { name: '全部', icon: 'all', sort: 0, isActive: true },
      { name: '鲜啤外带', icon: 'fresh', sort: 1, isActive: true },
      { name: '增味啤', icon: 'flavor', sort: 2, isActive: true }
    ];

    for (const category of categoriesData) {
      await db.collection('categories').add({ data: category });
    }

    // 4. 插入商品数据
    console.log('插入商品数据...');
    let productSort = 0;

    for (const category of data.categories) {
      console.log(`处理分类: ${category.name}`);

      for (const item of category.items) {
        // 为每个商品创建基础信息
        const baseProduct = {
          name: item.name,
          enName: item.enName,
          category: category.name,
          description: `${item.name} - ${item.specs}`,
          specs: item.specs,
          prices: item.prices,
          note: category.note || '',
          images: ['https://images.unsplash.com/photo-1608270586620-248524c67de9?w=400'],
          isHot: false,
          isNew: false,
          stock: 999,
          sales: 0,
          rating: 4.5,
          tags: [],
          createTime: db.serverDate(),
          sort: productSort++
        };

        await db.collection('products').add({ data: baseProduct });
        console.log(`  已插入: ${item.name}`);
      }
    }

    console.log('数据恢复完成！');

    return {
      success: true,
      message: '商品数据恢复成功',
      data: {
        categories: categoriesData.length,
        products: productSort
      }
    };

  } catch (error) {
    console.error('恢复数据失败:', error);
    return {
      success: false,
      message: '恢复数据失败',
      error: error.message
    };
  }
};
