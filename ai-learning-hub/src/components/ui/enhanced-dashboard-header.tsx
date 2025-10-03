'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { UserButton } from '@clerk/nextjs'
import { 
  Menu, 
  Brain,
  Upload, 
  MessageSquare, 
  Bell, 
  Zap,
  Home,
  BookOpen,
  FlaskConical
} from 'lucide-react'
import { Button } from './button'
import { Badge } from './badge'
import { MobileSidebar } from './mobile-sidebar'
import { useResponsiveNavigation } from '@/hooks/useResponsiveNavigation'
import { useFocusManagement } from '@/hooks/useMobileGestures'

const quickNavItems = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Upload', href: '/dashboard/upload', icon: Upload },
  { name: 'Study Plans', href: '/dashboard/study-plan', icon: BookOpen },
  { name: 'Flashcards', href: '/dashboard/flashcards', icon: FlaskConical },
  { name: 'Q&A', href: '/dashboard/qa', icon: MessageSquare },
  { name: 'Immersive', href: '/dashboard/immersive', icon: Zap, badge: 'New' },
]

export const EnhancedDashboardHeader = () => {
  const pathname = usePathname()
  const { isKeyboardUser } = useFocusManagement()
  const {
    isSidebarOpen,
    isScrolled,
    isMobile,
    toggleSidebar,
    closeSidebar,
    handleRouteChange
  } = useResponsiveNavigation()

  return (
    <>
      <header className={`sticky top-0 z-30 w-full border-b border-blue-200/50 dark:border-blue-800/50 bg-gradient-to-r from-white via-blue-50 to-purple-50 dark:from-slate-900 dark:via-blue-950 dark:to-purple-950 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:supports-[backdrop-filter]:bg-slate-900/60 transition-all duration-200 ${
        isScrolled ? 'shadow-lg shadow-blue-500/10 dark:shadow-blue-500/20' : ''
      }`}>
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            {/* Mobile Menu Button & Logo */}
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                className={`lg:hidden h-10 w-10 p-0 hover:bg-blue-100/50 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-all duration-200 ${
                  isSidebarOpen ? 'scale-95 rotate-90' : 'scale-100 rotate-0'
                }`}
                onClick={toggleSidebar}
                aria-label="Toggle navigation menu"
              >
                <Menu className={`h-5 w-5 transition-all duration-200 ${isSidebarOpen ? 'opacity-75' : 'opacity-100'}`} />
              </Button>
              
              <Link 
                href="/dashboard" 
                className="flex items-center space-x-2 transition-all duration-200 hover:opacity-80 hover:scale-105"
              >
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg">
                  <Brain className="w-5 h-5 text-white" />
                </div>
                <span className="hidden sm:block font-bold text-lg bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  AI Learning Hub
                </span>
              </Link>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center space-x-1">
              {quickNavItems.map((item) => {
                const IconComponent = item.icon
                const isActive = pathname === item.href
                
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`group relative flex items-center space-x-2 px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                      isActive
                        ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg shadow-blue-500/25'
                        : 'text-slate-700 dark:text-slate-300 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-100/50 dark:hover:bg-blue-900/30'
                    } ${isKeyboardUser ? 'focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2' : ''}`}
                  >
                    <IconComponent className={`h-4 w-4 transition-all duration-200 ${
                      isActive ? 'text-white' : 'text-blue-500 dark:text-blue-400 group-hover:text-blue-600 dark:group-hover:text-blue-300 group-hover:scale-110'
                    }`} />
                    <span className="hidden xl:block">{item.name}</span>
                    {item.badge && (
                      <Badge className={`ml-1 text-xs ${
                        isActive 
                          ? 'bg-white/20 text-white border-white/30' 
                          : 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white border-0 shadow-sm'
                      }`}>
                        {item.badge}
                      </Badge>
                    )}
                    {isActive && (
                      <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-white rounded-full shadow-sm" />
                    )}
                  </Link>
                )
              })}
            </nav>

            {/* Right Section */}
            <div className="flex items-center space-x-3">
              {/* Notifications (Desktop) */}
              <Button
                variant="ghost"
                size="sm"
                className="hidden md:flex h-9 w-9 p-0 relative hover:bg-blue-100/50 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                aria-label="Notifications"
              >
                <Bell className="h-4 w-4" />
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-gradient-to-r from-red-500 to-pink-500 rounded-full shadow-sm animate-pulse" />
              </Button>

              {/* User Menu */}
              <div className="flex items-center">
                <UserButton 
                  afterSignOutUrl="/"
                  appearance={{
                    elements: {
                      avatarBox: "w-8 h-8 ring-2 ring-blue-200 dark:ring-blue-800 hover:ring-blue-300 dark:hover:ring-blue-700 transition-all duration-200"
                    }
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Bottom Navigation Bar (visible only on small screens) */}
        <div className="lg:hidden border-t border-blue-200/50 dark:border-blue-800/50 bg-gradient-to-r from-blue-50/80 to-purple-50/80 dark:from-blue-950/80 dark:to-purple-950/80 backdrop-blur">
          <div className="flex items-center justify-around py-2 px-4">
            {quickNavItems.slice(0, 4).map((item) => {
              const IconComponent = item.icon
              const isActive = pathname === item.href
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex flex-col items-center space-y-1 p-2 rounded-lg transition-all duration-200 ${
                    isActive
                      ? 'text-blue-600 dark:text-blue-400 bg-blue-100/50 dark:bg-blue-900/50 scale-105'
                      : 'text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-100/30 dark:hover:bg-blue-900/30'
                  }`}
                >
                  <IconComponent className={`h-5 w-5 transition-all duration-200 ${
                    isActive ? 'text-blue-600 dark:text-blue-400 scale-110' : 'text-slate-600 dark:text-slate-400'
                  }`} />
                  <span className="text-xs font-medium">{item.name}</span>
                  {item.badge && (
                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full shadow-sm" />
                  )}
                </Link>
              )
            })}
          </div>
        </div>
      </header>

      {/* Mobile Sidebar */}
      <MobileSidebar 
        isOpen={isSidebarOpen}
        onClose={closeSidebar}
        onRouteChange={handleRouteChange}
      />
    </>
  )
}