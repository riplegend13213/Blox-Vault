# Task 5-a: New API Routes for BloxVault

## Agent: Backend API Builder

## Task: Create 8 new API route files for Robux, Flash Deals, Announcements, Loyalty, and Admin management

## Work Done:

### 1. `/src/app/api/robux/route.ts`
- GET: Lists active Robux packages sorted by sortOrder
- POST: Creates Robux order with loyalty points calculation (1 point per ৳100 spent), creates PointTransaction, creates notification

### 2. `/src/app/api/robux/orders/route.ts`
- GET: Lists authenticated user's Robux orders with package info, ordered by newest first

### 3. `/src/app/api/flash-deals/route.ts`
- GET: Lists active flash deals (isFlashDeal=true AND flashDealEndsAt > now), includes countdown info (days, hours, minutes, seconds) and discount percentage

### 4. `/src/app/api/announcements/route.ts`
- GET: Lists active announcements (active=true AND startDate <= now AND endDate is null or > now)

### 5. `/src/app/api/loyalty/route.ts`
- GET: Returns user's loyalty points balance, total earned, total spent, and recent transactions (last 20)
- POST: Redeem points (minimum 100, each point = ৳1 discount), atomic transaction with PointTransaction record and notification

### 6. `/src/app/api/admin/robux/route.ts`
- GET: Lists all Robux orders with user/package info, pagination, search, and status filter
- PATCH: Updates Robux order status with notification
- POST: Creates new Robux package
- PUT: Updates existing Robux package

### 7. `/src/app/api/admin/announcements/route.ts`
- GET: Lists all announcements
- POST: Creates announcement with title, body, type, dates
- PATCH: Updates announcement fields
- DELETE: Deletes announcement

### 8. `/src/app/api/admin/flash-deals/route.ts`
- POST: Creates flash deal (saves original price, sets discount price, sets end date)
- PATCH: Updates flash deal fields
- DELETE: Removes flash deal status and restores original price

## Patterns Used:
- Cookie-based auth (bv_session) with getAuthUser/requireAdmin helpers
- Zod validation on all inputs
- Consistent response format: `{ success: true, data: {...} }` or `{ success: false, error: 'message' }`
- Prisma transactions for atomic operations (Robux order creation, point redemption)
- Notifications created for status changes and user actions

## Lint: Passes cleanly
