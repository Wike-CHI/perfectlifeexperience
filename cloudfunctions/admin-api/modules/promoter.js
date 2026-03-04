/**
 * 推广员/佣金管理模块
 */
const { calcPagination } = require('./common/pagination');

async function getPromotersAdmin(db, data) {
  try {
    const { page = 1, pageSize = 20, agentLevel, keyword } = data || {};
    const { skip, limit: validLimit } = calcPagination(page, pageSize);
    // 查询所有代理等级（1-4级，包含普通会员）
    let query = { agentLevel: db.command.lte(4) };
    if (agentLevel !== undefined && agentLevel >= 1 && agentLevel <= 4) query.agentLevel = agentLevel;
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
    const { page = 1, limit = 20, userId, dateRange } = data || {};
    const { skip, limit: validLimit } = calcPagination(page, limit);
    let query = {};
    if (userId) query.beneficiaryId = userId;

    // 日期范围筛选
    if (dateRange && dateRange !== 'all') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      if (dateRange === 'today') {
        query.createTime = { $gte: today };
      } else if (dateRange === 'week') {
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        query.createTime = { $gte: weekAgo };
      } else if (dateRange === 'month') {
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        query.createTime = { $gte: monthStart };
      }
    }

    const [result, countResult] = await Promise.all([
      db.collection('reward_records').where(query).orderBy('createTime', 'desc').skip(skip).limit(validLimit).get(),
      db.collection('reward_records').where(query).count()
    ]);

    // 获取所有记录用于统计（不分页）
    const allRecords = await db.collection('reward_records').where(query).get();

    // 计算统计数据
    let totalCommission = 0;
    let pendingCommission = 0;
    let settledCommission = 0;

    allRecords.data.forEach(record => {
      const amount = record.amount || 0;
      totalCommission += amount;
      if (record.status === 'pending') {
        pendingCommission += amount;
      } else if (record.status === 'settled') {
        settledCommission += amount;
      }
    });

    // 获取用户信息
    const listWithUsers = await Promise.all(
      result.data.map(async (item) => {
        const userResult = await db.collection('users')
          .where({ _openid: item.beneficiaryId })
          .limit(1)
          .get();
        return {
          ...item,
          user: userResult.data[0] || null
        };
      })
    );

    return {
      code: 0,
      data: {
        list: listWithUsers,
        total: countResult.total,
        page,
        limit: validLimit,
        summary: {
          totalCommission,
          pendingCommission,
          settledCommission
        }
      }
    };
  } catch (error) {
    console.error('Get commissions error:', error);
    return { code: 500, msg: error.message };
  }
}

module.exports = { getPromotersAdmin, getCommissionsAdmin };
