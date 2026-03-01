# 代码审查执行模板

## 审查任务分解

### 任务 1: 接口映射分析

**目标**: 识别所有前后端接口调用，检查一致性

**步骤**:
1. 读取 `src/utils/api.ts`，提取所有 `callFunction` 调用
2. 提取每个调用的云函数名称、action、请求类型、返回类型
3. 读取对应云函数的 `index.js`
4. 检查 action 处理器的输入输出
5. 对比并记录不一致之处

**输出**: 接口映射表 + 问题列表

---

### 任务 2: 类型定义审查

**目标**: 检查 TypeScript 类型与实际数据的一致性

**步骤**:
1. 读取 `src/types/index.ts` - 主业务类型
2. 读取 `src/types/database.ts` - 数据库类型
3. 读取 `src/types/admin.ts` - 管理后台类型
4. 检查每个类型与数据库集合的对应关系
5. 检查跨模块使用的类型是否一致

**关键类型**:
- `User` - 用户信息
- `Order` - 订单信息
- `Product` - 商品信息
- `PromotionRelation` - 推广关系
- `RewardRecord` - 奖励记录
- `WalletTransaction` - 钱包交易
- `CommissionWallet` - 佣金钱包

**输出**: 类型一致性报告

---

### 任务 3: 核心业务逻辑审查

#### 3.1 推广系统审查

**文件**:
- `cloudfunctions/promotion/index.js`
- `cloudfunctions/common/constants.js`
- `src/utils/api.ts` (promotion 相关)
- `src/composables/usePromotion.ts`

**检查点**:
1. **代理等级计算**
   - 新用户注册时的等级设置
   - 等级由上级等级决定的逻辑

2. **佣金分配**
   - 四级代理的佣金比例是否正确
   - promotionPath 解析是否正确
   - 边界情况处理（无上级、路径不完整）

3. **升级逻辑**
   - 升级条件判断是否完整
   - 月度重置是否正确
   - 跟随升级是否正确实现

4. **团队统计**
   - 递归统计是否正确
   - 性能是否可接受

#### 3.2 订单系统审查

**文件**:
- `cloudfunctions/order/index.js`
- `src/pages/order/` 目录下所有页面
- `src/utils/api.ts` (order 相关)

**检查点**:
1. **订单创建**
   - 参数验证是否完整
   - 库存扣减是否正确
   - 价格计算是否正确

2. **支付流程**
   - 支付状态同步
   - 回调处理

3. **退款处理**
   - 退款条件检查
   - 退款金额计算
   - 佣金回退逻辑

#### 3.3 钱包系统审查

**文件**:
- `cloudfunctions/wallet/index.js`
- `cloudfunctions/commission-wallet/index.js`
- `src/pages/wallet/` 目录
- `src/pages/commission-wallet/`

**检查点**:
1. **余额操作**
   - 充值、消费、退款余额变动
   - 交易记录完整性

2. **提现处理**
   - 提现申请流程
   - 审核状态流转

3. **佣金结算**
   - 佣金入账时机
   - 佣金提现限制

---

### 任务 4: 错误处理审查

**检查范围**: 所有云函数和前端 API 调用

**检查点**:
1. 是否使用统一的 `common/response.js` 响应格式
2. try-catch 是否覆盖所有关键操作
3. 前端是否处理了所有错误码
4. 错误信息是否对用户友好

---

### 任务 5: 安全性审查

**检查点**:
1. **身份验证**
   - 所有云函数是否通过 `wxContext.OPENID` 获取用户
   - 是否存在信任前端传入的用户 ID

2. **权限控制**
   - 管理员操作是否有权限校验
   - 用户是否只能访问自己的数据

3. **数据安全**
   - 敏感数据是否加密存储
   - 数据库查询是否有范围限制

4. **输入验证**
   - 所有用户输入是否经过验证
   - 是否防止 SQL 注入、XSS

---

## 审查报告模板

```markdown
# [项目名称] 代码审查报告

**审查日期**: YYYY-MM-DD
**审查人**: Claude Code
**审查范围**: [具体模块列表]

## 执行摘要

- **总体评分**: X/10
- **问题统计**: 严重(X) 一般(X) 轻微(X)
- **核心发现**: [最重要的 3-5 个发现]

## 详细问题列表

### 严重问题 (Severity: Critical)

#### [C001] [问题标题]
- **类型**: 接口不一致 / 类型错误 / 安全漏洞
- **位置**:
  - 前端: `file:line`
  - 后端: `file:line`
- **问题描述**: [详细描述]
- **影响范围**: [哪些功能受影响]
- **复现步骤**:
  1. [步骤1]
  2. [步骤2]
- **修复建议**:
  ```typescript
  // 修复代码示例
  ```
- **优先级**: P0 (立即修复)

### 一般问题 (Severity: Medium)

[同上格式]

### 轻微问题 (Severity: Low)

[同上格式]

## 改进建议

### 性能优化
1. [建议1]
2. [建议2]

### 代码质量
1. [建议1]
2. [建议2]

### 文档完善
1. [建议1]
2. [建议2]

## 后续行动

| 优先级 | 问题编号 | 负责人 | 截止日期 | 状态 |
|--------|----------|--------|----------|------|
| P0 | C001 | TBD | TBD | 待处理 |
| P1 | M001 | TBD | TBD | 待处理 |

## 附录

### 审查方法论
- 静态代码分析
- 接口映射对比
- 类型一致性检查
- 业务逻辑审计

### 参考资料
- `docs/system/推广体系商业说明.md`
- `CLAUDE.md`
- `docs/system/PROMOTION_SYSTEM.md`
```

---

## 快速审查脚本

针对不同模块的快速审查命令：

```bash
# 仅审查推广系统
# /code-review --scope=promotion

# 审查订单和支付
# /code-review --scope=order,wechatpay

# 审查所有钱包相关
# /code-review --scope=wallet,commission-wallet

# 全量审查
# /code-review --scope=all
```
