module.exports = {
  P0_CRITICAL: {
    description: '核心业务逻辑',
    tests: ['commission-calculation', 'order-validation', 'payment-process', 'inventory-deduction'],
    requiredPassRate: 100
  },
  P1_HIGH: {
    description: '重要功能',
    tests: ['user-registration', 'promotion-system', 'product-management', 'refund-process'],
    requiredPassRate: 95
  },
  P2_MEDIUM: {
    description: '辅助功能',
    tests: ['coupon-system', 'address-management', 'wallet-management'],
    requiredPassRate: 90
  },
  P3_LOW: {
    description: '锦上添花功能',
    tests: ['ui-interactions', 'animation-effects', 'analytics-tracking'],
    requiredPassRate: 85
  },
  getTestsByPriority(priority) {
    return this[priority]?.tests || [];
  },
  getTestPriority(testName) {
    for (const [priority, config] of Object.entries(this)) {
      if (config.tests && config.tests.includes(testName)) {
        return priority;
      }
    }
    return 'P3_LOW';
  }
};
