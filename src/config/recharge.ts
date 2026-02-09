/**
 * 充值档位配置
 * 首页和充值页面共用此配置
 */

export interface RechargeOption {
  amount: number;  // 充值金额（元）
  gift: number;    // 赠送金额（元）
}

/**
 * 充值档位列表
 * amount: 充值金额
 * gift: 赠送金额
 */
export const rechargeOptions: RechargeOption[] = [
  { amount: 200, gift: 10 },
  { amount: 500, gift: 35 },
  { amount: 1000, gift: 80 },
  { amount: 2000, gift: 200 }
];

/**
 * 获取充值档位配置
 */
export const getRechargeOptions = (): RechargeOption[] => {
  return rechargeOptions;
};

/**
 * 根据充值金额获取对应的赠送金额
 * @param amount 充值金额（元）
 * @returns 赠送金额（元），如果没有匹配档位返回0
 */
export const getGiftAmount = (amount: number): number => {
  const option = rechargeOptions.find(opt => opt.amount === amount);
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
  return rechargeOptions.some(opt => opt.amount === amount);
};
