import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '@/lib/auth'

// Initialize Supabase client
function createSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export const GET = requireAuth(async (request: NextRequest, user: any) => {
  try {
    const supabase = createSupabaseClient()
    
    // Extract jobId from URL
    const url = new URL(request.url)
    const pathSegments = url.pathname.split('/')
    const jobId = pathSegments[pathSegments.length - 1]

    if (!jobId) {
      return NextResponse.json({
        success: false,
        error: 'Job ID is required'
      }, { status: 400 })
    }

    // First check if there's a processing job running on the Node.js server
    try {
      const nodeServerResponse = await fetch(`http://localhost:8000/status/${jobId}`)
      if (nodeServerResponse.ok) {
        const nodeStatus = await nodeServerResponse.json()
        if (nodeStatus.status && nodeStatus.status !== 'not_found') {
          // Return status from Node.js server if job is found there
          return NextResponse.json({
            success: true,
            status: nodeStatus.status,
            progress: nodeStatus.progress || 50,
            message: getStatusMessage(nodeStatus.status, nodeStatus.progress),
            document: nodeStatus.document || { name: nodeStatus.filename }
          })
        }
      }
    } catch (error) {
      console.warn('Node.js server not available for status check:', error)
    }

    // Fallback to database check
    const { data: document, error } = await supabase
      .from('documents')
      .select('id, name, processed, file_type')
      .eq('documentId', jobId)
      .eq('user_id', user.id)
      .single()

    if (error || !document) {
      return NextResponse.json({
        success: false,
        error: 'Document not found'
      }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      status: document.processed ? 'completed' : 'processing',
      progress: document.processed ? 100 : 50,
      message: getStatusMessage(document.processed ? 'completed' : 'processing', document.processed ? 100 : 50),
      document: {
        id: document.id,
        name: document.name,
        fileType: document.file_type,
        processed: document.processed
      }
    })

  } catch (error) {
    console.error('Status check error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
})

function getStatusMessage(status: string, progress?: number): string {
  switch (status) {
    case 'completed':
      return 'Document processed and ready for AI interactions'
    case 'processing':
      return `Processing document for AI interactions... ${progress || 50}%`
    case 'error':
      return 'Error processing document'
    case 'queued':
      return 'Document queued for processing'
    default:
      return 'Processing document...'
  }
}
