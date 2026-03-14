# 小程序核心业务功能全量测试实施计划

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为小程序核心业务功能创建全面的测试套件，覆盖佣金计算、订单管理、推广系统、用户流程等关键业务逻辑，确保系统质量和稳定性。

**架构:** 采用三层测试架构（单元测试→集成测试→场景测试），使用Vitest框架和手动Mock数据，优先覆盖P0级核心业务逻辑，确保关键功能100%测试覆盖。

**Tech Stack:** Vitest 4.0.18, Node.js 16.13, TypeScript 4.9, wx-server-sdk (mock), assert模块

---

## 📋 项目文件结构映射

### 新增文件

```
tests/
├── unit/                                    # 单元测试目录（新建）
│   ├── commission/                          # 佣金计算测试
│   │   └── commission-calculation.test.js   # 新建
│   ├── order/                               # 订单逻辑测试
│   │   ├── order-validation.test.js         # 新建
│   │   └── order-status.test.js             # 新建
│   ├── promotion/                           # 推广系统测试
│   │   ├── upgrade-conditions.test.js       # 新建
│   │   └── promotion-path.test.js           # 新建
│   ├── product/                             # 商品逻辑测试
│   │   └── product-validation.test.js       # 新建
│   ├── admin/                               # 管理后台测试
│   │   ├── permission.test.js               # 新建
│   │   ├── finance-approval.test.js         # 新建
│   │   └── data-export.test.js              # 新建
│   ├── coupon/                              # 优惠券测试
│   │   └── coupon-validation.test.js        # 新建
│   └── database/                            # 数据库测试
│       └── schema-validation.test.js        # 新建
│
├── integration/                             # 集成测试目录（已有，需扩展）
│   └── business-flows/                      # 业务流程测试（新建）
│       ├── user-registration.test.js        # 新建
│       ├── complete-order.test.js           # 新建
│       ├── payment-process.test.js          # 新建
│       ├── refund-process.test.js           # 新建
│       └── coupon-usage.test.js             # 新建
│
├── scenarios/                               # 场景测试目录（新建）
│   ├── user-journey/                        # 用户旅程测试
│   │   ├── complete-user-lifecycle.test.js  # 新建
│   │   ├── promoter-journey.test.js         # 新建
│   │   └── upgrade-journey.test.js          # 新建
│   ├── edge-cases/                          # 边界情况测试
│   │   ├── concurrency.test.js              # 新建
│   │   ├── network-errors.test.js           # 新建
│   │   └── data-consistency.test.js         # 新建
│   ├── performance/                         # 性能测试
│   │   └── benchmarks.test.js               # 新建
│   └── security/                            # 安全测试
│       └── security-checks.test.js          # 新建
│
└── helpers/                                 # 测试辅助工具（新建）
    ├── mock-data/                           # Mock数据
    │   ├── index.js                         # 新建
    │   ├── users.js                         # 新建
    │   ├── products.js                      # 新建
    │   ├── orders.js                        # 新建
    │   ├── promotion-relations.js           # 新建
    │   └── wallets.js                       # 新建
    ├── test-utils.js                        # 测试工具函数（新建）
    ├── test-priority.js                     # 测试优先级配置（新建）
    └── error-handler.js                     # 错误处理（新建）
```

### 修改文件

```
package.json                                  # 添加测试脚本
docs/superpowers/specs/2026-03-14-miniprogram-business-testing-design.md  # 参考
cloudfunctions/common/constants.js           # 佣金规则参考
cloudfunctions/common/response.js            # 响应格式参考
```

---

## Chunk 1: 测试基础设施搭建

### Task 1: 创建测试辅助工具目录和基础文件

**Files:**
- Create: `tests/helpers/test-utils.js`
- Create: `tests/helpers/test-priority.js`
- Create: `tests/helpers/error-handler.js`
- Create: `tests/helpers/mock-data/index.js`

- [ ] **Step 1: 创建测试工具函数文件**

```javascript
// tests/helpers/test-utils.js
const assert = require('assert');

/**
 * 模拟云函数context
 * @param {string} openid - 用户OpenID
 * @returns {object} 模拟的context对象
 */
function createMockContext(openid) {
  return {
    OPENID: openid || 'test_openid_' + Date.now(),
    APPID: 'test_appid',
    UNIONID: 'test_unionid',
    CLIENTIP: '127.0.0.1'
  };
}

/**
 * 模拟数据库命令操作
 */
function createMockDatabase() {
  const mockData = new Map();

  return {
    // 模拟collection
    collection: (name) => ({
      where: (query) => ({
        get: async () => ({ data: [] }),
        update: async (data) => ({ stats: { updated: 0 } }),
        remove: async () => ({ stats: { removed: 0 } })
      }),
      doc: (id) => ({
        get: async () => ({ data: null }),
        update: async (data) => ({ stats: { updated: 0 } }),
        remove: async () => ({ stats: { removed: 0 } })
      }),
      add: async (data) => ({ _id: 'test_id_' + Date.now() })
    }),

    // 模拟command
    command: {
      eq: (val) => ({ $eq: val }),
      gte: (val) => ({ $gte: val }),
      lte: (val) => ({ $lte: val }),
      in: (arr) => ({ $in: arr }),
      and: (conds) => ({ $and: conds }),
      or: (conds) => ({ $or: conds }),
      inc: (val) => ({ $inc: val })
    }
  };
}

/**
 * 佣金断言助手
 * @param {object} actual - 实际佣金分配
 * @param {object} expected - 预期佣金分配
 * @param {number} orderAmount - 订单金额
 */
function assertCommissionEqual(actual, expected, orderAmount) {
  // 验证佣金总额
  const actualTotal = Object.values(actual).reduce((sum, val) => sum + val, 0);
  const expectedTotal = orderAmount * 0.20; // 佣金池是订单金额的20%

  assert.strictEqual(
    actualTotal.toFixed(2),
    expectedTotal.toFixed(2),
    `佣金总额应为${expectedTotal}元，实际为${actualTotal}元`
  );

  // 验证各级佣金分配
  Object.keys(expected).forEach(level => {
    assert.strictEqual(
      actual[level].toFixed(2),
      expected[level].toFixed(2),
      `${level}级佣金应为${expected[level]}元，实际为${actual[level]}元`
    );
  });
}

/**
 * 异步等待工具
 * @param {number} ms - 等待毫秒数
 */
async function waitAsync(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 测试环境初始化
 */
async function setupTestEnv() {
  // 初始化测试数据和环境
  console.log('🧪 测试环境初始化...');
}

/**
 * 测试环境清理
 */
async function cleanupTestEnv() {
  // 清理测试数据
  console.log('🧹 测试环境清理...');
}

module.exports = {
  createMockContext,
  createMockDatabase,
  assertCommissionEqual,
  waitAsync,
  setupTestEnv,
  cleanupTestEnv
};
```

- [ ] **Step 2: 创建测试优先级配置文件**

```javascript
// tests/helpers/test-priority.js

/**
 * 测试优先级配置
 * P0: 核心业务逻辑（必须100%通过）
 * P1: 重要功能（≥95%通过率）
 * P2: 辅助功能（≥90%通过率）
 * P3: 锦上添花功能（可后续补充）
 */
module.exports = {
  P0_CRITICAL: {
    description: '核心业务逻辑',
    tests: [
      'commission-calculation',
      'order-validation',
      'payment-process',
      'inventory-deduction'
    ],
    requiredPassRate: 100
  },

  P1_HIGH: {
    description: '重要功能',
    tests: [
      'user-registration',
      'promotion-system',
      'product-management',
      'refund-process'
    ],
    requiredPassRate: 95
  },

  P2_MEDIUM: {
    description: '辅助功能',
    tests: [
      'coupon-system',
      'address-management',
      'wallet-management'
    ],
    requiredPassRate: 90
  },

  P3_LOW: {
    description: '锦上添花功能',
    tests: [
      'ui-interactions',
      'animation-effects',
      'analytics-tracking'
    ],
    requiredPassRate: 85
  },

  /**
   * 根据优先级获取测试
   * @param {string} priority - 优先级 (P0_CRITICAL, P1_HIGH, etc.)
   */
  getTestsByPriority(priority) {
    return this[priority]?.tests || [];
  },

  /**
   * 获取测试的优先级
   * @param {string} testName - 测试名称
   */
  getTestPriority(testName) {
    for (const [priority, config] of Object.entries(this)) {
      if (config.tests && config.tests.includes(testName)) {
        return priority;
      }
    }
    return 'P3_LOW';
  }
};
```

- [ ] **Step 3: 创建错误处理文件**

```javascript
// tests/helpers/error-handler.js
const assert = require('assert');

/**
 * 标准化错误断言
 * @param {object} actual - 实际错误对象
 * @param {number} expectedCode - 预期错误码
 * @param {string} expectedMessage - 预期错误信息（部分匹配）
 */
function assertError(actual, expectedCode, expectedMessage) {
  assert.ok(actual, '应该返回错误对象');
  assert.strictEqual(actual.code, expectedCode, `错误码应为${expectedCode}，实际为${actual.code}`);
  assert.ok(
    actual.message?.includes(expectedMessage) || actual.msg?.includes(expectedMessage),
    `错误信息应包含"${expectedMessage}"，实际为"${actual.message || actual.msg}"`
  );
}

/**
 * 错误日志记录
 * @param {string} testName - 测试名称
 * @param {Error} error - 错误对象
 */
function logError(testName, error) {
  console.error(`❌ [${testName}] Error:`, {
    message: error.message,
    stack: error.stack,
    code: error.code
  });
}

/**
 * 详细错误报告生成
 * @param {Array} failedTests - 失败的测试列表
 * @returns {string} 格式化的错误报告
 */
function generateErrorReport(failedTests) {
  let report = '\n❌ 失败测试详情:\n';

  failedTests.forEach((test, index) => {
    report += `\n${index + 1}. ${test.name}\n`;
    report += `   位置: ${test.file}:${test.line}\n`;
    report += `   错误: ${test.error}\n`;
    if (test.snapshot) {
      report += `   快照: ${test.snapshot}\n`;
    }
  });

  return report;
}

/**
 * 测试结果统计
 * @param {object} results - 测试结果对象
 * @returns {object} 统计信息
 */
function getTestStatistics(results) {
  const total = results.passed + results.failed + results.skipped;
  const passRate = total > 0 ? ((results.passed / total) * 100).toFixed(2) : 0;

  return {
    total,
    passed: results.passed,
    failed: results.failed,
    skipped: results.skipped,
    passRate: `${passRate}%`,
    duration: results.duration || 0
  };
}

module.exports = {
  assertError,
  logError,
  generateErrorReport,
  getTestStatistics
};
```

- [ ] **Step 4: 创建Mock数据索引文件**

```javascript
// tests/helpers/mock-data/index.js

const users = require('./users');
const products = require('./products');
const orders = require('./orders');
const promotionRelations = require('./promotion-relations');
const wallets = require('./wallets');

module.exports = {
  users,
  products,
  orders,
  promotionRelations,
  wallets
};
```

- [ ] **Step 5: 运行验证测试文件创建成功**

```bash
# 检查文件是否存在
ls -la tests/helpers/

# 验证Node.js语法
node -c tests/helpers/test-utils.js
node -c tests/helpers/test-priority.js
node -c tests/helpers/error-handler.js
```

Expected: 所有文件语法正确，无错误输出

- [ ] **Step 6: 提交测试基础设施代码**

```bash
git add tests/helpers/
git commit -m "feat: 搭建测试基础设施

- 创建测试工具函数（test-utils.js）
- 创建测试优先级配置（test-priority.js）
- 创建错误处理模块（error-handler.js）
- 创建Mock数据索引（mock-data/index.js）

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

### Task 2: 创建Mock数据文件

**Files:**
- Create: `tests/helpers/mock-data/users.js`
- Create: `tests/helpers/mock-data/products.js`
- Create: `tests/helpers/mock-data/orders.js`
- Create: `tests/helpers/mock-data/promotion-relations.js`
- Create: `tests/helpers/mock-data/wallets.js`

- [ ] **Step 1: 创建用户Mock数据**

```javascript
// tests/helpers/mock-data/users.js

/**
 * 用户Mock数据
 * 包含不同级别的用户用于测试
 */
module.exports = {
  // 金牌推广员（Level 1）
  level1: {
    _id: 'user_level1_001',
    _openid: 'openid_level1_001',
    name: '金牌推广员',
    phone: '13800000001',
    agentLevel: 1, // AgentLevel.LEVEL_1
    promotionPath: '', // 无上级
    performance: {
      totalSales: 150000, // 累计15万
      monthSales: 80000,  // 本月8万
      monthTag: '2026-03',
      teamCount: 250      // 团队250人
    },
    createTime: new Date('2025-01-01')
  },

  // 银牌推广员（Level 2）
  level2: {
    _id: 'user_level2_001',
    _openid: 'openid_level2_001',
    name: '银牌推广员',
    phone: '13800000002',
    agentLevel: 2, // AgentLevel.LEVEL_2
    promotionPath: 'user_level1_001', // 上级是金牌
    performance: {
      totalSales: 80000,
      monthSales: 60000,
      monthTag: '2026-03',
      teamCount: 80
    },
    createTime: new Date('2025-06-01')
  },

  // 铜牌推广员（Level 3）
  level3: {
    _id: 'user_level3_001',
    _openid: 'openid_level3_001',
    name: '铜牌推广员',
    phone: '13800000003',
    agentLevel: 3, // AgentLevel.LEVEL_3
    promotionPath: 'user_level2_001/user_level1_001', // 上级路径
    performance: {
      totalSales: 25000,
      monthSales: 30000,
      monthTag: '2026-03',
      teamCount: 30
    },
    createTime: new Date('2025-10-01')
  },

  // 普通会员（Level 4）
  level4: {
    _id: 'user_level4_001',
    _openid: 'openid_level4_001',
    name: '普通会员',
    phone: '13800000004',
    agentLevel: 4, // AgentLevel.LEVEL_4
    promotionPath: 'user_level3_001/user_level2_001/user_level1_001',
    performance: {
      totalSales: 5000,
      monthSales: 8000,
      monthTag: '2026-03',
      teamCount: 5
    },
    createTime: new Date('2026-01-01')
  },

  // 新注册用户（无级别）
  newUser: {
    _id: 'user_new_001',
    _openid: 'openid_new_001',
    name: '新用户',
    phone: '13800000005',
    agentLevel: 4, // 默认为4级
    promotionPath: '',
    performance: {
      totalSales: 0,
      monthSales: 0,
      monthTag: '2026-03',
      teamCount: 0
    },
    createTime: new Date()
  },

  // 测试用普通用户
  regularUser: {
    _id: 'user_regular_001',
    _openid: 'openid_regular_001',
    name: '普通用户',
    phone: '13800000006',
    agentLevel: 4,
    promotionPath: '',
    performance: {
      totalSales: 1000,
      monthSales: 500,
      monthTag: '2026-03',
      teamCount: 0
    },
    createTime: new Date('2026-02-01')
  }
};
```

- [ ] **Step 2: 创建商品Mock数据**

```javascript
// tests/helpers/mock-data/products.js

/**
 * 商品Mock数据
 * 包含不同状态的商品用于测试
 */
module.exports = {
  // 上架商品
  active: {
    _id: 'product_active_001',
    name: '大友元气精酿啤酒',
    enName: 'Dayou Vitality Craft Beer',
    category: '鲜啤外带',
    price: 2800, // 28元（单位：分）
    originalPrice: 3500,
    images: ['https://example.com/beer1.jpg'],
    isActive: true,
    stock: 100,
    sales: 50,
    isHot: true,
    isNew: false,
    brewery: '大友元气精酿',
    alcoholContent: 5,
    volume: 500,
    specs: '酒精度≥5% / 麦芽浓度12°P',
    rating: 4.5,
    sort: 1,
    createTime: new Date('2025-01-01')
  },

  // 下架商品
  inactive: {
    _id: 'product_inactive_001',
    name: '已下架啤酒',
    enName: 'Delisted Beer',
    category: '鲜啤外带',
    price: 3000,
    originalPrice: 3000,
    images: ['https://example.com/beer2.jpg'],
    isActive: false, // 已下架
    stock: 50,
    sales: 10,
    isHot: false,
    isNew: false,
    brewery: '大友元气精酿',
    alcoholContent: 4,
    volume: 330,
    specs: '酒精度≥4%',
    rating: 4.0,
    sort: 999,
    createTime: new Date('2025-01-01')
  },

  // 无库存商品
  outOfStock: {
    _id: 'product_nostock_001',
    name: '缺货啤酒',
    enName: 'Out of Stock Beer',
    category: '套餐',
    price: 4500,
    originalPrice: 5000,
    images: ['https://example.com/beer3.jpg'],
    isActive: true,
    stock: 0, // 无库存
    sales: 200,
    isHot: false,
    isNew: false,
    brewery: '大友元气精酿',
    alcoholContent: 6,
    volume: 500,
    specs: '酒精度≥6%',
    rating: 4.8,
    sort: 2,
    createTime: new Date('2025-01-01')
  },

  // 热门商品
  hot: {
    _id: 'product_hot_001',
    name: '人气精酿',
    enName: 'Popular Craft Beer',
    category: '鲜啤外带',
    price: 3200,
    originalPrice: 3800,
    images: ['https://example.com/beer4.jpg'],
    isActive: true,
    stock: 80,
    sales: 500,
    isHot: true, // 热门
    isNew: false,
    brewery: '大友元气精酿',
    alcoholContent: 5.5,
    volume: 500,
    specs: '酒精度≥5.5%',
    rating: 4.7,
    sort: 3,
    createTime: new Date('2025-01-01')
  },

  // 新品
  new: {
    _id: 'product_new_001',
    name: '新品精酿',
    enName: 'New Craft Beer',
    category: '套餐',
    price: 4800,
    originalPrice: 4800,
    images: ['https://example.com/beer5.jpg'],
    isActive: true,
    stock: 60,
    sales: 5,
    isHot: false,
    isNew: true, // 新品
    brewery: '大友元气精酿',
    alcoholContent: 7,
    volume: 750,
    specs: '酒精度≥7%',
    rating: 4.6,
    sort: 4,
    createTime: new Date('2026-03-01')
  },

  // 多规格商品
  multiSpec: {
    _id: 'product_multispec_001',
    name: '多规格精酿套装',
    enName: 'Multi-Spec Craft Beer Set',
    category: '套餐',
    price: 8800,
    originalPrice: 10000,
    images: ['https://example.com/set.jpg'],
    isActive: true,
    stock: 30,
    sales: 45,
    isHot: false,
    isNew: false,
    brewery: '大友元气精酿',
    alcoholContent: 5,
    volume: 1500,
    specs: '330ml x 3瓶',
    rating: 4.9,
    sort: 5,
    createTime: new Date('2025-02-01')
  }
};
```

- [ ] **Step 3: 创建订单Mock数据**

```javascript
// tests/helpers/mock-data/orders.js

/**
 * 订单Mock数据
 * 包含不同状态的订单用于测试
 */
module.exports = {
  // 待支付订单
  pending: {
    _id: 'order_pending_001',
    orderNo: 'ON2026031400001',
    userId: 'user_level4_001',
    items: [{
      productId: 'product_active_001',
      productName: '大友元气精酿啤酒',
      quantity: 2,
      price: 2800,
      specs: '500ml'
    }],
    totalAmount: 5600,
    actualAmount: 5600,
    status: 'pending', // 待支付
    paymentMethod: '',
    createTime: new Date(),
    payTime: null,
    address: {
      userName: '张三',
      phone: '13800000004',
      province: '北京市',
      city: '北京市',
      district: '朝阳区',
      detail: 'xxx街道xxx号'
    }
  },

  // 已支付订单
  paid: {
    _id: 'order_paid_001',
    orderNo: 'ON2026031400002',
    userId: 'user_level4_001',
    items: [{
      productId: 'product_active_001',
      productName: '大友元气精酿啤酒',
      quantity: 1,
      price: 2800,
      specs: '500ml'
    }],
    totalAmount: 2800,
    actualAmount: 2800,
    status: 'paid', // 已支付
    paymentMethod: 'balance',
    createTime: new Date(Date.now() - 3600000),
    payTime: new Date(Date.now() - 3000000),
    address: {
      userName: '张三',
      phone: '13800000004',
      province: '北京市',
      city: '北京市',
      district: '朝阳区',
      detail: 'xxx街道xxx号'
    }
  },

  // 已完成订单
  completed: {
    _id: 'order_completed_001',
    orderNo: 'ON2026031300001',
    userId: 'user_regular_001',
    items: [{
      productId: 'product_hot_001',
      productName: '人气精酿',
      quantity: 3,
      price: 3200,
      specs: '500ml'
    }],
    totalAmount: 9600,
    actualAmount: 9600,
    status: 'completed', // 已完成
    paymentMethod: 'wechat',
    createTime: new Date('2026-03-13'),
    payTime: new Date('2026-03-13'),
    completeTime: new Date('2026-03-14'),
    address: {
      userName: '李四',
      phone: '13800000006',
      province: '上海市',
      city: '上海市',
      district: '浦东新区',
      detail: 'yyy路yyy号'
    }
  },

  // 已退款订单
  refunded: {
    _id: 'order_refunded_001',
    orderNo: 'ON2026031200001',
    userId: 'user_level3_001',
    items: [{
      productId: 'product_active_001',
      productName: '大友元气精酿啤酒',
      quantity: 1,
      price: 2800,
      specs: '500ml'
    }],
    totalAmount: 2800,
    actualAmount: 2800,
    status: 'refunded', // 已退款
    paymentMethod: 'balance',
    createTime: new Date('2026-03-12'),
    payTime: new Date('2026-03-12'),
    refundTime: new Date('2026-03-13'),
    refundReason: '不想要了',
    address: {
      userName: '王五',
      phone: '13800000003',
      province: '广州市',
      city: '广州市',
      district: '天河区',
      detail: 'zzz大道zzz号'
    }
  },

  // 大额订单（用于佣金测试）
  largeOrder: {
    _id: 'order_large_001',
    orderNo: 'ON2026031400003',
    userId: 'user_level4_001',
    items: [{
      productId: 'product_multispec_001',
      productName: '多规格精酿套装',
      quantity: 10,
      price: 8800,
      specs: '1500ml'
    }],
    totalAmount: 88000, // 880元
    actualAmount: 88000,
    status: 'paid',
    paymentMethod: 'wechat',
    createTime: new Date(),
    payTime: new Date(),
    address: {
      userName: '赵六',
      phone: '13800000004',
      province: '深圳市',
      city: '深圳市',
      district: '南山区',
      detail: 'aaa路aaa号'
    }
  }
};
```

- [ ] **Step 4: 创建推广关系Mock数据**

```javascript
// tests/helpers/mock-data/promotion-relations.js

/**
 * 推广关系Mock数据
 * 用于测试推广关系建立和佣金分配
 */
module.exports = {
  // 简单的2级关系
  simple: {
    _id: 'relation_simple_001',
    parentId: 'user_level2_001',
    childId: 'user_level3_001',
    level: 2, // 2级关系
    createTime: new Date('2025-10-01')
  },

  // 复杂的4级关系
  complex: {
    level1ToLevel2: {
      _id: 'relation_l1_l2_001',
      parentId: 'user_level1_001',
      childId: 'user_level2_001',
      level: 1,
      createTime: new Date('2025-06-01')
    },
    level2ToLevel3: {
      _id: 'relation_l2_l3_001',
      parentId: 'user_level2_001',
      childId: 'user_level3_001',
      level: 2,
      createTime: new Date('2025-10-01')
    },
    level3ToLevel4: {
      _id: 'relation_l3_l4_001',
      parentId: 'user_level3_001',
      childId: 'user_level4_001',
      level: 3,
      createTime: new Date('2026-01-01')
    }
  },

  // 新用户注册关系
  newUser: {
    _id: 'relation_new_001',
    parentId: 'user_level4_001', // 由4级推广员推荐
    childId: 'user_new_001',
    level: 4,
    inviteCode: 'INVITE001',
    createTime: new Date()
  },

  // 边界情况：5级关系（不应存在）
  edge: {
    level4ToLevel5: {
      _id: 'relation_edge_001',
      parentId: 'user_level4_001',
      childId: 'user_level5_invalid', // 5级用户（无效）
      level: 4,
      createTime: new Date()
    }
  },

  // 团队统计数据
  teamStats: {
    level1: {
      directCount: 5,   // 直推5人
      teamCount: 250,   // 团队250人
      totalSales: 150000 // 累计销售额15万
    },
    level2: {
      directCount: 10,
      teamCount: 80,
      totalSales: 80000
    },
    level3: {
      directCount: 15,
      teamCount: 30,
      totalSales: 25000
    },
    level4: {
      directCount: 3,
      teamCount: 5,
      totalSales: 5000
    }
  }
};
```

- [ ] **Step 5: 创建钱包Mock数据**

```javascript
// tests/helpers/mock-data/wallets.js

/**
 * 钱包Mock数据
 * 用于测试钱包余额、充值、提现等功能
 */
module.exports = {
  // 有余额钱包
  withBalance: {
    _id: 'wallet_with_balance_001',
    userId: 'user_level3_001',
    balance: 50000, // 500元（单位：分）
    totalRecharge: 100000, // 累计充值1000元
    totalConsumption: 50000, // 累计消费500元
    createTime: new Date('2025-10-01'),
    updateTime: new Date()
  },

  // 空钱包
  empty: {
    _id: 'wallet_empty_001',
    userId: 'user_level4_001',
    balance: 0,
    totalRecharge: 0,
    totalConsumption: 0,
    createTime: new Date('2026-01-01'),
    updateTime: new Date()
  },

  // 大额钱包
  large: {
    _id: 'wallet_large_001',
    userId: 'user_level1_001',
    balance: 500000, // 5000元
    totalRecharge: 1000000, // 累计充值10000元
    totalConsumption: 500000, // 累计消费5000元
    createTime: new Date('2025-01-01'),
    updateTime: new Date()
  },

  // 钱包交易记录
  transactions: {
    recharge: {
      _id: 'txn_recharge_001',
      walletId: 'wallet_with_balance_001',
      type: 'recharge', // 充值
      amount: 10000, // 100元
      balanceBefore: 40000,
      balanceAfter: 50000,
      status: 'completed',
      description: '余额充值',
      createTime: new Date()
    },
    consumption: {
      _id: 'txn_consumption_001',
      walletId: 'wallet_with_balance_001',
      type: 'consumption', // 消费
      amount: -2800, // -28元
      balanceBefore: 50000,
      balanceAfter: 47200,
      status: 'completed',
      description: '订单支付',
      orderId: 'order_paid_001',
      createTime: new Date()
    },
    refund: {
      _id: 'txn_refund_001',
      walletId: 'wallet_with_balance_001',
      type: 'refund', // 退款
      amount: 2800, // 28元
      balanceBefore: 47200,
      balanceAfter: 50000,
      status: 'completed',
      description: '订单退款',
      orderId: 'order_refunded_001',
      createTime: new Date()
    }
  }
};
```

- [ ] **Step 6: 验证Mock数据文件创建成功**

```bash
# 检查文件创建
ls -la tests/helpers/mock-data/

# 验证语法
node -c tests/helpers/mock-data/users.js
node -c tests/helpers/mock-data/products.js
node -c tests/helpers/mock-data/orders.js
node -c tests/helpers/mock-data/promotion-relations.js
node -c tests/helpers/mock-data/wallets.js
```

Expected: 所有文件语法正确

- [ ] **Step 7: 提交Mock数据代码**

```bash
git add tests/helpers/mock-data/
git commit -m "feat: 添加测试Mock数据

- 创建用户Mock数据（不同级别用户）
- 创建商品Mock数据（不同状态商品）
- 创建订单Mock数据（不同状态订单）
- 创建推广关系Mock数据（多层关系）
- 创建钱包Mock数据（余额和交易记录）

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

### Task 3: 更新package.json测试脚本

**Files:**
- Modify: `package.json`

- [ ] **Step 1: 添加新的测试脚本到package.json**

在package.json的scripts部分添加：

```json
{
  "scripts": {
    "test:unit": "vitest run tests/unit --reporter=verbose",
    "test:flows": "vitest run tests/integration/business-flows",
    "test:scenarios": "vitest run tests/scenarios",
    "test:business": "npm run test:unit && npm run test:flows && npm run test:scenarios",
    "test:business:watch": "vitest watch tests/unit tests/integration/business-flows tests/scenarios",
    "test:business:coverage": "vitest run --coverage tests/unit tests/integration/business-flows tests/scenarios",
    "test:p0": "vitest run tests/unit/commission tests/unit/order --reporter=verbose",
    "test:p1": "vitest run tests/unit/promotion tests/unit/product tests/unit/admin --reporter=verbose"
  }
}
```

- [ ] **Step 2: 验证package.json语法**

```bash
# 验证JSON格式
cat package.json | jq .scripts > /dev/null
echo $?  # 应该输出0
```

Expected: JSON格式正确，无语法错误

- [ ] **Step 3: 提交package.json更新**

```bash
git add package.json
git commit -m "feat: 添加核心业务测试脚本

- test:unit - 运行单元测试
- test:flows - 运行业务流程测试
- test:scenarios - 运行场景测试
- test:business - 运行所有业务测试
- test:p0 - 运行P0级核心测试
- test:p1 - 运行P1级重要测试

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Chunk 2: P0级核心业务逻辑测试（单元测试）

### Task 4: 佣金计算测试

**Files:**
- Create: `tests/unit/commission/commission-calculation.test.js`
- Reference: `cloudfunctions/common/constants.js` (佣金规则)
- Reference: `cloudfunctions/common/reward-settlement.js` (佣金计算逻辑)

- [ ] **Step 1: 创建佣金计算测试文件**

```javascript
// tests/unit/commission/commission-calculation.test.js
/**
 * 佣金计算单元测试
 *
 * 测试四层推广佣金分配规则（佣金池为订单金额的20%）：
 * - Level 1 (金牌): 自己拿20%
 * - Level 2 (银牌): 自己拿12%，直接上级拿8%
 * - Level 3 (铜牌): 自己拿12%，两级上级各拿4%
 * - Level 4 (普通): 自己拿8%，三级上级各拿4%
 */

const assert = require('assert');
const { calculateCommissionRewards } = require('../../../../cloudfunctions/common/reward-settlement');

describe('佣金计算测试', () => {

  describe('Level 1 推广员佣金计算', () => {

    it('应该正确计算Level 1推广员的佣金（自己拿20%）', () => {
      // Arrange
      const orderAmount = 10000; // 100元
      const agentLevel = 1; // Level 1

      // Act
      const result = calculateCommissionRewards(orderAmount, agentLevel);

      // Assert
      assert.strictEqual(result.totalCommission, 2000, '佣金总额应为20元');
      assert.strictEqual(result.selfCommission, 2000, '自己应拿20元');
      assert.strictEqual(result.upstreamCommissions.length, 0, '无上级佣金');
      assert.deepStrictEqual(result.upstreamCommissions, [], '上级佣金数组应为空');

      console.log('✅ Level 1推广员佣金计算正确：20元（100元×20%）');
    });

    it('应该正确处理大额订单', () => {
      // Arrange
      const orderAmount = 100000; // 1000元
      const agentLevel = 1;

      // Act
      const result = calculateCommissionRewards(orderAmount, agentLevel);

      // Assert
      assert.strictEqual(result.totalCommission, 20000, '佣金总额应为200元');
      assert.strictEqual(result.selfCommission, 20000, '自己应拿200元');

      console.log('✅ Level 1推广员大额订单佣金计算正确：200元（1000元×20%）');
    });

    it('应该正确处理小额订单', () => {
      // Arrange
      const orderAmount = 1000; // 10元
      const agentLevel = 1;

      // Act
      const result = calculateCommissionRewards(orderAmount, agentLevel);

      // Assert
      assert.strictEqual(result.totalCommission, 200, '佣金总额应为2元');
      assert.strictEqual(result.selfCommission, 200, '自己应拿2元');

      console.log('✅ Level 1推广员小额订单佣金计算正确：2元（10元×20%）');
    });
  });

  describe('Level 2 推广员佣金计算', () => {

    it('应该正确计算Level 2推广员的佣金（自己12%，上级8%）', () => {
      // Arrange
      const orderAmount = 10000; // 100元
      const agentLevel = 2; // Level 2

      // Act
      const result = calculateCommissionRewards(orderAmount, agentLevel);

      // Assert
      assert.strictEqual(result.totalCommission, 2000, '佣金总额应为20元');
      assert.strictEqual(result.selfCommission, 1200, '自己应拿12元');
      assert.strictEqual(result.upstreamCommissions.length, 1, '应有1个上级');
      assert.strictEqual(result.upstreamCommissions[0], 800, '直接上级应拿8元');

      console.log('✅ Level 2推广员佣金计算正确：自己12元 + 上级8元 = 20元');
    });

    it('应该正确分配佣金给直接上级', () => {
      // Arrange
      const orderAmount = 50000; // 500元
      const agentLevel = 2;

      // Act
      const result = calculateCommissionRewards(orderAmount, agentLevel);

      // Assert
      assert.strictEqual(result.selfCommission, 6000, '自己应拿60元');
      assert.strictEqual(result.upstreamCommissions[0], 4000, '直接上级应拿40元');
      assert.strictEqual(result.selfCommission + result.upstreamCommissions[0], 10000, '佣金总额应为100元');

      console.log('✅ Level 2推广员大额订单佣金分配正确');
    });
  });

  describe('Level 3 推广员佣金计算', () => {

    it('应该正确计算Level 3推广员的佣金（自己12%，两级上级各4%）', () => {
      // Arrange
      const orderAmount = 10000; // 100元
      const agentLevel = 3; // Level 3

      // Act
      const result = calculateCommissionRewards(orderAmount, agentLevel);

      // Assert
      assert.strictEqual(result.totalCommission, 2000, '佣金总额应为20元');
      assert.strictEqual(result.selfCommission, 1200, '自己应拿12元');
      assert.strictEqual(result.upstreamCommissions.length, 2, '应有2个上级');
      assert.strictEqual(result.upstreamCommissions[0], 400, '直接上级应拿4元');
      assert.strictEqual(result.upstreamCommissions[1], 400, '再上级应拿4元');
      assert.strictEqual(
        result.selfCommission + result.upstreamCommissions[0] + result.upstreamCommissions[1],
        2000,
        '佣金总额应为20元'
      );

      console.log('✅ Level 3推广员佣金计算正确：自己12元 + 两级上级各4元 = 20元');
    });

    it('应该正确分配佣金给两级上级', () => {
      // Arrange
      const orderAmount = 25000; // 250元
      const agentLevel = 3;

      // Act
      const result = calculateCommissionRewards(orderAmount, agentLevel);

      // Assert
      assert.strictEqual(result.selfCommission, 3000, '自己应拿30元');
      assert.strictEqual(result.upstreamCommissions[0], 1000, '直接上级应拿10元');
      assert.strictEqual(result.upstreamCommissions[1], 1000, '再上级应拿10元');

      console.log('✅ Level 3推广员大额订单佣金分配正确');
    });
  });

  describe('Level 4 推广员佣金计算', () => {

    it('应该正确计算Level 4推广员的佣金（自己8%，三级上级各4%）', () => {
      // Arrange
      const orderAmount = 10000; // 100元
      const agentLevel = 4; // Level 4

      // Act
      const result = calculateCommissionRewards(orderAmount, agentLevel);

      // Assert
      assert.strictEqual(result.totalCommission, 2000, '佣金总额应为20元');
      assert.strictEqual(result.selfCommission, 800, '自己应拿8元');
      assert.strictEqual(result.upstreamCommissions.length, 3, '应有3个上级');
      assert.strictEqual(result.upstreamCommissions[0], 400, '直接上级应拿4元');
      assert.strictEqual(result.upstreamCommissions[1], 400, '再上级应拿4元');
      assert.strictEqual(result.upstreamCommissions[2], 400, '更上级应拿4元');
      assert.strictEqual(
        result.selfCommission +
        result.upstreamCommissions[0] +
        result.upstreamCommissions[1] +
        result.upstreamCommissions[2],
        2000,
        '佣金总额应为20元'
      );

      console.log('✅ Level 4推广员佣金计算正确：自己8元 + 三级上级各4元 = 20元');
    });

    it('应该正确分配佣金给三级上级', () => {
      // Arrange
      const orderAmount = 50000; // 500元
      const agentLevel = 4;

      // Act
      const result = calculateCommissionRewards(orderAmount, agentLevel);

      // Assert
      assert.strictEqual(result.selfCommission, 4000, '自己应拿40元');
      assert.strictEqual(result.upstreamCommissions[0], 2000, '直接上级应拿20元');
      assert.strictEqual(result.upstreamCommissions[1], 2000, '再上级应拿20元');
      assert.strictEqual(result.upstreamCommissions[2], 2000, '更上级应拿20元');

      console.log('✅ Level 4推广员大额订单佣金分配正确');
    });
  });

  describe('边界情况和异常处理', () => {

    it('佣金总额应该始终是订单金额的20%', () => {
      // Test various order amounts
      const testAmounts = [1000, 5000, 10000, 50000, 100000, 500000];

      testAmounts.forEach(orderAmount => {
        [1, 2, 3, 4].forEach(level => {
          const result = calculateCommissionRewards(orderAmount, level);
          const totalCommission = result.selfCommission + result.upstreamCommissions.reduce((sum, val) => sum + val, 0);

          assert.strictEqual(
            totalCommission,
            orderAmount * 0.20,
            `订单${orderAmount}元，Level ${level}推广员，佣金应为${orderAmount * 0.20}元`
          );
        });
      });

      console.log('✅ 佣金总额始终为订单金额的20%');
    });

    it('应该处理0元订单', () => {
      // Arrange
      const orderAmount = 0;
      const agentLevel = 1;

      // Act
      const result = calculateCommissionRewards(orderAmount, agentLevel);

      // Assert
      assert.strictEqual(result.totalCommission, 0, '0元订单佣金应为0');
      assert.strictEqual(result.selfCommission, 0, '自己佣金应为0');

      console.log('✅ 正确处理0元订单');
    });

    it('应该拒绝负数订单金额', () => {
      // Arrange
      const orderAmount = -10000;
      const agentLevel = 1;

      // Act & Assert
      assert.throws(
        () => calculateCommissionRewards(orderAmount, agentLevel),
        /订单金额不能为负数/,
        '应该抛出错误'
      );

      console.log('✅ 正确拒绝负数订单金额');
    });

    it('应该拒绝无效的推广员级别', () => {
      // Arrange
      const orderAmount = 10000;
      const invalidLevel = 5; // 无效级别

      // Act & Assert
      assert.throws(
        () => calculateCommissionRewards(orderAmount, invalidLevel),
        /无效的推广员级别/,
        '应该抛出错误'
      );

      console.log('✅ 正确拒绝无效的推广员级别');
    });
  });

  describe('佣金分配准确性验证', () => {

    it('所有级别的佣金分配总和应该等于佣金池', () => {
      // Arrange
      const orderAmount = 10000; // 100元
      const commissionPool = orderAmount * 0.20; // 20元

      // Act & Assert for each level
      [1, 2, 3, 4].forEach(level => {
        const result = calculateCommissionRewards(orderAmount, level);
        const totalDistributed = result.selfCommission + result.upstreamCommissions.reduce((sum, val) => sum + val, 0);

        assert.strictEqual(
          totalDistributed,
          commissionPool,
          `Level ${level}的佣金分配总额应等于佣金池`
        );
      });

      console.log('✅ 所有级别的佣金分配总和等于佣金池');
    });

    it('佣金分配应该精确到分，无四舍五入误差', () => {
      // Arrange - 使用会产生小数的金额
      const orderAmount = 3333; // 33.33元
      const agentLevel = 4;

      // Act
      const result = calculateCommissionRewards(orderAmount, agentLevel);

      // Assert
      const totalDistributed = result.selfCommission + result.upstreamCommissions.reduce((sum, val) => sum + val, 0);
      const expectedCommission = Math.round(orderAmount * 0.20); // 应该是666分

      assert.strictEqual(totalDistributed, expectedCommission, '佣金分配应该精确到分');
      assert.strictEqual(
        result.selfCommission + result.upstreamCommissions.reduce((sum, val) => sum + val, 0),
        expectedCommission,
        '佣金分配总和应该精确匹配'
      );

      console.log('✅ 佣金分配精确到分，无四舍五入误差');
    });
  });
});

// 运行测试的入口
if (require.main === module) {
  console.log('🧪 开始执行佣金计算测试...\n');
  // 测试会自动运行
}
```

**注意**: 此测试假设 `cloudfunctions/common/reward-settlement.js` 中有 `calculateCommissionRewards` 函数。如果实际函数名或接口不同，需要相应调整。

- [ ] **Step 2: 验证reward-settlement.js函数接口**

```bash
# 检查reward-settlement.js文件
cat cloudfunctions/common/reward-settlement.js | grep "function\|exports" | head -20
```

Expected: 找到佣金计算相关的函数导出

- [ ] **Step 3: 运行佣金计算测试**

```bash
# 确保在项目根目录
node tests/unit/commission/commission-calculation.test.js
```

Expected Output:
```
🧪 开始执行佣金计算测试...

✅ Level 1推广员佣金计算正确：20元（100元×20%）
✅ Level 1推广员大额订单佣金计算正确：200元（1000元×20%）
✅ Level 1推广员小额订单佣金计算正确：2元（10元×20%）
✅ Level 2推广员佣金计算正确：自己12元 + 上级8元 = 20元
✅ Level 2推广员大额订单佣金分配正确
✅ Level 3推广员佣金计算正确：自己12元 + 两级上级各4元 = 20元
✅ Level 3推广员大额订单佣金分配正确
✅ Level 4推广员佣金计算正确：自己8元 + 三级上级各4元 = 20元
✅ Level 4推广员大额订单佣金分配正确
✅ 佣金总额始终为订单金额的20%
✅ 正确处理0元订单
✅ 正确拒绝负数订单金额
✅ 正确拒绝无效的推广员级别
✅ 所有级别的佣金分配总和等于佣金池
✅ 佣金分配精确到分，无四舍五入误差

🎉 所有佣金计算测试通过！
```

**Note**: 如果实际函数接口与假设不同，测试可能会失败。需要根据实际情况调整测试代码。

- [ ] **Step 4: 根据实际接口调整测试（如果需要）**

如果步骤3失败，检查实际的佣金计算函数并调整测试代码。

- [ ] **Step 5: 提交佣金计算测试**

```bash
git add tests/unit/commission/
git commit -m "feat: 添加佣金计算单元测试

P0级核心测试：
- Level 1推广员：自己拿20%
- Level 2推广员：自己拿12% + 直接上级8%
- Level 3推广员：自己拿12% + 两级上级各4%
- Level 4推广员：自己拿8% + 三级上级各4%
- 边界情况：0元订单、负数金额、无效级别
- 精确性验证：佣金分配精确到分

测试覆盖：
- 15个测试用例
- 覆盖所有推广级别
- 覆盖边界情况和异常处理

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## 📊 计划完成状态

**当前进度**: Chunk 1 完成 ✅，Chunk 2 进行中（Task 4）

**下一步**: 继续完成 Chunk 2 的剩余任务（订单验证测试、升级条件测试等）

**预估剩余时间**: 约2-3小时完成所有单元测试

---

**计划文档保存到**: `docs/superpowers/plans/2026-03-14-miniprogram-business-testing.md`

计划正在编写中，未完成。是否继续编写剩余部分？
