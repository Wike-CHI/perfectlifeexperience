/**
 * 安全测试辅助工具库
 *
 * 提供常用的安全测试辅助函数：
 * - 攻击模拟
 * - 数据验证
 * - 密码强度检查
 * - 敏感数据脱敏
 * - 安全断言
 */

const crypto = require('crypto');

// ==================== 攻击模式库 ====================

const attackPatterns = {
  // SQL注入攻击向量
  sqlInjection: [
    "' OR '1'='1",
    "'; DROP TABLE users; --",
    "' UNION SELECT * FROM admins--",
    "1' AND 1=1--",
    "admin'--",
    "' OR 1=1#",
    "'; EXEC xp_cmdshell('dir'); --",
    "' UNION SELECT null, null, null--"
  ],

  // XSS攻击向量
  xss: [
    '<script>alert(1)</script>',
    '<img src=x onerror=alert(1)>',
    '<svg onload=alert(1)>',
    'javascript:alert(1)',
    '<iframe src="javascript:alert(1)">',
    '<body onload=alert(1)>',
    '<input onfocus=alert(1) autofocus>',
    '<select onfocus=alert(1) autofocus><option>'
  ],

  // 路径遍历攻击
  pathTraversal: [
    '../../../etc/passwd',
    '..\\..\\..\\windows\\system32\\config\\sam',
    '....//....//....//etc/passwd',
    '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd',
    '..%252f..%252f..%252fetc%252fpasswd'
  ],

  // NoSQL注入
  nosqlInjection: [
    { $ne: null },
    { $gt: '' },
    { $regex: '.*' },
    { $where: 'this.score > 100' },
    { $or: [{ user: 'admin' }, { user: { $ne: null } }] }
  ],

  // 参数篡改
  parameterTampering: [
    -10000,                    // 负数金额
    'string_as_number',        // 类型混淆
    999999999999,              // 超大数
    null,                      // 空值
    undefined,                 // 未定义
    { $gt: 0 },                // 操作符注入
    [],                        // 空数组
    {}                         // 空对象
  ]
};

// ==================== 辅助函数 ====================

/**
 * 检测SQL注入
 * @param {string} input - 待检测输入
 * @returns {boolean} 是否包含SQL注入特征
 */
function detectSQLInjection(input) {
  if (typeof input !== 'string') return false;

  const sqlPatterns = [
    /('|(-){2})/,             // 单引号或注释符
    /(union\s+select)/i,      // UNION SELECT
    /(drop\s+table)/i,        // DROP TABLE
    /(exec(ute)?\s+)/i,       // EXEC/EXECUTE
    /(;(\s+)*(shutdown|drop))/i, // 分号后接危险命令
    /(\bor\b|\band\b).*=.*=.*=/i  // OR/AND且包含=
  ];

  return sqlPatterns.some(pattern => pattern.test(input));
}

/**
 * 检测XSS攻击
 * @param {string} input - 待检测输入
 * @returns {boolean} 是否包含XSS特征
 */
function detectXSS(input) {
  if (typeof input !== 'string') return false;

  const xssPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,  // <script>标签
    /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,  // <iframe>标签
    /javascript:/gi,                                     // javascript:协议
    /on\w+\s*=/gi,                                     // 事件处理器
    /<img[^>]*src[^>]*>/gi,                             // <img>标签
    /<svg[^>]*>/gi                                      // <svg>标签
  ];

  return xssPatterns.some(pattern => pattern.test(input));
}

/**
 * 检测路径遍历
 * @param {string} path - 待检测路径
 * @returns {boolean} 是否包含路径遍历特征
 */
function detectPathTraversal(path) {
  if (typeof path !== 'string') return false;

  const traversalPatterns = [
    /\.\.\//,      // ../
    /\.\.\\/,      // ..\
    /%2e%2e\//i,   // URL编码的../
    /\.\.%2f/i,    // 混合编码的../
    /%252e/        // 双重编码
  ];

  return traversalPatterns.some(pattern => pattern.test(path));
}

/**
 * 密码强度检查
 * @param {string} password - 密码
 * @returns {Object} 强度分析结果
 */
function checkPasswordStrength(password) {
  const result = {
    score: 0,
    strength: 'weak',
    issues: []
  };

  if (!password) {
    result.issues.push('密码不能为空');
    return result;
  }

  // 长度检查
  if (password.length < 8) {
    result.issues.push('密码长度少于8位');
  } else if (password.length >= 12) {
    result.score += 2;
  } else {
    result.score += 1;
  }

  // 复杂度检查
  if (/[a-z]/.test(password)) result.score += 1;
  else result.issues.push('缺少小写字母');

  if (/[A-Z]/.test(password)) result.score += 1;
  else result.issues.push('缺少大写字母');

  if (/[0-9]/.test(password)) result.score += 1;
  else result.issues.push('缺少数字');

  if (/[^a-zA-Z0-9]/.test(password)) result.score += 1;
  else result.issues.push('缺少特殊字符');

  // 弱密码检查
  const weakPasswords = ['123456', 'password', 'admin', 'qwerty', 'abc123'];
  if (weakPasswords.some(weak => password.toLowerCase().includes(weak))) {
    result.score = 0;
    result.issues.push('密码过于简单');
  }

  // 评级
  if (result.score >= 5) result.strength = 'strong';
  else if (result.score >= 3) result.strength = 'medium';
  else result.strength = 'weak';

  return result;
}

/**
 * 敏感数据脱敏
 * @param {*} data - 待脱敏数据
 * @param {Object} options - 脱敏选项
 * @returns {*} 脱敏后的数据
 */
function sanitizeData(data, options = {}) {
  const {
    maskPhone = true,
    maskEmail = true,
    maskIdCard = true,
    maskPassword = true,
    removeFields = ['password', 'token', 'secret']
  } = options;

  if (typeof data !== 'object' || data === null) {
    return data;
  }

  const sanitized = Array.isArray(data) ? [...data] : { ...data };

  Object.keys(sanitized).forEach(key => {
    const value = sanitized[key];

    // 移除敏感字段
    if (removeFields.includes(key)) {
      delete sanitized[key];
      return;
    }

    // 脱敏手机号
    if (maskPhone && key === 'phone' && typeof value === 'string') {
      sanitized[key] = value.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
      return;
    }

    // 脱敏邮箱
    if (maskEmail && key === 'email' && typeof value === 'string') {
      const [local, domain] = value.split('@');
      if (local && domain) {
        const maskedLocal = local.substring(0, 2) + '***';
        sanitized[key] = maskedLocal + '@' + domain;
      }
      return;
    }

    // 脱敏身份证号
    if (maskIdCard && key === 'idCard' && typeof value === 'string') {
      sanitized[key] = value.replace(/^(.{6})(.{8})(.+)$/, '$1********$3');
      return;
    }

    // 脱敏密码
    if (maskPassword && (key === 'password' || key === 'pwd') && typeof value === 'string') {
      sanitized[key] = '***';
      return;
    }

    // 递归处理嵌套对象
    if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeData(value, options);
    }
  });

  return sanitized;
}

/**
 * 生成安全的测试数据
 * @param {string} type - 数据类型
 * @param {Object} options - 生成选项
 * @returns {*} 生成的测试数据
 */
function generateSecureTestData(type, options = {}) {
  const randomString = (length = 16) =>
    crypto.randomBytes(length).toString('hex').substring(0, length);

  switch (type) {
    case 'userId':
      return `user_${randomString(8)}`;

    case 'orderId':
      return `order_${Date.now()}_${randomString(6)}`;

    case 'phone':
      const prefixes = ['130', '131', '132', '133', '135', '136', '137', '138', '139'];
      const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
      return prefix + Math.random().toString().substring(2, 11);

    case 'email':
      return `test_${randomString(8)}@example.com`;

    case 'inviteCode':
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 排除易混淆字符
      let code = '';
      for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return code;

    case 'password':
      const strongPassword = [
        Math.random().toString(36).substring(2, 6).toUpperCase(),
        Math.random().toString(36).substring(2, 6).toLowerCase(),
        Math.random().toString(36).substring(2, 6),
        '!@#$%'.charAt(Math.floor(Math.random() * 5))
      ].join('');
      return strongPassword;

    default:
      return randomString();
  }
}

/**
 * 安全断言 - 验证数据安全性
 * @param {*} data - 待验证数据
 * @param {Object} rules - 验证规则
 * @returns {Object} 验证结果
 */
function assertSecurity(data, rules = {}) {
  const errors = [];
  const warnings = [];

  // SQL注入检查
  if (rules.checkSQLInjection) {
    if (typeof data === 'string' && detectSQLInjection(data)) {
      errors.push('检测到SQL注入特征');
    }
  }

  // XSS检查
  if (rules.checkXSS) {
    if (typeof data === 'string' && detectXSS(data)) {
      errors.push('检测到XSS特征');
    }
  }

  // 路径遍历检查
  if (rules.checkPathTraversal) {
    if (typeof data === 'string' && detectPathTraversal(data)) {
      errors.push('检测到路径遍历特征');
    }
  }

  // 数据类型检查
  if (rules.expectedType) {
    if (typeof data !== rules.expectedType) {
      errors.push(`类型错误：期望${rules.expectedType}，实际${typeof data}`);
    }
  }

  // 范围检查
  if (rules.min !== undefined && data < rules.min) {
    errors.push(`值${data}小于最小值${rules.min}`);
  }

  if (rules.max !== undefined && data > rules.max) {
    errors.push(`值${data}大于最大值${rules.max}`);
  }

  // 模式匹配
  if (rules.pattern && !rules.pattern.test(data)) {
    errors.push(`值${data}不匹配模式${rules.pattern}`);
  }

  return {
    secure: errors.length === 0,
    errors,
    warnings,
    score: errors.length * -10 + warnings.length * -5
  };
}

/**
 * 模拟并发攻击
 * @param {Function} attackFn - 攻击函数
 * @param {number} concurrency - 并发数
 * @param {number} delay - 延迟（毫秒）
 * @returns {Promise<Array>} 攻击结果
 */
async function simulateConcurrentAttack(attackFn, concurrency = 10, delay = 0) {
  const attacks = [];

  for (let i = 0; i < concurrency; i++) {
    attacks.push(
      (async () => {
        if (delay > 0) {
          await new Promise(resolve => setTimeout(resolve, Math.random() * delay));
        }
        try {
          return await attackFn(i);
        } catch (error) {
          return { success: false, error: error.message, attemptId: i };
        }
      })()
    );
  }

  return Promise.all(attacks);
}

/**
 * 生成安全测试报告
 * @param {Object} results - 测试结果
 * @returns {Object} 格式化的报告
 */
function generateSecurityReport(results) {
  const totalTests = results.passed + results.failed;
  const passRate = totalTests > 0 ? (results.passed / totalTests * 100).toFixed(2) : 0;

  // 评估安全等级
  let securityLevel = 'LOW';
  if (passRate >= 95 && results.failed === 0) {
    securityLevel = 'HIGH';
  } else if (passRate >= 80) {
    securityLevel = 'MEDIUM';
  }

  // 按严重程度分类失败测试
  const critical = results.failures.filter(f => f.severity === 'critical');
  const high = results.failures.filter(f => f.severity === 'high');
  const medium = results.failures.filter(f => f.severity === 'medium');
  const low = results.failures.filter(f => f.severity === 'low');

  return {
    summary: {
      totalTests,
      passed: results.passed,
      failed: results.failed,
      passRate: `${passRate}%`,
      securityLevel,
      timestamp: new Date().toISOString()
    },
    failures: {
      critical: critical.length,
      high: high.length,
      medium: medium.length,
      low: low.length,
      details: results.failures
    },
    recommendations: generateRecommendations(results.failures)
  };
}

/**
 * 生成修复建议
 * @param {Array} failures - 失败的测试
 * @returns {Array} 建议列表
 */
function generateRecommendations(failures) {
  const recommendations = [];

  if (failures.some(f => f.category === 'sql_injection')) {
    recommendations.push({
      priority: 'critical',
      category: 'SQL注入防护',
      recommendation: '使用参数化查询或ORM，避免字符串拼接SQL'
    });
  }

  if (failures.some(f => f.category === 'xss')) {
    recommendations.push({
      priority: 'high',
      category: 'XSS防护',
      recommendation: '对所有用户输入进行HTML转义，使用CSP策略'
    });
  }

  if (failures.some(f => f.category === 'auth')) {
    recommendations.push({
      priority: 'critical',
      category: '认证安全',
      recommendation: '使用bcrypt等强哈希算法存储密码，实施登录限流'
    });
  }

  if (failures.some(f => f.category === 'race_condition')) {
    recommendations.push({
      priority: 'high',
      category: '竞态条件',
      recommendation: '使用乐观锁或分布式锁保护关键操作'
    });
  }

  return recommendations;
}

// ==================== 导出 ====================

module.exports = {
  attackPatterns,
  detectSQLInjection,
  detectXSS,
  detectPathTraversal,
  checkPasswordStrength,
  sanitizeData,
  generateSecureTestData,
  assertSecurity,
  simulateConcurrentAttack,
  generateSecurityReport,
  generateRecommendations
};
