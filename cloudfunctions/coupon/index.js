const cloud = require('wx-server-sdk');

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

// 云函数入口函数
exports.main = async (event, context) => {
  console.log('Coupon raw event:', JSON.stringify(event));
  
  const requestData = parseEvent(event);
  console.log('Coupon parsed data:', JSON.stringify(requestData));

  const { action, data = {} } = requestData;
  // 🔒 安全：只使用 wxContext.OPENID，不信任前端传递的 _token
  const OPENID = cloud.getWXContext().OPENID;

  if (!OPENID) {
    return {
      success: false,
      error: '未登录或登录已过期'
    };
  }

  console.log('Coupon openid:', OPENID, 'action:', action);

  try {
    switch (action) {
      case 'getTemplates':
        return await getTemplates();
      case 'receiveCoupon':
        return await receiveCoupon(OPENID, data);
      case 'getMyCoupons':
        return await getMyCoupons(OPENID, data);
      case 'useCoupon':
        return await useCoupon(OPENID, data);
      case 'getAvailableCoupons':
        return await getAvailableCoupons(OPENID, data);
      default:
        return { code: -1, msg: '未知操作' };
    }
  } catch (error) {
    console.error('coupon function error:', error);
    return { code: -1, msg: error.message || '操作失败' };
  }
};

// 获取优惠券模板列表
async function getTemplates() {
  const now = new Date();
  
  const { data } = await db.collection('coupon_templates')
    .where({
      isActive: true,
      startTime: _.lte(now),
      endTime: _.gte(now),
      receivedCount: _.lt(_.multiply(['totalCount'], 1))
    })
    .orderBy('createTime', 'desc')
    .get();
  
  return { code: 0, data };
}

// 领取优惠券
async function receiveCoupon(openid, data) {
  const { templateId } = data;
  
  if (!templateId) {
    return { code: -1, msg: '参数错误' };
  }
  
  // 获取模板信息
  const { data: templates } = await db.collection('coupon_templates')
    .where({ _id: templateId })
    .get();
  
  if (templates.length === 0) {
    return { code: -1, msg: '优惠券不存在' };
  }
  
  const template = templates[0];
  const now = new Date();
  
  // 检查各种条件
  if (!template.isActive) {
    return { code: -1, msg: '优惠券已停用' };
  }
  
  if (now < template.startTime || now > template.endTime) {
    return { code: -1, msg: '不在领取时间范围内' };
  }
  
  if (template.receivedCount >= template.totalCount) {
    return { code: -1, msg: '优惠券已领完' };
  }
  
  // 检查用户领取限制
  const { total: userReceivedCount } = await db.collection('user_coupons')
    .where({
      _openid: openid,
      templateId: templateId
    })
    .count();
  
  if (userReceivedCount >= template.limitPerUser) {
    return { code: -1, msg: '已达到领取上限' };
  }
  
  // 创建用户优惠券
  const expireTime = new Date(now.getTime() + template.validDays * 24 * 60 * 60 * 1000);
  
  const couponData = {
    _openid: openid,
    templateId,
    status: 'unused',
    receiveTime: now,
    expireTime,
    createTime: now
  };
  
  // 使用事务确保数据一致性
  const transaction = await db.startTransaction();
  
  try {
    // 创建用户优惠券
    await transaction.collection('user_coupons').add({
      data: couponData
    });
    
    // 更新模板领取数量
    await transaction.collection('coupon_templates')
      .doc(templateId)
      .update({
        data: {
          receivedCount: _.inc(1)
        }
      });
    
    await transaction.commit();
    
    return { code: 0, msg: '领取成功' };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

// 获取我的优惠券
async function getMyCoupons(openid, data) {
  const { status } = data;
  const now = new Date();
  
  let whereCondition = {
    _openid: openid
  };
  
  if (status) {
    if (status === 'unused') {
      whereCondition.status = 'unused';
      whereCondition.expireTime = _.gte(now);
    } else if (status === 'expired') {
      whereCondition = {
        _openid: openid,
        $or: [
          { status: 'expired' },
          { status: 'unused', expireTime: _.lt(now) }
        ]
      };
    } else {
      whereCondition.status = status;
    }
  }

  const { data: userCoupons } = await db.collection('user_coupons')
    .where(whereCondition)
    .orderBy('receiveTime', 'desc')
    .get();

  // 获取模板信息
  const templateIds = [...new Set(userCoupons.map(item => item.templateId))];
  const { data: templates } = await db.collection('coupon_templates')
    .where({
      _id: _.in(templateIds)
    })
    .get();

  const templateMap = {};
  templates.forEach(t => {
    templateMap[t._id] = t;
  });

  // 合并数据并更新过期状态
  const result = userCoupons.map(item => {
    const isExpired = item.status === 'unused' && new Date(item.expireTime) < now;
    return {
      ...item,
      template: templateMap[item.templateId],
      status: isExpired ? 'expired' : item.status
    };
  });

  // 批量更新过期状态
  const expiredIds = result
    .filter(item => item.status === 'expired' && userCoupons.find(d => d._id === item._id).status !== 'expired')
    .map(item => item._id);
  
  if (expiredIds.length > 0) {
    for (const id of expiredIds) {
      await db.collection('user_coupons').doc(id).update({
        data: { status: 'expired' }
      });
    }
  }
  
  return { code: 0, data: result };
}

// 使用优惠券
async function useCoupon(openid, data) {
  const { couponId, orderNo } = data;
  
  if (!couponId || !orderNo) {
    return { code: -1, msg: '参数错误' };
  }
  
  const { data: coupons } = await db.collection('user_coupons')
    .where({
      _id: couponId,
      _openid: openid
    })
    .get();
  
  if (coupons.length === 0) {
    return { code: -1, msg: '优惠券不存在' };
  }
  
  const coupon = coupons[0];
  const now = new Date();
  
  if (coupon.status !== 'unused') {
    return { code: -1, msg: '优惠券状态异常' };
  }
  
  if (new Date(coupon.expireTime) < now) {
    return { code: -1, msg: '优惠券已过期' };
  }
  
  await db.collection('user_coupons').doc(couponId).update({
    data: {
      status: 'used',
      useTime: now,
      orderNo
    }
  });
  
  return { code: 0, msg: '使用成功' };
}

// 获取订单可用优惠券
async function getAvailableCoupons(openid, data) {
  const { orderAmount } = data;
  const now = new Date();
  
  const { data: coupons } = await db.collection('user_coupons')
    .where({
      _openid: openid,
      status: 'unused',
      expireTime: _.gte(now)
    })
    .get();
  
  // 获取模板信息
  const templateIds = [...new Set(coupons.map(item => item.templateId))];
  const { data: templates } = await db.collection('coupon_templates')
    .where({
      _id: _.in(templateIds)
    })
    .get();
  
  const templateMap = {};
  templates.forEach(t => {
    templateMap[t._id] = t;
  });
  
  // 筛选可用优惠券
  const availableCoupons = coupons
    .map(item => ({
      ...item,
      template: templateMap[item.templateId]
    }))
    .filter(item => {
      if (!item.template) return false;
      if (item.template.minAmount && orderAmount < item.template.minAmount) {
        return false;
      }
      return true;
    })
    .sort((a, b) => {
      // 按优惠金额降序排列
      const discountA = calculateDiscount(a.template, orderAmount);
      const discountB = calculateDiscount(b.template, orderAmount);
      return discountB - discountA;
    });
  
  return { code: 0, data: availableCoupons };
}

// 计算优惠金额
function calculateDiscount(template, orderAmount) {
  if (!template) return 0;
  
  if (template.minAmount && orderAmount < template.minAmount) {
    return 0;
  }
  
  switch (template.type) {
    case 'amount':
      return Math.min(template.value, orderAmount);
    case 'discount':
      return Math.floor(orderAmount * (100 - template.value) / 100);
    case 'no_threshold':
      return Math.min(template.value, orderAmount);
    default:
      return 0;
  }
}
