/**
 * 数据库迁移脚本：将现有明文密码迁移为 bcrypt 哈希
 *
 * 用法：在云开发控制台运行此云函数
 * 警告：运行前请备份 admins 集合
 */

const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const bcrypt = require('bcryptjs');

exports.main = async (event, context) => {
  console.log('[密码迁移] 开始迁移管理员密码...');

  try {
    // 获取所有管理员账号
    const { data: admins } = await db.collection('admins').get();

    if (admins.length === 0) {
      return {
        success: true,
        message: '没有管理员账号需要迁移',
        migrated: 0,
        skipped: 0
      };
    }

    let migratedCount = 0;
    let skippedCount = 0;
    const errors = [];

    // 遍历所有管理员
    for (const admin of admins) {
      try {
        // 检查密码是否已经是哈希格式（bcrypt 哈希以 $2a$ 或 $2b$ 开头）
        const isHashed = admin.password && (
          admin.password.startsWith('$2a$') ||
          admin.password.startsWith('$2b$')
        );

        if (isHashed) {
          console.log(`[密码迁移] 跳过已哈希的账号: ${admin.username}`);
          skippedCount++;
          continue;
        }

        // 哈希密码
        console.log(`[密码迁移] 正在哈希账号: ${admin.username} 的密码...`);
        const hashedPassword = await bcrypt.hash(admin.password, 10);

        // 更新数据库
        await db.collection('admins').doc(admin._id).update({
          data: {
            password: hashedPassword
          }
        });

        console.log(`[密码迁移] ✅ 成功迁移账号: ${admin.username}`);
        migratedCount++;

      } catch (error) {
        console.error(`[密码迁移] ❌ 迁移账号失败: ${admin.username}`, error);
        errors.push({
          username: admin.username,
          error: error.message
        });
      }
    }

    console.log(`[密码迁移] 迁移完成!`);
    console.log(`[密码迁移] 总计: ${admins.length} 个账号`);
    console.log(`[密码迁移] 成功迁移: ${migratedCount} 个`);
    console.log(`[密码迁移] 跳过（已哈希）: ${skippedCount} 个`);

    if (errors.length > 0) {
      console.log(`[密码迁移] 失败: ${errors.length} 个`);
      errors.forEach(err => {
        console.log(`  - ${err.username}: ${err.error}`);
      });
    }

    return {
      success: errors.length === 0,
      message: '密码哈希迁移完成',
      summary: {
        total: admins.length,
        migrated: migratedCount,
        skipped: skippedCount,
        failed: errors.length,
        errors: errors
      }
    };

  } catch (error) {
    console.error('[密码迁移] 迁移过程失败:', error);
    return {
      success: false,
      error: error.message,
      message: '迁移过程中发生错误'
    };
  }
};
