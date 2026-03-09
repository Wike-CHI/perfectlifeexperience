// 测试脚本 - 调用fixProductFields云函数测试数据修复
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

async function testFix() {
  try {
    const result = await cloud.callFunction({
      name: 'fixProductFields',
      data: {}
    });
    console.log('修复结果:', result);
    return result.result;
  } catch (error) {
    console.error('测试失败:', error);
    return { error: error.message };
  }
}

testFix().then(console.log);
