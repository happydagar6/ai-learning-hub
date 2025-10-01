"use client"
import { SignUp } from '@clerk/nextjs'
import { useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Loader2 } from 'lucide-react'

export default function SignUpPage() {
  const { isSignedIn, isLoaded } = useUser()
  const router = useRouter()

  // Redirect if already signed in
  useEffect(() => {
    if (isLoaded && isSignedIn) {
      console.log('🔐 User already signed in, redirecting to dashboard')
      router.push('/dashboard')
    }
  }, [isLoaded, isSignedIn, router])

  // Show loading if already signed in
  if (isLoaded && isSignedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Redirecting to dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-slate-800 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
            Join AI Learning Hub
          </h1>
          <p className="text-muted-foreground">
            Create your account to start learning with AI
          </p>
        </div>
        
        <SignUp 
          afterSignUpUrl="/dashboard"
          redirectUrl="/dashboard"
          appearance={{
            elements: {
              rootBox: "w-full",
              card: "w-full shadow-xl border-0",
            }
          }}
        />
      </div>
    </div>
  )
}
