'use client'

import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAppStore } from '@/lib/store'
import {
  PAYMENT_METHODS,
  ROBUX_COMMUNITY_NOTICE,
  formatPrice,
  formatCryptoPrice,
  formatDate,
} from '@/lib/constants'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import {
  Coins,
  Gift,
  Zap,
  Star,
  ShieldCheck,
  CheckCircle2,
  Upload,
  Lock,
  BadgeCheck,
  TrendingUp,
  ArrowRight,
  Loader2,
  X,
  Copy,
  ExternalLink,
  AlertTriangle,
  Users,
  CalendarClock,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

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
}

export function RobuxView() {
  const { navigate, isAuthenticated, user, isAdmin } = useAppStore()
  const queryClient = useQueryClient()

  // Purchase dialog state
  const [selectedPackage, setSelectedPackage] = useState<RobuxPackage | null>(null)
  const [purchaseOpen, setPurchaseOpen] = useState(false)
  const [paymentTab, setPaymentTab] = useState<string>('bdt')
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('bkash')
  const [transactionId, setTransactionId] = useState('')
  const [robloxUsername, setRobloxUsername] = useState('')
  const [proofFile, setProofFile] = useState<File | null>(null)

  // Fetch robux packages
  const {
    data: packagesData,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['robux-packages'],
    queryFn: async () => {
      const res = await fetch('/api/robux')
      if (!res.ok) throw new Error('Failed to fetch packages')
      return res.json()
    },
  })

  const packages: RobuxPackage[] = packagesData?.data?.packages ?? []

  // Fetch payment settings to override defaults
  const { data: paymentSettingsData } = useQuery({
    queryKey: ['payment-settings'],
    queryFn: async () => {
      try {
        const res = await fetch('/api/admin/payments')
        if (!res.ok) return {}
        const json = await res.json()
        return json.data as Record<string, string>
      } catch {
        return {}
      }
    },
  })

  const mergedPaymentMethods = useMemo(() => {
    const methods = JSON.parse(JSON.stringify(PAYMENT_METHODS))
    if (paymentSettingsData) {
      if (paymentSettingsData['bkash_number']) methods.bdt = methods.bdt.map((m: any) => m.id === 'bkash' ? { ...m, number: paymentSettingsData['bkash_number'] } : m)
      if (paymentSettingsData['rocket_number']) methods.bdt = methods.bdt.map((m: any) => m.id === 'rocket' ? { ...m, number: paymentSettingsData['rocket_number'] } : m)
      if (paymentSettingsData['nagad_number']) methods.bdt = methods.bdt.map((m: any) => m.id === 'nagad' ? { ...m, number: paymentSettingsData['nagad_number'] } : m)
      if (paymentSettingsData['usdt_address']) methods.crypto = methods.crypto.map((m: any) => m.id === 'usdt' ? { ...m, address: paymentSettingsData['usdt_address'] } : m)
      if (paymentSettingsData['btc_address']) methods.crypto = methods.crypto.map((m: any) => m.id === 'btc' ? { ...m, address: paymentSettingsData['btc_address'] } : m)
      if (paymentSettingsData['eth_address']) methods.crypto = methods.crypto.map((m: any) => m.id === 'eth' ? { ...m, address: paymentSettingsData['eth_address'] } : m)
    }
    return methods
  }, [paymentSettingsData])

  // Create robux order mutation
  const createOrderMutation = useMutation({
    mutationFn: async () => {
      if (!selectedPackage) throw new Error('No package selected')
      const res = await fetch('/api/robux', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packageId: selectedPackage.id,
          paymentMethod: selectedPaymentMethod,
          transactionId: transactionId || undefined,
          robloxUsername,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create order')
      return data
    },
    onSuccess: () => {
      toast.success('Robux order placed successfully!', {
        description: 'You will be notified once your payment is confirmed.',
      })
      queryClient.invalidateQueries({ queryKey: ['robux-packages'] })
      handleCloseDialog()
    },
    onError: (error: Error) => {
      toast.error('Failed to place order', {
        description: error.message,
      })
    },
  })

  const handleBuyNow = (pkg: RobuxPackage) => {
    if (!isAuthenticated) {
      navigate('login')
      return
    }
    // Non-admin users see a "Soon" message while Robux purchasing is disabled
    if (!isAdmin) {
      toast("Coming soon", {
        description: 'Robux purchases are not yet available to regular users. Admins can access the purchase flow.',
      })
      return
    }
    setSelectedPackage(pkg)
    setPaymentTab('bdt')
    setSelectedPaymentMethod('bkash')
    setTransactionId('')
    setRobloxUsername('')
    setProofFile(null)
    setPurchaseOpen(true)
  }

  const handleCloseDialog = () => {
    setPurchaseOpen(false)
    setSelectedPackage(null)
    setTransactionId('')
    setRobloxUsername('')
    setProofFile(null)
  }

  const handleConfirmPurchase = () => {
    if (!robloxUsername.trim()) {
      toast.error('Roblox username required', {
        description: 'Please enter your Roblox username to proceed.',
      })
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

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-12">
          <Skeleton className="h-12 w-64 mx-auto mb-4" />
          <Skeleton className="h-6 w-96 mx-auto" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  // Error state
  if (isError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4">
        <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
          <Coins className="w-8 h-8 text-red-500" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Failed to load packages</h3>
        <p className="text-muted-foreground text-sm mb-4">
          Something went wrong while loading Robux packages.
        </p>
        <Button variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: ['robux-packages'] })}>
          Try Again
        </Button>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-border/50">
        {/* Background effects */}
        <div className="absolute inset-0 bg-gradient-to-b from-gold/5 via-transparent to-transparent" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-gold/3 blur-[120px]" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            {/* Animated Robux Coin Icon */}
            <motion.div
              className="mx-auto mb-6 w-20 h-20 sm:w-24 sm:h-24 relative"
              animate={{ rotateY: [0, 360] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
              style={{ perspective: 200 }}
            >
              <div className="w-full h-full rounded-full bg-gradient-to-br from-gold via-yellow-400 to-amber-500 shadow-lg shadow-gold/30 flex items-center justify-center border-4 border-yellow-300/50">
                <span className="text-3xl sm:text-4xl font-black text-yellow-900">R$</span>
              </div>
              {/* Glow ring */}
              <div className="absolute inset-0 rounded-full border-2 border-gold/40 animate-ping opacity-30" />
            </motion.div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-4">
              <span className="bg-gradient-to-r from-gold via-yellow-400 to-amber-500 bg-clip-text text-transparent">
                Purchase Robux
              </span>
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
              Fast, secure, and reliable Robux delivery
            </p>

            {/* Trust badges */}
            <div className="flex items-center justify-center gap-6 mt-8">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <ShieldCheck className="w-4 h-4 text-green-500" />
                <span>Secure Payment</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Zap className="w-4 h-4 text-gold" />
                <span>Instant Delivery</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <BadgeCheck className="w-4 h-4 text-gold" />
                <span>Verified Seller</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 14-Day Community Requirement Notice */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-0 sm:py-0 -mt-4 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
        >
          <div className="rounded-xl border-2 border-orange-500/30 bg-gradient-to-r from-orange-500/5 via-orange-500/10 to-orange-500/5 overflow-hidden">
            <div className="p-5 sm:p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center shrink-0 mt-0.5">
                  <AlertTriangle className="w-6 h-6 text-orange-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base sm:text-lg font-bold text-orange-500 mb-2">
                    {ROBUX_COMMUNITY_NOTICE.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                    {ROBUX_COMMUNITY_NOTICE.message}
                  </p>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-gold" />
                      <span className="text-sm font-medium">{ROBUX_COMMUNITY_NOTICE.communityName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CalendarClock className="w-4 h-4 text-orange-500" />
                      <span className="text-sm font-medium text-orange-500">{ROBUX_COMMUNITY_NOTICE.daysRequired}-day minimum membership</span>
                    </div>
                    <a
                      href={ROBUX_COMMUNITY_NOTICE.communityLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gold/10 border border-gold/30 text-gold text-sm font-semibold hover:bg-gold/20 transition-colors"
                    >
                      Join Our Group
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Robux Packages Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-center mb-10"
        >
          <h2 className="text-2xl sm:text-3xl font-bold mb-2">Choose Your Package</h2>
          <p className="text-muted-foreground text-sm">
            Select the Robux amount that fits your needs
          </p>
        </motion.div>

        {packages.length === 0 ? (
          <div className="text-center py-16">
            <Coins className="w-16 h-16 mx-auto text-muted-foreground/20 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No packages available</h3>
            <p className="text-muted-foreground text-sm">
              Robux packages are coming soon. Check back later!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
            <AnimatePresence>
              {packages
                .filter((pkg) => pkg.active)
                .sort((a, b) => a.sortOrder - b.sortOrder)
                .map((pkg, index) => (
                  <motion.div
                    key={pkg.id}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: index * 0.08 }}
                    className={pkg.popular ? 'md:col-span-1 md:row-span-1' : ''}
                  >
                    <Card
                      className={`relative group cursor-pointer transition-all duration-300 border-border/50 bg-card overflow-hidden h-full ${
                        pkg.popular
                          ? 'ring-2 ring-gold/50 shadow-lg shadow-gold/10 scale-[1.02] md:scale-105'
                          : 'hover:border-gold/30 hover:shadow-md hover:shadow-gold/5'
                      }`}
                      onClick={() => handleBuyNow(pkg)}
                    >
                      {/* Popular badge */}
                      {pkg.popular && (
                        <div className="absolute top-0 left-0 right-0">
                          <div className="bg-gradient-to-r from-gold via-yellow-400 to-amber-500 text-center py-1.5">
                            <span className="text-xs font-bold text-yellow-900 uppercase tracking-wider flex items-center justify-center gap-1">
                              <Star className="w-3 h-3 fill-yellow-900" />
                              Most Popular
                              <Star className="w-3 h-3 fill-yellow-900" />
                            </span>
                          </div>
                        </div>
                      )}

                      <CardContent className={`p-5 sm:p-6 flex flex-col items-center text-center ${pkg.popular ? 'pt-12' : ''}`}>
                        {/* Robux amount */}
                        <div className="mb-3">
                          <div className="flex items-center justify-center gap-1.5 mb-1">
                            <Coins className={`w-5 h-5 ${pkg.popular ? 'text-gold' : 'text-muted-foreground'}`} />
                            <span className={`text-3xl sm:text-4xl font-black ${pkg.popular ? 'text-gold' : 'text-foreground'}`}>
                              {pkg.amount.toLocaleString()}
                            </span>
                          </div>
                          <span className="text-xs text-muted-foreground uppercase tracking-wider">
                            Robux
                          </span>
                        </div>

                        {/* Bonus badge */}
                        {pkg.bonus > 0 && (
                          <Badge className="mb-3 bg-gold/10 text-gold border-gold/20 hover:bg-gold/20">
                            <Gift className="w-3 h-3 mr-1" />
                            +{pkg.bonus} BONUS
                          </Badge>
                        )}

                        {pkg.bonus === 0 && <div className="mb-3 h-6" />}

                        {/* Price */}
                        <div className="mb-4">
                          <span className="text-2xl sm:text-3xl font-bold text-gold">
                            {formatPrice(pkg.priceBdt)}
                          </span>
                          {pkg.priceCrypto && (
                            <p className="text-sm text-muted-foreground mt-0.5">
                              {formatCryptoPrice(pkg.priceCrypto)} USDT
                            </p>
                          )}
                        </div>

                        {/* Buy button */}
                        <Button
                          className={`w-full font-semibold transition-all ${
                            pkg.popular
                              ? 'bg-gold hover:bg-gold/90 text-gold-foreground shadow-md shadow-gold/20'
                              : 'bg-gold/10 text-gold hover:bg-gold hover:text-gold-foreground border border-gold/30'
                          }`}
                          onClick={(e) => {
                            e.stopPropagation()
                            handleBuyNow(pkg)
                          }}
                        >
                          {isAdmin ? 'Buy Now' : 'Soon'}
                          <ArrowRight className="w-4 h-4 ml-1.5" />
                        </Button>
                      </CardContent>

                      {/* Hover glow effect */}
                      {!pkg.popular && (
                        <div className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none ring-1 ring-gold/20" />
                      )}
                    </Card>
                  </motion.div>
                ))}
            </AnimatePresence>
          </div>
        )}
      </section>

      {/* Loyalty Points Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <Card className="border-border/50 bg-gradient-to-r from-card via-card to-gold/5 overflow-hidden">
            <CardContent className="p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-gold/10 flex items-center justify-center shrink-0">
                    <TrendingUp className="w-7 h-7 text-gold" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold mb-1 flex items-center gap-2">
                      Earn Loyalty Points
                      <Badge className="bg-gold/10 text-gold border-gold/20 text-xs">
                        1 pt / ৳100
                      </Badge>
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Each point = <span className="text-gold font-semibold">৳1 discount</span> on future purchases
                    </p>
                  </div>
                </div>
                {isAuthenticated && user && (
                  <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-gold/5 border border-gold/20">
                    <Star className="w-5 h-5 text-gold fill-gold" />
                    <div>
                      <p className="text-xs text-muted-foreground">Your Balance</p>
                      <p className="text-xl font-bold text-gold">
                        {user.loyaltyPoints ?? 0} pts
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </section>

      {/* Purchase Dialog */}
      <Dialog open={purchaseOpen} onOpenChange={setPurchaseOpen}>
        <DialogContent className="max-w-lg bg-card border-border/50">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-gold-gradient">
              <Lock className="w-5 h-5 text-gold" />
              Purchase Robux
            </DialogTitle>
          </DialogHeader>

          {selectedPackage && (
            <div className="space-y-5 pt-2">
              {/* Package Summary */}
              <div className="p-4 rounded-lg bg-accent/50 border border-border/30">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-muted-foreground">Package</span>
                  <span className="font-semibold flex items-center gap-1">
                    <Coins className="w-4 h-4 text-gold" />
                    {selectedPackage.amount.toLocaleString()} Robux
                  </span>
                </div>
                {selectedPackage.bonus > 0 && (
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-muted-foreground">Bonus</span>
                    <span className="text-sm font-medium text-gold">
                      +{selectedPackage.bonus} Robux
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total Price</span>
                  <span className="text-xl font-bold text-gold">
                    {formatPrice(selectedPackage.priceBdt)}
                  </span>
                </div>
                {selectedPackage.priceCrypto && (
                  <div className="flex items-center justify-end mt-0.5">
                    <span className="text-xs text-muted-foreground">
                      {formatCryptoPrice(selectedPackage.priceCrypto)} USDT
                    </span>
                  </div>
                )}
              </div>

              {/* Roblox Username */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Roblox Username <span className="text-red-500">*</span>
                </label>
                <Input
                  placeholder="Enter your Roblox username"
                  value={robloxUsername}
                  onChange={(e) => setRobloxUsername(e.target.value)}
                  className="bg-background border-border/50"
                />
                <p className="text-xs text-muted-foreground">
                  The username where Robux will be delivered
                </p>
              </div>

              {/* Community requirement reminder in dialog */}
              <div className="p-3 rounded-lg bg-orange-500/5 border border-orange-500/20">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-orange-500 mb-0.5">Community Requirement</p>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      You must be a member of our <a href={ROBUX_COMMUNITY_NOTICE.communityLink} target="_blank" rel="noopener noreferrer" className="text-gold underline underline-offset-2">Roblox Group</a> for at least <span className="text-orange-500 font-semibold">{ROBUX_COMMUNITY_NOTICE.daysRequired} days</span> before we can deliver Robux to your account.
                    </p>
                  </div>
                </div>
              </div>

              {/* Payment Method Tabs */}
              <Tabs
                value={paymentTab}
                onValueChange={(v) => {
                  setPaymentTab(v)
                  setSelectedPaymentMethod(v === 'bdt' ? 'bkash' : 'usdt')
                }}
              >
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
                  {(mergedPaymentMethods?.bdt || PAYMENT_METHODS.bdt).map((method) => (
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
                  {(mergedPaymentMethods?.crypto || PAYMENT_METHODS.crypto).map((method) => (
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

              {/* Transaction ID */}
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

              {/* Confirm Purchase Button */}
              <Button
                onClick={handleConfirmPurchase}
                disabled={createOrderMutation.isPending}
                className="w-full h-12 text-base font-semibold bg-gold hover:bg-gold/90 text-gold-foreground disabled:opacity-50"
                size="lg"
              >
                {createOrderMutation.isPending ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing...
                  </span>
                ) : (
                  <>
                    <Lock className="w-4 h-4 mr-2" />
                    Confirm Purchase
                  </>
                )}
              </Button>

              {/* Security badges */}
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
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
