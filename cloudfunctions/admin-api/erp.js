/**
 * ERP 模块 - 供应商、采购、库存管理
 */
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

// ============================================================================
// 工具函数
// ============================================================================

/**
 * 生成单据编号
 * @param {string} prefix - 前缀 (PO=采购单, IT=库存流水, IC=盘点单)
 * @returns {string}
 */
function generateNo(prefix) {
  const now = new Date()
  const timestamp = now.getFullYear().toString() +
    (now.getMonth() + 1).toString().padStart(2, '0') +
    now.getDate().toString().padStart(2, '0') +
    now.getHours().toString().padStart(2, '0') +
    now.getMinutes().toString().padStart(2, '0') +
    now.getSeconds().toString().padStart(2, '0')
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
  return `${prefix}${timestamp}${random}`
}

/**
 * 计算批次状态
 * @param {Date|string} expiryDate - 过期日期
 * @returns {string} normal | expiring_soon | expired
 */
function calculateBatchStatus(expiryDate) {
  if (!expiryDate) return 'normal'

  const now = new Date()
  const expiry = new Date(expiryDate)
  const diffDays = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24))

  if (diffDays <= 0) return 'expired'
  if (diffDays <= 30) return 'expiring_soon'
  return 'normal'
}

// ============================================================================
// 供应商管理
// ============================================================================

/**
 * 获取供应商列表
 */
async function getSuppliers(data) {
  const { keyword, status, page = 1, limit = 20 } = data || {}

  const query = {}
  if (status) query.status = status
  if (keyword) {
    query.name = db.RegExp({
      regexp: keyword,
      options: 'i'
    })
  }

  const skip = (page - 1) * limit

  const result = await db.collection('suppliers')
    .where(query)
    .orderBy('createTime', 'desc')
    .skip(skip)
    .limit(limit)
    .get()

  // 获取总数
  const countResult = await db.collection('suppliers').where(query).count()

  return {
    code: 0,
    data: {
      list: result.data,
      total: countResult.total,
      page,
      limit,
      hasMore: skip + result.data.length < countResult.total
    }
  }
}

/**
 * 获取供应商详情
 */
async function getSupplierDetail(data) {
  const { supplierId } = data || {}

  if (!supplierId) {
    return { code: -1, msg: '缺少供应商ID' }
  }

  const result = await db.collection('suppliers').doc(supplierId).get()

  if (!result.data) {
    return { code: -2, msg: '供应商不存在' }
  }

  return {
    code: 0,
    data: result.data
  }
}

/**
 * 创建供应商
 */
async function createSupplier(data, wxContext) {
  const { name, contactPerson, phone, address, bankName, bankAccount, remark } = data || {}

  if (!name) {
    return { code: -1, msg: '供应商名称不能为空' }
  }

  // 检查名称是否重复
  const existResult = await db.collection('suppliers')
    .where({ name })
    .limit(1)
    .get()

  if (existResult.data.length > 0) {
    return { code: -2, msg: '供应商名称已存在' }
  }

  const now = new Date()
  const supplierData = {
    name,
    contactPerson: contactPerson || '',
    phone: phone || '',
    address: address || '',
    bankName: bankName || '',
    bankAccount: bankAccount || '',
    remark: remark || '',
    status: 'active',
    createTime: now,
    updateTime: now
  }

  const result = await db.collection('suppliers').add({ data: supplierData })

  return {
    code: 0,
    data: { _id: result._id, ...supplierData },
    msg: '创建成功'
  }
}

/**
 * 更新供应商
 */
async function updateSupplier(data, wxContext) {
  const { supplierId, name, contactPerson, phone, address, bankName, bankAccount, remark, status } = data || {}

  if (!supplierId) {
    return { code: -1, msg: '缺少供应商ID' }
  }

  const updateData = { updateTime: new Date() }
  if (name !== undefined) updateData.name = name
  if (contactPerson !== undefined) updateData.contactPerson = contactPerson
  if (phone !== undefined) updateData.phone = phone
  if (address !== undefined) updateData.address = address
  if (bankName !== undefined) updateData.bankName = bankName
  if (bankAccount !== undefined) updateData.bankAccount = bankAccount
  if (remark !== undefined) updateData.remark = remark
  if (status !== undefined) updateData.status = status

  await db.collection('suppliers').doc(supplierId).update({ data: updateData })

  return {
    code: 0,
    msg: '更新成功'
  }
}

/**
 * 删除供应商
 */
async function deleteSupplier(data, wxContext) {
  const { supplierId } = data || {}

  if (!supplierId) {
    return { code: -1, msg: '缺少供应商ID' }
  }

  // 检查是否有关联的采购单
  const purchaseResult = await db.collection('purchase_orders')
    .where({ supplierId })
    .limit(1)
    .get()

  if (purchaseResult.data.length > 0) {
    return { code: -2, msg: '该供应商有关联的采购单，无法删除' }
  }

  await db.collection('suppliers').doc(supplierId).remove()

  return {
    code: 0,
    msg: '删除成功'
  }
}

// ============================================================================
// 采购管理
// ============================================================================

/**
 * 获取采购单列表
 */
async function getPurchaseOrders(data) {
  const { keyword, status, supplierId, page = 1, limit = 20 } = data || {}

  const query = {}
  if (status) query.status = status
  if (supplierId) query.supplierId = supplierId
  if (keyword) {
    query.purchaseNo = db.RegExp({
      regexp: keyword,
      options: 'i'
    })
  }

  const skip = (page - 1) * limit

  const result = await db.collection('purchase_orders')
    .where(query)
    .orderBy('createTime', 'desc')
    .skip(skip)
    .limit(limit)
    .get()

  const countResult = await db.collection('purchase_orders').where(query).count()

  return {
    code: 0,
    data: {
      list: result.data,
      total: countResult.total,
      page,
      limit,
      hasMore: skip + result.data.length < countResult.total
    }
  }
}

/**
 * 获取采购单详情
 */
async function getPurchaseOrderDetail(data) {
  const { purchaseOrderId } = data || {}

  if (!purchaseOrderId) {
    return { code: -1, msg: '缺少采购单ID' }
  }

  const result = await db.collection('purchase_orders').doc(purchaseOrderId).get()

  if (!result.data) {
    return { code: -2, msg: '采购单不存在' }
  }

  return {
    code: 0,
    data: result.data
  }
}

/**
 * 创建采购单
 */
async function createPurchaseOrder(data, wxContext) {
  const { supplierId, items, expectedDate, remark } = data || {}

  if (!supplierId) {
    return { code: -1, msg: '请选择供应商' }
  }

  if (!items || items.length === 0) {
    return { code: -2, msg: '请添加采购商品' }
  }

  // 获取供应商信息
  const supplierResult = await db.collection('suppliers').doc(supplierId).get()
  if (!supplierResult.data) {
    return { code: -3, msg: '供应商不存在' }
  }

  const supplier = supplierResult.data

  // 计算总金额
  let totalAmount = 0
  const processedItems = items.map(item => {
    const totalCost = (item.unitCost || 0) * (item.quantity || 0)
    totalAmount += totalCost
    return {
      productId: item.productId,
      productName: item.productName,
      sku: item.sku || '',
      quantity: item.quantity,
      receivedQuantity: 0,
      unitCost: item.unitCost || 0,
      totalCost,
      remark: item.remark || ''
    }
  })

  const now = new Date()
  const purchaseData = {
    purchaseNo: generateNo('PO'),
    supplierId,
    supplierName: supplier.name,
    status: 'draft',
    items: processedItems,
    totalAmount,
    paidAmount: 0,
    expectedDate: expectedDate || null,
    receivedDate: null,
    operatorId: wxContext.ADMIN_INFO?.id || '',
    operatorName: wxContext.ADMIN_INFO?.username || '',
    remark: remark || '',
    createTime: now,
    updateTime: now
  }

  const result = await db.collection('purchase_orders').add({ data: purchaseData })

  return {
    code: 0,
    data: { _id: result._id, ...purchaseData },
    msg: '创建成功'
  }
}

/**
 * 更新采购单
 */
async function updatePurchaseOrder(data, wxContext) {
  const { purchaseOrderId, items, expectedDate, remark } = data || {}

  if (!purchaseOrderId) {
    return { code: -1, msg: '缺少采购单ID' }
  }

  // 检查采购单状态
  const purchaseResult = await db.collection('purchase_orders').doc(purchaseOrderId).get()
  if (!purchaseResult.data) {
    return { code: -2, msg: '采购单不存在' }
  }

  if (purchaseResult.data.status !== 'draft') {
    return { code: -3, msg: '只有草稿状态的采购单可以编辑' }
  }

  const updateData = { updateTime: new Date() }

  if (items && items.length > 0) {
    let totalAmount = 0
    const processedItems = items.map(item => {
      const totalCost = (item.unitCost || 0) * (item.quantity || 0)
      totalAmount += totalCost
      return {
        productId: item.productId,
        productName: item.productName,
        sku: item.sku || '',
        quantity: item.quantity,
        receivedQuantity: item.receivedQuantity || 0,
        unitCost: item.unitCost || 0,
        totalCost,
        remark: item.remark || ''
      }
    })
    updateData.items = processedItems
    updateData.totalAmount = totalAmount
  }

  if (expectedDate !== undefined) updateData.expectedDate = expectedDate
  if (remark !== undefined) updateData.remark = remark

  await db.collection('purchase_orders').doc(purchaseOrderId).update({ data: updateData })

  return {
    code: 0,
    msg: '更新成功'
  }
}

/**
 * 提交采购单（草稿→待收货）
 */
async function submitPurchaseOrder(data, wxContext) {
  const { purchaseOrderId } = data || {}

  if (!purchaseOrderId) {
    return { code: -1, msg: '缺少采购单ID' }
  }

  const purchaseResult = await db.collection('purchase_orders').doc(purchaseOrderId).get()
  if (!purchaseResult.data) {
    return { code: -2, msg: '采购单不存在' }
  }

  if (purchaseResult.data.status !== 'draft') {
    return { code: -3, msg: '只有草稿状态的采购单可以提交' }
  }

  await db.collection('purchase_orders').doc(purchaseOrderId).update({
    data: {
      status: 'pending',
      updateTime: new Date()
    }
  })

  return {
    code: 0,
    msg: '提交成功'
  }
}

/**
 * 采购入库
 */
async function receivePurchaseOrder(data, wxContext) {
  const { purchaseOrderId, receiveItems } = data || {}

  if (!purchaseOrderId) {
    return { code: -1, msg: '缺少采购单ID' }
  }

  if (!receiveItems || receiveItems.length === 0) {
    return { code: -2, msg: '请填写收货数量' }
  }

  const purchaseResult = await db.collection('purchase_orders').doc(purchaseOrderId).get()
  if (!purchaseResult.data) {
    return { code: -3, msg: '采购单不存在' }
  }

  const purchase = purchaseResult.data

  if (purchase.status !== 'pending' && purchase.status !== 'partial') {
    return { code: -4, msg: '该采购单状态不允许收货' }
  }

  const now = new Date()
  const adminInfo = wxContext.ADMIN_INFO || {}

  // 处理每个收货项
  for (const receiveItem of receiveItems) {
    const { productId, quantity, productionDate, expiryDate, location } = receiveItem

    if (!quantity || quantity <= 0) continue

    // 找到对应的采购项
    const purchaseItem = purchase.items.find(item => item.productId === productId)
    if (!purchaseItem) continue

    // 1. 创建批次记录
    const batchNo = generateNo('B')
    const batchData = {
      productId,
      productName: purchaseItem.productName,
      sku: purchaseItem.sku,
      batchNo,
      purchaseOrderId,
      quantity,
      remainingQuantity: quantity,
      unitCost: purchaseItem.unitCost,
      productionDate: productionDate || null,
      expiryDate: expiryDate || null,
      status: calculateBatchStatus(expiryDate),
      location: location || '',
      remark: '',
      createTime: now,
      updateTime: now
    }

    const batchResult = await db.collection('inventory_batches').add({ data: batchData })

    // 2. 获取当前库存
    const productResult = await db.collection('products').doc(productId).get()
    const currentStock = productResult.data?.stock || 0
    const newStock = currentStock + quantity

    // 3. 创建库存流水
    const transactionData = {
      transactionNo: generateNo('IT'),
      productId,
      productName: purchaseItem.productName,
      sku: purchaseItem.sku,
      type: 'purchase_in',
      quantity,
      beforeStock: currentStock,
      afterStock: newStock,
      batchId: batchResult._id,
      batchNo,
      unitCost: purchaseItem.unitCost,
      totalCost: purchaseItem.unitCost * quantity,
      relatedId: purchaseOrderId,
      relatedNo: purchase.purchaseNo,
      operatorId: adminInfo.id || '',
      operatorName: adminInfo.username || '',
      remark: '采购入库',
      createTime: now
    }

    await db.collection('inventory_transactions').add({ data: transactionData })

    // 4. 更新商品库存
    await db.collection('products').doc(productId).update({
      data: {
        stock: _.increment(quantity),
        lastPurchaseCost: purchaseItem.unitCost,
        updateTime: now
      }
    })

    // 5. 更新采购项的已收货数量
    const itemIndex = purchase.items.findIndex(item => item.productId === productId)
    if (itemIndex >= 0) {
      purchase.items[itemIndex].receivedQuantity += quantity
    }
  }

  // 6. 判断是否全部收货，更新采购单状态
  const allReceived = purchase.items.every(item => item.receivedQuantity >= item.quantity)
  const anyReceived = purchase.items.some(item => item.receivedQuantity > 0)

  let newStatus = purchase.status
  if (allReceived) {
    newStatus = 'completed'
  } else if (anyReceived) {
    newStatus = 'partial'
  }

  await db.collection('purchase_orders').doc(purchaseOrderId).update({
    data: {
      items: purchase.items,
      status: newStatus,
      receivedDate: now,
      updateTime: now
    }
  })

  return {
    code: 0,
    msg: '入库成功',
    data: { newStatus }
  }
}

/**
 * 取消采购单
 */
async function cancelPurchaseOrder(data, wxContext) {
  const { purchaseOrderId, reason } = data || {}

  if (!purchaseOrderId) {
    return { code: -1, msg: '缺少采购单ID' }
  }

  const purchaseResult = await db.collection('purchase_orders').doc(purchaseOrderId).get()
  if (!purchaseResult.data) {
    return { code: -2, msg: '采购单不存在' }
  }

  if (purchaseResult.data.status === 'completed') {
    return { code: -3, msg: '已完成的采购单不能取消' }
  }

  if (purchaseResult.data.status === 'cancelled') {
    return { code: -4, msg: '采购单已取消' }
  }

  await db.collection('purchase_orders').doc(purchaseOrderId).update({
    data: {
      status: 'cancelled',
      remark: (purchaseResult.data.remark || '') + (reason ? ` [取消原因: ${reason}]` : ''),
      updateTime: new Date()
    }
  })

  return {
    code: 0,
    msg: '取消成功'
  }
}

// ============================================================================
// 库存管理
// ============================================================================

/**
 * 获取库存总览
 */
async function getInventoryOverview(data, wxContext) {
  const now = new Date()

  // 获取商品总数和库存总量
  const productsResult = await db.collection('products')
    .where({ status: 'on_sale' })
    .get()

  const totalProducts = productsResult.data.length
  const totalStock = productsResult.data.reduce((sum, p) => sum + (p.stock || 0), 0)

  // 获取低库存商品数量
  const lowStockResult = await db.collection('products')
    .where({
      status: 'on_sale',
      stock: _.lte(10)
    })
    .count()

  // 获取临期批次数量
  const expiringResult = await db.collection('inventory_batches')
    .where({
      status: 'expiring_soon',
      remainingQuantity: _.gt(0)
    })
    .count()

  // 获取过期批次数量
  const expiredResult = await db.collection('inventory_batches')
    .where({
      status: 'expired',
      remainingQuantity: _.gt(0)
    })
    .count()

  // 获取待收货采购单数量
  const pendingPurchaseResult = await db.collection('purchase_orders')
    .where({
      status: _.in(['pending', 'partial'])
    })
    .count()

  return {
    code: 0,
    data: {
      totalProducts,
      totalStock,
      lowStockCount: lowStockResult.total,
      expiringCount: expiringResult.total,
      expiredCount: expiredResult.total,
      pendingPurchaseCount: pendingPurchaseResult.total
    }
  }
}

/**
 * 获取批次列表
 */
async function getInventoryBatches(data, wxContext) {
  const { productId, status, keyword, page = 1, limit = 20 } = data || {}

  const query = {
    remainingQuantity: _.gt(0)  // 只显示有剩余的批次
  }

  if (productId) query.productId = productId
  if (status) query.status = status
  if (keyword) {
    query.batchNo = db.RegExp({
      regexp: keyword,
      options: 'i'
    })
  }

  const skip = (page - 1) * limit

  const result = await db.collection('inventory_batches')
    .where(query)
    .orderBy('expiryDate', 'asc')  // 按过期日期升序，临期的排前面
    .skip(skip)
    .limit(limit)
    .get()

  const countResult = await db.collection('inventory_batches').where(query).count()

  return {
    code: 0,
    data: {
      list: result.data,
      total: countResult.total,
      page,
      limit,
      hasMore: skip + result.data.length < countResult.total
    }
  }
}

/**
 * 获取库存流水
 */
async function getInventoryTransactions(data, wxContext) {
  const { productId, type, startDate, endDate, page = 1, limit = 20 } = data || {}

  const query = {}

  if (productId) query.productId = productId
  if (type) query.type = type
  if (startDate || endDate) {
    query.createTime = {}
    if (startDate) query.createTime._gte = new Date(startDate)
    if (endDate) query.createTime._lte = new Date(endDate)
  }

  const skip = (page - 1) * limit

  const result = await db.collection('inventory_transactions')
    .where(query)
    .orderBy('createTime', 'desc')
    .skip(skip)
    .limit(limit)
    .get()

  const countResult = await db.collection('inventory_transactions').where(query).count()

  return {
    code: 0,
    data: {
      list: result.data,
      total: countResult.total,
      page,
      limit,
      hasMore: skip + result.data.length < countResult.total
    }
  }
}

/**
 * 库存调整
 */
async function adjustInventory(data, wxContext) {
  const { productId, quantity, reason, batchId } = data || {}

  if (!productId) {
    return { code: -1, msg: '缺少商品ID' }
  }

  if (!quantity || quantity === 0) {
    return { code: -2, msg: '调整数量不能为0' }
  }

  const productResult = await db.collection('products').doc(productId).get()
  if (!productResult.data) {
    return { code: -3, msg: '商品不存在' }
  }

  const product = productResult.data
  const currentStock = product.stock || 0
  const newStock = currentStock + quantity

  if (newStock < 0) {
    return { code: -4, msg: '调整后库存不能为负数' }
  }

  const now = new Date()
  const adminInfo = wxContext.ADMIN_INFO || {}

  // 确定流水类型
  const transactionType = quantity > 0 ? 'adjustment' : 'adjustment'

  // 创建库存流水
  const transactionData = {
    transactionNo: generateNo('IT'),
    productId,
    productName: product.name,
    sku: product.sku || '',
    type: transactionType,
    quantity: Math.abs(quantity),
    beforeStock: currentStock,
    afterStock: newStock,
    batchId: batchId || '',
    batchNo: '',
    unitCost: product.costPrice || 0,
    totalCost: (product.costPrice || 0) * Math.abs(quantity),
    relatedId: '',
    relatedNo: '',
    operatorId: adminInfo.id || '',
    operatorName: adminInfo.username || '',
    remark: reason || (quantity > 0 ? '库存调整(增加)' : '库存调整(减少)'),
    createTime: now
  }

  await db.collection('inventory_transactions').add({ data: transactionData })

  // 更新商品库存
  await db.collection('products').doc(productId).update({
    data: {
      stock: newStock,
      updateTime: now
    }
  })

  // 如果指定了批次，更新批次剩余数量
  if (batchId && quantity < 0) {
    await db.collection('inventory_batches').doc(batchId).update({
      data: {
        remainingQuantity: _.increment(quantity),
        updateTime: now
      }
    })
  }

  return {
    code: 0,
    msg: '调整成功',
    data: {
      beforeStock: currentStock,
      afterStock: newStock,
      change: quantity
    }
  }
}

/**
 * 获取临期批次
 */
async function getExpiringBatches(data, wxContext) {
  const { days = 30, page = 1, limit = 20 } = data || {}

  const now = new Date()
  const targetDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000)

  const skip = (page - 1) * limit

  const result = await db.collection('inventory_batches')
    .where({
      remainingQuantity: _.gt(0),
      expiryDate: _.neq(null),
      status: _.in(['normal', 'expiring_soon'])
    })
    .where({
      expiryDate: _.lte(targetDate)
    })
    .orderBy('expiryDate', 'asc')
    .skip(skip)
    .limit(limit)
    .get()

  // 更新临期状态
  for (const batch of result.data) {
    if (batch.status !== calculateBatchStatus(batch.expiryDate)) {
      await db.collection('inventory_batches').doc(batch._id).update({
        data: {
          status: calculateBatchStatus(batch.expiryDate),
          updateTime: now
        }
      })
      batch.status = calculateBatchStatus(batch.expiryDate)
    }
  }

  return {
    code: 0,
    data: {
      list: result.data,
      page,
      limit
    }
  }
}

/**
 * 获取过期批次
 */
async function getExpiredBatches(data, wxContext) {
  const { page = 1, limit = 20 } = data || {}

  const skip = (page - 1) * limit

  const result = await db.collection('inventory_batches')
    .where({
      remainingQuantity: _.gt(0),
      status: 'expired'
    })
    .orderBy('expiryDate', 'asc')
    .skip(skip)
    .limit(limit)
    .get()

  return {
    code: 0,
    data: {
      list: result.data,
      page,
      limit
    }
  }
}

// ============================================================================
// 盘点管理
// ============================================================================

/**
 * 获取盘点单列表
 */
async function getInventoryChecks(data, wxContext) {
  const { status, page = 1, limit = 20 } = data || {}

  const query = {}
  if (status) query.status = status

  const skip = (page - 1) * limit

  const result = await db.collection('inventory_checks')
    .where(query)
    .orderBy('createTime', 'desc')
    .skip(skip)
    .limit(limit)
    .get()

  const countResult = await db.collection('inventory_checks').where(query).count()

  return {
    code: 0,
    data: {
      list: result.data,
      total: countResult.total,
      page,
      limit,
      hasMore: skip + result.data.length < countResult.total
    }
  }
}

/**
 * 获取盘点单详情
 */
async function getInventoryCheckDetail(data, wxContext) {
  const { checkId } = data || {}

  if (!checkId) {
    return { code: -1, msg: '缺少盘点单ID' }
  }

  const result = await db.collection('inventory_checks').doc(checkId).get()

  if (!result.data) {
    return { code: -2, msg: '盘点单不存在' }
  }

  return {
    code: 0,
    data: result.data
  }
}

/**
 * 创建盘点单
 */
async function createInventoryCheck(data, wxContext) {
  const { productIds, remark } = data || {}

  const now = new Date()
  const adminInfo = wxContext.ADMIN_INFO || {}

  let products = []

  if (productIds && productIds.length > 0) {
    // 指定商品盘点
    const result = await db.collection('products')
      .where({
        _id: _.in(productIds)
      })
      .get()
    products = result.data
  } else {
    // 全部商品盘点
    const result = await db.collection('products')
      .where({ status: 'on_sale' })
      .limit(1000)
      .get()
    products = result.data
  }

  const items = products.map(p => ({
    productId: p._id,
    productName: p.name,
    sku: p.sku || '',
    systemStock: p.stock || 0,
    actualStock: 0,
    difference: 0,
    checked: false,
    remark: ''
  }))

  const checkData = {
    checkNo: generateNo('IC'),
    status: 'draft',
    items,
    totalGain: 0,
    totalLoss: 0,
    operatorId: adminInfo.id || '',
    operatorName: adminInfo.username || '',
    remark: remark || '',
    createTime: now,
    updateTime: now
  }

  const result = await db.collection('inventory_checks').add({ data: checkData })

  return {
    code: 0,
    data: { _id: result._id, ...checkData },
    msg: '创建成功'
  }
}

/**
 * 更新盘点项
 */
async function updateInventoryCheckItem(data, wxContext) {
  const { checkId, productId, actualStock, remark } = data || {}

  if (!checkId || !productId) {
    return { code: -1, msg: '参数不完整' }
  }

  const checkResult = await db.collection('inventory_checks').doc(checkId).get()
  if (!checkResult.data) {
    return { code: -2, msg: '盘点单不存在' }
  }

  if (checkResult.data.status === 'completed') {
    return { code: -3, msg: '已完成的盘点单不能修改' }
  }

  const items = checkResult.data.items
  const itemIndex = items.findIndex(item => item.productId === productId)

  if (itemIndex < 0) {
    return { code: -4, msg: '盘点项不存在' }
  }

  // 更新盘点项
  items[itemIndex].actualStock = actualStock
  items[itemIndex].difference = actualStock - items[itemIndex].systemStock
  items[itemIndex].checked = true
  if (remark !== undefined) items[itemIndex].remark = remark

  // 计算总盘盈盘亏
  let totalGain = 0
  let totalLoss = 0
  items.forEach(item => {
    if (item.difference > 0) totalGain += item.difference
    if (item.difference < 0) totalLoss += Math.abs(item.difference)
  })

  await db.collection('inventory_checks').doc(checkId).update({
    data: {
      items,
      totalGain,
      totalLoss,
      status: 'checking',
      updateTime: new Date()
    }
  })

  return {
    code: 0,
    msg: '更新成功'
  }
}

/**
 * 完成盘点
 */
async function completeInventoryCheck(data, wxContext) {
  const { checkId } = data || {}

  if (!checkId) {
    return { code: -1, msg: '缺少盘点单ID' }
  }

  const checkResult = await db.collection('inventory_checks').doc(checkId).get()
  if (!checkResult.data) {
    return { code: -2, msg: '盘点单不存在' }
  }

  if (checkResult.data.status === 'completed') {
    return { code: -3, msg: '盘点单已完成' }
  }

  const check = checkResult.data
  const now = new Date()
  const adminInfo = wxContext.ADMIN_INFO || {}

  // 处理每个盘点项，调整库存
  for (const item of check.items) {
    if (!item.checked || item.difference === 0) continue

    const productResult = await db.collection('products').doc(item.productId).get()
    const currentStock = productResult.data?.stock || 0

    // 创建库存流水
    const transactionData = {
      transactionNo: generateNo('IT'),
      productId: item.productId,
      productName: item.productName,
      sku: item.sku,
      type: item.difference > 0 ? 'inventory_gain' : 'inventory_loss',
      quantity: Math.abs(item.difference),
      beforeStock: currentStock,
      afterStock: currentStock + item.difference,
      batchId: '',
      batchNo: '',
      unitCost: 0,
      totalCost: 0,
      relatedId: checkId,
      relatedNo: check.checkNo,
      operatorId: adminInfo.id || '',
      operatorName: adminInfo.username || '',
      remark: `盘点${item.difference > 0 ? '盈' : '亏'}: ${item.remark || ''}`,
      createTime: now
    }

    await db.collection('inventory_transactions').add({ data: transactionData })

    // 更新商品库存
    await db.collection('products').doc(item.productId).update({
      data: {
        stock: _.increment(item.difference),
        updateTime: now
      }
    })
  }

  // 更新盘点单状态
  await db.collection('inventory_checks').doc(checkId).update({
    data: {
      status: 'completed',
      completeTime: now,
      updateTime: now
    }
  })

  return {
    code: 0,
    msg: '盘点完成'
  }
}

/**
 * 取消盘点单
 */
async function cancelInventoryCheck(data, wxContext) {
  const { checkId } = data || {}

  if (!checkId) {
    return { code: -1, msg: '缺少盘点单ID' }
  }

  const checkResult = await db.collection('inventory_checks').doc(checkId).get()
  if (!checkResult.data) {
    return { code: -2, msg: '盘点单不存在' }
  }

  if (checkResult.data.status === 'completed') {
    return { code: -3, msg: '已完成的盘点单不能取消' }
  }

  await db.collection('inventory_checks').doc(checkId).update({
    data: {
      status: 'cancelled',
      updateTime: new Date()
    }
  })

  return {
    code: 0,
    msg: '取消成功'
  }
}

// ============================================================================
// 导出
// ============================================================================

module.exports = {
  // 供应商管理
  getSuppliers,
  getSupplierDetail,
  createSupplier,
  updateSupplier,
  deleteSupplier,

  // 采购管理
  getPurchaseOrders,
  getPurchaseOrderDetail,
  createPurchaseOrder,
  updatePurchaseOrder,
  submitPurchaseOrder,
  receivePurchaseOrder,
  cancelPurchaseOrder,

  // 库存管理
  getInventoryOverview,
  getInventoryBatches,
  getInventoryTransactions,
  adjustInventory,
  getExpiringBatches,
  getExpiredBatches,

  // 盘点管理
  getInventoryChecks,
  getInventoryCheckDetail,
  createInventoryCheck,
  updateInventoryCheckItem,
  completeInventoryCheck,
  cancelInventoryCheck,

  // 工具函数
  generateNo,
  calculateBatchStatus
}
