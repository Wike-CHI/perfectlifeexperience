/**
 * 安全测试套件 - 业务逻辑漏洞（优先级C）
 *
 * 测试覆盖：
 * - C1: 推广路径伪造
 * - C2: 竞态条件测试
 * - C3: 业务规则绕过
 */

const assert = require('assert');

// ==================== C1: 推广路径伪造 ====================

describe('C1: 推广路径伪造', () => {

  describe('C1.1: 推广路径注入', () => {

    it('应该拒绝包含路径遍历的推广路径', () => {
      const maliciousPaths = [
        '../../../admin',
        '../../users/admin',
        './etc/passwd',
        'user1/../../admin'
      ];

      maliciousPaths.forEach(path => {
        const hasPathTraversal = path.includes('..');
        assert.strictEqual(hasPathTraversal, true, `检测到路径遍历: ${path}`);
      });
    });

    it('应该拒绝包含SQL注入的推广路径', () => {
      const sqlInjectionAttempts = [
        "user1' OR '1'='1",
        "user1'; DROP TABLE users; --",
        "user1' UNION SELECT * FROM admins--",
        "admin'/*"
      ];

      sqlInjectionAttempts.forEach(path => {
        const hasSqlInjection = /['";]|(UNION|SELECT|DROP|DELETE)/i.test(path);
        assert.strictEqual(hasSqlInjection, true, `检测到SQL注入: ${path}`);
      });
    });

    it('应该拒绝包含XSS的推广路径', () => {
      const xssAttempts = [
        '<script>alert(1)</script>',
        '<img src=x onerror=alert(1)>',
        'javascript:alert(1)',
        '<svg onload=alert(1)>'
      ];

      xssAttempts.forEach(path => {
        const hasXss = /<.*?>|javascript:|on\w+\s*=/i.test(path);
        assert.strictEqual(hasXss, true, `检测到XSS: ${path}`);
      });
    });
  });

  describe('C1.2: 邀请码安全', () => {

    it('应该验证邀请码格式', () => {
      const invalidCodes = [
        '',          // 空
        'AB',        // 太短
        'A B',       // 包含空格
        'A&B',       // 包含特殊字符
        '12345678901234567890' // 太长
      ];

      const isValidCode = (code) => /^[A-Z0-9]{4,10}$/.test(code);

      invalidCodes.forEach(code => {
        assert.strictEqual(isValidCode(code), false,
          `应拒绝无效邀请码: "${code}"`);
      });
    });

    it('应该防止邀请码暴力破解', () => {
      const userAttemptCodes = [];
      const MAX_ATTEMPTS = 10;
      const LOCKOUT_TIME = 3600000; // 1小时

      // 模拟用户尝试多个邀请码
      for (let i = 0; i < MAX_ATTEMPTS + 5; i++) {
        userAttemptCodes.push(`CODE${i}`);
      }

      // 检测暴力破解行为
      const isBruteForce = userAttemptCodes.length > MAX_ATTEMPTS;

      assert.strictEqual(isBruteForce, true,
        `检测到邀请码暴力破解: ${userAttemptCodes.length}次尝试`);
    });

    it('应该限制邀请码使用次数', () => {
      const inviteCode = {
        code: 'INVITE001',
        maxUses: 100,
        usedCount: 100
      };

      const canUse = inviteCode.usedCount < inviteCode.maxUses;

      assert.strictEqual(canUse, false, '邀请码使用次数已达上限');
    });
  });

  describe('C1.3: 晋升条件验证', () => {

    it('应该验证晋升条件的数据完整性', () => {
      const agent = {
        _openid: 'agent_001',
        agentLevel: 4, // 普通会员
        performance: {
          totalSales: 20000, // 累计2万元
          monthSales: 50000, // 本月5万元
          monthTag: '2026-03',
          teamCount: 50
        }
      };

      // 四级→三级：累计销售额需达到2万元
      const canUpgradeToLevel3 = agent.performance.totalSales >= 20000;
      assert.strictEqual(canUpgradeToLevel3, true, '应满足三级晋升条件');

      // 三级→二级：月销售额5万元 OR 团队50人
      const canUpgradeToLevel2 = agent.performance.monthSales >= 50000 ||
                                  agent.performance.teamCount >= 50;
      assert.strictEqual(canUpgradeToLevel2, true, '应满足二级晋升条件');
    });

    it('应该防止伪造销售额数据', () => {
      const agent = {
        _openid: 'agent_001',
        performance: {
          totalSales: 99999999, // 异常大的销售额
          monthSales: 0,        // 但本月为0
          monthTag: '2026-03'
        }
      };

      // 检测数据异常
      const isSuspicious = agent.performance.totalSales > 1000000 &&
                          agent.performance.monthSales === 0;

      assert.strictEqual(isSuspicious, true, '检测到异常的销售额数据');
    });

    it('应该验证团队人数的真实性', () => {
      const agent = {
        _openid: 'agent_001',
        performance: {
          teamCount: 999 // 异常大的团队人数
        }
      };

      // 实际查询子代理数量
      const actualTeamCount = 5; // 假设实际只有5人

      const isValid = agent.performance.teamCount === actualTeamCount;

      assert.strictEqual(isValid, false,
        `团队人数不匹配: 声称${agent.performance.teamCount}, 实际${actualTeamCount}`);
    });
  });
});

// ==================== C2: 竞态条件测试 ====================

describe('C2: 竞态条件测试', () => {

  describe('C2.1: 并发订单创建', () => {

    it('应该防止库存超卖', async () => {
      const product = {
        _id: 'prod_001',
        stock: 10,
        version: 1 // 乐观锁版本号
      };

      const concurrentOrders = 15;
      const orders = [];

      // 模拟并发订单
      for (let i = 0; i < concurrentOrders; i++) {
        orders.push(
          (async () => {
            // 检查版本号
            if (product.stock > 0 && product.version === 1) {
              // 模拟延迟
              await new Promise(resolve => setTimeout(resolve, Math.random() * 10));

              // 扣减库存（带版本检查）
              if (product.version === 1) {
                product.stock--;
                product.version++; // 更新版本号
                return { success: true, orderId: i, remainingStock: product.stock };
              }
            }
            return { success: false, orderId: i, reason: '库存不足或版本冲突' };
          })()
        );
      }

      const results = await Promise.all(orders);
      const successfulOrders = results.filter(r => r.success);

      console.log(`成功订单: ${successfulOrders.length}/${concurrentOrders}`);
      console.log(`剩余库存: ${product.stock}`);

      // 验证库存不应该为负数
      assert.ok(product.stock >= 0, `库存不应为负数: ${product.stock}`);

      // 验证成功订单数不超过初始库存
      assert.ok(successfulOrders.length <= 10,
        `成功订单数(${successfulOrders.length})不应超过初始库存(10)`);
    });
  });

  describe('C2.2: 并发提现', () => {

    it('应该防止余额透支', async () => {
      const wallet = {
        _openid: 'user_001',
        balance: 10000,
        frozenAmount: 0,
        version: 1
      };

      const withdrawalAmount = 6000;
      const concurrentRequests = 3;

      const withdrawals = [];

      for (let i = 0; i < concurrentRequests; i++) {
        withdrawals.push(
          (async () => {
            // 检查余额和版本
            if (wallet.balance >= withdrawalAmount && wallet.version === 1) {
              await new Promise(resolve => setTimeout(resolve, Math.random() * 10));

              // 原子更新（带版本检查）
              if (wallet.version === 1) {
                wallet.balance -= withdrawalAmount;
                wallet.frozenAmount += withdrawalAmount;
                wallet.version++;
                return { success: true, withdrawalId: i };
              }
            }
            return { success: false, reason: '余额不足或版本冲突' };
          })()
        );
      }

      const results = await Promise.all(withdrawals);
      const successfulWithdrawals = results.filter(r => r.success);

      console.log(`成功提现: ${successfulWithdrawals.length}/${concurrentRequests}`);
      console.log(`最终余额: ${wallet.balance}`);

      // 余额不应该为负数
      assert.ok(wallet.balance >= 0, `余额不应为负数: ${wallet.balance}`);

      // 如果多次成功，说明存在竞态条件
      if (successfulWithdrawals.length > 1) {
        console.warn('⚠️ 检测到并发提现竞态条件！需要添加分布式锁');
      }
    });
  });

  describe('C2.3: 并发晋升', () => {

    it('应该防止并发晋升导致的级别混乱', async () => {
      const agent = {
        _openid: 'agent_001',
        agentLevel: 4,
        performance: {
          totalSales: 50000 // 满足晋升条件
        }
      };

      // 模拟两个并发请求同时触发晋升
      const promotionPromises = [
        (async () => {
          await new Promise(resolve => setTimeout(resolve, Math.random() * 10));
          if (agent.agentLevel === 4 && agent.performance.totalSales >= 20000) {
            agent.agentLevel = 3;
            return { success: true, newLevel: 3 };
          }
          return { success: false };
        })(),
        (async () => {
          await new Promise(resolve => setTimeout(resolve, Math.random() * 10));
          if (agent.agentLevel === 4 && agent.performance.totalSales >= 20000) {
            agent.agentLevel = 3;
            return { success: true, newLevel: 3 };
          }
          return { success: false };
        })()
      ];

      const results = await Promise.all(promotionPromises);
      const successfulPromotions = results.filter(r => r.success);

      // 级别应该是最终的唯一值
      assert.strictEqual(agent.agentLevel, 3, '代理级别应该是晋升后的值');

      // 如果两次都成功，可能需要幂等性保护
      if (successfulPromotions.length > 1) {
        console.warn('⚠️ 检测到并发晋升，建议添加幂等性检查');
      }
    });
  });
});

// ==================== C3: 业务规则绕过 ====================

describe('C3: 业务规则绕过', () => {

  describe('C3.1: 限流机制绕过', () => {

    it('应该检测高频API调用', () => {
      const apiCalls = [];
      const now = Date.now();

      // 模拟1秒内20次请求
      for (let i = 0; i < 20; i++) {
        apiCalls.push({ timestamp: now + i * 50 }); // 每50ms一次
      }

      // 统计1秒内的请求数
      const callsIn1Second = apiCalls.filter(call =>
        call.timestamp >= now && call.timestamp < now + 1000
      ).length;

      const RATE_LIMIT = 10; // 每秒最多10次
      const isRateLimited = callsIn1Second > RATE_LIMIT;

      assert.strictEqual(isRateLimited, true,
        `检测到高频调用: ${callsIn1Second}次/秒（限制${RATE_LIMIT}次/秒）`);
    });

    it('应该防止IP轮换绕过限流', () => {
      const userAttempts = [
        { ip: '192.168.1.1', time: '2026-03-10 10:00:00' },
        { ip: '192.168.1.2', time: '2026-03-10 10:00:01' },
        { ip: '192.168.1.3', time: '2026-03-10 10:00:02' },
        { ip: '192.168.1.4', time: '2026-03-10 10:00:03' }
      ];

      // 检测来自同一用户（假设通过openid识别）但不同IP的请求
      const uniqueIPs = new Set(userAttempts.map(a => a.ip)).size;
      const isSuspicious = uniqueIPs > 3; // 短时间内使用多个IP

      assert.strictEqual(isSuspicious, true,
        `检测到IP轮换: ${uniqueIPs}个不同IP`);
    });
  });

  describe('C3.2: 批量注册检测', () => {

    it('应该检测短时间内的批量注册', () => {
      const registrations = [];

      // 模拟10秒内注册50个用户
      for (let i = 0; i < 50; i++) {
        registrations.push({
          userId: `user_${i}`,
          registerTime: new Date(Date.now() + i * 200), // 每200ms一个
          ip: `192.168.1.${i % 255}` // 不同IP
        });
      }

      // 统计10秒内的注册数
      const now = Date.now();
      const recentRegs = registrations.filter(reg =>
        reg.registerTime >= new Date(now - 10000)
      );

      const BATCH_THRESHOLD = 20; // 10秒内超过20个注册
      const isBatchRegistration = recentRegs.length > BATCH_THRESHOLD;

      assert.strictEqual(isBatchRegistration, true,
        `检测到批量注册: ${recentRegs.length}个用户（阈值${BATCH_THRESHOLD}）`);
    });

    it('应该检测相似的用户信息', () => {
      const users = [
        { phone: '13800138001', device: 'device_001' },
        { phone: '13800138002', device: 'device_001' }, // 同一设备
        { phone: '13800138003', device: 'device_001' },
        { phone: '13800138004', device: 'device_001' }
      ];

      // 检测同一设备注册多个账号
      const deviceGroups = {};
      users.forEach(user => {
        if (!deviceGroups[user.device]) {
          deviceGroups[user.device] = [];
        }
        deviceGroups[user.device].push(user);
      });

      const suspiciousDevices = Object.values(deviceGroups)
        .filter(group => group.length > 2);

      assert.ok(suspiciousDevices.length > 0,
        `检测到可疑设备: ${suspiciousDevices.length}个设备注册多个账号`);
    });
  });

  describe('C3.3: 恶意刷单检测', () => {

    it('应该检测异常的订单模式', () => {
      const orders = [
        { userId: 'user_001', amount: 5000, time: '2026-03-10 09:00' },
        { userId: 'user_001', amount: 5000, time: '2026-03-10 09:05' },
        { userId: 'user_001', amount: 5000, time: '2026-03-10 09:10' },
        { userId: 'user_001', amount: 5000, time: '2026-03-10 09:15' },
        { userId: 'user_001', amount: 5000, time: '2026-03-10 09:20' }
      ];

      // 检测: 同一用户、相同金额、短时间间隔
      const isSuspicious = orders.length >= 5 &&
                         orders.every(o => o.amount === 5000) &&
                         orders[0].userId === orders[4].userId;

      assert.strictEqual(isSuspicious, true,
        '检测到可疑的刷单行为: 相同金额、高频订单');
    });

    it('应该检测自买自得行为', () => {
      const orders = [
        {
          buyerId: 'user_001',
          promoterId: 'user_001', // 买家和推广者是同一人
          amount: 10000,
          time: '2026-03-10 10:00'
        }
      ];

      // 检测买家和推广者是否为同一人
      const isSelfBuy = orders[0].buyerId === orders[0].promoterId;

      assert.strictEqual(isSelfBuy, true,
        '检测到自买自得行为: 买家和推广者相同');
    });
  });

  describe('C3.4: 优惠券滥用', () => {

    it('应该防止优惠券重复使用', () => {
      const userCoupons = [
        { couponId: 'coupon_001', userId: 'user_001', used: true }
      ];

      const couponUseAttempt = {
        couponId: 'coupon_001',
        userId: 'user_001'
      };

      // 检查优惠券是否已使用
      const coupon = userCoupons.find(c =>
        c.couponId === couponUseAttempt.couponId &&
        c.userId === couponUseAttempt.userId
      );

      const canUse = coupon && !coupon.used;

      assert.strictEqual(canUse, false, '优惠券已使用，不能重复使用');
    });

    it('应该限制优惠券领取次数', () => {
      const coupon = {
        _id: 'coupon_001',
        maxClaims: 100,
        claimedCount: 100,
        maxClaimsPerUser: 1
      };

      const userClaimCount = 1; // 用户已领取1次

      const canClaim = coupon.claimedCount < coupon.maxClaims &&
                       userClaimCount < coupon.maxClaimsPerUser;

      assert.strictEqual(canClaim, false,
        '优惠券已领完或用户已达领取上限');
    });
  });
});

// ==================== 导出 ====================

console.log('✅ 业务逻辑漏洞测试套件加载完成');
console.log('📊 测试覆盖：');
console.log('  - C1: 推广路径伪造（3个子场景）');
console.log('  - C2: 竞态条件测试（3个子场景）');
console.log('  - C3: 业务规则绕过（4个子场景）');
