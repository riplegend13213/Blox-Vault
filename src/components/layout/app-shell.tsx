'use client'

import { useAppStore, ViewType } from '@/lib/store'
import { Navbar } from '@/components/layout/navbar'
import { Footer } from '@/components/layout/footer'
import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, lazy, Suspense } from 'react'
import { Skeleton } from '@/components/ui/skeleton'

// Lazy load views for performance
const HomeView = lazy(() => import('@/components/views/home-view').then(m => ({ default: m.HomeView })))
const ShopView = lazy(() => import('@/components/views/shop-view').then(m => ({ default: m.ShopView })))
const ProductView = lazy(() => import('@/components/views/product-view').then(m => ({ default: m.ProductView })))
const LoginView = lazy(() => import('@/components/views/login-view').then(m => ({ default: m.LoginView })))
const SignupView = lazy(() => import('@/components/views/signup-view').then(m => ({ default: m.SignupView })))
const DashboardView = lazy(() => import('@/components/views/dashboard-view').then(m => ({ default: m.DashboardView })))
const OrdersView = lazy(() => import('@/components/views/orders-view').then(m => ({ default: m.OrdersView })))
const WishlistView = lazy(() => import('@/components/views/wishlist-view').then(m => ({ default: m.WishlistView })))
const NotificationsView = lazy(() => import('@/components/views/notifications-view').then(m => ({ default: m.NotificationsView })))
const SettingsView = lazy(() => import('@/components/views/settings-view').then(m => ({ default: m.SettingsView })))
const SupportView = lazy(() => import('@/components/views/support-view').then(m => ({ default: m.SupportView })))
const TicketView = lazy(() => import('@/components/views/ticket-view').then(m => ({ default: m.TicketView })))
const RobuxView = lazy(() => import('@/components/views/robux-view').then(m => ({ default: m.RobuxView })))
const AdminView = lazy(() => import('@/components/views/admin-view').then(m => ({ default: m.AdminView })))
const AdminProductsView = lazy(() => import('@/components/views/admin-products-view').then(m => ({ default: m.AdminProductsView })))
const AdminOrdersView = lazy(() => import('@/components/views/admin-orders-view').then(m => ({ default: m.AdminOrdersView })))
const AdminUsersView = lazy(() => import('@/components/views/admin-users-view').then(m => ({ default: m.AdminUsersView })))
const AdminReviewsView = lazy(() => import('@/components/views/admin-reviews-view').then(m => ({ default: m.AdminReviewsView })))
const AdminAnalyticsView = lazy(() => import('@/components/views/admin-analytics-view').then(m => ({ default: m.AdminAnalyticsView })))
const AdminSupportView = lazy(() => import('@/components/views/admin-support-view').then(m => ({ default: m.AdminSupportView })))
const AdminRobuxView = lazy(() => import('@/components/views/admin-robux-view').then(m => ({ default: m.AdminRobuxView })))
const AdminAnnouncementsView = lazy(() => import('@/components/views/admin-announcements-view').then(m => ({ default: m.AdminAnnouncementsView })))

function ViewLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="space-y-4 w-full max-w-md p-8">
        <Skeleton className="h-8 w-3/4 mx-auto" />
        <Skeleton className="h-4 w-1/2 mx-auto" />
        <div className="space-y-3 mt-8">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    </div>
  )
}

function ViewRenderer({ view }: { view: ViewType }) {
  switch (view) {
    case 'home': return <HomeView />
    case 'shop': return <ShopView />
    case 'product': return <ProductView />
    case 'login': return <LoginView />
    case 'signup': return <SignupView />
    case 'dashboard': return <DashboardView />
    case 'orders': return <OrdersView />
    case 'wishlist': return <WishlistView />
    case 'notifications': return <NotificationsView />
    case 'settings': return <SettingsView />
    case 'support': return <SupportView />
    case 'ticket': return <TicketView />
    case 'robux': return <RobuxView />
    case 'admin': return <AdminView />
    case 'admin-products': return <AdminProductsView />
    case 'admin-orders': return <AdminOrdersView />
    case 'admin-users': return <AdminUsersView />
    case 'admin-reviews': return <AdminReviewsView />
    case 'admin-analytics': return <AdminAnalyticsView />
    case 'admin-support': return <AdminSupportView />
    case 'admin-robux': return <AdminRobuxView />
    case 'admin-announcements': return <AdminAnnouncementsView />
    default: return <HomeView />
  }
}

export function AppShell() {
  const { currentView, setUser } = useAppStore()

  // Check session on mount
  useEffect(() => {
    async function checkSession() {
      try {
        const res = await fetch('/api/auth/me')
        if (res.ok) {
          const data = await res.json()
          if (data.success && data.data) {
            setUser(data.data)
          }
        }
      } catch {
        // Not logged in, that's fine
      }
    }
    checkSession()
  }, [setUser])

  // Determine if we should show footer (not on admin views)
  const showFooter = !currentView.startsWith('admin')

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 pt-16">
        <Suspense fallback={<ViewLoader />}>
          <AnimatePresence mode="wait">
            <motion.div
              key={currentView}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
            >
              <ViewRenderer view={currentView} />
            </motion.div>
          </AnimatePresence>
        </Suspense>
      </main>
      {showFooter && <Footer />}
      
      {/* Floating support button */}
      <button
        onClick={() => useAppStore.getState().navigate('support')}
        className="fixed bottom-6 right-6 z-40 w-12 h-12 rounded-full bg-gold text-gold-foreground shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center hover:scale-110 gold-glow-subtle"
        aria-label="Contact Support"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
      </button>
    </div>
  )
}
