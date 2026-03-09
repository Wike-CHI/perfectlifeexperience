/**
 * 商品补充字段云函数
 * 专门用于添加缺失的 alcoholContent, brewery, volume 字段
 */

const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

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
 * 添加缺失字段
 */
async function addMissingFields() {
  console.log('===== 开始添加缺失字段 =====');

  const result = await db.collection('products').limit(100).get();

  const updateResults = {
    success: 0,
    failed: 0,
    errors: [],
    skipped: 0
  };

  for (const product of result.data) {
    try {
      const extras = productExtras[product.name];

      if (!extras) {
        console.log(`⚠ 商品未在映射表中: ${product.name}`);
        updateResults.skipped++;
        continue;
      }

      // 检查是否已有这些字段
      if (product.alcoholContent && product.brewery && product.volume) {
        console.log(`○ 已有完整字段: ${product.name}`);
        updateResults.skipped++;
        continue;
      }

      // 添加缺失字段
      await db.collection('products').doc(product._id).update({
        data: {
          alcoholContent: extras.alcoholContent,
          brewery: extras.brewery,
          volume: extras.volume
        }
      });

      console.log(`✓ 更新成功: ${product.name}`, extras);
      updateResults.success++;

    } catch (error) {
      console.error(`✗ 更新失败: ${product.name}`, error);
      updateResults.failed++;
      updateResults.errors.push({
        name: product.name,
        _id: product._id,
        error: error.message
      });
    }
  }

  return {
    success: true,
    message: '更新完成',
    data: {
      total: result.data.length,
      results: updateResults
    }
  };
}

/**
 * 云函数入口
 */
exports.main = async (event, context) => {
  const { action } = event;

  try {
    if (action === 'addFields') {
      return await addMissingFields();
    } else {
      return {
        success: false,
        message: '未知操作',
        availableActions: ['addFields']
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
