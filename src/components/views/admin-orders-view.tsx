'use client'

import { useAppStore } from '@/lib/store'
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_COLORS,
  DELIVERY_STATUS_LABELS,
  formatPrice,
  formatDate,
  timeAgo,
  CATEGORY_LABELS,
} from '@/lib/constants'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  Filter,
  Eye,
  CheckCircle2,
  Truck,
  XCircle,
  Clock,
  MessageSquare,
  Image as ImageIcon,
  Send,
  Loader2,
  ShoppingBag,
  FileText,
  ChevronRight,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { useState } from 'react'

interface OrderUser {
  id: string
  username: string
  email: string
  avatar: string | null
}

interface OrderProduct {
  id: string
  name: string
  slug: string
  category: string
  images: string
  priceBdt: number
}

interface Order {
  id: string
  userId: string
  productId: string
  total: number
  status: string
  paymentMethod: string
  paymentProof: string | null
  transactionId: string | null
  deliveryStatus: string
  adminNote: string | null
  createdAt: string
  updatedAt: string
  user: OrderUser
  product: OrderProduct
}

const ORDER_STATUSES = [
  'pending_payment',
  'under_review',
  'confirmed',
  'processing',
  'delivered',
  'cancelled',
] as const

const DELIVERY_STATUSES = ['pending', 'preparing', 'in_transit', 'delivered'] as const

export function AdminOrdersView() {
  const { isAdmin } = useAppStore()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [adminNote, setAdminNote] = useState('')
  const [updating, setUpdating] = useState(false)

  const { data: ordersData, isLoading } = useQuery({
    queryKey: ['admin-orders', search, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams()
      params.set('limit', '50')
      if (search) params.set('search', search)
      if (statusFilter !== 'all') params.set('status', statusFilter)
      const res = await fetch(`/api/admin/orders?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to fetch orders')
      const json = await res.json()
      return json.data as { orders: Order[]; pagination: { total: number; page: number; totalPages: number } }
    },
    enabled: isAdmin,
  })

  const updateOrder = async (data: {
    orderId: string
    status?: string
    deliveryStatus?: string
    adminNote?: string
  }) => {
    setUpdating(true)
    try {
      const res = await fetch('/api/admin/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to update order')
      }
      toast.success('Order updated successfully')
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] })
      if (selectedOrder?.id === data.orderId) {
        setSelectedOrder((prev) =>
          prev
            ? {
                ...prev,
                status: data.status || prev.status,
                deliveryStatus: data.deliveryStatus || prev.deliveryStatus,
                adminNote: data.adminNote ?? prev.adminNote,
              }
            : prev
        )
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to update order')
    } finally {
      setUpdating(false)
    }
  }

  const notifyCustomer = async (order: Order) => {
    // The PATCH already creates a notification on status change
    // This is an explicit "notify" button - we can just confirm the order
    try {
      await updateOrder({ orderId: order.id, status: 'confirmed' })
    } catch {
      toast.error('Failed to notify customer')
    }
  }

  const openDetail = (order: Order) => {
    setSelectedOrder(order)
    setAdminNote(order.adminNote || '')
    setDetailOpen(true)
  }

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

  const orders = ordersData?.orders ?? []

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold text-gold-gradient">Order Management</h1>
          <p className="text-sm text-muted-foreground">
            {ordersData?.pagination.total ?? 0} orders total
          </p>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex flex-col sm:flex-row gap-3"
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by order ID or customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-card border-border/50"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[200px] bg-card border-border/50">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {ORDER_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {ORDER_STATUS_LABELS[status]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </motion.div>

      {/* Quick Status Actions Bar */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="flex flex-wrap gap-2"
      >
        {(['confirmed', 'processing', 'delivered'] as const).map((status) => {
          const icons = {
            confirmed: CheckCircle2,
            processing: Clock,
            delivered: Truck,
          }
          const Icon = icons[status]
          return (
            <div key={status} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Icon className="w-3 h-3" />
              <span>{ORDER_STATUS_LABELS[status]}</span>
            </div>
          )
        })}
        <Separator orientation="vertical" className="h-4 mx-1" />
        <span className="text-xs text-muted-foreground">Click order to manage</span>
      </motion.div>

      {/* Orders Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="border-border/50 bg-card">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : orders.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Order ID</TableHead>
                      <TableHead className="text-xs">Customer</TableHead>
                      <TableHead className="text-xs">Product</TableHead>
                      <TableHead className="text-xs">Payment</TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                      <TableHead className="text-xs">Total</TableHead>
                      <TableHead className="text-xs">Date</TableHead>
                      <TableHead className="text-xs text-right">View</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((order) => (
                      <TableRow
                        key={order.id}
                        className="cursor-pointer hover:bg-gold/5"
                        onClick={() => openDetail(order)}
                      >
                        <TableCell className="text-xs font-mono">
                          {order.id.slice(0, 8)}...
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="text-sm font-medium">{order.user.username}</p>
                            <p className="text-[10px] text-muted-foreground">{order.user.email}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs max-w-[150px] truncate">
                          {order.product.name}
                        </TableCell>
                        <TableCell className="text-xs">
                          <div className="flex items-center gap-1.5">
                            {order.paymentProof && (
                              <ImageIcon className="w-3 h-3 text-gold" />
                            )}
                            <span className="capitalize">{order.paymentMethod}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`text-[10px] ${ORDER_STATUS_COLORS[order.status] || ''}`}
                          >
                            {ORDER_STATUS_LABELS[order.status] || order.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm font-semibold text-gold">
                          {formatPrice(order.total)}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {timeAgo(order.createdAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                            <ChevronRight className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <ShoppingBag className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No orders found</p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Order Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] bg-card border-border/50">
          <DialogHeader>
            <DialogTitle className="text-gold-gradient flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Order Details
            </DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <ScrollArea className="max-h-[70vh] pr-4">
              <div className="space-y-5 py-2">
                {/* Order Info Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Order ID</p>
                    <p className="text-sm font-mono">{selectedOrder.id}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Created</p>
                    <p className="text-sm">{formatDate(selectedOrder.createdAt)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Customer</p>
                    <p className="text-sm font-medium">{selectedOrder.user.username}</p>
                    <p className="text-[10px] text-muted-foreground">{selectedOrder.user.email}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Product</p>
                    <p className="text-sm font-medium">{selectedOrder.product.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {CATEGORY_LABELS[selectedOrder.product.category] || selectedOrder.product.category}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Payment Method</p>
                    <p className="text-sm capitalize">{selectedOrder.paymentMethod}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Transaction ID</p>
                    <p className="text-sm font-mono">
                      {selectedOrder.transactionId || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Total</p>
                    <p className="text-lg font-bold text-gold">
                      {formatPrice(selectedOrder.total)}
                    </p>
                  </div>
                </div>

                <Separator />

                {/* Status Updates */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Order Status</Label>
                    <Select
                      value={selectedOrder.status}
                      onValueChange={(val) =>
                        updateOrder({ orderId: selectedOrder.id, status: val })
                      }
                    >
                      <SelectTrigger className="bg-background border-border/50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ORDER_STATUSES.map((status) => (
                          <SelectItem key={status} value={status}>
                            {ORDER_STATUS_LABELS[status]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Delivery Status</Label>
                    <Select
                      value={selectedOrder.deliveryStatus}
                      onValueChange={(val) =>
                        updateOrder({ orderId: selectedOrder.id, deliveryStatus: val })
                      }
                    >
                      <SelectTrigger className="bg-background border-border/50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DELIVERY_STATUSES.map((status) => (
                          <SelectItem key={status} value={status}>
                            {DELIVERY_STATUS_LABELS[status]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Quick Action Buttons */}
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-green-500/30 text-green-400 hover:bg-green-500/10"
                    onClick={() => updateOrder({ orderId: selectedOrder.id, status: 'confirmed' })}
                    disabled={updating}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                    Confirm
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
                    onClick={() => updateOrder({ orderId: selectedOrder.id, status: 'processing' })}
                    disabled={updating}
                  >
                    <Clock className="w-3.5 h-3.5 mr-1.5" />
                    Process
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-gold/30 text-gold hover:bg-gold/10"
                    onClick={() => updateOrder({ orderId: selectedOrder.id, status: 'delivered', deliveryStatus: 'delivered' })}
                    disabled={updating}
                  >
                    <Truck className="w-3.5 h-3.5 mr-1.5" />
                    Mark Delivered
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                    onClick={() => updateOrder({ orderId: selectedOrder.id, status: 'cancelled' })}
                    disabled={updating}
                  >
                    <XCircle className="w-3.5 h-3.5 mr-1.5" />
                    Cancel
                  </Button>
                </div>

                {/* Payment Proof */}
                {selectedOrder.paymentProof && (
                  <div className="space-y-2">
                    <Label className="text-xs font-medium flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5" />
                      Payment Proof
                    </Label>
                    <div className="rounded-lg border border-border/50 p-3 bg-muted/30">
                      <p className="text-xs text-muted-foreground break-all">
                        {selectedOrder.paymentProof}
                      </p>
                    </div>
                  </div>
                )}

                {/* Admin Note */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Admin Note</Label>
                  <Textarea
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                    placeholder="Add an internal note..."
                    rows={3}
                    className="bg-background border-border/50 resize-none"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-gold/30 text-gold"
                    onClick={() =>
                      updateOrder({ orderId: selectedOrder.id, adminNote })
                    }
                    disabled={updating}
                  >
                    {updating && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
                    Save Note
                  </Button>
                </div>

                {/* Notify Customer */}
                <div className="flex items-center gap-3 pt-1">
                  <Button
                    size="sm"
                    className="bg-gold hover:bg-gold/90 text-gold-foreground"
                    onClick={() => notifyCustomer(selectedOrder)}
                    disabled={updating}
                  >
                    <Send className="w-3.5 h-3.5 mr-1.5" />
                    Notify Customer
                  </Button>
                  <span className="text-[10px] text-muted-foreground">
                    Sends status update notification
                  </span>
                </div>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
