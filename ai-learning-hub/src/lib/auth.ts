import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'

export async function getUserFromRequest(req: NextRequest) {
  try {
    // Get auth context - this should work for both page and API routes
    const authResult = await auth()
    const { userId } = authResult
    
    if (!userId) {
      return null
    }

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
        return NextResponse.json(
          { 
            success: false,
            error: 'Unauthorized',
            message: 'Authentication required. Please sign in.'
          }, 
          { status: 401 }
        )
      }

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
