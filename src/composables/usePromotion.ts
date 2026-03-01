import { ref, computed } from 'vue';
import {
  getPromotionInfo,
  promoteAgentLevel
} from '@/utils/api';
import type { PromotionInfo, AgentLevel } from '@/types';
import { AGENT_LEVEL_NAMES } from '@/constants/promotion';

export function usePromotion() {
  const user = ref<PromotionInfo>({
    inviteCode: '',
    agentLevel: 4,
    agentLevelName: '普通会员',
    agentLevelInternalName: '四级代理',
    totalReward: 0,
    pendingReward: 0,
    withdrawableReward: 0,
    todayReward: 0,
    monthReward: 0,
    performance: {
      totalSales: 0,
      monthSales: 0,
      monthTag: '',
      teamCount: 0
    },
    promotionProgress: null,
    teamStats: {
      total: 0,
      level1: 0,
      level2: 0,
      level3: 0,
      level4: 0
    }
  });

  const loading = ref(false);

  // 获取推广信息
  const fetchPromotionInfo = async () => {
    loading.value = true;
    try {
      const info = await getPromotionInfo();
      user.value = info;
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
      1: 20,  // 一级代理（金牌）
      2: 12,  // 二级代理（银牌）
      3: 12,  // 三级代理（铜牌）
      4: 8    // 四级代理（普通）
    };
    return ratios[user.value.agentLevel] || 8;
  });

  // 计算上级佣金比例
  const upstreamRatios = computed(() => {
    const ratios: Record<number, number[]> = {
      1: [],                  // 一级无上级
      2: [8],                // 二级：一级拿8%
      3: [4, 4],             // 三级：二级4%，一级4%
      4: [4, 4, 4]           // 四级：三级4%，二级4%，一级4%
    };
    return ratios[user.value.agentLevel] || [];
  });

  // 升级代理等级
  const upgradeAgentLevel = async (newLevel: AgentLevel) => {
    const oldLevel = user.value.agentLevel;
    loading.value = true;
    try {
      const result = await promoteAgentLevel(oldLevel, newLevel);

      // 返回格式: { oldLevel, newLevel, followedUsers }
      if (result.newLevel === newLevel) {
        // 更新用户信息
        user.value.agentLevel = newLevel;
        user.value.agentLevelName = AGENT_LEVEL_NAMES[newLevel] || '普通会员';
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

  // 代理等级名称
  const agentLevelName = computed(() => user.value.agentLevelName);

  // 代理等级内部名称
  const agentLevelInternalName = computed(() => user.value.agentLevelInternalName);

  return {
    user,
    loading,
    myCommissionRatio,
    upstreamRatios,
    agentLevelName,
    agentLevelInternalName,
    fetchPromotionInfo,
    upgradeAgentLevel
  };
}
