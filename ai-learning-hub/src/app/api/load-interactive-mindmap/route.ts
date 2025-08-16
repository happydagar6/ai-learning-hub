import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '@/lib/auth'

export const GET = requireAuth(async (request: NextRequest, user: any) => {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { searchParams } = new URL(request.url)
    const studyPlanId = searchParams.get('studyPlanId')

    if (!studyPlanId) {
      return NextResponse.json(
        { success: false, error: "Study plan ID is required" },
        { status: 400 }
      )
    }

    // Load interactive mindmap from mind_maps table
    const { data, error } = await supabase
      .from('mind_maps')
      .select('*')
      .eq('study_plan_id', studyPlanId)
      .eq('user_id', user.id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // No data found - return success with null data
        return NextResponse.json({
          success: true,
          data: null
        })
      }
      
      console.error('Failed to load interactive mindmap:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to load interactive mindmap' },
        { status: 500 }
      )
    }

    if (!data.interactive_data) {
      return NextResponse.json({
        success: true,
        data: null
      })
    }

    console.log('✅ Interactive mindmap loaded successfully for study plan:', studyPlanId)

    // FIXED: Return the complete data structure that frontend expects
    const interactiveData = data.interactive_data
    
    return NextResponse.json({
      success: true,
      data: {
        id: data.id,
        studyPlanId: data.study_plan_id,
        interactiveData: {
          nodes: interactiveData.nodes,
          zoom: interactiveData.zoom,
          lastUpdated: interactiveData.lastUpdated
        },
        nodeStates: interactiveData.nodeStates || {},
        userProgress: interactiveData.userProgress || {},
        savedAt: interactiveData.savedAt || data.updated_at,
        updatedAt: data.updated_at
      }
    })

  } catch (error) {
    console.error('Error loading interactive mindmap:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to load interactive mindmap' },
      { status: 500 }
    )
  }
})
