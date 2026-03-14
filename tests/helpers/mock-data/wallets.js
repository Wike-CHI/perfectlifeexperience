/**
 * 钱包Mock数据
 * 用于测试钱包余额、充值、提现等功能
 */
module.exports = {
  // 有余额钱包
  withBalance: {
    _id: 'wallet_with_balance_001',
    userId: 'user_level3_001',
    balance: 50000, // 500元（单位：分）
    totalRecharge: 100000, // 累计充值1000元
    totalConsumption: 50000, // 累计消费500元
    createTime: new Date('2025-10-01'),
    updateTime: new Date()
  },

  // 空钱包
  empty: {
    _id: 'wallet_empty_001',
    userId: 'user_level4_001',
    balance: 0,
    totalRecharge: 0,
    totalConsumption: 0,
    createTime: new Date('2026-01-01'),
    updateTime: new Date()
  },

  // 大额钱包
  large: {
    _id: 'wallet_large_001',
    userId: 'user_level1_001',
    balance: 500000, // 5000元
    totalRecharge: 1000000, // 累计充值10000元
    totalConsumption: 500000, // 累计消费5000元
    createTime: new Date('2025-01-01'),
    updateTime: new Date()
  },

  // 钱包交易记录
  transactions: {
    recharge: {
      _id: 'txn_recharge_001',
      walletId: 'wallet_with_balance_001',
      type: 'recharge', // 充值
      amount: 10000, // 100元
      balanceBefore: 40000,
      balanceAfter: 50000,
      status: 'completed',
      description: '余额充值',
      createTime: new Date()
    },
    consumption: {
      _id: 'txn_consumption_001',
      walletId: 'wallet_with_balance_001',
      type: 'consumption', // 消费
      amount: -2800, // -28元
      balanceBefore: 50000,
      balanceAfter: 47200,
      status: 'completed',
      description: '订单支付',
      orderId: 'order_paid_001',
      createTime: new Date()
    },
    refund: {
      _id: 'txn_refund_001',
      walletId: 'wallet_with_balance_001',
      type: 'refund', // 退款
      amount: 2800, // 28元
      balanceBefore: 47200,
      balanceAfter: 50000,
      status: 'completed',
      description: '订单退款',
      orderId: 'order_refunded_001',
      createTime: new Date()
    }
  }
};
