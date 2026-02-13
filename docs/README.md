# 项目文档目录

本目录包含大友元气精酿啤酒在线点单小程序的所有设计、开发和部署文档。

## 📁 文档结构

### deployment/ - 部署与测试
部署相关的指南和操作手册。

- **DEPLOYMENT_GUIDE.md** - 完整的部署与测试验证指南
  - 云函数部署步骤
  - 数据库迁移详细步骤
  - 功能测试场景
  - 监控与日志验证
  - 回滚方案

- **DEPLOYMENT_SUMMARY.md** - 项目交付总结
  - 已完成的开发工作
  - 文档与工具清单
  - 核心业务逻辑说明
  - 快速验证清单

- **QUICK_TEST_GUIDE.md** - 快速测试命令指南
  - 控制台快速验证命令
  - test-helper 云函数使用
  - 前端功能测试步骤
  - 常见问题排查
  - 可复制的查询命令

### migration/ - 数据库迁移
数据库结构和迁移相关文档。

- **DATABASE_INDEX_GUIDE.md** - 数据库索引优化指南
  - 各集合的索引建议
  - 性能优化方案
  - 查询优化建议

- **DATABASE_MIGRATION_GUIDE.md** - 数据库迁移指南
  - 字段添加步骤
  - 批量更新现有数据脚本
  - 验证查询
  - 回滚方案

### optimization/ - 系统优化
系统优化相关的文档和总结。

- **OPTIMIZATION_SUMMARY.md** - UI/UX 优化总结
  - 东方美学主题实施
  - SVG 图标系统
  - 设计系统改进

- **PROMOTION_OPTIMIZATION_SUMMARY.md** - 推广系统优化总结
  - 算法准确性优化
  - 性能优化
  - 代码质量提升
  - 测试覆盖完善

- **SVG_ICON_OPTIMIZATION.md** - SVG 图标优化
  - 图标系统设计
  - 优化前后对比

### system/ - 系统设计
系统架构和功能设计文档。

- **PROMOTION_SYSTEM.md** - 推广系统设计文档
  - 四层代理结构
  - 双轨制身份（代理+星级）
  - 四重分润机制
  - 晋升门槛配置

- **ADMIN_SYSTEM_DESIGN.md** - 后台管理系统设计
  - 系统架构
  - 功能模块
  - 权限管理

### 其他文档

- **PRD.md** - 产品需求文档
  - 项目背景
  - 功能需求
  - 用户故事

---

## 🚀 快速开始

### 新手入门
1. 阅读 `PRD.md` 了解项目需求
2. 阅读 `system/PROMOTION_SYSTEM.md` 了解推广系统
3. 阅读 `deployment/DEPLOYMENT_GUIDE.md` 开始部署

### 部署流程
1. 按照 `deployment/DEPLOYMENT_GUIDE.md` 部署云函数
2. 按照 `migration/DATABASE_MIGRATION_GUIDE.md` 执行数据库迁移
3. 使用 `deployment/QUICK_TEST_GUIDE.md` 验证功能

### 优化参考
- 查看 `optimization/` 目录了解系统优化历史
- 参考 `migration/DATABASE_INDEX_GUIDE.md` 优化数据库性能

---

## 📖 重要链接

### 云开发控制台
- 环境ID：`cloud1-6gmp2qy3171c353`
- 概览：https://tcb.cloud.tencent.com/dev?envId=cloud1-6gmp2qy3171c353#/overview
- 数据库：https://tcb.cloud.tencent.com/dev?envId=cloud1-6gmp2qy3171c353#/db
- 云函数：https://tcb.cloud.tencent.com/dev?envId=cloud1-6gmp2qy3171c353#/scf

### 小程序信息
- AppID：`wx4a0b93c3660d1404`
- 项目名称：大友元气精酿啤酒在线点单小程序

---

## 📝 文档维护

### 文档规范
- 使用 Markdown 格式
- 包含清晰的章节结构
- 提供代码示例
- 说明操作步骤

### 更新记录
- 每次重大更新后更新相关文档
- 在文档顶部标注版本和日期
- 保留历史版本供参考

---

**文档维护**: Claude Code
**最后更新**: 2026-02-13
**版本**: v1.0.0
