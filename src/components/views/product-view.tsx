'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAppStore } from '@/lib/store'
import {
  CATEGORY_LABELS,
  RARITY_TEXT_COLORS,
  RARITY_BORDER_COLORS,
  PAYMENT_METHODS,
  formatPrice,
  formatCryptoPrice,
  formatDate,
} from '@/lib/constants'
import { ProductCard } from '@/components/shared/product-card'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import {
  ArrowLeft,
  ChevronRight,
  ShoppingBag,
  Star,
  Clock,
  ShieldCheck,
  CheckCircle2,
  Upload,
  Home,
  Package,
  Truck,
  Lock,
  BadgeCheck,
  MessageSquare,
  Send,
  X,
  Copy,
  ExternalLink,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'

export function ProductView() {
  const {
    selectedProductId,
    navigate,
    isAuthenticated,
    user,
  } = useAppStore()
  const queryClient = useQueryClient()

  // Payment state
  const [paymentTab, setPaymentTab] = useState<string>('bdt')
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('bkash')
  const [transactionId, setTransactionId] = useState('')
  const [proofFile, setProofFile] = useState<File | null>(null)

  // Image gallery state
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)

  // Review state
  const [reviewRating, setReviewRating] = useState(5)
  const [reviewText, setReviewText] = useState('')
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false)

  // Fetch product data
  const {
    data: productData,
    isLoading: productLoading,
    isError: productError,
  } = useQuery({
    queryKey: ['product', selectedProductId],
    queryFn: async () => {
      const res = await fetch(`/api/products/${selectedProductId}`)
      if (!res.ok) throw new Error('Failed to fetch product')
      return res.json()
    },
    enabled: !!selectedProductId,
  })

  const product = productData?.data?.product

  // Fetch reviews
  const {
    data: reviewsData,
    isLoading: reviewsLoading,
  } = useQuery({
    queryKey: ['reviews', selectedProductId],
    queryFn: async () => {
      const res = await fetch(`/api/reviews?productId=${selectedProductId}&limit=10`)
      if (!res.ok) throw new Error('Failed to fetch reviews')
      return res.json()
    },
    enabled: !!selectedProductId,
  })

  const reviews = reviewsData?.data?.reviews ?? []

  // Fetch related products
  const {
    data: relatedData,
    isLoading: relatedLoading,
  } = useQuery({
    queryKey: ['related-products', product?.category],
    queryFn: async () => {
      const params = new URLSearchParams({
        category: product.category,
        limit: '6',
      })
      const res = await fetch(`/api/products?${params}`)
      if (!res.ok) throw new Error('Failed to fetch related products')
      return res.json()
    },
    enabled: !!product?.category,
  })

  const relatedProducts = (relatedData?.data?.products ?? []).filter(
    (p: Record<string, unknown>) => p.id !== selectedProductId
  )

  // Create order mutation
  const createOrderMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: selectedProductId,
          paymentMethod: selectedPaymentMethod,
          transactionId: transactionId || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create order')
      return data
    },
    onSuccess: () => {
      toast.success('Order placed successfully!', {
        description: 'You will be notified once your payment is confirmed.',
      })
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      navigate('orders')
    },
    onError: (error: Error) => {
      toast.error('Failed to place order', {
        description: error.message,
      })
    },
  })

  // Create review mutation
  const createReviewMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: selectedProductId,
          rating: reviewRating,
          review: reviewText,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to submit review')
      return data
    },
    onSuccess: () => {
      toast.success('Review submitted!', {
        description: 'Thank you for your feedback.',
      })
      setReviewDialogOpen(false)
      setReviewText('')
      setReviewRating(5)
      queryClient.invalidateQueries({ queryKey: ['reviews', selectedProductId] })
      queryClient.invalidateQueries({ queryKey: ['product', selectedProductId] })
    },
    onError: (error: Error) => {
      toast.error('Failed to submit review', {
        description: error.message,
      })
    },
  })

  const handlePlaceOrder = () => {
    if (!isAuthenticated) {
      navigate('login')
      return
    }
    if (!transactionId.trim()) {
      toast.error('Transaction ID required', {
        description: 'Please enter your transaction ID to proceed.',
      })
      return
    }
    createOrderMutation.mutate()
  }

  const handleSubmitReview = () => {
    if (!reviewText.trim()) {
      toast.error('Review text required', {
        description: 'Please write your review before submitting.',
      })
      return
    }
    createReviewMutation.mutate()
  }

  // Render star rating display
  const renderStars = (rating: number, size: string = 'w-4 h-4') => {
    return Array.from({ length: 5 }).map((_, i) => (
      <Star
        key={i}
        className={`${size} ${
          i < Math.floor(rating)
            ? 'fill-gold text-gold'
            : i < rating
              ? 'fill-gold/50 text-gold'
              : 'text-muted-foreground/30'
        }`}
      />
    ))
  }

  // Loading state
  if (productLoading) {
    return (
      <div className="min-h-screen max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-4">
            <Skeleton className="aspect-[4/3] w-full rounded-xl" />
            <div className="space-y-2">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-5 w-1/3" />
            </div>
          </div>
          <Card className="border-border/50">
            <CardContent className="p-6 space-y-4">
              <Skeleton className="h-7 w-40" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-12 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Error state
  if (productError || !product) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4">
        <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
          <Package className="w-8 h-8 text-red-500" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Product not found</h3>
        <p className="text-muted-foreground text-sm mb-4">
          The product you&apos;re looking for doesn&apos;t exist or has been removed.
        </p>
        <Button variant="outline" onClick={() => navigate('shop')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Shop
        </Button>
      </div>
    )
  }

  const avgRating = product.avgRating || 0
  const reviewCount = product.reviewCount || 0
  const isInStock = product.stock > 0
  const isLowStock = product.stock > 0 && product.stock <= 5

  // Parse product images
  const productImages: string[] = (() => {
    try {
      const parsed = JSON.parse(product.images || '[]')
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  })()

  return (
    <div className="min-h-screen">
      {/* Breadcrumb & Back Button */}
      <div className="border-b border-border/50 bg-card/30 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="flex items-center justify-between"
          >
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <button
                onClick={() => navigate('home')}
                className="hover:text-foreground transition-colors flex items-center gap-1"
              >
                <Home className="w-3.5 h-3.5" />
                Home
              </button>
              <ChevronRight className="w-3.5 h-3.5" />
              <button
                onClick={() => navigate('shop')}
                className="hover:text-foreground transition-colors"
              >
                Shop
              </button>
              <ChevronRight className="w-3.5 h-3.5" />
              <span className="text-foreground font-medium truncate max-w-[200px] sm:max-w-none">
                {product.name}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('shop')}
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              Back
            </Button>
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Product Main Section - 2 columns */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* Left Column - Product Info */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-6"
          >
            {/* Product Image Gallery */}
            <div
              className={`relative rounded-xl overflow-hidden border ${
                product.rarity ? RARITY_BORDER_COLORS[product.rarity] || 'border-border/50' : 'border-border/50'
              }`}
            >
              {/* Main Image */}
              <div className="relative aspect-[4/3] bg-gradient-to-br from-accent/50 to-accent/20 overflow-hidden">
                {productImages.length > 0 ? (
                  <img
                    src={productImages[selectedImageIndex] || productImages[0]}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <ShoppingBag className="w-20 h-20 text-muted-foreground/20" />
                  </div>
                )}

                {/* Rarity glow effect */}
                {product.rarity && (product.rarity === 'legendary' || product.rarity === 'mythical') && (
                  <div className="absolute inset-0 bg-gradient-to-t from-gold/5 to-transparent pointer-events-none" />
                )}

                {/* Badges */}
                <div className="absolute top-4 left-4 flex flex-col gap-2">
                  {product.featured && (
                    <Badge className="bg-gold text-gold-foreground font-semibold">
                      Featured
                    </Badge>
                  )}
                  {product.rarity && (
                    <Badge
                      variant="outline"
                      className={`backdrop-blur-sm bg-background/50 ${RARITY_TEXT_COLORS[product.rarity] || ''}`}
                    >
                      {product.rarity.charAt(0).toUpperCase() + product.rarity.slice(1)}
                    </Badge>
                  )}
                </div>

                {/* Image navigation arrows */}
                {productImages.length > 1 && (
                  <>
                    <button
                      onClick={() => setSelectedImageIndex((prev) => (prev - 1 + productImages.length) % productImages.length)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur-sm flex items-center justify-center transition-colors"
                    >
                      <ChevronRight className="w-4 h-4 text-white rotate-180" />
                    </button>
                    <button
                      onClick={() => setSelectedImageIndex((prev) => (prev + 1) % productImages.length)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur-sm flex items-center justify-center transition-colors"
                    >
                      <ChevronRight className="w-4 h-4 text-white" />
                    </button>
                    {/* Image counter */}
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2">
                      <Badge variant="outline" className="bg-black/50 backdrop-blur-sm text-white border-white/20 text-[10px]">
                        {selectedImageIndex + 1} / {productImages.length}
                      </Badge>
                    </div>
                  </>
                )}

                {/* Stock overlay */}
                {!isInStock && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <span className="text-white text-lg font-bold uppercase tracking-wider">
                      Out of Stock
                    </span>
                  </div>
                )}
              </div>

              {/* Thumbnail Strip */}
              {productImages.length > 1 && (
                <div className="flex gap-2 p-3 bg-card/50 overflow-x-auto">
                  {productImages.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedImageIndex(i)}
                      className={`relative w-16 h-16 rounded-lg overflow-hidden shrink-0 border-2 transition-all ${
                        selectedImageIndex === i
                          ? 'border-gold ring-1 ring-gold/30'
                          : 'border-border/30 hover:border-border/60'
                      }`}
                    >
                      <img
                        src={img}
                        alt={`${product.name} ${i + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Product Info */}
            <div className="space-y-4">
              {/* Category */}
              <p className="text-xs text-muted-foreground font-semibold uppercase tracking-widest">
                {CATEGORY_LABELS[product.category] || product.category}
              </p>

              {/* Name */}
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                {product.name}
              </h1>

              {/* Rating */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-0.5">
                  {renderStars(avgRating)}
                </div>
                <span className="text-sm font-medium">{avgRating.toFixed(1)}</span>
                <span className="text-sm text-muted-foreground">
                  ({reviewCount} {reviewCount === 1 ? 'review' : 'reviews'})
                </span>
              </div>

              {/* Price */}
              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-bold text-gold">
                  {formatPrice(product.priceBdt)}
                </span>
                {product.priceCrypto && (
                  <span className="text-lg text-muted-foreground">
                    {formatCryptoPrice(product.priceCrypto)} USDT
                  </span>
                )}
              </div>

              {/* Stock Status */}
              <div className="flex items-center gap-2">
                {isInStock ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <span className="text-sm text-green-500 font-medium">In Stock</span>
                    {isLowStock && (
                      <Badge variant="outline" className="text-orange-500 border-orange-500/20 bg-orange-500/10 text-xs">
                        Only {product.stock} left
                      </Badge>
                    )}
                  </>
                ) : (
                  <>
                    <X className="w-4 h-4 text-red-500" />
                    <span className="text-sm text-red-500 font-medium">Out of Stock</span>
                  </>
                )}
              </div>

              {/* Delivery Info */}
              {product.deliveryInfo && (
                <div className="flex items-start gap-3 p-3 rounded-lg bg-card border border-border/50">
                  <Truck className="w-5 h-5 text-gold mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium">Delivery Information</p>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {product.deliveryInfo}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>

          {/* Right Column - Secure Checkout Card */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Card className="border-border/50 bg-card/80 backdrop-blur-xl sticky top-24">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Lock className="w-5 h-5 text-gold" />
                  Secure Checkout
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Price Summary */}
                <div className="p-4 rounded-lg bg-accent/50 border border-border/30">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-muted-foreground">Price</span>
                    <span className="text-xl font-bold text-gold">
                      {formatPrice(product.priceBdt)}
                    </span>
                  </div>
                  {product.priceCrypto && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Crypto equivalent</span>
                      <span className="text-sm text-muted-foreground">
                        {formatCryptoPrice(product.priceCrypto)} USDT
                      </span>
                    </div>
                  )}
                </div>

                {/* Payment Method Tabs */}
                <Tabs value={paymentTab} onValueChange={(v) => {
                  setPaymentTab(v)
                  setSelectedPaymentMethod(v === 'bdt' ? 'bkash' : 'usdt')
                }}>
                  <TabsList className="w-full bg-accent/50">
                    <TabsTrigger value="bdt" className="flex-1">
                      BDT
                    </TabsTrigger>
                    <TabsTrigger value="crypto" className="flex-1">
                      Crypto
                    </TabsTrigger>
                  </TabsList>

                  {/* BDT Payment Options */}
                  <TabsContent value="bdt" className="mt-3 space-y-2">
                    {PAYMENT_METHODS.bdt.map((method) => (
                      <div key={method.id}>
                        <button
                          onClick={() => setSelectedPaymentMethod(method.id)}
                          className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all ${
                            selectedPaymentMethod === method.id
                              ? 'border-gold/50 bg-gold/5'
                              : 'border-border/30 hover:border-border/60'
                          }`}
                        >
                          <span className="text-lg">{method.icon}</span>
                          <span className="text-sm font-medium">{method.name}</span>
                          {selectedPaymentMethod === method.id && (
                            <CheckCircle2 className="w-4 h-4 text-gold ml-auto" />
                          )}
                        </button>
                        {/* Show number when selected */}
                        {selectedPaymentMethod === method.id && method.number && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                            className="mt-2 p-3 rounded-lg bg-gold/5 border border-gold/20"
                          >
                            <p className="text-xs text-muted-foreground mb-1">
                              Send payment to this {method.name} number:
                            </p>
                            <div className="flex items-center gap-2">
                              <code className="text-sm font-bold text-gold tracking-wide">{method.number}</code>
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(method.number.replace(/-/g, ''))
                                  toast.success('Number copied to clipboard!')
                                }}
                                className="p-1 rounded hover:bg-gold/10 transition-colors"
                                title="Copy number"
                              >
                                <Copy className="w-3.5 h-3.5 text-gold" />
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </div>
                    ))}
                  </TabsContent>

                  {/* Crypto Payment Options */}
                  <TabsContent value="crypto" className="mt-3 space-y-2">
                    {PAYMENT_METHODS.crypto.map((method) => (
                      <div key={method.id}>
                        <button
                          onClick={() => setSelectedPaymentMethod(method.id)}
                          className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all ${
                            selectedPaymentMethod === method.id
                              ? 'border-gold/50 bg-gold/5'
                              : 'border-border/30 hover:border-border/60'
                          }`}
                        >
                          <span className="text-lg">{method.icon}</span>
                          <span className="text-sm font-medium">{method.name}</span>
                          {selectedPaymentMethod === method.id && (
                            <CheckCircle2 className="w-4 h-4 text-gold ml-auto" />
                          )}
                        </button>
                        {/* Show address when selected */}
                        {selectedPaymentMethod === method.id && method.address && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                            className="mt-2 p-3 rounded-lg bg-gold/5 border border-gold/20"
                          >
                            <p className="text-xs text-muted-foreground mb-1">
                              Send {method.name} to this wallet address:
                            </p>
                            <div className="flex items-center gap-2">
                              <code className="text-xs font-mono text-gold break-all leading-relaxed">{method.address}</code>
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(method.address)
                                  toast.success('Address copied to clipboard!')
                                }}
                                className="p-1 rounded hover:bg-gold/10 transition-colors shrink-0"
                                title="Copy address"
                              >
                                <Copy className="w-3.5 h-3.5 text-gold" />
                              </button>
                            </div>
                            <p className="text-[10px] text-orange-500 mt-2 font-medium">
                              ⚠️ Only send {method.name.split(' ')[0]} on the specified network. Sending on the wrong network may result in permanent loss.
                            </p>
                          </motion.div>
                        )}
                      </div>
                    ))}
                  </TabsContent>
                </Tabs>

                {/* Transaction ID Input */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Transaction ID <span className="text-red-500">*</span>
                  </label>
                  <Input
                    placeholder="Enter your transaction ID"
                    value={transactionId}
                    onChange={(e) => setTransactionId(e.target.value)}
                    className="bg-background border-border/50"
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter the transaction ID from your payment
                  </p>
                </div>

                {/* Payment Proof Upload */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Payment Proof (Optional)
                  </label>
                  <div className="relative">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                      className="bg-background border-border/50 file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-gold/10 file:text-gold hover:file:bg-gold/20"
                    />
                  </div>
                  {proofFile && (
                    <p className="text-xs text-muted-foreground">
                      Selected: {proofFile.name}
                    </p>
                  )}
                </div>

                <Separator className="bg-border/30" />

                {/* Place Order Button */}
                <Button
                  onClick={handlePlaceOrder}
                  disabled={!isInStock || createOrderMutation.isPending}
                  className="w-full h-12 text-base font-semibold bg-gold hover:bg-gold/90 text-gold-foreground disabled:opacity-50"
                  size="lg"
                >
                  {createOrderMutation.isPending ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-gold-foreground/30 border-t-gold-foreground rounded-full animate-spin" />
                      Processing...
                    </span>
                  ) : !isInStock ? (
                    'Out of Stock'
                  ) : !isAuthenticated ? (
                    'Login to Place Order'
                  ) : (
                    <>
                      <Lock className="w-4 h-4 mr-2" />
                      Place Order
                    </>
                  )}
                </Button>

                {/* Security Badges */}
                <div className="flex items-center justify-center gap-4 pt-1">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <ShieldCheck className="w-3.5 h-3.5 text-green-500" />
                    <span>Secure Payment</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <BadgeCheck className="w-3.5 h-3.5 text-gold" />
                    <span>Verified Seller</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Product Details Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mb-12"
        >
          <Card className="border-border/50">
            <CardContent className="p-6 sm:p-8">
              <h2 className="text-xl font-bold mb-6">Product Details</h2>

              {/* Description */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                  Description
                </h3>
                <p className="text-sm leading-relaxed text-foreground/80 whitespace-pre-wrap">
                  {product.description || 'No description available for this product.'}
                </p>
              </div>

              <Separator className="my-6 bg-border/30" />

              {/* Delivery Information */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                  Delivery Information
                </h3>
                <div className="flex items-start gap-3">
                  <Truck className="w-5 h-5 text-gold mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm text-foreground/80">
                      {product.deliveryInfo || 'Delivery details will be provided after purchase confirmation.'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Average delivery time: 5-30 minutes after payment confirmation
                    </p>
                  </div>
                </div>
              </div>

              <Separator className="my-6 bg-border/30" />

              {/* What's Included */}
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                  What&apos;s Included
                </h3>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                    <span>{product.name} - Full access</span>
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                    <span>Instant delivery after payment confirmation</span>
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                    <span>24/7 customer support</span>
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                    <span>Money-back guarantee if not delivered</span>
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </motion.section>

        {/* Reviews Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mb-12"
        >
          <Card className="border-border/50">
            <CardContent className="p-6 sm:p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-gold" />
                  Reviews
                </h2>
                {isAuthenticated && (
                  <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-gold/30 text-gold hover:bg-gold/10"
                      >
                        <Send className="w-3.5 h-3.5 mr-1.5" />
                        Write a Review
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Write a Review</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 pt-2">
                        {/* Star Rating */}
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Rating</label>
                          <div className="flex items-center gap-1">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <button
                                key={i}
                                onClick={() => setReviewRating(i + 1)}
                                className="p-0.5 hover:scale-110 transition-transform"
                              >
                                <Star
                                  className={`w-7 h-7 ${
                                    i < reviewRating
                                      ? 'fill-gold text-gold'
                                      : 'text-muted-foreground/30'
                                  }`}
                                />
                              </button>
                            ))}
                            <span className="ml-2 text-sm font-medium">
                              {reviewRating}/5
                            </span>
                          </div>
                        </div>

                        {/* Review Text */}
                        <div className="space-y-2">
                          <label className="text-sm font-medium">
                            Your Review
                          </label>
                          <Textarea
                            placeholder="Share your experience with this product..."
                            value={reviewText}
                            onChange={(e) => setReviewText(e.target.value)}
                            rows={4}
                            className="resize-none"
                          />
                          <p className="text-xs text-muted-foreground">
                            {reviewText.length}/1000 characters
                          </p>
                        </div>

                        <Button
                          onClick={handleSubmitReview}
                          disabled={createReviewMutation.isPending}
                          className="w-full bg-gold hover:bg-gold/90 text-gold-foreground"
                        >
                          {createReviewMutation.isPending ? (
                            <span className="flex items-center gap-2">
                              <span className="w-4 h-4 border-2 border-gold-foreground/30 border-t-gold-foreground rounded-full animate-spin" />
                              Submitting...
                            </span>
                          ) : (
                            <>
                              <Send className="w-4 h-4 mr-2" />
                              Submit Review
                            </>
                          )}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </div>

              {/* Average Rating Display */}
              {reviewCount > 0 && (
                <div className="flex items-center gap-4 mb-6 p-4 rounded-lg bg-accent/50 border border-border/30">
                  <div className="text-center">
                    <div className="text-4xl font-bold text-gold">
                      {avgRating.toFixed(1)}
                    </div>
                    <div className="flex items-center gap-0.5 mt-1">
                      {renderStars(avgRating, 'w-3.5 h-3.5')}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {reviewCount} {reviewCount === 1 ? 'review' : 'reviews'}
                    </p>
                  </div>
                  <Separator orientation="vertical" className="h-16 bg-border/30" />
                  <div className="flex-1 space-y-1">
                    {[5, 4, 3, 2, 1].map((star) => {
                      const count = reviews.filter(
                        (r: Record<string, unknown>) => (r.rating as number) === star
                      ).length
                      const pct = reviewCount > 0 ? (count / reviewCount) * 100 : 0
                      return (
                        <div key={star} className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground w-3">{star}</span>
                          <Star className="w-3 h-3 fill-gold text-gold" />
                          <div className="flex-1 h-2 bg-accent rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gold rounded-full transition-all duration-500"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground w-8 text-right">
                            {count}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Individual Reviews */}
              {reviewsLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex gap-3">
                      <Skeleton className="w-10 h-10 rounded-full shrink-0" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-20" />
                        <Skeleton className="h-3 w-full" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : reviews.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">
                    No reviews yet. Be the first to review this product!
                  </p>
                </div>
              ) : (
                <ScrollArea className="max-h-96">
                  <div className="space-y-4 pr-4">
                    <AnimatePresence>
                      {reviews.map((review: Record<string, unknown>, index: number) => (
                        <motion.div
                          key={review.id as string}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, delay: index * 0.05 }}
                          className="p-4 rounded-lg border border-border/30 bg-card/50"
                        >
                          <div className="flex items-start gap-3">
                            {/* Avatar */}
                            <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center shrink-0">
                              <span className="text-sm font-semibold text-gold">
                                {((review.user as Record<string, unknown>)?.username as string || 'U')
                                  .charAt(0)
                                  .toUpperCase()}
                              </span>
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-semibold">
                                  {(review.user as Record<string, unknown>)?.username as string || 'Anonymous'}
                                </span>
                                {review.verifiedPurchase && (
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] text-green-500 border-green-500/20 bg-green-500/10 py-0"
                                  >
                                    <BadgeCheck className="w-3 h-3 mr-0.5" />
                                    Verified
                                  </Badge>
                                )}
                                <span className="text-xs text-muted-foreground ml-auto">
                                  {formatDate(review.createdAt as string)}
                                </span>
                              </div>

                              {/* Stars */}
                              <div className="flex items-center gap-0.5 mt-1">
                                {renderStars(review.rating as number, 'w-3 h-3')}
                              </div>

                              {/* Review text */}
                              <p className="text-sm text-foreground/80 mt-2 leading-relaxed">
                                {review.review as string}
                              </p>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </motion.section>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Related Products</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('shop')}
                className="text-muted-foreground hover:text-foreground"
              >
                View All
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>

            {/* Mobile: Horizontal scroll, Desktop: Grid */}
            <div className="flex gap-4 overflow-x-auto pb-4 lg:overflow-visible lg:grid lg:grid-cols-3 xl:grid-cols-4 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
              {relatedProducts.slice(0, 4).map(
                (relatedProduct: Record<string, unknown>, index: number) => (
                  <div
                    key={relatedProduct.id as string}
                    className="min-w-[260px] lg:min-w-0"
                  >
                    <ProductCard
                      product={relatedProduct as Parameters<typeof ProductCard>[0]['product']}
                      index={index}
                    />
                  </div>
                )
              )}
            </div>
          </motion.section>
        )}
      </div>
    </div>
  )
}
