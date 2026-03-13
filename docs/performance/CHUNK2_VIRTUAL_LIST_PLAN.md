# Chunk 2: 商品列表虚拟滚动优化 - 实施计划

## 🎯 目标

实现虚拟列表组件，优化商品列表渲染性能，减少初始渲染时间和内存占用。

## 📋 需求背景

**当前问题**：
- 分类商品列表一次性加载所有商品（可能 100+）
- 首屏渲染 100+ 个商品卡片，耗时 2-3 秒
- 滚动时 DOM 节点过多，导致卡顿
- 移动端内存占用高，影响用户体验

**优化目标**：
- 首屏仅渲染可见区域 + 缓冲区商品（5 + 3×2 = 11 个）
- 初始渲染时间 < 500ms
- 滚动时动态渲染可见项
- 内存占用降低 80%+

## 🏗️ 技术方案

### 虚拟列表原理

```
┌─────────────────────┐
│  可见区域 (5个)      │ ← 实际渲染
├─────────────────────┤
│  上缓冲区 (3个)      │ ← 预渲染
├─────────────────────┤
│  不可见区域          │ ← 不渲染（虚拟）
├─────────────────────┤
│  下缓冲区 (3个)      │ ← 预渲染
├─────────────────────┤
│  可见区域 (5个)      │ ← 实际渲染
└─────────────────────┘
```

### 关键技术点

1. **动态计算可见范围**：监听滚动事件，计算 scrollTop
2. **占位容器**：使用 padding撑开容器高度（总商品数 × 单项高度）
3. **偏移渲染**：使用 transform 定位实际渲染的节点
4. **缓冲区优化**：上下各缓冲 3 个，减少白屏

## 📦 任务分解

### Task 1: 创建虚拟列表组件

**文件**: `src/components/VirtualList.vue`

**功能**:
- 接收数据源、单项高度、可见数量等 props
- 监听滚动事件，动态计算可见范围
- 使用 absolute 定位渲染可见项
- 支持水平和垂直滚动

**Props**:
```typescript
interface Props {
  items: any[];              // 数据源
  itemHeight: number;         // 单项高度（rpx）
  visibleCount: number;       // 可见数量
  bufferSize?: number;        // 缓冲区大小（默认3）
  estimateHeight?: boolean;   // 是否估算高度（默认false）
}
```

**Events**:
- `scroll`: 滚动事件，返回 scrollTop
- `loadMore`: 到底部时触发加载更多

**状态管理**:
```typescript
const state = {
  scrollTop: 0,           // 当前滚动位置
  startIndex: 0,           // 起始索引
  endIndex: 10,            // 结束索引
  visibleData: [],         // 可见数据
  totalHeight: 0           // 总高度
}
```

---

### Task 2: 修改商品列表页面使用虚拟列表

**文件**: `src/pages/category/index.vue`

**修改内容**:
1. 导入 VirtualList 组件
2. 检查功能开关 `VIRTUAL_LIST`
3. 根据开关条件渲染虚拟列表或原列表
4. 适配虚拟列表的 loadMore 事件
5. 添加降级逻辑（开关关闭时）

**核心逻辑**:
```vue
<template>
  <!-- 功能开关启用：虚拟列表 -->
  <VirtualList
    v-if="isFeatureEnabled('VIRTUAL_LIST')"
    :items="products"
    :itemHeight="VIRTUAL_LIST_CONFIG.itemHeight"
    :visibleCount="VIRTUAL_LIST_CONFIG.visibleCount"
    :bufferSize="VIRTUAL_LIST_CONFIG.bufferSize"
    @loadMore="loadMoreProducts"
  >
    <template #default="{ item, index }">
      <ProductCard :product="item" :index="index" />
    </template>
  </VirtualList>

  <!-- 功能开关禁用：原列表（降级） -->
  <view v-else class="product-list">
    <ProductCard
      v-for="(product, index) in products"
      :key="product._id"
      :product="product"
      :index="index"
    />
  </view>
</template>
```

---

### Task 3: 添加骨架屏加载

**文件**: `src/components/VirtualListSkeleton.vue`

**功能**:
- 显示虚拟列表加载中的占位
- 骨架屏动画效果
- 数量与 visibleCount 一致

**使用场景**:
- 首次加载数据时
- 刷新数据时

---

### Task 4: 测试和验证

**测试场景**:
1. ✅ 虚拟列表正常渲染
2. ✅ 滚动时动态更新可见项
3. ✅ 加载更多功能正常
4. ✅ 骨架屏显示正常
5. ✅ 功能开关降级正常
6. ✅ 不同屏幕尺寸适配正常
7. ✅ 性能指标达标

**性能指标**:
- 首屏渲染时间 < 500ms
- 滚动 FPS > 55
- 内存占用降低 80%+

---

## 🎨 UI/UX 设计

### 视觉效果

**加载前**：
```
┌─────────────────────┐
│ ▱▱▱ ▱▱▱ ▱▱▱         │ ← 骨架屏
│ ▱▱▱ ▱▱▱ ▱▱▱         │
│ ▱▱▱ ▱▱▱ ▱▱▱         │
│ ▱▱▱ ▱▱▱ ▱▱▱         │
│ ▱▱▱ ▱▱▱ ▱▱▱         │
└─────────────────────┘
```

**加载后**：
```
┌─────────────────────┐
│ [商品1] [商品2]      │ ← 实际渲染
│ [商品3] [商品4]      │
│ [商品5] [商品6]      │
│ [商品7] [商品8]      │
│ [商品9] [商品10]     │
│   ⬇️ 向下滚动 ⬇️      │
│ [虚拟空间]          │ ← 不渲染
│   ⬇️ 继续滚动 ⬇️      │
│ [商品95] [商品96]    │ ← 动态渲染
│ [商品97] [商品98]    │
│ [商品99] [商品100]   │
└─────────────────────┘
```

---

## ⚠️ 技术风险与应对

### 风险1：高度计算不准确
**影响**: 渲染位置错误，出现白屏或重叠
**应对**:
- 使用固定高度（240rpx）
- 支持动态高度估算（estimateHeight 模式）
- 预留缓冲区减少白屏

### 风险2：滚动性能问题
**影响**: 滚动卡顿，丢帧
**应对**:
- 使用 requestAnimationFrame 节流
- 避免在滚动回调中执行复杂计算
- 使用 CSS transform 而非 top/left

### 风险3：列表项动态高度
**影响**: 商品卡片高度不一致，定位错误
**应对**:
- Phase 1 使用固定高度（简化实现）
- Phase 2 支持动态高度（测量后缓存）

---

## 📊 性能基准

### 优化前
- 渲染 100 个商品卡片：~2000ms
- 滚动 FPS：30-40
- DOM 节点数：300+

### 优化后（预期）
- 渲染 11 个商品卡片：~300ms
- 滚动 FPS：55-60
- DOM 节点数：33

**提升**：
- 渲染速度提升 **85%**
- 滚动流畅度提升 **50%**
- 内存占用降低 **89%**

---

## 📝 验收标准

- [ ] VirtualList 组件功能完整
- [ ] 分类页面集成虚拟列表
- [ ] 功能开关控制生效
- [ ] 骨架屏显示正常
- [ ] 降级逻辑正常工作
- [ ] 首屏渲染 < 500ms
- [ ] 滚动 FPS > 55
- [ ] 不同屏幕适配正常

---

## 📅 工作量估算

- Task 1: 虚拟列表组件开发 - 2-3 小时
- Task 2: 修改分类页面 - 1 小时
- Task 3: 骨架屏组件 - 30 分钟
- Task 4: 测试和验证 - 1 小时

**总计**: 4.5-5.5 小时

---

## 🚀 实施步骤

1. ✅ 创建 VirtualList.vue 组件
2. ✅ 实现核心滚动逻辑
3. ✅ 添加插槽支持自定义渲染
4. ✅ 修改分类页面集成
5. ✅ 添加骨架屏组件
6. ✅ 测试功能完整性
7. ✅ 性能测试和优化

---

## 📚 相关文档

- [Chunk 1 进度](./CHUNK1_PROGRESS.md)
- [性能配置](../../src/config/performance.ts)
- [功能开关](../../src/config/featureFlags.ts)
