# 页面优化指南

本文档说明如何将 `rewards.vue` 的优化模式应用到其他页面。

## 📋 优化清单

对每个页面执行以下优化：

### ✅ 1. 移除内联类型定义

**优化前**:
```typescript
// ❌ 组件内定义类型
interface RewardRecord {
  _id: string
  amount: number
  // ...
}
```

**优化后**:
```typescript
// ✅ 使用集中式类型定义
import type { RewardRecordDB } from '@/types/database'
type RewardRecord = RewardRecordDB
```

---

### ✅ 2. 使用常量替代硬编码映射

**优化前**:
```typescript
// ❌ 硬编码映射
const getStatusText = (status: string) => {
  const texts = {
    pending: '待结算',
    settled: '已结算'
  }
  return texts[status] || status
}
```

**优化后**:
```typescript
// ✅ 使用常量
import { REWARD_STATUS_TEXTS } from '@/constants/reward'

const getStatusText = (status: RewardStatus) => {
  return REWARD_STATUS_TEXTS[status] || status
}
```

---

### ✅ 3. 使用工具函数

**优化前**:
```typescript
// ❌ 手动格式化
const formatPrice = (price: number) => (price / 100).toFixed(2)
const formatTime = (time: Date) => {
  // 复杂逻辑...
}
```

**优化后**:
```typescript
// ✅ 使用工具函数
import { formatPrice, formatTime } from '@/utils/format'
```

---

### ✅ 4. 修复颜色为东方美学暖色调

**优化前**:
```css
/* ❌ 冷色调 */
.type-commission {
  background: linear-gradient(135deg, #0052D9 0%, #00A1FF 100%);  /* 蓝色 */
}
```

**优化后**:
```css
/* ✅ 东方美学暖色调 */
.type-commission {
  background: linear-gradient(135deg, #D4A574 0%, #C9A962 100%);  /* 琥珀金 */
}
```

---

## 🎨 颜色系统指南

### 东方美学配色方案

| 用途 | 颜色 | 十六进制 | RGB |
|------|------|----------|-----|
| **主色** | 深棕色 | `#3D2914` | rgb(61, 41, 20) |
| | 琥珀金 | `#C9A962` | rgb(201, 169, 98) |
| | 青铜 | `#D4A574` | rgb(212, 165, 116) |
| **辅助色** | 鼠尾草绿 | `#7A9A8E` | rgb(122, 154, 142) |
| | 棕色 | `#8B6F47` | rgb(139, 111, 71) |
| | 金色 | `#B8935F` | rgb(184, 147, 95) |
| **状态色** | 成功（绿） | `#06D6A0` | rgb(6, 214, 160) |
| | 警告（橙） | `#FFB085` | rgb(255, 176, 133) |
| | 错误（红） | `#C44536` | rgb(196, 69, 54) |
| | 中性（棕灰） | `#9B8B7F` | rgb(155, 139, 127) |

### ❌ 避免使用的冷色调

- 🔴 **蓝色**: `#0052D9`, `#00A1FF`, `#1890FF` 等
- 🔴 **紫色**: `#7C3AED`, `#A855F7`, `#722ED1` 等
- 🔴 **青色**: `#13C2C2`, `#36CFC9` 等

---

## 📁 常量文件映射表

| 页面类型 | 使用常量 | 文件路径 |
|---------|---------|---------|
| **推广佣金** | `REWARD_*` | `@/constants/reward.ts` |
| **订单** | `ORDER_STATUS_*`, `REFUND_STATUS_*` | `@/constants/order.ts` |
| **钱包** | `TRANSACTION_TYPE_*`, `WALLET_CONFIG` | `@/constants/wallet.ts` |
| **推广团队** | `AGENT_LEVEL_*`, `STAR_LEVEL_*` | `@/constants/promotion.ts` |

---

## 🔧 具体页面优化指南

### 1. `src/pages/promotion/team.vue` - 推广团队

**需要优化的地方**:
- ✅ 移除内联 `PromotionUser`, `TeamStats` 类型
- ✅ 使用 `@/constants/promotion.ts` 的常量
- ✅ 使用 `formatPrice`, `formatTime` 工具函数

**示例**:
```typescript
// 导入常量
import { AGENT_LEVEL_TEXTS, STAR_LEVEL_SHORT, PROMOTION_LEVEL_TEXTS } from '@/constants/promotion'
import { formatPrice, formatTime } from '@/utils/format'
import type { PromotionUser, PromotionStatistics } from '@/constants/promotion'

// 使用常量
const getLevelText = (level: number) => AGENT_LEVEL_TEXTS[level] || '未知'
const getStarLevelShort = (level: number) => STAR_LEVEL_SHORT[level] || ''
```

---

### 2. `src/pages/wallet/index.vue` - 钱包

**需要优化的地方**:
- ✅ 移除内联交易记录类型
- ✅ 使用 `@/constants/wallet.ts` 的常量
- ✅ 使用 `formatPrice`, `formatTime` 工具函数

**示例**:
```typescript
// 导入常量
import { TRANSACTION_TYPE_TEXTS, TRANSACTION_TYPE_ICONS, WALLET_CONFIG } from '@/constants/wallet'
import { formatPrice, formatTime } from '@/utils/format'
import type { WalletTransactionDB } from '@/types/database'

// 使用常量
const getTypeText = (type: TransactionType) => TRANSACTION_TYPE_TEXTS[type]
const getTypeIcon = (type: TransactionType) => TRANSACTION_TYPE_ICONS[type]
```

---

### 3. `src/pages/order/list.vue` - 订单列表

**需要优化的地方**:
- ✅ 移除内联订单类型
- ✅ 使用 `@/constants/order.ts` 的常量
- ✅ 使用 `formatPrice`, `formatTime` 工具函数

**示例**:
```typescript
// 导入常量
import { ORDER_STATUS_TEXTS, ORDER_STATUS_ICONS, ORDER_STATUS_COLORS } from '@/constants/order'
import { formatPrice, formatTime } from '@/utils/format'
import type { OrderDB } from '@/types/database'

// 使用常量
const getStatusText = (status: OrderStatus) => ORDER_STATUS_TEXTS[status]
const getStatusIcon = (status: OrderStatus) => ORDER_STATUS_ICONS[status]
```

---

## 📦 新增文件总览

### 类型定义
- `src/types/database.ts` - 所有数据库集合类型（已完成）

### 常量文件
- `src/constants/reward.ts` - 推广奖励相关常量（已完成）
- `src/constants/order.ts` - 订单相关常量（已完成）
- `src/constants/wallet.ts` - 钱包相关常量（已完成）
- `src/constants/promotion.ts` - 推广系统相关常量（已完成）

### 工具函数
- `src/utils/format.ts` - 格式化工具函数（已完成）

---

## 🎯 优化优先级

| 页面 | 优先级 | 复杂度 | 预计时间 |
|------|--------|--------|----------|
| promotion/team.vue | 高 | 中 | 20 分钟 |
| wallet/index.vue | 高 | 中 | 15 分钟 |
| order/list.vue | 中 | 低 | 15 分钟 |
| promotion/center.vue | 中 | 低 | 10 分钟 |
| wallet/recharge.vue | 低 | 低 | 5 分钟 |

---

## ✅ 优化验证清单

完成优化后，确保：

- [ ] 无内联类型定义，全部使用 `@/types/database.ts`
- [ ] 无硬编码映射，全部使用常量文件
- [ ] 无手动格式化函数，全部使用 `@/utils/format.ts`
- [ ] 颜色使用东方美学暖色调，无冷色调
- [ ] TypeScript 无类型错误
- [ ] 页面功能正常，无破坏性变更

---

**参考文档**:
- `docs/REWARDS_PAGE_OPTIMIZATION.md` - rewards.vue 优化详情
- `CLAUDE.md` - 项目开发指南
