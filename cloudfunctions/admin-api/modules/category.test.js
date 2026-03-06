/**
 * Category Management Module Unit Test - Simplified
 */
const assert = require('assert');

// Mock database
const createMockDb = (data = [], productData = []) => {
  let collectionData = [...data];
  let productCollectionData = [...productData];
  return {
    collection: (name) => {
      if (name === 'products') {
        return {
          where: (query) => ({
            count: async () => ({ total: productCollectionData.length })
          })
        };
      }
      return {
        count: async () => ({ total: collectionData.length }),
        orderBy: (field, order) => ({
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
          get: async () => ({ data: collectionData })
        }),
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
          count: async () => ({ total: collectionData.length })
        }),
        add: async (data) => {
          const newItem = { _id: 'cat-' + Date.now(), ...data.data };
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
const mockCategories = [
  { _id: 'cat1', name: 'Category 1', icon: 'icon1', sort: 1, isActive: true },
  { _id: 'cat2', name: 'Category 2', icon: 'icon2', sort: 2, isActive: true },
  { _id: 'cat3', name: 'Category 3', icon: 'icon3', sort: 3, isActive: false }
];

// Load module
const categoryModule = require('./category');

async function runTests() {
  let passed = 0;
  let failed = 0;

  // Test: getCategories
  console.log('\n--- Test: getCategories ---');
  try {
    const db = createMockDb(mockCategories, []);
    const result = await categoryModule.getCategories(db, {});
    assert.strictEqual(result.code, 0);
    assert.ok(result.data.list);
    assert.strictEqual(result.data.list.length, 3);
    console.log('PASS: getCategories basic');
    passed++;
  } catch (e) {
    console.log('FAIL: getCategories:', e.message);
    failed++;
  }

  // Test: getCategories with pagination
  try {
    const db = createMockDb(mockCategories, []);
    const result = await categoryModule.getCategories(db, { page: 1, limit: 2 });
    assert.strictEqual(result.code, 0);
    assert.strictEqual(result.data.list.length, 2);
    assert.strictEqual(result.data.total, 3);
    console.log('PASS: getCategories pagination');
    passed++;
  } catch (e) {
    console.log('FAIL: getCategories pagination:', e.message);
    failed++;
  }

  // Test: getCategories empty
  try {
    const db = createMockDb([], []);
    const result = await categoryModule.getCategories(db, {});
    assert.strictEqual(result.code, 0);
    assert.strictEqual(result.data.list.length, 0);
    assert.strictEqual(result.data.total, 0);
    console.log('PASS: getCategories empty');
    passed++;
  } catch (e) {
    console.log('FAIL: getCategories empty:', e.message);
    failed++;
  }

  // Test: getCategoryDetail
  console.log('\n--- Test: getCategoryDetail ---');
  try {
    const db = createMockDb(mockCategories, []);
    const result = await categoryModule.getCategoryDetail(db, { id: 'cat1' });
    assert.strictEqual(result.code, 0);
    assert.strictEqual(result.data.name, 'Category 1');
    console.log('PASS: getCategoryDetail');
    passed++;
  } catch (e) {
    console.log('FAIL: getCategoryDetail:', e.message);
    failed++;
  }

  // Test: getCategoryDetail - missing id
  try {
    const db = createMockDb(mockCategories, []);
    const result = await categoryModule.getCategoryDetail(db, {});
    assert.strictEqual(result.code, 400);
    console.log('PASS: getCategoryDetail missing id');
    passed++;
  } catch (e) {
    console.log('FAIL: getCategoryDetail missing id:', e.message);
    failed++;
  }

  // Test: getCategoryDetail - not found
  try {
    const db = createMockDb(mockCategories, []);
    const result = await categoryModule.getCategoryDetail(db, { id: 'non-existent' });
    assert.strictEqual(result.code, 404);
    console.log('PASS: getCategoryDetail not found');
    passed++;
  } catch (e) {
    console.log('FAIL: getCategoryDetail not found:', e.message);
    failed++;
  }

  // Test: createCategory
  console.log('\n--- Test: createCategory ---');
  try {
    const db = createMockDb([], []);
    const result = await categoryModule.createCategory(db, null, {
      name: 'New Category',
      icon: 'new-icon',
      sort: 1,
      isActive: true
    }, {});
    assert.strictEqual(result.code, 0);
    assert.ok(result.data.id);
    console.log('PASS: createCategory');
    passed++;
  } catch (e) {
    console.log('FAIL: createCategory:', e.message);
    failed++;
  }

  // Test: createCategory - missing name
  try {
    const db = createMockDb([], []);
    const result = await categoryModule.createCategory(db, null, {
      name: '',
      icon: 'icon'
    }, {});
    assert.strictEqual(result.code, 400);
    console.log('PASS: createCategory missing name');
    passed++;
  } catch (e) {
    console.log('FAIL: createCategory missing name:', e.message);
    failed++;
  }

  // Test: updateCategory
  console.log('\n--- Test: updateCategory ---');
  try {
    const db = createMockDb(mockCategories, []);
    const result = await categoryModule.updateCategory(db, null, {
      id: 'cat1',
      name: 'Updated Category',
      icon: 'updated-icon',
      sort: 5,
      isActive: false
    }, {});
    assert.strictEqual(result.code, 0);
    console.log('PASS: updateCategory');
    passed++;
  } catch (e) {
    console.log('FAIL: updateCategory:', e.message);
    failed++;
  }

  // Test: updateCategory - missing id
  try {
    const db = createMockDb(mockCategories, []);
    const result = await categoryModule.updateCategory(db, null, {
      name: 'New Name'
    }, {});
    assert.strictEqual(result.code, 400);
    console.log('PASS: updateCategory missing id');
    passed++;
  } catch (e) {
    console.log('FAIL: updateCategory missing id:', e.message);
    failed++;
  }

  // Test: updateCategory - missing name
  try {
    const db = createMockDb(mockCategories, []);
    const result = await categoryModule.updateCategory(db, null, {
      id: 'cat1',
      name: ''
    }, {});
    assert.strictEqual(result.code, 400);
    console.log('PASS: updateCategory missing name');
    passed++;
  } catch (e) {
    console.log('FAIL: updateCategory missing name:', e.message);
    failed++;
  }

  // Test: deleteCategory
  console.log('\n--- Test: deleteCategory ---');
  try {
    const db = createMockDb(mockCategories, []);
    const result = await categoryModule.deleteCategory(db, null, { id: 'cat3' }, {});
    assert.strictEqual(result.code, 0);
    console.log('PASS: deleteCategory');
    passed++;
  } catch (e) {
    console.log('FAIL: deleteCategory:', e.message);
    failed++;
  }

  // Test: deleteCategory - missing id
  try {
    const db = createMockDb(mockCategories, []);
    const result = await categoryModule.deleteCategory(db, null, {}, {});
    assert.strictEqual(result.code, 400);
    console.log('PASS: deleteCategory missing id');
    passed++;
  } catch (e) {
    console.log('FAIL: deleteCategory missing id:', e.message);
    failed++;
  }

  // Test: deleteCategory - has products
  try {
    const db = createMockDb(mockCategories, [{ _id: 'prod1', categoryId: 'cat1' }]);
    const result = await categoryModule.deleteCategory(db, null, { id: 'cat1' }, {});
    assert.strictEqual(result.code, 400);
    assert.ok(result.msg.includes('产品'));
    console.log('PASS: deleteCategory with products');
    passed++;
  } catch (e) {
    console.log('FAIL: deleteCategory with products:', e.message);
    failed++;
  }

  console.log('\n===================');
  console.log('Passed: ' + passed + ', Failed: ' + failed);
  console.log('===================');

  process.exit(failed > 0 ? 1 : 0);
}

runTests();
