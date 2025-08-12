import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// POST - Migrate existing data to current user
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    console.log('🔧 Starting data migration for user:', userId)

    // Get all courses without user_id or with NULL user_id
    const { data: orphanedCourses, error: fetchError } = await supabase
      .from('courses')
      .select('id, name, user_id')
      .or('user_id.is.null,user_id.eq.')

    console.log('📊 Found orphaned courses:', orphanedCourses?.length || 0)
    console.log('📊 Orphaned courses:', orphanedCourses)

    if (fetchError) {
      console.error('Error fetching orphaned courses:', fetchError)
      return NextResponse.json(
        { error: 'Failed to fetch orphaned courses' },
        { status: 500 }
      )
    }

    if (!orphanedCourses || orphanedCourses.length === 0) {
      return NextResponse.json({
        message: 'No orphaned courses found',
        migratedCourses: 0
      })
    }

    // Update orphaned courses to belong to current user
    const courseIds = orphanedCourses.map(course => course.id)
    
    const { data: updatedCourses, error: updateError } = await supabase
      .from('courses')
      .update({ user_id: userId })
      .in('id', courseIds)
      .select()

    if (updateError) {
      console.error('Error updating courses:', updateError)
      return NextResponse.json(
        { error: 'Failed to update courses' },
        { status: 500 }
      )
    }

    console.log('✅ Successfully migrated courses:', updatedCourses?.length || 0)

    // Also migrate documents that belong to these courses
    const { data: orphanedDocuments, error: docFetchError } = await supabase
      .from('documents')
      .select('id, name, course_id, user_id')
      .in('course_id', courseIds)
      .or('user_id.is.null,user_id.eq.')

    console.log('📄 Found orphaned documents:', orphanedDocuments?.length || 0)

    if (orphanedDocuments && orphanedDocuments.length > 0) {
      const documentIds = orphanedDocuments.map(doc => doc.id)
      
      const { data: updatedDocuments, error: docUpdateError } = await supabase
        .from('documents')
        .update({ user_id: userId })
        .in('id', documentIds)
        .select()

      if (docUpdateError) {
        console.error('Error updating documents:', docUpdateError)
      } else {
        console.log('✅ Successfully migrated documents:', updatedDocuments?.length || 0)
      }
    }

    return NextResponse.json({
      message: 'Data migration completed successfully',
      migratedCourses: updatedCourses?.length || 0,
      migratedDocuments: orphanedDocuments?.length || 0,
      details: {
        courses: updatedCourses,
        documents: orphanedDocuments
      }
    })

  } catch (error) {
    console.error('Data migration error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET - Check data status
export async function GET() {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Check user's courses
    const { data: userCourses, error: userError } = await supabase
      .from('courses')
      .select('id, name, user_id')
      .eq('user_id', userId)

    // Check orphaned courses
    const { data: orphanedCourses, error: orphanError } = await supabase
      .from('courses')
      .select('id, name, user_id')
      .or('user_id.is.null,user_id.eq.')

    // Check all courses
    const { data: allCourses, error: allError } = await supabase
      .from('courses')
      .select('id, name, user_id')
      .limit(10)

    return NextResponse.json({
      userId,
      userCourses: userCourses || [],
      orphanedCourses: orphanedCourses || [],
      allCourses: allCourses || [],
      summary: {
        userCoursesCount: userCourses?.length || 0,
        orphanedCoursesCount: orphanedCourses?.length || 0,
        totalCoursesInSample: allCourses?.length || 0
      }
    })

  } catch (error) {
    console.error('Data check error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
