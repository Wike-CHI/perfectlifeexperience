/**
 * 地址/店铺/钱包/配置/供应商模块
 */

// 获取用户地址列表
async function getAddresses(db, data) {
  try {
    const { userId } = data || {};
    const query = userId ? { _openid: userId } : {};
    const result = await db.collection('addresses').where(query).get();
    return { code: 0, data: result.data };
  } catch (error) {
    return { code: 500, msg: error.message };
  }
}

// 删除地址
async function deleteAddress(db, logOperation, data, wxContext) {
  try {
    const { id } = data || {};
    await db.collection('addresses').doc(id).remove();
    return { code: 0, msg: '地址已删除' };
  } catch (error) {
    return { code: 500, msg: error.message };
  }
}

// 获取店铺信息
async function getStoreInfo(db) {
  try {
    const result = await db.collection('stores').limit(1).get();
    return { code: 0, data: result.data[0] || {} };
  } catch (error) {
    return { code: 500, msg: error.message };
  }
}

// 更新店铺信息
async function updateStoreInfo(db, logOperation, data, wxContext) {
  try {
    const { id, ...updateData } = data || {};
    await db.collection('stores').doc(id).update({ data: { ...updateData, updateTime: db.serverDate() } });
    return { code: 0, msg: '店铺信息已更新' };
  } catch (error) {
    return { code: 500, msg: error.message };
  }
}

// 获取钱包交易记录
async function getWalletTransactions(db, data) {
  try {
    const { page = 1, limit = 20, userId } = data || {};
    const skip = (page - 1) * limit;
    let query = userId ? { _openid: userId } : {};
    const result = await db.collection('wallet_transactions').where(query).orderBy('createTime', 'desc').skip(skip).limit(limit).get();
    return { code: 0, data: result.data };
  } catch (error) {
    return { code: 500, msg: error.message };
  }
}

// 获取佣金钱包列表
async function getCommissionWallets(db, data) {
  try {
    const { page = 1, limit = 20 } = data || {};
    const skip = (page - 1) * limit;
    const result = await db.collection('commission_wallets').skip(skip).limit(limit).get();
    return { code: 0, data: result.data };
  } catch (error) {
    return { code: 500, msg: error.message };
  }
}

// 获取系统配置
async function getSystemConfig(db) {
  try {
    const result = await db.collection('system_config').limit(1).get();
    return { code: 0, data: result.data[0] || {} };
  } catch (error) {
    return { code: 500, msg: error.message };
  }
}

// 更新系统配置
async function updateSystemConfig(db, data) {
  try {
    const { id, ...updateData } = data || {};
    await db.collection('system_config').doc(id).update({ data: { ...updateData, updateTime: db.serverDate() } });
    return { code: 0, msg: '配置已更新' };
  } catch (error) {
    return { code: 500, msg: error.message };
  }
}

// 供应商管理
async function getSuppliers(db, data) {
  try {
    const result = await db.collection('suppliers').get();
    return { code: 0, data: result.data };
  } catch (error) {
    return { code: 500, msg: error.message };
  }
}

async function getSupplierDetail(db, data) {
  try {
    const { id } = data || {};
    const result = await db.collection('suppliers').doc(id).get();
    return { code: 0, data: result.data };
  } catch (error) {
    return { code: 500, msg: error.message };
  }
}

async function createSupplier(db, logOperation, data, wxContext) {
  try {
    const result = await db.collection('suppliers').add({ data: { ...data, createTime: db.serverDate() } });
    return { code: 0, data: { id: result.id }, msg: '供应商创建成功' };
  } catch (error) {
    return { code: 500, msg: error.message };
  }
}

async function updateSupplier(db, logOperation, data, wxContext) {
  try {
    const { id, ...updateData } = data || {};
    await db.collection('suppliers').doc(id).update({ data: { ...updateData, updateTime: db.serverDate() } });
    return { code: 0, msg: '供应商更新成功' };
  } catch (error) {
    return { code: 500, msg: error.message };
  }
}

async function deleteSupplier(db, logOperation, data, wxContext) {
  try {
    const { id } = data || {};
    await db.collection('suppliers').doc(id).remove();
    return { code: 0, msg: '供应商删除成功' };
  } catch (error) {
    return { code: 500, msg: error.message };
  }
}

module.exports = {
  getAddresses, deleteAddress, getStoreInfo, updateStoreInfo,
  getWalletTransactions, getCommissionWallets, getSystemConfig, updateSystemConfig,
  getSuppliers, getSupplierDetail, createSupplier, updateSupplier, deleteSupplier
};
