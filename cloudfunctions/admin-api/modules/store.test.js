/**
 * Store Management Module Unit Test - Simplified
 */
const assert = require('assert');

// Mock database
const createMockDb = (data = [], orderData = []) => {
  let collectionData = [...data];
  let orderCollectionData = [...orderData];
  return {
    collection: (name) => {
      if (name === 'orders') {
        return {
          where: (query) => ({
            count: async () => ({ total: orderCollectionData.length })
          })
        };
      }
      return {
        where: (query) => ({
          orderBy: () => ({
            skip: () => ({
              limit: (n) => ({
                get: async () => ({ data: collectionData.slice(0, n) }),
                count: async () => ({ total: collectionData.length })
              }),
              get: async () => ({ data: collectionData })
            }),
            get: async () => ({ data: collectionData })
          }),
          skip: (s) => ({
            limit: (n) => ({
              get: async () => ({ data: collectionData.slice(s, s + n) }),
              count: async () => ({ total: collectionData.length })
            }),
            get: async () => ({ data: collectionData.slice(s) })
          }),
          limit: (n) => ({
            get: async () => ({ data: collectionData.slice(0, n) }),
            count: async () => ({ total: collectionData.length })
          }),
          get: async () => ({ data: collectionData }),
          count: async () => ({ total: collectionData.length }),
          update: async (data) => {
            return { updated: collectionData.length };
          }
        }),
        get: async () => ({ data: collectionData }),
        add: async (data) => {
          const newItem = { _id: 'store-' + Date.now(), ...data.data };
          collectionData.push(newItem);
          return { id: newItem._id };
        },
        doc: (id) => ({
          get: async () => {
            const item = collectionData.find(d => d._id === id);
            return { data: item || null };
          },
          update: async (data) => {
            const index = collectionData.findIndex(d => d._id === id);
            if (index >= 0) {
              collectionData[index] = { ...collectionData[index], ...data.data };
            }
            return { updated: 1 };
          },
          remove: async () => {
            const index = collectionData.findIndex(d => d._id === id);
            if (index >= 0) {
              collectionData.splice(index, 1);
            }
            return { removed: 1 };
          }
        }),
        limit: (n) => ({
          get: async () => ({ data: collectionData.slice(0, n) }),
          count: async () => ({ total: collectionData.length })
        })
      };
    },
    serverDate: () => new Date().toISOString()
  };
};

// Test data
const mockStores = [
  { _id: 'store1', name: 'Store 1', address: 'Address 1', phone: '13800138000', isActive: true, isDefault: true, sort: 1 },
  { _id: 'store2', name: 'Store 2', address: 'Address 2', phone: '13800138001', isActive: true, isDefault: false, sort: 2 },
  { _id: 'store3', name: 'Store 3', address: 'Address 3', phone: '13800138002', isActive: false, isDefault: false, sort: 3 }
];

// Load module
const storeModule = require('./store');

async function runTests() {
  let passed = 0;
  let failed = 0;

  // Test: getStores
  console.log('\n--- Test: getStores ---');
  try {
    const db = createMockDb(mockStores, []);
    const result = await storeModule.getStores(db, {});
    assert.strictEqual(result.code, 0, 'code should be 0');
    assert.ok(result.data.list, 'list should exist');
    assert.strictEqual(result.data.list.length, 3, 'should have 3 stores');
    console.log('PASS: getStores basic');
    passed++;
  } catch (e) {
    console.log('FAIL: getStores:', e.message);
    failed++;
  }

  // Test: getStores with pagination
  try {
    const db = createMockDb(mockStores, []);
    const result = await storeModule.getStores(db, { page: 1, limit: 2 });
    assert.strictEqual(result.code, 0);
    assert.strictEqual(result.data.list.length, 2);
    console.log('PASS: getStores pagination');
    passed++;
  } catch (e) {
    console.log('FAIL: getStores pagination:', e.message);
    failed++;
  }

  // Test: getStoreDetail
  console.log('\n--- Test: getStoreDetail ---');
  try {
    const db = createMockDb(mockStores, []);
    const result = await storeModule.getStoreDetail(db, { id: 'store1' });
    assert.strictEqual(result.code, 0);
    assert.strictEqual(result.data.name, 'Store 1');
    console.log('PASS: getStoreDetail');
    passed++;
  } catch (e) {
    console.log('FAIL: getStoreDetail:', e.message);
    failed++;
  }

  // Test: getStoreDetail - missing id
  try {
    const db = createMockDb(mockStores, []);
    const result = await storeModule.getStoreDetail(db, {});
    assert.strictEqual(result.code, 400);
    console.log('PASS: getStoreDetail missing id');
    passed++;
  } catch (e) {
    console.log('FAIL: getStoreDetail missing id:', e.message);
    failed++;
  }

  // Test: createStore
  console.log('\n--- Test: createStore ---');
  try {
    const db = createMockDb([], []);
    const result = await storeModule.createStore(db, null, {
      name: 'New Store',
      address: 'New Address',
      phone: '13900000000'
    }, {});
    assert.strictEqual(result.code, 0);
    assert.ok(result.data.id);
    console.log('PASS: createStore');
    passed++;
  } catch (e) {
    console.log('FAIL: createStore:', e.message);
    failed++;
  }

  // Test: createStore - missing name
  try {
    const db = createMockDb([], []);
    const result = await storeModule.createStore(db, null, { name: '' }, {});
    assert.strictEqual(result.code, 400);
    console.log('PASS: createStore missing name');
    passed++;
  } catch (e) {
    console.log('FAIL: createStore missing name:', e.message);
    failed++;
  }

  // Test: updateStore
  console.log('\n--- Test: updateStore ---');
  try {
    const db = createMockDb(mockStores, []);
    const result = await storeModule.updateStore(db, null, {
      id: 'store1',
      name: 'Store 1 Updated'
    }, {});
    assert.strictEqual(result.code, 0);
    console.log('PASS: updateStore');
    passed++;
  } catch (e) {
    console.log('FAIL: updateStore:', e.message);
    failed++;
  }

  // Test: deleteStore - success (no orders)
  console.log('\n--- Test: deleteStore ---');
  try {
    const db = createMockDb(mockStores, []);
    const result = await storeModule.deleteStore(db, null, { id: 'store3' }, {});
    assert.strictEqual(result.code, 0);
    console.log('PASS: deleteStore');
    passed++;
  } catch (e) {
    console.log('FAIL: deleteStore:', e.message);
    failed++;
  }

  // Test: deleteStore - fail (has orders)
  try {
    const db = createMockDb(mockStores, [{ _id: 'order1', storeId: 'store1' }]);
    const result = await storeModule.deleteStore(db, null, { id: 'store1' }, {});
    assert.strictEqual(result.code, 400);
    assert.ok(result.msg.includes('订单'));
    console.log('PASS: deleteStore with orders');
    passed++;
  } catch (e) {
    console.log('FAIL: deleteStore with orders:', e.message);
    failed++;
  }

  // Test: setDefaultStore
  console.log('\n--- Test: setDefaultStore ---');
  try {
    const db = createMockDb(mockStores, []);
    const result = await storeModule.setDefaultStore(db, null, { id: 'store2' }, {});
    assert.strictEqual(result.code, 0);
    console.log('PASS: setDefaultStore');
    passed++;
  } catch (e) {
    console.log('FAIL: setDefaultStore:', e.message);
    failed++;
  }

  console.log('\n===================');
  console.log('Passed: ' + passed + ', Failed: ' + failed);
  console.log('===================');

  process.exit(failed > 0 ? 1 : 0);
}

runTests();
