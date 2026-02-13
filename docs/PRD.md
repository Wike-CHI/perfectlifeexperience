# 大友元气 - 精酿啤酒商城产品需求文档 (PRD)

**版本**: v1.0  
**日期**: 2026年2月8日  
**产品类型**: 垂直电商应用（精酿啤酒）  
**目标平台**: H5、微信小程序、支付宝小程序、抖音小程序、iOS/Android App

---

## 1. 产品概述

### 1.1 产品背景
大友元气是一款专注于精酿啤酒的垂直电商应用，通过 UniApp 跨平台技术实现一套代码多端运行，结合腾讯云开发（CloudBase）提供完整的后端服务支持。

### 1.2 目标用户
- **核心用户**: 25-45岁精酿啤酒爱好者
- **次要用户**: 追求品质生活的年轻消费群体
- **场景**: 日常购买、聚会用酒、探索新口味

### 1.3 核心价值主张
- 🍺 **专业精选**: 专注于精酿啤酒品类，提供专业选品
- 🛒 **便捷购买**: 完整的电商流程，支持多种支付方式
- 🎫 **优惠多样**: 优惠券、限时特惠、会员钱包等多重优惠
- 💰 **推广赚钱**: 分销推广体系，分享即赚奖励

### 1.4 技术架构

```
┌─────────────────────────────────────────────────────────────┐
│                        客户端层                             │
│  ┌──────────┬──────────┬──────────┬──────────┬──────────┐   │
│  │    H5    │ 微信小程序 │ 支付宝小程序 │ 抖音小程序 │   App   │   │
│  └──────────┴──────────┴──────────┴──────────┴──────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                     UniApp 框架层                           │
│         Vue 3 + TypeScript + Composition API                │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                    腾讯云开发 CloudBase                      │
│  ┌──────────┬──────────┬──────────┬──────────┐              │
│  │  云数据库  │  云函数   │  云存储   │ 身份认证  │              │
│  └──────────┴──────────┴──────────┴──────────┘              │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. 功能模块详细设计

### 2.1 首页模块 (pages/index/index)

#### 功能描述
应用入口页面，展示品牌形象、促销活动和核心商品。

#### 页面结构
| 区块 | 说明 | 优先级 |
|------|------|--------|
| 导航栏 | 品牌Logo「大友元气」+ 搜索入口 | P0 |
| 轮播图 | Banner广告，支持跳转商品/活动 | P0 |
| 分类入口 | 鲜啤外带、增味啤等快捷入口 | P0 |
| 限时特惠 | 倒计时促销商品展示 | P1 |
| 热门推荐 | 基于销量的商品推荐 | P0 |
| 新品上市 | 最新上架商品展示 | P1 |

#### 交互逻辑
- 下拉刷新：重新加载首页数据
- 轮播图自动播放，支持手动滑动
- 点击商品进入商品详情页
- 点击分类进入分类页并自动筛选

#### 视觉规范
- 导航栏背景色: `#1A1A1A` (墨黑)
- 主色调: `#C9A962` (琥珀金)
- 背景色: `#FAF9F7` (米白)

---

### 2.2 分类模块 (pages/category/category)

#### 功能描述
商品分类浏览，支持按类别筛选商品。

#### 页面结构
| 区块 | 说明 | 优先级 |
|------|------|--------|
| 左侧导航 | 分类列表（鲜啤外带、增味啤） | P0 |
| 右侧内容 | 当前分类下的商品列表 | P0 |
| 商品卡片 | 图片、名称、价格、销量 | P0 |

#### 商品分类
```
├── 鲜啤外带
│   ├── 飞云江小麦 (酒精含量≥5% / 麦芽浓度12°P)
│   ├── 玉海楼·皮尔森 (酒精含量≥5% / 麦芽浓度12°P)
│   ├── 晒黑浑浊IPA (酒精含量≥8.2% / 麦芽浓度19°P)
│   └── 仙浆 (酒精度8° / 麦芽浓度18°P)
│
└── 增味啤 (酒精度≥4%)
    ├── 百香果啤、番石榴啤、奶油芭乐啤
    ├── 苹果啤、草莓啤、葡萄啤
    ├── 柠檬红茶、红茶啤、乌龙茶啤
    └── 芒果啤、一桶姜山、菠萝啤
```

#### 商品规格
- **容量规格**: 500ml / 1L / 1.5L / 2.5L / 1.5L×4（整箱）
- **价格区间**: ¥14 - ¥304

---

### 2.3 商品详情模块 (pages/product/detail)

#### 功能描述
展示商品详细信息，支持规格选择和加入购物车。

#### 页面结构
| 区块 | 说明 | 优先级 |
|------|------|--------|
| 商品图片 | 轮播展示商品图片 | P0 |
| 基本信息 | 名称、英文名称、规格描述 | P0 |
| 价格展示 | 当前选中规格的价格 | P0 |
| 规格选择 | 容量规格选择器 | P0 |
| 商品详情 | 图文详情介绍 | P1 |
| 底部操作 | 客服、购物车、加入购物车、立即购买 | P0 |

#### 规格选择弹窗 (ProductSkuPopup)
- 展示商品图片和当前选中价格
- 规格选项：500ml / 1L / 1.5L / 2.5L / 1.5L×4（整箱）
- 数量选择器（+/-）
- 确认按钮

---

### 2.4 购物车模块 (pages/cart/cart)

#### 功能描述
管理用户选购的商品，支持编辑和结算。

#### 页面结构
| 区块 | 说明 | 优先级 |
|------|------|--------|
| 购物车列表 | 商品卡片列表 | P0 |
| 商品卡片 | 选择框、图片、名称、规格、价格、数量 | P0 |
| 数量编辑 | +/- 调整数量，滑出删除 | P0 |
| 底部结算 | 全选、合计金额、结算按钮 | P0 |
| 空状态 | 购物车为空时的引导 | P1 |

#### 功能逻辑
- 支持单选/全选商品
- 滑动删除商品
- 数量增减（最少1件）
- 实时计算选中商品总价
- 点击结算跳转订单确认页

#### 数据存储
- 本地存储：使用 `uni.setStorageSync` 存储购物车数据
- 数据结构：CartItem[]

---

### 2.5 订单模块

#### 2.5.1 订单确认页 (pages/order/confirm)

##### 功能描述
确认订单信息，选择收货地址和优惠券，完成下单。

##### 页面结构
| 区块 | 说明 | 优先级 |
|------|------|--------|
| 收货地址 | 默认地址或选择地址入口 | P0 |
| 商品清单 | 订单商品列表 | P0 |
| 优惠券 | 选择可用优惠券 | P1 |
| 配送方式 | 配送方式选择 | P1 |
| 订单备注 | 用户留言输入 | P2 |
| 价格明细 | 商品总额、优惠、实付金额 | P0 |
| 提交订单 | 底部固定提交按钮 | P0 |

##### 价格计算逻辑
```
商品总额 = Σ(商品单价 × 数量)
优惠金额 = 优惠券抵扣金额
实付金额 = 商品总额 - 优惠金额
```

#### 2.5.2 订单列表页 (pages/order/list)

##### 功能描述
展示用户所有订单，支持按状态筛选。

##### 订单状态
| 状态 | 说明 |
|------|------|
| 全部 | 所有订单 |
| 待付款 | 已创建未支付 |
| 待发货 | 已支付待发货 |
| 待收货 | 已发货待收货 |
| 已完成 | 订单完成 |

##### 订单卡片信息
- 订单号、订单状态
- 商品缩略图列表
- 订单金额、商品数量
- 操作按钮（支付、取消、查看物流、确认收货）

#### 2.5.3 订单详情页 (pages/order/detail)

##### 功能描述
展示订单完整信息，包括订单状态流转。

##### 页面结构
| 区块 | 说明 |
|------|------|
| 状态栏 | 当前订单状态 |
| 物流信息 | 物流公司和单号 |
| 地址信息 | 收货人、电话、地址 |
| 商品清单 | 商品详情 |
| 价格信息 | 明细和总计 |
| 订单信息 | 订单号、创建时间 |

---

### 2.6 地址管理模块

#### 2.6.1 地址列表 (pages/address/list)

##### 功能描述
管理用户收货地址，支持增删改查。

##### 功能点
- 展示所有地址列表
- 默认地址标识
- 左滑编辑/删除
- 新增地址按钮

#### 2.6.2 地址编辑 (pages/address/edit)

##### 功能描述
新增或编辑收货地址。

##### 表单字段
| 字段 | 必填 | 说明 |
|------|------|------|
| 收货人 | 是 | 姓名 |
| 手机号 | 是 | 11位手机号 |
| 所在地区 | 是 | 省市区选择 |
| 详细地址 | 是 | 街道门牌号 |
| 默认地址 | 否 | 设为默认收货地址 |

---

### 2.7 优惠券模块

#### 2.7.1 优惠券中心 (pages/coupon/index)

##### 功能描述
展示可领取的优惠券列表。

##### 优惠券类型
| 类型 | 说明 | 示例 |
|------|------|------|
| 无门槛券 | 无最低消费限制 | 新用户专享券 ¥5 |
| 满减券 | 满额减固定金额 | 满50减10 |
| 折扣券 | 按比例折扣 | 满30享8.5折 |

##### 优惠券状态
- 可领取
- 已领完
- 已领取

#### 2.7.2 我的优惠券 (pages/coupon/mine)

##### 功能描述
展示用户已领取的优惠券，按状态分类。

##### 状态分类
- 未使用
- 已使用
- 已过期

---

### 2.8 钱包模块

#### 2.8.1 我的钱包 (pages/wallet/index)

##### 功能描述
展示用户钱包余额和交易记录。

##### 页面结构
| 区块 | 说明 |
|------|------|
| 余额卡片 | 当前可用余额 |
| 充值入口 | 快速充值按钮 |
| 交易记录 | 收支明细列表 |

#### 2.8.2 充值中心 (pages/wallet/recharge)

##### 功能描述
选择充值金额并完成支付。

##### 充值选项
- 固定金额：¥50、¥100、¥200、¥500
- 自定义金额输入

---

### 2.9 推广分销模块

#### 2.9.1 推广中心 (pages/promotion/center)

##### 功能描述
展示推广员信息和收益概况。

##### 页面结构
| 区块 | 说明 |
|------|------|
| 推广海报 | 个人信息和邀请码 |
| 收益概览 | 累计收益、待结算收益 |
| 数据看板 | 今日收益、本月收益 |
| 功能入口 | 我的团队、奖励明细、推广二维码 |

#### 2.9.2 我的团队 (pages/promotion/team)

##### 功能描述
展示下级团队成员列表。

##### 团队层级
- 一级团队
- 二级团队
- 三级团队
- 四级团队

#### 2.9.3 奖励明细 (pages/promotion/rewards)

##### 功能描述
展示推广奖励记录。

##### 记录字段
- 订单信息
- 奖励金额
- 结算状态
- 时间

#### 2.9.4 推广二维码 (pages/promotion/qrcode)

##### 功能描述
生成个人推广二维码，支持分享。

---

### 2.10 用户中心模块 (pages/user/user)

#### 功能描述
个人中心入口，聚合用户相关信息和功能。

#### 页面结构
| 区块 | 说明 | 优先级 |
|------|------|--------|
| 用户信息 | 头像、昵称、会员等级 | P0 |
| 订单入口 | 订单状态快捷入口 | P0 |
| 功能列表 | 钱包、优惠券、地址、推广中心等 | P0 |
| 设置入口 | 应用设置 | P1 |

---

### 2.11 限时特惠模块 (pages/promo/promo)

#### 功能描述
展示限时促销商品，倒计时增加紧迫感。

#### 页面结构
- 活动Banner
- 倒计时组件
- 特惠商品列表（价格对比：原价 vs 特惠价）

---

### 2.12 设置模块 (pages/settings/settings)

#### 功能描述
应用设置和系统功能。

#### 功能列表
- 账号与安全
- 消息通知
- 隐私设置
- 清除缓存
- 关于我们
- 退出登录

---

## 3. 数据模型设计

### 3.1 商品 (Product)

```typescript
interface Product {
  _id: string;              // 商品ID
  name: string;             // 商品名称
  enName: string;           // 英文名称
  category: string;         // 分类
  specs: string;            // 规格描述
  prices: PriceOption[];    // 价格选项
  images: string[];         // 商品图片
  detail: string;           // 详情HTML
  isHot: boolean;           // 是否热门
  isNew: boolean;           // 是否新品
  sales: number;            // 销量
  createTime: Date;         // 创建时间
}

interface PriceOption {
  volume: string;           // 容量规格
  price: number;            // 价格（分）
}
```

### 3.2 购物车项 (CartItem)

```typescript
interface CartItem {
  _id: string;              // 购物车项ID
  productId: string;        // 商品ID
  name: string;             // 商品名称
  image: string;            // 商品图片
  specs: string;            // 选中的规格
  price: number;            // 单价（分）
  quantity: number;         // 数量
  selected: boolean;        // 是否选中
  updateTime: Date;         // 更新时间
}
```

### 3.3 订单 (Order)

```typescript
interface Order {
  _id: string;              // 订单ID
  orderNo: string;          // 订单号 DYYYYYMMDDHHMMSS
  status: OrderStatus;      // 订单状态
  items: OrderItem[];       // 订单商品
  address: Address;         // 收货地址
  couponId?: string;        // 使用的优惠券ID
  discountAmount: number;   // 优惠金额
  totalAmount: number;      // 商品总额
  payAmount: number;        // 实付金额
  remark?: string;          // 订单备注
  createTime: Date;         // 创建时间
  payTime?: Date;           // 支付时间
  shipTime?: Date;          // 发货时间
  completeTime?: Date;      // 完成时间
}

type OrderStatus = 
  | 'pending'      // 待付款
  | 'paid'         // 已付款
  | 'shipping'     // 发货中
  | 'shipped'      // 已发货
  | 'completed'    // 已完成
  | 'cancelled';   // 已取消
```

### 3.4 地址 (Address)

```typescript
interface Address {
  name: string;             // 收货人姓名
  phone: string;            // 手机号
  province: string;         // 省
  city: string;             // 市
  district: string;         // 区
  detail: string;           // 详细地址
  isDefault: boolean;       // 是否默认
}
```

### 3.5 优惠券模板 (CouponTemplate)

```typescript
interface CouponTemplate {
  _id: string;              // 模板ID
  name: string;             // 优惠券名称
  type: CouponType;         // 类型
  value: number;            // 面值/折扣
  minAmount: number;        // 最低消费
  totalCount: number;       // 总发行量
  receivedCount: number;    // 已领取数量
  limitPerUser: number;     // 每人限领
  startTime: Date;          // 开始时间
  endTime: Date;            // 结束时间
  validDays: number;        // 有效期天数
  applicableScope: string;  // 适用范围
  description: string;      // 描述
  isActive: boolean;        // 是否启用
}

type CouponType = 'amount' | 'discount' | 'no_threshold';
```

### 3.6 用户优惠券 (UserCoupon)

```typescript
interface UserCoupon {
  _id: string;              // 用户优惠券ID
  templateId: string;       // 模板ID
  status: CouponStatus;     // 状态
  receiveTime: Date;        // 领取时间
  expireTime: Date;         // 过期时间
  useTime?: Date;           // 使用时间
  orderNo?: string;         // 使用订单号
  template?: CouponTemplate; // 模板信息
}

type CouponStatus = 'unused' | 'used' | 'expired';
```

---

## 4. 云函数设计

### 4.1 云函数列表

| 云函数 | 功能 | 接口 |
|--------|------|------|
| `coupon` | 优惠券领取、查询、核销 | getTemplates, receiveCoupon, getMyCoupons |
| `wallet` | 钱包余额、充值、交易记录 | getBalance, recharge, getTransactions |
| `login` | 用户登录相关 | login, getUserInfo |
| `promotion` | 推广分销 | bindRelation, getInfo, getTeam, getRewards |
| `rewardSettlement` | 奖励结算 | calculateReward, settlement |
| `initData` | 数据初始化 | initProducts, initCoupons |
| `hello` | 示例云函数 | hello |

### 4.2 云函数通用响应格式

```typescript
interface CloudFunctionResult<T> {
  code: number;           // 0 成功，其他失败
  msg: string;            // 消息
  data?: T;               // 数据
}
```

---

## 5. UI/UX 设计规范

### 5.1 色彩系统

```css
/* 主色调 - 墨黑系列 */
--primary-black: #1A1A1A;    /* 导航栏背景 */
--ink-wash: #2C2C2C;         /* 次级背景 */
--charcoal: #4A4A4A;         /* 深灰文字 */

/* 强调色 - 金棕系列 */
--amber-gold: #C9A962;       /* 主品牌色 */
--amber-light: #D4B978;      /* 高亮 */
--amber-dark: #B8984A;       /* 深色 */

/* 背景色 - 米白系列 */
--paper-white: #FAF9F7;      /* 页面背景 */
--warm-beige: #F5F0E8;       /* 卡片背景 */
--cream: #FDFBF7;            /* 纯白 */

/* 功能色 */
--cinnabar: #B54A3F;         /* 错误/警告 */
--jade-green: #5B7A6E;       /* 成功 */

/* 文字色 */
--text-primary: #1A1A1A;     /* 主文字 */
--text-secondary: #4A4A4A;   /* 次级文字 */
--text-tertiary: #666666;    /* 辅助文字 */
--text-muted: #999999;       /* 禁用文字 */
```

### 5.2 字体规范

- **主字体**: `-apple-system, BlinkMacSystemFont, 'PingFang SC', 'Helvetica Neue', sans-serif`
- **标题**: 32-36rpx, font-weight: 600
- **正文**: 28rpx, font-weight: 400
- **辅助文字**: 24rpx, font-weight: 400

### 5.3 间距系统

| 名称 | 值 | 用途 |
|------|-----|------|
| xs | 8rpx | 紧凑间距 |
| sm | 16rpx | 小组件间距 |
| md | 24rpx | 标准间距 |
| lg | 32rpx | 大组件间距 |
| xl | 48rpx | 区块间距 |

### 5.4 按钮样式

```css
/* 主按钮 */
.btn-primary {
  background: linear-gradient(135deg, #C9A962 0%, #B8984A 100%);
  color: white;
  border-radius: 40rpx;
  box-shadow: 0 4rpx 16rpx rgba(201, 169, 98, 0.3);
}

/* 次按钮 */
.btn-secondary {
  background: #F5F0E8;
  color: #1A1A1A;
  border: 2rpx solid rgba(201, 169, 98, 0.3);
}
```

---

## 6. 技术实现规范

### 6.1 前端技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| UniApp | 3.0.0+ | 跨平台框架 |
| Vue | 3.4.21 | 前端框架 |
| TypeScript | 4.9+ | 类型系统 |
| Vite | 5.2+ | 构建工具 |
| @cloudbase/js-sdk | latest | 云开发SDK |

### 6.2 目录结构

```
src/
├── components/           # 公共组件
│   └── ProductSkuPopup.vue
├── pages/               # 主页面
│   ├── index/           # 首页
│   ├── category/        # 分类
│   ├── cart/            # 购物车
│   ├── user/            # 个人中心
│   ├── product/         # 商品分包
│   ├── order/           # 订单分包
│   ├── address/         # 地址分包
│   ├── wallet/          # 钱包分包
│   ├── coupon/          # 优惠券分包
│   └── promotion/       # 推广分包
├── utils/               # 工具函数
│   ├── api.ts           # API封装（调用云函数）
│   ├── cloudbase.ts     # 云开发配置
│   └── index.ts         # 通用工具
├── static/              # 静态资源
│   ├── img/            # 图片
│   └── tabbar/         # TabBar图标
├── types/               # 类型定义
├── App.vue              # 应用入口
├── main.ts              # 入口文件
├── pages.json           # 页面路由
└── manifest.json        # 应用配置
```

### 6.3 页面路由配置

```json
{
  "pages": [
    { "path": "pages/index/index" },
    { "path": "pages/category/category" },
    { "path": "pages/cart/cart" },
    { "path": "pages/user/user" }
  ],
  "subPackages": [
    { "root": "pages/product", "pages": [{"path": "detail"}] },
    { "root": "pages/order", "pages": [{"path": "list"}, {"path": "detail"}, {"path": "confirm"}] },
    { "root": "pages/address", "pages": [{"path": "list"}, {"path": "edit"}] },
    { "root": "pages/wallet", "pages": [{"path": "index"}, {"path": "recharge"}] },
    { "root": "pages/coupon", "pages": [{"path": "index"}, {"path": "mine"}] },
    { "root": "pages/promotion", "pages": [{"path": "center"}, {"path": "team"}, {"path": "rewards"}, {"path": "qrcode"}] }
  ]
}
```

### 6.4 API 接口规范

所有API接口统一封装在 `src/utils/api.ts` 中：

```typescript
// 商品相关
export const getProducts = async (params?) => {...}
export const getProductDetail = async (id) => {...}

// 购物车相关
export const getCartItems = async () => {...}
export const addToCart = async (item) => {...}

// 订单相关
export const createOrder = async (order) => {...}
export const getOrders = async (status?) => {...}

// 优惠券相关
export const getCouponTemplates = async () => {...}
export const receiveCoupon = async (templateId) => {...}

// 钱包相关
export const getWalletBalance = async () => {...}
export const rechargeWallet = async (amount) => {...}

// 推广相关
export const getPromotionInfo = async () => {...}
export const bindPromotionRelation = async (code, userInfo) => {...}
```

---

## 7. 多端适配说明

### 7.1 支持平台

| 平台 | 状态 | 适配说明 |
|------|------|----------|
| H5 | ✅ 完全支持 | 响应式设计，支持PWA |
| 微信小程序 | ✅ 完全支持 | 已配置域名白名单 |
| 支付宝小程序 | ✅ 完全支持 | 已配置域名白名单 |
| 抖音小程序 | ✅ 完全支持 | 已配置域名白名单 |
| iOS/Android App | ✅ 完全支持 | 需 HBuilderX 打包 |

### 7.2 平台差异处理

```typescript
// 条件编译示例
// #ifdef H5
// H5特有代码
// #endif

// #ifdef MP-WEIXIN
// 微信小程序特有代码
// #endif

// #ifdef APP-PLUS
// App特有代码
// #endif
```

---

## 8. 安全与性能

### 8.1 安全措施

- **数据存储**: 敏感数据（token、用户信息）本地加密存储
- **云函数鉴权**: 所有云函数验证用户登录态
- **支付安全**: 使用平台官方支付SDK，不存储支付敏感信息
- **防刷机制**: 推广绑定限制设备指纹

### 8.2 性能优化

- **图片优化**: 使用 CDN + 懒加载
- **代码分包**: 按功能模块分包加载
- **数据缓存**: 合理使用本地存储
- **列表优化**: 虚拟滚动、分页加载

---

## 9. 开发计划

### 9.1 已完成功能 ✅

- [x] 首页轮播、分类、商品展示
- [x] 分类浏览和筛选
- [x] 商品详情和规格选择
- [x] 购物车管理
- [x] 订单创建和列表
- [x] 地址管理
- [x] 优惠券领取和使用
- [x] 钱包余额和充值
- [x] 推广分销体系
- [x] 用户中心

### 9.2 待开发功能 📋

- [ ] 在线支付集成（微信支付、支付宝）
- [ ] 物流跟踪
- [ ] 商品评价
- [ ] 客服系统
- [ ] 会员等级体系
- [ ] 积分系统
- [ ] 数据分析后台

---

## 10. 附录

### 10.1 术语表

| 术语 | 说明 |
|------|------|
| UniApp | DCloud 跨平台应用开发框架 |
| CloudBase | 腾讯云开发，Serverless 后端服务 |
| 云函数 | CloudBase 提供的无服务器函数计算服务 |
| 分包加载 | 小程序将页面分包，降低首包体积 |

### 10.2 参考资料

- [UniApp 官方文档](https://uniapp.dcloud.io/)
- [云开发官方文档](https://cloud.tencent.com/document/product/876)
- [CloudBase JS SDK](https://docs.cloudbase.net/api-reference/webv3/initialization)

### 10.3 更新日志

| 版本 | 日期 | 变更内容 |
|------|------|----------|
| v1.0 | 2026-02-08 | 初始版本，完整PRD文档 |

---

**文档结束**

> 本 PRD 由 AI 自动生成，基于对项目的完整扫描和分析。
