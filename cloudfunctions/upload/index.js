// 云函数入口文件
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

// ==================== 文件上传安全配置 ====================

// 允许的文件类型（MIME 类型）
const ALLOWED_MIME_TYPES = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/gif': ['.gif'],
  'image/webp': ['.webp']
};

// 允许的文件扩展名（小写）
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

// 最大文件大小（5MB）
const MAX_FILE_SIZE = 5 * 1024 * 1024;

// 最小文件大小（1KB，防止空文件）
const MIN_FILE_SIZE = 1024;

/**
 * 验证文件名是否合法
 * @param {string} fileName - 原始文件名
 * @returns {object} 验证结果 {valid: boolean, ext: string, error?: string}
 */
function validateFileName(fileName) {
  if (!fileName || typeof fileName !== 'string') {
    return { valid: false, error: '文件名不能为空' };
  }

  // 检查文件名长度
  if (fileName.length > 255) {
    return { valid: false, error: '文件名过长' };
  }

  // 提取扩展名
  const extMatch = fileName.match(/\.([a-zA-Z0-9]+)$/);
  if (!extMatch) {
    return { valid: false, error: '文件缺少扩展名' };
  }

  const ext = '.' + extMatch[1].toLowerCase();

  // 检查扩展名是否在白名单中
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return { valid: false, error: `不支持的文件类型: ${ext}，仅支持: ${ALLOWED_EXTENSIONS.join(', ')}` };
  }

  // 检查文件名是否包含非法字符
  const illegalChars = /[<>"'|?*\x00-\x1f]/;
  if (illegalChars.test(fileName)) {
    return { valid: false, error: '文件名包含非法字符' };
  }

  // 检查路径遍历攻击
  if (fileName.includes('..') || fileName.includes('./') || fileName.includes('\\')) {
    return { valid: false, error: '非法的文件路径' };
  }

  return { valid: true, ext };
}

/**
 * 验证 base64 数据
 * @param {string} base64Data - base64 编码的数据
 * @returns {object} 验证结果 {valid: boolean, buffer?: Buffer, error?: string}
 */
function validateBase64Data(base64Data) {
  if (!base64Data || typeof base64Data !== 'string') {
    return { valid: false, error: '文件数据不能为空' };
  }

  // 检查 base64 数据大小（粗略估算）
  // base64 编码后数据量约为原始数据的 4/3
  const estimatedSize = (base64Data.length * 3) / 4;

  if (estimatedSize > MAX_FILE_SIZE) {
    return { valid: false, error: `文件大小超过限制（最大 ${MAX_FILE_SIZE / 1024 / 1024}MB）` };
  }

  // 尝试解码
  try {
    const buffer = Buffer.from(base64Data, 'base64');

    if (buffer.length < MIN_FILE_SIZE) {
      return { valid: false, error: '文件太小，可能为空文件' };
    }

    if (buffer.length > MAX_FILE_SIZE) {
      return { valid: false, error: `文件大小超过限制（最大 ${MAX_FILE_SIZE / 1024 / 1024}MB）` };
    }

    return { valid: true, buffer };
  } catch (error) {
    return { valid: false, error: '文件数据格式错误' };
  }
}

/**
 * 验证文件内容（检查文件签名/Magic Number）
 * @param {Buffer} buffer - 文件内容
 * @param {string} ext - 文件扩展名
 * @returns {object} 验证结果 {valid: boolean, mimeType?: string, error?: string}
 */
function validateFileContent(buffer, ext) {
  // 文件签名（Magic Numbers）
  const signatures = {
    'image/jpeg': [[0xFF, 0xD8, 0xFF]],
    'image/png': [[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]],
    'image/gif': [[0x47, 0x49, 0x46, 0x38, 0x37, 0x61], [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]],
    'image/webp': [[0x52, 0x49, 0x46, 0x46]] // RIFF 头，需要进一步检查 WEBP
  };

  for (const [mimeType, sigList] of Object.entries(signatures)) {
    for (const signature of sigList) {
      if (buffer.length >= signature.length) {
        const match = signature.every((byte, index) => buffer[index] === byte);
        if (match) {
          // 检查扩展名是否与 MIME 类型匹配
          const allowedExts = ALLOWED_MIME_TYPES[mimeType];
          if (allowedExts && allowedExts.includes(ext)) {
            return { valid: true, mimeType };
          }
        }
      }
    }
  }

  return { valid: false, error: '文件内容与实际类型不符' };
}

/**
 * 生成安全的文件名
 * @param {string} openid - 用户 openid
 * @param {string} ext - 文件扩展名
 * @returns {string} 安全的云存储路径
 */
function generateSafeFileName(openid, ext) {
  // 使用时间戳和随机数确保唯一性
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  // 只使用 openid 的前 8 位，保护隐私
  const safeOpenid = openid.substring(0, 8);
  return `avatar/${safeOpenid}_${timestamp}_${random}${ext}`;
}

// ==================== 主函数 ====================

/**
 * 上传文件到云存储
 * 通过云函数中转，绕过客户端存储安全规则限制
 */
exports.main = async (event, context) => {
  const { action } = event;
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  // 检查用户登录状态
  if (!openid) {
    return {
      code: 401,
      msg: '未登录或登录已过期'
    };
  }

  if (action === 'uploadAvatar') {
    const { base64Data, fileName } = event;

    // 1. 验证文件名
    const fileNameValidation = validateFileName(fileName);
    if (!fileNameValidation.valid) {
      return {
        code: -1,
        msg: fileNameValidation.error
      };
    }

    // 2. 验证 base64 数据
    const base64Validation = validateBase64Data(base64Data);
    if (!base64Validation.valid) {
      return {
        code: -1,
        msg: base64Validation.error
      };
    }

    // 3. 验证文件内容（防止伪装攻击）
    const contentValidation = validateFileContent(base64Validation.buffer, fileNameValidation.ext);
    if (!contentValidation.valid) {
      return {
        code: -1,
        msg: contentValidation.error
      };
    }

    try {
      // 生成安全的云存储路径
      const cloudPath = generateSafeFileName(openid, fileNameValidation.ext);

      // 上传到云存储（服务端不需要通过安全规则）
      const result = await cloud.uploadFile({
        cloudPath,
        fileContent: base64Validation.buffer
      });

      // 获取临时访问 URL
      let tempFileURL = '';
      try {
        const urlResult = await cloud.getTempFileURL({
          fileList: [result.fileID]
        });
        if (urlResult.fileList && urlResult.fileList[0] && urlResult.fileList[0].tempFileURL) {
          tempFileURL = urlResult.fileList[0].tempFileURL;
        }
      } catch (urlError) {
        console.error('获取临时URL失败:', urlError);
        // 即使获取 URL 失败，上传也是成功的
      }

      return {
        code: 0,
        msg: '上传成功',
        data: {
          fileID: result.fileID,
          cloudPath: result.cloudPath,
          tempFileURL: tempFileURL || result.fileID, // 返回可访问的 URL
          mimeType: contentValidation.mimeType
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
