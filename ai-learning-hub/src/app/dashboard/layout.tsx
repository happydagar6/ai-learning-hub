"use client"
import React from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { Loader2 } from 'lucide-react'
import { CompactFooter } from '@/components/ui/compact-footer'
import { DashboardHeader } from '@/components/ui/dashboard-header'
import { EnhancedDashboardHeader } from '@/components/ui/enhanced-dashboard-header'

const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();
  const { isSignedIn, isLoaded } = useUser();

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

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <EnhancedDashboardHeader />
      <main className="flex-1 container mx-auto px-4 py-6 md:py-8 pb-4 md:pb-8 overflow-y-auto">
        {children}
      </main>
      <CompactFooter className="hidden md:block" />
    </div>
  )
}

export default DashboardLayout
