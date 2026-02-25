<template>
  <view class="admin-search">
    <!-- 搜索输入框 -->
    <view class="search-input-wrapper">
      <view class="search-icon">🔍</view>
      <input
        class="search-input"
        type="text"
        :value="keyword"
        :placeholder="placeholder"
        @input="onInput"
        @confirm="onSearch"
      />
      <view
        v-if="keyword"
        class="clear-btn"
        @click="clear"
      >
        <text class="clear-icon">✕</text>
      </view>
    </view>

    <!-- 筛选按钮（可选） -->
    <view v-if="showFilter" class="filter-btn" @click="toggleFilterPanel">
      <text class="filter-icon">⚙️</text>
      <text class="filter-text">筛选</text>
    </view>

    <!-- 筛选面板 -->
    <view v-if="filterVisible && filterOptions" class="filter-panel">
      <view class="filter-section">
        <text class="filter-title">筛选条件</text>
        <view class="filter-options">
          <view
            v-for="option in filterOptions"
            :key="option.key"
            class="filter-option"
            :class="{ active: selectedFilters[option.key] }"
            @click="toggleFilter(option.key)"
          >
            <text class="option-text">{{ option.label }}</text>
          </view>
        </view>
      </view>
      <view class="filter-actions">
        <view class="filter-action-btn reset" @click="resetFilters">
          <text class="btn-text">重置</text>
        </view>
        <view class="filter-action-btn confirm" @click="applyFilters">
          <text class="btn-text">应用</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

interface FilterOption {
  key: string
  label: string
  value?: any
}

interface Props {
  placeholder?: string
  showFilter?: boolean
  filterOptions?: FilterOption[]
  debounce?: number
}

interface Emits {
  (e: 'search', keyword: string, filters: Record<string, any>): void
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: '搜索...',
  showFilter: false,
  debounce: 500
})

const emit = defineEmits<Emits>()

const keyword = ref('')
const filterVisible = ref(false)
const selectedFilters = ref<Record<string, any>>({})

let debounceTimer: number | null = null

/**
 * 输入事件（带防抖）
 */
const onInput = (e: any) => {
  keyword.value = e.detail.value

  if (debounceTimer) {
    clearTimeout(debounceTimer)
  }

  debounceTimer = setTimeout(() => {
    doSearch()
  }, props.debounce) as unknown as number
}

/**
 * 确认搜索
 */
const onSearch = () => {
  doSearch()
}

/**
 * 执行搜索
 */
const doSearch = () => {
  emit('search', keyword.value, selectedFilters.value)
}

/**
 * 清空搜索
 */
const clear = () => {
  keyword.value = ''
  selectedFilters.value = {}
  emit('search', '', {})
}

/**
 * 切换筛选面板
 */
const toggleFilterPanel = () => {
  filterVisible.value = !filterVisible.value
}

/**
 * 切换筛选选项
 */
const toggleFilter = (key: string) => {
  if (selectedFilters.value[key]) {
    delete selectedFilters.value[key]
  } else {
    selectedFilters.value[key] = true
  }
}

/**
 * 重置筛选
 */
const resetFilters = () => {
  selectedFilters.value = {}
  emit('search', keyword.value, {})
  filterVisible.value = false
}

/**
 * 应用筛选
 */
const applyFilters = () => {
  emit('search', keyword.value, selectedFilters.value)
  filterVisible.value = false
}
</script>

<style scoped>
.admin-search {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

/* 搜索输入框 */
.search-input-wrapper {
  display: flex;
  align-items: center;
  padding: 20rpx 24rpx;
  background: rgba(255, 255, 255, 0.03);
  border: 1rpx solid rgba(201, 169, 98, 0.15);
  border-radius: 28rpx;
}

.search-icon {
  font-size: 28rpx;
  margin-right: 12rpx;
}

.search-input {
  flex: 1;
  font-size: 28rpx;
  color: #F5F5F0;
}

.clear-btn {
  margin-left: 12rpx;
  padding: 8rpx;
}

.clear-icon {
  font-size: 24rpx;
  color: rgba(245, 245, 240, 0.4);
}

/* 筛选按钮 */
.filter-btn {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 12rpx 24rpx;
  background: rgba(201, 169, 98, 0.1);
  border: 1rpx solid rgba(201, 169, 98, 0.2);
  border-radius: 20rpx;
}

.filter-icon {
  font-size: 24rpx;
}

.filter-text {
  font-size: 24rpx;
  color: #C9A962;
}

/* 筛选面板 */
.filter-panel {
  padding: 24rpx;
  background: rgba(0, 0, 0, 0.3);
  border: 1rpx solid rgba(201, 169, 98, 0.1);
  border-radius: 16rpx;
}

.filter-section {
  margin-bottom: 16rpx;
}

.filter-title {
  display: block;
  font-size: 26rpx;
  color: rgba(245, 245, 240, 0.6);
  margin-bottom: 12rpx;
}

.filter-options {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}

.filter-option {
  padding: 8rpx 20rpx;
  background: rgba(255, 255, 255, 0.03);
  border: 1rpx solid rgba(201, 169, 98, 0.15);
  border-radius: 20rpx;
}

.filter-option.active {
  background: rgba(201, 169, 98, 0.2);
  border-color: #C9A962;
}

.option-text {
  font-size: 24rpx;
  color: rgba(245, 245, 240, 0.6);
}

.filter-option.active .option-text {
  color: #C9A962;
}

.filter-actions {
  display: flex;
  gap: 12rpx;
}

.filter-action-btn {
  flex: 1;
  padding: 12rpx;
  text-align: center;
  border-radius: 12rpx;
}

.filter-action-btn.reset {
  background: rgba(255, 255, 255, 0.05);
}

.filter-action-btn.reset .btn-text {
  font-size: 26rpx;
  color: rgba(245, 245, 240, 0.6);
}

.filter-action-btn.confirm {
  background: linear-gradient(145deg, #C8A464 0%, #A88B4A 100%);
}

.filter-action-btn.confirm .btn-text {
  font-size: 26rpx;
  color: #0D0D0D;
  font-weight: 600;
}
</style>
