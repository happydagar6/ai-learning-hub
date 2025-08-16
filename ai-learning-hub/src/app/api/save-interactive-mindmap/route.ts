import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '@/lib/auth'

export const POST = requireAuth(async (request: NextRequest, user: any) => {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // FIXED: Accept all the data that frontend sends
    const { studyPlanId, interactiveData, nodeStates, userProgress } = await request.json()

    if (!studyPlanId || !interactiveData) {
      return NextResponse.json(
        { success: false, error: "Study plan ID and interactive data are required" },
        { status: 400 }
      )
    }

    // Check if mindmap exists
    const { data: existingMindmap } = await supabase
      .from('mind_maps')
      .select('*')
      .eq('study_plan_id', studyPlanId)
      .eq('user_id', user.id)
      .single()

    // FIXED: Save complete data structure including node states and user progress
    const mindmapData = {
      study_plan_id: studyPlanId,
      user_id: user.id,
      interactive_data: {
        ...interactiveData,
        nodeStates: nodeStates || {},
        userProgress: userProgress || {},
        savedAt: new Date().toISOString()
      },
      updated_at: new Date().toISOString()
    }

    if (existingMindmap) {
      // Update existing mindmap
      const { data, error } = await supabase
        .from('mind_maps')
        .update(mindmapData)
        .eq('study_plan_id', studyPlanId)
        .eq('user_id', user.id)
        .select()
        .single()

      if (error) {
        console.error('Failed to update interactive mindmap:', error)
        return NextResponse.json(
          { success: false, error: 'Failed to update interactive mindmap' },
          { status: 500 }
        )
      }

      console.log('✅ Interactive mindmap updated successfully')
      return NextResponse.json({
        success: true,
        data: {
          id: data.id,
          interactiveData: data.interactive_data,
          updated: true,
          savedAt: mindmapData.interactive_data.savedAt
        }
      })
    } else {
      // Create new mindmap
      const { data, error } = await supabase
        .from('mind_maps')
        .insert(mindmapData)
        .select()
        .single()

      if (error) {
        console.error('Failed to save interactive mindmap:', error)
        return NextResponse.json(
          { success: false, error: 'Failed to save interactive mindmap' },
          { status: 500 }
        )
      }

      console.log('✅ Interactive mindmap saved successfully')
      return NextResponse.json({
        success: true,
        data: {
          id: data.id,
          interactiveData: data.interactive_data,
          created: true,
          savedAt: mindmapData.interactive_data.savedAt
        }
      })
    }

  } catch (error) {
    console.error('Error saving interactive mindmap:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to save interactive mindmap' },
      { status: 500 }
    )
  }
})
