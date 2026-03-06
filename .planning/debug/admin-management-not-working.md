---
status: completed
trigger: "管理端无法修改数据：除了佣金分成和分类图标外，还有更多硬编码问题"
created: "2026-03-04"
updated: "2026-03-05"
---

## 修复总结

### ✅ 已完成的修复

1. **首页轮播图硬编码** - 已修复
   - 修改 `cloudfunctions/product/index.js` - getHomePageData 添加 banners 查询
   - 修改 `src/pages/index/index.vue` - 使用接口返回的 banners 数据

2. **充值配置硬编码** - 已修复
   - 修改 `src/utils/api.ts` - 添加 getSystemConfig/updateSystemConfig 接口
   - 修改 `src/config/recharge.ts` - 支持从数据库读取配置
   - 修改 `src/pages/index/index.vue` - 加载充值配置
   - 修改 `src/pages/wallet/recharge.vue` - 加载充值配置
   - 修改 `src/pagesAdmin/settings/config.vue` - 添加充值档位配置管理

3. **推广升级条件硬编码** - 已修复
   - 修改 `cloudfunctions/promotion/index.js` - 添加 getPromotionThresholdWithConfig 函数
   - 修改晋升检查逻辑使用动态配置

### 🔲 需要部署的云函数

- **product 云函数** - 重新部署以支持 banners 数据返回
- **promotion 云函数** - 重新部署以支持动态升级条件

### 📝 使用说明

1. 登录管理端，进入"系统设置"页面
2. 可以配置：
   - 佣金比例
   - 晋升阈值
   - 充值档位（新增）
   - 提现设置
3. 保存后，小程序将使用新配置

### 向后兼容性

所有修改都保持了向后兼容：
- 如果数据库中没有配置，将使用硬编码默认值
- 已有的配置不会因为升级而丢失

---

## 新发现的硬编码问题汇总

### 问题1: 首页轮播图硬编码 [高优先级]

**文件**: `src/pages/index/index.vue`
**位置**: 第321-346行

```javascript
const banners = ref<Banner[]>([
  {
    image: CDN_IMAGES.gallery02,
    title: '精酿啤酒节',
    subtitle: '限时特惠 全场8折起',
    link: '/pages/promo/promo',
    sort: 1,
    isActive: true
  },
  // ... 共3个硬编码banner
]);
```

**问题说明**:
- product 云函数的 getHomePageData 不返回 banners 数据
- 前端完全使用硬编码的 banners，不从数据库读取

**数据库对应**:
- 集合: `banners`
- 管理端已有 banner 管理页面 (pagesAdmin/banners/)

**修复方案**:
1. 修改 product 云函数 getHomePageData 添加 banners 查询
2. 修改首页 index.vue 从 API 获取 banners 而非硬编码

---

### 问题2: 充值配置硬编码 [高优先级]

**文件**: `src/config/recharge.ts`
**位置**: 第16-21行

```javascript
export const rechargeOptions: RechargeOption[] = [
  { amount: 200, gift: 10 },
  { amount: 500, gift: 35 },
  { amount: 1000, gift: 80 },
  { amount: 2000, gift: 200 }
];
```

**问题说明**:
- 充值档位在前端代码中完全硬编码
- 管理端无充值配置管理页面

**数据库对应**:
- 无对应集合（需要新建 `recharge_config` 或使用 `system_config`）

**修复方案**:
1. 在 system_config 集合添加充值配置项
2. 修改前端从 API 获取充值配置
3. 或创建充值配置管理页面

---

### 问题3: 推广升级条件硬编码 [中优先级]

**文件**: `cloudfunctions/promotion/common/constants.js`
**位置**: 第153-170行

```javascript
const PromotionThreshold = {
  LEVEL_4_TO_3: {
    totalSales: 200000      // 累计销售额 >= 2万元（分）
  },
  LEVEL_3_TO_2: {
    monthSales: 500000,     // 本月销售额 >= 5万元（分）
    teamCount: 50            // 或团队人数 >= 50人
  },
  LEVEL_2_TO_1: {
    monthSales: 1000000,    // 本月销售额 >= 10万元（分）
    teamCount: 200           // 或团队人数 >= 200人
  }
};
```

**问题说明**:
- 升级门槛在云函数中硬编码
- 管理端无升级条件配置页面

**数据库对应**:
- 可使用 `system_config` 集合

**修复方案**:
1. 修改 promotion 云函数从数据库读取升级条件
2. 使用默认值保持向后兼容
3. 或创建推广配置管理页面

---

### 问题4: 分类图标映射硬编码 [低优先级]

**文件**: `src/components/CategoryIcon.vue`
**位置**: 约第30-45行

```javascript
const iconMap: Record<string, 'beer' | 'cocktail'> = {
  '鲜啤外带': 'beer',
  '增味啤': 'cocktail'
};
```

**问题说明**:
- 分类数据从数据库动态获取
- 但图标类型是硬编码映射

**修复方案**:
- 在 categories 集合添加 icon 字段存储图标类型

---

### 问题5: 佣金分成比例 [已修复]

**文件**: `cloudfunctions/promotion/index.js`
**状态**: ✅ 已修复，从数据库读取配置

---

## Evidence

- timestamp: "2026-03-05"
  checked: "src/pages/index/index.vue"
  found: "banners 数组硬编码在第321-346行，共3个固定banner"
  implication: "首页轮播图无法通过管理端修改"

- timestamp: "2026-03-05"
  checked: "cloudfunctions/product/index.js getHomePageData函数"
  found: "返回数据只有 hotProducts, newProducts, topSalesProducts，不包含banners"
  implication: "product云函数没有查询banners数据"

- timestamp: "2026-03-05"
  checked: "src/config/recharge.ts"
  found: "rechargeOptions 数组硬编码4个充值档位"
  implication: "充值档位无法通过管理端修改"

- timestamp: "2026-03-05"
  checked: "cloudfunctions/promotion/common/constants.js"
  found: "PromotionThreshold 对象硬编码升级条件"
  implication: "推广升级条件无法通过管理端修改"

---

## 待调查

- [x] 检查 system_config 集合的字段结构 - 可以存储任意配置字段
- [ ] 检查是否有其他业务配置硬编码
- [x] 确认哪些修复优先级最高

---

## 修复优先级建议

### 第一优先级（用户最常修改）

| 序号 | 问题 | 修复难度 | 用户影响 |
|------|------|----------|----------|
| 1 | 首页轮播图硬编码 | 低 | 高 - 无法做营销活动 |
| 2 | 充值配置硬编码 | 中 | 高 - 无法调整活动力度 |

### 第二优先级（业务配置）

| 序号 | 问题 | 修复难度 | 用户影响 |
|------|------|----------|----------|
| 3 | 推广升级条件硬编码 | 中 | 中 - 调整业务策略 |
| 4 | 分类图标映射 | 低 | 低 - 美观问题 |

---

## 修复方案概要

### 修复1: 首页轮播图动态化

1. **修改 product 云函数** (`cloudfunctions/product/index.js`)
   - 在 getHomePageData 中添加 banners 查询
   ```javascript
   const bannersResult = await db.collection('banners')
     .where({ isActive: true })
     .orderBy('sort', 'asc')
     .get();
   ```

2. **修改首页** (`src/pages/index/index.vue`)
   - 删除硬编码的 banners 数组
   - 从 homeData.banners 获取数据

### 修复2: 充值配置动态化

1. **方案A**: 在 system_config 集合添加 rechargeOptions 字段
2. **创建前端 API**: 添加 getRechargeConfig 接口
3. **修改前端**: 从 API 读取配置

### 修复3: 推广升级条件动态化

1. **修改 promotion 云函数**
   - 在 constants.js 添加 getPromotionThreshold 函数
   - 从 system_config 读取配置，无则使用默认值

---

## 当前状态

**状态**: 调查完成，待用户确认修复优先级

