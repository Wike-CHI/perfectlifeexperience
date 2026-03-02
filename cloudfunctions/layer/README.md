# CloudBase 云函数 Layer 使用指南

## 目录结构

```
cloudfunctions/
├── layer/                    # 共享层
│   ├── package.json          # 层配置
│   └── shared/               # 共享代码（部署后位于 /opt/shared）
│       ├── index.js          # 统一入口
│       ├── logger.js         # 日志模块
│       ├── response.js       # 响应格式
│       ├── constants.js      # 常量配置
│       ├── cache.js          # 缓存模块
│       ├── validator.js      # 验证工具
│       ├── rateLimiter.js    # 频率限制
│       ├── notification.js   # 通知模块
│       └── reward-settlement.js  # 奖励结算
├── order/                    # 订单云函数
│   ├── index.js
│   └── package.json
├── promotion/                # 推广云函数
│   ├── index.js
│   └── package.json
└── ... 其他云函数
```

## 部署步骤

### 步骤 1：部署 Layer

使用 CloudBase CLI 部署层：

```bash
# 安装 CloudBase CLI（如果未安装）
npm install -g @cloudbase/cli

# 登录
tcb login

# 部署层
tcb fn deploy common-layer --layer --path ./cloudfunctions/layer
```

### 步骤 2：更新云函数引用

将云函数中的引用路径从 `./common/xxx` 改为 `/opt/shared`：

```javascript
// ❌ 旧方式（每个云函数独立副本）
const { success, error, createLogger } = require('./common/response')
const { createLogger } = require('./common/logger')

// ✅ 新方式（使用 Layer）
const { success, error, createLogger } = require('/opt/shared')
```

### 步骤 3：绑定 Layer 到云函数

在云函数的 `package.json` 中添加层配置：

```json
{
  "name": "order",
  "version": "1.0.0",
  "dependencies": {
    "wx-server-sdk": "~2.6.3"
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

### 步骤 4：重新部署云函数

```bash
# 部署单个云函数
tcb fn deploy order

# 部署所有云函数
tcb fn deploy order promotion user wallet product
```

## 在控制台配置 Layer

也可以在 CloudBase 控制台手动配置：

1. 打开 [CloudBase 控制台](https://tcb.cloud.tencent.com/)
2. 进入「云函数」→「层管理」
3. 点击「新建层」
4. 上传 `layer/shared` 目录的 zip 包
5. 进入「云函数」→ 选择函数 →「配置」→「层配置」
6. 添加刚创建的层

## 迁移示例

### 迁移前 (order/index.js)

```javascript
const { createLogger } = require('./common/logger');
const { success, error, ErrorCodes } = require('./common/response');
const { checkRateLimit } = require('./common/rateLimiter');
```

### 迁移后 (order/index.js)

```javascript
const { createLogger, success, error, ErrorCodes, checkRateLimit } = require('/opt/shared');

// 或者分开引用
const { createLogger } = require('/opt/shared/logger');
const { success, error, ErrorCodes } = require('/opt/shared/response');
```

## 注意事项

1. **Layer 版本管理**：每次更新共享代码后，需要发布新的 Layer 版本
2. **向后兼容**：更新 Layer 时注意保持 API 兼容性
3. **测试验证**：部署后测试所有云函数是否正常工作
4. **路径问题**：Layer 代码部署后位于 `/opt` 目录下

## 相关文档

- [使用层 - 腾讯云文档](https://cloud.tencent.com/document/product/583/84282)
- [发布层版本 API](https://cloud.tencent.com/document/product/583/41383)
