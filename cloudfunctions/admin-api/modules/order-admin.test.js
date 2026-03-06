/**
 * Order Admin Module Unit Test - Simplified
 */
const assert = require('assert');

// Mock database
const createMockDb = (orderData = [], userData = []) => {
  let orderCollectionData = [...orderData];
  let userCollectionData = [...userData];

  // Helper to filter orders based on query
  const filterOrders = (query) => {
    let result = [...orderCollectionData];
    if (query && query.status && query.status !== 'all') {
      result = result.filter(o => o.status === query.status);
    }
    if (query && query.orderNo) {
      // Handle RegExp for keyword search
      const regex = query.orderNo.regexp || query.orderNo;
      const options = query.orderNo.options || '';
      const isCaseInsensitive = options.includes('i');
      const re = new RegExp(regex, isCaseInsensitive ? 'i' : '');
      result = result.filter(o => re.test(o.orderNo));
    }
    return result;
  };

  return {
    collection: (name) => {
      if (name === 'users') {
        return {
          where: (query) => ({
            limit: (n) => ({
              get: async () => ({ data: userCollectionData.slice(0, n) })
            }),
            get: async () => ({ data: userCollectionData })
          })
        };
      }
      return {
        where: (query) => {
          const filteredData = filterOrders(query);
          return {
            orderBy: () => ({
              skip: (s) => ({
                limit: (n) => ({
                  get: async () => ({ data: filteredData.slice(s, s + n) }),
                  count: async () => ({ total: filteredData.length })
                }),
                get: async () => ({ data: filteredData.slice(s) })
              }),
              get: async () => ({ data: filteredData })
            }),
            skip: (s) => ({
              limit: (n) => ({
                get: async () => ({ data: filteredData.slice(s, s + n) }),
                count: async () => ({ total: filteredData.length })
              }),
              get: async () => ({ data: filteredData.slice(s) })
            }),
            limit: (n) => ({
              get: async () => ({ data: filteredData.slice(0, n) }),
              count: async () => ({ total: filteredData.length })
            }),
            get: async () => ({ data: filteredData }),
            count: async () => ({ total: filteredData.length })
          };
        },
        doc: (id) => ({
          get: async () => {
            const item = orderCollectionData.find(d => d._id === id);
            return { data: item || null };
          },
          update: async (data) => {
            const index = orderCollectionData.findIndex(d => d._id === id);
            if (index >= 0) {
              orderCollectionData[index] = { ...orderCollectionData[index], ...data.data };
            }
            return { updated: 1 };
          }
        })
      };
    },
    serverDate: () => new Date().toISOString(),
    RegExp: (opts) => new RegExp(opts.regexp, opts.options),
    command: {
      in: (arr) => ({ inArray: arr })
    }
  };
};

// Mock logOperation
const createMockLogOperation = () => async (adminId, action, data) => {
  return { logged: true, adminId, action, data };
};

// Test data
const mockOrders = [
  { _id: 'order1', orderNo: 'ORD20260305001', status: 'pending', _openid: 'user1', totalAmount: 100, createTime: new Date('2026-03-05') },
  { _id: 'order2', orderNo: 'ORD20260305002', status: 'paid', _openid: 'user2', totalAmount: 200, createTime: new Date('2026-03-04') },
  { _id: 'order3', orderNo: 'ORD20260305003', status: 'completed', _openid: 'user1', totalAmount: 150, createTime: new Date('2026-03-03') },
  { _id: 'order4', orderNo: 'ORD20260305004', status: 'cancelled', _openid: 'user3', totalAmount: 80, createTime: new Date('2026-03-02') }
];

const mockUsers = [
  { _openid: 'user1', nickName: 'User One', name: 'Zhang San' },
  { _openid: 'user2', nickName: 'User Two', name: 'Li Si' },
  { _openid: 'user3', nickName: 'User Three', name: 'Wang Wu' }
];

// Load module
const orderModule = require('./order-admin');

async function runTests() {
  let passed = 0;
  let failed = 0;

  // Test: getOrders
  console.log('\n--- Test: getOrders ---');
  try {
    const db = createMockDb(mockOrders, mockUsers);
    const result = await orderModule.getOrders(db, {});
    assert.strictEqual(result.code, 0);
    assert.ok(result.data.list);
    assert.strictEqual(result.data.list.length, 4);
    console.log('PASS: getOrders basic');
    passed++;
  } catch (e) {
    console.log('FAIL: getOrders:', e.message);
    failed++;
  }

  // Test: getOrders with pagination
  try {
    const db = createMockDb(mockOrders, mockUsers);
    const result = await orderModule.getOrders(db, { page: 1, limit: 2 });
    assert.strictEqual(result.code, 0);
    assert.strictEqual(result.data.list.length, 2);
    assert.strictEqual(result.data.total, 4);
    console.log('PASS: getOrders pagination');
    passed++;
  } catch (e) {
    console.log('FAIL: getOrders pagination:', e.message);
    failed++;
  }

  // Test: getOrders with status filter
  try {
    const db = createMockDb(mockOrders, mockUsers);
    const result = await orderModule.getOrders(db, { status: 'pending' });
    assert.strictEqual(result.code, 0);
    assert.strictEqual(result.data.list.length, 1);
    assert.strictEqual(result.data.list[0].status, 'pending');
    console.log('PASS: getOrders status filter');
    passed++;
  } catch (e) {
    console.log('FAIL: getOrders status filter:', e.message);
    failed++;
  }

  // Test: getOrders with keyword search
  try {
    const db = createMockDb(mockOrders, mockUsers);
    const result = await orderModule.getOrders(db, { keyword: 'ORD20260305001' });
    assert.strictEqual(result.code, 0);
    assert.strictEqual(result.data.list.length, 1);
    console.log('PASS: getOrders keyword search');
    passed++;
  } catch (e) {
    console.log('FAIL: getOrders keyword search:', e.message);
    failed++;
  }

  // Test: getOrderDetail
  console.log('\n--- Test: getOrderDetail ---');
  try {
    const db = createMockDb(mockOrders, mockUsers);
    const result = await orderModule.getOrderDetail(db, { id: 'order1' });
    assert.strictEqual(result.code, 0);
    assert.strictEqual(result.data.order.orderNo, 'ORD20260305001');
    console.log('PASS: getOrderDetail');
    passed++;
  } catch (e) {
    console.log('FAIL: getOrderDetail:', e.message);
    failed++;
  }

  // Test: getOrderDetail - not found
  try {
    const db = createMockDb(mockOrders, mockUsers);
    const result = await orderModule.getOrderDetail(db, { id: 'non-existent' });
    assert.strictEqual(result.code, 404);
    console.log('PASS: getOrderDetail not found');
    passed++;
  } catch (e) {
    console.log('FAIL: getOrderDetail not found:', e.message);
    failed++;
  }

  // Test: updateOrderStatus
  console.log('\n--- Test: updateOrderStatus ---');
  try {
    const db = createMockDb(mockOrders, mockUsers);
    const logOperation = createMockLogOperation();
    const wxContext = { ADMIN_INFO: { id: 'admin1' } };
    const result = await orderModule.updateOrderStatus(db, logOperation, { id: 'order1', status: 'paid' }, wxContext);
    assert.strictEqual(result.code, 0);
    console.log('PASS: updateOrderStatus');
    passed++;
  } catch (e) {
    console.log('FAIL: updateOrderStatus:', e.message);
    failed++;
  }

  // Test: updateOrderStatus - missing params
  try {
    const db = createMockDb(mockOrders, mockUsers);
    const logOperation = createMockLogOperation();
    const wxContext = { ADMIN_INFO: { id: 'admin1' } };
    const result = await orderModule.updateOrderStatus(db, logOperation, { id: 'order1' }, wxContext);
    assert.strictEqual(result.code, -2);
    console.log('PASS: updateOrderStatus missing params');
    passed++;
  } catch (e) {
    console.log('FAIL: updateOrderStatus missing params:', e.message);
    failed++;
  }

  // Test: searchOrderByExpress
  console.log('\n--- Test: searchOrderByExpress ---');
  try {
    const ordersWithExpress = [
      { _id: 'order5', orderNo: 'ORD20260305005', expressNo: 'SF123456789' }
    ];
    const db = createMockDb(ordersWithExpress, mockUsers);
    const result = await orderModule.searchOrderByExpress(db, { expressNo: 'SF123456789' });
    assert.strictEqual(result.code, 0);
    assert.strictEqual(result.data.length, 1);
    console.log('PASS: searchOrderByExpress');
    passed++;
  } catch (e) {
    console.log('FAIL: searchOrderByExpress:', e.message);
    failed++;
  }

  // Test: searchOrderByExpress - missing expressNo
  try {
    const db = createMockDb(mockOrders, mockUsers);
    const result = await orderModule.searchOrderByExpress(db, {});
    assert.strictEqual(result.code, -2);
    console.log('PASS: searchOrderByExpress missing expressNo');
    passed++;
  } catch (e) {
    console.log('FAIL: searchOrderByExpress missing expressNo:', e.message);
    failed++;
  }

  // Test: updateOrderExpress
  console.log('\n--- Test: updateOrderExpress ---');
  try {
    const db = createMockDb(mockOrders, mockUsers);
    const logOperation = createMockLogOperation();
    const wxContext = { ADMIN_INFO: { id: 'admin1' } };
    const result = await orderModule.updateOrderExpress(db, logOperation, {
      id: 'order1',
      expressNo: 'YTO1234567890',
      expressCompany: 'YTO'
    }, wxContext);
    assert.strictEqual(result.code, 0);
    console.log('PASS: updateOrderExpress');
    passed++;
  } catch (e) {
    console.log('FAIL: updateOrderExpress:', e.message);
    failed++;
  }

  // Test: updateOrderExpress - missing id
  try {
    const db = createMockDb(mockOrders, mockUsers);
    const logOperation = createMockLogOperation();
    const wxContext = { ADMIN_INFO: { id: 'admin1' } };
    const result = await orderModule.updateOrderExpress(db, logOperation, {
      expressNo: 'YTO1234567890',
      expressCompany: 'YTO'
    }, wxContext);
    assert.strictEqual(result.code, -2);
    console.log('PASS: updateOrderExpress missing id');
    passed++;
  } catch (e) {
    console.log('FAIL: updateOrderExpress missing id:', e.message);
    failed++;
  }

  console.log('\n===================');
  console.log('Passed: ' + passed + ', Failed: ' + failed);
  console.log('===================');

  process.exit(failed > 0 ? 1 : 0);
}

runTests();
