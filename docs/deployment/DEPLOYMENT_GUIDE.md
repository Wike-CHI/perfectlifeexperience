# 部署与测试验证指南

## 一、云函数部署

### 方法一：通过微信开发者工具部署（推荐）

#### 1. 打开项目
```bash
# 在微信开发者工具中打开项目
# 项目目录选择: /Users/johnny/Desktop/小程序/perfectlifeexperience
# AppID 使用您的: wx4a0b93c3660d1404
```

#### 2. 部署 order 云函数
1. 在微信开发者工具中，点击左侧"云开发"按钮
2. 进入"云函数"标签页
3. 找到 `order` 云函数
4. 右键点击 → 选择"上传并部署：云端安装依赖"
5. 等待部署完成（约30-60秒）

#### 3. 验证部署
- 部署成功后，云函数列表中该函数的"部署状态"应为"正常"
- 可以点击"测试"按钮验证云函数可正常调用

### 方法二：通过腾讯云控制台部署

1. 访问腾讯云开发控制台：https://tcb.cloud.tencent.com/dev?envId=cloud1-6gmp2qy3171c353#/scf
2. 找到 `order` 云函数
3. 点击"函数配置"标签
4. 滚动到页面底部"云端安装依赖"
5. 点击"保存"按钮
6. 返回"函数代码"标签
7. 点击"保存并安装依赖"按钮

## 二、数据库迁移

### 1. 登录云开发控制台

访问：https://tcb.cloud.tencent.com/dev?envId=cloud1-6gmp2qy3171c353#/db

### 2. 选择 orders 集合

1. 点击左侧"数据库"
2. 找到并点击 `orders` 集合
3. 进入数据查看页面

### 3. 添加字段（通过控制台界面）

#### 方法 A：通过添加字段按钮

1. 在 `orders` 集合中，点击任意一条记录
2. 在记录详情页面，找到"字段管理"或类似按钮
3. 点击"添加字段"
4. 添加第一个字段：
   ```
   字段名: rewardSettled
   类型: Boolean
   默认值: false
   描述: 推广奖励是否已结算
   ```
5. 点击确定
6. 重复步骤 3-5，添加第二个字段：
   ```
   字段名: rewardSettleTime
   类型: Date
   默认值: (留空)
   描述: 推广奖励结算时间
   ```

#### 方法 B：通过控制台命令（如果支持）

在云开发控制台的"数据库"标签页中，有些版本支持直接添加字段。

### 4. 批量更新现有订单（重要）

**方式 1：使用云函数脚本**

创建临时迁移云函数：

1. 在 `cloudfunctions` 目录创建新文件夹 `migration`
2. 创建文件 `cloudfunctions/migration/index.js`:
```javascript
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  const { action } = event;

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
};
```

3. 创建 `cloudfunctions/migration/package.json`:
```json
{
  "name": "migration",
  "version": "1.0.0",
  "description": "Database migration functions",
  "main": "index.js"
}
```

4. 在微信开发者工具中上传并部署 `migration` 云函数
5. 在云函数控制台测试 `migration` 云函数：
   ```json
   {
     "action": "addRewardFields"
   }
   ```
6. 查看日志确认迁移成功

**方式 2：手动更新（适用于订单数少的情况）**

如果订单数量少于100条，可以直接在控制台操作：

1. 进入 `orders` 集合
2. 筛选条件设为：`{}`
3. 显示所有记录
4. 手动点击每条记录，添加字段：
   - 勾选"添加字段"
   - 输入 `rewardSettled`，选择 Boolean 类型，值设为 `false`
   - 保存记录

### 5. 验证迁移结果

在云开发控制台的"数据库"标签页，运行查询：

```javascript
db.collection('orders')
  .where({
    status: 'completed'
  })
  .field({
    _id: true,
    orderNo: true,
    status: true,
    paymentMethod: true,
    rewardSettled: true
  })
  .limit(5)
  .get()
```

预期结果：
- 每条记录都有 `rewardSettled` 字段
- `rewardSettled` 值为 `false` 或 `true`

## 三、功能测试验证

### 测试前准备

1. **确保云函数已部署**
   - order 云函数状态为"正常"
   - migration 云函数已执行成功（可选，如果使用了）

2. **准备测试账号**
   - 至少两个用户账号：买家A、推广员B
   - 推广员B需要有邀请码，在 users 集合中查看

3. **准备测试数据**
   - 买家A钱包余额充足（> 100元）
   - 有可购买的商品

### 测试场景 1：余额支付 - 余额充足

#### 步骤：
1. 买家A登录小程序
2. 选择商品 → 加入购物车
3. 进入结算页面（`pages/order/confirm`）
4. **验证点 1**：查看支付方式区域，应显示：
   ```
   微信支付
   余额支付（可用余额: ¥XXX.XX）
   ```
5. **验证点 2**：点击"余额支付"，选项高亮
6. 点击"提交订单"
7. **验证点 3**：支付成功，跳转到订单详情页
8. **验证点 4**：查看订单状态为"等待发货"

#### 验证数据库：
```javascript
// 在云开发控制台运行
db.collection('orders').where({
  orderNo: '刚才创建的订单号'
}).get()

// 预期结果：
{
  data: [{
    paymentMethod: 'balance',
    rewardSettled: false,  // 未结算
    payTime: Date,
    status: 'paid'
  }]
}
```

#### 验证钱包扣款：
```javascript
db.collection('user_wallets').where({
  _openid: '买家A的openid'
}).get()

// 预期余额减少了订单金额
```

#### 验证交易记录：
```javascript
db.collection('wallet_transactions').where({
  orderId: '订单ID'
}).get()

// 预期有记录：
{
  type: 'payment',
  amount: -订单金额,
  title: '订单支付 - XXX'
}
```

### 测试场景 2：余额支付 - 余额不足

#### 步骤：
1. 买家A登录，确保余额 < 50元
2. 选择商品（金额 > 余额），如 100元的商品
3. 进入结算页面
4. **验证点 1**：余额支付选项显示为禁用状态（灰色）
5. **验证点 2**：点击余额支付，弹出提示：
   ```
   余额不足，还差 ¥XX.XX
   ```
6. **验证点 3**：无法选择余额支付，只能选择微信支付
7. 选择微信支付并提交订单
8. 订单创建成功

### 测试场景 3：微信支付

#### 步骤：
1. 买家A登录
2. 选择商品，选择"微信支付"
3. 提交订单
4. 在订单详情页点击"立即支付"
5. 确认支付（模拟支付）
6. **验证点 1**：支付成功，订单状态变为"等待发货"
7. **验证点 2**：推广奖励**未结算**（rewardSettled: false）

### 测试场景 4：订单完成触发结算（核心场景）

#### 步骤：
1. 使用订单管理工具或云函数，将上述订单改为"已完成"状态

**方法 1：通过云函数测试**
```json
// 在 order 云函数中测试
{
  "action": "updateOrderStatus",
  "data": {
    "orderId": "订单ID",
    "status": "completed"
  }
}
```

**方法 2：直接在数据库修改**
```javascript
db.collection('orders').doc('订单ID').update({
  data: {
    status: 'completed',
    completeTime: new Date()
  }
})
```

2. **验证点 1**：查看云函数日志
   ```
   [订单完成] 触发推广奖励结算 订单:XXX 支付方式:balance
   [奖励结算] 成功 订单:XXX 奖励数:X
   ```

3. **验证点 2**：订单记录更新
   ```javascript
   db.collection('orders').doc('订单ID').get()

   // 预期结果：
   {
     rewardSettled: true,
     rewardSettleTime: Date
   }
   ```

4. **验证点 3**：推广奖励记录生成
   ```javascript
   db.collection('reward_records').where({
     orderId: '订单ID'
   }).get()

   // 预期有多条奖励记录（四重分润）
   ```

5. **验证点 4**：推广员余额增加
   ```javascript
   db.collection('users').where({
     _openid: '推广员B的openid'
   }).get()

   // 预期：
   {
     pendingReward: 增加的奖励总额
   }
   ```

### 测试场景 5：取消订单余额退回

#### 步骤：
1. 创建一个余额支付的订单（已支付）
2. 取消订单
3. **验证点**：余额是否退回（此功能待实现，当前可能不会自动退回）

## 四、监控与日志验证

### 1. 查看云函数日志

在云开发控制台：
1. 进入"云函数"
2. 点击 `order` 云函数
3. 点击"日志"标签
4. 查找关键日志：
   - `[余额支付] 开始 订单:XXX`
   - `[余额支付] 当前余额:XXX分 需支付:XXX分`
   - `[余额支付] 扣除余额:XXX分 剩余:XXX分`
   - `[余额支付] 交易记录已创建`
   - `[余额支付] 事务提交成功`

5. 点击 `promotion` 云函数日志
   - `[订单完成] 触发推广奖励结算`
   - `[奖励结算] 成功`

### 2. 错误排查

如果遇到问题，查看日志中的错误信息：
- `[余额支付] 失败`
- `[奖励结算] 失败`
- `[复购检查] 失败`

常见问题：
- **钱包不存在**：需要先充值创建钱包
- **余额不足**：检查余额是否真的足够
- **订单不存在**：订单ID可能错误
- **事务超时**：网络或数据库性能问题

## 五、回滚方案

如果发现问题需要回滚：

### 1. 云函数回滚
1. 在微信开发者工具中找到 `order` 云函数
2. 点击"版本"标签
3. 选择之前的版本（如果有）
4. 点击"回滚"

### 2. 数据库回滚
```javascript
// 删除新增字段
db.collection('orders').update({
  data: {
    rewardSettled: _.remove(),
    rewardSettleTime: _.remove()
  }
})
```

## 六、检查清单

### 部署检查
- [ ] order 云函数已更新并部署
- [ ] 云函数状态显示"正常"
- [ ] 云函数测试通过

### 迁移检查
- [ ] rewardSettled 字段已添加
- [ ] rewardSettleTime 字段已添加
- [ ] 现有订单已验证
- [ ] 索引已创建（可选）

### 功能测试检查
- [ ] 余额充足可以正常支付
- [ ] 余额不足时显示提示并禁用选项
- [ ] 余额支付正确扣款
- [ ] 交易记录正确记录
- [ ] 订单完成时触发奖励结算
- [ ] rewardSettled 字段正确更新
- [ ] 推广奖励记录生成
- [ ] 推广员余额增加

### 日志检查
- [ ] 关键操作都有日志记录
- [ ] 没有异常错误信息
- [ ] 事务提交成功

---

**文档版本**: v1.0
**创建日期**: 2026-02-13
**维护者**: Claude Code

## 快速参考

### 云开发控制台链接
- 概览：https://tcb.cloud.tencent.com/dev?envId=cloud1-6gmp2qy3171c353#/overview
- 数据库：https://tcb.cloud.tencent.com/dev?envId=cloud1-6gmp2qy3171c353#/db
- 云函数：https://tcb.cloud.tencent.com/dev?envId=cloud1-6gmp2qy3171c353#/scf

### 重要数据库集合
- `orders` - 订单集合
- `users` - 用户集合
- `user_wallets` - 钱包集合
- `wallet_transactions` - 交易记录集合
- `reward_records` - 奖励记录集合
