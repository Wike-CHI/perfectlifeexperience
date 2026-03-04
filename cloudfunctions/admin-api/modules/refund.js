/**
 * 退款管理模块
 */
const { calcPagination } = require('./common/pagination');

async function getRefundList(db, data) {
  try {
    const { page = 1, limit = 20, status } = data || {};
    const { skip, limit: validLimit } = calcPagination(page, limit);
    let query = {};
    if (status && status !== 'all') query.status = status;
    const [result, count] = await Promise.all([
      db.collection('refunds').where(query).orderBy('createTime', 'desc').skip(skip).limit(validLimit).get(),
      db.collection('refunds').where(query).count()
    ]);
    return { code: 0, data: { list: result.data, total: count.total, page, limit: validLimit } };
  } catch (error) {
    return { code: 500, msg: error.message };
  }
}

async function getRefundDetail(db, data) {
  try {
    const { id } = data || {};
    const result = await db.collection('refunds').doc(id).get();
    if (!result.data) return { code: 404, msg: '退款记录不存在' };
    return { code: 0, data: result.data };
  } catch (error) {
    return { code: 500, msg: error.message };
  }
}

async function approveRefund(db, logOperation, data, wxContext) {
  try {
    const { id } = data || {};
    await db.collection('refunds').doc(id).update({ data: { status: 'approved', updateTime: db.serverDate() } });
    return { code: 0, msg: '退款已批准' };
  } catch (error) {
    return { code: 500, msg: error.message };
  }
}

async function confirmReceipt(db, logOperation, data, wxContext) {
  try {
    const { id } = data || {};
    await db.collection('refunds').doc(id).update({ data: { status: 'completed', updateTime: db.serverDate() } });
    return { code: 0, msg: '已确认收货' };
  } catch (error) {
    return { code: 500, msg: error.message };
  }
}

async function rejectRefund(db, logOperation, data, wxContext) {
  try {
    const { id, reason } = data || {};
    await db.collection('refunds').doc(id).update({ data: { status: 'rejected', rejectReason: reason, updateTime: db.serverDate() } });
    return { code: 0, msg: '退款已拒绝' };
  } catch (error) {
    return { code: 500, msg: error.message };
  }
}

async function retryRefund(db, logOperation, data, wxContext) {
  try {
    const { id } = data || {};
    await db.collection('refunds').doc(id).update({ data: { status: 'processing', updateTime: db.serverDate() } });
    return { code: 0, msg: '正在重试退款' };
  } catch (error) {
    return { code: 500, msg: error.message };
  }
}

module.exports = { getRefundList, getRefundDetail, approveRefund, confirmReceipt, rejectRefund, retryRefund };
