# P0+P1 优化测试指南

**测试日期**: 2026-03-13
**测试范围**: P0-1 下属关系链更新、P0-2 冗余关系字段、P1-1 统计缓存、P1-2 关系变更历史

---

## 测试环境准备

### 1. 备份数据库

在测试前务必备份数据库：
```bash
# 在云开发控制台导出 users 集合
# 或者使用测试环境进行测试
```

### 2. 部署更新的云函数

```bash
# 部署 login 云函数
# 部署 migration 云函数
```

---

## 测试场景1: P0-1 下属关系链更新验证

### 测试目标
验证用户绑定推广人后，所有下属的 `promotionPath` 是否自动更新

### 测试步骤

#### 步骤1: 创建测试数据

使用云开发控制台或 `test-helper` 云函数创建以下用户：

```javascript
// 创建用户层级
const users = [
  { _openid: 'test_user_x', inviteCode: 'XXXX0001' },  // 推广人 X
  { _openid: 'test_user_a', inviteCode: 'AAAA0001' },  // 用户 A
  { _openid: 'test_user_b', inviteCode: 'BBBB0001' },  // 用户 B（A的下属）
  { _openid: 'test_user_c', inviteCode: 'CCCC0001' },  // 用户 C（A的下属）
  { _openid: 'test_user_d', inviteCode: 'DDDD0001' }   // 用户 D（A的下属）
];

// 设置初始推广关系
// X 的 promotionPath: null
// A 的 promotionPath: test_user_x, parentId: test_user_x
// B 的 promotionPath: test_user_x/test_user_a, parentId: test_user_a
// C 的 promotionPath: test_user_x/test_user_a, parentId: test_user_a
// D 的 promotionPath: test_user_x/test_user_a, parentId: test_user_a
```

#### 步骤2: 验证初始状态

```javascript
// 查询所有用户的推广路径
db.collection('users')
  .where({
    _openid: db.RegExp({
      regexp: '^test_user_[abcdx]$',
      options: 'i'
    })
  })
  .get()
  .then(res => {
    res.data.forEach(u => {
      console.log(u._openid, ':', {
        parentId: u.parentId,
        promotionPath: u.promotionPath
      });
    });
  });

// 预期输出:
// test_user_x : { parentId: null, promotionPath: '' }
// test_user_a : { parentId: 'test_user_x', promotionPath: 'test_user_x' }
// test_user_b : { parentId: 'test_user_a', promotionPath: 'test_user_x/test_user_a' }
// test_user_c : { parentId: 'test_user_a', promotionPath: 'test_user_x/test_user_a' }
// test_user_d : { parentId: 'test_user_a', promotionPath: 'test_user_x/test_user_a' }
```

#### 步骤3: 用户 A 绑定新推广人 Y

```javascript
// 创建新推广人 Y
const userY = { _openid: 'test_user_y', inviteCode: 'YYYY0001' };

// 调用 login 云函数，模拟用户 A 登录并绑定推广人 Y
wx.cloud.callFunction({
  name: 'login',
  data: {
    code: 'userA_login_code', // 用户 A 的登录 code
    inviteCode: 'YYYY0001'    // 使用 Y 的邀请码
  }
}).then(res => {
  console.log('绑定结果:', res.result);
});
```

#### 步骤4: 验证更新后的状态

```javascript
// 再次查询所有用户的推广路径
db.collection('users')
  .where({
    _openid: db.RegExp({
      regexp: '^test_user_[abcdxy]$',
      options: 'i'
    })
  })
  .get()
  .then(res => {
    res.data.forEach(u => {
      console.log(u._openid, ':', {
        parentId: u.parentId,
        promotionPath: u.promotionPath
      });
    });
  });

// 预期输出:
// test_user_x : { parentId: null, promotionPath: '' } (不变)
// test_user_y : { parentId: null, promotionPath: '' } (新用户)
// test_user_a : { parentId: 'test_user_y', promotionPath: 'test_user_y' } (已更新 ✅)
// test_user_b : { parentId: 'test_user_a', promotionPath: 'test_user_y/test_user_a' } (已更新 ✅)
// test_user_c : { parentId: 'test_user_a', promotionPath: 'test_user_y/test_user_a' } (已更新 ✅)
// test_user_d : { parentId: 'test_user_a', promotionPath: 'test_user_y/test_user_a' } (已更新 ✅)
```

#### 步骤5: 检查日志

在云开发控制台查看 login 云函数的日志：

```log
[日志] 开始更新下属关系链 { userOpenid: 'test_user_a', subordinateCount: 3 }
[日志] 下属关系链更新完成 { userOpenid: 'test_user_a', updatedCount: 3 }
[日志] 关系变更历史已记录 { userOpenid: 'test_user_a', changeType: 'bind' }
```

### 测试结果判断

✅ **测试通过**：
- 用户 A 的 `parentId` 和 `promotionPath` 更新为推广人 Y
- 用户 B、C、D 的 `promotionPath` 自动更新为 `test_user_y/test_user_a`
- 日志显示"下属关系链更新完成"

❌ **测试失败**：
- 用户 B、C、D 的 `promotionPath` 仍然是 `test_user_x/test_user_a`
- 日志显示"更新下属关系链失败"

---

## 测试场景2: P0-2 冗余关系字段验证

### 测试目标
验证 `secondLeaderId` 和 `thirdLeaderId` 字段是否正确填充

### 测试步骤

#### 步骤1: 运行迁移脚本

```javascript
// 调用 migration 云函数
wx.cloud.callFunction({
  name: 'migration',
  data: {
    action: 'addLeaderFields'
  }
}).then(res => {
  console.log('迁移结果:', res.result);
  // 预期: { code: 0, msg: '迁移完成', data: { totalUsers: N, updatedCount: M, skippedCount: K } }
});
```

#### 步骤2: 验证字段已添加

```javascript
// 查询用户的推广关系字段
db.collection('users')
  .where({
    _openid: db.RegExp({
      regexp: '^test_user_[abcd]$',
      options: 'i'
    })
  })
  .field({
    _openid: true,
    parentId: true,
    secondLeaderId: true,
    thirdLeaderId: true,
    promotionPath: true
  })
  .get()
  .then(res => {
    res.data.forEach(user => {
      console.log('用户:', user._openid);
      console.log('  parentId:', user.parentId);
      console.log('  secondLeaderId:', user.secondLeaderId);
      console.log('  thirdLeaderId:', user.thirdLeaderId);
      console.log('  promotionPath:', user.promotionPath);

      // 验证字段一致性
      if (user.promotionPath) {
        const parts = user.promotionPath.split('/').filter(p => p);
        console.log('  验证:', {
          secondLeaderId_ok: parts[parts.length - 2] === user.secondLeaderId,
          thirdLeaderId_ok: parts[parts.length - 3] === user.thirdLeaderId
        });
      }
    });
  });
```

#### 步骤3: 新用户注册验证

```javascript
// 新用户使用邀请码注册
wx.cloud.callFunction({
  name: 'login',
  data: {
    code: 'newUser_login_code',
    inviteCode: 'AAAA0001' // 使用用户 A 的邀请码
  }
}).then(res => {
  // 查询新用户的字段
  return db.collection('users')
    .where({ _openid: res.result.openid })
    .field({
      _openid: true,
      parentId: true,
      secondLeaderId: true,
      thirdLeaderId: true,
      promotionPath: true
    })
    .get();
}).then(res => {
  const user = res.data[0];
  console.log('新用户推广关系:', {
    parentId: user.parentId,           // 用户 A
    secondLeaderId: user.secondLeaderId, // 用户 X
    thirdLeaderId: user.thirdLeaderId   // null
  });

  // 预期: secondLeaderId 应该是 test_user_x
});
```

### 测试结果判断

✅ **测试通过**：
- 所有现有用户都有 `secondLeaderId` 和 `thirdLeaderId` 字段
- 字段值与 `promotionPath` 解析结果一致
- 新用户注册时字段自动填充

❌ **测试失败**：
- 字段不存在或为 undefined
- 字段值与 `promotionPath` 不匹配

---

## 测试场景3: P1-1 统计数据缓存验证

### 测试目标
验证缓存功能是否正常工作，能否提升查询性能

### 测试步骤

#### 步骤1: 清除缓存

```javascript
// 重启云函数实例以清空内存缓存
// 或在云开发控制台重新上传并部署云函数
```

#### 步骤2: 第一次查询（缓存未命中）

```javascript
const startTime1 = Date.now();

wx.cloud.callFunction({
  name: 'promotion',
  data: {
    action: 'getPromotionInfo',
    OPENID: 'test_user_a'
  }
}).then(res => {
  const time1 = Date.now() - startTime1;
  console.log('第一次查询耗时:', time1, 'ms');

  // 查看云函数日志，应该输出:
  // [日志] Promotion info cache miss, fetching... { OPENID: 'test_user_a' }
});
```

#### 步骤3: 第二次查询（缓存命中）

```javascript
const startTime2 = Date.now();

wx.cloud.callFunction({
  name: 'promotion',
  data: {
    action: 'getPromotionInfo',
    OPENID: 'test_user_a'
  }
}).then(res => {
  const time2 = Date.now() - startTime2;
  console.log('第二次查询耗时:', time2, 'ms');

  // 查看云函数日志，应该输出:
  // [日志] Promotion info cache hit { OPENID: 'test_user_a' }

  // 验证缓存效果
  console.log('缓存加速比:', time1 / time2);
  // 预期: 加速比 > 2
});
```

#### 步骤4: 验证缓存失效

```javascript
// 更新用户数据，触发缓存清除
wx.cloud.callFunction({
  name: 'promotion',
  data: {
    action: 'updateUserInfo',
    OPENID: 'test_user_a',
    data: {
      nickName: '新昵称'
    }
  }
}).then(() => {
  // 查看云函数日志，应该输出:
  // [日志] Promotion info cache cleared { userId: 'test_user_a' }

  // 再次查询，应该重新从数据库读取
  return wx.cloud.callFunction({
    name: 'promotion',
    data: {
      action: 'getPromotionInfo',
      OPENID: 'test_user_a'
    }
  });
}).then(res => {
  // 查看日志，应该输出:
  // [日志] Promotion info cache miss, fetching...
});
```

### 测试结果判断

✅ **测试通过**：
- 第一次查询日志输出"cache miss"
- 第二次查询日志输出"cache hit"
- 第二次查询时间明显少于第一次
- 数据更新后缓存被清除，再次查询为"cache miss"

❌ **测试失败**：
- 日志始终显示"cache miss"
- 查询时间没有明显差异
- 缓存未被正确清除

---

## 测试场景4: P1-2 关系变更历史验证

### 测试目标
验证推广关系变更历史是否正确记录

### 测试步骤

#### 步骤1: 执行推广人绑定操作

```javascript
// 使用测试场景1中的绑定操作
wx.cloud.callFunction({
  name: 'login',
  data: {
    code: 'userA_login_code',
    inviteCode: 'YYYY0001'
  }
}).then(res => {
  console.log('绑定结果:', res.result);
});
```

#### 步骤2: 查询关系变更历史

```javascript
// 查询 relation_history 集合
db.collection('relation_history')
  .where({ _openid: 'test_user_a' })
  .orderBy('changeTime', 'desc')
  .limit(10)
  .get()
  .then(res => {
    console.log('关系变更历史:', res.data);

    // 预期输出:
    // [
    //   {
    //     _openid: 'test_user_a',
    //     oldParentId: 'test_user_x',
    //     newParentId: 'test_user_y',
    //     oldPromotionPath: 'test_user_x',
    //     newPromotionPath: 'test_user_y',
    //     changeType: 'bind',
    //     changeTime: new Date(),
    //     operator: null,
    //     reason: '用户通过邀请码绑定推广人'
    //   }
    // ]
  });
```

#### 步骤3: 验证历史记录完整性

```javascript
db.collection('relation_history')
  .where({ _openid: 'test_user_a' })
  .count()
  .then(res => {
    console.log('历史记录数:', res.total);
    // 预期: > 0
  });

db.collection('relation_history')
  .where({ _openid: 'test_user_a' })
  .limit(1)
  .get()
  .then(res => {
    if (res.data.length > 0) {
      const record = res.data[0];
      console.log('最新记录验证:', {
        hasOldParent: !!record.oldParentId,
        hasNewParent: !!record.newParentId,
        hasChangeType: !!record.changeType,
        hasChangeTime: !!record.changeTime
      });

      // 预期所有字段都是 true
    }
  });
```

### 测试结果判断

✅ **测试通过**：
- `relation_history` 集合中存在记录
- 记录包含所有必需字段（_openid, oldParentId, newParentId, changeType, changeTime）
- 字段值正确反映变更内容

❌ **测试失败**：
- 集合不存在或为空
- 记录缺少关键字段
- 字段值不正确

---

## 综合测试场景5: 数据一致性验证

### 测试目标
在复杂的推广层级中验证整个子树的关系链更新

### 测试步骤

#### 步骤1: 创建复杂层级

```javascript
/*
层级结构：
  Root (test_user_root)
    ├─ Level1_A (test_user_l1_a)
    │   ├─ Level2_A (test_user_l2_a)
    │   │   └─ Level3_A (test_user_l3_a)
    │   └─ Level2_B (test_user_l2_b)
    └─ Level1_B (test_user_l1_b)
        └─ Level2_C (test_user_l2_c)
*/

// 创建用户并设置推广关系
// 使用批量操作创建
```

#### 步骤2: Level1_A 绑定到新的推广人 NewRoot

```javascript
wx.cloud.callFunction({
  name: 'login',
  data: {
    code: 'level1_a_login_code',
    inviteCode: 'NEWROOT001'
  }
}).then(res => {
  console.log('绑定结果:', res.result);
});
```

#### 步骤3: 验证整个子树的关系链

```javascript
// 查询所有下属
db.collection('users')
  .where({
    promotionPath: db.RegExp({
      regexp: 'test_user_l1_a/',
      options: 'i'
    })
  })
  .get()
  .then(res => {
    console.log('子树节点数:', res.data.length);
    // 预期: 4 个节点 (Level1_A, Level2_A, Level2_B, Level3_A)

    res.data.forEach(node => {
      console.log(node._openid, ':', node.promotionPath);
      // 预期所有路径都从 'newroot/' 开始，而不是 'root/'
    });

    // 验证路径前缀
    const allCorrect = res.data.every(u =>
      u.promotionPath.startsWith('newroot/')
    );
    console.log('所有路径已更新:', allCorrect);
    // 预期: true
  });
```

#### 步骤4: 验证团队统计准确性

```javascript
wx.cloud.callFunction({
  name: 'promotion',
  data: {
    action: 'getTeamStats',
    OPENID: 'test_user_l1_a'
  }
}).then(res => {
  console.log('Level1_A 的团队统计:', res.result.data);
  // 预期: { total: 3, level1: 2, level2: 1, level3: 0, level4: 0 }
  // total = 3 (Level2_A, Level2_B, Level3_A)
});
```

### 测试结果判断

✅ **测试通过**：
- 子树所有节点的 `promotionPath` 都已更新
- 团队统计数据准确
- 无数据丢失或重复

❌ **测试失败**：
- 部分节点的 `promotionPath` 未更新
- 团队统计不准确
- 出现孤儿节点

---

## 性能测试

### 测试目标
验证下属关系链更新的性能影响

### 测试步骤

#### 步骤1: 创建大量下属

```javascript
// 创建一个有 1000 个下属的用户
// 使用脚本批量创建
```

#### 步骤2: 测试更新性能

```javascript
const startTime = Date.now();

wx.cloud.callFunction({
  name: 'login',
  data: {
    code: 'user_with_1000_subordinates',
    inviteCode: 'NEWPROMOTER001'
  }
}).then(res => {
  const endTime = Date.now();
  const duration = endTime - startTime;

  console.log('更新耗时:', duration, 'ms');

  // 预期: duration < 60000 (1分钟内完成)
});
```

#### 步骤3: 检查云函数日志

```log
[日志] 开始更新下属关系链 { userOpenid: 'xxx', subordinateCount: 1000 }
[日志] 下属关系链更新完成 { userOpenid: 'xxx', updatedCount: 1000, duration: 45000 }
```

### 性能基准

| 下属数量 | 预期耗时 | 最大耗时 |
|---------|---------|---------|
| < 100   | < 5秒   | 10秒    |
| 100-500 | < 20秒  | 30秒    |
| 500-1000| < 45秒  | 60秒    |

### 测试结果判断

✅ **测试通过**：
- 在预期耗时内完成
- 所有下属都成功更新
- 无超时或错误

❌ **测试失败**：
- 耗时超过最大值
- 部分下属更新失败
- 出现超时错误

---

## 回归测试

### 测试目标
确保现有功能未受影响

### 测试项

1. **用户登录**
   - ✅ 新用户可以正常注册
   - ✅ 老用户可以正常登录
   - ✅ 邀请码绑定正常工作

2. **推广功能**
   - ✅ 可以查看推广信息
   - ✅ 可以查看团队统计
   - ✅ 推广关系正确

3. **佣金系统**
   - ✅ 佣金计算正确
   - ✅ 提现功能正常

---

## 测试清理

### 测试完成后清理测试数据

```javascript
// 删除测试用户
db.collection('users')
  .where({
    _openid: db.RegExp({
      regexp: '^test_user_',
      options: 'i'
    })
  })
  .remove();

// 删除测试历史记录
db.collection('relation_history')
  .where({
    _openid: db.RegExp({
      regexp: '^test_user_',
      options: 'i'
    })
  })
  .remove();
```

---

## 测试报告模板

```markdown
## P0+P1 优化测试报告

**测试日期**: YYYY-MM-DD
**测试人员**: [姓名]
**测试环境**: [测试环境/生产环境]

### 测试结果摘要

| 测试场景 | 状态 | 备注 |
|---------|------|------|
| 场景1: 下属关系链更新 | ⬜ 通过 / ⬜ 失败 | |
| 场景2: 冗余关系字段 | ⬜ 通过 / ⬜ 失败 | |
| 场景3: 统计数据缓存 | ⬜ 通过 / ⬜ 失败 | |
| 场景4: 关系变更历史 | ⬜ 通过 / ⬜ 失败 | |
| 场景5: 数据一致性 | ⬜ 通过 / ⬜ 失败 | |
| 性能测试 | ⬜ 通过 / ⬜ 失败 | |
| 回归测试 | ⬜ 通过 / ⬜ 失败 | |

### 问题和建议

1. [问题描述]
   - 重现步骤:
   - 期望结果:
   - 实际结果:
   - 严重程度: [低/中/高]

### 结论

[建议是否可以发布到生产环境]

**签名**: [测试人员签名]
```
