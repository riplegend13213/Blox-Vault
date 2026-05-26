'use client'

import { useState, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { motion } from 'framer-motion'
import { Crown, Eye, EyeOff, Mail, Lock, User, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useAppStore } from '@/lib/store'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'

const signupSchema = z
  .object({
    username: z
      .string()
      .min(3, 'Username must be at least 3 characters')
      .max(20, 'Username must be at most 20 characters')
      .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
    email: z.string().email('Please enter a valid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
    terms: z.literal(true, {
      errorMap: () => ({ message: 'You must agree to the Terms of Service and Privacy Policy' }),
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

type SignupFormValues = z.infer<typeof signupSchema>

function getPasswordStrength(password: string): {
  score: number
  label: string
  color: string
} {
  let score = 0
  if (password.length >= 8) score++
  if (password.length >= 12) score++
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++
  if (/\d/.test(password)) score++
  if (/[^a-zA-Z0-9]/.test(password)) score++

  const levels: Array<{ label: string; color: string }> = [
    { label: 'Very weak', color: 'bg-red-500' },
    { label: 'Weak', color: 'bg-orange-500' },
    { label: 'Fair', color: 'bg-yellow-500' },
    { label: 'Strong', color: 'bg-emerald-500' },
    { label: 'Very strong', color: 'bg-emerald-600' },
  ]

  const level = levels[Math.min(score, levels.length) - 1] || levels[0]
  return { score, ...level }
}

export function SignupView() {
  const { setUser, navigate } = useAppStore()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  })

  const passwordValue = watch('password', '')
  const strength = useMemo(() => getPasswordStrength(passwordValue), [passwordValue])

  const onSubmit = async (data: SignupFormValues) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: data.username,
          email: data.email,
          password: data.password,
        }),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        setError(result.error || 'Signup failed. Please try again.')
        return
      }

      setUser(result.data.user)
      toast.success('Account created!', {
        description: `Welcome to BloxVault, ${result.data.user.username}!`,
      })
      navigate('dashboard')
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-md"
      >
        <Card className="relative border-yellow-500/20 bg-white/80 backdrop-blur-xl dark:bg-neutral-900/80 shadow-2xl shadow-yellow-500/5 overflow-hidden">
          {/* Gold glow accent */}
          <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-yellow-500/5 via-transparent to-yellow-500/5 pointer-events-none" />

          <CardHeader className="relative space-y-4 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-yellow-400 to-yellow-600 shadow-lg shadow-yellow-500/25"
            >
              <Crown className="h-7 w-7 text-white" />
            </motion.div>
            <div>
              <CardTitle className="text-2xl font-bold tracking-tight">
                Create Account
              </CardTitle>
              <CardDescription className="mt-1.5 text-sm text-neutral-500">
                Join BloxVault today
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="relative">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {/* Username Field */}
              <div className="space-y-2">
                <Label htmlFor="username" className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Username
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                  <Input
                    id="username"
                    type="text"
                    placeholder="coolplayer123"
                    className="h-11 pl-10 border-neutral-200 bg-white/50 dark:border-neutral-700 dark:bg-neutral-800/50 focus:border-yellow-500 focus:ring-yellow-500/20 transition-all duration-200"
                    {...register('username')}
                  />
                </div>
                {errors.username && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-xs text-red-500"
                  >
                    {errors.username.message}
                  </motion.p>
                )}
              </div>

              {/* Email Field */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    className="h-11 pl-10 border-neutral-200 bg-white/50 dark:border-neutral-700 dark:bg-neutral-800/50 focus:border-yellow-500 focus:ring-yellow-500/20 transition-all duration-200"
                    {...register('email')}
                  />
                </div>
                {errors.email && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-xs text-red-500"
                  >
                    {errors.email.message}
                  </motion.p>
                )}
              </div>

              {/* Password Field with Strength Indicator */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Create a strong password"
                    className="h-11 pl-10 pr-10 border-neutral-200 bg-white/50 dark:border-neutral-700 dark:bg-neutral-800/50 focus:border-yellow-500 focus:ring-yellow-500/20 transition-all duration-200"
                    {...register('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
                    tabIndex={-1}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {passwordValue && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-1.5"
                  >
                    <div className="flex gap-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <div
                          key={i}
                          className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                            i < strength.score ? strength.color : 'bg-neutral-200 dark:bg-neutral-700'
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-xs text-neutral-500">{strength.label}</p>
                  </motion.div>
                )}
                {errors.password && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-xs text-red-500"
                  >
                    {errors.password.message}
                  </motion.p>
                )}
              </div>

              {/* Confirm Password Field */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Confirm Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Confirm your password"
                    className="h-11 pl-10 pr-10 border-neutral-200 bg-white/50 dark:border-neutral-700 dark:bg-neutral-800/50 focus:border-yellow-500 focus:ring-yellow-500/20 transition-all duration-200"
                    {...register('confirmPassword')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
                    tabIndex={-1}
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-xs text-red-500"
                  >
                    {errors.confirmPassword.message}
                  </motion.p>
                )}
              </div>

              {/* Terms Checkbox */}
              <div className="space-y-1">
                <div className="flex items-start gap-2">
                  <Checkbox
                    id="terms"
                    className="mt-0.5 data-[state=checked]:bg-yellow-500 data-[state=checked]:border-yellow-500"
                    onCheckedChange={(checked) => {
                      register('terms').onChange({ target: { value: checked, name: 'terms' } })
                    }}
                  />
                  <Label
                    htmlFor="terms"
                    className="text-sm font-normal leading-snug text-neutral-600 dark:text-neutral-400 cursor-pointer"
                  >
                    I agree to the{' '}
                    <span className="text-yellow-600 dark:text-yellow-400 font-medium">
                      Terms of Service
                    </span>{' '}
                    and{' '}
                    <span className="text-yellow-600 dark:text-yellow-400 font-medium">
                      Privacy Policy
                    </span>
                  </Label>
                </div>
                {errors.terms && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-xs text-red-500"
                  >
                    {errors.terms.message}
                  </motion.p>
                )}
              </div>

              {/* Error Message */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400"
                >
                  {error}
                </motion.div>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isLoading}
                className="h-11 w-full bg-gradient-to-r from-yellow-500 to-yellow-600 text-white font-semibold shadow-lg shadow-yellow-500/25 hover:from-yellow-600 hover:to-yellow-700 hover:shadow-yellow-500/30 transition-all duration-200 disabled:opacity-70"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  'Create Account'
                )}
              </Button>

              {/* Sign In Link */}
              <p className="text-center text-sm text-neutral-500">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => navigate('login')}
                  className="font-semibold text-yellow-600 hover:text-yellow-500 dark:text-yellow-400 dark:hover:text-yellow-300 transition-colors"
                >
                  Sign in
                </button>
              </p>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
