<template>
  <view class="search-page">
    <!-- 搜索头部 -->
    <view class="search-header">
      <view class="search-bar">
        <view class="search-input-wrapper">
          <input
            v-model="keyword"
            class="search-input"
            placeholder="搜索精酿啤酒"
            :focus="isFocused"
            @confirm="handleSearch"
            @input="onInputChange"
            @focus="isFocused = true"
            @blur="isFocused = false"
          />
          <view v-if="keyword" class="clear-icon" @click="clearKeyword">
            <text>×</text>
          </view>
        </view>
        <text class="cancel-btn" @click="goBack">取消</text>
      </view>
    </view>

    <!-- 搜索建议和历史 -->
    <view v-if="!hasSearched" class="search-suggestions">
      <!-- 热门搜索 -->
      <view v-if="hotKeywords.length > 0" class="section">
        <view class="section-header">
          <text class="section-title">热门搜索</text>
        </view>
        <view class="keyword-list">
          <text
            v-for="item in hotKeywords"
            :key="item._id"
            class="keyword-item"
            @click="searchByKeyword(item.keyword)"
          >
            {{ item.keyword }}
          </text>
        </view>
      </view>

      <!-- 搜索历史 -->
      <view v-if="searchHistory.length > 0" class="section">
        <view class="section-header">
          <text class="section-title">搜索历史</text>
          <text class="clear-history" @click="handleClearHistory">清空</text>
        </view>
        <view class="history-list">
          <view
            v-for="item in searchHistory"
            :key="item._id"
            class="history-item"
            @click="searchByKeyword(item.keyword)"
          >
            <view class="history-icon">
              <view class="clock-icon">
                <view class="clock-face"></view>
                <view class="clock-hand hour"></view>
                <view class="clock-hand minute"></view>
              </view>
            </view>
            <text class="history-keyword">{{ item.keyword }}</text>
          </view>
        </view>
      </view>

      <!-- 空状态 -->
      <view v-if="hotKeywords.length === 0 && searchHistory.length === 0" class="empty-state">
        <view class="empty-icon">
          <view class="search-outline">
            <view class="search-circle"></view>
            <view class="search-handle"></view>
          </view>
        </view>
        <text class="empty-text">暂无搜索记录</text>
        <text class="empty-hint">搜索商品，发现更多精酿好物</text>
      </view>
    </view>

    <!-- 搜索结果 -->
    <view v-else class="search-results">
      <!-- 排序栏 -->
      <view class="sort-bar">
        <view
          :class="['sort-item', { active: sortBy === 'default' }]"
          @click="setSort('default')"
        >
          <text>综合</text>
        </view>
        <view
          :class="['sort-item', { active: sortBy === 'sales_desc' }]"
          @click="setSort('sales_desc')"
        >
          <text>销量</text>
        </view>
        <view
          :class="['sort-item', 'price-sort', { active: sortBy.includes('price') }]"
          @click="togglePriceSort"
        >
          <text>价格</text>
          <view v-if="sortBy.includes('price')" class="price-arrow">
            <text :class="['arrow', sortBy === 'price_asc' ? 'up' : 'down']">
              {{ sortBy === 'price_asc' ? '↑' : '↓' }}
            </text>
          </view>
        </view>
      </view>

      <!-- 商品数量 -->
      <view class="result-count">
        <text>找到 {{ total }} 件商品</text>
      </view>

      <!-- 商品列表 -->
      <view v-if="products.length > 0" class="product-list">
        <view
          v-for="product in products"
          :key="product._id"
          class="product-item"
          @click="goToProduct(product._id)"
        >
          <image class="product-image" :src="product.images[0]" mode="aspectFill" />
          <view class="product-info">
            <text class="product-name">{{ product.name }}</text>
            <text class="product-desc">{{ product.description }}</text>
            <view class="product-meta">
              <view class="product-tags">
                <text v-for="tag in product.tags.slice(0, 2)" :key="tag" class="tag">
                  {{ tag }}
                </text>
              </view>
            </view>
            <view class="product-footer">
              <text class="product-price">¥{{ (product.price / 100).toFixed(2) }}</text>
              <text class="product-sales">已售 {{ product.sales }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 加载更多 -->
      <view v-if="hasMore" class="load-more" @click="loadMore">
        <text>加载更多</text>
      </view>

      <!-- 没有更多 -->
      <view v-else-if="products.length > 0 && page >= totalPages" class="no-more">
        <text>没有更多了</text>
      </view>

      <!-- 空结果 -->
      <view v-if="products.length === 0 && !loading" class="empty-results">
        <view class="empty-icon">
          <view class="box-outline">
            <view class="box-body"></view>
            <view class="box-lid"></view>
          </view>
        </view>
        <text class="empty-text">暂无相关商品</text>
        <text class="empty-hint">换个关键词试试</text>
      </view>
    </view>

    <!-- 加载状态 -->
    <view v-if="loading" class="loading-mask">
      <view class="loading-spinner"></view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { searchProducts, saveSearchHistory, getSearchHistory, clearSearchHistory, getHotKeywords } from '@/utils/api';
import type { Product, SearchHistory, HotKeyword } from '@/types';

// 搜索状态
const keyword = ref('');
const hasSearched = ref(false);
const isFocused = ref(false);

// 搜索结果
const products = ref<Product[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(20);
const totalPages = ref(0);
const sortBy = ref<'default' | 'price_asc' | 'price_desc' | 'sales_desc'>('default');
const loading = ref(false);
const hasMore = ref(false);

// 搜索建议
const hotKeywords = ref<HotKeyword[]>([]);
const searchHistory = ref<SearchHistory[]>([]);

// 生命周期
onMounted(() => {
  loadSuggestions();
});

/**
 * 加载搜索建议
 */
async function loadSuggestions() {
  try {
    // 并行加载热门搜索和历史记录
    const [hot, history] = await Promise.all([
      getHotKeywords(),
      getSearchHistory(10)
    ]);

    hotKeywords.value = hot;
    searchHistory.value = history;
  } catch (error) {
    console.error('加载搜索建议失败:', error);
  }
}

/**
 * 输入变化
 */
function onInputChange(e: any) {
  keyword.value = e.detail.value;
}

/**
 * 清空关键词
 */
function clearKeyword() {
  keyword.value = '';
}

/**
 * 返回上一页
 */
function goBack() {
  if (hasSearched.value) {
    // 如果已经搜索过，返回搜索建议页
    hasSearched.value = false;
    products.value = [];
    keyword.value = '';
  } else {
    // 否则返回上一页
    uni.navigateBack();
  }
}

/**
 * 通过关键词搜索
 */
function searchByKeyword(kw: string) {
  keyword.value = kw;
  handleSearch();
}

/**
 * 执行搜索
 */
async function handleSearch() {
  if (!keyword.value.trim()) {
    uni.showToast({
      title: '请输入搜索关键词',
      icon: 'none'
    });
    return;
  }

  hasSearched.value = true;
  page.value = 1;
  products.value = [];
  await doSearch();

  // 保存搜索历史（异步执行，不阻塞）
  saveSearchHistory(keyword.value.trim()).catch(err => {
    console.error('保存搜索历史失败:', err);
  });
}

/**
 * 执行搜索请求
 */
async function doSearch() {
  if (loading.value) return;

  loading.value = true;

  try {
    const result = await searchProducts({
      keyword: keyword.value.trim(),
      sortBy: sortBy.value,
      page: page.value,
      pageSize: pageSize.value
    });

    products.value = result.products;
    total.value = result.total;
    totalPages.value = result.totalPages;
    hasMore.value = page.value < result.totalPages;
  } catch (error: any) {
    console.error('搜索失败:', error);
    uni.showToast({
      title: error.message || '搜索失败',
      icon: 'none'
    });
  } finally {
    loading.value = false;
  }
}

/**
 * 设置排序
 */
function setSort(sortByValue: 'default' | 'price_asc' | 'price_desc' | 'sales_desc') {
  if (sortBy.value === sortByValue) return;

  sortBy.value = sortByValue;
  page.value = 1;
  doSearch();
}

/**
 * 切换价格排序
 */
function togglePriceSort() {
  if (sortBy.value === 'price_asc') {
    setSort('price_desc');
  } else if (sortBy.value === 'price_desc') {
    setSort('default');
  } else {
    setSort('price_asc');
  }
}

/**
 * 加载更多
 */
async function loadMore() {
  if (!hasMore.value || loading.value) return;

  page.value++;
  await doSearch();
}

/**
 * 清空搜索历史
 */
async function handleClearHistory() {
  try {
    await clearSearchHistory();
    searchHistory.value = [];
    uni.showToast({
      title: '已清空搜索历史',
      icon: 'success'
    });
  } catch (error: any) {
    console.error('清空搜索历史失败:', error);
    uni.showToast({
      title: error.message || '清空失败',
      icon: 'none'
    });
  }
}

/**
 * 跳转到商品详情
 */
function goToProduct(productId: string) {
  uni.navigateTo({
    url: `/pages/product/detail?id=${productId}`
  });
}
</script>

<style lang="scss" scoped>
.search-page {
  min-height: 100vh;
  background-color: #FAF9F7;
}

// 搜索头部
.search-header {
  position: sticky;
  top: 0;
  z-index: 100;
  background-color: #1A1A1A;
  padding: 20rpx 30rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.1);
}

.search-bar {
  display: flex;
  align-items: center;
  gap: 20rpx;
}

.search-input-wrapper {
  flex: 1;
  position: relative;
  background-color: #FAF9F7;
  border-radius: 40rpx;
  padding: 16rpx 32rpx;
  display: flex;
  align-items: center;
}

.search-input {
  flex: 1;
  font-size: 28rpx;
  color: #1A1A1A;
}

.clear-icon {
  padding: 8rpx;
  font-size: 36rpx;
  color: #999;
  margin-left: 8rpx;
}

.cancel-btn {
  font-size: 28rpx;
  color: #C9A962;
  white-space: nowrap;
}

// 搜索建议
.search-suggestions {
  padding: 30rpx;
}

.section {
  margin-bottom: 40rpx;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20rpx;
}

.section-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #1A1A1A;
}

.clear-history {
  font-size: 26rpx;
  color: #C9A962;
}

.keyword-list {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.keyword-item {
  padding: 12rpx 24rpx;
  background-color: #FFFFFF;
  border-radius: 32rpx;
  font-size: 26rpx;
  color: #3D2914;
  border: 1rpx solid #E8E4DD;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.history-item {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 16rpx 20rpx;
  background-color: #FFFFFF;
  border-radius: 12rpx;
}

.history-icon {
  width: 40rpx;
  height: 40rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.clock-icon {
  width: 32rpx;
  height: 32rpx;
  position: relative;
}

.clock-face {
  position: absolute;
  width: 32rpx;
  height: 32rpx;
  border: 2rpx solid #C9A962;
  border-radius: 50%;
  box-sizing: border-box;
}

.clock-hand {
  position: absolute;
  background-color: #C9A962;
  transform-origin: bottom center;
}

.clock-hand.hour {
  width: 2rpx;
  height: 12rpx;
  top: 4rpx;
  left: 14rpx;
  transform: rotate(30deg);
}

.clock-hand.minute {
  width: 2rpx;
  height: 16rpx;
  top: 0;
  left: 14rpx;
  transform: rotate(60deg);
}

.history-keyword {
  flex: 1;
  font-size: 28rpx;
  color: #1A1A1A;
}

// 空状态
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 120rpx 60rpx;
  text-align: center;
}

.empty-icon {
  margin-bottom: 40rpx;
}

.search-outline {
  width: 120rpx;
  height: 120rpx;
  position: relative;
  margin: 0 auto;
}

.search-circle {
  position: absolute;
  width: 80rpx;
  height: 80rpx;
  border: 4rpx solid #D4A574;
  border-radius: 50%;
  top: 20rpx;
  left: 20rpx;
  box-sizing: border-box;
}

.search-handle {
  position: absolute;
  width: 8rpx;
  height: 40rpx;
  background-color: #D4A574;
  bottom: 10rpx;
  right: 20rpx;
  transform: rotate(-45deg);
  border-radius: 4rpx;
}

.empty-text {
  font-size: 32rpx;
  color: #1A1A1A;
  margin-bottom: 12rpx;
}

.empty-hint {
  font-size: 26rpx;
  color: #999;
}

// 搜索结果
.search-results {
  padding-bottom: 120rpx;
}

.sort-bar {
  position: sticky;
  top: 0;
  z-index: 99;
  display: flex;
  align-items: center;
  background-color: #FFFFFF;
  padding: 24rpx 30rpx;
  border-bottom: 1rpx solid #E8E4DD;
}

.sort-item {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  font-size: 28rpx;
  color: #666;
  padding: 8rpx 16rpx;
  border-radius: 24rpx;
  transition: all 0.3s ease;
}

.sort-item.active {
  background-color: #3D2914;
  color: #C9A962;
}

.price-sort {
  gap: 4rpx;
}

.price-arrow {
  display: flex;
  align-items: center;
}

.arrow {
  font-size: 24rpx;
}

.result-count {
  padding: 20rpx 30rpx;
  font-size: 26rpx;
  color: #999;
  text-align: center;
}

.product-list {
  padding: 0 30rpx;
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.product-item {
  display: flex;
  background-color: #FFFFFF;
  border-radius: 16rpx;
  overflow: hidden;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.06);
}

.product-image {
  width: 200rpx;
  height: 200rpx;
  flex-shrink: 0;
}

.product-info {
  flex: 1;
  padding: 20rpx;
  display: flex;
  flex-direction: column;
}

.product-name {
  font-size: 30rpx;
  font-weight: 600;
  color: #1A1A1A;
  margin-bottom: 8rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.product-desc {
  font-size: 24rpx;
  color: #999;
  margin-bottom: 12rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.product-meta {
  margin-bottom: 16rpx;
}

.product-tags {
  display: flex;
  gap: 8rpx;
}

.tag {
  padding: 4rpx 12rpx;
  background-color: #F5F0E8;
  border-radius: 4rpx;
  font-size: 22rpx;
  color: #3D2914;
}

.product-footer {
  margin-top: auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.product-price {
  font-size: 32rpx;
  font-weight: 600;
  color: #C9A962;
}

.product-sales {
  font-size: 24rpx;
  color: #999;
}

.load-more,
.no-more {
  padding: 40rpx;
  text-align: center;
  font-size: 26rpx;
  color: #999;
}

.empty-results {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 120rpx 60rpx;
  text-align: center;
}

.box-outline {
  width: 120rpx;
  height: 120rpx;
  position: relative;
  margin: 0 auto;
}

.box-body {
  position: absolute;
  width: 80rpx;
  height: 80rpx;
  border: 4rpx solid #D4A574;
  border-radius: 8rpx;
  bottom: 20rpx;
  left: 20rpx;
  box-sizing: border-box;
}

.box-lid {
  position: absolute;
  width: 90rpx;
  height: 16rpx;
  background-color: #D4A574;
  border-radius: 8rpx;
  top: 16rpx;
  left: 15rpx;
}

// 加载状态
.loading-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(255, 255, 255, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
}

.loading-spinner {
  width: 60rpx;
  height: 60rpx;
  border: 4rpx solid #E8E4DD;
  border-top-color: #C9A962;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
