# 微信支付接入指南

## 概述

本文档说明如何在云开发个人版环境中配置和部署微信支付功能。

由于个人版不支持云调用支付（`cloud.cloudPay`），我们使用 **HTTP API 方式** 接入微信支付 V3 API。

---

## 前置准备

### 1. 申请微信支付商户号

1. 访问 [微信支付商户平台](https://pay.weixin.qq.com)
2. 完成商户入驻申请
3. 记录商户号（mch_id）

### 2. 关联小程序

1. 在微信支付商户平台 -> 产品中心 -> AppID账号管理
2. 添加小程序 AppID 并完成授权

### 3. 准备 API 证书

从商户平台下载以下文件：
- `apiclient_key.pem` - 商户私钥
- `apiclient_cert.pem` - 商户证书

### 4. 设置 APIv3 密钥

1. 商户平台 -> 账户中心 -> API安全
2. 设置 APIv3 密钥（32位字符串）

---

## 部署步骤

### 步骤 1：部署云函数

使用 MCP 工具部署 wechatpay 云函数：

```javascript
// 调用 createFunction 工具
{
  "functionName": "wechatpay",
  "runtime": "Nodejs16.13",
  "functionRootPath": "/Users/johnny/Desktop/小程序/perfectlifeexperience/cloudfunctions"
}
```

### 步骤 2：配置环境变量

在 CloudBase 控制台配置云函数环境变量：

| 变量名 | 说明 | 示例 |
|--------|------|------|
| `WX_PAY_MCH_ID` | 商户号 | `1234567890` |
| `WX_PAY_APP_ID` | 小程序 AppID | `wx1234567890abcdef` |
| `WX_PAY_SERIAL_NO` | 商户证书序列号 | `1234567890ABCDEF1234567890ABCDEF12345678` |
| `WX_PAY_PRIVATE_KEY` | 商户私钥（PEM 格式或 Base64） | `-----BEGIN PRIVATE KEY-----...` |
| `WX_PAY_API_V3_KEY` | APIv3 密钥 | `32位的密钥字符串` |
| `WX_PAY_NOTIFY_URL` | 支付回调地址（HTTP 触发器地址） | `https://xxx.ap-shanghai.run.tcloudbase.com/wechatpay` |

#### 获取商户证书序列号

```bash
# 使用 OpenSSL 查看
openssl x509 -in apiclient_cert.pem -noout -serial
```

#### 私钥格式处理

方式一：直接使用 PEM 格式
```
-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...
-----END PRIVATE KEY-----
```

方式二：Base64 编码
```bash
# 将私钥文件转为 Base64（去除换行）
cat apiclient_key.pem | base64 | tr -d '\n'
```

### 步骤 3：创建 HTTP 触发器

用于接收微信支付回调通知：

1. 在 CloudBase 控制台 -> 云函数 -> wechatpay -> 触发器
2. 创建 HTTP 触发器
3. 路径设置为 `/wechatpay`
4. 记录完整的触发器 URL，如：
   ```
   https://xxx.ap-shanghai.run.tcloudbase.com/wechatpay
   ```
5. 将此 URL 更新到环境变量 `WX_PAY_NOTIFY_URL`

### 步骤 4：配置回调域名

在微信支付商户平台配置回调域名：

1. 商户平台 -> 产品中心 -> 开发配置
2. 添加支付回调 URL：`https://xxx.ap-shanghai.run.tcloudbase.com`

---

## 测试验证

### 1. 测试统一下单

在小程序中测试支付：

```javascript
// 调用云函数
wx.cloud.callFunction({
  name: 'wechatpay',
  data: {
    action: 'createPayment',
    data: {
      orderId: '订单ID',
      openid: '用户openid'
    }
  },
  success: res => {
    console.log('支付参数:', res.result.data.payParams);
  }
});
```

### 2. 测试回调通知

使用微信支付提供的 [回调通知模拟工具](https://pay.weixin.qq.com/wiki/doc/apiv3/wxpay/pages/index.shtml) 测试。

### 3. 查询订单

```javascript
wx.cloud.callFunction({
  name: 'wechatpay',
  data: {
    action: 'queryOrder',
    data: {
      outTradeNo: '商户订单号'
    }
  }
});
```

---

## 常见问题

### Q: 签名验证失败

检查：
1. 私钥是否正确
2. 证书序列号是否正确
3. 时间戳是否同步

### Q: 回调通知接收不到

检查：
1. HTTP 触发器是否配置正确
2. 回调 URL 是否在商户平台白名单中
3. 云函数日志是否有错误

### Q: 支付参数调起失败

检查：
1. 小程序 AppID 是否已关联商户号
2. 用户 openid 是否正确
3. 支付金额是否有效（大于0）

---

## 安全建议

1. **私钥保护**：定期轮换 API 密钥
2. **金额校验**：回调时验证订单金额
3. **幂等处理**：避免重复处理同一笔支付
4. **日志审计**：记录关键操作日志

---

## 文件清单

```
cloudfunctions/wechatpay/
├── index.js      # 主入口
├── pay.js        # 统一下单
├── notify.js     # 回调处理
├── sign.js       # 签名工具
├── decrypt.js    # 解密工具
├── cert.js       # 证书管理
├── package.json  # 依赖配置
└── README.md     # 本文档
```
