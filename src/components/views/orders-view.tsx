'use client'

import { useAppStore } from '@/lib/store'
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_COLORS,
  DELIVERY_STATUS_LABELS,
  formatPrice,
  formatDate,
  timeAgo,
} from '@/lib/constants'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Package,
  Clock,
  Eye,
  CheckCircle2,
  Circle,
  ChevronDown,
  ChevronUp,
  ShoppingBag,
  Upload,
  CreditCard,
  MessageSquare,
  Loader2,
  X,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useState } from 'react'
import { toast } from 'sonner'

interface Order {
  id: string
  userId: string
  productId: string
  paymentMethod: string
  transactionId: string | null
  proofImage: string | null
  status: string
  deliveryStatus: string
  total: number
  adminNote: string | null
  createdAt: string
  updatedAt: string
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

const ORDER_TIMELINE_STEPS = [
  { key: 'pending_payment', label: 'Pending', icon: Clock },
  { key: 'under_review', label: 'Review', icon: Eye },
  { key: 'confirmed', label: 'Confirmed', icon: CheckCircle2 },
  { key: 'processing', label: 'Processing', icon: Package },
  { key: 'delivered', label: 'Delivered', icon: CheckCircle2 },
]

function getOrderStepIndex(status: string): number {
  const idx = ORDER_TIMELINE_STEPS.findIndex((s) => s.key === status)
  return idx >= 0 ? idx : -1
}

function OrderTimeline({ status }: { status: string }) {
  const currentStep = getOrderStepIndex(status)
  const isCancelled = status === 'cancelled'

  if (isCancelled) {
    return (
      <div className="flex items-center gap-2 py-2">
        <X className="w-5 h-5 text-red-500" />
        <span className="text-sm font-medium text-red-500">Order Cancelled</span>
      </div>
    )
  }

  return (
    <div className="py-3">
      <div className="flex items-center justify-between relative">
        {/* Progress bar background */}
        <div className="absolute top-4 left-0 right-0 h-0.5 bg-border/50 mx-8" />
        {/* Progress bar filled */}
        {currentStep > 0 && (
          <div
            className="absolute top-4 left-0 h-0.5 bg-gold mx-8 transition-all duration-500"
            style={{ width: `calc(${(currentStep / (ORDER_TIMELINE_STEPS.length - 1)) * 100}% - 4rem)` }}
          />
        )}

        {ORDER_TIMELINE_STEPS.map((step, index) => {
          const isCompleted = index <= currentStep
          const isCurrent = index === currentStep
          const Icon = step.icon

          return (
            <div key={step.key} className="flex flex-col items-center gap-1.5 relative z-10">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                  isCompleted
                    ? 'bg-gold text-gold-foreground'
                    : 'bg-accent/50 text-muted-foreground'
                } ${isCurrent ? 'ring-2 ring-gold/30 ring-offset-2 ring-offset-background' : ''}`}
              >
                <Icon className="w-4 h-4" />
              </div>
              <span
                className={`text-[10px] font-medium ${
                  isCompleted ? 'text-gold' : 'text-muted-foreground'
                }`}
              >
                {step.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function OrderRow({ order }: { order: Order }) {
  const [expanded, setExpanded] = useState(false)
  const [proofUrl, setProofUrl] = useState('')
  const [proofDialogOpen, setProofDialogOpen] = useState(false)
  const queryClient = useQueryClient()

  const uploadProofMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/orders/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proofImage: proofUrl }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      return data
    },
    onSuccess: () => {
      toast.success('Payment proof uploaded successfully')
      queryClient.invalidateQueries({ queryKey: ['user-orders'] })
      setProofDialogOpen(false)
      setProofUrl('')
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to upload proof')
    },
  })

  const paymentMethodLabel: Record<string, string> = {
    bkash: 'bKash',
    nagad: 'Nagad',
    rocket: 'Rocket',
    usdt: 'USDT',
    btc: 'BTC',
    eth: 'ETH',
    bnb: 'BNB',
    ltc: 'LTC',
  }

  return (
    <motion.div layout className="border border-border/50 rounded-xl overflow-hidden bg-card">
      {/* Order Header Row */}
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-accent/20 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-4 min-w-0">
          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-accent/50 flex items-center justify-center">
            <Package className="w-5 h-5 text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <p className="font-medium text-sm truncate">{order.product.name}</p>
            <p className="text-xs text-muted-foreground">
              #{order.id.slice(-8)} &middot; {formatDate(order.createdAt)}
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
          <span className="text-sm font-semibold text-gold">{formatPrice(order.total)}</span>
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
      </div>

      {/* Expanded Details */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-5">
              <Separator />

              {/* Status Timeline */}
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Order Status
                </h4>
                <OrderTimeline status={order.status} />
              </div>

              {/* Order Info Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Product</p>
                    <p className="text-sm font-medium">{order.product.name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Payment Method</p>
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-muted-foreground" />
                      <p className="text-sm font-medium">
                        {paymentMethodLabel[order.paymentMethod] || order.paymentMethod}
                      </p>
                    </div>
                  </div>
                  {order.transactionId && (
                    <div>
                      <p className="text-xs text-muted-foreground">Transaction ID</p>
                      <p className="text-sm font-mono">{order.transactionId}</p>
                    </div>
                  )}
                </div>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Total</p>
                    <p className="text-sm font-bold text-gold">{formatPrice(order.total)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Delivery Status</p>
                    <Badge variant="outline" className="text-xs mt-0.5">
                      {DELIVERY_STATUS_LABELS[order.deliveryStatus] || order.deliveryStatus}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Order Date</p>
                    <p className="text-sm">{formatDate(order.createdAt)}</p>
                  </div>
                </div>
              </div>

              {/* Payment Proof */}
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Payment Proof
                </h4>
                {order.proofImage ? (
                  <div className="relative">
                    <img
                      src={order.proofImage}
                      alt="Payment proof"
                      className="w-full max-w-xs rounded-lg border border-border/50 object-cover max-h-48"
                    />
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <p className="text-sm text-muted-foreground">No proof uploaded yet.</p>
                    <Dialog open={proofDialogOpen} onOpenChange={setProofDialogOpen}>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline" className="text-gold border-gold/30 hover:bg-gold/10">
                          <Upload className="w-3.5 h-3.5 mr-1.5" />
                          Upload Proof
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Upload Payment Proof</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 pt-2">
                          <div>
                            <p className="text-sm text-muted-foreground mb-2">
                              Paste the URL of your payment screenshot or receipt.
                            </p>
                            <Input
                              placeholder="https://example.com/proof.jpg"
                              value={proofUrl}
                              onChange={(e) => setProofUrl(e.target.value)}
                            />
                          </div>
                          <Button
                            className="w-full bg-gold hover:bg-gold/90 text-gold-foreground"
                            disabled={!proofUrl.trim() || uploadProofMutation.isPending}
                            onClick={() => uploadProofMutation.mutate()}
                          >
                            {uploadProofMutation.isPending ? (
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                              <Upload className="w-4 h-4 mr-2" />
                            )}
                            Submit Proof
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                )}
                {order.proofImage && order.status === 'pending_payment' && (
                  <Dialog open={proofDialogOpen} onOpenChange={setProofDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline" className="mt-2 text-gold border-gold/30 hover:bg-gold/10">
                        <Upload className="w-3.5 h-3.5 mr-1.5" />
                        Re-upload Proof
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Re-upload Payment Proof</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 pt-2">
                        <Input
                          placeholder="https://example.com/proof.jpg"
                          value={proofUrl}
                          onChange={(e) => setProofUrl(e.target.value)}
                        />
                        <Button
                          className="w-full bg-gold hover:bg-gold/90 text-gold-foreground"
                          disabled={!proofUrl.trim() || uploadProofMutation.isPending}
                          onClick={() => uploadProofMutation.mutate()}
                        >
                          {uploadProofMutation.isPending ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <Upload className="w-4 h-4 mr-2" />
                          )}
                          Submit Proof
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </div>

              {/* Admin Note */}
              {order.adminNote && (
                <div className="bg-accent/30 rounded-lg p-3 border border-border/30">
                  <div className="flex items-center gap-2 mb-1">
                    <MessageSquare className="w-4 h-4 text-gold" />
                    <span className="text-xs font-semibold text-gold">Admin Note</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{order.adminNote}</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export function OrdersView() {
  const { user, isAuthenticated, navigate } = useAppStore()

  const { data, isLoading } = useQuery<OrdersResponse>({
    queryKey: ['user-orders'],
    queryFn: () => fetch('/api/orders').then((r) => r.json()),
    enabled: isAuthenticated,
  })

  if (!isAuthenticated || !user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Package className="w-16 h-16 text-muted-foreground/40" />
        <h2 className="text-xl font-semibold">Please sign in</h2>
        <p className="text-muted-foreground text-sm">You need to be logged in to view your orders.</p>
        <Button onClick={() => navigate('login')} className="bg-gold hover:bg-gold/90 text-gold-foreground">
          Sign In
        </Button>
      </div>
    )
  }

  const orders = data?.data?.orders || []

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">My Orders</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {orders.length > 0 ? `${orders.length} order${orders.length !== 1 ? 's' : ''} found` : 'Your order history'}
          </p>
        </div>
        <Button onClick={() => navigate('shop')} className="bg-gold hover:bg-gold/90 text-gold-foreground">
          <ShoppingBag className="w-4 h-4 mr-2" />
          Shop
        </Button>
      </div>

      {/* Orders List */}
      {isLoading ? (
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <Card className="border-border/50 bg-card">
          <CardContent className="p-12 text-center">
            <Package className="w-16 h-16 text-muted-foreground/20 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">You haven&apos;t placed any orders yet</h3>
            <p className="text-muted-foreground text-sm mb-6">
              Browse our collection and find the perfect item for you.
            </p>
            <Button onClick={() => navigate('shop')} className="bg-gold hover:bg-gold/90 text-gold-foreground">
              <ShoppingBag className="w-4 h-4 mr-2" />
              Browse Shop
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {orders.map((order, i) => (
            <motion.div
              key={order.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.04 }}
            >
              <OrderRow order={order} />
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  )
}
