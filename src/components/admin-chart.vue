<template>
  <view class="admin-chart" :class="[type, { loading }]">
    <!-- 加载状态 -->
    <view v-if="loading" class="chart-loading">
      <view class="loading-spinner"></view>
    </view>

    <!-- 图表标题 -->
    <view v-if="title" class="chart-title">
      <text class="title-text">{{ title }}</text>
      <text v-if="subtitle" class="subtitle-text">{{ subtitle }}</text>
    </view>

    <!-- 柱状图 -->
    <view v-if="type === 'bar' && !loading" class="chart-content bar-chart">
      <view class="bar-container">
        <view
          v-for="(item, index) in data"
          :key="index"
          class="bar-item"
          :style="{ height: getBarHeight(item.value) }"
        >
          <view class="bar-value">{{ item.value }}</view>
          <view class="bar-label">{{ item.label }}</view>
        </view>
      </view>
    </view>

    <!-- 折线图 -->
    <view v-if="type === 'line' && !loading" class="chart-content line-chart">
      <view class="line-container">
        <view class="line-svg">
          <svg viewBox="0 0 400 200" class="line-svg-content">
            <!-- 网格线 -->
            <line
              v-for="n in 5"
              :key="'grid-' + n"
              :x1="0"
              :y1="n * 40"
              :x2="400"
              :y2="n * 40"
              stroke="rgba(201, 169, 98, 0.1)"
              stroke-width="1"
            />
            <!-- 折线 -->
            <polyline
              :points="getLinePoints()"
              fill="none"
              stroke="#C9A962"
              stroke-width="2"
            />
            <!-- 数据点 -->
            <circle
              v-for="(point, index) in getLinePointsArray()"
              :key="'point-' + index"
              :cx="point.x"
              :cy="point.y"
              r="4"
              fill="#C9A962"
            />
          </svg>
        </view>
        <view class="line-labels">
          <text
            v-for="(item, index) in data"
            :key="'label-' + index"
            class="line-label"
            :style="{ left: (index * (100 / (data.length - 1))) + '%' }"
          >
            {{ item.label }}
          </text>
        </view>
      </view>
    </view>

    <!-- 饼图 -->
    <view v-if="type === 'pie' && !loading" class="chart-content pie-chart">
      <view class="pie-container">
        <view
          v-for="(item, index) in data"
          :key="index"
          class="pie-segment"
          :style="getPieStyle(index)"
        >
          <view class="pie-legend">
            <view class="legend-dot" :style="{ background: item.color }"></view>
            <text class="legend-text">{{ item.label }}: {{ item.value }}%</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 图例 -->
    <view v-if="showLegend && type !== 'pie'" class="chart-legend">
      <view
        v-for="(item, index) in data"
        :key="index"
        class="legend-item"
      >
        <view class="legend-dot" :style="{ background: item.color || '#C9A962' }"></view>
        <text class="legend-text">{{ item.label }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface ChartData {
  label: string
  value: number
  color?: string
}

interface Props {
  type: 'bar' | 'line' | 'pie'
  title?: string
  subtitle?: string
  data: ChartData[]
  loading?: boolean
  showLegend?: boolean
  maxValue?: number
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  showLegend: true
})

/**
 * 计算柱状图高度
 */
const getBarHeight = (value: number): string => {
  const max = props.maxValue || Math.max(...props.data.map(d => d.value))
  const percent = max > 0 ? (value / max) * 100 : 0
  return Math.max(percent, 5) + '%'
}

/**
 * 获取折线图点坐标字符串
 */
const getLinePoints = (): string => {
  const points = getLinePointsArray()
  return points.map(p => `${p.x},${p.y}`).join(' ')
}

/**
 * 获取折线图点坐标数组
 */
const getLinePointsArray = () => {
  const max = props.maxValue || Math.max(...props.data.map(d => d.value))
  return props.data.map((item, index) => {
    const x = (index / (props.data.length - 1)) * 400
    const y = 200 - ((item.value / max) * 180 + 10)
    return { x, y }
  })
}

/**
 * 获取饼图样式
 */
const getPieStyle = (index: number) => {
  const total = props.data.reduce((sum, item) => sum + item.value, 0)
  const currentTotal = props.data.slice(0, index).reduce((sum, item) => sum + item.value, 0)
  const startPercent = (currentTotal / total) * 100
  const endPercent = ((currentTotal + props.data[index].value) / total) * 100

  const colors = ['#C9A962', '#7A9A8E', '#D4A574', '#B85C5C', '#6B8E9E']

  return {
    background: `conic-gradient(
      ${colors[index % colors.length]} ${startPercent}% ${endPercent}%,
      transparent ${endPercent}% 100%
    )`
  }
}
</script>

<style scoped>
.admin-chart {
  background: rgba(255, 255, 255, 0.03);
  border-radius: 16rpx;
  padding: 32rpx;
  border: 1rpx solid rgba(201, 169, 98, 0.1);
}

.loading {
  min-height: 400rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 图表标题 */
.chart-title {
  margin-bottom: 24rpx;
}

.title-text {
  display: block;
  font-size: 32rpx;
  font-weight: 600;
  color: #F5F5F0;
  margin-bottom: 8rpx;
}

.subtitle-text {
  font-size: 24rpx;
  color: rgba(245, 245, 240, 0.5);
}

/* 加载状态 */
.chart-loading {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.loading-spinner {
  width: 60rpx;
  height: 60rpx;
  border: 4rpx solid rgba(201, 169, 98, 0.3);
  border-top-color: #C9A962;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* 图表内容 */
.chart-content {
  min-height: 300rpx;
}

/* 柱状图 */
.bar-container {
  display: flex;
  align-items: flex-end;
  justify-content: space-around;
  height: 300rpx;
  padding: 0 20rpx;
}

.bar-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  margin: 0 8rpx;
  background: linear-gradient(180deg, #C9A962 0%, rgba(201, 169, 98, 0.5) 100%);
  border-radius: 8rpx 8rpx 0 0;
  min-height: 20rpx;
  transition: height 0.5s ease;
  position: relative;
}

.bar-value {
  position: absolute;
  top: -40rpx;
  font-size: 22rpx;
  color: #C9A962;
  font-weight: 600;
}

.bar-label {
  position: absolute;
  bottom: -50rpx;
  font-size: 22rpx;
  color: rgba(245, 245, 240, 0.6);
  white-space: nowrap;
}

/* 折线图 */
.line-container {
  position: relative;
  height: 300rpx;
}

.line-svg {
  width: 100%;
  height: 250rpx;
}

.line-svg-content {
  width: 100%;
  height: 100%;
}

.line-labels {
  position: relative;
  height: 50rpx;
  margin-top: 10rpx;
}

.line-label {
  position: absolute;
  transform: translateX(-50%);
  font-size: 22rpx;
  color: rgba(245, 245, 240, 0.6);
}

/* 饼图 */
.pie-container {
  display: flex;
  flex-wrap: wrap;
  gap: 24rpx;
  justify-content: center;
}

.pie-segment {
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.pie-legend {
  text-align: center;
}

.legend-dot {
  width: 24rpx;
  height: 24rpx;
  border-radius: 50%;
  margin: 0 auto 8rpx;
}

.legend-text {
  font-size: 22rpx;
  color: rgba(245, 245, 240, 0.8);
}

/* 图例 */
.chart-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 24rpx;
  margin-top: 24rpx;
  padding-top: 24rpx;
  border-top: 1rpx solid rgba(201, 169, 98, 0.1);
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.legend-item .legend-dot {
  width: 24rpx;
  height: 24rpx;
  border-radius: 4rpx;
}

.legend-item .legend-text {
  font-size: 24rpx;
  color: rgba(245, 245, 240, 0.8);
}
</style>
