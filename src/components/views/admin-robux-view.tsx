'use client'

import { useState, useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAppStore } from '@/lib/store'
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_COLORS,
  formatPrice,
  formatCryptoPrice,
  formatDate,
  timeAgo,
} from '@/lib/constants'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import {
  Coins,
  Search,
  Plus,
  Edit3,
  Trash2,
  Star,
  StarOff,
  Package,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  Filter,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface RobuxPackage {
  id: string
  name: string
  amount: number
  priceBdt: number
  priceCrypto: number | null
  bonus: number
  popular: boolean
  active: boolean
  sortOrder: number
  createdAt: string
}

interface RobuxOrderUser {
  id: string
  username: string
  email: string
}

interface RobuxOrder {
  id: string
  userId: string
  packageId: string
  robuxAmount: number
  paymentMethod: string
  transactionId: string | null
  proofImage: string | null
  robloxUsername: string
  status: string
  total: number
  adminNote: string | null
  createdAt: string
  updatedAt: string
  user: RobuxOrderUser
  package: RobuxPackage
}

interface PackageFormData {
  name: string
  amount: number
  priceBdt: number
  priceCrypto: number | null
  bonus: number
  popular: boolean
  active: boolean
  sortOrder: number
}

const emptyPackageForm: PackageFormData = {
  name: '',
  amount: 0,
  priceBdt: 0,
  priceCrypto: null,
  bonus: 0,
  popular: false,
  active: true,
  sortOrder: 0,
}

const ROBUX_ORDER_STATUSES = [
  'pending_payment',
  'under_review',
  'processing',
  'delivered',
  'cancelled',
] as const

const ROBUX_ORDER_STATUS_LABELS: Record<string, string> = {
  pending_payment: 'Pending Payment',
  under_review: 'Under Review',
  processing: 'Processing',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
}

const ROBUX_ORDER_STATUS_COLORS: Record<string, string> = {
  pending_payment: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  under_review: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  processing: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  delivered: 'bg-green-500/10 text-green-500 border-green-500/20',
  cancelled: 'bg-red-500/10 text-red-500 border-red-500/20',
}

export function AdminRobuxView() {
  const { isAdmin } = useAppStore()
  const queryClient = useQueryClient()

  // Orders state
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedOrder, setSelectedOrder] = useState<RobuxOrder | null>(null)
  const [orderDetailOpen, setOrderDetailOpen] = useState(false)
  const [adminNote, setAdminNote] = useState('')

  // Packages state
  const [packageModalOpen, setPackageModalOpen] = useState(false)
  const [editingPackage, setEditingPackage] = useState<RobuxPackage | null>(null)
  const [packageForm, setPackageForm] = useState<PackageFormData>(emptyPackageForm)
  const [savingPackage, setSavingPackage] = useState(false)

  // Active tab
  const [activeTab, setActiveTab] = useState('orders')

  // Fetch robux orders
  const {
    data: ordersData,
    isLoading: ordersLoading,
  } = useQuery({
    queryKey: ['admin-robux-orders', search, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams()
      params.set('limit', '50')
      if (search) params.set('search', search)
      if (statusFilter !== 'all') params.set('status', statusFilter)
      const res = await fetch(`/api/admin/robux?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to fetch robux orders')
      const json = await res.json()
      return json.data as { orders: RobuxOrder[]; pagination: { total: number } }
    },
    enabled: isAdmin,
  })

  // Fetch robux packages
  const {
    data: packagesData,
    isLoading: packagesLoading,
  } = useQuery({
    queryKey: ['admin-robux-packages'],
    queryFn: async () => {
      const res = await fetch('/api/robux')
      if (!res.ok) throw new Error('Failed to fetch packages')
      const json = await res.json()
      return json.data as { packages: RobuxPackage[] }
    },
    enabled: isAdmin,
  })

  const orders = ordersData?.orders ?? []
  const packages = packagesData?.packages ?? []

  // Update order status
  const updateOrderStatus = async (orderId: string, status: string) => {
    try {
      const res = await fetch('/api/admin/robux', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, status }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to update order')
      }
      toast.success('Order status updated')
      queryClient.invalidateQueries({ queryKey: ['admin-robux-orders'] })
      if (selectedOrder?.id === orderId) {
        setSelectedOrder((prev) => (prev ? { ...prev, status } : prev))
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to update order')
    }
  }

  // Update admin note
  const updateAdminNote = async () => {
    if (!selectedOrder) return
    try {
      const res = await fetch('/api/admin/robux', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: selectedOrder.id, adminNote }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to update note')
      }
      toast.success('Admin note saved')
      queryClient.invalidateQueries({ queryKey: ['admin-robux-orders'] })
    } catch (error: any) {
      toast.error(error.message || 'Failed to save note')
    }
  }

  const openOrderDetail = (order: RobuxOrder) => {
    setSelectedOrder(order)
    setAdminNote(order.adminNote || '')
    setOrderDetailOpen(true)
  }

  // Package CRUD
  const openAddPackage = () => {
    setEditingPackage(null)
    setPackageForm(emptyPackageForm)
    setPackageModalOpen(true)
  }

  const openEditPackage = (pkg: RobuxPackage) => {
    setEditingPackage(pkg)
    setPackageForm({
      name: pkg.name,
      amount: pkg.amount,
      priceBdt: pkg.priceBdt,
      priceCrypto: pkg.priceCrypto,
      bonus: pkg.bonus,
      popular: pkg.popular,
      active: pkg.active,
      sortOrder: pkg.sortOrder,
    })
    setPackageModalOpen(true)
  }

  const handleSavePackage = async () => {
    if (!packageForm.name.trim() || packageForm.amount <= 0 || packageForm.priceBdt <= 0) {
      toast.error('Please fill in all required fields')
      return
    }

    setSavingPackage(true)
    try {
      const payload: Record<string, unknown> = {
        ...packageForm,
        priceCrypto: packageForm.priceCrypto || null,
      }

      if (editingPackage) {
        payload.id = editingPackage.id
        const res = await fetch('/api/admin/robux', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error || 'Failed to update package')
        }
        toast.success('Package updated successfully')
      } else {
        const res = await fetch('/api/admin/robux', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error || 'Failed to create package')
        }
        toast.success('Package created successfully')
      }

      queryClient.invalidateQueries({ queryKey: ['admin-robux-packages'] })
      setPackageModalOpen(false)
    } catch (error: any) {
      toast.error(error.message || 'Failed to save package')
    } finally {
      setSavingPackage(false)
    }
  }

  const handleDeletePackage = async (pkgId: string) => {
    try {
      const res = await fetch('/api/admin/robux', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: pkgId }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to delete package')
      }
      toast.success('Package deleted')
      queryClient.invalidateQueries({ queryKey: ['admin-robux-packages'] })
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete package')
    }
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold text-gold-gradient flex items-center gap-2">
            <Coins className="w-6 h-6 text-gold" />
            Robux Management
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage Robux packages and orders
          </p>
        </div>
      </motion.div>

      {/* Tabs: Orders vs Packages */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-accent/50">
          <TabsTrigger value="orders" className="gap-1.5">
            <Package className="w-4 h-4" />
            Orders
            {orders.length > 0 && (
              <Badge variant="outline" className="ml-1 text-[10px] px-1.5 py-0">
                {orders.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="packages" className="gap-1.5">
            <Coins className="w-4 h-4" />
            Packages
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-1.5">
            <Star className="w-4 h-4" />
            Payment Settings
          </TabsTrigger>
        </TabsList>

        {/* ===== ORDERS TAB ===== */}
        <TabsContent value="orders" className="mt-4 space-y-4">
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
                placeholder="Search by order ID, customer, or Roblox username..."
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
                {ROBUX_ORDER_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {ROBUX_ORDER_STATUS_LABELS[status]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </motion.div>

          {/* Orders Table */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="border-border/50 bg-card">
              <CardContent className="p-0">
                {ordersLoading ? (
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
                          <TableHead className="text-xs">Package</TableHead>
                          <TableHead className="text-xs">Robux</TableHead>
                          <TableHead className="text-xs">Roblox User</TableHead>
                          <TableHead className="text-xs">Payment</TableHead>
                          <TableHead className="text-xs">Status</TableHead>
                          <TableHead className="text-xs">Total</TableHead>
                          <TableHead className="text-xs">Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {orders.map((order) => (
                          <TableRow
                            key={order.id}
                            className="cursor-pointer hover:bg-gold/5"
                            onClick={() => openOrderDetail(order)}
                          >
                            <TableCell className="text-xs font-mono">
                              {order.id.slice(0, 8)}...
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1.5">
                                <User className="w-3.5 h-3.5 text-muted-foreground" />
                                <span className="text-sm font-medium">
                                  {order.user.username}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-xs max-w-[120px] truncate">
                              {order.package?.name || 'N/A'}
                            </TableCell>
                            <TableCell className="text-sm font-semibold text-gold">
                              {order.robuxAmount.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-xs font-mono">
                              {order.robloxUsername}
                            </TableCell>
                            <TableCell className="text-xs capitalize">
                              {order.paymentMethod}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={`text-[10px] ${ROBUX_ORDER_STATUS_COLORS[order.status] || ''}`}
                              >
                                {ROBUX_ORDER_STATUS_LABELS[order.status] || order.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm font-semibold text-gold">
                              {formatPrice(order.total)}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {timeAgo(order.createdAt)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Coins className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">No Robux orders found</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* ===== PACKAGES TAB ===== */}
        <TabsContent value="packages" className="mt-4 space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between"
          >
            <p className="text-sm text-muted-foreground">
              {packages.length} packages total
            </p>
            <Button
              className="bg-gold hover:bg-gold/90 text-gold-foreground"
              onClick={openAddPackage}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Package
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="border-border/50 bg-card">
              <CardContent className="p-0">
                {packagesLoading ? (
                  <div className="p-6 space-y-3">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <Skeleton key={i} className="h-14 w-full" />
                    ))}
                  </div>
                ) : packages.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Name</TableHead>
                          <TableHead className="text-xs">Amount</TableHead>
                          <TableHead className="text-xs">Bonus</TableHead>
                          <TableHead className="text-xs">Price BDT</TableHead>
                          <TableHead className="text-xs">Price Crypto</TableHead>
                          <TableHead className="text-xs">Sort</TableHead>
                          <TableHead className="text-xs">Popular</TableHead>
                          <TableHead className="text-xs">Status</TableHead>
                          <TableHead className="text-xs text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {packages
                          .sort((a, b) => a.sortOrder - b.sortOrder)
                          .map((pkg) => (
                            <TableRow key={pkg.id}>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 rounded bg-gold/10 flex items-center justify-center">
                                    <Coins className="w-4 h-4 text-gold" />
                                  </div>
                                  <span className="text-sm font-medium">{pkg.name}</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-sm font-semibold">
                                {pkg.amount.toLocaleString()}
                              </TableCell>
                              <TableCell>
                                {pkg.bonus > 0 ? (
                                  <Badge className="bg-gold/10 text-gold border-gold/20 text-xs">
                                    +{pkg.bonus}
                                  </Badge>
                                ) : (
                                  <span className="text-xs text-muted-foreground">—</span>
                                )}
                              </TableCell>
                              <TableCell className="text-sm font-semibold text-gold">
                                {formatPrice(pkg.priceBdt)}
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground">
                                {pkg.priceCrypto ? formatCryptoPrice(pkg.priceCrypto) : '—'}
                              </TableCell>
                              <TableCell className="text-sm">{pkg.sortOrder}</TableCell>
                              <TableCell>
                                {pkg.popular ? (
                                  <Star className="w-4 h-4 fill-gold text-gold" />
                                ) : (
                                  <StarOff className="w-4 h-4 text-muted-foreground" />
                                )}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant="outline"
                                  className={
                                    pkg.active
                                      ? 'bg-green-500/10 text-green-400 border-green-500/20'
                                      : 'bg-red-500/10 text-red-400 border-red-500/20'
                                  }
                                >
                                  {pkg.active ? 'Active' : 'Inactive'}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 p-0"
                                    onClick={() => openEditPackage(pkg)}
                                  >
                                    <Edit3 className="w-3.5 h-3.5 text-muted-foreground" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 p-0 hover:text-red-400"
                                    onClick={() => handleDeletePackage(pkg.id)}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Coins className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">No packages yet</p>
                    <Button
                      variant="outline"
                      className="mt-3 border-gold/30 text-gold"
                      onClick={openAddPackage}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Your First Package
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* ===== SETTINGS TAB ===== */}
        <TabsContent value="settings" className="mt-4 space-y-4">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="border-border/50 bg-card">
              <CardHeader>
                <CardTitle>Payment Addresses & Numbers</CardTitle>
              </CardHeader>
              <CardContent>
                <PaymentSettingsForm />
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>
      </Tabs>

      {/* Order Detail Dialog */}
      <Dialog open={orderDetailOpen} onOpenChange={setOrderDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] bg-card border-border/50">
          <DialogHeader>
            <DialogTitle className="text-gold-gradient flex items-center gap-2">
              <Coins className="w-5 h-5 text-gold" />
              Robux Order Details
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
                    <p className="text-xs text-muted-foreground mb-0.5">Roblox Username</p>
                    <p className="text-sm font-medium text-gold">{selectedOrder.robloxUsername}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Package</p>
                    <p className="text-sm font-medium">{selectedOrder.package?.name || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Robux Amount</p>
                    <p className="text-lg font-bold text-gold">
                      {selectedOrder.robuxAmount.toLocaleString()} R$
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

                {/* Status Update */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Order Status</Label>
                  <Select
                    value={selectedOrder.status}
                    onValueChange={(val) => updateOrderStatus(selectedOrder.id, val)}
                  >
                    <SelectTrigger className="bg-background border-border/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROBUX_ORDER_STATUSES.map((status) => (
                        <SelectItem key={status} value={status}>
                          {ROBUX_ORDER_STATUS_LABELS[status]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Quick Action Buttons */}
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-green-500/30 text-green-400 hover:bg-green-500/10"
                    onClick={() => updateOrderStatus(selectedOrder.id, 'processing')}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                    Process
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-gold/30 text-gold hover:bg-gold/10"
                    onClick={() => updateOrderStatus(selectedOrder.id, 'delivered')}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                    Mark Delivered
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                    onClick={() => updateOrderStatus(selectedOrder.id, 'cancelled')}
                  >
                    <XCircle className="w-3.5 h-3.5 mr-1.5" />
                    Cancel
                  </Button>
                </div>

                {/* Payment Proof */}
                {selectedOrder.proofImage && (
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Payment Proof</Label>
                    <div className="rounded-lg border border-border/50 p-3 bg-muted/30">
                      <p className="text-xs text-muted-foreground break-all">
                        {selectedOrder.proofImage}
                      </p>
                    </div>
                  </div>
                )}

                {/* Admin Note */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Admin Note</Label>
                  <Input
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                    placeholder="Add an internal note..."
                    className="bg-background border-border/50"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-gold/30 text-gold"
                    onClick={updateAdminNote}
                  >
                    Save Note
                  </Button>
                </div>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>

      {/* Add/Edit Package Dialog */}
      <Dialog open={packageModalOpen} onOpenChange={setPackageModalOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] bg-card border-border/50">
          <DialogHeader>
            <DialogTitle className="text-gold-gradient">
              {editingPackage ? 'Edit Package' : 'Add New Package'}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh] pr-4">
            <div className="space-y-4 py-2">
              {/* Name */}
              <div className="space-y-2">
                <Label className="text-xs font-medium">Package Name *</Label>
                <Input
                  value={packageForm.name}
                  onChange={(e) => setPackageForm({ ...packageForm, name: e.target.value })}
                  placeholder="e.g., 400 Robux"
                  className="bg-background border-border/50"
                />
              </div>

              {/* Amount & Bonus */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Robux Amount *</Label>
                  <Input
                    type="number"
                    value={packageForm.amount}
                    onChange={(e) =>
                      setPackageForm({ ...packageForm, amount: parseInt(e.target.value) || 0 })
                    }
                    min={1}
                    className="bg-background border-border/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Bonus Robux</Label>
                  <Input
                    type="number"
                    value={packageForm.bonus}
                    onChange={(e) =>
                      setPackageForm({ ...packageForm, bonus: parseInt(e.target.value) || 0 })
                    }
                    min={0}
                    className="bg-background border-border/50"
                  />
                </div>
              </div>

              {/* Prices */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Price BDT *</Label>
                  <Input
                    type="number"
                    value={packageForm.priceBdt}
                    onChange={(e) =>
                      setPackageForm({
                        ...packageForm,
                        priceBdt: parseFloat(e.target.value) || 0,
                      })
                    }
                    min={0}
                    className="bg-background border-border/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Price Crypto (USD)</Label>
                  <Input
                    type="number"
                    value={packageForm.priceCrypto ?? ''}
                    onChange={(e) =>
                      setPackageForm({
                        ...packageForm,
                        priceCrypto: e.target.value ? parseFloat(e.target.value) : null,
                      })
                    }
                    min={0}
                    placeholder="Optional"
                    className="bg-background border-border/50"
                  />
                </div>
              </div>

              {/* Sort Order */}
              <div className="space-y-2">
                <Label className="text-xs font-medium">Sort Order</Label>
                <Input
                  type="number"
                  value={packageForm.sortOrder}
                  onChange={(e) =>
                    setPackageForm({
                      ...packageForm,
                      sortOrder: parseInt(e.target.value) || 0,
                    })
                  }
                  min={0}
                  className="bg-background border-border/50"
                />
                <p className="text-[10px] text-muted-foreground">
                  Lower numbers appear first
                </p>
              </div>

              {/* Toggles */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex items-center gap-3">
                  <Switch
                    checked={packageForm.popular}
                    onCheckedChange={(val) => setPackageForm({ ...packageForm, popular: val })}
                  />
                  <Label className="text-sm">Popular</Label>
                </div>
                <div className="flex items-center gap-3">
                  <Switch
                    checked={packageForm.active}
                    onCheckedChange={(val) => setPackageForm({ ...packageForm, active: val })}
                  />
                  <Label className="text-sm">Active</Label>
                </div>
              </div>

              <Separator />

              {/* Actions */}
              <div className="flex items-center justify-end gap-3">
                <Button variant="outline" onClick={() => setPackageModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  className="bg-gold hover:bg-gold/90 text-gold-foreground"
                  onClick={handleSavePackage}
                  disabled={savingPackage}
                >
                  {savingPackage && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {editingPackage ? 'Update Package' : 'Create Package'}
                </Button>
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function PaymentSettingsForm() {
  const [saving, setSaving] = useState(false)
  const [values, setValues] = useState<Record<string, string>>({})
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['payment-settings'],
    queryFn: async () => {
      const res = await fetch('/api/admin/payments')
      if (!res.ok) throw new Error('Failed to load settings')
      const json = await res.json()
      return json.data as Record<string, string>
    },
  })

  const handleChange = (k: string, v: string) => setValues(prev => ({ ...prev, [k]: v }))

  const handleSave = async () => {
    setSaving(true)
    try {
      const payload = { ...(data || {}), ...values }
      const res = await fetch('/api/admin/payments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('Failed to save')
      toast.success('Payment settings saved')
      // Invalidate payment settings so other views (robux, product pages) refresh
      queryClient.invalidateQueries({ queryKey: ['payment-settings'] })
    } catch (e: any) {
      toast.error(e.message || 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  if (isLoading) return <Skeleton className="h-24" />

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-xs">bKash Number</Label>
        <Input value={values['bkash_number'] ?? data?.['bkash_number'] ?? ''} onChange={(e) => handleChange('bkash_number', e.target.value)} className="bg-background" />
      </div>
      <div>
        <Label className="text-xs">Rocket Number</Label>
        <Input value={values['rocket_number'] ?? data?.['rocket_number'] ?? ''} onChange={(e) => handleChange('rocket_number', e.target.value)} className="bg-background" />
      </div>
      <div>
        <Label className="text-xs">Nagad Number</Label>
        <Input value={values['nagad_number'] ?? data?.['nagad_number'] ?? ''} onChange={(e) => handleChange('nagad_number', e.target.value)} className="bg-background" />
      </div>
      <Separator />
      <div>
        <Label className="text-xs">USDT (TRC20) Address</Label>
        <Input value={values['usdt_address'] ?? data?.['usdt_address'] ?? ''} onChange={(e) => handleChange('usdt_address', e.target.value)} className="bg-background" />
      </div>
      <div>
        <Label className="text-xs">BTC Address</Label>
        <Input value={values['btc_address'] ?? data?.['btc_address'] ?? ''} onChange={(e) => handleChange('btc_address', e.target.value)} className="bg-background" />
      </div>
      <div>
        <Label className="text-xs">ETH Address</Label>
        <Input value={values['eth_address'] ?? data?.['eth_address'] ?? ''} onChange={(e) => handleChange('eth_address', e.target.value)} className="bg-background" />
      </div>
      <div className="flex items-center gap-2">
        <Button className="bg-gold" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save Settings'}</Button>
      </div>
    </div>
  )
}
