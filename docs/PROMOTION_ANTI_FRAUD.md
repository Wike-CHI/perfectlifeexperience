# 推广系统防刷增强文档

## 概述

推广系统已实施多层防刷保护机制，防止恶意注册、刷单等欺诈行为。

## 防护层级

### 1. IP 频率限制

**配置**: `cloudfunctions/promotion/index.js:56-60`

- **限制**: 同一 IP 24小时内最多注册 3 个账号
- **时间窗口**: 24小时（`IP_LIMIT_WINDOW`）
- **最大注册数**: 3（`MAX_REGISTRATIONS_PER_IP`）

```javascript
// 检查逻辑
const ipCount = await db.collection('users')
  .where({
    registerIP: deviceInfo.ip,
    createTime: _.gte(recentTime)
  })
  .count();

if (ipCount.total >= MAX_REGISTRATIONS_PER_IP) {
  return { valid: false, reason: '操作频繁，请稍后再试' };
}
```

### 2. 设备指纹追踪

**配置**: `cloudfunctions/promotion/index.js:139-150`

收集设备信息用于风控分析：

```javascript
function getDeviceFingerprint(event) {
  const OPENID = event.OPENID || cloud.getWXContext().OPENID;
  const clientIP = event.clientIP || '';
  return {
    openid: OPENID,
    ip: clientIP,
    timestamp: Date.now()
  };
}
```

**收集信息**:
- 用户 OpenID
- 客户端 IP 地址
- 时间戳
- User-Agent (可选)

### 3. 注册尝试跟踪

**配置**: `cloudfunctions/promotion/index.js:68-69, 201-229`

新增 `registration_attempts` 集合用于风控分析：

**数据结构**:
```javascript
{
  anonymizedId: "oABCD123***",  // 脱敏标识（openid前8位+***）
  ip: "192.168.1.1",
  userAgent: "Mozilla/5.0...",
  timestamp: db.serverDate(),
  expiredAt: Date  // 7天后自动过期
}
```

**自动清理**: 每次注册时自动清理超过 7 天的过期记录

```javascript
// 自动清理过期记录（保留7天）
const expirationDate = new Date(Date.now() - REGISTRATION_ATTEMPT_TTL);
await db.collection('registration_attempts')
  .where({ expiredAt: _.lt(expirationDate) })
  .remove();
```

### 4. 敏感信息脱敏

**配置**: `cloudfunctions/promotion/index.js:203-204`

所有日志中的 OpenID 自动脱敏，只保留前 8 位字符：

```javascript
// 使用脱敏标识（openid哈希值的前8位）
const anonymizedId = openid.substring(0, 8) + '***';

// 日志输出
logger.debug('Registration attempt recorded', {
  anonymizedId,  // "oABCD123***"
  ip: deviceInfo.ip
});
```

### 5. 结构化安全日志

**配置**: `cloudfunctions/common/logger.js`

所有日志使用结构化格式，自动脱敏敏感字段：

**敏感字段列表** (自动脱敏):
- `openid`
- `password`
- `balance`
- `pendingReward`
- `totalReward`
- `phone`
- `idCard`
- `bankAccount`
- `payPassword`
- `token`
- `session_key`
- `accessToken`
- `refreshToken`
- `clientSecret`

**日志级别**:
```javascript
logger.debug('Anti-fraud check initiated', { ip: deviceInfo.ip });
logger.warn('IP rate limit exceeded', { ip, count });
logger.error('Anti-fraud check failed', error);
```

## 数据库集合

### registration_attempts

| 字段 | 类型 | 说明 |
|-------|------|------|
| anonymizedId | String | 脱敏用户标识（前8位+***） |
| ip | String | 客户端 IP |
| userAgent | String | 浏览器 User-Agent |
| timestamp | Date | 注册尝试时间 |
| expiredAt | Date | 记录过期时间（7天后） |

## 部署指南

### 1. 创建集合

在 CloudBase 控制台手动创建 `registration_attempts` 集合：

1. 打开 [CloudBase 数据库控制台](https://tcb.cloud.tencent.com/dev?envId=cloud1-6gmp2q0y3171c353#/db/doc)
2. 点击"添加集合"
3. 集合名称: `registration_attempts`
4. 权限: "仅创建者可读写"（推荐）

### 2. 部署云函数

```bash
# 部署推广系统云函数
# 在微信开发者工具中右键 cloudfunctions/promotion 文件夹
# 选择 "上传并部署：云端安装依赖"
```

### 3. 验证

测试防刷功能：

```javascript
// 测试 IP 限制（第4次应该被拒绝）
for (let i = 0; i < 4; i++) {
  const result = await callFunction('promotion', {
    action: 'bindRelation',
    parentInviteCode: 'TEST1234',
    userInfo: { nickName: `测试用户${i}` },
    deviceInfo: { ip: '192.168.1.1' }
  });
  console.log(`尝试 ${i + 1}:`, result.msg);
}

// 预期输出:
// 尝试 1: 绑定成功
// 尝试 2: 绑定成功
// 尝试 3: 绑定成功
// 尝试 4: 操作频繁，请稍后再试
```

## 监控告警

### 关键指标

在 CloudBase 控制台监控以下指标：

1. **注册拒绝率**: `registration_attempts` 中被拒绝的比例
2. **高频 IP**: 24小时内注册尝试 > 3 的 IP 数量
3. **异常时间模式**: 凌晨、深夜大量注册尝试

### 告警规则

建议配置告警：
- 单 IP 24小时内注册尝试 > 10 次
- 单 IP 1小时内注册失败 > 5 次
- `registration_attempts` 集合 1小时内新增记录 > 100 条

## 常见问题

### Q1: 正常用户被误判为刷子？

**A**: 检查以下情况：
1. 用户是否使用公共 Wi-Fi（同 IP 多人注册）
2. IP 检测是否准确（HTTP 触发器需从 `event.clientIP` 获取）
3. 调整 `MAX_REGISTRATIONS_PER_IP` 阈值

### Q2: registration_attempts 集合过大？

**A**:
- 自动清理会在每次注册时触发
- 可手动执行清理脚本
- 检查 `REGISTRATION_ATTEMPT_TTL` 配置是否生效

### Q3: 如何查看脱敏前的真实数据？

**A**: 生产环境无法查看。如需调试：
1. 开发环境暂时关闭脱敏（修改 `logger.js`）
2. 使用 CloudBase 控制台直接查询数据库
3. 建立专门的日志查询权限系统

## 安全最佳实践

1. **定期审计**: 每周检查 `registration_attempts` 集合异常模式
2. **IP 黑名单**: 对恶意 IP 建立黑名单机制
3. **验证码集成**: 关键操作增加图形/短信验证码
4. **行为分析**: 结合用户行为模式识别机器注册
5. **日志保留**: 生产环境日志保留时间不超过 30 天

## 相关文件

- `cloudfunctions/promotion/index.js` - 推广系统核心逻辑
- `cloudfunctions/common/logger.js` - 结构化日志工具
- `cloudfunctions/common/validator.js` - 输入验证工具

## 更新日志

| 版本 | 日期 | 变更 |
|-------|------|------|
| 1.0.0 | 2026-02-13 | 初始版本 - IP限制 + 注册追踪 |
