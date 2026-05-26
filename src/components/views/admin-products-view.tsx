'use client'

import { useAppStore } from '@/lib/store'
import { CATEGORY_LABELS, RARITY_TEXT_COLORS, formatPrice, formatCryptoPrice } from '@/lib/constants'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus,
  Search,
  Edit3,
  Star,
  StarOff,
  Power,
  Package,
  X,
  Loader2,
  ImagePlus,
  Trash2,
  Upload,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
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
import { useState, useMemo, useRef } from 'react'

interface Product {
  id: string
  name: string
  slug: string
  description: string
  category: string
  stock: number
  priceBdt: number
  priceCrypto: number | null
  rarity: string | null
  featured: boolean
  active: boolean
  deliveryInfo: string | null
  images: string
  createdAt: string
  avgRating?: number
  reviewCount?: number
}

interface ProductFormData {
  name: string
  slug: string
  description: string
  category: string
  stock: number
  priceBdt: number
  priceCrypto: number | null
  rarity: string
  featured: boolean
  active: boolean
  deliveryInfo: string
  images: string[]
}

const emptyForm: ProductFormData = {
  name: '',
  slug: '',
  description: '',
  category: 'permanent_fruit',
  stock: 0,
  priceBdt: 0,
  priceCrypto: null,
  rarity: 'common',
  featured: false,
  active: true,
  deliveryInfo: '',
  images: [],
}

const RARITY_OPTIONS = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythical'] as const

export function AdminProductsView() {
  const { isAdmin } = useAppStore()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [form, setForm] = useState<ProductFormData>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [discountOpen, setDiscountOpen] = useState(false)
  const [discountProduct, setDiscountProduct] = useState<Product | null>(null)
  const [discountPercent, setDiscountPercent] = useState<number>(0)
  const [discountExpiresAt, setDiscountExpiresAt] = useState<string>('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { data: productsData, isLoading } = useQuery({
    queryKey: ['admin-products', search, categoryFilter],
    queryFn: async () => {
      const params = new URLSearchParams()
      params.set('limit', '50')
      if (search) params.set('search', search)
      if (categoryFilter !== 'all') params.set('category', categoryFilter)
      const res = await fetch(`/api/products?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to fetch products')
      const json = await res.json()
      return json.data as { products: Product[]; pagination: { total: number } }
    },
    enabled: isAdmin,
  })

  const products = useMemo(() => {
    if (!productsData?.products) return []
    return productsData.products
  }, [productsData])

  const slugify = (text: string) =>
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')

  const parseImages = (imagesStr: string): string[] => {
    try {
      const parsed = JSON.parse(imagesStr)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }

  const openAddModal = () => {
    setEditingProduct(null)
    setForm(emptyForm)
    setModalOpen(true)
  }

  const openEditModal = (product: Product) => {
    setEditingProduct(product)
    setForm({
      name: product.name,
      slug: product.slug,
      description: product.description,
      category: product.category,
      stock: product.stock,
      priceBdt: product.priceBdt,
      priceCrypto: product.priceCrypto,
      rarity: product.rarity || 'common',
      featured: product.featured,
      active: product.active,
      deliveryInfo: product.deliveryInfo || '',
      images: parseImages(product.images),
    })
    setModalOpen(true)
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploadingImage(true)
    try {
      for (const file of Array.from(files)) {
        // Validate file
        if (!file.type.startsWith('image/')) {
          toast.error(`${file.name} is not an image file`)
          continue
        }
        if (file.size > 5 * 1024 * 1024) {
          toast.error(`${file.name} is too large (max 5MB)`)
          continue
        }

        const formData = new FormData()
        formData.append('image', file)

        const res = await fetch('/api/admin/upload', {
          method: 'POST',
          body: formData,
        })

        const data = await res.json()
        if (!res.ok || !data.success) {
          toast.error(data.error || `Failed to upload ${file.name}`)
          continue
        }

        setForm((prev) => ({
          ...prev,
          images: [...prev.images, data.data.url],
        }))
        toast.success(`${file.name} uploaded successfully`)
      }
    } catch (error) {
      toast.error('Failed to upload image')
    } finally {
      setUploadingImage(false)
      // Reset file input
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const removeImage = (index: number) => {
    setForm((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }))
  }

  const moveImage = (index: number, direction: 'left' | 'right') => {
    setForm((prev) => {
      const newImages = [...prev.images]
      const targetIndex = direction === 'left' ? index - 1 : index + 1
      if (targetIndex < 0 || targetIndex >= newImages.length) return prev
      ;[newImages[index], newImages[targetIndex]] = [newImages[targetIndex], newImages[index]]
      return { ...prev, images: newImages }
    })
  }

  const handleSave = async () => {
    if (!form.name.trim() || !form.slug.trim() || !form.description.trim()) {
      toast.error('Please fill in all required fields')
      return
    }

    setSaving(true)
    try {
      const payload: Record<string, unknown> = {
        ...form,
        priceCrypto: form.priceCrypto || null,
        rarity: form.rarity || null,
        deliveryInfo: form.deliveryInfo || null,
        images: form.images,
      }

      if (editingProduct) {
        payload.id = editingProduct.id
        const res = await fetch('/api/admin/products', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error || 'Failed to update product')
        }
        toast.success('Product updated successfully')
      } else {
        const res = await fetch('/api/admin/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error || 'Failed to create product')
        }
        toast.success('Product created successfully')
      }

      queryClient.invalidateQueries({ queryKey: ['admin-products'] })
      setModalOpen(false)
    } catch (error: any) {
      toast.error(error.message || 'Failed to save product')
    } finally {
      setSaving(false)
    }
  }

  const toggleFeatured = async (product: Product) => {
    try {
      const res = await fetch('/api/admin/products', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: product.id, featured: !product.featured }),
      })
      if (!res.ok) throw new Error('Failed to toggle featured')
      toast.success(product.featured ? 'Removed from featured' : 'Added to featured')
      queryClient.invalidateQueries({ queryKey: ['admin-products'] })
    } catch {
      toast.error('Failed to update product')
    }
  }

  const toggleActive = async (product: Product) => {
    try {
      const res = await fetch('/api/admin/products', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: product.id, active: !product.active }),
      })
      if (!res.ok) throw new Error('Failed to toggle active')
      toast.success(product.active ? 'Product deactivated' : 'Product activated')
      queryClient.invalidateQueries({ queryKey: ['admin-products'] })
    } catch {
      toast.error('Failed to update product')
    }
  }

  const openDiscountModal = (product: Product) => {
    setDiscountProduct(product)
    setDiscountPercent(0)
    setDiscountExpiresAt('')
    setDiscountOpen(true)
  }

  const applyDiscount = async () => {
    if (!discountProduct) return
    try {
      const res = await fetch('/api/admin/products/discount', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: discountProduct.id, discountPercent, expiresAt: discountExpiresAt || null }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.error || 'Failed to apply discount')
      toast.success('Discount applied')
      setDiscountOpen(false)
      queryClient.invalidateQueries({ queryKey: ['admin-products'] })
    } catch (e: any) {
      toast.error(e.message || 'Failed to apply discount')
    }
  }

  const removeDiscount = async (product: Product) => {
    try {
      const res = await fetch('/api/admin/products/discount', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: product.id }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.error || 'Failed to remove discount')
      toast.success('Discount removed')
      queryClient.invalidateQueries({ queryKey: ['admin-products'] })
    } catch (e: any) {
      toast.error(e.message || 'Failed to remove discount')
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
          <h1 className="text-2xl font-bold text-gold-gradient">Product Management</h1>
          <p className="text-sm text-muted-foreground">
            {productsData?.pagination.total ?? 0} products total
          </p>
        </div>
        <Button
          className="bg-gold hover:bg-gold/90 text-gold-foreground"
          onClick={openAddModal}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Product
        </Button>
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
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-card border-border/50"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-[200px] bg-card border-border/50">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
              <SelectItem key={key} value={key}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </motion.div>

      {/* Products Table */}
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
            ) : products.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Product</TableHead>
                      <TableHead className="text-xs">Category</TableHead>
                      <TableHead className="text-xs">Price</TableHead>
                      <TableHead className="text-xs">Stock</TableHead>
                      <TableHead className="text-xs">Featured</TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                      <TableHead className="text-xs text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map((product) => {
                      const productImages = parseImages(product.images)
                      return (
                        <TableRow key={product.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg overflow-hidden bg-muted/50 flex items-center justify-center shrink-0">
                                {productImages.length > 0 ? (
                                  <img
                                    src={productImages[0]}
                                    alt={product.name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <Package className="w-4 h-4 text-muted-foreground" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium line-clamp-1 max-w-[200px]">
                                  {product.name}
                                </p>
                                <p className="text-[10px] text-muted-foreground font-mono">
                                  {product.slug}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs">
                            {CATEGORY_LABELS[product.category] || product.category}
                          </TableCell>
                          <TableCell>
                            <p className="text-sm font-semibold text-gold">
                              {formatPrice(product.priceBdt)}
                            </p>
                            {product.priceCrypto && (
                              <p className="text-[10px] text-muted-foreground">
                                {formatCryptoPrice(product.priceCrypto)}
                              </p>
                            )}
                          </TableCell>
                          <TableCell>
                            <span
                              className={`text-sm font-medium ${
                                product.stock === 0
                                  ? 'text-red-400'
                                  : product.stock <= 3
                                  ? 'text-orange-400'
                                  : 'text-foreground'
                              }`}
                            >
                              {product.stock}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={() => toggleFeatured(product)}
                            >
                              {product.featured ? (
                                <Star className="w-4 h-4 fill-gold text-gold" />
                              ) : (
                                <StarOff className="w-4 h-4 text-muted-foreground" />
                              )}
                            </Button>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={
                                product.active
                                  ? 'bg-green-500/10 text-green-400 border-green-500/20'
                                  : 'bg-red-500/10 text-red-400 border-red-500/20'
                              }
                            >
                              {product.active ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0"
                                onClick={() => openEditModal(product)}
                              >
                                <Edit3 className="w-3.5 h-3.5 text-muted-foreground" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0"
                                onClick={() => openDiscountModal(product)}
                              >
                                %
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0"
                                onClick={() => toggleActive(product)}
                              >
                                <Power
                                  className={`w-3.5 h-3.5 ${
                                    product.active ? 'text-green-400' : 'text-red-400'
                                  }`}
                                />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No products found</p>
                <Button
                  variant="outline"
                  className="mt-3 border-gold/30 text-gold"
                  onClick={openAddModal}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First Product
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Add/Edit Product Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] bg-card border-border/50">
          <DialogHeader>
            <DialogTitle className="text-gold-gradient">
              {editingProduct ? 'Edit Product' : 'Add New Product'}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh] pr-4">
            <div className="space-y-5 py-2">
              {/* Image Upload Section */}
              <div className="space-y-3">
                <Label className="text-xs font-medium">Product Images</Label>
                
                {/* Image Preview Grid */}
                {form.images.length > 0 && (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                    <AnimatePresence>
                      {form.images.map((img, index) => (
                        <motion.div
                          key={img + index}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          transition={{ duration: 0.2 }}
                          className="relative group aspect-square rounded-lg overflow-hidden border border-border/50 bg-muted/30"
                        >
                          <img
                            src={img}
                            alt={`Product image ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                          {/* Overlay controls */}
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-1">
                            {index > 0 && (
                              <button
                                onClick={() => moveImage(index, 'left')}
                                className="p-1 rounded bg-white/20 hover:bg-white/30 transition-colors"
                                title="Move left"
                              >
                                <span className="text-white text-xs">←</span>
                              </button>
                            )}
                            <button
                              onClick={() => removeImage(index)}
                              className="p-1.5 rounded bg-red-500/80 hover:bg-red-500 transition-colors"
                              title="Remove image"
                            >
                              <Trash2 className="w-3 h-3 text-white" />
                            </button>
                            {index < form.images.length - 1 && (
                              <button
                                onClick={() => moveImage(index, 'right')}
                                className="p-1 rounded bg-white/20 hover:bg-white/30 transition-colors"
                                title="Move right"
                              >
                                <span className="text-white text-xs">→</span>
                              </button>
                            )}
                          </div>
                          {/* Primary badge */}
                          {index === 0 && (
                            <div className="absolute top-1 left-1">
                              <Badge className="bg-gold text-gold-foreground text-[8px] px-1.5 py-0 h-4">
                                Primary
                              </Badge>
                            </div>
                          )}
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                )}

                {/* Upload area */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className={`relative flex flex-col items-center justify-center gap-2 p-6 rounded-lg border-2 border-dashed transition-all cursor-pointer ${
                    uploadingImage
                      ? 'border-gold/50 bg-gold/5 pointer-events-none'
                      : 'border-border/50 hover:border-gold/30 hover:bg-gold/5'
                  }`}
                >
                  {uploadingImage ? (
                    <>
                      <Loader2 className="w-6 h-6 text-gold animate-spin" />
                      <p className="text-xs text-muted-foreground">Uploading...</p>
                    </>
                  ) : (
                    <>
                      <ImagePlus className="w-6 h-6 text-muted-foreground" />
                      <div className="text-center">
                        <p className="text-sm font-medium text-muted-foreground">
                          Click to upload images
                        </p>
                        <p className="text-[10px] text-muted-foreground/60">
                          JPG, PNG, GIF, WebP — Max 5MB each
                        </p>
                      </div>
                    </>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  multiple
                  onChange={handleImageUpload}
                  className="hidden"
                />
                {form.images.length > 0 && (
                  <p className="text-[10px] text-muted-foreground">
                    {form.images.length} image{form.images.length !== 1 ? 's' : ''} uploaded. First image is the primary/product thumbnail. Hover to reorder or delete.
                  </p>
                )}
              </div>

              <Separator />

              {/* Name & Slug */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Name *</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => {
                      setForm({ ...form, name: e.target.value, slug: slugify(e.target.value) })
                    }}
                    placeholder="Product name"
                    className="bg-background border-border/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Slug *</Label>
                  <Input
                    value={form.slug}
                    onChange={(e) => setForm({ ...form, slug: e.target.value })}
                    placeholder="product-slug"
                    className="bg-background border-border/50"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label className="text-xs font-medium">Description *</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Describe the product in detail. Include what the buyer will receive, any requirements, and special instructions..."
                  rows={5}
                  className="bg-background border-border/50 resize-none"
                />
                <p className="text-[10px] text-muted-foreground">
                  {form.description.length} characters — Be detailed to help buyers make informed decisions
                </p>
              </div>

              {/* Category & Rarity */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Category *</Label>
                  <Select
                    value={form.category}
                    onValueChange={(val) => setForm({ ...form, category: val })}
                  >
                    <SelectTrigger className="bg-background border-border/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Rarity</Label>
                  <Select
                    value={form.rarity}
                    onValueChange={(val) => setForm({ ...form, rarity: val })}
                  >
                    <SelectTrigger className="bg-background border-border/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {RARITY_OPTIONS.map((r) => (
                        <SelectItem key={r} value={r}>
                          <span className={RARITY_TEXT_COLORS[r]}>
                            {r.charAt(0).toUpperCase() + r.slice(1)}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Stock & Prices */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Stock</Label>
                  <Input
                    type="number"
                    value={form.stock}
                    onChange={(e) => setForm({ ...form, stock: parseInt(e.target.value) || 0 })}
                    min={0}
                    className="bg-background border-border/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Price BDT *</Label>
                  <Input
                    type="number"
                    value={form.priceBdt}
                    onChange={(e) =>
                      setForm({ ...form, priceBdt: parseFloat(e.target.value) || 0 })
                    }
                    min={0}
                    className="bg-background border-border/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Price Crypto (USD)</Label>
                  <Input
                    type="number"
                    value={form.priceCrypto ?? ''}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        priceCrypto: e.target.value ? parseFloat(e.target.value) : null,
                      })
                    }
                    min={0}
                    placeholder="Optional"
                    className="bg-background border-border/50"
                  />
                </div>
              </div>

              {/* Delivery Info */}
              <div className="space-y-2">
                <Label className="text-xs font-medium">Delivery Info</Label>
                <Input
                  value={form.deliveryInfo}
                  onChange={(e) => setForm({ ...form, deliveryInfo: e.target.value })}
                  placeholder="e.g., Delivery within 5-30 minutes after payment confirmation"
                  className="bg-background border-border/50"
                />
              </div>

              {/* Toggles */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex items-center gap-3">
                  <Switch
                    checked={form.featured}
                    onCheckedChange={(val) => setForm({ ...form, featured: val })}
                  />
                  <Label className="text-sm">Featured</Label>
                </div>
                <div className="flex items-center gap-3">
                  <Switch
                    checked={form.active}
                    onCheckedChange={(val) => setForm({ ...form, active: val })}
                  />
                  <Label className="text-sm">Active</Label>
                </div>
              </div>

              <Separator />

              {/* Actions */}
              <div className="flex items-center justify-end gap-3">
                <Button variant="outline" onClick={() => setModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  className="bg-gold hover:bg-gold/90 text-gold-foreground"
                  onClick={handleSave}
                  disabled={saving || uploadingImage}
                >
                  {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {editingProduct ? 'Update Product' : 'Create Product'}
                </Button>
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

        {/* Discount Modal */}
        <Dialog open={discountOpen} onOpenChange={setDiscountOpen}>
          <DialogContent className="max-w-lg bg-card border-border/50">
            <DialogHeader>
              <DialogTitle className="text-gold-gradient">Apply Discount</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <Label className="text-xs">Product</Label>
                <div className="text-sm font-medium">{discountProduct?.name}</div>
              </div>
              <div>
                <Label className="text-xs">Discount Percent (%)</Label>
                <Input
                  type="number"
                  value={discountPercent}
                  onChange={(e) => setDiscountPercent(parseFloat(e.target.value) || 0)}
                  min={0}
                  max={100}
                  className="bg-background border-border/50"
                />
              </div>
              <div>
                <Label className="text-xs">Expires At (optional)</Label>
                <Input
                  type="datetime-local"
                  value={discountExpiresAt}
                  onChange={(e) => setDiscountExpiresAt(e.target.value)}
                  className="bg-background border-border/50"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDiscountOpen(false)}>Cancel</Button>
                <Button onClick={applyDiscount}>Apply</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
    </div>
  )
}
