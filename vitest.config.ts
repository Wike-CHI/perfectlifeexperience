import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    globals: true,
    // 默认使用node环境
    environment: 'node',
    include: [
      // 前端工具函数测试
      'src/utils/**/*.test.ts',
      // 常量测试
      'src/constants/**/*.test.ts',
      // Composables测试
      'src/composables/**/*.test.ts',
      // 配置测试
      'src/config/**/*.test.ts',
      // 类型测试
      'src/types/**/*.test.ts',
      // 单元测试 - P0/P1核心业务逻辑
      'tests/unit/**/*.test.js',
      'tests/unit/**/*.test.ts',
      // 业务流程集成测试
      'tests/integration/business-flows/**/*.test.js',
      'tests/integration/business-flows/**/*.test.ts',
      // 系统集成测试
      'tests/integration/**/*.test.js',
      'tests/integration/**/*.test.ts',
      // 场景测试 - 端到端用户旅程
      'tests/scenarios/**/*.test.js',
      'tests/scenarios/**/*.test.ts',
      // 安全测试
      'tests/security/**/*.test.js',
      'tests/security/**/*.test.ts',
    ],
    // 针对不同文件的测试环境配置
    environmentMatchGlobs: [
      // Vue composables使用happy-dom
      [['src/composables/**/*.test.ts'], 'happy-dom'],
    ],
    // 全局setup文件
    setupFiles: ['./vitest.setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: [
        'src/utils/**/*.ts',
        'src/constants/**/*.ts',
        'src/composables/**/*.ts',
        'src/config/**/*.ts',
        'cloudfunctions/**/*.js', // 云函数覆盖率
      ],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData',
        '**/*.test.ts',
        '**/*.test.js',
        '**/__tests__/**',
        'tests/**', // 测试辅助文件不计入覆盖率
      ],
      // 覆盖率阈值
      thresholds: {
        lines: 60,
        functions: 60,
        branches: 50,
        statements: 60,
      },
    },
    // 测试超时配置
    testTimeout: 10000,
    hookTimeout: 10000,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
})
