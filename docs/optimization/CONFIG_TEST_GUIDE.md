# 配置管理优化测试指南

## 📋 测试准备

### 1. 验证文件部署

确保以下文件已正确创建和修改：

```bash
# 检查配置管理模块是否存在
ls -lh cloudfunctions/common/defaultConfig.js

# 检查云函数是否已更新
grep -n "ensureSystemConfig\|getSystemConfigWithFallback" cloudfunctions/admin-api/modules/misc.js
grep -n "getSystemConfigWithFallback" cloudfunctions/commission-wallet/index.js
```

**期望输出：**
- ✅ `defaultConfig.js` 文件存在（约4KB）
- ✅ `misc.js` 中引用了 `ensureSystemConfig`
- ✅ `commission-wallet/index.js` 中引用了 `getSystemConfigWithFallback`

### 2. 验证默认配置值

检查 `cloudfunctions/common/defaultConfig.js` 中的关键值：

```javascript
// 应该包含以下正确值：
level3Commission: 12,      // 不是8
level4Commission: 8,       // 不是4
minWithdrawAmount: 100,    // 1元（不是100元）
maxWithdrawAmount: 50000,  // 500元（新增）
maxDailyWithdraws: 3,      // 3次（新增）
```

## 🧪 测试步骤

### 测试1：自动初始化功能

**目的：** 验证首次访问时自动创建默认配置到数据库

**步骤：**
1. 清空数据库中的配置（如果存在）
```javascript
// 通过MCP工具执行
db.collection('system_config').where({ type: 'commission_config' }).remove()
```

2. 调用管理端API
```javascript
// 在微信开发者工具控制台执行
wx.cloud.callFunction({
  name: 'admin-api',
  data: {
    action: 'getSystemConfig',
    adminToken: 'your_admin_token'
  }
}).then(res => {
  console.log('配置获取结果:', res);
});
```

**期望结果：**
- ✅ 返回的 `data` 包含正确的配置值
- ✅ `level3Commission` = 12
- ✅ `level4Commission` = 8
- ✅ `minWithdrawAmount` = 1（显示为元，不是分）
- ✅ `maxWithdrawAmount` = 500
- ✅ `maxDailyWithdraws` = 3

3. 验证数据库
```javascript
// 通过MCP工具查询
db.collection('system_config').where({ type: 'commission_config' }).get()
```

**期望结果：**
- ✅ 数据库中有一条配置记录
- ✅ `type` = 'commission_config'
- ✅ 包含所有必需字段

### 测试2：管理端界面测试

**目的：** 验证管理端配置页面正确显示和保存

**步骤：**
1. 打开微信开发者工具
2. 进入管理端设置页面 `pagesAdmin/settings/config.vue`
3. 检查默认值是否正确显示

**期望结果：**
- ✅ 三级代理佣金比例：12（placeholder: "12"）
- ✅ 四级代理佣金比例：8（placeholder: "8"）
- ✅ 最低提现金额：1元（placeholder: "1"）
- ✅ 最大提现金额：500元（placeholder: "500"）
- ✅ 每日提现次数：3次（placeholder: "3"）
- ✅ 铜牌累计销售额：20000元（placeholder: "20000"）
- ✅ 银牌月销售额：50000元（placeholder: "50000"）
- ✅ 银牌团队人数：50人（placeholder: "50"）
- ✅ 金牌月销售额：100000元（placeholder: "100000"）
- ✅ 金牌团队人数：200人（placeholder: "200"）

4. 修改某个值（例如最低提现金额改为2元）
5. 点击"保存配置"
6. 刷新页面，验证值是否保存成功

### 测试3：用户端提现功能测试

**目的：** 验证提现配置从数据库读取

**步骤：**
1. 在管理端将最低提现金额设置为10元
2. 用户端尝试提现5元

**期望结果：**
- ✅ 提示："最小提现金额为10元"

3. 用户端尝试提现500元（假设最大设置为500元）

**期望结果：**
- ✅ 提示："单次最大提现金额为500元"

4. 用户端尝试提现50元（成功）
5. 再次提现50元（共3次）

**期望结果：**
- ✅ 第3次提现成功
- ✅ 第4次提现提示："每天最多提现3次，请明天再试"

### 测试4：降级容错测试

**目的：** 验证数据库查询失败时的降级处理

**步骤：**
1. 临时修改 `commission-wallet/index.js`，模拟数据库查询失败
2. 尝试提现

**期望结果：**
- ✅ 使用 `defaultConfig.js` 中的默认值
- ✅ 系统不会崩溃
- ✅ 返回正确的错误提示

## 🐛 常见问题排查

### 问题1：配置没有自动初始化

**可能原因：**
- `ensureSystemConfig` 没有正确调用
- 数据库权限问题

**排查方法：**
```javascript
// 在 misc.js 的 getSystemConfig 中添加日志
async function getSystemConfig(db) {
  console.log('[getSystemConfig] 开始执行');
  const config = await ensureSystemConfig(db);
  console.log('[getSystemConfig] 配置获取成功:', config._id);
  // ...
}
```

### 问题2：默认值不正确

**可能原因：**
- `defaultConfig.js` 文件未正确部署
- 使用了旧版本的代码

**排查方法：**
```bash
# 检查文件是否更新
grep "level3Commission: 12" cloudfunctions/common/defaultConfig.js
# 应该有输出
```

### 问题3：前端显示值不正确

**可能原因：**
- 前端代码未更新
- 数据库中的值不正确

**排查方法：**
```javascript
// 在浏览器控制台检查
console.log('配置值:', res.data);
```

## ✅ 测试检查清单

### 文件部署检查
- [ ] `cloudfunctions/common/defaultConfig.js` 存在
- [ ] `cloudfunctions/admin-api/modules/misc.js` 已更新
- [ ] `cloudfunctions/commission-wallet/index.js` 已更新
- [ ] `src/pagesAdmin/settings/config.vue` 已更新

### 功能测试检查
- [ ] 首次访问自动创建配置
- [ ] 管理端显示正确的默认值
- [ ] 管理端可以保存配置
- [ ] 用户端提现使用正确的限制
- [ ] 数据库配置与界面显示一致

### 数据验证检查
- [ ] level3Commission = 12（不是8）
- [ ] level4Commission = 8（不是4）
- [ ] minWithdrawAmount = 100分 = 1元（不是100元）
- [ ] maxWithdrawAmount = 50000分 = 500元
- [ ] maxDailyWithdraws = 3次
- [ ] 晋升阈值正确（2万元、5万元、10万元等）

## 📊 性能测试

### 配置读取性能

测试从数据库读取配置的性能：

```javascript
console.time('getSystemConfig');
await callFunction('admin-api', { action: 'getSystemConfig' });
console.timeEnd('getSystemConfig');
// 期望：< 500ms
```

### 并发初始化测试

模拟多个请求同时触发初始化：

```javascript
// 发送10个并发请求
const promises = Array(10).fill().map(() =>
  callFunction('admin-api', { action: 'getSystemConfig' })
);
const results = await Promise.all(promises);

// 验证只创建了一条配置记录
const configs = await db.collection('system_config')
  .where({ type: 'commission_config' })
  .get();
console.log('配置记录数:', configs.data.length); // 应该是1
```

## 🎯 测试通过标准

所有测试满足以下标准即为通过：

1. ✅ 自动初始化成功，数据库中有且仅有1条配置记录
2. ✅ 管理端界面显示正确的默认值
3. ✅ 保存配置后，数据库正确更新
4. ✅ 用户端提现功能使用正确的配置限制
5. ✅ 所有配置值符合业务需求
6. ✅ 性能测试通过（< 500ms）
7. ✅ 并发测试通过（无重复配置记录）

## 🔗 相关文档

- [配置管理优化说明](./CONFIG_MANAGEMENT_IMPROVEMENT.md)
- [系统配置数据库结构](../system/DATABASE_SCHEMA.md)
- [管理端系统设置](../admin/SYSTEM_SETTINGS.md)
