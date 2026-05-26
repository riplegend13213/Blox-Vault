'use client'

import { useAppStore } from '@/lib/store'
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS, formatPrice, formatDate, timeAgo } from '@/lib/constants'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  DollarSign,
  ShoppingCart,
  Users,
  Clock,
  TrendingUp,
  TrendingDown,
  Package,
  Eye,
  List,
  UserCog,
  BarChart3,
  RefreshCw,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { toast } from 'sonner'
import { useState } from 'react'

interface AnalyticsData {
  revenue: number
  monthlySales: { month: string; total: number; count: number }[]
  userGrowth: { month: string; newUsers: number }[]
  orderCompletionRate: number
  summary: {
    totalOrders: number
    completedOrders: number
    pendingOrders: number
    underReviewOrders: number
    totalProducts: number
    totalUsers: number
    openTickets: number
  }
}

interface RecentOrder {
  id: string
  total: number
  status: string
  paymentMethod: string
  createdAt: string
  user: { id: string; username: string; email: string }
  product: { id: string; name: string }
}

export function AdminView() {
  const { isAdmin, navigate } = useAppStore()
  const [recentStatusFilter, setRecentStatusFilter] = useState<string>('all')

  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ['admin-analytics'],
    queryFn: async () => {
      const res = await fetch('/api/admin/analytics')
      if (!res.ok) throw new Error('Failed to fetch analytics')
      const json = await res.json()
      return json.data as AnalyticsData
    },
    enabled: isAdmin,
  })

  const { data: ordersData, isLoading: ordersLoading } = useQuery({
    queryKey: ['admin-orders-recent'],
    queryFn: async () => {
      const res = await fetch('/api/admin/orders?limit=5')
      if (!res.ok) throw new Error('Failed to fetch orders')
      const json = await res.json()
      return json.data as { orders: RecentOrder[]; pagination: { total: number } }
    },
    enabled: isAdmin,
  })

  if (!isAdmin) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
            <Users className="w-10 h-10 text-destructive" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
          <p className="text-muted-foreground">You do not have admin privileges to view this page.</p>
        </motion.div>
      </div>
    )
  }

  const stats = [
    {
      title: 'Total Revenue',
      value: analytics ? formatPrice(analytics.revenue) : '—',
      icon: DollarSign,
      trend: analytics ? '+12.5%' : '',
      trendUp: true,
      description: 'From delivered orders',
      color: 'text-gold',
      bgColor: 'bg-gold/10',
    },
    {
      title: 'Total Orders',
      value: analytics?.summary.totalOrders ?? '—',
      icon: ShoppingCart,
      trend: analytics ? `${analytics.summary.completedOrders} completed` : '',
      trendUp: true,
      description: 'All time orders',
      color: 'text-blue-400',
      bgColor: 'bg-blue-400/10',
    },
    {
      title: 'Active Users',
      value: analytics?.summary.totalUsers ?? '—',
      icon: Users,
      trend: analytics ? `${analytics.userGrowth.length} months data` : '',
      trendUp: true,
      description: 'Registered users',
      color: 'text-green-400',
      bgColor: 'bg-green-400/10',
    },
    {
      title: 'Pending Orders',
      value: analytics?.summary.pendingOrders ?? '—',
      icon: Clock,
      trend: analytics ? `${analytics.summary.underReviewOrders} under review` : '',
      trendUp: false,
      description: 'Awaiting action',
      color: 'text-orange-400',
      bgColor: 'bg-orange-400/10',
    },
  ]

  const handleQuickStatusUpdate = async (orderId: string, status: string) => {
    try {
      const res = await fetch('/api/admin/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, status }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to update')
      }
      toast.success('Order status updated')
    } catch (error: any) {
      toast.error(error.message || 'Failed to update order status')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold text-gold-gradient">Admin Dashboard</h1>
          <p className="text-sm text-muted-foreground">Overview of your BloxVault store</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="border-gold/30 text-gold hover:bg-gold/10"
          onClick={() => navigate('admin-analytics')}
        >
          <BarChart3 className="w-4 h-4 mr-2" />
          View Full Analytics
        </Button>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card className="border-border/50 bg-card hover:border-gold/20 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                      {stat.title}
                    </p>
                    {analyticsLoading ? (
                      <Skeleton className="h-8 w-24" />
                    ) : (
                      <p className="text-2xl font-bold">{stat.value}</p>
                    )}
                  </div>
                  <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                    <stat.icon className={`w-5 h-5 ${stat.color}`} />
                  </div>
                </div>
                <div className="flex items-center gap-1 mt-2">
                  {stat.trendUp ? (
                    <TrendingUp className="w-3 h-3 text-green-400" />
                  ) : (
                    <TrendingDown className="w-3 h-3 text-orange-400" />
                  )}
                  <span className="text-xs text-muted-foreground">{stat.trend}</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Revenue Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card className="border-border/50 bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Revenue Overview</CardTitle>
          </CardHeader>
          <CardContent>
            {analyticsLoading ? (
              <Skeleton className="h-[280px] w-full" />
            ) : analytics && analytics.monthlySales.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={analytics.monthlySales}>
                  <defs>
                    <linearGradient id="goldGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="oklch(0.795 0.155 84.429)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="oklch(0.795 0.155 84.429)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 6%)" />
                  <XAxis
                    dataKey="month"
                    stroke="oklch(0.6 0 0)"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="oklch(0.6 0 0)"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `৳${v.toLocaleString()}`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'oklch(0.14 0 0)',
                      border: '1px solid oklch(1 0 0 / 10%)',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                    labelStyle={{ color: 'oklch(0.96 0 0)' }}
                    formatter={(value: number) => [`৳${value.toLocaleString()}`, 'Revenue']}
                  />
                  <Area
                    type="monotone"
                    dataKey="total"
                    stroke="oklch(0.795 0.155 84.429)"
                    strokeWidth={2}
                    fill="url(#goldGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">
                No revenue data yet
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Recent Orders + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent Orders */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="lg:col-span-2"
        >
          <Card className="border-border/50 bg-card">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">Recent Orders</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-gold hover:text-gold/80"
                  onClick={() => navigate('admin-orders')}
                >
                  View All
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {ordersLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : ordersData && ordersData.orders.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Order</TableHead>
                        <TableHead className="text-xs">Customer</TableHead>
                        <TableHead className="text-xs">Product</TableHead>
                        <TableHead className="text-xs">Total</TableHead>
                        <TableHead className="text-xs">Status</TableHead>
                        <TableHead className="text-xs text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ordersData.orders.slice(0, 5).map((order) => (
                        <TableRow key={order.id}>
                          <TableCell className="text-xs font-mono">
                            {order.id.slice(0, 8)}...
                          </TableCell>
                          <TableCell className="text-xs">
                            {order.user.username}
                          </TableCell>
                          <TableCell className="text-xs max-w-[120px] truncate">
                            {order.product.name}
                          </TableCell>
                          <TableCell className="text-xs font-semibold text-gold">
                            {formatPrice(order.total)}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={`text-[10px] ${ORDER_STATUS_COLORS[order.status] || ''}`}
                            >
                              {ORDER_STATUS_LABELS[order.status] || order.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Select
                              onValueChange={(val) => handleQuickStatusUpdate(order.id, val)}
                            >
                              <SelectTrigger className="h-7 w-7 p-0 border-0">
                                <RefreshCw className="w-3 h-3 text-muted-foreground" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="confirmed">Confirm</SelectItem>
                                <SelectItem value="processing">Process</SelectItem>
                                <SelectItem value="delivered">Deliver</SelectItem>
                                <SelectItem value="cancelled">Cancel</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No orders yet
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card className="border-border/50 bg-card h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                className="w-full justify-start bg-gold hover:bg-gold/90 text-gold-foreground"
                onClick={() => navigate('admin-products')}
              >
                <Package className="w-4 h-4 mr-2" />
                Add Product
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start border-gold/30 hover:bg-gold/10"
                onClick={() => navigate('admin-orders')}
              >
                <List className="w-4 h-4 mr-2" />
                View All Orders
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start border-gold/30 hover:bg-gold/10"
                onClick={() => navigate('admin-users')}
              >
                <UserCog className="w-4 h-4 mr-2" />
                Manage Users
              </Button>

              <Separator className="my-2" />

              {/* Summary Stats */}
              <div className="space-y-2 pt-1">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                  Summary
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg bg-muted/50 p-2.5 text-center">
                    <p className="text-lg font-bold text-gold">
                      {analytics?.summary.totalProducts ?? '—'}
                    </p>
                    <p className="text-[10px] text-muted-foreground">Products</p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-2.5 text-center">
                    <p className="text-lg font-bold text-orange-400">
                      {analytics?.summary.openTickets ?? '—'}
                    </p>
                    <p className="text-[10px] text-muted-foreground">Open Tickets</p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-2.5 text-center">
                    <p className="text-lg font-bold text-green-400">
                      {analytics?.orderCompletionRate ?? '—'}%
                    </p>
                    <p className="text-[10px] text-muted-foreground">Completion</p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-2.5 text-center">
                    <p className="text-lg font-bold">
                      {analytics?.summary.underReviewOrders ?? '—'}
                    </p>
                    <p className="text-[10px] text-muted-foreground">In Review</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
