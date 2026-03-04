/**
 * 库存管理模块
 */
const { calcPagination } = require('./common/pagination');

async function adjustProductStock(db, logOperation, data, wxContext) {
  try {
    const adminInfo = wxContext.ADMIN_INFO || { id: 'system' };
    const { productId, delta, reason } = data || {};
    if (!productId) return { code: -2, msg: '缺少商品ID' };
    if (typeof delta !== 'number' || delta === 0) return { code: -2, msg: '调整量必须为非零数字' };

    const product = await db.collection('products').doc(productId).get();
    if (!product.data) return { code: 404, msg: '商品不存在' };

    const newStock = (product.data.stock || 0) + delta;
    if (newStock < 0) return { code: 400, msg: '库存不足' };

    await db.collection('products').doc(productId).update({ data: { stock: newStock, updateTime: db.serverDate() } });
    await logOperation(adminInfo.id, 'adjustProductStock', { productId, delta, newStock, reason });

    return { code: 0, data: { newStock }, msg: '库存调整成功' };
  } catch (error) {
    console.error('Adjust stock error:', error);
    return { code: 500, msg: error.message };
  }
}

async function getInventoryAlerts(db, data) {
  try {
    const { threshold = 10 } = data || {};
    const result = await db.collection('products').where({ stock: db.command.lte(threshold) }).get();
    return { code: 0, data: result.data };
  } catch (error) {
    console.error('Get inventory alerts error:', error);
    return { code: 500, msg: error.message };
  }
}

module.exports = { adjustProductStock, getInventoryAlerts };
