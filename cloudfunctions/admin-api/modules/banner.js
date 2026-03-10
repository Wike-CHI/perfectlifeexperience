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

/**
 * 上传Banner图片（服务端上传）
 * @param {Object} db - 数据库实例
 * @param {Object} data - 请求数据 {base64Data, fileName}
 * @param {Object} wxContext - 微信上下文
 * @returns {Promise<Object>} 上传结果
 */
async function uploadBannerImage(db, data, wxContext) {
  const cloud = require('wx-server-sdk');
  cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

  try {
    const { base64Data, fileName } = data;

    if (!base64Data) {
      return { code: -1, msg: '缺少图片数据' };
    }

    // 验证 base64 数据大小
    const estimatedSize = (base64Data.length * 3) / 4;
    if (estimatedSize > 5 * 1024 * 1024) {
      return { code: -1, msg: '图片大小不能超过5MB' };
    }

    // 解码 base64
    const buffer = Buffer.from(base64Data, 'base64');

    // 如果超过 2MB，进行压缩
    let processedBuffer = buffer;
    const maxSize = 2 * 1024 * 1024;

    if (buffer.length > maxSize) {
      try {
        const sharp = require('sharp');
        processedBuffer = await sharp(buffer)
          .jpeg({ quality: 80 })
          .resize(1920, 1080, { fit: 'inside', withoutEnlargement: true })
          .toBuffer();

        if (processedBuffer.length > maxSize) {
          processedBuffer = await sharp(processedBuffer)
            .jpeg({ quality: 70 })
            .resize(1280, 720, { fit: 'inside', withoutEnlargement: true })
            .toBuffer();
        }
        console.log(`图片压缩: ${buffer.length} -> ${processedBuffer.length}`);
      } catch (e) {
        console.error('图片压缩失败，使用原图', e);
        processedBuffer = buffer;
      }
    }

    // 生成云存储路径
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const ext = fileName ? fileName.split('.').pop() : 'jpg';
    const cloudPath = `banners/${timestamp}_${random}.${ext}`;

    // 上传到云存储
    const result = await cloud.uploadFile({
      cloudPath,
      fileContent: processedBuffer
    });

    // 获取临时访问URL
    let tempFileURL = '';
    try {
      const urlResult = await cloud.getTempFileURL({
        fileList: [result.fileID]
      });
      if (urlResult.fileList && urlResult.fileList[0] && urlResult.fileList[0].tempFileURL) {
        tempFileURL = urlResult.fileList[0].tempFileURL;
      }
    } catch (e) {
      console.error('获取临时URL失败', e);
    }

    return {
      code: 0,
      msg: '上传成功',
      data: {
        fileID: result.fileID,
        tempFileURL: tempFileURL || result.fileID,
        originalSize: buffer.length,
        compressedSize: processedBuffer.length
      }
    };
  } catch (error) {
    console.error('上传Banner图片失败:', error);
    return { code: 500, msg: error.message };
  }
}

/**
 * 上传商品图片
 * @param {Object} db - 数据库实例
 * @param {Object} data - 请求数据
 * @returns {Promise<Object>} 上传结果
 */
async function uploadProductImage(db, data, wxContext) {
  const cloud = require('wx-server-sdk');
  cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

  try {
    const { base64Data, fileName } = data;

    if (!base64Data) {
      return { code: -1, msg: '缺少图片数据' };
    }

    // 验证 base64 数据大小
    const estimatedSize = (base64Data.length * 3) / 4;
    if (estimatedSize > 5 * 1024 * 1024) {
      return { code: -1, msg: '图片大小不能超过5MB' };
    }

    // 解码 base64
    const buffer = Buffer.from(base64Data, 'base64');

    // 如果超过 2MB，进行压缩
    let processedBuffer = buffer;
    const maxSize = 2 * 1024 * 1024;

    if (buffer.length > maxSize) {
      try {
        const sharp = require('sharp');
        processedBuffer = await sharp(buffer)
          .jpeg({ quality: 80 })
          .resize(1920, 1080, { fit: 'inside', withoutEnlargement: true })
          .toBuffer();

        if (processedBuffer.length > maxSize) {
          processedBuffer = await sharp(processedBuffer)
            .jpeg({ quality: 70 })
            .resize(1280, 720, { fit: 'inside', withoutEnlargement: true })
            .toBuffer();
        }
        console.log(`图片压缩: ${buffer.length} -> ${processedBuffer.length}`);
      } catch (e) {
        console.error('图片压缩失败，使用原图', e);
        processedBuffer = buffer;
      }
    }

    // 生成云存储路径 - 使用 products 目录
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const ext = fileName ? fileName.split('.').pop() : 'jpg';
    const cloudPath = `products/${timestamp}_${random}.${ext}`;

    // 上传到云存储
    const result = await cloud.uploadFile({
      cloudPath,
      fileContent: processedBuffer
    });

    // 🔥 直接返回 fileID（cloud:// 格式），不返回临时链接
    // 原因：临时链接会过期（max_age: 7200秒 = 2小时），导致图片403
    // 解决：前端显示图片时，使用 wx.cloud.getTempFileURL() 动态获取临时链接
    console.log('✅ 图片上传成功:', {
      fileID: result.fileID,
      cloudPath: result.cloudPath
    });

    return {
      code: 0,
      data: {
        fileID: result.fileID,        // cloud:// 格式的永久文件ID
        url: result.fileID,            // 直接返回fileID，不返回临时链接
        cloudPath: result.cloudPath
      },
      msg: '上传成功'
    };
  } catch (error) {
    console.error('上传商品图片失败:', error);
    return { code: 500, msg: error.message };
  }
}

module.exports = {
  getBannersAdmin,
  createBannerAdmin,
  updateBannerAdmin,
  deleteBannerAdmin,
  getBannerDetailAdmin,
  uploadBannerImage,
  uploadProductImage
};
