# External Integrations

**Analysis Date:** 2026-03-03

## APIs & External Services

**Cloud Backend:**
- Tencent CloudBase - Primary backend platform
  - Cloud Functions: 15+ functions for business logic
  - NoSQL Database: Multiple collections (users, orders, products, etc.)
  - Cloud Storage: File uploads (avatars, product images)
  - SDK: `@cloudbase/js-sdk` (frontend), `wx-server-sdk` (backend)

**WeChat Platform:**
- WeChat Mini Program - Primary client
  - AppID: `wx4a0b93c3660d1404`
  - Platform: mp-weixin
  - Permissions: Location (getLocation, chooseLocation)
- WeChat Pay V3 API - Payment processing
  - Merchant ID: Configured via `WX_MCHID` env var
  - Certificate: Serial number via `WX_SERIAL_NO` env var
  - Private Key: PEM format via `WX_PRIVATE_KEY` env var
  - API v3 Key: via `WX_API_V3_KEY` env var

## Data Storage

**Database:**
- Tencent CloudBase NoSQL (MongoDB-like)
  - Collections: users, orders, products, categories, promotions, wallets, etc.
  - Connection: Via wx-server-sdk in cloud functions

**File Storage:**
- Tencent CloudBase Cloud Storage
  - Used for: User avatars, product images
  - API: `wx.cloud.uploadFile()`

**Caching:**
- Local Storage (mini program) - User session cache (7-day login)
- No external caching service

## Authentication & Identity

**User Authentication:**
- WeChat OpenID-based (silent login via CloudBase)
  - Flow: `login` cloud function gets OPENID from wxContext
  - Session: 7-day local storage cache

**Admin Authentication:**
- JWT-based with bcrypt password hashing
  - Implementation: `admin-api` cloud function
  - Dependencies: `jsonwebtoken`, `bcryptjs`
  - Roles: super_admin, operator, finance

## Monitoring & Observability

**Logging:**
- CloudBase console logs
- Structured logging via `cloudfunctions/common/logger.js`

**Error Tracking:**
- CloudBase function logs
- No external error tracking service

## CI/CD & Deployment

**Hosting:**
- Tencent CloudBase - Static hosting and cloud functions

**CI Pipeline:**
- Not detected (manual deployment via CloudBase console or WeChat Developer Tools)

## Environment Configuration

**Required env vars:**

*Frontend (`src/config/env.ts`):*
- `VITE_ENV_ID` - CloudBase environment ID
- `VITE_WEIXIN_APPID` - WeChat AppID

*Cloud Functions (`cloudfunctions/wechatpay/config.js`):*
- `WX_APPID` - WeChat Mini Program AppID
- `WX_MCHID` - WeChat Pay Merchant ID
- `WX_SERIAL_NO` - Certificate serial number
- `WX_PRIVATE_KEY` - Merchant private key (PEM)
- `WX_API_V3_KEY` - API v3 key
- `WX_NOTIFY_URL` - Payment callback URL

**Secrets location:**
- Development: `src/config/env.ts` (DEV_CONFIG)
- Production: CloudBase console environment variables

## Webhooks & Callbacks

**Incoming:**
- WeChat Pay callback (HTTP trigger)
  - Cloud Function: `wechatpay`
  - Trigger: POST request from WeChat servers
  - Path: HTTP trigger URL configured in CloudBase

**Outgoing:**
- WeChat Pay API calls (axios)
  - Endpoint: `https://api.mch.weixin.qq.com/v3/pay/transactions/*`

## Cloud Functions List

| Function | Purpose |
|----------|---------|
| login | Silent login, OpenID retrieval |
| user | User profile management |
| promotion | Referral system, commission calculation |
| product | Product catalog |
| order | Order management |
| wechatpay | WeChat Pay V3 integration |
| wallet | User balance wallet |
| commission-wallet | Commission earnings wallet |
| coupon | Coupon system |
| upload | File upload to cloud storage |
| admin-api | Admin dashboard API |
| migration | Database schema migrations |
| rewardSettlement | Reward processing |

---

*Integration audit: 2026-03-03*
