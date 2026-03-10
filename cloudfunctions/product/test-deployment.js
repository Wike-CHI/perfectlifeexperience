/**
 * 验证 product 云函数部署后的字段完整性
 * 测试酒精度数等字段是否正确返回
 */

const cloud = require('wx-server-sdk');
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

async function testProductFields() {
  console.log('🧪 开始测试 product 云函数字段完整性...\n');

  try {
    // 调用 product 云函数的 getHomePageData action
    const result = await cloud.callFunction({
      name: 'product',
      data: {
        action: 'getHomePageData',
        data: {}
      }
    });

    console.log('📦 云函数返回结果:');
    console.log('result.errMsg:', result.errMsg);
    console.log('result.result.code:', result.result?.code);

    if (result.result && result.result.code === 0) {
      const data = result.result.data;
      console.log('\n✅ 云函数调用成功');

      // 检查 topSalesProducts 的字段
      if (data.topSalesProducts && data.topSalesProducts.length > 0) {
        const product = data.topSalesProducts[0];
        console.log('\n📋 热销商品字段检查:');
        console.log('====================================');

        // 检查每个字段
        const fields = [
          { name: '_id', value: product._id },
          { name: 'name', value: product.name },
          { name: 'enName', value: product.enName },
          { name: 'images', value: product.images },
          { name: 'price', value: product.price },
          { name: 'priceList', value: product.priceList },
          { name: 'volume', value: product.volume },
          { name: 'sales', value: product.sales },
          { name: 'alcoholContent', value: product.alcoholContent },
          { name: 'brewery', value: product.brewery },
          { name: 'originalPrice', value: product.originalPrice },
          { name: 'tags', value: product.tags },
          { name: 'category', value: product.category }
        ];

        let passCount = 0;
        let failCount = 0;

        fields.forEach(field => {
          const exists = field.value !== undefined;
          const status = exists ? '✅' : '❌';
          const display = exists ? JSON.stringify(field.value).substring(0, 50) : 'undefined';

          console.log(`${status} ${field.name.padEnd(20)}: ${display}`);

          if (exists) {
            passCount++;
          } else {
            failCount++;
          }
        });

        console.log('====================================');
        console.log(`\n📊 字段检查结果:`);
        console.log(`✅ 通过: ${passCount}/${fields.length}`);
        console.log(`❌ 失败: ${failCount}/${fields.length}`);
        console.log(`📈 完整率: ${((passCount / fields.length) * 100).toFixed(1)}%`);

        // 重点检查修复的字段
        const fixedFields = ['alcoholContent', 'brewery', 'enName', 'originalPrice', 'tags'];
        console.log('\n🔧 修复的字段验证:');
        fixedFields.forEach(fieldName => {
          const exists = product[fieldName] !== undefined;
          const status = exists ? '✅' : '❌';
          console.log(`${status} ${fieldName}: ${exists ? product[fieldName] : 'undefined'}`);
        });

        if (failCount === 0) {
          console.log('\n🎉 所有字段验证通过！修复成功！');
        } else {
          console.log('\n⚠️  部分字段缺失，请检查云函数部署');
        }
      } else {
        console.log('⚠️  未返回商品数据');
      }

      // 检查 newProducts
      if (data.newProducts && data.newProducts.length > 0) {
        console.log('\n📋 新品商品字段检查:');
        const newProduct = data.newProducts[0];
        console.log('====================================');

        const criticalFields = ['alcoholContent', 'brewery', 'enName'];
        criticalFields.forEach(fieldName => {
          const exists = newProduct[fieldName] !== undefined;
          const status = exists ? '✅' : '❌';
          console.log(`${status} ${fieldName}: ${exists ? newProduct[fieldName] : 'undefined'}`);
        });
      }

    } else {
      console.log('❌ 云函数调用失败');
      console.log('错误码:', result.result?.code);
      console.log('错误信息:', result.result?.msg);
    }

  } catch (error) {
    console.error('❌ 测试失败:', error);
  }
}

// 执行测试
testProductFields().then(() => {
  console.log('\n✅ 测试完成');
  process.exit(0);
}).catch(err => {
  console.error('\n❌ 测试异常:', err);
  process.exit(1);
});
