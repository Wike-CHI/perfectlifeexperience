# Requirements Document: Admin Dashboard System

## Introduction
The Admin Dashboard System is a comprehensive management interface for the "Perfect Life Experience" (大友元气) craft beer e-commerce platform. It enables administrators, operations staff, and finance personnel to manage products, orders, users, promotions, and financial transactions.

## UI Design Specification

### 1. Purpose Statement
To provide a powerful, efficient, and visually premium management interface for brewery operations staff, enabling seamless control over the e-commerce ecosystem while reflecting the brand's high-end "Perfect Life" positioning.

### 2. Aesthetic Direction
**Luxury/Refined**. The interface will move away from generic "admin panel" looks and embrace a sophisticated, high-contrast aesthetic using the brand's gold and black identity. It will feature generous whitespace, elegant typography, and subtle micro-interactions to create a sense of precision and quality.

### 3. Color Palette
- **Obsidian Black**: `#1A1A1A` (Primary Background / Navigation)
- **Amber Gold**: `#C9A962` (Primary Action / Accents)
- **Antique White**: `#FAF9F7` (Content Background)
- **Charcoal Grey**: `#4A4A4A` (Secondary Text)
- **Success Green**: `#5B7A6E` (Status Indicators)

### 4. Typography
- **Headings**: `Playfair Display` (Serif, for page titles and major metrics)
- **Body/UI**: `Manrope` (Sans-serif, for data tables and controls)
- **Monospace**: `Space Mono` (For IDs, codes, and financial figures)

### 5. Layout Strategy
**Asymmetric Dashboard Layout**. Instead of a standard full-width top bar, the layout will feature a floating sidebar that detaches from the edge. Content areas will use a masonry-style grid for widgets rather than uniform boxes. Section headers will overlap with content cards to create depth.

---

## Requirements

### Requirement 1 - Dashboard Overview
**User Story**: As an administrator, I want to see key business metrics at a glance so that I can monitor the platform's health.

#### Acceptance Criteria
1.  **While** on the Dashboard page, **when** the page loads, **the System** shall display the total sales for the current day.
2.  **While** on the Dashboard page, **when** the page loads, **the System** shall display the count of new orders for the current day.
3.  **While** on the Dashboard page, **when** the page loads, **the System** shall display a chart showing the sales trend for the last 7 days.
4.  **While** on the Dashboard page, **when** there are pending tasks (e.g., pending shipments, pending withdrawals), **the System** shall display a "To-Do" list with counts for each task type.

### Requirement 2 - Product Management
**User Story**: As an operations staff, I want to manage product information so that customers see accurate details.

#### Acceptance Criteria
1.  **While** on the Product List page, **when** the user clicks "Add Product", **the System** shall navigate to the Product Creation form.
2.  **While** editing a product, **when** the user enters product details (Name, Category, Images, Description), **the System** shall validate that required fields are not empty.
3.  **While** editing a product, **when** the user defines specifications (SKUs), **the System** shall allow setting distinct prices and stock levels for each SKU (e.g., 500ml, 1L).
4.  **While** on the Product List page, **when** the user toggles the "On Shelf" switch for a product, **the System** shall update the product's status to "Active" or "Inactive".

### Requirement 3 - Order Management
**User Story**: As a fulfillment staff, I want to view and process orders so that goods are shipped to customers on time.

#### Acceptance Criteria
1.  **While** on the Order List page, **when** the user selects a status filter (e.g., "Pending Payment", "To Ship"), **the System** shall display only orders matching that status.
2.  **While** viewing an order with status "To Ship", **when** the user clicks "Ship", **the System** shall open a modal to enter the Logistics Company and Tracking Number.
3.  **While** on the Ship Modal, **when** the user submits valid logistics info, **the System** shall update the order status to "Shipped" and record the shipping time.
4.  **While** viewing an order, **when** the user clicks "Export", **the System** shall generate an Excel file containing the order details.

### Requirement 4 - Promotion & Distribution
**User Story**: As a marketing manager, I want to manage the distribution network so that I can incentivize promoters.

#### Acceptance Criteria
1.  **While** on the Promoter List page, **when** the user searches by phone number, **the System** shall display the promoter's profile, including Agent Level and Star Level.
2.  **While** viewing a promoter's profile, **when** the user clicks "View Team", **the System** shall display a hierarchical tree or list of their downline team members.
3.  **While** on the Commission Records page, **when** the user filters by "Reward Type" (e.g., Repurchase, Management), **the System** shall list all corresponding commission records.

### Requirement 5 - Financial Management
**User Story**: As a finance staff, I want to manage withdrawals so that promoters are paid correctly.

#### Acceptance Criteria
1.  **While** on the Withdrawal List page, **when** the user views "Pending" requests, **the System** shall display the requester's name, amount, and account info.
2.  **While** viewing a pending withdrawal, **when** the user clicks "Approve", **the System** shall update the status to "Approved" and deduct the amount from the user's frozen balance (if not already deducted).
3.  **While** viewing a pending withdrawal, **when** the user clicks "Reject", **the System** shall prompt for a rejection reason and return the funds to the user's balance.

### Requirement 6 - Marketing Configuration
**User Story**: As an operations staff, I want to configure coupons and banners so that I can run marketing campaigns.

#### Acceptance Criteria
1.  **While** on the Coupon Management page, **when** the user clicks "Create Coupon", **the System** shall allow setting parameters: Name, Type (Amount/Discount), Value, Min Spend, Total Count, and Validity Period.
2.  **While** on the Banner Management page, **when** the user uploads an image and sets a link, **the System** shall save it to the homepage carousel configuration.
