# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**大友元气精酿啤酒在线点单小程序** - A WeChat Mini Program for craft beer ordering with a comprehensive promotion/referral system.

**Tech Stack:**
- **Framework**: UniApp (Vue 3 + TypeScript)
- **Backend**: Tencent CloudBase (Cloud Functions + NoSQL Database)
- **Cloud Environment**: `cloud1-6gmp2q0y3171c353`
- **WeChat AppID**: `wx4a0b93c3660d1404`

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
```

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

Each cloud function exports `exports.main = async (event, context) => {}`

- **`login/`** - User authentication
  - Gets OPENID from wxContext or exchanges code for openid/session_key
  - Calls `getOrCreateUser()` to create/update user records

- **`user/`** - User management
  - Actions: `loginOrUpdate`, `getUserInfo`, `updateUserInfo`
  - Uses `common/auth.js` for auth utilities

- **`promotion/`** - Promotion/referral system (1200+ lines)
  - Actions: `bindRelation`, `calculateReward`, `getInfo`, `getTeamMembers`, `getRewardRecords`, `generateQRCode`, `checkPromotion`, `updatePerformance`
  - Implements 4-tier reward calculation with level-difference algorithm
  - Star level promotion checking with configurable thresholds
  - Team statistics with recursive level counting
  - Anti-fraud measures (IP throttling, duplicate detection)

- **`order/`** - Order management
- **`wallet/`** - Wallet balance and transactions
- **`coupon/`** - Coupon management
- **`rewardSettlement/`** - Reward settlement processing
- **`initData/`** - Database initialization
- **`admin-api/`** - Admin management backend

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

### Page Organization

- **`pages/index/`** - Product listing/home
- **`pages/product/detail.vue`** - Product details
- **`pages/cart/`** - Shopping cart
- **`pages/order/*`** - Order management (list, confirm, detail)
- **`pages/user/user.vue`** - User profile
- **`pages/promotion/*`** - Promotion center, team, rewards, QR code
- **`pages/wallet/*`** - Wallet and recharge

## Testing Notes

- Use WeChat Developer Tools for preview/debugging
- Test cloud functions in console logs first
- Verify OPENID propagation through cloud function chain
- Test promotion reward calculation with different user hierarchies
- Validate monthly performance reset logic at month boundaries

## Deployment

### Cloud Function Deployment

Cloud functions are deployed from `cloudfunctions/` directory. Use Tencent CloudBase console or CLI tools to deploy:
- Ensure `index.js` exports `exports.main`
- Runtime is set at creation and cannot be changed
- Use `cloud.DYNAMIC_CURRENT_ENV` for environment detection

### Mini Program Release

1. Build: `npm run build:mp-weixin`
2. Upload to WeChat MP Platform
3. Submit for review
4. Version management handled by WeChat platform

## Recent Changes (Feb 2026)

- **UI/UX Optimization**: Promotion center redesigned with Oriental Aesthetics theme
- **SVG Icons**: Added SVG icon system replacing emoji
- **Admin System**: Initialized admin dashboard structure
- **Order Management**: Enhanced order management cloud functions
- **Documentation**: Added comprehensive design optimization summary

See `OPTIMIZATION_SUMMARY.md` for complete design audit details.
