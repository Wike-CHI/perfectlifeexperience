/**
 * 地址/店铺/钱包/配置/供应商模块
 */

// 获取用户地址列表
async function getAddresses(db, data) {
  try {
    const { userId } = data || {};
    const query = userId ? { _openid: userId } : {};
    const result = await db.collection('addresses').where(query).get();
    return { code: 0, data: result.data };
  } catch (error) {
    return { code: 500, msg: error.message };
  }
}

// 删除地址
async function deleteAddress(db, logOperation, data, wxContext) {
  try {
    const { id } = data || {};
    await db.collection('addresses').doc(id).remove();
    return { code: 0, msg: '地址已删除' };
  } catch (error) {
    return { code: 500, msg: error.message };
  }
}

// 获取店铺信息
async function getStoreInfo(db) {
  try {
    const result = await db.collection('stores').limit(1).get();
    return { code: 0, data: result.data[0] || {} };
  } catch (error) {
    return { code: 500, msg: error.message };
  }
}

// 更新店铺信息
async function updateStoreInfo(db, logOperation, data, wxContext) {
  try {
    const { id, ...updateData } = data || {};
    await db.collection('stores').doc(id).update({ data: { ...updateData, updateTime: db.serverDate() } });
    return { code: 0, msg: '店铺信息已更新' };
  } catch (error) {
    return { code: 500, msg: error.message };
  }
}

// 获取钱包交易记录
async function getWalletTransactions(db, data) {
  try {
    const { page = 1, limit = 20, userId } = data || {};
    const skip = (page - 1) * limit;
    let query = userId ? { _openid: userId } : {};
    const result = await db.collection('wallet_transactions').where(query).orderBy('createTime', 'desc').skip(skip).limit(limit).get();
    return { code: 0, data: result.data };
  } catch (error) {
    return { code: 500, msg: error.message };
  }
}

// 获取佣金钱包列表
async function getCommissionWallets(db, data) {
  try {
    const { page = 1, limit = 20 } = data || {};
    const skip = (page - 1) * limit;
    const result = await db.collection('commission_wallets').skip(skip).limit(limit).get();
    return { code: 0, data: result.data };
  } catch (error) {
    return { code: 500, msg: error.message };
  }
}

// 获取系统配置
async function getSystemConfig(db) {
  try {
    const result = await db.collection('system_config')
      .where({ type: 'commission_config' })
      .limit(1)
      .get();

    if (result.data.length === 0) {
      return { code: 0, data: {} };
    }

    const config = result.data[0];
    // 扁平返回（去除 config 嵌套），同时转换分→元用于管理端显示
    const displayData = {
      _id: config._id,
      type: config.type,
      level1Commission: config.level1Commission ?? 20,
      level2Commission: config.level2Commission ?? 12,
      level3Commission: config.level3Commission ?? 8,
      level4Commission: config.level4Commission ?? 4,
      // 金额字段：分→元（除以100）
      bronzeTotalSales: (config.bronzeTotalSales ?? 2000000) / 100,
      silverMonthSales: (config.silverMonthSales ?? 5000000) / 100,
      silverTeamCount: config.silverTeamCount ?? 50,
      goldMonthSales: (config.goldMonthSales ?? 10000000) / 100,
      goldTeamCount: config.goldTeamCount ?? 200,
      minWithdrawAmount: (config.minWithdrawAmount ?? 10000) / 100,
      withdrawFeeRate: config.withdrawFeeRate ?? 0,
      rechargeOptions: config.rechargeOptions ?? [],
      updateTime: config.updateTime
    };

    return { code: 0, data: displayData };
  } catch (error) {
    return { code: 500, msg: error.message };
  }
}

// 更新系统配置
async function updateSystemConfig(db, data) {
  try {
    const { id, ...updateData } = data || {};

    // 金额字段列表（需要元→分转换）
    const amountFields = [
      'bronzeTotalSales', 'silverMonthSales', 'goldMonthSales', 'minWithdrawAmount'
    ];
    // 整数字段列表
    const intFields = ['silverTeamCount', 'goldTeamCount'];
    // 百分比字段列表
    const percentFields = [
      'level1Commission', 'level2Commission', 'level3Commission', 'level4Commission', 'withdrawFeeRate'
    ];

    // 构建扁平配置数据（元→分转换）
    const configData = {
      type: 'commission_config'
    };

    // 处理百分比字段
    for (const field of percentFields) {
      if (updateData[field] !== undefined) {
        const value = parseFloat(updateData[field]);
        if (isNaN(value)) {
          return { code: 400, msg: `${field} 必须是数字` };
        }
        configData[field] = value;
      }
    }

    // 处理金额字段（元→分）
    for (const field of amountFields) {
      if (updateData[field] !== undefined) {
        const value = parseFloat(updateData[field]);
        if (isNaN(value)) {
          return { code: 400, msg: `${field} 必须是数字` };
        }
        configData[field] = Math.round(value * 100); // 元转分
      }
    }

    // 处理整数字段
    for (const field of intFields) {
      if (updateData[field] !== undefined) {
        const value = parseInt(updateData[field], 10);
        if (isNaN(value)) {
          return { code: 400, msg: `${field} 必须是整数` };
        }
        configData[field] = value;
      }
    }

    // 处理充值选项
    if (updateData.rechargeOptions !== undefined) {
      configData.rechargeOptions = updateData.rechargeOptions;
    }

    configData.updateTime = db.serverDate();

    // 如果没有id，先查询是否存在配置
    if (!id) {
      const existingResult = await db.collection('system_config')
        .where({ type: 'commission_config' })
        .limit(1)
        .get();

      if (existingResult.data.length > 0) {
        // 更新现有配置（扁平存储，不嵌套在 config 字段）
        await db.collection('system_config')
          .doc(existingResult.data[0]._id)
          .update({ data: configData });
        return { code: 0, msg: '配置已更新' };
      } else {
        // 创建新配置
        await db.collection('system_config').add({
          data: {
            ...configData,
            createTime: db.serverDate()
          }
        });
        return { code: 0, msg: '配置已创建' };
      }
    } else {
      // 有id直接更新
      await db.collection('system_config').doc(id).update({ data: configData });
      return { code: 0, msg: '配置已更新' };
    }
  } catch (error) {
    return { code: 500, msg: error.message };
  }
}

// 供应商管理
async function getSuppliers(db, data) {
  try {
    const result = await db.collection('suppliers').get();
    return { code: 0, data: result.data };
  } catch (error) {
    return { code: 500, msg: error.message };
  }
}

async function getSupplierDetail(db, data) {
  try {
    const { id } = data || {};
    const result = await db.collection('suppliers').doc(id).get();
    return { code: 0, data: result.data };
  } catch (error) {
    return { code: 500, msg: error.message };
  }
}

async function createSupplier(db, logOperation, data, wxContext) {
  try {
    const result = await db.collection('suppliers').add({ data: { ...data, createTime: db.serverDate() } });
    return { code: 0, data: { id: result.id }, msg: '供应商创建成功' };
  } catch (error) {
    return { code: 500, msg: error.message };
  }
}

async function updateSupplier(db, logOperation, data, wxContext) {
  try {
    const { id, ...updateData } = data || {};
    await db.collection('suppliers').doc(id).update({ data: { ...updateData, updateTime: db.serverDate() } });
    return { code: 0, msg: '供应商更新成功' };
  } catch (error) {
    return { code: 500, msg: error.message };
  }
}

async function deleteSupplier(db, logOperation, data, wxContext) {
  try {
    const { id } = data || {};
    await db.collection('suppliers').doc(id).remove();
    return { code: 0, msg: '供应商删除成功' };
  } catch (error) {
    return { code: 500, msg: error.message };
  }
}

module.exports = {
  getAddresses, deleteAddress, getStoreInfo, updateStoreInfo,
  getWalletTransactions, getCommissionWallets, getSystemConfig, updateSystemConfig,
  getSuppliers, getSupplierDetail, createSupplier, updateSupplier, deleteSupplier
};
