'use client'

import { useAppStore } from '@/lib/store'
import { formatDate, timeAgo } from '@/lib/constants'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  MessageSquare,
  Send,
  Loader2,
  Shield,
  User,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useState, useEffect, useRef } from 'react'
import { toast } from 'sonner'

interface TicketMessage {
  id: string
  senderId: string
  message: string
  isAdmin: boolean
  createdAt: string
}

interface Ticket {
  id: string
  userId: string
  subject: string
  status: string
  createdAt: string
  updatedAt: string
  messages: TicketMessage[]
  user: {
    id: string
    username: string
    email: string
    avatar: string | null
  }
}

interface TicketResponse {
  success: boolean
  data: { ticket: Ticket }
}

const TICKET_STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  open: { label: 'Open', color: 'bg-green-500/10 text-green-500 border-green-500/20', icon: AlertCircle },
  in_progress: { label: 'In Progress', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20', icon: Clock },
  resolved: { label: 'Resolved', color: 'bg-gold/10 text-gold border-gold/20', icon: CheckCircle2 },
  closed: { label: 'Closed', color: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20', icon: XCircle },
}

export function TicketView() {
  const { user, isAuthenticated, selectedTicketId, navigate } = useAppStore()
  const queryClient = useQueryClient()
  const [replyMessage, setReplyMessage] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const { data, isLoading } = useQuery<TicketResponse>({
    queryKey: ['ticket', selectedTicketId],
    queryFn: () => fetch(`/api/support/${selectedTicketId}`).then((r) => r.json()),
    enabled: isAuthenticated && !!selectedTicketId,
  })

  const replyMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/support/${selectedTicketId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: replyMessage }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      return data
    },
    onSuccess: () => {
      toast.success('Reply sent')
      queryClient.invalidateQueries({ queryKey: ['ticket', selectedTicketId] })
      setReplyMessage('')
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to send reply')
    },
  })

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [data?.data?.ticket?.messages?.length])

  if (!isAuthenticated || !user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <MessageSquare className="w-16 h-16 text-muted-foreground/40" />
        <h2 className="text-xl font-semibold">Please sign in</h2>
        <Button onClick={() => navigate('login')} className="bg-gold hover:bg-gold/90 text-gold-foreground">
          Sign In
        </Button>
      </div>
    )
  }

  if (!selectedTicketId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <MessageSquare className="w-16 h-16 text-muted-foreground/40" />
        <h2 className="text-xl font-semibold">No ticket selected</h2>
        <Button onClick={() => navigate('support')} className="bg-gold hover:bg-gold/90 text-gold-foreground">
          Go to Support
        </Button>
      </div>
    )
  }

  const ticket = data?.data?.ticket

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-20 w-full rounded-xl" />
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    )
  }

  if (!ticket) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <MessageSquare className="w-16 h-16 text-muted-foreground/40" />
        <h2 className="text-xl font-semibold">Ticket not found</h2>
        <Button onClick={() => navigate('support')} className="bg-gold hover:bg-gold/90 text-gold-foreground">
          Back to Support
        </Button>
      </div>
    )
  }

  const statusConfig = TICKET_STATUS_CONFIG[ticket.status] || TICKET_STATUS_CONFIG.open
  const StatusIcon = statusConfig.icon
  const isClosed = ticket.status === 'closed'

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="space-y-6"
    >
      {/* Back Button */}
      <Button variant="ghost" size="sm" onClick={() => navigate('support')} className="text-muted-foreground">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Support
      </Button>

      {/* Ticket Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">{ticket.subject}</h1>
          <p className="text-xs text-muted-foreground mt-1">
            #{ticket.id.slice(-8)} &middot; Created {formatDate(ticket.createdAt)} &middot; Updated {timeAgo(ticket.updatedAt)}
          </p>
        </div>
        <Badge variant="outline" className={`text-xs ${statusConfig.color}`}>
          <StatusIcon className="w-3 h-3 mr-1" />
          {statusConfig.label}
        </Badge>
      </div>

      <Separator />

      {/* Message Thread */}
      <Card className="border-border/50 bg-card">
        <CardContent className="p-0">
          <ScrollArea className="max-h-[55vh]">
            <div className="p-4 space-y-4">
              {ticket.messages.map((msg, i) => {
                const isAdmin = msg.isAdmin
                const isOwn = msg.senderId === user.id

                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: i * 0.03 }}
                    className={`flex gap-3 ${isOwn && !isAdmin ? 'flex-row-reverse' : ''}`}
                  >
                    {/* Avatar */}
                    <div
                      className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                        isAdmin
                          ? 'bg-gold/10 text-gold'
                          : 'bg-accent/50 text-muted-foreground'
                      }`}
                    >
                      {isAdmin ? (
                        <Shield className="w-4 h-4" />
                      ) : (
                        <User className="w-4 h-4" />
                      )}
                    </div>

                    {/* Message Bubble */}
                    <div
                      className={`max-w-[80%] rounded-xl px-4 py-3 ${
                        isAdmin
                          ? 'bg-gold/5 border border-gold/10'
                          : isOwn
                            ? 'bg-accent/50'
                            : 'bg-accent/30'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold">
                          {isAdmin ? 'BloxVault Support' : isOwn ? 'You' : ticket.user.username}
                        </span>
                        {isAdmin && (
                          <Badge className="bg-gold/10 text-gold text-[9px] px-1.5 py-0">
                            Admin
                          </Badge>
                        )}
                        <span className="text-[10px] text-muted-foreground/60">
                          {timeAgo(msg.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words">
                        {msg.message}
                      </p>
                    </div>
                  </motion.div>
                )
              })}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Reply Form */}
      {isClosed ? (
        <Card className="border-border/50 bg-card">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">
              This ticket is closed. Create a new ticket if you need further assistance.
            </p>
            <Button
              onClick={() => navigate('support')}
              variant="outline"
              className="mt-3 text-gold border-gold/30 hover:bg-gold/10"
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              New Ticket
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border/50 bg-card">
          <CardContent className="p-4">
            <div className="space-y-3">
              <Textarea
                placeholder="Type your reply..."
                value={replyMessage}
                onChange={(e) => setReplyMessage(e.target.value)}
                rows={3}
                className="resize-none"
              />
              <div className="flex justify-end">
                <Button
                  className="bg-gold hover:bg-gold/90 text-gold-foreground"
                  disabled={!replyMessage.trim() || replyMutation.isPending}
                  onClick={() => replyMutation.mutate()}
                >
                  {replyMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4 mr-2" />
                  )}
                  Send Reply
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </motion.div>
  )
}
