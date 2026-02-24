# 推广体系V2前端适配实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 全面更新前端以使用推广体系V2佣金计算，包括API调用更新和UI展示更新。

**Architecture:** 一次性全面更新，从旧版四重分润系统切换到新版简化佣金系统（20%/12%/8%/4%比例）。

**Tech Stack:** UniApp (Vue 3 + TypeScript), Tencent CloudBase, 云函数

---

## 前置条件

1. 已完成推广体系V2后端实现并合并到main分支
2. 19个单元测试全部通过
3. 设计文档已确认：`docs/plans/2026-02-24-frontend-adaptation-design.md`

---

## Task 1: 更新类型定义

**Files:**
- Modify: `src/types/index.ts`

**Step 1: 添加V2相关类型定义**

在 `src/types/index.ts` 末尾添加以下类型：

```typescript
// ==================== 推广体系V2类型定义 ====================

// V2佣金分配结果
interface CommissionV2Reward {
  beneficiaryId: string;
  beneficiaryName: string;
  type: 'commission';
  amount: number;
  ratio: number;
  role: string;  // '推广人' | '1级上级' | '2级上级' | '3级上级'
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

// 推广用户信息（V2）
interface PromotionUserV2 {
  _openid: string;
  agentLevel: number;  // 1-4
  starLevel: number;   // 0-3
  promotionPath: string;
  promotionHistory: PromotionHistoryItem[];
  // ... 其他字段
}
```

**Step 2: 保存文件**

**Step 3: 提交**

```bash
git add src/types/index.ts
git commit -m "feat(types): add V2 commission types"
```

---

## Task 2: 更新API层 - 佣金计算

**Files:**
- Modify: `src/utils/api.ts:1099-1121`

**Step 1: 修改 calculatePromotionReward 函数**

找到第1099-1121行的 `calculatePromotionReward` 函数，将 `action: 'calculateReward'` 改为 `action: 'calculateRewardV2'`：

```typescript
// 计算订单推广奖励（订单完成后调用）
export const calculatePromotionReward = async (orderId: string, buyerId: string, orderAmount: number) => {
  if (typeof wx === 'undefined' || !wx.cloud) {
    throw new Error('当前环境不支持云开发');
  }

  try {
    const res = await callFunction('promotion', {
      action: 'calculateRewardV2',  // 改为V2
      orderId,
      buyerId,
      orderAmount
    });

    if (res.code === 0) {
      return res.data as CommissionV2Response;
    }
    throw new Error(res.msg || '计算失败');
  } catch (error) {
    console.error('计算奖励失败:', error);
    throw error;
  }
};
```

**Step 2: 保存文件**

**Step 3: 提交**

```bash
git add src/utils/api.ts
git commit -m "feat(api): update to calculateRewardV2"
```

---

## Task 3: 添加升级相关API

**Files:**
- Modify: `src/utils/api.ts`

**Step 1: 在文件末尾添加新的API函数**

在 `src/utils/api.ts` 最后添加以下函数：

```typescript
// ==================== 推广升级相关 API ====================

// 代理层级升级（带跟随升级）
export const promoteAgentLevel = async (
  userId: string,
  oldLevel: number,
  newLevel: number
): Promise<PromotionResponse> => {
  if (typeof wx === 'undefined' || !wx.cloud) {
    throw new Error('当前环境不支持云开发');
  }

  try {
    const res = await callFunction('promotion', {
      action: 'promoteAgentLevel',
      userId,
      oldLevel,
      newLevel
    });

    if (res.code === 0) {
      return res.data as PromotionResponse;
    }
    throw new Error(res.msg || '升级失败');
  } catch (error) {
    console.error('代理层级升级失败:', error);
    throw error;
  }
};

// 星级升级
export const promoteStarLevel = async (
  userId: string,
  oldStarLevel: number,
  newStarLevel: number
): Promise<{ success: boolean; promoted: { userId: string; from: number; to: number } }> => {
  if (typeof wx === 'undefined' || !wx.cloud) {
    throw new Error('当前环境不支持云开发');
  }

  try {
    const res = await callFunction('promotion', {
      action: 'promoteStarLevel',
      userId,
      oldStarLevel,
      newStarLevel
    });

    if (res.code === 0) {
      return res.data;
    }
    throw new Error(res.msg || '升级失败');
  } catch (error) {
    console.error('星级升级失败:', error);
    throw error;
  }
};
```

**Step 2: 保存文件**

**Step 3: 提交**

```bash
git add src/utils/api.ts
git commit -m "feat(api): add promotion upgrade APIs"
```

---

## Task 4: 创建状态管理Composable

**Files:**
- Create: `src/composables/usePromotion.ts`

**Step 1: 创建文件**

创建 `src/composables/usePromotion.ts`：

```typescript
import { ref, computed } from 'vue';
import {
  getPromotionInfo,
  promoteAgentLevel,
  promoteStarLevel
} from '@/utils/api';
import type { PromotionUserV2, PromotionHistoryItem, PromotionResponse } from '@/types';

export function usePromotion() {
  const user = ref<PromotionUserV2>({
    _openid: '',
    agentLevel: 4,
    starLevel: 0,
    promotionPath: '',
    promotionHistory: [],
    nickName: '',
    avatarUrl: ''
  });

  const promotionHistory = ref<PromotionHistoryItem[]>([]);
  const loading = ref(false);

  // 获取推广信息
  const fetchPromotionInfo = async () => {
    loading.value = true;
    try {
      const info = await getPromotionInfo();
      user.value = info.user;
      promotionHistory.value = info.promotionHistory || [];
    } catch (error) {
      console.error('获取推广信息失败:', error);
      throw error;
    } finally {
      loading.value = false;
    }
  };

  // 计算我的佣金比例
  const myCommissionRatio = computed(() => {
    const ratios: Record<number, number> = {
      1: 20,  // 一级代理
      2: 12,  // 二级代理
      3: 12,  // 三级代理
      4: 8    // 四级代理
    };
    return ratios[user.value.agentLevel] || 8;
  });

  // 计算上级佣金比例
  const upstreamRatios = computed(() => {
    const ratios: Record<number, number[]> = {
      1: [],                  // 一级无上级
      2: [0.08],             // 二级：一级拿8%
      3: [0.04, 0.04],       // 三级：二级4%，一级4%
      4: [0.04, 0.04, 0.04]  // 四级：三级4%，二级4%，一级4%
    };
    return ratios[user.value.agentLevel] || [];
  });

  // 升级代理等级
  const upgradeAgentLevel = async (newLevel: number) => {
    const oldLevel = user.value.agentLevel;
    loading.value = true;
    try {
      const result = await promoteAgentLevel(
        user.value._openid,
        oldLevel,
        newLevel
      );

      if (result.success) {
        // 更新用户信息
        user.value.agentLevel = newLevel;
        return result;
      }
      throw new Error('升级失败');
    } catch (error) {
      console.error('升级失败:', error);
      throw error;
    } finally {
      loading.value = false;
    }
  };

  // 升级星级
  const upgradeStarLevel = async (newStarLevel: number) => {
    const oldStarLevel = user.value.starLevel;
    loading.value = true;
    try {
      const result = await promoteStarLevel(
        user.value._openid,
        oldStarLevel,
        newStarLevel
      );

      if (result.success) {
        user.value.starLevel = newStarLevel;
        return result;
      }
      throw new Error('升级失败');
    } catch (error) {
      console.error('升级失败:', error);
      throw error;
    } finally {
      loading.value = false;
    }
  };

  return {
    user,
    promotionHistory,
    loading,
    myCommissionRatio,
    upstreamRatios,
    fetchPromotionInfo,
    upgradeAgentLevel,
    upgradeStarLevel
  };
}
```

**Step 2: 保存文件**

**Step 3: 提交**

```bash
git add src/composables/usePromotion.ts
git commit -m "feat(composable): add usePromotion composable"
```

---

## Task 5: 创建升级提示组件

**Files:**
- Create: `src/components/PromotionUpgradeAlert.vue`

**Step 1: 创建组件文件**

创建 `src/components/PromotionUpgradeAlert.vue`：

```vue
<template>
  <view class="promotion-upgrade-alert" v-if="show">
    <view class="alert-backdrop" @click="close"></view>
    <view class="alert-content">
      <view class="alert-icon">🎉</view>
      <view class="alert-title">恭喜升级！</view>
      <view class="alert-message">
        您已从{{ levelNames[oldLevel] }}升级到{{ levelNames[newLevel] }}
      </view>

      <!-- 跟随升级提示 -->
      <view v-if="followUpdates.length > 0" class="follow-upgrade">
        <view class="follow-title">下级跟随升级：</view>
        <view class="follow-list">
          <view v-for="item in followUpdates" :key="item.childId" class="follow-item">
            {{ item.childName }} 已从{{ levelNames[item.from] }}升到{{ levelNames[item.to] }}
          </view>
        </view>
      </view>

      <!-- 佣金变化对比 -->
      <view class="commission-compare">
        <view class="compare-title">佣金变化：</view>
        <view class="compare-item">
          之前：{{ oldCommission }}元/百元
          <text class="arrow">→</text>
          现在：{{ newCommission }}元/百元
        </view>
        <view class="compare-increase" v-if="commissionDiff > 0">
          提升 +{{ commissionDiff }}元！
        </view>
      </view>

      <button class="alert-close" @click="close">知道了</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue';

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

const props = defineProps<Props>();
const emit = defineEmits<{
  (e: 'close'): void;
}>();

const levelNames: Record<number, string> = {
  1: '一级代理',
  2: '二级代理',
  3: '三级代理',
  4: '四级代理'
};

// 计算佣金变化
const oldCommission = computed(() => {
  const commissions = { 1: 20, 2: 12, 3: 12, 4: 8 };
  return commissions[props.oldLevel as keyof typeof commissions] || 8;
});

const newCommission = computed(() => {
  const commissions = { 1: 20, 2: 12, 3: 12, 4: 8 };
  return commissions[props.newLevel as keyof typeof commissions] || 8;
});

const commissionDiff = computed(() => newCommission.value - oldCommission.value);

const close = () => {
  emit('close');
};
</script>

<style lang="scss" scoped>
.promotion-upgrade-alert {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
}

.alert-backdrop {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
}

.alert-content {
  position: relative;
  width: 80%;
  max-width: 400px;
  background: #fff;
  border-radius: 16rpx;
  padding: 40rpx;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.1);
}

.alert-icon {
  font-size: 80rpx;
  text-align: center;
  margin-bottom: 20rpx;
}

.alert-title {
  font-size: 36rpx;
  font-weight: bold;
  text-align: center;
  margin-bottom: 20rpx;
  color: #3D2914;
}

.alert-message {
  font-size: 28rpx;
  text-align: center;
  margin-bottom: 30rpx;
  color: #666;
}

.follow-upgrade {
  background: #f5f5f5;
  border-radius: 12rpx;
  padding: 20rpx;
  margin-bottom: 30rpx;
}

.follow-title {
  font-size: 26rpx;
  font-weight: bold;
  margin-bottom: 10rpx;
  color: #3D2914;
}

.follow-item {
  font-size: 24rpx;
  color: #666;
  margin-bottom: 8rpx;
  padding-left: 20rpx;
}

.commission-compare {
  margin-bottom: 30rpx;
}

.compare-title {
  font-size: 26rpx;
  font-weight: bold;
  margin-bottom: 10rpx;
  color: #3D2914;
}

.compare-item {
  font-size: 26rpx;
  color: #666;
  margin-bottom: 10rpx;
}

.arrow {
  margin: 0 10rpx;
}

.compare-increase {
  font-size: 28rpx;
  font-weight: bold;
  color: #C9A962;
}

.alert-close {
  width: 100%;
  background: #3D2914;
  color: #fff;
  border: none;
  border-radius: 12rpx;
  padding: 24rpx;
  font-size: 32rpx;
}
</style>
```

**Step 2: 保存文件**

**Step 3: 提交**

```bash
git add src/components/PromotionUpgradeAlert.vue
git commit -m "feat(component): add PromotionUpgradeAlert component"
```

---

## Task 6: 更新佣金规则页面

**Files:**
- Modify: `src/pages/promotion/reward-rules.vue`

**Step 1: 读取现有页面内容**

先阅读 `src/pages/promotion/reward-rules.vue` 了解当前结构

**Step 2: 替换为新的佣金规则内容**

将页面内容替换为展示新的20%/12%/8%/4%分配规则（详细代码见设计文档）

**Step 3: 保存文件**

**Step 4: 提交**

```bash
git add src/pages/promotion/reward-rules.vue
git commit -m "feat(page): update reward rules page to V2"
```

---

## Task 7: 更新推广中心页面

**Files:**
- Modify: `src/pages/promotion/center.vue`

**Step 1: 读取现有页面内容**

先阅读 `src/pages/promotion/center.vue` 了解当前结构

**Step 2: 集成 usePromotion composable**

在 script 部分导入并使用 `usePromotion`

**Step 3: 更新UI展示**

显示用户的佣金比例和晋升进度（详细代码见设计文档）

**Step 4: 保存文件**

**Step 5: 提交**

```bash
git add src/pages/promotion/center.vue
git commit -m "feat(page): update promotion center page"
```

---

## Task 8: 创建佣金计算器页面

**Files:**
- Create: `src/pages/promotion/commission-calculator.vue`
- Modify: `src/pages.json`

**Step 1: 创建计算器页面**

创建 `src/pages/promotion/commission-calculator.vue`（详细代码见设计文档）

**Step 2: 添加路由配置**

在 `src/pages.json` 的 `pages` 数组中添加：

```json
{
  "path": "pages/promotion/commission-calculator",
  "style": {
    "navigationBarTitleText": "佣金计算器"
  }
}
```

**Step 3: 保存文件**

**Step 4: 提交**

```bash
git add src/pages/promotion/commission-calculator.vue src/pages.json
git commit -m "feat(page): add commission calculator page"
```

---

## Task 9: 集成升级提示组件

**Files:**
- Modify: `src/pages/promotion/center.vue`

**Step 1: 导入升级提示组件**

```vue
<script setup lang="ts">
import PromotionUpgradeAlert from '@/components/PromotionUpgradeAlert.vue';
// ...
</script>
```

**Step 2: 添加组件到模板**

```vue
<template>
  <view class="promotion-center">
    <!-- 现有内容 -->

    <!-- 升级提示 -->
    <PromotionUpgradeAlert
      :show="showUpgradeAlert"
      :oldLevel="upgradeInfo.oldLevel"
      :newLevel="upgradeInfo.newLevel"
      :followUpdates="upgradeInfo.followUpdates"
      @close="showUpgradeAlert = false"
    />
  </view>
</template>
```

**Step 3: 添加状态管理**

```typescript
const showUpgradeAlert = ref(false);
const upgradeInfo = ref({
  oldLevel: 0,
  newLevel: 0,
  followUpdates: []
});

// 在升级成功后调用
const handleUpgradeSuccess = (result: PromotionResponse) => {
  upgradeInfo.value = {
    oldLevel: result.promoted.from,
    newLevel: result.promoted.to,
    followUpdates: result.followUpdates
  };
  showUpgradeAlert.value = true;
};
```

**Step 4: 保存文件**

**Step 5: 提交**

```bash
git add src/pages/promotion/center.vue
git commit -m "feat(page): integrate upgrade alert component"
```

---

## Task 10: 添加到推广中心的入口

**Files:**
- Modify: `src/pages/promotion/center.vue`

**Step 1: 添加"佣金计算器"按钮**

在推广中心页面的快捷操作区域添加按钮：

```vue
<button class="action-btn secondary" @click="goToCalculator">
  佣金计算器
</button>
```

**Step 2: 添加导航方法**

```typescript
const goToCalculator = () => {
  uni.navigateTo({
    url: '/pages/promotion/commission-calculator'
  });
};
```

**Step 3: 保存文件**

**Step 4: 提交**

```bash
git add src/pages/promotion/center.vue
git commit -m "feat(page): add calculator entry button"
```

---

## Task 11: 类型检查

**Step 1: 运行TypeScript类型检查**

```bash
npm run type-check
```

**Step 2: 修复类型错误**

如果有类型错误，逐个修复

**Step 3: 提交修复**

```bash
git add .
git commit -m "fix: resolve type errors"
```

---

## Task 12: 本地测试

**Step 1: 启动开发服务器**

```bash
npm run dev:mp-weixin
```

**Step 2: 在微信开发者工具中测试**

- 打开小程序
- 测试佣金规则页面显示
- 测试推广中心页面显示
- 测试佣金计算器功能
- 测试升级提示组件

**Step 3: 验证API调用**

- 检查网络请求是否正确调用 `calculateRewardV2`
- 验证返回数据格式正确
- 测试升级API调用

**Step 4: 记录测试结果**

创建测试报告文档

---

## Task 13: 提交所有更改

**Step 1: 检查状态**

```bash
git status
```

**Step 2: 添加所有更改**

```bash
git add .
```

**Step 3: 创建最终提交**

```bash
git commit -m "feat(promotion): complete frontend adaptation to V2

- Updated API calls to use calculateRewardV2
- Added upgrade APIs (promoteAgentLevel, promoteStarLevel)
- Created usePromotion composable for state management
- Added PromotionUpgradeAlert component
- Updated reward rules page with new commission structure
- Updated promotion center page
- Added commission calculator page
- Integrated upgrade alerts into promotion center

All changes follow the V2 commission system:
- Level 1: 20%
- Level 2: 12% + 8%
- Level 3: 12% + 4% + 4%
- Level 4: 8% + 4% + 4% + 4%

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 14: 合并到main分支

**Step 1: 切换到main分支**

```bash
git checkout main
```

**Step 2: 合并feature分支**

```bash
git merge feature/frontend-promotion-v2-adaptation --no-ff
```

**Step 3: 推送到远程**

```bash
git push origin main
```

---

## 验证清单

在部署前确认：

- [ ] 所有TypeScript类型检查通过
- [ ] 所有页面正常显示
- [ ] API调用使用V2版本
- [ ] 佣金计算器功能正常
- [ ] 升级提示组件正常工作
- [ ] 在微信开发者工具中测试通过
- [ ] 代码已提交到main分支
- [ ] 文档已更新

---

## 回滚方案

如果出现问题：

```bash
# 回滚到之前的commit
git revert HEAD
git push origin main

# 或者硬重置
git reset --hard <previous-commit>
git push --force origin main
```

---

**计划创建时间**: 2026-02-24
**预计完成时间**: 1-2天
**优先级**: 高
