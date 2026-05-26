'use client'

import { useAppStore } from '@/lib/store'
import { timeAgo, formatDate } from '@/lib/constants'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bell,
  Package,
  CreditCard,
  HelpCircle,
  Info,
  CheckCheck,
  Check,
  Loader2,
  Filter,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useState } from 'react'
import { toast } from 'sonner'

interface Notification {
  id: string
  title: string
  body: string
  read: boolean
  type: string
  createdAt: string
}

interface NotificationsResponse {
  success: boolean
  data: { notifications: Notification[]; unreadCount: number }
}

const TYPE_ICONS: Record<string, typeof Bell> = {
  order: Package,
  payment: CreditCard,
  support: HelpCircle,
  info: Info,
  system: Info,
}

const TYPE_COLORS: Record<string, string> = {
  order: 'text-gold bg-gold/10',
  payment: 'text-emerald-400 bg-emerald-500/10',
  support: 'text-purple-400 bg-purple-500/10',
  info: 'text-blue-400 bg-blue-500/10',
  system: 'text-zinc-400 bg-zinc-500/10',
}

type FilterType = 'all' | 'unread' | 'order' | 'payment' | 'support'

const FILTERS: { key: FilterType; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
  { key: 'order', label: 'Orders' },
  { key: 'payment', label: 'Payments' },
  { key: 'support', label: 'Support' },
]

export function NotificationsView() {
  const { user, isAuthenticated, navigate } = useAppStore()
  const queryClient = useQueryClient()
  const [activeFilter, setActiveFilter] = useState<FilterType>('all')

  const { data, isLoading } = useQuery<NotificationsResponse>({
    queryKey: ['user-notifications'],
    queryFn: () => fetch('/api/notifications').then((r) => r.json()),
    enabled: isAuthenticated,
  })

  const markReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const res = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationIds: [notificationId] }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-notifications'] })
    },
  })

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAll: true }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      return data
    },
    onSuccess: () => {
      toast.success('All notifications marked as read')
      queryClient.invalidateQueries({ queryKey: ['user-notifications'] })
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to mark all as read')
    },
  })

  if (!isAuthenticated || !user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Bell className="w-16 h-16 text-muted-foreground/40" />
        <h2 className="text-xl font-semibold">Please sign in</h2>
        <p className="text-muted-foreground text-sm">You need to be logged in to view notifications.</p>
        <Button onClick={() => navigate('login')} className="bg-gold hover:bg-gold/90 text-gold-foreground">
          Sign In
        </Button>
      </div>
    )
  }

  const notifications = data?.data?.notifications || []
  const unreadCount = data?.data?.unreadCount || 0

  const filteredNotifications = notifications.filter((n) => {
    if (activeFilter === 'all') return true
    if (activeFilter === 'unread') return !n.read
    return n.type === activeFilter
  })

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">
            <Bell className="w-7 h-7 inline-block mr-2 text-blue-400 -mt-1" />
            Notifications
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {unreadCount > 0 ? `${unreadCount} unread` : 'You\'re all caught up'}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="text-gold border-gold/30 hover:bg-gold/10"
            onClick={() => markAllReadMutation.mutate()}
            disabled={markAllReadMutation.isPending}
          >
            {markAllReadMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
            ) : (
              <CheckCheck className="w-4 h-4 mr-1.5" />
            )}
            Mark All Read
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <Filter className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        {FILTERS.map((filter) => {
          const isActive = activeFilter === filter.key
          return (
            <Button
              key={filter.key}
              variant={isActive ? 'default' : 'outline'}
              size="sm"
              className={`rounded-full text-xs flex-shrink-0 ${
                isActive
                  ? 'bg-gold hover:bg-gold/90 text-gold-foreground'
                  : 'border-border/50'
              }`}
              onClick={() => setActiveFilter(filter.key)}
            >
              {filter.label}
              {filter.key === 'unread' && unreadCount > 0 && (
                <Badge className="ml-1.5 bg-gold/20 text-gold text-[10px] px-1.5 py-0">
                  {unreadCount}
                </Badge>
              )}
            </Button>
          )
        })}
      </div>

      {/* Notifications List */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : filteredNotifications.length === 0 ? (
        <Card className="border-border/50 bg-card">
          <CardContent className="p-12 text-center">
            <Bell className="w-16 h-16 text-muted-foreground/20 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No notifications</h3>
            <p className="text-muted-foreground text-sm">
              {activeFilter !== 'all'
                ? 'No notifications match this filter.'
                : "You don't have any notifications yet."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <ScrollArea className="max-h-[70vh]">
          <div className="space-y-2">
            <AnimatePresence mode="popLayout">
              {filteredNotifications.map((notification, i) => {
                const Icon = TYPE_ICONS[notification.type] || Info
                const colorClass = TYPE_COLORS[notification.type] || TYPE_COLORS.info

                return (
                  <motion.div
                    key={notification.id}
                    layout
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 12 }}
                    transition={{ duration: 0.25, delay: i * 0.03 }}
                  >
                    <Card
                      className={`border-border/50 transition-all duration-200 ${
                        notification.read
                          ? 'bg-card opacity-70'
                          : 'bg-card hover:bg-accent/20 border-l-2 border-l-gold'
                      }`}
                    >
                      <CardContent className="p-4 flex items-start gap-4">
                        {/* Icon */}
                        <div
                          className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${colorClass}`}
                        >
                          <Icon className="w-5 h-5" />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <h4 className="font-medium text-sm truncate">{notification.title}</h4>
                            {!notification.read && (
                              <span className="w-2 h-2 rounded-full bg-gold flex-shrink-0" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {notification.body}
                          </p>
                          <p className="text-[10px] text-muted-foreground/70 mt-1.5">
                            {timeAgo(notification.createdAt)}
                          </p>
                        </div>

                        {/* Actions */}
                        {!notification.read && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="flex-shrink-0 w-8 h-8 text-muted-foreground hover:text-gold"
                            onClick={() => markReadMutation.mutate(notification.id)}
                            disabled={markReadMutation.isPending}
                            title="Mark as read"
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        </ScrollArea>
      )}
    </motion.div>
  )
}
