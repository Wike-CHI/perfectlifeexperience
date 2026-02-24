/**
 * 输入验证中间件
 * 用于验证和清理用户输入
 */

const { ErrorCodes } = require('../common/response');

/**
 * 验证ObjectId格式
 */
function isValidObjectId(id) {
  return id && typeof id === 'string' && id.length === 24;
}

/**
 * 验证字符串非空
 */
function isNonEmptyString(value, fieldName = 'Field') {
  if (typeof value !== 'string') {
    return { valid: false, message: `${fieldName}必须是字符串` };
  }
  if (value.trim().length === 0) {
    return { valid: false, message: `${fieldName}不能为空` };
  }
  return { valid: true };
}

/**
 * 验证数字范围
 */
function isNumberInRange(value, min, max, fieldName = 'Field') {
  const num = Number(value);
  if (isNaN(num)) {
    return { valid: false, message: `${fieldName}必须是数字` };
  }
  if (num < min || num > max) {
    return { valid: false, message: `${fieldName}必须在${min}-${max}之间` };
  }
  return { valid: true };
}

/**
 * 验证枚举值
 */
function isEnum(value, allowedValues, fieldName = 'Field') {
  if (!allowedValues.includes(value)) {
    return {
      valid: false,
      message: `${fieldName}必须是以下值之一: ${allowedValues.join(', ')}`
    };
  }
  return { valid: true };
}

/**
 * 验证产品数据
 */
function validateProductData(data) {
  const errors = [];

  // 名称验证
  if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
    errors.push('商品名称不能为空');
  }
  if (data.name && data.name.length > 100) {
    errors.push('商品名称不能超过100个字符');
  }

  // 价格验证
  const price = Number(data.price);
  if (isNaN(price) || price < 0) {
    errors.push('价格必须是有效的正数');
  }

  // 库存验证
  const stock = Number(data.stock);
  if (isNaN(stock) || stock < 0 || !Number.isInteger(stock)) {
    errors.push('库存必须是非负整数');
  }

  // 描述验证
  if (data.description && data.description.length > 2000) {
    errors.push('描述不能超过2000个字符');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * 验证订单状态
 */
function validateOrderStatus(status) {
  const allowedStatuses = ['pending', 'paid', 'shipping', 'completed', 'cancelled'];
  return isEnum(status, allowedStatuses, '订单状态');
}

/**
 * 验证分页参数
 */
function validatePaginationParams(data) {
  const errors = [];

  let page = 1;
  let pageSize = 20;

  if (data.page !== undefined) {
    const pageResult = isNumberInRange(data.page, 1, 1000, '页码');
    if (!pageResult.valid) {
      errors.push(pageResult.message);
    } else {
      page = Number(data.page);
    }
  }

  if (data.pageSize !== undefined) {
    const sizeResult = isNumberInRange(data.pageSize, 1, 100, '每页数量');
    if (!sizeResult.valid) {
      errors.push(sizeResult.message);
    } else {
      pageSize = Number(data.pageSize);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    values: { page, pageSize }
  };
}

/**
 * 清理更新数据 - 移除不允许更新的字段
 */
function sanitizeUpdateData(data, forbiddenFields = ['_id', '_openid', 'createTime']) {
  const sanitized = { ...data };

  forbiddenFields.forEach(field => {
    delete sanitized[field];
  });

  return sanitized;
}

/**
 * 验证提现操作
 */
function validateWithdrawalAction(action) {
  const allowedActions = ['approve', 'reject'];
  return isEnum(action, allowedActions, '操作类型');
}

/**
 * 验证优惠券类型
 */
function validateCouponType(type) {
  const allowedTypes = ['fixed', 'percent'];
  return isEnum(type, allowedTypes, '优惠券类型');
}

/**
 * 验证优惠券有效期类型
 */
function validateValidityType(type) {
  const allowedTypes = ['fixed', 'relative'];
  return isEnum(type, allowedTypes, '有效期类型');
}

/**
 * 组合验证器 - 验证多个条件
 */
function validateAll(...validators) {
  const errors = [];

  for (const validator of validators) {
    if (validator.valid === false) {
      errors.push(validator.message);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

module.exports = {
  isValidObjectId,
  isNonEmptyString,
  isNumberInRange,
  isEnum,
  validateProductData,
  validateOrderStatus,
  validatePaginationParams,
  sanitizeUpdateData,
  validateWithdrawalAction,
  validateCouponType,
  validateValidityType,
  validateAll
};
