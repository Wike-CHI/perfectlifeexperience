# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **UniApp-based Admin Dashboard** for a WeChat Mini Program ("大友元气精酿啤酒小程序后台管理系统"). The admin system is built with Vue 3, TypeScript, and CloudBase SDK, designed to manage the business operations of a craft beer mini-program.

### Project Type
- **Framework**: UniApp (Vue 3 + TypeScript)
- **Platform**: Cross-platform admin dashboard (can build for Web, iOS, Android, WeChat Mini Program)
- **Backend**: Tencent CloudBase (cloud functions + NoSQL database)
- **Cloud Functions**: Located in `../cloudfunctions/`
- **Authentication**: Anonymous login by default, with support for multiple auth methods (phone, email, password, OpenID)

---

## Development Commands

### Development Server
```bash
# Run development server (opens in browser by default)
npm run dev:h5

# Run for specific platforms
npm run dev:mp-weixin    # WeChat Mini Program
npm run dev:h5:ssr       # H5 with SSR
```

### Build Commands
```bash
# Production build
npm run build:h5

# Platform-specific builds
npm run build:mp-weixin
npm run build:mp-alipay
npm run build:h5:ssr
```

### Type Checking
```bash
npm run type-check
```

---

## Project Architecture

### Directory Structure
```
admin_dash/
├── src/
│   ├── pages/              # Page components
│   │   ├── index/         # Landing page
│   │   ├── dashboard/      # Main dashboard
│   │   ├── login/          # Login methods (phone, email, password, OpenID)
│   │   └── profile/
│   ├── components/
│   │   ├── MainLayout.vue  # Sidebar navigation layout
│   │   └── show-captcha.vue
│   ├── styles/
│   │   └── variables.scss  # Design tokens (colors, fonts, spacing)
│   ├── utils/
│   │   ├── cloudbase.ts    # CloudBase SDK wrapper
│   │   └── index.ts
│   ├── App.vue              # Root component
│   ├── main.ts             # Entry point (component registration)
│   ├── manifest.json        # UniApp platform configuration
│   └── env.d.ts            # Environment types
├── cloudfunctions/           # CloudBase cloud functions (shared with mini-program)
│   ├── admin-api/          # Admin-specific backend API
│   ├── user/               # User management
│   ├── order/              # Order processing
│   ├── wallet/              # Wallet operations
│   ├── coupon/              # Coupon system
│   ├── promotion/           # Marketing/promotions
│   ├── rewardSettlement/    # Rewards
│   ├── login/              # Authentication
│   └── hello/              # Test function
├── vite.config.ts           # Vite build configuration
├── tsconfig.json            # TypeScript configuration
└── package.json

```

### Key Architecture Patterns

**1. CloudBase Integration (`src/utils/cloudbase.ts`)**
- Uses `@cloudbase/js-sdk` with `@cloudbase/adapter-uni-app`
- Environment ID configured via `VITE_ENV_ID` environment variable
- Provides centralized auth methods: `login()`, `logout()`, `checkLogin()`, `signInWithOpenId()`, `signInWithPassword()`, `signInWithOtp()`
- All database/auth operations go through this module

**2. Page Structure**
- Pages use `<script setup lang="ts">` syntax (Vue 3 Composition API)
- Navigation via `uni.navigateTo()` and `uni.redirectTo()`
- UI components wrapped in `MainLayout` for authenticated pages

**3. Cloud Function Communication**
- Functions called via `app.callFunction({ name: 'function-name', data: {...} })`
- Admin-specific API in `cloudfunctions/admin-api/index.js`
- Response format: `{ result: { code: 0, data: {...}, msg: '...' }`

**4. Design System (`src/styles/variables.scss`)**
- Colors: Obsidian black (#1A1A1A), Amber gold (#C9A962), Antique white, etc.
- Fonts: Playfair Display (headings), Manrope (body), Space Mono (code)
- Design tokens for spacing and border radius

**5. Layout Pattern**
- `MainLayout.vue` provides consistent sidebar navigation
- Active route highlighting
- Breadcrumb navigation support
- User profile display

---

## Cloud Functions

Located in `../cloudfunctions/` (shared with main mini-program project).

### Shared Utilities
All cloud functions share common utilities from `../cloudfunctions/common/`:
- **`response.js`** - Standardized response format (`{code, msg, data}`)
- **`validator.js`** - Input validation utilities
- **`logger.js`** - Structured logging with levels
- **`constants.js`** - Shared constants

### Cloud Function Pattern
Each function follows this pattern:

```javascript
exports.main = async (event, context) => {
  const { action, data } = event
  const wxContext = cloud.getWXContext()

  switch (action) {
    case 'someAction':
      return await handleSomeAction(data)
    default:
      return { code: 400, msg: 'Unknown action' }
  }
}
```

### Key Cloud Functions
- **admin-api**: Dashboard data, admin operations
- **user**: User profile and management
- **order**: Order processing and tracking
- **wallet**: User wallet operations
- **coupon**: Coupon management
- **promotion**: Marketing campaigns
- **rewardSettlement**: Reward calculation and distribution
- **login**: Authentication handling
- **product**: Product catalog management
- **wechatpay**: WeChat Pay integration
- **migration**: Database migrations

**Note**: Cloud functions use `wx-server-sdk` (server-side), not `@cloudbase/js-sdk`

---

## Configuration

### Environment Variables
Set in `.env` file or build environment:
- `VITE_ENV_ID`: CloudBase environment ID (default: `'cloud1-6gmp2q0y3171c353'`)
- `VITE_PUBLISHABLE_KEY`: Optional client-side publishable key

### UniApp Configuration (`src/manifest.json`)
- **appid**: WeChat Mini Program AppID (empty by default - needs configuration)
- Platform-specific settings for WeChat, Alipay, Baidu, etc.
- Build output configuration

### Vite Configuration (`vite.config.ts`)
- Development server: `0.0.0.0` (configures to listen on all interfaces)
- Default port: 5173 (Vite default, may vary if occupied)
- Proxy configured for `/__auth` routes to CloudBase auth endpoints
- UniApp plugin with dependency optimization exclusions

---

## Authentication Flow

This dashboard supports multiple authentication methods:

1. **Anonymous Login** (default): Quick access without registration
2. **OpenID Login**: Silent login using WeChat OpenID
3. **Phone Authorization**: Uses `open-type="getPhoneNumber"` button
4. **Password Login**: Phone/email/username + password
5. **OTP/Email Code**: Verification code login

All authentication methods:
- Route through `src/utils/cloudbase.ts`
- Use CloudBase auth SDK
- Check login state via `checkLogin()`
- Store session in CloudBase auth system

---

## Development Notes

### Important Considerations

1. **Environment ID**: Must configure `VITE_ENV_ID` before running
2. **WeChat AppID**: Configure `appid` in `manifest.json` for WeChat Mini Program builds
3. **Cross-Platform**: Test on multiple platforms (H5, WeChat) before deployment
4. **Cloud Function Runtime**: Cannot be changed after creation - Node.js 16.x is used
5. **CORS**: Backend (Cloud Functions) must handle CORS for web deployments

### Testing Dashboard Data
The dashboard currently shows mock data when `admin-api` cloud function is not deployed:
- File: `src/pages/dashboard/index.vue`
- Fallback values provided when API calls fail
- Check console for "Using mock data due to API failure"

### Adding New Admin Pages

1. Create page in `src/pages/[page-name]/index.vue`
2. Add route to `src/components/MainLayout.vue` menuItems array
3. Register in `src/pages.json` (if auto-registration doesn't work)
4. Create corresponding cloud function action if backend needed

---

## Build and Deployment

### Build Output
Build artifacts are in platform-specific directories (not tracked in git):
- H5: `unpackage/dist/build/h5/`
- WeChat MP: `unpackage/dist/build/mp-weixin/`

### Cloud Function Deployment
Cloud functions are deployed separately from `../cloudfunctions/`:
```bash
# Via CloudBase CLI or Console
# Navigate to CloudBase Console → Cloud Functions
# Upload function directories individually
```

### Static Hosting (Web Deployment)
Web builds can be deployed to CloudBase static hosting via console or CLI tools.

---

## Common Issues and Solutions

### Issue: "环境ID未配置" (Environment ID not configured)
**Solution**: Set `VITE_ENV_ID` in `.env` file or update `src/utils/cloudbase.ts`

### Issue: CloudBase auth not working in development
**Solution**: Vite proxy is configured for `/__auth` routes in `vite.config.ts`

### Issue: Cannot build for WeChat Mini Program
**Solution**: Configure valid `appid` in `src/manifest.json` → `mp-weixin.appid`

### Issue: Dashboard shows mock data
**Solution**: Deploy `cloudfunctions/admin-api` to CloudBase environment

---

## Design Guidelines Reference

The project uses a premium, craft-brewing inspired design system:
- **Primary Color**: Amber Gold (#C9A962) - accent/CTA buttons
- **Background**: Deep Obsidian (#1A1A1A) - luxury feel
- **Typography**: Playfair Display for headings (serif elegance), Manrope for body (readability)
- **Spacing**: Generous padding, card-based layouts
- **Radius**: Moderate border-radius (8px-16px)

When adding new UI components:
1. Reference existing component patterns in `src/components/`
2. Use design tokens from `src/styles/variables.scss`
3. Follow Vue 3 Composition API patterns
4. Include both light and dark backgrounds considerations (current theme is dark)
