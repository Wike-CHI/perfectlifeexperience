/**
 * 推广体系V2 - 数据库迁移脚本
 *
 * 功能：
 * - 为 users 集合添加新字段
 * - 为 promotion_relations 集合添加新字段
 * - 为 promotion_orders 集合添加新字段
 * - 创建必要的索引
 */

const cloud = require('wx-server-sdk');

// 初始化云开发
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

const { createLogger } = require('./common/logger');
const logger = createLogger('migration-v2');

/**
 * 迁移 users 集合
 *
 * 新增字段：
 * - promotionHistory: 升级历史记录
 * - originalParentId: 原始推荐人ID（审计用）
 * - originalPromotionPath: 原始推广路径（审计用）
 */
async function migrateUsers() {
  logger.info('Starting users collection migration...');

  try {
    // 获取所有用户（分批处理，每批100个）
    let hasMore = true;
    let skip = 0;
    const limit = 100;
    let totalProcessed = 0;

    while (hasMore) {
      const usersRes = await db.collection('users')
        .skip(skip)
        .limit(limit)
        .get();

      if (usersRes.data.length === 0) {
        hasMore = false;
        break;
      }

      logger.info(`Processing batch ${skip / limit + 1}`, {
        count: usersRes.data.length
      });

      // 批量更新
      for (const user of usersRes.data) {
        const updates = {};

        // 添加 promotionHistory 字段（如果不存在）
        if (!user.promotionHistory) {
          updates.promotionHistory = [];
        }

        // 添加 originalParentId 字段（如果不存在）
        if (!user.originalParentId && user.parentId) {
          updates.originalParentId = user.parentId;
        }

        // 添加 originalPromotionPath 字段（如果不存在）
        if (!user.originalPromotionPath && user.promotionPath) {
          updates.originalPromotionPath = user.promotionPath;
        }

        // 如果有需要更新的字段，执行更新
        if (Object.keys(updates).length > 0) {
          await db.collection('users')
            .where({ _openid: user._openid })
            .update({
              data: updates
            });

          totalProcessed++;
          logger.debug('User updated', {
            userId: user._openid,
            fields: Object.keys(updates)
          });
        }
      }

      skip += limit;

      // 如果返回的数据少于limit，说明已经是最后一批
      if (usersRes.data.length < limit) {
        hasMore = false;
      }
    }

    logger.info('Users collection migration completed', {
      totalProcessed
    });

    return {
      success: true,
      totalProcessed
    };
  } catch (error) {
    logger.error('Users collection migration failed', error);
    throw error;
  }
}

/**
 * 迁移 promotion_orders 集合
 *
 * 新增字段：
 * - promoterId: 推广人ID
 * - promoterLevel: 推广人等级
 */
async function migratePromotionOrders() {
  logger.info('Starting promotion_orders collection migration...');

  try {
    // 获取所有推广订单（分批处理）
    let hasMore = true;
    let skip = 0;
    const limit = 100;
    let totalProcessed = 0;

    while (hasMore) {
      const ordersRes = await db.collection('promotion_orders')
        .skip(skip)
        .limit(limit)
        .get();

      if (ordersRes.data.length === 0) {
        hasMore = false;
        break;
      }

      logger.info(`Processing batch ${skip / limit + 1}`, {
        count: ordersRes.data.length
      });

      // 批量更新
      for (const order of ordersRes.data) {
        const updates = {};

        // 添加 promoterId 字段（如果不存在）
        if (!order.promoterId) {
          // 从 buyerId 反查推广人
          const buyerRes = await db.collection('users')
            .where({ _openid: order.buyerId })
            .field({ parentId: true })
            .get();

          if (buyerRes.data.length > 0 && buyerRes.data[0].parentId) {
            updates.promoterId = buyerRes.data[0].parentId;
          }
        }

        // 添加 promoterLevel 字段（如果不存在）
        if (!order.promoterLevel && updates.promoterId) {
          const promoterRes = await db.collection('users')
            .where({ _openid: updates.promoterId })
            .field({ agentLevel: true })
            .get();

          if (promoterRes.data.length > 0) {
            updates.promoterLevel = promoterRes.data[0].agentLevel || 4;
          }
        }

        // 如果有需要更新的字段，执行更新
        if (Object.keys(updates).length > 0) {
          await db.collection('promotion_orders')
            .where({ orderId: order.orderId })
            .update({
              data: updates
            });

          totalProcessed++;
          logger.debug('Promotion order updated', {
            orderId: order.orderId,
            fields: Object.keys(updates)
          });
        }
      }

      skip += limit;

      if (ordersRes.data.length < limit) {
        hasMore = false;
      }
    }

    logger.info('Promotion orders collection migration completed', {
      totalProcessed
    });

    return {
      success: true,
      totalProcessed
    };
  } catch (error) {
    logger.error('Promotion orders collection migration failed', error);
    throw error;
  }
}

/**
 * 为 promotion_relations 集合添加状态字段（如果该集合存在）
 *
 * 新增字段：
 * - status: 关系状态 ('active' | 'detached' | 'promoted')
 * - detachReason: 脱离原因 ('self_promotion' | 'follow_promotion')
 * - detachedAt: 脱离时间
 */
async function migratePromotionRelations() {
  logger.info('Starting promotion_relations collection migration...');

  try {
    // 检查集合是否存在
    const collections = await db.listCollections();
    const hasPromotionRelations = collections.data.some(
      col => col.name === 'promotion_relations'
    );

    if (!hasPromotionRelations) {
      logger.info('promotion_relations collection does not exist, skipping...');
      return {
        success: true,
        skipped: true,
        message: 'Collection does not exist'
      };
    }

    // 获取所有推广关系（分批处理）
    let hasMore = true;
    let skip = 0;
    const limit = 100;
    let totalProcessed = 0;

    while (hasMore) {
      const relationsRes = await db.collection('promotion_relations')
        .skip(skip)
        .limit(limit)
        .get();

      if (relationsRes.data.length === 0) {
        hasMore = false;
        break;
      }

      logger.info(`Processing batch ${skip / limit + 1}`, {
        count: relationsRes.data.length
      });

      // 批量更新
      for (const relation of relationsRes.data) {
        const updates = {};

        // 添加 status 字段（如果不存在）
        if (!relation.status) {
          updates.status = 'active';
        }

        // 添加其他字段（默认为空）
        if (!relation.detachReason) {
          updates.detachReason = null;
        }

        if (!relation.detachedAt) {
          updates.detachedAt = null;
        }

        // 如果有需要更新的字段，执行更新
        if (Object.keys(updates).length > 0) {
          await db.collection('promotion_relations')
            .where({ _id: relation._id })
            .update({
              data: updates
            });

          totalProcessed++;
          logger.debug('Promotion relation updated', {
            relationId: relation._id,
            fields: Object.keys(updates)
          });
        }
      }

      skip += limit;

      if (relationsRes.data.length < limit) {
        hasMore = false;
      }
    }

    logger.info('Promotion relations collection migration completed', {
      totalProcessed
    });

    return {
      success: true,
      totalProcessed
    };
  } catch (error) {
    logger.error('Promotion relations collection migration failed', error);
    throw error;
  }
}

/**
 * 创建索引
 */
async function createIndexes() {
  logger.info('Starting index creation...');

  try {
    // users 集合索引
    // promotionHistory 索引（用于查询升级历史）
    try {
      await db.collection('users').createIndex({
        indexes: [{
          name: 'promotionHistory_timestamp',
        unique: false,
        keys: { 'promotionHistory.timestamp': -1 }
        }]
      });
      logger.info('Index created: promotionHistory_timestamp');
    } catch (error) {
      logger.warn('Failed to create index (may already exist)', {
        index: 'promotionHistory_timestamp',
        error: error.message
      });
    }

    // promotion_orders 集合索引
    // promoterId 索引（用于查询推广人的订单）
    try {
      await db.collection('promotion_orders').createIndex({
        indexes: [{
          name: 'promoterId',
          unique: false,
          keys: { promoterId: 1 }
        }]
      });
      logger.info('Index created: promoterId');
    } catch (error) {
      logger.warn('Failed to create index (may already exist)', {
        index: 'promoterId',
        error: error.message
      });
    }

    // promoterLevel 索引（用于按等级统计）
    try {
      await db.collection('promotion_orders').createIndex({
        indexes: [{
          name: 'promoterLevel',
          unique: false,
          keys: { promoterLevel: 1 }
        }]
      });
      logger.info('Index created: promoterLevel');
    } catch (error) {
      logger.warn('Failed to create index (may already exist)', {
        index: 'promoterLevel',
        error: error.message
      });
    }

    logger.info('Index creation completed');

    return {
      success: true
    };
  } catch (error) {
    logger.error('Index creation failed', error);
    throw error;
  }
}

/**
 * 执行所有迁移
 */
async function runAllMigrations() {
  logger.info('========================================');
  logger.info('Starting Promotion V2 Migration');
  logger.info('========================================');

  const results = {
    users: null,
    promotionOrders: null,
    promotionRelations: null,
    indexes: null
  };

  try {
    // 1. 迁移 users 集合
    results.users = await migrateUsers();

    // 2. 迁移 promotion_orders 集合
    results.promotionOrders = await migratePromotionOrders();

    // 3. 迁移 promotion_relations 集合
    results.promotionRelations = await migratePromotionRelations();

    // 4. 创建索引
    results.indexes = await createIndexes();

    logger.info('========================================');
    logger.info('Migration completed successfully!');
    logger.info('========================================');

    return {
      success: true,
      results
    };
  } catch (error) {
    logger.error('Migration failed', error);
    return {
      success: false,
      error: error.message,
      results
    };
  }
}

// 导出函数
module.exports = {
  migrateUsers,
  migratePromotionOrders,
  migratePromotionRelations,
  createIndexes,
  runAllMigrations
};

// 如果直接运行此文件，执行所有迁移
if (require.main === module) {
  (async () => {
    try {
      const result = await runAllMigrations();
      console.log('Migration result:', JSON.stringify(result, null, 2));
      process.exit(result.success ? 0 : 1);
    } catch (error) {
      console.error('Migration error:', error);
      process.exit(1);
    }
  })();
}
