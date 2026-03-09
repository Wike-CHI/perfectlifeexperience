/**
 * 订单模块 - 库存管理
 *
 * 包含：库存扣减、库存恢复、库存流水创建
 */
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

// 引入日志
const { createLogger } = require('../common/logger');
const logger = createLogger('inventory');

// 引入工具函数
const { generateTransactionNo } = require('../common/utils');

/**
 * 创建库存流水记录
 * @param {Object} params - 流水参数
 */
async function createInventoryTransaction(params) {
  try {
    const transaction = {
      transactionNo: generateTransactionNo(),
      productId: params.productId,
      productName: params.productName,
      sku: params.sku || '',
      type: params.type,
      quantity: params.quantity,
      beforeStock: params.beforeStock,
      afterStock: params.afterStock,
      relatedId: params.relatedId || '',
      relatedNo: params.relatedNo || '',
      operatorId: params.operatorId || 'system',
      operatorName: params.operatorName || '系统',
      remark: params.remark || '',
      createTime: db.serverDate()
    };

    await db.collection('inventory_transactions').add({ data: transaction });

    logger.debug('Inventory transaction created', {
      transactionNo: transaction.transactionNo,
      type: params.type,
      productId: params.productId,
      quantity: params.quantity
    });

    return { success: true, transactionNo: transaction.transactionNo };
  } catch (err) {
    logger.error('Failed to create inventory transaction', {
      productId: params.productId,
      error: err.message
    });
    return { success: false, error: err.message };
  }
}

/**
 * 扣减库存（原子性操作）
 * @param {Array} items - 订单商品列表
 * @param {Object} orderInfo - 订单信息
 */
async function deductStock(items, orderInfo = {}) {
  const errors = [];
  const deductedItems = [];

  for (const item of items) {
    try {
      const productRes = await db.collection('products').doc(item.productId).get();
      const beforeStock = productRes.data?.stock || 0;

      let updateResult;

      if (item.skuId) {
        updateResult = await db.collection('products')
          .where({
            _id: item.productId,
            stock: _.gte(item.quantity),
            'skus._id': item.skuId,
            'skus.stock': _.gte(item.quantity)
          })
          .update({
            data: {
              stock: _.inc(-item.quantity),
              'skus.$.stock': _.inc(-item.quantity),
              updateTime: db.serverDate()
            }
          });
      } else {
        updateResult = await db.collection('products')
          .where({
            _id: item.productId,
            stock: _.gte(item.quantity)
          })
          .update({
            data: {
              stock: _.inc(-item.quantity),
              updateTime: db.serverDate()
            }
          });
      }

      if (updateResult.stats.updated === 0) {
        logger.error('Stock deduction failed', {
          productId: item.productId,
          skuId: item.skuId,
          quantity: item.quantity
        });
        errors.push(`"${item.productName}"库存不足`);
      } else {
        logger.debug('Stock deducted successfully', {
          productId: item.productId,
          skuId: item.skuId,
          deducted: item.quantity
        });

        const afterStock = beforeStock - item.quantity;
        deductedItems.push({
          ...item,
          beforeStock,
          afterStock
        });

        await createInventoryTransaction({
          productId: item.productId,
          productName: item.productName,
          sku: item.skuName || item.skuId || '',
          type: 'sale_out',
          quantity: item.quantity,
          beforeStock,
          afterStock,
          relatedId: orderInfo.orderId || '',
          relatedNo: orderInfo.orderNo || '',
          operatorId: orderInfo.openid || 'system',
          operatorName: '订单销售',
          remark: `订单销售出库 - ${orderInfo.orderNo || ''}`
        });
      }
    } catch (err) {
      logger.error('Stock deduction error', {
        productId: item.productId,
        error: err.message
      });
      errors.push(`"${item.productName}"库存扣减异常`);
    }
  }

  if (errors.length > 0 && deductedItems.length > 0) {
    logger.warn('Rolling back deducted stock', {
      deductedCount: deductedItems.length,
      errorCount: errors.length
    });
    await restoreStock(deductedItems, { isRollback: true });
  }

  return {
    success: errors.length === 0,
    errors,
    deductedItems: errors.length === 0 ? deductedItems : []
  };
}

/**
 * 恢复库存
 * @param {Array} items - 订单商品列表
 * @param {Object} options - 选项
 */
async function restoreStock(items, options = {}) {
  const { isRollback = false, orderInfo = {} } = options;

  for (const item of items) {
    try {
      const productRes = await db.collection('products').doc(item.productId).get();
      const beforeStock = productRes.data?.stock || 0;

      await db.collection('products')
        .doc(item.productId)
        .update({
          data: {
            stock: _.inc(item.quantity),
            updateTime: db.serverDate()
          }
        });

      logger.debug('Stock restored', {
        productId: item.productId,
        restored: item.quantity
      });

      if (item.skuId) {
        await db.collection('products')
          .where({
            _id: item.productId,
            'skus._id': item.skuId
          })
          .update({
            data: {
              'skus.$.stock': _.inc(item.quantity),
              updateTime: db.serverDate()
            }
          });
      }

      if (!isRollback) {
        const afterStock = beforeStock + item.quantity;
        await createInventoryTransaction({
          productId: item.productId,
          productName: item.productName,
          sku: item.skuName || item.skuId || '',
          type: 'refund_in',
          quantity: item.quantity,
          beforeStock,
          afterStock,
          relatedId: orderInfo.orderId || '',
          relatedNo: orderInfo.orderNo || '',
          operatorId: orderInfo.openid || 'system',
          operatorName: '订单取消/退款',
          remark: `订单取消/退款入库 - ${orderInfo.orderNo || ''}`
        });
      }
    } catch (err) {
      logger.error('Stock restore error', {
        productId: item.productId,
        error: err.message
      });
    }
  }

  return { success: true };
}

/**
 * 恢复优惠券
 * @param {string} openid - 用户openid
 * @param {string} couponId - 优惠券ID
 * @param {string} orderNo - 订单号
 */
async function restoreCoupon(openid, couponId, orderNo) {
  if (!couponId) {
    return { success: true };
  }

  try {
    const result = await db.collection('user_coupons')
      .where({
        _id: couponId,
        _openid: openid,
        status: 'used'
      })
      .update({
        data: {
          status: 'unused',
          useTime: null,
          orderNo: null,
          restoreTime: db.serverDate(),
          restoreReason: `订单取消: ${orderNo}`,
          updateTime: db.serverDate()
        }
      });

    if (result.stats.updated > 0) {
      logger.info('Coupon restored', { couponId, orderNo, openid });
    } else {
      logger.warn('Coupon restore - no matching coupon', { couponId, orderNo });
    }

    return { success: true };
  } catch (err) {
    logger.error('Coupon restore error', { couponId, error: err.message });
    return { success: false };
  }
}

module.exports = {
  deductStock,
  restoreStock,
  restoreCoupon,
  createInventoryTransaction
};
