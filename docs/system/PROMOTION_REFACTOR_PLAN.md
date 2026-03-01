# 推广分销系统重构计划

**目标**：将推广系统从"双轨制+四重分润"改为商业文档中定义的"单一四级代理制+百分比佣金分配"

**更新时间**：2026年2月

---

## 一、当前问题总结

| 问题类型 | 当前实现 | 目标实现 |
|---------|---------|---------|
| 等级体系 | `agentLevel` + `starLevel` 双轨制 | 只有 `agentLevel`，对应名称映射 |
| 佣金类型 | 基础佣金+复购+管理奖+育成津贴 | 只有佣金（按推广人等级分配） |
| 晋升条件 | 累计销售额 **或** 直推人数 | 累计销售额（无直推要求） |
| 升级机制 | `starLevel` 和 `agentLevel` 分开升级 | 统一升级 `agentLevel`，带跟随升级 |

---

## 二、等级对应关系（最终目标）

| agentLevel | 内部名称 | 对外名称 | 数据库值 |
|------------|---------|---------|---------|
| 0 | 总公司 | 总公司 | 0 |
| 1 | 一级代理 | 金牌推广员 | 1 |
| 2 | 二级代理 | 银牌推广员 | 2 |
| 3 | 三级代理 | 铜牌推广员 | 3 |
| 4 | 四级代理 | 普通会员 | 4 |

**关键**：删除 `starLevel` 字段，所有逻辑统一使用 `agentLevel`

---

## 三、修改文件清单

### 3.1 后端云函数

| 文件路径 | 修改类型 | 优先级 |
|---------|---------|--------|
| `cloudfunctions/promotion/common/constants.js` | 修改 | P0 |
| `cloudfunctions/common/constants.js` | 修改 | P0 |
| `cloudfunctions/promotion/index.js` | 重构 | P0 |
| `cloudfunctions/promotion/promotion-v2.js` | 修改 | P1 |
| `cloudfunctions/order/index.js` | 检查调用 | P2 |
| `cloudfunctions/rewardSettlement/index.js` | 检查调用 | P2 |
| `cloudfunctions/admin-api/index.js` | 检查调用 | P2 |

### 3.2 前端代码

| 文件路径 | 修改类型 | 优先级 |
|---------|---------|--------|
| `src/types/index.ts` | 修改类型定义 | P0 |
| `src/utils/api.ts` | 检查API调用 | P1 |
| `src/composables/usePromotion.ts` | 修改 | P1 |
| `src/constants/promotion.ts` | 修改 | P1 |
| `src/pages/promotion/*` | 修改页面逻辑 | P2 |

### 3.3 数据库

| 集合 | 修改类型 | 优先级 |
|------|---------|--------|
| `users` | 数据迁移 | P0 |
| `reward_records` | 检查兼容性 | P2 |

---

## 四、详细修改步骤

### 阶段一：常量重构（P0）

#### 4.1.1 修改 `cloudfunctions/promotion/common/constants.js`

**删除**：
```javascript
// 删除 StarLevel 常量
const StarLevel = { ... };

// 删除旧版佣金比例
PromotionRatio: {
  COMMISSION: { HEAD_OFFICE: 0.25, LEVEL_1: 0.20, ... },
  REPURCHASE: 0.03,
  MANAGEMENT: 0.02,
  NURTURE: 0.02
}

// 删除晋升门槛中的 DIRECT_COUNT
BRONZE: {
  TOTAL_SALES: 2000000,
  DIRECT_COUNT: 30  // 删除这行
}
```

**修改**：
```javascript
// 修改晋升门槛
const PromotionThreshold = {
  BRONZE: {
    totalSales: 2000000      // 累计2万元
  },
  SILVER: {
    monthSales: 5000000,     // 本月5万元
    teamCount: 50            // 或团队50人
  },
  GOLD: {
    monthSales: 10000000,    // 本月10万元
    teamCount: 200           // 或团队200人
  }
};

// 修改等级名称映射（agentLevel 对应对外名称）
const AgentLevelNames = {
  [AgentLevel.HEAD_OFFICE]: '总公司',
  [AgentLevel.LEVEL_1]: '金牌推广员',  // 一级代理对外叫金牌
  [AgentLevel.LEVEL_2]: '银牌推广员',  // 二级代理对外叫银牌
  [AgentLevel.LEVEL_3]: '铜牌推广员',  // 三级代理对外叫铜牌
  [AgentLevel.LEVEL_4]: '普通会员'    // 四级代理对外叫普通
};
```

#### 4.1.2 同步修改 `cloudfunctions/common/constants.js`

保持与 `promotion/common/constants.js` 一致

---

### 阶段二：云函数重构（P0）

#### 4.2.1 修改 `cloudfunctions/promotion/index.js`

**删除以下代码块**：

1. **删除旧版佣金计算函数**（第519-835行）：
   ```javascript
   // 删除 calculatePromotionReward 函数
   ```

2. **删除四重分润相关常量引用**（第122-124行）：
   ```javascript
   // 删除
   const REPURCHASE_RATIO = PromotionRatio.REPURCHASE;
   const MANAGEMENT_RATIO = PromotionRatio.MANAGEMENT;
   const NURTURE_RATIO = PromotionRatio.NURTURE;
   ```

3. **删除星级相关代码**：
   ```javascript
   // 删除
   const STAR_LEVEL_NAMES = { ... };
   const REWARD_TYPE_NAMES = { ... }; // 简化为只有 'commission'
   ```

4. **删除 checkStarLevelPromotion 函数**（第379-464行）：
   改为统一的 `checkAgentLevelPromotion` 函数

**修改以下代码**：

1. **重命名 V2 函数为主函数**：
   ```javascript
   // calculatePromotionRewardV2 改名为 calculatePromotionReward
   // 并移到文件主位置
   ```

2. **修改 bindPromotionRelation 函数**：
   ```javascript
   // 删除 starLevel 字段
   const userData = {
     _openid: OPENID,
     ...userInfo,
     inviteCode,
     parentId,
     promotionPath: currentPath,
     agentLevel: currentAgentLevel,  // 只保留这个
     // starLevel: 0,  // 删除
     performance: getDefaultPerformance(),
     // 删除 mentorId 相关
     // 删除分类奖励统计（repurchaseReward, managementReward, nurtureReward）
   };
   ```

3. **修改 getDefaultPerformance 函数**：
   ```javascript
   function getDefaultPerformance() {
     return {
       totalSales: 0,
       monthSales: 0,
       monthTag: getCurrentMonthTag(),
       teamCount: 0
       // directCount: 0  // 删除
     };
   }
   ```

4. **修改 checkPromotion/晋升检查函数**：
   ```javascript
   async function checkAgentLevelPromotion(openid) {
     // 检查 agentLevel 升级条件
     // 0→1: 累计2万
     // 1→2: 本月5万 或 团队50人
     // 2→3: 本月10万 或 团队200人
     // 注意：3是最高级（金牌），不是0
   }
   ```

5. **修改 getPromotionInfo 函数**：
   ```javascript
   // 删除 starLevel 相关字段
   // 统一使用 agentLevel + 对外名称映射
   const result = {
     code: 0,
     data: {
       inviteCode: user.inviteCode,
       agentLevel: user.agentLevel || 4,
       agentLevelName: AGENT_LEVEL_NAMES[user.agentLevel || 4], // 对外名称
       // 删除 starLevel, starLevelName
       totalReward: user.totalReward || 0,
       pendingReward: user.pendingReward || 0,
       // 删除分类奖励
       performance,
       promotionProgress,
       teamStats
     }
   };
   ```

6. **修改 createRewardRecord 函数**：
   ```javascript
   // 简化，只记录 commission 类型
   // 删除 repurchase, management, nurture 相关逻辑
   ```

7. **更新 switch 路由**：
   ```javascript
   switch (action) {
     case 'calculateReward':
       return await calculatePromotionReward(requestData, context); // V2改名为主函数
     case 'checkPromotion':
       return await checkAgentLevelPromotion(OPENID);
     case 'promoteAgentLevel':
       return await handlePromotionWithFollow(...);
     // 删除 case 'promoteStarLevel'
     // 删除 case 'calculateRewardV2'
   }
   ```

---

### 阶段三：前端类型修改（P0）

#### 4.3.1 修改 `src/types/index.ts`

```typescript
// 删除 StarLevel 类型
// 修改 User 类型
export interface User {
  // ... 其他字段
  agentLevel: number;        // 1-4
  // starLevel: number;      // 删除
  performance: {
    totalSales: number;
    monthSales: number;
    monthTag: string;
    teamCount: number;
    // directCount: number;  // 删除
  };
  // 删除分类奖励字段
}
```

#### 4.3.2 修改 `src/constants/promotion.ts`

```typescript
// 统一等级常量和名称
export const AGENT_LEVELS = {
  GOLD: 1,      // 金牌 = 一级
  SILVER: 2,    // 银牌 = 二级
  BRONZE: 3,    // 铜牌 = 三级
  NORMAL: 4     // 普通 = 四级
};

export const AGENT_LEVEL_NAMES = {
  0: '总公司',
  1: '金牌推广员',
  2: '银牌推广员',
  3: '铜牌推广员',
  4: '普通会员'
};
```

---

### 阶段四：数据库迁移（P0）

#### 4.4.1 创建迁移脚本

```javascript
// cloudfunctions/migration/index.js
// 添加新的迁移 action

async function migratePromotionSystem() {
  const db = cloud.database();

  // 1. 将现有 starLevel 映射到 agentLevel（如果需要）
  // 由于原来 starLevel 和 agentLevel 含义不同，需要确认映射关系

  // 2. 删除不需要的字段（可选，也可以保留但不使用）
  // 注意：不建议物理删除，可以先保留字段

  // 3. 更新 performance 对象，移除 directCount（可选）

  // 4. 更新晋升门槛配置
}
```

#### 4.4.2 数据兼容策略

**建议**：不删除数据库字段，保持向后兼容
- 保留 `starLevel` 字段但不再使用
- 保留 `directCount` 字段但不再检查
- 保留分类奖励字段但不再累加

**新用户**：只设置 `agentLevel`，不设置 `starLevel`

---

### 阶段五：前端页面修改（P1-P2）

#### 4.5.1 推广中心页面

- 移除双轨制显示
- 统一显示 `agentLevel` + 对外名称
- 修改晋升进度计算逻辑

#### 4.5.2 团队管理页面

- 显示成员的 `agentLevel`
- 移除 `starLevel` 显示

#### 4.5.3 奖励记录页面

- 只显示 `commission` 类型
- 移除其他奖励类型筛选

#### 4.5.4 佣金计算器页面

- 更新计算逻辑为 V2 版本
- 显示正确的百分比分配

---

## 五、测试计划

### 5.1 单元测试

- [ ] 测试 `calculatePromotionReward` (V2) 佣金计算
- [ ] 测试 `checkAgentLevelPromotion` 晋升条件
- [ ] 测试 `handlePromotionWithFollow` 跟随升级

### 5.2 集成测试

- [ ] 完整下单流程佣金分配
- [ ] 各等级推广人佣金分配正确性
- [ ] 升级后佣金分配变化
- [ ] 跟随升级机制

### 5.3 边界测试

- [ ] 无推广关系订单
- [ ] 推广链不完整（中间缺失上级）
- [ ] 退款后佣金扣回

---

## 六、执行顺序

1. **Week 1**: 阶段一（常量重构）+ 阶段三（类型修改）
2. **Week 2**: 阶段二（云函数重构）
3. **Week 3**: 阶段四（数据库迁移）+ 测试
4. **Week 4**: 阶段五（前端页面）+ 回归测试

---

## 七、回滚计划

如果出现问题，可以通过以下方式回滚：

1. **代码回滚**：Git revert 到重构前的 commit
2. **云函数回滚**：重新部署旧版本云函数
3. **数据兼容**：由于保留了旧字段，数据层面兼容

---

## 八、风险点

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| 现有用户数据迁移 | 中 | 保留旧字段，渐进式迁移 |
| 前端页面兼容 | 低 | 同时更新 API 返回格式 |
| 佣金计算错误 | 高 | 充分测试，灰度发布 |
| 升级逻辑错误 | 中 | 详细测试各种场景 |

---

## 九、验收标准

- [ ] 所有测试通过
- [ ] 佣金计算符合商业文档规则
- [ ] 晋升条件符合商业文档
- [ ] 跟随升级机制正常工作
- [ ] 前端页面正确显示单一等级
- [ ] 无 `starLevel` 相关代码残留
- [ ] 无四重分润代码残留
