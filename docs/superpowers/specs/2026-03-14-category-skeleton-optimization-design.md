# 分类界面骨架屏优化设计

**日期**: 2026-03-14
**设计师**: Claude
**状态**: 待实施

## 概述

优化分类界面的骨架屏加载状态，使其与深色奢华主题（东方美学配色）完美融合。

## 问题分析

### 当前问题
1. **配色不匹配**: VirtualListSkeleton使用浅色主题（#f5f5f5背景），与分类界面深色主题（#0D0D0D）不符
2. **尺寸不一致**: 骨架屏图片200rpx，实际商品图片120rpx
3. **视觉割裂**: 骨架屏切换到实际内容时有明显闪烁

### 目标
- 骨架屏配色完美融入深色主题
- 尺寸与实际商品卡片完全一致
- 保持简约优雅的东方美学风格

## 设计方案

### 配色方案（方案A - 深金流光）

| 元素 | 颜色值 | 用途 |
|------|--------|------|
| 骨架背景 | `#141414` | 深灰黑，匹配侧边栏 |
| 流光渐变 | `#1A1A1A → #2A2A2A → #1A1A1A` | 微妙的深色变化 |
| 金色高光 | `rgba(200, 164, 100, 0.15)` | 琥珀金15%透明度 |
| 卡片背景 | `#0D0D0D` | 与商品区域一致 |

### 尺寸修正

| 元素 | 当前值 | 修正值 | 说明 |
|------|--------|--------|------|
| 商品图片 | 200rpx | 120rpx | 匹配实际商品图片 |
| 卡片高度 | 220rpx | 144rpx | 匹配product-item高度 |
| 内边距 | 20rpx | 0 | 与实际商品一致 |
| 卡片间距 | 20rpx | 0 | 使用border-bottom代替 |

### 动画参数

```css
/* 流光动画 */
@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* 动画配置 */
- 时长: 1.5s
- 方向: 90deg（从左到右）
- 元素延迟: 0s, 0.2s, 0.4s, 0.6s, 0.8s（错峰加载）
```

## 实施细节

### 修改文件

1. **src/components/VirtualListSkeleton.vue**
   - 更新所有颜色变量
   - 调整元素尺寸
   - 优化动画性能

2. **src/pages/category/category.vue**
   - 验证骨架屏容器背景
   - 确保过渡流畅

### CSS样式示例

```css
.skeleton-wrapper {
  background-color: #0D0D0D;
}

.skeleton-item {
  display: flex;
  padding: 0;
  background-color: #0D0D0D;
  border-bottom: 1rpx solid rgba(200, 164, 100, 0.08);
}

.skeleton-image {
  width: 120rpx;
  height: 120rpx;
  background: linear-gradient(
    90deg,
    #141414 0%,
    rgba(200, 164, 100, 0.15) 50%,
    #141414 100%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 8rpx;
}
```

## 验收标准

- [ ] 骨架屏配色与深色主题完美融合
- [ ] 骨架屏尺寸与实际商品卡片一致
- [ ] 流光动画流畅，无明显卡顿
- [ ] 骨架屏到实际内容过渡自然
- [ ] 支持虚拟列表和传统列表两种模式

## 性能考虑

- 使用CSS动画，避免JavaScript动画
- 流光渐变使用3个色阶，减少渲染负担
- animation-delay错峰加载，避免同时渲染

## 后续优化

- 可考虑为左侧分类导航添加独立骨架屏
- 可为商家推荐区添加横向滚动骨架屏
