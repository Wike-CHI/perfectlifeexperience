# 分销系统云函数部署指南

**更新日期**: 2026-02-16
**云函数**: promotion
**环境**: cloud1-6gmp2q0y3171c353

---

## 🚀 快速部署（推荐）

### 方法一：微信开发者工具（最简单）

1. **打开微信开发者工具**

2. **导入项目**（如果尚未导入）
   - 项目路径: `/Users/johnny/Desktop/小程序/perfectlifeexperience`
   - AppID: wx4a0b93c3660d1404

3. **部署云函数**
   - 在左侧文件目录中找到 `cloudfunctions/promotion`
   - **右键点击** `promotion` 文件夹
   - 选择 **"上传并部署：云端安装依赖"**
   - 等待部署完成（约30-60秒）

4. **验证部署**
   - 部署成功后，会在控制台看到提示
   - 可以在云开发控制台查看云函数状态

---

## 📋 部署验证清单

部署完成后，请执行以下验证：

### ✅ 1. 检查云函数状态

访问云开发控制台：
```
https://tcb.cloud.tencent.com/dev?envId=cloud1-6gmp2q0y3171c353#/function
```

确认 `promotion` 云函数状态为 **"正常"**

### ✅ 2. 验证佣金配置

在云开发控制台的"函数代码"标签页，查看 `common/constants.js` 文件：

```javascript
// 应该看到以下配置
const PromotionRatio = {
  HEAD_OFFICE_SHARE: 0.80,    // 80% - 总公司利润分成 ✅

  COMMISSION: {
    HEAD_OFFICE: 0.00,    // 0% ✅
    LEVEL_1: 0.10,        // 10% ✅
    LEVEL_2: 0.06,        // 6% ✅
    LEVEL_3: 0.03,        // 3% ✅
    LEVEL_4: 0.01         // 1% ✅
  },
  // ...
};
```

### ✅ 3. 测试订单佣金计算

创建一笔测试订单（¥100），验证收益分配：

| 项目 | 预期值 | 实际值 |
|------|--------|--------|
| 订单金额 | ¥100 | ____ |
| 总公司收益 | ¥80 (80%) | ____ |
| 代理总收益 | ¥20 (20%) | ____ |
| 一级代理 | ¥10 (10%) | ____ |
| 二级代理 | ¥6 (6%) | ____ |
| 三级代理 | ¥3 (3%) | ____ |
| 四级代理 | ¥1 (1%) | ____ |

### ✅ 4. 检查数据库记录

在云开发控制台查看 `reward_records` 集合：

```javascript
// 应该看到新的佣金比例
{
  ratio: 0.10,  // 一级代理 10% ✅
  rewardType: 'commission',
  amount: 1000, // 单位：分
  // ...
}
```

---

## 🔧 其他部署方法

### 方法二：使用部署脚本

```bash
# 运行部署脚本
cd /Users/johnny/Desktop/小程序/perfectlifeexperience
./deploy-promotion.sh
```

脚本会提供交互式指引，支持三种部署方式。

### 方法三：腾讯云开发 CLI

```bash
# 1. 安装 CLI 工具
npm install -g @cloudbase/cli

# 2. 登录云开发
tcb login

# 3. 部署云函数
cd cloudfunctions/promotion
tcb functions:deploy
```

### 方法四：手动上传（备用）

1. 访问云开发控制台
2. 进入 `promotion` 云函数详情
3. 点击 "函数代码" 标签
4. 在线编辑代码，复制以下文件内容：
   - `index.js`
   - `common/constants.js`
   - `common/logger.js`
   - `common/cache.js`
   - `common/response.js`
   - `common/validator.js`
5. 点击 "保存" 并 "部署"

---

## 🐛 故障排查

### 问题1：部署失败

**可能原因**:
- 网络连接问题
- 云函数依赖安装失败

**解决方案**:
1. 检查网络连接
2. 尝试使用 "上传并部署：不安装依赖" 模式
3. 在本地安装依赖后重新部署

### 问题2：佣金计算不正确

**可能原因**:
- 代码未正确部署
- 缓存未清除

**解决方案**:
1. 确认云函数代码已更新
2. 在云开发控制台查看云函数日志
3. 清除前端缓存，重新测试订单

### 问题3：云函数调用超时

**可能原因**:
- 数据库查询性能问题
- 并发量过大

**解决方案**:
1. 检查数据库索引是否正常
2. 查看云函数监控日志
3. 考虑增加云函数内存配置

---

## 📞 技术支持

如有问题，请参考：

- **技术文档**: `docs/system/COMMISSION_RESTRUCTURE_2026.md`
- **云开发文档**: https://docs.cloudbase.net/
- **云函数日志**: https://tcb.cloud.tencent.com/dev?envId=cloud1-6gmp2q0y3171c353#/function/promotion/log

---

## ✨ 部署后检查项

- [ ] 云函数部署成功
- [ ] 佣金配置已更新（80/20）
- [ ] 测试订单佣金计算正确
- [ ] 数据库记录验证通过
- [ ] 前端页面显示正常
- [ ] 用户通知已发布

**全部通过后，即可正式上线！** 🎉
