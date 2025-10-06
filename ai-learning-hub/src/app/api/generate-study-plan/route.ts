import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import OpenAI from "openai"
import { createClient } from '@supabase/supabase-js'
import { requireAuth } from "@/lib/auth"

// Create service role client for admin operations (same as courses API)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: { autoRefreshToken: false, persistSession: false }
  }
)

// Initialize OpenAI with OpenRouter
const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
})

// Validate environment variables
if (!process.env.OPENROUTER_API_KEY) {
  console.error("❌ OPENROUTER_API_KEY environment variable is not set!")
}

interface StudyPlanRequest {
  courseId: string
  syllabus: string
  weeks: number
  customPrompt?: string
}

interface StudyPlanWeek {
  week: number
  title: string
  tasks: string[]
  objectives?: string[]
  resources?: string[]
}

interface StudyPlanContent {
  title: string
  description?: string
  weeks: StudyPlanWeek[]
  totalWeeks: number
  estimatedHoursPerWeek?: number
}

export const POST = requireAuth(async (request: NextRequest, user: any) => {
  try {
    // Parse and validate request body
    const body: StudyPlanRequest = await request.json()
    const { courseId, syllabus, weeks, customPrompt } = body

    console.log("🔍 Request body:", body);
    console.log("🔍 User ID:", user.id);

    // Input validation
    const validationErrors: string[] = []

    if (!courseId || typeof courseId !== "string") {
      validationErrors.push("Course ID is required and must be a string")
    }

    if (!syllabus || typeof syllabus !== "string" || syllabus.trim().length < 10) {
      validationErrors.push("Syllabus content is required and must be at least 10 characters")
    }

    if (!weeks || typeof weeks !== "number" || weeks < 1 || weeks > 52) {
      validationErrors.push("Study duration must be between 1 and 52 weeks")
    }

    if (validationErrors.length > 0) {
      return NextResponse.json({ error: "Validation failed", details: validationErrors }, { status: 400 })
    }

    console.log("📚 Generating study plan:", {
      courseId,
      weeks,
      syllabusLength: syllabus.length,
      hasCustomPrompt: !!customPrompt
    })

    // Fetch course information for the authenticated user
    const { data: userCourses, error: coursesError } = await supabase
      .from("courses")
      .select("id, name")
      .eq("user_id", user.id)

    if (coursesError) {
      console.error("❌ Error fetching user courses:", coursesError)
      return NextResponse.json({
        error: "Failed to fetch user courses",
        details: coursesError.message
      }, { status: 500 })
    }

    // Check if user has any courses at all
    if (!userCourses || userCourses.length === 0) {
      return NextResponse.json({
        error: "No courses found",
        message: "You need to create a course first before generating a study plan. Please go to the upload page to create a course and upload some study materials.",
        code: "NO_COURSES"
      }, { status: 404 })
    }

    // Find the specific course
    const course = userCourses.find(c => c.id === parseInt(courseId))
    
    if (!course) {
      console.error("❌ Course not found with ID:", courseId)
      return NextResponse.json({
        error: "Course not found",
        message: `Course with ID ${courseId} not found or doesn't belong to you.`,
        availableCourses: userCourses?.map(c => ({ id: c.id, name: c.name })) || []
      }, { status: 404 })
    }

    console.log("✅ Found course:", course.name)

    // Generate study plan using AI
    const studyPlanContent = await generateStudyPlanWithAI(course.name, syllabus, weeks, customPrompt)

    // Save to database with user_id
    const { data: savedPlan, error: saveError } = await supabase
      .from("study_plans")
      .insert([
        {
          course_id: Number.parseInt(courseId),
          user_id: user.id,
          title: studyPlanContent.title,
          content: studyPlanContent,
          weeks: weeks,
          custom_prompt: customPrompt || null,
        },
      ])
      .select(`
        id,
        title,
        content,
        weeks,
        created_at,
        courses (
          id,
          name
        )
      `)
      .single()

    if (saveError) {
      console.error("❌ Database save error:", saveError)
      return NextResponse.json({ error: "Failed to save study plan", details: saveError.message }, { status: 500 })
    }

    console.log("✅ Study plan saved successfully:", savedPlan.id)
    console.log("🔍 Saved study plan details:", savedPlan);

    return NextResponse.json({
      success: true,
      data: savedPlan,
      message: "Study plan generated and saved successfully",
    })
  } catch (error) {
    console.error("❌ Study plan generation error:", error)

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Invalid request format", details: "Request body must be valid JSON" },
        { status: 400 },
      )
    }

    if (error instanceof Error) {
      if (error.message.includes("API key")) {
        return NextResponse.json(
          { error: "AI service configuration error", details: "Please contact support" },
          { status: 503 },
        )
      }

      if (error.message.includes("rate limit") || error.message.includes("quota")) {
        return NextResponse.json(
          { error: "AI service temporarily unavailable", details: "Please try again in a few minutes" },
          { status: 429 },
        )
      }

      return NextResponse.json({ error: "Internal server error", details: error.message }, { status: 500 })
    }

    return NextResponse.json({ error: "Unknown error occurred", details: "Please try again later" }, { status: 500 })
  }
})

async function generateStudyPlanWithAI(
  courseName: string,
  syllabus: string,
  weeks: number,
  customPrompt?: string,
): Promise<StudyPlanContent> {
  const basePrompt = `Create a comprehensive ${weeks}-week study plan for the course "${courseName}".

Course Syllabus/Content:
${syllabus}

${customPrompt ? `Additional Requirements: ${customPrompt}` : ""}

Please create a detailed study plan that:
1. Breaks down the content into ${weeks} manageable weekly segments
2. Includes 3-5 specific, actionable tasks per week
3. Progresses logically from basic to advanced concepts
4. Includes review and assessment periods
5. Provides realistic time estimates

Return the response as a valid JSON object with this exact structure:
{
  "title": "Descriptive title for the study plan",
  "description": "Brief overview of what this plan covers",
  "totalWeeks": ${weeks},
  "estimatedHoursPerWeek": 8,
  "weeks": [
    {
      "week": 1,
      "title": "Week 1 Title",
      "tasks": ["Specific task 1", "Specific task 2", "Specific task 3"],
      "objectives": ["Learning objective 1", "Learning objective 2"],
      "resources": ["Recommended resource 1", "Recommended resource 2"]
    }
  ]
}

Make sure each week builds upon previous weeks and includes practical applications where possible.`

  // List of free models to try in order
  const freeModels = [
    "deepseek/deepseek-r1-0528:free", 
    "deepseek/deepseek-r1-0528-qwen3-8b:free",
    "qwen/qwen3-coder:free",
    "google/gemma-3-27b-it:free",
  ]

  let lastError = null
  
  for (const model of freeModels) {
    try {
      console.log(`🤖 Trying AI model: ${model}`)

      const completion = await openai.chat.completions.create({
        model: model,
        messages: [
          {
            role: "system",
            content:
              "You are an expert educational consultant who creates detailed, practical study plans. Always respond with valid JSON only, no additional text or formatting.",
          },
          {
            role: "user",
            content: basePrompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 3000,
      })

      const content = completion.choices[0]?.message?.content
      if (!content) {
        throw new Error("AI service returned empty response")
      }

      console.log(`✅ AI response received from ${model}, parsing...`)

      // Clean the response to ensure it's valid JSON
      const cleanedContent = content.trim().replace(/```json\n?|\n?```/g, "")

      let studyPlanContent: StudyPlanContent
      try {
        studyPlanContent = JSON.parse(cleanedContent)
      } catch (parseError) {
        console.error("❌ JSON parse error:", parseError)
        throw new Error("AI response could not be parsed as valid JSON")
      }

      // Validate the structure
      if (!studyPlanContent.title || !studyPlanContent.weeks || !Array.isArray(studyPlanContent.weeks)) {
        throw new Error("AI response has invalid structure")
      }

      if (studyPlanContent.weeks.length !== weeks) {
        console.warn(`⚠️ Expected ${weeks} weeks, got ${studyPlanContent.weeks.length}`)
      }

      // Ensure all weeks have required fields
      studyPlanContent.weeks = studyPlanContent.weeks.map((week, index) => ({
        week: week.week || index + 1,
        title: week.title || `Week ${index + 1}`,
        tasks: Array.isArray(week.tasks) ? week.tasks : [],
        objectives: Array.isArray(week.objectives) ? week.objectives : [],
        resources: Array.isArray(week.resources) ? week.resources : [],
      }))

      console.log(`✅ Study plan generated successfully using ${model}`)
      return studyPlanContent
      
    } catch (error) {
      console.error(`❌ Error with model ${model}:`, error)
      lastError = error
      
      // If this is a rate limit error, try the next model
      if (error instanceof Error && error.message.includes('429')) {
        console.log(`⏭️ Rate limit hit for ${model}, trying next model...`)
        continue
      }
      
      // For other errors, also try the next model
      console.log(`⏭️ Error with ${model}, trying next model...`)
      continue
    }
  }
  
  // If all AI models failed, generate a basic fallback study plan
  console.warn("⚠️ All AI models failed, generating fallback study plan...")
  return generateFallbackStudyPlan(courseName, syllabus, weeks)
}

// Fallback function to generate a basic study plan when AI is unavailable
function generateFallbackStudyPlan(courseName: string, syllabus: string, weeks: number): StudyPlanContent {
  const weeklyTasks = [
    "Review course materials and take notes",
    "Complete assigned readings",
    "Practice exercises and problems", 
    "Review previous week's concepts",
    "Prepare for upcoming topics"
  ]

  const weeklyObjectives = [
    "Understand key concepts",
    "Apply theoretical knowledge",
    "Complete practical exercises",
    "Review and reinforce learning"
  ]

  const weeklyResources = [
    "Course textbook and materials",
    "Online tutorials and videos", 
    "Practice problems and exercises",
    "Study groups and forums"
  ]

  const studyPlanWeeks: StudyPlanWeek[] = []
  
  for (let i = 1; i <= weeks; i++) {
    const isEarlyWeek = i <= weeks / 3
    const isMidWeek = i > weeks / 3 && i <= (2 * weeks) / 3
    const isLateWeek = i > (2 * weeks) / 3

    let weekTitle = `Week ${i}: `
    let weekTasks = [...weeklyTasks]
    
    if (isEarlyWeek) {
      weekTitle += "Foundation & Basics"
      weekTasks.unshift("Establish study routine and goals")
    } else if (isMidWeek) {
      weekTitle += "Application & Practice"
      weekTasks.unshift("Work on intermediate concepts and applications")
    } else {
      weekTitle += "Advanced Topics & Review"
      weekTasks.unshift("Focus on advanced topics and exam preparation")
    }

    studyPlanWeeks.push({
      week: i,
      title: weekTitle,
      tasks: weekTasks,
      objectives: [...weeklyObjectives],
      resources: [...weeklyResources]
    })
  }

  return {
    title: `${courseName} Study Plan`,
    description: `A ${weeks}-week structured study plan for ${courseName}. This plan was generated automatically when AI services were unavailable.`,
    weeks: studyPlanWeeks,
    totalWeeks: weeks,
    estimatedHoursPerWeek: Math.max(5, Math.min(15, weeks <= 4 ? 15 : weeks <= 8 ? 10 : 8))
  }
}

// GET endpoint to fetch study plans
export const GET = requireAuth(async (request: NextRequest, user: any) => {
  try {
    const { searchParams } = new URL(request.url)
    const courseId = searchParams.get("courseId")
    const studyPlanId = searchParams.get("id")

    console.log("📊 GET /api/generate-study-plan - courseId:", courseId, "studyPlanId:", studyPlanId)

    // If studyPlanId is provided, fetch specific study plan
    if (studyPlanId) {
      const { data, error } = await supabase
        .from("study_plans")
        .select(`
          id,
          title,
          content,
          weeks,
          custom_prompt,
          created_at,
          updated_at,
          courses (
            id,
            name
          )
        `)
        .eq("id", studyPlanId)
        .eq("user_id", user.id)
        .single()

      if (error) {
        console.error("❌ Error fetching study plan by ID:", error)
        return NextResponse.json({ error: "Failed to fetch study plan", details: error.message }, { status: 500 })
      }

      console.log("📊 Found study plan:", data?.id, "with title:", data?.title)
      return NextResponse.json({
        success: true,
        data: data,
      })
    }

    // Otherwise, fetch all study plans (optionally filtered by courseId)
    let query = supabase
      .from("study_plans")
      .select(`
        id,
        title,
        content,
        weeks,
        custom_prompt,
        created_at,
        updated_at,
        courses (
          id,
          name
        )
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    if (courseId) {
      query = query.eq("course_id", courseId)
    }

    const { data, error } = await query

    if (error) {
      console.error("❌ Error fetching study plans:", error)
      return NextResponse.json({ error: "Failed to fetch study plans", details: error.message }, { status: 500 })
    }

    // For multiple study plans, return array
    return NextResponse.json({
      success: true,
      data: data || [],
      count: Array.isArray(data) ? data.length : (data ? 1 : 0),
    })
  } catch (error) {
    console.error("❌ GET study plans error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
})

// DELETE endpoint to remove study plans
export const DELETE = requireAuth(async (request: NextRequest, user: any) => {
  try {
    const { searchParams } = new URL(request.url)
    const planId = searchParams.get("id")

    if (!planId) {
      return NextResponse.json({ error: "Study plan ID is required" }, { status: 400 })
    }

    // First, delete any associated mind maps
    const { error: mindMapError } = await supabase
      .from("mind_maps")
      .delete()
      .eq("study_plan_id", planId)
      .eq("user_id", user.id)

    if (mindMapError) {
      console.warn("⚠️ Warning deleting associated mind maps:", mindMapError)
      // Continue with study plan deletion even if mind map deletion fails
    }

    // Then delete the study plan
    const { error } = await supabase.from("study_plans").delete().eq("id", planId).eq("user_id", user.id)

    if (error) {
      console.error("❌ Error deleting study plan:", error)
      return NextResponse.json({ error: "Failed to delete study plan", details: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: "Study plan and associated mind maps deleted successfully",
    })
  } catch (error) {
    console.error("❌ DELETE study plan error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
})
