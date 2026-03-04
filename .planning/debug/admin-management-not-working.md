---
status: investigating
trigger: "管理端小程序（pagesAdmin）无法管理小程序，商品信息无法管理，其他所有功能只是空壳"
created: "2026-03-04"
updated: "2026-03-04"
---

## Current Focus

**问题确认**：登录成功，商品数据也能返回，但前端不显示

**根因**：前后端数据格式不一致 - callFunction将云函数返回值嵌套在data里，导致 `res.data.list` 实际变成了 `res.data.data.list`

**修复方案**：
1. 修改 callFunction 函数，检测云函数返回值是否已包含code，如果是就直接返回
2. 在 api.ts 中添加 extractData 辅助函数，兼容两种返回格式

## Symptoms

expected: 可以完整管理小程序
actual: 点击编辑无反应、页面数据为空、云函数调用失败
errors: 无提示但不生效
reproduction: 在微信开发者工具和真机上测试都失败
timeline: 从一开始就不行
features: 全部功能都不行
account: 管理员账号 (admin)

## Investigation Progress

### 已检查项目

1. **admin-api云函数入口 (index.js)**
   - 状态: 已检查
   - 发现: 第89-93行检查JWT_SECRET环境变量
   - 代码:
     ```javascript
     const JWT_SECRET = process.env.JWT_SECRET
     if (!JWT_SECRET) {
       throw new Error('JWT_SECRET environment variable is required')
     }
     ```

2. **前端调用方式**
   - 状态: 已检查
   - 发现: AdminAuthManager正确传递adminToken
   - 代码: `adminToken: AdminAuthManager.getToken()`
   - 结果: 前端调用正确

3. **权限验证逻辑**
   - 状态: 已检查
   - 发现: 公开action列表正确(adminLogin, checkAuth, checkAdminStatus)
   - 结果: 权限系统设计正确

4. **auth.js认证逻辑**
   - 状态: 已检查
   - 发现: 验证逻辑完整，支持bcrypt密码验证
   - 结果: 认证功能实现正确

## Evidence

- timestamp: "2026-03-04"
  checked: "cloudfunctions/admin-api/index.js 第89-93行"
  found: "JWT_SECRET环境变量未配置时抛出错误"
  implication: "这是导致整个云函数无法启动的根本原因"

- timestamp: "2026-03-04"
  checked: "src/pagesAdmin/products/list.vue"
  found: "前端正确传递adminToken: AdminAuthManager.getToken()"
  implication: "前端代码调用方式正确"

- timestamp: "2026-03-04"
  checked: "cloudfunctions/admin-api/permissions.js"
  found: "公开action列表正确: adminLogin, checkAuth, checkAdminStatus"
  implication: "权限验证设计正确"

## Eliminated

- hypothesis: "前端API调用路径错误"
  evidence: "前端正确调用callFunction('admin-api', {action, adminToken})"
  timestamp: "2026-03-04"

- hypothesis: "权限验证逻辑错误"
  evidence: "permissions.js中PUBLIC_ACTIONS配置正确"
  timestamp: "2026-03-04"

## Resolution (已修复)

root_cause: "callFunction将云函数返回值（已包含code字段）嵌套在data里，导致数据路径错误"

fix: "修改 src/utils/cloudbase.ts 中的 callFunction 函数，让它检测云函数返回值是否已包含code，如果是就直接返回"

files_changed:
  - src/utils/cloudbase.ts (修改callFunction函数)
  - src/pagesAdmin/products/list.vue (恢复简洁代码)

verification: "重新编译后测试商品列表页面是否正常显示"

---

## 修复指导

### 问题根因

admin-api云函数在启动时需要JWT_SECRET环境变量来生成和验证JWT token。该变量未配置会导致云函数抛出错误:

```
Error: JWT_SECRET environment variable is required
```

这解释了为什么:
1. 登录可能失败（如果JWT_SECRET检查发生在任何代码之前）
2. 所有管理功能都无法工作（云函数无法正常启动）

### 修复步骤

1. 登录腾讯云CloudBase控制台
2. 找到环境: cloud1-6gmp2q0y3171c353
3. 进入云函数管理，找到admin-api云函数
4. 在"函数配置"中添加环境变量:
   - 变量名: JWT_SECRET
   - 变量值: 一个强随机字符串（建议使用32位以上的随机字符串）
5. 重新部署云函数

### 建议

1. **生产环境**: 使用安全的密钥管理服务存储JWT_SECRET
2. **开发环境**: 可以使用简单的随机字符串进行测试
3. **建议的JWT_SECRET生成方式**:
   - 使用Node.js: `require('crypto').randomBytes(32).toString('hex')`
   - 或使用在线随机字符串生成器生成32位以上的随机字符串
