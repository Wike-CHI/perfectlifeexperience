# 推广体系V2 - 前端适配设计文档

**日期**: 2026-02-24
**方案**: 方案A - 一次性全面更新
**状态**: 设计已确认，待实施

---

## 概述

将前端全面适配到推广体系V2，包括API调用更新和UI展示更新。

**目标**：
- 更新所有API调用以使用新的V2佣金计算
- 更新UI以展示新的佣金分配规则
- 添加升级提示功能
- 添加佣金计算器

**切换策略**：全部使用V2（立即切换）

---

## 架构设计

### 文件结构

```
src/
├── types/index.ts                    # 更新类型定义
├── utils/api.ts                      # 更新API调用
├── composables/
│   └── usePromotion.ts              # 新增：推广状态管理
├── components/
│   └── PromotionUpgradeAlert.vue    # 新增：升级提示组件
├── pages/promotion/
│   ├── reward-rules.vue             # 更新：佣金规则页面
│   ├── center.vue                   # 更新：推广中心页面
│   └── commission-calculator.vue    # 新增：佣金计算器页面
```

---

## API层更新

### 1. 更新现有API

**文件**: `src/utils/api.ts`

```typescript
// 修改 calculatePromotionReward 函数
export const calculatePromotionReward = async (
  orderId: string,
  buyerId: string,
  orderAmount: number
) => {
  const res = await callFunction('promotion', {
    action: 'calculateRewardV2',  // 改为V2
    orderId,
    buyerId,
    orderAmount
  });

  if (res.code === 0) {
    return res.data;
  }
  throw new Error(res.msg || '计算失败');
};
```

### 2. 新增升级相关API

```typescript
// 代理层级升级
export const promoteAgentLevel = async (
  userId: string,
  oldLevel: number,
  newLevel: number
) => {
  const res = await callFunction('promotion', {
    action: 'promoteAgentLevel',
    userId,
    oldLevel,
    newLevel
  });
  // ...
};

// 星级升级
export const promoteStarLevel = async (
  userId: string,
  oldStarLevel: number,
  newStarLevel: number
) => {
  const res = await callFunction('promotion', {
    action: 'promoteStarLevel',
    userId,
    oldStarLevel,
    newStarLevel
  });
  // ...
};
```

---

## 类型定义更新

**文件**: `src/types/index.ts`

```typescript
// V2佣金分配结果
interface CommissionV2Reward {
  beneficiaryId: string;
  beneficiaryName: string;
  type: 'commission';
  amount: number;
  ratio: number;
  role: string;
}

// V2佣金计算响应
interface CommissionV2Response {
  rewards: CommissionV2Reward[];
  promoterLevel: number;
  commissionRule: {
    own: number;
    upstream: number[];
  };
}

// 升级历史记录
interface PromotionHistoryItem {
  from: number;
  to: number;
  type: 'self' | 'follow' | 'star_promotion';
  triggeredBy?: string;
  timestamp: Date;
  oldPath?: string;
  newPath?: string;
}

// 升级响应
interface PromotionResponse {
  success: boolean;
  promoted: {
    userId: string;
    from: number;
    to: number;
    newPath: string;
  };
  followUpdates: Array<{
    childId: string;
    childName: string;
    from: number;
    to: number;
  }>;
}
```

---

## 组件设计

### 1. 升级提示组件

**文件**: `src/components/PromotionUpgradeAlert.vue`

**功能**：
- 显示升级成功消息
- 显示跟随升级的下级列表
- 显示佣金变化对比

**Props**:
```typescript
interface Props {
  show: boolean;
  oldLevel: number;
  newLevel: number;
  followUpdates: Array<{
    childId: string;
    childName: string;
    from: number;
    to: number;
  }>;
}
```

---

## 页面设计

### 1. 佣金规则页面

**文件**: `src/pages/promotion/reward-rules.vue`

**更新内容**：
- 移除旧的四重分润说明
- 添加新的佣金分配表格
- 添加示例说明

**佣金分配表格**：

| 推广人等级 | 推广人拿 | 上级分配 | 总计 |
|----------|---------|---------|------|
| 一级代理 | 20% | 无 | 20% |
| 二级代理 | 12% | 一级8% | 20% |
| 三级代理 | 12% | 二级4% + 一级4% | 20% |
| 四级代理 | 8% | 三级4% + 二级4% + 一级4% | 20% |

### 2. 推广中心页面

**文件**: `src/pages/promotion/center.vue`

**更新内容**：
- 显示用户的佣金比例
- 显示晋升进度
- 添加"佣金计算器"入口
- 添加升级提示

### 3. 佣金计算器页面

**文件**: `src/pages/promotion/commission-calculator.vue` (新建)

**功能**：
- 输入订单金额
- 选择推广人等级
- 实时计算佣金分配
- 可视化展示结果

---

## 状态管理

**文件**: `src/composables/usePromotion.ts` (新建)

```typescript
export function usePromotion() {
  const user = ref<PromotionUser>({...});
  const promotionHistory = ref<PromotionHistoryItem[]>([]);
  const loading = ref(false);

  const fetchPromotionInfo = async () => {...};
  const upgradeAgentLevel = async (newLevel: number) => {...};
  const upgradeStarLevel = async (newStarLevel: number) => {...};

  return {
    user,
    promotionHistory,
    loading,
    fetchPromotionInfo,
    upgradeAgentLevel,
    upgradeStarLevel
  };
}
```

---

## 路由配置

**文件**: `src/pages.json`

```json
{
  "pages": [
    {
      "path": "pages/promotion/commission-calculator",
      "style": {
        "navigationBarTitleText": "佣金计算器"
      }
    }
  ]
}
```

---

## 数据流

```
用户操作
  → 组件事件
  → Composable函数
  → API调用
  → 云函数处理
  → 返回结果
  → 更新状态
  → UI刷新
```

---

## 错误处理

### 降级策略

当V2 API失败时，降级到旧版API：

```typescript
try {
  // 尝试V2
  return await calculatePromotionRewardV2(...);
} catch (error) {
  // 降级到旧版
  console.warn('V2失败，降级到旧版');
  return await calculatePromotionRewardLegacy(...);
}
```

### 用户提示

- 网络错误：提示"网络异常，请稍后重试"
- 计算失败：提示"佣金计算失败，请联系客服"
- 升级失败：提示具体错误原因

---

## 测试计划

### 单元测试

- API函数测试
- Composable函数测试
- 组件props测试

### 集成测试

- 佣金计算流程测试
- 升级流程测试
- 佣金计算器测试

### 手动测试

- 测试所有页面显示
- 测试所有交互功能
- 测试边界情况

---

## 部署计划

1. 开发环境验证
2. 测试环境部署
3. 用户验收测试
4. 生产环境部署
5. 监控和反馈

---

## 回滚方案

如果出现问题：

1. 立即回滚代码到之前的commit
2. 删除新增的页面和组件
3. 恢复API调用到旧版本

---

**文档作者**: Claude Sonnet 4.6
**最后更新**: 2026-02-24
