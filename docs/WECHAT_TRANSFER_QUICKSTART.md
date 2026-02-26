# 微信商家转账快速开始

## 🚀 5分钟快速部署

### 步骤1：申请权限（3-7个工作日）

1. 登录 https://pay.weixin.qq.com/
2. 进入 **产品中心** → **我的产品** → **签约产品**
3. 找到 **商家转账到零钱** → 点击申请
4. 填写资料：
   - 转账场景：推广佣金提现
   - 预估月转账笔数：根据实际情况填写
5. 等待审核通过

### 步骤2：获取API参数（5分钟）

在微信支付商家平台获取：

| 参数 | 获取位置 |
|------|----------|
| 商户号 | 账户中心 → 商户信息 |
| 证书序列号 | 账户中心 → API安全 → 证书管理 |
| API v3 密钥 | 账户中心 → API安全 → 设置API密钥 → 设置APIv3密钥 |

**下载证书**：
```
账户中心 → API安全 → 证书管理 → 申请证书 → 下载
```
下载后得到 `apiclient_key.pem` 文件（私钥）

### 步骤3：配置云函数（5分钟）

#### 3.1 上传私钥文件

在 `cloudfunctions/admin-api/` 下创建 `certs/` 文件夹：
```
cloudfunctions/admin-api/certs/apiclient_key.pem
```

#### 3.2 配置环境变量

登录 [CloudBase控制台](https://tcb.cloud.tencent.com/)：

1. 进入 **云函数** → **admin-api** → **配置** → **环境变量**
2. 添加以下变量：

```bash
WX_PAY_MCH_ID=你的商户号
WX_PAY_SERIAL_NO=你的证书序列号
WX_PAY_API_V3_KEY=你的APIv3密钥(32位)
WX_PAY_APPID=你的小程序AppID
```

### 步骤4：部署测试（2分钟）

1. 右键 `cloudfunctions/admin-api/` → **上传并部署：云端安装依赖**
2. 等待部署完成
3. 在管理后台批准一个提现申请
4. 检查转账状态

### 步骤5：验证结果

查看 `withdrawals` 集合中的记录：
- `transferStatus: 'processing'` - 转账中，等待微信处理
- `transferStatus: 'manual'` - 功能未配置，需检查配置
- `transferStatus: 'failed'` - 转账失败，查看 `transferError` 字段

---

## ❓ 常见问题

### Q: 转账功能还没批准，现在怎么办？
**A**: 系统会自动标记为需手动转账。管理员可以在微信商户平台手动转账，然后更新状态。

### Q: 提示 "wechat-transfer.js not found"
**A**: 确保已创建 `cloudfunctions/admin-api/wechat-transfer.js` 文件并重新部署。

### Q: 转账金额 > 0.5元 失败？
**A**: 需要提供用户真实姓名。需要在前端提现流程中添加实名认证。

---

## 📝 完整文档

详细配置说明请查看：[WECHAT_TRANSFER_SETUP.md](./WECHAT_TRANSFER_SETUP.md)
