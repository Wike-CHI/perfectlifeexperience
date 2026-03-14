/**
 * 推广关系Mock数据
 * 用于测试推广关系建立和佣金分配
 */
module.exports = {
  // 简单的2级关系
  simple: {
    _id: 'relation_simple_001',
    parentId: 'user_level2_001',
    childId: 'user_level3_001',
    level: 2, // 2级关系
    createTime: new Date('2025-10-01')
  },

  // 复杂的4级关系
  complex: {
    level1ToLevel2: {
      _id: 'relation_l1_l2_001',
      parentId: 'user_level1_001',
      childId: 'user_level2_001',
      level: 1,
      createTime: new Date('2025-06-01')
    },
    level2ToLevel3: {
      _id: 'relation_l2_l3_001',
      parentId: 'user_level2_001',
      childId: 'user_level3_001',
      level: 2,
      createTime: new Date('2025-10-01')
    },
    level3ToLevel4: {
      _id: 'relation_l3_l4_001',
      parentId: 'user_level3_001',
      childId: 'user_level4_001',
      level: 3,
      createTime: new Date('2026-01-01')
    }
  },

  // 新用户注册关系
  newUser: {
    _id: 'relation_new_001',
    parentId: 'user_level4_001', // 由4级推广员推荐
    childId: 'user_new_001',
    level: 4,
    inviteCode: 'INVITE001',
    createTime: new Date()
  },

  // 边界情况：5级关系（不应存在）
  edge: {
    level4ToLevel5: {
      _id: 'relation_edge_001',
      parentId: 'user_level4_001',
      childId: 'user_level5_invalid', // 5级用户（无效）
      level: 4,
      createTime: new Date()
    }
  },

  // 团队统计数据
  teamStats: {
    level1: {
      directCount: 5,   // 直推5人
      teamCount: 250,   // 团队250人
      totalSales: 150000 // 累计销售额15万
    },
    level2: {
      directCount: 10,
      teamCount: 80,
      totalSales: 80000
    },
    level3: {
      directCount: 15,
      teamCount: 30,
      totalSales: 25000
    },
    level4: {
      directCount: 3,
      teamCount: 5,
      totalSales: 5000
    }
  }
};
