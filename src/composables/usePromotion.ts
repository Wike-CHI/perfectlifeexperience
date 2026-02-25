import { ref, computed } from 'vue';
import {
  getPromotionInfo,
  promoteAgentLevel,
  promoteStarLevel
} from '@/utils/api';
import type { PromotionInfo, PromotionHistoryItem } from '@/types';

export function usePromotion() {
  const user = ref<PromotionInfo>({
    inviteCode: '',
    starLevel: 0,
    agentLevel: 4,
    starLevelName: '普通会员',
    agentLevelName: '四级代理',
    totalReward: 0,
    pendingReward: 0,
    todayReward: 0,
    monthReward: 0,
    commissionReward: 0,
    repurchaseReward: 0,
    managementReward: 0,
    nurtureReward: 0,
    performance: {
      totalSales: 0,
      monthSales: 0,
      monthTag: '',
      directCount: 0,
      teamCount: 0
    },
    promotionProgress: {
      currentLevel: 0,
      nextLevel: 1,
      salesProgress: { current: 0, target: 2000000, percent: 0 },
      countProgress: { current: 0, target: 30, percent: 0 }
    },
    teamStats: {
      total: 0,
      level1: 0,
      level2: 0,
      level3: 0,
      level4: 0
    }
  });

  const promotionHistory = ref<PromotionHistoryItem[]>([]);
  const loading = ref(false);

  // 获取推广信息
  const fetchPromotionInfo = async () => {
    loading.value = true;
    try {
      const info = await getPromotionInfo();
      user.value = info;
      promotionHistory.value = (info as any).promotionHistory || [];
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
      // 云函数会从 wxContext.OPENID 自动获取用户ID，无需前端传递
      const result = await promoteAgentLevel(
        oldLevel,
        newLevel
      );

      if (result.success) {
        // 更新用户信息
        user.value.agentLevel = newLevel as 1 | 2 | 3 | 4;
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
      // 云函数会从 wxContext.OPENID 自动获取用户ID，无需前端传递
      const result = await promoteStarLevel(
        oldStarLevel,
        newStarLevel
      );

      if (result.success) {
        user.value.starLevel = newStarLevel as 0 | 1 | 2 | 3;
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
