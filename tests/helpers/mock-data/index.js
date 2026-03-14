/**
 * Mock数据模块索引
 *
 * 注意：这些模块将在Task 2中创建，当前使用条件加载以避免模块不存在时的错误
 */

const mockDataModules = {
  users: null,
  products: null,
  orders: null,
  promotionRelations: null,
  wallets: null
};

// 尝试加载各个mock数据模块，如果模块不存在则返回null
try {
  mockDataModules.users = require('./users');
} catch (error) {
  // 模块尚未创建，将在Task 2中实现
}

try {
  mockDataModules.products = require('./products');
} catch (error) {
  // 模块尚未创建，将在Task 2中实现
}

try {
  mockDataModules.orders = require('./orders');
} catch (error) {
  // 模块尚未创建，将在Task 2中实现
}

try {
  mockDataModules.promotionRelations = require('./promotion-relations');
} catch (error) {
  // 模块尚未创建，将在Task 2中实现
}

try {
  mockDataModules.wallets = require('./wallets');
} catch (error) {
  // 模块尚未创建，将在Task 2中实现
}

module.exports = mockDataModules;
