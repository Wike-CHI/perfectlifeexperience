# CloudBase 云函数部署指南
## 大友元气精酿啤酒项目 - 云函数部署说明

**生成时间**: 2026-02-13
**环境**: `cloud1-6gmp2q0y3171c353`

---

## 📊 当前状态

### 已部署的云函数（12个）
✅ wechatpay - 微信支付
✅ test-helper - 测试辅助
✅ migration - 数据迁移
✅ order - 订单管理
✅ initData - 数据初始化
✅ hello - 测试函数
✅ promotion - 推广系统
✅ rewardSettlement - 奖励结算
✅ wallet - 钱包管理
✅ coupon - 优惠券管理
✅ login - 用户登录
✅ user - 用户管理

### 待部署的新云函数（3个）
❌ admin-api - 管理后台API
❌ wechatpay - 微信支付（新版）
❌ initAdminData - 管理后台数据初始化

---

## 🚀 手动部署步骤

### 方案一：通过CloudBase控制台部署

#### 1. 打开云函数控制台

**控制台链接**：
```
https://tcb.cloud.tencent.com/dev?envId=cloud1-6gmp2q0y3171c353#/scf
```

或者点击：
- 登录腾讯云控制台：https://console.cloud.tencent.com/
- 选择"云开发 CloudBase"
- 选择环境：`cloud1-6gmp2q0y3171c353`

#### 2. 部署 admin-api 云函数

**步骤**：
1. 点击"新建云函数"
2. 函数名称：`admin-api`
3. 运行环境：`Nodejs 18.15`
4. 函数内存：256MB
5. 超时时间：60秒
6. 上传方式：选择"本地上传文件夹"
7. 选择本地文件夹：`/Users/johnny/Desktop/小程序/perfectlifeexperience/cloudfunctions/admin-api`
8. 点击"上传"

**部署后配置**：
- 环境变量：无需配置
- 网络配置：保持默认

#### 3. 更新 wechatpay 云函数

**注意**：此函数名称已存在，需要更新代码

**步骤**：
1. 在云函数列表中找到 `wechatpay`
2. 点击进入函数详情
3. 点击"代码管理" → "更新代码"
4. 选择本地文件夹：`/Users/johnny/Desktop/小程序/perfectlifeexperience/cloudfunctions/wechatpay`
5. 点击"保存并重新部署"

**运行时说明**：
- 当前运行时：`Nodejs10.15`
- **建议升级到**：`Nodejs18.15`（与admin-api保持一致）

#### 4. 部署 initAdminData 云函数

**步骤**：
1. 点击"新建云函数"
2. 函数名称：`initAdminData`
3. 运行环境：`Nodejs 18.15`
4. 函数内存：128MB
5. 超时时间：60秒
6. 上传方式：选择"本地上传文件夹"
7. 选择本地文件夹：`/Users/johnny/Desktop/小程序/perfectlifeexperience/cloudfunctions/initAdminData`
8. 点击"上传"

---

### 方案二：使用 CloudBase CLI 部署

#### 安装 CloudBase CLI

```bash
# 安装 CloudBase CLI
npm install -g @cloudbase/cloudbase-cli

# 或使用 yarn
yarn global add @cloudbase/cloudbase-cli
```

#### 登录 CloudBase

```bash
# 登录到 CloudBase
cloudbase login

# 或使用环境变量
cloudbase login --envId cloud1-6gmp2q0y3171c353
```

#### 部署云函数

```bash
# 进入云函数目录
cd /Users/johnny/Desktop/小程序/perfectlifeexperience/cloudfunctions

# 部署 admin-api
cloudbase functions:deploy admin-api

# 更新 wechatpay
cloudbase functions:deploy wechatpay

# 部署 initAdminData
cloudbase functions:deploy initAdminData
```

---

## 📁 云函数文件结构

### admin-api
```
cloudfunctions/admin-api/
├── index.js           # 主入口文件
├── auth.js           # 认证逻辑
├── package.json       # 依赖配置
└── migrations/        # 数据库迁移脚本
    ├── hash_existing_passwords.js
    └── package.json
```

**依赖**：
- wx-server-sdk (最新版)
- bcryptjs ^5.1.1

### wechatpay
```
cloudfunctions/wechatpay/
├── index.js           # 主入口文件
├── pay.js            # 支付逻辑
├── sign.js           # 签名逻辑
├── notify.js         # 支付回调
├── cert.js          # 证书处理
├── decrypt.js        # 解密逻辑
└── package.json       # 依赖配置
```

### initAdminData
```
cloudfunctions/initAdminData/
├── index.js           # 主入口文件
└── package.json       # 依赖配置
```

---

## 🔧 部署后配置

### 环境变量配置

**admin-api 函数需要的环境变量**：
无需配置（使用 CloudBase 默认环境）

**wechatpay 函数需要的环境变量**：
```bash
WX_PAY_MCH_ID        # 商户号
WX_PAY_SERIAL_NO     # 证书序列号
WX_PAY_API_V3_KEY     # API密钥
WX_PAY_NOTIFY_URL     # 支付通知URL
```

### HTTP 访问配置

**为 admin-api 配置 HTTP 访问**：

**控制台操作**：
1. 进入 `admin-api` 函数详情
2. 点击"触发管理" → "API 网关触发"
3. 配置路径：`/api/*` 或 `/*`
4. 认鉴权类型：选择"无需鉴权"（开发测试）或"自定义鉴权"（生产环境）
5. 点击"添加"

**访问 URL 格式**：
```
https://cloud1-6gmp2q0y3171c353.ap-shanghai.tcloudbase.com/api/*
```

---

## 📊 数据库状态

### 当前数据库集合

| 集合名称 | 记录数 | 大小 | 索引数 | 说明 |
|-----------|--------|------|--------|------|
| categories | 7 | 702B | 2 | 产品分类 |
| coupon_templates | 0 | 0B | 2 | 优惠券模板 |
| orders | 1 | 518B | 2 | 订单记录 |
| products | 12 | 6.8KB | 2 | 产品信息 |
| promotion_logs | 0 | 0B | 2 | 推广日志 |
| promotion_orders | 0 | 0B | 2 | 推广订单 |
| promotion_relations | 0 | 0B | 2 | 推广关系 |
| reward_records | 0 | 0B | 2 | 奖励记录 |
| user_coupons | 0 | 0B | 2 | 用户优惠券 |
| user_wallets | 1 | 156B | 2 | 用户钱包 |
| users | 1 | 394B | 2 | 用户信息 |
| wallet_transactions | 0 | 0B | 2 | 钱包交易 |

**总计**: 12个集合，21条记录，约9KB数据

### 需要的数据库索引

如果云函数报索引错误，需要在控制台创建以下索引：

**users 集合**：
```json
{
  "IndexId": "_openid_",
  "MgoIndexSchema": {
    "MgoIndexKeys": [{
      "Name": "_openid",
      "Direction": "1"
    }],
    "MgoIsUnique": true
  }
}
```

**promotion_relations 集合**：
```json
{
  "IndexId": "promotionPath_1",
  "MgoIndexSchema": {
    "MgoIndexKeys": [{
      "Name": "promotionPath",
      "Direction": "1"
    }],
    "MgoIsUnique": false
  }
}
```

---

## ✅ 部署验证

### 测试云函数

#### 1. 测试 admin-api

```bash
# 在控制台测试
动作: getDashboardData
参数: {}

# 预期返回
{
  "code": 0,
  "data": {
    "todaySales": 0,
    "todayOrders": 0,
    "totalUsers": 0,
    "pendingTasks": []
  }
}
```

#### 2. 测试 wechatpay

```bash
# 在控制台测试
动作: createPayment
参数: {
  "orderData": {...}
}
```

#### 3. 测试 initAdminData

```bash
# 在控制台测试
动作: initAdmin
参数: {}
```

### 查看云函数日志

**日志控制台**：
```
https://tcb.cloud.tencent.com/dev?envId=cloud1-6gmp2q0y3171c353#/devops/log
```

**查看方式**：
1. 选择对应的云函数
2. 设置时间范围（最近1小时）
3. 查看请求日志和返回结果

---

## 🔗 相关链接

### 控制台快速访问

- **云函数列表**：
  https://tcb.cloud.tencent.com/dev?envId=cloud1-6gmp2q0y3171c353#/scf

- **数据库管理**：
  https://tcb.cloud.tencent.com/dev?envId=cloud1-6gmp2q0y3171c353#/db/doc

- **云存储**：
  https://tcb.cloud.tencent.com/dev?envId=cloud1-6gmp2q0y3171c353#/storage

- **静态网站托管**：
  https://tcb.cloud.tencent.com/dev?envId=cloud1-6gmp2q0y3171c353#/static-hosting

- **日志监控**：
  https://tcb.cloud.tencent.com/dev?envId=cloud1-6gmp2q0y3171c353#/devops/log

---

## 📝 部署检查清单

完成部署后，请检查以下项目：

- [ ] admin-api 云函数已部署
- [ ] admin-api 可以成功调用
- [ ] wechatpay 云函数已更新
- [ ] wechatpay 运行时已升级到 Nodejs 18.15
- [ ] initAdminData 云函数已部署
- [ ] initAdminData 可以成功初始化管理员数据
- [ ] 所有云函数日志正常，无错误
- [ ] HTTP 访问已配置（如果需要）
- [ ] 环境变量已正确配置
- [ ] 数据库索引已创建（如果需要）

---

## 🐛 常见问题

### Q: 云函数部署失败

**A**: 检查文件夹结构是否正确
**A**: 确认 `index.js` 导出 `exports.main`
**A**: 查看部署日志了解详细错误

### Q: 云函数调用超时

**A**: 增加超时时间配置
**A**: 优化云函数代码执行效率

### Q: 数据库连接错误

**A**: 检查环境 ID 是否正确
**A**: 确认数据库已初始化
**A**: 查看数据库权限配置

### Q: 微信支付签名错误

**A**: 检查商户号和密钥配置
**A**: 确认证书文件正确上传
**A**: 验证签名算法实现

---

## 📞 技术支持

如遇到问题，可以：
1. 查看 CloudBase 文档：https://docs.cloudbase.net/
2. 搜索问题：https://cloud.tencent.com/developer/document/product/231
3. 提交工单：腾讯云控制台 → 工单系统

---

**部署完成后，建议运行完整测试流程验证所有功能正常！**
