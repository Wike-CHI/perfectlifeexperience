# 推广体系V2重构 - 实施总结

**日期**: 2026-02-23
**分支**: `feature/promotion-refactor`
**状态**: 核心逻辑已完成，待部署和测试

---

## 实施概述

本次重构实现了推广体系的核心功能，包括：
1. 新版佣金分配规则（基于推广人等级）
2. 跟随升级机制（上级升级带动下级）
3. 自动脱离机制（升级时脱离原推荐链）
4. 数据库迁移脚本

---

## 核心修改

### 1. 佣金规则变更

**文件**: `cloudfunctions/promotion/common/constants.js`

**新增 `CommissionV2` 配置**：
```javascript
const CommissionV2 = {
  HEAD_OFFICE_SHARE: 0.80,  // 公司拿80%

  LEVEL_1: {
    own: 0.20,        // 一级代理推广：自己拿20%
    upstream: []       // 无上级
  },
  LEVEL_2: {
    own: 0.12,        // 二级代理推广：自己拿12%
    upstream: [0.08]  // 一级代理拿8%
  },
  LEVEL_3: {
    own: 0.12,        // 三级代理推广：自己拿12%
    upstream: [0.04, 0.04]  // 二级代理拿4%，一级代理拿4%
  },
  LEVEL_4: {
    own: 0.08,        // 四级代理推广：自己拿8%
    upstream: [0.04, 0.04, 0.04]  // 三级/二级/一级各拿4%
  }
};
```

**关键点**：
- 佣金分配取决于**推广人的代理等级**，而非在链条中的位置
- 一级到四级代理都可以进行推广推广客户下单
- 推广人自己拿的佣金由其代理等级决定

---

### 2. 新版佣金计算

**文件**: `cloudfunctions/promotion/index.js`

**新增函数**: `calculatePromotionRewardV2()`

**核心逻辑**：
```javascript
async function calculatePromotionRewardV2(event, context) {
  // 1. 获取买家信息
  // 2. 找到推广人（通过 parentId）
  // 3. 获取推广人的代理等级（agentLevel）
  // 4. 根据推广人等级，获取佣金分配规则
  // 5. 解析推广路径，获取上级链
  // 6. 批量获取上级用户信息
  // 7. 按照规则分配佣金
}
```

**示例**：
- 四级代理D推广100元订单：D拿8元，D的上级(三级)拿4元，D的上上级(二级)拿4元，D的更上级(一级)拿4元
- 一级代理A推广100元订单：A拿20元，无上级

**新增API Action**：
```javascript
case 'calculateRewardV2':
  return await calculatePromotionRewardV2(requestData, context);
```

---

### 3. 跟随升级机制

**文件**: `cloudfunctions/promotion/promotion-v2.js`（新建）

**核心函数**：
```javascript
async function handlePromotionWithFollow(userId, newLevel, oldLevel)
```

**跟随升级规则**：
| 升级 | 跟随规则 |
|------|---------|
| **4→3** | 无跟随（但可发展新的四级） |
| **3→2** | 4级跟随升到3级 |
| **2→1** | 3级升到2级，4级升到3级 |

**自动脱离机制**：
- 用户升级时，自动脱离原推荐链
- 根据新等级，跳级对接上上级
- 例：D从4级升到3级，脱离C，成为B的下级

**升级历史记录**：
```javascript
promotionHistory: [{
  from: 4,           // 原等级
  to: 3,             // 新等级
  type: 'self',      // 'self' | 'follow'
  triggeredBy: 'xxx', // 触发者OPENID（跟随升级时）
  timestamp: Date,
  oldPath: 'A/B/C',
  newPath: 'A/B'
}]
```

**新增API Actions**：
```javascript
case 'promoteAgentLevel':
  return await handlePromotionWithFollow(
    requestData.userId || OPENID,
    requestData.newLevel,
    requestData.oldLevel
  );

case 'promoteStarLevel':
  return await handleStarLevelPromotion(
    requestData.userId || OPENID,
    requestData.newStarLevel,
    requestData.oldStarLevel
  );
```

---

### 4. 数据库迁移

**文件**: `cloudfunctions/promotion/migration-v2.js`（新建）

**users 集合新增字段**：
```javascript
{
  // 升级历史记录
  promotionHistory: [{
    from: Number,
    to: Number,
    type: String,      // 'self' | 'follow' | 'star_promotion'
    triggeredBy: String,
    timestamp: Date,
    oldPath: String,
    newPath: String
  }],

  // 原始推荐关系（审计用）
  originalParentId: String,
  originalPromotionPath: String
}
```

**promotion_orders 集合新增字段**：
```javascript
{
  promoterId: String,    // 推广人ID
  promoterLevel: Number  // 推广人等级
}
```

**promotion_relations 集合新增字段**：
```javascript
{
  status: String,          // 'active' | 'detached' | 'promoted'
  detachReason: String,    // 'self_promotion' | 'follow_promotion'
  detachedAt: Date
}
```

**索引创建**：
- `promotionHistory_timestamp`: 用于查询升级历史
- `promoterId`: 用于查询推广人的订单
- `promoterLevel`: 用于按等级统计

---

## API使用示例

### 1. 计算佣金（新版）

```javascript
// 调用云函数
wx.cloud.callFunction({
  name: 'promotion',
  data: {
    action: 'calculateRewardV2',
    data: {
      orderId: 'order123',
      buyerId: 'buyer_openid',
      orderAmount: 10000  // 100元（分为单位）
    }
  }
}).then(res => {
  console.log('佣金分配结果:', res.result.data.rewards);
});
```

### 2. 代理层级升级（带跟随）

```javascript
// D从四级升到三级
wx.cloud.callFunction({
  name: 'promotion',
  data: {
    action: 'promoteAgentLevel',
    data: {
      userId: 'user_openid',
      oldLevel: 4,
      newLevel: 3
    }
  }
}).then(res => {
  console.log('升级结果:', res.result);
});
```

### 3. 星级升级

```javascript
// 从铜牌升到银牌
wx.cloud.callFunction({
  name: 'promotion',
  data: {
    action: 'promoteStarLevel',
    data: {
      userId: 'user_openid',
      oldStarLevel: 1,
      newStarLevel: 2
    }
  }
}).then(res => {
  console.log('升级结果:', res.result);
});
```

---

## 部署步骤

### Phase 1: 准备阶段

1. **分支切换**
   ```bash
   git checkout feature/promotion-refactor
   ```

2. **备份数据**
   - 导出 `users` 集合
   - 导出 `promotion_orders` 集合
   - 导出 `reward_records` 集合

### Phase 2: 部署云函数

1. **更新 promotion 云函数**
   - 上传并部署 `cloudfunctions/promotion`
   - 确保所有文件已上传：
     - `index.js` (已更新)
     - `promotion-v2.js` (新建)
     - `migration-v2.js` (新建)
     - `common/constants.js` (已更新)

### Phase 3: 数据迁移

1. **运行迁移脚本**
   ```bash
   # 方式1：在云函数中测试
   # 在云开发控制台 → 云函数 → promotion → 测试
   # 输入：
   {
     "action": "migrate"
   }

   # 方式2：本地运行（如果配置了本地环境）
   node cloudfunctions/promotion/migration-v2.js
   ```

2. **验证迁移结果**
   - 检查 `users` 集合是否有新字段
   - 检查 `promotion_orders` 集合是否有新字段
   - 检查索引是否创建成功

### Phase 4: 测试验证

1. **单元测试**
   - 测试 `calculateRewardV2` 各种场景
   - 测试 `handlePromotionWithFollow` 各种升级路径
   - 使用模拟器验证结果

2. **集成测试**
   - 使用测试订单验证佣金计算
   - 测试升级流程和跟随机制
   - 验证脱离机制

### Phase 5: 前端适配

1. **更新API调用**
   - 将 `calculateReward` 改为 `calculateRewardV2`
   - 添加升级相关API调用

2. **更新UI展示**
   - 更新佣金规则页面
   - 更新推广中心页面
   - 添加升级提示

---

## 测试场景

### 场景1：一级代理推广

**初始状态**：A（一级代理）

**操作**：A推广客户下单100元

**预期结果**：
- A拿20元
- 总佣金：20元

### 场景2：二级代理推广

**初始状态**：A（一级） → B（二级）

**操作**：B推广客户下单100元

**预期结果**：
- B拿12元
- A拿8元
- 总佣金：20元

### 场景3：三级代理推广

**初始状态**：A（一级） → B（二级） → C（三级）

**操作**：C推广客户下单100元

**预期结果**：
- C拿12元
- B拿4元
- A拿4元
- 总佣金：20元

### 场景4：四级代理推广

**初始状态**：A（一级） → B（二级） → C（三级） → D（四级）

**操作**：D推广客户下单100元

**预期结果**：
- D拿8元
- C拿4元
- B拿4元
- A拿4元
- 总佣金：20元

### 场景5：D从四级升到三级（自己升级）

**初始状态**：A（一级） → B（二级） → C（三级） → D（四级）

**操作**：D从四级升到三级

**预期结果**：
- D脱离C，成为B的下级
- 推广路径：`A/B` （D的新路径）
- promotionHistory 记录升级

**新结构**：
```
A（一级） → B（二级） → D（三级）
           ↓
         C（三级）
```

### 场景6：D从三级升到二级（带动E）

**初始状态**：A（一级） → B（二级） → D（三级） → E（四级）

**操作**：D从三级升到二级

**预期结果**：
- D脱离B，成为A的下级
- E跟随D，从四级升到三级
- E脱离D，成为A的下级
- promotionHistory 记录所有升级

**新结构**：
```
A（一级） → D（二级） → 新四级
         ↓
       E（三级）
```

### 场景7：D从二级升到一级（带动整个团队）

**初始状态**：
```
A（一级） → B（二级） → D（二级） → 新三级
                        ↓
                     C（一级） → E（二级） → F（三级）
```

**操作**：D从二级升到一级

**预期结果**：
- D脱离A，成为独立总公司
- C被D带动，从二级升到一级（不对，应该是C保持不变，因为C是一级）
- E被C带动，从二级升到一级（如果C是一级）
- F被E带动，从三级升到二级

**注意**：这个场景需要根据实际业务逻辑确认

---

## 与旧系统的差异

### 佣金计算方式

| 对比项 | 旧系统 | 新系统 |
|-------|--------|--------|
| **佣金分配依据** | 在链条中的位置 | 推广人的代理等级 |
| **奖励类型** | 4种（基础+复购+管理+育成） | 1种（基础佣金） |
| **计算复杂度** | 高（275+行代码） | 低（150行代码） |
| **总拨出比例** | 可变（最高30%+） | 固定20% |

### 升级机制

| 对比项 | 旧系统 | 新系统 |
|-------|--------|--------|
| **升级后关系** | 保持不变 | 自动脱离 |
| **跟随升级** | 无 | 有（3→2, 2→1） |
| **升级历史** | 无记录 | 完整记录 |

---

## 注意事项

### 1. 向后兼容性

- 旧订单继续使用旧逻辑（`calculateReward`）
- 新订单使用新逻辑（`calculateRewardV2`）
- 可通过时间戳控制切换点

### 2. 数据迁移

- 迁移脚本会批量处理数据
- 建议在低峰期执行
- 执行前务必备份数据

### 3. 性能考虑

- 新版计算逻辑更简单，性能应更好
- 索引创建后查询性能提升
- 建议监控云函数执行时间

### 4. 用户通知

- 升级后推广关系会变化
- 建议提前通知用户
- 提供升级前预览功能

---

## 下一步工作

### 待完成

1. ✅ 核心逻辑实现
2. ✅ 数据迁移脚本
3. ⏳ 执行数据迁移
4. ⏳ 前端适配
5. ⏳ 全面测试
6. ⏳ 部署上线

### 可选优化

1. 添加升级前预览功能
2. 添加佣金计算器（小程序内）
3. 添加推广关系可视化
4. 优化性能（缓存、索引）

---

## 相关文档

- [推广体系商业说明](../system/推广体系商业说明.md)
- [推广系统技术文档](../system/PROMOTION_SYSTEM.md)
- [推广体系更新总结](./2026-02-23-promotion-system-update-summary.md)
- [推广模拟器设计](./2026-02-23-promotion-simulator-design.md)

---

## 变更日志

**2026-02-23**
- 创建 feature/promotion-refactor 分支
- 实现 CommissionV2 佣金规则
- 实现 calculatePromotionRewardV2 函数
- 实现 handlePromotionWithFollow 跟随升级机制
- 创建 migration-v2.js 数据迁移脚本
- 提交代码（commit 10e97a2）

---

**文档作者**: Claude Sonnet 4.6
**最后更新**: 2026-02-23
