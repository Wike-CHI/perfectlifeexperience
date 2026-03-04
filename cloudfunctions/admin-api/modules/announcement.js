/**
 * 公告管理模块
 */

const { calcPagination } = require('./common/pagination');
const { checkRequired, validateType } = require('./common/validator');

// 有效的公告类型
const VALID_ANNOUNCEMENT_TYPES = ['system', 'promotion', 'notice'];

/**
 * 获取公告列表
 * @param {Object} db - 数据库实例
 * @param {Object} data - 请求数据
 * @returns {Promise<Object>} 查询结果
 */
async function getAnnouncementsAdmin(db, data) {
  try {
    const { page = 1, limit = 20, type, status } = data || {};
    const { skip, limit: validLimit } = calcPagination(page, limit);

    let query = {};

    if (type && type !== 'all') {
      query.type = type;
    }

    if (status === 'active') {
      query.isActive = true;
    } else if (status === 'inactive') {
      query.isActive = false;
    }

    const [announcementsResult, countResult] = await Promise.all([
      db.collection('announcements')
        .where(query)
        .orderBy('createTime', 'desc')
        .skip(skip)
        .limit(validLimit)
        .get(),
      db.collection('announcements').where(query).count()
    ]);

    return {
      code: 0,
      data: {
        list: announcementsResult.data,
        total: countResult.total,
        page,
        limit: validLimit,
        totalPages: Math.ceil(countResult.total / validLimit)
      }
    };
  } catch (error) {
    console.error('Get announcements error:', error);
    return { code: 500, msg: error.message };
  }
}

/**
 * 创建公告
 * @param {Object} db - 数据库实例
 * @param {Object} logOperation - 日志函数
 * @param {Object} data - 请求数据
 * @param {Object} wxContext - 微信上下文
 * @returns {Promise<Object>} 创建结果
 */
async function createAnnouncementAdmin(db, logOperation, data, wxContext) {
  try {
    const adminInfo = wxContext.ADMIN_INFO || { id: 'system' };

    // 验证必填字段
    const validation = checkRequired(data, ['title', 'content']);
    if (!validation.valid) {
      return { code: -2, msg: `缺少必填字段: ${validation.missing.join(', ')}` };
    }

    // 验证type
    if (data.type && !VALID_ANNOUNCEMENT_TYPES.includes(data.type)) {
      return { code: -2, msg: `无效的公告类型: ${data.type}` };
    }

    // 验证数据类型
    if (!validateType(data.isActive, 'boolean') && data.isActive !== undefined) {
      return { code: -2, msg: 'isActive必须是布尔值' };
    }

    const announcementData = {
      title: data.title,
      content: data.content,
      type: data.type || 'system',
      isActive: data.isActive !== undefined ? data.isActive : false,
      publishTime: data.isActive ? db.serverDate() : null,
      createTime: db.serverDate()
    };

    const result = await db.collection('announcements').add({
      data: announcementData
    });

    await logOperation(adminInfo.id, 'createAnnouncement', {
      announcementId: result.id,
      title: data.title
    });

    return {
      code: 0,
      data: { id: result.id },
      msg: '公告创建成功'
    };
  } catch (error) {
    console.error('Create announcement error:', error);
    return { code: 500, msg: error.message };
  }
}

/**
 * 更新公告
 * @param {Object} db - 数据库实例
 * @param {Object} logOperation - 日志函数
 * @param {Object} data - 请求数据
 * @param {Object} wxContext - 微信上下文
 * @returns {Promise<Object>} 更新结果
 */
async function updateAnnouncementAdmin(db, logOperation, data, wxContext) {
  try {
    const adminInfo = wxContext.ADMIN_INFO || { id: 'system' };

    const { id, ...updateData } = data || {};

    if (!id) {
      return { code: -2, msg: '缺少公告ID' };
    }

    // 验证type
    if (updateData.type && !VALID_ANNOUNCEMENT_TYPES.includes(updateData.type)) {
      return { code: -2, msg: `无效的公告类型: ${updateData.type}` };
    }

    // 验证数据类型
    if (updateData.isActive !== undefined && !validateType(updateData.isActive, 'boolean')) {
      return { code: -2, msg: 'isActive必须是布尔值' };
    }

    // 激活时设置发布时间
    if (updateData.isActive && !updateData.publishTime) {
      updateData.publishTime = db.serverDate();
    }

    await db.collection('announcements').doc(id).update({
      data: updateData
    });

    await logOperation(adminInfo.id, 'updateAnnouncement', {
      announcementId: id,
      ...updateData
    });

    return {
      code: 0,
      msg: '公告更新成功'
    };
  } catch (error) {
    console.error('Update announcement error:', error);
    return { code: 500, msg: error.message };
  }
}

/**
 * 删除公告
 * @param {Object} db - 数据库实例
 * @param {Object} logOperation - 日志函数
 * @param {Object} data - 请求数据
 * @param {Object} wxContext - 微信上下文
 * @returns {Promise<Object>} 删除结果
 */
async function deleteAnnouncementAdmin(db, logOperation, data, wxContext) {
  try {
    const adminInfo = wxContext.ADMIN_INFO || { id: 'system' };

    const { id } = data || {};

    if (!id) {
      return { code: -2, msg: '缺少公告ID' };
    }

    await db.collection('announcements').doc(id).remove();

    await logOperation(adminInfo.id, 'deleteAnnouncement', { announcementId: id });

    return {
      code: 0,
      msg: '公告删除成功'
    };
  } catch (error) {
    console.error('Delete announcement error:', error);
    return { code: 500, msg: error.message };
  }
}

module.exports = {
  getAnnouncementsAdmin,
  createAnnouncementAdmin,
  updateAnnouncementAdmin,
  deleteAnnouncementAdmin
};
