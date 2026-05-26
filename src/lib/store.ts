import { create } from 'zustand'

export type ViewType = 
  | 'home' 
  | 'shop' 
  | 'product' 
  | 'login' 
  | 'signup' 
  | 'dashboard' 
  | 'orders' 
  | 'wishlist' 
  | 'notifications' 
  | 'settings' 
  | 'support' 
  | 'ticket' 
  | 'robux'
  | 'admin' 
  | 'admin-products' 
  | 'admin-orders' 
  | 'admin-users' 
  | 'admin-reviews' 
  | 'admin-analytics'
  | 'admin-support'
  | 'admin-robux'
  | 'admin-announcements'

interface AppState {
  // Navigation
  currentView: ViewType
  selectedProductId: string | null
  selectedTicketId: string | null
  navigate: (view: ViewType, id?: string) => void
  
  // Auth
  user: any | null
  isAuthenticated: boolean
  isAdmin: boolean
  setUser: (user: any | null) => void
  logout: () => void
  
  // UI
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  mobileMenuOpen: boolean
  setMobileMenuOpen: (open: boolean) => void
  searchQuery: string
  setSearchQuery: (query: string) => void
  selectedCategory: string
  setSelectedCategory: (category: string) => void
  announcementDismissed: boolean
  setAnnouncementDismissed: (dismissed: boolean) => void
}

export const useAppStore = create<AppState>((set, get) => ({
  // Navigation
  currentView: 'home',
  selectedProductId: null,
  selectedTicketId: null,
  navigate: (view, id) => {
    set({ 
      currentView: view,
      selectedProductId: view === 'product' ? (id || null) : get().selectedProductId,
      selectedTicketId: view === 'ticket' ? (id || null) : get().selectedTicketId,
      mobileMenuOpen: false,
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  },
  
  // Auth
  user: null,
  isAuthenticated: false,
  isAdmin: false,
  setUser: (user) => set({ 
    user, 
    isAuthenticated: !!user, 
    isAdmin: user?.role === 'admin' 
  }),
  logout: () => {
    set({ 
      user: null, 
      isAuthenticated: false, 
      isAdmin: false,
      currentView: 'home',
    })
  },
  
  // UI
  sidebarOpen: false,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  mobileMenuOpen: false,
  setMobileMenuOpen: (open) => set({ mobileMenuOpen: open }),
  searchQuery: '',
  setSearchQuery: (query) => set({ searchQuery: query }),
  selectedCategory: 'all',
  setSelectedCategory: (category) => set({ selectedCategory: category }),
  announcementDismissed: false,
  setAnnouncementDismissed: (dismissed) => set({ announcementDismissed: dismissed }),
}))
