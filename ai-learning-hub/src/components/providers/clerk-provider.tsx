"use client"

import { ClerkProvider } from '@clerk/nextjs'
import { dark } from '@clerk/themes'
import { useTheme } from 'next-themes'

export function CustomClerkProvider({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme()

  return (
    <ClerkProvider
      publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY!}
      signInUrl={process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL || '/sign-in'}
      signUpUrl={process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL || '/sign-up'}
      afterSignInUrl={process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL || '/dashboard'}
      afterSignUpUrl={process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL || '/dashboard'}
      signInForceRedirectUrl="/dashboard"
      signUpForceRedirectUrl="/dashboard"
      appearance={{
        baseTheme: theme === 'dark' ? dark : undefined,
        variables: {
          colorPrimary: '#3b82f6',
          colorBackground: theme === 'dark' ? '#0f172a' : '#ffffff',
          colorText: theme === 'dark' ? '#f8fafc' : '#0f172a',
        },
        elements: {
          formButtonPrimary: 
            'bg-blue-600 hover:bg-blue-700 text-sm normal-case',
          card: 'shadow-lg border',
          headerTitle: 'text-2xl font-bold',
          headerSubtitle: 'text-muted-foreground',
        }
      }}
    >
      {children}
    </ClerkProvider>
  )
}
