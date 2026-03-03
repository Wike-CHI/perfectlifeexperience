# Coding Conventions

**Analysis Date:** 2026-03-03

## Naming Patterns

### Files

**TypeScript/Vue:**
- Components: `PascalCase` - `PromotionBadge.vue`, `ProductSkuPopup.vue`
- Utilities: `camelCase` - `cloudbase.ts`, `api.ts`, `format.ts`
- Constants: `camelCase` - `promotion.ts`, `reward.ts`, `order.ts`
- Types: `camelCase` - `index.ts`, `admin.ts`, `database.ts`
- Tests: `camelCase.test.ts` - `format.test.ts`, `api.test.ts`

**Cloud Functions (JavaScript):**
- Entry point: `index.js`
- Utilities: `camelCase` - `logger.js`, `response.js`, `constants.js`
- Tests: `camelCase.test.js` - `test.test.js`, `refund.test.js`

### Functions

- Use `camelCase` for all functions
- Verb-noun pattern: `getPromotionInfo`, `calculateReward`, `formatPrice`
- Boolean predicates: `isValid`, `hasPermission`, `canUpgrade`
- Async handlers: `async` keyword for all cloud function handlers

### Variables

- Use `camelCase` for local variables and function parameters
- Constants: `UPPER_SNAKE_CASE` in cloud functions
- TypeScript constants: `PascalCase` for enums, `UPPER_SNAKE_CASE` for values
- Example: `const AGENT_LEVEL = { GOLD: 1, SILVER: 2 }`

### Types

- TypeScript interfaces: `PascalCase` - `PromotionUser`, `OrderDetail`
- Type definitions: Use `type` for unions, interfaces for objects
- Database types: `UserDB`, `OrderDB`, `CommissionWalletDB`

## Code Style

### Formatting

**Tool:** UniApp built-in formatter (via Vite)

**Key Settings:**
- Indentation: 2 spaces
- Semicolons: Yes
- Quotes: Single quotes for strings

### TypeScript

**Type Annotations:**
- Always specify return types for functions
- Use strict typing for function parameters
- Avoid `any` type - use `unknown` or proper generics

```typescript
// Good
export function formatPrice(price: number, precision: number = 2): string {
  return (price / 100).toFixed(precision)
}

// Avoid
export function formatPrice(price, precision = 2) {
  return (price / 100).toFixed(precision)
}
```

### JavaScript (Cloud Functions)

**Strict Mode:**
- Always use `cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })`
- Use `const` and `let` - never `var`
- Use ES6+ syntax (destructuring, arrow functions, template literals)

```javascript
// Good
const { success, error, ErrorCodes } = require('./common/response');
const result = await db.collection('users').where({ _openid: openid }).get();

// Avoid
var response = require('./common/response');
db.collection('users').where({ _openid: openid }).get(function(err, result) {});
```

## Import Organization

### Frontend (TypeScript)

**Order:**
1. Vue/Vue ecosystem imports - `vue`, `vue-router`, `vue-i18n`
2. Type imports - `import type { User } from '@/types'`
3. Internal module imports - `@/utils`, `@/constants`, `@/composables`
4. Component imports - `@/components`

**Path Aliases:**
- `@/*` maps to `src/*`
- Use absolute imports: `import { formatPrice } from '@/utils/format'`

### Backend (Cloud Functions)

**Order:**
1. wx-server-sdk
2. Common utilities - `./common/logger`, `./common/response`
3. Constants - `./common/constants`
4. Local modules - `./common/cache`, `./common/notification`

```javascript
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const { createLogger } = require('./common/logger');
const { success, error, ErrorCodes } = require('./common/response');
const { AgentLevel, Amount } = require('./common/constants');
```

## Error Handling

### Frontend

**API Error Handling:**
```typescript
try {
  const res = await callFunction('functionName', { action: 'xxx' });
  if (res.code === 0 && res.data) {
    return res.data;
  }
  throw new Error(res.msg || 'Operation failed');
} catch (error) {
  console.error('Operation failed:', error);
  throw error;
}
```

**Validation:**
- Validate all user inputs before API calls
- Use TypeScript types for compile-time validation

### Backend (Cloud Functions)

**Response Format:**
Use standardized response from `cloudfunctions/common/response.js`:

```javascript
const { success, error, ErrorCodes } = require('../common/response');

// Success
return success(data, 'Success message');
// Returns: { code: 0, msg: 'Success message', data: {...} }

// Error
return error(ErrorCodes.INVALID_PARAMS, 'Parameter error');
// Returns: { code: -2, msg: 'Parameter error' }
```

**Error Codes:**
- `0` - Success
- `-1` - Unknown error
- `-2` - Invalid parameters
- `-3` - Not logged in
- `100-199` - User-related
- `200-299` - Permission-related
- `300-399` - Business logic
- `500-599` - System errors

**Try-Catch Pattern:**
```javascript
try {
  const result = await db.collection('users').add({ data: userData });
  return success({ id: result._id }, 'User created');
} catch (error) {
  console.error('Create user failed:', error);
  return error(ErrorCodes.DATABASE_ERROR, 'Failed to create user');
}
```

## Logging

### Frontend

**Framework:** `console` (wx.console in WeChat context)

**Patterns:**
- Debug logs: `console.debug()` for development only
- Info: `console.log()` for significant events
- Errors: `console.error()` with error object

```typescript
console.error('Get products failed:', error);
console.log('Order created:', orderId);
```

### Backend

**Framework:** Custom logger (`cloudfunctions/common/logger.js`)

**Levels:**
- `logger.error()` - Errors requiring attention
- `logger.warn()` - Warnings (e.g., invalid input)
- `logger.info()` - Key business events
- `logger.debug()` - Development only (disabled in production)

**Features:**
- Structured JSON logging
- Sensitive data sanitization (openid, password, token, balance)
- Environment-aware (production disables debug)

```javascript
const { createLogger } = require('./common/logger');
const logger = createLogger('promotion');

logger.info('Promotion bound', { userId, parentId });
logger.error('Calculate reward failed', { error: error.message });
```

## Comments

### When to Comment

**Required:**
- JSDoc for all exported functions
- Complex business logic explanations
- Non-obvious workarounds or hacks
- TODO/FIXME comments for known issues

**Avoid:**
- Obvious code explanations
- Commented-out code (delete instead)
- Excessive inline comments

### JSDoc/TSDoc

```typescript
/**
 * Format price (fen to yuan)
 * @param price Price in fen
 * @param precision Decimal places, default 2
 * @returns Formatted price string
 * @example
 * formatPrice(100) // "1.00"
 * formatPrice(1500, 1) // "15.0"
 */
export function formatPrice(price: number, precision: number = 2): string {
  return (price / 100).toFixed(precision);
}
```

### Cloud Functions

```javascript
/**
 * Calculate commission for an order
 * @param {number} orderAmount - Order amount in fen
 * @param {number} agentLevel - Agent promotion level (1-4)
 * @returns {object} Commission breakdown
 */
function calculateCommission(orderAmount, agentLevel) {
  // Implementation
}
```

## Function Design

### Size

- Keep functions under 50 lines
- Single responsibility - one function does one thing
- Extract complex logic into separate functions

### Parameters

- Maximum 4 parameters - use object for more
- Use optional parameters with defaults
- Validate parameters at function boundary

```typescript
// Good
function createOrder(params: { productId: string; quantity: number; addressId: string }) {
  const { productId, quantity, addressId } = params;
  // Implementation
}

// Avoid
function createOrder(productId, quantity, addressId, couponId, note, giftWrap) {
  // Too many parameters
}
```

### Return Values

- Always specify return type in TypeScript
- Use consistent response format in cloud functions
- Return `null`/`undefined` instead of mixed types

## Module Design

### Exports

**Named Exports (Preferred):**
```typescript
export function formatPrice(price: number): string { }
export function formatTime(time: Date): string { }
export const AGENT_LEVEL = { ... };
```

**Default Exports:**
- Only for single-function modules or class wrappers

### Barrel Files

Use index files for module re-exports:

```typescript
// src/constants/index.ts
export * from './promotion';
export * from './order';
export * from './reward';
```

### Cloud Function Structure

```javascript
// cloudfunctions/promotion/index.js
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const _ = db.command;

// Imports
const { success, error } = require('./common/response');

// Main handler
exports.main = async (event, context) => {
  const { action, data } = event;
  const wxContext = cloud.getWXContext();

  switch (action) {
    case 'getInfo':
      return await handleGetInfo(data, wxContext);
    case 'bindRelation':
      return await handleBindRelation(data, wxContext);
    default:
      return error(-2, `Unknown action: ${action}`);
  }
};

// Action handlers
async function handleGetInfo(data, wxContext) { }
async function handleBindRelation(data, wxContext) { }
```

---

*Convention analysis: 2026-03-03*
