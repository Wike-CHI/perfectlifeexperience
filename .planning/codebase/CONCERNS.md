# Codebase Concerns

**Analysis Date:** 2026-03-03

## Tech Debt

### 1. 代码重复 - rateLimiter 模块

**Issue:** 存在三个相同的 `rateLimiter.js` 文件

- `cloudfunctions/common/rateLimiter.js`
- `cloudfunctions/order/common/rateLimiter.js`
- `cloudfunctions/layer/shared/rateLimiter.js`

**Impact:** 维护困难，修改需要同步三处

**Fix approach:** 统一使用 `cloudfunctions/common/rateLimiter.js`，删除其他重复文件

---

### 2. 代码重复 - logger 模块

**Issue:** 存在 9 个相同的 `logger.js` 文件

- `cloudfunctions/common/logger.js`
- `cloudfunctions/commission-wallet/common/logger.js`
- `cloudfunctions/order/common/logger.js`
- `cloudfunctions/promotion/common/logger.js`
- `cloudfunctions/wallet/common/logger.js`
- `cloudfunctions/product/common/logger.js`
- `cloudfunctions/user/common/logger.js`
- `cloudfunctions/wechatpay/logger.js`
- `cloudfunctions/layer/shared/logger.js`

**Impact:** 维护困难，日志格式不统一

**Fix approach:** 统一使用 `cloudfunctions/common/logger.js`，利用 CloudBase Layer 共享

---

### 3. 代码重复 - response 模块

**Issue:** 存在 5 个相同的 `response.js` 文件

- `cloudfunctions/common/response.js`
- `cloudfunctions/order/common/response.js`
- `cloudfunctions/promotion/common/response.js`
- `cloudfunctions/wallet/common/response.js`
- `cloudfunctions/layer/shared/response.js`

**Impact:** 响应格式不一致，维护困难

**Fix approach:** 统一使用 `cloudfunctions/common/response.js`

---

### 4. 代码重复 - validator 模块

**Issue:** 存在 4 个相同的 `validator.js` 文件

- `cloudfunctions/common/validator.js`
- `cloudfunctions/order/common/validator.js`
- `cloudfunctions/promotion/common/validator.js`
- `cloudfunctions/wallet/common/validator.js`

**Impact:** 验证规则不统一，代码冗余

**Fix approach:** 统一使用 `cloudfunctions/common/validator.js`

---

### 5. 数据库查询工具未完成

**Issue:** `src/utils/database.ts` 第 210 行的 `queryTeamMembers` 函数未实现

```typescript
// TODO: 需要先获取用户的 promotionPath
// 然后根据 level 构建查询条件

throw new Error('团队查询建议使用云函数，因为需要复杂业务逻辑')
```

**Files:** `src/utils/database.ts`

**Impact:** 团队查询功能依赖云函数，无法使用前端直接查询优化性能

**Fix approach:** 实现完整的团队查询逻辑或明确此功能仅通过云函数提供

---

### 6. 管理后台地图组件未完成

**Issue:** 订单详情页面中的地图组件未实现

```typescript
// TODO: 使用地图组件展示位置
```

**Files:** `src/pagesAdmin/orders/detail.vue` (第 225 行)

**Impact:** 订单配送地址无法在地图上展示

**Fix approach:** 实现地图组件展示功能

---

### 7. 微信订阅消息未接入

**Issue:** 多个云函数中存在待实现的微信通知功能

- `cloudfunctions/promotion/common/notification.js` - 推广通知
- `cloudfunctions/admin-api/common/notification.js` - 管理员通知

**Files:**
- `cloudfunctions/layer/shared/reward-settlement.js` (第 120 行)
- `cloudfunctions/common/reward-settlement.js` (第 120 行)
- `cloudfunctions/order/common/reward-settlement.js` (第 120 行)

**Impact:** 用户无法收到订单状态、推广奖励等微信通知

**Fix approach:** 接入微信订阅消息 API

---

### 8. 管理后台密码修改接口缺失

**Issue:** 管理员密码修改功能未实现

**Files:** 参考 `docs/ADMIN_PASSWORD_MIGRATION.md`

**Impact:** 管理员无法通过界面修改密码

**Fix approach:** 创建独立的密码修改接口

---

## Known Bugs

### 1. 前端控制台日志泄露

**Issue:** 前端代码中存在大量 `console.log/warn/error` 语句，生产环境会暴露敏感信息

**Files:**
- `src/App.vue` - 应用启动日志
- `src/utils/cloudbase.ts` - 云开发初始化日志
- `src/utils/api.ts` - API 调用日志
- `src/utils/admin-auth.ts` - 管理员认证日志

**Impact:** 调试信息泄露，可能包含用户行为轨迹

**Fix approach:** 生产环境禁用 console 或使用统一的日志模块

---

### 2. 云函数日志使用 console.error

**Issue:** 大量使用 `console.error` 而非结构化日志

**Files:** 几乎所有云函数文件

**Impact:** 日志格式不统一，难以集中分析和监控

**Fix approach:** 使用统一的日志模块 `common/logger.js`

---

## Security Considerations

### 1. 管理员密码安全

**Risk:** 需要确保所有管理员密码已迁移为 bcrypt 哈希格式

**Files:** `cloudfunctions/admin-api/auth.js`

**Current mitigation:**
- 实现了 bcrypt 哈希验证
- 拒绝非 bcrypt 格式的密码登录
- 安全警告日志记录

**Recommendations:**
- 定期检查密码哈希迁移进度
- 强制要求首次登录后修改默认密码

---

### 2. 频率限制模块

**Risk:** 频率限制失败时的安全策略

**Files:** `cloudfunctions/common/rateLimiter.js`

**Current mitigation:** 频率限制检查失败时拒绝请求（安全优先）

**Recommendations:**
- 定期清理过期记录 (`cleanupExpiredRecords`)
- 监控频率限制触发情况

---

### 3. 推广系统防刷机制

**Risk:** 需要防范恶意用户刷推广关系

**Files:** `cloudfunctions/promotion/index.js`

**Current mitigation:**
- IP 注册频率限制
- OPENID 重复检测
- 邀请码冲突处理

**Recommendations:**
- 增加设备指纹识别
- 完善风控规则

---

## Performance Bottlenecks

### 1. 团队统计查询性能

**Problem:** 推广团队成员统计使用递归查询，大团队可能超时

**Files:** `cloudfunctions/promotion/index.js` - `getTeamStats` 函数

**Cause:** 需要遍历整个团队树计算业绩

**Improvement path:**
- 添加缓存机制
- 使用数据库聚合管道
- 异步计算并更新缓存

---

### 2. 订单统计查询

**Problem:** 订单统计使用多次数据库查询

**Files:** `cloudfunctions/admin-api/index.js` - 订单统计相关函数

**Cause:** 缺乏复合索引

**Improvement path:**
- 创建复合索引 (`status`, `createTime`)
- 使用数据库聚合管道

---

### 3. 前端数据库查询工具

**Problem:** `src/utils/database.ts` 中部分查询被注释或抛出异常

**Files:** `src/utils/database.ts`

**Cause:** 复杂查询需要云函数支持

**Improvement path:**
- 实现 `queryTeamMembers` 函数
- 优化分页查询性能

---

## Fragile Areas

### 1. 推广关系绑定

**Files:** `cloudfunctions/promotion/index.js` - `bindRelation` 函数

**Why fragile:**
- 依赖用户邀请码唯一性
- 并发情况下可能产生重复绑定
- promotionPath 格式解析复杂

**Safe modification:**
- 建议在低峰期测试
- 增加事务支持
- 充分测试各种边界情况

**Test coverage:** 已有测试文件 `cloudfunctions/promotion/test.test.js`

---

### 2. 奖励结算逻辑

**Files:** `cloudfunctions/common/reward-settlement.js`

**Why fragile:**
- 浮点数金额计算
- 多级推广佣金分配逻辑复杂
- 订单状态变更时的回调处理

**Safe modification:**
- 使用整数计算（分而非元）
- 充分测试各种佣金分配场景

---

### 3. 支付回调处理

**Files:** `cloudfunctions/wechatpay/index.js`

**Why fragile:**
- 微信支付签名验证
- 并发回调处理
- 订单状态幂等性

**Safe modification:**
- 增加回调幂等性检查
- 使用数据库事务

---

## Scaling Limits

### 1. 数据库 NoSQL 限制

**Resource:** CloudBase NoSQL 数据库

**Current capacity:**
- 单次查询返回最大 100 条
- 无原生 JOIN 支持
- 事务支持有限

**Limit:** 复杂关联查询需要多次查询

**Scaling path:**
- 使用数据库聚合管道
- 考虑数据冗余设计
- 定期归档历史数据

---

### 2. 云函数并发限制

**Resource:** CloudBase 云函数

**Current capacity:** 未测试具体上限

**Limit:** 高并发场景可能出现冷启动延迟

**Scaling path:**
- 配置预热实例
- 使用定时触发器预热
- 考虑使用云托管

---

### 3. 小程序包体积

**Resource:** 微信小程序

**Current capacity:** 代码包接近 2MB 限制

**Limit:** 无法添加更多大型资源

**Scaling path:**
- 使用分包加载
- 压缩图片资源
- 移除未使用代码

---

## Dependencies at Risk

### 1. wx-server-sdk

**Risk:** 微信官方云开发 SDK 维护状态

**Impact:** 云函数无法调用微信 API

**Migration plan:** 保持关注官方更新，必要时迁移到新的 SDK

---

### 2. bcryptjs

**Risk:** 纯 JavaScript 实现，性能相对较低

**Impact:** 密码验证在高并发时可能成为瓶颈

**Migration plan:** 考虑使用 Node.js 原生 bcrypt（需要 C++ 编译）

---

### 3. Vue 3 和 UniApp 版本

**Risk:** 依赖版本较旧

**Impact:**
- `vue: 3.4.21` - 较新稳定版
- `@dcloudio/uni-app: 3.0.0-4060620250520001` - 快照版本

**Migration plan:**
- 评估升级到最新稳定版本
- 升级前充分测试

---

## Missing Critical Features

### 1. 完整的单元测试覆盖

**Feature gap:**
- 前端组件缺少测试
- 云函数仅部分有测试
- 缺少集成测试

**Blocks:** 难以保证代码质量，回归风险高

**Priority:** High

---

### 2. 监控和告警

**Feature gap:**
- 缺少云函数调用监控
- 缺少错误告警
- 缺少性能指标收集

**Blocks:** 无法及时发现和处理线上问题

**Priority:** High

---

### 3. API 文档

**Feature gap:**
- 缺少云函数 API 文档
- 缺少前端 API 文档

**Blocks:** 团队协作困难，新成员上手慢

**Priority:** Medium

---

## Test Coverage Gaps

### 1. 前端测试

**What's not tested:**
- Vue 组件渲染
- 页面交互逻辑
- 状态管理

**Files:** `src/**/*.vue`

**Risk:** UI 回归问题难以发现

**Priority:** High

---

### 2. 云函数集成测试

**What's not tested:**
- 支付回调并发
- 奖励结算边界情况
- 升级/降级逻辑

**Files:** `cloudfunctions/**/*.js` (部分无测试)

**Risk:** 业务逻辑错误可能进入生产

**Priority:** High

---

### 3. 推广系统核心逻辑

**What's not tested:**
-  follow-upgrade 机制
- 月度业绩重置逻辑
- 团队统计准确性

**Files:** `cloudfunctions/promotion/index.js`

**Risk:** 推广佣金计算错误可能导致财务损失

**Priority:** Critical

---

### 4. 错误处理路径

**What's not tested:**
- 数据库连接失败
- 微信 API 调用失败
- 网络超时处理

**Risk:** 线上异常无法正确处理

**Priority:** Medium

---

*Concerns audit: 2026-03-03*
