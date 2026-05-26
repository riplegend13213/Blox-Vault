'use client'

import { useAppStore } from '@/lib/store'
import { timeAgo, formatDate } from '@/lib/constants'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  HelpCircle,
  Plus,
  MessageSquare,
  ChevronRight,
  Loader2,
  Send,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { useState } from 'react'
import { toast } from 'sonner'

interface Ticket {
  id: string
  subject: string
  status: string
  createdAt: string
  updatedAt: string
  _count: { messages: number }
  messages: { id: string; createdAt: string }[]
}

interface TicketsResponse {
  success: boolean
  data: { tickets: Ticket[] }
}

const TICKET_STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  open: { label: 'Open', color: 'bg-green-500/10 text-green-500 border-green-500/20', icon: AlertCircle },
  in_progress: { label: 'In Progress', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20', icon: Clock },
  resolved: { label: 'Resolved', color: 'bg-gold/10 text-gold border-gold/20', icon: CheckCircle2 },
  closed: { label: 'Closed', color: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20', icon: XCircle },
}

const FAQ_ITEMS = [
  {
    q: 'How do I place an order?',
    a: 'Browse our shop, select a product, choose your payment method, and complete the checkout process. You\'ll receive a notification once your order is confirmed.',
  },
  {
    q: 'What payment methods do you accept?',
    a: 'We accept bKash, Nagad, and Rocket for BDT payments, and USDT, BTC, ETH, and BNB for cryptocurrency payments.',
  },
  {
    q: 'How long does delivery take?',
    a: 'Delivery times vary by product type. Most digital items are delivered within 1-24 hours after payment confirmation. Physical items may take longer.',
  },
  {
    q: 'How do I upload payment proof?',
    a: 'After placing an order, go to My Orders, expand the order details, and click "Upload Proof" to submit your payment screenshot.',
  },
  {
    q: 'Can I cancel my order?',
    a: 'Orders can only be cancelled if they haven\'t been confirmed yet. Please contact support immediately if you need to cancel.',
  },
  {
    q: 'What if I don\'t receive my order?',
    a: 'If your order hasn\'t been delivered within the expected timeframe, please create a support ticket and our team will investigate.',
  },
  {
    q: 'Is my account information safe?',
    a: 'We use industry-standard security practices to protect your data. Passwords are hashed and never stored in plain text.',
  },
]

export function SupportView() {
  const { user, isAuthenticated, navigate } = useAppStore()
  const queryClient = useQueryClient()

  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [showForm, setShowForm] = useState(false)

  const { data, isLoading } = useQuery<TicketsResponse>({
    queryKey: ['user-tickets'],
    queryFn: () => fetch('/api/support').then((r) => r.json()),
    enabled: isAuthenticated,
  })

  const createTicketMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, message }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      return data
    },
    onSuccess: (data) => {
      toast.success('Support ticket created')
      queryClient.invalidateQueries({ queryKey: ['user-tickets'] })
      setSubject('')
      setMessage('')
      setShowForm(false)
      // Navigate to the ticket
      if (data.data?.ticket?.id) {
        navigate('ticket', data.data.ticket.id)
      }
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to create ticket')
    },
  })

  if (!isAuthenticated || !user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <HelpCircle className="w-16 h-16 text-muted-foreground/40" />
        <h2 className="text-xl font-semibold">Please sign in</h2>
        <p className="text-muted-foreground text-sm">You need to be logged in to access support.</p>
        <Button onClick={() => navigate('login')} className="bg-gold hover:bg-gold/90 text-gold-foreground">
          Sign In
        </Button>
      </div>
    )
  }

  const tickets = data?.data?.tickets || []

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="space-y-8"
    >
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">
            <HelpCircle className="w-7 h-7 inline-block mr-2 text-purple-400 -mt-1" />
            Support Center
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Get help or create a support ticket.</p>
        </div>
        <Button
          onClick={() => setShowForm(!showForm)}
          className="bg-gold hover:bg-gold/90 text-gold-foreground"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Ticket
        </Button>
      </div>

      {/* Create Ticket Form */}
      {showForm && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="border-gold/20 bg-card">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-gold" />
                Create New Ticket
              </CardTitle>
              <CardDescription>Describe your issue and we&apos;ll get back to you.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ticket-subject" className="text-xs text-muted-foreground">
                  Subject
                </Label>
                <Input
                  id="ticket-subject"
                  placeholder="Brief description of your issue"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ticket-message" className="text-xs text-muted-foreground">
                  Message
                </Label>
                <Textarea
                  id="ticket-message"
                  placeholder="Describe your issue in detail..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                />
              </div>
              <div className="flex items-center gap-3">
                <Button
                  className="bg-gold hover:bg-gold/90 text-gold-foreground"
                  disabled={!subject.trim() || !message.trim() || createTicketMutation.isPending}
                  onClick={() => createTicketMutation.mutate()}
                >
                  {createTicketMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4 mr-2" />
                  )}
                  Submit Ticket
                </Button>
                <Button variant="ghost" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* FAQ Section */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Frequently Asked Questions</h2>
        <Card className="border-border/50 bg-card">
          <CardContent className="p-0">
            <Accordion type="single" collapsible className="w-full">
              {FAQ_ITEMS.map((faq, i) => (
                <AccordionItem key={i} value={`faq-${i}`} className="border-border/50">
                  <AccordionTrigger className="px-4 py-3 text-sm font-medium hover:no-underline hover:text-gold transition-colors">
                    {faq.q}
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-3 text-sm text-muted-foreground">
                    {faq.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Existing Tickets */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Your Tickets</h2>
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        ) : tickets.length === 0 ? (
          <Card className="border-border/50 bg-card">
            <CardContent className="p-8 text-center">
              <MessageSquare className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
              <p className="text-muted-foreground">No support tickets yet.</p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Create a new ticket if you need help with anything.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {tickets.map((ticket, i) => {
              const config = TICKET_STATUS_CONFIG[ticket.status] || TICKET_STATUS_CONFIG.open
              const StatusIcon = config.icon

              return (
                <motion.div
                  key={ticket.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: i * 0.04 }}
                >
                  <Card
                    className="border-border/50 bg-card hover:border-gold/20 transition-colors cursor-pointer group"
                    onClick={() => navigate('ticket', ticket.id)}
                  >
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-accent/50 flex items-center justify-center">
                        <StatusIcon className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate group-hover:text-gold transition-colors">
                          {ticket.subject}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {ticket._count.messages} message{ticket._count.messages !== 1 ? 's' : ''} &middot;{' '}
                          {timeAgo(ticket.updatedAt)}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <Badge variant="outline" className={`text-[10px] ${config.color}`}>
                          {config.label}
                        </Badge>
                        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-gold transition-colors" />
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>
    </motion.div>
  )
}
