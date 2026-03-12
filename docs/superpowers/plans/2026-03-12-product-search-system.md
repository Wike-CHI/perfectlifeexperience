# 商品搜索系统实施计划

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为大友元气精酿啤酒小程序实现完整的商品搜索功能，包括关键词搜索、搜索历史、热门搜索、排序筛选等功能。

**Architecture:** 基于现有云函数架构，创建独立的 search 云函数处理搜索逻辑，前端新建搜索页面集成搜索功能，遵循东方美学设计风格。

**Tech Stack:**
- **前端**: UniApp (Vue 3 + TypeScript)
- **后端**: CloudBase 云函数 (Node.js 16.13)
- **数据库**: CloudBase NoSQL (MongoDB-like)
- **样式**: 东方美学设计系统（深棕色 #3D2914、琥珀金 #C9A962）

---

## 文件结构

### 新建文件
- `cloudfunctions/search/index.js` - 搜索云函数主文件
- `cloudfunctions/search/package.json` - 云函数依赖配置
- `cloudfunctions/search/common/logger.js` - 日志工具（可选，复用common/）
- `src/pages/search/index.vue` - 搜索页面
- `src/components/ProductCard.vue` - 商品卡片组件（复用现有或新建）

### 修改文件
- `src/pages/index/index.vue` - 添加搜索跳转逻辑（已存在goToSearch方法）
- `src/pages.json` - 添加搜索页面路由
- `src/utils/api.ts` - 添加搜索相关API接口
- `src/types/index.ts` - 添加搜索相关类型定义

---

## Chunk 1: 数据库准备

### Task 1: 创建 search_history 集合

**目标**: 创建用户搜索历史集合，用于存储用户的搜索记录。

**数据库集合结构**:
```javascript
{
  _openid: String,        // 用户OPENID
  keyword: String,        // 搜索关键词
  searchCount: Number,    // 搜索次数
  lastSearchTime: Date    // 最后搜索时间
}
```

**索引**:
```javascript
// 复合索引：用户OPENID + 最后搜索时间（降序）
{ _openid: 1, lastSearchTime: -1 }
```

- [ ] **Step 1: 在 CloudBase 控制台创建 search_history 集合**

操作步骤：
1. 登录腾讯云 CloudBase 控制台
2. 选择环境: cloud1-6gmp2q0y3171c353
3. 进入数据库管理
4. 点击"新建集合"
5. 集合名称: `search_history`
6. 权限设置: 自定义
7. 点击"创建"

- [ ] **Step 2: 配置集合安全规则**

在 CloudBase 控制台的"安全规则"中添加：

```javascript
{
  "read": "auth != null && doc._openid == auth.openid",
  "write": "auth != null && doc._openid == auth.openid"
}
```

- [ ] **Step 3: 创建数据库索引**

在 CloudBase 控制台的"索引管理"中为 search_history 集合添加索引：

**索引名称**: `user_time_index`
**索引字段**:
- `_openid`: 1 (升序)
- `lastSearchTime`: -1 (降序)

---

### Task 2: 创建 hot_keywords 集合

**目标**: 创建热门搜索关键词集合，用于管理系统推荐的热门搜索词。

**数据库集合结构**:
```javascript
{
  keyword: String,        // 关键词
  rank: Number,          // 排序权重
  status: String         // 状态: active/inactive
}
```

**索引**:
```javascript
// 单字段索引：排序权重
{ rank: 1 }
```

- [ ] **Step 1: 在 CloudBase 控制台创建 hot_keywords 集合**

操作步骤：
1. 在 CloudBase 控制台数据库管理页面
2. 点击"新建集合"
3. 集合名称: `hot_keywords`
4. 权限设置: 仅创建者可读写
5. 点击"创建"

- [ ] **Step 2: 配置集合安全规则**

```javascript
{
  "read": "auth != null",
  "write": "doc == null || auth.openid == doc._openid"
}
```

- [ ] **Step 3: 创建数据库索引**

**索引名称**: `rank_index`
**索引字段**:
- `rank`: 1 (升序)

- [ ] **Step 4: 初始化热门搜索数据**

在 CloudBase 控制台的"数据库"→"hot_keywords"集合中添加初始数据：

```javascript
[
  { keyword: "精酿", rank: 1, status: "active" },
  { keyword: "啤酒", rank: 2, status: "active" },
  { keyword: "IPA", rank: 3, status: "active" },
  { keyword: "小麦", rank: 4, status: "active" },
  { keyword: "果味", rank: 5, status: "active" },
  { keyword: "鲜啤", rank: 6, status: "active" }
]
```

---

### Task 3: 为 products 集合添加搜索优化索引

**目标**: 优化商品搜索性能，为常用搜索字段添加索引。

- [ ] **Step 1: 为 name 字段添加文本索引**

在 CloudBase 控制台为 products 集合添加索引：

**索引名称**: `name_text_index`
**索引类型**: 文本索引（如果支持）或普通索引
**索引字段**:
- `name`: 1 (升序)

- [ ] **Step 2: 为 category 字段添加索引**

**索引名称**: `category_index`
**索引字段**:
- `category`: 1 (升序)

- [ ] **Step 3: 为 sales 字段添加索引**

**索引名称**: `sales_index`
**索引字段**:
- `sales`: -1 (降序)

---

## Chunk 2: 云函数开发

### Task 4: 创建 search 云函数目录结构

- [ ] **Step 1: 创建云函数目录**

```bash
# 在项目根目录执行
mkdir -p cloudfunctions/search/common
```

- [ ] **Step 2: 创建 package.json**

文件: `cloudfunctions/search/package.json`

```json
{
  "name": "search",
  "version": "1.0.0",
  "description": "商品搜索云函数",
  "main": "index.js",
  "dependencies": {
    "wx-server-sdk": "~2.6.3"
  }
}
```

创建文件命令：
```bash
cat > cloudfunctions/search/package.json << 'EOF'
{
  "name": "search",
  "version": "1.0.0",
  "description": "商品搜索云函数",
  "main": "index.js",
  "dependencies": {
    "wx-server-sdk": "~2.6.3"
  }
}
EOF
```

- [ ] **Step 3: 创建 common/response.js（复用现有）**

```bash
# 复制现有的 response 工具
cp cloudfunctions/common/response.js cloudfunctions/search/common/response.js
```

验证文件存在：
```bash
ls -la cloudfunctions/search/common/response.js
```

预期输出: 文件存在且可读

---

### Task 5: 实现 search 云函数主逻辑

**文件**: `cloudfunctions/search/index.js`

- [ ] **Step 1: 编写云函数基础结构**

```bash
cat > cloudfunctions/search/index.js << 'EOF'
const cloud = require('wx-server-sdk');
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

// 引入响应工具
const { success, error, ErrorCodes } = require('./common/response');

/**
 * 商品搜索云函数
 *
 * Action 列表:
 * - search: 商品搜索（支持关键词、分类、排序）
 * - saveHistory: 保存搜索历史
 * - getHistory: 获取搜索历史
 * - clearHistory: 清空搜索历史
 * - getHotKeywords: 获取热门搜索
 */
exports.main = async (event, context) => {
  const { action, data } = event;
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  console.log('[Search] Action:', action, 'OPENID:', openid);

  try {
    switch (action) {
      case 'search':
        return await handleSearch(data, openid);
      case 'saveHistory':
        return await handleSaveHistory(data, openid);
      case 'getHistory':
        return await handleGetHistory(data, openid);
      case 'clearHistory':
        return await handleClearHistory(openid);
      case 'getHotKeywords':
        return await handleGetHotKeywords();
      default:
        return error(ErrorCodes.INVALID_PARAMS, `未知的 action: ${action}`);
    }
  } catch (err) {
    console.error('[Search] Error:', err);
    return error(ErrorCodes.UNKNOWN_ERROR, err.message);
  }
};

/**
 * 处理商品搜索
 */
async function handleSearch(params, openid) {
  const { keyword, category, sortBy = 'default', page = 1, pageSize = 20 } = params;

  console.log('[Search] Search params:', { keyword, category, sortBy, page, pageSize });

  // 构建查询条件
  let whereCondition = {
    status: _.neq('deleted')  // 排除已删除商品
  };

  // 关键词模糊匹配（搜索商品名称）
  if (keyword && keyword.trim()) {
    const trimmedKeyword = keyword.trim();
    whereCondition.name = db.RegExp({
      regexp: trimmedKeyword,
      options: 'i'  // 不区分大小写
    });
  }

  // 分类筛选
  if (category && category !== 'all') {
    whereCondition.category = category;
  }

  // 排序逻辑
  let orderBy = 'createTime';
  let orderType = 'desc';

  switch (sortBy) {
    case 'price_asc':
      orderBy = 'price';
      orderType = 'asc';
      break;
    case 'price_desc':
      orderBy = 'price';
      orderType = 'desc';
      break;
    case 'sales_desc':
      orderBy = 'sales';
      orderType = 'desc';
      break;
    case 'default':
    default:
      orderBy = 'createTime';
      orderType = 'desc';
      break;
  }

  try {
    // 查询总数
    const countResult = await db.collection('products')
      .where(whereCondition)
      .count();

    const total = countResult.total;

    // 查询商品列表
    const result = await db.collection('products')
      .where(whereCondition)
      .orderBy(orderBy, orderType)
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .get();

    console.log('[Search] Found products:', result.data.length, 'Total:', total);

    return success({
      products: result.data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    }, '搜索成功');
  } catch (err) {
    console.error('[Search] Query error:', err);
    throw err;
  }
}

/**
 * 保存搜索历史
 */
async function handleSaveHistory(params, openid) {
  const { keyword } = params;

  if (!keyword || !keyword.trim()) {
    return error(ErrorCodes.INVALID_PARAMS, '关键词不能为空');
  }

  const trimmedKeyword = keyword.trim();

  try {
    // 查找是否已存在该关键词的搜索记录
    const existing = await db.collection('search_history')
      .where({
        _openid: openid,
        keyword: trimmedKeyword
      })
      .get();

    if (existing.data.length > 0) {
      // 更新搜索次数和时间
      await db.collection('search_history')
        .doc(existing.data[0]._id)
        .update({
          data: {
            searchCount: _.inc(1),
            lastSearchTime: new Date()
          }
        });
    } else {
      // 新增搜索记录
      await db.collection('search_history').add({
        data: {
          _openid: openid,
          keyword: trimmedKeyword,
          searchCount: 1,
          lastSearchTime: new Date()
        }
      });
    }

    return success(null, '保存成功');
  } catch (err) {
    console.error('[Search] Save history error:', err);
    throw err;
  }
}

/**
 * 获取搜索历史
 */
async function handleGetHistory(params, openid) {
  const { limit = 10 } = params;

  try {
    const result = await db.collection('search_history')
      .where({
        _openid: openid
      })
      .orderBy('lastSearchTime', 'desc')
      .limit(limit)
      .get();

    return success(result.data, '获取成功');
  } catch (err) {
    console.error('[Search] Get history error:', err);
    throw err;
  }
}

/**
 * 清空搜索历史
 */
async function handleClearHistory(openid) {
  try {
    // 先查询该用户的所有搜索记录
    const records = await db.collection('search_history')
      .where({
        _openid: openid
      })
      .get();

    // 逐条删除
    for (const record of records.data) {
      await db.collection('search_history').doc(record._id).remove();
    }

    return success(null, '清空成功');
  } catch (err) {
    console.error('[Search] Clear history error:', err);
    throw err;
  }
}

/**
 * 获取热门搜索
 */
async function handleGetHotKeywords() {
  try {
    const result = await db.collection('hot_keywords')
      .where({
        status: 'active'
      })
      .orderBy('rank', 'asc')
      .limit(10)
      .get();

    return success(result.data, '获取成功');
  } catch (err) {
    console.error('[Search] Get hot keywords error:', err);
    throw err;
  }
}
EOF
```

验证文件创建成功：
```bash
ls -lh cloudfunctions/search/index.js
wc -l cloudfunctions/search/index.js
```

预期输出: 文件大小合理，行数约250行

- [ ] **Step 2: 验证代码语法**

```bash
node -c cloudfunctions/search/index.js
```

预期输出: 无错误（无输出表示语法正确）

- [ ] **Step 3: 提交云函数代码**

```bash
git add cloudfunctions/search/
git commit -m "feat: 创建搜索云函数

- 实现 search action: 商品搜索（关键词、分类、排序）
- 实现 saveHistory action: 保存搜索历史
- 实现 getHistory action: 获取搜索历史
- 实现 clearHistory action: 清空搜索历史
- 实现 getHotKeywords action: 获取热门搜索
- 复用 common/response.js 统一响应格式
"
```

---

## Chunk 3: 类型定义和API扩展

### Task 6: 扩展类型定义

**文件**: `src/types/index.ts`

- [ ] **Step 1: 在文件末尾添加搜索相关类型定义**

找到文件末尾（大约在第100行之后），添加以下类型：

```typescript
// ==================== 搜索相关类型 ====================

/**
 * 搜索历史记录
 */
export interface SearchHistory {
  _id?: string;
  _openid: string;
  keyword: string;
  searchCount: number;
  lastSearchTime: Date;
}

/**
 * 热门搜索关键词
 */
export interface HotKeyword {
  _id?: string;
  keyword: string;
  rank: number;
  status: 'active' | 'inactive';
}

/**
 * 搜索参数
 */
export interface SearchParams {
  keyword?: string;
  category?: string;
  sortBy?: 'default' | 'price_asc' | 'price_desc' | 'sales_desc';
  page?: number;
  pageSize?: number;
}

/**
 * 搜索结果
 */
export interface SearchResult {
  products: Product[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
```

添加代码到 `src/types/index.ts` 文件末尾。

- [ ] **Step 2: 验证类型定义正确性**

```bash
npm run type-check
```

预期输出: TypeScript 编译无错误

- [ ] **Step 3: 提交类型定义**

```bash
git add src/types/index.ts
git commit -m "feat: 添加搜索相关类型定义

- SearchHistory: 搜索历史记录
- HotKeyword: 热门搜索关键词
- SearchParams: 搜索参数
- SearchResult: 搜索结果
"
```

---

### Task 7: 扩展API接口

**文件**: `src/utils/api.ts`

- [ ] **Step 1: 在文件适当位置添加搜索相关API**

找到 `src/utils/api.ts` 文件，在商品相关API之后（约第200行之后）添加：

```typescript
// ==================== 搜索相关 API ====================

/**
 * 商品搜索
 * @param params 搜索参数（关键词、分类、排序、分页）
 */
export const searchProducts = async (params: SearchParams) => {
  if (typeof wx === 'undefined' || !wx.cloud) {
    throw new Error('当前环境不支持云开发');
  }

  try {
    const res = await callFunction('search', {
      action: 'search',
      data: params
    });

    if (res.code === 0 && res.data) {
      return res.data as SearchResult;
    }
    throw new Error(res.msg || '搜索失败');
  } catch (error) {
    console.error('商品搜索失败:', error);
    throw error;
  }
};

/**
 * 保存搜索历史
 * @param keyword 搜索关键词
 */
export const saveSearchHistory = async (keyword: string) => {
  if (typeof wx === 'undefined' || !wx.cloud) {
    throw new Error('当前环境不支持云开发');
  }

  try {
    const res = await callFunction('search', {
      action: 'saveHistory',
      data: { keyword }
    });

    if (res.code === 0) {
      return true;
    }
    throw new Error(res.msg || '保存失败');
  } catch (error) {
    console.error('保存搜索历史失败:', error);
    // 静默失败，不影响用户体验
    return false;
  }
};

/**
 * 获取搜索历史
 * @param limit 返回数量限制
 */
export const getSearchHistory = async (limit = 10) => {
  if (typeof wx === 'undefined' || !wx.cloud) {
    throw new Error('当前环境不支持云开发');
  }

  try {
    const res = await callFunction('search', {
      action: 'getHistory',
      data: { limit }
    });

    if (res.code === 0 && res.data) {
      return res.data as SearchHistory[];
    }
    return [];
  } catch (error) {
    console.error('获取搜索历史失败:', error);
    return [];
  }
};

/**
 * 清空搜索历史
 */
export const clearSearchHistory = async () => {
  if (typeof wx === 'undefined' || !wx.cloud) {
    throw new Error('当前环境不支持云开发');
  }

  try {
    const res = await callFunction('search', {
      action: 'clearHistory',
      data: {}
    });

    if (res.code === 0) {
      return true;
    }
    throw new Error(res.msg || '清空失败');
  } catch (error) {
    console.error('清空搜索历史失败:', error);
    throw error;
  }
};

/**
 * 获取热门搜索
 */
export const getHotKeywords = async () => {
  if (typeof wx === 'undefined' || !wx.cloud) {
    throw new Error('当前环境不支持云开发');
  }

  try {
    const res = await callFunction('search', {
      action: 'getHotKeywords',
      data: {}
    });

    if (res.code === 0 && res.data) {
      return res.data as HotKeyword[];
    }
    return [];
  } catch (error) {
    console.error('获取热门搜索失败:', error);
    return [];
  }
};
```

- [ ] **Step 2: 确保导入了新类型**

检查文件顶部的 import 语句，确保包含了新添加的类型：

```typescript
import type { Product, Category, CartItem, Order, UserInfo, Address, CouponTemplate, UserCoupon, CommissionV2Response, SearchParams, SearchResult, SearchHistory, HotKeyword } from '@/types';
```

- [ ] **Step 3: 验证API接口正确性**

```bash
npm run type-check
```

预期输出: TypeScript 编译无错误

- [ ] **Step 4: 提交API接口**

```bash
git add src/utils/api.ts
git commit -m "feat: 添加搜索相关API接口

- searchProducts: 商品搜索
- saveSearchHistory: 保存搜索历史
- getSearchHistory: 获取搜索历史
- clearSearchHistory: 清空搜索历史
- getHotKeywords: 获取热门搜索
- 添加完整的错误处理和类型定义
"
```

---

## Chunk 4: 搜索页面开发

### Task 8: 添加搜索页面路由

**文件**: `src/pages.json`

- [ ] **Step 1: 在 pages 数组中添加搜索页面路由**

找到 `"pages"` 数组，在 `"pages/user/user"` 之后添加：

```json
{
  "path": "pages/search/index",
  "style": {
    "navigationBarTitleText": "搜索",
    "navigationBarBackgroundColor": "#1A1A1A",
    "navigationBarTextStyle": "white",
    "enablePullDownRefresh": false
  }
}
```

添加后的完整配置应类似：

```json
"pages": [
  {
    "path": "pages/index/index",
    ...
  },
  ...
  {
    "path": "pages/user/user",
    ...
  },
  {
    "path": "pages/search/index",
    "style": {
      "navigationBarTitleText": "搜索",
      "navigationBarBackgroundColor": "#1A1A1A",
      "navigationBarTextStyle": "white",
      "enablePullDownRefresh": false
    }
  }
]
```

- [ ] **Step 2: 验证 JSON 格式正确性**

```bash
node -e "JSON.parse(require('fs').readFileSync('src/pages.json', 'utf8'))"
```

预期输出: 无错误（无输出表示JSON格式正确）

- [ ] **Step 3: 提交路由配置**

```bash
git add src/pages.json
git commit -m "feat: 添加搜索页面路由

- 路径: pages/search/index
- 导航栏样式: 黑色背景 + 白色文字
- 符合东方美学设计风格
"
```

---

### Task 9: 创建搜索页面

**文件**: `src/pages/search/index.vue`

- [ ] **Step 1: 创建搜索页面目录**

```bash
mkdir -p src/pages/search
```

- [ ] **Step 2: 创建搜索页面文件**

```bash
cat > src/pages/search/index.vue << 'EOF'
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
EOF
```

验证文件创建成功：
```bash
ls -lh src/pages/search/index.vue
wc -l src/pages/search/index.vue
```

预期输出: 文件大小合理，约700行代码

- [ ] **Step 3: 验证 TypeScript 类型正确性**

```bash
npm run type-check
```

预期输出: TypeScript 编译无错误

- [ ] **Step 4: 提交搜索页面**

```bash
git add src/pages/search/
git commit -m "feat: 实现搜索页面

- 搜索框 + 取消按钮
- 热门搜索关键词展示
- 搜索历史记录（支持清空）
- 搜索结果列表
- 排序功能（综合、销量、价格）
- 分页加载
- 空状态提示
- 加载状态
- 东方美学设计风格
"
```

---

## Chunk 5: 首页集成和测试

### Task 10: 完善首页搜索跳转

**文件**: `src/pages/index/index.vue`

- [ ] **Step 1: 检查现有的 goToSearch 方法**

检查文件中是否已有 `goToSearch` 方法，如果没有则添加。

搜索文件中的 `goToSearch`：
```bash
grep -n "goToSearch" src/pages/index/index.vue
```

如果找到，验证其实现是否正确跳转到搜索页面。

- [ ] **Step 2: 确保 goToSearch 方法实现正确**

在 script setup 部分添加或更新方法：

```typescript
/**
 * 跳转到搜索页面
 */
function goToSearch() {
  uni.navigateTo({
    url: '/pages/search/index'
  });
}
```

- [ ] **Step 3: 验证跳转功能**

保存文件并验证 TypeScript 编译：

```bash
npm run type-check
```

预期输出: TypeScript 编译无错误

- [ ] **Step 4: 提交首页搜索集成**

```bash
git add src/pages/index/index.vue
git commit -m "fix: 确保首页搜索跳转功能正常

- 验证 goToSearch 方法实现
- 跳转到 /pages/search/index
"
```

---

### Task 11: 部署和测试

- [ ] **Step 1: 部署 search 云函数**

使用 CloudBase 控制台或 MCP 工具部署云函数：

**方式一：使用 CloudBase 控制台**
1. 登录腾讯云 CloudBase 控制台
2. 选择环境: cloud1-6gmp2q0y3171c353
3. 进入云函数管理
4. 点击"新建云函数"
5. 函数名称: `search`
6. 运行时: Node.js 16.13
7. 上传代码: 选择 `cloudfunctions/search/` 目录
8. 点击"部署"

**方式二：使用 MCP 工具（如果可用）**
```bash
# 需要先登录 CloudBase
# 然后：
mcp__cloudbase__createFunction -f <deploy-config>
```

- [ ] **Step 2: 编译前端代码**

```bash
npm run build:mp-weixin
```

预期输出: 编译成功，无错误

- [ ] **Step 3: 在微信开发者工具中测试**

1. 打开微信开发者工具
2. 导入项目: `dist/build/mp-weixin/`
3. 测试搜索功能：
   - 点击首页搜索框 → 跳转到搜索页面
   - 查看热门搜索是否显示
   - 输入关键词搜索 → 查看搜索结果
   - 测试排序功能（综合、销量、价格）
   - 测试搜索历史保存
   - 测试清空搜索历史
   - 测试分页加载
   - 测试空状态

- [ ] **Step 4: 云函数日志验证**

在 CloudBase 控制台查看 search 云函数的日志：
- 检查是否有错误日志
- 验证搜索查询是否正常执行
- 验证搜索历史是否正常保存

- [ ] **Step 5: 功能验证清单**

完成以下功能验证：

- [ ] 首页搜索框点击跳转到搜索页面
- [ ] 热门搜索关键词显示正确
- [ ] 输入关键词后按回车可以搜索
- [ ] 搜索结果显示正确
- [ ] 点击热门搜索关键词可以搜索
- [ ] 点击搜索历史可以再次搜索
- [ ] 排序功能正常（综合、销量、价格升序、价格降序）
- [ ] 搜索历史自动保存
- [ ] 清空搜索历史功能正常
- [ ] 分页加载功能正常
- [ ] 无搜索结果时显示空状态
- [ ] 点击商品跳转到详情页
- [ ] 加载状态显示正常
- [ ] 页面样式符合东方美学设计风格

- [ ] **Step 6: 性能测试**

测试搜索性能：
- 搜索响应时间 < 2秒
- 热门搜索加载 < 1秒
- 搜索历史加载 < 1秒
- 页面切换流畅

- [ ] **Step 7: 兼容性测试**

在不同设备上测试：
- [ ] iOS 微信小程序
- [ ] Android 微信小程序
- [ ] 不同屏幕尺寸适配

- [ ] **Step 8: 提交最终代码**

```bash
git add .
git commit -m "test: 完成商品搜索系统测试

- 云函数部署成功
- 前端编译成功
- 功能验证通过
- 性能测试通过
- 兼容性测试通过
"
```

---

## 验收标准

### 功能完整性
- ✅ 用户可以通过关键词搜索商品
- ✅ 支持按分类筛选商品
- ✅ 支持按销量、价格排序
- ✅ 热门搜索关键词展示
- ✅ 搜索历史记录保存和展示
- ✅ 支持清空搜索历史
- ✅ 分页加载搜索结果
- ✅ 空状态提示

### 性能要求
- ✅ 搜索响应时间 < 2秒
- ✅ 页面加载流畅
- ✅ 数据库查询使用索引优化

### 设计规范
- ✅ 符合东方美学设计风格
- ✅ 配色使用深棕色、琥珀金
- ✅ UI 细节精致
- ✅ 响应式设计

### 代码质量
- ✅ TypeScript 类型完整
- ✅ 代码注释清晰
- ✅ 错误处理完善
- ✅ 遵循现有代码规范

---

## 风险与注意事项

### 已知风险
1. **NoSQL 模糊搜索性能**: 使用 `db.RegExp` 进行模糊匹配，在数据量大时可能影响性能
   - **应对**: 已为 name 字段添加索引，限制返回数量（分页）

2. **搜索历史数据增长**: 用户搜索历史会持续增长
   - **应对**: 可以定期清理旧数据，或在云函数中添加限制（如只保留最近100条）

3. **热门搜索管理**: 目前热门搜索是静态数据，需要手动更新
   - **应对**: 后期可以开发管理后台，支持动态管理热门搜索

### 测试注意事项
- 使用真实数据测试搜索功能
- 测试特殊字符搜索（如空格、特殊符号）
- 测试网络异常情况
- 测试并发搜索请求

---

## 下一步计划（Phase 2: 商品评价系统）

完成搜索系统后，将继续实施：
1. 创建 comments 数据库集合
2. 创建 comment 云函数
3. 实现评价列表页面
4. 实现评价提交页面
5. 集成到订单详情和商品详情
