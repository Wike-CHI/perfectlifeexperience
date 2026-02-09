---
name: deploy-cloudbase-resources
overview: 部署云函数、创建数据库集合并同步本地商品数据到云端
todos:
  - id: deploy-cloudfunctions
    content: 使用[tcb]部署7个云函数（login, wallet, coupon, promotion, rewardSettlement, hello, initData）
    status: completed
  - id: create-collections
    content: 使用[tcb]创建9个数据库集合（categories, products, users, orders, coupons, user_coupons, promotions, wallets, wallet_transactions）
    status: completed
  - id: sync-menu-data
    content: 使用[tcb]同步本地menu_data.json商品数据到云端categories和products集合
    status: completed
    dependencies:
      - create-collections
  - id: verify-deployment
    content: 验证所有云函数状态和数据库集合数据完整性
    status: completed
    dependencies:
      - deploy-cloudfunctions
      - create-collections
      - sync-menu-data
---

## 产品概述

精酿啤酒小程序后端云开发环境完整部署，包含云函数部署、数据库集合创建和商品数据同步。

## 核心功能

1. **云函数部署**: 部署7个云函数（login, wallet, coupon, promotion, rewardSettlement, hello, initData），支持用户登录、钱包管理、优惠券、推广系统和奖励结算
2. **数据库集合创建**: 创建9个集合（categories, products, users, orders, coupons, user_coupons, promotions, wallets, wallet_transactions），存储商品、用户、订单、优惠券和钱包数据
3. **商品数据同步**: 将本地menu_data.json中的"鲜啤外带"和"增味啤"两类商品数据同步到云端categories和products集合
4. **部署验证**: 验证所有云函数和数据库集合状态，确保服务可用

## 技术栈

- **云开发平台**: CloudBase（腾讯云云开发）
- **云函数运行时**: Node.js（wx-server-sdk / @cloudbase/node-sdk）
- **数据库**: CloudBase NoSQL 文档数据库
- **部署工具**: CloudBase CLI / MCP工具

## 实现方案

### 架构设计

采用CloudBase云开发架构，所有后端逻辑通过云函数实现，数据存储使用NoSQL文档数据库：

- **login**: 微信小程序登录，获取用户OpenID
- **wallet**: 钱包余额查询、充值、交易记录
- **coupon**: 优惠券模板管理、领取、使用
- **promotion**: 推广关系绑定、奖励计算、团队管理
- **rewardSettlement**: 定时奖励结算、防刷检测
- **initData**: 商品数据初始化
- **hello**: 健康检查示例函数

### 数据库集合设计

| 集合名 | 用途 |
| --- | --- |
| categories | 商品分类 |
| products | 商品信息 |
| users | 用户信息（含推广关系） |
| orders | 订单数据 |
| coupons | 优惠券模板 |
| user_coupons | 用户已领优惠券 |
| promotions | 推广活动 |
| wallets | 用户钱包 |
| wallet_transactions | 钱包交易记录 |


### 数据同步策略

从`src/data/menu_data.json`读取商品数据，转换为云端数据格式后批量写入categories和products集合。

## 目录结构

```
cloudfunctions/
├── login/              # [DEPLOY] 登录云函数
│   ├── index.js
│   └── package.json
├── wallet/             # [DEPLOY] 钱包云函数
│   ├── index.js
│   └── package.json
├── coupon/             # [DEPLOY] 优惠券云函数
│   ├── index.js
│   └── package.json
├── promotion/          # [DEPLOY] 推广云函数
│   ├── index.js
│   └── package.json
├── rewardSettlement/   # [DEPLOY] 奖励结算云函数
│   ├── index.js
│   └── package.json
├── initData/           # [DEPLOY] 数据初始化云函数
│   ├── index.js
│   └── package.json
└── hello/              # [DEPLOY] 示例云函数
    ├── index.js
    └── package.json

src/data/
└── menu_data.json      # [READ] 商品数据源
```

## Agent Extensions

### Integration

- **tcb**: CloudBase云开发平台集成，用于云函数部署、数据库集合创建和数据操作
- Purpose: 部署7个云函数到CloudBase环境，创建9个数据库集合，同步商品数据
- Expected outcome: 所有云函数成功部署并处于Active状态，数据库集合创建完成，商品数据成功写入