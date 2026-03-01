# 安全审计报告

**审计日期**: 2026-02-28
**审计范围**: 全量代码审查

---

## 已修复的安全问题

### 1. 敏感信息泄露

| 问题 | 修复状态 | 修复方式 |
|-----|---------|---------|
| 微信支付私钥硬编码 | 已修复 | `cloudfunctions/wechatpay/config.js` 改为从环境变量读取 |
| 云环境ID硬编码 | 已修复 | `src/utils/cloudbase.ts` 改为从 `import.meta.env.VUE_APP_ENV_ID` 读取 |
| 小程序 AppID 硬编码 | 已修复 | `cloudfunctions/login/index.js` 改为从环境变量读取 |
| .gitignore 保护 | 已修复 | 添加了 `.env`、`支付密钥/`、证书文件等保护规则 |

### 2. 文件上传安全

| 问题 | 修复状态 | 修复方式 |
|-----|---------|---------|
| 缺少文件类型验证 | 已修复 | 添加了 MIME 类型白名单（image/jpeg, png, gif, webp） |
| 缺少文件大小限制 | 已修复 | 限制 5MB 最大，1KB 最小 |
| 缺少文件扩展名验证 | 已修复 | 验证扩展名白名单并检查非法字符 |
| 缺少文件内容验证 | 已修复 | 使用 Magic Number 验证文件真实性，防止伪装攻击 |
| 路径遍历漏洞 | 已修复 | 检查 `..` 和 `./` 等路径遍历字符 |

### 3. 管理员权限验证

| 问题 | 修复状态 | 说明 |
|-----|---------|------|
| 权限验证分散 | 已审查 | 项目已有完善的权限映射表 (`permissions.js`) 和统一验证中间件 |
| 权限粒度 | 已审查 | 已实现细粒度权限控制（如 order.view, order.update 等） |

---

## 依赖包安全漏洞

运行 `npm audit` 发现以下漏洞：

### 高危漏洞

| 包名 | 严重性 | 漏洞描述 | 影响 |
|-----|--------|---------|------|
| @modelcontextprotocol/sdk | high | ReDoS、跨客户端数据泄漏、DNS 重绑定保护缺失 | 开发工具依赖 |
| body-parser | high | URL 编码 DoS 攻击 | API 请求处理 |
| fast-xml-parser | critical | XML 实体扩展攻击、栈溢出 | XML 解析 |
| form-data | critical | 不安全随机数使用 | 表单提交 |
| jws | high | HMAC 签名验证不当 | JWT 验证 |
| minimatch | high | ReDoS 正则回溯 | 路径匹配 |

### 中危漏洞

| 包名 | 严重性 | 漏洞描述 |
|-----|--------|---------|
| ajv | moderate | ReDoS when using `$data` option |
| lodash | moderate | 原型污染漏洞 |

---

## 需要手动执行的修复步骤

### 1. 从 Git 历史中移除敏感文件

```bash
# 在项目根目录执行
git rm -r --cached "支付密钥"
git commit -m "security: 从 Git 中移除敏感文件

- 移除支付密钥目录（包含证书、私钥）
- 这些文件不应提交到版本控制

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

**注意**：如果仓库已推送到远程（GitHub/GitLab），私钥可能已经泄露。建议：
1. 立即更换微信支付证书和 API 密钥
2. 使用 `git filter-branch` 或 BFG Repo-Cleaner 彻底清理历史

### 2. 修复依赖漏洞

```bash
# 自动修复可修复的漏洞
npm audit fix

# 对于无法自动修复的漏洞，需要手动更新
# 特别关注：
# - @cloudbase/mcp 及其依赖
# - body-parser
# - fast-xml-parser
```

### 3. 配置云开发环境变量

在腾讯云开发控制台设置以下环境变量：

**前端 (`src/.env` 文件)**：
```
VUE_APP_ENV_ID=cloud1-6gmp2q0y3171c353
VUE_APP_WEIXIN_APPID=wx4a0b93c3660d1404
```

**云函数环境变量**（在腾讯云控制台设置）：
- `WX_APPID` - 小程序 AppID
- `WX_APP_SECRET` - 小程序密钥
- `WX_MCHID` - 商户号
- `WX_SERIAL_NO` - 证书序列号
- `WX_PRIVATE_KEY` - 商户私钥（完整 PEM 内容）
- `WX_API_V3_KEY` - API v3 密钥
- `WX_NOTIFY_URL` - 支付回调地址
- `JWT_SECRET` - JWT 密钥

---

## 剩余低风险建议

| 建议 | 优先级 | 说明 |
|-----|--------|------|
| XSS 防护库 | 低 | 虽然 Vue 本身有 XSS 防护，但建议在后端输入验证中使用 `xss` npm 包增强防护 |
| 接口限流 | 低 | 对敏感接口（如登录、支付）实现基于 IP 的限流 |
| 日志脱敏 | 低 | 确保生产环境日志中不包含敏感信息（openid、手机号等） |

---

## 总结

本次安全审计已修复以下关键问题：
1. 所有敏感信息已从代码中移除，改为环境变量读取
2. 文件上传功能已添加完整的安全验证
3. 管理员权限验证系统已审查，实现完善
4. 依赖漏洞已识别，提供了修复建议

项目整体安全状况良好，权限控制和输入验证实现规范。建议尽快修复依赖漏洞并更换已泄露的支付密钥。
