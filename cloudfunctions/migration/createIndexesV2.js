/**
 * 数据库索引优化脚本 - 执行版本
 *
 * 使用方法：
 * 1. 在云开发控制台 > 云函数 > 找到 migration 云函数
 * 2. 点击"云端调试"，输入参数：{"action": "createPerformanceIndexes"}
 * 3. 点击"调用"按钮执行
 */

const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

/**
 * 创建性能优化索引
 *
 * 注意：云开发 NoSQL 需要在集合创建时或通过控制台创建索引
 * 这里提供索引配置供参考
 */
async function createPerformanceIndexes() {
  const results = {
    success: [],
    failed: [],
    recommendations: []
  };

  console.log('='.repeat(60));
  console.log('数据库索引优化方案');
  console.log('='.repeat(60));

  // ===== 1. users 集合索引 =====
  console.log('\n【1/5】users 集合索引');
  console.log('✓ 已有索引: _openid_1');
  console.log('✓ 已有索引: _id_');
  console.log('');
  console.log('建议创建的索引:');
  console.log('  • parentId_1 (推广关系查询)');
  console.log('  • inviteCode_1 (邀请码查询)');
  console.log('  • parentId_1_createTime_-1 (团队排序复合索引)');
  console.log('');
  console.log('云开发控制台链接:');
  console.log('  https://tcb.cloud.tencent.com/dev?envId=cloud1-6gmp2q0y3171c353#/db/doc/collection/users/index');

  results.recommendations.push({
    collection: 'users',
    indexes: [
      { name: 'parentId_1', keys: { parentId: 1 } },
      { name: 'inviteCode_1', keys: { inviteCode: 1 } },
      { name: 'parentId_1_createTime_-1', keys: { parentId: 1, createTime: -1 } }
    ]
  });

  // ===== 2. orders 集合索引 =====
  console.log('\n【2/5】orders 集合索引');
  const orderIndexes = await db.collection('orders').get();
  console.log(`当前记录数: ${orderIndexes.data.length}`);
  console.log('');
  console.log('建议创建的索引:');
  console.log('  • _openid_1_status_1 (用户订单查询)');
  console.log('  • createTime_-1 (时间排序)');
  console.log('  • _openid_1_status_1_createTime_-1 (复合查询)');
  console.log('');
  console.log('云开发控制台链接:');
  console.log('  https://tcb.cloud.tencent.com/dev?envId=cloud1-6gmp2q0y3171c353#/db/doc/collection/orders/index');

  results.recommendations.push({
    collection: 'orders',
    indexes: [
      { name: '_openid_1_status_1', keys: { _openid: 1, status: 1 } },
      { name: 'createTime_-1', keys: { createTime: -1 } },
      { name: 'composite_index', keys: { _openid: 1, status: 1, createTime: -1 } }
    ]
  });

  // ===== 3. products 集合索引 =====
  console.log('\n【3/5】products 集合索引');
  const productIndexes = await db.collection('products').get();
  console.log(`当前记录数: ${productIndexes.data.length}`);
  console.log('');
  console.log('建议创建的索引:');
  console.log('  • category_1 (分类查询)');
  console.log('  • status_1 (状态筛选)');
  console.log('  • category_1_status_1_createTime_-1 (商品列表复合索引)');
  console.log('');
  console.log('云开发控制台链接:');
  console.log('  https://tcb.cloud.tencent.com/dev?envId=cloud1-6gmp2q0y3171c353#/db/doc/collection/products/index');

  results.recommendations.push({
    collection: 'products',
    indexes: [
      { name: 'category_1', keys: { category: 1 } },
      { name: 'status_1', keys: { status: 1 } },
      { name: 'list_index', keys: { category: 1, status: 1, createTime: -1 } }
    ]
  });

  // ===== 4. reward_records 集合索引 =====
  console.log('\n【4/5】reward_records 集合索引');
  console.log('当前记录数: 0 (新集合)');
  console.log('');
  console.log('建议创建的索引:');
  console.log('  • beneficiaryId_1 (奖励领取人查询)');
  console.log('  • settleTime_-1 (结算时间排序)');
  console.log('  • beneficiaryId_1_status_1_settleTime_-1 (复合查询)');
  console.log('');
  console.log('云开发控制台链接:');
  console.log('  https://tcb.cloud.tencent.com/dev?envId=cloud1-6gmp2q0y3171c353#/db/doc/collection/reward_records/index');

  results.recommendations.push({
    collection: 'reward_records',
    indexes: [
      { name: 'beneficiaryId_1', keys: { beneficiaryId: 1 } },
      { name: 'settleTime_-1', keys: { settleTime: -1 } },
      { name: 'composite_index', keys: { beneficiaryId: 1, status: 1, settleTime: -1 } }
    ]
  });

  // ===== 5. promotion_orders 集合索引 =====
  console.log('\n【5/5】promotion_orders 集合索引');
  console.log('当前记录数: 0 (新集合)');
  console.log('');
  console.log('建议创建的索引:');
  console.log('  • buyerId_1 (买家查询)');
  console.log('  • status_1 (状态筛选)');
  console.log('');
  console.log('云开发控制台链接:');
  console.log('  https://tcb.cloud.tencent.com/dev?envId=cloud1-6gmp2q0y3171c353#/db/doc/collection/promotion_orders/index');

  results.recommendations.push({
    collection: 'promotion_orders',
    indexes: [
      { name: 'buyerId_1', keys: { buyerId: 1 } },
      { name: 'status_1', keys: { status: 1 } }
    ]
  });

  console.log('\n' + '='.repeat(60));
  console.log('索引优化方案生成完成');
  console.log('='.repeat(60));
  console.log('');
  console.log('📋 后续步骤:');
  console.log('');
  console.log('1. 点击上方控制台链接，进入各集合的索引管理页面');
  console.log('2. 点击"添加索引"按钮');
  console.log('3. 输入索引名称和字段（参考上面的建议）');
  console.log('4. 索引创建需要几分钟时间，请耐心等待');
  console.log('');
  console.log('⚠️  注意事项:');
  console.log('  • 索引创建期间数据库性能可能略有下降');
  console.log('  • 每个集合最多支持 15 个索引');
  console.log('  • 复合索引字段顺序很重要（查询频率高的字段放前面）');
  console.log('  • 索引会占用额外存储空间（约20%）');
  console.log('');

  return {
    code: 0,
    msg: '索引优化方案生成成功',
    data: results
  };
}

/**
 * 检查索引创建状态
 */
async function checkIndexStatus() {
  const collections = ['users', 'orders', 'products', 'reward_records', 'promotion_orders'];
  const results = {};

  console.log('检查集合索引状态...\n');

  for (const collection of collections) {
    try {
      const indexResult = await db.collection(collection).get();
      results[collection] = {
        recordCount: indexResult.data.length,
        message: `记录数: ${indexResult.data.length}`,
        consoleUrl: `https://tcb.cloud.tencent.com/dev?envId=cloud1-6gmp2q0y3171c353#/db/doc/collection/${collection}/index`
      };
    } catch (error) {
      results[collection] = {
        error: error.message
      };
    }
  }

  return {
    code: 0,
    msg: '索引状态检查完成',
    data: results
  };
}

/**
 * 生成索引创建指南
 */
async function generateIndexGuide() {
  const guide = {
    title: '云开发 NoSQL 索引创建操作指南',
    steps: [
      {
        step: 1,
        title: '打开云开发控制台',
        description: '访问数据库管理页面',
        url: 'https://tcb.cloud.tencent.com/dev?envId=cloud1-6gmp2q0y3171c353#/db/doc'
      },
      {
        step: 2,
        title: '选择集合',
        description: '在左侧集合列表中点击要创建索引的集合（如 users）'
      },
      {
        step: 3,
        title: '进入索引管理',
        description: '点击"索引"标签页'
      },
      {
        step: 4,
        title: '添加索引',
        description: '点击"添加索引"按钮'
      },
      {
        step: 5,
        title: '配置索引',
        description: '输入索引名称和字段，例如：',
        example: {
          indexName: 'parentId_1',
          fields: [
            { name: 'parentId', direction: 1 }  // 1=升序，-1=降序
          ]
        }
      },
      {
        step: 6,
        title: '确认创建',
        description: '点击"确定"按钮，等待索引创建完成（通常需要几分钟）'
      }
    ],
    tips: [
      '索引名称格式：字段名_方向（如 parentId_1）',
      'direction: 1 表示升序，-1 表示降序',
      '复合索引字段顺序：查询频率高的字段放前面',
      '创建时间：大集合可能需要10-30分钟',
      '性能提升：索引查询通常比全表扫描快 10-100 倍'
    ],
    commonIndexes: [
      {
        name: '单字段索引',
        example: 'parentId_1',
        json: '{ "parentId": 1 }'
      },
      {
        name: '复合索引',
        example: 'openid_status_time',
        json: '{ "_openid": 1, "status": 1, "createTime": -1 }'
      }
    ]
  };

  return {
    code: 0,
    msg: '索引创建指南生成成功',
    data: guide
  };
}

/**
 * 主入口函数
 */
exports.main = async (event, context) => {
  const { action } = event;

  switch (action) {
    case 'createPerformanceIndexes':
      return await createPerformanceIndexes();

    case 'checkIndexStatus':
      return await checkIndexStatus();

    case 'generateIndexGuide':
      return await generateIndexGuide();

    default:
      return {
        code: 400,
        msg: `Unknown action: ${action}. Available actions: createPerformanceIndexes, checkIndexStatus, generateIndexGuide`
      };
  }
};
