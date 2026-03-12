const cloud = require('wx-server-sdk');
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

// 引入响应工具
const { success, error, ErrorCodes } = require('./common/response');

/**
 * 商品搜索云函数
 *
 * Action 列表:
 * - search: 商品搜索（支持关键词、分类、排序）
 * - saveHistory: 保存搜索历史
 * - getHistory: 获取搜索历史
 * - clearHistory: 清空搜索历史
 * - getHotKeywords: 获取热门搜索
 */
exports.main = async (event, context) => {
  const { action, data } = event;
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  console.log('[Search] Action:', action, 'OPENID:', openid);

  try {
    switch (action) {
      case 'search':
        return await handleSearch(data, openid);
      case 'saveHistory':
        return await handleSaveHistory(data, openid);
      case 'getHistory':
        return await handleGetHistory(data, openid);
      case 'clearHistory':
        return await handleClearHistory(openid);
      case 'getHotKeywords':
        return await handleGetHotKeywords();
      default:
        return error(ErrorCodes.INVALID_PARAMS, `未知的 action: ${action}`);
    }
  } catch (err) {
    console.error('[Search] Error:', err);
    return error(ErrorCodes.UNKNOWN_ERROR, err.message);
  }
};

/**
 * 处理商品搜索
 */
async function handleSearch(params, openid) {
  const { keyword, category, sortBy = 'default', page = 1, pageSize = 20 } = params;

  console.log('[Search] Search params:', { keyword, category, sortBy, page, pageSize });

  // 构建查询条件
  let whereCondition = {
    status: _.neq('deleted')  // 排除已删除商品
  };

  // 关键词模糊匹配（搜索商品名称）
  if (keyword && keyword.trim()) {
    const trimmedKeyword = keyword.trim();
    whereCondition.name = db.RegExp({
      regexp: trimmedKeyword,
      options: 'i'  // 不区分大小写
    });
  }

  // 分类筛选
  if (category && category !== 'all') {
    whereCondition.category = category;
  }

  // 排序逻辑
  let orderBy = 'createTime';
  let orderType = 'desc';

  switch (sortBy) {
    case 'price_asc':
      orderBy = 'price';
      orderType = 'asc';
      break;
    case 'price_desc':
      orderBy = 'price';
      orderType = 'desc';
      break;
    case 'sales_desc':
      orderBy = 'sales';
      orderType = 'desc';
      break;
    case 'default':
    default:
      orderBy = 'createTime';
      orderType = 'desc';
      break;
  }

  try {
    // 查询总数
    const countResult = await db.collection('products')
      .where(whereCondition)
      .count();

    const total = countResult.total;

    // 查询商品列表
    const result = await db.collection('products')
      .where(whereCondition)
      .orderBy(orderBy, orderType)
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .get();

    console.log('[Search] Found products:', result.data.length, 'Total:', total);

    return success({
      products: result.data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    }, '搜索成功');
  } catch (err) {
    console.error('[Search] Query error:', err);
    throw err;
  }
}

/**
 * 保存搜索历史
 */
async function handleSaveHistory(params, openid) {
  const { keyword } = params;

  if (!keyword || !keyword.trim()) {
    return error(ErrorCodes.INVALID_PARAMS, '关键词不能为空');
  }

  const trimmedKeyword = keyword.trim();

  try {
    // 查找是否已存在该关键词的搜索记录
    const existing = await db.collection('search_history')
      .where({
        _openid: openid,
        keyword: trimmedKeyword
      })
      .get();

    if (existing.data.length > 0) {
      // 更新搜索次数和时间
      await db.collection('search_history')
        .doc(existing.data[0]._id)
        .update({
          data: {
            searchCount: _.inc(1),
            lastSearchTime: new Date()
          }
        });
    } else {
      // 新增搜索记录
      await db.collection('search_history').add({
        data: {
          _openid: openid,
          keyword: trimmedKeyword,
          searchCount: 1,
          lastSearchTime: new Date()
        }
      });
    }

    return success(null, '保存成功');
  } catch (err) {
    console.error('[Search] Save history error:', err);
    throw err;
  }
}

/**
 * 获取搜索历史
 */
async function handleGetHistory(params, openid) {
  const { limit = 10 } = params;

  try {
    const result = await db.collection('search_history')
      .where({
        _openid: openid
      })
      .orderBy('lastSearchTime', 'desc')
      .limit(limit)
      .get();

    return success(result.data, '获取成功');
  } catch (err) {
    console.error('[Search] Get history error:', err);
    throw err;
  }
}

/**
 * 清空搜索历史
 */
async function handleClearHistory(openid) {
  try {
    // 先查询该用户的所有搜索记录
    const records = await db.collection('search_history')
      .where({
        _openid: openid
      })
      .get();

    // 逐条删除
    for (const record of records.data) {
      await db.collection('search_history').doc(record._id).remove();
    }

    return success(null, '清空成功');
  } catch (err) {
    console.error('[Search] Clear history error:', err);
    throw err;
  }
}

/**
 * 获取热门搜索
 */
async function handleGetHotKeywords() {
  try {
    const result = await db.collection('hot_keywords')
      .where({
        status: 'active'
      })
      .orderBy('rank', 'asc')
      .limit(10)
      .get();

    return success(result.data, '获取成功');
  } catch (err) {
    console.error('[Search] Get hot keywords error:', err);
    throw err;
  }
}
