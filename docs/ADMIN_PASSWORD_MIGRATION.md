# 管理员密码加密迁移指南

**日期**: 2026-02-13
**目的**: 将管理员明文密码升级为 bcrypt 哈希存储

---

## 🔒️ 安全问题说明

**当前问题** (`cloudfunctions/admin-api/auth.js:21`):
```javascript
// ❌ 不安全的明文比较
if (admin.password !== password) {
  return { success: false, message: '密码错误' };
}
```

**风险**:
- 数据库泄露时所有管理员密码暴露
- 无法审计密码历史
- 不符合安全合规要求

**修复后**:
```javascript
// ✅ 使用 bcrypt 哈希验证
const isValid = await verifyPassword(password, admin.password);
```

---

## 📋 迁移前检查清单

- [ ] 备份 `admins` 数据库集合
- [ ] 确认当前管理员账号和密码
- [ ] 准备测试环境

---

## 🚀 部署步骤

### 步骤 1: 上传更新的代码

1. **部署 admin-api 云函数**
   ```bash
   # 使用云开发控制台或 CLI
   # 上传以下文件：
   - cloudfunctions/admin-api/package.json (已更新)
   - cloudfunctions/admin-api/auth.js (已更新)
   ```

2. **部署 migration 云函数**
   ```bash
   # 上传整个 migrations 目录
   - cloudfunctions/admin-api/migrations/hash_existing_passwords.js
   - cloudfunctions/admin-api/migrations/package.json
   ```

### 步骤 2: 运行迁移脚本

**在云开发控制台执行：**

1. 打开云开发控制台
2. 进入云函数 → admin-api-migration-hash-passwords
3. 点击"云端测试"或"调试"
4. 执行后查看日志确认迁移结果

**预期日志输出：**
```
[密码迁移] 开始迁移管理员密码...
[密码迁移] 正在哈希账号: admin 的密码...
[密码迁移] ✅ 成功迁移账号: admin
[密码迁移] 迁移完成!
[密码迁移] 总计: 2 个账号
[密码迁移] 成功迁移: 2 个
[密码迁移] 跳过（已哈希）: 0 个
```

**返回结果示例：**
```json
{
  "success": true,
  "message": "密码哈希迁移完成",
  "summary": {
    "total": 2,
    "migrated": 2,
    "skipped": 0,
    "failed": 0,
    "errors": []
  }
}
```

### 步骤 3: 验证迁移

**验证数据库：**
1. 在云开发控制台 → 数据库 → admins 集合
2. 检查密码字段格式
   - ✅ bcrypt 哈希应该以 `$2a$` 或 `$2b$` 开头
   - ✅ 长度应该是 60 字符
   - ❌ 不应该看到明文密码

**验证示例：**
```
迁移前（明文）:
{
  "_id": "xxx",
  "username": "admin",
  "password": "mypassword123"  // ❌ 明文
}

迁移后（哈希）:
{
  "_id": "xxx",
  "username": "admin",
  "password": "$2a$10$xyz...abc"  // ✅ bcrypt 哈希
}
```

---

## ✅ 测试验证

### 测试 1: 使用旧密码登录

```javascript
// 测试代码
const result = await verifyAdmin('admin', 'mypassword123');
// 预期：result.success === true
```

### 测试 2: 使用错误密码登录

```javascript
// 测试代码
const result = await verifyAdmin('admin', 'wrongpassword');
// 预期：result.success === false, message === '密码错误'
```

### 测试 3: 查看登录日志

```bash
# 在云开发控制台查看日志
# 应该看到 "Admin verification error" 但不应该看到实际密码
```

---

## 🔙 回滚方案

如果迁移后出现问题：

### 方案 1: 部分回滚

**保留一个测试账号的旧密码**
- 在迁移前记录一个测试账号的明文密码
- 如果需要恢复，手动更新该账号密码为明文
- 临时使用该账号登录

### 方案 2: 完全回滚

```bash
# 1. 从备份恢复 admins 集合
# 2. 回滚 auth.js 代码到旧版本
# 3. 重新部署 admin-api 云函数
```

---

## 📊 迁移后维护

### 创建新管理员

如果需要创建新管理员账号，使用以下方式：

```javascript
// ✅ 正确做法 - 使用哈希
const plainPassword = 'new_password_123';
const hashedPassword = await hashPassword(plainPassword);

await db.collection('admins').add({
  data: {
    username: 'newadmin',
    password: hashedPassword,  // 存储哈希值
    status: 'active',
    role: 'operator',
    createdAt: new Date()
  }
});
```

### 修改管理员密码

创建独立的密码修改接口（TODO）：

```javascript
// 建议实现
async function changePassword(adminId, oldPassword, newPassword) {
  // 1. 验证旧密码
  const admin = await db.collection('admins').doc(adminId).get();
  const isValid = await verifyPassword(oldPassword, admin.data.password);

  if (!isValid) {
    return { success: false, message: '原密码错误' };
  }

  // 2. 哈希新密码
  const newHashedPassword = await hashPassword(newPassword);

  // 3. 更新数据库
  await db.collection('admins').doc(adminId).update({
    data: { password: newHashedPassword }
  });

  return { success: true, message: '密码修改成功' };
}
```

---

## 📝 迁移报告模板

完成迁移后，填写以下报告：

```markdown
## 管理员密码迁移报告

**迁移日期**: YYYY-MM-DD
**执行人**: [姓名]

### 迁移统计
- 总管理员账号数: X
- 成功迁移: X
- 跳过（已哈希）: X
- 失败: X

### 验证结果
- [ ] 所有账号登录测试通过
- [ ] 数据库密码字段为哈希格式
- [ ] 无明文密码残留

### 遗留问题
- [ ] （如有）

### 后续工作
- [ ] 实现密码修改功能
- [ ] 添加密码强度验证
- [ ] 实施登录失败次数限制
```

---

**相关文件:**
- 代码审查报告: `docs/CODE_QUALITY_AUDIT.md`
- 实施计划: `/Users/johnny/.claude/plans/security-fixes-keen-ling-aho.md`
