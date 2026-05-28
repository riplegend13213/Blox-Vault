'use client'

import { useAppStore } from '@/lib/store'
import { CATEGORY_LABELS, formatPrice, timeAgo } from '@/lib/constants'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ShoppingBag,
  Shield,
  Zap,
  CheckCircle,
  Eye,
  HeadphonesIcon,
  Star,
  ArrowRight,
  Activity,
  Package,
  Users,
  Clock,
  BadgeCheck,
  ChevronRight,
  X,
  Coins,
  Gift,
  Timer,
  Flame,
  Lock,
  Truck,
  Headphones,
  Award,
  Megaphone,
  Sparkles,
  CircleDollarSign,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion'
import { ProductCard } from '@/components/shared/product-card'
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'

// ─── Animation variants ────────────────────────────────────────────
const sectionVariants: any = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: 'easeInOut' },
  },
}

const staggerContainer: any = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
}

const staggerItem: any = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: 'easeInOut' },
  },
}

// ─── Animated counter hook ─────────────────────────────────────────
function useAnimatedCounter(target: number, duration = 1200) {
  const [count, setCount] = useState(0)
  const prevTarget = useRef(0)

  useEffect(() => {
    if (target === prevTarget.current) return
    prevTarget.current = target

    let start = 0
    const increment = target / (duration / 16)
    const timer = setInterval(() => {
      start += increment
      if (start >= target) {
        setCount(target)
        clearInterval(timer)
      } else {
        setCount(Math.floor(start))
      }
    }, 16)

    return () => clearInterval(timer)
  }, [target, duration])

  return count
}

// ─── API types ─────────────────────────────────────────────────────
interface StatsData {
  completedOrders: number
  activeCustomers: number
  avgDeliveryTime: number
  satisfaction: number
  totalRobuxSold: number
  loyaltyPointsDistributed: number
  recentActivity: Array<{
    id: string
    username: string
    productName: string
    productCategory: string
    status: string
    createdAt: string
  }> | null
}

interface ProductData {
  id: string
  name: string
  slug: string
  category: string
  stock: number
  priceBdt: number
  priceCrypto: number | null
  rarity: string | null
  featured: boolean
  isFlashDeal?: boolean
  originalPrice?: number | null
  _count?: { reviews: number }
  avgRating?: number
}

interface FlashDealData extends ProductData {
  flashDealEndsAt: string
  countdown: {
    totalMs: number
    days: number
    hours: number
    minutes: number
    seconds: number
  }
  discountPercentage: number
}

interface RobuxPackageData {
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

interface AnnouncementData {
  id: string
  title: string
  body: string
  type: string
  active: boolean
  startDate: string
  endDate: string | null
  createdAt: string
}

interface ReviewData {
  id: string
  userId: string
  productId: string
  rating: number
  review: string
  verifiedPurchase: boolean
  createdAt: string
  user: {
    id: string
    username: string
    avatar: string | null
  }
  product?: {
    id: string
    name: string
    slug: string
    category: string
  }
}

interface LoyaltyData {
  balance: number
  totalEarned: number
  totalSpent: number
}

// ─── Sub-components ────────────────────────────────────────────────

function AnimatedCounter({ value, suffix = '' }: { value: number; suffix?: string }) {
  const count = useAnimatedCounter(value)
  return <>{count}{suffix}</>
}

function StatsCardSkeleton() {
  return (
    <Card className="border-border/50 bg-card">
      <CardContent className="p-6">
        <div className="flex items-center gap-4">
          <Skeleton className="w-12 h-12 rounded-xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-7 w-16" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function ProductCardSkeleton() {
  return (
    <Card className="border-border/50 bg-card overflow-hidden">
      <Skeleton className="aspect-[4/3]" />
      <CardContent className="p-4 space-y-2">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-6 w-24" />
      </CardContent>
    </Card>
  )
}

function ReviewCardSkeleton() {
  return (
    <Card className="border-border/50 bg-card">
      <CardContent className="p-6 space-y-3">
        <div className="flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-full" />
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-2/3" />
      </CardContent>
    </Card>
  )
}

// ─── Countdown Timer Hook ──────────────────────────────────────────
function useCountdown(targetDate: string) {
  const calculateTimeLeft = useCallback(() => {
    const now = new Date().getTime()
    const target = new Date(targetDate).getTime()
    const diff = Math.max(0, target - now)

    return {
      days: Math.floor(diff / (1000 * 60 * 60 * 24)),
      hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
      minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
      seconds: Math.floor((diff % (1000 * 60)) / 1000),
      totalMs: diff,
      expired: diff <= 0,
    }
  }, [targetDate])

  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft)

  useEffect(() => {
    const interval = setInterval(() => {
      const newTime = calculateTimeLeft()
      setTimeLeft(newTime)
      if (newTime.expired) clearInterval(interval)
    }, 1000)

    return () => clearInterval(interval)
  }, [calculateTimeLeft])

  return timeLeft
}

// ─── Countdown Display Component ───────────────────────────────────
function CountdownTimer({ targetDate }: { targetDate: string }) {
  const { days, hours, minutes, seconds, expired } = useCountdown(targetDate)

  if (expired) {
    return <span className="text-sm text-red-500 font-semibold">Expired</span>
  }

  const units = [
    { label: 'd', value: days },
    { label: 'h', value: hours },
    { label: 'm', value: minutes },
    { label: 's', value: seconds },
  ]

  return (
    <div className="flex items-center gap-1">
      {units.map((unit, i) => (
        <div key={unit.label} className="flex items-center gap-1">
          <div className="bg-black/80 dark:bg-white/10 rounded px-2 py-1 min-w-[32px] text-center">
            <span className="text-sm font-bold font-mono text-gold">
              {String(unit.value).padStart(2, '0')}
            </span>
            <span className="text-[10px] text-muted-foreground ml-0.5">{unit.label}</span>
          </div>
          {i < units.length - 1 && (
            <span className="text-gold/60 font-bold text-xs">:</span>
          )}
        </div>
      ))}
    </div>
  )
}

// ─── ANNOUNCEMENT BANNER ───────────────────────────────────────────
function AnnouncementBanner() {
  const { announcementDismissed, setAnnouncementDismissed } = useAppStore()

  const { data } = useQuery({
    queryKey: ['announcements'],
    queryFn: async () => {
      const res = await fetch('/api/announcements')
      const json = await res.json()
      return json.success ? json.data : null
    },
  })

  const announcements = (data?.announcements as AnnouncementData[]) || []

  if (announcementDismissed || announcements.length === 0) return null

  const announcement = announcements[0]

  const typeConfig: Record<string, { icon: typeof Megaphone; color: string }> = {
    promo: { icon: Sparkles, color: 'text-gold' },
    warning: { icon: Shield, color: 'text-orange-500' },
    update: { icon: Package, color: 'text-blue-500' },
    info: { icon: Megaphone, color: 'text-gold' },
  }

  const config = typeConfig[announcement.type] || typeConfig.info
  const TypeIcon = config.icon

  return (
    <AnimatePresence>
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: 'auto', opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="overflow-hidden"
      >
        <div className="bg-gradient-to-r from-gold/10 via-gold/5 to-gold/10 border-b border-gold/20">
          <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <TypeIcon className={`w-4 h-4 shrink-0 ${config.color}`} />
              <div className="flex items-center gap-2 min-w-0 overflow-hidden">
                <span className="font-semibold text-sm text-gold shrink-0">
                  {announcement.title}
                </span>
                <span className="text-sm text-muted-foreground truncate">
                  {announcement.body}
                </span>
              </div>
            </div>
            <button
              onClick={() => setAnnouncementDismissed(true)}
              className="shrink-0 p-1 rounded-full hover:bg-gold/10 transition-colors"
              aria-label="Dismiss announcement"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

// ─── HERO SECTION ──────────────────────────────────────────────────
function HeroSection() {
  const { navigate } = useAppStore()

  // Generate dot grid positions (memoized)
  const dots = useMemo(() => {
    const d: Array<{
      id: number
      x: number
      y: number
      size: number
      delay: number
      duration: number
    }> = []
    for (let i = 0; i < 50; i++) {
      d.push({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 2 + 1,
        delay: Math.random() * 5,
        duration: Math.random() * 3 + 2,
      })
    }
    return d
  }, [])

  return (
    <section className="relative min-h-[85vh] flex items-center justify-center overflow-hidden cinematic-gradient">
      {/* Animated gradient background */}
      <div className="absolute inset-0">
        <motion.div
          className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full bg-gold/5 blur-[120px]"
          animate={{
            x: [0, 30, -20, 0],
            y: [0, -20, 15, 0],
          }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-gold/3 blur-[100px]"
          animate={{
            x: [0, -25, 20, 0],
            y: [0, 15, -25, 0],
          }}
          transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute top-1/2 left-1/2 w-[300px] h-[300px] rounded-full bg-gold/4 blur-[80px]"
          animate={{
            x: [0, 40, -30, 0],
            y: [0, -30, 20, 0],
          }}
          transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      {/* Particle/dot grid background */}
      <div className="absolute inset-0 overflow-hidden">
        {dots.map((dot) => (
          <motion.div
            key={dot.id}
            className="absolute rounded-full bg-gold/20"
            style={{
              left: `${dot.x}%`,
              top: `${dot.y}%`,
              width: dot.size,
              height: dot.size,
            }}
            animate={{
              opacity: [0.1, 0.5, 0.1],
              scale: [1, 1.5, 1],
            }}
            transition={{
              duration: dot.duration,
              repeat: Infinity,
              delay: dot.delay,
              ease: 'easeInOut',
            }}
          />
        ))}
      </div>

      {/* Floating decorative orbs - multiple sizes */}
      <motion.div
        className="absolute top-20 right-[15%] w-2 h-2 rounded-full bg-gold/40"
        animate={{ y: [-8, 8, -8] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute top-40 left-[10%] w-3 h-3 rounded-full bg-gold/20"
        animate={{ y: [-12, 12, -12] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute bottom-32 left-[20%] w-1.5 h-1.5 rounded-full bg-gold/30"
        animate={{ y: [-6, 6, -6] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute bottom-48 right-[25%] w-2.5 h-2.5 rounded-full bg-gold/15"
        animate={{ y: [-10, 10, -10] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute top-1/3 right-[8%] w-4 h-4 rounded-full bg-gold/10"
        animate={{ y: [-15, 15, -15], x: [-5, 5, -5] }}
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute bottom-1/3 left-[5%] w-3.5 h-3.5 rounded-full bg-gold/8"
        animate={{ y: [-10, 10, -10], x: [5, -5, 5] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Content */}
      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeInOut' }}
        >
          <Badge
            variant="outline"
            className="mb-6 border-gold/30 text-gold bg-gold/5 px-4 py-1.5 text-xs tracking-widest uppercase"
          >
            Premium Blox Fruits Marketplace
          </Badge>
        </motion.div>

        <motion.h1
          className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.1] tracking-tight mb-6"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1, ease: 'easeInOut' }}
        >
          The Most{' '}
          <span className="text-gold-gradient">Trusted</span>
          <br />
          Blox Fruits Store
        </motion.h1>

        <motion.p
          className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: 'easeInOut' }}
        >
          Premium services, secure transactions, professional delivery
        </motion.p>

        <motion.div
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3, ease: 'easeInOut' }}
        >
          <Button
            size="lg"
            className="bg-gold hover:bg-gold/90 text-gold-foreground font-semibold px-8 h-12 text-base gold-glow-subtle"
            onClick={() => navigate('shop')}
          >
            <ShoppingBag className="w-5 h-5 mr-2" />
            Browse Shop
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="border-border/60 hover:border-gold/30 hover:text-gold px-8 h-12 text-base"
            onClick={() => navigate('shop')}
          >
            Learn More
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
          <Button
            size="lg"
            variant="ghost"
            className="text-gold hover:text-gold hover:bg-gold/5 px-6 h-12 text-base"
            onClick={() => navigate('robux')}
          >
            <Coins className="w-5 h-5 mr-2" />
            Robux Available
          </Button>
        </motion.div>

        {/* Trust badges row */}
        <motion.div
          className="flex flex-wrap items-center justify-center gap-6 mt-12"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.5, ease: 'easeInOut' }}
        >
          {[
            { icon: Lock, label: 'Secure Payment' },
            { icon: Zap, label: 'Instant Delivery' },
            { icon: Headphones, label: '24/7 Support' },
            { icon: BadgeCheck, label: 'Verified Seller' },
          ].map((badge) => (
            <div
              key={badge.label}
              className="flex items-center gap-2 text-muted-foreground/60 text-xs"
            >
              <badge.icon className="w-3.5 h-3.5 text-gold/60" />
              <span>{badge.label}</span>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

// ─── ROBUX QUICK ACCESS SECTION ────────────────────────────────────
function RobuxQuickAccessSection() {
  const { navigate } = useAppStore()

  const { data, isLoading } = useQuery({
    queryKey: ['robux-packages-home'],
    queryFn: async () => {
      const res = await fetch('/api/robux')
      const json = await res.json()
      return json.success ? json.data : null
    },
  })

  const packages = (data?.packages as RobuxPackageData[]) || []

  // Don't show section if no packages
  if (!isLoading && packages.length === 0) return null

  return (
    <section className="py-16 px-6 bg-accent/20">
      <div className="max-w-6xl mx-auto">
        <motion.div
          variants={sectionVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          className="flex items-end justify-between mb-8"
        >
          <div>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-2">
              Get <span className="text-gold-gradient">Robux</span> Instantly
            </h2>
            <p className="text-muted-foreground text-lg">
              Premium Robux packages at the best rates
            </p>
          </div>
          <Button
            variant="ghost"
            className="hidden sm:flex text-gold hover:text-gold hover:bg-gold/5"
            onClick={() => navigate('robux')}
          >
            View All Packages
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </motion.div>

        {isLoading ? (
          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="border-border/50 bg-card shrink-0 w-[200px]">
                <CardContent className="p-4 space-y-2">
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-6 w-20" />
                  <Skeleton className="h-4 w-24" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
            {packages.map((pkg, i) => (
              <motion.div
                key={pkg.id}
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.06 }}
                className="shrink-0"
              >
                <Card
                  className={`border-border/50 bg-card hover:border-gold/30 transition-all duration-300 cursor-pointer w-[200px] ${
                    pkg.popular ? 'ring-1 ring-gold/30' : ''
                  }`}
                  onClick={() => navigate('robux')}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Coins className="w-4 h-4 text-gold" />
                      <span className="text-sm font-semibold">
                        {pkg.amount.toLocaleString()} R$
                      </span>
                      {pkg.popular && (
                        <Badge className="bg-gold text-gold-foreground text-[9px] px-1.5 py-0 h-4 ml-auto">
                          Popular
                        </Badge>
                      )}
                    </div>
                    <p className="text-lg font-bold text-gold mb-1">
                      {formatPrice(pkg.priceBdt)}
                    </p>
                    {pkg.bonus > 0 && (
                      <Badge
                        variant="outline"
                        className="text-[10px] border-gold/30 text-gold bg-gold/5"
                      >
                        +{pkg.bonus} BONUS
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}

        <div className="sm:hidden mt-4 text-center">
          <Button
            variant="outline"
            className="border-gold/30 text-gold hover:bg-gold/5"
            onClick={() => navigate('robux')}
          >
            View All Packages
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>
    </section>
  )
}

// ─── LIVE STATS SECTION ────────────────────────────────────────────
function LiveStatsSection() {
  const { data, isLoading } = useQuery({
    queryKey: ['stats'],
    queryFn: async () => {
      const res = await fetch('/api/stats')
      const json = await res.json()
      return json.success ? (json.data as StatsData) : null
    },
  })

  const stats = [
    {
      icon: Package,
      label: 'Completed Orders',
      value: data?.completedOrders ?? 0,
      suffix: '',
      emptyText: '0 orders',
    },
    {
      icon: Users,
      label: 'Active Customers',
      value: data?.activeCustomers ?? 0,
      suffix: '',
      emptyText: 'No customers yet',
    },
    {
      icon: Clock,
      label: 'Avg Delivery Time',
      value: data?.avgDeliveryTime ?? 0,
      suffix: ' min',
      emptyText: 'No data yet',
    },
    {
      icon: Star,
      label: 'Satisfaction',
      value: data?.satisfaction ?? 0,
      suffix: '/5',
      emptyText: 'No ratings yet',
      isDecimal: true,
    },
    {
      icon: Coins,
      label: 'Total Robux Sold',
      value: data?.totalRobuxSold ?? 0,
      suffix: ' R$',
      emptyText: '0 Robux sold',
    },
    {
      icon: Gift,
      label: 'Loyalty Points Distributed',
      value: data?.loyaltyPointsDistributed ?? 0,
      suffix: ' pts',
      emptyText: '0 points distributed',
    },
  ]

  return (
    <section className="py-20 px-6">
      <div className="max-w-6xl mx-auto">
        <motion.div
          variants={sectionVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">
            Live Platform Stats
          </h2>
          <p className="text-muted-foreground text-lg">
            Real numbers from real transactions
          </p>
        </motion.div>

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {isLoading ? (
            <>
              {Array.from({ length: 6 }).map((_, i) => (
                <StatsCardSkeleton key={i} />
              ))}
            </>
          ) : (
            stats.map((stat) => (
              <motion.div key={stat.label} variants={staggerItem}>
                <Card className="border-border/50 bg-card hover:border-gold/20 transition-colors duration-300">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gold/10">
                        <stat.icon className="w-5 h-5 text-gold" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                          {stat.label}
                        </p>
                        {stat.value > 0 ? (
                          <p className="text-2xl font-bold">
                            {stat.isDecimal ? (
                              stat.value
                            ) : (
                              <AnimatedCounter value={stat.value} suffix={stat.suffix} />
                            )}
                            {stat.isDecimal && stat.suffix}
                          </p>
                        ) : (
                          <p className="text-sm text-muted-foreground italic">
                            {stat.emptyText}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </motion.div>
      </div>
    </section>
  )
}

// ─── FEATURED PRODUCTS SECTION ─────────────────────────────────────
function FeaturedProductsSection() {
  const { navigate } = useAppStore()

  const { data, isLoading } = useQuery({
    queryKey: ['featured-products'],
    queryFn: async () => {
      const res = await fetch('/api/products?featured=true&limit=4')
      const json = await res.json()
      return json.success ? json.data : null
    },
  })

  // Also fetch flash deals to cross-reference
  const { data: flashData } = useQuery({
    queryKey: ['flash-deals-ids'],
    queryFn: async () => {
      const res = await fetch('/api/flash-deals')
      const json = await res.json()
      return json.success ? json.data : null
    },
  })

  const flashDealIds = useMemo(() => {
    if (!flashData?.flashDeals) return new Set<string>()
    return new Set((flashData.flashDeals as FlashDealData[]).map((d) => d.id))
  }, [flashData])

  const flashDealMap = useMemo(() => {
    if (!flashData?.flashDeals) return new Map<string, FlashDealData>()
    const map = new Map<string, FlashDealData>()
    ;(flashData.flashDeals as FlashDealData[]).forEach((d) => map.set(d.id, d))
    return map
  }, [flashData])

  const products = (data?.products as ProductData[]) || []

  return (
    <section className="py-20 px-6 bg-accent/30">
      <div className="max-w-6xl mx-auto">
        <motion.div
          variants={sectionVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          className="flex items-end justify-between mb-12"
        >
          <div>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">
              Featured Products
            </h2>
            <p className="text-muted-foreground text-lg">
              Handpicked premium selections
            </p>
          </div>
          <Button
            variant="ghost"
            className="hidden sm:flex text-gold hover:text-gold hover:bg-gold/5"
            onClick={() => navigate('shop')}
          >
            View All
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </motion.div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <ProductCardSkeleton />
            <ProductCardSkeleton />
            <ProductCardSkeleton />
            <ProductCardSkeleton />
          </div>
        ) : products.length === 0 ? (
          <motion.div
            variants={sectionVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <Card className="border-border/50 bg-card">
              <CardContent className="py-16 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 rounded-full bg-gold/10 flex items-center justify-center mb-4">
                  <ShoppingBag className="w-7 h-7 text-gold" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No featured products yet</h3>
                <p className="text-muted-foreground text-sm max-w-sm">
                  New products are being added regularly. Check back soon for premium Blox Fruits items.
                </p>
                <Button
                  variant="outline"
                  className="mt-6 border-gold/30 text-gold hover:bg-gold/5"
                  onClick={() => navigate('shop')}
                >
                  Browse All Products
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
          >
            {products.map((product, i) => {
              const isFlash = flashDealIds.has(product.id)
              const flashInfo = flashDealMap.get(product.id)

              return (
                <motion.div key={product.id} variants={staggerItem} className="relative">
                  {isFlash && (
                    <div className="absolute top-2 right-2 z-10">
                      <Badge className="bg-red-500 text-white text-[10px] font-bold shadow-lg">
                        <Flame className="w-3 h-3 mr-0.5" />
                        FLASH DEAL
                      </Badge>
                    </div>
                  )}
                  <ProductCard
                    product={{
                      ...product,
                      priceBdt: isFlash && flashInfo
                        ? flashInfo.priceBdt
                        : product.priceBdt,
                    }}
                    index={i}
                  />
                  {isFlash && flashInfo?.originalPrice && (
                    <div className="absolute bottom-14 left-4 z-10">
                      <span className="text-xs text-muted-foreground line-through">
                        {formatPrice(flashInfo.originalPrice)}
                      </span>
                    </div>
                  )}
                </motion.div>
              )
            })}
          </motion.div>
        )}

        <div className="sm:hidden mt-6 text-center">
          <Button
            variant="outline"
            className="border-gold/30 text-gold hover:bg-gold/5"
            onClick={() => navigate('shop')}
          >
            View All Products
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>
    </section>
  )
}

// ─── FLASH DEALS SECTION ──────────────────────────────────────────
function FlashDealsSection() {
  const { navigate } = useAppStore()

  const { data, isLoading } = useQuery({
    queryKey: ['flash-deals'],
    queryFn: async () => {
      const res = await fetch('/api/flash-deals')
      const json = await res.json()
      return json.success ? json.data : null
    },
    refetchInterval: 60000, // refetch every minute to keep data fresh
  })

  const deals = (data?.flashDeals as FlashDealData[]) || []

  return (
    <section className="py-20 px-6">
      <div className="max-w-6xl mx-auto">
        <motion.div
          variants={sectionVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">
            <span className="text-orange-500">⚡</span> Flash{' '}
            <span className="text-gold-gradient">Deals</span>
          </h2>
          <p className="text-muted-foreground text-lg">
            Limited-time offers you can&apos;t miss
          </p>
        </motion.div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="border-border/50 bg-card overflow-hidden">
                <Skeleton className="aspect-[4/3]" />
                <CardContent className="p-4 space-y-2">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-8 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : deals.length === 0 ? (
          <motion.div
            variants={sectionVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <Card className="border-border/50 bg-card max-w-lg mx-auto">
              <CardContent className="py-16 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 rounded-full bg-orange-500/10 flex items-center justify-center mb-4">
                  <Timer className="w-7 h-7 text-orange-500" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No active flash deals</h3>
                <p className="text-muted-foreground text-sm max-w-sm">
                  Flash deals appear here when available. Check back soon for exciting limited-time offers!
                </p>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {deals.map((deal) => (
              <motion.div key={deal.id} variants={staggerItem}>
                <Card className="border-orange-500/20 bg-card hover:border-orange-500/40 transition-colors duration-300 overflow-hidden">
                  {/* Card image area */}
                  <div className="relative aspect-[4/3] bg-gradient-to-br from-orange-500/5 via-red-500/5 to-gold/5 overflow-hidden">
                    {(() => {
                      let dealImages: string[] = []
                      try {
                        const parsed = JSON.parse(((deal as any).images as string) || '[]')
                        if (Array.isArray(parsed)) dealImages = parsed
                      } catch { /* empty */ }
                      return dealImages.length > 0 ? (
                        <img src={dealImages[0]} alt={deal.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <ShoppingBag className="w-12 h-12 text-muted-foreground/20" />
                        </div>
                      )
                    })()}
                    {/* Discount badge */}
                    <div className="absolute top-3 left-3">
                      <Badge className="bg-red-500 text-white text-xs font-bold shadow-md">
                        -{deal.discountPercentage}%
                      </Badge>
                    </div>
                    {/* Flash deal badge */}
                    <div className="absolute top-3 right-3">
                      <Badge className="bg-orange-500 text-white text-[10px] font-semibold shadow-md">
                        <Flame className="w-3 h-3 mr-0.5" />
                        FLASH
                      </Badge>
                    </div>
                  </div>

                  <CardContent className="p-4">
                    {/* Category */}
                    <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider mb-1">
                      {CATEGORY_LABELS[deal.category] || deal.category}
                    </p>

                    {/* Name */}
                    <h3 className="font-semibold text-sm leading-tight mb-3 line-clamp-2">
                      {deal.name}
                    </h3>

                    {/* Pricing */}
                    <div className="flex items-baseline gap-2 mb-3">
                      <span className="text-lg font-bold text-gold">
                        {formatPrice(deal.priceBdt)}
                      </span>
                      {deal.originalPrice && (
                        <span className="text-sm text-muted-foreground line-through">
                          {formatPrice(deal.originalPrice)}
                        </span>
                      )}
                    </div>

                    {/* Countdown */}
                    <div className="mb-4">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">
                        Ends in
                      </p>
                      <CountdownTimer targetDate={deal.flashDealEndsAt} />
                    </div>

                    {/* CTA */}
                    <Button
                      className="w-full bg-gold hover:bg-gold/90 text-gold-foreground font-semibold h-10"
                      onClick={() => navigate('product', deal.id)}
                    >
                      <Zap className="w-4 h-4 mr-1.5" />
                      Grab Deal
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </section>
  )
}

// ─── WHY CHOOSE US SECTION ─────────────────────────────────────────
function WhyChooseUsSection() {
  const features = [
    {
      icon: Shield,
      title: 'Secure Payments',
      description: 'Your transactions are protected with verified payment methods and encrypted processing.',
    },
    {
      icon: Zap,
      title: 'Fast Delivery',
      description: 'Most orders are delivered within minutes. Our team ensures swift, reliable service.',
    },
    {
      icon: CheckCircle,
      title: 'Trusted Service',
      description: 'Hundreds of completed orders with a proven track record of customer satisfaction.',
    },
    {
      icon: Eye,
      title: 'Manual Quality Control',
      description: 'Every product is manually verified before delivery to ensure the highest quality.',
    },
    {
      icon: HeadphonesIcon,
      title: 'Premium Support',
      description: 'Dedicated support team available to help you with any questions or concerns.',
    },
    {
      icon: Gift,
      title: 'Loyalty Rewards',
      description: 'Earn points with every purchase and redeem them for discounts on future orders.',
    },
  ]

  return (
    <section className="py-20 px-6 bg-accent/30">
      <div className="max-w-6xl mx-auto">
        <motion.div
          variants={sectionVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">
            Why Choose <span className="text-gold-gradient">BloxVault</span>
          </h2>
          <p className="text-muted-foreground text-lg">
            Built on trust, delivered with excellence
          </p>
        </motion.div>

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {features.map((feature) => (
            <motion.div key={feature.title} variants={staggerItem}>
              <Card className="glass border-border/30 hover:border-gold/20 transition-colors duration-300 h-full">
                <CardContent className="p-6">
                  <div className="w-10 h-10 rounded-lg bg-gold/10 flex items-center justify-center mb-4">
                    <feature.icon className="w-5 h-5 text-gold" />
                  </div>
                  <h3 className="font-semibold text-base mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

// ─── LOYALTY PROGRAM SECTION ──────────────────────────────────────
function LoyaltyProgramSection() {
  const { navigate, isAuthenticated } = useAppStore()

  const { data: loyaltyData } = useQuery({
    queryKey: ['loyalty-home'],
    queryFn: async () => {
      const res = await fetch('/api/loyalty')
      const json = await res.json()
      return json.success ? (json.data as LoyaltyData) : null
    },
    enabled: isAuthenticated,
  })

  return (
    <section className="py-20 px-6">
      <div className="max-w-4xl mx-auto">
        <motion.div
          variants={sectionVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          className="text-center mb-10"
        >
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">
            Earn While You <span className="text-gold-gradient">Shop</span>
          </h2>
          <p className="text-muted-foreground text-lg">
            Every purchase earns you loyalty points
          </p>
        </motion.div>

        <motion.div
          variants={sectionVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
        >
          <Card className="border-gold/20 bg-card gold-glow-subtle overflow-hidden relative">
            <div className="absolute inset-0 cinematic-gradient pointer-events-none" />

            <CardContent className="relative z-10 py-12 px-8 sm:px-12">
              <div className="flex flex-col items-center text-center">
                {/* Animated points icon */}
                <motion.div
                  className="w-20 h-20 rounded-full bg-gold/10 flex items-center justify-center mb-6 gold-glow-subtle"
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <Gift className="w-10 h-10 text-gold" />
                </motion.div>

                {/* Points info */}
                <div className="space-y-4 mb-8">
                  <div className="flex items-center justify-center gap-2">
                    <CircleDollarSign className="w-5 h-5 text-gold" />
                    <span className="text-2xl font-bold">
                      1 Point per{' '}
                      <span className="text-gold-gradient">৳100</span> spent
                    </span>
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <Award className="w-5 h-5 text-gold" />
                    <span className="text-lg text-muted-foreground">
                      Each point = <span className="text-gold font-semibold">৳1</span> discount
                    </span>
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <Sparkles className="w-5 h-5 text-gold" />
                    <span className="text-lg text-muted-foreground">
                      <span className="text-gold font-semibold">50 Bonus Points</span> on Signup
                    </span>
                  </div>
                </div>

                {/* Authenticated user's points balance */}
                {isAuthenticated && loyaltyData && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-6"
                  >
                    <Card className="border-gold/20 bg-gold/5 inline-block">
                      <CardContent className="p-4">
                        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                          Your Points Balance
                        </p>
                        <p className="text-3xl font-bold text-gold">
                          {loyaltyData.balance.toLocaleString()}
                          <span className="text-sm text-gold/70 ml-1">pts</span>
                        </p>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}

                {/* CTA */}
                <Button
                  size="lg"
                  className="bg-gold hover:bg-gold/90 text-gold-foreground font-semibold px-10 h-12 gold-glow-subtle"
                  onClick={() => navigate(isAuthenticated ? 'dashboard' : 'signup')}
                >
                  {isAuthenticated ? 'View Dashboard' : 'Start Earning'}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </section>
  )
}

// ─── REAL-TIME ACTIVITY FEED ───────────────────────────────────────
function ActivityFeedSection() {
  const { data, isLoading } = useQuery({
    queryKey: ['stats-activity'],
    queryFn: async () => {
      const res = await fetch('/api/stats?includeActivity=true&activityLimit=5')
      const json = await res.json()
      return json.success ? (json.data as StatsData) : null
    },
  })

  const activities = data?.recentActivity || []

  const statusLabels: Record<string, string> = {
    confirmed: 'confirmed',
    processing: 'is being processed',
    delivered: 'received',
  }

  return (
    <section className="py-20 px-6 bg-accent/30">
      <div className="max-w-6xl mx-auto">
        <motion.div
          variants={sectionVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">
            Recent Activity
          </h2>
          <p className="text-muted-foreground text-lg">
            Live updates from our marketplace
          </p>
        </motion.div>

        {isLoading ? (
          <div className="max-w-2xl mx-auto space-y-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="border-border/50 bg-card">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Skeleton className="w-9 h-9 rounded-full" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/3" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : activities.length === 0 ? (
          <motion.div
            variants={sectionVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <Card className="border-border/50 bg-card max-w-2xl mx-auto">
              <CardContent className="py-12 flex flex-col items-center justify-center text-center">
                <div className="w-14 h-14 rounded-full bg-gold/10 flex items-center justify-center mb-4">
                  <Activity className="w-6 h-6 text-gold" />
                </div>
                <h3 className="text-lg font-semibold mb-1">No recent activity</h3>
                <p className="text-muted-foreground text-sm">
                  Activity will appear here as orders are placed and fulfilled.
                </p>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            className="max-w-2xl mx-auto space-y-3"
          >
            {activities.map((activity) => (
              <motion.div key={activity.id} variants={staggerItem}>
                <Card className="border-border/50 bg-card hover:border-gold/20 transition-colors duration-300">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gold/10 flex items-center justify-center shrink-0">
                        <Package className="w-4 h-4 text-gold" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm leading-snug">
                          <span className="font-semibold">{activity.username}</span>{' '}
                          {statusLabels[activity.status] || 'ordered'}{' '}
                          <span className="text-gold font-medium">{activity.productName}</span>
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {timeAgo(activity.createdAt)}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className="shrink-0 text-[10px] bg-green-500/10 text-green-500 border-green-500/20"
                      >
                        {activity.status === 'delivered' ? 'Delivered' : activity.status === 'processing' ? 'Processing' : 'Confirmed'}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </section>
  )
}

// ─── REVIEWS SECTION ───────────────────────────────────────────────
function ReviewsSection() {
  const { data, isLoading } = useQuery({
    queryKey: ['home-reviews'],
    queryFn: async () => {
      const res = await fetch('/api/reviews?limit=6')
      const json = await res.json()
      return json.success ? json.data : null
    },
  })

  const reviews = (data?.reviews as ReviewData[]) || []

  function StarRating({ rating }: { rating: number }) {
    return (
      <div className="flex items-center gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className={`w-3.5 h-3.5 ${
              i < rating ? 'fill-gold text-gold' : 'text-border'
            }`}
          />
        ))}
      </div>
    )
  }

  function getInitials(username: string) {
    return username.slice(0, 2).toUpperCase()
  }

  return (
    <section className="py-20 px-6">
      <div className="max-w-6xl mx-auto">
        <motion.div
          variants={sectionVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">
            Customer Reviews
          </h2>
          <p className="text-muted-foreground text-lg">
            Verified feedback from real customers
          </p>
        </motion.div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <ReviewCardSkeleton />
            <ReviewCardSkeleton />
            <ReviewCardSkeleton />
          </div>
        ) : reviews.length === 0 ? (
          <motion.div
            variants={sectionVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <Card className="border-border/50 bg-card max-w-xl mx-auto">
              <CardContent className="py-12 flex flex-col items-center justify-center text-center">
                <div className="w-14 h-14 rounded-full bg-gold/10 flex items-center justify-center mb-4">
                  <Star className="w-6 h-6 text-gold" />
                </div>
                <h3 className="text-lg font-semibold mb-1">No reviews yet</h3>
                <p className="text-muted-foreground text-sm">
                  Be the first to share your experience!
                </p>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {reviews.map((review) => (
              <motion.div key={review.id} variants={staggerItem}>
                <Card className="border-border/50 bg-card hover:border-gold/20 transition-colors duration-300 h-full">
                  <CardContent className="p-6 flex flex-col h-full">
                    {/* User info */}
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center text-sm font-semibold text-gold">
                        {review.user.avatar ? (
                          <img
                            src={review.user.avatar}
                            alt={review.user.username}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          getInitials(review.user.username)
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-semibold truncate">
                            {review.user.username}
                          </p>
                          {review.verifiedPurchase && (
                            <BadgeCheck className="w-4 h-4 text-gold shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {timeAgo(review.createdAt)}
                        </p>
                      </div>
                    </div>

                    {/* Rating */}
                    <StarRating rating={review.rating} />

                    {/* Review text */}
                    <p className="text-sm text-foreground/80 leading-relaxed mt-3 flex-1 line-clamp-4">
                      {review.review}
                    </p>

                    {/* Product name */}
                    {review.product && (
                      <div className="mt-4 pt-3 border-t border-border/30">
                        <p className="text-xs text-muted-foreground">
                          Purchased:{' '}
                          <span className="text-foreground font-medium">
                            {review.product.name}
                          </span>
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </section>
  )
}

// ─── FAQ SECTION ───────────────────────────────────────────────────
function FaqSection() {
  const faqs = [
    {
      question: 'How does delivery work?',
      answer:
        'After your payment is confirmed, our team processes your order and delivers the item directly to your Blox Fruits account. You will receive real-time status updates throughout the process. Most deliveries are completed within minutes to a few hours.',
    },
    {
      question: 'What payment methods do you accept?',
      answer:
        'We accept bKash, Nagad, and Rocket for BDT payments, as well as USDT, BTC, ETH, and BNB for cryptocurrency payments. All transactions are processed securely.',
    },
    {
      question: 'Is my account safe?',
      answer:
        'Absolutely. We take account security very seriously. Our delivery process is designed to be safe and does not require your password. We only need your in-game username to deliver items. Your account credentials are never requested.',
    },
    {
      question: 'How long does delivery take?',
      answer:
        'Delivery times vary by product type, but most orders are completed within 5-30 minutes after payment confirmation. Some complex orders like account transfers or raid services may take longer. You will be notified of any delays.',
    },
    {
      question: 'What if there is an issue with my order?',
      answer:
        'If you experience any issues, you can open a support ticket from your dashboard. Our team investigates all reports promptly and works to resolve any problems as quickly as possible. We also offer refunds in qualifying cases.',
    },
    {
      question: 'Do you offer refunds?',
      answer:
        'Yes, we offer refunds for orders that cannot be fulfilled due to stock issues or technical problems. If your order has already been delivered, refund eligibility depends on the circumstances. Please contact our support team for assistance.',
    },
  ]

  return (
    <section className="py-20 px-6 bg-accent/30">
      <div className="max-w-3xl mx-auto">
        <motion.div
          variants={sectionVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">
            Frequently Asked Questions
          </h2>
          <p className="text-muted-foreground text-lg">
            Everything you need to know
          </p>
        </motion.div>

        <motion.div
          variants={sectionVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
        >
          <Card className="border-border/50 bg-card">
            <CardContent className="p-6">
              <Accordion type="single" collapsible className="w-full">
                {faqs.map((faq, i) => (
                  <AccordionItem key={i} value={`faq-${i}`}>
                    <AccordionTrigger className="text-left text-sm font-medium hover:text-gold transition-colors">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </section>
  )
}

// ─── CTA SECTION ───────────────────────────────────────────────────
function CtaSection() {
  const { navigate } = useAppStore()

  return (
    <section className="py-24 px-6">
      <div className="max-w-4xl mx-auto">
        <motion.div
          variants={sectionVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
        >
          <Card className="border-gold/20 bg-card gold-glow-subtle overflow-hidden relative">
            {/* Background decoration */}
            <div className="absolute inset-0 cinematic-gradient pointer-events-none" />

            <CardContent className="relative z-10 py-16 px-8 sm:px-12 text-center">
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
                Ready to enhance your{' '}
                <span className="text-gold-gradient">Blox Fruits</span>{' '}
                experience?
              </h2>
              <p className="text-muted-foreground text-lg mb-8 max-w-xl mx-auto">
                Join hundreds of satisfied customers and get premium items delivered to your account.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button
                  size="lg"
                  className="bg-gold hover:bg-gold/90 text-gold-foreground font-semibold px-10 h-13 text-base gold-glow-subtle"
                  onClick={() => navigate('shop')}
                >
                  <ShoppingBag className="w-5 h-5 mr-2" />
                  Browse Shop
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-gold/30 text-gold hover:bg-gold/5 font-semibold px-8 h-13 text-base"
                  onClick={() => navigate('robux')}
                >
                  <Coins className="w-5 h-5 mr-2" />
                  Buy Robux
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </section>
  )
}

// ─── MAIN HOME VIEW ────────────────────────────────────────────────
export function HomeView() {
  return (
    <div className="min-h-screen">
      <AnnouncementBanner />
      <HeroSection />
      <RobuxQuickAccessSection />
      <WhyChooseUsSection />
      <ReviewsSection />
      <LiveStatsSection />
      <FeaturedProductsSection />
      <FlashDealsSection />
      <LoyaltyProgramSection />
      <ActivityFeedSection />
      <FaqSection />
      <CtaSection />
    </div>
  )
}
