'use client'

import { useAppStore } from '@/lib/store'
import { CATEGORY_LABELS, RARITY_TEXT_COLORS, RARITY_BORDER_COLORS, formatPrice, formatCryptoPrice } from '@/lib/constants'
import { motion } from 'framer-motion'
import { ShoppingBag, Clock, Star, Eye } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

function parseImages(imagesStr: unknown): string[] {
  if (typeof imagesStr !== 'string') return []
  try {
    const parsed = JSON.parse(imagesStr)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

interface ProductCardProps {
  product: {
    id: string
    name: string
    slug: string
    category: string
    stock: number
    priceBdt: number
    priceCrypto: number | null
    originalPrice?: number | null
    rarity: string | null
    featured: boolean
    images?: string
    _count?: { reviews: number }
    avgRating?: number
  }
  index?: number
}

export function ProductCard({ product, index = 0 }: ProductCardProps) {
  const { navigate } = useAppStore()
  const images = parseImages(product.images)
  const primaryImage = images.length > 0 ? images[0] : null

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
    >
      <Card 
        className={`group relative overflow-hidden border-border/50 bg-card hover:border-gold/30 transition-all duration-500 cursor-pointer ${
          product.rarity ? RARITY_BORDER_COLORS[product.rarity] || '' : ''
        }`}
        onClick={() => navigate('product', product.id)}
      >
        {/* Image area */}
        <div className="relative aspect-[4/3] bg-gradient-to-br from-accent/50 to-accent/20 overflow-hidden">
          {primaryImage ? (
            <img
              src={primaryImage}
              alt={product.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <ShoppingBag className="w-12 h-12 text-muted-foreground/30" />
            </div>
          )}
          
          {/* Badges */}
          <div className="absolute top-3 left-3 flex flex-col gap-1.5">
            {product.featured && (
              <Badge className="bg-gold text-gold-foreground text-[10px] font-semibold">
                Featured
              </Badge>
            )}
            {/* Discount badge when originalPrice present */}
            {product.originalPrice && product.originalPrice > product.priceBdt && (
              (() => {
                const discount = Math.round(((product.originalPrice - product.priceBdt) / product.originalPrice) * 100)
                return (
                  <Badge className="bg-red-500 text-white text-[11px] font-bold">
                    -{discount}%
                  </Badge>
                )
              })()
            )}
            {product.rarity && (
              <Badge variant="outline" className={`text-[10px] bg-background/60 backdrop-blur-sm ${RARITY_TEXT_COLORS[product.rarity] || ''}`}>
                {product.rarity.charAt(0).toUpperCase() + product.rarity.slice(1)}
              </Badge>
            )}
          </div>

          {/* Image count badge */}
          {images.length > 1 && (
            <div className="absolute top-3 right-3">
              <Badge variant="outline" className="bg-background/60 backdrop-blur-sm text-[10px]">
                {images.length} photos
              </Badge>
            </div>
          )}

          {/* Quick action overlay */}
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-3">
            <Button
              size="sm"
              className="bg-gold hover:bg-gold/90 text-gold-foreground"
              onClick={(e) => { e.stopPropagation(); navigate('product', product.id) }}
            >
              <Eye className="w-4 h-4 mr-1" />
              View
            </Button>
          </div>

          {/* Stock indicator */}
          {product.stock <= 3 && product.stock > 0 && (
            <div className="absolute bottom-3 right-3">
              <Badge variant="outline" className="bg-orange-500/10 text-orange-500 border-orange-500/20 text-[10px]">
                Only {product.stock} left
              </Badge>
            </div>
          )}
          {product.stock === 0 && (
            <div className="absolute bottom-3 right-3">
              <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20 text-[10px]">
                Out of Stock
              </Badge>
            </div>
          )}
        </div>

        <CardContent className="p-4">
          {/* Category */}
          <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider mb-1">
            {CATEGORY_LABELS[product.category] || product.category}
          </p>
          
          {/* Name */}
          <h3 className="font-semibold text-sm leading-tight mb-2 group-hover:text-gold transition-colors line-clamp-2">
            {product.name}
          </h3>

          {/* Rating & Reviews */}
          <div className="flex items-center gap-1.5 mb-3">
            {product.avgRating && product.avgRating > 0 ? (
              <>
                <div className="flex items-center gap-0.5">
                  <Star className="w-3.5 h-3.5 fill-gold text-gold" />
                  <span className="text-xs font-medium">{product.avgRating.toFixed(1)}</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  ({product._count?.reviews || 0})
                </span>
              </>
            ) : (
              <span className="text-xs text-muted-foreground">No reviews yet</span>
            )}
          </div>

          {/* Price */}
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-lg font-bold text-gold">{formatPrice(product.priceBdt)}</span>
                {product.originalPrice && product.originalPrice > product.priceBdt && (
                  <span className="text-xs text-muted-foreground line-through">{formatPrice(product.originalPrice)}</span>
                )}
              </div>
              {product.priceCrypto && (
                <span className="text-xs text-muted-foreground ml-2">
                  {formatCryptoPrice(product.priceCrypto)} USDT
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              <span>Fast</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
