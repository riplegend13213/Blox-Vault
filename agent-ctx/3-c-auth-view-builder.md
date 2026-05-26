# Task 3-c: Auth View Builder

## Task
Build Login and Signup view components for BloxVault

## Work Completed

### login-view.tsx
- Glass morphism card with gold border/glow and backdrop blur
- Crown icon + "BloxVault" branding at top
- "Welcome Back" heading with "Sign in to your account" subtitle
- Email input with Mail icon prefix
- Password input with Lock icon prefix and show/hide toggle (Eye/EyeOff)
- "Remember me" checkbox with gold check color
- Full-width gold gradient "Sign In" button with loading state (Loader2 spinner)
- "Don't have an account? Sign up" link navigating to signup view
- Form validation via react-hook-form + zod (email format, password required)
- POST to /api/auth/login with email/password
- On success: setUser() in store, navigate to dashboard, success toast via sonner
- On error: red error banner below form
- Framer Motion card entry animation (fade + slide up)
- Premium focus styles: focus:border-yellow-500, focus:ring-yellow-500/20

### signup-view.tsx
- Matching glass morphism card layout as login
- Crown icon branding, "Create Account" heading, "Join BloxVault today" subtitle
- Username input with User icon (min 3 chars, alphanumeric+underscore validation)
- Email input with Mail icon (valid email format validation)
- Password input with Lock icon, show/hide toggle, and 5-level strength indicator
  - Strength bars: Very weak (red) → Weak (orange) → Fair (yellow) → Strong (emerald) → Very strong (dark emerald)
  - Checks: length ≥8, length ≥12, mixed case, digits, special chars
- Confirm password input with must-match validation via zod .refine()
- Terms checkbox: "I agree to the Terms of Service and Privacy Policy" with gold links
- Full-width gold gradient "Create Account" button with loading state
- "Already have an account? Sign in" link navigating to login view
- Inline validation errors with fade-in animation on all fields
- POST to /api/auth/signup with username, email, password
- On success: auto-login via setUser(), navigate to dashboard, success toast
- On error: red error banner below form

### Shared Patterns
- Both use 'use client' directive
- Both import useAppStore from @/lib/store
- Both use react-hook-form + zod + @hookform/resolvers/zod
- Both use shadcn/ui: Card, CardContent, CardHeader, CardTitle, CardDescription, Button, Input, Label, Checkbox
- Both use Framer Motion for card entry animation
- Both use Lucide icons: Crown, Eye, EyeOff, Mail, Lock, User, Loader2
- Both use sonner toast for success/error notifications
- Premium styling: gold gradients, glass morphism, backdrop blur, yellow-500 focus rings
- Responsive design with max-w-md centered cards

## Context for Other Agents
- These views are registered as 'login' and 'signup' in the ViewType system
- They depend on useAppStore.navigate() and useAppStore.setUser()
- API endpoints: POST /api/auth/login, POST /api/auth/signup
- API response format: { success: boolean, data?: { user }, error?: string }
