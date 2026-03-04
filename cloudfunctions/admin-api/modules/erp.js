/**
 * ERP模块 - 采购/库存管理
 */
const { calcPagination } = require('./common/pagination');

// 采购订单
async function getPurchaseOrders(db, data) {
  try {
    const { page = 1, limit = 20, status } = data || {};
    const { skip, limit: validLimit } = calcPagination(page, limit);
    let query = {};
    if (status) query.status = status;
    const [result, count] = await Promise.all([
      db.collection('purchase_orders').where(query).orderBy('createTime', 'desc').skip(skip).limit(validLimit).get(),
      db.collection('purchase_orders').where(query).count()
    ]);
    return { code: 0, data: { list: result.data, total: count.total } };
  } catch (error) { return { code: 500, msg: error.message }; }
}

async function getPurchaseOrderDetail(db, data) {
  try {
    const { id } = data || {};
    const result = await db.collection('purchase_orders').doc(id).get();
    return { code: 0, data: result.data };
  } catch (error) { return { code: 500, msg: error.message }; }
}

async function createPurchaseOrder(db, logOperation, data, wxContext) {
  try {
    const result = await db.collection('purchase_orders').add({ data: { ...data, status: 'pending', createTime: db.serverDate() } });
    return { code: 0, data: { id: result.id }, msg: '采购单创建成功' };
  } catch (error) { return { code: 500, msg: error.message }; }
}

async function updatePurchaseOrder(db, logOperation, data, wxContext) {
  try {
    const { id, ...updateData } = data || {};
    await db.collection('purchase_orders').doc(id).update({ data: { ...updateData, updateTime: db.serverDate() } });
    return { code: 0, msg: '采购单更新成功' };
  } catch (error) { return { code: 500, msg: error.message }; }
}

async function submitPurchaseOrder(db, logOperation, data, wxContext) {
  try {
    const { id } = data || {};
    await db.collection('purchase_orders').doc(id).update({ data: { status: 'submitted', updateTime: db.serverDate() } });
    return { code: 0, msg: '采购单已提交' };
  } catch (error) { return { code: 500, msg: error.message }; }
}

async function receivePurchaseOrder(db, logOperation, data, wxContext) {
  try {
    const { id } = data || {};
    await db.collection('purchase_orders').doc(id).update({ data: { status: 'received', updateTime: db.serverDate() } });
    return { code: 0, msg: '采购单已入库' };
  } catch (error) { return { code: 500, msg: error.message }; }
}

async function cancelPurchaseOrder(db, logOperation, data, wxContext) {
  try {
    const { id } = data || {};
    await db.collection('purchase_orders').doc(id).update({ data: { status: 'cancelled', updateTime: db.serverDate() } });
    return { code: 0, msg: '采购单已取消' };
  } catch (error) { return { code: 500, msg: error.message }; }
}

// 库存概览
async function getInventoryOverview(db) {
  try {
    const [total, lowStock, outOfStock] = await Promise.all([
      db.collection('products').count(),
      db.collection('products').where({ stock: db.command.lt(10) }).count(),
      db.collection('products').where({ stock: 0 }).count()
    ]);
    return { code: 0, data: { total: total.total, lowStock: lowStock.total, outOfStock: outOfStock.total } };
  } catch (error) { return { code: 500, msg: error.message }; }
}

async function getInventoryBatches(db, data) {
  try {
    const result = await db.collection('inventory_batches').get();
    return { code: 0, data: result.data };
  } catch (error) { return { code: 500, msg: error.message }; }
}

async function getInventoryTransactions(db, data) {
  try {
    const result = await db.collection('inventory_transactions').orderBy('createTime', 'desc').limit(100).get();
    return { code: 0, data: result.data };
  } catch (error) { return { code: 500, msg: error.message }; }
}

async function adjustInventory(db, logOperation, data, wxContext) {
  try {
    const { productId, delta, reason } = data || {};
    const product = await db.collection('products').doc(productId).get();
    const newStock = (product.data.stock || 0) + delta;
    await db.collection('products').doc(productId).update({ data: { stock: newStock } });
    return { code: 0, msg: '库存调整成功' };
  } catch (error) { return { code: 500, msg: error.message }; }
}

async function getExpiringBatches(db, data) {
  try {
    const days = data?.days || 30;
    const result = await db.collection('inventory_batches').where({ expiryDate: db.command.lte(new Date(Date.now() + days * 86400000)) }).get();
    return { code: 0, data: result.data };
  } catch (error) { return { code: 500, msg: error.message }; }
}

async function getExpiredBatches(db) {
  try {
    const result = await db.collection('inventory_batches').where({ expiryDate: db.command.lt(new Date()) }).get();
    return { code: 0, data: result.data };
  } catch (error) { return { code: 500, msg: error.message }; }
}

// 库存盘点
async function getInventoryChecks(db, data) {
  try {
    const result = await db.collection('inventory_checks').orderBy('createTime', 'desc').limit(50).get();
    return { code: 0, data: result.data };
  } catch (error) { return { code: 500, msg: error.message }; }
}

async function getInventoryCheckDetail(db, data) {
  try {
    const { id } = data || {};
    const result = await db.collection('inventory_checks').doc(id).get();
    return { code: 0, data: result.data };
  } catch (error) { return { code: 500, msg: error.message }; }
}

async function createInventoryCheck(db, logOperation, data, wxContext) {
  try {
    const result = await db.collection('inventory_checks').add({ data: { ...data, status: 'pending', createTime: db.serverDate() } });
    return { code: 0, data: { id: result.id }, msg: '盘点单创建成功' };
  } catch (error) { return { code: 500, msg: error.message }; }
}

async function updateInventoryCheckItem(db, data) {
  try {
    const { id, itemId, actualQty } = data || {};
    await db.collection('inventory_check_items').doc(itemId).update({ data: { actualQty } });
    return { code: 0, msg: '盘点明细已更新' };
  } catch (error) { return { code: 500, msg: error.message }; }
}

async function completeInventoryCheck(db, logOperation, data, wxContext) {
  try {
    const { id } = data || {};
    await db.collection('inventory_checks').doc(id).update({ data: { status: 'completed', completeTime: db.serverDate() } });
    return { code: 0, msg: '盘点已完成' };
  } catch (error) { return { code: 500, msg: error.message }; }
}

async function cancelInventoryCheck(db, logOperation, data, wxContext) {
  try {
    const { id } = data || {};
    await db.collection('inventory_checks').doc(id).update({ data: { status: 'cancelled' } });
    return { code: 0, msg: '盘点已取消' };
  } catch (error) { return { code: 500, msg: error.message }; }
}

module.exports = {
  getPurchaseOrders, getPurchaseOrderDetail, createPurchaseOrder, updatePurchaseOrder, submitPurchaseOrder, receivePurchaseOrder, cancelPurchaseOrder,
  getInventoryOverview, getInventoryBatches, getInventoryTransactions, adjustInventory, getExpiringBatches, getExpiredBatches,
  getInventoryChecks, getInventoryCheckDetail, createInventoryCheck, updateInventoryCheckItem, completeInventoryCheck, cancelInventoryCheck
};
