# 🍺 大友元气 - 精酿啤酒商城

基于 UniApp 和腾讯云开发（CloudBase）的精酿啤酒电商应用，已适配 **H5** 、**微信小程序** 、**支付宝小程序** 、**抖音小程序** 以及 **App (iOS/Android)**。

[![Powered by CloudBase](https://7463-tcb-advanced-a656fc-1257967285.tcb.qcloud.la/mcp/powered-by-cloudbase-badge.svg)](https://github.com/TencentCloudBase/CloudBase-AI-ToolKit)

> 本项目基于 [**CloudBase AI ToolKit**](https://github.com/TencentCloudBase/CloudBase-AI-ToolKit) 开发，通过AI提示词和 MCP 协议+云开发，让开发更智能、更高效。

---

## ✨ 项目特点

- 🚀 **多端适配**：基于 UniApp 构建，一套代码多端运行
- 🍺 **精酿主题**：专注于精酿啤酒的垂直电商应用
- 🛒 **完整电商流程**：商品展示、购物车、订单、支付全流程
- 🎫 **营销功能**：优惠券中心、限时特惠、会员钱包
- ⚡ **Vue 3 + TypeScript**：现代化技术栈，Composition API 开发
- 🔧 **深度集成 CloudBase**：云开发一站式后端服务
- 📱 **完整多端支持**：H5、微信小程序、支付宝小程序、抖音小程序、App

---

## 📱 各平台展示

| H5 端 | 微信小程序 |
|:---:|:---:|
| ![H5](https://qcloudimg.tencent-cloud.cn/raw/cec528e3e0d4dddadff11c66a11013cc.png) | ![微信小程序](https://qcloudimg.tencent-cloud.cn/raw/826666e480af55c2c886ffa1a451dea8.png) |

| 支付宝小程序 | 抖音小程序 |
|:---:|:---:|
| ![支付宝](https://qcloudimg.tencent-cloud.cn/raw/5fa5a46ae73b325bb1199b7e4059e480.png) | ![抖音](https://qcloudimg.tencent-cloud.cn/raw/c4750c695aa81dab6cd3ef2de0aee8f0.png) |

| Android & iOS |
|:---:|
| <img src="https://qcloudimg.tencent-cloud.cn/raw/34cb2e31c0a667caf8396a2b12c87c94.jpg" width="50%"/> |

---

## 🏗️ 项目架构

### 前端架构

| 技术 | 说明 |
|------|------|
| **UniApp** | 跨平台应用开发框架 |
| **Vue 3** | Composition API 开发模式 |
| **TypeScript** | 完整类型支持 |
| **Vite** | 下一代构建工具 |
| **CloudBase JS SDK** | 腾讯云开发 SDK |

### 云开发资源

- **身份认证**：用户登录和身份验证
- **云数据库**：存储商品、订单、用户数据
- **云函数**：业务逻辑实现（5个云函数）
- **云存储**：商品图片、用户头像等文件存储
- **静态网站托管**：H5 版本部署

---

## 📁 目录结构

```
├── src/
│   ├── components/                # 公共组件
│   │   └── ProductSkuPopup.vue   # 商品规格选择弹窗
│   ├── pages/                     # 主页面
│   │   ├── index/                 # 首页 - 轮播、分类、促销
│   │   ├── category/              # 分类页 - 商品分类浏览
│   │   ├── cart/                  # 购物车
│   │   ├── user/                  # 个人中心
│   │   ├── promo/                 # 限时特惠
│   │   └── settings/              # 设置页面
│   ├── pages/product/             # 分包 - 商品相关
│   │   └── detail.vue            # 商品详情
│   ├── pages/order/               # 分包 - 订单相关
│   │   ├── list.vue              # 订单列表
│   │   ├── detail.vue            # 订单详情
│   │   └── confirm.vue           # 确认订单
│   ├── pages/address/             # 分包 - 地址管理
│   │   ├── list.vue              # 地址列表
│   │   └── edit.vue              # 编辑地址
│   ├── pages/wallet/              # 分包 - 钱包
│   │   ├── index.vue             # 我的钱包
│   │   └── recharge.vue          # 充值中心
│   ├── pages/coupon/              # 分包 - 优惠券
│   │   ├── index.vue             # 优惠券中心
│   │   └── mine.vue              # 我的优惠券
│   ├── utils/                     # 工具函数
│   │   ├── cloudbase.ts          # 云开发配置
│   │   ├── api.ts                # API 接口封装（调用云函数）
│   │   └── index.ts              # 通用工具
│   ├── static/                    # 静态资源
│   │   ├── img/                  # 图片资源
│   │   └── tabbar/               # TabBar 图标
│   ├── App.vue                    # 应用入口
│   ├── main.ts                    # 入口文件
│   ├── pages.json                 # 页面路由配置
│   └── manifest.json              # 应用配置
├── cloudfunctions/                # 云函数
│   ├── coupon/                   # 优惠券相关
│   ├── hello/                    # 示例云函数
│   ├── initData/                 # 数据初始化
│   ├── login/                    # 登录相关
│   ├── product/                  # 商品相关
│   └── wallet/                   # 钱包相关
├── vite.config.ts                 # Vite 配置
├── tsconfig.json                  # TypeScript 配置
└── package.json                   # 项目依赖
```

---

## 🚀 开始使用

### 环境要求

- Node.js 16+
- 腾讯云开发账号

### 安装依赖

```bash
npm install
```

### 配置云开发环境

编辑 `src/utils/cloudbase.ts`，将 `ENV_ID` 替换为您的云开发环境 ID：

```typescript
const ENV_ID = 'your-env-id'; // 替换为您的环境ID
```

### 云开发控制台配置

#### 1. 开启登录认证

在 [云开发控制台 - 身份认证](https://tcb.cloud.tencent.com) 中开启：
- ✅ 匿名登录
- ✅ 微信小程序 openId 登录

#### 2. 配置安全域名（H5）

在【环境配置】->【安全来源】中添加：
- `http://localhost:5173`（本地开发）
- 您的生产域名

#### 3. 配置小程序域名

在微信小程序后台【开发设置】->【服务器域名】中配置：

```
request 合法域名:
https://tcb-api.tencentcloudapi.com
https://your-env-id.service.tcloudbase.com

uploadFile 合法域名:
https://cos.ap-shanghai.myqcloud.com

downloadFile 合法域名:
https://your-env-id.tcb.qcloud.la
https://cos.ap-shanghai.myqcloud.com
```

---

## 🔧 开发命令

```bash
# H5 开发
npm run dev:h5

# 微信小程序开发
npm run dev:mp-weixin

# 抖音小程序开发
npm run dev:mp-toutiao

# 支付宝小程序开发
npm run dev:mp-alipay

# App 开发（使用 HBuilderX）
# 运行 -> 运行到手机或模拟器
```

### 构建生产版本

```bash
# 构建 H5
npm run build:h5

# 构建微信小程序
npm run build:mp-weixin

# 构建抖音小程序
npm run build:mp-toutiao

# 构建支付宝小程序
npm run build:mp-alipay
```

---

## 🍺 核心功能

### 商品模块
- 首页轮播图展示
- 商品分类浏览
- 商品详情（规格选择）
- 限时特惠专区

### 购物车模块
- 添加/删除商品
- 规格选择
- 数量调整
- 全选/单选结算

### 订单模块
- 订单确认
- 地址选择
- 订单列表
- 订单详情

### 优惠券模块
- 优惠券中心（领券）
- 我的优惠券
- 订单抵扣

### 钱包模块
- 余额查看
- 充值功能

### 用户模块
- 个人信息
- 收货地址管理
- 设置页面

---

## 📦 云函数说明

| 云函数 | 功能 |
|--------|------|
| `coupon` | 优惠券领取、查询、核销 |
| `wallet` | 余额查询、充值记录 |
| `login` | 用户登录相关 |
| `initData` | 初始化商品数据 |
| `hello` | 示例云函数 |

---

## 📋 产品数据

本项目包含完整的精酿啤酒菜单数据：

### 鲜啤外带
- 飞云江小麦 - 酒精含量≥5% / 麦芽浓度12°P
- 玉海楼·皮尔森 - 酒精含量≥5% / 麦芽浓度12°P
- 晒黑浑浊IPA - 酒精含量≥8.2% / 麦芽浓度19°P
- 仙浆 - 酒精度8° / 麦芽浓度18°P

### 增味啤
- 百香果啤、番石榴啤、奶油芭乐啤
- 苹果啤、草莓啤、葡萄啤
- 柠檬红茶、红茶啤、乌龙茶啤
- 芒果啤、一桶姜山、菠萝啤

---

## 🚀 部署指南

### 部署云函数

```bash
# 使用 CloudBase CLI
tcb functions:deploy coupon
tcb functions:deploy wallet
tcb functions:deploy login
```

### 部署 H5 到静态托管

```bash
# 1. 构建
npm run build:h5

# 2. 上传 dist/build/h5 到云开发静态网站托管
```

### 小程序发布

```bash
# 1. 构建
npm run build:mp-weixin

# 2. 微信开发者工具打开 dist/build/mp-weixin
# 3. 上传代码并提交审核
```

---

## ✅ 平台适配状态

| 平台 | 状态 | 说明 |
|------|------|------|
| H5 | ✅ 完全支持 | 本地开发 + 生产部署 |
| 微信小程序 | ✅ 完全支持 | 已配置域名白名单 |
| 支付宝小程序 | ✅ 完全支持 | 已配置域名白名单 |
| 抖音小程序 | ✅ 完全支持 | 已配置域名白名单 |
| App (iOS/Android) | ✅ 完全支持 | 需 HBuilderX 打包 |

---

## 🔗 相关链接

- [UniApp 官方文档](https://uniapp.dcloud.io/)
- [云开发官方文档](https://cloud.tencent.com/document/product/876)
- [云开发 JS SDK](https://docs.cloudbase.net/api-reference/webv3/initialization)
- [CloudBase AI ToolKit](https://github.com/TencentCloudBase/CloudBase-AI-ToolKit)

---

## 📝 许可证

MIT License
