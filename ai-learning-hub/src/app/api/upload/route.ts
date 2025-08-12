import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '@/lib/auth'

// Initialize Supabase client with service role for server-side operations
function createSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// Extract text content from file (simplified - in production you'd use proper text extraction)
async function extractTextContent(file: File): Promise<string> {
  try {
    if (file.type === 'text/plain') {
      return await file.text()
    }
    // For other file types, you would use appropriate libraries:
    // - pdf-parse for PDFs
    // - mammoth for DOCX files
    // - etc.
    return '' // Placeholder for now
  } catch (error) {
    console.error('Error extracting text content:', error)
    return ''
  }
}

// Topic detection based on content and filename
function detectTopicFromContent(name: string, content: string = ''): string {
  const lowerName = name.toLowerCase()
  const lowerContent = content.toLowerCase()
  const combinedText = `${lowerName} ${lowerContent}`
  
  if (combinedText.includes('node') && (combinedText.includes('js') || combinedText.includes('javascript'))) {
    return 'Node.js Development'
  }
  if (combinedText.includes('react') || combinedText.includes('jsx') || combinedText.includes('component')) {
    return 'React Development'
  }
  if (combinedText.includes('python') || combinedText.includes('django') || combinedText.includes('flask')) {
    return 'Python Programming'
  }
  if (combinedText.includes('javascript') || combinedText.includes('js ') || combinedText.includes('es6')) {
    return 'JavaScript Programming'
  }
  if (combinedText.includes('database') || combinedText.includes('sql') || combinedText.includes('mysql')) {
    return 'Database Management'
  }
  if (combinedText.includes('government') || combinedText.includes('gst') || combinedText.includes('legal') || combinedText.includes('law')) {
    return 'Government & Legal'
  }
  if (combinedText.includes('hr') || combinedText.includes('human resource') || combinedText.includes('management')) {
    return 'Human Resources'
  }
  if (combinedText.includes('data structure') || combinedText.includes('algorithm')) {
    return 'Data Structures & Algorithms'
  }
  if (combinedText.includes('machine learning') || combinedText.includes('ai') || combinedText.includes('artificial intelligence')) {
    return 'Machine Learning & AI'
  }
  
  return 'General Studies'
}

// Get subject from topic
function getSubjectFromTopic(topic: string): string {
  const topicToSubject: { [key: string]: string } = {
    'Node.js Development': 'Programming',
    'React Development': 'Web Development',
    'Python Programming': 'Programming',
    'JavaScript Programming': 'Programming',
    'Database Management': 'Data Management',
    'Government & Legal': 'Legal Studies',
    'Human Resources': 'Business Management',
    'Data Structures & Algorithms': 'Computer Science',
    'Machine Learning & AI': 'Data Science',
    'General Studies': 'General'
  }
  
  return topicToSubject[topic] || 'General'
}

// Get file type from filename
function getFileType(filename: string): string {
  const extension = filename.split('.').pop()?.toLowerCase()
  
  const typeMap: { [key: string]: string } = {
    'pdf': 'pdf',
    'txt': 'txt',
    'doc': 'doc',
    'docx': 'docx',
    'rtf': 'rtf',
    'md': 'md',
    'csv': 'csv'
  }
  
  return typeMap[extension || ''] || 'unknown'
}

export const POST = requireAuth(async (request: NextRequest, user: any) => {
  try {
    const supabase = createSupabaseClient()
    const formData = await request.formData()
    
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json({
        success: false,
        error: 'No file provided'
      }, { status: 400 })
    }

    // Generate unique filename
    const timestamp = Date.now()
    const randomId = Math.random().toString(36).substring(2, 15)
    const fileExtension = file.name.split('.').pop()
    const internalName = `${timestamp}-${randomId}.${fileExtension}`
    const storagePath = `documents/${user.id}/${internalName}`

    // Extract content for AI processing
    const textContent = await extractTextContent(file)
    
    // Detect topic and subject
    const topic = detectTopicFromContent(file.name, textContent)
    const subject = getSubjectFromTopic(topic)
    const fileType = getFileType(file.name)

    // Convert file to buffer for storage
    const fileBuffer = Buffer.from(await file.arrayBuffer())

    // Upload file to Supabase Storage
    const { data: storageData, error: storageError } = await supabase.storage
      .from('documents')
      .upload(storagePath, fileBuffer, {
        contentType: file.type,
        upsert: false
      })

    if (storageError) {
      console.error('Storage error:', storageError)
      return NextResponse.json({
        success: false,
        error: 'Failed to upload file to storage'
      }, { status: 500 })
    }

    // Get course_id from form data if provided
    const courseId = formData.get('course_id') as string | null

    // Save document metadata to database
    console.log('🔍 Upload API Debug - Saving to database:')
    console.log('- User ID:', user.id)
    console.log('- File name:', file.name)
    console.log('- File type:', fileType)
    console.log('- File size:', file.size)
    console.log('- Course ID:', courseId)
    console.log('- Processed:', textContent.length > 0)
    console.log('- Document ID:', internalName)

    const documentData = {
      user_id: user.id,
      name: file.name,
      file_type: fileType,
      file_size: file.size,
      processed: false, // Set as false initially - will be updated when processing completes
      documentId: internalName,
      course_id: courseId ? parseInt(courseId) : null
    }
    
    console.log('- Document data to insert:', documentData)

    const { data: dbData, error: dbError } = await supabase
      .from('documents')
      .insert(documentData)
      .select()
      .single()

    console.log('- Database insert result:', dbData)
    console.log('- Database insert error:', dbError)

    if (dbError) {
      console.error('Database error:', dbError)
      // Try to clean up the uploaded file
      await supabase.storage.from('documents').remove([storagePath])
      
      return NextResponse.json({
        success: false,
        error: 'Failed to save document metadata'
      }, { status: 500 })
    }

    // Trigger processing on the Node.js server
    try {
      // Instead of uploading again, trigger processing of the existing document
      const processingResponse = await fetch('http://localhost:8000/process-existing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documentId: internalName,
          fileName: file.name,
          userId: user.id,
          storagePath: storagePath,
          fileType: fileType
        })
      })
      
      if (processingResponse.ok) {
        console.log('🚀 Triggered document processing on Node.js server')
      } else {
        console.warn('Processing server returned error:', await processingResponse.text())
      }
    } catch (error) {
      console.warn('Processing server not available:', error instanceof Error ? error.message : 'Unknown error')
      // Continue anyway - document is saved, processing can be done later
    }

    return NextResponse.json({
      success: true,
      jobId: dbData.documentId, // Use documentId as jobId for compatibility
      fileType: dbData.file_type,
      processing: true, // Indicate that processing is in progress
      document: {
        id: dbData.id,
        filename: dbData.name,
        uploadDate: new Date(dbData.created_at).getTime(),
        fileType: dbData.file_type.toUpperCase(),
        fileSize: dbData.file_size,
        processed: dbData.processed, // This will be false initially
        documentId: dbData.documentId
      }
    })

  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error during upload'
    }, { status: 500 })
  }
})

export const DELETE = requireAuth(async (request: NextRequest, user: any) => {
  try {
    const supabase = createSupabaseClient()
    const { searchParams } = new URL(request.url)
    const documentId = searchParams.get('id')

    if (!documentId) {
      return NextResponse.json({
        success: false,
        error: 'Document ID is required'
      }, { status: 400 })
    }

    // Get document details first
    const { data: documentData, error: fetchError } = await supabase
      .from('documents')
      .select('documentId')
      .eq('documentId', documentId) // Use documentId to match the foreign key
      .eq('user_id', user.id)
      .single()

    if (fetchError || !documentData) {
      return NextResponse.json({
        success: false,
        error: 'Document not found'
      }, { status: 404 })
    }

    // First, delete all related flashcard sets for this document
    const { error: flashcardsError } = await supabase
      .from('flashcard_sets')
      .delete()
      .eq('documentId', documentId) // Using correct column name: documentId

    if (flashcardsError) {
      console.error('Error deleting flashcard sets:', flashcardsError)
      // Continue anyway - we still want to try to delete the document
    }

    // Delete any other related data (add more tables as needed)
    // Example: study_sessions, progress_tracking, etc.
    
    // Delete from storage using the generated path
    const storagePath = `documents/${user.id}/${documentData.documentId}`
    const { error: storageError } = await supabase.storage
      .from('documents')
      .remove([storagePath])

    if (storageError) {
      console.error('Storage deletion error:', storageError)
    }

    // Delete from database using documentId
    const { error: dbError } = await supabase
      .from('documents')
      .delete()
      .eq('documentId', documentId)
      .eq('user_id', user.id)

    if (dbError) {
      console.error('Database deletion error:', dbError)
      return NextResponse.json({
        success: false,
        error: 'Failed to delete document from database',
        details: dbError.message
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Document and all related data deleted successfully'
    })

  } catch (error) {
    console.error('Delete error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error during deletion'
    }, { status: 500 })
  }
})
