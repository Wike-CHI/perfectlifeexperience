/**
 * 分类管理模块
 */
async function getCategories(db, data) {
  try {
    const result = await db.collection('categories').where({}).orderBy('sort', 'asc').get();
    return { code: 0, data: result.data };
  } catch (error) {
    console.error('Get categories error:', error);
    return { code: 500, msg: error.message };
  }
}

module.exports = { getCategories };
