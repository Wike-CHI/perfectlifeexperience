// 云函数：添加邀请码唯一索引
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

/**
 * 检查并创建 users 集合的 inviteCode 唯一索引
 *
 * 注意：CloudBase NoSQL 不直接支持 MongoDB 的 createIndex 语法
 * 唯一性约束需要在应用层保证或通过数据库管理界面设置
 *
 * 此云函数主要用于：
 * 1. 检查现有数据中是否有重复的 inviteCode
 * 2. 提供索引创建建议
 */
exports.main = async (event, context) => {
  const collection = 'users';

  try {
    console.log('开始检查 inviteCode 唯一性...');

    // 1. 检查现有数据中是否有重复的邀请码
    const checkResult = await db.collection(collection)
      .field({
        inviteCode: true,
        _openid: true
      })
      .get();

    const users = checkResult.data || [];
    const codeMap = new Map();
    const duplicates = [];

    // 查找重复的邀请码
    for (const user of users) {
      if (user.inviteCode) {
        if (codeMap.has(user.inviteCode)) {
          duplicates.push({
            inviteCode: user.inviteCode,
            openids: [...codeMap.get(user.inviteCode), user._openid]
          });
        } else {
          codeMap.set(user.inviteCode, [user._openid]);
        }
      }
    }

    // 2. 返回检查结果
    if (duplicates.length > 0) {
      console.warn('发现重复的邀请码:', duplicates);
      return {
        code: -1,
        msg: '发现重复的邀请码，请先清理数据',
        data: {
          hasDuplicates: true,
          duplicates,
          suggestion: '请在数据库管理界面手动删除或修改重复的邀请码'
        }
      };
    }

    console.log('未发现重复的邀请码');

    // 3. 提供索引创建建议
    return {
      code: 0,
      msg: '数据检查通过，建议在数据库管理界面创建唯一索引',
      data: {
        hasDuplicates: false,
        totalUsers: users.length,
        uniqueCodes: codeMap.size,
        // CloudBase 控制台操作指南
        instructions: [
          '1. 登录腾讯云 CloudBase 控制台',
          '2. 进入数据库 -> users 集合',
          '3. 点击"索引管理"',
          '4. 添加索引：字段名 inviteCode，类型 Unique',
          '5. 保存索引配置'
        ],
        consoleUrl: `https://tcb.cloud.tencent.com/dev?envId=${cloud.DYNAMIC_CURRENT_ENV}#/db/doc`
      }
    };

  } catch (error) {
    console.error('检查 inviteCode 唯一性失败:', error);
    return {
      code: -1,
      msg: '检查失败',
      error: error.message
    };
  }
};
