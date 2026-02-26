# 微信商家转账到零钱配置指南

## 一、功能说明

商家转账到零钱功能允许商户将资金直接转入用户的微信零钱，用于：
- 佣金提现
- 奖励发放
- 退款等场景

## 二、申请条件

### 1. 基本要求
- ✅ 已入驻微信支付
- ✅ 入驻时长 ≥ 90天
- ✅ 连续正常交易 ≥ 30天
- ✅ 需要签约"商家转账到零钱"产品

### 2. 申请流程

#### 步骤1：登录微信支付商家平台
```
网址: https://pay.weixin.qq.com/
```

#### 步骤2：申请开通产品
```
产品中心 → 我的产品 → 签约产品 → 商家转账到零钱 → 申请开通
```

#### 步骤3：提交审核材料
- 营业执照
- 法人身份证
- 对公账户信息
- **转账场景说明**（重要）
  - 场景：推广佣金提现
  - 转账对象：购买商品并推广的用户
  - 转账频率：按用户申请提现时触发
  - 预估月转账笔数和金额

#### 步骤4：等待审核
- 审核时间：3-7 个工作日
- 审核通过后会收到通知

## 三、API配置

### 1. 获取API参数

在微信支付商家平台获取以下参数：

| 参数 | 说明 | 获取位置 |
|------|------|----------|
| `mchId` | 商户号 | 账户中心 → 商户信息 |
| `serialNo` | 证书序列号 | 账户中心 → API安全 → 证书管理 |
| `apiV3Key` | API v3 密钥 | 账户中心 → API安全 → 设置API密钥 |
| `privateKey` | 商户私钥 | 证书管理 → 下载证书 |

### 2. 下载商家证书

```
账户中心 → API安全 → 证书管理 → 下载证书
```

下载后会得到一个压缩包，包含：
- `apiclient_cert.pem` - 证书文件
- `apiclient_key.pem` **私钥文件**（重要！）
- `apiclient_cert.p12` - 证书PKCS12格式

**⚠️ 重要提醒**：
- 私钥文件必须妥善保管，不能泄露
- 不要将私钥提交到Git仓库
- 私钥文件应放在服务器安全位置

### 3. 配置云函数环境变量

#### 方式1：通过CloudBase控制台配置（推荐）

1. 登录 [CloudBase控制台](https://tcb.cloud.tencent.com/)
2. 进入云函数管理 → `admin-api`
3. 点击"配置" → "环境变量"
4. 添加以下环境变量：

```bash
# 微信支付配置
WX_PAY_MCH_ID=1234567890                    # 商户号
WX_PAY_SERIAL_NO=XXXXXXXXXXXXXXXXXXXXXXXX  # 证书序列号
WX_PAY_API_V3_KEY=XXXXXXXXXXXXXXXXXXXXXXXX # API v3 密钥 (32位)
WX_PAY_PRIVATE_KEY_PATH=./certs/apiclient_key.pem  # 私钥文件路径
WX_PAY_APPID=wxXXXXXXXXXXXXXXXXX            # 小程序AppID
WX_PAY_TRANSFER_NOTIFY_URL=https://xxx.com/notify  # 转账回调通知URL
```

#### 方式2：通过配置文件（仅开发环境）

在 `cloudfunctions/admin-api/` 下创建 `config.js`：

```javascript
module.exports = {
  wxPay: {
    mchId: 'your_mch_id',
    serialNo: 'your_serial_no',
    apiV3Key: 'your_api_v3_key',
    privateKeyPath: './certs/apiclient_key.pem',
    appId: 'your_appid',
    notifyUrl: 'https://your-domain.com/notify'
  }
};
```

**⚠️ 注意**：配置文件方式仅用于本地开发，生产环境必须使用环境变量！

### 4. 上传私钥文件

在 `cloudfunctions/admin-api/` 目录下创建 `certs/` 文件夹：

```
cloudfunctions/admin-api/
├── certs/
│   └── apiclient_key.pem    # 私钥文件
├── index.js
├── package.json
└── wechat-transfer.js
```

**⚠️ 重要**：将 `certs/` 目录添加到 `.gitignore`，避免私钥泄露！

```bash
# .gitignore
cloudfunctions/admin-api/certs/
```

### 5. 更新 package.json

确保 `admin-api` 云函数包含必要的依赖：

```json
{
  "dependencies": {
    "wx-server-sdk": "~2.6.3",
    "jsonwebtoken": "^8.5.1",
    "axios": "^0.27.2"
  }
}
```

## 四、部署云函数

### 使用 CloudBase MCP 部署

```bash
# 1. 上传代码（包含私钥文件）
# 在微信开发者工具中右键 admin-api 文件夹 → 上传并部署

# 2. 配置环境变量
# 在 CloudBase 控制台配置环境变量

# 3. 配置HTTP触发器（用于转账回调通知）
# 控制台 → 函数管理 → admin-api → 触发器 → 添加触发器
```

### 使用微信开发者工具部署

1. 右键 `cloudfunctions/admin-api/` 文件夹
2. 选择 "上传并部署：云端安装依赖"
3. 等待上传完成

## 五、配置回调通知

转账完成后，微信会通过回调通知你的服务器转账结果。

### 1. 配置HTTP触发器

在 CloudBase 控制台：
```
云函数 → admin-api → 触发器管理 → 添加触发器
```

配置项：
- 触发方式：API 网关触发器
- 路径：`/wechat/transfer/notify`
- 鉴权方式：免鉴权（微信服务器需要访问）

### 2. 在 `admin-api` 中添加回调处理

在 `exports.main` 中添加回调处理逻辑：

```javascript
// 处理微信转账回调通知
if (action === 'transferNotify') {
  return await handleTransferNotify(data)
}

async function handleTransferNotify(data) {
  // 验证签名
  // 解密数据
  // 更新转账记录状态
  // 返回成功响应
}
```

## 六、测试流程

### 1. 单笔转账测试

在管理后台批准提现申请时：
1. 检查 `withdrawals` 集合中 `transferStatus` 字段
   - `processing` - 转账处理中
   - `manual` - 功能未配置，需手动转账
   - `failed` - 转账失败

2. 检查 `commission_transactions` 集合交易记录

3. 检查用户微信零钱是否到账

### 2. 查询转账状态

如果需要查询转账状态，可以调用：
```javascript
const result = await wechatTransfer.queryTransferBatch(outBatchNo);
```

## 七、常见问题

### Q1: 转账失败，提示"商户未开通该权限"
**A**: 需要先在微信支付商家平台申请开通"商家转账到零钱"产品权限。

### Q2: 转账金额 > 0.5元时失败
**A**: 转账金额超过0.5元时，必须提供用户真实姓名（需加密）。在提现申请流程中添加用户实名认证字段。

### Q3: 签名验证失败
**A**: 检查以下配置：
- 商户号是否正确
- API v3 密钥是否正确（32位）
- 证书序列号是否匹配
- 私钥文件路径是否正确

### Q4: 权限未批准期间如何处理提现？
**A**: 在权限批准前，系统会自动标记为 `transferStatus: 'manual'`，管理员可以：
1. 通过微信商户平台手动转账
2. 转账完成后手动更新 `withdrawals` 记录状态

## 八、安全注意事项

1. **私钥安全**
   - ⚠️ 永远不要将私钥提交到Git仓库
   - ⚠️ 不要在前端代码中暴露私钥
   - ⚠️ 定期更换证书和密钥

2. **签名验证**
   - 所有回调请求必须验证签名
   - 防止伪造回调通知

3. **金额校验**
   - 转账前必须验证用户余额
   - 使用数据库事务确保原子性

4. **日志记录**
   - 记录所有转账操作日志
   - 便于对账和问题排查

## 九、费用说明

| 项目 | 费用 |
|------|------|
| 申请开通 | 免费 |
| 单笔转账手续费 | 0.1% / 笔，最低 0.1 元 |
| 商家证书 | 免费 |

## 十、相关文档

- [微信支付-商家转账到零钱API文档](https://pay.weixin.qq.com/wiki/doc/apiv3/open/pay/chapter2_8_1.shtml)
- [微信支付APIv3签名规则](https://pay.weixin.qq.com/wiki/doc/apiv3/wechatpay/wechatpay4_0.shtml)
- [CloudBase云函数环境变量配置](https://docs.cloudbase.net/cloud-function/advance/env.html)

---

**部署检查清单**：

- [ ] 已开通"商家转账到零钱"权限
- [ ] 已下载商户私钥文件
- [ ] 已配置云函数环境变量
- [ ] 已上传私钥文件到服务器
- [ ] 已配置HTTP触发器（回调通知）
- [ ] 已测试转账功能
- [ ] 已将 `certs/` 目录添加到 `.gitignore`
