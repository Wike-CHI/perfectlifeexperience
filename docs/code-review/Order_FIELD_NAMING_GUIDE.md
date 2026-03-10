# 订单系统字段命名规范

**版本**: 2.0
**更新日期**: 2026-03-10
**适用范围**: 全项目

---

## 📋 核心规范

### ✅ 正确字段命名

| 层级 | 字段名 | 类型 | 说明 |
|------|--------|------|------|
| 数据库存储 | `items` | `OrderProduct[]` | 数据库实际存储字段 |
| 业务类型 | `items` | `OrderItem[]` | 业务层类型定义 |
| 前端使用 | `items` | `OrderItem[]` | Vue/React 组件中使用 |
| API返回 | `items` | `array` | 云函数返回数据 |

### ❌ 已废弃字段

| 字段名 | 状态 | 替代方案 |
|--------|------|---------|
| `products` | 🚫 已废弃 | 使用 `items` |
| `expressCompany` | 🚫 已废弃 | 管理员端不再支持快递功能 |
| `expressNo` | 🚫 已废弃 | 管理员端不再支持快递功能 |

---

## 🎯 Order 类型定义

### 数据库层 (`types/database.ts`)

```typescript
export interface OrderDB {
  _id: string
  _openid: string
  orderNo: string
  totalAmount: number
  status: OrderStatus
  items: OrderProduct[]          // ✅ 正确字段
  address: OrderAddress
  remark?: string
  payMethod?: 'wechat' | 'wallet' | 'mixed'
  payTime?: DBDate
  shipTime?: DBDate
  completeTime?: DBDate
  createTime: DBDate
  updateTime?: DBDate
}
```

### 业务层 (`types/index.ts`)

```typescript
export interface Order {
  _id?: string
  id?: string                     // 前端兼容字段
  orderNo: string
  items: OrderItem[]              // ✅ 正确字段
  products?: OrderItem[]          // ⚠️ 过渡期兼容（将在 v3.0 移除）
  totalAmount: number
  status: OrderStatus
  userName?: string
  userPhone?: string
  userAvatar?: string
  address?: Address
  remark?: string
  paymentMethod?: 'wechat' | 'balance'
  deliveryTime?: string
  createTime: Date
  updateTime?: Date
  // ... 其他字段
}
```

---

## 📦 OrderProduct / OrderItem 字段

### 标准字段（必须）

| 字段名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `productId` | `string` | ✅ | 商品ID |
| `name` | `string` | ✅ | 商品名称（标准） |
| `image` | `string` | ✅ | 商品图片URL（标准） |
| `price` | `number` | ✅ | 单价（分） |
| `quantity` | `number` | ✅ | 数量 |
| `specs` | `string` | ❌ | 规格描述（可选） |

### 别名字段（兼容）

| 字段名 | 类型 | 状态 | 说明 |
|--------|------|------|------|
| `productName` | `string` | ⚠️ 过渡期 | `name` 的别名，将在 v3.0 移除 |
| `productImage` | `string` | ⚠️ 过渡期 | `image` 的别名，将在 v3.0 移除 |

### 完整定义

```typescript
export interface OrderProduct {
  // 标准字段
  productId: string
  name: string
  image: string
  price: number
  quantity: number
  specs?: string

  // 别名字段（过渡期兼容）
  productName?: string
  productImage?: string
}
```

---

## 💻 使用示例

### Vue 组件中使用

```vue
<template>
  <view class="order-items">
    <!-- ✅ 正确：使用 items 字段 -->
    <view v-for="item in order.items" :key="item.productId">
      <image :src="item.image" />
      <text>{{ item.name }}</text>
      <text>¥{{ item.price / 100 }}</text>
      <text>x{{ item.quantity }}</text>
    </view>

    <!-- ❌ 错误：不要再使用 products -->
    <view v-for="item in order.products">
      <!-- 不要这样写 -->
    </view>

    <!-- ⚠️ 过渡期：兼容处理（将在 v3.0 移除） -->
    <view v-for="item in (order.items || order.products)">
      <!-- 仅在过渡期使用 -->
    </view>
  </view>
</template>
```

### TypeScript 类型使用

```typescript
import { Order, OrderItem } from '@/types'

// ✅ 正确
function processOrderItems(order: Order) {
  return order.items.map(item => ({
    id: item.productId,
    name: item.name,        // 使用标准字段
    price: item.price,
    quantity: item.quantity
  }))
}

// ❌ 错误
function processOrderItems(order: Order) {
  return order.products?.map(...)  // 不要使用 products
}
```

### 云函数返回数据

```javascript
// ✅ 正确：返回 items
return {
  code: 0,
  data: {
    order: {
      _id: orderId,
      orderNo: 'ORD20260310001',
      items: [                    // ✅ 正确字段
        {
          productId: 'xxx',
          name: '精酿啤酒',       // ✅ 标准字段
          image: 'https://...',
          price: 5000,
          quantity: 2
        }
      ]
    }
  }
}

// ⚠️ 过渡期：可以同时返回别名
return {
  code: 0,
  data: {
    order: {
      items: [
        {
          productId: 'xxx',
          name: '精酿啤酒',
          productName: '精酿啤酒',  // ⚠️ 别名（兼容旧前端）
          image: 'https://...',
          productImage: 'https://...'  // ⚠️ 别名（兼容旧前端）
        }
      ]
    }
  }
}
```

---

## 🔄 迁移指南

### 阶段 1: 立即执行（P0）

**目标**: 统一类型定义

```typescript
// 1. 更新类型定义（已完成）
// OrderDB.products → OrderDB.items

// 2. 更新后端返回
// 统一返回 items 字段
```

### 阶段 2: 本周执行（P1）

**目标**: 统一前端使用

```vue
<!-- 修复前 -->
<view v-for="item in (order.items || order.products)">

<!-- 修复后 -->
<view v-for="item in order.items">
```

```typescript
// 修复前
const items = order.items || order.products

// 修复后
const items = order.items
```

### 阶段 3: 下周执行（P2）

**目标**: 移除别名

```typescript
// 修复前
export interface OrderItem {
  name: string
  productName?: string
  image: string
  productImage?: string
}

// 修复后
export interface OrderItem {
  name: string
  image: string
}
```

---

## ✅ 检查清单

### 代码审查时检查

- [ ] 是否使用 `items` 而非 `products`
- [ ] 是否使用 `name` 而非 `productName`
- [ ] 是否使用 `image` 而非 `productImage`
- [ ] 是否移除了 `||` 兼容处理
- [ ] 是否移除了快递相关字段

### 提交代码前检查

```bash
# 1. 类型检查
npm run type-check

# 2. 全局搜索废弃字段
grep -r "products" src/
grep -r "productName" src/
grep -r "productImage" src/
grep -r "expressNo" src/

# 3. 检查是否有遗漏
```

---

## 📞 常见问题

### Q1: 为什么废弃 products 字段？

**A**: 与数据库实际存储字段 `items` 保持一致，避免混淆。

### Q2: 旧代码怎么办？

**A**: 在过渡期（v2.x）保留 `products` 别名，v3.0 将完全移除。

### Q3: 如何处理旧的订单数据？

**A**: 数据库中已经是 `items` 字段，无需迁移。只需要更新代码引用。

### Q4: productName 和 productImage 何时移除？

**A**: 计划在 v3.0 版本（约1个月后）完全移除。

---

## 📚 相关文档

- [审查报告](./ORDER_SYSTEM_CONSISTENCY_REVIEW.md)
- [修复摘要](./CONSISTENCY_FIX_SUMMARY.md)
- [类型定义](../../src/types/database.ts)

---

**最后更新**: 2026-03-10
**维护者**: 开发团队
**版本**: v2.0
