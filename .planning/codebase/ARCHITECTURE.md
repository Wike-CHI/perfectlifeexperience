# Architecture

**Analysis Date:** 2026-03-03

## Pattern Overview

**Overall:** Serverless Cloud Functions with UniApp Frontend

**Key Characteristics:**
- **Frontend:** Vue 3 + TypeScript with UniApp framework for cross-platform mini program
- **Backend:** Tencent CloudBase serverless cloud functions (Node.js 16.13)
- **Database:** CloudBase NoSQL (MongoDB-like)
- **Authentication:** Silent login via WeChat OPENID
- **Payment:** WeChat Pay V3 API integration

## Layers

**Frontend Layer (`src/`):**
- Purpose: User interface and business logic
- Location: `src/`
- Contains: Vue components, pages, composables, utilities
- Depends on: CloudBase SDK, UniApp APIs
- Used by: WeChat Mini Program, H5

**API Layer (`src/utils/api.ts`):**
- Purpose: Frontend API abstraction
- Location: `src/utils/api.ts`
- Contains: Product APIs, Order APIs, User APIs, Promotion APIs, Wallet APIs
- Depends on: CloudBase callFunction wrapper
- Used by: Vue components, pages

**Cloud Function Layer (`cloudfunctions/`):**
- Purpose: Backend business logic
- Location: `cloudfunctions/*/index.js`
- Contains: Business logic handlers, database operations
- Depends on: wx-server-sdk, cloud database
- Used by: Frontend via callFunction

**Database Layer (CloudBase NoSQL):**
- Purpose: Data persistence
- Location: CloudBase console
- Contains: users, orders, products, promotion_relations, wallets
- Used by: Cloud functions

## Data Flow

**User Authentication Flow:**

1. App Launch → `App.vue` calls `initCloudBase()`
2. `cloudbase.ts` calls `login` cloud function
3. `login` cloud function retrieves OPENID from wxContext
4. OPENID cached in localStorage with 7-day expiration
5. Subsequent calls pass OPENID via wxContext

**Order Creation Flow:**

1. User selects products → `cart.vue` calls `addToCart`
2. Checkout → `order/confirm.vue` calls `createOrder` via `api.ts`
3. `order` cloud function creates order in database
4. Stock deducted atomically
5. WeChat Pay initiated via `wechatpay` cloud function
6. Payment callback updates order status

**Promotion Reward Flow:**

1. Order completed → `order` cloud function triggers reward calculation
2. `promotion` cloud function calculates commission based on agent level
3. Commission distributed to parent agents (up to 3 levels)
4. `commission-wallet` cloud function updates wallet balances
5. Transaction records created

## Key Abstractions

**Cloud Function Action Router:**
- Purpose: Route requests to specific handlers
- Examples: `cloudfunctions/promotion/index.js`, `cloudfunctions/order/index.js`
- Pattern: Switch statement on `action` parameter

**Response Wrapper:**
- Purpose: Standardize API responses
- Location: `cloudfunctions/common/response.js`
- Pattern: `{ code: 0, msg: 'success', data: {...} }`

**Cache Module:**
- Purpose: In-memory caching for performance
- Location: `cloudfunctions/*/common/cache.js`
- Pattern: Simple object-based cache with TTL

**Validation Module:**
- Purpose: Input validation
- Location: `cloudfunctions/*/common/validator.js`
- Pattern: Export validation functions

## Entry Points

**Frontend Entry:**
- Location: `src/App.vue`
- Triggers: App launch, user interactions
- Responsibilities: Initialize CloudBase, check login status, configure theme

**Frontend Router:**
- Location: `src/pages.json`
- Triggers: Navigation
- Responsibilities: Page routing, tabBar, navigation bar config

**Backend Entry (Cloud Functions):**
- `cloudfunctions/login/index.js` - Authentication
- `cloudfunctions/order/index.js` - Order management
- `cloudfunctions/promotion/index.js` - Promotion system
- `cloudfunctions/admin-api/index.js` - Admin operations
- `cloudfunctions/wechatpay/index.js` - Payment processing

## Error Handling

**Strategy:** Centralized error codes with layered responses

**Patterns:**
- Frontend: Try-catch with user-friendly messages
- API Layer: Standardized response format `{ code, msg, data }`
- Cloud Functions: Use `common/response.js` for consistent errors
- Error codes: Range-based (0=success, -1=unknown, -2=params, 100-199=user, 200-299=permission, 300-399=business, 500-599=system)

## Cross-Cutting Concerns

**Logging:** Custom logger in `cloudfunctions/*/common/logger.js` with levels (debug, info, warn, error)

**Validation:** Shared validator in `cloudfunctions/common/validator.js`

**Constants:** Shared constants in `cloudfunctions/common/constants.js` (AgentLevel, Amount, Time, Collections)

**Authentication:**
- Frontend: 7-day cached OPENID via localStorage
- Admin: Token-based via `admin_token` in localStorage

---

*Architecture analysis: 2026-03-03*
