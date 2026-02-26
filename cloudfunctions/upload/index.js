// 云函数入口文件
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

/**
 * 上传文件到云存储
 * 通过云函数中转，绕过客户端存储安全规则限制
 */
exports.main = async (event, context) => {
  const { action } = event;
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  if (action === 'uploadAvatar') {
    const { base64Data, fileName } = event;

    if (!base64Data) {
      return {
        code: -1,
        msg: '缺少文件数据'
      };
    }

    try {
      // 将 base64 转换为 Buffer
      const buffer = Buffer.from(base64Data, 'base64');

      // 生成云存储路径
      const cloudPath = `avatar/${openid}_${Date.now()}_${fileName}`;

      // 上传到云存储（服务端不需要通过安全规则）
      const result = await cloud.uploadFile({
        cloudPath,
        fileContent: buffer
      });

      return {
        code: 0,
        msg: '上传成功',
        data: {
          fileID: result.fileID,
          cloudPath: result.cloudPath
        }
      };
    } catch (error) {
      console.error('上传失败:', error);
      return {
        code: -1,
        msg: error.message || '上传失败'
      };
    }
  }

  return {
    code: -2,
    msg: '未知操作'
  };
};
