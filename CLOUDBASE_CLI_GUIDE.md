# CloudBase CLI 配置指南

## 1. 安装 CloudBase CLI

### macOS (推荐)
```bash
npm install -g @cloudbase/cli
```

### Windows
```bash
npm install -g @cloudbase/cli
```

### 验证安装
```bash
cloudbase --version
# 或
tcb --version
```

---

## 2. 登录 CloudBase

```bash
cloudbase login
```

会打开浏览器进行微信扫码登录。

---

## 3. 配置数据库安全规则

**重要**: CloudBase 现在的界面中，安全规则是**按集合单独配置**的，不再有全局规则页面。

### 方法 A: 使用控制台手动配置（推荐）

每个集合需要单独配置安全规则：

1. 访问文档型数据库页面：
   ```
   https://tcb.cloud.tencent.com/dev?envId=cloud1-6gmp2q0y3171c353#/db/doc
   ```

2. 点击集合名称进入详情页，例如配置 `orders` 集合：
   ```
   https://tcb.cloud.tencent.com/dev?envId=cloud1-6gmp2q0y3171c353#/db/doc/collection/orders
   ```

3. 在集合详情页找到「权限设置」或「安全规则」标签页

4. 粘贴对应集合的规则（参考 `database.rules.json`）

### 需要配置的关键集合

| 集合名 | 控制台链接 | 安全级别 |
|--------|-----------|----------|
| users | [点击配置](https://tcb.cloud.tencent.com/dev?envId=cloud1-6gmp2q0y3171c353#/db/doc/collection/users) | 自定义 |
| orders | [点击配置](https://tcb.cloud.tencent.com/dev?envId=cloud1-6gmp2q0y3171c353#/db/doc/collection/orders) | 自定义 |
| user_wallets | [点击配置](https://tcb.cloud.tencent.com/dev?envId=cloud1-6gmp2q0y3171c353#/db/doc/collection/user_wallets) | 只读 |
| commission_wallets | [点击配置](https://tcb.cloud.tencent.com/dev?envId=cloud1-6gmp2q0y3171c353#/db/doc/collection/commission_wallets) | 私有 |
| promotion_relations | [点击配置](https://tcb.cloud.tencent.com/dev?envId=cloud1-6gmp2q0y3171c353#/db/doc/collection/promotion_relations) | 自定义 |
| products | [点击配置](https://tcb.cloud.tencent.com/dev?envId=cloud1-6gmp2q0y3171c353#/db/doc/collection/products) | 只读 |

### 方法 B: 使用 MCP 工具配置（如果支持）

```bash
# 检查是否有 MCP 工具可以批量配置
# 目前 CloudBase CLI 不支持直接修改安全规则
```

---

## 4. 配置云函数环境变量（wechatpay）

```bash
# 设置 wechatpay 云函数的环境变量
cloudbase functions:config update wechatpay \
  WX_PAY_MCH_ID="你的商户号" \
  WX_PAY_SERIAL_NO="证书序列号" \
  WX_PAY_API_V3_KEY="APIv3密钥" \
  WX_PAY_NOTIFY_URL="支付回调URL"
```

---

## 5. 部署云函数

```bash
# 部署所有云函数
cloudbase functions:deploy cloudfunctions

# 或部署单个云函数
cloudbase functions:deploy cloudfunctions/wechatpay
cloudbase functions:deploy cloudfunctions/promotion
cloudbase functions:deploy cloudfunctions/migration
```

---

## 6. 创建数据库索引（可选）

```bash
# 调用 migration 云函数生成索引配置
cloudbase functions:invoke migration --action createIndexesV3
```

---

## 7. 查看云函数日志

```bash
# 查看 wechatpay 云函数日志
cloudbase functions:log wechatpay
```

---

## 快捷配置脚本

创建 `setup.sh` 文件：

```bash
#!/bin/bash

echo "🚀 开始配置 CloudBase 项目..."

# 1. 登录
echo "📝 步骤 1: 登录 CloudBase"
cloudbase login

# 2. 部署云函数
echo "📦 步骤 2: 部署云函数"
cloudbase functions:deploy cloudfunctions/wechatpay
cloudbase functions:deploy cloudfunctions/promotion
cloudbase functions:deploy cloudfunctions/migration

# 3. 配置环境变量（需要手动填写）
echo "⚠️  步骤 3: 配置 wechatpay 环境变量"
echo "请手动执行以下命令（替换实际值）："
echo "cloudbase functions:config update wechatpay WX_PAY_MCH_ID='你的商户号' ..."
```

---

## 注意事项

1. **安全规则配置**: CloudBase CLI 目前不支持直接更新安全规则，需要手动在控制台配置
2. **环境变量**: 敏感信息（商户私钥）建议通过控制台配置，而不是命令行
3. **权限**: 确保 CLI 有权限访问该 CloudBase 环境

---

## 控制台快捷链接

**核心功能入口**:

- **概览**: https://tcb.cloud.tencent.com/dev?envId=cloud1-6gmp2q0y3171c353#/overview
- **文档型数据库**: https://tcb.cloud.tencent.com/dev?envId=cloud1-6gmp2q0y3171c353#/db/doc
- **云函数**: https://tcb.cloud.tencent.com/dev?envId=cloud1-6gmp2q0y3171c353#/scf
- **云存储**: https://tcb.cloud.tencent.com/dev?envId=cloud1-6gmp2q0y3171c353#/storage
- **静态网站托管**: https://tcb.cloud.tencent.com/dev?envId=cloud1-6gmp2q0y3171c353#/hosting
- **环境设置**: https://tcb.cloud.tencent.com/dev?envId=cloud1-6gmp2q0y3171c353#/settings

**集合权限配置** (需要单独配置每个集合):

- [users 集合权限](https://tcb.cloud.tencent.com/dev?envId=cloud1-6gmp2q0y3171c353#/db/doc/collection/users)
- [orders 集合权限](https://tcb.cloud.tencent.com/dev?envId=cloud1-6gmp2q0y3171c353#/db/doc/collection/orders)
- [products 集合权限](https://tcb.cloud.tencent.com/dev?envId=cloud1-6gmp2q0y3171c353#/db/doc/collection/products)
- [user_wallets 集合权限](https://tcb.cloud.tencent.com/dev?envId=cloud1-6gmp2q0y3171c353#/db/doc/collection/user_wallets)
- [commission_wallets 集合权限](https://tcb.cloud.tencent.com/dev?envId=cloud1-6gmp2q0y3171c353#/db/doc/collection/commission_wallets)
