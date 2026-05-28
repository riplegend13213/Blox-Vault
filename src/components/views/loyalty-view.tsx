'use client'

import { useAppStore } from '@/lib/store'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useState } from 'react'
import { Gift, ChevronRight } from 'lucide-react'

export function LoyaltyView() {
  const { isAuthenticated, navigate } = useAppStore()
  const qc = useQueryClient()
  const [redeemAmount, setRedeemAmount] = useState<number>(0)

  const { data, isLoading } = useQuery({
    queryKey: ['loyalty-home'],
    queryFn: async () => {
      const res = await fetch('/api/loyalty')
      const json = await res.json()
      return json.success ? json.data : null
    },
    enabled: isAuthenticated,
  })

  // FIXED MUTATION
  const redeemMutation = useMutation<any, Error, number>({
    mutationFn: async (points: number) => {
      const res = await fetch('/api/loyalty', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ points }),
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to redeem')
      }

      return data
    },

    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: ['loyalty-home'],
      })

      setRedeemAmount(0)
    },
  })

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Gift className="w-16 h-16 text-muted-foreground/40" />

        <h2 className="text-xl font-semibold">
          Please sign in
        </h2>

        <p className="text-muted-foreground text-sm">
          You need to be logged in to view your loyalty dashboard.
        </p>

        <Button
          onClick={() => navigate('login')}
          className="bg-gold hover:bg-gold/90 text-gold-foreground"
        >
          Sign In
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          Loyalty Dashboard
        </h1>

        <Button
          variant="ghost"
          onClick={() => navigate('shop')}
        >
          Browse Shop
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>

      {/* Balance Card */}
      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : (
            <div className="flex flex-col items-center gap-3">

              <div className="w-20 h-20 rounded-full bg-gold/10 flex items-center justify-center">
                <Gift className="w-8 h-8 text-gold" />
              </div>

              <p className="text-muted-foreground">
                Your Points Balance
              </p>

              <p className="text-3xl font-bold text-gold">
                {(data?.balance ?? 0).toLocaleString()} pts
              </p>

              <p className="text-sm text-muted-foreground">
                Total earned: {(data?.totalEarned ?? 0)} pts ·
                Spent: {(data?.totalSpent ?? 0)} pts
              </p>

            </div>
          )}
        </CardContent>
      </Card>

      {/* Redeem */}
      <Card>
        <CardHeader>
          <CardTitle>
            Redeem Points
          </CardTitle>
        </CardHeader>

        <CardContent>
          <div className="flex items-center gap-3">

            <input
              type="number"
              min={1}
              value={redeemAmount}
              onChange={(e) =>
                setRedeemAmount(Number(e.target.value))
              }
              className="input input-bordered w-32"
            />

            <Button
              disabled={
                !redeemAmount ||
                redeemAmount <= 0 ||
                redeemMutation.isPending
              }
              onClick={() =>
                redeemMutation.mutate(redeemAmount)
              }
            >
              {redeemMutation.isPending
                ? 'Redeeming...'
                : 'Redeem'}
            </Button>

          </div>

          {redeemMutation.error && (
            <p className="text-sm text-destructive mt-2">
              {redeemMutation.error.message}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>
            Recent Point Transactions
          </CardTitle>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : (
            <div className="space-y-2">

              {(data?.recentTransactions ?? []).map((t: any) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between"
                >
                  <div>
                    <p className="font-medium text-sm">
                      {t.type.replace('_', ' ')}
                    </p>

                    <p className="text-xs text-muted-foreground">
                      {new Date(t.createdAt).toLocaleString()}
                    </p>
                  </div>

                  <div
                    className={`font-semibold ${
                      t.amount > 0
                        ? 'text-emerald-400'
                        : 'text-destructive'
                    }`}
                  >
                    {t.amount > 0
                      ? `+${t.amount}`
                      : t.amount}
                  </div>
                </div>
              ))}

              {(data?.recentTransactions ?? []).length === 0 && (
                <p className="text-muted-foreground text-sm">
                  No transactions yet.
                </p>
              )}

            </div>
          )}
        </CardContent>
      </Card>

    </div>
  )
}