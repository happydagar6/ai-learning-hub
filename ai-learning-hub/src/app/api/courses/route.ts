import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET - Fetch user's courses
export async function GET() {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { data: courses, error } = await supabase
      .from('courses')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    console.log('🔍 Courses API - User ID:', userId, '- Courses found:', courses?.length || 0)

    if (error) {
      console.error('Error fetching courses:', error)
      return NextResponse.json(
        { error: 'Failed to fetch courses' },
        { status: 500 }
      )
    }

    return NextResponse.json({ courses })
  } catch (error) {
    console.error('Courses GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Create new course
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { name } = await request.json()

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Course name is required' },
        { status: 400 }
      )
    }

    const { data: course, error } = await supabase
      .from('courses')
      .insert([{
        name: name.trim(),
        user_id: userId
      }])
      .select()
      .single()

    if (error) {
      console.error('Error creating course:', error)
      return NextResponse.json(
        { error: 'Failed to create course' },
        { status: 500 }
      )
    }

    return NextResponse.json({ course })
  } catch (error) {
    console.error('Courses POST error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE - Delete course
export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const courseId = searchParams.get('courseId')

    if (!courseId) {
      return NextResponse.json(
        { error: 'Course ID is required' },
        { status: 400 }
      )
    }

    // First, delete all flashcard sets related to documents in this course
    const { data: documents, error: docError } = await supabase
      .from('documents')
      .select('documentId')
      .eq('course_id', courseId)
      .eq('user_id', userId)

    if (docError) {
      console.error('Error fetching course documents:', docError)
      return NextResponse.json(
        { error: 'Failed to fetch course documents' },
        { status: 500 }
      )
    }

    if (documents && documents.length > 0) {
      const documentIds = documents.map(doc => doc.documentId)
      
      // Delete flashcard sets for these documents
      const { error: flashcardError } = await supabase
        .from('flashcard_sets')
        .delete()
        .in('documentId', documentIds)

      if (flashcardError) {
        console.error('Error deleting flashcard sets:', flashcardError)
        return NextResponse.json(
          { error: 'Failed to delete flashcard sets' },
          { status: 500 }
        )
      }
    }

    // Then, delete all documents in this course
    const { error: documentsError } = await supabase
      .from('documents')
      .delete()
      .eq('course_id', courseId)
      .eq('user_id', userId)

    if (documentsError) {
      console.error('Error deleting course documents:', documentsError)
      return NextResponse.json(
        { error: 'Failed to delete course documents' },
        { status: 500 }
      )
    }

    // Finally, delete the course
    const { error: courseError } = await supabase
      .from('courses')
      .delete()
      .eq('id', courseId)
      .eq('user_id', userId)

    if (courseError) {
      console.error('Error deleting course:', courseError)
      return NextResponse.json(
        { error: 'Failed to delete course' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Courses DELETE error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
