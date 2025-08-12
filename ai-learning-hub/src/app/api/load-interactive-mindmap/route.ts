import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '@/lib/auth'

export const GET = requireAuth(async (request: NextRequest, user: any) => {
  try {
    // Initialize Supabase client with service role key for database operations
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { searchParams } = new URL(request.url)
    const studyPlanId = searchParams.get('studyPlanId')

    if (!studyPlanId) {
      return NextResponse.json(
        { success: false, error: 'Study plan ID is required' },
        { status: 400 }
      )
    }

    // Fetch the interactive mindmap data for the given study plan
    const { data, error } = await supabase
      .from('interactive_mindmaps')
      .select('*')
      .eq('study_plan_id', studyPlanId)
      .eq('user_id', user.id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') { // No rows found
        console.log('No interactive mindmap found for study plan:', studyPlanId)
        return NextResponse.json({
          success: true,
          data: null,
          message: 'No interactive mindmap data found'
        })
      }

      console.error('Error loading interactive mindmap:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to load interactive mindmap' },
        { status: 500 }
      )
    }

    console.log('✅ Interactive mindmap loaded successfully for study plan:', studyPlanId)

    return NextResponse.json({
      success: true,
      data: {
        id: data.id,
        studyPlanId: data.study_plan_id,
        interactiveData: data.interactive_data,
        nodeStates: data.node_states,
        userProgress: data.user_progress,
        savedAt: data.updated_at,
        createdAt: data.created_at
      }
    })

  } catch (error) {
    console.error('❌ Error in load-interactive-mindmap API:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
})
