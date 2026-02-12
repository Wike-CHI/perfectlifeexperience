# Implementation Plan: Admin Dashboard System

## Phase 1: Foundation & Infrastructure (P0)
- [ ] 1.1 **Initialize Admin Project**
  - Setup UniApp project structure for Admin Dashboard.
  - Configure `vite.config.ts` and `tsconfig.json`.
  - Install dependencies: `@cloudbase/js-sdk`, `@dcloudio/uni-ui` (or chosen UI library).
  - _Requirement: Technical Solution Design_

- [ ] 1.2 **Configure CloudBase Environment**
  - Configure `src/utils/cloudbase.ts` with correct `ENV_ID`.
  - Verify CloudBase SDK initialization.
  - Implement `admin-api` cloud function skeleton.
  - _Requirement: Technical Solution Design_

- [ ] 1.3 **Implement UI Design System**
  - Create `src/styles/variables.scss` with the defined color palette (Obsidian Black, Amber Gold).
  - Configure global typography (Manrope, Playfair Display).
  - Develop `MainLayout` component (Sidebar, Header).
  - Develop core UI components: `StatCard`, `DataTable`, `StatusBadge`, `PrimaryButton`.
  - _Requirement: UI Design Specification_

## Phase 2: Core Modules (P0)
- [ ] 2.1 **Implement Authentication**
  - Create `Login` page with brand styling.
  - Implement login logic using CloudBase Auth (Username/Password or Custom).
  - Implement route guards for protected pages.
  - _Requirement: Technical Solution Design_

- [ ] 2.2 **Implement Dashboard Overview**
  - Create `Dashboard` page layout.
  - Fetch and display daily sales/orders stats (mock or real data via `admin-api`).
  - Implement "To-Do" list widget.
  - _Requirement: Requirement 1_

- [ ] 2.3 **Implement Product Management**
  - Create `ProductList` page with search/filter.
  - Create `ProductEdit` form page (Name, Category, Images, Rich Text Description).
  - Implement SKU management (Price/Stock per variant).
  - Implement Create/Update/Delete product actions via CloudBase DB or Function.
  - _Requirement: Requirement 2_

- [ ] 2.4 **Implement Order Management**
  - Create `OrderList` page with status tabs.
  - Create `OrderDetail` page showing user info, items, payment details.
  - Implement "Ship Order" modal and logic (update status to 'shipped').
  - Implement "Export Orders" functionality.
  - _Requirement: Requirement 3_

## Phase 3: Advanced Modules (P1)
- [ ] 3.1 **Implement User Management**
  - Create `UserList` page.
  - Create `UserDetail` page showing profile, orders, and wallet balance.
  - Implement user search.
  - _Requirement: Technical Solution Design_

- [ ] 3.2 **Implement Promotion Management**
  - Create `PromoterList` page showing Agent/Star levels.
  - Implement "View Team" hierarchy visualization.
  - Create `CommissionList` page to view reward records.
  - _Requirement: Requirement 4_

- [ ] 3.3 **Implement Financial Management**
  - Create `WithdrawalList` page for pending requests.
  - Implement Approve/Reject withdrawal actions via `admin-api`.
  - _Requirement: Requirement 5_

## Phase 4: Marketing & Optimization (P2)
- [ ] 4.1 **Implement Marketing Configuration**
  - Create `CouponList` and `CouponCreate` pages.
  - Create `BannerList` page for homepage carousel management.
  - _Requirement: Requirement 6_

- [ ] 4.2 **System Testing & Deployment**
  - Perform UI/UX audit against design specs.
  - Conduct end-to-end testing of critical flows (Login -> Product -> Order).
  - Deploy Admin Dashboard to CloudBase Static Hosting.
  - _Requirement: Technical Solution Design_
