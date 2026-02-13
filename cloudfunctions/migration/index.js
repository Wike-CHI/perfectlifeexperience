// Database migration cloud function
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  const { action } = event;

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
