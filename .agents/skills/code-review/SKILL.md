---
name: code-review
description: 一键审查小程序各个功能和业务的全量代码，重点检查前后端接口一致性、数据类型不一致问题、业务逻辑错误等。适用于代码审查、质量检查、重构前评估等场景。
---

# 小程序全量代码审查 Skill

## 审查目标

对 UniApp + CloudBase 小程序项目进行全面的代码审查，重点关注：

1. **前后端接口一致性** - API 调用参数、返回值类型是否匹配
2. **数据类型一致性** - TypeScript 类型定义与实际数据是否一致
3. **业务逻辑正确性** - 推广系统、订单流程、钱包等核心业务
4. **代码质量** - 错误处理、安全性、性能问题

## 审查范围

### 前端模块 (`src/`)
- **API 层**: `src/utils/api.ts` - 所有云函数调用
- **类型定义**: `src/types/` - TypeScript 接口和类型
- **页面组件**: `src/pages/` - 各业务页面
- **工具函数**: `src/utils/` - 格式化、数据库查询等
- **Composables**: `src/composables/` - Vue 组合式函数

### 后端模块 (`cloudfunctions/`)
- **云函数**: 各个 `cloudfunctions/*/index.js`
- **共享工具**: `cloudfunctions/common/` - 响应格式、验证器等
- **配置**: `cloudfunctions/*/config.json` - 业务配置

### 核心业务模块
1. **推广系统** (`promotion`) - 四级代理、佣金计算、升级逻辑
2. **订单系统** (`order`) - 订单创建、支付、退款
3. **钱包系统** (`wallet`, `commission-wallet`) - 余额、佣金、提现
4. **用户系统** (`user`, `login`) - 认证、用户信息
5. **商品系统** (`product`) - 商品管理、库存
6. **支付系统** (`wechatpay`) - 微信支付集成
7. **管理后台** (`admin-api`) - 管理员操作

## 审查清单

### 1. 接口一致性检查

#### 前端 API 调用 vs 后端处理
```
检查项：
- [ ] action 参数名称是否一致
- [ ] 请求参数字段名是否匹配
- [ ] 返回数据结构是否一致
- [ ] 错误码处理是否完整
```

**示例检查点：**
```typescript
// 前端调用 (src/utils/api.ts)
export const createOrder = async (data: CreateOrderRequest) => {
  return callFunction('order', { action: 'createOrder', data });
};

// 后端处理 (cloudfunctions/order/index.js)
case 'createOrder':
  return await handleCreateOrder(data, wxContext);

// 需要检查：
// 1. CreateOrderRequest 类型字段与后端期望的字段是否一致
// 2. 返回的 Order 类型与后端返回的数据结构是否匹配
```

### 2. 数据类型一致性检查

#### TypeScript 类型 vs 数据库结构
```
检查项：
- [ ] 前端类型定义与数据库字段名是否一致
- [ ] 可选字段 (?) 与必填字段是否正确标注
- [ ] 枚举值是否同步
- [ ] 日期字段格式是否统一
```

**示例检查点：**
```typescript
// 前端类型 (src/types/index.ts)
interface User {
  _id: string;
  _openid: string;
  nickname: string;
  agentLevel: 1 | 2 | 3 | 4;  // 代理等级
  promotionPath: string;       // 推广路径
  performance: {               // 业绩数据
    totalSales: number;
    monthSales: number;
    monthTag: string;
    teamCount: number;
  };
}

// 需要对比：
// 1. cloudfunctions 中读写 users 集合时字段是否匹配
// 2. 数据库索引是否覆盖了常用查询字段
// 3. performance 嵌套对象的更新是否正确
```

### 3. 业务逻辑检查

#### 推广系统核心逻辑
```
检查项：
- [ ] 代理等级计算是否正确 (1-4级)
- [ ] 佣金分配比例是否符合业务规则
- [ ] 升级条件判断是否完整
- [ ] 跟随升级逻辑是否正确
- [ ] 月度重置是否正确处理
```

**关键规则：**
```javascript
// 佣金分配规则 (20% 佣金池)
const COMMISSION_RATIOS = {
  1: { self: 0.20 },                    // 一级：自己拿 20%
  2: { self: 0.12, parent1: 0.08 },     // 二级：自己 12%，上级 8%
  3: { self: 0.12, parent1: 0.04, parent2: 0.04 },  // 三级：自己 12%，两级上级各 4%
  4: { self: 0.08, parent1: 0.04, parent2: 0.04, parent3: 0.04 }  // 四级：自己 8%，三级上级各 4%
};

// 升级条件
const UPGRADE_CONDITIONS = {
  '4->3': { totalSales: 20000 },                           // 累计销售 2 万
  '3->2': { monthSales: 50000, teamCount: 50 },           // 月销 5 万 或 团队 50 人
  '2->1': { monthSales: 100000, teamCount: 200 }          // 月销 10 万 或 团队 200 人
};
```

### 4. 错误处理检查

```
检查项：
- [ ] 云函数是否使用统一的响应格式
- [ ] 异常是否被正确捕获和记录
- [ ] 前端是否处理了所有错误情况
- [ ] 用户友好的错误提示
```

### 5. 安全性检查

```
检查项：
- [ ] 所有云函数是否通过 wxContext.OPENID 获取用户身份
- [ ] 是否存在信任前端传入用户 ID 的情况
- [ ] 敏感操作是否有权限校验
- [ ] 数据库查询是否有合理的范围限制
```

## 审查流程

### Phase 1: 接口映射分析
1. 读取 `src/utils/api.ts`，提取所有云函数调用
2. 读取各云函数 `index.js`，提取 action 处理逻辑
3. 对比前端请求参数类型与后端处理逻辑
4. 对比后端返回数据与前端类型定义

### Phase 2: 类型定义审查
1. 读取 `src/types/` 下所有类型定义
2. 检查类型与数据库集合字段的对应关系
3. 检查跨模块使用的类型是否一致
4. 检查枚举值在各处的使用是否同步

### Phase 3: 业务逻辑审查
1. **推广系统**: 审查佣金计算、升级判断、团队统计
2. **订单系统**: 审查订单状态流转、库存扣减
3. **钱包系统**: 审查余额变动、交易记录
4. **支付系统**: 审查支付流程、回调处理

### Phase 4: 代码质量审查
1. 检查错误处理是否完善
2. 检查日志记录是否充分
3. 检查性能问题（N+1 查询、缺少索引）
4. 检查安全问题（SQL 注入、XSS 等）

## 输出格式

### 审查报告结构

```markdown
# 代码审查报告

## 概览
- 审查时间: YYYY-MM-DD HH:mm
- 审查范围: 前端模块、后端模块、核心业务
- 问题总数: X 个（严重: Y, 一般: Z, 轻微: W）

## 严重问题 (必须修复)

### [S001] 接口不一致: order/createOrder
- **位置**: `src/utils/api.ts:120` vs `cloudfunctions/order/index.js:45`
- **问题**: 前端传递 `couponId`，后端期望 `coupon_id`
- **影响**: 优惠券功能无法正常使用
- **修复建议**: 统一使用驼峰命名 `couponId`

## 一般问题 (建议修复)

### [M001] 类型定义不完整: User.performance
- **位置**: `src/types/index.ts:50`
- **问题**: `performance` 字段可能为空但未标记为可选
- **影响**: 可能导致空指针异常
- **修复建议**: 添加 `?` 标记或提供默认值

## 轻微问题 (可选修复)

### [L001] 日志缺失: promotion/calculateReward
- **位置**: `cloudfunctions/promotion/index.js:200`
- **问题**: 佣金计算过程缺少详细日志
- **影响**: 问题排查困难
- **修复建议**: 添加关键步骤的日志记录

## 改进建议

### 性能优化
1. `getTeamMembers` 查询建议添加索引
2. 考虑缓存热门商品数据

### 代码规范
1. 统一使用 `const` 的命名规范
2. 补充关键函数的注释
```

## 使用方式

在 Claude Code 中调用此 skill：

```
/code-review
```

或者指定审查范围：

```
/code-review --scope=promotion,order,wallet
```

## 注意事项

1. **只读操作**: 此 skill 仅进行代码分析和报告生成，不会自动修改代码
2. **业务理解**: 需要结合 `docs/system/推广体系商业说明.md` 理解业务规则
3. **增量审查**: 可以指定只审查最近修改的模块
4. **定期审查**: 建议在每次大版本发布前进行全量审查

## 相关文档

- `docs/system/推广体系商业说明.md` - 推广系统业务规则
- `docs/system/PROMOTION_SYSTEM.md` - 推广系统技术文档
- `CLAUDE.md` - 项目开发指南
- `docs/migration/DATABASE_MIGRATION_GUIDE.md` - 数据库迁移指南
