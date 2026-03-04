/**
 * 推广员/佣金管理模块
 */
const { calcPagination } = require('./common/pagination');

async function getPromotersAdmin(db, data) {
  try {
    const { page = 1, pageSize = 20, agentLevel, keyword } = data || {};
    const { skip, limit: validLimit } = calcPagination(page, pageSize);
    let query = { agentLevel: db.command.lte(3) };
    if (agentLevel !== undefined && agentLevel >= 1 && agentLevel <= 3) query.agentLevel = agentLevel;
    if (keyword) {
      query.$or = [
        { nickName: db.RegExp({ regexp: keyword, options: 'i' }) },
        { phoneNumber: db.RegExp({ regexp: keyword, options: 'i' }) }
      ];
    }
    const [result, countResult] = await Promise.all([
      db.collection('users').where(query).orderBy('createTime', 'desc').skip(skip).limit(validLimit).get(),
      db.collection('users').where(query).count()
    ]);
    return { code: 0, data: { list: result.data, total: countResult.total, page, pageSize: validLimit } };
  } catch (error) {
    console.error('Get promoters error:', error);
    return { code: 500, msg: error.message };
  }
}

async function getCommissionsAdmin(db, data) {
  try {
    const { page = 1, limit = 20, userId } = data || {};
    const { skip, limit: validLimit } = calcPagination(page, limit);
    let query = {};
    if (userId) query._openid = userId;
    const [result, countResult] = await Promise.all([
      db.collection('commission_transactions').where(query).orderBy('createTime', 'desc').skip(skip).limit(validLimit).get(),
      db.collection('commission_transactions').where(query).count()
    ]);
    return { code: 0, data: { list: result.data, total: countResult.total, page, limit: validLimit } };
  } catch (error) {
    console.error('Get commissions error:', error);
    return { code: 500, msg: error.message };
  }
}

module.exports = { getPromotersAdmin, getCommissionsAdmin };
