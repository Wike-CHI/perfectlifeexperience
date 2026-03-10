# 安全测试套件设计文档

**日期：** 2026-03-10
**版本：** v1.0.0
**目标：** 全面综合测试（防护+验证+合规）

## 架构概述

采用混合架构，按3个层级和3个优先级领域组织：

- **Layer 1 (Mock)**: 快速单元测试
- **Layer 2 (Sandbox)**: 沙箱集成测试
- **Layer 3 (Production)**: 生产环境扫描

**优先级领域：**
- A: 支付与资金安全
- B: 用户隐私与数据保护
- C: 业务逻辑漏洞

## 测试命令

```bash
# Layer 1: Mock测试
npm run test:security:mock

# Layer 2: 沙箱测试
npm run test:security:sandbox

# Layer 3: 生产扫描
npm run test:security:production

# 全部测试
npm run test:security:all
```

## 数据管理策略

- Layer 1: 纯内存，自动清理
- Layer 2: 创建+清理，前缀 `security_test_`
- Layer 3: 只读，不修改数据
