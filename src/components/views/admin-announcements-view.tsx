'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAppStore } from '@/lib/store'
import { formatDate, timeAgo } from '@/lib/constants'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import {
  Megaphone,
  Plus,
  Edit3,
  Trash2,
  Info,
  AlertTriangle,
  Sparkles,
  RefreshCw,
  Loader2,
  Calendar,
  Power,
  PowerOff,
  Clock,
  Tag,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'

interface Announcement {
  id: string
  title: string
  body: string
  type: string
  active: boolean
  startDate: string
  endDate: string | null
  createdAt: string
  updatedAt: string
}

interface AnnouncementFormData {
  title: string
  body: string
  type: string
  active: boolean
  startDate: string
  endDate: string
}

const emptyForm: AnnouncementFormData = {
  title: '',
  body: '',
  type: 'info',
  active: true,
  startDate: new Date().toISOString().split('T')[0],
  endDate: '',
}

const ANNOUNCEMENT_TYPES = ['info', 'promo', 'warning', 'update'] as const

const TYPE_CONFIG: Record<string, { label: string; icon: typeof Info; color: string; badgeClass: string }> = {
  info: {
    label: 'Info',
    icon: Info,
    color: 'text-blue-400',
    badgeClass: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  },
  promo: {
    label: 'Promo',
    icon: Sparkles,
    color: 'text-gold',
    badgeClass: 'bg-gold/10 text-gold border-gold/20',
  },
  warning: {
    label: 'Warning',
    icon: AlertTriangle,
    color: 'text-orange-400',
    badgeClass: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  },
  update: {
    label: 'Update',
    icon: RefreshCw,
    color: 'text-green-400',
    badgeClass: 'bg-green-500/10 text-green-400 border-green-500/20',
  },
}

export function AdminAnnouncementsView() {
  const { isAdmin } = useAppStore()
  const queryClient = useQueryClient()

  // State
  const [modalOpen, setModalOpen] = useState(false)
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null)
  const [form, setForm] = useState<AnnouncementFormData>(emptyForm)
  const [saving, setSaving] = useState(false)

  // Fetch announcements
  const {
    data: announcementsData,
    isLoading,
  } = useQuery({
    queryKey: ['admin-announcements'],
    queryFn: async () => {
      const res = await fetch('/api/admin/announcements')
      if (!res.ok) throw new Error('Failed to fetch announcements')
      const json = await res.json()
      return json.data as { announcements: Announcement[] }
    },
    enabled: isAdmin,
  })

  const announcements = announcementsData?.announcements ?? []

  // Toggle active
  const toggleActive = async (announcement: Announcement) => {
    try {
      const res = await fetch('/api/admin/announcements', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          announcementId: announcement.id,
          active: !announcement.active,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to toggle announcement')
      }
      toast.success(announcement.active ? 'Announcement deactivated' : 'Announcement activated')
      queryClient.invalidateQueries({ queryKey: ['admin-announcements'] })
    } catch (error: any) {
      toast.error(error.message || 'Failed to update announcement')
    }
  }

  // Delete announcement
  const handleDelete = async (id: string) => {
    try {
      const res = await fetch('/api/admin/announcements', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ announcementId: id }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to delete announcement')
      }
      toast.success('Announcement deleted')
      queryClient.invalidateQueries({ queryKey: ['admin-announcements'] })
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete announcement')
    }
  }

  // Open add modal
  const openAddModal = () => {
    setEditingAnnouncement(null)
    setForm(emptyForm)
    setModalOpen(true)
  }

  // Open edit modal
  const openEditModal = (announcement: Announcement) => {
    setEditingAnnouncement(announcement)
    setForm({
      title: announcement.title,
      body: announcement.body,
      type: announcement.type,
      active: announcement.active,
      startDate: new Date(announcement.startDate).toISOString().split('T')[0],
      endDate: announcement.endDate
        ? new Date(announcement.endDate).toISOString().split('T')[0]
        : '',
    })
    setModalOpen(true)
  }

  // Save announcement
  const handleSave = async () => {
    if (!form.title.trim() || !form.body.trim()) {
      toast.error('Please fill in title and body')
      return
    }

    setSaving(true)
    try {
      const payload: Record<string, unknown> = {
        title: form.title,
        body: form.body,
        type: form.type,
        active: form.active,
        startDate: form.startDate || undefined,
        endDate: form.endDate || null,
      }

      if (editingAnnouncement) {
          payload.announcementId = editingAnnouncement.id
        const res = await fetch('/api/admin/announcements', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error || 'Failed to update announcement')
        }
        toast.success('Announcement updated successfully')
      } else {
        const res = await fetch('/api/admin/announcements', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error || 'Failed to create announcement')
        }
        toast.success('Announcement created successfully')
      }

      queryClient.invalidateQueries({ queryKey: ['admin-announcements'] })
      setModalOpen(false)
    } catch (error: any) {
      toast.error(error.message || 'Failed to save announcement')
    } finally {
      setSaving(false)
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
          <h1 className="text-2xl font-bold text-gold-gradient flex items-center gap-2">
            <Megaphone className="w-6 h-6 text-gold" />
            Announcement Management
          </h1>
          <p className="text-sm text-muted-foreground">
            {announcements.length} announcements total
          </p>
        </div>
        <Button
          className="bg-gold hover:bg-gold/90 text-gold-foreground"
          onClick={openAddModal}
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Announcement
        </Button>
      </motion.div>

      {/* Announcements List */}
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full rounded-xl" />
          ))}
        </div>
      ) : announcements.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-16"
        >
          <Megaphone className="w-16 h-16 mx-auto text-muted-foreground/20 mb-4" />
          <h3 className="text-lg font-semibold mb-2">No announcements yet</h3>
          <p className="text-muted-foreground text-sm mb-4">
            Create your first announcement to keep users informed.
          </p>
          <Button
            variant="outline"
            className="border-gold/30 text-gold"
            onClick={openAddModal}
          >
            <Plus className="w-4 h-4 mr-2" />
            Create First Announcement
          </Button>
        </motion.div>
      ) : (
        <div className="space-y-4">
          <AnimatePresence>
            {announcements.map((announcement, index) => {
              const typeConfig = TYPE_CONFIG[announcement.type] || TYPE_CONFIG.info
              const TypeIcon = typeConfig.icon

              return (
                <motion.div
                  key={announcement.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                >
                  <Card
                    className={`border-border/50 bg-card transition-all ${
                      !announcement.active ? 'opacity-60' : ''
                    }`}
                  >
                    <CardContent className="p-5 sm:p-6">
                      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                        {/* Type Icon */}
                        <div
                          className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                            announcement.type === 'promo'
                              ? 'bg-gold/10'
                              : announcement.type === 'warning'
                              ? 'bg-orange-500/10'
                              : announcement.type === 'update'
                              ? 'bg-green-500/10'
                              : 'bg-blue-500/10'
                          }`}
                        >
                          <TypeIcon
                            className={`w-5 h-5 ${typeConfig.color}`}
                          />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0 space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-base font-semibold truncate">
                              {announcement.title}
                            </h3>
                            <Badge
                              variant="outline"
                              className={`text-[10px] ${typeConfig.badgeClass}`}
                            >
                              <Tag className="w-2.5 h-2.5 mr-0.5" />
                              {typeConfig.label}
                            </Badge>
                            <Badge
                              variant="outline"
                              className={
                                announcement.active
                                  ? 'bg-green-500/10 text-green-400 border-green-500/20 text-[10px]'
                                  : 'bg-red-500/10 text-red-400 border-red-500/20 text-[10px]'
                              }
                            >
                              {announcement.active ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>

                          <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
                            {announcement.body}
                          </p>

                          {/* Dates */}
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              <span>Start: {formatDate(announcement.startDate)}</span>
                            </div>
                            {announcement.endDate && (
                              <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                <span>End: {formatDate(announcement.endDate)}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-1">
                              <span>Created {timeAgo(announcement.createdAt)}</span>
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 sm:flex-col sm:items-end shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => toggleActive(announcement)}
                            title={announcement.active ? 'Deactivate' : 'Activate'}
                          >
                            {announcement.active ? (
                              <PowerOff className="w-4 h-4 text-muted-foreground" />
                            ) : (
                              <Power className="w-4 h-4 text-green-400" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => openEditModal(announcement)}
                          >
                            <Edit3 className="w-4 h-4 text-muted-foreground" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 hover:text-red-400"
                            onClick={() => handleDelete(announcement.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Create/Edit Announcement Dialog */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] bg-card border-border/50">
          <DialogHeader>
            <DialogTitle className="text-gold-gradient flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-gold" />
              {editingAnnouncement ? 'Edit Announcement' : 'Create Announcement'}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh] pr-4">
            <div className="space-y-4 py-2">
              {/* Title */}
              <div className="space-y-2">
                <Label className="text-xs font-medium">Title *</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Announcement title"
                  className="bg-background border-border/50"
                />
              </div>

              {/* Body */}
              <div className="space-y-2">
                <Label className="text-xs font-medium">Body *</Label>
                <Textarea
                  value={form.body}
                  onChange={(e) => setForm({ ...form, body: e.target.value })}
                  placeholder="Write your announcement content..."
                  rows={5}
                  className="bg-background border-border/50 resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  {form.body.length}/2000 characters
                </p>
              </div>

              {/* Type */}
              <div className="space-y-2">
                <Label className="text-xs font-medium">Type</Label>
                <Select
                  value={form.type}
                  onValueChange={(val) => setForm({ ...form, type: val })}
                >
                  <SelectTrigger className="bg-background border-border/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ANNOUNCEMENT_TYPES.map((type) => {
                      const config = TYPE_CONFIG[type]
                      return (
                        <SelectItem key={type} value={type}>
                          <span className="flex items-center gap-1.5">
                            {config.label}
                          </span>
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Start Date</Label>
                  <Input
                    type="date"
                    value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                    className="bg-background border-border/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium">End Date (Optional)</Label>
                  <Input
                    type="date"
                    value={form.endDate}
                    onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                    className="bg-background border-border/50"
                  />
                </div>
              </div>

              {/* Active Toggle */}
              <div className="flex items-center gap-3">
                <Switch
                  checked={form.active}
                  onCheckedChange={(val) => setForm({ ...form, active: val })}
                />
                <Label className="text-sm">Active</Label>
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
                  disabled={saving}
                >
                  {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {editingAnnouncement ? 'Update Announcement' : 'Create Announcement'}
                </Button>
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  )
}
