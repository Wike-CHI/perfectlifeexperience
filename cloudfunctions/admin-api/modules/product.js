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
        product: productResult.data,
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

    const productData = {
      name: data.name,
      category: data.category,
      price: data.price || 0,
      stock: data.stock || 0,
      isActive: data.isActive !== undefined ? data.isActive : true,
      image: data.image || '',
      description: data.description || '',
      sales: 0,
      rating: 0,
      createTime: db.serverDate(),
      updateTime: db.serverDate()
    };

    const result = await db.collection('products').add({
      data: productData
    });

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

    // 移除不允许更新的字段
    delete updateData._id;
    delete updateData._openid;
    delete updateData.createTime;

    updateData.updateTime = db.serverDate();

    await db.collection('products').doc(id).update({
      data: updateData
    });

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

module.exports = {
  getProductsList,
  getProductDetailAdmin,
  createProductAdmin,
  updateProductAdmin,
  deleteProductAdmin
};
