/**
 * Banner管理模块
 */

const { calcPagination, calcPageInfo } = require('./common/pagination');
const { checkRequired, validateType } = require('./common/validator');

/**
 * 获取Banner列表
 * @param {Object} db - 数据库实例
 * @param {Object} data - 请求数据
 * @returns {Promise<Object>} 查询结果
 */
async function getBannersAdmin(db, data) {
  try {
    const { page = 1, limit = 20, status } = data || {};
    const { skip, limit: validLimit } = calcPagination(page, limit);

    let query = {};

    if (status === 'active') {
      query.isActive = true;
    } else if (status === 'inactive') {
      query.isActive = false;
    }

    const [bannersResult, countResult] = await Promise.all([
      db.collection('banners')
        .where(query)
        .orderBy('sort', 'asc')
        .skip(skip)
        .limit(validLimit)
        .get(),
      db.collection('banners').where(query).count()
    ]);

    return {
      code: 0,
      data: {
        list: bannersResult.data,
        total: countResult.total,
        page,
        limit: validLimit,
        totalPages: Math.ceil(countResult.total / validLimit)
      }
    };
  } catch (error) {
    console.error('Get banners error:', error);
    return { code: 500, msg: error.message };
  }
}

/**
 * 创建Banner
 * @param {Object} db - 数据库实例
 * @param {Object} logOperation - 日志函数
 * @param {Object} data - 请求数据
 * @param {Object} wxContext - 微信上下文
 * @returns {Promise<Object>} 创建结果
 */
async function createBannerAdmin(db, logOperation, data, wxContext) {
  try {
    const adminInfo = wxContext.ADMIN_INFO || { id: 'system' };

    // 验证必填字段
    const validation = checkRequired(data, ['title', 'image']);
    if (!validation.valid) {
      return { code: -2, msg: `缺少必填字段: ${validation.missing.join(', ')}` };
    }

    // 验证数据类型
    if (!validateType(data.sort, 'number') && data.sort !== undefined) {
      return { code: -2, msg: 'sort必须是数字' };
    }
    if (!validateType(data.isActive, 'boolean') && data.isActive !== undefined) {
      return { code: -2, msg: 'isActive必须是布尔值' };
    }

    const bannerData = {
      title: data.title,
      image: data.image,
      link: data.link || '',
      isActive: data.isActive !== undefined ? data.isActive : true,
      sort: data.sort || 0,
      createTime: db.serverDate(),
      updateTime: db.serverDate()
    };

    const result = await db.collection('banners').add({
      data: bannerData
    });

    await logOperation(adminInfo.id, 'createBanner', {
      bannerId: result.id,
      title: data.title
    });

    return {
      code: 0,
      data: { id: result.id },
      msg: 'Banner创建成功'
    };
  } catch (error) {
    console.error('Create banner error:', error);
    return { code: 500, msg: error.message };
  }
}

/**
 * 更新Banner
 * @param {Object} db - 数据库实例
 * @param {Object} logOperation - 日志函数
 * @param {Object} data - 请求数据
 * @param {Object} wxContext - 微信上下文
 * @returns {Promise<Object>} 更新结果
 */
async function updateBannerAdmin(db, logOperation, data, wxContext) {
  try {
    const adminInfo = wxContext.ADMIN_INFO || { id: 'system' };

    const { id, ...updateData } = data || {};

    if (!id) {
      return { code: -2, msg: '缺少Banner ID' };
    }

    // 验证数据类型
    if (updateData.sort !== undefined && !validateType(updateData.sort, 'number')) {
      return { code: -2, msg: 'sort必须是数字' };
    }
    if (updateData.isActive !== undefined && !validateType(updateData.isActive, 'boolean')) {
      return { code: -2, msg: 'isActive必须是布尔值' };
    }

    updateData.updateTime = db.serverDate();

    await db.collection('banners').doc(id).update({
      data: updateData
    });

    await logOperation(adminInfo.id, 'updateBanner', {
      bannerId: id,
      ...updateData
    });

    return {
      code: 0,
      msg: 'Banner更新成功'
    };
  } catch (error) {
    console.error('Update banner error:', error);
    return { code: 500, msg: error.message };
  }
}

/**
 * 删除Banner
 * @param {Object} db - 数据库实例
 * @param {Object} logOperation - 日志函数
 * @param {Object} data - 请求数据
 * @param {Object} wxContext - 微信上下文
 * @returns {Promise<Object>} 删除结果
 */
async function deleteBannerAdmin(db, logOperation, data, wxContext) {
  try {
    const adminInfo = wxContext.ADMIN_INFO || { id: 'system' };

    const { id } = data || {};

    if (!id) {
      return { code: -2, msg: '缺少Banner ID' };
    }

    await db.collection('banners').doc(id).remove();

    await logOperation(adminInfo.id, 'deleteBanner', { bannerId: id });

    return {
      code: 0,
      msg: 'Banner删除成功'
    };
  } catch (error) {
    console.error('Delete banner error:', error);
    return { code: 500, msg: error.message };
  }
}

/**
 * 获取Banner详情
 * @param {Object} db - 数据库实例
 * @param {Object} data - 请求数据
 * @returns {Promise<Object>} 查询结果
 */
async function getBannerDetailAdmin(db, data) {
  try {
    const { id } = data || {};

    if (!id) {
      return { code: -2, msg: '缺少Banner ID' };
    }

    const bannerResult = await db.collection('banners').doc(id).get();

    if (!bannerResult.data) {
      return { code: 404, msg: 'Banner不存在' };
    }

    return {
      code: 0,
      data: bannerResult.data
    };
  } catch (error) {
    console.error('Get banner detail error:', error);
    return { code: 500, msg: error.message };
  }
}

module.exports = {
  getBannersAdmin,
  createBannerAdmin,
  updateBannerAdmin,
  deleteBannerAdmin,
  getBannerDetailAdmin
};
