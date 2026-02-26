// Database migration cloud function
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  const { action } = event;

  if (action === 'createActivityTables') {
    try {
      console.log('[迁移] 开始创建活动管理表');

      const results = {};

      // 1. Create promotions collection
      try {
        await db.collection('promotions').add({
          data: {
            name: '__init__',
            type: 'discount',
            status: 'draft',
            startTime: new Date(),
            endTime: new Date(),
            description: '初始化标记',
            createTime: new Date()
          }
        });
        // Remove the init record
        const initResult = await db.collection('promotions')
          .where({ name: '__init__' })
          .get();
        if (initResult.data.length > 0) {
          await db.collection('promotions').doc(initResult.data[0]._id).remove();
        }
        results.promotions = 'created';
      } catch (e) {
        results.promotions = 'exists';
      }

      // 2. Create promotion_products collection
      try {
        await db.collection('promotion_products').add({
          data: {
            promotionId: '__init__',
            productId: '__init__',
            discountPrice: 0,
            stockLimit: 0,
            soldCount: 0,
            createTime: new Date()
          }
        });
        const initResult = await db.collection('promotion_products')
          .where({ promotionId: '__init__' })
          .get();
        if (initResult.data.length > 0) {
          await db.collection('promotion_products').doc(initResult.data[0]._id).remove();
        }
        results.promotion_products = 'created';
      } catch (e) {
        results.promotion_products = 'exists';
      }

      // 3. Create promotion_stats collection
      try {
        await db.collection('promotion_stats').add({
          data: {
            promotionId: '__init__',
            date: new Date(),
            views: 0,
            orders: 0,
            sales: 0,
            createTime: new Date()
          }
        });
        const initResult = await db.collection('promotion_stats')
          .where({ promotionId: '__init__' })
          .get();
        if (initResult.data.length > 0) {
          await db.collection('promotion_stats').doc(initResult.data[0]._id).remove();
        }
        results.promotion_stats = 'created';
      } catch (e) {
        results.promotion_stats = 'exists';
      }

      console.log('[迁移] 活动管理表创建完成:', results);

      return {
        code: 0,
        msg: '活动管理表创建成功',
        data: results
      };

    } catch (error) {
      console.error('[迁移] 失败:', error);
      return {
        code: -1,
        msg: error.message
      };
    }
  }

  if (action === 'addRewardFields') {
    try {
      console.log('[迁移] 开始为订单添加奖励结算字段');

      let hasMore = true;
      let skip = 0;
      const LIMIT = 100;
      let totalProcessed = 0;

      while (hasMore) {
        const res = await db.collection('orders')
          .field({ _id: true })
          .limit(LIMIT)
          .skip(skip)
          .get();

        if (res.data.length === 0) {
          hasMore = false;
          break;
        }

        // 批量更新
        const updates = res.data.map(order => {
          return db.collection('orders').doc(order._id).update({
            data: {
              rewardSettled: false
            }
          });
        });

        await Promise.all(updates);
        totalProcessed += res.data.length;
        skip += LIMIT;

        console.log(`[迁移] 已处理 ${totalProcessed} 条记录`);
      }

      console.log(`[迁移] 完成，共处理 ${totalProcessed} 条记录`);

      return {
        code: 0,
        msg: `成功更新 ${totalProcessed} 条订单记录`,
        data: { totalProcessed }
      };

    } catch (error) {
      console.error('[迁移] 失败:', error);
      return {
        code: -1,
        msg: error.message
      };
    }
  }

  return {
    code: -1,
    msg: '未知操作'
  };

  // 创建数据库索引（输出索引配置，需要在控制台手动创建或使用 CLI）
  if (action === 'createIndexesV3') {
    try {
      console.log('[迁移] 生成数据库索引配置');

      const indexes = [
        // orders 集合索引
        {
          collection: 'orders',
          indexes: [
            {
              name: 'idx_openid_status_createtime',
              fields: [
                { name: '_openid', order: 'asc' },
                { name: 'paymentStatus', order: 'asc' },
                { name: 'createTime', order: 'desc' }
              ],
              comment: '用户订单查询索引（支持按状态筛选和时间倒序）'
            },
            {
              name: 'idx_orderNo',
              fields: [
                { name: 'orderNo', order: 'asc' }
              ],
              unique: true,
              comment: '订单号唯一索引'
            }
          ]
        },

        // users 集合索引
        {
          collection: 'users',
          indexes: [
            {
              name: 'idx_openid',
              fields: [
                { name: '_openid', order: 'asc' }
              ],
              unique: true,
              comment: '用户ID唯一索引'
            },
            {
              name: 'idx_promotionPath',
              fields: [
                { name: 'promotionPath', order: 'asc' }
              ],
              comment: '推广路径索引（用于团队查询）'
            }
          ]
        },

        // user_wallets 集合索引
        {
          collection: 'user_wallets',
          indexes: [
            {
              name: 'idx_openid',
              fields: [
                { name: '_openid', order: 'asc' }
              ],
              unique: true,
              comment: '钱包用户ID唯一索引'
            }
          ]
        },

        // reward_records 集合索引
        {
          collection: 'reward_records',
          indexes: [
            {
              name: 'idx_beneficiaryId_createtime',
              fields: [
                { name: 'beneficiaryId', order: 'asc' },
                { name: 'createTime', order: 'desc' }
              ],
              comment: '奖励记录查询索引（按受益人和时间倒序）'
            },
            {
              name: 'idx_orderId',
              fields: [
                { name: 'orderId', order: 'asc' }
              ],
              comment: '订单奖励查询索引（用于退款扣回）'
            },
            {
              name: 'idx_sourceUserId',
              fields: [
                { name: 'sourceUserId', order: 'asc' }
              ],
              comment: '来源用户查询索引（用于复购判断）'
            }
          ]
        },

        // promotion_orders 集合索引
        {
          collection: 'promotion_orders',
          indexes: [
            {
              name: 'idx_buyerId',
              fields: [
                { name: 'buyerId', order: 'asc' },
                { name: 'createTime', order: 'desc' }
              ],
              comment: '推广订单买家查询索引'
            },
            {
              name: 'idx_promoterId',
              fields: [
                { name: 'promoterId', order: 'asc' },
                { name: 'createTime', order: 'desc' }
              ],
              comment: '推广订单推广人查询索引'
            }
          ]
        },

        // recharge_orders 集合索引
        {
          collection: 'recharge_orders',
          indexes: [
            {
              name: 'idx_openid_status_amount',
              fields: [
                { name: '_openid', order: 'asc' },
                { name: 'status', order: 'asc' },
                { name: 'amount', order: 'asc' }
              ],
              comment: '充值订单查询索引（用于幂等性检查）'
            },
            {
              name: 'idx_orderNo',
              fields: [
                { name: 'orderNo', order: 'asc' }
              ],
              unique: true,
              comment: '充值订单号唯一索引'
            }
          ]
        },

        // wallet_transactions 集合索引
        {
          collection: 'wallet_transactions',
          indexes: [
            {
              name: 'idx_openid_createtime',
              fields: [
                { name: '_openid', order: 'asc' },
                { name: 'createTime', order: 'desc' }
              ],
              comment: '钱包交易记录查询索引'
            }
          ]
        },

        // refunds 集合索引
        {
          collection: 'refunds',
          indexes: [
            {
              name: 'idx_orderId',
              fields: [
                { name: 'orderId', order: 'asc' }
              ],
              comment: '订单退款查询索引'
            },
            {
              name: 'idx_refundNo',
              fields: [
                { name: 'refundNo', order: 'asc' }
              ],
              unique: true,
              comment: '退款单号唯一索引'
            }
          ]
        }
      ];

      // 生成 CloudBase CLI 配置文件格式
      const cliConfig = indexes.map(idxGroup => {
        return idxGroup.indexes.map(idx => {
          const MergedFields = idx.fields.map(f => `${f.name}:${f.order}`).join(',');
          return {
            collection: idxGroup.collection,
            indexName: idx.name,
            unique: !!idx.unique,
            MergedFields: MergedFields,
            comment: idx.comment || ''
          };
        });
      }).flat();

      console.log('[迁移] 索引配置生成完成');
      console.log(JSON.stringify(cliConfig, null, 2));

      return {
        code: 0,
        msg: '索引配置生成成功，请使用以下配置在控制台创建索引或使用 CloudBase CLI',
        data: {
          totalCount: cliConfig.length,
          indexes: cliConfig,
          cliCommand: '# 使用 CloudBase CLI 创建索引:\n# cloudbase functions:deployment database create-index --collection <集合名> --index-name <索引名> --fields <字段定义>'
        }
      };

    } catch (error) {
      console.error('[迁移] 生成索引配置失败:', error);
      return {
        code: -1,
        msg: error.message
      };
    }
  }
};
