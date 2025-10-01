"use client"

import React, { useEffect } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { UserButton, useUser } from '@clerk/nextjs'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { Badge } from '@/components/ui/badge'
import { 
  Brain, 
  Upload, 
  MessageSquare, 
  CreditCard, 
  Bell, 
  Menu,
  X,
  Zap,
  ChevronRight,
  Home,
  Settings
} from 'lucide-react'
import { useState } from 'react'

interface NavigationItem {
  title: string
  href: string
  icon: React.ElementType
  description?: string
  badge?: string
  category?: 'main' | 'tools' | 'learning'
}

const navigationItems: NavigationItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: Home,
    description: "Overview & analytics",
    category: "main"
  },
  {
    title: "Upload",
    href: "/dashboard/upload",
    icon: Upload,
    description: "Upload documents",
    category: "main"
  },
  {
    title: "Study Plan",
    href: "/dashboard/study-plan",
    icon: Brain,
    description: "Personalized plans",
    category: "learning"
  },
  {
    title: "Q&A Assistant",
    href: "/dashboard/qa",
    icon: MessageSquare,
    description: "Chat with documents",
    category: "learning"
  },
  {
    title: "Flashcards",
    href: "/dashboard/flashcards",
    icon: CreditCard,
    description: "Study flashcards",
    category: "learning"
  },
  {
    title: "Immersive Mode",
    href: "/dashboard/immersive",
    icon: Zap,
    description: "Immersive study mode",
    badge: "New",
    category: "tools"
  },
  {
    title: "Reminders",
    href: "/dashboard/reminders",
    icon: Bell,
    description: "Study reminders",
    category: "tools"
  }
]

const categoryLabels = {
  main: "Main",
  learning: "Learning Tools", 
  tools: "Productivity"
}

export const DashboardHeader: React.FC = () => {
  const { user } = useUser()
  const pathname = usePathname()
  const router = useRouter()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [pathname])

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isMobileMenuOpen])

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard'
    }
    return pathname.startsWith(href)
  }

  const groupedItems = navigationItems.reduce((acc, item) => {
    const category = item.category || 'main'
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push(item)
    return acc
  }, {} as Record<string, NavigationItem[]>)

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-sm">
        <div className="container flex h-16 items-center justify-between px-4">
          {/* Logo/Brand */}
          <div className="flex items-center gap-6">
            <Link 
              href="/dashboard" 
              className="flex items-center gap-2 font-semibold text-lg hover:opacity-80 transition-all duration-200 hover:scale-105"
            >
              <div className="relative">
                <Brain className="h-7 w-7 text-primary" />
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              </div>
              <span className="hidden sm:inline bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                AI Learning Hub
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-1">
              {navigationItems.slice(0, 5).map((item) => {
                const Icon = item.icon
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "relative flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 hover:scale-105",
                      isActive(item.href)
                        ? "bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-md"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="hidden xl:inline">{item.title}</span>
                    {item.badge && (
                      <Badge variant="secondary" className="ml-1 text-xs py-0 px-1 hidden xl:inline">
                        {item.badge}
                      </Badge>
                    )}
                    {isActive(item.href) && (
                      <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-transparent rounded-lg blur-sm"></div>
                    )}
                  </Link>
                )
              })}
            </nav>
          </div>

          {/* Right side controls */}
          <div className="flex items-center gap-3">
            {/* Theme Toggle - Hidden on mobile for space */}
            <div className="hidden sm:block">
              <ThemeToggle />
            </div>

            {/* User Menu */}
            <UserButton 
              appearance={{
                elements: {
                  avatarBox: "h-8 w-8 ring-2 ring-primary/20 ring-offset-2 hover:ring-primary/40 transition-all duration-200",
                  userButtonPopoverCard: "shadow-xl border-0 bg-background/95 backdrop-blur",
                  userButtonPopoverActionButton: "hover:bg-accent/50 transition-colors duration-200",
                }
              }}
              afterSignOutUrl="/"
            />

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden relative p-2 hover:bg-accent/50 transition-all duration-200"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              <div className="relative">
                {isMobileMenuOpen ? (
                  <X className="h-5 w-5 rotate-0 transition-transform duration-300" />
                ) : (
                  <Menu className="h-5 w-5 transition-transform duration-300" />
                )}
              </div>
            </Button>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm lg:hidden transition-opacity duration-300"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          
          {/* Sidebar */}
          <div className="fixed top-0 left-0 z-50 h-full w-80 max-w-[85vw] bg-background border-r shadow-2xl lg:hidden transform transition-transform duration-300 ease-out">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-primary/5 to-purple-500/5">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Brain className="h-8 w-8 text-primary" />
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                </div>
                <div>
                  <h2 className="font-semibold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                    AI Learning Hub
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Welcome back, {user?.firstName || 'Student'}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMobileMenuOpen(false)}
                className="hover:bg-accent/50"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Navigation */}
            <div className="flex-1 overflow-y-auto p-4">
              <nav className="space-y-6">
                {Object.entries(groupedItems).map(([category, items]) => (
                  <div key={category} className="space-y-2">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3">
                      {categoryLabels[category as keyof typeof categoryLabels]}
                    </h3>
                    <div className="space-y-1">
                      {items.map((item) => {
                        const Icon = item.icon
                        const active = isActive(item.href)
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setIsMobileMenuOpen(false)}
                            className={cn(
                              "group flex items-center gap-3 px-3 py-3 text-sm font-medium rounded-lg transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]",
                              active
                                ? "bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-lg"
                                : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                            )}
                          >
                            <div className={cn(
                              "flex items-center justify-center w-10 h-10 rounded-lg transition-all duration-200",
                              active 
                                ? "bg-white/20 text-primary-foreground" 
                                : "bg-accent/50 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
                            )}>
                              <Icon className="h-5 w-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="truncate">{item.title}</span>
                                {item.badge && (
                                  <Badge variant="secondary" className="text-xs py-0 px-1.5">
                                    {item.badge}
                                  </Badge>
                                )}
                              </div>
                              {item.description && (
                                <p className="text-xs opacity-70 truncate">{item.description}</p>
                              )}
                            </div>
                            <ChevronRight className="h-4 w-4 opacity-50 group-hover:opacity-100 transition-opacity duration-200" />
                          </Link>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </nav>
            </div>

            {/* Footer */}
            <div className="p-4 border-t bg-gradient-to-r from-accent/20 to-transparent">
              <div className="flex items-center justify-center">
                <div className="flex items-center gap-3">
                  <ThemeToggle />
                  <span className="text-xs text-muted-foreground">Theme</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}