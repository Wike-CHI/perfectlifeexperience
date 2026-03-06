/**
 * 充值档位配置
 * 首页和充值页面共用此配置
 * 完全依赖数据库配置，无向后兼容代码
 */

import { getSystemConfig } from '@/utils/api';

export interface RechargeOption {
  amount: number;  // 充值金额（元）
  gift: number;    // 赠送金额（元）
}

// 内存缓存
let cachedRechargeOptions: RechargeOption[] | null = null;
let configLoadPromise: Promise<RechargeOption[]> | null = null;

/**
 * 加载充值配置（仅从数据库获取）
 * 注意：如果数据库中无配置，将抛出错误
 */
export const loadRechargeConfig = async (): Promise<RechargeOption[]> => {
  // 如果已有缓存，直接返回
  if (cachedRechargeOptions) {
    return cachedRechargeOptions;
  }

  // 防止重复请求
  if (configLoadPromise) {
    return configLoadPromise;
  }

  configLoadPromise = (async () => {
    const config = await getSystemConfig();

    if (!config || !config.rechargeOptions || !Array.isArray(config.rechargeOptions) || config.rechargeOptions.length === 0) {
      throw new Error('数据库中未配置充值档位，请先在系统配置中设置');
    }

    cachedRechargeOptions = config.rechargeOptions;
    return cachedRechargeOptions;
  })();

  return configLoadPromise;
};

/**
 * 强制刷新充值配置
 */
export const refreshRechargeConfig = async (): Promise<RechargeOption[]> => {
  cachedRechargeOptions = null;
  configLoadPromise = null;
  return loadRechargeConfig();
};

/**
 * 获取充值档位配置（同步版本）
 * 注意：必须在调用 loadRechargeConfig 后使用，否则抛出错误
 */
export const getRechargeOptions = (): RechargeOption[] => {
  if (!cachedRechargeOptions) {
    throw new Error('请先调用 loadRechargeConfig() 加载配置');
  }
  return cachedRechargeOptions;
};

/**
 * 根据充值金额获取对应的赠送金额
 * @param amount 充值金额（元）
 * @returns 赠送金额（元），如果没有匹配档位返回0
 */
export const getGiftAmount = (amount: number): number => {
  const options = cachedRechargeOptions;
  if (!options) {
    throw new Error('请先调用 loadRechargeConfig() 加载配置');
  }
  const option = options.find(opt => opt.amount === amount);
  return option ? option.gift : 0;
};

/**
 * 计算总到账金额
 * @param amount 充值金额（元）
 * @returns 总到账金额 = 充值金额 + 赠送金额
 */
export const calculateTotalAmount = (amount: number): number => {
  const gift = getGiftAmount(amount);
  return amount + gift;
};

/**
 * 检查是否为有效的充值档位
 * @param amount 充值金额（元）
 */
export const isValidRechargeAmount = (amount: number): boolean => {
  const options = cachedRechargeOptions;
  if (!options) {
    throw new Error('请先调用 loadRechargeConfig() 加载配置');
  }
  return options.some(opt => opt.amount === amount);
};
