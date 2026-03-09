/**
 * 商品数据字段修复云函数
 * 用于修复数据库中的商品字段：
 * 1. prices → priceList
 * 2. 价格单位：元 → 分 (×100)
 * 3. 新增 price 主价格字段
 * 4. 新增缺失字段：alcoholContent, brewery, volume
 */

const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

// 商品补充信息映射表
const productExtras = {
  '飞云江小麦': { alcoholContent: 5, brewery: '大友元气精酿', volume: 500 },
  '玉海楼·皮尔森': { alcoholContent: 5, brewery: '大友元气精酿', volume: 500 },
  '晒黑浑浊IPA': { alcoholContent: 8.2, brewery: '大友元气精酿', volume: 500 },
  '仙浆': { alcoholContent: 8, brewery: '大友元气精酿', volume: 500 },
  '百香果啤': { alcoholContent: 4, brewery: '大友元气精酿', volume: 500 },
  '番石榴啤': { alcoholContent: 4, brewery: '大友元气精酿', volume: 500 },
  '奶油芭乐啤': { alcoholContent: 4, brewery: '大友元气精酿', volume: 500 },
  '苹果啤': { alcoholContent: 4, brewery: '大友元气精酿', volume: 500 },
  '草莓啤': { alcoholContent: 4, brewery: '大友元气精酿', volume: 500 },
  '葡萄啤': { alcoholContent: 4, brewery: '大友元气精酿', volume: 500 },
  '柠檬红茶': { alcoholContent: 4, brewery: '大友元气精酿', volume: 500 },
  '红茶啤': { alcoholContent: 4, brewery: '大友元气精酿', volume: 500 },
  '乌龙茶啤': { alcoholContent: 4, brewery: '大友元气精酿', volume: 500 },
  '芒果啤': { alcoholContent: 4, brewery: '大友元气精酿', volume: 500 },
  '一桶姜山': { alcoholContent: 4, brewery: '大友元气精酿', volume: 500 },
  '菠萝啤': { alcoholContent: 4, brewery: '大友元气精酿', volume: 500 }
};

/**
 * 预览需要修复的商品数据
 */
async function previewProducts() {
  console.log('===== 开始预览商品数据 =====');

  const result = await db.collection('products').limit(100).get();

  const productsToFix = result.data.filter(product => {
    // 检查是否需要修复（缺少必要字段）
    return product.prices || !product.alcoholContent || !product.brewery || !product.volume;
  });

  const preview = productsToFix.map(product => {
    const extras = productExtras[product.name] || {};
    const newPriceList = product.prices ? product.prices.map(p => ({
      volume: p.volume,
      price: p.price * 100  // 元 → 分
    })) : product.priceList;

    return {
      _id: product._id,
      name: product.name,
      oldFields: {
        prices: product.prices,
        price: product.price || '缺失',
        alcoholContent: product.alcoholContent || '缺失',
        brewery: product.brewery || '缺失',
        volume: product.volume || '缺失'
      },
      newFields: {
        priceList: newPriceList,
        price: product.price || (newPriceList && newPriceList[0] ? newPriceList[0].price : 'N/A'),
        alcoholContent: extras.alcoholContent || 'N/A',
        brewery: extras.brewery || 'N/A',
        volume: extras.volume || 'N/A'
      }
    };
  });

  return {
    success: true,
    message: '预览完成',
    data: {
      total: result.data.length,
      needFix: productsToFix.length,
      alreadyFixed: result.data.length - productsToFix.length,
      preview: preview.slice(0, 5),  // 只显示前5个
      allProducts: productsToFix.map(p => p.name)
    }
  };
}

/**
 * 执行修复
 */
async function fixProducts() {
  console.log('===== 开始修复商品数据 =====');

  const result = await db.collection('products').limit(100).get();

  const productsToFix = result.data.filter(product => {
    return product.prices || !product.alcoholContent || !product.brewery || !product.volume;
  });

  const fixResults = {
    success: 0,
    failed: 0,
    errors: []
  };

  for (const product of productsToFix) {
    try {
      // 获取补充信息
      const extras = productExtras[product.name] || {};

      // 构建更新数据
      const updateData = {};

      // 1. 修复价格字段（如果需要）
      if (product.prices && !product.priceList) {
        const priceList = product.prices.map(p => ({
          volume: p.volume,
          price: p.price * 100  // 元 → 分
        }));
        updateData.priceList = priceList;
        updateData.price = priceList[0].price;  // 主价格
        updateData.prices = _.remove();  // 删除旧字段
      }

      // 2. 添加缺失字段
      if (!product.alcoholContent && extras.alcoholContent) {
        updateData.alcoholContent = extras.alcoholContent;
      }
      if (!product.brewery && extras.brewery) {
        updateData.brewery = extras.brewery;
      }
      if (!product.volume && extras.volume) {
        updateData.volume = extras.volume;
      }

      // 更新数据库
      if (Object.keys(updateData).length > 0) {
        await db.collection('products').doc(product._id).update({
          data: updateData
        });

        console.log(`✓ 修复成功: ${product.name}`, updateData);
        fixResults.success++;
      } else {
        console.log(`○ 无需修复: ${product.name}`);
        fixResults.success++;
      }

    } catch (error) {
      console.error(`✗ 修复失败: ${product.name}`, error);
      fixResults.failed++;
      fixResults.errors.push({
        name: product.name,
        _id: product._id,
        error: error.message
      });
    }
  }

  return {
    success: true,
    message: '修复完成',
    data: {
      total: productsToFix.length,
      results: fixResults
    }
  };
}

/**
 * 验证修复结果
 */
async function verifyProducts() {
  console.log('===== 开始验证修复结果 =====');

  const result = await db.collection('products').limit(100).get();

  const issues = [];

  result.data.forEach(product => {
    // 检查必需字段
    if (!product.price) {
      issues.push({
        _id: product._id,
        name: product.name,
        issue: '缺少 price 字段'
      });
    }

    if (!product.priceList || !Array.isArray(product.priceList)) {
      issues.push({
        _id: product._id,
        name: product.name,
        issue: '缺少或 priceList 字段格式错误'
      });
    } else {
      // 检查价格单位（分应该是 >= 100 的数字）
      product.priceList.forEach(item => {
        if (item.price < 100) {
          issues.push({
            _id: product._id,
            name: product.name,
            issue: `价格单位可能错误: ${item.volume} = ${item.price} (应该是分)`
          });
        }
      });
    }

    // 检查是否还有旧字段
    if (product.prices) {
      issues.push({
        _id: product._id,
        name: product.name,
        issue: '仍然存在旧字段 prices'
      });
    }

    // 检查新增字段
    if (!product.alcoholContent) {
      issues.push({
        _id: product._id,
        name: product.name,
        issue: '缺少 alcoholContent 字段'
      });
    }

    if (!product.brewery) {
      issues.push({
        _id: product._id,
        name: product.name,
        issue: '缺少 brewery 字段'
      });
    }

    if (!product.volume) {
      issues.push({
        _id: product._id,
        name: product.name,
        issue: '缺少 volume 字段'
      });
    }
  });

  return {
    success: true,
    message: issues.length === 0 ? '验证通过，所有商品数据正确' : '发现数据问题',
    data: {
      total: result.data.length,
      issues: issues,
      issueCount: issues.length
    }
  };
}

/**
 * 云函数入口
 */
exports.main = async (event, context) => {
  const { action } = event;

  try {
    switch (action) {
      case 'preview':
        return await previewProducts();

      case 'fix':
        return await fixProducts();

      case 'verify':
        return await verifyProducts();

      default:
        return {
          success: false,
          message: '未知操作',
          availableActions: ['preview', 'fix', 'verify']
        };
    }
  } catch (error) {
    console.error('云函数执行失败:', error);
    return {
      success: false,
      message: '执行失败',
      error: error.message,
      stack: error.stack
    };
  }
};
