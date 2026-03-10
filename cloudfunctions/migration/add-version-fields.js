/**
 * 为orders和commission_wallets集合添加version字段的迁移脚本
 *
 * 执行方法：
 * 1. 打开云开发控制台：https://tcb.cloud.tencent.com/dev?envId=cloud1-6gmp2q0y3171c353#/function
 * 2. 找到 migration 云函数，点击"云端调试"
 * 3. 将以下代码粘贴到调试框中，点击"调用"
 */

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  const results = {
    orders: { updated: 0, error: null },
    wallets: { updated: 0, error: null }
  };

  try {
    // 1. 为orders集合添加version字段
    console.log('开始更新orders集合...');

    const ordersResult = await db.collection('orders')
      .where({
        version: _.exists(false)
      })
      .update({
        data: {
          version: 1,
          updateTime: db.serverDate()
        }
      });

    results.orders.updated = ordersResult.stats.updated;
    console.log(`orders集合更新完成，共更新${ordersResult.stats.updated}条记录`);

  } catch (error) {
    console.error('更新orders集合失败:', error);
    results.orders.error = error.message;
  }

  try {
    // 2. 为commission_wallets集合添加version字段
    console.log('开始更新commission_wallets集合...');

    const walletsResult = await db.collection('commission_wallets')
      .where({
        version: _.exists(false)
      })
      .update({
        data: {
          version: 1,
          updateTime: db.serverDate()
        }
      });

    results.wallets.updated = walletsResult.stats.updated;
    console.log(`commission_wallets集合更新完成，共更新${walletsResult.stats.updated}条记录`);

  } catch (error) {
    console.error('更新commission_wallets集合失败:', error);
    results.wallets.error = error.message;
  }

  return {
    code: 0,
    msg: '数据库迁移完成',
    data: results
  };
};
