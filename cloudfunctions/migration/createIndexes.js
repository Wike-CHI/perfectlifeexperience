/**
 * 数据库索引创建脚本
 *
 * 功能：为 NoSQL 数据库创建性能优化索引
 * 使用方式：在云开发云函数中调用 migration 云函数的 action: 'createIndexes'
 *
 * 索引列表：
 * 1. users 集合 - openid/parentId/inviteCode
 * 2. orders 集合 - openid/status/createTime
 * 3. reward_records 集合 - beneficiaryId/settleTime
 * 4. promotion_orders 集合 - buyerId/status
 * 5. products 集合 - category/status/createTime
 */

const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

/**
 * 创建所有优化索引
 */
async function createIndexes() {
  const results = {
    success: [],
    failed: []
  };

  const indexes = [
    // 1. users 集合索引
    {
      collection: 'users',
      name: 'users_openid_index',
      keys: { _openid: 1 },
      description: '用户查询索引'
    },
    {
      collection: 'users',
      name: 'users_parentId_index',
      keys: { parentId: 1 },
      description: '推广关系查询索引'
    },
    {
      collection: 'users',
      name: 'users_inviteCode_index',
      keys: { inviteCode: 1 },
      description: '邀请码查询索引'
    },
    {
      collection: 'users',
      name: 'users_composite_index',
      keys: { parentId: 1, createTime: -1 },
      description: '团队排序复合索引'
    },

    // 2. orders 集合索引
    {
      collection: 'orders',
      name: 'orders_user_status_index',
      keys: { _openid: 1, status: 1 },
      description: '用户订单状态查询索引'
    },
    {
      collection: 'orders',
      name: 'orders_createTime_index',
      keys: { createTime: -1 },
      description: '订单时间排序索引'
    },
    {
      collection: 'orders',
      name: 'orders_composite_index',
      keys: { _openid: 1, status: 1, createTime: -1 },
      description: '订单复合查询索引'
    },

    // 3. reward_records 集合索引
    {
      collection: 'reward_records',
      name: 'rewards_beneficiary_index',
      keys: { beneficiaryId: 1 },
      description: '奖励领取人查询索引'
    },
    {
      collection: 'reward_records',
      name: 'rewards_settleTime_index',
      keys: { settleTime: -1 },
      description: '奖励结算时间排序索引'
    },
    {
      collection: 'reward_records',
      name: 'rewards_composite_index',
      keys: { beneficiaryId: 1, status: 1, settleTime: -1 },
      description: '奖励记录复合查询索引'
    },

    // 4. promotion_orders 集合索引
    {
      collection: 'promotion_orders',
      name: 'promotion_orders_buyer_index',
      keys: { buyerId: 1 },
      description: '推广订单买家查询索引'
    },
    {
      collection: 'promotion_orders',
      name: 'promotion_orders_status_index',
      keys: { status: 1 },
      description: '推广订单状态查询索引'
    },

    // 5. products 集合索引
    {
      collection: 'products',
      name: 'products_category_index',
      keys: { category: 1 },
      description: '商品分类查询索引'
    },
    {
      collection: 'products',
      name: 'products_status_index',
      keys: { status: 1 },
      description: '商品状态查询索引'
    },
    {
      collection: 'products',
      name: 'products_composite_index',
      keys: { category: 1, status: 1, createTime: -1 },
      description: '商品列表复合查询索引'
    },

    // 6. user_coupons 集合索引
    {
      collection: 'user_coupons',
      name: 'user_coupons_user_index',
      keys: { _openid: 1 },
      description: '用户优惠券查询索引'
    },
    {
      collection: 'user_coupons',
      name: 'user_coupons_receiveTime_index',
      keys: { receiveTime: -1 },
      description: '优惠券领取时间排序索引'
    },

    // 7. user_wallets 集合索引
    {
      collection: 'user_wallets',
      name: 'wallets_user_index',
      keys: { _openid: 1 },
      description: '用户钱包查询索引'
    }
  ];

  console.log(`开始创建 ${indexes.length} 个索引...`);

  // 注意：云开发 NoSQL 不直接支持 createIndex
  // 需要在云开发控制台手动创建，或使用 HTTP API
  // 这里提供索引配置信息供参考

  const indexConfig = {
    message: '索引创建配置',
    note: '请在云开发控制台 > 数据库 > 索引管理 中手动创建以下索引',
    indexes: indexes.map(idx => ({
      集合: idx.collection,
      索引名: idx.name,
      字段: JSON.stringify(idx.keys),
      说明: idx.description
    }))
  };

  return {
    code: 0,
    msg: '索引配置生成成功',
    data: indexConfig
  };
}

/**
 * 验证索引是否存在
 */
async function checkIndexes() {
  const collections = ['users', 'orders', 'reward_records', 'products', 'user_coupons', 'user_wallets'];

  const results = {};

  for (const collection of collections) {
    try {
      // 查询集合信息（包含索引信息）
      // 注意：云开发 NoSQL 暂不支持通过 SDK 查询索引
      // 需要在控制台查看
      results[collection] = {
        message: '请在云开发控制台查看索引状态',
        consoleUrl: `https://tcb.cloud.tencent.com/dev?envId=cloud1-6gmp2q0y3171c353#/db/doc/collection/${collection}`
      };
    } catch (error) {
      results[collection] = {
        error: error.message
      };
    }
  }

  return {
    code: 0,
    msg: '索引检查完成',
    data: results
  };
}

/**
 * 主入口函数
 */
exports.main = async (event, context) => {
  const { action } = event;

  switch (action) {
    case 'createIndexes':
      return await createIndexes();

    case 'checkIndexes':
      return await checkIndexes();

    default:
      return {
        code: 400,
        msg: `Unknown action: ${action}`
      };
  }
};
