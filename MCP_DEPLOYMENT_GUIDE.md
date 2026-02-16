# CloudBase MCP 云函数部署指南

## 📋 当前状态

项目已配置 CloudBase MCP 服务器：
- **环境 ID**: `cloud1-6gmp2q0y3171c353`
- **函数名**: `promotion`
- **MCP 配置**: `.mcp.json` ✅

## 🚀 部署方式

### 方式一：微信开发者工具（强烈推荐）

**时间**: 30秒
**难度**: ⭐

```
1. 打开微信开发者工具
2. 左侧目录 → cloudfunctions → promotion
3. 右键 promotion 文件夹
4. 选择 "上传并部署：云端安装依赖"
5. 等待完成 ✅
```

**优势**:
- 最简单直观
- 无需安装额外工具
- 自动安装依赖
- 实时查看部署日志

---

### 方式二：CloudBase MCP 工具（通过 Claude Code）

**时间**: 2分钟
**难度**: ⭐⭐

CloudBase MCP 服务器已在 `.mcp.json` 中配置，可用的工具包括：

#### 可用的 MCP 工具：

1. **mcp__cloudbase__login** - 登录云开发环境
2. **mcp__cloudbase__getFunctionList** - 获取云函数列表
3. **mcp__cloudbase__updateFunctionCode** - 更新云函数代码
4. **mcp__cloudbase__updateFunctionConfig** - 更新云函数配置
5. **mcp__cloudbase__invokeFunction** - 调用云函数
6. **mcp__cloudbase__getFunctionLogs** - 获取云函数日志

#### 使用步骤：

**注意**: MCP 工具需要在 Claude Code 对话中通过工具调用使用。

如果需要在当前会话中使用 MCP 工具，请告诉我：
- "使用 MCP 登录 CloudBase"
- "使用 MCP 更新 promotion 云函数"
- "使用 MCP 查看云函数列表"

---

### 方式三：CloudBase CLI

**时间**: 5分钟
**难度**: ⭐⭐⭐

#### 1. 安装 CLI

```bash
npm install -g @cloudbase/cli
```

#### 2. 登录

```bash
tcb login
# 会打开浏览器，扫描二维码登录
```

#### 3. 部署

```bash
cd cloudfunctions/promotion
tcb functions:deploy promotion --envId cloud1-6gmp2q0y3171c353
```

**使用脚本**:
```bash
# 使用项目提供的部署脚本
./deploy-with-tcb-cli.sh
# 或
node deploy-cloud-function.js
```

---

### 方式四：CloudBase 控制台手动上传

**时间**: 10分钟
**难度**: ⭐⭐⭐⭐

1. 访问: https://tcb.cloud.tencent.com/dev?envId=cloud1-6gmp2q0y3171c353#/function
2. 找到 `promotion` 云函数
3. 点击 "函数代码"
4. 在线编辑或上传 zip 包
5. 保存并部署

---

## ✅ 部署验证清单

部署完成后，请执行以下验证：

### 1. 检查云函数状态

```
访问: https://tcb.cloud.tencent.com/dev?envId=cloud1-6gmp2q0y3171c353#/function

确认:
- promotion 云函数状态为 "正常"
- 运行时: Nodejs16.13
- 内存: 256MB (或更高)
```

### 2. 验证佣金配置

在"函数代码"中查看 `common/constants.js`:

```javascript
// 应该看到以下配置 ✅
HEAD_OFFICE_SHARE: 0.80,    // 80%
COMMISSION: {
  LEVEL_1: 0.10,            // 10%
  LEVEL_2: 0.06,            // 6%
  LEVEL_3: 0.03,            // 3%
  LEVEL_4: 0.01             // 1%
}
```

### 3. 测试订单佣金计算

创建一笔测试订单（¥100）:

| 项目 | 预期值 | 实际值 |
|------|--------|--------|
| 订单金额 | ¥100 | ____ |
| 总公司收益 | ¥80 (80%) | ____ |
| 代理总收益 | ¥20 (20%) | ____ |
| 一级代理 | ¥10 (10%) | ____ |
| 二级代理 | ¥6 (6%) | ____ |
| 三级代理 | ¥3 (3%) | ____ |
| 四级代理 | ¥1 (1%) | ____ |

### 4. 检查数据库记录

查看 `reward_records` 集合中的最新记录，确认 `ratio` 字段使用新比例。

---

## 📚 相关文档

- **完整部署指南**: `DEPLOY_PROMOTION_GUIDE.md`
- **佣金调整方案**: `docs/system/COMMISSION_RESTRUCTURE_2026.md`
- **系统技术文档**: `docs/system/PROMOTION_SYSTEM.md`
- **CloudBase 官方文档**: https://docs.cloudbase.net/

---

## 💡 推荐方案

**对于开发和测试环境**：
→ 使用微信开发者工具（方式一）
- 速度快，操作简单
- 适合频繁调试

**对于生产环境**：
→ 使用 CloudBase CLI（方式三）
- 可集成到 CI/CD 流程
- 支持批量部署
- 有完整的部署日志

**对于一次性部署**：
→ 使用 MCP 工具（方式二）
- 无需离开 Claude Code
- 快速便捷
- 适合小规模更新

---

## 🔧 故障排查

### 问题1：MCP 工具无法使用

**原因**: CloudBase MCP 服务器未正确启动或未登录

**解决方案**:
1. 检查 `.mcp.json` 配置是否正确
2. 重新启动 Claude Code
3. 使用其他部署方式（CLI 或微信开发者工具）

### 问题2：部署失败

**原因**:
- 网络问题
- 依赖安装失败
- 代码语法错误

**解决方案**:
1. 检查网络连接
2. 使用"不安装依赖"模式部署
3. 查看云函数日志排查错误

### 问题3：佣金计算不正确

**原因**: 代码未正确部署或缓存未清除

**解决方案**:
1. 确认云函数代码已更新
2. 查看云函数实时日志
3. 清除前端缓存重新测试

---

**准备好了吗？选择最适合你的方式开始部署吧！** 🚀
