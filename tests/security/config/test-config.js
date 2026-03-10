/**
 * 安全测试配置文件
 */

module.exports = {
  // 测试环境配置
  environment: {
    // Layer 1: Mock测试环境
    mock: {
      timeout: 5000,
      useInMemoryData: true
    },

    // Layer 2: 沙箱测试环境
    sandbox: {
      envId: 'cloud1-6gmp2q0y3171c353', // 测试环境ID
      timeout: 30000,
      testPrefix: 'security_test_',
      autoCleanup: true
    },

    // Layer 3: 生产环境扫描
    production: {
      envId: 'cloud1-6gmp2q0y3171c353',
      timeout: 60000,
      readOnly: true,
      allowModification: false
    }
  },

  // 安全基准配置
  securityBaseline: {
    // 密码安全
    password: {
      minLength: 8,
      requireUppercase: true,
      requireLowercase: true,
      requireNumber: true,
      requireSpecialChar: true,
      hashAlgorithm: 'bcrypt',
      hashRounds: 10
    },

    // API限流
    rateLimit: {
      maxRequestsPerMinute: 60,
      maxLoginAttemptsPerHour: 10,
      maxRegistrationsPerDay: 100,
      blockDurationMs: 3600000 // 1小时
    },

    // 数据验证
    validation: {
      maxOrderAmount: 1000000, // 最大10000元
      maxWithdrawalPerDay: 200000, // 每日最多2000元
      maxPromotionDepth: 4,
      allowedPhonePattern: /^1[3-9]\d{9}$/,
      allowedEmailPattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    },

    // 敏感数据保护
    sensitiveData: {
      maskPhone: true,
      maskEmail: true,
      maskIdCard: true,
      encryptFields: ['password', 'idCard', 'phone'],
      excludeFromLogs: ['password', 'token', 'secret', 'pin']
    },

    // 访问控制
    accessControl: {
      enforceUserIdCheck: true,
      enforceRoleCheck: true,
      enforcePermissionCheck: true,
      logAccessAttempts: true
    }
  },

  // 攻击模拟配置
  attackSimulation: {
    enabled: true,
    maxConcurrentRequests: 100,
    attackDelayMs: 100,

    // SQL注入测试
    sqlInjection: {
      enabled: true,
      payloads: [
        "' OR '1'='1",
        "'; DROP TABLE users; --",
        "' UNION SELECT * FROM admins--"
      ]
    },

    // XSS测试
    xss: {
      enabled: true,
      payloads: [
        '<script>alert(1)</script>',
        '<img src=x onerror=alert(1)>',
        'javascript:alert(1)'
      ]
    },

    // 路径遍历测试
    pathTraversal: {
      enabled: true,
      payloads: [
        '../../../etc/passwd',
        '..\\..\\..\\windows\\system32\\config\\sam'
      ]
    }
  },

  // 报告配置
  reporting: {
    formats: ['console', 'json', 'html'],
    outputDir: './tests/security/reports',
    includeStackTrace: false,
    includeSuggestions: true,

    // 严重程度分级
    severity: {
      critical: {
        color: 'red',
        emoji: '🔴',
        description: '严重安全漏洞，必须立即修复'
      },
      high: {
        color: 'orange',
        emoji: '🟠',
        description: '高危漏洞，建议尽快修复'
      },
      medium: {
        color: 'yellow',
        emoji: '🟡',
        description: '中危漏洞，应该修复'
      },
      low: {
        color: 'blue',
        emoji: '🔵',
        description: '低危问题，建议修复'
      }
    }
  },

  // 测试数据管理
  testData: {
    cleanup: {
      enabled: true,
      autoCleanupAfterTest: true,
      retentionHours: 24,
      cleanupIntervalMs: 3600000 // 每小时清理一次
    },

    // 测试用户
    testUsers: {
      admin: {
        username: 'security_test_admin',
        password: 'SecurityTest123!',
        role: 'admin'
      },
      operator: {
        username: 'security_test_operator',
        password: 'SecurityTest123!',
        role: 'operator'
      },
      normalUser: {
        username: 'security_test_user',
        password: 'SecurityTest123!',
        role: 'user'
      }
    }
  },

  // 并发测试配置
  concurrency: {
    enabled: true,
    scenarios: [
      {
        name: 'concurrent_orders',
        concurrency: 100,
        description: '并发创建订单测试'
      },
      {
        name: 'concurrent_withdrawals',
        concurrency: 10,
        description: '并发提现测试'
      },
      {
        name: 'concurrent_registrations',
        concurrency: 50,
        description: '并发注册测试'
      }
    ]
  },

  // 忽略规则（用于已知但暂不修复的问题）
  ignoreRules: [
    // 示例：忽略某个特定的测试
    // {
    //   testId: 'B1.1.5',
    //   reason: '待修复：需要升级bcrypt版本',
    //   until: '2026-04-01'
    // }
  ]
};
