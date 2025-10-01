import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'

export async function getUserFromRequest(req: NextRequest) {
  try {
    // Get auth context - this should work for both page and API routes
    const authResult = await auth()
    const { userId } = authResult
    
    if (!userId) {
      console.log('🔐 No userId found in auth context')
      return null
    }

    console.log('🔐 User authenticated successfully:', userId)
    return {
      id: userId,
      // You can add more user data here if needed
    }
  } catch (error) {
    console.error('🔐 Error getting user from auth context:', error)
    return null
  }
}

export function requireAuth(handler: (req: NextRequest, user: any) => Promise<NextResponse>) {
  return async (req: NextRequest) => {
    try {
      const user = await getUserFromRequest(req)
      
      if (!user) {
        console.log('🔐 Authentication required - no user found')
        return NextResponse.json(
          { 
            success: false,
            error: 'Unauthorized',
            message: 'Authentication required. Please sign in.'
          }, 
          { status: 401 }
        )
      }

      console.log('🔐 User authenticated, proceeding with request for user:', user.id)
      return handler(req, user)
    } catch (error) {
      console.error('🔐 Authentication error:', error)
      return NextResponse.json(
        { 
          success: false,
          error: 'Authentication Error',
          message: 'Failed to verify authentication. Please try signing in again.'
        }, 
        { status: 500 }
      )
    }
  }
}
