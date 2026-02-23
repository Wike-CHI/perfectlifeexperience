# 推广体系场景模拟器 - 设计文档

**项目**: 大友元气精酿啤酒推广体系
**日期**: 2026-02-23
**状态**: 设计阶段

---

## 1. 项目概述

### 1.1 目标
为推广体系创建一个场景模拟器，帮助推广员和管理层理解佣金分配规则、升级路径和推荐关系变化对收益的影响。

### 1.2 目标用户
- **推广员/代理**: 理解佣金分配规则和升级收益
- **公司管理层/运营**: 测试不同场景下的成本和收益分配

### 1.3 部署平台
- 小程序内部，作为推广中心的一个功能页面

---

## 2. 架构设计

### 2.1 整体架构

```
小程序界面 → 用户设置参数 → promotion-simulator云函数 → 返回模拟结果 → 界面展示
```

### 2.2 技术方案
采用**独立的模拟云函数**方案（方案C），原因：
- 支持各种假设场景测试（如修改佣金比例）
- 可以测试边界情况
- 不影响生产环境

---

## 3. 功能模块

### 3.1 快速场景（预设场景）

| 场景名称 | 描述 |
|---------|------|
| 一级推广（金牌独拿） | 展示20元佣金全归一级代理 |
| 二级推广（2人分） | 12元+8元的分配 |
| 三级推广（3人分） | 12元+4元+4元的分配 |
| 四级推广（4人分） | 8元+4元+4元+4元的分配 |
| 下级升级场景 | 展示升级前后的佣金变化 |

### 3.2 自定义模拟

**输入参数：**
- 订单金额设置
- 推广链构建（动态添加/删除层级）
- 每层设置：代理层级、星级、名称
- 复购标识
- 导师关系

### 3.3 升级路径模拟

- 业绩进度输入
- 目标等级选择
- 升级后佣金对比
- 下级脱离影响分析

### 3.4 结果展示

- 佣金分配明细（表格）
- 升级前后对比
- 可视化图表（饼图/柱状图）

---

## 4. 数据结构

### 4.1 模拟请求参数

```typescript
interface SimulationRequest {
  mode: 'preset' | 'custom';
  presetScenario?: 'level1' | 'level2' | 'level3' | 'level4' | 'upgrade';
  customConfig?: {
    orderAmount: number;        // 订单金额（元）
    isRepurchase: boolean;      // 是否复购
    promotionChain: Array<{
      agentLevel: 1 | 2 | 3 | 4;  // 代理层级
      starLevel: 0 | 1 | 2 | 3;    // 星级
      name: string;                 // 代理名称（可选）
    }>;
    mentorId?: string;         // 育成导师ID（可选）
  };
}
```

### 4.2 模拟响应结果

```typescript
interface SimulationResult {
  orderAmount: number;
  companyProfit: number;
  commissionPool: number;
  distribution: Array<{
    name: string;
    agentLevel: number;
    starLevel: number;
    commissions: {
      basic: number;       // 基础佣金
      repurchase?: number; // 复购奖励
      management?: number; // 团队管理奖
      nurture?: number;    // 育成津贴
    };
    total: number;
  }>;
  summary: {
    totalCommission: number;
    payoutRatio: number;  // 总拨出比例
  };
}
```

---

## 5. UI界面设计

### 5.1 页面结构

选项卡切换模式：

**选项卡1：快速场景**
- 卡片式布局展示5个预设场景
- 点击后显示详细的模拟结果

**选项卡2：自定义模拟**
- 表单区域：订单金额、复购开关、推广链编辑器
- "开始模拟"按钮
- 结果展示区域

**选项卡3：升级路径**
- 当前业绩输入
- 目标等级选择
- 进度展示
- 升级后佣金对比

### 5.2 结果展示组件

- 佣金分配表格
- 汇总卡片（公司利润、总佣金、拨出比例）
- 对比视图（升级前后）
- 可视化图表（uni-echarts）

### 5.3 设计风格

- 遵循"东方美学"主题
- 主色调：深棕色(#3D2914)、琥珀金(#C9A962)
- 清晰的数据展示
- 响应式设计

---

## 6. 技术实现

### 6.1 云函数结构

```
cloudfunctions/promotion-simulator/
├── index.js              # 主入口，action路由
├── config.js             # 可配置的佣金比例参数
├── calculator.js         # 核心计算逻辑
├── scenarios.js          # 预设场景定义
├── package.json
└── common/
    └── response.js       # 复用公共响应模块
```

### 6.2 核心Action

- `simulate`: 执行模拟计算
- `getPresets`: 获取所有预设场景列表
- `compareUpgrade`: 对比升级前后的收益

### 6.3 小程序端实现

**新增页面：** `src/pages/promotion/simulator.vue`

**API封装：**
```typescript
export const simulatorApi = {
  simulate: (params) => callFunction('promotion-simulator', { action: 'simulate', data: params }),
  getPresets: () => callFunction('promotion-simulator', { action: 'getPresets' }),
  compareUpgrade: (params) => callFunction('promotion-simulator', { action: 'compareUpgrade', data: params })
};
```

**路由配置：** 在 `src/pages.json` 中添加

---

## 7. 测试与部署

### 7.1 测试计划

**单元测试：**
- 各种佣金分配场景的计算准确性
- 边界条件测试
- 升级前后对比计算

**场景验证：**
- 使用商业说明文档中的示例验证
- 确保模拟结果与文档一致

### 7.2 部署步骤

1. 创建 `promotion-simulator` 云函数
2. 设置运行时为 Nodejs16.13
3. 添加小程序页面路由
4. 在推广中心添加入口链接
5. 开发环境测试验证

### 7.3 入口位置

- 小程序：推广中心页面添加"场景模拟器"入口

---

## 8. 实施优先级

### Phase 1: 核心功能
- 云函数基础架构
- 基础佣金计算逻辑
- 预设场景模拟
- 小程序基础界面

### Phase 2: 完整功能
- 自定义模拟功能
- 升级路径模拟
- 结果展示优化
- 可视化图表

### Phase 3: 优化增强
- 性能优化
- 用户体验优化
- 测试覆盖完善

---

## 9. 风险与注意事项

1. **计算一致性**: 模拟器计算逻辑需要与生产环境保持一致
2. **性能考虑**: 复杂场景可能需要较长计算时间
3. **用户理解**: 需要清晰的说明和引导，避免用户误解模拟结果

---

## 附录：佣金分配规则速查

| 推广人等级 | 自己拿 | 一级拿 | 二级拿 | 三级拿 | 总计 |
|----------|--------|--------|--------|--------|------|
| 一级推广  | 20元   | -      | -      | -      | 20元  |
| 二级推广  | 12元   | 8元    | -      | -      | 20元  |
| 三级推广  | 12元   | 4元    | 4元    | -      | 20元  |
| 四级推广  | 8元    | 4元    | 4元    | 4元    | 20元  |

**升级路径：**
```
普通（四级，8元） → 铜牌（三级，12元） → 银牌（二级，12元） → 金牌（一级，20元）
```
