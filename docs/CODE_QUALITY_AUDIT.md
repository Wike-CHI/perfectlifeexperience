# 代码质量审查报告

**审查日期**: 2026-02-13
**审查范围**: 全栈代码 (前端 + 云函数 + 数据库)
**严重程度分级**: 🔴 严重 | 🟡 中等 | 🟢 轻微

---

## 执行摘要

本次审查发现了 **12 个关键问题** 涉及:
- 🔴 **3 个严重安全问题** (需立即修复)
- 🟡 **5 个中等风险** (建议尽快处理)
- 🟢 **4 个代码质量问题** (可优化改进)

---

## 🔴 严重问题 (Critical - 立即修复)

### 1. 管理员密码明文存储

**位置**: `cloudfunctions/admin-api/auth.js:21`

```javascript
// ❌ 当前实现 - 明文比较
if (admin.password !== password) {
  return { success: false, message: '密码错误' };
}
```

**问题**:
- 密码以明文形式存储在数据库中
- 任何能够访问数据库的人都可以看到管理员密码
- 违反基本安全最佳实践

**影响**:
- 数据库泄露将直接暴露所有管理员账号
- 无法审计密码历史
- 不符合合规要求

**修复建议**:

```javascript
// ✅ 推荐实现 - 使用 bcrypt
const bcrypt = require('bcryptjs');
const saltRounds = 10;

// 注册时
const hashedPassword = await bcrypt.hash(plainPassword, saltRounds);
await db.collection('admins').add({
  username,
  password: hashedPassword,  // 存储哈希值
  createdAt: new Date()
});

// 验证时
const isValid = await bcrypt.compare(plainPassword, admin.password);
if (!isValid) {
  return { success: false, message: '密码错误' };
}
```

**优先级**: 🔴 P0 - 立即修复

---

### 2. 支付金额缺少服务端验证

**位置**: `cloudfunctions/wechatpay/index.js:191-193`

```javascript
// ❌ 当前实现 - 直接使用前端传来的金额
amount: {
  total: order.totalAmount,  // 来自数据库，但未二次验证
  currency: 'CNY'
}
```

**问题**:
- 虽然订单金额来自数据库，但没有防止订单在创建后被修改
- 缺少金额范围验证
- 没有防重复支付检查

**影响**:
- 恶意用户可能利用时间差篡改订单金额
- 可能导致同一订单被多次支付

**修复建议**:

```javascript
// ✅ 添加验证
async function createPayment(data, config) {
  const { orderId, openid } = data;

  // 1. 查询订单
  const order = await getOrder(orderId, openid);

  // 2. 验证订单状态（防止重复支付）
  if (order.paymentStatus === 'paid') {
    return { success: false, code: 'ALREADY_PAID' };
  }

  // 3. 验证金额范围
  const minAmount = 100; // 1元
  const maxAmount = 5000000; // 50000元
  if (order.totalAmount < minAmount || order.totalAmount > maxAmount) {
    return { success: false, code: 'INVALID_AMOUNT' };
  }

  // 4. 冻结订单状态（防止并发支付）
  await db.collection('orders').doc(orderId).update({
    data: { paymentStatus: 'processing' }
  });

  // 5. 调用支付接口
  const orderResult = await jsapiOrder({...});

  return { success: true, data: orderResult };
}
```

**优先级**: 🔴 P0 - 立即修复

---

### 3. 前端敏感数据泄露到日志

**位置**: `cloudfunctions/wallet/index.js:28`

```javascript
// ❌ 当前实现
console.log('Wallet raw event:', JSON.stringify(event));
// event 可能包含用户 openid、钱包余额等敏感信息
```

**问题**:
- 云函数日志会被上传到云平台
- 包含用户 openid 和钱包信息的日志可能被未授权访问
- 违反隐私保护原则

**影响**:
- 敏感用户信息可能泄露
- openid 可被用于追踪用户

**修复建议**:

```javascript
// ✅ 推荐实现 - 使用结构化日志
const logger = {
  info: (msg, meta) => console.log(`[INFO] ${msg}`, JSON.stringify(sanitize(meta))),
  error: (msg, err) => console.error(`[ERROR] ${msg}`, err?.message)
};

function sanitize(obj) {
  if (!obj) return obj;
  const sensitiveKeys = ['openid', 'openid', 'password', 'phone', 'idCard'];
  const sanitized = { ...obj };
  for (const key of Object.keys(sanitized)) {
    if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
      sanitized[key] = '[REDACTED]';
    }
  }
  return sanitized;
}

// 使用
logger.info('Wallet operation', { action: 'getBalance', ...sanitized(event.data) });
```

**优先级**: 🔴 P1 - 尽快修复

---

## 🟡 中等风险问题 (Medium)

### 4. 缺少输入验证导致注入风险

**位置**: `src/utils/api.ts:34`

```javascript
// ❌ 当前实现 - 直接使用用户输入作为正则表达式
export const getProducts = async (params?: { keyword?: string }) => {
  if (keyword) {
    const reg = new RegExp(keyword, 'i');  // 未验证 keyword
    result = result.filter(p => reg.test(p.name));
  }
};
```

**问题**:
- 用户输入直接传入 RegExp 构造函数
- 特殊字符可能导致 ReDoS (正则表达式拒绝服务)
- 或导致意外匹配行为

**影响**:
- 恶意输入可能导致性能问题
- 可能绕过搜索限制

**修复建议**:

```javascript
// ✅ 添加输入验证和转义
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export const getProducts = async (params?: { keyword?: string }) => {
  if (keyword) {
    // 1. 长度限制
    if (keyword.length > 100) {
      throw new Error('搜索关键词过长');
    }

    // 2. 移除危险字符
    const safeKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '');

    // 3. 使用转义后的字符串
    const reg = new RegExp(safeKeyword, 'i');
    result = result.filter(p => reg.test(p.name));
  }
};
```

**优先级**: 🟡 P2 - 本版本修复

---

### 5. 推广关系绑定缺少防重复检查

**位置**: `cloudfunctions/promotion/index.js` (推测问题)

**问题**:
- `checkDuplicateRegistration` 函数存在，但未确认是否在所有路径都被调用
- 可能存在用户可以通过不同 IP 或清除缓存绕过限制

**影响**:
- 恶意用户可以绑定多个账号获取奖励
- 破坏推广系统的公平性

**修复建议**:

```javascript
// ✅ 多层防护
async function checkDuplicateRegistration(openid, deviceInfo) {
  const checks = [];

  // 1. IP 限制
  const ipChecks = await db.collection('users')
    .where({
      _createTime: _.gte(new Date(Date.now() - IP_LIMIT_WINDOW)),
      clientIP: deviceInfo.ip
    })
    .count();
  if (ipChecks >= MAX_REGISTRATIONS_PER_IP) {
    return { valid: false, reason: 'IP_LIMIT' };
  }

  // 2. 设备指纹检查（如果可用）
  // ...

  // 3. OPENID 唯一性检查
  const existing = await db.collection('users')
    .where({ _openid: openid })
    .get();
  if (existing.data.length > 0) {
    return { valid: false, reason: 'ALREADY_EXISTS' };
  }

  return { valid: true };
}
```

**优先级**: 🟡 P2 - 验证并加强

---

### 6. 购物车数据缺少完整性校验

**位置**: `src/utils/api.ts:84-87`

```javascript
// ❌ 当前实现
export const getCartItems = async () => {
  const cartJson = uni.getStorageSync(CART_KEY);
  const cart: CartItem[] = cartJson ? JSON.parse(cartJson) : [];
  // 未验证数据结构，直接使用
  return cart.sort(...);
};
```

**问题**:
- 未处理 JSON.parse 可能失败的情况
- 未验证数据结构是否合法
- 恶意修改本地存储可能导致应用崩溃

**影响**:
- 应用可能因数据格式错误而崩溃
- 用户体验受损

**修复建议**:

```typescript
// ✅ 添加验证
import { z } from 'zod';  // 或使用简单的类型守卫

const CartItemSchema = z.object({
  _id: z.string(),
  productId: z.string(),
  name: z.string(),
  price: z.number(),
  quantity: z.number().min(1),
  selected: z.boolean(),
  // ...
});

export const getCartItems = async (): Promise<CartItem[]> => {
  try {
    const cartJson = uni.getStorageSync(CART_KEY);
    if (!cartJson) return [];

    const parsed = JSON.parse(cartJson);

    // 验证每个项目
    const validItems = parsed.filter(item => {
      try {
        CartItemSchema.parse(item);
        return true;
      } catch {
        return false;
      }
    });

    // 如果发现无效数据，清理并保存
    if (validItems.length !== parsed.length) {
      uni.setStorageSync(CART_KEY, JSON.stringify(validItems));
    }

    return validItems;
  } catch (error) {
    console.error('购物车数据损坏，重置为空', error);
    uni.removeStorageSync(CART_KEY);
    return [];
  }
};
```

**优先级**: 🟡 P3 - 用户体验改进

---

### 7. 订单状态更新缺少幂等性保证

**位置**: `cloudfunctions/order/index.js` (推测问题)

**问题**:
- 订单状态更新可能被并发调用
- 缺少乐观锁或版本控制
- 可能导致状态不一致

**影响**:
- 同一订单可能被多次处理
- 库存扣减可能重复

**修复建议**:

```javascript
// ✅ 使用数据库事务或版本号
async function updateOrderStatus(orderId, newStatus) {
  const order = await db.collection('orders').doc(orderId).get();

  // 1. 检查当前状态
  if (order.data.status === newStatus) {
    return { success: true, message: '已是目标状态' };
  }

  // 2. 状态机验证
  const validTransitions = {
    'pending': ['paid', 'cancelled'],
    'paid': ['shipping', 'cancelled'],
    'shipping': ['completed'],
    'cancelled': [],
    'completed': []
  };

  const allowed = validTransitions[order.data.status] || [];
  if (!allowed.includes(newStatus)) {
    return { success: false, message: '无效的状态转换' };
  }

  // 3. 条件更新（原子操作）
  const result = await db.collection('orders').doc(orderId).update({
    data: {
      status: newStatus,
      updateTime: new Date()
      // 可以添加版本号: _.inc('version', 1)
    }
  });

  return result;
}
```

**优先级**: 🟡 P2 - 数据一致性保证

---

### 8. 推广奖励计算缺少事务保护

**位置**: `cloudfunctions/promotion/index.js` - calculateReward 函数

**问题**:
- 奖励计算涉及多个数据库操作
- 缺少事务保护，部分失败可能导致数据不一致
- 性能更新和奖励记录可能不同步

**影响**:
- 奖励可能被重复发放
- 用户业绩统计可能不准确

**修复建议**:

```javascript
// ✅ 使用数据库事务（CloudBase 支持事务）
const transaction = await db.startTransaction();

try {
  // 1. 创建奖励记录
  const rewardId = await transaction.collection('reward_records').add({...});

  // 2. 更新用户余额
  await transaction.collection('users').doc(userId).update({
    data: {
      totalReward: _.inc(amount),
      pendingReward: _.inc(amount)
    }
  });

  // 3. 提交事务
  await transaction.commit();

  return { success: true, rewardId };
} catch (error) {
  await transaction.rollback();
  throw error;
}
```

**优先级**: 🟡 P2 - 资金安全相关

---

## 🟢 代码质量问题 (Minor - 优化建议)

### 9. 错误处理不统一

**位置**: 多个云函数

**问题**:
- 部分函数返回 `{ success, code, msg }`
- 部分函数返回 `{ success, data, message }`
- 部分函数抛出异常
- 前端需要适配多种响应格式

**修复建议**:

```javascript
// ✅ 统一响应格式
// cloudfunctions/common/response.js
function success(data, message = 'Success') {
  return { code: 0, msg: message, data };
}

function error(code, message, details = null) {
  return { code, msg: message, error: details };
}

// 在所有云函数中使用
module.exports = { success, error };
```

---

### 10. 魔法数字和字符串硬编码

**位置**: 多处

```javascript
// ❌ 硬编码的魔法数字
const IP_LIMIT_WINDOW = 24 * 60 * 60 * 1000;  // 24小时的毫秒数
const MAX_REGISTRATIONS_PER_IP = 3;  // 为什么是3？
const INVITE_CODE_LENGTH = 8;  // 为什么是8？
```

**修复建议**:

```javascript
// ✅ 使用配置对象
const LIMITS = {
  IP_WINDOW_HOURS: 24,
  MAX_IP_REGISTRATIONS: 3,
  INVITE_CODE_LENGTH: 8,
  MIN_REWARD_AMOUNT: 1,  // 分
  REWARD_PRECISION: 100  // 分
};

// 使用
const IP_LIMIT_WINDOW = LIMITS.IP_WINDOW_HOURS * 60 * 60 * 1000;
```

---

### 11. 类型安全问题

**位置**: `src/utils/api.ts:5`

```typescript
declare const wx: any;  // ❌ 使用 any
```

**修复建议**:

```typescript
// ✅ 定义微信接口类型
interface WxCloud {
  init: (options: { env: string }) => void;
  callFunction: (options: {
    name: string;
    data?: Record<string, unknown>
  }) => Promise<{
    result: unknown;
    errMsg?: string;
  }>;
}

declare const wx: {
  cloud: WxCloud;
  // ... 其他微信 API
};
```

---

### 12. 缺少日志级别控制

**位置**: 所有云函数

**问题**:
- 生产环境和开发环境使用相同的日志级别
- 开发调试信息可能泄露敏感数据
- 生产环境日志过多

**修复建议**:

```javascript
// ✅ 环境感知的日志
const ENV = process.env.TCB_ENV || 'dev';

const logger = {
  debug: (...args) => {
    if (ENV === 'dev') {
      console.log('[DEBUG]', ...args);
    }
  },
  info: (...args) => {
    if (ENV === 'dev' || ENV === 'test') {
      console.log('[INFO]', ...args);
    }
  },
  error: (...args) => {
    console.error('[ERROR]', ...args);
    // 生产环境应该上报到监控系统
  }
};
```

---

## 修复优先级路线图

### 第 1 阶段（本周内完成）- P0 严重问题
1. ✅ 管理员密码加密 (bcrypt)
2. ✅ 支付金额验证和幂等性
3. ✅ 日志脱敏处理

### 第 2 阶段（本月内完成）- P2 中等风险
4. ✅ 输入验证和防注入
5. ✅ 推广绑定多重防护
6. ✅ 订单状态事务保护
7. ✅ 奖励计算事务保护

### 第 3 阶段（技术债务清理）- P3 代码质量
8. ✅ 统一错误处理
9. ✅ 消除魔法数字
10. ✅ TypeScript 类型安全
11. ✅ 环境感知日志
12. ✅ 购物车数据验证

---

## 安全检查清单

在修复完成后，使用此清单验证:

### 身份验证
- [ ] 所有密码使用 bcrypt 或 argon2 哈希存储
- [ ] 管理员登录有速率限制
- [ ] 敏感操作需要二次验证
- [ ] 会话有合理的过期时间

### 输入验证
- [ ] 所有用户输入经过验证
- [ ] SQL/NoSQL 注入防护
- [ ] XSS 防护（前端输出转义）
- [ ] 文件上传类型和大小限制

### 数据安全
- [ ] 敏感字段加密存储
- [ ] 日志不包含敏感信息
- [ ] API 响应不暴露内部结构
- [ ] 使用 HTTPS

### 业务逻辑
- [ ] 金额计算精确（使用整数分）
- [ ] 状态机验证防止非法转换
- [ ] 幂等性保证
- [ ] 事务保护关键操作

---

## 推荐的开发实践

### 代码审查流程
1. 所有 PR 必须通过安全检查清单
2. 敏感代码（支付、权限）需要双人审查
3. 使用静态分析工具（ESLint + Security 插件）

### 测试策略
1. 单元测试覆盖核心业务逻辑
2. 集成测试覆盖 API 端点
3. 安全测试（SQL 注入、XSS、CSRF）
4. 性能测试（并发、压力测试）

### 监控告警
1. 设置错误率告警
2. 异常请求模式告警
3. 支付异常告警
4. 性能指标监控

---

**审查人**: Claude Code (Systematic Debugging Method)
**下一步**: 创建 GitHub Issues 跟踪所有发现的P0和P1问题
