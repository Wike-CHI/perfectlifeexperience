// 检查最近添加的商品价格数据
const cloud = require('wx-server-sdk');
cloud.init({ env: 'cloud1-6gmp2q0y3171c353' });
const db = cloud.database();

exports.main = async (event, context) => {
  try {
    // 获取最近添加的5个商品
    const result = await db.collection('products')
      .orderBy('createTime', 'desc')
      .limit(5)
      .field({
        name: true,
        price: true,
        priceList: true,
        createTime: true
      })
      .get();

    console.log('最近添加的商品：');
    result.data.forEach((item, index) => {
      console.log(`${index + 1}. ${item.name}`);
      console.log(`   price字段: ${item.price}`);
      console.log(`   priceList: ${JSON.stringify(item.priceList)}`);
      console.log('');
    });

    return {
      code: 0,
      data: result.data
    };
  } catch (error) {
    console.error('查询失败:', error);
    return {
      code: -1,
      msg: error.message
    };
  }
};
