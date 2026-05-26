export const CATEGORY_LABELS: Record<string, string> = {
  permanent_fruit: 'Permanent Fruits',
  physical_fruit: 'Physical Fruits',
  gamepass: 'Gamepasses',
  fruit_storage: 'Fruit Storage',
  account: 'Accounts',
  raid_service: 'Raid Services',
  leveling: 'Leveling',
  boosting: 'Boosting',
  custom: 'Custom Requests',
  robux: 'Robux',
}

export const CATEGORY_ICONS: Record<string, string> = {
  permanent_fruit: '💎',
  physical_fruit: '🍎',
  gamepass: '🎫',
  fruit_storage: '🗄️',
  account: '👤',
  raid_service: '⚔️',
  leveling: '📈',
  boosting: '🚀',
  custom: '✨',
  robux: '🪙',
}

export const RARITY_COLORS: Record<string, string> = {
  common: 'bg-zinc-500',
  uncommon: 'bg-green-500',
  rare: 'bg-blue-500',
  epic: 'bg-purple-500',
  legendary: 'bg-yellow-500',
  mythical: 'bg-gold',
}

export const RARITY_TEXT_COLORS: Record<string, string> = {
  common: 'text-zinc-500',
  uncommon: 'text-green-500',
  rare: 'text-blue-500',
  epic: 'text-purple-500',
  legendary: 'text-yellow-500',
  mythical: 'text-gold',
}

export const RARITY_BORDER_COLORS: Record<string, string> = {
  common: 'border-zinc-500/30',
  uncommon: 'border-green-500/30',
  rare: 'border-blue-500/30',
  epic: 'border-purple-500/30',
  legendary: 'border-yellow-500/30',
  mythical: 'border-gold/30',
}

export const PAYMENT_METHODS = {
  bdt: [
    { id: 'bkash', name: 'bKash', icon: '📱', number: '01712-345678' },
    { id: 'nagad', name: 'Nagad', icon: '📲', number: '01812-345678' },
    { id: 'rocket', name: 'Rocket', icon: '🚀', number: '01612-345678' },
  ],
  crypto: [
    { id: 'usdt', name: 'USDT (TRC20)', icon: '💲', address: 'TN2VqVTdX5Jk6Wi1f3LqA3Mm1Y6Y6n8N8K' },
    { id: 'btc', name: 'BTC', icon: '₿', address: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh' },
    { id: 'eth', name: 'ETH (ERC20)', icon: '⟠', address: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F' },
    { id: 'bnb', name: 'BNB (BEP20)', icon: '🔶', address: 'bnb1grpf0955h0ykzq3ar5nmum7y6gdfl6lxfn46h2' },
    { id: 'ltc', name: 'LTC', icon: '🪙', address: 'ltc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh' },
  ],
}

export const ROBUX_COMMUNITY_NOTICE = {
  title: '⚠️ Important: Robux Delivery Requirements',
  message: 'To receive Robux through our group payout system, you must join our Roblox community/group and remain a member for at least 14 days before we can top up your Robux. This is a Roblox platform requirement that cannot be bypassed.',
  communityLink: 'https://www.roblox.com/groups/BloxVault',
  communityName: 'BloxVault Official Group',
  daysRequired: 14,
}

export const ORDER_STATUS_LABELS: Record<string, string> = {
  pending_payment: 'Pending Payment',
  under_review: 'Under Review',
  confirmed: 'Confirmed',
  processing: 'Processing',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
}

export const ORDER_STATUS_COLORS: Record<string, string> = {
  pending_payment: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  under_review: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  confirmed: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  processing: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  delivered: 'bg-green-500/10 text-green-500 border-green-500/20',
  cancelled: 'bg-red-500/10 text-red-500 border-red-500/20',
}

export const DELIVERY_STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  preparing: 'Preparing',
  in_transit: 'In Transit',
  delivered: 'Delivered',
}

export function formatPrice(bdt: number): string {
  return `৳${bdt.toLocaleString()}`
}

export function formatCryptoPrice(crypto: number | null): string {
  if (!crypto) return ''
  return `$${crypto}`
}

export function timeAgo(date: Date | string): string {
  const now = new Date()
  const d = new Date(date)
  const diff = now.getTime() - d.getTime()
  
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 30) return `${days}d ago`
  return d.toLocaleDateString()
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}
