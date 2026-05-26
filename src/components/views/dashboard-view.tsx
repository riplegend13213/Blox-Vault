'use client'

import { useAppStore } from '@/lib/store'
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS, formatPrice, timeAgo, formatDate } from '@/lib/constants'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  ShoppingBag,
  Clock,
  Heart,
  Bell,
  Package,
  Settings,
  HelpCircle,
  ChevronRight,
  Eye,
  ArrowRight,
  Loader2,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'

interface Order {
  id: string
  status: string
  total: number
  createdAt: string
  product: {
    id: string
    name: string
    slug: string
    category: string
    images: string
    priceBdt: number
  }
}

interface OrdersResponse {
  success: boolean
  data: { orders: Order[] }
}

interface WishlistResponse {
  success: boolean
  data: { wishlist: unknown[] }
}

interface NotificationsResponse {
  success: boolean
  data: { notifications: { id: string; read: boolean }[]; unreadCount: number }
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
}

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
}

export function DashboardView() {
  const { user, isAuthenticated, navigate } = useAppStore()

  const { data: ordersData, isLoading: ordersLoading } = useQuery<OrdersResponse>({
    queryKey: ['user-orders'],
    queryFn: () => fetch('/api/orders').then((r) => r.json()),
    enabled: isAuthenticated,
  })

  const { data: wishlistData } = useQuery<WishlistResponse>({
    queryKey: ['user-wishlist'],
    queryFn: () => fetch('/api/wishlist').then((r) => r.json()),
    enabled: isAuthenticated,
  })

  const { data: notificationsData } = useQuery<NotificationsResponse>({
    queryKey: ['user-notifications'],
    queryFn: () => fetch('/api/notifications').then((r) => r.json()),
    enabled: isAuthenticated,
  })

  if (!isAuthenticated || !user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Package className="w-16 h-16 text-muted-foreground/40" />
        <h2 className="text-xl font-semibold">Please sign in</h2>
        <p className="text-muted-foreground text-sm">You need to be logged in to view your dashboard.</p>
        <Button onClick={() => navigate('login')} className="bg-gold hover:bg-gold/90 text-gold-foreground">
          Sign In
        </Button>
      </div>
    )
  }

  const orders = ordersData?.data?.orders || []
  const recentOrders = orders.slice(0, 5)
  const pendingOrders = orders.filter((o) => o.status !== 'delivered' && o.status !== 'cancelled').length
  const wishlistCount = wishlistData?.data?.wishlist?.length || 0
  const unreadNotifications = notificationsData?.data?.unreadCount || 0

  const stats = [
    { label: 'Total Orders', value: orders.length, icon: Package, color: 'text-gold' },
    { label: 'Pending Orders', value: pendingOrders, icon: Clock, color: 'text-orange-400' },
    { label: 'Wishlist Items', value: wishlistCount, icon: Heart, color: 'text-pink-400' },
    { label: 'Notifications', value: unreadNotifications, icon: Bell, color: 'text-blue-400' },
  ]

  const quickNav = [
    { view: 'orders' as const, title: 'My Orders', desc: 'Track and manage your orders', icon: Package, color: 'text-gold' },
    { view: 'wishlist' as const, title: 'Wishlist', desc: 'Items you\'ve saved for later', icon: Heart, color: 'text-pink-400' },
    { view: 'notifications' as const, title: 'Notifications', desc: 'Stay updated on your orders', icon: Bell, color: 'text-blue-400' },
    { view: 'settings' as const, title: 'Settings', desc: 'Manage your account', icon: Settings, color: 'text-emerald-400' },
    { view: 'support' as const, title: 'Support', desc: 'Get help or create a ticket', icon: HelpCircle, color: 'text-purple-400' },
  ]

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-8">
      {/* Welcome */}
      <motion.div variants={item}>
        <h1 className="text-2xl sm:text-3xl font-bold">
          Welcome back, <span className="text-gold">{user.username}</span>
        </h1>
        <p className="text-muted-foreground mt-1">Here&apos;s an overview of your account activity.</p>
      </motion.div>

      {/* Stats Cards */}
      <motion.div variants={item} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="border-border/50 bg-card">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-3">
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <p className="text-2xl sm:text-3xl font-bold">{stat.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </motion.div>

      {/* Quick Actions */}
      <motion.div variants={item} className="flex flex-wrap gap-3">
        <Button
          onClick={() => navigate('shop')}
          className="bg-gold hover:bg-gold/90 text-gold-foreground"
        >
          <ShoppingBag className="w-4 h-4 mr-2" />
          Browse Shop
        </Button>
        <Button variant="outline" onClick={() => navigate('orders')}>
          <Package className="w-4 h-4 mr-2" />
          View Orders
        </Button>
        <Button variant="outline" onClick={() => navigate('support')}>
          <HelpCircle className="w-4 h-4 mr-2" />
          Contact Support
        </Button>
      </motion.div>

      <Separator />

      {/* Recent Orders */}
      <motion.div variants={item}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Recent Orders</h2>
          {orders.length > 5 && (
            <Button variant="ghost" size="sm" onClick={() => navigate('orders')} className="text-gold hover:text-gold/80">
              View All <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          )}
        </div>

        {ordersLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        ) : recentOrders.length === 0 ? (
          <Card className="border-border/50 bg-card">
            <CardContent className="p-8 text-center">
              <Package className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">No orders yet. Start shopping!</p>
              <Button
                onClick={() => navigate('shop')}
                className="mt-4 bg-gold hover:bg-gold/90 text-gold-foreground"
              >
                Browse Shop
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-border/50 bg-card overflow-hidden">
            <div className="divide-y divide-border/50">
              {recentOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between p-4 hover:bg-accent/30 transition-colors cursor-pointer"
                  onClick={() => navigate('orders')}
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-accent/50 flex items-center justify-center">
                      <Package className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">
                        {order.product.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        #{order.id.slice(-8)} &middot; {timeAgo(order.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                    <Badge
                      variant="outline"
                      className={`text-[10px] hidden sm:inline-flex ${ORDER_STATUS_COLORS[order.status] || ''}`}
                    >
                      {ORDER_STATUS_LABELS[order.status] || order.status}
                    </Badge>
                    <span className="text-sm font-semibold text-gold">
                      {formatPrice(order.total)}
                    </span>
                    <Eye className="w-4 h-4 text-muted-foreground" />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </motion.div>

      <Separator />

      {/* Quick Navigation */}
      <motion.div variants={item}>
        <h2 className="text-lg font-semibold mb-4">Quick Navigation</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {quickNav.map((nav) => (
            <Card
              key={nav.view}
              className="border-border/50 bg-card hover:border-gold/30 transition-all duration-300 cursor-pointer group"
              onClick={() => navigate(nav.view)}
            >
              <CardContent className="p-4 sm:p-5 flex items-center gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-accent/50 flex items-center justify-center group-hover:bg-gold/10 transition-colors">
                  <nav.icon className={`w-5 h-5 ${nav.color}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm">{nav.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{nav.desc}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-gold group-hover:translate-x-0.5 transition-all flex-shrink-0" />
              </CardContent>
            </Card>
          ))}
        </div>
      </motion.div>
    </motion.div>
  )
}
