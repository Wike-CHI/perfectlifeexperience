# Codebase Structure

**Analysis Date:** 2026-03-03

## Directory Layout

```
project-root/
├── src/                       # Frontend (UniApp/Vue 3)
│   ├── pages/                 # Mini program pages
│   ├── pagesAdmin/            # Admin pages
│   ├── components/            # Shared components
│   ├── composables/           # Vue composables
│   ├── utils/                 # Utilities
│   ├── types/                 # TypeScript types
│   ├── constants/             # Frontend constants
│   ├── config/                # Configuration
│   ├── static/                # Static assets
│   └── App.vue                # App entry
├── cloudfunctions/            # Backend (Cloud Functions)
│   ├── common/                # Shared utilities
│   ├── layer/                 # CloudBase Layer
│   ├── login/                 # Authentication
│   ├── user/                  # User management
│   ├── order/                 # Order management
│   ├── product/               # Product catalog
│   ├── promotion/             # Promotion/referral
│   ├── wallet/                # Wallet balance
│   ├── commission-wallet/    # Commission wallet
│   ├── wechatpay/             # Payment
│   ├── coupon/                # Coupons
│   ├── admin-api/             # Admin backend
│   └── ...
├── docs/                      # Documentation
└── .planning/                 # Planning docs
```

## Directory Purposes

**Frontend (`src/`):**

| Directory | Purpose | Contains |
|-----------|---------|----------|
| `pages/` | Mini program pages | User-facing pages (index, cart, order, user, promotion) |
| `pagesAdmin/` | Admin pages | Dashboard, orders, products, users, finance, inventory |
| `components/` | Shared components | PromotionBadge, ProductSkuPopup, admin components |
| `composables/` | Vue composables | usePromotion.ts |
| `utils/` | Utilities | cloudbase.ts, api.ts, database.ts, format.ts |
| `types/` | TypeScript definitions | index.ts, admin.ts, database.ts |
| `constants/` | Frontend constants | order.ts, promotion.ts, reward.ts, wallet.ts |
| `config/` | Configuration | recharge.ts, cdn.ts, env.ts |
| `static/` | Static assets | Icons, images |

**Backend (`cloudfunctions/`):**

| Directory | Purpose | Key Files |
|-----------|---------|-----------|
| `common/` | Shared utilities | response.js, validator.js, logger.js, constants.js |
| `layer/shared/` | CloudBase Layer | Shared code layer for common modules |
| `login/` | Authentication | index.js - Silent login, OPENID retrieval |
| `user/` | User management | index.js - User CRUD |
| `order/` | Order management | index.js - Order creation, status, refund |
| `product/` | Product catalog | index.js - Products, categories |
| `promotion/` | Promotion system | index.js - Bind relation, rewards, team |
| `wallet/` | Wallet balance | index.js - Balance, recharge, withdraw |
| `commission-wallet/` | Commission wallet | index.js - Commission management |
| `wechatpay/` | Payment | index.js - WeChat Pay V3 integration |
| `coupon/` | Coupon system | index.js - Coupon templates, claims |
| `admin-api/` | Admin backend | index.js - Admin operations with permissions |
| `upload/` | File upload | index.js - Avatar uploads |
| `migration/` | Database migrations | createIndexes.js, createIndexesV2.js |

## Key File Locations

**Entry Points:**
- `src/App.vue` - Frontend entry, CloudBase initialization
- `src/main.ts` - UniApp bootstrap
- `src/pages.json` - Page routing, tabBar, navigation

**Configuration:**
- `src/config/env.ts` - Environment ID configuration
- `src/manifest.json` - Platform-specific configs (WeChat AppID)
- `vite.config.ts` - Build configuration

**Core Logic:**
- `src/utils/cloudbase.ts` - CloudBase SDK wrapper
- `src/utils/api.ts` - API layer
- `cloudfunctions/common/response.js` - Response format

**Testing:**
- `cloudfunctions/promotion/test.test.js` - Promotion tests
- `cloudfunctions/order/test.test.js` - Order tests
- `src/utils/*.test.ts` - Frontend unit tests

## Naming Conventions

**Files:**
- Vue components: `PascalCase.vue` (e.g., `PromotionBadge.vue`, `admin-card.vue`)
- TypeScript files: `kebab-case.ts` (e.g., `cloudbase.ts`, `api.ts`)
- Cloud functions: `index.js`

**Directories:**
- Pages: `kebab-case/` (e.g., `pages/order/`, `pagesAdmin/orders/`)
- Components: `PascalCase.vue` files in `components/`
- Cloud functions: `kebab-case/` (e.g., `cloudfunctions/promotion/`)

**Functions:**
- TypeScript: `camelCase` (e.g., `getUserInfo`, `createOrder`)
- Cloud functions: `camelCase` (e.g., `generateInviteCode`)

## Where to Add New Code

**New Feature (Frontend):**
- Page: `src/pages/[feature]/index.vue`
- API: Add to `src/utils/api.ts`
- Types: Update `src/types/index.ts`

**New Feature (Backend):**
- Cloud function: Create `cloudfunctions/[name]/index.js`
- Shared utils: Add to `cloudfunctions/common/`
- Tests: Create `cloudfunctions/[name]/test.test.js`

**New Admin Page:**
- Page: `src/pagesAdmin/[module]/[page].vue`
- API action: Add to `cloudfunctions/admin-api/index.js`

**New Component:**
- Business component: `src/components/[ComponentName].vue`
- Admin component: `src/components/admin-[ComponentName].vue`

**Utilities:**
- Shared helpers: `src/utils/[name].ts`
- Cloud function utils: `cloudfunctions/common/[name].js`

## Special Directories

**CloudBase Layer (`cloudfunctions/layer/shared/`):**
- Purpose: Share common code across cloud functions
- Generated: No (manually maintained)
- Committed: Yes

**Database (`src/data/`):**
- Purpose: Mock/seed data for development
- Generated: No
- Committed: Yes

**Static Assets (`src/static/`):**
- Purpose: Icons, images
- Generated: No
- Committed: Yes

---

*Structure analysis: 2026-03-03*
