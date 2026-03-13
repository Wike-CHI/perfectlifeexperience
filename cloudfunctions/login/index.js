// 云函数入口文件
const cloud = require('wx-server-sdk');
const axios = require('axios');

// 初始化云开发
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

// ==================== 常量定义 ====================
const AGENT_LEVEL = {
  MAX: 4,
  MIN: 1,
  DEFAULT: 4,
  LEVEL_NAMES: ['金牌推广员', '银牌推广员', '铜牌推广员', '普通会员']
};

const INVITE_CODE_CONFIG = {
  LENGTH: 8,
  CHARS: 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // 排除易混淆字符：0/O, 1/I/L
};

// 获取小程序配置 (从环境变量读取)
function getAppConfig() {
  const appid = process.env.WX_APPID;
  const secret = process.env.WX_APP_SECRET;

  if (!appid) {
    console.error('WX_APPID 环境变量未配置，请在 CloudBase 控制台设置');
    throw new Error('WX_APPID 环境变量未配置');
  }
  if (!secret) {
    console.error('WX_APP_SECRET 环境变量未配置，请在 CloudBase 控制台设置');
    throw new Error('WX_APP_SECRET 环境变量未配置');
  }
  return { appid, secret };
}

/**
 * 获取或创建用户
 * @param {string} openid
 * @param {object} extraData 额外数据 (如 unionid)
 */
async function getOrCreateUser(openid, extraData = {}) {
  const userCollection = db.collection('users');
  const userResult = await userCollection.where({
    _openid: openid
  }).get();

  let user = null;
  let isNewUser = false;

  // 🔒 安全修复：移除 session_key 存储，避免敏感信息泄露
  // session_key 是微信敏感数据，不应存储到数据库
  const { session_key, inviteCode, ...safeExtraData } = extraData;

  // 🔥 新增：绑定状态跟踪
  let bindAttempted = false;
  let bindSuccessFlag = false;
  let bindError = null;

  if (userResult.data.length === 0) {
    // 新用户，创建记录
    isNewUser = true;

    // 🔥 处理邀请码：如果有邀请码，查找上级用户信息
    let parentId = null;
    let promotionPath = '';
    let agentLevel = AGENT_LEVEL.DEFAULT; // 默认为4级（普通会员）
    let secondLeaderId = null; // 🔥 新增：第二级推广人 ID
    let thirdLeaderId = null;  // 🔥 新增：第三级推广人 ID

    if (inviteCode) {
      bindAttempted = true;
      console.log('新用户注册，处理邀请码:', inviteCode);
      try {
        const parentResult = await userCollection.where({
          inviteCode: inviteCode
        }).limit(1).get();

        if (parentResult.data.length > 0) {
          const parent = parentResult.data[0];
          parentId = parent._openid;
          promotionPath = parent.promotionPath ? `${parent.promotionPath}/${parentId}` : parentId;
          agentLevel = Math.min(AGENT_LEVEL.MAX, (parent.agentLevel || AGENT_LEVEL.DEFAULT) + 1);

          // 🔥 新增：计算第二、三级推广人
          if (parent.promotionPath) {
            const pathParts = parent.promotionPath.split('/').filter(p => p);
            if (pathParts.length >= 1) {
              secondLeaderId = pathParts[0]; // 父用户的父用户
            }
            if (pathParts.length >= 2) {
              thirdLeaderId = pathParts[1]; // 父用户的父用户的父用户
            }
          }

          console.log('找到上级用户:', {
            parentId,
            secondLeaderId, // 🔥 新增日志
            thirdLeaderId,  // 🔥 新增日志
            agentLevel,
            promotionPath
          });
          bindSuccessFlag = true;
        } else {
          console.warn('邀请码无效:', inviteCode);
          bindError = '邀请码无效';
        }
      } catch (error) {
        console.error('处理邀请码失败:', error);
        bindError = error.message || '邀请码处理失败';
      }
    }

    // 🔥 使用事务包裹用户创建和团队更新
    const transaction = await db.startTransaction();

    try {
      // 1. 在事务中创建用户
      const createData = {
        _openid: openid,
        createTime: new Date(),
        lastLoginTime: new Date(),
        loginCount: 1,
        platform: 'weixin_miniprogram',
        inviteCode: generateInviteCode(), // 生成用户自己的邀请码
        parentId,
        promotionPath,
        agentLevel,
        secondLeaderId, // 🔥 新增：第二级推广人 ID
        thirdLeaderId,  // 🔥 新增：第三级推广人 ID
        performance: {
          totalSales: 0,
          monthSales: 0,
          // 🔧 修复：使用本地时间的 YYYY-MM 格式，避免 UTC 时区问题
          monthTag: (() => {
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            return `${year}-${month}`;
          })(),
          teamCount: 0
        },
        totalReward: 0,
        pendingReward: 0,
        orderCount: 0,
        ...safeExtraData
      };

      const createResult = await transaction.collection('users').add({
        data: createData
      });
      user = { _id: createResult._id, ...createData };

      // 2. 如果有上级，在事务中更新团队数
      if (parentId) {
        await transaction.collection('users').where({
          _openid: parentId
        }).update({
          data: {
            'performance.teamCount': _.inc(1),
            teamCount: _.inc(1)
          }
        });

        console.log('上级团队数已更新（事务中）:', parentId);
      }

      // 3. 提交事务
      await transaction.commit();
      console.log('用户创建事务提交成功', { openid, parentId });

    } catch (err) {
      // 回滚事务
      await transaction.rollback();
      console.error('用户创建事务回滚:', err);
      throw new Error('用户创建失败: ' + err.message);
    }

    console.log('新用户创建成功:', {
      openid,
      agentLevel,
      hasParent: !!parentId
    });
  } else {
    // 已存在用户，更新登录信息
    user = userResult.data[0];
    const updateData = {
      lastLoginTime: new Date(),
      loginCount: _.inc(1)
    };

    // 🔥 如果用户没有上级但传入了邀请码，尝试绑定
    if (inviteCode && !user.parentId) {
      bindAttempted = true;
      console.log('已注册用户尝试绑定推广人:', inviteCode);
      try {
        const parentResult = await userCollection.where({
          inviteCode: inviteCode
        }).limit(1).get();

        if (parentResult.data.length > 0) {
          const parent = parentResult.data[0];

          // 检查推荐人等级：4级不能发展下线
          if (parent.agentLevel === 4) {
            console.warn('推荐人等级为4，无法发展下线');
            bindError = '推荐人等级为4，无法发展下线';
          } else if (parent._openid === openid) {
            console.warn('不能绑定自己');
            bindError = '不能绑定自己';
          } else {
            const oldPromotionPath = user.promotionPath || ''; // 🔥 保存旧路径用于更新下属
            const parentId = parent._openid;
            const promotionPath = parent.promotionPath ? `${parent.promotionPath}/${parentId}` : parentId;
            const agentLevel = Math.min(AGENT_LEVEL.MAX, (parent.agentLevel || AGENT_LEVEL.DEFAULT) + 1);

            // 🔥 新增：计算第二、三级推广人
            let secondLeaderId = null;
            let thirdLeaderId = null;
            if (parent.promotionPath) {
              const pathParts = parent.promotionPath.split('/').filter(p => p);
              if (pathParts.length >= 1) {
                secondLeaderId = pathParts[0];
              }
              if (pathParts.length >= 2) {
                thirdLeaderId = pathParts[1];
              }
            }

            updateData.parentId = parentId;
            updateData.promotionPath = promotionPath;
            updateData.agentLevel = agentLevel;
            updateData.secondLeaderId = secondLeaderId; // 🔥 新增
            updateData.thirdLeaderId = thirdLeaderId;   // 🔥 新增

            console.log('绑定推广人成功:', {
              parentId,
              agentLevel,
              promotionPath
            });

            // 🔥 使用事务更新用户和上级团队数
            const transaction = await db.startTransaction();
            try {
              // 更新用户信息
              await transaction.collection('users').doc(user._id).update({
                data: updateData
              });

              // 更新上级的团队数量
              await transaction.collection('users').where({
                _openid: parentId
              }).update({
                data: {
                  'performance.teamCount': _.inc(1),
                  teamCount: _.inc(1)
                }
              });

              // 提交事务
              await transaction.commit();
              console.log('用户绑定事务提交成功');

              // 标记绑定成功
              bindSuccessFlag = true;

              // 🔥 P0-1: 级联更新所有下属的关系链
              await updateSubordinateRelations(
                user._openid,
                oldPromotionPath,
                promotionPath
              );

              // 🔥 P1-2: 记录关系变更历史
              await recordRelationChange({
                userOpenid: user._openid,
                oldParentId: user.parentId,
                newParentId: parentId,
                oldPromotionPath: oldPromotionPath,
                newPromotionPath: promotionPath,
                changeType: 'bind',
                reason: '用户通过邀请码绑定推广人'
              });

              // 更新完成后直接返回，避免重复更新
              return {
                success: true,
                openid,
                isNewUser: false,
                userId: user._id,
                userInfo: { ...user, ...updateData },
                message: '绑定推广人成功',
                bindSuccess: bindAttempted && bindSuccessFlag,
                bindError: bindAttempted && !bindSuccessFlag ? bindError : null
              };
            } catch (err) {
              // 回滚事务
              await transaction.rollback();
              console.error('用户绑定事务回滚:', err);
              bindError = '绑定失败: ' + err.message;
            }
          }
        } else {
          console.warn('邀请码无效:', inviteCode);
          bindError = '邀请码无效';
        }
      } catch (error) {
        console.error('绑定推广人失败:', error);
        bindError = error.message || '邀请码处理失败';
      }
    }

    // 🔒 安全修复：不再存储 session_key
    if (safeExtraData.unionid) updateData.unionid = safeExtraData.unionid;

    // 更新用户数据
    await userCollection.doc(user._id).update({
      data: updateData
    });
  }

  return {
    success: true,
    openid,
    isNewUser,
    userId: user._id,
    userInfo: user,
    message: '登录成功',
    // 🔥 新增：邀请码绑定状态
    bindSuccess: bindAttempted && bindSuccessFlag,
    bindError: bindAttempted && !bindSuccessFlag ? bindError : null
  };
}

/**
 * 更新用户的所有下属关系链
 * 当用户绑定新推广人时，需要级联更新所有下属的 promotionPath
 *
 * @param {string} userOpenid - 当前用户的 openid
 * @param {string} oldPromotionPath - 旧的推广路径
 * @param {string} newPromotionPath - 新的推广路径
 */
async function updateSubordinateRelations(userOpenid, oldPromotionPath, newPromotionPath) {
  try {
    // 1. 查找所有 promotionPath 中包含当前用户ID的下级
    // 修正：应该匹配 oldPromotionPath/（旧路径后加斜杠），这样能匹配所有下属
    // 使用 MongoDB 标准的正则表达式语法
    const subordinates = await db.collection('users')
      .where({
        promotionPath: {
          $regex: `${oldPromotionPath}/`,
          $options: 'i'
        }
      })
      .field({
        _openid: true,
        promotionPath: true,
        parentId: true
      })
      .get();

    if (subordinates.data.length === 0) {
      console.log('无下属需要更新关系链', { userOpenid });
      return;
    }

    console.log('开始更新下属关系链', {
      userOpenid,
      subordinateCount: subordinates.data.length
    });

    // 2. 批量更新所有下属的 promotionPath
    // 将 oldPromotionPath 替换为 newPromotionPath
    const updates = [];
    for (const sub of subordinates.data) {
      const newPath = sub.promotionPath.replace(oldPromotionPath, newPromotionPath);

      updates.push(
        db.collection('users').doc(sub._id).update({
          data: { promotionPath: newPath }
        })
      );
    }

    // 3. 执行批量更新
    await Promise.all(updates);

    console.log('下属关系链更新完成', {
      userOpenid,
      updatedCount: subordinates.data.length
    });

  } catch (error) {
    console.error('更新下属关系链失败', {
      userOpenid,
      error: error.message
    });
    // 注意：这里不抛出错误，允许主流程继续
    // 但记录日志便于后续修复
  }
}

/**
 * 记录推广关系变更历史
 *
 * @param {object} params - 变更参数
 * @param {string} params.userOpenid - 用户 openid
 * @param {string} params.oldParentId - 旧的推广人 ID
 * @param {string} params.newParentId - 新的推广人 ID
 * @param {string} params.oldPromotionPath - 旧的推广路径
 * @param {string} params.newPromotionPath - 新的推广路径
 * @param {string} params.changeType - 变更类型: 'bind' | 'unbind' | 'upgrade'
 * @param {string} params.operator - 操作人 openid（可选）
 * @param {string} params.reason - 变更原因（可选）
 */
async function recordRelationChange({
  userOpenid,
  oldParentId,
  newParentId,
  oldPromotionPath,
  newPromotionPath,
  changeType = 'bind',
  operator = null,
  reason = null
}) {
  try {
    await db.collection('relation_history').add({
      data: {
        _openid: userOpenid,
        oldParentId: oldParentId || null,
        newParentId: newParentId || null,
        oldPromotionPath: oldPromotionPath || '',
        newPromotionPath: newPromotionPath || '',
        changeType,
        changeTime: new Date(),
        operator: operator || null,
        reason: reason || '用户绑定推广人'
      }
    });

    console.log('关系变更历史已记录', { userOpenid, changeType });
  } catch (error) {
    console.error('记录关系变更历史失败:', error);
    // 不抛出错误，避免影响主流程
  }
}

/**
 * 生成8位邀请码（时间戳+随机+校验位）
 * 算法：4位时间戳 + 3位随机 + 1位校验位
 */
function generateInviteCode() {
  const { LENGTH, CHARS } = INVITE_CODE_CONFIG;
  const timestamp = Date.now().toString(36).slice(-4); // 时间戳后4位（base36编码）
  let randomPart = '';

  // 生成随机部分（3位）
  for (let i = 0; i < LENGTH - 5; i++) {
    randomPart += CHARS.charAt(Math.floor(Math.random() * CHARS.length));
  }

  // 添加校验位（基于时间戳和随机部分的和）
  const checkSum = (timestamp.charCodeAt(0) + randomPart.charCodeAt(0)) % CHARS.length;
  const checkChar = CHARS.charAt(checkSum);

  const code = timestamp + randomPart + checkChar;

  // 🔍 验证格式：必须是8位
  if (code.length !== LENGTH) {
    throw new Error(`生成的邀请码长度不正确: ${code.length}`);
  }

  return code.toUpperCase();
}

// 云函数入口函数
exports.main = async (event, context) => {
  console.log('Login function called, event:', event);
  
  const wxContext = cloud.getWXContext();
  let openid = wxContext.OPENID;
  let unionid = wxContext.UNIONID;
  let session_key = null;
  
  // 1. 尝试从 wxContext 获取 (原生调用)
  if (openid) {
    console.log('Native call detected, openid:', openid);
    // 🔥 修复：原生调用时从 event 中读取 inviteCode
    const inviteCode = event.inviteCode;
    return await getOrCreateUser(openid, { unionid, inviteCode });
  }

  // 2. 尝试使用 code 换取 (HTTP 调用或显式传 code)
  // 解析 body (如果是 HTTP 触发)
  let requestData = event;
  if (event.body) {
    try {
      requestData = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    } catch (e) {
      console.error('Parse body failed:', e);
    }
  }

  // 🔥 修复：解构 inviteCode 参数
  const { code, inviteCode } = requestData;
  
  if (code) {
    try {
      const { appid, secret } = getAppConfig();
      const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${appid}&secret=${secret}&js_code=${code}&grant_type=authorization_code`;
      const response = await axios.get(url);
      
      if (response.data.openid) {
        openid = response.data.openid;
        unionid = response.data.unionid;
        session_key = response.data.session_key;
        
        return await getOrCreateUser(openid, { unionid, session_key });
      } else {
        return {
          success: false,
          error: response.data.errmsg || '获取 openid 失败',
          code: response.data.errcode
        };
      }
    } catch (error) {
      console.error('Wx login failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  return {
    success: false,
    error: '无法获取用户身份 (缺少 code 且非原生调用)'
  };
};