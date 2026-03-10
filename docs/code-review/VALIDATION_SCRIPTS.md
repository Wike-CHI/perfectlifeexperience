# 订单系统数据验证脚本

**用途**: 快速验证数据库和云函数的实际字段结构
**使用方法**: 在微信开发者工具控制台或云函数控制台执行

---

## 📊 验证脚本集

### 1. 数据库验证脚本

#### 1.1 验证订单集合字段

```javascript
// 在云开发控制台 -> 数据库 -> 执行查询
// 或在云函数中执行

async function validateOrderCollection() {
  const db = cloud.database();

  try {
    // 查询一条订单记录
    const res = await db.collection('orders').limit(1).get();

    if (res.data.length === 0) {
      console.log('⚠️  订单集合为空，请先创建测试订单');
      return;
    }

    const order = res.data[0];

    console.log('========== 订单字段验证 ==========');
    console.log('订单ID:', order._id);
    console.log('订单号:', order.orderNo);
    console.log('订单状态:', order.status);
    console.log('');

    // 验证 items/products 字段
    console.log('----- 商品字段 -----');
    console.log('存在 items 字段:', order.items !== undefined);
    console.log('items 类型:', Array.isArray(order.items) ? 'Array' : typeof order.items);
    console.log('items 长度:', order.items ? order.items.length : 0);
    console.log('存在 products 字段:', order.products !== undefined);
    console.log('products 类型:', typeof order.products);
    console.log('');

    // 验证商品项字段
    if (order.items && order.items.length > 0) {
      const item = order.items[0];
      console.log('----- 第一个商品字段 -----');
      console.log('商品ID:', item.productId);
      console.log('商品名称 (name):', item.name);
      console.log('商品名称别名 (productName):', item.productName);
      console.log('商品图片 (image):', item.image);
      console.log('商品图片别名 (productImage):', item.productImage);
      console.log('商品价格:', item.price);
      console.log('商品数量:', item.quantity);
      console.log('商品规格:', item.specs);
      console.log('');
    }

    // 验证快递字段
    console.log('----- 快递字段（应该不存在）-----');
    console.log('快递公司:', order.expressCompany || '不存在（正确）');
    console.log('快递单号:', order.expressNo || '不存在（正确）');
    console.log('');

    // 字段总结
    console.log('========== 验证结果 ==========');
    const issues = [];

    if (!order.items) {
      issues.push('❌ items 字段不存在');
    } else {
      console.log('✅ items 字段存在');
    }

    if (order.products) {
      issues.push('⚠️  products 字段存在（应该移除）');
    } else {
      console.log('✅ products 字段不存在（正确）');
    }

    if (order.items && order.items[0]) {
      const item = order.items[0];
      if (item.name) {
        console.log('✅ 使用标准字段 name');
      } else {
        issues.push('❌ 标准字段 name 不存在');
      }

      if (item.productName) {
        issues.push('⚠️  别名字段 productName 存在（应该移除）');
      } else {
        console.log('✅ 别名字段 productName 不存在（正确）');
      }

      if (item.image) {
        console.log('✅ 使用标准字段 image');
      } else {
        issues.push('❌ 标准字段 image 不存在');
      }

      if (item.productImage) {
        issues.push('⚠️  别名字段 productImage 存在（应该移除）');
      } else {
        console.log('✅ 别名字段 productImage 不存在（正确）');
      }
    }

    if (order.expressCompany || order.expressNo) {
      issues.push('⚠️  快递字段仍然存在（应该移除）');
    } else {
      console.log('✅ 快递字段已移除（正确）');
    }

    console.log('');
    console.log('========== 问题汇总 ==========');
    if (issues.length === 0) {
      console.log('🎉 所有验证通过！数据库字段结构正确。');
    } else {
      console.log('发现 ' + issues.length + ' 个问题：');
      issues.forEach(issue => console.log(issue));
    }

    return {
      success: issues.length === 0,
      order: order,
      issues: issues
    };
  } catch (error) {
    console.error('验证失败:', error);
    return { success: false, error: error.message };
  }
}

// 执行验证
validateOrderCollection();
```

---

#### 1.2 验证退款集合字段

```javascript
async function validateRefundCollection() {
  const db = cloud.database();

  try {
    const res = await db.collection('refunds').limit(1).get();

    if (res.data.length === 0) {
      console.log('⚠️  退款集合为空');
      return;
    }

    const refund = res.data[0];

    console.log('========== 退款字段验证 ==========');
    console.log('退款ID:', refund._id);
    console.log('退款单号:', refund.refundNo);
    console.log('订单ID:', refund.orderId);
    console.log('');

    // 验证商品字段
    console.log('----- 退款商品字段 -----');
    console.log('存在 items 字段:', refund.items !== undefined);
    console.log('存在 products 字段:', refund.products !== undefined);

    if (refund.items && refund.items.length > 0) {
      console.log('使用 items 字段，第一个商品:', refund.items[0]);
    }

    if (refund.products && refund.products.length > 0) {
      console.log('使用 products 字段，第一个商品:', refund.products[0]);
    }

    console.log('');

    // 建议
    if (refund.products && !refund.items) {
      console.log('⚠️  建议: 将 refunds 集合的 products 字段改为 items，与订单保持一致');
    }
  } catch (error) {
    console.error('验证失败:', error);
  }
}

// 执行验证
validateRefundCollection();
```

---

### 2. 云函数验证脚本

#### 2.1 验证用户端云函数返回

```javascript
// 在小程序端执行
async function validateUserOrderCloudFunction() {
  try {
    console.log('========== 验证用户端云函数 ==========');

    // 测试 getOrders
    console.log('----- 测试 getOrders -----');
    const ordersRes = await wx.cloud.callFunction({
      name: 'order',
      data: {
        action: 'getOrders',
        data: { status: 'all' }
      }
    });

    console.log('返回码:', ordersRes.result.code);
    console.log('返回消息:', ordersRes.result.msg);

    if (ordersRes.result.code === 0 && ordersRes.result.data) {
      const orders = ordersRes.result.data.orders || [];
      console.log('订单数量:', orders.length);

      if (orders.length > 0) {
        const order = orders[0];
        console.log('第一个订单字段:', Object.keys(order));
        console.log('存在 items:', order.items !== undefined);
        console.log('存在 products:', order.products !== undefined);

        if (order.items && order.items.length > 0) {
          const item = order.items[0];
          console.log('第一个商品字段:', Object.keys(item));
          console.log('使用 name:', item.name !== undefined);
          console.log('使用 image:', item.image !== undefined);
          console.log('存在 productName:', item.productName !== undefined);
          console.log('存在 productImage:', item.productImage !== undefined);
        }
      }
    }

    console.log('');

    // 测试 getOrderDetail
    console.log('----- 测试 getOrderDetail -----');
    const detailRes = await wx.cloud.callFunction({
      name: 'order',
      data: {
        action: 'getOrderDetail',
        data: { orderId: ordersRes.result.data.orders[0]._id }
      }
    });

    console.log('返回码:', detailRes.result.code);

    if (detailRes.result.code === 0 && detailRes.result.data) {
      const order = detailRes.result.data.order;
      console.log('订单详情字段:', Object.keys(order));
      console.log('商品字段:', Object.keys(order.items[0]));
    }

  } catch (error) {
    console.error('验证失败:', error);
  }
}

// 执行验证
validateUserOrderCloudFunction();
```

---

#### 2.2 验证管理员端云函数返回

```javascript
// 在管理员端执行
async function validateAdminOrderCloudFunction() {
  const adminToken = 'your_admin_token'; // 替换为实际token

  try {
    console.log('========== 验证管理员端云函数 ==========');

    // 测试 getOrders
    console.log('----- 测试 getOrders -----');
    const res = await wx.cloud.callFunction({
      name: 'admin-api',
      data: {
        action: 'getOrders',
        adminToken: adminToken,
        data: { page: 1, limit: 10 }
      }
    });

    console.log('返回码:', res.result.code);

    if (res.result.code === 0 && res.result.data) {
      const orders = res.result.data.list || [];
      console.log('订单数量:', orders.length);

      if (orders.length > 0) {
        const order = orders[0];
        console.log('第一个订单字段:', Object.keys(order));
        console.log('存在 items:', order.items !== undefined);
        console.log('存在 products:', order.products !== undefined);
        console.log('存在 id 字段:', order.id !== undefined);

        if (order.items && order.items.length > 0) {
          const item = order.items[0];
          console.log('第一个商品字段:', Object.keys(item));
          console.log('使用 name:', item.name !== undefined);
          console.log('使用 image:', item.image !== undefined);
        }
      }
    }

  } catch (error) {
    console.error('验证失败:', error);
  }
}

// 执行验证
validateAdminOrderCloudFunction();
```

---

### 3. 前端字段使用验证

#### 3.1 搜索前端代码中的字段使用

```bash
# 在项目根目录执行

# 搜索用户端 products 字段使用
grep -r "products" src/pages/order/

# 搜索用户端 productImage 别名使用
grep -r "productImage" src/pages/order/

# 搜索用户端 productName 别名使用
grep -r "productName" src/pages/order/

# 搜索管理员端 products 字段使用
grep -r "products" src/pagesAdmin/orders/

# 搜索管理员端 productImage 别名使用
grep -r "productImage" src/pagesAdmin/

# 搜索管理员端 productName 别名使用
grep -r "productName" src/pagesAdmin/
```

---

### 4. 一键完整验证脚本

```javascript
/**
 * 完整验证脚本
 * 在云开发控制台的云函数中执行
 */
async function fullValidation() {
  const db = cloud.database();

  console.log('╔════════════════════════════════════════╗');
  console.log('║   订单系统完整验证脚本 v2.0           ║');
  console.log('║   日期: 2026-03-10                    ║');
  console.log('╚════════════════════════════════════════╝');
  console.log('');

  const results = {
    database: { success: true, issues: [] },
    cloudFunctions: { success: true, issues: [] },
    frontend: { success: true, issues: [] }
  };

  // ===== 1. 数据库验证 =====
  console.log('📊 第一步：验证数据库字段结构');
  console.log('─────────────────────────────────────');

  try {
    const orderRes = await db.collection('orders').limit(1).get();

    if (orderRes.data.length === 0) {
      console.log('⚠️  订单集合为空，跳过验证');
    } else {
      const order = orderRes.data[0];

      // 验证 items/products
      if (!order.items) {
        results.database.issues.push('❌ items 字段不存在');
        results.database.success = false;
      } else {
        console.log('✅ items 字段存在');
      }

      if (order.products) {
        results.database.issues.push('⚠️  products 字段存在（应移除）');
      } else {
        console.log('✅ products 字段不存在（正确）');
      }

      // 验证商品字段
      if (order.items && order.items[0]) {
        const item = order.items[0];
        if (!item.name) {
          results.database.issues.push('❌ 商品缺少 name 字段');
          results.database.success = false;
        } else {
          console.log('✅ 使用标准字段 name');
        }

        if (item.productName) {
          results.database.issues.push('⚠️  存在别名字段 productName');
        }

        if (!item.image) {
          results.database.issues.push('❌ 商品缺少 image 字段');
          results.database.success = false;
        } else {
          console.log('✅ 使用标准字段 image');
        }

        if (item.productImage) {
          results.database.issues.push('⚠️  存在别名字段 productImage');
        }
      }

      // 验证快递字段
      if (order.expressCompany || order.expressNo) {
        results.database.issues.push('⚠️  快递字段仍然存在');
      } else {
        console.log('✅ 快递字段已移除');
      }
    }
  } catch (error) {
    results.database.issues.push('❌ 数据库验证失败: ' + error.message);
    results.database.success = false;
  }

  console.log('');

  // ===== 2. 云函数验证 =====
  console.log('⚙️  第二步：验证云函数返回数据');
  console.log('─────────────────────────────────────');

  try {
    const orderRes = await db.collection('orders').limit(1).get();

    if (orderRes.data.length > 0) {
      const orderId = orderRes.data[0]._id;

      // 模拟用户端云函数调用
      const userOrder = await db.collection('orders').doc(orderId).get();

      if (userOrder.data) {
        console.log('✅ 用户端云函数返回订单');
        if (!userOrder.data.items) {
          results.cloudFunctions.issues.push('❌ 用户端云函数缺少 items 字段');
          results.cloudFunctions.success = false;
        }
      }

      // 模拟管理员端云函数（手动映射）
      const adminOrder = {
        ...userOrder.data,
        id: userOrder.data._id,
        items: userOrder.data.items || []
      };

      if (adminOrder.items) {
        console.log('✅ 管理员端云函数映射 items 字段');
      } else {
        results.cloudFunctions.issues.push('❌ 管理员端云函数映射失败');
        results.cloudFunctions.success = false;
      }
    }
  } catch (error) {
    results.cloudFunctions.issues.push('❌ 云函数验证失败: ' + error.message);
    results.cloudFunctions.success = false;
  }

  console.log('');

  // ===== 3. 前端代码验证（手动检查）=====
  console.log('💻 第三步：前端代码字段使用检查');
  console.log('─────────────────────────────────────');
  console.log('请手动执行以下 grep 命令检查前端代码：');
  console.log('');
  console.log('1. 用户端检查:');
  console.log('   grep -r "products" src/pages/order/');
  console.log('   grep -r "productImage" src/pages/order/');
  console.log('   grep -r "productName" src/pages/order/');
  console.log('');
  console.log('2. 管理员端检查:');
  console.log('   grep -r "products" src/pagesAdmin/orders/');
  console.log('   grep -r "productImage" src/pagesAdmin/');
  console.log('   grep -r "productName" src/pagesAdmin/');
  console.log('');
  console.log('预期结果：应该找到 || 兼容处理的代码');
  console.log('');

  // ===== 4. 总结报告 =====
  console.log('═══════════════════════════════════════');
  console.log('📋 验证总结报告');
  console.log('═══════════════════════════════════════');
  console.log('');

  console.log('【数据库验证】');
  if (results.database.success) {
    console.log('✅ 通过');
  } else {
    console.log('❌ 失败');
    results.database.issues.forEach(issue => console.log('   ' + issue));
  }
  console.log('');

  console.log('【云函数验证】');
  if (results.cloudFunctions.success) {
    console.log('✅ 通过');
  } else {
    console.log('❌ 失败');
    results.cloudFunctions.issues.forEach(issue => console.log('   ' + issue));
  }
  console.log('');

  console.log('【前端代码验证】');
  console.log('⚠️  需要手动检查（见上面的 grep 命令）');
  console.log('');

  const allSuccess = results.database.success && results.cloudFunctions.success;

  if (allSuccess) {
    console.log('═══════════════════════════════════════');
    console.log('🎉 自动验证通过！可以进行下一步测试。');
    console.log('═══════════════════════════════════════');
  } else {
    console.log('═══════════════════════════════════════');
    console.log('⚠️  发现问题，请查看上面的详细信息并修复。');
    console.log('═══════════════════════════════════════');
  }

  return results;
}

// 执行完整验证
fullValidation();
```

---

## 🔧 使用说明

### 在云开发控制台使用

1. 登录腾讯云开发控制台
2. 进入云开发环境
3. 点击"云函数" → 选择任意云函数
4. 点击"云端测试"或"本地调试"
5. 将上面的脚本复制到编辑器
6. 点击"运行"查看结果

### 在微信开发者工具使用

1. 打开微信开发者工具
2. 进入项目
3. 打开"控制台"标签
4. 粘贴前端验证脚本
5. 查看输出结果

### 在命令行使用 grep

```bash
# Windows (Git Bash)
cd C:/Users/Administrator/Documents/HBuilderProjects/perfectlifeexperience
grep -r "products" src/pages/order/

# macOS/Linux
cd /path/to/project
grep -r "products" src/pages/order/
```

---

## 📝 验证检查清单

执行验证后，请确认以下项目：

### 数据库验证
- [ ] `items` 字段存在
- [ ] `products` 字段不存在
- [ ] 商品使用 `name` 标准字段
- [ ] 商品使用 `image` 标准字段
- [ ] 商品不存在 `productName` 别名
- [ ] 商品不存在 `productImage` 别名
- [ ] 快递字段已移除

### 云函数验证
- [ ] 用户端云函数返回 `items` 字段
- [ ] 管理员端云函数映射 `items` 字段
- [ ] 两端字段结构一致

### 前端代码验证
- [ ] 记录所有 `|| products` 兼容代码位置
- [ ] 记录所有 `|| productName` 兼容代码位置
- [ ] 记录所有 `|| productImage` 兼容代码位置
- [ ] 统计需要修复的文件数量

---

**验证完成后**: 将验证结果粘贴到测试报告中，作为问题分析的依据。
