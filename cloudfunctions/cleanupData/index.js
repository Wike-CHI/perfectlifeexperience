/**
 * 清理旧的测试数据
 */
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  try {
    // 删除旧的测试商品（大友元气）
    const oldProductIds = [
      "877e759169ac44cf00911e076a1a8f63",
      "0b175e3169ac44cf008ffc2e629c8433",
      "e4bc589369ac44cf008f6f7652c0214a",
      "76b569cb69ac44cf008e92961142cef0",
      "877e759169ac44cf00911e0a4542c312",
      "3474fddf69ac44cf008d06c134b43eca",
      "e4bc589369ac44cf008f6f785bf1db96",
      "69f0bd6369ac44cf00901aad34993edc",
      "eda9bd8369ac44cf008f6582335fa633",
      "754426be69ac44cf008d15213505a79c",
      "fb39ee6269ac44cf008d73376fe410be",
      "7eeea64669ac44d0008c8f6d47a09437"
    ];

    // 删除旧的测试分类（IPA、世涛等）
    const oldCategoryIds = [
      "3474fddf69ac44cf008d06b759aa7d5e",
      "eda9bd8369ac44cf008f657b52c8970d",
      "e4bc589369ac44cf008f6f6f37e536bd",
      "0b175e3169ac44cf008ffc29414e5253",
      "ed435bfa69ac44cf008b99da129abca8",
      "877e759169ac44cf00911e027e0047de",
      "e4bc589369ac44cf008f6f73235bd1ab"
    ];

    let deletedProducts = 0;
    let deletedCategories = 0;

    // 删除旧商品
    for (const id of oldProductIds) {
      try {
        await db.collection('products').doc(id).remove();
        deletedProducts++;
      } catch (err) {
        console.log(`商品 ${id} 不存在或已删除`);
      }
    }

    // 删除旧分类
    for (const id of oldCategoryIds) {
      try {
        await db.collection('categories').doc(id).remove();
        deletedCategories++;
      } catch (err) {
        console.log(`分类 ${id} 不存在或已删除`);
      }
    }

    return {
      success: true,
      message: '清理完成',
      data: {
        deletedProducts,
        deletedCategories
      }
    };

  } catch (error) {
    console.error('清理失败:', error);
    return {
      success: false,
      message: '清理失败',
      error: error.message
    };
  }
};
