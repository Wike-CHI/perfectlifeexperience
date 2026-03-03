# Technology Stack

**Analysis Date:** 2026-03-03

## Languages

**Primary:**
- TypeScript 4.9.4 - Frontend (Vue 3 components, utilities, types)
- JavaScript (ES2020) - Backend (Cloud Functions)

**Secondary:**
- Vue 3 (SFC) - Component definition
- SCSS - Styling preprocessor

## Runtime

**Frontend Build:**
- Node.js (for development/build)
- Vite 5.2.8 - Build tool and dev server

**Backend (Cloud Functions):**
- Node.js 16.13 - CloudBase cloud function runtime

**Package Manager:**
- npm - Lockfile: `package-lock.json` (not in repo but generated)

## Frameworks

**Core (Frontend):**
- UniApp 3.0.0-4060620250520001 - Cross-platform mini program framework
- Vue 3.4.21 - Frontend framework

**Testing:**
- Vitest 4.0.18 - Unit testing framework
- Happy DOM 20.7.0 - DOM environment for Vue composables testing

**Build/Dev:**
- Vite 5.2.8 - Build tool with UniApp plugin
- @dcloudio/vite-plugin-uni 3.0.0-4070520250711001 - UniApp Vite integration
- sass 1.89.2 - SCSS preprocessor

**Cloud Functions:**
- wx-server-sdk ~2.6.3 - Tencent CloudBase SDK for WeChat

## Key Dependencies

**Frontend (package.json):**
| Package | Version | Purpose |
|---------|---------|---------|
| @dcloudio/uni-app | 3.0.0-4060620250520001 | Core UniApp framework |
| @dcloudio/uni-mp-weixin | 3.0.0-4060620250520001 | WeChat mini program compilation |
| @cloudbase/adapter-uni-app | ^1.0.0-beta.1 | CloudBase UniApp adapter |
| @cloudbase/js-sdk | latest | CloudBase client SDK |
| vue | 3.4.21 | Vue framework |
| vue-i18n | 9.14.4 | Internationalization (prepared) |
| sass | ^1.89.2 | CSS preprocessor |
| typescript | ^4.9.4 | Type checking |
| vite | 5.2.8 | Build tool |
| vitest | ^4.0.18 | Testing |
| @vue/test-utils | ^2.4.6 | Vue testing utilities |

**Backend (Cloud Functions):**
| Package | Purpose |
|---------|---------|
| wx-server-sdk | CloudBase database and auth |
| axios | HTTP client for external APIs |
| bcryptjs | Password hashing for admin auth |
| jsonwebtoken | JWT token verification |

## Configuration

**Frontend:**
- `vite.config.ts` - Build configuration, proxy settings, terser compression
- `tsconfig.json` - TypeScript paths: `@/*` maps to `src/*`
- `src/config/env.ts` - Environment configuration
- `src/manifest.json` - Platform configs (WeChat AppID, permissions)

**Environment:**
- CloudBase ENV_ID: `cloud1-6gmp2q0y3171c353`
- WeChat AppID: `wx4a0b93c3660d1404`
- Vite env vars: `VITE_ENV_ID`, `VITE_WEIXIN_APPID`

**Cloud Function Runtime:**
- Node.js 16.13 (immutable after creation)
- Memory: 256MB (order function)
- Timeout: 20 seconds
- Layers: common-layer for shared utilities

## Platform Requirements

**Development:**
- Node.js for build
- WeChat Developer Tools (for mini program preview)
- H5 build for web testing

**Production:**
- WeChat Mini Program deployment
- Tencent CloudBase for backend
- Cloud Storage for file uploads

---

*Stack analysis: 2026-03-03*
