/**
 * 门店管理模块
 */

// 获取门店列表
async function getStores(db, data) {
  try {
    const { page = 1, limit = 20, isActive } = data || {};
    const skip = (page - 1) * limit;

    let query = {};
    if (isActive !== undefined) {
      query.isActive = isActive === 'true' || isActive === true;
    }

    const [listResult, countResult] = await Promise.all([
      db.collection('stores')
        .where(query)
        .orderBy('sort', 'asc')
        .skip(skip)
        .limit(limit)
        .get(),
      db.collection('stores').where(query).count()
    ]);

    return {
      code: 0,
      data: {
        list: listResult.data,
        total: countResult.total
      }
    };
  } catch (error) {
    console.error('Get stores error:', error);
    return { code: 500, msg: error.message };
  }
}

// 获取门店详情
async function getStoreDetail(db, data) {
  try {
    const { id } = data || {};
    if (!id) {
      return { code: 400, msg: '缺少门店ID' };
    }

    const result = await db.collection('stores').doc(id).get();
    if (!result.data) {
      return { code: 404, msg: '门店不存在' };
    }

    return { code: 0, data: result.data };
  } catch (error) {
    console.error('Get store detail error:', error);
    return { code: 500, msg: error.message };
  }
}

// 创建门店
async function createStore(db, logOperation, data, wxContext) {
  try {
    const { name, address, phone, businessHours, latitude, longitude, isActive = true, sort = 0, images = [] } = data || {};

    if (!name) {
      return { code: 400, msg: '门店名称不能为空' };
    }

    const storeData = {
      name,
      address: address || '',
      phone: phone || '',
      businessHours: businessHours || '',
      latitude: latitude || '',
      longitude: longitude || '',
      isActive,
      sort,
      images,
      createTime: db.serverDate(),
      updateTime: db.serverDate()
    };

    const result = await db.collection('stores').add({
      data: storeData
    });

    // 记录日志
    if (logOperation) {
      await logOperation(wxContext.OPENID, 'createStore', { storeId: result.id, name });
    }

    return {
      code: 0,
      data: { id: result.id },
      msg: '门店创建成功'
    };
  } catch (error) {
    console.error('Create store error:', error);
    return { code: 500, msg: error.message };
  }
}

// 更新门店
async function updateStore(db, logOperation, data, wxContext) {
  try {
    const { id, name, address, phone, businessHours, latitude, longitude, isActive, sort, images } = data || {};

    if (!id) {
      return { code: 400, msg: '门店ID不能为空' };
    }

    if (!name) {
      return { code: 400, msg: '门店名称不能为空' };
    }

    const updateData = {
      name,
      address: address || '',
      phone: phone || '',
      businessHours: businessHours || '',
      latitude: latitude || '',
      longitude: longitude || '',
      isActive: isActive !== undefined ? isActive : true,
      sort: sort || 0,
      images: images || [],
      updateTime: db.serverDate()
    };

    await db.collection('stores').doc(id).update({ data: updateData });

    // 记录日志
    if (logOperation) {
      await logOperation(wxContext.OPENID, 'updateStore', { storeId: id, name });
    }

    return { code: 0, msg: '门店更新成功' };
  } catch (error) {
    console.error('Update store error:', error);
    return { code: 500, msg: error.message };
  }
}

// 删除门店
async function deleteStore(db, logOperation, data, wxContext) {
  try {
    const { id } = data || {};

    if (!id) {
      return { code: 400, msg: '门店ID不能为空' };
    }

    // 检查是否有订单关联此门店
    const ordersCount = await db.collection('orders')
      .where({ storeId: id })
      .count();

    if (ordersCount.total > 0) {
      return { code: 400, msg: `该门店有 ${ordersCount.total} 个订单关联，无法删除` };
    }

    await db.collection('stores').doc(id).remove();

    // 记录日志
    if (logOperation) {
      await logOperation(wxContext.OPENID, 'deleteStore', { storeId: id });
    }

    return { code: 0, msg: '门店删除成功' };
  } catch (error) {
    console.error('Delete store error:', error);
    return { code: 500, msg: error.message };
  }
}

// 设置默认门店
async function setDefaultStore(db, logOperation, data, wxContext) {
  try {
    const { id } = data || {};

    if (!id) {
      return { code: 400, msg: '门店ID不能为空' };
    }

    // 先清除所有门店的默认标记
    await db.collection('stores')
      .where({ isDefault: true })
      .update({
        data: { isDefault: false, updateTime: db.serverDate() }
      });

    // 设置指定门店为默认
    await db.collection('stores').doc(id).update({
      data: { isDefault: true, updateTime: db.serverDate() }
    });

    // 记录日志
    if (logOperation) {
      await logOperation(wxContext.OPENID, 'setDefaultStore', { storeId: id });
    }

    return { code: 0, msg: '已设置为默认门店' };
  } catch (error) {
    console.error('Set default store error:', error);
    return { code: 500, msg: error.message };
  }
}

module.exports = {
  getStores,
  getStoreDetail,
  createStore,
  updateStore,
  deleteStore,
  setDefaultStore
};
