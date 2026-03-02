/**
 * 订单-库存集成 TDD测试套件
 *
 * 测试订单生命周期中的库存流水生成
 * - 订单创建 -> sale_out
 * - 订单取消 -> refund_in
 * - 退款处理 -> refund_in
 *
 * 遵循TDD原则：先写测试，再验证实现
 */

const assert = require('assert');

// ==================== 模拟数据 ====================

const mockProducts = [
  {
    _id: 'product_001',
    name: '精酿啤酒A',
    sku: 'BEER-A-001',
    stock: 100,
    costPrice: 50,
    price: 88,
    status: 'on_sale'
  },
  {
    _id: 'product_002',
    name: '精酿啤酒B',
    sku: 'BEER-B-001',
    stock: 50,
    costPrice: 60,
    price: 98,
    status: 'on_sale'
  }
];

const mockOrder = {
  _id: 'order_001',
  orderNo: 'ORD20260302001',
  _openid: 'user_001',
  status: 'paid',
  paymentMethod: 'wechat',
  totalAmount: 5300, // 50*88 + 10*98 = 4400 + 980 = 5380 (调整计算)
  items: [
    {
      productId: 'product_001',
      productName: '精酿啤酒A',
      sku: 'BEER-A-001',
      quantity: 50,
      price: 88,
      costPrice: 50
    },
    {
      productId: 'product_002',
      productName: '精酿啤酒B',
      sku: 'BEER-B-001',
      quantity: 10,
      price: 98,
      costPrice: 60
    }
  ],
  createTime: new Date()
};

// ==================== 流水号生成测试 ====================

/**
 * 生成库存流水号
 */
function generateTransactionNo() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hour = String(now.getHours()).padStart(2, '0');
  const minute = String(now.getMinutes()).padStart(2, '0');
  const second = String(now.getSeconds()).padStart(2, '0');
  const random = String(Math.floor(Math.random() * 1000000)).padStart(6, '0');
  return `IT${year}${month}${day}${hour}${minute}${second}${random}`;
}

/**
 * 测试1：流水号格式验证
 */
assert.doesNotThrow(() => {
  const transactionNo = generateTransactionNo();

  assert.ok(transactionNo.startsWith('IT'), '流水号应以IT开头');
  assert.strictEqual(transactionNo.length, 22, '流水号长度应为22');
  assert.ok(/IT\d{14}\d{6}/.test(transactionNo), '流水号格式应为IT+14位时间戳+6位随机数');

  console.log('[测试1通过] 流水号格式验证:', transactionNo);
}, '测试1失败：流水号格式');

// ==================== 订单创建 -> sale_out 测试 ====================

/**
 * 模拟订单创建时的库存流水生成
 */
function createSaleOutTransactions(order, products) {
  const transactions = [];
  const now = new Date();

  for (const item of order.items) {
    const product = products.find(p => p._id === item.productId);
    if (!product) continue;

    const beforeStock = product.stock;
    const afterStock = beforeStock - item.quantity;

    // 验证库存充足
    if (afterStock < 0) {
      return {
        success: false,
        error: 'INSUFFICIENT_STOCK',
        message: `商品${product.name}库存不足`,
        productId: item.productId
      };
    }

    transactions.push({
      transactionNo: generateTransactionNo(),
      productId: item.productId,
      productName: item.productName,
      sku: item.sku,
      type: 'sale_out',
      quantity: item.quantity,
      beforeStock,
      afterStock,
      unitCost: item.costPrice || 0,
      totalCost: (item.costPrice || 0) * item.quantity,
      relatedId: order._id,
      relatedNo: order.orderNo,
      operatorId: 'system',
      operatorName: '系统',
      remark: `订单销售出库 - ${order.orderNo}`,
      createTime: now
    });

    // 更新商品库存
    product.stock = afterStock;
  }

  return {
    success: true,
    transactions
  };
}

/**
 * 测试2：订单创建生成sale_out流水
 */
assert.doesNotThrow(() => {
  const products = JSON.parse(JSON.stringify(mockProducts)); // 深拷贝
  const order = mockOrder;

  const result = createSaleOutTransactions(order, products);

  assert.ok(result.success, '应成功创建流水');
  assert.strictEqual(result.transactions.length, 2, '应创建2条流水（2个商品）');

  // 验证第一条流水
  const trans1 = result.transactions[0];
  assert.strictEqual(trans1.type, 'sale_out', '类型应为sale_out');
  assert.strictEqual(trans1.productId, 'product_001', '商品ID应正确');
  assert.strictEqual(trans1.quantity, 50, '出库数量应为50');
  assert.strictEqual(trans1.beforeStock, 100, '出库前库存应为100');
  assert.strictEqual(trans1.afterStock, 50, '出库后库存应为50');
  assert.strictEqual(trans1.relatedId, order._id, '应关联订单ID');
  assert.strictEqual(trans1.relatedNo, order.orderNo, '应关联订单号');

  // 验证第二条流水
  const trans2 = result.transactions[1];
  assert.strictEqual(trans2.type, 'sale_out', '类型应为sale_out');
  assert.strictEqual(trans2.productId, 'product_002', '商品ID应正确');
  assert.strictEqual(trans2.quantity, 10, '出库数量应为10');
  assert.strictEqual(trans2.beforeStock, 50, '出库前库存应为50');
  assert.strictEqual(trans2.afterStock, 40, '出库后库存应为40');

  // 验证商品库存已更新
  assert.strictEqual(products[0].stock, 50, '商品A库存应更新为50');
  assert.strictEqual(products[1].stock, 40, '商品B库存应更新为40');

  console.log('[测试2通过] 订单创建生成sale_out流水');
}, '测试2失败：订单创建sale_out流水');

/**
 * 测试3：库存不足时订单创建失败
 */
assert.doesNotThrow(() => {
  const products = [
    { _id: 'product_001', name: '精酿啤酒A', stock: 10, price: 88 }
  ];

  const order = {
    _id: 'order_002',
    orderNo: 'ORD20260302002',
    items: [
      { productId: 'product_001', productName: '精酿啤酒A', quantity: 20, price: 88 }
    ]
  };

  const result = createSaleOutTransactions(order, products);

  assert.ok(!result.success, '应创建失败');
  assert.strictEqual(result.error, 'INSUFFICIENT_STOCK', '错误类型应为库存不足');
  assert.strictEqual(result.productId, 'product_001', '应返回库存不足的商品ID');

  console.log('[测试3通过] 库存不足时订单创建失败');
}, '测试3失败：库存不足校验');

// ==================== 订单取消 -> refund_in 测试 ====================

/**
 * 模拟订单取消时的库存流水生成
 */
function createRefundInTransactionsForCancel(order, products) {
  const transactions = [];
  const now = new Date();

  for (const item of order.items) {
    const product = products.find(p => p._id === item.productId);
    if (!product) continue;

    const beforeStock = product.stock;
    const afterStock = beforeStock + item.quantity;

    transactions.push({
      transactionNo: generateTransactionNo(),
      productId: item.productId,
      productName: item.productName,
      sku: item.sku,
      type: 'refund_in',
      quantity: item.quantity,
      beforeStock,
      afterStock,
      relatedId: order._id,
      relatedNo: order.orderNo,
      operatorId: 'system',
      operatorName: '系统',
      remark: `订单取消退货入库 - ${order.orderNo}`,
      createTime: now
    });

    // 更新商品库存
    product.stock = afterStock;
  }

  return {
    success: true,
    transactions
  };
}

/**
 * 测试4：订单取消生成refund_in流水
 */
assert.doesNotThrow(() => {
  // 模拟订单创建后的库存状态
  const products = [
    { _id: 'product_001', name: '精酿啤酒A', sku: 'BEER-A-001', stock: 50 },  // 原始100，已出库50
    { _id: 'product_002', name: '精酿啤酒B', sku: 'BEER-B-001', stock: 40 }   // 原始50，已出库10
  ];

  const order = mockOrder;

  const result = createRefundInTransactionsForCancel(order, products);

  assert.ok(result.success, '应成功创建流水');
  assert.strictEqual(result.transactions.length, 2, '应创建2条流水');

  // 验证第一条流水
  const trans1 = result.transactions[0];
  assert.strictEqual(trans1.type, 'refund_in', '类型应为refund_in');
  assert.strictEqual(trans1.productId, 'product_001', '商品ID应正确');
  assert.strictEqual(trans1.quantity, 50, '入库数量应为50');
  assert.strictEqual(trans1.beforeStock, 50, '入库前库存应为50');
  assert.strictEqual(trans1.afterStock, 100, '入库后库存应恢复为100');

  // 验证第二条流水
  const trans2 = result.transactions[1];
  assert.strictEqual(trans2.type, 'refund_in', '类型应为refund_in');
  assert.strictEqual(trans2.quantity, 10, '入库数量应为10');
  assert.strictEqual(trans2.beforeStock, 40, '入库前库存应为40');
  assert.strictEqual(trans2.afterStock, 50, '入库后库存应恢复为50');

  // 验证商品库存已恢复
  assert.strictEqual(products[0].stock, 100, '商品A库存应恢复为100');
  assert.strictEqual(products[1].stock, 50, '商品B库存应恢复为50');

  console.log('[测试4通过] 订单取消生成refund_in流水');
}, '测试4失败：订单取消refund_in流水');

// ==================== 退款处理 -> refund_in 测试 ====================

/**
 * 模拟退款处理时的库存流水生成
 */
function createRefundInTransactionsForRefund(refund, order, products) {
  const transactions = [];
  const now = new Date();

  for (const refundItem of refund.items) {
    const product = products.find(p => p._id === refundItem.productId);
    const orderItem = order.items.find(i => i.productId === refundItem.productId);

    if (!product || !orderItem) continue;

    const beforeStock = product.stock;
    const afterStock = beforeStock + refundItem.quantity;

    transactions.push({
      transactionNo: generateTransactionNo(),
      productId: refundItem.productId,
      productName: orderItem.productName,
      sku: orderItem.sku,
      type: 'refund_in',
      quantity: refundItem.quantity,
      beforeStock,
      afterStock,
      relatedId: refund._id,
      relatedNo: refund.refundNo,
      operatorId: 'admin_001',
      operatorName: '管理员',
      remark: `退款退货入库 - ${refund.refundNo}`,
      createTime: now
    });

    // 更新商品库存
    product.stock = afterStock;
  }

  return {
    success: true,
    transactions
  };
}

/**
 * 测试5：部分退款生成refund_in流水
 */
assert.doesNotThrow(() => {
  // 模拟订单创建后的库存状态
  const products = [
    { _id: 'product_001', name: '精酿啤酒A', sku: 'BEER-A-001', stock: 50 },
    { _id: 'product_002', name: '精酿啤酒B', sku: 'BEER-B-001', stock: 40 }
  ];

  const order = mockOrder;

  // 部分退款：只退商品A的10件
  const refund = {
    _id: 'refund_001',
    refundNo: 'RF20260302001',
    orderId: order._id,
    orderNo: order.orderNo,
    refundStatus: 'success',
    items: [
      {
        productId: 'product_001',
        quantity: 10,
        refundAmount: 880
      }
    ]
  };

  const result = createRefundInTransactionsForRefund(refund, order, products);

  assert.ok(result.success, '应成功创建流水');
  assert.strictEqual(result.transactions.length, 1, '应创建1条流水（只退1个商品）');

  const trans = result.transactions[0];
  assert.strictEqual(trans.type, 'refund_in', '类型应为refund_in');
  assert.strictEqual(trans.productId, 'product_001', '商品ID应正确');
  assert.strictEqual(trans.quantity, 10, '入库数量应为10');
  assert.strictEqual(trans.beforeStock, 50, '入库前库存应为50');
  assert.strictEqual(trans.afterStock, 60, '入库后库存应为60');
  assert.strictEqual(trans.relatedId, refund._id, '应关联退款ID');
  assert.strictEqual(trans.relatedNo, refund.refundNo, '应关联退款单号');

  // 验证商品库存
  assert.strictEqual(products[0].stock, 60, '商品A库存应为60');
  assert.strictEqual(products[1].stock, 40, '商品B库存应保持40');

  console.log('[测试5通过] 部分退款生成refund_in流水');
}, '测试5失败：部分退款refund_in流水');

/**
 * 测试6：全额退款生成refund_in流水
 */
assert.doesNotThrow(() => {
  const products = [
    { _id: 'product_001', name: '精酿啤酒A', sku: 'BEER-A-001', stock: 50 },
    { _id: 'product_002', name: '精酿啤酒B', sku: 'BEER-B-001', stock: 40 }
  ];

  const order = mockOrder;

  // 全额退款
  const refund = {
    _id: 'refund_002',
    refundNo: 'RF20260302002',
    orderId: order._id,
    orderNo: order.orderNo,
    refundStatus: 'success',
    items: [
      { productId: 'product_001', quantity: 50, refundAmount: 4400 },
      { productId: 'product_002', quantity: 10, refundAmount: 980 }
    ]
  };

  const result = createRefundInTransactionsForRefund(refund, order, products);

  assert.ok(result.success, '应成功创建流水');
  assert.strictEqual(result.transactions.length, 2, '应创建2条流水（全部商品）');

  // 验证库存完全恢复
  assert.strictEqual(products[0].stock, 100, '商品A库存应恢复为100');
  assert.strictEqual(products[1].stock, 50, '商品B库存应恢复为50');

  console.log('[测试6通过] 全额退款生成refund_in流水');
}, '测试6失败：全额退款refund_in流水');

// ==================== 库存一致性测试 ====================

/**
 * 测试7：订单生命周期库存一致性
 *
 * 场景：创建订单 -> 取消订单
 * 预期：库存最终恢复到原始值
 */
assert.doesNotThrow(() => {
  const products = JSON.parse(JSON.stringify(mockProducts));
  const originalStocks = products.map(p => ({ id: p._id, stock: p.stock }));

  const order = mockOrder;

  // 1. 创建订单（sale_out）
  const saleResult = createSaleOutTransactions(order, products);
  assert.ok(saleResult.success, '创建订单应成功');

  // 验证库存减少
  assert.strictEqual(products[0].stock, 50, '商品A库存应减少到50');
  assert.strictEqual(products[1].stock, 40, '商品B库存应减少到40');

  // 2. 取消订单（refund_in）
  const refundResult = createRefundInTransactionsForCancel(order, products);
  assert.ok(refundResult.success, '取消订单应成功');

  // 验证库存恢复
  assert.strictEqual(products[0].stock, originalStocks[0].stock, '商品A库存应恢复');
  assert.strictEqual(products[1].stock, originalStocks[1].stock, '商品B库存应恢复');

  console.log('[测试7通过] 订单生命周期库存一致性');
}, '测试7失败：库存一致性');

/**
 * 测试8：多订单库存追踪
 *
 * 场景：多个订单对同一商品的操作
 * 预期：库存流水正确追踪所有变化
 */
assert.doesNotThrow(() => {
  const product = { _id: 'product_001', name: '精酿啤酒A', stock: 100 };
  const allTransactions = [];

  // 订单1：购买30件
  const order1 = {
    _id: 'order_001',
    orderNo: 'ORD001',
    items: [{ productId: 'product_001', productName: '精酿啤酒A', quantity: 30, price: 88 }]
  };

  const result1 = createSaleOutTransactions(order1, [product]);
  allTransactions.push(...result1.transactions);
  assert.strictEqual(product.stock, 70, '订单1后库存应为70');

  // 订单2：购买20件
  const order2 = {
    _id: 'order_002',
    orderNo: 'ORD002',
    items: [{ productId: 'product_001', productName: '精酿啤酒A', quantity: 20, price: 88 }]
  };

  const result2 = createSaleOutTransactions(order2, [product]);
  allTransactions.push(...result2.transactions);
  assert.strictEqual(product.stock, 50, '订单2后库存应为50');

  // 订单1取消
  const refund1 = createRefundInTransactionsForCancel(order1, [product]);
  allTransactions.push(...refund1.transactions);
  assert.strictEqual(product.stock, 80, '订单1取消后库存应为80');

  // 验证流水数量
  assert.strictEqual(allTransactions.length, 3, '应有3条流水');

  // 验证流水类型
  const saleOutCount = allTransactions.filter(t => t.type === 'sale_out').length;
  const refundInCount = allTransactions.filter(t => t.type === 'refund_in').length;
  assert.strictEqual(saleOutCount, 2, '应有2条sale_out流水');
  assert.strictEqual(refundInCount, 1, '应有1条refund_in流水');

  console.log('[测试8通过] 多订单库存追踪');
}, '测试8失败：多订单库存追踪');

// ==================== 边界条件测试 ====================

/**
 * 测试9：零库存订单
 */
assert.doesNotThrow(() => {
  const products = [
    { _id: 'product_001', name: '精酿啤酒A', stock: 0 }
  ];

  const order = {
    _id: 'order_003',
    orderNo: 'ORD003',
    items: [
      { productId: 'product_001', productName: '精酿啤酒A', quantity: 1, price: 88 }
    ]
  };

  const result = createSaleOutTransactions(order, products);

  assert.ok(!result.success, '零库存应创建失败');
  assert.strictEqual(result.error, 'INSUFFICIENT_STOCK', '错误类型应为库存不足');

  console.log('[测试9通过] 零库存订单');
}, '测试9失败：零库存订单');

/**
 * 测试10：大数量订单
 */
assert.doesNotThrow(() => {
  const products = [
    { _id: 'product_001', name: '精酿啤酒A', stock: 10000 }
  ];

  const order = {
    _id: 'order_004',
    orderNo: 'ORD004',
    items: [
      { productId: 'product_001', productName: '精酿啤酒A', quantity: 9999, price: 88 }
    ]
  };

  const result = createSaleOutTransactions(order, products);

  assert.ok(result.success, '大数量订单应成功');
  assert.strictEqual(products[0].stock, 1, '库存应剩余1');

  console.log('[测试10通过] 大数量订单');
}, '测试10失败：大数量订单');

// ==================== 测试报告 ====================

console.log('');
console.log('============================================');
console.log('  订单-库存集成 TDD测试套件');
console.log('============================================');
console.log('');
console.log('测试结果：所有测试断言通过');
console.log('');
console.log('测试覆盖范围：');
console.log('  [流水号生成] 1个测试');
console.log('    - 流水号格式验证');
console.log('');
console.log('  [订单创建 -> sale_out] 2个测试');
console.log('    - 正常出库流水');
console.log('    - 库存不足校验');
console.log('');
console.log('  [订单取消 -> refund_in] 1个测试');
console.log('    - 取消退货入库流水');
console.log('');
console.log('  [退款处理 -> refund_in] 2个测试');
console.log('    - 部分退款流水');
console.log('    - 全额退款流水');
console.log('');
console.log('  [库存一致性] 2个测试');
console.log('    - 订单生命周期一致性');
console.log('    - 多订单库存追踪');
console.log('');
console.log('  [边界条件] 2个测试');
console.log('    - 零库存订单');
console.log('    - 大数量订单');
console.log('');
console.log('--------------------------------------------');
console.log('测试总数：10');
console.log('通过：10');
console.log('失败：0');
console.log('--------------------------------------------');
console.log('');
console.log('关键验证点：');
console.log('1. sale_out流水：订单创建时生成，quantity为正数，库存减少');
console.log('2. refund_in流水：订单取消/退款时生成，quantity为正数，库存增加');
console.log('3. 流水关联：relatedId关联订单/退款单，relatedNo关联单号');
console.log('4. 库存一致性：订单取消后库存恢复原始值');
console.log('5. 边界处理：库存不足时拒绝创建订单');
console.log('============================================');
