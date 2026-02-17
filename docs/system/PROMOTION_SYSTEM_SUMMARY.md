# 大友元气推广系统完整技术文档

> **最后更新**: 2026年2月
> **文档版本**: 2.0

---

## 目录

1. [体系概述](#1-体系概述)
2. [双轨制身份体系](#2-双轨制身份体系)
3. [四重收益结构](#3-四重收益结构)
4. [推广路径与存储](#4-推广路径与存储)
5. [业绩追踪与星级晋升](#5-业绩追踪与星级晋升)
6. [奖励计算算法](#6-奖励计算算法)
7. [数据库设计](#7-数据库设计)
8. [云函数实现](#8-云函数实现)
9. [配置常量](#9-配置常量)
10. [反欺诈机制](#10-反欺诈机制)
11. [前端集成](#11-前端集成)
12. [关键文件索引](#12-关键文件索引)

---

## 1. 体系概述

大友元气精酿啤酒小程序采用 **"星级身份 + 代理层级" 双轨制** 推广系统，结合实时激励和阶级跃迁机制，打破传统分销的阶层固化，激活代理团队的裂变动力。

**技术架构**:
- **后端**: 腾讯云开发 (CloudBase) Serverless
- **数据库**: CloudBase NoSQL (MongoDB兼容)
- **前端**: UniApp (Vue 3 + TypeScript)
- **运行时**: Node.js 16.13

**核心特点**:
- 毫秒级业绩计算
- 即时晋升触发
- 事务安全保证
- 多层反欺诈保护

---

## 2. 双轨制身份体系

### 2.1 代理层级 (Agent Level)

纵向职级，决定基础佣金比例：

| 层级 | 名称 | 代码 | 基础佣金 | 说明 |
|------|------|------|----------|------|
| 0 | 总公司 | `HEAD_OFFICE` | 0% | 获得订单80%作为公司利润 |
| 1 | 一级代理 | `LEVEL_1` | **10%** | 最高代理等级 |
| 2 | 二级代理 | `LEVEL_2` | **6%** | - |
| 3 | 三级代理 | `LEVEL_3` | **3%** | - |
| 4 | 四级代理 | `LEVEL_4` | **1%** | 初始等级（默认） |

**层级分配规则**:
```javascript
childAgentLevel = min(4, parentAgentLevel + 1)
```

- 新用户无上级时，默认为4级
- 最大深度：4级（从总公司到四级代理）

### 2.2 星级身份 (Star Level)

横向荣誉，决定额外权益解锁：

| 星级 | 名称 | 代码 | 解锁权益 |
|------|------|------|----------|
| 0 | 普通会员 | `NORMAL` | 仅基础佣金 |
| 1 | 铜牌推广员 | `BRONZE` | 基础佣金 + **复购奖励 (3%)** |
| 2 | 银牌推广员 | `SILVER` | 以上 + **团队管理奖 (2%)** |
| 3 | 金牌推广员 | `GOLD` | 以上权益（预留更多功能） |

---

## 3. 四重收益结构

### 3.1 订单收益分配

```
订单金额 (100%)
├── 公司利润: 80%
└── 代理佣金池: 20%
```

### 3.2 四种奖励类型

| 奖励类型 | 比例 | 触发条件 | 来源 |
|----------|------|----------|------|
| **基础佣金** | 1%-10% (按层级) | 始终触发 | 代理佣金池 |
| **复购奖励** | 3% | 复购单 + 星级≥1 (铜牌) | 代理佣金池 |
| **团队管理奖** | 2% | 星级≥2 (银牌)，级差制 | 代理佣金池 |
| **育成津贴** | 2% | 受益人有导师 (`mentorId`) | 代理佣金池 |

### 3.3 级差制算法 (管理奖)

防止奖金拨比溢出的核心算法：

```javascript
// 计算已分配给下级的比例
let alreadyDistributed = 0;
for (let j = 0; j < i; j++) {
  if (managementRatios[parentChain[j]]) {
    alreadyDistributed += managementRatios[parentChain[j]];
  }
}

// 当前用户获得 = 总比例 - 已分配
const availableRatio = Math.max(0, MANAGEMENT_RATIO - alreadyDistributed);
```

**示例**:
- 四级代理获得管理奖: 2%
- 三级代理获得管理奖: 2% - 2% = 0%
- 二级代理获得管理奖: 2% - 2% = 0%

---

## 4. 推广路径与存储

### 4.1 路径结构

- **格式**: 斜杠分隔字符串 `"parentId1/parentId2/..."`
- **示例**: 用户C的路径 = `"A/B"` 表示 A是祖辈，B是父辈
- **存储**: `users.promotionPath` 字段

### 4.2 路径构建

```javascript
// 绑定新用户时
const currentPath = parentPath
  ? `${parentPath}/${parentId}`
  : (parentId || '');
```

### 4.3 反向遍历 (奖励分配)

```javascript
// 从最近上级开始处理
const parentChain = promotionPath.split('/').filter(id => id).reverse();
// 示例: "A/B/C" -> [C, B, A] (先处理C)
```

---

## 5. 业绩追踪与星级晋升

### 5.1 业绩对象结构

```typescript
interface Performance {
  totalSales: number;    // 历史累计销售额 (单位: 分)
  monthSales: number;    // 本月销售额 (单位: 分)
  monthTag: string;      // 月份标识 "2026-02"
  directCount: number;   // 直推有效人数
  teamCount: number;     // 团队总人数 (递归统计)
}
```

### 5.2 晋升门槛

| 目标等级 | 条件A | 条件B |
|----------|-------|-------|
| **铜牌 (0→1)** | 累计销售额 ≥ 20,000元 | 直推人数 ≥ 30 |
| **银牌 (1→2)** | 本月销售额 ≥ 50,000元 | 团队人数 ≥ 50 |
| **金牌 (2→3)** | 本月销售额 ≥ 100,000元 | 团队人数 ≥ 200 |

### 5.3 跨月重置逻辑

```javascript
// 每次更新业绩前检查月份
if (performance.monthTag !== currentMonthTag) {
  await db.collection('users').update({
    data: {
      'performance.monthSales': 0,
      'performance.monthTag': currentMonthTag
    }
  });
}
```

### 5.4 即时晋升检查

订单结算后立即调用：

```javascript
// 在 rewardSettlement/index.js 中
for (const beneficiaryId of beneficiaryIds) {
  await updatePerformanceAndCheckPromotion(beneficiaryId, orderAmount);
}
```

---

## 6. 奖励计算算法

**位置**: `cloudfunctions/promotion/index.js` - `calculatePromotionReward()`

### 6.1 算法流程

```
1. 验证订单金额
2. 获取买家信息和推广路径
3. 解析上级链 (反向顺序)
4. 对每个上级 (最多4级):
   a. 按agentLevel计算基础佣金
   b. 如果复购 + starLevel >= 1: 添加3%复购奖励
   c. 如果starLevel >= 2: 添加管理奖 (级差制)
   d. 如果有mentorId: 给导师添加2%育成津贴
5. 事务中创建奖励记录
6. 更新买家订单计数
```

### 6.2 事务安全

所有奖励计算使用数据库事务：

```javascript
const transaction = await db.startTransaction();
try {
  // ... 奖励计算
  await transaction.commit();
} catch (error) {
  await transaction.rollback();
}
```

### 6.3 最低奖励门槛

```javascript
const MIN_REWARD_AMOUNT = 1; // 1分
// 低于此门槛的奖励不记录
```

---

## 7. 数据库设计

### 7.1 核心集合

| 集合名 | 用途 |
|--------|------|
| `users` | 用户档案，含推广字段 |
| `promotion_relations` | 显式父子关系 |
| `promotion_orders` | 奖励计算的订单记录 |
| `reward_records` | 按类型分开的奖励记录 |
| `registration_attempts` | 反欺诈追踪 |

### 7.2 用户推广字段

```typescript
interface PromotionUser {
  inviteCode: string;           // 唯一邀请码
  parentId?: string;            // 直接上级的openid
  promotionPath?: string;       // 完整祖先路径
  starLevel: StarLevel;         // 0-3
  agentLevel: AgentLevel;       // 0-4
  performance: Performance;     // 业绩追踪
  mentorId?: string;            // 可选导师

  // 奖励统计
  totalReward: number;          // 已结算总奖励
  pendingReward: number;        // 待结算 (7天冻结期)
  commissionReward: number;     // 基础佣金累计
  repurchaseReward: number;     // 复购奖励累计
  managementReward: number;     // 管理奖累计
  nurtureReward: number;        // 育成津贴累计

  // 反欺诈
  registerIP: string;           // 注册IP
  isSuspicious: boolean;        // 可疑标记
}
```

### 7.3 奖励记录结构

```typescript
interface RewardRecord {
  orderId: string;              // 订单ID
  beneficiaryId: string;        // 受益人ID
  sourceUserId: string;         // 下单用户ID
  level: number;                // 在链中的位置 (1-4)
  orderAmount: number;          // 订单金额
  ratio: number;                // 比例 (如 0.10 表示10%)
  amount: number;               // 实际奖励金额
  rewardType: RewardType;       // commission|repurchase|management|nurture
  rewardTypeName: string;       // 中文名称
  status: 'pending'|'settled'|'cancelled'|'deducted';
  relatedBeneficiaryId?: string; // 育成津贴的实际获得者
  createdAt: Date;
  settledAt?: Date;
}
```

---

## 8. 云函数实现

### 8.1 promotion 云函数

**位置**: `cloudfunctions/promotion/index.js`

**支持的操作**:

| Action | 函数 | 说明 |
|--------|------|------|
| `bindRelation` | `bindPromotionRelation()` | 通过邀请码绑定用户关系 |
| `calculateReward` | `calculatePromotionReward()` | 计算订单四重奖励 |
| `getInfo` | `getPromotionInfo()` | 获取用户推广信息 (缓存) |
| `getTeamMembers` | `getTeamMembers()` | 获取团队各级成员 |
| `getRewardRecords` | `getRewardRecords()` | 获取奖励历史 |
| `generateQRCode` | `generateQRCode()` | 生成邀请二维码 |
| `checkPromotion` | `checkStarLevelPromotion()` | 手动晋升检查 |
| `updatePerformance` | `updatePerformanceAndCheckPromotion()` | 更新业绩并检查晋升 |

### 8.2 rewardSettlement 云函数

**位置**: `cloudfunctions/rewardSettlement/index.js`

**用途**: 定时任务，处理7天冻结期的奖励结算

**操作**:

| Action | 说明 |
|--------|------|
| (默认) | 每日凌晨2点的定时结算任务 |
| `manualSettlement` | 手动触发特定订单结算 |
| `getStats` | 获取结算统计 |

**结算流程**:
1. 查找7天前的待结算订单
2. 验证订单状态 (已完成 + 无退款)
3. 更新奖励状态为 'settled'
4. 将 pendingReward 转入 totalReward
5. 创建钱包交易记录
6. 更新业绩并检查晋升
7. 清理异常数据 (反欺诈)

---

## 9. 配置常量

**位置**: `cloudfunctions/promotion/common/constants.js`

```javascript
// 代理层级
const AgentLevel = {
  HEAD_OFFICE: 0,
  LEVEL_1: 1,
  LEVEL_2: 2,
  LEVEL_3: 3,
  LEVEL_4: 4,
  MAX_LEVEL: 4
};

// 星级身份
const StarLevel = {
  NORMAL: 0,
  BRONZE: 1,
  SILVER: 2,
  GOLD: 3,
  MAX_LEVEL: 3
};

// 奖励比例
const PromotionRatio = {
  HEAD_OFFICE_SHARE: 0.80,                    // 公司利润 80%
  COMMISSION: {
    HEAD_OFFICE: 0,
    LEVEL_1: 0.10,    // 一级代理 10%
    LEVEL_2: 0.06,    // 二级代理 6%
    LEVEL_3: 0.03,    // 三级代理 3%
    LEVEL_4: 0.01     // 四级代理 1%
  },
  REPURCHASE: 0.03,    // 复购奖励 3%
  MANAGEMENT: 0.02,    // 团队管理奖 2%
  NURTURE: 0.02        // 育成津贴 2%
};

// 晋升门槛
const PromotionThreshold = {
  BRONZE: {
    totalSales: 2000000,   // 20,000元
    directCount: 30
  },
  SILVER: {
    monthSales: 5000000,   // 50,000元
    teamCount: 50
  },
  GOLD: {
    monthSales: 10000000,  // 100,000元
    teamCount: 200
  }
};

// 反欺诈配置
const AntiFraud = {
  MAX_REGISTRATIONS_PER_IP: 3,       // 每IP每日最大注册数
  IP_LIMIT_WINDOW_HOURS: 24,         // IP限制窗口
  REGISTRATION_ATTEMPT_TTL_DAYS: 7,  // 注册记录保留天数
  INVITE_CODE_LENGTH: 8,             // 邀请码长度
  INVITE_CODE_MAX_RETRY: 10          // 邀请码生成最大重试次数
};
```

### 9.1 缓存模块

**位置**: `cloudfunctions/promotion/common/cache.js`

- `userCache`: 用户信息缓存，5分钟TTL
- `teamStatsCache`: 团队统计缓存，1小时TTL
- 自动失效机制

---

## 10. 反欺诈机制

1. **IP限流**: 每IP每24小时最多3次注册
2. **设备指纹**: 追踪 openid、IP、时间戳
3. **注册记录**: 7天保留，自动清理
4. **敏感数据脱敏**: 日志中 openid 只显示前8位 + `***`
5. **自购检测**: 受益人 = 下单人时取消奖励
6. **异常订单标记**: < 10元订单标记审核

---

## 11. 前端集成

**位置**: `src/utils/api.ts`

```typescript
// 绑定推广关系
bindPromotionRelation(parentInviteCode, userInfo): Promise<PromotionUser>

// 获取推广信息
getPromotionInfo(): Promise<PromotionInfo>

// 获取团队成员
getTeamMembers(level, page, limit): Promise<TeamMembers>

// 获取奖励记录
getRewardRecords(status, page, limit, rewardType): Promise<RewardRecords>

// 生成二维码
generatePromotionQRCode(page?): Promise<{qrCodeUrl, inviteCode}>

// 计算奖励 (订单完成后调用)
calculatePromotionReward(orderId, buyerId, orderAmount): Promise<Rewards>
```

---

## 12. 关键文件索引

| 文件 | 用途 |
|------|------|
| `cloudfunctions/promotion/index.js` | 主推广逻辑 (~1500行) |
| `cloudfunctions/promotion/common/constants.js` | 配置常量 |
| `cloudfunctions/promotion/common/cache.js` | 缓存模块 |
| `cloudfunctions/promotion/common/logger.js` | 结构化日志 |
| `cloudfunctions/rewardSettlement/index.js` | 结算定时任务 |
| `docs/system/PROMOTION_SYSTEM.md` | 技术白皮书 |
| `docs/system/COMMISSION_RESTRUCTURE_2026.md` | 80/20分成文档 |
| `docs/PROMOTION_ANTI_FRAUD.md` | 反欺诈文档 |
| `src/types/index.ts` | TypeScript类型定义 |
| `src/utils/api.ts` | 前端API层 |

---

## 收益分配示例

假设订单金额为 **1000元**，推广链为：四级代理 → 三级代理 → 二级代理 → 一级代理

**订单收益分配：**
- **总公司**: 800元 (80%)
- **代理佣金池**: 200元 (20%)

**假设所有代理都满足星级条件，代理佣金池分配：**
- **四级代理**: 基础佣金 10元 (1%)
- **三级代理**: 基础佣金 30元 (3%)
- **二级代理**: 基础佣金 60元 (6%) + 复购奖 30元 (3%) = 90元
- **一级代理**: 基础佣金 100元 (10%) + 管理奖 20元 (2%) = 120元

**注意**: 复购奖、管理奖、育成津贴从20%代理佣金池中扣除，当多种奖励同时触发时，总发放可能超过20%，需通过级差制和阈值控制。

---

## 运营建议

1. **拨比监控**: 定期通过 `reward_records` 分析总拨比，确保佣金支出可控
2. **佣金池管理**: 多奖励触发时总佣金可能超20%，设置兜底机制
3. **数据清理**: 定期清理过期注册记录和异常数据
4. **缓存优化**: 用户信息和团队统计已实现缓存，减少数据库压力
