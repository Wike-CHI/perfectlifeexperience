# 数据库迁移指南 - 充卡客户余额支付与延迟结算

## 迁移概述

本次迁移为 `orders` 集合添加 `rewardSettled` 和 `rewardSettleTime` 字段，用于追踪推广奖励结算状态。

## 迁移步骤

### 1. 备份数据（可选但推荐）

在执行迁移前，建议先备份现有数据：

1. 进入腾讯云开发控制台
2. 选择数据库
3. 选择 `orders` 集合
4. 点击"导出"按钮
5. 选择导出格式（JSON 或 CSV）
6. 下载备份文件

### 2. 添加新字段

#### 方法一：通过云开发控制台（推荐）

1. 打开腾讯云开发控制台
2. 进入数据库 → `orders` 集合
3. 点击任意一条记录查看详情
4. 在记录详情页面，点击"添加字段"按钮
5. 添加以下字段：

**字段 1: rewardSettled**
```
字段名: rewardSettled
类型: Boolean
默认值: false
描述: 推广奖励是否已结算
```

**字段 2: rewardSettleTime**
```
字段名: rewardSettleTime
类型: Date
默认值: (留空)
描述: 推广奖励结算时间
```

#### 方法二：通过云函数批量更新

如果您的订单量较大，可以使用云函数批量更新：

```javascript
// 在云开发控制台的云函数 → 云开发 → 打开"云函数"标签
// 创建临时迁移云函数或在现有云函数中添加

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const MAX_LIMIT = 100; // 每次处理100条

  try {
    // 获取所有订单（分批处理）
    let hasMore = true;
    let processedCount = 0;

    while (hasMore) {
      const res = await db.collection('orders')
        .field({ _id: true, status: true, paymentMethod: true })
        .limit(MAX_LIMIT)
        .skip(processedCount)
        .get();

      if (res.data.length === 0) {
        hasMore = false;
        break;
      }

      // 批量更新
      const updatePromises = res.data.map(order => {
        return db.collection('orders').doc(order._id).update({
          data: {
            rewardSettled: false,
            // rewardSettleTime 不设置，保持为空
          }
        });
      });

      await Promise.all(updatePromises);

      processedCount += res.data.length;
      console.log(`已处理 ${processedCount} 条记录`);
    }

    return {
      success: true,
      message: `成功更新 ${processedCount} 条订单记录`
    };

  } catch (error) {
    console.error('迁移失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
};
```

### 3. 验证迁移结果

执行迁移后，验证数据是否正确：

1. 在云开发控制台查询几条订单记录
2. 确认新增字段已存在：
   - `rewardSettled`: false 或 true
   - `rewardSettleTime`: Date 对象或 null
3. 检查字段值的合理性

#### 验证查询示例（在控制台运行）：

```javascript
// 查询已完成的订单
db.collection('orders')
  .where({
    status: 'completed'
  })
  .field({
    _id: true,
    orderNo: true,
    status: true,
    paymentMethod: true,
    rewardSettled: true,
    rewardSettleTime: true
  })
  .get()
  .then(res => {
    console.log('查询结果:', res.data);
    console.log('总数:', res.data.length);
    // 统计已结算和未结算的订单数
    const settled = res.data.filter(o => o.rewardSettled).length;
    const unsettled = res.data.length - settled;
    console.log('已结算:', settled, '未结算:', unsettled);
  });
```

### 4. 设置索引（可选，提升查询性能）

为提升查询性能，建议添加以下索引：

```javascript
// 复合索引：订单状态 + 奖励结算状态
db.collection('orders').createIndex({
  keys: {
    status: 1,
    rewardSettled: 1
  },
  name: 'idx_status_rewardSettled'
});

// 复合索引：支付方式 + 奖励结算状态
db.collection('orders').createIndex({
  keys: {
    paymentMethod: 1,
    rewardSettled: 1
  },
  name: 'idx_paymentMethod_rewardSettled'
});
```

## 回滚方案

如果迁移后发现问题，可以按以下步骤回滚：

1. **删除新增字段**：
   ```javascript
   // 注意：这会删除所有字段数据，不可恢复
   db.collection('orders').update({
     data: {
       rewardSettled: _.remove(),
       rewardSettleTime: _.remove()
     }
   });
   ```

2. **从备份恢复数据**：
   - 如果之前导出了备份，可以通过"导入"功能恢复
   - 在云开发控制台选择 `orders` 集合
   - 点击"导入"按钮
   - 选择之前导出的文件

## 注意事项

1. **数据一致性**：
   - 迁移过程中不要进行订单操作
   - 建议在业务低峰期执行
   - 执行前务必备份数据

2. **字段默认值**：
   - `rewardSettled` 默认为 `false`，表示未结算
   - `rewardSettleTime` 默认为 `null`，未结算时不设置

3. **现有订单处理**：
   - 已完成且已结算奖励的订单：需要手动更新 `rewardSettled: true` 和 `rewardSettleTime`
   - 未完成的订单：保持 `rewardSettled: false` 即可
   - 已取消的订单：无需结算奖励，保持 `rewardSettled: false`

4. **性能影响**：
   - 添加字段本身不会影响性能
   - 建议添加索引以优化查询
   - 如果订单量超过10万条，建议分批次执行迁移

## 验证清单

- [ ] 数据已备份
- [ ] `rewardSettled` 字段已添加
- [ ] `rewardSettleTime` 字段已添加
- [ ] 现有订单数据已验证
- [ ] 索引已创建（可选）
- [ ] 新订单测试正常
- [ ] 推广奖励结算功能测试正常

## 后续监控

迁移完成后，建议监控以下指标：

1. **订单支付成功率**：确保余额支付功能正常
2. **推广奖励结算率**：确保完成订单的奖励正确结算
3. **错误日志**：检查云函数日志中是否有错误
4. **用户反馈**：关注用户关于支付和奖励的问题

---

**迁移文档版本**: v1.0
**最后更新**: 2026-02-13
**维护者**: Claude Code
