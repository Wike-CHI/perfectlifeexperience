# 云函数 Layer 迁移指南

## 概述

本文档说明如何将现有的云函数从 `./common/` 目录方式迁移到使用 CloudBase Layer。

## 迁移步骤

### 1. 部署 Layer

```bash
# 使用 CloudBase CLI 部署 Layer
tcb layer deploy common-layer --codeUri ./cloudfunctions/layer/shared
```

### 2. 更新云函数 package.json

**修改前**:
```json
{
  "name": "order",
  "dependencies": {
    "wx-server-sdk": "latest"
  }
}
```

**修改后**:
```json
{
  "name": "order",
  "dependencies": {
    "wx-server-sdk": "latest"
  },
  "cloudfunction": {
    "memorySize": 256,
    "timeout": 20,
    "layers": [
      {
        "name": "common-layer",
        "version": 1
      }
    ]
  }
}
```

### 3. 更新云函数代码中的引用

**修改前**（当前方式）:
```javascript
const { createLogger } = require('./common/logger');
const { success, error, ErrorCodes } = require('./common/response');
const { validateAmount } = require('./common/validator');
```

**修改后**（使用 Layer）:
```javascript
// 从 Layer 引入所有共享模块
const {
  createLogger,
  success,
  error,
  ErrorCodes,
  validateAmount,
  Amount,
  Collections,
  checkRateLimit,
  userCache,
  productCache
} = require('/opt/shared');

const logger = createLogger('order');
```

### 4. 删除云函数中的 common 目录

迁移完成后，可以删除云函数中的 `common/` 目录：

```bash
# 删除 order 云函数的 common 目录
rm -rf cloudfunctions/order/common/

# 删除其他云函数的 common 目录
rm -rf cloudfunctions/promotion/common/
rm -rf cloudfunctions/user/common/
rm -rf cloudfunctions/wallet/common/
rm -rf cloudfunctions/product/common/
rm -rf cloudfunctions/commission-wallet/common/
```

## 引用对照表

| 原路径 | 新路径（Layer） |
|--------|----------------|
| `require('./common/logger')` | `require('/opt/shared').createLogger` |
| `require('./common/response')` | `require('/opt/shared').success/error` |
| `require('./common/constants')` | `require('/opt/shared').Amount/Collections/...` |
| `require('./common/validator')` | `require('/opt/shared').validateAmount/...` |
| `require('./common/cache')` | `require('/opt/shared').userCache/...` |
| `require('./common/rateLimiter')` | `require('/opt/shared').checkRateLimit` |
| `require('./common/reward-settlement')` | `require('/opt/shared').settleWithRetry` |

## 完整迁移示例

### 迁移前的 order/index.js

```javascript
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const { createLogger } = require('./common/logger');
const { success, error, ErrorCodes } = require('./common/response');
const { validateAmount } = require('./common/validator');
const { Amount, Collections } = require('./common/constants');
const { userCache } = require('./common/cache');
const { checkRateLimit } = require('./common/rateLimiter');

const logger = createLogger('order');

exports.main = async (event, context) => {
  // 业务逻辑...
};
```

### 迁移后的 order/index.js

```javascript
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

// 从 Layer 引入所有共享模块
const {
  createLogger,
  success,
  error,
  ErrorCodes,
  validateAmount,
  Amount,
  Collections,
  userCache,
  checkRateLimit
} = require('/opt/shared');

const logger = createLogger('order');

exports.main = async (event, context) => {
  // 业务逻辑（完全相同）
};
```

## 注意事项

1. **部署顺序**：先部署 Layer，再部署云函数
2. **版本管理**：更新 Layer 后需要更新云函数配置中的版本号
3. **本地调试**：本地调试时需要模拟 `/opt/shared` 路径
4. **回滚**：保留原 `common/` 目录直到确认 Layer 工作正常

## 本地调试方案

如果需要本地调试，可以创建一个软链接：

```bash
# Linux/macOS
ln -s ./cloudfunctions/layer/shared /opt/shared

# Windows (管理员权限)
mklink /D C:\opt\shared D:\gsxm\dyyqxcx\perfectlifeexperience\cloudfunctions\layer\shared
```

或者在代码中使用条件判断：

```javascript
// 兼容本地调试
const shared = process.env.TENCENTCLOUD_RUNENV === 'scf'
  ? require('/opt/shared')  // 云端：使用 Layer
  : require('./common');     // 本地：使用本地 common

const { createLogger, success, error } = shared;
```
