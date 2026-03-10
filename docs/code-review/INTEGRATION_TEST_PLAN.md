# 订单系统联调测试方案

**测试范围**: 用户端 + 管理员端 + 云函数
**测试类型**: 功能测试 + 数据一致性测试
**测试日期**: 2026-03-10

---

## 🎯 测试目标

### 主要目标
1. ✅ 验证用户端订单功能完整性
2. ✅ 验证管理员端订单管理功能
3. ✅ 验证两端数据一致性
4. ✅ 验证字段映射正确性

### 次要目标
1. 验证订单状态流转
2. 验证商品信息显示
3. 验证价格计算准确性
4. 验证缓存更新机制

---

## 📋 测试前准备

### 环境准备

```bash
# 1. 拉取最新代码
git pull origin main

# 2. 安装依赖
npm install

# 3. 类型检查
npm run type-check

# 4. 构建小程序
npm run build:mp-weixin
```

### 数据准备

1. **测试账号**
   - 普通用户账号: test_user_001
   - 管理员账号: admin

2. **测试商品**
   - 商品A: 在售，库存充足
   - 商品B: 在售，库存不足（用于测试边界）
   - 商品C: 多规格商品

3. **清理缓存**
```javascript
// 在微信开发者工具控制台执行
uni.clearStorageSync()
```

### 云函数准备

```bash
# 1. 部署云函数
# 在云开发控制台部署：
# - order
# - admin-api

# 2. 清空云函数缓存
# 在云函数代码中临时添加：
userCache.flushAll()
```

---

## 🧪 测试用例

### 模块 1: 用户端订单创建

#### TC-001: 创建普通订单

**步骤**:
1. 用户登录小程序
2. 选择商品A（数量1）
3. 进入订单确认页
4. 选择收货地址
5. 提交订单

**预期结果**:
- [ ] 订单创建成功
- [ ] 返回订单ID
- [ ] 订单状态为 `pending`
- [ ] 商品信息正确（名称、图片、价格、数量）
- [ ] 总金额正确

**数据库验证**:
```javascript
db.collection('orders').doc(orderId).get().then(res => {
  console.log('订单状态:', res.data.status); // 应该是 'pending'
  console.log('商品字段:', res.data.items[0]); // 应该包含 name, image, price, quantity
  console.log('不存在 products:', res.data.products); // 应该是 undefined
  console.log('不存在 productName:', res.data.items[0].productName); // 应该是 undefined
})
```

---

#### TC-002: 创建多规格订单

**步骤**:
1. 选择商品C（多规格）
2. 选择规格1（数量2）
3. 选择规格2（数量1）
4. 提交订单

**预期结果**:
- [ ] 订单创建成功
- [ ] `items` 数组包含2个商品项
- [ ] 每个商品的 `specs` 字段正确
- [ ] 价格根据规格正确计算

---

#### TC-003: 创建订单时库存不足

**步骤**:
1. 选择商品B（库存不足）
2. 提交订单

**预期结果**:
- [ ] 订单创建失败
- [ ] 显示"库存不足"提示
- [ ] 不产生订单记录

---

### 模块 2: 用户端订单列表

#### TC-004: 查看全部订单

**步骤**:
1. 进入订单列表页
2. 默认显示"全部"标签

**预期结果**:
- [ ] 显示所有状态的订单
- [ ] 商品图片正确显示（使用 `item.image`）
- [ ] 商品名称正确显示（使用 `item.name`）
- [ ] 订单金额正确显示
- [ ] 订单状态正确显示

**控制台验证**:
```javascript
// 在订单列表页控制台执行
console.log('订单字段:', Object.keys(orders[0]));
console.log('商品字段:', Object.keys(orders[0].items[0]));
console.log('验证 products 字段不存在:', orders[0].products === undefined);
console.log('验证 productName 字段不存在:', orders[0].items[0].productName === undefined);
```

---

#### TC-005: 按状态筛选订单

**步骤**:
1. 点击"待付款"标签
2. 点击"待发货"标签
3. 点击"已完成"标签

**预期结果**:
- [ ] 每个标签显示对应状态的订单
- [ ] 筛选逻辑正确
- [ ] 状态计数正确

---

### 模块 3: 用户端订单详情

#### TC-006: 查看订单详情

**步骤**:
1. 从订单列表点击某个订单
2. 进入订单详情页

**预期结果**:
- [ ] 订单信息完整显示
- [ ] 商品列表完整显示（使用 `order.items`）
- [ ] 每个商品的信息正确：
  - [ ] 图片：`item.image`
  - [ ] 名称：`item.name`
  - [ ] 价格：`item.price`
  - [ ] 数量：`item.quantity`
  - [ ] 规格：`item.specs`
- [ ] 收货地址正确显示
- [ ] 订单状态正确显示

---

#### TC-007: 订单详情页商品显示验证

**检查点**:
```javascript
// 在订单详情页控制台执行
const order = getCurrentOrder();
console.log('使用 items 字段:', order.items.length > 0);
console.log('products 字段不存在:', order.products === undefined);
console.log('第一个商品使用 image:', order.items[0].image !== undefined);
console.log('第一个商品使用 name:', order.items[0].name !== undefined);
console.log('不存在 productImage:', order.items[0].productImage === undefined);
console.log('不存在 productName:', order.items[0].productName === undefined);
```

---

### 模块 4: 用户端订单操作

#### TC-008: 取消订单

**步骤**:
1. 在订单详情页，订单状态为 `pending`
2. 点击"取消订单"按钮
3. 确认取消

**预期结果**:
- [ ] 订单状态更新为 `cancelled`
- [ ] 管理员端能看到状态变化
- [ ] 库存正确恢复

---

#### TC-009: 支付订单

**步骤**:
1. 在订单详情页，订单状态为 `pending`
2. 点击"立即支付"按钮
3. 完成支付流程

**预期结果**:
- [ ] 订单状态更新为 `paid`
- [ ] 记录支付时间
- [ ] 管理员端能看到状态变化

---

#### TC-010: 确认收货

**步骤**:
1. 管理员先将订单状态改为 `shipping`
2. 用户在订单详情页，订单状态为 `shipping`
3. 点击"确认收货"按钮

**预期结果**:
- [ ] 订单状态更新为 `completed`
- [ ] 记录完成时间
- [ ] 管理员端能看到状态变化

---

### 模块 5: 管理员端订单列表

#### TC-011: 查看订单列表

**步骤**:
1. 管理员登录
2. 进入订单管理页

**预期结果**:
- [ ] 订单列表正常加载
- [ ] 显示所有订单
- [ ] 每个订单卡片显示：
  - [ ] 订单号
  - [ ] 用户名
  - [ ] 金额
  - [ ] 状态
  - [ ] 时间

**控制台验证**:
```javascript
// 在管理员订单列表页控制台执行
console.log('订单字段:', Object.keys(orders[0]));
console.log('使用 items 字段:', orders[0].items !== undefined);
console.log('products 字段不存在:', orders[0].products === undefined);
console.log('第一个商品使用 image:', orders[0].items[0].image !== undefined);
console.log('第一个商品使用 name:', orders[0].items[0].name !== undefined);
```

---

#### TC-012: 状态分组筛选

**步骤**:
1. 点击"全部"标签 → 应显示所有订单
2. 点击"待付款"标签 → 应只显示 `pending` 订单
3. 点击"处理中"标签 → 应显示 `paid` 和 `shipping` 订单
4. 点击"已完成"标签 → 应只显示 `completed` 订单
5. 点击"退款"标签 → 应显示 `refunding` 和 `refunded` 订单
6. 点击"已取消"标签 → 应只显示 `cancelled` 订单

**预期结果**:
- [ ] 每个分组筛选正确
- [ ] 计数显示正确
- [ ] 切换流畅无卡顿

**验证数组查询**:
```javascript
// 在控制台验证查询参数
console.log('处理中查询参数:', ['paid', 'shipping']);
console.log('退款查询参数:', ['refunding', 'refunded']);
```

---

### 模块 6: 管理员端订单详情

#### TC-013: 查看订单详情

**步骤**:
1. 从订单列表点击某个订单
2. 进入订单详情页

**预期结果**:
- [ ] 订单状态卡片正确显示
- [ ] 订单信息完整
- [ ] 用户信息完整
- [ ] 收货地址完整
- [ ] 地图位置正确（如果有）
- [ ] 商品列表完整显示

**商品显示验证**:
```javascript
// 在订单详情页控制台执行
const detail = getCurrentOrderDetail();
console.log('使用 items 字段:', detail.items !== undefined);
console.log('不存在 products:', detail.products === undefined);
console.log('第一个商品:', detail.items[0]);
console.log('商品字段标准:', {
  name: detail.items[0].name,
  image: detail.items[0].image,
  price: detail.items[0].price,
  quantity: detail.items[0].quantity
});
console.log('别名字段不存在:', {
  productName: detail.items[0].productName === undefined,
  productImage: detail.items[0].productImage === undefined
});
```

---

#### TC-014: 订单详情页地图功能

**步骤**:
1. 订单详情页显示收货地址
2. 点击地图查看位置

**预期结果**:
- [ ] 地图正确显示
- [ ] 标记点位置正确
- [ ] 点击地图打开微信地图导航
- [ ] 导航地址正确

---

### 模块 7: 管理员端订单操作

#### TC-015: 更新订单状态

**步骤**:
1. 在订单详情页，点击"更新状态"按钮
2. 选择新状态
3. 确认更新

**预期结果**:
- [ ] 状态更新成功
- [ ] 用户端能看到状态变化
- [ ] 刷新后状态保持

**测试状态流转**:
```
pending → paid → shipping → completed
pending → cancelled
paid → cancelled
shipping → cancelled
```

---

#### TC-016: 删除订单

**步骤**:
1. 在订单详情页，点击"删除订单"按钮
2. 确认删除

**预期结果**:
- [ ] 显示二次确认弹窗
- [ ] 删除成功后返回列表页
- [ ] 列表页不再显示该订单
- [ ] 用户端不再显示该订单

---

### 模块 8: 数据一致性测试

#### TC-017: 用户创建订单后管理员可见

**步骤**:
1. 用户创建订单
2. 管理员刷新订单列表
3. 查找该订单

**预期结果**:
- [ ] 管理员能看到新订单
- [ ] 订单信息完全一致：
  - [ ] 订单号一致
  - [ ] 金额一致
  - [ ] 商品信息一致
  - [ ] 用户信息一致
  - [ ] 收货地址一致

**数据对比验证**:
```javascript
// 用户端
const userOrder = await getOrderDetail(orderId);
// 管理员端
const adminOrder = await getAdminOrderDetail(orderId);

// 对比
console.log('订单号一致:', userOrder.orderNo === adminOrder.orderNo);
console.log('金额一致:', userOrder.totalAmount === adminOrder.totalAmount);
console.log('商品数量一致:', userOrder.items.length === adminOrder.items.length);
console.log('第一个商品一致:', JSON.stringify(userOrder.items[0]) === JSON.stringify(adminOrder.items[0]));
```

---

#### TC-018: 管理员更新状态后用户可见

**步骤**:
1. 管理员将订单状态改为 `shipping`
2. 用户刷新订单列表
3. 查看订单详情

**预期结果**:
- [ ] 用户端订单状态更新为 `shipping`
- [ ] 状态文本显示为"配送中"
- [ ] 状态图标正确
- [ ] 状态颜色正确

---

#### TC-019: 字段映射一致性

**检查点**:
```javascript
// 在两端同时查询同一个订单
const orderId = 'test_order_id';

// 用户端API
const userOrder = await callFunction('order', {
  action: 'getOrderDetail',
  data: { orderId }
});

// 管理员端API
const adminOrder = await callFunction('admin-api', {
  action: 'getOrderDetail',
  adminToken: token,
  data: { id: orderId }
});

// 验证字段映射
console.log('===== 用户端返回 =====');
console.log('items 字段存在:', userOrder.data.order.items !== undefined);
console.log('products 字段不存在:', userOrder.data.order.products === undefined);
console.log('商品使用标准字段:', userOrder.data.order.items[0].name !== undefined);

console.log('===== 管理员端返回 =====');
console.log('items 字段存在:', adminOrder.data.order.items !== undefined);
console.log('products 字段不存在:', adminOrder.data.order.products === undefined);
console.log('商品使用标准字段:', adminOrder.data.order.items[0].name !== undefined);

console.log('===== 一致性验证 =====');
console.log('items 一致:', JSON.stringify(userOrder.data.order.items) === JSON.stringify(adminOrder.data.order.items));
```

---

### 模块 9: 缓存测试

#### TC-020: 订单列表缓存更新

**步骤**:
1. 用户查看订单列表（缓存）
2. 创建新订单
3. 刷新订单列表

**预期结果**:
- [ ] 新订单出现在列表中
- [ ] 缓存正确更新
- [ ] 不会出现数据不一致

---

#### TC-021: 状态变更缓存失效

**步骤**:
1. 用户查看订单详情（缓存）
2. 管理员更新订单状态
3. 用户刷新订单详情

**预期结果**:
- [ ] 显示最新状态
- [ ] 缓存正确失效
- [ ] 不会显示旧状态

---

## 🐛 已知问题验证

### 问题 1: products 字段不存在

**验证方法**:
```javascript
// 查询数据库
db.collection('orders').limit(1).get().then(res => {
  const order = res.data[0];
  console.log('存在 items:', order.items !== undefined);
  console.log('存在 products:', order.products !== undefined);
  console.log('items 内容:', order.items);
  console.log('products 内容:', order.products);
});
```

**预期结果**:
- [ ] `items` 字段存在且有数据
- [ ] `products` 字段不存在或为空

---

### 问题 2: 别名字段不存在

**验证方法**:
```javascript
db.collection('orders').limit(1).get().then(res => {
  const item = res.data[0].items[0];
  console.log('使用标准字段 name:', item.name !== undefined);
  console.log('使用标准字段 image:', item.image !== undefined);
  console.log('别名 productName 不存在:', item.productName === undefined);
  console.log('别名 productImage 不存在:', item.productImage === undefined);
});
```

**预期结果**:
- [ ] 使用 `name` 和 `image` 标准字段
- [ ] 别名字段不存在

---

## 📊 测试记录表

| 用例ID | 用例名称 | 测试人 | 测试时间 | 测试结果 | 备注 |
|--------|---------|--------|---------|---------|------|
| TC-001 | 创建普通订单 | | | ☐ 通过 ☐ 失败 | |
| TC-002 | 创建多规格订单 | | | ☐ 通过 ☐ 失败 | |
| TC-003 | 创建订单时库存不足 | | | ☐ 通过 ☐ 失败 | |
| TC-004 | 查看全部订单 | | | ☐ 通过 ☐ 失败 | |
| TC-005 | 按状态筛选订单 | | | ☐ 通过 ☐ 失败 | |
| TC-006 | 查看订单详情 | | | ☐ 通过 ☐ 失败 | |
| TC-007 | 订单详情页商品显示验证 | | | ☐ 通过 ☐ 失败 | |
| TC-008 | 取消订单 | | | ☐ 通过 ☐ 失败 | |
| TC-009 | 支付订单 | | | ☐ 通过 ☐ 失败 | |
| TC-010 | 确认收货 | | | ☐ 通过 ☐ 失败 | |
| TC-011 | 查看订单列表（管理员） | | | ☐ 通过 ☐ 失败 | |
| TC-012 | 状态分组筛选（管理员） | | | ☐ 通过 ☐ 失败 | |
| TC-013 | 查看订单详情（管理员） | | | ☐ 通过 ☐ 失败 | |
| TC-014 | 订单详情页地图功能 | | | ☐ 通过 ☐ 失败 | |
| TC-015 | 更新订单状态 | | | ☐ 通过 ☐ 失败 | |
| TC-016 | 删除订单 | | | ☐ 通过 ☐ 失败 | |
| TC-017 | 用户创建订单后管理员可见 | | | ☐ 通过 ☐ 失败 | |
| TC-018 | 管理员更新状态后用户可见 | | | ☐ 通过 ☐ 失败 | |
| TC-019 | 字段映射一致性 | | | ☐ 通过 ☐ 失败 | |
| TC-020 | 订单列表缓存更新 | | | ☐ 通过 ☐ 失败 | |
| TC-021 | 状态变更缓存失效 | | | ☐ 通过 ☐ 失败 | |

---

## 🚨 测试失败处理

### 失败类型 1: 字段不存在

**症状**: 控制台报错 `Cannot read property 'items' of undefined`

**处理步骤**:
1. 检查数据库实际存储
2. 检查云函数返回数据
3. 检查类型定义
4. 修复字段映射

### 失败类型 2: 数据不一致

**症状**: 用户端和管理员端显示不同

**处理步骤**:
1. 对比两端API返回
2. 检查云函数逻辑
3. 检查缓存机制
4. 修复数据源

### 失败类型 3: 状态不同步

**症状**: 状态更新后另一端看不到

**处理步骤**:
1. 检查缓存失效逻辑
2. 检查云函数更新逻辑
3. 检查前端刷新逻辑
4. 修复同步机制

---

## 📝 测试报告模板

```markdown
# 订单系统联调测试报告

**测试日期**: YYYY-MM-DD
**测试人员**: [姓名]
**测试环境**: [开发/测试/生产]

## 测试概况
- 总用例数: 21
- 通过数: X
- 失败数: Y
- 阻塞数: Z
- 通过率: X%

## 失败用例详情
### TC-XXX: [用例名称]
**失败现象**: [描述]
**失败原因**: [分析]
**严重程度**: [高/中/低]
**修复建议**: [建议]

## 数据库验证结果
- items 字段: [☐ 存在 ☐ 不存在]
- products 字段: [☐ 存在 ☐ 不存在]
- 商品标准字段: [☐ name ☐ image]
- 商品别名字段: [☐ productName ☐ productImage]

## 云函数验证结果
- order/getOrders: [☐ 正常 ☐ 异常]
- order/getOrderDetail: [☐ 正常 ☐ 异常]
- admin-api/getOrders: [☐ 正常 ☐ 异常]
- admin-api/getOrderDetail: [☐ 正常 ☐ 异常]

## 前端验证结果
- 用户端订单列表: [☐ 正常 ☐ 异常]
- 用户端订单详情: [☐ 正常 ☐ 异常]
- 管理员端订单列表: [☐ 正常 ☐ 异常]
- 管理员端订单详情: [☐ 正常 ☐ 异常]

## 一致性验证结果
- 两端订单信息一致: [☐ 是 ☐ 否]
- 商品信息一致: [☐ 是 ☐ 否]
- 状态同步正常: [☐ 是 ☐ 否]

## 建议和总结
[测试总结和建议]
```

---

## ✅ 测试完成检查清单

### 测试执行
- [ ] 所有测试用例已执行
- [ ] 测试结果已记录
- [ ] 失败用例已分析
- [ ] 控制台输出已保存

### 数据验证
- [ ] 数据库字段已验证
- [ ] 云函数返回已验证
- [ ] 前端显示已验证
- [ ] 一致性已验证

### 文档输出
- [ ] 测试报告已完成
- [ ] 失败用例已记录
- [ ] 修复建议已提出
- [ ] 验证脚本已保存

---

**测试完成后**:
1. 填写测试报告
2. 分析失败用例
3. 提出修复方案
4. 跟踪问题修复
