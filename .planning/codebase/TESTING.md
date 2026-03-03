# Testing Patterns

**Analysis Date:** 2026-03-03

## Test Framework

### Runner

**Framework:** Vitest v4.0.18

**Config File:** `vitest.config.ts`

**Run Commands:**
```bash
npm run test           # Watch mode
npm run test:run       # Run once
npm run test:coverage  # Coverage report
npm run test:cf        # Cloud function tests
npm run test:all      # All tests
```

### Test Environments

**Configuration:**
- Default: `node` environment
- Vue composables: `happy-dom` (browser-like environment)
- Specified in `vitest.config.ts`:

```typescript
environment: 'node',
environmentMatchGlobs: [
  [['src/composables/**/*.test.ts'], 'happy-dom'],
],
```

### Test Coverage

**Thresholds:**
- Lines: 60%
- Functions: 60%
- Branches: 50%
- Statements: 60%

**Provider:** v8

**Reporters:** text, json, html

**Included Files:**
- `src/utils/**/*.ts`
- `src/constants/**/*.ts`
- `src/composables/**/*.ts`
- `src/config/**/*.ts`

## Test File Organization

### Location

**Frontend (Vitest):**
- Co-located with source files
- Pattern: `*.test.ts` in same directory as source
- Examples:
  - `src/utils/format.ts` → `src/utils/format.test.ts`
  - `src/constants/promotion.ts` → `src/constants/reward.test.ts`

**Backend (Cloud Functions):**
- Test files in cloud function directory
- Pattern: `test.test.js`, `refund.test.js`
- Examples:
  - `cloudfunctions/promotion/test.test.js`
  - `cloudfunctions/order/refund.test.js`
  - `cloudfunctions/admin-api/refund.test.js`

### Naming

- Unit tests: `*.test.ts` or `*.test.js`
- Test files use same base name as implementation
- Use descriptive test names in Chinese for business logic

## Test Structure

### Frontend Tests (Vitest)

**Import:**
```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
```

**Basic Structure:**
```typescript
describe('ModuleName', () => {
  beforeEach(() => {
    // Setup before each test
  })

  afterEach(() => {
    // Cleanup after each test
  })

  describe('Feature Group', () => {
    it('should do something specific', () => {
      // Arrange
      const input = 'test';

      // Act
      const result = functionUnderTest(input);

      // Assert
      expect(result).toBe('expected');
    })
  })
})
```

### Backend Tests (Cloud Functions)

**Using Node.js assert:**
```javascript
const assert = require('assert');

describe('Cloud Function', () => {
  describe('Action Name', () => {
    it('should perform expected behavior', async () => {
      // Test implementation
      const expected = 100;
      const actual = calculateAmount(10000, 0.01);
      assert.strictEqual(actual, expected);
    });
  });
});
```

## Mocking

### Frontend (Vitest)

**API Mocking:**
```typescript
vi.mock('@/utils/api', () => ({
  getPromotionInfo: vi.fn(async () => ({
    inviteCode: 'ABC123',
    agentLevel: 1
  })),
  promoteAgentLevel: vi.fn(async (oldLevel, newLevel) => ({
    oldLevel,
    newLevel
  }))
}));
```

**Constants Mocking:**
```typescript
vi.mock('@/constants/promotion', () => ({
  AGENT_LEVEL_NAMES: {
    1: '金牌推广员',
    2: '银牌推广员',
    3: '铜牌推广员',
    4: '普通会员'
  }
}));
```

**Mocking with Parameters:**
```typescript
it('should return correct ratio for level 2', async () => {
  const { getPromotionInfo } = await import('@/utils/api');
  vi.mocked(getPromotionInfo).mockResolvedValueOnce({
    agentLevel: 2,
    agentLevelName: '银牌推广员'
  });

  // Test implementation
});
```

### Mocking What NOT to Mock

- Core utility functions (formatPrice, formatTime)
- Pure business logic that doesn't depend on external services
- Type definitions and constants

### Setup and Teardown

```typescript
beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});
```

## Fixtures and Factories

### Test Data

**Inline Fixtures:**
```typescript
const mockUser = {
  _openid: 'test-user-123',
  inviteCode: 'TEST001',
  agentLevel: 1,
  promotionPath: ''
};

const mockOrder = {
  _id: 'order-123',
  amount: 10000,
  status: 'paid',
  createTime: new Date('2026-02-26')
};
```

**Factory Functions:**
```typescript
function createMockUser(overrides = {}) {
  return {
    _openid: 'test-user-' + Math.random(),
    inviteCode: 'TEST' + Math.random().toString(36).substr(2, 6).toUpperCase(),
    agentLevel: 4,
    promotionPath: '',
    ...overrides
  };
}
```

## Test Types

### Unit Tests

**Scope:** Individual functions, utilities, composables

**Approach:**
- Test one thing per test case
- Use meaningful assertions
- Cover happy path and edge cases

**Example:**
```typescript
describe('formatPrice', () => {
  it('should convert fen to yuan', () => {
    expect(formatPrice(100)).toBe('1.00');
  });

  it('should handle zero', () => {
    expect(formatPrice(0)).toBe('0.00');
  });

  it('should support custom precision', () => {
    expect(formatPrice(100, 0)).toBe('1');
  });
});
```

### Integration Tests

**Scope:** Cloud function actions, database operations

**Approach:**
- Test full action flows
- Use actual database queries (via test-helper)
- Verify side effects

### Cloud Function Tests

**Invocation:**
- Direct cloud function invocation via test framework
- Use `test-helper` cloud function for database operations in tests

**Example from `cloudfunctions/promotion/test.test.js`:**
```javascript
describe('四重分润计算测试', () => {
  it('应该正确计算基础佣金（代理层级差异）', async () => {
    const orderAmount = 10000; // 100元（100分）

    // 总公司 (level 0) 应该获得 25%
    const commission0 = Math.floor(orderAmount * 0.25);
    assert.strictEqual(commission0, 2500, '总公司佣金应为25%');
  });
});
```

## Common Patterns

### Async Testing

```typescript
it('should fetch promotion info', async () => {
  const { usePromotion } = await import('./usePromotion');
  const { user, fetchPromotionInfo } = usePromotion();

  await fetchPromotionInfo();
  await nextTick();  // Wait for Vue reactivity

  expect(user.value.agentLevel).toBe(1);
});
```

### Error Testing

```typescript
it('should throw on API failure', async () => {
  const { getPromotionInfo } = await import('@/utils/api');
  vi.mocked(getPromotionInfo).mockRejectedValueOnce(new Error('Network error'));

  const { usePromotion } = await import('./usePromotion');
  const { fetchPromotionInfo } = usePromotion();

  await expect(fetchPromotionInfo()).rejects.toThrow('Network error');
});
```

### Time Handling

```typescript
it('should format date correctly', () => {
  // Use fixed date strings to avoid timezone issues
  const date = new Date('2026-02-26T15:30:00');
  expect(formatTime(date)).toBe('2026-02-26 15:30');
});
```

### Boolean Assertions

```typescript
expect(result.isValid).toBe(true);
expect(user.isOnline).toBe(false);
expect(Array.isArray(items)).toBe(true);
```

### Array/Object Assertions

```typescript
expect(user.value.teamStats.total).toBe(100);
expect(upstreamRatios.value).toEqual([8]);
expect(result).toMatchObject({
  code: 0,
  msg: 'success'
});
```

## Running Tests

### Development
```bash
# Watch mode - reruns on file changes
npm run test
```

### CI/Production
```bash
# Run once with coverage
npm run test:coverage

# Run cloud function tests
npm run test:cf

# Run all tests
npm run test:all
```

### Coverage Report

```bash
# Generate HTML report
npm run test:coverage

# View report at coverage/index.html
```

## Test Patterns Summary

### Good Practices

1. **Descriptive Test Names:** Use Chinese for business logic tests
2. **One Assertion Focus:** Each test checks one behavior
3. **Arrange-Act-Assert:** Clear test structure
4. **Mock External Dependencies:** API calls, constants
5. **Clean Setup/Teardown:** Reset state between tests

### Anti-Patterns

1. **Don't Test Framework Itself:** Vitest behavior is assumed
2. **Don't Duplicate Implementation:** Test logic should differ from source
3. **Don't Hardcode Timestamps:** Use relative time helpers
4. **Don't Ignore Async:** Always await async operations

---

*Testing analysis: 2026-03-03*
