# Technical Solution Design: Admin Dashboard System

## Architecture Overview

The Admin Dashboard System is built as a Single Page Application (SPA) using the **UniApp framework (Vue 3 + TypeScript)**. It connects directly to the **Tencent CloudBase** backend services (Cloud Database, Cloud Functions, Cloud Storage) using the `@cloudbase/js-sdk`.

### Tech Stack
-   **Frontend**: UniApp (H5 mode primarily, but cross-platform capable), Vue 3 Composition API, TypeScript, Vite.
-   **Backend**: Tencent CloudBase (Serverless).
-   **Database**: CloudBase NoSQL Database (MongoDB-compatible).
-   **Authentication**: CloudBase Auth (Custom Login or Username/Password).
-   **UI Framework**: Uni-UI (built-in) or a lightweight admin UI library compatible with UniApp (e.g., `uView` or custom components following the design spec). *Note: Since this is UniApp, standard Element Plus is not directly supported if compiling to non-H5 targets, but for H5 admin panel, it works. However, to maintain cross-platform potential of the template, we will use UniApp-compatible components or standard HTML/CSS with the specified design system.*

### System Architecture Diagram
```mermaid
graph TD
    A[Admin User] -->|HTTPS| B[Admin Dashboard (UniApp H5)]
    B -->|SDK| C[CloudBase Auth]
    B -->|SDK| D[Cloud Functions]
    B -->|SDK| E[Cloud Database]
    B -->|SDK| F[Cloud Storage]
    
    subgraph CloudBase Backend
    D -->|Logic| E
    D -->|Logic| G[Third-party APIs (Logistics, Payment)]
    end
```

## Database Schema Design

The system shares the database with the main Mini Program. The following collections are utilized or added:

### 1. New Collections (Admin Specific)
-   **`admins`**: Stores administrator accounts.
    -   `_id`: string
    -   `username`: string
    -   `password`: string (hashed)
    -   `role`: 'super_admin' | 'operator' | 'finance'
    -   `lastLogin`: timestamp
-   **`operation_logs`**: Audit trail for sensitive actions.
    -   `_id`: string
    -   `adminId`: string
    -   `action`: string (e.g., 'approve_withdrawal')
    -   `targetId`: string (e.g., withdrawal_id)
    -   `details`: object
    -   `timestamp`: number
-   **`withdrawals`**: Withdrawal requests.
    -   `_id`: string
    -   `userId`: string
    -   `amount`: number (cents)
    -   `status`: 'pending' | 'approved' | 'rejected'
    -   `auditTime`: timestamp
    -   `auditorId`: string

### 2. Existing Collections (Shared)
-   **`products`**: Product catalog.
-   **`orders`**: Order records.
-   **`users`**: Customer data.
-   **`promotion_users`**: Promoter data.
-   **`coupon_templates`**: Coupon configurations.

## API Design (Cloud Functions)

To ensure security, sensitive admin operations should be encapsulated in a dedicated cloud function or a secured path within existing functions.

### `admin-api` (New Cloud Function)
A unified entry point for admin operations.
-   **Middleware**: Verifies admin session/token before executing any logic.
-   **Actions**:
    -   `login`: Authenticate admin credentials.
    -   `getDashboardData`: Aggregate statistics.
    -   `updateProductStock`: Adjust inventory.
    -   `auditWithdrawal`: Approve/Reject withdrawals.
    -   `updateOrderStatus`: Force update status (e.g., ship).

### Client-Side Data Access
For read-heavy operations (e.g., listing orders, users), the admin dashboard will use **CloudBase SDK Database Query** directly, provided that **Database Security Rules (ACL)** are configured to allow the `admin` role (or a specific `admin` user group) to read all data.
*   *Alternative*: If ACL is too complex to manage for a separate admin app, all data fetching will go through `admin-api` to ensure data isolation.

## Security Strategy
1.  **RBAC**: Role-Based Access Control implemented in `admin-api` and frontend routing guards.
2.  **Data Masking**: Sensitive user data (phone numbers) masked in lists, revealed only on detail view with logging.
3.  **HTTPS**: Enforced for all connections.
4.  **Audit Logging**: All write operations to `orders`, `users`, and `withdrawals` by admins are logged to `operation_logs`.

## UI/UX Implementation Strategy
-   **Global Styles**: Define CSS variables for the "Luxury/Refined" palette (`--primary-black`, `--amber-gold`).
-   **Layout Component**: Create a `MainLayout` component with the sidebar and header.
-   **Components**: Develop reusable `StatCard`, `DataTable`, `StatusBadge` components matching the design spec.
