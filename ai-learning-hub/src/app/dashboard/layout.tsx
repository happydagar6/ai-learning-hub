"use client"
import React from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useUser, UserButton } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { Upload, Brain, MessageSquare, CreditCard, Home, Sparkles, Accessibility, Loader2 } from 'lucide-react'
import { VoiceNavigationControls } from '@/components/ui/voice-navigation-controls'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { CompactFooter } from '@/components/ui/compact-footer'

const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();
  const pathname = usePathname();
  const { isSignedIn, user, isLoaded } = useUser();

  // Show loading while checking authentication
  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to sign-in if not authenticated
  if (!isSignedIn) {
    router.push('/sign-in');
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Redirecting to sign in...</p>
        </div>
      </div>
    );
  }

  const navigationItems = [
    { href: '/dashboard', label: 'Dashboard', icon: Home, color: 'text-muted-foreground' },
    { href: '/dashboard/upload', label: 'Upload', icon: Upload, color: 'text-blue-600' },
    { href: '/dashboard/study-plan', label: 'Study Plan', icon: Brain, color: 'text-green-600' },
    { href: '/dashboard/immersive', label: 'Immersive', icon: Accessibility, color: 'text-purple-600' },
    { href: '/dashboard/qa', label: 'Q&A', icon: MessageSquare, color: 'text-indigo-600' },
    { href: '/dashboard/flashcards', label: 'Flashcards', icon: CreditCard, color: 'text-orange-600' },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="bg-card shadow-sm border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center justify-between w-full md:w-auto">
            <h1 className="text-2xl font-bold text-foreground">Learning Hub</h1>
            <div className="flex items-center gap-2 md:hidden">
              <UserButton 
                appearance={{
                  elements: {
                    avatarBox: "h-7 w-7",
                    userButtonPopoverCard: "shadow-lg",
                  }
                }}
                userProfileMode="modal"
                afterSignOutUrl="/"
              />
              <ThemeToggle />
              <Button variant="outline" onClick={() => router.push('/')}>
                <Home className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <nav className="flex items-center gap-2 md:gap-4 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 no-scrollbar">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Button
                  key={item.href}
                  variant={isActive ? "default" : "ghost"}
                  onClick={() => router.push(item.href)}
                  className={`flex items-center gap-2 whitespace-nowrap ${isActive ? '' : 'hover:bg-accent'}`}
                  size="sm"
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{item.label}</span>
                </Button>
              );
            })}
          </nav>
          
          <div className="hidden md:flex items-center gap-2">
            <VoiceNavigationControls />
            <ThemeToggle />
            <UserButton 
              appearance={{
                elements: {
                  avatarBox: "h-8 w-8",
                  userButtonPopoverCard: "shadow-lg",
                }
              }}
              userProfileMode="modal"
              afterSignOutUrl="/"
            />
            <Button variant="outline" onClick={() => router.push('/')} size="sm">
              <Home className="h-4 w-4 mr-2" />
              Home
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-6 md:py-8 pb-16 overflow-y-auto">
        {children}
      </main>
      
      <CompactFooter />
    </div>
  )
}

export default DashboardLayout
