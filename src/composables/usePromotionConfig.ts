import { ref } from 'vue';
import { getSystemConfig } from '@/utils/api';

/**
 * 推广配置接口
 */
export interface PromotionConfig {
  // 佣金比例 (百分比)
  level1Commission: number;
  level2Commission: number;
  level3Commission: number;
  level4Commission: number;

  // 晋升门槛
  bronzeTotalSales: number;  // 铜牌：累计销售额(元)
  silverTeamCount: number;   // 银牌：团队人数
  silverMonthSales: number;  // 银牌：月销售额(元)
  goldTeamCount: number;    // 金牌：团队人数
  goldMonthSales: number;   // 金牌：月销售额(元)

  // 其他配置
  minWithdrawAmount: number;
  withdrawFeeRate: number;
}

/**
 * 默认推广配置
 */
const DEFAULT_CONFIG: PromotionConfig = {
  level1Commission: 20,
  level2Commission: 12,
  level3Commission: 8,
  level4Commission: 4,

  bronzeTotalSales: 20000,
  silverTeamCount: 50,
  silverMonthSales: 50000,
  goldTeamCount: 200,
  goldMonthSales: 100000,

  minWithdrawAmount: 100,
  withdrawFeeRate: 0
};

/**
 * 佣金规则接口
 */
export interface CommissionRule {
  own: number;       // 自己拿的比例
  upstream: number[]; // 上级分配比例数组
}

/**
 * 晋升门槛接口
 */
export interface PromotionThreshold {
  totalSales?: number;  // 累计销售额
  monthSales?: number;  // 月销售额
  teamCount?: number;   // 团队人数
}

/**
 * 推广配置Composable
 * 用于从数据库获取推广配置，提供配置数据和计算逻辑
 */
export function usePromotionConfig() {
  const config = ref<PromotionConfig>({ ...DEFAULT_CONFIG });
  const loading = ref(false);
  const loaded = ref(false);

  /**
   * 加载推广配置
   */
  const loadConfig = async (force = false) => {
    // 如果已经加载过且不强制刷新，直接返回
    if (loaded.value && !force) {
      return config.value;
    }

    loading.value = true;
    try {
      const dbConfig = await getSystemConfig();

      if (dbConfig && Object.keys(dbConfig).length > 0) {
        // 合并数据库配置与默认配置
        config.value = {
          level1Commission: dbConfig.level1Commission ?? DEFAULT_CONFIG.level1Commission,
          level2Commission: dbConfig.level2Commission ?? DEFAULT_CONFIG.level2Commission,
          level3Commission: dbConfig.level3Commission ?? DEFAULT_CONFIG.level3Commission,
          level4Commission: dbConfig.level4Commission ?? DEFAULT_CONFIG.level4Commission,
          bronzeTotalSales: dbConfig.bronzeTotalSales ?? DEFAULT_CONFIG.bronzeTotalSales,
          silverTeamCount: dbConfig.silverTeamCount ?? DEFAULT_CONFIG.silverTeamCount,
          silverMonthSales: dbConfig.silverMonthSales ?? DEFAULT_CONFIG.silverMonthSales,
          goldTeamCount: dbConfig.goldTeamCount ?? DEFAULT_CONFIG.goldTeamCount,
          goldMonthSales: dbConfig.goldMonthSales ?? DEFAULT_CONFIG.goldMonthSales,
          minWithdrawAmount: dbConfig.minWithdrawAmount ?? DEFAULT_CONFIG.minWithdrawAmount,
          withdrawFeeRate: dbConfig.withdrawFeeRate ?? DEFAULT_CONFIG.withdrawFeeRate
        };
        loaded.value = true;
      }
    } catch (error) {
      console.error('加载推广配置失败:', error);
      // 使用默认配置
      config.value = { ...DEFAULT_CONFIG };
    } finally {
      loading.value = false;
    }

    return config.value;
  };

  /**
   * 获取佣金规则
   * 根据推广人等级返回佣金分配规则
   */
  const getCommissionRule = (level: number): CommissionRule => {
    const rules: Record<number, CommissionRule> = {
      1: {
        own: config.value.level1Commission / 100,
        upstream: []
      },
      2: {
        own: config.value.level2Commission / 100,
        upstream: [(config.value.level1Commission - config.value.level2Commission) / 100]
      },
      3: {
        own: config.value.level3Commission / 100,
        upstream: [
          (config.value.level2Commission - config.value.level3Commission) / 100,
          (config.value.level1Commission - config.value.level2Commission) / 100
        ]
      },
      4: {
        own: config.value.level4Commission / 100,
        upstream: [
          (config.value.level3Commission - config.value.level4Commission) / 100,
          (config.value.level2Commission - config.value.level3Commission) / 100,
          (config.value.level1Commission - config.value.level2Commission) / 100
        ]
      }
    };

    return rules[level] || rules[4];
  };

  /**
   * 获取晋升门槛
   * 根据当前等级返回晋升到下一级需要的条件
   */
  const getPromotionThreshold = (currentLevel: number): PromotionThreshold | null => {
    const thresholds: Record<number, PromotionThreshold> = {
      4: {
        totalSales: config.value.bronzeTotalSales
      },
      3: {
        monthSales: config.value.silverMonthSales,
        teamCount: config.value.silverTeamCount
      },
      2: {
        monthSales: config.value.goldMonthSales,
        teamCount: config.value.goldTeamCount
      }
    };

    return thresholds[currentLevel] || null;
  };

  /**
   * 格式化金额（分转元）
   */
  const formatMoney = (cents: number): string => {
    const yuan = cents / 100;
    if (yuan >= 10000) {
      return `${(yuan / 10000).toFixed(0)}万`;
    }
    return yuan.toLocaleString();
  };

  /**
   * 格式化配置金额（元转分）
   */
  const toCents = (yuan: number): number => {
    return yuan * 100;
  };

  return {
    config,
    loading,
    loaded,
    loadConfig,
    getCommissionRule,
    getPromotionThreshold,
    formatMoney,
    toCents
  };
}
