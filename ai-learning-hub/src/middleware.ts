import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/api/documents(.*)',
  '/api/flashcards(.*)',
  '/api/study-plans(.*)',
  '/api/courses(.*)',
])

const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/status(.*)',
])

export default clerkMiddleware(async (auth, req) => {
  const pathname = req.nextUrl.pathname
  const url = req.url

  try {
    // Skip processing for static files and internal Next.js routes
    if (
      pathname.startsWith('/_next') || 
      pathname.startsWith('/api/_') ||
      pathname.match(/\.(ico|png|jpg|jpeg|gif|svg|css|js|woff|woff2|ttf)$/) ||
      pathname.startsWith('/favicon')
    ) {
      return NextResponse.next()
    }

    // Get auth context
    const authResult = await auth()
    const { userId, sessionId } = authResult
    
    // Allow API status routes to be public
    if (pathname.startsWith('/api/status')) {
      return NextResponse.next()
    }

    // For API routes, ensure authentication is present
    if (pathname.startsWith('/api/') && isProtectedRoute(req)) {
      if (!userId) {
        return NextResponse.json(
          { 
            success: false,
            error: 'Unauthorized',
            message: 'Authentication required. Please sign in.'
          }, 
          { status: 401 }
        )
      }
      // API route with valid auth - let it proceed
      return NextResponse.next()
    }

    // If user is signed in and on the home page, redirect to dashboard
    if (userId && pathname === '/') {
      return NextResponse.redirect(new URL('/dashboard', url))
    }

    // If user is signed in and trying to access auth pages, redirect to dashboard
    if (userId && (pathname.startsWith('/sign-in') || pathname.startsWith('/sign-up'))) {
      return NextResponse.redirect(new URL('/dashboard', url))
    }

    // If user is not signed in and trying to access protected routes, redirect to sign-in
    if (!userId && isProtectedRoute(req)) {
      return NextResponse.redirect(new URL('/sign-in', url))
    }

    return NextResponse.next()
  } catch (error) {
    console.error('🔐 Middleware error:', error)
    
    // For API routes, return JSON error
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Authentication Error',
          message: 'Failed to verify authentication. Please try signing in again.'
        }, 
        { status: 500 }
      )
    }
    
    // For protected routes, redirect to sign-in on error
    if (isProtectedRoute(req)) {
      console.log('🔐 Error in middleware, redirecting to sign-in for protected route')
      return NextResponse.redirect(new URL('/sign-in', url))
    }
    
    return NextResponse.next()
  }
})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}
