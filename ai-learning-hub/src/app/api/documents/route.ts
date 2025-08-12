import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '../../../lib/auth'

// Add client environment config
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Create service role client for admin operations
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

// Helper function to detect topic from filename/content
function detectTopicFromContent(filename: string, content: string, defaultTopic: string): string {
  const text = (filename + ' ' + content).toLowerCase()
  
  // Programming and Technology
  if (/\b(javascript|js|typescript|ts|node|react|angular|vue|python|java|c\+\+|cpp|c#|csharp|html|css|sql|database|programming|coding|software|web|api|framework|library)\b/.test(text)) {
    return 'Programming & Technology'
  }
  
  // Mathematics
  if (/\b(math|mathematics|calculus|algebra|geometry|statistics|probability|trigonometry|differential|integral|linear|matrix|equation|theorem|proof)\b/.test(text)) {
    return 'Mathematics'
  }
  
  // Science
  if (/\b(physics|chemistry|biology|science|scientific|experiment|hypothesis|theory|research|lab|laboratory)\b/.test(text)) {
    return 'Science'
  }
  
  // Business
  if (/\b(business|management|marketing|finance|economics|accounting|strategy|leadership|entrepreneur|corporate|sales|project)\b/.test(text)) {
    return 'Business'
  }
  
  // History
  if (/\b(history|historical|ancient|medieval|modern|civilization|culture|war|empire|revolution|century|period|era)\b/.test(text)) {
    return 'History'
  }
  
  // Literature
  if (/\b(literature|novel|poetry|poem|author|writer|book|story|narrative|essay|prose|verse|literary)\b/.test(text)) {
    return 'Literature'
  }
  
  return defaultTopic
}

// Helper function to get subject from topic
function getSubjectFromTopic(topic: string): string {
  const topicMap: { [key: string]: string } = {
    'Programming & Technology': 'Computer Science',
    'Mathematics': 'Mathematics',
    'Science': 'General Science',
    'Business': 'Business Studies',
    'History': 'Social Studies',
    'Literature': 'English Literature'
  }
  
  return topicMap[topic] || 'General Studies'
}

export const GET = requireAuth(async (req: NextRequest, user: any) => {
  try {
    console.log('📋 Fetching documents for user:', user.id)

    // Check if a specific course is requested
    const { searchParams } = new URL(req.url)
    const courseIdParam = searchParams.get('courseId')
    console.log('📋 Course filter requested:', courseIdParam)

    // Get all courses for the user first
    const { data: userCourses, error: coursesError } = await supabase
      .from('courses')
      .select('id')
      .eq('user_id', user.id)

    if (coursesError) {
      console.error('❌ Error fetching user courses:', coursesError)
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch user courses',
        documents: [],
        count: 0
      }, { status: 500 })
    }

    const courseIds = userCourses.map(course => course.id)
    console.log('📚 User course IDs:', courseIds)

    if (courseIds.length === 0) {
      console.log('📭 No courses found for user')
      return NextResponse.json({
        success: true,
        documents: [],
        count: 0
      })
    }

    // Filter by specific course if requested
    let targetCourseIds = courseIds
    if (courseIdParam) {
      const requestedCourseId = parseInt(courseIdParam)
      if (courseIds.includes(requestedCourseId)) {
        targetCourseIds = [requestedCourseId]
        console.log('📋 Filtering by course ID:', requestedCourseId)
      } else {
        console.log('❌ Requested course ID not owned by user:', requestedCourseId)
        return NextResponse.json({
          success: true,
          documents: [],
          count: 0
        })
      }
    }

    // Then fetch documents for those courses using inner join
    const { data: allDocs, error: docsError } = await supabase
      .from('documents')
      .select(`
        id,
        name,
        file_type,
        file_size,
        processed,
        created_at,
        documentId,
        course_id,
        courses!inner(
          id,
          name,
          user_id
        )
      `)
      .in('course_id', targetCourseIds)
      .order('created_at', { ascending: false })

    if (docsError) {
      console.error('❌ Error fetching documents:', docsError)
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch documents',
        documents: [],
        count: 0,
        details: docsError.message
      }, { status: 500 })
    }
    
    // If no documents found, return empty array (not an error)
    if (!allDocs || allDocs.length === 0) {
      return NextResponse.json({
        success: true,
        documents: [],
        count: 0
      })
    }

    // Transform documents to match frontend expectations
    const transformedDocs = allDocs.map(doc => {
      console.log(`📄 Transforming doc: ${doc.name}, file_size: ${doc.file_size} (${typeof doc.file_size})`)
      return {
        id: doc.id,
        name: doc.name,
        originalName: doc.name, // Frontend expects originalName
        filename: doc.name,
        fileType: doc.file_type?.toUpperCase() || 'UNKNOWN',
        fileSize: doc.file_size, // Keep for compatibility
        file_size: doc.file_size, // Frontend expects this property name
        processed: doc.processed,
        uploadDate: new Date(doc.created_at).getTime(), // Frontend expects timestamp
        created_at: doc.created_at,
        documentId: doc.documentId,
        course_id: doc.course_id,
        // Add default topic and subject since they're not in the database
        topic: detectTopicFromContent(doc.name, '', 'General'),
        subject: getSubjectFromTopic(detectTopicFromContent(doc.name, '', 'General')),
        courses: doc.courses
      }
    })

    // Return documents in the format expected by frontend
    return NextResponse.json({
      success: true,
      documents: transformedDocs,
      count: transformedDocs.length
    })

  } catch (error) {
    console.error('Error fetching documents from Supabase:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error while fetching documents',
      documents: [],
      count: 0,
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
})
