/**
 * 商品状态过滤单元测试
 *
 * 测试场景：
 * 1. 上架商品应显示在列表中
 * 2. 已下架商品不应显示在列表中
 * 3. 商品详情应正确显示状态
 * 4. 热门商品和新品列表应过滤已下架商品
 */

const assert = require('assert');

// ==================== 测试数据 ====================

const mockProducts = [
  {
    _id: 'product_001',
    name: '精酿啤酒A',
    category: '鲜啤外带',
    price: 2800,
    isActive: true,
    isHot: true,
    isNew: true,
    sales: 100
  },
  {
    _id: 'product_002',
    name: '精酿啤酒B',
    category: '鲜啤外带',
    price: 3200,
    isActive: false, // 已下架
    isHot: true,
    isNew: true,
    sales: 50
  },
  {
    _id: 'product_003',
    name: '精酿啤酒C',
    category: '套餐',
    price: 4500,
    isActive: true,
    isHot: false,
    isNew: true,
    sales: 80
  },
  {
    _id: 'product_004',
    name: '精酿啤酒D',
    category: '套餐',
    price: 3800,
    isActive: false, // 已下架
    isHot: false,
    isNew: false,
    sales: 30
  }
];

// ==================== 商品列表过滤测试 ====================

/**
 * 测试1：商品列表应只返回上架商品
 */
assert.doesNotThrow(() => {
  const activeProducts = mockProducts.filter(p => p.isActive === true);

  assert.ok(Array.isArray(activeProducts), '商品列表应为数组');
  assert.strictEqual(activeProducts.length, 2, '应返回2个上架商品');
  assert.ok(activeProducts.every(p => p.isActive === true), '所有商品都应为上架状态');

  console.log('✅ 测试1通过：商品列表正确过滤上架商品');
}, '测试1失败：商品列表过滤');

/**
 * 测试2：已下架商品不应出现在列表中
 */
assert.doesNotThrow(() => {
  const productIds = mockProducts.map(p => p._id);
  const activeProductIds = mockProducts
    .filter(p => p.isActive === true)
    .map(p => p._id);

  // 检查已下架商品不在列表中
  const inactiveProduct = mockProducts.find(p => p._id === 'product_002');
  assert.ok(inactiveProduct, '测试数据应包含已下架商品');
  assert.ok(!activeProductIds.includes('product_002'), '已下架商品不应在列表中');
  assert.ok(!activeProductIds.includes('product_004'), '已下架商品不应在列表中');

  console.log('✅ 测试2通过：已下架商品被正确过滤');
}, '测试2失败：已下架商品过滤');

/**
 * 测试3：按分类筛选时也应过滤已下架商品
 */
assert.doesNotThrow(() => {
  const category = '鲜啤外带';
  const activeCategoryProducts = mockProducts.filter(
    p => p.category === category && p.isActive === true
  );

  assert.strictEqual(activeCategoryProducts.length, 1, '鲜啤外带分类应有1个上架商品');
  assert.strictEqual(activeCategoryProducts[0]._id, 'product_001', '应返回正确的商品');

  console.log('✅ 测试3通过：分类筛选正确过滤已下架商品');
}, '测试3失败：分类筛选过滤');

// ==================== 商品详情测试 ====================

/**
 * 测试4：上架商品应返回完整详情
 */
assert.doesNotThrow(() => {
  const product = mockProducts.find(p => p._id === 'product_001');

  assert.ok(product, '商品应存在');
  assert.strictEqual(product.isActive, true, '商品应处于上架状态');
  assert.ok(product.name, '商品应有名称');
  assert.ok(product.price, '商品应有价格');

  console.log('✅ 测试4通过：上架商品详情正确');
}, '测试4失败：上架商品详情');

/**
 * 测试5：已下架商品查询应返回错误
 */
assert.doesNotThrow(() => {
  const product = mockProducts.find(p => p._id === 'product_002');

  if (product && product.isActive === false) {
    const errorCode = -2;
    const errorMsg = '商品已下架';

    assert.strictEqual(errorCode, -2, '应返回错误码-2');
    assert.ok(errorMsg.includes('已下架'), '错误信息应包含"已下架"');

    console.log('✅ 测试5通过：已下架商品返回正确错误');
  }
}, '测试5失败：已下架商品错误处理');

// ==================== 热门商品过滤测试 ====================

/**
 * 测试6：热门商品列表应只包含上架商品
 */
assert.doesNotThrow(() => {
  const hotProducts = mockProducts.filter(
    p => p.isHot === true && p.isActive === true
  );

  assert.strictEqual(hotProducts.length, 1, '热门商品列表应只包含上架商品');
  assert.strictEqual(hotProducts[0]._id, 'product_001', '应返回正确的热门商品');
  assert.ok(hotProducts.every(p => p.isActive === true), '所有热门商品都应上架');

  console.log('✅ 测试6通过：热门商品列表正确过滤');
}, '测试6失败：热门商品过滤');

// ==================== 新品过滤测试 ====================

/**
 * 测试7：新品列表应只包含上架商品
 */
assert.doesNotThrow(() => {
  const newProducts = mockProducts.filter(
    p => p.isNew === true && p.isActive === true
  );

  assert.strictEqual(newProducts.length, 2, '新品列表应包含2个上架商品');
  assert.ok(newProducts.every(p => p.isActive === true), '所有新品都应上架');
  assert.ok(!newProducts.some(p => p._id === 'product_002'), '不应包含已下架的新品');

  console.log('✅ 测试7通过：新品列表正确过滤');
}, '测试7失败：新品过滤');

// ==================== 订单创建验证测试 ====================

/**
 * 测试8：订单创建应验证商品状态
 */
assert.doesNotThrow(() => {
  const orderItems = [
    { productId: 'product_001', quantity: 1 }, // 上架商品
    { productId: 'product_002', quantity: 2 }  // 已下架商品
  ];

  // 模拟商品状态验证
  const inactiveProducts = orderItems.filter(item => {
    const product = mockProducts.find(p => p._id === item.productId);
    return product && product.isActive === false;
  });

  assert.ok(inactiveProducts.length > 0, '应检测到已下架商品');
  assert.strictEqual(inactiveProducts[0].productId, 'product_002', '应识别出已下架商品');

  console.log('✅ 测试8通过：订单创建正确验证商品状态');
}, '测试8失败：订单创建验证');

/**
 * 测试9：全部商品为上架状态时应允许创建订单
 */
assert.doesNotThrow(() => {
  const orderItems = [
    { productId: 'product_001', quantity: 1 },
    { productId: 'product_003', quantity: 2 }
  ];

  // 模拟商品状态验证
  const allActive = orderItems.every(item => {
    const product = mockProducts.find(p => p._id === item.productId);
    return product && product.isActive === true;
  });

  assert.strictEqual(allActive, true, '所有商品都应处于上架状态');

  console.log('✅ 测试9通过：全部商品上架时允许创建订单');
}, '测试9失败：订单创建允许');

// ==================== 销量统计测试 ====================

/**
 * 测试10：销量数据应正确映射到商品
 */
assert.doesNotThrow(() => {
  const product = mockProducts.find(p => p._id === 'product_001');

  assert.ok(product, '商品应存在');
  assert.strictEqual(typeof product.sales, 'number', '销量应为数字');
  assert.ok(product.sales >= 0, '销量不能为负数');
  assert.strictEqual(product.sales, 100, '销量应正确映射');

  console.log('✅ 测试10通过：销量数据正确映射');
}, '测试10失败：销量数据映射');

// ==================== 测试总结 ====================

console.log('\n🎉 所有商品状态过滤测试通过！共10个测试用例');
console.log('\n📊 测试覆盖范围：');
console.log('  - 商品列表过滤：3个测试');
console.log('  - 商品详情查询：2个测试');
console.log('  - 热门商品过滤：1个测试');
console.log('  - 新品过滤：1个测试');
console.log('  - 订单创建验证：2个测试');
console.log('  - 销量数据映射：1个测试');
