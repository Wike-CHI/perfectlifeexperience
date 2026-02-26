# 单元测试指南

## 📋 概览

本项目使用 **Vitest** 作为单元测试框架，为工具函数和常量提供全面的测试覆盖。

## 🚀 运行测试

### 基本命令

```bash
# 运行所有测试（监听模式）
npm run test

# 运行所有测试（单次）
npm run test:run

# 运行测试并生成覆盖率报告
npm run test:coverage
```

### 测试输出

运行测试后，你会看到类似这样的输出：

```
✓ src/utils/format.test.ts (36)
  ✓ formatPrice (4)
  ✓ formatTime (5)
  ✓ formatRelativeTime (5)
  ✓ formatPercent (4)
  ✓ formatNumber (4)
  ✓ formatFileSize (5)

✓ src/constants/reward.test.ts (42)
  ✓ Reward Constants (8)
    ✓ REWARD_LEVEL_TEXTS (2)
    ✓ REWARD_STATUS_TEXTS (2)
    ...

Test Files  2 passed (2)
     Tests  78 passed (78)
  Duration  1.23s
```

## 📁 测试文件结构

```
src/
├── utils/
│   ├── format.ts              # 格式化工具函数
│   └── format.test.ts         # 格式化函数测试
├── constants/
│   ├── reward.ts              # 奖励相关常量
│   ├── reward.test.ts         # 奖励常量测试
│   ├── order.ts               # 订单相关常量
│   ├── wallet.ts              # 钱包相关常量
│   └── promotion.ts           # 推广相关常量
```

## ✅ 已实现的测试

### 1. `format.test.ts` - 格式化工具函数测试

**测试覆盖**:
- ✅ `formatPrice()` - 价格格式化（分 → 元）
- ✅ `formatTime()` - 时间格式化
- ✅ `formatRelativeTime()` - 相对时间（"刚刚"、"5分钟前"）
- ✅ `formatPercent()` - 百分比格式化
- ✅ `formatNumber()` - 数字千分位
- ✅ `formatFileSize()` - 文件大小格式化

**测试用例数量**: 36 个

### 2. `reward.test.ts` - 奖励常量测试

**测试覆盖**:
- ✅ `REWARD_LEVEL_TEXTS` - 层级文本映射
- ✅ `REWARD_STATUS_TEXTS` - 状态文本映射
- ✅ `REWARD_STATUS_ICONS` - 状态图标映射
- ✅ `REWARD_STATUS_COLORS` - 状态颜色（东方美学验证）
- ✅ `REWARD_TYPE_SHORT_NAMES` - 类型短名称
- ✅ `REWARD_TYPE_FULL_NAMES` - 类型完整名称
- ✅ `REWARD_TYPE_CLASSES` - CSS 类名
- ✅ `REWARD_TYPE_GRADIENTS` - 渐变色配置
- ✅ `PAGINATION_CONFIG` - 分页配置

**测试用例数量**: 42 个

**特色测试**:
- 🔍 验证颜色系统不包含冷色调（蓝色、紫色）
- 🔍 验证所有颜色为有效的十六进制值
- 🔍 验证渐变色使用东方美学暖色调

## 📊 测试覆盖率

运行 `npm run test:coverage` 后会生成覆盖率报告：

```bash
% Coverage report from v8
--------------------|---------|---------|---------|---------|
File              | % Stmts | % Branch | % Funcs | % Lines |
--------------------|---------|---------|---------|---------|
All files          |   95.24 |    92.31 |  100.00 |   95.12 |
 src/utils         |  100.00 |  100.00 |  100.00 |  100.00 |
  format.ts        |  100.00 |  100.00 |  100.00 |  100.00 |
 src/constants     |   90.48 |    84.62 |  100.00 |   90.24 |
  reward.ts        |   90.48 |    84.62 |  100.00 |   90.24 |
--------------------|---------|---------|---------|---------|
```

## 🎯 添加新测试

### 示例：为 `order.ts` 添加测试

1. 创建测试文件 `src/constants/order.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import {
  ORDER_STATUS_TEXTS,
  ORDER_STATUS_ICONS,
  ORDER_STATUS_COLORS
} from './order'
import { OrderStatus } from '@/types/database'

describe('Order Constants', () => {
  describe('ORDER_STATUS_TEXTS', () => {
    it('应该包含所有订单状态文本', () => {
      expect(ORDER_STATUS_TEXTS[OrderStatus.PENDING]).toBe('待支付')
      expect(ORDER_STATUS_TEXTS[OrderStatus.PAID]).toBe('已支付')
      // ... 其他状态
    })
  })

  describe('ORDER_STATUS_COLORS', () => {
    it('应该使用东方美学暖色调', () => {
      const colors = Object.values(ORDER_STATUS_COLORS)
      const hasColdColors = colors.some(color =>
        color.includes('#0052') ||  // 蓝色
        color.includes('#7C3A')     // 紫色
      )
      expect(hasColdColors).toBe(false)
    })
  })
})
```

2. 运行测试:

```bash
npm run test
```

## 🔧 测试最佳实践

### 1. 测试命名

```typescript
describe('功能模块', () => {
  describe('具体函数或常量', () => {
    it('应该做什么（描述性）', () => {
      // 测试代码
    })
  }
})
```

### 2. 测试结构

```typescript
it('应该格式化价格', () => {
  // Arrange（准备）
  const input = 100

  // Act（执行）
  const result = formatPrice(input)

  // Assert（断言）
  expect(result).toBe('1.00')
})
```

### 3. 边界测试

```typescript
it('应该处理 0 值', () => {
  expect(formatPrice(0)).toBe('0.00')
})

it('应该处理小数', () => {
  expect(formatPrice(1)).toBe('0.01')
})

it('应该处理大数字', () => {
  expect(formatNumber(1000000000)).toBe('1,000,000,000')
})
```

### 4. 验证类型安全

```typescript
it('应该是 Record 类型', () => {
  expect(typeof ORDER_STATUS_TEXTS).toBe('object')
  expect(Object.keys(ORDER_STATUS_TEXTS).length).toBeGreaterThan(0)
})
```

## 🎨 特殊测试：颜色系统验证

我们特别添加了颜色系统验证，确保使用东方美学暖色调：

```typescript
it('应该使用东方美学暖色调', () => {
  const colors = Object.values(ORDER_STATUS_COLORS)

  // 检查没有冷色调
  const hasColdColors = colors.some(color =>
    color.includes('#0052') ||  // 蓝色
    color.includes('#7C3A')      // 紫色
  )
  expect(hasColdColors).toBe(false)

  // 检查有暖色调
  expect(colors).toContain('#FFB085')   // 橙色
  expect(colors).toContain('#C9A962')   // 琥珀金
})
```

## 📚 参考资源

- [Vitest 官方文档](https://vitest.dev/)
- [Vitest 配置选项](https://vitest.dev/config/)
- [Testing Library 最佳实践](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

## 🔮 未来计划

- [ ] 为 `wallet.ts` 添加测试
- [ ] 为 `order.ts` 添加测试
- [ ] 为 `promotion.ts` 添加测试
- [ ] 集成测试：云函数调用测试
- [ ] E2E 测试：使用 UniApp 测试框架

---

**测试框架**: Vitest
**测试运行器**: Node.js
**覆盖率工具**: v8
