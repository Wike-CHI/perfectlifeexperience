---
created: 2026-03-05T07:30:00.000Z
title: 修复测试文件编码问题
area: testing
files:
  - cloudfunctions/admin-api/modules/category.test.js
  - cloudfunctions/admin-api/modules/store.test.js
status: completed
---

## Problem

创建的测试文件存在编码问题，无法正常运行。运行 `node` 时报 SyntaxError: Unexpected token ')' 错误，原因是文件编码问题导致语法错误。

## Solution

1. 修复 category.test.js 编码问题 - 使用纯 ASCII 字符重写
2. 修复 store.test.js 编码问题 - 使用纯 ASCII 字符重写
3. 使用简单测试框架重写测试（避免复杂 mock）
4. 完善 mock 数据库以支持实际的 API 调用链

## Results

### store.test.js (10 tests)
- getStores basic
- getStores pagination
- getStoreDetail
- getStoreDetail missing id
- createStore
- createStore missing name
- updateStore
- deleteStore (no orders)
- deleteStore (has orders - should fail)
- setDefaultStore

### category.test.js (14 tests)
- getCategories basic
- getCategories pagination
- getCategories empty
- getCategoryDetail
- getCategoryDetail missing id
- getCategoryDetail not found
- createCategory
- createCategory missing name
- updateCategory
- updateCategory missing id
- updateCategory missing name
- deleteCategory
- deleteCategory missing id
- deleteCategory with products

## Context

- 测试文件已创建在 cloudfunctions/admin-api/modules/ 目录
- 现有其他测试文件（如 banner.test.js）可以正常运行
- 使用简单 assert 风格测试，无需外部测试框架
