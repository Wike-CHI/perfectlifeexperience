/**
 * 微信支付云函数
 * 支持云调用和 HTTP 触发器两种调用方式
 *
 * 配置优先级：
 * 1. 本地 config.js（推荐，用于开发测试）
 * 2. 环境变量（生产环境）
 */

const cloud = require('wx-server-sdk');

// 尝试加载本地配置
let localConfig = {};
try {
  localConfig = require('./config');
} catch (e) {
  // 忽略加载错误
}

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const {
  jsapiOrder,
  queryOrderByOutTradeNo,
  closeOrder,
  refund,
  queryRefund,
  generateMiniProgramPayParams,
  generateOutTradeNo
} = require('./pay');

const {
  parseNotify,
  buildSuccessResponse,
  buildFailResponse,
  isTimestampValid,
  handlePaymentSuccess
} = require('./notify');

// ==================== 订单支付状态机 ====================

/**
 * 订单支付状态枚举
 */
const PAYMENT_STATUS = {
  PENDING: 'pending',        // 待支付
  PROCESSING: 'processing',  // 处理中（支付接口已调用）
  PAID: 'paid',            // 已支付
  FAILED: 'failed',          // 支付失败
  CANCELLED: 'cancelled',    // 已取消
  REFUNDED: 'refunded'       // 已退款
};

/**
 * 状态转换规则（定义哪些状态可以转换到哪些状态）
 */
const VALID_TRANSITIONS = {
  [PAYMENT_STATUS.PENDING]: [PAYMENT_STATUS.PROCESSING, PAYMENT_STATUS.CANCELLED],
  [PAYMENT_STATUS.PROCESSING]: [PAYMENT_STATUS.PAID, PAYMENT_STATUS.FAILED],
  [PAYMENT_STATUS.PAID]: [],              // 终态，不可转换
  [PAYMENT_STATUS.FAILED]: [PAYMENT_STATUS.PENDING],  // 失败后可以重试
  [PAYMENT_STATUS.CANCELLED]: [],        // 终态，不可转换
  [PAYMENT_STATUS.REFUNDED]: []        // 终态，不可转换
};

/**
 * 金额验证配置（单位：分）
 */
const AMOUNT_LIMITS = {
  MIN: 100,              // 1元（100分）
  MAX: 5000000            // 50000元（5000000分）
};

// ==================== 工具函数 ====================

/**
 * 验证并转换订单支付状态（带乐观锁）
 * @param {string} orderId - 订单ID
 * @param {string} newStatus - 目标状态
 * @returns {Promise<{success: boolean, code?: string, message?: string}>}
 */
async function validateAndUpdateOrderStatus(orderId, newStatus) {
  try {
    // 1. 查询订单当前状态
    const orderRes = await db.collection('orders').doc(orderId).get();
    if (!orderRes.data) {
      console.error('[订单状态验证] 订单不存在', { orderId });
      return {
        success: false,
        code: 'ORDER_NOT_FOUND',
        message: '订单信息异常'
      };
    }

    const order = orderRes.data;

    // 2. 检查是否已经是目标状态（幂等性）
    const actualStatus = order.paymentStatus || PAYMENT_STATUS.PENDING;
    if (actualStatus === newStatus) {
      return { success: true, message: '订单已是目标状态' };
    }

    // 3. 防止重复支付 - 已支付订单不允许任何状态变更
    if (actualStatus === PAYMENT_STATUS.PAID) {
      return {
        success: false,
        code: 'ALREADY_PAID',
        message: '订单已支付，请勿重复支付'
      };
    }

    // 4. 验证状态转换合法性
    const allowed = VALID_TRANSITIONS[actualStatus] || [];
    if (!allowed.includes(newStatus)) {
      return {
        success: false,
        code: 'INVALID_STATUS_TRANSITION',
        message: `无效的状态转换: ${actualStatus} -> ${newStatus}`
      };
    }

    // 5. 原子更新（简化乐观锁逻辑）
    // 如果订单已经是 processing 状态，可能是之前支付失败的重试，允许继续
    if (actualStatus === PAYMENT_STATUS.PROCESSING && newStatus === PAYMENT_STATUS.PROCESSING) {
      // 已在处理中，允许继续（幂等重试）
      return { success: true, message: '订单已在处理中' };
    }

    // 使用 doc 直接更新，先尝试更新
    const result = await db.collection('orders').doc(orderId).update({
      data: {
        paymentStatus: newStatus,
        paymentUpdateTime: new Date()
      }
    });

    return { success: true };
  } catch (error) {
    console.error('订单状态验证失败:', error);
    return {
      success: false,
      code: 'STATUS_UPDATE_FAILED',
      message: '订单状态更新失败'
    };
  }
}

/**
 * 获取商户配置
 */
function getConfig() {
  // 优先使用本地配置，其次使用环境变量
  const config = {
    appid: localConfig.appid || process.env.WX_PAY_APP_ID,
    mchid: localConfig.mchid || process.env.WX_PAY_MCH_ID,
    serialNo: localConfig.serialNo || process.env.WX_PAY_SERIAL_NO,
    privateKey: localConfig.privateKey || decodePrivateKey(process.env.WX_PAY_PRIVATE_KEY),
    apiV3Key: localConfig.apiV3Key || process.env.WX_PAY_API_V3_KEY,
    notifyUrl: localConfig.notifyUrl || process.env.WX_PAY_NOTIFY_URL
  };

  // 验证配置完整性（不暴露具体配置项名称）
  const required = ['appid', 'mchid', 'serialNo', 'privateKey', 'apiV3Key', 'notifyUrl'];
  for (const key of required) {
    if (!config[key]) {
      console.error(`[配置错误] 缺少必要配置: ${key}`);
      throw new Error('支付配置异常，请联系管理员');
    }
  }

  return config;
}

/**
 * 解码私钥（支持 Base64 编码）
 */
function decodePrivateKey(key) {
  if (!key) return null;
  
  // 如果已经是 PEM 格式，直接返回
  if (key.includes('-----BEGIN')) {
    return key;
  }
  
  // 否则尝试 Base64 解码
  try {
    return Buffer.from(key, 'base64').toString('utf8');
  } catch (error) {
    console.error('私钥解码失败:', error);
    return key;
  }
}

/**
 * 云函数主入口
 *
 * 支持的 action:
 * - createPayment: 创建支付订单
 * - queryOrder: 查询订单
 * - closeOrder: 关闭订单
 * - createRefund: 创建退款
 * - queryRefund: 查询退款
 * - notify: 支付回调通知（HTTP 触发器）
 * - refundCallback: 退款回调通知（HTTP 触发器）
 */
exports.main = async (event, context) => {
  const { action, data } = event;

  try {
    const config = getConfig();

    switch (action) {
      case 'createPayment':
        return await createPayment(data, config);

      case 'createRechargePayment':
        return await createRechargePayment(data, config);

      case 'queryOrder':
        return await queryOrder(data, config);

      case 'closeOrder':
        return await closeOrderHandler(data, config);

      case 'confirmRecharge':
        return await confirmRecharge(data, config);

      case 'createRefund':
        return await createRefundHandler(data, config);

      case 'queryRefund':
        return await queryRefundHandler(data, config);

      case 'notify':
        // HTTP 触发器回调
        return await handleNotify(event, config);

      case 'refundCallback':
        // HTTP 触发器退款回调
        return await handleRefundCallback(event, config);

      default:
        return {
          success: false,
          code: 'INVALID_ACTION',
          message: `未知操作: ${action}`
        };
    }
  } catch (error) {
    console.error('云函数执行失败:', error);
    return {
      success: false,
      code: 'INTERNAL_ERROR',
      message: error.message
    };
  }
};

/**
 * 创建充值支付订单
 */
async function createRechargePayment(data, config) {
  const { openid, amount, giftAmount = 0 } = data;

  // 1. ✅ 参数验证
  if (!openid || !amount) {
    return {
      success: false,
      code: 'INVALID_PARAMS',
      message: '缺少用户openid或充值金额'
    };
  }

  // 2. ✅ 验证充值金额范围
  if (amount < AMOUNT_LIMITS.MIN || amount > AMOUNT_LIMITS.MAX) {
    return {
      success: false,
      code: 'INVALID_AMOUNT',
      message: `充值金额异常: ${amount} 分`
    };
  }

  // 3. 生成充值订单号（RC 开头）
  const outTradeNo = generateOutTradeNo('RC');

  try {
    // 4. 创建充值订单记录
    const rechargeOrderData = {
      _openid: openid,
      orderNo: outTradeNo,
      amount: amount,
      giftAmount: giftAmount,
      status: 'pending',
      createTime: new Date()
    };

    const orderRes = await db.collection('recharge_orders').add({
      data: rechargeOrderData
    });

    const rechargeOrderId = orderRes._id;

    console.log(`[充值订单] 创建成功: ${outTradeNo}, 金额: ${amount}分, 赠送: ${giftAmount}分`);

    // 5. 调用微信支付统一下单
    const orderResult = await jsapiOrder({
      appid: config.appid,
      mchid: config.mchid,
      description: `大友元气-钱包充值`,
      out_trade_no: outTradeNo,
      notify_url: config.notifyUrl,
      amount: {
        total: amount,
        currency: 'CNY'
      },
      payer: {
        openid: openid
      }
    }, config);

    // 6. 生成小程序支付参数
    const payParams = generateMiniProgramPayParams(orderResult.prepay_id, config);

    return {
      success: true,
      data: {
        orderId: rechargeOrderId,
        orderNo: outTradeNo,
        prepayId: orderResult.prepay_id,
        payParams: payParams
      }
    };
  } catch (error) {
    console.error('创建充值支付订单失败:', error);
    return {
      success: false,
      code: error.code || 'CREATE_RECHARGE_PAYMENT_FAILED',
      message: error.message || '创建充值支付订单失败'
    };
  }
}

/**
 * 创建支付订单
 */
async function createPayment(data, config) {
  const { orderId, openid } = data;

  // 1. ✅ 参数验证
  if (!orderId || !openid) {
    return {
      success: false,
      code: 'INVALID_PARAMS',
      message: '缺少订单ID或用户openid'
    };
  }

  // 2. 查询订单信息
  const orderRes = await db.collection('orders')
    .where({
      _id: orderId,
      _openid: openid
    })
    .get();

  if (orderRes.data.length === 0) {
    console.error('[创建支付] 订单不存在', { orderId, openid });
    return {
      success: false,
      code: 'ORDER_NOT_FOUND',
      message: '订单信息异常'
    };
  }

  const order = orderRes.data[0];

  // 3. ✅ 验证订单金额范围
  if (order.totalAmount < AMOUNT_LIMITS.MIN || order.totalAmount > AMOUNT_LIMITS.MAX) {
    return {
      success: false,
      code: 'INVALID_AMOUNT',
      message: `订单金额异常: ${order.totalAmount} 分`
    };
  }

  // 4. ✅ 验证并更新订单状态为 processing（防止重复支付）
  const currentStatus = order.paymentStatus || PAYMENT_STATUS.PENDING;
  const statusUpdate = await validateAndUpdateOrderStatus(
    orderId,
    PAYMENT_STATUS.PROCESSING
  );

  if (!statusUpdate.success) {
    return statusUpdate;
  }

  try {
    // 5. 生成或使用现有订单号
    const outTradeNo = order.orderNo || generateOutTradeNo();

    // 6. 如果订单没有订单号，更新订单号
    if (!order.orderNo) {
      await db.collection('orders')
        .doc(orderId)
        .update({
          data: {
            orderNo: outTradeNo,
            updateTime: new Date()
          }
        });
    }

    // 7. 调用微信支付统一下单
    const orderResult = await jsapiOrder({
      appid: config.appid,
      mchid: config.mchid,
      description: `大友元气-${order.products?.[0]?.name || '精酿啤酒'}`,
      out_trade_no: outTradeNo,
      notify_url: config.notifyUrl,
      amount: {
        total: order.totalAmount,
        currency: 'CNY'
      },
      payer: {
        openid: openid
      }
    }, config);

    // 8. 生成小程序支付参数
    const payParams = generateMiniProgramPayParams(orderResult.prepay_id, config);

    return {
      success: true,
      data: {
        prepayId: orderResult.prepay_id,
        payParams: payParams
      }
    };
  } catch (error) {
    // 9. ✅ 支付失败，回滚订单状态为 pending
    await validateAndUpdateOrderStatus(orderId, PAYMENT_STATUS.PENDING);
    console.error('创建支付订单失败:', error);
    return {
      success: false,
      code: error.code || 'CREATE_PAYMENT_FAILED',
      message: error.message || '创建支付订单失败'
    };
  }
}

/**
 * 查询订单
 */
async function queryOrder(data, config) {
  const { outTradeNo, transactionId } = data;
  
  try {
    let result;
    if (transactionId) {
      result = await queryOrderByTransactionId(transactionId, config);
    } else if (outTradeNo) {
      result = await queryOrderByOutTradeNo(outTradeNo, config);
    } else {
      return {
        success: false,
        code: 'INVALID_PARAMS',
        message: '缺少订单号'
      };
    }
    
    return {
      success: true,
      data: result
    };
  } catch (error) {
    console.error('查询订单失败:', error);
    return {
      success: false,
      code: error.code || 'QUERY_ORDER_FAILED',
      message: error.message
    };
  }
}

/**
 * 关闭订单
 */
async function closeOrderHandler(data, config) {
  const { outTradeNo } = data;
  
  if (!outTradeNo) {
    return {
      success: false,
      code: 'INVALID_PARAMS',
      message: '缺少订单号'
    };
  }
  
  try {
    await closeOrder(outTradeNo, config);
    
    return {
      success: true,
      message: '订单已关闭'
    };
  } catch (error) {
    console.error('关闭订单失败:', error);
    return {
      success: false,
      code: error.code || 'CLOSE_ORDER_FAILED',
      message: error.message
    };
  }
}

/**
 * 确认充值状态（前端支付成功后调用）
 * 主动查询微信支付订单状态并更新余额
 */
async function confirmRecharge(data, config) {
  const { orderNo } = data;

  if (!orderNo) {
    return {
      success: false,
      code: 'INVALID_PARAMS',
      message: '缺少订单号'
    };
  }

  try {
    // 1. 查询充值订单
    const orderRes = await db.collection('recharge_orders')
      .where({ orderNo: orderNo })
      .get();

    if (orderRes.data.length === 0) {
      return {
        success: false,
        code: 'ORDER_NOT_FOUND',
        message: '充值订单不存在'
      };
    }

    const rechargeOrder = orderRes.data[0];

    // 2. 如果已经支付成功，直接返回
    if (rechargeOrder.status === 'paid') {
      return {
        success: true,
        message: '充值已完成',
        data: {
          amount: rechargeOrder.amount,
          giftAmount: rechargeOrder.giftAmount || 0
        }
      };
    }

    // 3. 查询微信支付订单状态
    const queryResult = await queryOrderByOutTradeNo(orderNo, config);
    console.log('[确认充值] 微信支付查询结果:', queryResult);

    // 4. 检查支付状态
    const tradeState = queryResult.trade_state;
    if (tradeState === 'SUCCESS') {
      // 支付成功，更新订单和钱包
      await handleRechargePaymentSuccess(rechargeOrder, db);

      return {
        success: true,
        message: '充值成功',
        data: {
          amount: rechargeOrder.amount,
          giftAmount: rechargeOrder.giftAmount || 0
        }
      };
    } else {
      // 支付未成功
      return {
        success: false,
        code: 'PAYMENT_NOT_SUCCESS',
        message: `支付状态: ${tradeState}`,
        tradeState: tradeState
      };
    }
  } catch (error) {
    console.error('确认充值失败:', error);
    return {
      success: false,
      code: 'CONFIRM_RECHARGE_FAILED',
      message: error.message
    };
  }
}

/**
 * 处理支付回调通知
 * HTTP 触发器入口
 */
async function handleNotify(event, config) {
  try {
    // HTTP 触发器的事件结构
    const headers = event.headers || {};
    const body = event.body || '';

    // 1. ✅ 验证时间戳（已有）
    const timestamp = headers['wechatpay-timestamp'];
    if (!isTimestampValid(timestamp)) {
      console.error('回调时间戳验证失败');
      return buildFailResponse('时间戳验证失败');
    }

    // 2. ✅ 解析并验证签名（已有）
    const result = await parseNotify(headers, body, config);

    if (!result.success) {
      console.log('支付验证失败:', result.summary);
      return buildFailResponse(result.summary);
    }

    // 3. ✅ 防止重复处理回调（幂等性检查）
    const { out_trade_no } = result.transaction;

    // 检查是充值订单还是普通订单（充值订单以 RC 开头）
    const isRechargeOrder = out_trade_no.startsWith('RC');

    if (isRechargeOrder) {
      // 充值订单处理
      const rechargeOrderRes = await db.collection('recharge_orders')
        .where({ orderNo: out_trade_no })
        .get();

      if (rechargeOrderRes.data.length > 0) {
        const rechargeOrder = rechargeOrderRes.data[0];

        // 如果订单已支付，直接返回成功（避免微信重复通知）
        if (rechargeOrder.status === 'paid') {
          console.log(`充值订单 ${out_trade_no} 已处理，忽略重复回调`);
          return buildSuccessResponse();
        }

        // 验证金额
        if (rechargeOrder.amount !== result.transaction.amount.total) {
          console.error(`充值金额不匹配: 订单=${rechargeOrder.amount}, 回调=${result.transaction.amount.total}`);
          return buildFailResponse('金额验证失败');
        }

        // 处理充值支付成功
        if (result.success) {
          await handleRechargePaymentSuccess(rechargeOrder, db);
          return buildSuccessResponse();
        }
      } else {
        console.error(`充值订单 ${out_trade_no} 不存在`);
        return buildFailResponse('订单不存在');
      }
    } else {
      // 普通订单处理
      const existingOrder = await db.collection('orders')
        .where({ orderNo: out_trade_no })
        .get();

      if (existingOrder.data.length > 0) {
        const order = existingOrder.data[0];
        const currentStatus = order.paymentStatus || PAYMENT_STATUS.PENDING;

        // 如果订单已支付，直接返回成功（避免微信重复通知）
        if (currentStatus === PAYMENT_STATUS.PAID) {
          console.log(`订单 ${out_trade_no} 已处理，忽略重复回调`);
          return buildSuccessResponse();
        }
      }

      // 4. ✅ 验证回调金额与订单金额一致
      if (existingOrder.data.length > 0) {
        const order = existingOrder.data[0];
        if (order.totalAmount !== result.transaction.amount.total) {
          console.error(`金额不匹配: 订单=${order.totalAmount}, 回调=${result.transaction.amount.total}`);
          return buildFailResponse('金额验证失败');
        }
      }

      // 5. 处理支付成功
      if (result.success) {
        // 先更新订单状态为 PAID
        const orderId = existingOrder.data[0]?._id;
        if (orderId) {
          const statusUpdate = await validateAndUpdateOrderStatus(
            orderId,
            PAYMENT_STATUS.PAID
          );

          if (!statusUpdate.success) {
            console.error('更新订单状态失败:', statusUpdate.message);
            // 即使状态更新失败，也继续处理支付成功（避免丢单）
          }
        }

        await handlePaymentSuccess(result.transaction, db);
        return buildSuccessResponse();
      } else {
        console.log('支付未成功:', result.summary);
        return buildSuccessResponse();
      }
    }
  } catch (error) {
    console.error('处理回调失败:', error);
    return buildFailResponse(error.message);
  }
}

/**
 * 处理充值支付成功
 */
async function handleRechargePaymentSuccess(rechargeOrder, db) {
  const { _id, _openid, orderNo, amount, giftAmount = 0 } = rechargeOrder;
  const totalAmount = amount + giftAmount;

  console.log(`[充值成功] 订单号: ${orderNo}, 本金: ${amount}分, 赠送: ${giftAmount}分, 总计: ${totalAmount}分`);

  // 1. 更新充值订单状态
  await db.collection('recharge_orders').doc(_id).update({
    data: {
      status: 'paid',
      paidTime: db.serverDate(),
      transactionId: orderNo // 实际应该存储微信支付的交易号
    }
  });

  // 2. 更新钱包余额
  const WALLETS_COLLECTION = 'user_wallets';
  const TRANSACTIONS_COLLECTION = 'wallet_transactions';

  const _ = db.command;

  // 检查钱包是否存在
  const walletRes = await db.collection(WALLETS_COLLECTION)
    .where({ _openid: _openid })
    .get();

  if (walletRes.data.length === 0) {
    // 创建钱包
    await db.collection(WALLETS_COLLECTION).add({
      data: {
        _openid: _openid,
        balance: totalAmount,
        totalRecharge: amount,
        totalGift: giftAmount,
        updateTime: db.serverDate()
      }
    });
  } else {
    // 更新钱包余额
    await db.collection(WALLETS_COLLECTION).doc(walletRes.data[0]._id).update({
      data: {
        balance: _.inc(totalAmount),
        totalRecharge: _.inc(amount),
        totalGift: _.inc(giftAmount),
        updateTime: db.serverDate()
      }
    });
  }

  // 3. 记录交易日志
  const title = giftAmount > 0
    ? `充值¥${(amount / 100).toFixed(0)}（赠¥${(giftAmount / 100).toFixed(0)}）`
    : `钱包充值`;

  await db.collection(TRANSACTIONS_COLLECTION).add({
    data: {
      _openid: _openid,
      type: 'recharge',
      amount: amount,
      giftAmount: giftAmount,
      totalAmount: totalAmount,
      title: title,
      status: 'success',
      rechargeOrderNo: orderNo,
      createTime: db.serverDate()
    }
  });

  console.log(`[充值成功] 钱包余额已更新，用户: ${_openid}, 新增余额: ${totalAmount}分`);
}

/**
 * 生成退款单号
 */
function generateRefundNo() {
  return generateOutTradeNo('RF');
}

/**
 * 创建退款
 */
async function createRefundHandler(data, config) {
  const { orderNo, refundNo, refundAmount, reason } = data;

  // 1. 参数验证
  if (!orderNo || !refundNo || !refundAmount) {
    return {
      success: false,
      code: 'INVALID_PARAMS',
      message: '缺少必要参数: orderNo, refundNo, refundAmount'
    };
  }

  // 2. 验证退款金额
  if (refundAmount < AMOUNT_LIMITS.MIN || refundAmount > AMOUNT_LIMITS.MAX) {
    return {
      success: false,
      code: 'INVALID_AMOUNT',
      message: `退款金额异常: ${refundAmount} 分`
    };
  }

  try {
    // 3. 查询订单信息
    const orderRes = await db.collection('orders')
      .where({ orderNo })
      .get();

    if (orderRes.data.length === 0) {
      return {
        success: false,
        code: 'ORDER_NOT_FOUND',
        message: '订单不存在'
      };
    }

    const order = orderRes.data[0];
    const transactionId = order.transactionId;

    if (!transactionId) {
      return {
        success: false,
        code: 'NO_TRANSACTION_ID',
        message: '订单无微信交易号，无法退款'
      };
    }

    // 4. 调用微信支付退款API
    const refundResult = await refund({
      out_trade_no: orderNo,
      out_refund_no: refundNo,
      transaction_id: transactionId,
      amount: {
        refund: refundAmount,
        total: order.totalAmount,
        currency: 'CNY'
      },
      reason: reason || '用户申请退款'
    }, config);

    console.log('[微信退款] 退款申请成功:', refundResult);

    return {
      success: true,
      data: {
        refundNo,
        status: refundResult.status || 'processing',
        refundId: refundResult.refund_id
      }
    };
  } catch (error) {
    console.error('创建退款失败:', error);
    return {
      success: false,
      code: error.code || 'CREATE_REFUND_FAILED',
      message: error.message || '创建退款失败'
    };
  }
}

/**
 * 查询退款
 */
async function queryRefundHandler(data, config) {
  const { refundNo } = data;

  if (!refundNo) {
    return {
      success: false,
      code: 'INVALID_PARAMS',
      message: '缺少退款单号'
    };
  }

  try {
    const result = await queryRefund(refundNo, config);

    return {
      success: true,
      data: result
    };
  } catch (error) {
    console.error('查询退款失败:', error);
    return {
      success: false,
      code: error.code || 'QUERY_REFUND_FAILED',
      message: error.message
    };
  }
}

/**
 * 处理退款回调通知
 * HTTP 触发器入口
 */
async function handleRefundCallback(event, config) {
  try {
    // HTTP 触发器的事件结构
    const headers = event.headers || {};
    const body = event.body || '';

    // 1. 验证时间戳
    const timestamp = headers['wechatpay-timestamp'];
    if (!isTimestampValid(timestamp)) {
      console.error('退款回调时间戳验证失败');
      return buildFailResponse('时间戳验证失败');
    }

    // 2. 解析并验证签名
    const result = await parseNotify(headers, body, config);

    if (!result.success) {
      console.log('退款回调验证失败:', result.summary);
      return buildFailResponse(result.summary);
    }

    // 3. 获取退款信息
    const { out_refund_no } = result.transaction;

    // 4. 查询退款记录
    const refundRes = await db.collection('refunds')
      .where({ refundNo: out_refund_no })
      .get();

    if (refundRes.data.length === 0) {
      console.error(`退款记录不存在: ${out_refund_no}`);
      return buildFailResponse('退款记录不存在');
    }

    const refundRecord = refundRes.data[0];
    const currentStatus = refundRecord.refundStatus;

    // 5. 幂等性检查 - 如果已经处理过，直接返回成功
    if (currentStatus === 'success') {
      console.log(`退款 ${out_refund_no} 已处理，忽略重复回调`);
      return buildSuccessResponse();
    }

    // 6. 检查退款状态
    const refundStatus = result.transaction.trade_status;
    let newStatus = 'failed';
    let successTime = null;

    if (refundStatus === 'SUCCESS') {
      newStatus = 'success';
      successTime = new Date();

      // 7. 更新退款记录
      await db.collection('refunds').doc(refundRecord._id).update({
        data: {
          refundStatus: newStatus,
          transactionId: result.transaction.refund_id,
          successTime: successTime,
          updateTime: db.serverDate()
        }
      });

      // 8. 更新订单的退款金额
      await db.collection('orders').doc(refundRecord.orderId).update({
        data: {
          refundAmount: _.inc(refundRecord.refundAmount),
          refundStatus: _.inc(refundRecord.refundAmount) >= (refundRecord.totalAmount || 0) ? 'full' : 'partial',
          updateTime: db.serverDate()
        }
      });

      // 9. 触发推广奖励扣回（在admin-api的confirmReceipt中处理）
      console.log(`[退款成功] 退款单号: ${out_refund_no}, 金额: ${refundRecord.refundAmount}分`);
    } else {
      // 退款失败
      await db.collection('refunds').doc(refundRecord._id).update({
        data: {
          refundStatus: newStatus,
          failedReason: refundStatus,
          updateTime: db.serverDate()
        }
      });

      console.log(`[退款失败] 退款单号: ${out_refund_no}, 原因: ${refundStatus}`);
    }

    return buildSuccessResponse();
  } catch (error) {
    console.error('处理退款回调失败:', error);
    return buildFailResponse(error.message);
  }
}

