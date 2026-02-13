# 购物车数据完整性验证文档

## 概述

订单系统已实施完整的购物车数据验证机制，防止客户端篡改、价格欺诈等安全威胁。

## 验证层级

### 1. 产品存在性验证

**配置**: `cloudfunctions/order/index.js:97-104`

```javascript
// 批量获取产品信息
const productIds = [...new Set(cartItems.map(item => item.productId))];
const productsRes = await db.collection('products')
  .where({ _id: _.in(productIds) })
  .get();

// 检查每个产品是否存在
if (!product) {
  errors.push(`第${i + 1}项产品不存在`);
  continue;
}
```

**验证项**:
- 产品 ID 是否存在
- 产品数据完整性

### 2. 产品状态验证

**配置**: `cloudfunctions/order/index.js:106-114`

```javascript
// 检查产品状态
if (product.status !== 'active') {
  errors.push(`"${product.name}"已下架`);
  continue;
}
```

**验证项**:
- 产品是否已下架
- 只有 `status === 'active'` 的产品可以购买

### 3. 库存验证

**配置**: `cloudfunctions/order/index.js:116-125, 154-164`

```javascript
// 产品库存检查
if (product.stock < cartItem.quantity) {
  errors.push(`"${product.name}"库存不足`);
  continue;
}

// SKU 库存检查
if (sku.stock < cartItem.quantity) {
  errors.push(`"${product.name}"该规格库存不足`);
  continue;
}
```

**验证项**:
- 产品库存是否足够
- SKU 库存是否足够
- 防止超卖

### 4. 数量范围验证

**配置**: `cloudfunctions/order/index.js:127-135`

```javascript
// 最小/最大购买数量
const MIN_QUANTITY = 1;
const MAX_QUANTITY = 999;

if (cartItem.quantity < MIN_QUANTITY || cartItem.quantity > MAX_QUANTITY) {
  errors.push(`"${product.name}"数量异常`);
  continue;
}
```

**验证项**:
- 数量 >= 1
- 数量 <= 999

### 5. SKU 组合验证

**配置**: `cloudfunctions/order/index.js:137-168`

```javascript
// SKU 验证（如果有 SKU）
if (cartItem.skuId && product.skus && product.skus.length > 0) {
  const sku = product.skus.find(s => s._id === cartItem.skuId);
  if (!sku) {
    errors.push(`"${product.name}"规格不存在`);
    continue;
  }
  serverPrice = sku.price;
}
```

**验证项**:
- SKU ID 是否存在
- SKU 属于该产品
- 使用 SKU 价格（而非产品价格）

### 6. 价格验证（防篡改）

**配置**: `cloudfunctions/order/index.js:170-183, 210-224`

**关键安全特性**: 所有价格来自服务器，不信任客户端数据

```javascript
// 价格容忍误差（分）
const PRICE_TOLERANCE = 100; // 1元

// 使用服务器价格
const serverPrice = sku ? sku.price : product.price;
const clientPrice = cartItem.price || 0;
const priceDiff = Math.abs(clientPrice - serverPrice);

// 如果差异超过容忍范围，拒绝
if (priceDiff > PRICE_TOLERANCE) {
  errors.push(`"${product.name}"价格已更新，请重新下单`);
  continue;
}

// 总金额验证
const serverTotalAmount = validatedItems.reduce((sum, item) =>
  sum + item.price * item.quantity, 0
);
const clientTotal = cartItems.reduce((sum, item) =>
  sum + item.price * item.quantity, 0
);

if (Math.abs(clientTotal - serverTotalAmount) > PRICE_TOLERANCE) {
  errors.push('订单总金额异常，请重新确认');
}
```

**验证项**:
- 单项价格匹配服务器价格
- 总金额匹配计算结果
- 允许 1 元误差（容忍价格更新）

### 7. 数据审计

**配置**: `cloudfunctions/order/index.js:275-287`

```javascript
const order = {
  items: cartValidation.validatedItems, // 使用验证后的数据
  totalAmount: cartValidation.serverTotalAmount, // 使用服务器计算
  // 客户端提交的原始金额（用于审计）
  clientSubmittedAmount: orderData.totalAmount,
  amountValidationPassed: true
};
```

**审计字段**:
- `clientSubmittedAmount`: 客户端提交的原始金额
- `totalAmount`: 服务器验证后的金额
- `amountValidationPassed`: 验证通过标记

## 部署指南

### 1. 部署云函数

```bash
# 在微信开发者工具中
# 右键 cloudfunctions/order 文件夹
# 选择 "上传并部署：云端安装依赖"
```

### 2. 验证

测试购物车验证：

```javascript
// 测试1: 正常订单（应成功）
const normalCart = [{
  productId: 'valid_product_id',
  skuId: 'valid_sku_id',
  quantity: 1,
  price: 9900  // 99元（服务器价格）
}];

const result1 = await callFunction('order', {
  action: 'createOrder',
  items: normalCart
});
// 预期: success: true

// 测试2: 价格篡改（应失败）
const tamperedCart = [{
  productId: 'valid_product_id',
  skuId: 'valid_sku_id',
  quantity: 1,
  price: 100  // 篡改为1元（实际99元）
}];

const result2 = await callFunction('order', {
  action: 'createOrder',
  items: tamperedCart
});
// 预期: success: false, message: "价格已更新，请重新下单"

// 测试3: 库存不足（应失败）
const outOfStockCart = [{
  productId: 'valid_product_id',
  quantity: 9999  // 超过库存
}];

const result3 = await callFunction('order', {
  action: 'createOrder',
  items: outOfStockCart
});
// 预期: success: false, message: "库存不足"
```

## 安全指标

### 关键指标

在 CloudBase 控制台监控：

1. **验证失败率**: `errors.length > 0` 的订单比例
2. **价格篡改尝试**: `clientTotal !== serverTotalAmount` 的次数
3. **库存超卖**: 库存不足但仍下单成功的次数

### 告警规则

- 单小时验证失败 > 10 次：可能存在攻击
- 单日价格篡改尝试 > 5 次：存在恶意用户
- 库存不足订单 > 0：需要补货或检查库存同步

## 常见问题

### Q1: 用户反映"价格已更新"但未修改价格？

**A**: 可能原因：
1. 产品价格最近在后台更新过
2. 客户端缓存了旧价格
3. 网络延迟导致数据不一致

**解决方案**:
- 清除缓存重新加载
- 检查 `PRICE_TOLERANCE` 是否过小
- 客户端下单前刷新价格

### Q2: 如何处理价格更新时的容忍度？

**A**: `PRICE_TOLERANCE = 100`（1元）意为：
- 服务器价格 99元，客户端 98.5-99.5元：通过
- 服务器价格 99元，客户端 97元：拒绝（差异2元）
- 可根据业务需求调整此值

### Q3: 库存检查的时机？

**A**: 当前实现：
1. 下单时检查库存
2. 创建订单时扣减库存
3. 支付时验证订单状态

**潜在问题**:
- 高并发时可能超卖
- 建议实现库存预占机制

## 数据库字段

### orders 集合新增字段

| 字段 | 类型 | 说明 |
|-------|------|------|
| clientSubmittedAmount | Number | 客户端提交的原始金额（审计用） |
| amountValidationPassed | Boolean | 金额验证是否通过 |
| items.productName | String | 产品名称快照 |
| items.skuName | String | SKU 名称快照 |
| items.skuSpec | String | SKU 规格快照 |

## 安全最佳实践

1. **永不信任客户端价格**: 所有价格必须来自服务器
2. **验证所有输入**: 每个购物车项都要验证
3. **详细错误日志**: 记录所有验证失败详情
4. **定期审计**: 检查 `clientSubmittedAmount` vs `totalAmount` 差异
5. **监控异常模式**: 短时间内大量验证失败 = 可能攻击

## 相关文件

- `cloudfunctions/order/index.js` - 订单管理核心逻辑
- `cloudfunctions/common/validator.js` - 输入验证工具
- `cloudfunctions/common/logger.js` - 结构化日志工具

## 更新日志

| 版本 | 日期 | 变更 |
|-------|------|------|
| 1.0.0 | 2026-02-13 | 初始版本 - 完整购物车验证 |
