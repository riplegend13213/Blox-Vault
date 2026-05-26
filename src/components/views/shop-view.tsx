'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAppStore } from '@/lib/store'
import { CATEGORY_LABELS } from '@/lib/constants'
import { ProductCard } from '@/components/shared/product-card'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  SlidersHorizontal,
  X,
  Package,
  ChevronDown,
  Sparkles,
  ArrowUpDown,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'featured', label: 'Featured' },
  { value: 'price_low', label: 'Price: Low to High' },
  { value: 'price_high', label: 'Price: High to Low' },
  { value: 'name_asc', label: 'Name: A-Z' },
  { value: 'name_desc', label: 'Name: Z-A' },
] as const

type SortValue = (typeof SORT_OPTIONS)[number]['value']

export function ShopView() {
  const { searchQuery, setSearchQuery, selectedCategory, setSelectedCategory } =
    useAppStore()
  const [sort, setSort] = useState<SortValue>('newest')
  const [localSearch, setLocalSearch] = useState(searchQuery)

  // Build query params
  const queryParams = useMemo(() => {
    const params = new URLSearchParams()
    if (selectedCategory && selectedCategory !== 'all') {
      params.set('category', selectedCategory)
    }
    if (searchQuery) {
      params.set('search', searchQuery)
    }
    if (sort === 'featured') {
      params.set('featured', 'true')
      params.set('sort', 'newest')
    } else {
      params.set('sort', sort)
    }
    params.set('limit', '24')
    return params.toString()
  }, [selectedCategory, searchQuery, sort])

  // Fetch products
  const {
    data,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['products', queryParams],
    queryFn: async () => {
      const res = await fetch(`/api/products?${queryParams}`)
      if (!res.ok) throw new Error('Failed to fetch products')
      return res.json()
    },
  })

  const products = data?.data?.products ?? []
  const pagination = data?.data?.pagination

  // Active filter badges
  const activeFilters = useMemo(() => {
    const filters: { key: string; label: string; onRemove: () => void }[] = []
    if (selectedCategory && selectedCategory !== 'all') {
      filters.push({
        key: 'category',
        label: CATEGORY_LABELS[selectedCategory] || selectedCategory,
        onRemove: () => setSelectedCategory('all'),
      })
    }
    if (searchQuery) {
      filters.push({
        key: 'search',
        label: `"${searchQuery}"`,
        onRemove: () => {
          setSearchQuery('')
          setLocalSearch('')
        },
      })
    }
    return filters
  }, [selectedCategory, searchQuery, setSearchQuery, setSelectedCategory])

  // Handle search with debounce
  const handleSearchChange = (value: string) => {
    setLocalSearch(value)
  }

  const handleSearchSubmit = () => {
    setSearchQuery(localSearch)
  }

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearchSubmit()
    }
  }

  const clearAllFilters = () => {
    setSearchQuery('')
    setLocalSearch('')
    setSelectedCategory('all')
    setSort('newest')
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="border-b border-border/50 bg-card/30 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <h1 className="text-3xl font-bold tracking-tight mb-2">Shop</h1>
            <p className="text-muted-foreground">
              Browse our premium collection of Blox Fruits items
            </p>
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Search & Filter Bar */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="mb-6 space-y-4"
        >
          {/* Search Row */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                value={localSearch}
                onChange={(e) => handleSearchChange(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                onBlur={handleSearchSubmit}
                className="pl-10 bg-card border-border/50 h-11"
              />
              {localSearch && (
                <button
                  onClick={() => {
                    setLocalSearch('')
                    setSearchQuery('')
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="flex gap-3">
              <Select
                value={sort}
                onValueChange={(v) => setSort(v as SortValue)}
              >
                <SelectTrigger className="w-[180px] bg-card border-border/50 h-11">
                  <ArrowUpDown className="w-4 h-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  {SORT_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Category Filter Buttons */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant={selectedCategory === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory('all')}
              className={
                selectedCategory === 'all'
                  ? 'bg-gold text-gold-foreground hover:bg-gold/90'
                  : 'border-border/50'
              }
            >
              <Sparkles className="w-3.5 h-3.5 mr-1.5" />
              All
            </Button>
            {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
              <Button
                key={key}
                variant={selectedCategory === key ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(key)}
                className={
                  selectedCategory === key
                    ? 'bg-gold text-gold-foreground hover:bg-gold/90'
                    : 'border-border/50'
                }
              >
                {label}
              </Button>
            ))}
          </div>

          {/* Active Filter Badges */}
          <AnimatePresence>
            {activeFilters.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center gap-2 flex-wrap"
              >
                <span className="text-xs text-muted-foreground font-medium">
                  Active filters:
                </span>
                {activeFilters.map((filter) => (
                  <motion.div
                    key={filter.key}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                  >
                    <Badge
                      variant="secondary"
                      className="gap-1.5 pr-1.5 bg-gold/10 text-gold border-gold/20"
                    >
                      {filter.label}
                      <button
                        onClick={filter.onRemove}
                        className="ml-0.5 rounded-full p-0.5 hover:bg-gold/20 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  </motion.div>
                ))}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAllFilters}
                  className="text-xs text-muted-foreground hover:text-foreground h-6 px-2"
                >
                  Clear all
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Results Count */}
        <div className="mb-4 flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {isLoading ? (
              <Skeleton className="h-4 w-32" />
            ) : (
              <>
                Showing{' '}
                <span className="text-foreground font-medium">
                  {products.length}
                </span>{' '}
                {products.length === 1 ? 'product' : 'products'}
                {pagination && pagination.total > products.length && (
                  <> of {pagination.total}</>
                )}
              </>
            )}
          </div>
        </div>

        {/* Product Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <Card
                key={i}
                className="overflow-hidden border-border/50 bg-card"
              >
                <Skeleton className="aspect-[4/3] w-full" />
                <CardContent className="p-4 space-y-3">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-24" />
                  <div className="flex justify-between">
                    <Skeleton className="h-6 w-20" />
                    <Skeleton className="h-4 w-12" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : isError ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-20 text-center"
          >
            <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
              <Package className="w-8 h-8 text-red-500" />
            </div>
            <h3 className="text-lg font-semibold mb-2">
              Failed to load products
            </h3>
            <p className="text-muted-foreground text-sm mb-4">
              {(error as Error)?.message || 'Something went wrong'}
            </p>
            <Button
              variant="outline"
              onClick={() => window.location.reload()}
            >
              Try again
            </Button>
          </motion.div>
        ) : products.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-20 text-center"
          >
            <div className="w-16 h-16 rounded-full bg-accent flex items-center justify-center mb-4">
              <Package className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No products found</h3>
            <p className="text-muted-foreground text-sm mb-4">
              Try adjusting your search or filters to find what you&apos;re
              looking for
            </p>
            <Button variant="outline" onClick={clearAllFilters}>
              Clear all filters
            </Button>
          </motion.div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={queryParams}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6"
            >
              {products.map(
                (product: Record<string, unknown>, index: number) => (
                  <ProductCard
                    key={product.id as string}
                    product={product as Parameters<typeof ProductCard>[0]['product']}
                    index={index}
                  />
                )
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  )
}
