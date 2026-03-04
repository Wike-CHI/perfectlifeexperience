/**
 * 推广活动管理模块
 */

const { calcPagination } = require('./common/pagination');
const { checkRequired, validateType } = require('./common/validator');

/**
 * 获取推广活动列表
 */
async function getPromotionsAdmin(db, data) {
  try {
    const { page = 1, limit = 20, status } = data || {};
    const { skip, limit: validLimit } = calcPagination(page, limit);

    let query = {};
    if (status === 'active') query.isActive = true;
    else if (status === 'inactive') query.isActive = false;

    const [result, countResult] = await Promise.all([
      db.collection('promotions').where(query).orderBy('createTime', 'desc').skip(skip).limit(validLimit).get(),
      db.collection('promotions').where(query).count()
    ]);

    return { code: 0, data: { list: result.data, total: countResult.total, page, limit: validLimit } };
  } catch (error) {
    console.error('Get promotions error:', error);
    return { code: 500, msg: error.message };
  }
}

/**
 * 获取推广活动详情
 */
async function getPromotionDetailAdmin(db, data) {
  try {
    const { id } = data || {};
    if (!id) return { code: -2, msg: '缺少活动ID' };

    const result = await db.collection('promotions').doc(id).get();
    if (!result.data) return { code: 404, msg: '活动不存在' };

    return { code: 0, data: result.data };
  } catch (error) {
    console.error('Get promotion detail error:', error);
    return { code: 500, msg: error.message };
  }
}

/**
 * 创建推广活动
 */
async function createPromotionAdmin(db, logOperation, data, wxContext) {
  try {
    const adminInfo = wxContext.ADMIN_INFO || { id: 'system' };
    const validation = checkRequired(data, ['name']);
    if (!validation.valid) return { code: -2, msg: `缺少必填字段: ${validation.missing.join(', ')}` };

    const promoData = {
      name: data.name,
      description: data.description || '',
      isActive: data.isActive !== undefined ? data.isActive : true,
      startTime: data.startTime || null,
      endTime: data.endTime || null,
      createTime: db.serverDate(),
      updateTime: db.serverDate()
    };

    const result = await db.collection('promotions').add({ data: promoData });
    await logOperation(adminInfo.id, 'createPromotion', { promotionId: result.id, name: data.name });

    return { code: 0, data: { id: result.id }, msg: '活动创建成功' };
  } catch (error) {
    console.error('Create promotion error:', error);
    return { code: 500, msg: error.message };
  }
}

/**
 * 更新推广活动
 */
async function updatePromotionAdmin(db, logOperation, data, wxContext) {
  try {
    const adminInfo = wxContext.ADMIN_INFO || { id: 'system' };
    const { id, ...updateData } = data || {};
    if (!id) return { code: -2, msg: '缺少活动ID' };

    updateData.updateTime = db.serverDate();
    await db.collection('promotions').doc(id).update({ data: updateData });
    await logOperation(adminInfo.id, 'updatePromotion', { promotionId: id, ...updateData });

    return { code: 0, msg: '活动更新成功' };
  } catch (error) {
    console.error('Update promotion error:', error);
    return { code: 500, msg: error.message };
  }
}

/**
 * 删除推广活动
 */
async function deletePromotionAdmin(db, logOperation, data, wxContext) {
  try {
    const adminInfo = wxContext.ADMIN_INFO || { id: 'system' };
    const { id } = data || {};
    if (!id) return { code: -2, msg: '缺少活动ID' };

    await db.collection('promotions').doc(id).remove();
    await logOperation(adminInfo.id, 'deletePromotion', { promotionId: id });

    return { code: 0, msg: '活动删除成功' };
  } catch (error) {
    console.error('Delete promotion error:', error);
    return { code: 500, msg: error.message };
  }
}

/**
 * 获取推广活动商品
 */
async function getPromotionProductsAdmin(db, data) {
  try {
    const { promotionId } = data || {};
    if (!promotionId) return { code: -2, msg: '缺少活动ID' };

    const result = await db.collection('promotion_products').where({ promotionId }).get();
    return { code: 0, data: result.data };
  } catch (error) {
    console.error('Get promotion products error:', error);
    return { code: 500, msg: error.message };
  }
}

/**
 * 添加推广活动商品
 */
async function addPromotionProductsAdmin(db, logOperation, data, wxContext) {
  try {
    const adminInfo = wxContext.ADMIN_INFO || { id: 'system' };
    const { promotionId, productIds } = data || {};
    if (!promotionId) return { code: -2, msg: '缺少活动ID' };
    if (!productIds || !Array.isArray(productIds)) return { code: -2, msg: '缺少商品ID列表' };

    for (const productId of productIds) {
      await db.collection('promotion_products').add({
        data: { promotionId, productId, createTime: db.serverDate() }
      });
    }
    await logOperation(adminInfo.id, 'addPromotionProducts', { promotionId, count: productIds.length });

    return { code: 0, msg: '商品添加成功' };
  } catch (error) {
    console.error('Add promotion products error:', error);
    return { code: 500, msg: error.message };
  }
}

/**
 * 移除推广活动商品
 */
async function removePromotionProductAdmin(db, logOperation, data, wxContext) {
  try {
    const adminInfo = wxContext.ADMIN_INFO || { id: 'system' };
    const { promotionId, productId } = data || {};
    if (!promotionId || !productId) return { code: -2, msg: '缺少必要参数' };

    await db.collection('promotion_products').where({ promotionId, productId }).remove();
    await logOperation(adminInfo.id, 'removePromotionProduct', { promotionId, productId });

    return { code: 0, msg: '商品移除成功' };
  } catch (error) {
    console.error('Remove promotion product error:', error);
    return { code: 500, msg: error.message };
  }
}

/**
 * 获取推广活动统计
 */
async function getPromotionActivityStatsAdmin(db, data) {
  try {
    const { promotionId } = data || {};
    if (!promotionId) return { code: -2, msg: '缺少活动ID' };

    const productsResult = await db.collection('promotion_products').where({ promotionId }).get();
    const productCount = productsResult.data.length;

    return { code: 0, data: { productCount } };
  } catch (error) {
    console.error('Get promotion stats error:', error);
    return { code: 500, msg: error.message };
  }
}

module.exports = {
  getPromotionsAdmin,
  getPromotionDetailAdmin,
  createPromotionAdmin,
  updatePromotionAdmin,
  deletePromotionAdmin,
  getPromotionProductsAdmin,
  addPromotionProductsAdmin,
  removePromotionProductAdmin,
  getPromotionActivityStatsAdmin
};
