'use client'

import { useAppStore } from '@/lib/store'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Crown, ShoppingBag, Home, Search, User, Menu, X, 
  Moon, Sun, Shield, LogOut, Bell, Heart, Settings,
  Package, MessageSquare, BarChart3, Users, ChevronDown,
  LayoutDashboard, FolderOpen, ClipboardList, Star, Coins,
  Megaphone
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { useEffect, useSyncExternalStore, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, 
  DropdownMenuSeparator, DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'

export function Navbar() {
  const { 
    currentView, navigate, isAuthenticated, isAdmin, user,
    mobileMenuOpen, setMobileMenuOpen, searchQuery, setSearchQuery 
  } = useAppStore()
  const { theme, setTheme } = useTheme()
  const [scrolled, setScrolled] = useState(false)
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  )

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const navItems = [
    { view: 'home' as const, label: 'Home', icon: Home },
    { view: 'shop' as const, label: 'Shop', icon: ShoppingBag },
    { view: 'robux' as const, label: 'Robux', icon: Coins },
  ]

  const userMenuItems = [
    { view: 'dashboard' as const, label: 'Dashboard', icon: LayoutDashboard },
    { view: 'orders' as const, label: 'My Orders', icon: Package },
    { view: 'wishlist' as const, label: 'Wishlist', icon: Heart },
    { view: 'notifications' as const, label: 'Notifications', icon: Bell },
    { view: 'support' as const, label: 'Support', icon: MessageSquare },
    { view: 'settings' as const, label: 'Settings', icon: Settings },
  ]

  const adminMenuItems = [
    { view: 'admin' as const, label: 'Overview', icon: BarChart3 },
    { view: 'admin-products' as const, label: 'Products', icon: FolderOpen },
    { view: 'admin-orders' as const, label: 'Orders', icon: ClipboardList },
    { view: 'admin-robux' as const, label: 'Robux', icon: Coins },
    { view: 'admin-users' as const, label: 'Users', icon: Users },
    { view: 'admin-reviews' as const, label: 'Reviews', icon: Star },
    { view: 'admin-analytics' as const, label: 'Analytics', icon: BarChart3 },
    { view: 'admin-announcements' as const, label: 'Announcements', icon: Megaphone },
    { view: 'admin-support' as const, label: 'Support', icon: MessageSquare },
  ]

  return (
    <>
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled 
            ? 'bg-background/80 backdrop-blur-xl border-b border-border shadow-sm' 
            : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <button 
              onClick={() => navigate('home')}
              className="flex items-center gap-2 group"
            >
              <div className="relative w-8 h-8 flex items-center justify-center">
                <Crown className="w-7 h-7 text-gold transition-transform group-hover:scale-110" />
                <div className="absolute inset-0 bg-gold/20 blur-lg rounded-full" />
              </div>
              <span className="text-lg font-bold tracking-tight">
                Blox<span className="text-gold">Vault</span>
              </span>
            </button>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => (
                <button
                  key={item.view}
                  onClick={() => navigate(item.view)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    currentView === item.view
                      ? 'bg-gold/10 text-gold'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                  }`}
                >
                  {item.label}
                </button>
              ))}
              
              {isAdmin && (
                <button
                  onClick={() => navigate('admin')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-1.5 ${
                    currentView.startsWith('admin')
                      ? 'bg-gold/10 text-gold'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                  }`}
                >
                  <Shield className="w-3.5 h-3.5" />
                  Admin
                </button>
              )}
            </nav>

            {/* Search & Actions */}
            <div className="hidden md:flex items-center gap-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    if (e.target.value && currentView !== 'shop') navigate('shop')
                  }}
                  className="pl-9 w-48 h-9 bg-accent/50 border-border/50 focus:border-gold/50 focus:ring-gold/20 text-sm"
                />
              </div>

              {/* Theme Toggle */}
              {mounted && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                  className="h-9 w-9"
                >
                  {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </Button>
              )}

              {isAuthenticated ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="gap-2 h-9 px-3">
                      <Avatar className="h-7 w-7">
                        <AvatarFallback className="bg-gold/10 text-gold text-xs">
                          {user?.username?.charAt(0).toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium max-w-[100px] truncate">{user?.username}</span>
                      <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <div className="px-2 py-1.5">
                      <p className="text-sm font-medium">{user?.username}</p>
                      <p className="text-xs text-muted-foreground">{user?.email}</p>
                    </div>
                    <DropdownMenuSeparator />
                    {userMenuItems.map((item) => (
                      <DropdownMenuItem 
                        key={item.view} 
                        onClick={() => navigate(item.view)}
                        className="gap-2 cursor-pointer"
                      >
                        <item.icon className="w-4 h-4" />
                        {item.label}
                      </DropdownMenuItem>
                    ))}
                    {isAdmin && (
                      <>
                        <DropdownMenuSeparator />
                        <div className="px-2 py-1.5">
                          <p className="text-xs font-medium text-gold flex items-center gap-1">
                            <Shield className="w-3 h-3" /> Admin Panel
                          </p>
                        </div>
                        {adminMenuItems.map((item) => (
                          <DropdownMenuItem 
                            key={item.view} 
                            onClick={() => navigate(item.view)}
                            className="gap-2 cursor-pointer"
                          >
                            <item.icon className="w-4 h-4" />
                            {item.label}
                          </DropdownMenuItem>
                        ))}
                      </>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => useAppStore.getState().logout()}
                      className="gap-2 text-destructive cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate('login')}
                    className="text-sm"
                  >
                    Sign In
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => navigate('signup')}
                    className="bg-gold hover:bg-gold/90 text-gold-foreground text-sm"
                  >
                    Get Started
                  </Button>
                </div>
              )}
            </div>

            {/* Mobile Menu Button */}
            <div className="flex md:hidden items-center gap-2">
              {mounted && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                  className="h-9 w-9"
                >
                  {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="h-9 w-9"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </Button>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
              onClick={() => setMobileMenuOpen(false)}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 bottom-0 z-50 w-[280px] bg-background border-l border-border md:hidden"
            >
              <div className="flex items-center justify-between p-4 border-b border-border">
                <span className="font-bold">
                  Blox<span className="text-gold">Vault</span>
                </span>
                <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(false)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>
              <ScrollArea className="h-[calc(100vh-60px)]">
                <div className="p-4">
                  {/* Search */}
                  <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search products..."
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value)
                        if (e.target.value && currentView !== 'shop') navigate('shop')
                      }}
                      className="pl-9"
                    />
                  </div>

                  {/* Nav Items */}
                  <div className="space-y-1 mb-4">
                    {navItems.map((item) => (
                      <button
                        key={item.view}
                        onClick={() => navigate(item.view)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                          currentView === item.view
                            ? 'bg-gold/10 text-gold'
                            : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                        }`}
                      >
                        <item.icon className="w-4 h-4" />
                        {item.label}
                      </button>
                    ))}
                  </div>

                  {isAuthenticated ? (
                    <>
                      <div className="border-t border-border pt-4 mb-4">
                        <div className="flex items-center gap-3 px-3 mb-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-gold/10 text-gold text-sm">
                              {user?.username?.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">{user?.username}</p>
                            <p className="text-xs text-muted-foreground">{user?.email}</p>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-1 mb-4">
                        {userMenuItems.map((item) => (
                          <button
                            key={item.view}
                            onClick={() => navigate(item.view)}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                              currentView === item.view
                                ? 'bg-gold/10 text-gold'
                                : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                            }`}
                          >
                            <item.icon className="w-4 h-4" />
                            {item.label}
                          </button>
                        ))}
                      </div>
                      {isAdmin && (
                        <>
                          <div className="border-t border-border pt-4 mb-4">
                            <p className="text-xs font-medium text-gold flex items-center gap-1.5 px-3 mb-2">
                              <Shield className="w-3.5 h-3.5" /> Admin Panel
                            </p>
                            <div className="space-y-1">
                              {adminMenuItems.map((item) => (
                                <button
                                  key={item.view}
                                  onClick={() => navigate(item.view)}
                                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                                    currentView === item.view
                                      ? 'bg-gold/10 text-gold'
                                      : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                                  }`}
                                >
                                  <item.icon className="w-4 h-4" />
                                  {item.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        </>
                      )}
                      <div className="border-t border-border pt-4">
                        <button
                          onClick={() => { useAppStore.getState().logout(); setMobileMenuOpen(false) }}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 transition-all"
                        >
                          <LogOut className="w-4 h-4" />
                          Sign Out
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="space-y-2 border-t border-border pt-4">
                      <Button
                        className="w-full bg-gold hover:bg-gold/90 text-gold-foreground"
                        onClick={() => navigate('signup')}
                      >
                        Get Started
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => navigate('login')}
                      >
                        Sign In
                      </Button>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
