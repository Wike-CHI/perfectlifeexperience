/**
 * 用户Mock数据
 * 包含不同级别的用户用于测试
 */
module.exports = {
  // 金牌推广员（Level 1）
  level1: {
    _id: 'user_level1_001',
    _openid: 'openid_level1_001',
    name: '金牌推广员',
    nickName: '金牌推广员',
    avatarUrl: 'https://example.com/avatar1.jpg',
    phone: '13800000001',
    agentLevel: 1, // AgentLevel.LEVEL_1
    promotionPath: '', // 无上级
    parentId: null, // 无上级
    performance: {
      totalSales: 150000, // 累计15万
      monthSales: 80000,  // 本月8万
      monthTag: '2026-03',
      teamCount: 250      // 团队250人
    },
    createTime: new Date('2025-01-01')
  },

  // 银牌推广员（Level 2）
  level2: {
    _id: 'user_level2_001',
    _openid: 'openid_level2_001',
    name: '银牌推广员',
    nickName: '银牌推广员',
    avatarUrl: 'https://example.com/avatar2.jpg',
    phone: '13800000002',
    agentLevel: 2, // AgentLevel.LEVEL_2
    promotionPath: 'user_level1_001', // 上级是金牌
    parentId: 'user_level1_001', // 直接上级
    performance: {
      totalSales: 80000,
      monthSales: 60000,
      monthTag: '2026-03',
      teamCount: 80
    },
    createTime: new Date('2025-06-01')
  },

  // 铜牌推广员（Level 3）
  level3: {
    _id: 'user_level3_001',
    _openid: 'openid_level3_001',
    name: '铜牌推广员',
    nickName: '铜牌推广员',
    avatarUrl: 'https://example.com/avatar3.jpg',
    phone: '13800000003',
    agentLevel: 3, // AgentLevel.LEVEL_3
    promotionPath: 'user_level2_001/user_level1_001', // 上级路径
    parentId: 'user_level2_001', // 直接上级
    performance: {
      totalSales: 25000,
      monthSales: 30000,
      monthTag: '2026-03',
      teamCount: 30
    },
    createTime: new Date('2025-10-01')
  },

  // 普通会员（Level 4）
  level4: {
    _id: 'user_level4_001',
    _openid: 'openid_level4_001',
    name: '普通会员',
    nickName: '普通会员',
    avatarUrl: 'https://example.com/avatar4.jpg',
    phone: '13800000004',
    agentLevel: 4, // AgentLevel.LEVEL_4
    promotionPath: 'user_level3_001/user_level2_001/user_level1_001',
    parentId: 'user_level3_001', // 直接上级
    performance: {
      totalSales: 5000,
      monthSales: 8000,
      monthTag: '2026-03',
      teamCount: 5
    },
    createTime: new Date('2026-01-01')
  },

  // 新注册用户（无级别）
  newUser: {
    _id: 'user_new_001',
    _openid: 'openid_new_001',
    name: '新用户',
    nickName: '新用户',
    avatarUrl: 'https://example.com/avatar5.jpg',
    phone: '13800000005',
    agentLevel: 4, // 默认为4级
    promotionPath: '',
    parentId: null, // 无上级
    performance: {
      totalSales: 0,
      monthSales: 0,
      monthTag: '2026-03',
      teamCount: 0
    },
    createTime: new Date()
  },

  // 测试用普通用户
  regularUser: {
    _id: 'user_regular_001',
    _openid: 'openid_regular_001',
    name: '普通用户',
    nickName: '普通用户',
    avatarUrl: 'https://example.com/avatar6.jpg',
    phone: '13800000006',
    agentLevel: 4,
    promotionPath: '',
    parentId: null, // 无上级
    performance: {
      totalSales: 1000,
      monthSales: 500,
      monthTag: '2026-03',
      teamCount: 0
    },
    createTime: new Date('2026-02-01')
  }
};
