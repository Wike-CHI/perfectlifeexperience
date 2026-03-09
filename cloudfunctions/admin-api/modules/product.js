/**
 * 商品管理模块
 */

const { calcPagination } = require('./common/pagination');
const { checkRequired, validateType, validateRange } = require('./common/validator');

/**
 * 获取商品列表
 * @param {Object} db - 数据库实例
 * @param {Object} data - 请求数据
 * @returns {Promise<Object>} 查询结果
 */
async function getProductsList(db, data) {
  try {
    const { page = 1, limit = 20, category, keyword, status } = data || {};
    const { skip, limit: validLimit } = calcPagination(page, limit);

    let query = {};

    if (category && category !== 'all') {
      query.category = category;
    }

    if (keyword) {
      query.name = db.RegExp({
        regexp: keyword,
        options: 'i'
      });
    }

    if (status === 'active') {
      query.stock = db.command.gte(1);
    } else if (status === 'inactive') {
      query.stock = 0;
    }

    const [productsResult, categoriesResult, countResult] = await Promise.all([
      db.collection('products')
        .where(query)
        .orderBy('createTime', 'desc')
        .skip(skip)
        .limit(validLimit)
        .get(),
      db.collection('categories')
        .where({ isActive: true })
        .orderBy('sort', 'asc')
        .get(),
      db.collection('products').where(query).count()
    ]);

    return {
      code: 0,
      data: {
        list: productsResult.data,
        total: countResult.total,
        page,
        limit: validLimit,
        totalPages: Math.ceil(countResult.total / validLimit),
        categories: categoriesResult.data
      }
    };
  } catch (error) {
    console.error('Get products error:', error);
    return { code: 500, msg: error.message };
  }
}

/**
 * 获取商品详情
 * @param {Object} db - 数据库实例
 * @param {Object} data - 请求数据
 * @returns {Promise<Object>} 查询结果
 */
async function getProductDetailAdmin(db, data) {
  try {
    const { id } = data || {};

    if (!id) {
      return { code: -2, msg: '缺少商品ID' };
    }

    const [productResult, categoriesResult] = await Promise.all([
      db.collection('products').doc(id).get(),
      db.collection('categories')
        .where({ isActive: true })
        .orderBy('sort', 'asc')
        .get()
    ]);

    if (!productResult.data) {
      return { code: 404, msg: '商品不存在' };
    }

    return {
      code: 0,
      data: {
        product: productResult.data,  // doc().get() 返回的是单个对象,不是数组
        categories: categoriesResult.data
      }
    };
  } catch (error) {
    console.error('Get product detail error:', error);
    return { code: 500, msg: error.message };
  }
}

/**
 * 创建商品
 * @param {Object} db - 数据库实例
 * @param {Object} logOperation - 日志函数
 * @param {Object} data - 请求数据
 * @param {Object} wxContext - 微信上下文
 * @returns {Promise<Object>} 创建结果
 */
async function createProductAdmin(db, logOperation, data, wxContext) {
  try {
    const adminInfo = wxContext.ADMIN_INFO || { id: 'system' };

    // 验证必填字段
    const validation = checkRequired(data, ['name', 'category']);
    if (!validation.valid) {
      return { code: -2, msg: `缺少必填字段: ${validation.missing.join(', ')}` };
    }

    // 验证price
    if (data.price !== undefined) {
      if (typeof data.price !== 'number' || data.price <= 0) {
        return { code: -2, msg: '价格必须是正数' };
      }
    }

    // 验证stock
    if (data.stock !== undefined) {
      if (typeof data.stock !== 'number' || data.stock < 0) {
        return { code: -2, msg: '库存必须是非负数' };
      }
    }

    // 验证rating
    if (data.rating !== undefined) {
      if (typeof data.rating !== 'number' || data.rating < 0 || data.rating > 5) {
        return { code: -2, msg: '评分必须在0-5之间' };
      }
    }

    // 验证数据类型
    if (!validateType(data.isActive, 'boolean') && data.isActive !== undefined) {
      return { code: -2, msg: 'isActive必须是布尔值' };
    }

    // 构建产品数据（支持所有字段）
    const productData = {
      // 基本信息
      name: data.name,
      enName: data.enName || '',
      category: data.category,
      price: data.price || 0,
      stock: data.stock || 0,
      description: data.description || '',
      // 产品属性
      specs: data.specs || '',
      alcoholContent: data.alcoholContent || null,
      brewery: data.brewery || '',
      volume: data.volume || null,
      tags: data.tags || [],
      // 多规格价格列表（默认空数组）
      priceList: data.priceList || [],
      // 商品图片列表（默认空数组）
      images: data.images || [],
      // 销售设置
      isActive: data.isActive !== undefined ? data.isActive : true,
      isHot: data.isHot === true,
      isNew: data.isNew === true,
      // 默认值
      sales: 0,
      rating: 0,
      // ERP扩展
      sku: data.sku || '',
      costPrice: data.costPrice || null,
      lowStockThreshold: data.lowStockThreshold !== undefined ? data.lowStockThreshold : 10,
      shelfLifeDays: data.shelfLifeDays || null,
      storageLocation: data.storageLocation || '',
      // 时间戳
      createTime: db.serverDate(),
      updateTime: db.serverDate()
    };

    const result = await db.collection('products').add({
      data: productData
    });

    // 🔧 清除 product 云函数的缓存，确保用户端看到最新数据
    try {
      const cloud = require('wx-server-sdk');
      cloud.init({
        env: cloud.DYNAMIC_CURRENT_ENV
      });

      await cloud.callFunction({
        name: 'product',
        data: {
          action: 'clearCache',
          data: { productId: result.id }
        }
      });

      console.log('[缓存同步] 已清除 product 云函数缓存', { productId: result.id });
    } catch (cacheError) {
      console.error('[缓存同步] 清除缓存失败', { error: cacheError.message });
      // 不影响主流程，继续执行
    }

    await logOperation(adminInfo.id, 'createProduct', {
      productId: result.id,
      name: data.name
    });

    return {
      code: 0,
      data: { id: result.id },
      msg: '商品创建成功'
    };
  } catch (error) {
    console.error('Create product error:', error);
    return { code: 500, msg: error.message };
  }
}

/**
 * 更新商品
 * @param {Object} db - 数据库实例
 * @param {Object} logOperation - 日志函数
 * @param {Object} data - 请求数据
 * @param {Object} wxContext - 微信上下文
 * @returns {Promise<Object>} 更新结果
 */
async function updateProductAdmin(db, logOperation, data, wxContext) {
  try {
    const adminInfo = wxContext.ADMIN_INFO || { id: 'system' };

    const { id, ...updateData } = data || {};

    if (!id) {
      return { code: -2, msg: '缺少商品ID' };
    }

    // 验证price
    if (updateData.price !== undefined) {
      if (typeof updateData.price !== 'number' || updateData.price <= 0) {
        return { code: -2, msg: '价格必须是正数' };
      }
    }

    // 验证stock
    if (updateData.stock !== undefined) {
      if (typeof updateData.stock !== 'number' || updateData.stock < 0) {
        return { code: -2, msg: '库存必须是非负数' };
      }
    }

    // 验证rating
    if (updateData.rating !== undefined) {
      if (typeof updateData.rating !== 'number' || updateData.rating < 0 || updateData.rating > 5) {
        return { code: -2, msg: '评分必须在0-5之间' };
      }
    }

    // 验证数据类型
    if (updateData.isActive !== undefined && !validateType(updateData.isActive, 'boolean')) {
      return { code: -2, msg: 'isActive必须是布尔值' };
    }

    // 验证images数组
    if (updateData.images !== undefined) {
      if (!Array.isArray(updateData.images)) {
        return { code: -2, msg: 'images必须是数组' };
      }
    }

    // 验证priceList数组
    if (updateData.priceList !== undefined) {
      if (!Array.isArray(updateData.priceList)) {
        return { code: -2, msg: 'priceList必须是数组' };
      }
      // 验证priceList中的每个对象
      for (const spec of updateData.priceList) {
        if (typeof spec.price !== 'number' || spec.price <= 0) {
          return { code: -2, msg: 'priceList中的价格必须是正数' };
        }
        if (!spec.volume || typeof spec.volume !== 'string') {
          return { code: -2, msg: 'priceList中的volume不能为空' };
        }
      }
    }

    // 移除不允许更新的字段
    delete updateData._id;
    delete updateData._openid;
    delete updateData.createTime;

    updateData.updateTime = db.serverDate();

    await db.collection('products').doc(id).update({
      data: updateData
    });

    // 🔧 清除 product 云函数的缓存，确保用户端看到最新数据
    try {
      const cloud = require('wx-server-sdk');
      cloud.init({
        env: cloud.DYNAMIC_CURRENT_ENV
      });

      await cloud.callFunction({
        name: 'product',
        data: {
          action: 'clearCache',
          data: { productId: id }
        }
      });

      console.log('[缓存同步] 已清除 product 云函数缓存', { productId: id });
    } catch (cacheError) {
      console.error('[缓存同步] 清除缓存失败', { error: cacheError.message });
      // 不影响主流程，继续执行
    }

    await logOperation(adminInfo.id, 'updateProduct', {
      productId: id,
      ...updateData
    });

    return {
      code: 0,
      msg: '商品更新成功'
    };
  } catch (error) {
    console.error('Update product error:', error);
    return { code: 500, msg: error.message };
  }
}

/**
 * 删除商品
 * @param {Object} db - 数据库实例
 * @param {Object} logOperation - 日志函数
 * @param {Object} data - 请求数据
 * @param {Object} wxContext - 微信上下文
 * @returns {Promise<Object>} 删除结果
 */
async function deleteProductAdmin(db, logOperation, data, wxContext) {
  try {
    const adminInfo = wxContext.ADMIN_INFO || { id: 'system' };

    const { id } = data || {};

    if (!id) {
      return { code: -2, msg: '缺少商品ID' };
    }

    await db.collection('products').doc(id).remove();

    // 🔧 清除 product 云函数的缓存，确保用户端看到最新数据
    try {
      const cloud = require('wx-server-sdk');
      cloud.init({
        env: cloud.DYNAMIC_CURRENT_ENV
      });

      await cloud.callFunction({
        name: 'product',
        data: {
          action: 'clearCache',
          data: { productId: id }
        }
      });

      console.log('[缓存同步] 已清除 product 云函数缓存', { productId: id });
    } catch (cacheError) {
      console.error('[缓存同步] 清除缓存失败', { error: cacheError.message });
      // 不影响主流程，继续执行
    }

    await logOperation(adminInfo.id, 'deleteProduct', { productId: id });

    return {
      code: 0,
      msg: '商品删除成功'
    };
  } catch (error) {
    console.error('Delete product error:', error);
    return { code: 500, msg: error.message };
  }
}

/**
 * 获取所有商品（用于价格检查）
 * @param {Object} db - 数据库实例
 * @param {Object} data - 请求数据
 * @returns {Promise<Object>} 查询结果
 */
async function getAllProducts(db, data) {
  try {
    const result = await db.collection('products')
      .orderBy('createTime', 'desc')
      .get();

    return {
      code: 0,
      msg: 'success',
      data: result.data
    };
  } catch (error) {
    console.error('Get all products error:', error);
    return { code: 500, msg: error.message };
  }
}

/**
 * 修复商品价格数据
 * @param {Object} db - 数据库实例
 * @param {Object} logOperation - 日志记录函数
 * @param {Object} data - 请求数据
 * @param {Object} wxContext - 微信上下文
 * @returns {Promise<Object>} 修复结果
 */
async function fixProductPrices(db, logOperation, data, wxContext) {
  try {
    const adminInfo = wxContext.ADMIN_INFO || { id: 'system' };
    const { products } = data || {};

    if (!products || !Array.isArray(products)) {
      return { code: -2, msg: '缺少商品数据' };
    }

    const results = {
      total: products.length,
      success: 0,
      failed: 0,
      details: []
    };

    for (const product of products) {
      try {
        const updateData = {};

        // 如果price字段无效，尝试从priceList获取
        if (!product.price || product.price <= 0) {
          if (product.priceList && product.priceList.length > 0 && product.priceList[0].price > 0) {
            updateData.price = product.priceList[0].price;
          } else {
            // 如果无法修复，跳过
            results.failed++;
            results.details.push({
              productId: product._id,
              name: product.name,
              status: 'failed',
              reason: '无法找到有效的价格数据'
            });
            continue;
          }
        }

        // 更新数据库
        if (Object.keys(updateData).length > 0) {
          await db.collection('products').doc(product._id).update({
            data: updateData
          });

          results.success++;
          results.details.push({
            productId: product._id,
            name: product.name,
            status: 'success',
            oldValue: product.price,
            newValue: updateData.price
          });
        }
      } catch (error) {
        results.failed++;
        results.details.push({
          productId: product._id,
          name: product.name,
          status: 'error',
          reason: error.message
        });
      }
    }

    await logOperation(adminInfo.id, 'fixProductPrices', results);

    return {
      code: 0,
      msg: '修复完成',
      data: results
    };
  } catch (error) {
    console.error('Fix product prices error:', error);
    return { code: 500, msg: error.message };
  }
}

module.exports = {
  getProductsList,
  getProductDetailAdmin,
  createProductAdmin,
  updateProductAdmin,
  deleteProductAdmin,
  getAllProducts,
  fixProductPrices
};
