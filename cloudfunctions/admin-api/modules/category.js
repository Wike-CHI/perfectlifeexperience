/**
 * 分类管理模块
 */
async function getCategories(db, data) {
  try {
    const { page = 1, limit = 20 } = data || {};
    const skip = (page - 1) * limit;

    const [listResult, countResult] = await Promise.all([
      db.collection('categories')
        .orderBy('sort', 'asc')
        .skip(skip)
        .limit(limit)
        .get(),
      db.collection('categories').count()
    ]);

    return {
      code: 0,
      data: {
        list: listResult.data,
        total: countResult.total
      }
    };
  } catch (error) {
    console.error('Get categories error:', error);
    return { code: 500, msg: error.message };
  }
}

async function getCategoryDetail(db, data) {
  try {
    const { id } = data || {};
    if (!id) {
      return { code: 400, msg: '缺少分类ID' };
    }

    const result = await db.collection('categories').doc(id).get();
    if (!result.data) {
      return { code: 404, msg: '分类不存在' };
    }

    return { code: 0, data: result.data };
  } catch (error) {
    console.error('Get category detail error:', error);
    return { code: 500, msg: error.message };
  }
}

async function createCategory(db, logOperation, data, wxContext) {
  try {
    const { name, icon, sort = 0, isActive = true } = data || {};

    if (!name) {
      return { code: 400, msg: '分类名称不能为空' };
    }

    const categoryData = {
      name,
      icon: icon || '',
      sort,
      isActive,
      createTime: db.serverDate(),
      updateTime: db.serverDate()
    };

    const result = await db.collection('categories').add({
      data: categoryData
    });

    return {
      code: 0,
      data: { id: result.id },
      msg: '分类创建成功'
    };
  } catch (error) {
    console.error('Create category error:', error);
    return { code: 500, msg: error.message };
  }
}

async function updateCategory(db, logOperation, data, wxContext) {
  try {
    const { id, name, icon, sort, isActive } = data || {};

    if (!id) {
      return { code: 400, msg: '分类ID不能为空' };
    }

    if (!name) {
      return { code: 400, msg: '分类名称不能为空' };
    }

    const updateData = {
      name,
      icon: icon || '',
      sort: sort || 0,
      isActive: isActive !== undefined ? isActive : true,
      updateTime: db.serverDate()
    };

    await db.collection('categories').doc(id).update({ data: updateData });

    return { code: 0, msg: '分类更新成功' };
  } catch (error) {
    console.error('Update category error:', error);
    return { code: 500, msg: error.message };
  }
}

async function deleteCategory(db, logOperation, data, wxContext) {
  try {
    const { id } = data || {};

    if (!id) {
      return { code: 400, msg: '分类ID不能为空' };
    }

    // 先获取分类信息（商品表中category存储的是分类名称，不是ID）
    const categoryRes = await db.collection('categories').doc(id).get();
    if (!categoryRes.data || categoryRes.data.length === 0) {
      return { code: 404, msg: '分类不存在' };
    }
    const categoryName = categoryRes.data[0].name;

    // 检查是否有产品使用此分类（使用分类名称查询）
    const productsCount = await db.collection('products')
      .where({ category: categoryName })
      .count();

    if (productsCount.total > 0) {
      return { code: 400, msg: `该分类下有 ${productsCount.total} 个产品，无法删除` };
    }

    await db.collection('categories').doc(id).remove();

    return { code: 0, msg: '分类删除成功' };
  } catch (error) {
    console.error('Delete category error:', error);
    return { code: 500, msg: error.message };
  }
}

module.exports = {
  getCategories,
  getCategoryDetail,
  createCategory,
  updateCategory,
  deleteCategory
};
