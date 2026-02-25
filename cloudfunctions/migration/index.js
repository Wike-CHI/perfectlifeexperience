// Database migration cloud function
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  const { action } = event;

  if (action === 'createActivityTables') {
    try {
      console.log('[迁移] 开始创建活动管理表');

      const results = {};

      // 1. Create promotions collection
      try {
        await db.collection('promotions').add({
          data: {
            name: '__init__',
            type: 'discount',
            status: 'draft',
            startTime: new Date(),
            endTime: new Date(),
            description: '初始化标记',
            createTime: new Date()
          }
        });
        // Remove the init record
        const initResult = await db.collection('promotions')
          .where({ name: '__init__' })
          .get();
        if (initResult.data.length > 0) {
          await db.collection('promotions').doc(initResult.data[0]._id).remove();
        }
        results.promotions = 'created';
      } catch (e) {
        results.promotions = 'exists';
      }

      // 2. Create promotion_products collection
      try {
        await db.collection('promotion_products').add({
          data: {
            promotionId: '__init__',
            productId: '__init__',
            discountPrice: 0,
            stockLimit: 0,
            soldCount: 0,
            createTime: new Date()
          }
        });
        const initResult = await db.collection('promotion_products')
          .where({ promotionId: '__init__' })
          .get();
        if (initResult.data.length > 0) {
          await db.collection('promotion_products').doc(initResult.data[0]._id).remove();
        }
        results.promotion_products = 'created';
      } catch (e) {
        results.promotion_products = 'exists';
      }

      // 3. Create promotion_stats collection
      try {
        await db.collection('promotion_stats').add({
          data: {
            promotionId: '__init__',
            date: new Date(),
            views: 0,
            orders: 0,
            sales: 0,
            createTime: new Date()
          }
        });
        const initResult = await db.collection('promotion_stats')
          .where({ promotionId: '__init__' })
          .get();
        if (initResult.data.length > 0) {
          await db.collection('promotion_stats').doc(initResult.data[0]._id).remove();
        }
        results.promotion_stats = 'created';
      } catch (e) {
        results.promotion_stats = 'exists';
      }

      console.log('[迁移] 活动管理表创建完成:', results);

      return {
        code: 0,
        msg: '活动管理表创建成功',
        data: results
      };

    } catch (error) {
      console.error('[迁移] 失败:', error);
      return {
        code: -1,
        msg: error.message
      };
    }
  }

  if (action === 'addRewardFields') {
    try {
      console.log('[迁移] 开始为订单添加奖励结算字段');

      let hasMore = true;
      let skip = 0;
      const LIMIT = 100;
      let totalProcessed = 0;

      while (hasMore) {
        const res = await db.collection('orders')
          .field({ _id: true })
          .limit(LIMIT)
          .skip(skip)
          .get();

        if (res.data.length === 0) {
          hasMore = false;
          break;
        }

        // 批量更新
        const updates = res.data.map(order => {
          return db.collection('orders').doc(order._id).update({
            data: {
              rewardSettled: false
            }
          });
        });

        await Promise.all(updates);
        totalProcessed += res.data.length;
        skip += LIMIT;

        console.log(`[迁移] 已处理 ${totalProcessed} 条记录`);
      }

      console.log(`[迁移] 完成，共处理 ${totalProcessed} 条记录`);

      return {
        code: 0,
        msg: `成功更新 ${totalProcessed} 条订单记录`,
        data: { totalProcessed }
      };

    } catch (error) {
      console.error('[迁移] 失败:', error);
      return {
        code: -1,
        msg: error.message
      };
    }
  }

  return {
    code: -1,
    msg: '未知操作'
  };
};
