import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '@/lib/auth'

export const POST = requireAuth(async (request: NextRequest, user: any) => {
  try {
    // Initialize Supabase client with service role key for database operations
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { studyPlanId, interactiveData, nodeStates, userProgress } = await request.json()

    if (!studyPlanId) {
      return NextResponse.json(
        { success: false, error: 'Study plan ID is required' },
        { status: 400 }
      )
    }

    // Prepare the interactive mindmap data
    const mindmapData = {
      study_plan_id: studyPlanId,
      user_id: user.id,
      interactive_data: interactiveData,
      node_states: nodeStates, // User's completion status for each node
      user_progress: userProgress, // Overall progress information
      updated_at: new Date().toISOString()
    }

    // Check if an interactive mindmap already exists for this study plan
    const { data: existingMindmap, error: checkError } = await supabase
      .from('interactive_mindmaps')
      .select('id')
      .eq('study_plan_id', studyPlanId)
      .eq('user_id', user.id)
      .single()

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('Error checking existing mindmap:', checkError)
      return NextResponse.json(
        { success: false, error: 'Database query failed' },
        { status: 500 }
      )
    }

    let result
    if (existingMindmap) {
      // Update existing interactive mindmap
      const { data, error } = await supabase
        .from('interactive_mindmaps')
        .update(mindmapData)
        .eq('study_plan_id', studyPlanId)
        .eq('user_id', user.id)
        .select()
        .single()

      result = { data, error }
    } else {
      // Insert new interactive mindmap
      const { data, error } = await supabase
        .from('interactive_mindmaps')
        .insert([mindmapData])
        .select()
        .single()

      result = { data, error }
    }

    if (result.error) {
      console.error('Error saving interactive mindmap:', result.error)
      return NextResponse.json(
        { success: false, error: 'Failed to save interactive mindmap' },
        { status: 500 }
      )
    }

    console.log('✅ Interactive mindmap saved successfully:', result.data?.id)

    return NextResponse.json({
      success: true,
      data: {
        id: result.data?.id,
        saved_at: mindmapData.updated_at,
        action: existingMindmap ? 'updated' : 'created'
      }
    })

  } catch (error) {
    console.error('❌ Error in save-interactive-mindmap API:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
})
