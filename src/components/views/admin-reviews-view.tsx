'use client'

import { useAppStore } from '@/lib/store'
import { formatDate, timeAgo } from '@/lib/constants'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  Search,
  Trash2,
  Star,
  StarOff,
  CheckCircle2,
  XCircle,
  MessageSquare,
  Shield,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { useState } from 'react'

interface ReviewUser {
  id: string
  username: string
  email: string
  avatar: string | null
}

interface ReviewProduct {
  id: string
  name: string
  slug: string
  category: string
}

interface Review {
  id: string
  userId: string
  productId: string
  rating: number
  review: string
  verifiedPurchase: boolean
  createdAt: string
  updatedAt: string
  user: ReviewUser
  product: ReviewProduct
}

export function AdminReviewsView() {
  const { isAdmin } = useAppStore()
  const queryClient = useQueryClient()
  const [ratingFilter, setRatingFilter] = useState('all')
  const [verifiedFilter, setVerifiedFilter] = useState('all')
  const [deleteTarget, setDeleteTarget] = useState<Review | null>(null)
  const [deleting, setDeleting] = useState(false)

  const { data: reviewsData, isLoading } = useQuery({
    queryKey: ['admin-reviews', ratingFilter, verifiedFilter],
    queryFn: async () => {
      const params = new URLSearchParams()
      params.set('limit', '50')
      if (ratingFilter !== 'all') params.set('rating', ratingFilter)
      if (verifiedFilter !== 'all') params.set('verified', verifiedFilter)
      const res = await fetch(`/api/admin/reviews?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to fetch reviews')
      const json = await res.json()
      return json.data as { reviews: Review[]; pagination: { total: number } }
    },
    enabled: isAdmin,
  })

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/admin/reviews?reviewId=${deleteTarget.id}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to delete review')
      }
      toast.success('Review deleted successfully')
      queryClient.invalidateQueries({ queryKey: ['admin-reviews'] })
      setDeleteTarget(null)
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete review')
    } finally {
      setDeleting(false)
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

  const reviews = reviewsData?.reviews ?? []

  const renderStars = (rating: number) => (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`w-3 h-3 ${
            i < rating ? 'fill-gold text-gold' : 'text-muted-foreground/30'
          }`}
        />
      ))}
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold text-gold-gradient">Review Management</h1>
          <p className="text-sm text-muted-foreground">
            {reviewsData?.pagination.total ?? 0} reviews total
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
        <Select value={ratingFilter} onValueChange={setRatingFilter}>
          <SelectTrigger className="w-full sm:w-[150px] bg-card border-border/50">
            <SelectValue placeholder="Rating" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Ratings</SelectItem>
            <SelectItem value="5">5 Stars</SelectItem>
            <SelectItem value="4">4 Stars</SelectItem>
            <SelectItem value="3">3 Stars</SelectItem>
            <SelectItem value="2">2 Stars</SelectItem>
            <SelectItem value="1">1 Star</SelectItem>
          </SelectContent>
        </Select>
        <Select value={verifiedFilter} onValueChange={setVerifiedFilter}>
          <SelectTrigger className="w-full sm:w-[150px] bg-card border-border/50">
            <SelectValue placeholder="Verified" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Reviews</SelectItem>
            <SelectItem value="true">Verified Only</SelectItem>
            <SelectItem value="false">Unverified Only</SelectItem>
          </SelectContent>
        </Select>
      </motion.div>

      {/* Reviews Table */}
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
            ) : reviews.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">User</TableHead>
                      <TableHead className="text-xs">Product</TableHead>
                      <TableHead className="text-xs">Rating</TableHead>
                      <TableHead className="text-xs">Review</TableHead>
                      <TableHead className="text-xs">Verified</TableHead>
                      <TableHead className="text-xs">Date</TableHead>
                      <TableHead className="text-xs text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reviews.map((review) => (
                      <TableRow key={review.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-muted/50 flex items-center justify-center">
                              <span className="text-[10px] font-bold text-muted-foreground">
                                {review.user.username.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <p className="text-sm font-medium">{review.user.username}</p>
                              <p className="text-[10px] text-muted-foreground">{review.user.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs max-w-[150px] truncate">
                          {review.product.name}
                        </TableCell>
                        <TableCell>{renderStars(review.rating)}</TableCell>
                        <TableCell className="max-w-[200px]">
                          <p className="text-xs line-clamp-2">{review.review}</p>
                        </TableCell>
                        <TableCell>
                          {review.verifiedPurchase ? (
                            <Badge
                              variant="outline"
                              className="bg-green-500/10 text-green-400 border-green-500/20 text-[10px]"
                            >
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Verified
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="bg-orange-500/10 text-orange-400 border-orange-500/20 text-[10px]"
                            >
                              <XCircle className="w-3 h-3 mr-1" />
                              Unverified
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {timeAgo(review.createdAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 hover:bg-red-500/10"
                            onClick={() => setDeleteTarget(review)}
                          >
                            <Trash2 className="w-3.5 h-3.5 text-red-400" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No reviews found</p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent className="max-w-md bg-card border-border/50">
          <DialogHeader>
            <DialogTitle className="text-red-400">Delete Review</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete this review? This action cannot be undone.
            </p>
            {deleteTarget && (
              <div className="rounded-lg bg-muted/30 border border-border/50 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">By</span>
                  <span className="text-sm font-medium">{deleteTarget.user.username}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Product</span>
                  <span className="text-sm">{deleteTarget.product.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Rating</span>
                  {renderStars(deleteTarget.rating)}
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                  &quot;{deleteTarget.review}&quot;
                </p>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? 'Deleting...' : 'Delete Review'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
