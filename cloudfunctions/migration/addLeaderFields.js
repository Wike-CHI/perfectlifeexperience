/**
 * 数据库迁移：为现有用户补充 secondLeaderId 和 thirdLeaderId 字段
 *
 * 这个脚本会：
 * 1. 扫描所有用户
 * 2. 从 promotionPath 解析出第二、三级推广人
 * 3. 批量更新用户的 secondLeaderId 和 thirdLeaderId 字段
 *
 * 使用方法：
 * 在云开发控制台调用 migration 云函数，传入 action: 'addLeaderFields'
 */

const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  const action = event.action;

  if (action !== 'addLeaderFields') {
    return {
      code: -1,
      msg: 'Unknown action',
      data: { action }
    };
  }

  console.log('开始迁移：添加 secondLeaderId 和 thirdLeaderId 字段');

  try {
    // 1. 获取所有已有用户
    const users = await db.collection('users')
      .field({
        _openid: true,
        _id: true,
        parentId: true,
        promotionPath: true,
        secondLeaderId: true,
        thirdLeaderId: true
      })
      .get();

    console.log(`找到 ${users.data.length} 个用户`);

    let updatedCount = 0;
    let skippedCount = 0;

    // 2. 为没有 secondLeaderId/thirdLeaderId 的用户补充
    for (const user of users.data) {
      // 检查是否已有这两个字段
      if (user.secondLeaderId !== undefined && user.thirdLeaderId !== undefined) {
        skippedCount++;
        continue;
      }

      // 从 promotionPath 解析
      let secondLeaderId = null;
      let thirdLeaderId = null;

      if (user.promotionPath) {
        const pathParts = user.promotionPath.split('/').filter(p => p);
        // promotionPath 格式: "grandparentId/parentId/"
        // 所以 pathParts[0] 是祖父，pathParts[1] 是曾祖父

        // 如果用户有 parentId（第一级推广人）
        // 那么第二级推广人是 pathParts 的倒数第二个
        // 第三级推广人是 pathParts 的倒数第三个

        const parentIndex = pathParts.indexOf(user.parentId);
        if (parentIndex >= 0 && parentIndex + 1 < pathParts.length) {
          secondLeaderId = pathParts[parentIndex + 1];
        }
        if (parentIndex >= 0 && parentIndex + 2 < pathParts.length) {
          thirdLeaderId = pathParts[parentIndex + 2];
        }

        // 备用逻辑：如果找不到 parentId，使用最后两个元素
        if (!secondLeaderId && pathParts.length >= 2) {
          secondLeaderId = pathParts[pathParts.length - 2];
        }
        if (!thirdLeaderId && pathParts.length >= 3) {
          thirdLeaderId = pathParts[pathParts.length - 3];
        }
      }

      // 更新用户
      try {
        await db.collection('users').doc(user._id).update({
          data: {
            secondLeaderId: secondLeaderId || null,
            thirdLeaderId: thirdLeaderId || null
          }
        });

        updatedCount++;

        // 每 100 个用户输出一次进度
        if (updatedCount % 100 === 0) {
          console.log(`已更新 ${updatedCount} 个用户`);
        }
      } catch (error) {
        console.error(`更新用户 ${user._openid} 失败:`, error);
      }
    }

    console.log('迁移完成');
    console.log(`更新了 ${updatedCount} 个用户`);
    console.log(`跳过了 ${skippedCount} 个已有字段的用户`);

    return {
      code: 0,
      msg: '迁移完成',
      data: {
        totalUsers: users.data.length,
        updatedCount,
        skippedCount
      }
    };

  } catch (error) {
    console.error('迁移失败:', error);
    return {
      code: -1,
      msg: '迁移失败',
      error: error.message
    };
  }
};
