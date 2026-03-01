const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

exports.main = async (event, context) => {
  console.log('云函数被调用，参数:', event);

  const { name = 'World', timestamp } = event;
  const wxContext = cloud.getWXContext();

  try {
    return {
      success: true,
      message: `Hello ${name}!`,
      timestamp: timestamp || Date.now(),
      requestId: context.requestId || wxContext.requestId,
      data: {
        platform: 'WeChat Mini Program',
        version: '1.0.0',
        env: cloud.DYNAMIC_CURRENT_ENV,
        openid: wxContext.OPENID || null,
        appid: wxContext.APPID || null
      }
    };
  } catch (error) {
    console.error('云函数执行错误:', error);
    return {
      success: false,
      error: error.message
    };
  }
};
