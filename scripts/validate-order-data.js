/**
 * 订单数据验证脚本 - 云开发控制台版本
 *
 * 使用方法：
 * 1. 登录腾讯云开发控制台
 * 2. 进入云开发环境: cloud1-6gmp2q0y3171c353
 * 3. 点击"云函数" -> 选择任意云函数
 * 4. 点击"云端测试"
 * 5. 将此脚本粘贴到编辑器
 * 6. 点击"运行"或"调试"
 * 7. 查看控制台输出
 */

const

async function validateOrderData() {
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║   订单系统数据验证脚本                        ║');
  console.log('║   环境: cloud1-6gmp2q0y3171c353                ║');
  console.log('║   日期: ' + new Date().toLocaleDateString() + '               ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log('');

  try {
    // ===== 第一步：查询订单数据 =====
    console.log('📊 第一步：查询订单数据');
    console.log('─────────────────────────────────────────────');

    const orderRes = await db.collection('orders').limit(1).get();

    if (orderRes.data.length === 0) {
      console.log('⚠️  订单集合为空');
      console.log('');
      console.log('请先创建一个测试订单，然后重新运行此验证脚本。');
      console.log('');
      console.log('创建测试订单的方法：');
      console.log('1. 打开小程序');
      console.log('2. 选择商品并下单');
      console.log('3. 完成订单创建');
      console.log('4. 重新运行此验证脚本');
      return { success: false, message: '订单集合为空' };
    }

    const order = orderRes.data[0];
    console.log('✅ 查询到订单数据');
    console.log('   订单ID:', order._id);
    console.log('   订单号:', order.orderNo);
    console.log('   订单状态:', order.status);
    console.log(''); cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

    // ===== 第二步：验证订单字段 =====
    console.log('🔍 第二步：验证订单字段结构');
    console.log('─────────────────────────────────────────────');

    const fieldIssues = [];
    const fieldWarnings = [];

    // 验证 items/products 字段
    console.log('【商品字段验证】');
    if (order.items) {
      console.log('✅ items 字段存在');
      console.log('   类型: ' + (Array.isArray(order.items) ? 'Array' : typeof order.items));
      console.log('   长度: ' + order.items.length);
    } else {
      console.log('❌ items 字段不存在（严重问题）');
      fieldIssues.push('items 字段不存在');
    }

    if (order.products) {
      console.log('⚠️  products 字段存在（应该移除）');
      console.log('   类型: ' + (Array.isArray(order.products) ? 'Array' : typeof order.products));
      console.log('   说明: 数据库已使用 items 字段，products 字段应该删除');
      fieldWarnings.push('products 字段仍然存在');
    } else {
      console.log('✅ products 字段不存在（正确）');
    }
    console.log('');

    // 验证商品项字段
    if (order.items && order.items.length > 0) {
      const item = order.items[0];
      console.log('【第一个商品的字段】');
      console.log('   商品ID:', item.productId);
      console.log('');

      console.log('【标准字段验证】');
      if (item.name) {
        console.log('✅ name 字段存在');
        console.log('   值: "' + item.name + '"');
      } else {
        console.log('❌ name 字段不存在（严重问题）');
        fieldIssues.push('商品缺少 name 字段');
      }

      if (item.image) {
        console.log('✅ image 字段存在');
        console.log('   值: "' + item.image + '"');
      } else {
        console.log('❌ image 字段不存在（严重问题）');
        fieldIssues.push('商品缺少 image 字段');
      }

      console.log('   价格: ' + item.price);
      console.log('   数量: ' + item.quantity);
      console.log('   规格: ' + (item.specs || '无'));
      console.log('');

      console.log('【别名字段验证】');
      if (item.productName) {
        console.log('⚠️  productName 字段存在（多余）');
        console.log('   值: "' + item.productName + '"');
        console.log('   建议: 使用标准字段 name，移除此别名');
        fieldWarnings.push('存在 productName 别名字段');
      } else {
        console.log('✅ productName 字段不存在（正确）');
      }

      if (item.productImage) {
        console.log('⚠️  productImage 字段存在（多余）');
        console.log('   值: "' + item.productImage + '"');
        console.log('   建议: 使用标准字段 image，移除此别名');
        fieldWarnings.push('存在 productImage 别名字段');
      } else {
        console.log('✅ productImage 字段不存在（正确）');
      }
    } else {
      console.log('⚠️  订单中没有商品数据');
    }
    console.log('');

    // 验证快递字段
    console.log('【快递字段验证】');
    if (order.expressCompany || order.expressNo) {
      console.log('⚠️  快递字段仍然存在');
      if (order.expressCompany) {
        console.log('   快递公司: "' + order.expressCompany + '"');
        fieldWarnings.push('expressCompany 字段存在');
      }
      if (order.expressNo) {
        console.log('   快递单号: "' + order.expressNo + '"');
        fieldWarnings.push('expressNo 字段存在');
      }
      console.log('   建议: 管理员端已移除快递功能，这些字段应该删除');
    } else {
      console.log('✅ 快递字段已移除（正确）');
    }
    console.log('');

    // ===== 第三步：验证退款数据 =====
    console.log('🔍 第三步：验证退款数据（如果存在）');
    console.log('─────────────────────────────────────────────');

    try {
      const refundRes = await db.collection('refunds').limit(1).get();

      if (refundRes.data.length > 0) {
        const refund = refundRes.data[0];
        console.log('✅ 查询到退款数据');
        console.log('   退款ID:', refund._id);
        console.log('');

        console.log('【退款商品字段】');
        if (refund.items) {
          console.log('✅ 使用 items 字段（正确）');
        } else if (refund.products) {
          console.log('⚠️  使用 products 字段（建议改为 items）');
          fieldWarnings.push('退款使用 products 字段，建议改为 items');
        } else {
          console.log('⚠️  退款没有商品字段');
        }
      } else {
        console.log('ℹ️  退款集合为空，跳过验证');
      }
    } catch (error) {
      console.log('ℹ️  无法访问退款集合');
    }
    console.log('');

    // ===== 第四步：总结报告 =====
    console.log('╔══════════════════════════════════════════════╗');
    console.log('║   验证总结报告                                 ║');
    console.log('╚══════════════════════════════════════════════╝');
    console.log('');

    console.log('【严重问题】（必须修复）');
    if (fieldIssues.length === 0) {
      console.log('✅ 未发现严重问题');
    } else {
      console.log('❌ 发现 ' + fieldIssues.length + ' 个严重问题：');
      fieldIssues.forEach((issue, index) => {
        console.log('   ' + (index + 1) + '. ' + issue);
      });
    }
    console.log('');

    console.log('【警告问题】（建议修复）');
    if (fieldWarnings.length === 0) {
      console.log('✅ 未发现警告问题');
    } else {
      console.log('⚠️  发现 ' + fieldWarnings.length + ' 个警告问题：');
      fieldWarnings.forEach((warning, index) => {
        console.log('   ' + (index + 1) + '. ' + warning);
      });
    }
    console.log('');

    // 总体评估
    const totalIssues = fieldIssues.length + fieldWarnings.length;
    if (totalIssues === 0) {
      console.log('═══════════════════════════════════════════════');
      console.log('🎉 恭喜！所有验证通过，数据结构完全正确！');
      console.log('═══════════════════════════════════════════════');
      return {
        success: true,
        issues: fieldIssues,
        warnings: fieldWarnings,
        message: '所有验证通过'
      };
    } else if (fieldIssues.length > 0) {
      console.log('═══════════════════════════════════════════════');
      console.log('⚠️  发现严重问题，需要立即修复！');
      console.log('═══════════════════════════════════════════════');
      return {
        success: false,
        issues: fieldIssues,
        warnings: fieldWarnings,
        message: '发现严重问题'
      };
    } else {
      console.log('═══════════════════════════════════════════════');
      console.log('✓ 验证通过，但有一些可以优化的地方');
      console.log('═══════════════════════════════════════════════');
      return {
        success: true,
        issues: fieldIssues,
        warnings: fieldWarnings,
        message: '验证通过，有优化建议'
      };
    }

  } catch (error) {
    console.error('═══════════════════════════════════════════════');
    console.error('❌ 验证失败');
    console.error('═══════════════════════════════════════════════');
    console.error('错误信息:', error.message);
    console.error('');
    console.error('可能的原因：');
    console.error('1. 数据库连接失败');
    console.error('2. 订单集合不存在');
    console.error('3. 权限不足');
    console.error('');
    console.error('建议检查：');
    console.error('1. 确认云开发环境ID正确');
    console.error('2. 确认有数据库访问权限');
    console.error('3. 确认订单集合存在');

    return {
      success: false,
      error: error.message,
      message: '验证失败'
    };
  }
}

// 执行验证
validateOrderData();
