---
Task ID: 3-d
Agent: Dashboard/Support View Builder
Task: Build Dashboard, Orders, Wishlist, Notifications, Settings, Support, and Ticket view components

Work Log:
- Created dashboard-view.tsx — Welcome section with username, 4 stat cards (Total Orders, Pending Orders, Wishlist Items, Notifications) fetched from APIs, quick action buttons (Browse Shop, View Orders, Contact Support), recent orders table (last 5), and 5 quick navigation cards
- Created orders-view.tsx — Full order list with expand/collapse per order, visual 5-step order timeline tracker (Pending > Review > Confirmed > Processing > Delivered) with progress bar, payment proof upload/re-upload dialog, admin notes display, delivery status, empty state with Browse Shop CTA
- Created wishlist-view.tsx — Product cards with remove from wishlist, rarity badges, stock indicators, click to navigate to product view, empty state with Browse Shop CTA
- Created notifications-view.tsx — Notification list with type-specific icons/colors (order/payment/support/info/system), unread indicator with gold dot, mark as read per item, mark all as read, filter tabs (All/Unread/Orders/Payments/Support), empty state
- Created settings-view.tsx — Profile display (username, email, role, verified badge), change password form with show/hide toggles and validation, notification preference toggles (order/payment/support/promo), danger zone with disabled delete account
- Created support-view.tsx — FAQ accordion (7 items covering common questions), create ticket form with subject/message fields, existing ticket list with status badges and message count, click to navigate to ticket detail
- Created ticket-view.tsx — Ticket header with status badge and dates, scrollable message thread with admin/user visual distinction (gold admin badge, different bubble alignment), reply form at bottom, closed ticket handling with "Create new ticket" option

Stage Summary:
- All 7 user dashboard and support view files created
- All components use React Query for data fetching, Framer Motion for animations, shadcn/ui components, premium gold accents throughout
- Authentication guards on all views with login prompt for unauthenticated users
- Lint check passes with no errors on all new files
- All views integrate with useAppStore for navigation and auth state
- All data fetched from existing API endpoints (/api/orders, /api/wishlist, /api/notifications, /api/support, /api/support/[id])
