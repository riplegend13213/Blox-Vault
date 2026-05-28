'use client'

import { useAppStore } from '@/lib/store'
import { formatDate, timeAgo } from '@/lib/constants'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  Search,
  Shield,
  ShieldOff,
  Eye,
  Users,
  Mail,
  Calendar,
  ShoppingBag,
  Star,
  MessageSquare,
  ShieldCheck,
  ShieldAlert,
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { useState } from 'react'

interface UserRecord {
  id: string
  username: string
  email: string
  avatar: string | null
  role: string
  banned: boolean
  emailVerified: boolean | null
  createdAt: string
  updatedAt: string
  _count: {
    orders: number
    reviews: number
    supportTickets: number
  }
}

export function AdminUsersView() {
  const { isAdmin } = useAppStore()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [bannedFilter, setBannedFilter] = useState('all')
  const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [banning, setBanning] = useState<string | null>(null)
  const [pointAmount, setPointAmount] = useState<number>(0)
  const [pointReason, setPointReason] = useState<string>('')
  const [adjusting, setAdjusting] = useState<string | null>(null)

  const { data: usersData, isLoading } = useQuery({
    queryKey: ['admin-users', search, roleFilter, bannedFilter],
    queryFn: async () => {
      const params = new URLSearchParams()
      params.set('limit', '50')
      if (search) params.set('search', search)
      if (roleFilter !== 'all') params.set('role', roleFilter)
      if (bannedFilter !== 'all') params.set('banned', bannedFilter)
      const res = await fetch(`/api/admin/users?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to fetch users')
      const json = await res.json()
      return json.data as { users: UserRecord[]; pagination: { total: number } }
    },
    enabled: isAdmin,
  })

  const toggleBan = async (user: UserRecord) => {
    setBanning(user.id)
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, banned: !user.banned }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to update user')
      }
      toast.success(user.banned ? 'User unbanned' : 'User banned')
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      if (selectedUser?.id === user.id) {
        setSelectedUser({ ...selectedUser, banned: !user.banned })
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to update user')
    } finally {
      setBanning(null)
    }
  }

  const openDetail = (user: UserRecord) => {
    setSelectedUser(user)
    setDetailOpen(true)
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

  const users = usersData?.users ?? []

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold text-gold-gradient">User Management</h1>
          <p className="text-sm text-muted-foreground">
            {usersData?.pagination.total ?? 0} users registered
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
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by username or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-card border-border/50"
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-full sm:w-[150px] bg-card border-border/50">
            <SelectValue placeholder="Role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="user">User</SelectItem>
          </SelectContent>
        </Select>
        <Select value={bannedFilter} onValueChange={setBannedFilter}>
          <SelectTrigger className="w-full sm:w-[150px] bg-card border-border/50">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="false">Active</SelectItem>
            <SelectItem value="true">Banned</SelectItem>
          </SelectContent>
        </Select>
      </motion.div>

      {/* Users Table */}
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
            ) : users.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Username</TableHead>
                      <TableHead className="text-xs">Email</TableHead>
                      <TableHead className="text-xs">Role</TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                      <TableHead className="text-xs">Joined</TableHead>
                      <TableHead className="text-xs text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center">
                              <Users className="w-4 h-4 text-muted-foreground" />
                            </div>
                            <div>
                              <p className="text-sm font-medium">{user.username}</p>
                              <p className="text-[10px] text-muted-foreground font-mono">
                                {user.id.slice(0, 8)}...
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs">
                          <div className="flex items-center gap-1.5">
                            <Mail className="w-3 h-3 text-muted-foreground" />
                            {user.email}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              user.role === 'admin'
                                ? 'bg-gold/10 text-gold border-gold/20'
                                : 'bg-secondary/50 text-secondary-foreground border-border/50'
                            }
                          >
                            {user.role === 'admin' && <ShieldCheck className="w-3 h-3 mr-1" />}
                            {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              user.banned
                                ? 'bg-red-500/10 text-red-400 border-red-500/20'
                                : 'bg-green-500/10 text-green-400 border-green-500/20'
                            }
                          >
                            {user.banned ? 'Banned' : 'Active'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatDate(user.createdAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={() => openDetail(user)}
                            >
                              <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                            </Button>
                            {user.role !== 'admin' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0"
                                onClick={() => toggleBan(user)}
                                disabled={banning === user.id}
                              >
                                {user.banned ? (
                                  <ShieldOff className="w-3.5 h-3.5 text-green-400" />
                                ) : (
                                  <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
                                )}
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No users found</p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* User Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] bg-card border-border/50">
          <DialogHeader>
            <DialogTitle className="text-gold-gradient">User Details</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <ScrollArea className="max-h-[60vh] pr-4">
              <div className="space-y-5 py-2">
                {/* Avatar + Basic Info */}
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center">
                    <Users className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">{selectedUser.username}</h3>
                    <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge
                        variant="outline"
                        className={
                          selectedUser.role === 'admin'
                            ? 'bg-gold/10 text-gold border-gold/20'
                            : 'bg-secondary/50'
                        }
                      >
                        {selectedUser.role.charAt(0).toUpperCase() + selectedUser.role.slice(1)}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={
                          selectedUser.banned
                            ? 'bg-red-500/10 text-red-400 border-red-500/20'
                            : 'bg-green-500/10 text-green-400 border-green-500/20'
                        }
                      >
                        {selectedUser.banned ? 'Banned' : 'Active'}
                      </Badge>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-lg bg-muted/50 p-3 text-center">
                    <ShoppingBag className="w-4 h-4 text-gold mx-auto mb-1" />
                    <p className="text-lg font-bold">{selectedUser._count.orders}</p>
                    <p className="text-[10px] text-muted-foreground">Orders</p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-3 text-center">
                    <Star className="w-4 h-4 text-gold mx-auto mb-1" />
                    <p className="text-lg font-bold">{selectedUser._count.reviews}</p>
                    <p className="text-[10px] text-muted-foreground">Reviews</p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-3 text-center">
                    <MessageSquare className="w-4 h-4 text-gold mx-auto mb-1" />
                    <p className="text-lg font-bold">{selectedUser._count.supportTickets}</p>
                    <p className="text-[10px] text-muted-foreground">Tickets</p>
                  </div>
                </div>

                <Separator />

                {/* Details */}
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">User ID</span>
                    <span className="font-mono text-xs">{selectedUser.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Joined</span>
                    <span>{formatDate(selectedUser.createdAt)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Last Updated</span>
                    <span>{formatDate(selectedUser.updatedAt)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Email Verified</span>
                    <span>{selectedUser.emailVerified ? 'Yes' : 'No'}</span>
                  </div>
                </div>

                {/* Ban/Unban Button */}
                {selectedUser.role !== 'admin' && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={pointAmount}
                          onChange={(e) => setPointAmount(Number(e.target.value))}
                          className="input bg-card border-border/50 w-32"
                          placeholder="Points (+/-)"
                        />
                        <input
                          type="text"
                          value={pointReason}
                          onChange={(e) => setPointReason(e.target.value)}
                          className="input bg-card border-border/50 flex-1"
                          placeholder="Reason (optional)"
                        />
                        <Button
                          onClick={async () => {
                            if (!pointAmount) return toast.error('Enter a non-zero points value')
                            setAdjusting(selectedUser.id)
                            try {
                              const res = await fetch('/api/admin/loyalty', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ userId: selectedUser.id, points: pointAmount, reason: pointReason }),
                              })
                              const json = await res.json()
                              if (!res.ok || !json.success) throw new Error(json.error || 'Failed to adjust points')
                              toast.success('Points updated')
                              queryClient.invalidateQueries({ queryKey: ['admin-users'] })
                              setPointAmount(0)
                              setPointReason('')
                            } catch (err: any) {
                              toast.error(err.message || 'Failed to update points')
                            } finally {
                              setAdjusting(null)
                            }
                          }}
                          disabled={adjusting === selectedUser.id}
                        >
                          {adjusting === selectedUser.id ? 'Sending...' : 'Adjust Points'}
                        </Button>
                      </div>
                    </div>
                    <Separator />
                    <Button
                      className={
                        selectedUser.banned
                          ? 'bg-green-600 hover:bg-green-700 text-white w-full'
                          : 'bg-red-600 hover:bg-red-700 text-white w-full'
                      }
                      onClick={() => toggleBan(selectedUser)}
                      disabled={banning === selectedUser.id}
                    >
                      {banning === selectedUser.id ? (
                        <span>Loading...</span>
                      ) : selectedUser.banned ? (
                        <>
                          <ShieldOff className="w-4 h-4 mr-2" />
                          Unban User
                        </>
                      ) : (
                        <>
                          <ShieldAlert className="w-4 h-4 mr-2" />
                          Ban User
                        </>
                      )}
                    </Button>
                  </>
                )}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
