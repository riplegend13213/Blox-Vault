'use client'

import { useAppStore } from '@/lib/store'
import { formatPrice, ORDER_STATUS_LABELS } from '@/lib/constants'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  DollarSign,
  ShoppingCart,
  Users,
  TrendingUp,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
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

const GOLD = 'oklch(0.795 0.155 84.429)'
const GOLD_MUTED = 'oklch(0.6 0.1 84.429)'
const GOLD_DIM = 'oklch(0.5 0.08 84.429)'

const PIE_COLORS = [GOLD, '#22c55e', '#3b82f6', '#a855f7', '#f97316', '#ef4444']

export function AdminAnalyticsView() {
  const { isAdmin } = useAppStore()

  const { data: analytics, isLoading } = useQuery({
    queryKey: ['admin-analytics-detailed'],
    queryFn: async () => {
      const res = await fetch('/api/admin/analytics')
      if (!res.ok) throw new Error('Failed to fetch analytics')
      const json = await res.json()
      return json.data as AnalyticsData
    },
    enabled: isAdmin,
  })

  if (!isAdmin) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
          <p className="text-muted-foreground">You do not have admin privileges.</p>
        </div>
      </div>
    )
  }

  const summaryCards = [
    {
      title: 'Total Revenue',
      value: analytics ? formatPrice(analytics.revenue) : '—',
      icon: DollarSign,
      color: 'text-gold',
      bgColor: 'bg-gold/10',
    },
    {
      title: 'Total Orders',
      value: analytics?.summary.totalOrders ?? '—',
      icon: ShoppingCart,
      color: 'text-blue-400',
      bgColor: 'bg-blue-400/10',
    },
    {
      title: 'Active Users',
      value: analytics?.summary.totalUsers ?? '—',
      icon: Users,
      color: 'text-green-400',
      bgColor: 'bg-green-400/10',
    },
    {
      title: 'Completion Rate',
      value: analytics ? `${analytics.orderCompletionRate}%` : '—',
      icon: TrendingUp,
      color: 'text-purple-400',
      bgColor: 'bg-purple-400/10',
    },
  ]

  // Prepare order status data for pie chart
  const orderStatusData = analytics
    ? [
        { name: 'Completed', value: analytics.summary.completedOrders },
        { name: 'Pending', value: analytics.summary.pendingOrders },
        { name: 'Under Review', value: analytics.summary.underReviewOrders },
        {
          name: 'Other',
          value:
            analytics.summary.totalOrders -
            analytics.summary.completedOrders -
            analytics.summary.pendingOrders -
            analytics.summary.underReviewOrders,
        },
      ].filter((d) => d.value > 0)
    : []

  // Calculate average order value
  const avgOrderValue =
    analytics && analytics.summary.totalOrders > 0
      ? Math.round(analytics.revenue / analytics.summary.completedOrders)
      : 0

  // User growth cumulative data
  const userGrowthCumulative = (() => {
    if (!analytics?.userGrowth) return []
    let cumulative = 0
    return analytics.userGrowth.map((d) => {
      cumulative += d.newUsers
      return { ...d, cumulative }
    })
  })()

  const chartTooltipStyle = {
    backgroundColor: 'oklch(0.14 0 0)',
    border: '1px solid oklch(1 0 0 / 10%)',
    borderRadius: '8px',
    fontSize: '12px',
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
          <h1 className="text-2xl font-bold text-gold-gradient">Analytics</h1>
          <p className="text-sm text-muted-foreground">Detailed insights and performance metrics</p>
        </div>
      </motion.div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((stat, i) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card className="border-border/50 bg-card hover:border-gold/20 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                      {stat.title}
                    </p>
                    {isLoading ? (
                      <Skeleton className="h-8 w-24 mt-1" />
                    ) : (
                      <p className="text-2xl font-bold mt-1">{stat.value}</p>
                    )}
                  </div>
                  <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                    <stat.icon className={`w-5 h-5 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Revenue Analytics Section */}
      <div className="space-y-1">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-gold" />
          Revenue Analytics
        </h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Revenue Over Time - Area Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="border-border/50 bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Activity className="w-4 h-4 text-gold" />
                Revenue Over Time
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[280px] w-full" />
              ) : analytics && analytics.monthlySales.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={analytics.monthlySales}>
                    <defs>
                      <linearGradient id="revenueAreaGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={GOLD} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={GOLD} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 6%)" />
                    <XAxis
                      dataKey="month"
                      stroke="oklch(0.6 0 0)"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="oklch(0.6 0 0)"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => `৳${v.toLocaleString()}`}
                    />
                    <Tooltip
                      contentStyle={chartTooltipStyle}
                      labelStyle={{ color: 'oklch(0.96 0 0)' }}
                      formatter={(value: number) => [`৳${value.toLocaleString()}`, 'Revenue']}
                    />
                    <Area
                      type="monotone"
                      dataKey="total"
                      stroke={GOLD}
                      strokeWidth={2}
                      fill="url(#revenueAreaGradient)"
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

        {/* Monthly Breakdown - Bar Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <Card className="border-border/50 bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-gold" />
                Monthly Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[280px] w-full" />
              ) : analytics && analytics.monthlySales.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={analytics.monthlySales}>
                    <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 6%)" />
                    <XAxis
                      dataKey="month"
                      stroke="oklch(0.6 0 0)"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="oklch(0.6 0 0)"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => `৳${v.toLocaleString()}`}
                    />
                    <Tooltip
                      contentStyle={chartTooltipStyle}
                      labelStyle={{ color: 'oklch(0.96 0 0)' }}
                      formatter={(value: number, name: string) => [
                        name === 'total' ? `৳${value.toLocaleString()}` : value,
                        name === 'total' ? 'Revenue' : 'Orders',
                      ]}
                    />
                    <Bar dataKey="total" fill={GOLD} radius={[4, 4, 0, 0]} name="Revenue" />
                    <Bar dataKey="count" fill={GOLD_MUTED} radius={[4, 4, 0, 0]} name="Orders" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">
                  No monthly data yet
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Order Analytics Section */}
      <div className="space-y-1 pt-2">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <ShoppingCart className="w-5 h-5 text-gold" />
          Order Analytics
        </h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Order Completion - Pie Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="border-border/50 bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <PieChartIcon className="w-4 h-4 text-gold" />
                Order Completion
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[240px] w-full" />
              ) : orderStatusData.length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie
                      data={orderStatusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {orderStatusData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={chartTooltipStyle}
                      labelStyle={{ color: 'oklch(0.96 0 0)' }}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: '11px' }}
                      formatter={(value) => (
                        <span className="text-muted-foreground">{value}</span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[240px] flex items-center justify-center text-muted-foreground text-sm">
                  No order data yet
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Orders by Status - Bar Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="lg:col-span-2"
        >
          <Card className="border-border/50 bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-gold" />
                Orders by Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[240px] w-full" />
              ) : analytics ? (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart
                    data={[
                      {
                        name: 'Completed',
                        count: analytics.summary.completedOrders,
                        fill: '#22c55e',
                      },
                      {
                        name: 'Pending',
                        count: analytics.summary.pendingOrders,
                        fill: '#eab308',
                      },
                      {
                        name: 'Under Review',
                        count: analytics.summary.underReviewOrders,
                        fill: '#f97316',
                      },
                      {
                        name: 'Other',
                        count:
                          analytics.summary.totalOrders -
                          analytics.summary.completedOrders -
                          analytics.summary.pendingOrders -
                          analytics.summary.underReviewOrders,
                        fill: GOLD_DIM,
                      },
                    ]}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 6%)" />
                    <XAxis
                      dataKey="name"
                      stroke="oklch(0.6 0 0)"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="oklch(0.6 0 0)"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      contentStyle={chartTooltipStyle}
                      labelStyle={{ color: 'oklch(0.96 0 0)' }}
                      formatter={(value: number) => [value, 'Orders']}
                    />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {[
                        { name: 'Completed', count: analytics.summary.completedOrders, fill: '#22c55e' },
                        { name: 'Pending', count: analytics.summary.pendingOrders, fill: '#eab308' },
                        { name: 'Under Review', count: analytics.summary.underReviewOrders, fill: '#f97316' },
                        {
                          name: 'Other',
                          count:
                            analytics.summary.totalOrders -
                            analytics.summary.completedOrders -
                            analytics.summary.pendingOrders -
                            analytics.summary.underReviewOrders,
                          fill: GOLD_DIM,
                        },
                      ].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[240px] flex items-center justify-center text-muted-foreground text-sm">
                  No order data yet
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Avg Order Value Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Card className="border-border/50 bg-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                  Average Order Value
                </p>
                <p className="text-2xl font-bold text-gold mt-1">
                  {isLoading ? <Skeleton className="h-8 w-24 inline-block" /> : formatPrice(avgOrderValue)}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-gold/10">
                <DollarSign className="w-6 h-6 text-gold" />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* User Analytics Section */}
      <div className="space-y-1 pt-2">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Users className="w-5 h-5 text-gold" />
          User Analytics
        </h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* User Growth - Line Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
        >
          <Card className="border-border/50 bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-gold" />
                User Growth Over Time
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[280px] w-full" />
              ) : userGrowthCumulative.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={userGrowthCumulative}>
                    <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 6%)" />
                    <XAxis
                      dataKey="month"
                      stroke="oklch(0.6 0 0)"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="oklch(0.6 0 0)"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      contentStyle={chartTooltipStyle}
                      labelStyle={{ color: 'oklch(0.96 0 0)' }}
                      formatter={(value: number, name: string) => [
                        value,
                        name === 'cumulative' ? 'Total Users' : 'New Users',
                      ]}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: '11px' }}
                      formatter={(value) => (
                        <span className="text-muted-foreground">
                          {value === 'cumulative' ? 'Total Users' : 'New Users'}
                        </span>
                      )}
                    />
                    <Line
                      type="monotone"
                      dataKey="cumulative"
                      stroke={GOLD}
                      strokeWidth={2}
                      dot={{ fill: GOLD, r: 3 }}
                      name="cumulative"
                    />
                    <Line
                      type="monotone"
                      dataKey="newUsers"
                      stroke={GOLD_MUTED}
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={{ fill: GOLD_MUTED, r: 3 }}
                      name="newUsers"
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">
                  No user growth data yet
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* New Users Per Month - Bar Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card className="border-border/50 bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Users className="w-4 h-4 text-gold" />
                New Users Per Month
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[280px] w-full" />
              ) : analytics && analytics.userGrowth.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={analytics.userGrowth}>
                    <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 6%)" />
                    <XAxis
                      dataKey="month"
                      stroke="oklch(0.6 0 0)"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="oklch(0.6 0 0)"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      contentStyle={chartTooltipStyle}
                      labelStyle={{ color: 'oklch(0.96 0 0)' }}
                      formatter={(value: number) => [value, 'New Users']}
                    />
                    <Bar dataKey="newUsers" fill={GOLD} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">
                  No user data yet
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
