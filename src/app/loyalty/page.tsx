import { LoyaltyView } from '@/components/views/loyalty-view'

export const metadata = {
  title: 'Loyalty - BloxVault',
}

export default function LoyaltyPage() {
  return (
    <main className="max-w-6xl mx-auto py-12 px-4">
      <LoyaltyView />
    </main>
  )
}
