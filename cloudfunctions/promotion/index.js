const cloud = require('wx-server-sdk');

// 初始化云开发
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

// 解析 HTTP 触发器的请求体
function parseEvent(event) {
  if (event.body) {
    try {
      return typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    } catch (e) {
      console.error('解析 body 失败:', e);
    }
  }
  return event;
}

// 推广奖励比例配置（使用中性命名）
const REWARD_RATIOS = {
  LEVEL_1: 0.20, // 直接推广：20%
  LEVEL_2: 0.15, // 二级：15%
  LEVEL_3: 0.10, // 三级：10%
  LEVEL_4: 0.05  // 四级：5%
};

// 最大推广层级
const MAX_LEVEL = 4;

// 结算周期（天）
const SETTLEMENT_DAYS = 7;

/**
 * 生成唯一邀请码
 */
function generateInviteCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * 获取设备指纹（用于防刷）
 */
function getDeviceFingerprint(event) {
  const OPENID = event.OPENID || cloud.getWXContext().OPENID;
  const clientIP = event.clientIP || '';
  return {
    openid: OPENID,
    ip: clientIP,
    timestamp: Date.now()
  };
}

/**
 * 检查是否为重复注册（防刷）
 */
async function checkDuplicateRegistration(openid, deviceInfo) {
  try {
    // 检查同一IP近期注册数量
    const recentTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24小时内
    const ipCount = await db.collection('users')
      .where({
        registerIP: deviceInfo.ip,
        createTime: _.gte(recentTime)
      })
      .count();
    
    if (ipCount.total >= 3) {
      return { valid: false, reason: '操作频繁，请稍后再试' };
    }

    // 检查用户是否已存在
    const userExists = await db.collection('users')
      .where({ _openid: openid })
      .count();
    
    if (userExists.total > 0) {
      return { valid: false, reason: '用户已存在' };
    }

    return { valid: true };
  } catch (error) {
    console.error('防刷检查失败:', error);
    return { valid: false, reason: '系统繁忙' };
  }
}

/**
 * 绑定推广关系
 */
async function bindPromotionRelation(event, context) {
  const OPENID = event.OPENID || cloud.getWXContext().OPENID;
  const { parentInviteCode, userInfo, deviceInfo } = event;

  try {
    // 防刷检查
    const checkResult = await checkDuplicateRegistration(OPENID, deviceInfo);
    if (!checkResult.valid) {
      return { code: -1, msg: checkResult.reason };
    }

    // 查找上级用户
    let parentId = null;
    let parentLevel = 0;
    let parentPath = '';

    if (parentInviteCode) {
      const parentRes = await db.collection('users')
        .where({ inviteCode: parentInviteCode })
        .get();
      
      if (parentRes.data.length === 0) {
        return { code: -1, msg: '邀请码无效' };
      }

      const parent = parentRes.data[0];
      parentId = parent._openid;
      parentLevel = parent.promotionLevel || 0;
      parentPath = parent.promotionPath || '';

      // 检查层级深度
      if (parentLevel >= MAX_LEVEL) {
        // 超过4级，按4级处理
        parentLevel = MAX_LEVEL - 1;
      }

      // 不能绑定自己
      if (parentId === OPENID) {
        return { code: -1, msg: '不能绑定自己' };
      }
    }

    // 生成邀请码
    let inviteCode = generateInviteCode();
    let codeExists = true;
    let retryCount = 0;
    
    while (codeExists && retryCount < 10) {
      const existRes = await db.collection('users')
        .where({ inviteCode })
        .count();
      if (existRes.total === 0) {
        codeExists = false;
      } else {
        inviteCode = generateInviteCode();
        retryCount++;
      }
    }

    // 计算当前用户的推广层级和路径
    const currentLevel = parentLevel + 1;
    const currentPath = parentPath ? `${parentPath}/${parentId}` : (parentId || '');

    // 创建用户记录
    const userData = {
      _openid: OPENID,
      ...userInfo,
      inviteCode,
      parentId,
      promotionLevel: currentLevel,
      promotionPath: currentPath,
      registerIP: deviceInfo.ip,
      totalReward: 0,
      pendingReward: 0,
      teamCount: 0,
      createTime: db.serverDate(),
      updateTime: db.serverDate()
    };

    await db.collection('users').add({ data: userData });

    // 更新上级的团队数量
    if (parentId) {
      await db.collection('users')
        .where({ _openid: parentId })
        .update({
          data: {
            teamCount: _.inc(1),
            updateTime: db.serverDate()
          }
        });

      // 记录推广关系
      await db.collection('promotion_relations').add({
        data: {
          userId: OPENID,
          parentId,
          level: currentLevel,
          path: currentPath,
          createTime: db.serverDate()
        }
      });
    }

    return {
      code: 0,
      msg: '绑定成功',
      data: {
        inviteCode,
        level: currentLevel
      }
    };
  } catch (error) {
    console.error('绑定推广关系失败:', error);
    return { code: -1, msg: '绑定失败，请重试' };
  }
}

/**
 * 计算订单推广奖励
 */
async function calculatePromotionReward(event, context) {
  const { orderId, buyerId, orderAmount } = event;

  try {
    // 获取买家信息
    const buyerRes = await db.collection('users')
      .where({ _openid: buyerId })
      .get();
    
    if (buyerRes.data.length === 0) {
      return { code: -1, msg: '买家信息不存在' };
    }

    const buyer = buyerRes.data[0];
    const promotionPath = buyer.promotionPath || '';

    // 如果没有推广路径，直接返回
    if (!promotionPath) {
      return { code: 0, msg: '无推广关系', data: { rewards: [] } };
    }

    // 解析推广路径，获取上级链
    const parentChain = promotionPath.split('/').filter(id => id);
    
    // 记录推广订单
    await db.collection('promotion_orders').add({
      data: {
        orderId,
        buyerId,
        orderAmount,
        status: 'pending', // pending/settled
        createTime: db.serverDate(),
        settleTime: null
      }
    });

    // 计算各级奖励
    const rewards = [];
    const reversedChain = parentChain.reverse(); // 从近到远

    for (let i = 0; i < Math.min(reversedChain.length, MAX_LEVEL); i++) {
      const beneficiaryId = reversedChain[i];
      const level = i + 1;
      
      // 根据层级确定比例
      let ratio = 0;
      switch (level) {
        case 1: ratio = REWARD_RATIOS.LEVEL_1; break;
        case 2: ratio = REWARD_RATIOS.LEVEL_2; break;
        case 3: ratio = REWARD_RATIOS.LEVEL_3; break;
        case 4: ratio = REWARD_RATIOS.LEVEL_4; break;
      }

      const rewardAmount = Math.floor(orderAmount * ratio);

      if (rewardAmount > 0) {
        // 创建奖励记录
        await db.collection('reward_records').add({
          data: {
            orderId,
            beneficiaryId,
            sourceUserId: buyerId,
            level,
            orderAmount,
            ratio,
            amount: rewardAmount,
            status: 'pending',
            createTime: db.serverDate(),
            settleTime: null
          }
        });

        // 更新用户的待结算奖励
        await db.collection('users')
          .where({ _openid: beneficiaryId })
          .update({
            data: {
              pendingReward: _.inc(rewardAmount),
              updateTime: db.serverDate()
            }
          });

        rewards.push({
          beneficiaryId,
          level,
          amount: rewardAmount,
          ratio
        });
      }
    }

    return {
      code: 0,
      msg: '奖励计算成功',
      data: { rewards }
    };
  } catch (error) {
    console.error('计算奖励失败:', error);
    return { code: -1, msg: '计算失败' };
  }
}

/**
 * 获取推广信息
 */
async function getPromotionInfo(event, context) {
  const OPENID = event.OPENID || cloud.getWXContext().OPENID;

  try {
    // 获取用户信息
    const userRes = await db.collection('users')
      .where({ _openid: OPENID })
      .get();
    
    if (userRes.data.length === 0) {
      return { code: -1, msg: '用户不存在' };
    }

    const user = userRes.data[0];

    // 获取团队统计
    const teamStats = await getTeamStats(OPENID);

    // 获取今日收益
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayRewardRes = await db.collection('reward_records')
      .where({
        beneficiaryId: OPENID,
        status: 'settled',
        settleTime: _.gte(today)
      })
      .get();
    
    const todayReward = todayRewardRes.data.reduce((sum, r) => sum + r.amount, 0);

    // 获取本月收益
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const monthRewardRes = await db.collection('reward_records')
      .where({
        beneficiaryId: OPENID,
        status: 'settled',
        settleTime: _.gte(monthStart)
      })
      .get();
    
    const monthReward = monthRewardRes.data.reduce((sum, r) => sum + r.amount, 0);

    return {
      code: 0,
      msg: '获取成功',
      data: {
        inviteCode: user.inviteCode,
        level: user.promotionLevel,
        totalReward: user.totalReward,
        pendingReward: user.pendingReward,
        todayReward,
        monthReward,
        teamStats
      }
    };
  } catch (error) {
    console.error('获取推广信息失败:', error);
    return { code: -1, msg: '获取失败' };
  }
}

/**
 * 获取团队统计
 */
async function getTeamStats(userId) {
  const stats = {
    total: 0,
    level1: 0,
    level2: 0,
    level3: 0,
    level4: 0
  };

  try {
    // 获取直接团队成员（一级）
    const level1Res = await db.collection('users')
      .where({ parentId: userId })
      .count();
    stats.level1 = level1Res.total;

    // 获取二级团队成员
    const level1Users = await db.collection('users')
      .where({ parentId: userId })
      .get();
    
    if (level1Users.data.length > 0) {
      const level1Ids = level1Users.data.map(u => u._openid);
      const level2Res = await db.collection('users')
        .where({
          parentId: _.in(level1Ids)
        })
        .count();
      stats.level2 = level2Res.total;

      // 获取三级
      const level2Users = await db.collection('users')
        .where({
          parentId: _.in(level1Ids)
        })
        .get();
      
      if (level2Users.data.length > 0) {
        const level2Ids = level2Users.data.map(u => u._openid);
        const level3Res = await db.collection('users')
          .where({
            parentId: _.in(level2Ids)
          })
          .count();
        stats.level3 = level3Res.total;

        // 获取四级
        const level3Users = await db.collection('users')
          .where({
            parentId: _.in(level2Ids)
          })
          .get();
        
        if (level3Users.data.length > 0) {
          const level3Ids = level3Users.data.map(u => u._openid);
          const level4Res = await db.collection('users')
            .where({
              parentId: _.in(level3Ids)
            })
            .count();
          stats.level4 = level4Res.total;
        }
      }
    }

    stats.total = stats.level1 + stats.level2 + stats.level3 + stats.level4;
    return stats;
  } catch (error) {
    console.error('获取团队统计失败:', error);
    return stats;
  }
}

/**
 * 获取团队成员列表
 */
async function getTeamMembers(event, context) {
  const OPENID = event.OPENID || cloud.getWXContext().OPENID;
  const { level = 1, page = 1, limit = 20 } = event;

  try {
    let query = {};
    
    if (level === 1) {
      // 直接团队成员
      query = { parentId: OPENID };
    } else {
      // 需要查询多级，这里简化处理
      // 实际应该使用path字段查询
      const userRes = await db.collection('users')
        .where({ _openid: OPENID })
        .get();
      
      if (userRes.data.length === 0) {
        return { code: -1, msg: '用户不存在' };
      }

      const userPath = userRes.data[0].promotionPath || '';
      const fullPath = userPath ? `${userPath}/${OPENID}` : OPENID;
      
      // 查询路径中包含当前用户路径的成员
      query = {
        promotionPath: db.RegExp({
          regexp: fullPath,
          options: 'i'
        }),
        promotionLevel: (userRes.data[0].promotionLevel || 0) + level
      };
    }

    const membersRes = await db.collection('users')
      .where(query)
      .orderBy('createTime', 'desc')
      .skip((page - 1) * limit)
      .limit(limit)
      .get();

    const members = membersRes.data.map(m => ({
      id: m._openid,
      nickName: m.nickName,
      avatarUrl: m.avatarUrl,
      createTime: m.createTime,
      level: m.promotionLevel
    }));

    return {
      code: 0,
      msg: '获取成功',
      data: { members }
    };
  } catch (error) {
    console.error('获取团队成员失败:', error);
    return { code: -1, msg: '获取失败' };
  }
}

/**
 * 获取奖励明细
 */
async function getRewardRecords(event, context) {
  const OPENID = event.OPENID || cloud.getWXContext().OPENID;
  const { status, page = 1, limit = 20 } = event;

  try {
    let query = { beneficiaryId: OPENID };
    
    if (status) {
      query.status = status;
    }

    const recordsRes = await db.collection('reward_records')
      .where(query)
      .orderBy('createTime', 'desc')
      .skip((page - 1) * limit)
      .limit(limit)
      .get();

    // 获取来源用户信息
    const sourceIds = [...new Set(recordsRes.data.map(r => r.sourceUserId))];
    const usersRes = await db.collection('users')
      .where({
        _openid: _.in(sourceIds)
      })
      .get();
    
    const userMap = {};
    usersRes.data.forEach(u => {
      userMap[u._openid] = u;
    });

    const records = recordsRes.data.map(r => ({
      id: r._id,
      orderId: r.orderId,
      amount: r.amount,
      ratio: r.ratio,
      level: r.level,
      status: r.status,
      createTime: r.createTime,
      settleTime: r.settleTime,
      sourceUser: userMap[r.sourceUserId] ? {
        nickName: userMap[r.sourceUserId].nickName,
        avatarUrl: userMap[r.sourceUserId].avatarUrl
      } : null
    }));

    return {
      code: 0,
      msg: '获取成功',
      data: { records }
    };
  } catch (error) {
    console.error('获取奖励明细失败:', error);
    return { code: -1, msg: '获取失败' };
  }
}

/**
 * 生成推广二维码
 */
async function generateQRCode(event, context) {
  const OPENID = event.OPENID || cloud.getWXContext().OPENID;
  const { page = 'pages/index/index' } = event;

  try {
    // 获取用户邀请码
    const userRes = await db.collection('users')
      .where({ _openid: OPENID })
      .get();
    
    if (userRes.data.length === 0) {
      return { code: -1, msg: '用户不存在' };
    }

    const user = userRes.data[0];
    const scene = `invite=${user.inviteCode}`;

    // 调用微信接口生成小程序码
    const result = await cloud.openapi.wxacode.getUnlimited({
      scene,
      page,
      width: 280,
      checkPath: false
    });

    // 上传二维码到云存储
    const uploadRes = await cloud.uploadFile({
      cloudPath: `qrcodes/${OPENID}_${Date.now()}.png`,
      fileContent: result.buffer
    });

    // 获取临时链接
    const fileRes = await cloud.getTempFileURL({
      fileList: [uploadRes.fileID]
    });

    return {
      code: 0,
      msg: '生成成功',
      data: {
        qrCodeUrl: fileRes.fileList[0].tempFileURL,
        inviteCode: user.inviteCode
      }
    };
  } catch (error) {
    console.error('生成二维码失败:', error);
    return { code: -1, msg: '生成失败' };
  }
}

/**
 * 主入口函数
 */
exports.main = async (event, context) => {
  console.log('Promotion raw event:', JSON.stringify(event));
  
  const requestData = parseEvent(event);
  console.log('Promotion parsed data:', JSON.stringify(requestData));
  
  const { action } = requestData;
  // 优先从 requestData._token 获取（HTTP 触发器模式），否则从 wxContext 获取
  const OPENID = requestData._token || cloud.getWXContext().OPENID;
  
  console.log('Promotion openid:', OPENID, 'action:', action);

  // 将 OPENID 和 requestData 注入，供其他函数使用
  requestData.OPENID = OPENID;

  switch (action) {
    case 'bindRelation':
      return await bindPromotionRelation(requestData, context);
    case 'calculateReward':
      return await calculatePromotionReward(requestData, context);
    case 'getInfo':
      return await getPromotionInfo(requestData, context);
    case 'getTeamMembers':
      return await getTeamMembers(requestData, context);
    case 'getRewardRecords':
      return await getRewardRecords(requestData, context);
    case 'generateQRCode':
      return await generateQRCode(requestData, context);
    default:
      return { code: -1, msg: '未知操作' };
  }
};
