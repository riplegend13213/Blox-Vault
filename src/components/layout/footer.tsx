'use client'

import { useAppStore } from '@/lib/store'
import { Crown, Mail, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

export function Footer() {
  const { navigate } = useAppStore()

  return (
    <footer className="border-t border-border bg-card/50 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-1">
            <button onClick={() => navigate('home')} className="flex items-center gap-2 mb-4">
              <Crown className="w-6 h-6 text-gold" />
              <span className="text-lg font-bold">
                Blox<span className="text-gold">Vault</span>
              </span>
            </button>
            <p className="text-sm text-muted-foreground leading-relaxed">
              The most trusted premium Blox Fruits service platform. Secure, fast, and professional.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-sm font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2.5">
              {[
                { label: 'Home', view: 'home' as const },
                { label: 'Shop', view: 'shop' as const },
                { label: 'Support', view: 'support' as const },
              ].map((item) => (
                <li key={item.view}>
                  <button
                    onClick={() => navigate(item.view)}
                    className="text-sm text-muted-foreground hover:text-gold transition-colors"
                  >
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-sm font-semibold mb-4">Legal</h4>
            <ul className="space-y-2.5">
              {['Terms of Service', 'Privacy Policy', 'Refund Policy', 'Cookie Policy'].map((item) => (
                <li key={item}>
                  <span className="text-sm text-muted-foreground hover:text-gold transition-colors cursor-pointer">
                    {item}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-sm font-semibold mb-4">Contact</h4>
            <ul className="space-y-2.5">
              <li className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="w-4 h-4" />
                support@bloxvault.com
              </li>
              <li className="flex items-center gap-2 text-sm text-muted-foreground">
                <MessageSquare className="w-4 h-4" />
                Discord: BloxVault
              </li>
            </ul>
          </div>
        </div>

        <Separator className="my-8" />

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} BloxVault. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <span className="text-xs text-muted-foreground">Accepted Payments:</span>
            <div className="flex items-center gap-2">
              {['bKash', 'Nagad', 'USDT', 'BTC'].map((method) => (
                <span key={method} className="text-xs px-2 py-1 rounded bg-accent text-muted-foreground">
                  {method}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
