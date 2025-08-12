import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'

export async function getUserFromRequest(req: NextRequest) {
  try {
    // Pass the request to auth() to ensure proper context
    const { userId } = await auth()
    
    if (!userId) {
      console.log('🔐 No userId found in request')
      return null
    }

    console.log('🔐 User authenticated:', userId)
    return {
      id: userId,
      // You can add more user data here if needed
    }
  } catch (error) {
    console.error('🔐 Error getting user from request:', error)
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

      console.log('🔐 User authenticated, proceeding with request')
      return handler(req, user)
    } catch (error) {
      console.error('🔐 Authentication error:', error)
      return NextResponse.json(
        { 
          success: false,
          error: 'Authentication Error',
          message: 'Failed to verify authentication. Please try signing in again.'
        }, 
        { status: 401 }
      )
    }
  }
}
