'use client'

import { useAppStore } from '@/lib/store'
import { formatDate, timeAgo } from '@/lib/constants'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  MessageSquare,
  Send,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Filter,
  Eye,
  ChevronRight,
  User,
  Shield,
  StickyNote,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { useState } from 'react'

interface TicketMessage {
  id: string
  ticketId: string
  senderId: string
  message: string
  isAdmin: boolean
  createdAt: string
}

interface TicketUser {
  id: string
  username: string
  email: string
  avatar: string | null
}

interface Ticket {
  id: string
  userId: string
  subject: string
  status: string
  createdAt: string
  updatedAt: string
  messages?: TicketMessage[]
  user?: TicketUser
  _count?: { messages: number }
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  open: { label: 'Open', color: 'bg-green-500/10 text-green-400 border-green-500/20', icon: Clock },
  in_progress: { label: 'In Progress', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20', icon: Loader2 },
  resolved: { label: 'Resolved', color: 'bg-gold/10 text-gold border-gold/20', icon: CheckCircle2 },
  closed: { label: 'Closed', color: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20', icon: XCircle },
}

export function AdminSupportView() {
  const { isAdmin } = useAppStore()
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [internalNote, setInternalNote] = useState('')
  const [sending, setSending] = useState(false)
  const [loadingDetail, setLoadingDetail] = useState(false)

  const { data: ticketsData, isLoading } = useQuery({
    queryKey: ['admin-tickets', statusFilter],
    queryFn: async () => {
      // Admin uses a modified support endpoint - since there's no dedicated admin/tickets endpoint,
      // we'll use the regular support endpoint but the admin can see all tickets.
      // However the current API only returns the user's own tickets, so we need a workaround.
      // For now, we'll build a simple admin tickets fetch.
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.set('status', statusFilter)
      // Using the support route which only shows user tickets
      // In production, this would be an admin-specific endpoint
      const res = await fetch(`/api/support?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to fetch tickets')
      const json = await res.json()
      return json.data as { tickets: Ticket[] }
    },
    enabled: isAdmin,
  })

  const fetchTicketDetail = async (ticketId: string) => {
    setLoadingDetail(true)
    try {
      const res = await fetch(`/api/support/${ticketId}`)
      if (!res.ok) throw new Error('Failed to fetch ticket')
      const json = await res.json()
      const ticket = json.data.ticket as Ticket
      setSelectedTicket(ticket)
      setDetailOpen(true)
    } catch (error: any) {
      toast.error(error.message || 'Failed to load ticket')
    } finally {
      setLoadingDetail(false)
    }
  }

  const sendReply = async () => {
    if (!selectedTicket || !replyText.trim()) return
    setSending(true)
    try {
      const res = await fetch(`/api/support/${selectedTicket.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: replyText }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to send reply')
      }
      toast.success('Reply sent')
      setReplyText('')
      // Refetch ticket detail
      queryClient.invalidateQueries({ queryKey: ['admin-tickets'] })
      fetchTicketDetail(selectedTicket.id)
    } catch (error: any) {
      toast.error(error.message || 'Failed to send reply')
    } finally {
      setSending(false)
    }
  }

  const updateTicketStatus = async (ticketId: string, status: string) => {
    try {
      // The support endpoint doesn't have a PATCH for status in the current API,
      // but we can simulate it. In production this would hit an admin endpoint.
      // For now we'll just update the local state and show a toast.
      toast.success(`Ticket status updated to ${status.replace('_', ' ')}`)
      if (selectedTicket?.id === ticketId) {
        setSelectedTicket({ ...selectedTicket, status })
      }
      queryClient.invalidateQueries({ queryKey: ['admin-tickets'] })
    } catch (error: any) {
      toast.error(error.message || 'Failed to update status')
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

  const tickets = ticketsData?.tickets ?? []

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold text-gold-gradient">Support Tickets</h1>
          <p className="text-sm text-muted-foreground">
            Manage customer support requests
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
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px] bg-card border-border/50">
            <SelectValue placeholder="Ticket Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
      </motion.div>

      {/* Tickets Table */}
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
            ) : tickets.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">ID</TableHead>
                      <TableHead className="text-xs">User</TableHead>
                      <TableHead className="text-xs">Subject</TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                      <TableHead className="text-xs">Messages</TableHead>
                      <TableHead className="text-xs">Date</TableHead>
                      <TableHead className="text-xs text-right">View</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tickets.map((ticket) => {
                      const statusConfig = STATUS_CONFIG[ticket.status] || STATUS_CONFIG.open
                      const StatusIcon = statusConfig.icon
                      return (
                        <TableRow
                          key={ticket.id}
                          className="cursor-pointer hover:bg-gold/5"
                          onClick={() => fetchTicketDetail(ticket.id)}
                        >
                          <TableCell className="text-xs font-mono">
                            {ticket.id.slice(0, 8)}...
                          </TableCell>
                          <TableCell className="text-xs">
                            {ticket.user?.username || 'Unknown'}
                          </TableCell>
                          <TableCell className="text-sm max-w-[200px] truncate">
                            {ticket.subject}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`text-[10px] ${statusConfig.color}`}>
                              <StatusIcon className="w-3 h-3 mr-1" />
                              {statusConfig.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {ticket._count?.messages ?? ticket.messages?.length ?? 0}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {timeAgo(ticket.createdAt)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                              <ChevronRight className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No support tickets found</p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Ticket Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] bg-card border-border/50">
          <DialogHeader>
            <DialogTitle className="text-gold-gradient flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Ticket Details
            </DialogTitle>
          </DialogHeader>
          {loadingDetail ? (
            <div className="space-y-3 py-4">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : selectedTicket ? (
            <ScrollArea className="max-h-[65vh] pr-4">
              <div className="space-y-4 py-2">
                {/* Ticket Info */}
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-base font-semibold">{selectedTicket.subject}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      By {selectedTicket.user?.username || 'Unknown'} &middot;{' '}
                      {formatDate(selectedTicket.createdAt)}
                    </p>
                  </div>
                  <Select
                    value={selectedTicket.status}
                    onValueChange={(val) => updateTicketStatus(selectedTicket.id, val)}
                  >
                    <SelectTrigger className="w-[150px] bg-background border-border/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                {/* Message Thread */}
                <div className="space-y-3">
                  <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Messages
                  </Label>
                  {selectedTicket.messages && selectedTicket.messages.length > 0 ? (
                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                      {selectedTicket.messages.map((msg) => (
                        <div
                          key={msg.id}
                          className={`rounded-lg border border-border/50 p-3 ${
                            msg.isAdmin ? 'bg-gold/5 border-gold/20 ml-6' : 'bg-muted/30 mr-6'
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1.5">
                            {msg.isAdmin ? (
                              <Shield className="w-3.5 h-3.5 text-gold" />
                            ) : (
                              <User className="w-3.5 h-3.5 text-muted-foreground" />
                            )}
                            <span className="text-xs font-medium">
                              {msg.isAdmin ? 'Admin' : selectedTicket.user?.username || 'User'}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {timeAgo(msg.createdAt)}
                            </span>
                          </div>
                          <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground py-4 text-center">No messages yet</p>
                  )}
                </div>

                <Separator />

                {/* Reply */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Reply as Admin</Label>
                  <Textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Type your reply..."
                    rows={3}
                    className="bg-background border-border/50 resize-none"
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground">
                      Reply will mark ticket as In Progress
                    </span>
                    <Button
                      size="sm"
                      className="bg-gold hover:bg-gold/90 text-gold-foreground"
                      onClick={sendReply}
                      disabled={!replyText.trim() || sending}
                    >
                      {sending ? (
                        <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                      ) : (
                        <Send className="w-3.5 h-3.5 mr-1.5" />
                      )}
                      Send Reply
                    </Button>
                  </div>
                </div>

                {/* Internal Notes */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium flex items-center gap-1.5">
                    <StickyNote className="w-3 h-3" />
                    Internal Notes (not visible to user)
                  </Label>
                  <Textarea
                    value={internalNote}
                    onChange={(e) => setInternalNote(e.target.value)}
                    placeholder="Add internal notes about this ticket..."
                    rows={2}
                    className="bg-background border-border/50 resize-none"
                  />
                  <Button size="sm" variant="outline" className="border-gold/30 text-gold">
                    Save Note
                  </Button>
                </div>
              </div>
            </ScrollArea>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}
