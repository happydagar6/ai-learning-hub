import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '@/lib/auth'

function generateInteractiveMindMapData(title: string, weeks: any[]) {
  const difficultyLevels = ['easy', 'medium', 'hard'];
  const learningTypes = ['foundation', 'building', 'application', 'mastery'];
  const estimatedHours = [3, 4, 5, 6, 7, 8, 9, 10];

  return {
    title,
    totalWeeks: weeks.length,
    estimatedTotalHours: weeks.length * 5,
    nodes: weeks.map((week, index) => {
      const angle = (index * 2 * Math.PI) / weeks.length
      const radius = 200
      const x = 400 + radius * Math.cos(angle)
      const y = 300 + radius * Math.sin(angle)
      const difficulty = difficultyLevels[Math.min(Math.floor(index / 2), 2)]
      const learningType = learningTypes[index % 4]
      const hours = estimatedHours[Math.min(index, 7)]
      
      return {
        id: `week-${index}`,
        title: week.title || `Week ${index + 1}`,
        level: 1, // Required by InteractiveMindMap component
        difficulty: difficulty as 'easy' | 'medium' | 'hard',
        estimated_time: `${hours} hours`, // Component expects this format
        tasks: week.tasks || [
          `Complete ${week.title || 'weekly objectives'}`,
          'Review materials and take notes',
          'Practice exercises and assignments'
        ],
        completed: false, // Required by component
        connections: ['central'], // Simplified connections
        position: { x, y },
        // Additional properties for compatibility
        learningType, // Keep for generateNodes function
        estimatedHours: hours, // Keep for generateNodes function
        description: week.description || `Learning objectives for week ${index + 1}`
      }
    })
  };
}

export const POST = requireAuth(async (request: NextRequest, user: any) => {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { title, weeks, studyPlanId, forceRegenerate } = await request.json()

    if (!title || !weeks || !studyPlanId) {
      return NextResponse.json(
        { success: false, error: "Title, weeks, and studyPlanId are required" },
        { status: 400 }
      )
    }

    // Check if interactive mindmap already exists (unless forcing regeneration)
    if (!forceRegenerate) {
      const { data: existingMindmap } = await supabase
        .from("mind_maps")
        .select("*")
        .eq("study_plan_id", studyPlanId)
        .eq("user_id", user.id)
        .single()

      if (existingMindmap && existingMindmap.interactive_data) {
        console.log("✅ Returning cached interactive mindmap")
        return NextResponse.json({
          success: true,
          data: {
            interactiveData: existingMindmap.interactive_data,
            nodeStates: existingMindmap.node_states || {},
            userProgress: existingMindmap.user_progress || {
              completedNodes: 0,
              totalNodes: weeks.length,
              progressPercentage: 0
            },
            cached: true,
            generatedAt: existingMindmap.created_at
          }
        })
      }
    }

    // Generate new interactive mindmap data
    const interactiveData = generateInteractiveMindMapData(title, weeks)

    // Save to mind_maps table - FIXED: Remove non-existent columns
    const mindmapData = {
      study_plan_id: studyPlanId,
      user_id: user.id,
      interactive_data: interactiveData,
      updated_at: new Date().toISOString()
    }

    const { data, error: saveError } = await supabase
      .from("mind_maps")
      .upsert(mindmapData, { 
        onConflict: 'study_plan_id,user_id',
        ignoreDuplicates: false 
      })
      .select()
      .single()

    if (saveError) {
      console.error("Failed to save interactive mindmap:", saveError)
      return NextResponse.json(
        { success: false, error: "Failed to save interactive mindmap" },
        { status: 500 }
      )
    }

    console.log("✅ Interactive mindmap generated and saved successfully")

    return NextResponse.json({
      success: true,
      data: {
        interactiveData,
        cached: false,
        generatedAt: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error("Error generating interactive mindmap:", error)
    return NextResponse.json(
      { success: false, error: "Failed to generate interactive mindmap" },
      { status: 500 }
    )
  }
})