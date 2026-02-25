# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

notice:alawys chinese output

## Project Overview

**大友元气精酿啤酒在线点单小程序** - A WeChat Mini Program for craft beer ordering with a comprehensive promotion/referral system featuring a sophisticated dual-track (agent level + star level) reward structure.

**Tech Stack:**

- **Framework**: UniApp (Vue 3 + TypeScript)
- **Backend**: Tencent CloudBase (Cloud Functions + NoSQL Database)
- **Cloud Environment**: `cloud1-6gmp2q0y3171c353`
- **WeChat AppID**: `wx4a0b93c3660d1404`
- **Runtime**: Node.js 16.13 for cloud functions

## Key Architecture Concepts

### Dual-Track Promotion System

This project implements a sophisticated **four-tier commission system** combined with **star-level advancement**:

1. **Agent Levels** (4 tiers): 总公司 → 一级代理 → 二级代理 → 三级代理 → 四级代理
2. **Star Levels** (4 tiers): 普通会员 → 铜牌推广员 → 银牌推广员 → 金牌推广员

### Four-Tier Reward Structure

Orders generate **four types of rewards** distributed up the promotion chain:

- **Basic Commission** (基础佣金): 25%/20%/15%/10%/5% based on agent level
- **Repurchase Reward** (复购奖励): 3% for repeat customers (star level ≥ 1)
- **Team Management Award** (团队管理奖): 2% with level-difference distribution (star level ≥ 2)
- **Nurture Allowance** (育成津贴): 2% to mentor (star level ≥ 2)

### Key Database Collections

- `users` - User profiles with promotion paths, performance stats, reward tracking
- `promotion_relations` - Explicit parent-child relationships
- `promotion_orders` - Order records for reward calculation
- `reward_records` - Individual reward records by type
- `orders` - Customer orders
- `coupons` - Coupon templates and user coupons

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
  - Coupon system (local mock data)

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
- **`promotion/`** - Promotion/referral system (1200+ lines)

  - Actions: `bindRelation`, `calculateReward`, `getInfo`, `getTeamMembers`, `getRewardRecords`, `generateQRCode`, `checkPromotion`, `updatePerformance`
  - Implements 4-tier reward calculation with level-difference algorithm
  - Star level promotion checking with configurable thresholds
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
- **`wallet/`** - Wallet balance and transactions

  - Actions: `getBalance`, `getTransactions`, `recharge`, `withdraw`
- **`coupon/`** - Coupon management

  - Actions: `getCoupons`, `claimCoupon`, `useCoupon`, `getUserCoupons`
- **`rewardSettlement/`** - Reward settlement processing
- **`migration/`** - Database schema migrations and index creation

  - Actions: `createIndexes`, `createIndexesV2`
- **`initData/`** - Database initialization with seed data
- **`initAdminData/`** - Admin account initialization
- **`admin-api/`** - Admin management backend
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
  totalSales: 0,      // Lifetime sales (for bronze promotion)
  monthSales: 0,       // Current month sales (for silver/gold)
  monthTag: "2026-02",  // For cross-month reset detection
  directCount: 0,       // Direct referrals (for bronze)
  teamCount: 0          // Total team size (for silver/gold)
}
```

**Monthly Reset**: When `monthTag` changes, `monthSales` resets to 0 but `totalSales` persists.

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

- **`PromotionBadge.vue`** - Agent/Star level badge with warm gradients
- **`PromotionProgress.vue`** - Promotion progress bars with dual-track display
- **`ProductSkuPopup.vue`** - Product SKU selection popup
- **`CategoryIcon.vue`** - Category icon with SVG rendering

### Page Organization

- **`pages/index/`** - Product listing/home
- **`pages/product/detail.vue`** - Product details
- **`pages/category/`** - Category browsing
- **`pages/cart/`** - Shopping cart
- **`pages/order/*`** - Order management (list, confirm, detail)
- **`pages/address/*`** - Address management (list, edit)
- **`pages/wallet/*`** - Wallet and recharge
- **`pages/coupon/*`** - Coupon center and my coupons
- **`pages/promo/`** - Promotional activities
- **`pages/store/location.vue`** - Store location
- **`pages/user/user.vue`** - User profile
- **`pages/settings/*`** - Settings and account security
- **`pages/promotion/*`** - Promotion center, team, rewards, QR code, rules
- **`pages/common/*`** - Common pages (user agreement, privacy policy, about us)

## Testing Notes

- Use WeChat Developer Tools for preview/debugging
- Test cloud functions in console logs first
- Verify OPENID propagation through cloud function chain
- Test promotion reward calculation with different user hierarchies
- Validate monthly performance reset logic at month boundaries

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
- **`wx-cloud.d.ts`** - WeChat Cloud SDK declarations
- Types are imported in components via `@/types`

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
- `docs/system/PROMOTION_SYSTEM.md` - Promotion system deep dive
- `docs/deployment/DEPLOYMENT_GUIDE.md` - Deployment procedures
- `docs/migration/DATABASE_MIGRATION_GUIDE.md` - Schema changes

## Recent Changes (Feb 2026)

- **WeChat Pay Integration**: Added `wechatpay` cloud function with V3 API support
- **UI/UX Optimization**: Promotion center redesigned with Oriental Aesthetics theme
- **SVG Icons**: Added SVG icon system replacing emoji
- **Admin System**: Initialized admin dashboard with authentication
- **Order Management**: Enhanced order management cloud functions
- **Documentation**: Comprehensive design and deployment documentation

See `docs/optimization/OPTIMIZATION_SUMMARY.md` for complete design audit details.

## Key Links & Resources

- **CloudBase Console**: https://tcb.cloud.tencent.com/dev?envId=cloud1-6gmp2q0y3171c353
- **WeChat Mini Program Backend**: https://mp.weixin.qq.com/
- **UniApp Documentation**: https://uniapp.dcloud.net.cn/
- **CloudBase Documentation**: https://docs.cloudbase.net/
