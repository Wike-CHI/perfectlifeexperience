# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

notice:always chinese output

## Project Overview

**大友元气精酿啤酒在线点单小程序** - A WeChat Mini Program for craft beer ordering with a comprehensive promotion/referral system featuring a simple four-tier agent commission structure.

**Tech Stack:**

- **Framework**: UniApp (Vue 3 + TypeScript)
- **Backend**: Tencent CloudBase (Cloud Functions + NoSQL Database)
- **Cloud Environment**: `cloud1-6gmp2q0y3171c353`
- **WeChat AppID**: `wx4a0b93c3660d1404`
- **Runtime**: Node.js 16.13 for cloud functions

## Key Architecture Concepts

### Four-Tier Promotion System

This project implements a **simple four-tier agent commission system**:

**Agent Levels (4 tiers)**:
- 一级代理 / 金牌推广员 (被总公司推荐)
- 二级代理 / 银牌推广员 (被一级代理推荐)
- 三级代理 / 铜牌推广员 (被二级代理推荐)
- 四级代理 / 普通会员 (被三级代理推荐)

**Key Rule**: Level is determined by the referrer. Higher level = more commission when promoting.

### Commission Distribution (Percentage-based)

Each order allocates **20% as commission pool**, distributed based on promoter's level:

| Promoter Level | Self | Level 1 | Level 2 | Level 3 | Total |
|----------------|------|---------|---------|---------|-------|
| 一级推广 | 20% | - | - | - | 20% |
| 二级推广 | 12% | 8% | - | - | 20% |
| 三级推广 | 12% | 4% | 4% | - | 20% |
| 四级推广 | 8% | 4% | 4% | 4% | 20% |

**Pattern** (based on order amount):
- 一级推广: Takes all 20%
- 二级推广: Self 12%, parent 8%
- 三级推广: Self 12%, parents 4% each
- 四级推广: Self 8%, parents 4% each

**Example** (100元订单):
- 一级推广: 拿 20元
- 二级推广: 自己 12元，上级 8元
- 三级推广: 自己 12元，上级各 4元
- 四级推广: 自己 8元，上级各 4元

### Upgrade Conditions

| From | To | Condition (meet one) |
|------|-----|---------------------|
| 普通 | 铜牌 | Cumulative sales 2万元 |
| 铜牌 | 银牌 | Monthly sales 5万元 OR Team 50人 |
| 银牌 | 金牌 | Monthly sales 10万元 OR Team 200人 |

**Note**: Monthly sales reset on the 1st of each month.

### Follow-upgrade Mechanism

When an agent upgrades, their direct subordinates can **follow-upgrade**:

| Upgrade | Subordinates Follow |
|---------|---------------------|
| 4→3 | None (can develop new level 4) |
| 3→2 | Previous level 4 → level 3 |
| 2→1 | Previous level 3→2, level 4→3 |

**Important**: After follow-upgrade, subordinates leave the original referral chain and become the upline's upline or peer.

### Key Database Collections

**User & Authentication:**
- `users` - User profiles with promotion paths, performance stats, reward tracking
- `admins` - Admin accounts with role-based permissions

**Promotion System:**
- `promotion_relations` - Explicit parent-child relationships
- `promotion_orders` - Order records for reward calculation
- `reward_records` - Individual reward records by type

**Orders & Payments:**
- `orders` - Customer orders
- `refunds` - Refund records

**Products & Inventory:**
- `products` - Product catalog
- `categories` - Product categories

**Wallet & Finance:**
- `user_wallets` - User balance wallet
- `wallet_transactions` - Wallet transaction history
- `commission_wallets` - Commission earnings wallet
- `commission_transactions` - Commission transaction records
- `withdrawals` - Withdrawal request records
- `recharge_orders` - Recharge order records

**Marketing:**
- `coupons` - Coupon templates
- `user_coupons` - User-claimed coupons
- `banners` - Banner/promotional images
- `promotions` - Promotional activities
- `announcements` - System announcements

## Development Commands

### Mini Program Development

```bash
# Development (WeChat Mini Program)
npm run dev:mp-weixin

# Production Build
npm run build:mp-weixin

# Type Checking
npm run type-check

# H5 Development (for web testing)
npm run dev:h5

# H5 Production Build
npm run build:h5
```

### Testing

```bash
# Run tests in watch mode
npm run test

# Run tests once
npm run test:run

# Run tests with coverage
npm run test:coverage
```

### Build Output Locations

- **WeChat Mini Program**: `dist/build/mp-weixin/`
- **H5**: `dist/build/h5/`

### Opening in WeChat Developer Tools

**macOS:**

```bash
/Applications/wechatwebdevtools.app/Contents/MacOS/cli open --project "/path/to/project"
```

**Windows:**

```bash
"C:\Program Files (x86)\Tencent\微信web开发者工具\cli.bat" open --project "项目根目录路径"
```

## Project Structure

### Frontend (`src/`)

- **`App.vue`** - Application entry point with CloudBase initialization and design system

  - Initializes wx.cloud with environment ID
  - Implements silent login via checkLogin()
  - Global CSS variables for "东方美学" (Oriental Aesthetics) theme:
    - Primary: 深棕色 (#3D2914), 琥珀金 (#C9A962)
    - Text: 黑曜石黑 (#1A1A1A)
    - Background: 古董白 (#FAF9F7)
- **`utils/cloudbase.ts`** - CloudBase SDK wrapper

  - `initCloudBase()` - Initialize wx.cloud
  - `checkLogin()` - Silent login using `login` cloud function
  - `callFunction()` - Native wx.cloud.callFunction wrapper
  - `uploadFile()` - File upload to cloud storage
  - Manages 7-day login session with local storage
- **`utils/api.ts`** - Frontend API layer

  - Product/Category APIs (currently local mock data)
  - Cart management (local storage)
  - Order APIs → `order` cloud function
  - User management → `user` cloud function
  - Promotion APIs → `promotion` cloud function
  - Wallet APIs → `wallet` cloud function
  - Commission Wallet APIs → `commission-wallet` cloud function
  - Coupon system (local mock data)
  - Home page aggregation API for performance optimization
- **`utils/database.ts`** - Direct database query utilities (performance optimization)
- **`utils/distance.ts`** - Distance calculation utilities
- **`utils/admin-auth.ts`** - Admin authentication utilities
- **`utils/admin-cache.ts`** - Admin-side caching utilities
- **`utils/format.ts`** - Data formatting utilities (currency, date, etc.)

### Backend (`cloudfunctions/`)

Each cloud function:

- Exports `exports.main = async (event, context) => {}`
- Has its own `package.json` for dependencies
- Must use `cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })`
- Receives OPENID via `cloud.getWXContext().OPENID`

#### Shared Utilities (`cloudfunctions/common/`)

All cloud functions share common utilities from the `common/` directory:

- **`response.js`** - Standardized response format (`{code, msg, data}`)
  - `success(data, message)` - Success response with code 0
  - `error(code, message, details)` - Error response with error codes
  - `ErrorCodes` - Centralized error code constants
- **`validator.js`** - Input validation utilities
- **`logger.js`** - Structured logging with levels
- **`constants.js`** - Shared constants (agent levels, commission ratios, etc.)

#### Cloud Functions List

- **`login/`** - User authentication

  - Gets OPENID from wxContext or exchanges code for openid/session_key
  - Calls `getOrCreateUser()` to create/update user records
- **`user/`** - User management

  - Actions: `loginOrUpdate`, `getUserInfo`, `updateUserInfo`
- **`promotion/`** - Promotion/referral system

  - Actions: `bindRelation`, `calculateReward`, `getInfo`, `getTeamMembers`, `getRewardRecords`, `generateQRCode`, `checkPromotion`, `updatePerformance`
  - Implements fixed-amount commission distribution based on agent level
  - Upgrade checking with configurable thresholds
  - Follow-upgrade mechanism for team advancement
  - Team statistics with recursive level counting
  - Anti-fraud measures (IP throttling, duplicate detection)
- **`product/`** - Product catalog management

  - Actions: `getProducts`, `getProductDetail`, `getHotProducts`, `getCategories`
  - Supports category filtering, keyword search, pagination
- **`wechatpay/`** - WeChat Pay integration (V3 API)

  - Actions: `createPayment`, `queryOrder`, `closeOrder`
  - HTTP trigger callback for payment notifications
  - Configuration priority: local `config.js` → environment variables
- **`order/`** - Order management

  - Actions: `createOrder`, `getOrders`, `getOrderDetail`, `updateOrderStatus`
  - Refund support: refund application, status tracking
- **`wallet/`** - Wallet balance and transactions

  - Actions: `getBalance`, `getTransactions`, `recharge`, `withdraw`
- **`commission-wallet/`** - Commission wallet management

  - Actions: `getBalance`, `getTransactions`, `applyWithdraw`, `getWithdrawals`
  - Separate from regular wallet for commission earnings
  - Supports withdrawal to WeChat Pay
- **`coupon/`** - Coupon management

  - Actions: `getCoupons`, `claimCoupon`, `useCoupon`, `getUserCoupons`
- **`upload/`** - File upload service

  - Handles user avatar uploads to cloud storage
  - Returns CDN URL for stored files
- **`rewardSettlement/`** - Reward settlement processing
- **`migration/`** - Database schema migrations and index creation

  - Actions: `createIndexes`, `createIndexesV2`
- **`initData/`** - Database initialization with seed data
- **`initAdminData/`** - Admin account initialization
- **`admin-api/`** - Admin management backend

  - Comprehensive admin API with role-based permissions
  - Actions cover orders, products, users, finance, promotions, etc.
- **`test-helper/`** - Database query helper for testing
- **`pay/`** - Legacy payment module (deprecated, use `wechatpay`)

### Key Design System

**Color Philosophy**: "东方美学" (Oriental Aesthetics)

- **Removed**: All blue/purple gradients (cold tones conflicting with warm brand)
- **Primary**: 深棕色 (#3D2914), 琥珀金 (#C9A962)
- **Accents**: 青铜 (#D4A574), 鼠尾草绿 (#7A9A8E)
- **Typography**: Playfair Display (headings), Manrope (body), DM Mono (data)
- **Visuals**: Subtle gradients, enhanced shadows, micro-animations

See `OPTIMIZATION_SUMMARY.md` for complete design audit details.

## Important Development Patterns

### Authentication Flow

1. **App Launch** → `initCloudBase()` checks environment
2. **Silent Login** → `checkLogin()` calls `login` cloud function
3. **OpenID Retrieval** → Cloud function gets `wxContext.OPENID`
4. **User State** → Cached in local storage with 7-day expiration
5. **API Calls** → All cloud functions receive OPENID via `wxContext` or `_token` parameter

### Cloud Function Call Patterns

**Native WeChat Call:**

```typescript
const res = await wx.cloud.callFunction({
  name: 'functionName',
  data: { /* payload */ }
});
// res.result contains the return value
```

**Wrapper (cloudbase.ts):**

```typescript
const res = await callFunction('functionName', { action: 'xxx', data: {} });
// Returns res directly for consistency
```

### Promotion Path Structure

- **Format**: Slash-separated path string `"parentId1/parentId2/..."`
- **Example**: User C's path = `"A/B"` means A is parent, B is grandparent
- **Reverse**: For reward distribution, reverse() puts closest parent first
- **Level Determination**: Agent level = min(4, parentAgentLevel + 1)

### Performance Tracking

Users have a nested `performance` object:

```javascript
{
  totalSales: 0,      // Cumulative sales (for 4→3 upgrade: 2万元)
  monthSales: 0,       // Current month sales (for 3→2: 5万元, 2→1: 10万元)
  monthTag: "2026-02",  // For cross-month reset detection
  teamCount: 0          // Total team size (for 3→2: 50人, 2→1: 200人)
}
```

**Monthly Reset**: When `monthTag` changes, `monthSales` resets to 0 but `totalSales` persists.

### Admin Permission System

Admin users have role-based access control:

**Roles:**
- `super_admin` - Full system access
- `operator` - Order and product management
- `finance` - Financial and refund management

**Permission Structure:**
```javascript
const PERMISSIONS = {
  // Order permissions
  ORDER_VIEW: 'order:view',
  ORDER_MANAGE: 'order:manage',
  // Product permissions
  PRODUCT_VIEW: 'product:view',
  PRODUCT_MANAGE: 'product:manage',
  // User permissions
  USER_VIEW: 'user:view',
  USER_MANAGE: 'user:manage',
  // Finance permissions
  FINANCE_VIEW: 'finance:view',
  FINANCE_MANAGE: 'finance:manage',
  // System permissions
  SYSTEM_CONFIG: 'system:config',
  ADMIN_MANAGE: 'admin:manage'
};
```

**Admin Authentication Flow:**
1. Admin logs in via `pagesAdmin/login/index.vue`
2. Credentials verified against `admins` collection
3. Role and permissions stored in local cache
4. Each admin API call validates permission via `admin-api` cloud function

## CloudBase Environment

**Environment ID**: `cloud1-6gmp2q0y3171c353`

**Configuration**: Set in `src/utils/cloudbase.ts`

```typescript
const ENV_ID: string = 'cloud1-6gmp2q0y3171c353';
```

**Console URLs** (replace `${envId}`):

- Overview: `https://tcb.cloud.tencent.com/dev?envId=${envId}#/overview`
- Database: `https://tcb.cloud.tencent.com/dev?envId=${envId}#/db/doc`
- Cloud Functions: `https://tcb.cloud.tencent.com/dev?envId=${envId}#/scf`
- Storage: `https://tcb.cloud.tencent.com/dev?envId=${envId}#/storage`
- Static Hosting: `https://tcb.cloud.tencent.com/dev?envId=${envId}#/static-hosting`

## Component Guidelines

### Shared Components

**Business Components:**
- **`PromotionBadge.vue`** - Agent level badge with warm gradients
- **`PromotionProgress.vue`** - Promotion progress bars showing upgrade progress
- **`PromotionUpgradeAlert.vue`** - Upgrade notification component for promotion level changes
- **`ProductSkuPopup.vue`** - Product SKU selection popup
- **`CategoryIcon.vue`** - Category icon with SVG rendering
- **`distance-badge.vue`** - Distance/location badge component
- **`promotion-icon.vue`** - Promotional icon component

**Admin Components:**
- **`admin-chart.vue`** - Chart component for admin dashboard
- **`admin-search.vue`** - Search component for admin pages
- **`admin-card.vue`** - Card container component for admin layouts
- **`admin-data-card.vue`** - Data display card with statistics
- **`admin-icon.vue`** - Icon component for admin interface

### Page Organization

- **`pages/index/`** - Product listing/home
- **`pages/product/detail.vue`** - Product details
- **`pages/category/`** - Category browsing
- **`pages/cart/`** - Shopping cart
- **`pages/order/*`** - Order management (list, confirm, detail, refund-apply, refund-detail, refund-list)
- **`pages/address/*`** - Address management (list, edit)
- **`pages/wallet/*`** - Wallet and recharge
- **`pages/commission-wallet/`** - Commission wallet (balance, withdrawal, transactions)
- **`pages/coupon/*`** - Coupon center and my coupons
- **`pages/promo/`** - Promotional activities
- **`pages/store/location.vue`** - Store location
- **`pages/user/user.vue`** - User profile
- **`pages/settings/*`** - Settings and account security
- **`pages/promotion/*`** - Promotion center, team, rewards, QR code, rules, commission-calculator
- **`pages/common/*`** - Common pages (user agreement, privacy policy, about us)

### Admin Pages (`src/pagesAdmin/`)

**Authentication:**
- `login/index.vue` - Admin login with role-based access

**Dashboard & Statistics:**
- `dashboard/index.vue` - Admin dashboard with statistics overview
- `statistics/index.vue` - System statistics and analytics

**Order Management:**
- `orders/list.vue` - Order list with search and filters
- `orders/detail.vue` - Order detail view

**Product Management:**
- `products/list.vue` - Product list with inventory tracking
- `products/edit.vue` - Add/edit product

**User Management:**
- `users/list.vue` - User list with promotion status
- `users/detail.vue` - User detail with order history
- `addresses/list.vue` - Address management

**Promotion & Commission:**
- `promotion/index.vue` - Promotion campaign management
- `commissions/list.vue` - Commission records
- `commission-wallets/list.vue` - Commission wallet management

**Finance & Refunds:**
- `finance/index.vue` - Financial overview and reports
- `refunds/index.vue` - Refund request management
- `refunds/detail.vue` - Refund detail and processing
- `wallets/list.vue` - User wallet management

**Marketing:**
- `banners/list.vue` - Banner management
- `banners/edit.vue` - Add/edit banner
- `coupons/list.vue` - Coupon template management
- `coupons/edit.vue` - Add/edit coupon
- `promotions/list.vue` - Promotional activity list
- `promotions/edit.vue` - Add/edit promotion
- `promotions/products.vue` - Promotion product selection
- `promotions/stats.vue` - Promotion statistics

**Content Management:**
- `announcements/list.vue` - Announcement management
- `announcements/edit.vue` - Add/edit announcement

**System Management:**
- `inventory/list.vue` - Inventory alerts and warnings
- `stores/edit.vue` - Store information management
- `settings/config.vue` - System configuration

### Admin Dashboard (`admin_dash/`)

Separate admin application template for CloudBase/UniApp development. See `admin_dash/README.md` for setup instructions.

## Testing Notes

- Use WeChat Developer Tools for preview/debugging
- Test cloud functions in console logs first
- Verify OPENID propagation through cloud function chain
- Test promotion reward calculation with different user hierarchies
- Validate monthly performance reset logic at month boundaries

### Testing Framework

The project uses **vitest** for unit testing:

```bash
npm run test           # Run tests in watch mode
npm run test:run       # Run tests once
npm run test:coverage  # Run with coverage report
```

### Testing Cloud Functions

Tests are located in cloud function directories (e.g., `cloudfunctions/promotion/test.test.js`). Invoke tests via:

1. **Cloud Function Invocation**: Call the cloud function directly with test actions
2. **test-helper Cloud Function**: Use `test-helper` for database queries during testing
3. **WeChat Developer Tools**: Run and debug cloud functions in the console

Test files:
- `cloudfunctions/promotion/test.test.js` - Promotion system tests
- `cloudfunctions/promotion/test-v2.test.js` - V2 promotion tests
- `cloudfunctions/order/test.test.js` - Order management tests
- `cloudfunctions/order/refund.test.js` - Refund processing tests
- `cloudfunctions/admin-api/refund.test.js` - Admin refund tests
- `cloudfunctions/wallet/test.test.js` - Wallet tests
- `cloudfunctions/commission-wallet/test.test.js` - Commission wallet tests

## Deployment

### Cloud Function Deployment

Cloud functions are deployed from `cloudfunctions/` directory. Use Tencent CloudBase console or MCP tools:

- Ensure `index.js` exports `exports.main`
- Runtime is set at creation and cannot be changed
- Use `cloud.DYNAMIC_CURRENT_ENV` for environment detection
- Environment variables configured per function in CloudBase console

### Mini Program Release

1. Build: `npm run build:mp-weixin`
2. Upload to WeChat MP Platform
3. Submit for review
4. Version management handled by WeChat platform

## Key Configuration Files

### Frontend Configuration

- **`src/pages.json`** - UniApp page routing, tabBar, and navigation bar config
- **`src/manifest.json`** - Platform-specific configurations (WeChat AppID, permissions)
- **`vite.config.ts`** - Vite build configuration with UniApp plugin
- **`tsconfig.json`** - TypeScript paths (`@/*` maps to `src/*`)

### Backend Configuration

- Each cloud function has its own `package.json` for dependencies
- **Dependencies**: Common ones include `wx-server-sdk`, `axios`
- Environment variables configured in CloudBase console per function
- **`cloudfunctions/promotion/config.json`** - Promotion thresholds and ratios

### Type Definitions

TypeScript types are defined in `src/types/`:

- **`index.ts`** - Main business types (Product, Order, User, Cart, Coupon, etc.)
- **`admin.ts`** - Admin types (AdminInfo, AdminRole, LoginRequest, PERMISSIONS, etc.)
- **`database.ts`** - Database schema types (AdminDB, CommissionWalletDB, RechargeOrderDB, etc.)
- **`wx-cloud.d.ts`** - WeChat Cloud SDK declarations
- Types are imported in components via `@/types`

### Frontend Modules

**Composables (`src/composables/`):**
- `usePromotion.ts` - Vue Composable for promotion-related logic

**Configuration (`src/config/`):**
- `recharge.ts` - Recharge tier configuration

**Constants (`src/constants/`):**
- `reward.ts` - Reward type constants
- `order.ts` - Order status constants
- `promotion.ts` - Promotion level constants
- `wallet.ts` - Wallet transaction type constants

**Utilities (`src/utils/`):**
- `cloudbase.ts` - CloudBase SDK wrapper
- `api.ts` - Frontend API layer
- `database.ts` - Direct database query utilities
- `distance.ts` - Distance calculation
- `admin-auth.ts` - Admin authentication
- `admin-cache.ts` - Admin-side caching utilities
- `cache-config.ts` - Cache configuration
- `format.ts` - Formatting utilities

## Important Code Patterns

### Cloud Function Action Router

All cloud functions use an action-based routing pattern:

```javascript
exports.main = async (event, context) => {
  const { action, data } = event;
  const wxContext = cloud.getWXContext();

  switch (action) {
    case 'actionName':
      return await handleActionName(data, wxContext);
    default:
      return { code: 400, msg: `Unknown action: ${action}` };
  }
};
```

**Standard Response Format:**
All cloud functions should use the standardized response format from `common/response.js`:

```javascript
const { success, error, ErrorCodes } = require('../common/response');

// Success response
return success(data, 'Success message');
// Returns: { code: 0, msg: 'Success message', data: {...} }

// Error response
return error(ErrorCodes.INVALID_PARAMS, 'Parameter error');
// Returns: { code: -2, msg: 'Parameter error' }
```

**Common Error Codes:**

- `0` - Success
- `-1` - Unknown error
- `-2` - Invalid parameters
- `-3` - Not logged in
- `100-199` - User-related errors
- `200-299` - Permission errors
- `300-399` - Business logic errors
- `500-599` - System errors

### Database Query Patterns

```javascript
// Always use cloud.DYNAMIC_CURRENT_ENV
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

// Command operators for complex queries
const _ = db.command;

// Example: Query with multiple conditions
.where({
  _openid: openid,
  status: _.in(['pending', 'paid']),
  createTime: _.gte(new Date(startDate))
})
```

### Error Handling Pattern

```javascript
try {
  // database operation
  return { success: true, data: result };
} catch (error) {
  console.error('Operation failed:', error);
  return { success: false, message: error.message };
}
```

## WeChat Pay Integration

### Payment Flow

1. Frontend calls `wechatpay` cloud function with `action: 'createPayment'`
2. Cloud function generates payment parameters via WeChat Pay V3 API
3. Frontend receives payment params and calls `wx.requestPayment()`
4. WeChat notifies backend via HTTP trigger callback
5. Backend verifies signature, decrypts data, updates order status

### Key Environment Variables for Payment

**Configuration Priority:**

1. **Local `config.js`** (recommended for development)
2. **Environment variables** (production environment)

**Required Variables:**

- `WX_PAY_MCH_ID` - Merchant ID
- `WX_PAY_SERIAL_NO` - Certificate serial number
- `WX_PAY_PRIVATE_KEY` - Merchant private key (PEM format)
- `WX_PAY_API_V3_KEY` - API v3 secret key
- `WX_PAY_NOTIFY_URL` - HTTP trigger URL for callbacks

**Local Config Format (`cloudfunctions/wechatpay/config.js`):**

```javascript
module.exports = {
  mchId: 'your_mch_id',
  serialNo: 'your_serial_no',
  privateKeyName: 'path/to/private_key.pem',
  apiV3Key: 'your_api_v3_key',
  notifyUrl: 'https://your-domain.com/wechatpay'
};
```

See `docs/WECHAT_PAY_SETUP.md` for complete setup guide.

## Development Workflow

### Adding New Features

1. **Frontend Changes**:

   - Update types in `src/types/index.ts` if needed
   - Add API methods to `src/utils/api.ts` (follows `callFunction('functionName', { action, data })` pattern)
   - Create/modify pages or components
   - Update `src/pages.json` for new pages
2. **Backend Changes**:

   - Create new cloud function directory under `cloudfunctions/`
   - Implement `index.js` with `exports.main = async (event, context) => {}`
   - Add `package.json` with dependencies (typically includes `wx-server-sdk`)
   - Deploy via CloudBase console, MCP tools, or WeChat Developer Tools
   - **Important**: Runtime cannot be changed after creation (default: Nodejs16.13)
3. **Database Schema Changes**:

   - Update documentation in `docs/`
   - Run migrations using `migration` cloud function
   - Update indexes as documented in `docs/migration/DATABASE_INDEX_GUIDE.md`

### Testing Strategy

1. **Unit Testing**:

   - Cloud functions: `cloudfunctions/promotion/test.test.js`
   - Use `test-helper` cloud function for database queries
2. **Integration Testing**:

   - Use WeChat Developer Tools for frontend
   - Test promotion calculations with various user hierarchies
   - Verify monthly reset logic
3. **Performance Testing**:

   - Monitor cloud function execution time in console
   - Check database query performance
   - Test with realistic data volumes

## Security Considerations

### OpenID Propagation

- All cloud functions receive `OPENID` via `wxContext.OPENID`
- Never trust frontend-provided user IDs
- Always use `wxContext` for authentication

### Rate Limiting

- IP throttling implemented in `promotion` cloud function
- 24-hour window for duplicate registration detection
- Maximum 3 registrations per IP per day

### Data Validation

- Validate all user inputs at cloud function boundary
- Use database schema validation where applicable
- Sanitize data before storage

## Important Notes

### Cloud Function Runtime Constraints

- **Runtime is immutable** after cloud function creation
- If you need to change runtime, you must delete and recreate the function
- Current runtime: **Nodejs16.13** (set during initial creation)
- When creating new functions, explicitly specify runtime

### NoSQL Database Constraints

CloudBase NoSQL (MongoDB-like) has limitations:

- **No native JOINs** - must denormalize data or make multiple queries
- **Array operations limited** - array updates require special syntax
- **Transaction support limited** - not available across collections
- **Index limitations** - compound indexes have specific ordering requirements

### WeChat Mini Program Specifics

- **No native login required** - CloudBase provides silent login via OPENID
- **Domain whitelist** - all API domains must be configured in WeChat MP backend
- **Package size limit** - mini program code must be under 2MB (unzipped)
- **Storage** - use `wx.cloud.uploadFile()` for images, not base64

## Troubleshooting

### Common Issues

**Cloud Function Timeouts**:

- Check execution time in CloudBase console
- Optimize database queries with indexes
- Consider async processing for long operations

**Login Issues**:

- Verify CloudBase environment ID in `src/utils/cloudbase.ts`
- Check 7-day cache expiration logic
- Review `login` cloud function logs

**Promotion Calculation Errors**:

- Verify user `promotionPath` format
- Check agent level calculations (max 4 levels deep)
- Review performance tracking for month tag mismatches

**Build/Compilation Errors**:

- Clear `dist/` and `node_modules/` if experiencing odd build issues
- Ensure all file paths referenced in code actually exist
- Check that imports use proper aliases (`@/` for `src/`)

**WeChat Pay Failures**:

- Verify merchant certificate and private key
- Check HTTP trigger callback URL
- Review payment signature verification logs

## Documentation References

- `docs/README.md` - Complete documentation index
- `docs/system/推广体系商业说明.md` - **Promotion system business specification (权威文档)**
- `docs/system/PROMOTION_SYSTEM.md` - Promotion system technical details
- `docs/deployment/DEPLOYMENT_GUIDE.md` - Deployment procedures
- `docs/migration/DATABASE_MIGRATION_GUIDE.md` - Schema changes

## Recent Changes (Feb 2026)

### Payment & Finance
- **WeChat Pay Integration**: Added `wechatpay` cloud function with V3 API support
- **Commission Wallet**: New commission wallet system with withdrawal support (`commission-wallet` cloud function)
- **Recharge System**: Enhanced wallet recharge with gift amounts

### Admin System Expansion
- **Admin Dashboard**: Comprehensive admin panel with 25+ management pages
- **Role-Based Permissions**: Admin roles (super_admin, operator, finance) with granular permissions
- **Finance Module**: Financial overview, wallet management, commission tracking
- **User Management**: User list, detail view, address management
- **Content Management**: Announcement system, promotion management
- **Inventory Alerts**: Low stock warning system

### Frontend Architecture
- **Vue Composables**: Introduced `composables/` directory with `usePromotion.ts`
- **Constants Module**: Centralized constants in `constants/` directory
- **Configuration Module**: Separated configuration to `config/` directory
- **Database Utilities**: Added direct database query utilities for performance
- **Testing Support**: Integrated vitest for unit testing

### UI/UX Improvements
- **Oriental Aesthetics Theme**: Promotion center redesigned with warm color palette
- **SVG Icons**: Replaced emoji with SVG icon system
- **Promotion Calculator**: New commission calculator page
- **Upgrade Rules Page**: Dedicated page for promotion level upgrade rules

### Order & Refund
- **Order Management**: Enhanced order management cloud functions
- **Refund System**: Complete refund workflow (apply, review, process)
- **Refund Pages**: `pages/order/refund-apply.vue`, `refund-detail.vue`, `refund-list.vue`

### Security & Infrastructure
- **Security Hardening**: Comprehensive database security rules
- **File Upload**: New `upload` cloud function for avatar uploads
- **Admin Authentication**: Secure admin login with role validation

### Documentation
- **Design Documentation**: Comprehensive design and deployment documentation
- **Database Schema**: Updated collection documentation

See `docs/optimization/OPTIMIZATION_SUMMARY.md` for complete design audit details.

## Key Links & Resources

- **CloudBase Console**: https://tcb.cloud.tencent.com/dev?envId=cloud1-6gmp2q0y3171c353
- **WeChat Mini Program Backend**: https://mp.weixin.qq.com/
- **UniApp Documentation**: https://uniapp.dcloud.net.cn/
- **CloudBase Documentation**: https://docs.cloudbase.net/

## Dependencies

### Frontend Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| Vue | 3.4.21 | Core framework |
| UniApp | 3.0.0-4060620250520001 | Cross-platform framework |
| vue-i18n | 9.14.4 | Internationalization (prepared) |
| @cloudbase/js-sdk | latest | CloudBase SDK |
| @cloudbase/adapter-uni-app | ^1.0.0-beta.1 | CloudBase UniApp adapter |
| sass | ^1.89.2 | CSS preprocessing |
| typescript | ^4.9.4 | Type system |
| vite | 5.2.8 | Build tool |
| vitest | - | Unit testing |

### Backend Dependencies

| Package | Purpose |
|---------|---------|
| wx-server-sdk | WeChat cloud function SDK |
| axios | HTTP client |
