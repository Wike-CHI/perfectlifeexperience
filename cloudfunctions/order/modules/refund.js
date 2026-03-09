/**
 * 订单模块 - 退款管理
 *
 * 包含：申请退款、取消退款、更新退货物流、获取退款列表、获取退款详情
 */
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

// 引入日志
const { createLogger } = require('../common/logger');
const logger = createLogger('refund');

// 引入响应工具
const { success, error, ErrorCodes } = require('../common/response');

/**
 * 生成退款单号
 */
function generateRefundNo() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hour = String(now.getHours()).padStart(2, '0');
  const minute = String(now.getMinutes()).padStart(2, '0');
  const second = String(now.getSeconds()).padStart(2, '0');
  const random = String(Math.floor(Math.random() * 1000000)).padStart(6, '0');

  return `RF${year}${month}${day}${hour}${minute}${second}${random}`;
}

/**
 * 申请退款
 * @param {string} openid - 用户openid
 * @param {Object} data - 退款数据
 */
async function applyRefund(openid, data) {
  try {
    logger.info('Apply refund', { openid, orderId: data.orderId });

    const { orderId, refundType, refundReason, products } = data;

    if (!orderId) {
      return error(ErrorCodes.INVALID_PARAMS, '缺少订单ID');
    }
    if (!refundType || !['only_refund', 'return_refund'].includes(refundType)) {
      return error(ErrorCodes.INVALID_PARAMS, '退款类型无效');
    }
    if (!refundReason) {
      return error(ErrorCodes.INVALID_PARAMS, '缺少退款原因');
    }

    const orderRes = await db.collection('orders')
      .where({ _id: orderId, _openid: openid })
      .get();

    if (orderRes.data.length === 0) {
      return error(ErrorCodes.NOT_FOUND, '订单不存在');
    }

    const order = orderRes.data[0];

    if (!['paid', 'shipping', 'completed'].includes(order.status)) {
      return error(ErrorCodes.INVALID_STATUS, '订单状态不支持退款');
    }

    const existingRefundRes = await db.collection('refunds')
      .where({
        orderId: orderId,
        refundStatus: _.nin(['rejected', 'cancelled', 'completed'])
      })
      .get();

    if (existingRefundRes.data.length > 0) {
      return error(ErrorCodes.INVALID_STATUS, '该订单已有进行中的退款申请');
    }

    let refundAmount = order.totalAmount;

    const refundRecord = {
      _openid: openid,
      refundNo: generateRefundNo(),
      orderId: orderId,
      orderNo: order.orderNo,
      refundType,
      refundReason,
      refundAmount,
      products: products || [],
      refundStatus: 'pending',
      createTime: new Date(),
      updateTime: new Date()
    };

    const res = await db.collection('refunds').add({
      data: refundRecord
    });

    logger.info('Refund applied', { refundId: res._id, orderId });

    return success(
      { refundId: res._id },
      '退款申请已提交'
    );
  } catch (err) {
    logger.error('Apply refund failed', err);
    return error(ErrorCodes.DATABASE_ERROR, '退款申请失败', err.message);
  }
}

/**
 * 取消退款申请
 * @param {string} openid - 用户openid
 * @param {Object} data - 取消数据
 */
async function cancelRefund(openid, data) {
  try {
    const { refundId } = data;

    if (!refundId) {
      return error(ErrorCodes.INVALID_PARAMS, '缺少退款ID');
    }

    const refundRes = await db.collection('refunds')
      .where({ _id: refundId, _openid: openid })
      .get();

    if (refundRes.data.length === 0) {
      return error(ErrorCodes.NOT_FOUND, '退款记录不存在');
    }

    const refund = refundRes.data[0];

    if (refund.refundStatus !== 'pending') {
      return error(ErrorCodes.INVALID_STATUS, '当前状态不允许取消');
    }

    await db.collection('refunds')
      .doc(refundId)
      .update({
        data: {
          refundStatus: 'cancelled',
          updateTime: new Date()
        }
      });

    logger.info('Refund cancelled', { refundId });

    return success(null, '取消退款成功');
  } catch (err) {
    logger.error('Cancel refund failed', err);
    return error(ErrorCodes.DATABASE_ERROR, '取消退款失败', err.message);
  }
}

/**
 * 更新退货物流
 * @param {string} openid - 用户openid
 * @param {Object} data - 物流数据
 */
async function updateReturnLogistics(openid, data) {
  try {
    const { refundId, company, trackingNo } = data;

    if (!refundId || !company || !trackingNo) {
      return error(ErrorCodes.INVALID_PARAMS, '缺少必需参数');
    }

    const refundRes = await db.collection('refunds')
      .where({ _id: refundId, _openid: openid })
      .get();

    if (refundRes.data.length === 0) {
      return error(ErrorCodes.NOT_FOUND, '退款记录不存在');
    }

    const refund = refundRes.data[0];

    if (refund.refundStatus !== 'approved') {
      return error(ErrorCodes.INVALID_STATUS, '当前状态不允许填写物流');
    }

    await db.collection('refunds')
      .doc(refundId)
      .update({
        data: {
          returnLogistics: {
            company: company,
            trackingNo: trackingNo,
            shipTime: new Date()
          },
          refundStatus: 'waiting_receive',
          updateTime: new Date()
        }
      });

    logger.info('Return logistics updated', { refundId });

    return success(null, '物流信息更新成功');
  } catch (err) {
    logger.error('Update return logistics failed', err);
    return error(ErrorCodes.DATABASE_ERROR, '更新物流失败', err.message);
  }
}

/**
 * 获取退款列表
 * @param {string} openid - 用户openid
 * @param {Object} data - 查询数据
 */
async function getRefundList(openid, data) {
  try {
    const { status } = data || {};

    const query = { _openid: openid };

    if (status) {
      const statuses = status.split(',').map(s => s.trim());
      query.refundStatus = _.in(statuses);
    }

    const res = await db.collection('refunds')
      .where(query)
      .orderBy('createTime', 'desc')
      .get();

    return success({ refunds: res.data }, '获取退款列表成功');
  } catch (err) {
    logger.error('Get refund list failed', err);
    return error(ErrorCodes.DATABASE_ERROR, '获取退款列表失败', err.message);
  }
}

/**
 * 获取退款详情
 * @param {string} openid - 用户openid
 * @param {Object} data - 查询数据
 */
async function getRefundDetail(openid, data) {
  try {
    const { refundId } = data;

    if (!refundId) {
      return error(ErrorCodes.INVALID_PARAMS, '缺少退款ID');
    }

    const refundRes = await db.collection('refunds')
      .where({ _id: refundId, _openid: openid })
      .get();

    if (refundRes.data.length === 0) {
      return error(ErrorCodes.NOT_FOUND, '退款记录不存在');
    }

    const refund = refundRes.data[0];

    const orderRes = await db.collection('orders')
      .where({ _id: refund.orderId })
      .get();

    const order = orderRes.data[0] || null;

    return success({
      refund: refund,
      order: order
    }, '获取退款详情成功');
  } catch (err) {
    logger.error('Get refund detail failed', err);
    return error(ErrorCodes.DATABASE_ERROR, '获取退款详情失败', err.message);
  }
}

module.exports = {
  generateRefundNo,
  applyRefund,
  cancelRefund,
  updateReturnLogistics,
  getRefundList,
  getRefundDetail
};
