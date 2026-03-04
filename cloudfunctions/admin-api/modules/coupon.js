/**
 * 优惠券管理模块
 */

const { calcPagination } = require('./common/pagination');
const { checkRequired, validateType, validateRange } = require('./common/validator');

// 有效的优惠券类型
const VALID_COUPON_TYPES = ['cash', 'discount', 'gift'];

/**
 * 获取优惠券列表
 * @param {Object} db - 数据库实例
 * @param {Object} data - 请求数据
 * @returns {Promise<Object>} 查询结果
 */
async function getCouponsAdmin(db, data) {
  try {
    const { page = 1, limit = 20, status } = data || {};
    const { skip, limit: validLimit } = calcPagination(page, limit);

    let query = {};

    if (status === 'active') {
      query.isActive = true;
    } else if (status === 'inactive') {
      query.isActive = false;
    }

    const [couponsResult, countResult] = await Promise.all([
      db.collection('coupons')
        .where(query)
        .orderBy('createTime', 'desc')
        .skip(skip)
        .limit(validLimit)
        .get(),
      db.collection('coupons').where(query).count()
    ]);

    return {
      code: 0,
      data: {
        list: couponsResult.data,
        total: countResult.total,
        page,
        limit: validLimit,
        totalPages: Math.ceil(countResult.total / validLimit)
      }
    };
  } catch (error) {
    console.error('Get coupons error:', error);
    return { code: 500, msg: error.message };
  }
}

/**
 * 创建优惠券
 * @param {Object} db - 数据库实例
 * @param {Object} logOperation - 日志函数
 * @param {Object} data - 请求数据
 * @param {Object} wxContext - 微信上下文
 * @returns {Promise<Object>} 创建结果
 */
async function createCouponAdmin(db, logOperation, data, wxContext) {
  try {
    const adminInfo = wxContext.ADMIN_INFO || { id: 'system' };

    // 验证必填字段
    const validation = checkRequired(data, ['name', 'type']);
    if (!validation.valid) {
      return { code: -2, msg: `缺少必填字段: ${validation.missing.join(', ')}` };
    }

    // 验证type
    if (!VALID_COUPON_TYPES.includes(data.type)) {
      return { code: -2, msg: `无效的优惠券类型: ${data.type}` };
    }

    // 验证优惠券值
    if (data.type === 'cash') {
      if (!Number.isInteger(data.value) || data.value <= 0) {
        return { code: -2, msg: '满减券金额必须是正整数' };
      }
    } else if (data.type === 'discount') {
      if (typeof data.value !== 'number' || data.value <= 0 || data.value > 1) {
        return { code: -2, msg: '折扣券折扣值必须在0-1之间' };
      }
    }

    // 验证数值范围
    if (data.totalCount !== undefined) {
      if (!Number.isInteger(data.totalCount) || data.totalCount <= 0) {
        return { code: -2, msg: '发放总量必须是正整数' };
      }
    }

    if (data.minAmount !== undefined) {
      if (typeof data.minAmount !== 'number' || data.minAmount < 0) {
        return { code: -2, msg: '最低消费金额必须是非负数' };
      }
    }

    // 验证数据类型
    if (!validateType(data.isActive, 'boolean') && data.isActive !== undefined) {
      return { code: -2, msg: 'isActive必须是布尔值' };
    }

    const couponData = {
      name: data.name,
      type: data.type,
      value: data.value || 0,
      minAmount: data.minAmount || 0,
      isActive: data.isActive !== undefined ? data.isActive : true,
      totalCount: data.totalCount || 0,
      remainCount: data.totalCount || 0,
      createTime: db.serverDate(),
      updateTime: db.serverDate()
    };

    const result = await db.collection('coupons').add({
      data: couponData
    });

    await logOperation(adminInfo.id, 'createCoupon', {
      couponId: result.id,
      name: data.name
    });

    return {
      code: 0,
      data: { id: result.id },
      msg: '优惠券创建成功'
    };
  } catch (error) {
    console.error('Create coupon error:', error);
    return { code: 500, msg: error.message };
  }
}

/**
 * 更新优惠券
 * @param {Object} db - 数据库实例
 * @param {Object} logOperation - 日志函数
 * @param {Object} data - 请求数据
 * @param {Object} wxContext - 微信上下文
 * @returns {Promise<Object>} 更新结果
 */
async function updateCouponAdmin(db, logOperation, data, wxContext) {
  try {
    const adminInfo = wxContext.ADMIN_INFO || { id: 'system' };

    const { id, ...updateData } = data || {};

    if (!id) {
      return { code: -2, msg: '缺少优惠券ID' };
    }

    // 验证type
    if (updateData.type && !VALID_COUPON_TYPES.includes(updateData.type)) {
      return { code: -2, msg: `无效的优惠券类型: ${updateData.type}` };
    }

    // 验证优惠券值
    if (updateData.type === 'cash' && updateData.value !== undefined) {
      if (!Number.isInteger(updateData.value) || updateData.value <= 0) {
        return { code: -2, msg: '满减券金额必须是正整数' };
      }
    } else if (updateData.type === 'discount' && updateData.value !== undefined) {
      if (typeof updateData.value !== 'number' || updateData.value <= 0 || updateData.value > 1) {
        return { code: -2, msg: '折扣券折扣值必须在0-1之间' };
      }
    }

    // 验证数据类型
    if (updateData.isActive !== undefined && !validateType(updateData.isActive, 'boolean')) {
      return { code: -2, msg: 'isActive必须是布尔值' };
    }

    updateData.updateTime = db.serverDate();

    await db.collection('coupons').doc(id).update({
      data: updateData
    });

    await logOperation(adminInfo.id, 'updateCoupon', {
      couponId: id,
      ...updateData
    });

    return {
      code: 0,
      msg: '优惠券更新成功'
    };
  } catch (error) {
    console.error('Update coupon error:', error);
    return { code: 500, msg: error.message };
  }
}

/**
 * 删除优惠券
 * @param {Object} db - 数据库实例
 * @param {Object} logOperation - 日志函数
 * @param {Object} data - 请求数据
 * @param {Object} wxContext - 微信上下文
 * @returns {Promise<Object>} 删除结果
 */
async function deleteCouponAdmin(db, logOperation, data, wxContext) {
  try {
    const adminInfo = wxContext.ADMIN_INFO || { id: 'system' };

    const { id } = data || {};

    if (!id) {
      return { code: -2, msg: '缺少优惠券ID' };
    }

    await db.collection('coupons').doc(id).remove();

    await logOperation(adminInfo.id, 'deleteCoupon', { couponId: id });

    return {
      code: 0,
      msg: '优惠券删除成功'
    };
  } catch (error) {
    console.error('Delete coupon error:', error);
    return { code: 500, msg: error.message };
  }
}

/**
 * 获取优惠券详情
 * @param {Object} db - 数据库实例
 * @param {Object} data - 请求数据
 * @returns {Promise<Object>} 查询结果
 */
async function getCouponDetailAdmin(db, data) {
  try {
    const { id } = data || {};

    if (!id) {
      return { code: -2, msg: '缺少优惠券ID' };
    }

    const couponResult = await db.collection('coupons').doc(id).get();

    if (!couponResult.data) {
      return { code: 404, msg: '优惠券不存在' };
    }

    return {
      code: 0,
      data: couponResult.data
    };
  } catch (error) {
    console.error('Get coupon detail error:', error);
    return { code: 500, msg: error.message };
  }
}

module.exports = {
  getCouponsAdmin,
  createCouponAdmin,
  updateCouponAdmin,
  deleteCouponAdmin,
  getCouponDetailAdmin
};
