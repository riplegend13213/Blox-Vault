'use client'

import { useAppStore } from '@/lib/store'
import { CATEGORY_LABELS, RARITY_TEXT_COLORS, RARITY_BORDER_COLORS, formatPrice, formatCryptoPrice } from '@/lib/constants'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Heart,
  Trash2,
  ShoppingBag,
  Eye,
  Star,
  Clock,
  Loader2,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'

interface WishlistProduct {
  id: string
  name: string
  slug: string
  category: string
  images: string
  priceBdt: number
  priceCrypto: number | null
  rarity: string | null
  stock: number
  active: boolean
}

interface WishlistItem {
  id: string
  productId: string
  createdAt: string
  product: WishlistProduct
}

interface WishlistResponse {
  success: boolean
  data: { wishlist: WishlistItem[] }
}

export function WishlistView() {
  const { user, isAuthenticated, navigate } = useAppStore()
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery<WishlistResponse>({
    queryKey: ['user-wishlist'],
    queryFn: () => fetch('/api/wishlist').then((r) => r.json()),
    enabled: isAuthenticated,
  })

  const removeMutation = useMutation({
    mutationFn: async (productId: string) => {
      const res = await fetch(`/api/wishlist?productId=${productId}`, { method: 'DELETE' })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      return data
    },
    onSuccess: () => {
      toast.success('Removed from wishlist')
      queryClient.invalidateQueries({ queryKey: ['user-wishlist'] })
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to remove item')
    },
  })

  if (!isAuthenticated || !user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Heart className="w-16 h-16 text-muted-foreground/40" />
        <h2 className="text-xl font-semibold">Please sign in</h2>
        <p className="text-muted-foreground text-sm">You need to be logged in to view your wishlist.</p>
        <Button onClick={() => navigate('login')} className="bg-gold hover:bg-gold/90 text-gold-foreground">
          Sign In
        </Button>
      </div>
    )
  }

  const wishlist = data?.data?.wishlist || []

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
          <h1 className="text-2xl sm:text-3xl font-bold">
            <Heart className="w-7 h-7 inline-block mr-2 text-pink-400 -mt-1" />
            Wishlist
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {wishlist.length > 0 ? `${wishlist.length} item${wishlist.length !== 1 ? 's' : ''} saved` : 'Your saved items'}
          </p>
        </div>
        <Button onClick={() => navigate('shop')} className="bg-gold hover:bg-gold/90 text-gold-foreground">
          <ShoppingBag className="w-4 h-4 mr-2" />
          Shop
        </Button>
      </div>

      {/* Wishlist Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-64 w-full rounded-xl" />
          ))}
        </div>
      ) : wishlist.length === 0 ? (
        <Card className="border-border/50 bg-card">
          <CardContent className="p-12 text-center">
            <Heart className="w-16 h-16 text-muted-foreground/20 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Your wishlist is empty</h3>
            <p className="text-muted-foreground text-sm mb-6">
              Save items you&apos;re interested in and come back to them later.
            </p>
            <Button onClick={() => navigate('shop')} className="bg-gold hover:bg-gold/90 text-gold-foreground">
              <ShoppingBag className="w-4 h-4 mr-2" />
              Browse Shop
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
            {wishlist.map((item, index) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3, delay: index * 0.04 }}
              >
                <Card
                  className={`group relative overflow-hidden border-border/50 bg-card hover:border-gold/30 transition-all duration-500 cursor-pointer ${
                    item.product.rarity ? RARITY_BORDER_COLORS[item.product.rarity] || '' : ''
                  }`}
                  onClick={() => navigate('product', item.product.id)}
                >
                  {/* Image placeholder */}
                  <div className="relative aspect-[4/3] bg-gradient-to-br from-accent/50 to-accent/20 overflow-hidden">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <ShoppingBag className="w-12 h-12 text-muted-foreground/30" />
                    </div>

                    {/* Rarity badge */}
                    {item.product.rarity && (
                      <div className="absolute top-3 left-3">
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${RARITY_TEXT_COLORS[item.product.rarity] || ''}`}
                        >
                          {item.product.rarity.charAt(0).toUpperCase() + item.product.rarity.slice(1)}
                        </Badge>
                      </div>
                    )}

                    {/* Remove button */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 hover:bg-red-500/80 text-white hover:text-white transition-colors"
                      onClick={(e) => {
                        e.stopPropagation()
                        removeMutation.mutate(item.product.id)
                      }}
                      disabled={removeMutation.isPending}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>

                    {/* Stock indicator */}
                    {item.product.stock === 0 && (
                      <div className="absolute bottom-3 left-3">
                        <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20 text-[10px]">
                          Out of Stock
                        </Badge>
                      </div>
                    )}
                    {item.product.stock > 0 && item.product.stock <= 3 && (
                      <div className="absolute bottom-3 left-3">
                        <Badge variant="outline" className="bg-orange-500/10 text-orange-500 border-orange-500/20 text-[10px]">
                          Only {item.product.stock} left
                        </Badge>
                      </div>
                    )}
                  </div>

                  <CardContent className="p-4">
                    {/* Category */}
                    <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider mb-1">
                      {CATEGORY_LABELS[item.product.category] || item.product.category}
                    </p>

                    {/* Name */}
                    <h3 className="font-semibold text-sm leading-tight mb-3 group-hover:text-gold transition-colors line-clamp-2">
                      {item.product.name}
                    </h3>

                    {/* Price & Actions */}
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-lg font-bold text-gold">
                          {formatPrice(item.product.priceBdt)}
                        </span>
                        {item.product.priceCrypto && (
                          <span className="text-xs text-muted-foreground ml-2">
                            {formatCryptoPrice(item.product.priceCrypto)} USDT
                          </span>
                        )}
                      </div>
                      <Button
                        size="sm"
                        className="bg-gold hover:bg-gold/90 text-gold-foreground"
                        onClick={(e) => {
                          e.stopPropagation()
                          navigate('product', item.product.id)
                        }}
                      >
                        <Eye className="w-3.5 h-3.5 mr-1" />
                        View
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  )
}
